import React, { useState, useRef } from 'react';
import { AppState, Nu, exportToCSV } from '../utils';
import { Invoice, Purchase, Voucher, POSSale } from '../types';
import { Download, Printer, DollarSign, X, Save, FileDown, Share2, Edit2, Trash2 } from 'lucide-react';
import PrintReceipt from './PrintReceipt';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatDocNum, today, getDayName } from '../utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { User } from 'firebase/auth';

interface LedgerTableProps {
  type: 'inv' | 'pur' | 'rec' | 'pay' | 'pos' | 'exp';
  state: AppState;
  user: User | null;
  onEdit?: (record: any, type: string) => void;
  onDelete?: (record: any, type: string) => void;
  onNotification?: (msg: string) => void;
}

const LedgerTable: React.FC<LedgerTableProps> = ({ type, state, user, onEdit, onDelete, onNotification }) => {
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [paymentModal, setPaymentModal] = useState<Invoice | Purchase | null>(null);
  const [paymentType, setPaymentType] = useState<'inv' | 'pur'>('inv');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ledgerRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!ledgerRef.current) return;
    setIsExporting(true);
    
    try {
      const element = ledgerRef.current;
      
      // Force light mode and remove shadows for capture to avoid oklch/color-mix issues
      const originalClassName = element.className;
      element.classList.add('bg-white', 'text-slate-900');
      element.classList.remove('dark');
      
      // Find all card containers and temporarily remove shadows
      const cards = element.querySelectorAll('.card-container');
      cards.forEach(card => {
        (card as HTMLElement).style.boxShadow = 'none';
        (card as HTMLElement).style.border = '1px solid #e2e8f0';
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      // Restore original styles
      element.className = originalClassName;
      cards.forEach(card => {
        (card as HTMLElement).style.boxShadow = '';
        (card as HTMLElement).style.border = '';
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      pdf.save(`Ledger_${type.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareLedger = async () => {
    const shopName = state.settings.companyName || 'Arun Optical';
    const appUrl = window.location.origin;
    const ledgerName = type === 'inv' ? 'Sales' : type === 'pur' ? 'Purchase' : type === 'rec' ? 'Receipt' : type === 'pay' ? 'Payment' : type === 'pos' ? 'POS Sales' : 'Expense';
    
    const text = `Hello, here is the ${ledgerName} Ledger from ${shopName}. View here: ${appUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${shopName} ${ledgerName} Ledger`,
          text: text,
          url: appUrl
        });
      } catch (error) {
        console.error('Error sharing ledger:', error);
      }
    } else {
      alert('Sharing is not supported on this browser.');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentModal || !user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const collectionName = paymentType === 'inv' ? 'invoices' : 'purchases';
    const docRef = doc(userRef, collectionName, paymentModal.num);
    const countersRef = doc(userRef, 'config', 'counters');
    
    const newPaid = (paymentModal.paid || 0) + payAmount;
    const newStatus = newPaid >= paymentModal.grand ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Unpaid');
    
    try {
      // 1. Update Record
      await setDoc(docRef, { ...paymentModal, paid: newPaid, status: newStatus }, { merge: true });
      
      // 2. Create Voucher
      const vType = paymentType === 'inv' ? 'Receipt' : 'Payment';
      const vDocType = vType === 'Receipt' ? 'rec' : 'pay';
      const vCount = vType === 'Receipt' ? state.counters.rec : state.counters.pay;
      
      const vNum = formatDocNum(vDocType, vCount);
      const voucherRef = doc(userRef, 'vouchers', vNum);
      const voucher: Voucher = {
        num: vNum,
        date: today(),
        day: getDayName(today()),
        party: paymentType === 'inv' ? (paymentModal as Invoice).customer : (paymentModal as Purchase).supplier,
        acct: paymentType === 'inv' ? 'Accounts Receivable' : 'Accounts Payable',
        amount: payAmount,
        method: payMethod,
        desc: `Payment for ${paymentType === 'inv' ? 'Invoice' : 'Purchase'} #${paymentModal.num}`,
        type: vType
      };
      await setDoc(voucherRef, voucher);
      
      // 3. Increment Counter
      const newCounters = { ...state.counters };
      if (vType === 'Receipt') newCounters.rec++;
      else newCounters.pay++;
      await setDoc(countersRef, newCounters, { merge: true });
      
      setPaymentModal(null);
      if (onNotification) {
        onNotification(`Payment of Nu. ${payAmount} recorded for ${paymentType === 'inv' ? 'Invoice' : 'Purchase'} #${paymentModal.num}`);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, docRef.path);
    }
  };

  const handleExport = () => {
    const filename = `TsiThra_${type.toUpperCase()}_${new Date().toISOString().slice(0, 10)}`;
    let dataToExport = [];
    
    switch (type) {
      case 'inv': dataToExport = state.invoices; break;
      case 'pur': dataToExport = state.purchases; break;
      case 'rec': dataToExport = state.vouchers.filter(v => v.type === 'Receipt'); break;
      case 'pay': dataToExport = state.vouchers.filter(v => v.type === 'Payment'); break;
      case 'pos': dataToExport = state.posSales; break;
      case 'exp': dataToExport = state.expenses; break;
    }
    
    exportToCSV(filename, dataToExport);
  };

  const handlePrint = () => {
    const printContent = ledgerRef.current;
    if (!printContent) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('');

    const htmlContent = `
      <html>
        <head>
          <title>Print Ledger - ${type.toUpperCase()}</title>
          ${styles}
          <style>
            @media print {
              body { background: white !important; margin: 0 !important; padding: 0 !important; }
              #printable-ledger { 
                box-shadow: none !important; 
                border: none !important; 
                width: 100% !important; 
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                visibility: visible !important;
              }
              .no-print { display: none !important; }
              .print-only { display: block !important; }
              .card-container {
                box-shadow: none !important;
                border: 1px solid #e2e8f0 !important;
                background: transparent !important;
                padding: 0 !important;
                overflow: visible !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              .table-cell {
                border-bottom: 1px solid #e2e8f0 !important;
                color: black !important;
                padding: 8px !important;
              }
              .table-header {
                background: #f8fafc !important;
                color: #64748b !important;
                border-bottom: 2px solid #e2e8f0 !important;
                padding: 8px !important;
              }
            }
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
            #printable-ledger { padding: 20px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div id="printable-ledger">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              const images = Array.from(document.images);
              const promises = images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                  img.onload = resolve;
                  img.onerror = resolve;
                });
              });

              Promise.all(promises).then(() => {
                setTimeout(() => {
                  window.print();
                }, 500);
              });
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
      alert('Please allow popups to print the ledger.');
    }
  };

  const getTableData = () => {
    const s = searchTerm.toLowerCase();
    
    switch (type) {
      case 'inv': {
        const filtered = state.invoices.filter(r => 
          r.num.toLowerCase().includes(s) || 
          r.customer.toLowerCase().includes(s)
        );
        return {
          headers: ['#', 'Date', 'Customer', 'L/R Power', 'Grand Total', 'Paid', 'Outstanding', 'Method', 'Status', ''],
          data: filtered,
          renderRow: (r: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="table-cell">{r.num}</td>
              <td className="table-cell">{r.date}</td>
              <td className="table-cell">{r.customer}</td>
              <td className="table-cell text-xs font-mono text-[#94a3b8]">
                {r.powerL || r.powerR ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[#94a3b8]">L: {r.powerL || '-'}</span>
                    <span className="text-[#94a3b8]">R: {r.powerR || '-'}</span>
                  </div>
                ) : '-'}
              </td>
              <td className="table-cell text-right text-orange-primary font-bold">{Nu(r.grand)}</td>
              <td className="table-cell text-right text-green-secondary font-bold">{Nu(r.paid || 0)}</td>
              <td className="table-cell text-right text-red-600 font-bold">{Nu(r.grand - (r.paid || 0))}</td>
              <td className="table-cell">{r.method}</td>
              <td className="table-cell">
                <span className={`px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                  r.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                  r.status === 'Partial' ? 'bg-orange-100 text-orange-700' : 
                  'bg-red-100 text-red-700'
                }`}>
                  {r.status}
                </span>
              </td>
                  <td className="table-cell no-print">
                <div className="flex gap-2">
                  {r.status !== 'Paid' && (
                    <button 
                      onClick={() => { setPaymentModal(r); setPaymentType('inv'); setPayAmount(r.grand - (r.paid || 0)); }} 
                      className="text-slate-400 hover:text-green-600"
                      title="Record Payment"
                    >
                      <DollarSign size={14} />
                    </button>
                  )}
                  <button onClick={() => setSelectedRecord(r)} className="text-slate-400 hover:text-orange-primary">
                    <Printer size={14} />
                  </button>
                  {onEdit && (
                    <button onClick={() => onEdit(r, 'inv')} className="text-slate-400 hover:text-blue-600" title="Edit Invoice">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(r, 'inv')} className="text-slate-400 hover:text-red-600" title="Delete Invoice">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ),
          footer: () => {
            const t = filtered.reduce((acc: any, r: any) => ({
              grand: acc.grand + r.grand,
              paid: acc.paid + r.paid,
              out: acc.out + (r.grand - r.paid)
            }), { grand: 0, paid: 0, out: 0 });
            return (
              <tr className="bg-slate-50 font-extrabold">
                <td colSpan={4} className="table-cell">Total</td>
                <td className="table-cell text-right text-orange-primary">{Nu(t.grand)}</td>
                <td className="table-cell text-right text-green-secondary">{Nu(t.paid)}</td>
                <td className="table-cell text-right text-red-600">{Nu(t.out)}</td>
                <td colSpan={3} className="table-cell"></td>
              </tr>
            );
          }
        };
      }
      case 'pur': {
        const filtered = state.purchases.filter(r => 
          r.num.toLowerCase().includes(s) || 
          r.supplier.toLowerCase().includes(s)
        );
        return {
          headers: ['#', 'Date', 'Supplier', 'Value', 'Duty', 'Tax', 'Landed', 'Paid', 'Outstanding', 'Status', ''],
          data: filtered,
          renderRow: (r: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="table-cell">{r.num}</td>
              <td className="table-cell">{r.date}</td>
              <td className="table-cell">{r.supplier}</td>
              <td className="table-cell text-right font-bold">{Nu(r.val)}</td>
              <td className="table-cell text-right font-bold">{Nu(r.cd)}</td>
              <td className="table-cell text-right font-bold">{Nu(r.st)}</td>
              <td className="table-cell text-right text-orange-primary font-bold">{Nu(r.grand)}</td>
              <td className="table-cell text-right text-green-secondary font-bold">{Nu(r.paid || 0)}</td>
              <td className="table-cell text-right text-red-600 font-bold">{Nu(r.grand - (r.paid || 0))}</td>
              <td className="table-cell">
                <span className={`px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                  r.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                  r.status === 'Partial' ? 'bg-orange-100 text-orange-700' : 
                  'bg-red-100 text-red-700'
                }`}>
                  {r.status}
                </span>
              </td>
              <td className="table-cell no-print">
                <div className="flex gap-2">
                  {r.status !== 'Paid' && (
                    <button 
                      onClick={() => { setPaymentModal(r); setPaymentType('pur'); setPayAmount(r.grand - (r.paid || 0)); }} 
                      className="text-slate-400 hover:text-green-600"
                      title="Record Payment"
                    >
                      <DollarSign size={14} />
                    </button>
                  )}
                  <button onClick={() => setSelectedRecord(r)} className="text-slate-400 hover:text-orange-primary">
                    <Printer size={14} />
                  </button>
                  {onEdit && (
                    <button onClick={() => onEdit(r, 'pur')} className="text-slate-400 hover:text-blue-600" title="Edit Purchase">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(r, 'pur')} className="text-slate-400 hover:text-red-600" title="Delete Purchase">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ),
          footer: () => {
            const t = filtered.reduce((acc: any, r: any) => ({
              val: acc.val + r.val,
              cd: acc.cd + r.cd,
              st: acc.st + r.st,
              grand: acc.grand + r.grand,
              paid: acc.paid + (r.paid || 0),
              out: acc.out + (r.grand - (r.paid || 0))
            }), { val: 0, cd: 0, st: 0, grand: 0, paid: 0, out: 0 });
            return (
              <tr className="bg-slate-50 font-extrabold">
                <td colSpan={3} className="table-cell">Total</td>
                <td className="table-cell text-right">{Nu(t.val)}</td>
                <td className="table-cell text-right">{Nu(t.cd)}</td>
                <td className="table-cell text-right">{Nu(t.st)}</td>
                <td className="table-cell text-right text-orange-primary">{Nu(t.grand)}</td>
                <td className="table-cell text-right text-green-secondary">{Nu(t.paid)}</td>
                <td className="table-cell text-right text-red-600">{Nu(t.out)}</td>
                <td colSpan={2} className="table-cell"></td>
              </tr>
            );
          }
        };
      }
      case 'rec':
      case 'pay': {
        const vouchers = state.vouchers.filter(v => 
          v.type === (type === 'rec' ? 'Receipt' : 'Payment') &&
          (v.num.toLowerCase().includes(s) || v.party.toLowerCase().includes(s))
        );
        return {
          headers: ['#', 'Date', 'Day', type === 'rec' ? 'From' : 'To', 'Particular', 'Method', 'Amount', ''],
          data: vouchers,
          renderRow: (r: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="table-cell">{r.num}</td>
              <td className="table-cell">{r.date}</td>
              <td className="table-cell">{r.day}</td>
              <td className="table-cell">{r.party}</td>
              <td className="table-cell">{r.acct}</td>
              <td className="table-cell">{r.method}</td>
              <td className={`table-cell text-right font-bold ${type === 'rec' ? 'text-green-secondary' : 'text-red-600'}`}>{Nu(r.amount)}</td>
              <td className="table-cell no-print">
                <div className="flex gap-2">
                  <button onClick={() => setSelectedRecord(r)} className="text-slate-400 hover:text-orange-primary">
                    <Printer size={14} />
                  </button>
                  {onEdit && (
                    <button onClick={() => onEdit(r, type === 'rec' ? 'rec' : 'pay')} className="text-slate-400 hover:text-blue-600" title="Edit Voucher">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(r, type === 'rec' ? 'rec' : 'pay')} className="text-slate-400 hover:text-red-600" title="Delete Voucher">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ),
          footer: () => (
            <tr className="bg-slate-50 font-extrabold">
              <td colSpan={6} className="table-cell">Total</td>
              <td className={`table-cell text-right ${type === 'rec' ? 'text-green-secondary' : 'text-red-600'}`}>
                {Nu(vouchers.reduce((a, r) => a + r.amount, 0))}
              </td>
              <td className="table-cell"></td>
            </tr>
          )
        };
      }
      case 'pos': {
        const filtered = state.posSales.filter(r => 
          r.num.toLowerCase().includes(s) || 
          r.customer.toLowerCase().includes(s)
        );
        return {
          headers: ['#', 'Date', 'Day', 'Customer', 'L/R Power', 'Item', 'Method', 'Total', ''],
          data: filtered,
          renderRow: (r: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="table-cell">{r.num}</td>
              <td className="table-cell">{r.date}</td>
              <td className="table-cell">{r.day}</td>
              <td className="table-cell">{r.customer}</td>
              <td className="table-cell text-xs font-mono text-[#94a3b8]">
                {r.powerL || r.powerR ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[#94a3b8]">L: {r.powerL || '-'}</span>
                    <span className="text-[#94a3b8]">R: {r.powerR || '-'}</span>
                  </div>
                ) : '-'}
              </td>
              <td className="table-cell truncate max-w-[200px]">{r.item}</td>
              <td className="table-cell">{r.method}</td>
              <td className="table-cell text-right text-green-secondary font-bold">{Nu(r.total)}</td>
              <td className="table-cell no-print">
                <div className="flex gap-2">
                  <button onClick={() => setSelectedRecord(r)} className="text-slate-400 hover:text-orange-primary">
                    <Printer size={14} />
                  </button>
                  {onEdit && (
                    <button onClick={() => onEdit(r, 'pos')} className="text-slate-400 hover:text-blue-600" title="Edit POS Sale">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(r, 'pos')} className="text-slate-400 hover:text-red-600" title="Delete POS Sale">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ),
          footer: () => (
            <tr className="bg-slate-50 font-extrabold">
              <td colSpan={7} className="table-cell">Total</td>
              <td className="table-cell text-right text-green-secondary">
                {Nu(filtered.reduce((a, r) => a + r.total, 0))}
              </td>
              <td className="table-cell"></td>
            </tr>
          )
        };
      }
      case 'exp': {
        const filtered = state.expenses.filter(r => 
          r.num.toLowerCase().includes(s) || 
          r.categoryName.toLowerCase().includes(s) ||
          r.desc.toLowerCase().includes(s)
        );
        return {
          headers: ['#', 'Date', 'Category', 'Description', 'Method', 'Amount', ''],
          data: filtered,
          renderRow: (r: any, idx: number) => (
            <tr key={idx} className="hover:bg-slate-50 transition-colors">
              <td className="table-cell">{r.num}</td>
              <td className="table-cell">{r.date}</td>
              <td className="table-cell font-bold">{r.categoryName}</td>
              <td className="table-cell text-xs text-slate-500 max-w-[200px] truncate">{r.desc}</td>
              <td className="table-cell">{r.method}</td>
              <td className="table-cell text-right text-red-600 font-bold">{Nu(r.amount)}</td>
              <td className="table-cell no-print">
                <div className="flex gap-2">
                  <button onClick={() => setSelectedRecord(r)} className="text-slate-400 hover:text-orange-primary">
                    <Printer size={14} />
                  </button>
                  {onEdit && (
                    <button onClick={() => onEdit(r, 'exp')} className="text-slate-400 hover:text-blue-600" title="Edit Expense">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(r, 'exp')} className="text-slate-400 hover:text-red-600" title="Delete Expense">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ),
          footer: () => (
            <tr className="bg-slate-50 font-extrabold">
              <td colSpan={5} className="table-cell">Total</td>
              <td className="table-cell text-right text-red-600">
                {Nu(filtered.reduce((a, r) => a + r.amount, 0))}
              </td>
              <td className="table-cell"></td>
            </tr>
          )
        };
      }
    }
  };

  const { headers, data, renderRow, footer } = getTableData();

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4 no-print">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input 
              type="text"
              placeholder={`Search ${type === 'inv' ? 'Invoices' : type === 'pur' ? 'Purchases' : type === 'pos' ? 'POS Sales' : type === 'exp' ? 'Expenses' : 'Vouchers'}...`}
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2 text-xs py-1.5"
          >
            <Printer size={14} />
            Print Ledger
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="btn-secondary flex items-center gap-2 text-xs py-1.5"
          >
            <FileDown size={14} />
            {isExporting ? 'Generating...' : 'Download Statement'}
          </button>
          <button 
            onClick={handleShareLedger}
            className="btn-secondary flex items-center gap-2 text-xs py-1.5 bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0] hover:bg-[#dcfce7]"
          >
            <Share2 size={14} />
            Share Ledger
          </button>
          <button 
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2 text-xs py-1.5"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>
      
      {data.length === 0 ? (
        <div className="card-container p-20 text-center text-slate-400 font-bold text-sm bg-white">
          {searchTerm ? 'No matching records found.' : 'No records found in this ledger.'}
        </div>
      ) : (
        <div ref={ledgerRef} className="bg-white p-4 rounded-3xl">
          {/* Print/PDF header */}
          <div className={`${isExporting ? 'block' : 'print-only'} mb-6`}>
            <div className="flex items-center gap-6 justify-center mb-4">
              {state.settings.logo && (
                <img src={state.settings.logo} alt="Logo" className="h-16 w-auto object-contain" />
              )}
              <div className="text-center">
                <h1 className="text-2xl font-black text-orange-primary uppercase tracking-tighter">{state.settings.companyName}</h1>
                <p className="text-sm font-bold text-slate-500">{state.settings.address}</p>
                <p className="text-sm font-bold text-slate-500">Contact: {state.settings.phone}</p>
              </div>
            </div>
            <div className="mt-4 border-b-2 border-slate-900 pb-2 text-center">
              <h2 className="text-xl font-extrabold uppercase tracking-wider">
                {type === 'inv' ? 'Sales Ledger' : type === 'pur' ? 'Purchase Ledger' : type === 'rec' ? 'Receipt Ledger' : type === 'pay' ? 'Payment Ledger' : type === 'pos' ? 'POS Sales Ledger' : 'Expense Ledger'}
              </h2>
              <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="card-container overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className={`table-header ${h.includes('Total') || h.includes('Amount') || h.includes('Landed') || h.includes('Outstanding') || h.includes('Paid') || h.includes('Value') || h.includes('Duty') || h.includes('Tax') ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(renderRow)}
                {footer()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,23,42,0.6)] backdrop-blur-sm p-4 no-print">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b-2 border-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-slate-900">
                {paymentType === 'inv' ? 'Record Receipt' : 'Record Payment'}
              </h2>
              <button onClick={() => setPaymentModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-[#fff7ed] rounded-2xl border border-[#ffedd5]">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <span>{paymentType === 'inv' ? 'Invoice #' : 'Purchase #'}</span>
                  <span>Outstanding</span>
                </div>
                <div className="flex justify-between text-lg font-black">
                  <span className="text-slate-900">{paymentModal.num}</span>
                  <span className="text-red-600">{Nu(paymentModal.grand - (paymentModal.paid || 0))}</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Amount to {paymentType === 'inv' ? 'Receive' : 'Pay'} (Nu.)</label>
                <input 
                  type="number" 
                  className="input-field text-lg" 
                  value={payAmount} 
                  onChange={e => setPayAmount(Number(e.target.value))}
                  max={paymentModal.grand - (paymentModal.paid || 0)}
                  step="0.01"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Payment Method</label>
                <select className="input-field" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="mBoB">mBoB</option>
                  <option value="eTeeru">eTeeru</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button onClick={handleRecordPayment} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={18} /> Save Payment
              </button>
              <button onClick={() => setPaymentModal(null)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
        <PrintReceipt 
          record={selectedRecord}
          type={type}
          settings={state.settings}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
};

export default LedgerTable;
