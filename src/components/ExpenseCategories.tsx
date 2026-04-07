import React, { useState } from 'react';
import { AppState } from '../utils';
import { ExpenseCategory } from '../types';
import { Plus, Trash2, Edit2, X, Save, Tag } from 'lucide-react';

interface ExpenseCategoriesProps {
  state: AppState;
  onSave: (category: ExpenseCategory) => void;
  onDelete: (id: string) => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const ExpenseCategories: React.FC<ExpenseCategoriesProps> = ({ state, onSave, onDelete, showNotification }) => {
  const [newCat, setNewCat] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    onSave({ id: Date.now().toString(), name: newCat.trim() });
    setNewCat('');
  };

  const handleUpdate = (id: string) => {
    if (!editVal.trim()) return;
    onSave({ id, name: editVal.trim() });
    setEditing(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <form onSubmit={handleAdd} className="card-container p-6 flex gap-4 items-end bg-gradient-to-br from-slate-50 to-[rgba(255,247,237,0.3)] dark:from-slate-900 dark:to-[rgba(12,74,110,0.1)]">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Tag size={12} /> New Category Name
          </label>
          <input 
            type="text" 
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="input-field font-bold"
            placeholder="e.g. Office Supplies"
          />
        </div>
        <button 
          type="submit"
          className="px-6 py-3 rounded-xl bg-orange-primary text-white font-extrabold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-orange-600 shadow-lg shadow-[rgba(14,165,233,0.2)] transition-all"
        >
          <Plus size={16} /> Add Category
        </button>
      </form>

      <div className="card-container overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-slate-50 dark:border-slate-800 bg-[#f8fafc] dark:bg-[rgba(15,23,42,0.5)]">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-widest">Expense Categories</h3>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {state.expenseCategories.map(cat => (
            <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[rgba(30,41,59,0.5)] transition-colors">
              {editing === cat.id ? (
                <div className="flex-1 flex gap-2">
                  <input 
                    type="text" 
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    className="input-field py-2 font-bold"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(cat.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <Save size={18} />
                  </button>
                  <button onClick={() => setEditing(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{cat.name}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditing(cat.id); setEditVal(cat.name); }}
                      className="p-2 text-slate-400 hover:text-orange-primary hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(cat.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {state.expenseCategories.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-bold text-sm italic">
              No categories defined.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseCategories;
