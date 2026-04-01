import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Wallet, 
  CreditCard, 
  Store, 
  Package, 
  BarChart3, 
  Scale, 
  Droplets, 
  ClipboardList,
  PlusCircle,
  Settings,
  Tag,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  settings: any;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, settings }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: 'dash', label: 'Dashboard', icon: <LayoutDashboard size={18} />, section: 'Main' },
    { id: 'inv_f', label: 'New Invoice', icon: <FileText size={18} />, section: 'Transactions' },
    { id: 'pur_f', label: 'New Purchase', icon: <ShoppingCart size={18} />, section: 'Transactions' },
    { id: 'rec_f', label: 'Receipt', icon: <Wallet size={18} />, section: 'Transactions' },
    { id: 'pay_f', label: 'Payment', icon: <CreditCard size={18} />, section: 'Transactions' },
    { id: 'pos_f', label: 'POS Sale', icon: <Store size={18} />, section: 'Transactions' },
    { id: 'exp_f', label: 'New Expense', icon: <PlusCircle size={18} />, section: 'Transactions' },
    { id: 'invent', label: 'Inventory', icon: <Package size={18} />, section: 'Catalog' },
    { id: 'exp_cat', label: 'Expense Categories', icon: <Tag size={18} />, section: 'Catalog' },
    { id: 'l_inv', label: 'Invoices', icon: <ClipboardList size={18} />, section: 'Ledgers' },
    { id: 'l_pur', label: 'Purchases', icon: <Package size={18} />, section: 'Ledgers' },
    { id: 'l_rec', label: 'Receipts', icon: <Wallet size={18} />, section: 'Ledgers' },
    { id: 'l_pay', label: 'Payments', icon: <CreditCard size={18} />, section: 'Ledgers' },
    { id: 'l_pos', label: 'POS Log', icon: <Store size={18} />, section: 'Ledgers' },
    { id: 'l_exp', label: 'Expenses', icon: <FileText size={18} />, section: 'Ledgers' },
    { id: 'r_pnl', label: 'P&L', icon: <BarChart3 size={18} />, section: 'Reports' },
    { id: 'r_bs', label: 'Balance Sheet', icon: <Scale size={18} />, section: 'Reports' },
    { id: 'r_cf', label: 'Cash Flow', icon: <Droplets size={18} />, section: 'Reports' },
    { id: 'r_tb', label: 'Trial Balance', icon: <ClipboardList size={18} />, section: 'Reports' },
    { id: 'sett', label: 'Settings', icon: <Settings size={18} />, section: 'System' },
  ];

  const sections = ['Main', 'Transactions', 'Catalog', 'Ledgers', 'Reports', 'System'];

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-[200] p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-[rgba(249,115,22,0.1)] text-orange-primary"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-[140]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={`
        fixed md:static inset-y-0 left-0 z-[150]
        w-64 bg-slate-50 dark:bg-slate-950 border-r-2 border-[rgba(249,115,22,0.1)] 
        flex flex-col h-full overflow-hidden shrink-0 transition-transform duration-300 no-print
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="weave-bg absolute inset-0 pointer-events-none opacity-50 dark:opacity-20"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="p-4 border-b-2 border-[rgba(249,115,22,0.1)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm flex-shrink-0 border border-[rgba(249,115,22,0.1)]">
              {settings.logo ? (
                <img 
                  src={settings.logo} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <div className="w-full h-full bg-[rgba(249,115,22,0.1)] flex items-center justify-center text-orange-primary font-black text-xs">
                  TT
                </div>
              )}
            </div>
            <div>
              <div className="text-lg font-extrabold text-orange-primary leading-tight tracking-tight dark:text-orange-primary uppercase">Tsi-Thra</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Bookkeeping System</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {sections.map(section => (
            <div key={section}>
              <div className="text-[10px] text-orange-secondary font-extrabold uppercase tracking-[0.15em] px-3 py-2">
                {section}
              </div>
              <div className="space-y-1">
                {navItems.filter(item => item.section === section).map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                      activePage === item.id 
                        ? 'bg-[rgba(249,115,22,0.1)] text-orange-primary dark:bg-[rgba(249,115,22,0.2)]' 
                        : 'text-slate-500 hover:bg-[rgba(249,115,22,0.05)] hover:text-orange-primary dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-orange-primary'
                    }`}
                  >
                    <span className={`p-1 rounded-md ${activePage === item.id ? 'bg-[rgba(249,115,22,0.1)] dark:bg-[rgba(249,115,22,0.2)]' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="m-3 p-3 rounded-xl bg-gradient-to-br from-[rgba(249,115,22,0.1)] to-[rgba(249,115,22,0.05)] border-2 border-[rgba(249,115,22,0.2)] text-center dark:from-[rgba(124,45,18,0.1)] dark:to-[rgba(154,52,18,0.05)] dark:border-[rgba(124,45,18,0.2)]">
          <div className="text-xs font-extrabold text-orange-primary dark:text-orange-primary">🐉 Made in Bhutan</div>
          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-1 leading-relaxed">
            Optical Shop Inventory System
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
