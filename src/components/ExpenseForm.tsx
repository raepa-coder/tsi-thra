import React, { useState, useEffect } from 'react';
import { AppState, today, getDayName, formatDocNum } from '../utils';
import { Save, Printer, X, Calendar, CreditCard, Tag, FileText } from 'lucide-react';

interface ExpenseFormProps {
  state: AppState;
  onSave: (expense: any, print?: boolean) => void;
  onAddCategory: (category: any) => void;
  onCancel: () => void;
  initialData?: any;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ state, onSave, onAddCategory, onCancel, initialData, showNotification }) => {
  const [formData, setFormData] = useState({
    num: initialData?.num || formatDocNum('exp', state.counters.exp),
    date: initialData?.date || today(),
    day: initialData?.day || getDayName(today()),
    categoryId: initialData?.categoryId || '',
    categoryName: initialData?.categoryName || '',
    amount: initialData?.amount || 0,
    method: initialData?.method || 'Cash',
    desc: initialData?.desc || '',
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, day: getDayName(formData.date) }));
  }, [formData.date]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = e.target.value;
    const cat = state.expenseCategories.find(c => c.id === catId);
    setFormData({ ...formData, categoryId: catId, categoryName: cat?.name || '' });
  };

  const handleSubmit = (e: React.FormEvent, print = false) => {
    e.preventDefault();
    if (!formData.categoryId || formData.amount <= 0) {
      alert('Please select a category and enter a valid amount.');
      return;
    }
    onSave(formData, print);
  };

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const handleQuickAdd = () => {
    if (!newCatName.trim()) return;
    const newCat = { id: Date.now().toString(), name: newCatName.trim() };
    onAddCategory(newCat);
    setFormData({ ...formData, categoryId: newCat.id, categoryName: newCat.name });
    setShowQuickAdd(false);
    setNewCatName('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={(e) => handleSubmit(e)} className="card-container overflow-hidden">
        <div className="strip-header p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[rgba(255,255,255,0.2)] rounded-2xl flex items-center justify-center backdrop-blur-md">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Record Expense</h2>
              <p className="text-[rgba(255,255,255,0.6)] text-[10px] font-bold uppercase tracking-widest">Document #{formData.num}</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
            <X className="text-white" size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> Date
              </label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field font-bold"
                autoFocus={!initialData}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Tag size={12} /> Category
                </label>
                <button 
                  type="button"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  className="text-[10px] font-black text-orange-primary uppercase tracking-widest hover:underline"
                >
                  {showQuickAdd ? 'Cancel' : '+ Quick Add'}
                </button>
              </div>
              
              {showQuickAdd ? (
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New category name..."
                    className="input-field font-bold flex-1"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={handleQuickAdd}
                    className="bg-orange-primary text-white px-3 rounded-xl font-bold text-xs"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <select 
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                  className="input-field font-bold"
                >
                  <option value="">Select Category</option>
                  {state.expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Nu. Amount
              </label>
              <input 
                type="number" 
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="input-field text-xl font-black text-orange-primary"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={12} /> Payment Method
              </label>
              <select 
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="input-field font-bold"
              >
                <option value="Cash">Cash</option>
                <option value="mBoB">mBoB</option>
                <option value="e-Teeru">e-Teeru</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Remarks</label>
            <textarea 
              value={formData.desc}
              onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
              className="input-field min-h-[100px] font-bold py-3"
              placeholder="Enter expense details..."
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-[rgba(15,23,42,0.5)] border-t-2 border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button 
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            className="px-6 py-3 rounded-xl bg-slate-900 text-white font-extrabold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Printer size={16} /> Save & Print
          </button>
          <button 
            type="submit"
            className="px-8 py-3 rounded-xl bg-orange-primary text-white font-extrabold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-orange-600 shadow-lg shadow-[rgba(14,165,233,0.2)] transition-all"
          >
            <Save size={16} /> Save Expense
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
