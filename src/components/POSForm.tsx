import React, { useState, useRef } from 'react';
import { AppState, formatDocNum, today, getDayName, Nu } from '../utils';
import { BTCItem, Customer } from '../types';
import { Plus, Trash2, Save, X, Store, Printer, Search } from 'lucide-react';
import ItemDropdown from './ItemDropdown';
import CustomerDropdown from './CustomerDropdown';
import { User } from 'firebase/auth';

interface POSFormProps {
  state: AppState;
  user: User | null;
  onSave: (sale: any, print?: boolean) => void;
  onCancel: () => void;
  initialData?: any;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const POSForm: React.FC<POSFormProps> = ({ state, user, onSave, onCancel, initialData, showNotification }) => {
  const nextNum = initialData ? initialData.num : formatDocNum('pos', state.counters.pos);
  const [date, setDate] = useState(initialData?.date || today());
  const [customer, setCustomer] = useState(initialData?.customer || 'Walk-in');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [powerL, setPowerL] = useState(initialData?.powerL || '');
  const [powerR, setPowerR] = useState(initialData?.powerR || '');
  const [method, setMethod] = useState(initialData?.method || 'Cash');
  const [lines, setLines] = useState<any[]>(initialData?.lines || [
    { desc: '', btc: '', qty: 1, rate: 0, disc: 0, st: 0, net: 0, tax: 0, total: 0 }
  ]);

  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);
  const [showCustomerLookup, setShowCustomerLookup] = useState(false);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const customerRef = useRef<HTMLDivElement>(null);

  const addLine = () => {
    setLines([...lines, { desc: '', btc: '', qty: 1, rate: 0, disc: 0, st: 0, net: 0, tax: 0, total: 0 }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const updateLine = (idx: number, field: string, val: any) => {
    const newLines = [...lines];
    const line = { ...newLines[idx], [field]: val };
    
    // Recalculate
    const n = line.qty * line.rate - line.disc;
    const t = n * (line.st / 100);
    line.net = n;
    line.tax = t;
    line.total = n + t;
    
    newLines[idx] = line;
    setLines(newLines);
  };

  const handleItemSelect = (item: BTCItem) => {
    if (activeRowIdx === null) return;
    const newLines = [...lines];
    const line = { ...newLines[activeRowIdx] };
    
    line.desc = item.n;
    line.btc = item.btc;
    line.rate = item.p;
    line.st = item.st;
    
    const n = line.qty * line.rate - line.disc;
    const t = n * (line.st / 100);
    line.net = n;
    line.tax = t;
    line.total = n + t;
    
    newLines[activeRowIdx] = line;
    setLines(newLines);
    setActiveRowIdx(null);
  };

  const handleCustomerSelect = (c: Customer) => {
    setCustomer(c.name);
    setPhone(c.phone);
    if (c.rx) {
      setPowerL(c.rx.os.sph); // Fallback or just ignore
      setPowerR(c.rx.od.sph);
    }
    setShowCustomerLookup(false);
  };

  const totals = lines.reduce((acc, l) => ({
    net: acc.net + l.net,
    tax: acc.tax + l.tax,
    total: acc.total + l.total
  }), { net: 0, tax: 0, total: 0 });

  const handleSave = (print = false) => {
    const validLines = lines.filter(l => l.btc && l.btc.trim() !== '');
    if (validLines.length === 0) {
      showNotification('Please add at least one item with a valid BTC code.', 'error');
      return;
    }

    const item = validLines.map(l => l.desc).filter(Boolean).join(', ') || 'Item';
    onSave({
      num: nextNum,
      date,
      day: getDayName(date),
      customer,
      phone,
      powerL,
      powerR,
      item,
      lines: validLines,
      method,
      net: totals.net,
      tax: totals.tax,
      total: totals.total
    }, print);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-[rgba(14,165,233,0.1)] border-2 border-[rgba(249,115,22,0.2)] rounded-full px-4 py-1.5 w-fit">
        <span className="text-[11px] font-extrabold text-orange-primary uppercase tracking-widest">🏪 {initialData ? 'Edit POS Sale' : 'POS Sale'}</span>
        <span className="w-1 h-1 rounded-full bg-[rgba(249,115,22,0.3)]"></span>
        <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{initialData ? 'Editing' : 'Next'}: <strong>{nextNum}</strong></span>
      </div>

      <div className="card-container">
        <div className="px-4 py-3 border-b-2 border-slate-50 dark:border-slate-800 bg-[#f8fafc] dark:bg-[rgba(15,23,42,0.5)] flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Sale Details</h3>
          <div ref={customerRef}>
            <button 
              onClick={() => setShowCustomerLookup(true)}
              className="text-[10px] font-extrabold text-orange-primary uppercase tracking-widest flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-slate-800 px-2 py-1 rounded-lg transition-colors"
            >
              <Search size={12} /> Lookup Customer
            </button>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Receipt #</label>
            <input className="input-field bg-[#fff7ed] dark:bg-[rgba(12,74,110,0.1)] border-[rgba(249,115,22,0.2)] text-orange-primary" value={nextNum} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</label>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</label>
            <input className="input-field" placeholder="Walk-in" value={customer} onChange={e => setCustomer(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number</label>
            <input className="input-field" placeholder="e.g. 17XXXXXX" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Eye Power (Left - L)</label>
            <input className="input-field" placeholder="e.g. -1.25 SPH" value={powerL} onChange={e => setPowerL(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Eye Power (Right - R)</label>
            <input className="input-field" placeholder="e.g. -1.50 SPH" value={powerR} onChange={e => setPowerR(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card-container">
        <div className="px-4 py-3 border-b-2 border-slate-50 dark:border-slate-800 bg-[#f8fafc] dark:bg-[rgba(15,23,42,0.5)] flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Items</h3>
          <button onClick={addLine} className="btn-secondary py-1 px-3 text-[10px]">
            <Plus size={12} className="inline mr-1" /> Add Item
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header min-w-[200px]">Item</th>
                <th className="table-header w-20">Qty</th>
                <th className="table-header w-28">Price</th>
                <th className="table-header w-24">Disc</th>
                <th className="table-header w-20">ST %</th>
                <th className="table-header w-32 text-right">Total</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[rgba(30,41,59,0.5)] transition-colors">
                  <td className="p-2">
                    <div 
                      ref={el => { rowRefs.current[idx] = el; }}
                      onClick={() => setActiveRowIdx(idx)}
                      className={`input-field cursor-pointer min-h-[38px] flex items-center truncate ${!line.desc ? 'text-slate-400 italic' : 'text-slate-900 dark:text-slate-100'}`}
                    >
                      {line.desc || 'Click to search items...'}
                    </div>
                  </td>
                  <td className="p-2"><input type="number" className="input-field" value={line.qty} onChange={e => updateLine(idx, 'qty', +e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={line.rate} onChange={e => updateLine(idx, 'rate', +e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={line.disc} onChange={e => updateLine(idx, 'disc', +e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={line.st} onChange={e => updateLine(idx, 'st', +e.target.value)} /></td>
                  <td className="p-2 text-right font-bold text-orange-primary">{Nu(line.total)}</td>
                  <td className="p-2">
                    <button onClick={() => removeLine(idx)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-[rgba(248,250,252,0.3)] dark:bg-[rgba(15,23,42,0.3)] border-t-2 border-slate-50 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Method</label>
                <select className="input-field" value={method} onChange={e => setMethod(e.target.value)}>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Paytm</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <button onClick={() => handleSave(false)} className="btn-primary flex items-center gap-2">
                  <Save size={16} /> Record Sale
                </button>
                <button onClick={() => handleSave(true)} className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                  <Printer size={16} /> Record & Print
                </button>
                <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
            
            <div className="w-full md:w-80 bg-gradient-to-br from-[#fff7ed] to-[rgba(255,237,213,0.3)] dark:from-[rgba(124,45,18,0.1)] dark:to-[rgba(7,89,133,0.05)] border-2 border-[rgba(249,115,22,0.1)] rounded-xl p-5 space-y-3">
              <div className="flex justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                <span>Net Amount</span>
                <span>{Nu(totals.net)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                <span>Sales Tax</span>
                <span>{Nu(totals.tax)}</span>
              </div>
              <div className="pt-3 border-t-2 border-[rgba(249,115,22,0.1)] dark:border-[rgba(124,45,18,0.2)] flex justify-between items-center">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Total</span>
                <span className="text-xl font-extrabold text-orange-primary tracking-tight">{Nu(totals.total)}</span>
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

export default POSForm;
