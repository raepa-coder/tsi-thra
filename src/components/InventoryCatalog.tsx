import React, { useState, useMemo } from 'react';
import { Nu, AppState } from '../utils';
import { Search, Filter, Edit2, Trash2, Plus, Save, X, AlertTriangle, Printer, CheckCircle2 } from 'lucide-react';
import { BTCItem } from '../types';

interface InventoryCatalogProps {
  state: AppState;
  onAddItem: (item: BTCItem) => Promise<void>;
  onUpdateItem: (item: BTCItem) => Promise<void>;
  onDeleteItem: (btc: string) => Promise<void>;
  onResetInventory: () => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const InventoryCatalog: React.FC<InventoryCatalogProps> = ({ state, onAddItem, onUpdateItem, onDeleteItem, onResetInventory, showNotification }) => {
  const [query, setQuery] = useState('');
  const [editingItem, setEditingItem] = useState<{ index: number; item: BTCItem } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingBtc, setDeletingBtc] = useState<string | null>(null);
  
  const [newItem, setNewItem] = useState<BTCItem>({
    n: '', btc: '', u: 'nmb', qty: 0, p: 0, cd: 0, st: 0, sup: '', reorderLevel: 0, category: 'Frame'
  });

  const handlePrint = () => {
    const printContent = document.querySelector('.print-only');
    if (!printContent) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('');

    const htmlContent = `
      <html>
        <head>
          <title>Inventory Catalog - ${state.settings.companyName}</title>
          ${styles}
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px;
              color: #0f172a;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .text-center { text-align: center; }
            .uppercase { text-transform: uppercase; }
            .tracking-widest { letter-spacing: 0.1em; }
            .mb-6 { margin-bottom: 24px; }
            .text-2xl { font-size: 24px; }
            .text-xl { font-size: 20px; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .text-slate-600 { color: #475569; }
            .text-slate-500 { color: #64748b; }
            .border-b-2 { border-bottom: 2px solid #0f172a; }
            .pb-2 { padding-bottom: 8px; }
            .mt-4 { margin-top: 16px; }
            .mt-8 { margin-top: 32px; }
            .pt-4 { padding-top: 16px; }
            .italic { font-style: italic; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.focus();
      // Revoke the URL after some time to free up memory
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      alert('Please allow popups to print the catalog.');
    }
  };

  const filteredItems = state.items.map((item, index) => ({ item, index })).filter(({ item }) => {
    const matchesQuery = !query || 
      item.n.toLowerCase().includes(query.toLowerCase()) || 
      item.btc.includes(query) || 
      item.sup.toLowerCase().includes(query.toLowerCase()) ||
      (item.desc && item.desc.toLowerCase().includes(query.toLowerCase()));
    
    return matchesQuery;
  });

  const handleEdit = (index: number, item: BTCItem) => {
    setEditingItem({ index, item: { ...item } });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    await onUpdateItem(editingItem.item);
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (!deletingBtc) return;
    await onDeleteItem(deletingBtc);
    setDeletingBtc(null);
  };

  const handleAddItem = async () => {
    if (!newItem.n || !newItem.btc) {
      alert('Item name and BTC code are required.');
      return;
    }
    
    const exists = state.items.some(i => i.btc === newItem.btc);
    if (exists) {
      alert('An item with this BTC code already exists. Please use a unique code or edit the existing item.');
      return;
    }

    await onAddItem(newItem);
    setIsAdding(false);
    setNewItem({ n: '', btc: '', u: 'nmb', qty: 0, p: 0, cd: 0, st: 0, sup: '', reorderLevel: 0, category: 'Frame' });
  };

  const ItemForm = ({ item, onChange, onSave, onCancel, title }: any) => (
    <div className="fixed inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-2 border-[rgba(249,115,22,0.2)]">
        <div className="px-6 py-4 border-b-2 border-slate-50 dark:border-slate-800 bg-[#f8fafc] dark:bg-[rgba(30,41,59,0.5)] flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">{title}</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item Name</label>
            <input className="input-field" value={item.n} onChange={e => onChange({ ...item, n: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">BTC Code</label>
            <input className="input-field" value={item.btc} onChange={e => onChange({ ...item, btc: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unit</label>
            <input className="input-field" value={item.u} onChange={e => onChange({ ...item, u: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rate (Nu.)</label>
            <input type="number" className="input-field border-[rgba(249,115,22,0.3)] focus:border-orange-primary" value={item.p} onChange={e => onChange({ ...item, p: +e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Stock</label>
            <input type="number" className="input-field bg-slate-50 dark:bg-slate-800" value={item.qty} onChange={e => onChange({ ...item, qty: +e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reorder Level</label>
            <input type="number" className="input-field" value={item.reorderLevel || 0} onChange={e => onChange({ ...item, reorderLevel: +e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CD %</label>
            <input type="number" className="input-field" value={item.cd} onChange={e => onChange({ ...item, cd: +e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ST %</label>
            <input type="number" className="input-field" value={item.st} onChange={e => onChange({ ...item, st: +e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
            <textarea className="input-field min-h-[80px] py-2" value={item.desc || ''} onChange={e => onChange({ ...item, desc: e.target.value })} placeholder="Item details, features, etc." />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier</label>
            <input className="input-field" value={item.sup} onChange={e => onChange({ ...item, sup: e.target.value })} />
          </div>
        </div>
        <div className="px-6 py-4 bg-slate-50 dark:bg-[rgba(30,41,59,0.5)] border-t-2 border-slate-50 dark:border-slate-800 flex gap-3">
          <button onClick={onSave} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Save size={16} /> Save Item
          </button>
          <button onClick={onCancel} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <X size={16} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 bg-[#fff7ed] dark:bg-[rgba(124,45,18,0.1)] border-2 border-[rgba(249,115,22,0.2)] rounded-full px-4 py-1.5 w-fit">
          <span className="text-[11px] font-extrabold text-orange-primary dark:text-orange-primary uppercase tracking-widest">📦 Inventory Catalog</span>
          <span className="w-1 h-1 rounded-full bg-[rgba(249,115,22,0.3)]"></span>
          <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{state.items.length} Items in Catalog</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button onClick={onResetInventory} className="btn-secondary flex items-center justify-center gap-2 py-1.5 text-red-500 hover:bg-red-50 hover:border-red-200 w-full sm:w-auto">
            <AlertTriangle size={16} /> Reset to Defaults
          </button>
          <button onClick={handlePrint} className="btn-secondary flex items-center justify-center gap-2 py-1.5 w-full sm:w-auto">
            <Printer size={16} /> Print Catalog
          </button>
          <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center justify-center gap-2 py-1.5 w-full sm:w-auto">
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 no-print">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            className="input-field pl-10 h-11" 
            placeholder="Search by name, BTC code or supplier..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 no-print">
        {filteredItems.length > 0 ? (
          filteredItems.map(({ item, index }) => {
            const landed = item.p * (1 + item.cd / 100) * (1 + item.st / 100);
            const isLowStock = item.qty <= state.settings.lowStockThreshold;
            
            return (
              <div key={index} className={`card-container p-4 hover:border-[rgba(249,115,22,0.3)] transition-all group relative ${isLowStock ? 'border-red-200 bg-[#fef2f2] dark:border-[rgba(127,29,29,0.3)] dark:bg-[rgba(127,29,29,0.1)]' : ''}`}>
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <button onClick={() => handleEdit(index, item)} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-400 hover:text-orange-primary hover:border-[rgba(249,115,22,0.3)] transition-all shadow-sm">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => setDeletingBtc(item.btc)} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm">
                    <Trash2 size={12} />
                  </button>
                </div>
                
                <div className="flex justify-between items-start mb-1">
                  <div className="text-[9px] font-extrabold text-orange-primary uppercase tracking-widest">OPTICAL ITEM</div>
                  {isLowStock && (
                    <div className="flex items-center gap-1 text-[8px] font-black text-red-600 bg-red-100 dark:bg-[rgba(127,29,29,0.3)] px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                      <AlertTriangle size={8} /> Low Stock
                    </div>
                  )}
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-1 line-clamp-2 leading-tight group-hover:text-orange-primary transition-colors pr-10">{item.n}</h4>
                {item.desc && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mb-3 leading-relaxed italic">{item.desc}</p>}
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>Stock Level</span>
                    <span className={`font-extrabold ${isLowStock ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>{item.qty} {item.u}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>Unit Price</span>
                    <span className="text-orange-primary font-extrabold">{Nu(item.p)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>CD / ST</span>
                    <span>{item.cd}% / {item.st}%</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-800">
                    <span>Landed Cost</span>
                    <span className="text-red-600 font-extrabold">{Nu(landed)}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">BTC {item.btc}</div>
                  <div className="text-[9px] font-bold text-slate-400 truncate max-w-[100px]">{item.sup}</div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full p-20 text-center text-slate-400 font-bold text-sm">
            No items match your search criteria.
          </div>
        )}
      </div>

      {/* Print-only table */}
      <div className="print-only">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-widest">{state.settings.companyName}</h1>
          <p className="text-sm text-slate-600">{state.settings.address}</p>
          <p className="text-sm text-slate-600">Contact: {state.settings.phone}</p>
          <div className="mt-4 border-b-2 border-slate-900 pb-2">
            <h2 className="text-xl font-extrabold uppercase tracking-wider">Inventory Catalog</h2>
            <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 p-2 text-left uppercase font-extrabold">BTC Code</th>
              <th className="border border-slate-300 p-2 text-left uppercase font-extrabold">Item Name & Description</th>
              <th className="border border-slate-300 p-2 text-right uppercase font-extrabold">Stock</th>
              <th className="border border-slate-300 p-2 text-right uppercase font-extrabold">Reorder Level</th>
              <th className="border border-slate-300 p-2 text-right uppercase font-extrabold">Unit Price</th>
              <th className="border border-slate-300 p-2 text-right uppercase font-extrabold">Landed Cost</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(({ item, index }) => {
              const landed = item.p * (1 + item.cd / 100) * (1 + item.st / 100);
              return (
                <tr key={index}>
                  <td className="border border-slate-300 p-2 font-mono">{item.btc}</td>
                  <td className="border border-slate-300 p-2">
                    <div className="font-bold">{item.n}</div>
                    {item.desc && <div className="text-[10px] text-slate-500 italic">{item.desc}</div>}
                  </td>
                  <td className="border border-slate-300 p-2 text-right font-bold">{item.qty} {item.u}</td>
                  <td className="border border-slate-300 p-2 text-right font-bold">{item.reorderLevel || 0}</td>
                  <td className="border border-slate-300 p-2 text-right">{Nu(item.p)}</td>
                  <td className="border border-slate-300 p-2 text-right font-bold">{Nu(landed)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 italic">
          End of Inventory Catalog Report
        </div>
      </div>

      {editingItem && (
        <ItemForm 
          item={editingItem.item} 
          onChange={(item: BTCItem) => setEditingItem({ ...editingItem, item })}
          onSave={handleSaveEdit}
          onCancel={() => setEditingItem(null)}
          title="Edit Item"
        />
      )}

      {isAdding && (
        <ItemForm 
          item={newItem} 
          onChange={setNewItem}
          onSave={handleAddItem}
          onCancel={() => setIsAdding(false)}
          title="Add New Item"
        />
      )}

      {deletingBtc && (
        <div className="fixed inset-0 bg-[rgba(15,23,42,0.4)] backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-2 border-[rgba(239,68,68,0.2)]">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 dark:bg-[rgba(127,29,29,0.3)] rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Delete Item?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">This action cannot be undone. Are you sure you want to remove this item from your inventory?</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-[rgba(30,41,59,0.5)] flex gap-3">
              <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                <Trash2 size={16} /> Delete
              </button>
              <button onClick={() => setDeletingBtc(null)} className="flex-1 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryCatalog;
