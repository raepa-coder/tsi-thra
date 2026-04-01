import { BTCItem, Invoice, Purchase, Voucher, POSSale, Settings, Customer, Expense, ExpenseCategory } from "./types";

export interface AppState {
  items: BTCItem[];
  customers: Customer[];
  invoices: Invoice[];
  purchases: Purchase[];
  vouchers: Voucher[];
  posSales: POSSale[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  settings: Settings;
  counters: {
    inv: number;
    pur: number;
    rec: number;
    pay: number;
    pos: number;
    exp: number;
  };
}

import { ITEMS as BASE_ITEMS } from "./data/btc-items";

export const formatRxValue = (val: string) => {
  if (!val) return '';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  if (num === 0) return '0.00';
  return (num > 0 ? '+' : '') + num.toFixed(2);
};

export const initialAppState: AppState = {
  items: [
    { id: 'l1', n: 'Standard Blue-Cut Lens', btc: 'LENS-001', u: 'Pair', qty: 100, p: 1500, cd: 0, st: 0, sup: 'Internal', category: 'Lens', brand: 'Generic' },
    { id: 'l2', n: 'Anti-Reflective Lens', btc: 'LENS-002', u: 'Pair', qty: 100, p: 2500, cd: 0, st: 0, sup: 'Internal', category: 'Lens', brand: 'Generic' },
    { id: 'l3', n: 'Progressive Lens', btc: 'LENS-003', u: 'Pair', qty: 100, p: 5500, cd: 0, st: 0, sup: 'Internal', category: 'Lens', brand: 'Generic' },
    { id: 'l4', n: 'Bifocal Lens', btc: 'LENS-004', u: 'Pair', qty: 100, p: 3500, cd: 0, st: 0, sup: 'Internal', category: 'Lens', brand: 'Generic' },
    { id: 'l5', n: 'Photochromic Lens', btc: 'LENS-005', u: 'Pair', qty: 100, p: 4500, cd: 0, st: 0, sup: 'Internal', category: 'Lens', brand: 'Generic' },
    { id: 'f1', n: 'Metal Frame - Aviator', btc: 'FRM-001', u: 'Pc', qty: 50, p: 2000, cd: 0, st: 0, sup: 'Internal', category: 'Frame', brand: 'Ray-Ban Style' },
    { id: 'f2', n: 'Acetate Frame - Wayfarer', btc: 'FRM-002', u: 'Pc', qty: 50, p: 1800, cd: 0, st: 0, sup: 'Internal', category: 'Frame', brand: 'Generic' },
    { id: 'f3', n: 'Rimless Frame', btc: 'FRM-003', u: 'Pc', qty: 30, p: 3000, cd: 0, st: 0, sup: 'Internal', category: 'Frame', brand: 'Titanium' },
    { id: 'f4', n: 'Kids Flexible Frame', btc: 'FRM-004', u: 'Pc', qty: 40, p: 1200, cd: 0, st: 0, sup: 'Internal', category: 'Frame', brand: 'Kids' },
    { id: 'c1', n: 'Contact Lens Solution 360ml', btc: 'ACC-001', u: 'Btl', qty: 50, p: 500, cd: 0, st: 0, sup: 'Internal', category: 'Accessory', brand: 'Bausch & Lomb' },
    { id: 'c2', n: 'Microfiber Cleaning Cloth', btc: 'ACC-002', u: 'Pc', qty: 200, p: 100, cd: 0, st: 0, sup: 'Internal', category: 'Accessory', brand: 'Generic' },
    { id: 'c3', n: 'Eyeglass Case (Hard)', btc: 'ACC-003', u: 'Pc', qty: 100, p: 250, cd: 0, st: 0, sup: 'Internal', category: 'Accessory', brand: 'Generic' },
    { id: 'c4', n: 'Lens Cleaning Spray', btc: 'ACC-004', u: 'Btl', qty: 100, p: 150, cd: 0, st: 0, sup: 'Internal', category: 'Accessory', brand: 'Generic' },
  ],
  customers: [],
  invoices: [],
  purchases: [],
  vouchers: [],
  posSales: [],
  expenses: [],
  expenseCategories: [
    { id: '1', name: 'Rent' },
    { id: '2', name: 'Electricity' },
    { id: '3', name: 'Salaries' },
    { id: '4', name: 'General' },
  ],
  settings: {
    companyName: 'TSI-THRA BOOKKEEPING',
    address: 'Thimphu, Bhutan',
    phone: '+975-17XXXXXX',
    email: 'info@arunoptical.bt',
    lowStockThreshold: 5,
    logo: '/logo.png',
  },
  counters: {
    inv: 1,
    pur: 1,
    rec: 1,
    pay: 1,
    pos: 1,
    exp: 1,
  },
};

export const Nu = (n: number) => 
  'Nu.\u00a0' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const today = () => new Date().toISOString().slice(0, 10);

export const getDayName = (d: string) => {
  try {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(d).getDay()];
  } catch {
    return '';
  }
};

export const formatDocNum = (type: 'inv' | 'pur' | 'rec' | 'pay' | 'pos' | 'exp', n: number) => {
  const pad = String(n).padStart(4, '0');
  const pfx = { inv: 'INV', pur: 'PUR', rec: 'RV', pay: 'PV', pos: 'POS', exp: 'EXP' }[type];
  return `${pfx}-${pad}`;
};

export const exportToCSV = (filename: string, data: any[]) => {
  if (!data || !data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(fieldName => {
        const value = row[fieldName];
        const escaped = ('' + (value ?? '')).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
