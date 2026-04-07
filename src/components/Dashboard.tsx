import React from 'react';
import { AppState, Nu } from '../utils';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShoppingCart, 
  FileText 
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate }) => {
  const calculateTots = () => {
    const iT = state.invoices.reduce((s, r) => s + r.grand, 0);
    const iP = state.invoices.reduce((s, r) => s + (r.status === 'Paid' ? r.grand : r.status === 'Partial' ? r.paid : 0), 0);
    const pT = state.purchases.reduce((s, r) => s + r.grand, 0);
    const rT = state.vouchers.filter(v => v.type === 'Receipt').reduce((s, r) => s + r.amount, 0);
    const pyT = state.vouchers.filter(v => v.type === 'Payment').reduce((s, r) => s + r.amount, 0);
    const psT = state.posSales.reduce((s, r) => s + r.total, 0);
    const exT = state.expenses.reduce((s, r) => s + r.amount, 0);
    
    return {
      iT,
      iP,
      iO: iT - iP,
      pT,
      rT,
      pyT,
      psT,
      exT,
      net: (psT + iP + rT) - (pT + pyT + exT)
    };
  };

  const t = calculateTots();
  const lowStockItems = state.items.filter(i => i.qty <= state.settings.lowStockThreshold);

  const kpis = [
    { label: 'POS Sales', val: Nu(t.psT), icon: <TrendingUp size={16} />, color: 'text-orange-primary' },
    { label: 'Invoice Collected', val: Nu(t.iP), icon: <CheckCircle2 size={16} />, color: 'text-orange-primary' },
    { label: 'Outstanding', val: Nu(t.iO), icon: <AlertCircle size={16} />, color: 'text-red-600' },
    { label: 'Net Balance', val: Nu(t.net), icon: <Wallet size={16} />, color: t.net >= 0 ? 'text-orange-primary' : 'text-red-600' },
    { label: 'Receipts', val: Nu(t.rT), icon: <ArrowUpRight size={16} />, color: 'text-orange-primary' },
    { label: 'Payments', val: Nu(t.pyT), icon: <ArrowDownRight size={16} />, color: 'text-red-600' },
    { label: 'Expenses', val: Nu(t.exT), icon: <ArrowDownRight size={16} />, color: 'text-red-600' },
    { label: 'Purchases', val: Nu(t.pT), icon: <ShoppingCart size={16} />, color: 'text-blue-600' },
    { label: 'Total Invoiced', val: Nu(t.iT), icon: <FileText size={16} />, color: 'text-orange-primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="card-container p-4 relative overflow-hidden bg-gradient-to-br from-slate-50 to-[rgba(255,247,237,0.3)] dark:from-slate-900 dark:to-[rgba(12,74,110,0.1)]">
            <div className="absolute -right-2 -top-2 w-12 h-12 rounded-full bg-[rgba(14,165,233,0.05)] dark:bg-[rgba(249,115,22,0.1)]"></div>
            <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</div>
            <div className={`text-xl font-extrabold tracking-tight ${kpi.color}`}>{kpi.val}</div>
            <div className="mt-2 text-slate-300 dark:text-slate-600">{kpi.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card-container lg:col-span-1">
          <div className="px-4 py-3 border-b-2 border-slate-50 dark:border-slate-800 flex items-center justify-between bg-[#f8fafc] dark:bg-[rgba(15,23,42,0.5)]">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600" />
              Low Stock Alerts
            </h3>
            <button 
              onClick={() => onNavigate('invent')}
              className="text-[10px] font-extrabold text-orange-primary uppercase tracking-wider hover:underline"
            >
              Manage
            </button>
          </div>
          {lowStockItems.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                  <tr>
                    <th className="table-header">Item</th>
                    <th className="table-header text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[rgba(254,242,242,0.3)] dark:hover:bg-[rgba(127,29,29,0.1)] transition-colors border-b border-slate-50 dark:border-slate-800">
                      <td className="table-cell font-bold text-slate-700 dark:text-slate-300 text-xs truncate max-w-[120px]">{item.n}</td>
                      <td className="table-cell text-right font-black text-red-600 text-xs">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 font-bold text-sm">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-secondary opacity-20" style={{ opacity: 0.2 }} />
              Stock levels healthy.
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card-container">
            <div className="px-4 py-3 border-b-2 border-slate-50 dark:border-slate-800 flex items-center justify-between bg-[#f8fafc] dark:bg-[rgba(15,23,42,0.5)]">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Recent Invoices</h3>
              <button 
                onClick={() => onNavigate('l_inv')}
                className="text-[10px] font-extrabold text-orange-primary uppercase tracking-wider hover:underline"
              >
                View All
              </button>
            </div>
            {state.invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">#</th>
                      <th className="table-header">Customer</th>
                      <th className="table-header text-right">Total</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.invoices.slice(-5).reverse().map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[rgba(30,41,59,0.5)] transition-colors">
                        <td className="table-cell">{inv.num}</td>
                        <td className="table-cell">{inv.customer}</td>
                        <td className="table-cell text-right text-orange-primary font-bold">{Nu(inv.grand)}</td>
                        <td className="table-cell">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            inv.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-[rgba(20,83,45,0.3)] dark:text-green-400' : 
                            inv.status === 'Partial' ? 'bg-orange-100 text-orange-700 dark:bg-[rgba(124,45,18,0.3)] dark:text-orange-400' : 
                            'bg-red-100 text-red-700 dark:bg-[rgba(127,29,29,0.3)] dark:text-red-400'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 font-bold text-sm">
                No invoices yet — <button onClick={() => onNavigate('inv_f')} className="text-orange-primary hover:underline">create one</button>
              </div>
            )}
          </div>

          <div className="card-container">
            <div className="px-4 py-3 border-b-2 border-slate-50 dark:border-slate-800 flex items-center justify-between bg-[#f8fafc] dark:bg-[rgba(15,23,42,0.5)]">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Recent POS Sales</h3>
              <button 
                onClick={() => onNavigate('l_pos')}
                className="text-[10px] font-extrabold text-orange-primary uppercase tracking-wider hover:underline"
              >
                View All
              </button>
            </div>
            {state.posSales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">#</th>
                      <th className="table-header">Item</th>
                      <th className="table-header">Method</th>
                      <th className="table-header text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.posSales.slice(-5).reverse().map((pos, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[rgba(30,41,59,0.5)] transition-colors">
                        <td className="table-cell">{pos.num}</td>
                        <td className="table-cell truncate max-w-[150px]">{pos.item}</td>
                        <td className="table-cell">{pos.method}</td>
                        <td className="table-cell text-right text-orange-primary font-bold">{Nu(pos.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 font-bold text-sm">
                No POS sales — <button onClick={() => onNavigate('pos_f')} className="text-orange-primary hover:underline">add one</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
