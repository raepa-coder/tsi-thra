import React, { useState, useRef, useEffect } from 'react';
import { AppState, formatDocNum, today, getDayName, Nu } from '../utils';
import { PurchaseItem, BTCItem } from '../types';
import { Plus, Trash2, Save, X, Printer } from 'lucide-react';
import ItemDropdown from './ItemDropdown';

interface PurchaseFormProps {
  state: AppState;
  onSave: (purchase: any, print?: boolean) => void;
  onCancel: () => void;
  initialData?: any;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ state, onSave, onCancel, initialData, showNotification }) => {
  const nextNum = initialData ? initialData.num : formatDocNum('pur', state.counters.pur);
  const [date, setDate] = useState(initialData?.date || today());
  const [supplier, setSupplier] = useState(initialData?.supplier || '');
  const [status, setStatus] = useState<'Unpaid' | 'Paid' | 'Partial'>(initialData?.status || 'Unpaid');
  const [method, setMethod] = useState(initialData?.method || 'Cash');
  const [paidAmt, setPaidAmt] = useState(initialData?.paid || 0);
  const [ref, setRef] = useState(initialData?.ref || '');
  const [items, setItems] = useState<PurchaseItem[]>(initialData?.items || [
    { desc: '', btc: '', qty: 1, unit: '', rate: 0, cd: 0, st: 0, val: 0, duty: 0, tax: 0, landed: 0 }
  ]);

  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [draftToRestore, setDraftToRestore] = useState<any | null>(null);

  // Load draft on mount
  useEffect(() => {
    if (!initialData) {
      const draft = localStorage.getItem('purchase_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setDraftToRestore(parsed);
        } catch (e) {
          console.error('Failed to parse purchase draft', e);
        }
      }
    }
  }, [initialData]);

  const restoreDraft = () => {
    if (draftToRestore) {
      setDate(draftToRestore.date);
      setSupplier(draftToRestore.supplier);
      setStatus(draftToRestore.status);
      setMethod(draftToRestore.method);
      setPaidAmt(draftToRestore.paid);
      setRef(draftToRestore.ref);
      setItems(draftToRestore.items);
      setDraftToRestore(null);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem('purchase_draft');
    setDraftToRestore(null);
  };

  // Auto-save every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const draftData = {
        date,
        supplier,
        status,
        method,
        paid: paidAmt,
        ref,
        items,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('purchase_draft', JSON.stringify(draftData));
      setLastAutoSave(new Date().toLocaleTimeString());
    }, 60000);

    return () => clearInterval(interval);
  }, [date, supplier, status, method, paidAmt, ref, items]);

  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const addItem = () => {
    setItems([...items, { desc: '', btc: '', qty: 1, unit: '', rate: 0, cd: 0, st: 0, val: 0, duty: 0, tax: 0, landed: 0 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const updateItem = (idx: number, field: keyof PurchaseItem, val: any) => {
    const newItems = [...items];
    const item = { ...newItems[idx], [field]: val };
    
    // Recalculate
    const v = item.qty * item.rate;
    const d = v * (item.cd / 100);
    const t = (v + d) * (item.st / 100);
    item.val = v;
    item.duty = d;
    item.tax = t;
    item.landed = v + d + t;
    
    newItems[idx] = item;
    setItems(newItems);
  };

  const handleItemSelect = (item: BTCItem) => {
    if (activeRowIdx === null) return;
    const newItems = [...items];
    const row = { ...newItems[activeRowIdx] };
    
    row.desc = item.n;
    row.btc = item.btc;
    row.unit = item.u;
    row.rate = item.p;
    row.cd = item.cd;
    row.st = item.st;
    
    const v = row.qty * row.rate;
    const d = v * (row.cd / 100);
    const t = (v + d) * (row.st / 100);
    row.val = v;
    row.duty = d;
    row.tax = t;
    row.landed = v + d + t;
    
    newItems[activeRowIdx] = row;
    setItems(newItems);
    setActiveRowIdx(null);
  };

  const totals = items.reduce((acc, l) => ({
    val: acc.val + l.val,
    cd: acc.cd + l.duty,
    st: acc.st + l.tax,
    grand: acc.grand + l.landed
  }), { val: 0, cd: 0, st: 0, grand: 0 });

  const handleSave = (print = false) => {
    const validItems = items.filter(i => i.btc.trim() !== '');
    if (validItems.length === 0) {
      showNotification('Please add at least one item with a valid BTC code.', 'error');
      return;
    }

    const grand = totals.grand;
    const paid = status === 'Paid' ? grand : status === 'Partial' ? paidAmt : 0;

    localStorage.removeItem('purchase_draft');
    onSave({
      num: nextNum,
      date,
      day: getDayName(date),
      supplier: supplier || 'Unknown',
      status,
      method,
      ref,
      items: validItems,
      val: totals.val,
      cd: totals.cd,
      st: totals.st,
      grand,
      paid
    }, print);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-[#fff7ed] border-2 border-[rgba(14,165,233,0.2)] rounded-full px-4 py-1.5 w-fit">
        <span className="text-[11px] font-extrabold text-orange-primary uppercase tracking-widest">🛒 {initialData ? 'Edit Purchase' : 'New Purchase'}</span>
        <span className="w-1 h-1 rounded-full bg-[rgba(249,115,22,0.3)]"></span>
        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">{initialData ? 'Editing' : 'Next'}: <strong>{nextNum}</strong></span>
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

      <div className="card-container">
        <div className="px-4 py-3 border-b-2 border-slate-50 bg-[#f8fafc]">
          <h3 className="text-sm font-extrabold text-slate-900">Purchase Details</h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Purchase #</label>
            <input className="input-field bg-[#fff7ed] border-[rgba(249,115,22,0.2)] text-orange-primary" value={nextNum} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Date</label>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Supplier</label>
            <input className="input-field" placeholder="e.g. Phuentsholing Market" value={supplier} onChange={e => setSupplier(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Status</label>
            <select className="input-field" value={status} onChange={e => setStatus(e.target.value as any)}>
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {status === 'Partial' && (
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Paid Amount (Nu.)</label>
              <input 
                type="number" 
                className="input-field" 
                value={paidAmt} 
                onChange={e => setPaidAmt(Number(e.target.value))} 
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Payment Method</label>
            <select className="input-field" value={method} onChange={e => setMethod(e.target.value)}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Card</option>
              <option>Cheque</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Reference</label>
            <input className="input-field" placeholder="Optional" value={ref} onChange={e => setRef(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card-container">
        <div className="px-4 py-3 border-b-2 border-slate-50 bg-[#f8fafc] flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">Items</h3>
          <button onClick={addItem} className="btn-secondary py-1 px-3 text-[10px]">
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
                <th className="table-header w-20">CD %</th>
                <th className="table-header w-20">ST %</th>
                <th className="table-header w-32 text-right">Landed</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2">
                    <div 
                      ref={el => { rowRefs.current[idx] = el; }}
                      onClick={() => setActiveRowIdx(idx)}
                      className={`input-field cursor-pointer min-h-[38px] flex items-center truncate ${!item.desc ? 'text-slate-400 italic' : 'text-slate-900'}`}
                    >
                      {item.desc || 'Click to search items...'}
                    </div>
                  </td>
                  <td className="p-2"><input className="input-field text-xs" value={item.btc} onChange={e => updateItem(idx, 'btc', e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value)} /></td>
                  <td className="p-2"><input className="input-field" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={item.rate} onChange={e => updateItem(idx, 'rate', +e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={item.cd} onChange={e => updateItem(idx, 'cd', +e.target.value)} /></td>
                  <td className="p-2"><input type="number" className="input-field" value={item.st} onChange={e => updateItem(idx, 'st', +e.target.value)} /></td>
                  <td className="p-2 text-right font-bold text-red-600">{Nu(item.landed)}</td>
                  <td className="p-2">
                    <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-[rgba(248,250,252,0.3)] border-t-2 border-slate-50">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 pt-4">
              <div className="flex flex-wrap gap-3">
                <button onClick={() => handleSave(false)} className="btn-primary flex items-center gap-2">
                  <Save size={16} /> Save Purchase
                </button>
                <button onClick={() => handleSave(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
                  <Printer size={16} /> Save & Print
                </button>
                <button onClick={() => {
                  localStorage.removeItem('purchase_draft');
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
            
            <div className="w-full md:w-80 bg-gradient-to-br from-[#fff7ed] to-[rgba(255,237,213,0.3)] border-2 border-[rgba(249,115,22,0.1)] rounded-xl p-5 space-y-3">
              <div className="flex justify-between text-sm font-bold text-slate-500">
                <span>Purchase Value</span>
                <span>{Nu(totals.val)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-500">
                <span>Customs Duty</span>
                <span>{Nu(totals.cd)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-500">
                <span>Sales Tax</span>
                <span>{Nu(totals.st)}</span>
              </div>
              <div className="pt-3 border-t-2 border-[rgba(249,115,22,0.1)] flex justify-between items-center">
                <span className="text-sm font-extrabold text-slate-900">Total Landed Cost</span>
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
    </div>
  );
};

export default PurchaseForm;
