import React, { useState, useRef, useEffect } from 'react';
import { AppState, formatDocNum, today, getDayName, Nu } from '../utils';
import { InvoiceLine, BTCItem, Customer } from '../types';
import { Plus, Trash2, Save, X, Printer, Search } from 'lucide-react';
import ItemDropdown from './ItemDropdown';
import CustomerDropdown from './CustomerDropdown';

interface InvoiceFormProps {
  state: AppState;
  onSave: (invoice: any, print?: boolean) => void;
  onCancel: () => void;
  initialData?: any;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ state, onSave, onCancel, initialData }) => {
  const nextNum = initialData ? initialData.num : formatDocNum('inv', state.counters.inv);
  const [date, setDate] = useState(initialData?.date || today());
  const [customer, setCustomer] = useState(initialData?.customer || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [dueDate, setDueDate] = useState(initialData?.due || today());
  const [address, setAddress] = useState(initialData?.addr || '');
  const [powerL, setPowerL] = useState(initialData?.powerL || '');
  const [powerR, setPowerR] = useState(initialData?.powerR || '');
  const [status, setStatus] = useState<'Unpaid' | 'Paid' | 'Partial'>(initialData?.status || 'Unpaid');
  const [method, setMethod] = useState(initialData?.method || 'Cash');
  const [paidAmt, setPaidAmt] = useState(initialData?.paid || 0);
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
      setPhone(draftToRestore.phone);
      setDueDate(draftToRestore.due);
      setAddress(draftToRestore.addr);
      setPowerL(draftToRestore.powerL);
      setPowerR(draftToRestore.powerR);
      setStatus(draftToRestore.status);
      setMethod(draftToRestore.method);
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
        phone,
        due: dueDate,
        addr: address,
        powerL,
        powerR,
        status,
        method,
        paid: paidAmt,
        lines,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('invoice_draft', JSON.stringify(draftData));
      setLastAutoSave(new Date().toLocaleTimeString());
    }, 60000);

    return () => clearInterval(interval);
  }, [date, customer, phone, dueDate, address, powerL, powerR, status, method, paidAmt, lines]);

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
    setLines(newLines);
    setActiveRowIdx(null);
  };

  const handleCustomerSelect = (c: Customer) => {
    setCustomer(c.name);
    setPhone(c.phone);
    setAddress(c.address);
    setPowerL(c.powerL || '');
    setPowerR(c.powerR || '');
    setShowCustomerLookup(false);
  };

  const totals = lines.reduce((acc, l) => ({
    sub: acc.sub + (l.qty * l.rate),
    disc: acc.disc + l.disc,
    tax: acc.tax + l.tax,
    grand: acc.grand + l.total
  }), { sub: 0, disc: 0, tax: 0, grand: 0 });

  const handleSave = (print = false) => {
    const validLines = lines.filter(l => l.btc.trim() !== '');
    if (validLines.length === 0) {
      alert('Please add at least one item with a valid BTC code.');
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
      phone,
      addr: address,
      due: dueDate,
      powerL,
      powerR,
      status,
      method,
      lines: validLines,
      sub: totals.sub,
      disc: totals.disc,
      tax: totals.tax,
      grand,
      paid
    }, print);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-orange-50/50 border-2 border-orange-primary/20 rounded-full px-4 py-1.5 w-fit">
        <span className="text-[11px] font-extrabold text-orange-primary uppercase tracking-widest">🧾 {initialData ? 'Edit Invoice' : 'New Invoice'}</span>
        <span className="w-1 h-1 rounded-full bg-orange-primary/30"></span>
        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">{initialData ? 'Editing' : 'Next'}: <strong>{nextNum}</strong></span>
      </div>

      {draftToRestore && (
        <div className="bg-orange-50 border-2 border-orange-primary/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-primary/10 flex items-center justify-center text-orange-primary">
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

      <div className="card-container">
        <div className="px-4 py-3 border-b-2 border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">Invoice Details</h3>
          <div ref={customerRef}>
            <button 
              onClick={() => setShowCustomerLookup(true)}
              className="text-[10px] font-extrabold text-orange-primary uppercase tracking-widest flex items-center gap-1 hover:bg-orange-50 px-2 py-1 rounded-lg transition-colors"
            >
              <Search size={12} /> Lookup Customer
            </button>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Invoice #</label>
            <input className="input-field bg-orange-50/50 border-orange-primary/20 text-orange-primary" value={nextNum} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Date</label>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Customer Name</label>
            <input className="input-field" placeholder="e.g. Tashi Dorji" value={customer} onChange={e => setCustomer(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number</label>
            <input className="input-field" placeholder="e.g. 17XXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Due Date</label>
            <input type="date" className="input-field" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Address / TPN</label>
            <input className="input-field" placeholder="Thimphu, Bhutan" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Eye Power (Left - L)</label>
            <input className="input-field" placeholder="e.g. -1.25 SPH" value={powerL} onChange={e => setPowerL(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Eye Power (Right - R)</label>
            <input className="input-field" placeholder="e.g. -1.50 SPH" value={powerR} onChange={e => setPowerR(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Status</label>
            <select className="input-field" value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card-container">
        <div className="px-4 py-3 border-b-2 border-slate-50 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">Line Items</h3>
          <button onClick={addLine} className="btn-secondary py-1 px-3 text-[10px]">
            <Plus size={12} className="inline mr-1" /> Add Line
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header min-w-[200px]">Item</th>
                <th className="table-header w-24">BTC</th>
                <th className="table-header w-20">Qty</th>
                <th className="table-header w-20">Unit</th>
                <th className="table-header w-28">Rate</th>
                <th className="table-header w-24">Disc</th>
                <th className="table-header w-20">ST %</th>
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
                      {line.desc || 'Click to search items...'}
                    </div>
                  </td>
                  <td className="p-2"><input className="input-field text-xs" value={line.btc} onChange={e => updateLine(idx, 'btc', e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={line.qty} onChange={e => updateLine(idx, 'qty', +e.target.value)} /></td>
                  <td className="p-2"><input className="input-field" value={line.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={line.rate} onChange={e => updateLine(idx, 'rate', +e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={line.disc} onChange={e => updateLine(idx, 'disc', +e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={line.st} onChange={e => updateLine(idx, 'st', +e.target.value)} /></td>
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
        
        <div className="p-6 bg-slate-50/30 border-t-2 border-slate-50">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Payment Method</label>
                  <select className="input-field" value={method} onChange={e => setMethod(e.target.value)}>
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Card</option>
                    <option>Paytm</option>
                    <option>Cheque</option>
                    <option>Credit</option>
                    <option>UPI</option>
                  </select>
                </div>
                {status === 'Partial' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Paid Amount</label>
                    <input type="number" className="input-field" value={paidAmt} onChange={e => setPaidAmt(+e.target.value)} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <button onClick={() => handleSave(false)} className="btn-primary flex items-center gap-2">
                  <Save size={16} /> Save Invoice
                </button>
                <button onClick={() => handleSave(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
                  <Printer size={16} /> Save & Print
                </button>
                <button onClick={() => {
                  localStorage.removeItem('invoice_draft');
                  onCancel();
                }} className="btn-secondary flex items-center gap-2">
                  <X size={16} /> Cancel
                </button>
              </div>
              {lastAutoSave && (
                <p className="text-[10px] text-slate-400 italic mt-2">
                  Draft auto-saved at {lastAutoSave}
                </p>
              )}
            </div>
            
            <div className="w-full md:w-80 bg-gradient-to-br from-orange-50 to-orange-100/30 border-2 border-orange-primary/10 rounded-xl p-5 space-y-3">
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
              <div className="pt-3 border-t-2 border-orange-primary/10 flex justify-between items-center">
                <span className="text-sm font-extrabold text-slate-900">Grand Total</span>
                <span className="text-xl font-extrabold text-orange-primary tracking-tight">{Nu(totals.grand)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
