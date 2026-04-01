import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db, signIn, handleFirestoreError, OperationType } from './firebase';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import PurchaseForm from './components/PurchaseForm';
import VoucherForm from './components/VoucherForm';
import POSForm from './components/POSForm';
import ExpenseForm from './components/ExpenseForm';
import ExpenseCategories from './components/ExpenseCategories';
import InventoryCatalog from './components/InventoryCatalog';
import LedgerTable from './components/LedgerTable';
import Reports from './components/Reports';
import Settings from './components/Settings';
import PrintReceipt from './components/PrintReceipt';
import { initialAppState, AppState } from './utils';
import { BTCItem } from './types';
import { LogIn, Store, AlertTriangle } from 'lucide-react';

import { ITEMS } from './data/btc-items';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [state, setState] = useState<AppState>(initialAppState);
  const [activePage, setActivePage] = useState('dash');
  const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  const [lastSavedRecord, setLastSavedRecord] = useState<{ record: any, type: 'inv' | 'pur' | 'rec' | 'pay' | 'pos', autoPrint?: boolean } | null>(null);
  const [editingRecord, setEditingRecord] = useState<{ record: any, type: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (!u) {
        // Reset state on logout
        setState(initialAppState);
      }
    });
    return () => unsubscribe();
  }, []);

  // Theme Sync
  useEffect(() => {
    if (state.settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.settings.theme]);

  // Firestore Sync
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const configRef = doc(userRef, 'config', 'settings');
    const countersRef = doc(userRef, 'config', 'counters');
    const itemsRef = collection(userRef, 'items');
    const invoicesRef = collection(userRef, 'invoices');
    const purchasesRef = collection(userRef, 'purchases');
    const vouchersRef = collection(userRef, 'vouchers');
    const posSalesRef = collection(userRef, 'posSales');
    const customersRef = collection(userRef, 'customers');
    const expensesRef = collection(userRef, 'expenses');
    const categoriesRef = collection(userRef, 'expenseCategories');

    // Sync Settings
    const unsubSettings = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        setState(prev => ({ ...prev, settings: snap.data() as any }));
      } else {
        // Initialize settings if not exists
        setDoc(configRef, initialAppState.settings).catch(e => handleFirestoreError(e, OperationType.WRITE, configRef.path));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, configRef.path));

    // Sync Counters
    const unsubCounters = onSnapshot(countersRef, (snap) => {
      if (snap.exists()) {
        setState(prev => ({ ...prev, counters: snap.data() as any }));
      } else {
        // Initialize counters if not exists
        setDoc(countersRef, initialAppState.counters).catch(e => handleFirestoreError(e, OperationType.WRITE, countersRef.path));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, countersRef.path));

    // Sync Items
    const unsubItems = onSnapshot(itemsRef, (snap) => {
      const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
      if (items.length === 0 && snap.metadata.fromCache === false) {
        // Seed database with initial items if empty
        initialAppState.items.forEach(item => {
          const itemDoc = doc(itemsRef, item.btc);
          setDoc(itemDoc, item).catch(e => handleFirestoreError(e, OperationType.WRITE, itemDoc.path));
        });
      } else {
        setState(prev => ({ ...prev, items }));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, itemsRef.path));

    // Sync Invoices
    const unsubInvoices = onSnapshot(invoicesRef, (snap) => {
      setState(prev => ({ ...prev, invoices: snap.docs.map(d => d.data() as any) }));
    }, (e) => handleFirestoreError(e, OperationType.GET, invoicesRef.path));

    // Sync Purchases
    const unsubPurchases = onSnapshot(purchasesRef, (snap) => {
      setState(prev => ({ ...prev, purchases: snap.docs.map(d => d.data() as any) }));
    }, (e) => handleFirestoreError(e, OperationType.GET, purchasesRef.path));

    // Sync Vouchers
    const unsubVouchers = onSnapshot(vouchersRef, (snap) => {
      setState(prev => ({ ...prev, vouchers: snap.docs.map(d => d.data() as any) }));
    }, (e) => handleFirestoreError(e, OperationType.GET, vouchersRef.path));

    // Sync POS Sales
    const unsubPOS = onSnapshot(posSalesRef, (snap) => {
      setState(prev => ({ ...prev, posSales: snap.docs.map(d => d.data() as any) }));
    }, (e) => handleFirestoreError(e, OperationType.GET, posSalesRef.path));

    // Sync Customers
    const unsubCustomers = onSnapshot(customersRef, (snap) => {
      setState(prev => ({ ...prev, customers: snap.docs.map(d => d.data() as any) }));
    }, (e) => handleFirestoreError(e, OperationType.GET, customersRef.path));

    // Sync Expenses
    const unsubExpenses = onSnapshot(expensesRef, (snap) => {
      setState(prev => ({ ...prev, expenses: snap.docs.map(d => d.data() as any) }));
    }, (e) => handleFirestoreError(e, OperationType.GET, expensesRef.path));

    // Sync Categories
    const unsubCategories = onSnapshot(categoriesRef, (snap) => {
      if (snap.empty && snap.metadata.fromCache === false) {
        initialAppState.expenseCategories.forEach(cat => {
          const catDoc = doc(categoriesRef, cat.id);
          setDoc(catDoc, cat).catch(e => handleFirestoreError(e, OperationType.WRITE, catDoc.path));
        });
      } else {
        setState(prev => ({ ...prev, expenseCategories: snap.docs.map(d => d.data() as any) }));
      }
    }, (e) => handleFirestoreError(e, OperationType.GET, categoriesRef.path));

    return () => {
      unsubSettings();
      unsubCounters();
      unsubItems();
      unsubInvoices();
      unsubPurchases();
      unsubVouchers();
      unsubPOS();
      unsubCustomers();
      unsubExpenses();
      unsubCategories();
    };
  }, [user]);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const updateStockAndSave = async (type: 'inv' | 'pur' | 'pos', docData: any, itemsToUpdate: { btc: string, qtyChange: number }[]) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const countersRef = doc(userRef, 'config', 'counters');
    const collectionName = { inv: 'invoices', pur: 'purchases', pos: 'posSales' }[type];
    const targetDocRef = doc(userRef, collectionName, docData.num);

    try {
      // 1. If editing, revert OLD stock impact first
      if (editingRecord && editingRecord.type === type) {
        const oldRecord = editingRecord.record;
        const oldLines = oldRecord.lines || oldRecord.items || [];
        for (const line of oldLines) {
          if (line.btc) {
            const itemRef = doc(userRef, 'items', line.btc);
            const itemSnap = await getDoc(itemRef);
            if (itemSnap.exists()) {
              const currentQty = itemSnap.data().qty || 0;
              // Revert: if it was an invoice/pos, add back. if it was a purchase, subtract.
              const revertQty = (type === 'inv' || type === 'pos') ? line.qty : -line.qty;
              await updateDoc(itemRef, { qty: currentQty + revertQty });
            }
          }
        }
      }

      // 2. Save the document
      await setDoc(targetDocRef, docData);

      // 3. Update stock for each item (apply NEW impact)
      for (const update of itemsToUpdate) {
        if (!update.btc) continue; // Skip if no BTC code (empty line)
        const itemRef = doc(userRef, 'items', update.btc);
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
          const currentQty = itemSnap.data().qty || 0;
          await updateDoc(itemRef, { qty: currentQty + update.qtyChange });
        }
      }

      // 4. Increment counter ONLY if not editing
      if (!editingRecord) {
        const newCounters = { ...state.counters, [type]: state.counters[type as keyof typeof state.counters] + 1 };
        await setDoc(countersRef, newCounters);
      }

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, targetDocRef.path);
    }
  };

  const handleSaveCustomer = async (customer: any) => {
    if (!user) return;
    const customerRef = doc(db, 'users', user.uid, 'customers', customer.id);
    try {
      await setDoc(customerRef, customer, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, customerRef.path);
    }
  };

  const handleSaveInvoice = async (invoice: any, print = false) => {
    const itemsToUpdate = invoice.lines.map((l: any) => ({ btc: l.btc, qtyChange: -l.qty }));
    await updateStockAndSave('inv', invoice, itemsToUpdate);
    
    // Save/Update customer
    if (invoice.customer && invoice.customer !== 'Unknown') {
      const customerId = invoice.customerId || invoice.phone || invoice.customer;
      const customerData = {
        id: customerId,
        name: invoice.customer,
        phone: invoice.phone || '',
        address: invoice.addr || '',
        lastVisit: invoice.date,
        rx: invoice.rx || null
      };
      await handleSaveCustomer(customerData);

      // Save Rx History
      if (invoice.rx && user) {
        const rxRef = doc(db, 'users', user.uid, 'customers', customerId, 'prescriptions', invoice.num);
        try {
          await setDoc(rxRef, {
            ...invoice.rx,
            invoiceNum: invoice.num,
            date: invoice.date
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, rxRef.path);
        }
      }
    }

    showNotification(`Invoice ${invoice.num} saved successfully!`);
    if (print) setLastSavedRecord({ record: invoice, type: 'inv', autoPrint: true });
    setEditingRecord(null);
    setActivePage('l_inv');
  };

  const handleSavePurchase = async (purchase: any, print = false) => {
    const itemsToUpdate = purchase.items.map((i: any) => ({ btc: i.btc, qtyChange: i.qty }));
    await updateStockAndSave('pur', purchase, itemsToUpdate);
    showNotification(`Purchase ${purchase.num} recorded!`);
    if (print) setLastSavedRecord({ record: purchase, type: 'pur', autoPrint: true });
    setEditingRecord(null);
    setActivePage('l_pur');
  };

  const handleSaveVoucher = async (voucher: any, print = false) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const countersRef = doc(userRef, 'config', 'counters');
    const voucherRef = doc(userRef, 'vouchers', voucher.num);

    try {
      await setDoc(voucherRef, voucher);
      // Only increment counter if it's a new voucher (not an edit)
      // We check if it's an edit by looking at editingRecord
      if (!editingRecord) {
        const counterKey = voucher.type === 'Receipt' ? 'rec' : 'pay';
        const newCounters = { ...state.counters, [counterKey]: state.counters[counterKey] + 1 };
        await setDoc(countersRef, newCounters);
      }
      showNotification(`${voucher.type} ${voucher.num} saved!`);
      if (print) setLastSavedRecord({ record: voucher, type: voucher.type === 'Receipt' ? 'rec' : 'pay', autoPrint: true });
      setEditingRecord(null);
      setActivePage(voucher.type === 'Receipt' ? 'l_rec' : 'l_pay');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, voucherRef.path);
    }
  };

  const handleSavePOS = async (sale: any, print = false) => {
    const itemsToUpdate = sale.lines.map((l: any) => ({ btc: l.btc, qtyChange: -l.qty }));
    await updateStockAndSave('pos', sale, itemsToUpdate);

    // Save/Update customer
    if (sale.customer && sale.customer !== 'Walk-in') {
      const customerId = sale.phone || sale.customer;
      await handleSaveCustomer({
        id: customerId,
        name: sale.customer,
        phone: sale.phone || '',
        powerL: sale.powerL || '',
        powerR: sale.powerR || '',
        lastVisit: sale.date
      });
    }

    showNotification(`POS Sale ${sale.num} recorded!`);
    if (print) setLastSavedRecord({ record: sale, type: 'pos', autoPrint: true });
    setEditingRecord(null);
    setActivePage('l_pos');
  };

  const handleSaveExpense = async (expense: any, print = false) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const countersRef = doc(userRef, 'config', 'counters');
    const expenseRef = doc(userRef, 'expenses', expense.num);

    try {
      await setDoc(expenseRef, expense);
      if (!editingRecord) {
        const newCounters = { ...state.counters, exp: state.counters.exp + 1 };
        await setDoc(countersRef, newCounters);
      }
      showNotification(`Expense ${expense.num} recorded!`);
      if (print) setLastSavedRecord({ record: expense, type: 'exp' as any, autoPrint: true });
      setEditingRecord(null);
      setActivePage('l_exp');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, expenseRef.path);
    }
  };

  const handleSaveCategory = async (category: any) => {
    if (!user) return;
    const catRef = doc(db, 'users', user.uid, 'expenseCategories', category.id);
    try {
      await setDoc(catRef, category);
      showNotification('Category saved!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, catRef.path);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!user) return;
    const catRef = doc(db, 'users', user.uid, 'expenseCategories', id);
    try {
      await deleteDoc(catRef);
      showNotification('Category deleted!');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, catRef.path);
    }
  };

  const handleAddItem = async (item: BTCItem) => {
    if (!user) return;
    const itemRef = doc(db, 'users', user.uid, 'items', item.btc);
    try {
      await setDoc(itemRef, item);
      showNotification(`Item ${item.n} added to catalog!`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, itemRef.path);
    }
  };

  const handleUpdateItem = async (item: BTCItem) => {
    if (!user) return;
    const itemRef = doc(db, 'users', user.uid, 'items', item.btc);
    try {
      await setDoc(itemRef, item);
      showNotification(`Item ${item.n} updated!`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, itemRef.path);
    }
  };

  const handleDeleteItem = async (btc: string) => {
    if (!user) return;
    const itemRef = doc(db, 'users', user.uid, 'items', btc);
    try {
      await deleteDoc(itemRef);
      showNotification(`Item deleted!`);
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, itemRef.path);
    }
  };

  const handleSaveSettings = async (settings: any) => {
    if (!user) return;
    const settingsRef = doc(db, 'users', user.uid, 'config', 'settings');
    try {
      await setDoc(settingsRef, settings);
      showNotification('Settings saved successfully!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, settingsRef.path);
    }
  };

  const handleNavigate = (page: string) => {
    // If navigating to a form page from sidebar, clear editing state
    if (['inv_f', 'pur_f', 'rec_f', 'pay_f', 'pos_f', 'exp_f'].includes(page)) {
      setEditingRecord(null);
    }
    setActivePage(page);
  };

  const handleEditRecord = (record: any, type: string) => {
    setEditingRecord({ record, type });
    const pageMap: Record<string, string> = {
      inv: 'inv_f',
      pur: 'pur_f',
      rec: 'rec_f',
      pay: 'pay_f',
      pos: 'pos_f',
      exp: 'exp_f'
    };
    setActivePage(pageMap[type]);
  };

  const handleDeleteRecord = (record: any, type: string) => {
    if (!user) return;
    setConfirmModal({
      show: true,
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete ${type.toUpperCase()} #${record.num}? This action cannot be undone.`,
      onConfirm: async () => {
        const userRef = doc(db, 'users', user.uid);
        const collectionName = {
          inv: 'invoices',
          pur: 'purchases',
          rec: 'vouchers',
          pay: 'vouchers',
          pos: 'posSales',
          exp: 'expenses'
        }[type];

        const docRef = doc(userRef, collectionName, record.num);

        try {
          // 1. Revert stock if applicable
          if (type === 'inv' || type === 'pos') {
            const lines = record.lines || [];
            for (const line of lines) {
              if (line.btc) {
                const itemRef = doc(userRef, 'items', line.btc);
                const itemSnap = await getDoc(itemRef);
                if (itemSnap.exists()) {
                  await updateDoc(itemRef, { qty: (itemSnap.data().qty || 0) + line.qty });
                }
              }
            }
          } else if (type === 'pur') {
            const items = record.items || [];
            for (const item of items) {
              if (item.btc) {
                const itemRef = doc(userRef, 'items', item.btc);
                const itemSnap = await getDoc(itemRef);
                if (itemSnap.exists()) {
                  await updateDoc(itemRef, { qty: (itemSnap.data().qty || 0) - item.qty });
                }
              }
            }
          }

          // 2. Delete the document
          await deleteDoc(docRef);
          showNotification(`${type.toUpperCase()} #${record.num} deleted successfully.`);
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, docRef.path);
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleResetInventory = () => {
    if (!user) return;
    setConfirmModal({
      show: true,
      title: 'Reset Inventory to Defaults',
      message: 'Are you sure you want to reset the inventory? This will delete all current items and restore the default optical shop items.',
      onConfirm: async () => {
        const userRef = doc(db, 'users', user.uid);
        const itemsRef = collection(userRef, 'items');
        
        try {
          const { getDocs } = await import('firebase/firestore');
          const snap = await getDocs(itemsRef);
          
          const batch = writeBatch(db);
          
          // Delete existing items
          snap.docs.forEach(d => {
            batch.delete(d.ref);
          });
          
          // Add default items
          initialAppState.items.forEach(item => {
            const itemDoc = doc(itemsRef, item.btc);
            batch.set(itemDoc, item);
          });
          
          await batch.commit();
          showNotification('Inventory reset to defaults successfully!');
        } catch (e) {
          console.error('Reset failed:', e);
          showNotification('Failed to reset inventory.');
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const getPageMeta = () => {
    const meta: Record<string, [string, string]> = {
      dash: ['Dashboard', `${state.settings.companyName} · ${state.settings.address}`],
      inv_f: ['New Invoice', 'Click any row to search catalog — auto-numbered'],
      pur_f: ['New Purchase', 'BTC catalog with CD & ST auto-fill — auto-numbered'],
      rec_f: ['Receipt Voucher', 'Cash / bank receipt — auto-numbered'],
      pay_f: ['Payment Voucher', 'Cash / bank payment — auto-numbered'],
      pos_f: ['POS Sale', 'Point-of-sale — catalog search — auto-numbered'],
      invent: ['Inventory Catalog', 'Manage your optical item catalog'],
      l_inv: ['Invoices Ledger', 'All sales invoices'],
      l_pur: ['Purchases Ledger', 'All purchase records'],
      l_rec: ['Receipts Ledger', 'Receipt vouchers'],
      l_pay: ['Payments Ledger', 'Payment vouchers'],
      l_pos: ['POS Log', 'All POS transactions'],
      l_exp: ['Expenses Ledger', 'All expense records'],
      exp_cat: ['Expense Categories', 'Manage your expense categories'],
      r_pnl: ['Profit & Loss', 'Auto-generated from all entries'],
      r_bs: ['Balance Sheet', 'As at today'],
      r_cf: ['Cash Flow', 'Operating activities'],
      r_tb: ['Trial Balance', 'Debit / Credit summary'],
      sett: ['Settings', 'Manage company profile and preferences'],
    };
    return meta[activePage] || ['Dashboard', ''];
  };

  const [title, subtitle] = getPageMeta();

  const renderContent = () => {
    switch (activePage) {
      case 'dash': return <Dashboard state={state} onNavigate={handleNavigate} />;
      case 'inv_f': return <InvoiceForm state={state} user={user} onSave={handleSaveInvoice} onCancel={() => { setEditingRecord(null); setActivePage('dash'); }} initialData={editingRecord?.type === 'inv' ? editingRecord.record : null} showNotification={showNotification} />;
      case 'pur_f': return <PurchaseForm state={state} onSave={handleSavePurchase} onCancel={() => { setEditingRecord(null); setActivePage('dash'); }} initialData={editingRecord?.type === 'pur' ? editingRecord.record : null} showNotification={showNotification} />;
      case 'rec_f': return <VoucherForm type="Receipt" state={state} onSave={handleSaveVoucher} onCancel={() => { setEditingRecord(null); setActivePage('dash'); }} initialData={editingRecord?.type === 'rec' ? editingRecord.record : null} showNotification={showNotification} />;
      case 'pay_f': return <VoucherForm type="Payment" state={state} onSave={handleSaveVoucher} onCancel={() => { setEditingRecord(null); setActivePage('dash'); }} initialData={editingRecord?.type === 'pay' ? editingRecord.record : null} showNotification={showNotification} />;
      case 'pos_f': return <POSForm state={state} user={user} onSave={handleSavePOS} onCancel={() => { setEditingRecord(null); setActivePage('dash'); }} initialData={editingRecord?.type === 'pos' ? editingRecord.record : null} showNotification={showNotification} />;
      case 'exp_f': return <ExpenseForm state={state} onSave={handleSaveExpense} onAddCategory={handleSaveCategory} onCancel={() => { setEditingRecord(null); setActivePage('dash'); }} initialData={editingRecord?.type === 'exp' ? editingRecord.record : null} showNotification={showNotification} />;
      case 'exp_cat': return <ExpenseCategories state={state} onSave={handleSaveCategory} onDelete={handleDeleteCategory} showNotification={showNotification} />;
      case 'invent': return <InventoryCatalog 
        state={state} 
        onAddItem={handleAddItem} 
        onUpdateItem={handleUpdateItem} 
        onDeleteItem={handleDeleteItem} 
        onResetInventory={handleResetInventory}
        showNotification={showNotification}
      />;
      case 'l_inv': return <LedgerTable type="inv" state={state} user={user} onNotification={showNotification} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />;
      case 'l_pur': return <LedgerTable type="pur" state={state} user={user} onNotification={showNotification} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />;
      case 'l_rec': return <LedgerTable type="rec" state={state} user={user} onNotification={showNotification} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />;
      case 'l_pay': return <LedgerTable type="pay" state={state} user={user} onNotification={showNotification} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />;
      case 'l_pos': return <LedgerTable type="pos" state={state} user={user} onNotification={showNotification} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />;
      case 'l_exp': return <LedgerTable type="exp" state={state} user={user} onNotification={showNotification} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />;
      case 'r_pnl': return <Reports type="pnl" state={state} showNotification={showNotification} />;
      case 'r_bs': return <Reports type="bs" state={state} showNotification={showNotification} />;
      case 'r_cf': return <Reports type="cf" state={state} showNotification={showNotification} />;
      case 'r_tb': return <Reports type="tb" state={state} showNotification={showNotification} />;
      case 'sett': return <Settings state={state} onSave={handleSaveSettings} onResetInventory={handleResetInventory} showNotification={showNotification} />;
      default: return <Dashboard state={state} onNavigate={handleNavigate} />;
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-orange-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="weave-bg absolute inset-0 opacity-10"></div>
        <div className="strip-header fixed top-0 left-0 right-0 z-[100]"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-[rgba(249,115,22,0.1)] p-10 max-w-md w-full text-center space-y-8 relative z-10"
        >
          <div className="w-24 h-24 bg-[rgba(249,115,22,0.05)] rounded-2xl flex items-center justify-center mx-auto shadow-inner overflow-hidden border border-[rgba(249,115,22,0.1)]">
            {state.settings.logo ? (
              <img 
                src={state.settings.logo} 
                alt="Logo" 
                className="w-full h-full object-contain p-2"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Store className="text-orange-primary" size={40} />
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase">Tsi-Thra</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-widest">Bookkeeping System</p>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-[rgba(30,41,59,0.5)] rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-left">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              Welcome to TSI-THRA BOOKKEEPING. Please sign in with your Google account to access your shop's cloud database and sync your data across all devices.
            </p>
          </div>

          <button 
            onClick={() => signIn()}
            className="w-full btn-primary flex items-center justify-center gap-3 py-4 text-lg"
          >
            <LogIn size={20} /> Sign in with Google
          </button>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            Secure Cloud Storage · ARUN OPTICAL Inventory
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      <div className="strip-header fixed top-0 left-0 right-0 z-[100] no-print"></div>
      
      <Sidebar activePage={activePage} onNavigate={handleNavigate} settings={state.settings} />
      
      <div className="flex-1 flex flex-col min-w-0 pt-[5px]">
        <TopBar title={title} subtitle={subtitle} settings={state.settings} />
        
        <main className="flex-1 overflow-y-auto p-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 ${notification.type === 'error' ? 'bg-red-600' : 'bg-orange-primary'} text-white px-6 py-3 rounded-xl font-bold shadow-2xl z-[200] flex items-center gap-3 no-print`}
          >
            <div className={`w-2 h-2 rounded-full bg-white ${notification.type === 'error' ? '' : 'animate-pulse'}`}></div>
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
              className="absolute inset-0 bg-[rgba(2,6,23,0.6)] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-[rgba(249,115,22,0.1)] p-8 max-w-sm w-full space-y-6"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-[rgba(127,29,29,0.2)] rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="text-red-600" size={32} />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-extrabold uppercase tracking-widest text-[10px] hover:bg-red-700 shadow-lg shadow-[rgba(220,38,38,0.2)] transition-colors"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {lastSavedRecord && (
        <PrintReceipt 
          record={lastSavedRecord.record} 
          type={lastSavedRecord.type}
          settings={state.settings} 
          autoPrint={lastSavedRecord.autoPrint}
          onClose={() => setLastSavedRecord(null)} 
        />
      )}
    </div>
  );
};

export default App;
