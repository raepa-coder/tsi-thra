export interface Settings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  lowStockThreshold: number;
  logo?: string;
  theme?: 'light' | 'dark';
}

export interface RxData {
  sph: string;
  cyl: string;
  axis: string;
  add: string;
  pd: string;
}

export interface Prescription {
  od: RxData; // Right Eye
  os: RxData; // Left Eye
  date: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  rx?: Prescription;
  history?: Prescription[];
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
  brand?: string;
  model?: string;
  color?: string;
  size?: string;
  category: 'Frame' | 'Lens' | 'Contact Lens' | 'Accessory' | 'Service';
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
  isLens?: boolean;
  lensType?: string;
}

export interface Invoice {
  num: string;
  date: string;
  day: string;
  customer: string;
  customerId?: string;
  addr: string;
  due: string;
  rx?: Prescription;
  status: 'Unpaid' | 'Paid' | 'Partial';
  method: string;
  transactionId?: string;
  lines: InvoiceLine[];
  sub: number;
  disc: number;
  tax: number;
  grand: number;
  paid: number;
  balanceDue: number;
  labStatus?: 'Pending' | 'In Progress' | 'Ready' | 'Delivered';
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
  customerId?: string;
  item: string;
  rx?: Prescription;
  lines: any[];
  method: string;
  transactionId?: string;
  net: number;
  tax: number;
  total: number;
  paid: number;
  balanceDue: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  num: string;
  date: string;
  day: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  method: string;
  desc: string;
}
