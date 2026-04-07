import React, { useState, useRef, useEffect } from 'react';
import { AppState, formatDocNum, today, getDayName, Nu } from '../utils';
import { InvoiceLine, BTCItem, Customer, Prescription } from '../types';
import { Plus, Trash2, Save, X, Printer, Search, Zap, FlaskConical, History } from 'lucide-react';
import ItemDropdown from './ItemDropdown';
import CustomerDropdown from './CustomerDropdown';
import RxGrid from './RxGrid';
import { User } from 'firebase/auth';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface InvoiceFormProps {
  state: AppState;
  user: User | null;
  onSave: (invoice: any, print?: boolean) => void;
  onCancel: () => void;
  initialData?: any;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ state, user, onSave, onCancel, initialData, showNotification }) => {
  const nextNum = initialData ? initialData.num : formatDocNum('inv', state.counters.inv);
  const [date, setDate] = useState(initialData?.date || today());
  const [customer, setCustomer] = useState(initialData?.customer || '');
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [dueDate, setDueDate] = useState(initialData?.due || today());
  const [address, setAddress] = useState(initialData?.addr || '');
  const [status, setStatus] = useState<'Unpaid' | 'Paid' | 'Partial'>(initialData?.status || 'Unpaid');
  const [method, setMethod] = useState(initialData?.method || 'Cash');
  const [transactionId, setTransactionId] = useState(initialData?.transactionId || '');
  const [paidAmt, setPaidAmt] = useState(initialData?.paid || 0);
  const [labStatus, setLabStatus] = useState(initialData?.labStatus || 'Pending');
  const [isQuickSale, setIsQuickSale] = useState(false);
  
  const [rx, setRx] = useState<Prescription>(initialData?.rx || {
    od: { sph: '', cyl: '', axis: '', add: '', pd: '' },
    os: { sph: '', cyl: '', axis: '', add: '', pd: '' },
    date: today()
  });

  const [lines, setLines] = useState<InvoiceLine[]>(initialData?.lines || [
    { desc: '', btc: '', qty: 1, unit: '', rate: 0, disc: 0, st: 0, net: 0, tax: 0, total: 0 }
  ]);

  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [draftToRestore, setDraftToRestore] = useState<any | null>(null);

  // Load draft on mount
  useEffect(() => {
    if (!initialData) {
      const draft = localStorage.getItem('invoice_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setDraftToRestore(parsed);
        } catch (e) {
          console.error('Failed to parse invoice draft', e);
        }
      }
    }
  }, [initialData]);

  const restoreDraft = () => {
    if (draftToRestore) {
      setDate(draftToRestore.date);
      setCustomer(draftToRestore.customer);
      setCustomerId(draftToRestore.customerId || '');
      setPhone(draftToRestore.phone);
      setDueDate(draftToRestore.due);
      setAddress(draftToRestore.addr);
      setRx(draftToRestore.rx || rx);
      setStatus(draftToRestore.status);
      setMethod(draftToRestore.method);
      setTransactionId(draftToRestore.transactionId || '');
      setPaidAmt(draftToRestore.paid);
      setLines(draftToRestore.lines);
      setDraftToRestore(null);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem('invoice_draft');
    setDraftToRestore(null);
  };

  // Auto-save every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const draftData = {
        date,
        customer,
        customerId,
        phone,
        due: dueDate,
        addr: address,
        rx,
        status,
        method,
        transactionId,
        paid: paidAmt,
        lines,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('invoice_draft', JSON.stringify(draftData));
      setLastAutoSave(new Date().toLocaleTimeString());
    }, 60000);

    return () => clearInterval(interval);
  }, [date, customer, customerId, phone, dueDate, address, rx, status, method, transactionId, paidAmt, lines]);

  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const customerRef = useRef<HTMLDivElement>(null);

  const addLine = () => {
    setLines([...lines, { desc: '', btc: '', qty: 1, unit: '', rate: 0, disc: 0, st: 0, net: 0, tax: 0, total: 0 }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const updateLine = (idx: number, field: keyof InvoiceLine, val: any) => {
    const newLines = [...lines];
    const line = { ...newLines[idx], [field]: val };
    
    // Recalculate
    const net = line.qty * line.rate - line.disc;
    const tax = net * (line.st / 100);
    line.net = net;
    line.tax = tax;
    line.total = net + tax;
    
    newLines[idx] = line;
    setLines(newLines);
  };

  const handleItemSelect = (item: BTCItem) => {
    if (activeRowIdx === null) return;
    const newLines = [...lines];
    const line = { ...newLines[activeRowIdx] };
    
    line.desc = item.n;
    line.btc = item.btc;
    line.unit = item.u;
    line.rate = item.p;
    line.st = item.st;
    
    const net = line.qty * line.rate - line.disc;
    const tax = net * (line.st / 100);
    line.net = net;
    line.tax = tax;
    line.total = net + tax;
    
    newLines[activeRowIdx] = line;

    // Lens Matrix Logic: If a frame is selected, suggest adding a lens
    if (item.category === 'Frame' && !newLines.some(l => l.isLens)) {
      const standardLens = state.items.find(i => i.category === 'Lens');
      if (standardLens) {
        newLines.push({
          desc: standardLens.n,
          btc: standardLens.btc,
          qty: 1,
          unit: standardLens.u,
          rate: standardLens.p,
          disc: 0,
          st: standardLens.st,
          net: standardLens.p,
          tax: standardLens.p * (standardLens.st / 100),
          total: standardLens.p * (1 + standardLens.st / 100),
          isLens: true,
          lensType: standardLens.n
        });
      }
    }

    setLines(newLines);
    setActiveRowIdx(null);
  };

  const handleCustomerSelect = (c: Customer) => {
    setCustomer(c.name);
    setCustomerId(c.id);
    setPhone(c.phone);
    setAddress(c.address);
    if (c.rx) setRx(c.rx);
    setShowCustomerLookup(false);
  };

  const totals = lines.reduce((acc, l) => ({
    sub: acc.sub + (l.qty * l.rate),
    disc: acc.disc + l.disc,
    tax: acc.tax + l.tax,
    grand: acc.grand + l.total
  }), { sub: 0, disc: 0, tax: 0, grand: 0 });

  const balanceDue = totals.grand - (status === 'Paid' ? totals.grand : paidAmt);

  const [showRxHistory, setShowRxHistory] = useState(false);
  const [rxHistory, setRxHistory] = useState<any[]>([]);

  const fetchRxHistory = async () => {
    if (!customerId || !user) return;
    const historyRef = collection(db, 'users', user.uid, 'customers', customerId, 'prescriptions');
    const q = query(historyRef, orderBy('date', 'desc'), limit(10));
    
    try {
      const snap = await getDocs(q);
      const history = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setRxHistory(history);
      setShowRxHistory(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, historyRef.path);
    }
  };

  const handleSave = (print = false) => {
    const validLines = lines.filter(l => l.btc.trim() !== '');
    if (validLines.length === 0) {
      showNotification('Please add at least one item with a valid BTC code.', 'error');
      return;
    }

    const grand = totals.grand;
    const paid = status === 'Paid' ? grand : status === 'Partial' ? paidAmt : 0;
    
    localStorage.removeItem('invoice_draft');
    onSave({
      num: nextNum,
      date,
      day: getDayName(date),
      customer: customer || 'Unknown',
      customerId: customerId || phone || customer,
      phone,
      addr: address,
      due: dueDate,
      rx,
      status,
      method,
      transactionId,
      lines: validLines,
      sub: totals.sub,
      disc: totals.disc,
      tax: totals.tax,
      grand,
      paid,
      balanceDue,
      labStatus,
      isQuickSale
    }, print);
  };

  const quickLensOptions = state.items.filter(i => i.category === 'Lens');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-[#fff7ed] border-2 border-[rgba(14,165,233,0.2)] rounded-full px-4 py-1.5 w-fit">
          <span className="text-[11px] font-extrabold text-orange-primary uppercase tracking-widest">🧾 {initialData ? 'Edit Invoice' : 'New Invoice'}</span>
          <span className="w-1 h-1 rounded-full bg-[rgba(249,115,22,0.3)]"></span>
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">{initialData ? 'Editing' : 'Next'}: <strong>{nextNum}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {customerId && (
            <button 
              onClick={fetchRxHistory}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all"
            >
              <History size={14} /> Rx History
            </button>
          )}
          <button 
            onClick={() => setIsQuickSale(!isQuickSale)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest transition-all ${
              isQuickSale 
              ? 'bg-orange-primary text-white shadow-lg shadow-[rgba(249,115,22,0.2)]' 
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Zap size={14} /> {isQuickSale ? 'Quick Sale Active' : 'Enable Quick Sale'}
          </button>
        </div>
      </div>

      {draftToRestore && (
        <div className="bg-[#fff7ed] border-2 border-[rgba(249,115,22,0.2)] rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[rgba(249,115,22,0.1)] flex items-center justify-center text-orange-primary">
              <Save size={16} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Draft Found</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">A saved draft from {new Date(draftToRestore.timestamp).toLocaleString()} was found.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={restoreDraft} className="bg-orange-primary text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest hover:bg-orange-600 transition-all">
              Restore
            </button>
            <button onClick={discardDraft} className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest hover:bg-slate-300 transition-all">
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-container">
            <div className="px-4 py-3 border-b-2 border-slate-50 bg-[#f8fafc] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Customer & Order Info</h3>
              <div ref={customerRef}>
                <button 
                  onClick={() => setShowCustomerLookup(true)}
                  className="text-[10px] font-extrabold text-orange-primary uppercase tracking-widest flex items-center gap-1 hover:bg-orange-50 px-2 py-1 rounded-lg transition-colors"
                >
                  <Search size={12} /> Lookup Customer
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Customer Name</label>
                <input className="input-field" placeholder="e.g. Tashi Dorji" value={customer} onChange={e => setCustomer(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <input className="input-field" placeholder="e.g. 17XXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              {!isQuickSale && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Date</label>
                    <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Due Date</label>
                    <input type="date" className="input-field" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Address / TPN</label>
                    <input className="input-field" placeholder="Thimphu, Bhutan" value={address} onChange={e => setAddress(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card-container">
            <div className="px-4 py-3 border-b-2 border-slate-50 bg-[#f8fafc] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FlaskConical size={16} className="text-blue-600" /> Rx Grid (Clinical Precision)
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OD: Right · OS: Left</span>
            </div>
            <div className="p-4">
              <RxGrid rx={rx} onChange={setRx} />
            </div>
          </div>

          <div className="card-container">
            <div className="px-4 py-3 border-b-2 border-slate-50 bg-[#f8fafc] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Line Items</h3>
              <div className="flex gap-2">
                {isQuickSale && quickLensOptions.map(lens => (
                  <button 
                    key={lens.id}
                    onClick={() => {
                      const newLines = [...lines];
                      newLines.push({
                        desc: lens.n,
                        btc: lens.btc,
                        qty: 1,
                        unit: lens.u,
                        rate: lens.p,
                        disc: 0,
                        st: lens.st,
                        net: lens.p,
                        tax: lens.p * (lens.st / 100),
                        total: lens.p * (1 + lens.st / 100),
                        isLens: true,
                        lensType: lens.n
                      });
                      setLines(newLines);
                    }}
                    className="text-[9px] font-extrabold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                  >
                    + {lens.n}
                  </button>
                ))}
                <button onClick={addLine} className="btn-secondary py-1 px-3 text-[10px]">
                  <Plus size={12} className="inline mr-1" /> Add Line
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header min-w-[200px]">Item {isQuickSale && '(Scan Barcode)'}</th>
                    <th className="table-header w-20">Qty</th>
                    <th className="table-header w-28">Rate</th>
                    <th className="table-header w-24">Disc</th>
                    <th className="table-header w-32 text-right">Total</th>
                    <th className="table-header w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2">
                        <div 
                          ref={el => { rowRefs.current[idx] = el; }}
                          onClick={() => setActiveRowIdx(idx)}
                          className={`input-field cursor-pointer min-h-[38px] flex items-center truncate ${!line.desc ? 'text-slate-400 italic' : 'text-slate-900'}`}
                        >
                          {line.desc || (isQuickSale ? 'Scan/Search...' : 'Search Frame/Lens...')}
                        </div>
                      </td>
                      <td className="p-2"><input type="number" className="input-field" value={line.qty} onChange={e => updateLine(idx, 'qty', +e.target.value)} /></td>
                      <td className="p-2"><input type="number" className="input-field" value={line.rate} onChange={e => updateLine(idx, 'rate', +e.target.value)} /></td>
                      <td className="p-2"><input type="number" className="input-field" value={line.disc} onChange={e => updateLine(idx, 'disc', +e.target.value)} /></td>
                      <td className="p-2 text-right font-bold text-orange-primary">{Nu(line.total)}</td>
                      <td className="p-2">
                        <button onClick={() => removeLine(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-container p-5 bg-gradient-to-br from-[#fff7ed] to-[rgba(255,237,213,0.3)] border-2 border-[rgba(249,115,22,0.1)] space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest border-b border-[rgba(249,115,22,0.1)] pb-2">Summary & Payment</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold text-slate-500">
                <span>Subtotal</span>
                <span>{Nu(totals.sub)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-500">
                <span>Discount</span>
                <span>{Nu(totals.disc)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-500">
                <span>Sales Tax</span>
                <span>{Nu(totals.tax)}</span>
              </div>
              <div className="pt-3 border-t-2 border-[rgba(249,115,22,0.1)] flex justify-between items-center">
                <span className="text-sm font-extrabold text-slate-900">Grand Total</span>
                <span className="text-xl font-extrabold text-orange-primary tracking-tight">{Nu(totals.grand)}</span>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Payment Status</label>
                <select className="input-field" value={status} onChange={e => setStatus(e.target.value as any)}>
                  <option value="Unpaid">Unpaid (0%)</option>
                  <option value="Partial">Partial (Deposit)</option>
                  <option value="Paid">Fully Paid (100%)</option>
                </select>
              </div>

              {status === 'Partial' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Deposit Amount (NU)</label>
                  <input type="number" className="input-field font-bold text-orange-primary" value={paidAmt} onChange={e => setPaidAmt(+e.target.value)} />
                  <div className="flex justify-between text-[10px] font-bold text-red-500 uppercase mt-1">
                    <span>Balance Due:</span>
                    <span>{Nu(balanceDue)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Payment Method</label>
                <select className="input-field" value={method} onChange={e => setMethod(e.target.value)}>
                  <option>Cash</option>
                  <option>mBoB (Digital)</option>
                  <option>eTeeru (Digital)</option>
                  <option>Card</option>
                  <option>Cheque</option>
                </select>
              </div>

              {(method === 'mBoB (Digital)' || method === 'eTeeru (Digital)') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Transaction ID</label>
                  <input className="input-field" placeholder="Ref # for reconciliation" value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Lab Status</label>
                <select className="input-field" value={labStatus} onChange={e => setLabStatus(e.target.value as any)}>
                  <option value="Pending">Pending (In Lab)</option>
                  <option value="In Progress">Fitting...</option>
                  <option value="Ready">Ready for Pickup</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button onClick={() => handleSave(false)} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                <Save size={18} /> Save Record
              </button>
              <button onClick={() => handleSave(true)} className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <Printer size={18} /> Save & Print
              </button>
              <button onClick={onCancel} className="w-full btn-secondary flex items-center justify-center gap-2 py-2">
                <X size={16} /> Cancel
              </button>
            </div>
          </div>

          <div className="card-container p-4 bg-[rgba(239,246,255,0.3)] border border-blue-100">
            <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <History size={12} /> Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleSave(true)}
                className="p-2 bg-white border border-blue-100 rounded-lg text-center hover:shadow-sm transition-all group"
              >
                <div className="text-[9px] font-extrabold text-slate-500 uppercase group-hover:text-blue-600">A4 PDF</div>
              </button>
              <button 
                onClick={() => handleSave(true)}
                className="p-2 bg-white border border-blue-100 rounded-lg text-center hover:shadow-sm transition-all group"
              >
                <div className="text-[9px] font-extrabold text-slate-500 uppercase group-hover:text-blue-600">80mm Thermal</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRxHistory && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgba(2,6,23,0.6)] backdrop-blur-sm" onClick={() => setShowRxHistory(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-[rgba(249,115,22,0.1)] p-8 max-w-2xl w-full space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <History className="text-blue-600" /> Vision History: {customer}
              </h3>
              <button onClick={() => setShowRxHistory(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {rxHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                  No previous prescriptions found for this customer.
                </div>
              ) : (
                rxHistory.map((h, i) => (
                  <div key={i} className={`p-4 border rounded-2xl space-y-3 ${i === 0 ? 'bg-[rgba(239,246,255,0.5)] border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {i === 0 ? 'Latest Prescription' : `Visit on ${h.date}`}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{h.date}</span>
                    </div>
                    <RxGrid rx={h} onChange={() => {}} readOnly />
                    {h.invoiceNum && (
                      <div className="text-[9px] font-bold text-slate-400 uppercase">
                        Invoice: <span className="text-slate-900">{h.invoiceNum}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="text-center pt-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic">
                Medical records are synced across all devices.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeRowIdx !== null && (
        <ItemDropdown 
          items={state.items}
          anchorRef={{ current: rowRefs.current[activeRowIdx] }}
          onSelect={handleItemSelect}
          onClose={() => setActiveRowIdx(null)}
        />
      )}

      {showCustomerLookup && (
        <CustomerDropdown 
          customers={state.customers}
          anchorRef={customerRef}
          onSelect={handleCustomerSelect}
          onClose={() => setShowCustomerLookup(false)}
        />
      )}
    </div>
  );
};

export default InvoiceForm;
