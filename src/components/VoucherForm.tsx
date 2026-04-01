import React, { useState } from 'react';
import { AppState, formatDocNum, today, getDayName, Nu } from '../utils';
import { Save, X, Printer } from 'lucide-react';

interface VoucherFormProps {
  type: 'Receipt' | 'Payment';
  state: AppState;
  onSave: (voucher: any, print?: boolean) => void;
  onCancel: () => void;
  initialData?: any;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const VoucherForm: React.FC<VoucherFormProps> = ({ type, state, onSave, onCancel, initialData, showNotification }) => {
  const nextNum = initialData ? initialData.num : formatDocNum(type === 'Receipt' ? 'rec' : 'pay', type === 'Receipt' ? state.counters.rec : state.counters.pay);
  const [date, setDate] = useState(initialData?.date || today());
  const [party, setParty] = useState(initialData?.party || '');
  const [acct, setAcct] = useState(initialData?.acct || '');
  const [amount, setAmount] = useState(initialData?.amount || 0);
  const [method, setMethod] = useState(initialData?.method || 'Cash');
  const [desc, setDesc] = useState(initialData?.desc || '');

  const handleSave = (print = false) => {
    onSave({
      num: nextNum,
      date,
      day: getDayName(date),
      party: party || '—',
      acct: acct || '—',
      amount,
      method,
      desc,
      type
    }, print);
  };

  return (
    <div className="space-y-6">
      <div className={`flex items-center gap-3 border-2 rounded-full px-4 py-1.5 w-fit ${
        type === 'Receipt' ? 'bg-[#fff7ed] border-[rgba(249,115,22,0.2)]' : 'bg-[#fef2f2] border-[rgba(220,38,38,0.2)]'
      }`}>
        <span className={`text-[11px] font-extrabold uppercase tracking-widest ${
          type === 'Receipt' ? 'text-orange-primary' : 'text-red-600'
        }`}>
          {type === 'Receipt' ? (initialData ? '💰 Edit Receipt' : '💰 Receipt Voucher') : (initialData ? '💸 Edit Payment' : '💸 Payment Voucher')}
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">{initialData ? 'Editing' : 'Next'}: <strong>{nextNum}</strong></span>
      </div>

      <div className="card-container max-w-2xl">
        <div className="px-4 py-3 border-b-2 border-slate-50 bg-[#f8fafc]">
          <h3 className="text-sm font-extrabold text-slate-900">{type} Details</h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Voucher #</label>
            <input className="input-field bg-slate-50 border-slate-200 text-slate-400" value={nextNum} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Date</label>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{type === 'Receipt' ? 'Received From' : 'Paid To'}</label>
            <input className="input-field" placeholder="Name / party" value={party} onChange={e => setParty(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Account / Particular</label>
            <input className="input-field" placeholder="e.g. Office rent" value={acct} onChange={e => setAcct(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Amount (Nu.)</label>
            <input type="number" className="input-field text-lg text-orange-primary" value={amount} onChange={e => setAmount(+e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Payment Method</label>
            <select className="input-field" value={method} onChange={e => setMethod(e.target.value)}>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Card</option>
              <option>Paytm</option>
              <option>Cheque</option>
              <option>UPI</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Description</label>
            <input className="input-field" placeholder="Optional note" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          
          <div className="sm:col-span-2 flex flex-wrap gap-3 pt-4">
            <button onClick={() => handleSave(false)} className="btn-primary flex items-center gap-2">
              <Save size={16} /> Save Voucher
            </button>
            <button onClick={() => handleSave(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2">
              <Printer size={16} /> Save & Print
            </button>
            <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherForm;
