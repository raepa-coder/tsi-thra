import { BTCItem, Invoice, Purchase, Voucher, POSSale, Settings, Customer } from "./types";

export interface AppState {
  items: BTCItem[];
  customers: Customer[];
  invoices: Invoice[];
  purchases: Purchase[];
  vouchers: Voucher[];
  posSales: POSSale[];
  settings: Settings;
  counters: {
    inv: number;
    pur: number;
    rec: number;
    pay: number;
    pos: number;
  };
}

import { ITEMS as BASE_ITEMS } from "./data/btc-items";

export const initialAppState: AppState = {
  items: BASE_ITEMS,
  customers: [],
  invoices: [],
  purchases: [],
  vouchers: [],
  posSales: [],
  settings: {
    companyName: 'ARUN OPTICAL',
    address: 'Thimphu, Bhutan',
    phone: '+975-17XXXXXX',
    email: 'info@arunoptical.bt',
    lowStockThreshold: 5,
  },
  counters: {
    inv: 1,
    pur: 1,
    rec: 1,
    pay: 1,
    pos: 1,
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

export const formatDocNum = (type: 'inv' | 'pur' | 'rec' | 'pay' | 'pos', n: number) => {
  const pad = String(n).padStart(4, '0');
  const pfx = { inv: 'INV', pur: 'PUR', rec: 'RV', pay: 'PV', pos: 'POS' }[type];
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
