export interface Settings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  lowStockThreshold: number;
  logo?: string;
  theme?: 'light' | 'dark';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  powerL?: string;
  powerR?: string;
  email?: string;
  lastVisit?: string;
}

export interface BTCItem {
  id?: string;
  n: string;
  btc: string;
  u: string;
  qty: number;
  p: number;
  cd: number;
  st: number;
  sup: string;
  desc?: string;
  reorderLevel?: number;
}

export interface InvoiceLine {
  desc: string;
  btc: string;
  qty: number;
  unit: string;
  rate: number;
  disc: number;
  st: number;
  net: number;
  tax: number;
  total: number;
}

export interface Invoice {
  num: string;
  date: string;
  day: string;
  customer: string;
  addr: string;
  due: string;
  powerL?: string;
  powerR?: string;
  status: 'Unpaid' | 'Paid' | 'Partial';
  method: string;
  lines: InvoiceLine[];
  sub: number;
  disc: number;
  tax: number;
  grand: number;
  paid: number;
}

export interface PurchaseItem {
  desc: string;
  btc: string;
  qty: number;
  unit: string;
  rate: number;
  cd: number;
  st: number;
  val: number;
  duty: number;
  tax: number;
  landed: number;
}

export interface Purchase {
  num: string;
  date: string;
  day: string;
  supplier: string;
  status: 'Unpaid' | 'Paid' | 'Partial';
  method: string;
  ref: string;
  items: PurchaseItem[];
  val: number;
  cd: number;
  st: number;
  grand: number;
  paid: number;
}

export interface Voucher {
  num: string;
  date: string;
  day: string;
  party: string;
  acct: string;
  amount: number;
  method: string;
  desc: string;
  type: 'Receipt' | 'Payment';
}

export interface POSSale {
  num: string;
  date: string;
  day: string;
  customer: string;
  item: string;
  powerL?: string;
  powerR?: string;
  lines: any[];
  method: string;
  net: number;
  tax: number;
  total: number;
}
