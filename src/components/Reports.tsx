import React, { useRef, useState } from 'react';
import { AppState, Nu } from '../utils';
import { Printer, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportsProps {
  type: 'pnl' | 'bs' | 'cf' | 'tb' | 'cat';
  state: AppState;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const Reports: React.FC<ReportsProps> = ({ type, state, showNotification }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      const element = reportRef.current;
      const originalClassName = element.className;
      
      // Force light mode and remove shadows for capture
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
      
      const reportName = type === 'pnl' ? 'Profit_Loss' : type === 'bs' ? 'Balance_Sheet' : type === 'cf' ? 'Cash_Flow' : 'Trial_Balance';
      pdf.save(`${reportName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('');

    const htmlContent = `
      <html>
        <head>
          <title>Print Report - ${type.toUpperCase()}</title>
          ${styles}
          <style>
            @media print {
              body { background: white !important; margin: 0 !important; padding: 0 !important; }
              #printable-report { 
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
            }
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
            #printable-report { padding: 20px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div id="printable-report">
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
      alert('Please allow popups to print the report.');
    }
  };

  const RL = (l: string, v: number, cls = '') => (
    <div className={`flex justify-between p-2 text-sm font-bold border-b border-slate-50 ${cls}`}>
      <span className="text-slate-500">{l}</span>
      <span className={v >= 0 ? 'text-slate-900' : 'text-red-600'}>{Nu(v)}</span>
    </div>
  );

  const SectionHeader = (l: string) => (
    <div className="text-[10px] font-extrabold text-green-primary uppercase tracking-widest py-2 border-b-2 border-[rgba(21,128,61,0.2)] mb-2">
      {l}
    </div>
  );

  const renderPNL = () => {
    const pn = state.posSales.reduce((s, r) => s + r.net, 0);
    const pt = state.posSales.reduce((s, r) => s + r.tax, 0);
    const ir = state.invoices.reduce((s, r) => s + r.grand, 0);
    const rc = state.vouchers.filter(v => v.type === 'Receipt').reduce((s, r) => s + r.amount, 0);
    const ti = pn + ir + rc;
    
    const pv = state.purchases.reduce((s, r) => s + r.val, 0);
    const pd = state.purchases.reduce((s, r) => s + r.cd, 0);
    const ps = state.purchases.reduce((s, r) => s + r.st, 0);
    const tc = pv + pd + ps;
    
    const gp = ti - tc;
    const py = state.vouchers.filter(v => v.type === 'Payment').reduce((s, r) => s + r.amount, 0);
    const exT = state.expenses.reduce((s, r) => s + r.amount, 0);
    
    // Group expenses by category
    const expensesByCategory = state.expenseCategories.map(cat => ({
      name: cat.name,
      amount: state.expenses.filter(e => e.categoryId === cat.id).reduce((s, r) => s + r.amount, 0)
    })).filter(c => c.amount > 0);

    const np = gp - py - exT;

    return (
      <div className="max-w-xl space-y-6">
        <div className="card-container p-6">
          {SectionHeader('Income')}
          {RL('POS Sales (Net)', pn)}
          {RL('POS Tax Collected', pt)}
          {RL('Invoice Revenue', ir)}
          {RL('Cash Receipts', rc)}
          {RL('Total Income', ti, 'bg-[#f0fdf4]')}
          
          <div className="mt-6">
            {SectionHeader('Cost of Goods Sold')}
            {RL('Purchase Value', pv)}
            {RL('Customs Duty', pd)}
            {RL('Sales Tax on Purchases', ps)}
            {RL('Total COGS', tc, 'bg-[#fef2f2]')}
          </div>
          
          <div className="mt-6">
            {RL('Gross Profit', gp, 'bg-[#fff7ed] text-orange-primary')}
          </div>
          
          <div className="mt-6">
            {SectionHeader('Operating Expenses')}
            {RL('Cash Payments (Vouchers)', py)}
            {expensesByCategory.map((cat, idx) => (
              <div key={idx}>
                {RL(cat.name, cat.amount)}
              </div>
            ))}
            {RL('Total OPEX', py + exT, 'bg-[#fef2f2]')}
          </div>
          
          <div className="mt-8 p-4 bg-[#fff7ed] border-2 border-[rgba(249,115,22,0.2)] rounded-xl flex justify-between items-center">
            <span className="text-sm font-extrabold text-slate-900">Net Profit / (Loss)</span>
            <span className={`text-xl font-extrabold tracking-tight ${np >= 0 ? 'text-orange-primary' : 'text-red-600'}`}>{Nu(np)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBS = () => {
    const pc = state.posSales.filter(r => r.method === 'Cash').reduce((s, r) => s + r.total, 0);
    const pd2 = state.posSales.filter(r => r.method !== 'Cash').reduce((s, r) => s + r.total, 0);
    const ar = state.invoices.reduce((s, r) => s + (r.grand - r.paid), 0);
    const ic = state.purchases.reduce((s, r) => s + r.val, 0);
    const rT = state.vouchers.filter(v => v.type === 'Receipt').reduce((s, r) => s + r.amount, 0);
    const ta = rT + pc + pd2 + ar + ic;
    
    const ap = state.purchases.filter(r => r.status !== 'Paid').reduce((s, r) => s + r.grand, 0);
    const pyT = state.vouchers.filter(v => v.type === 'Payment').reduce((s, r) => s + r.amount, 0);
    const exT = state.expenses.reduce((s, r) => s + r.amount, 0);
    const tl = pyT + ap + exT;
    const eq = ta - tl;

    return (
      <div className="max-w-xl space-y-6">
        <div className="card-container p-6">
          {SectionHeader('Assets')}
          {RL('Cash Receipts', rT)}
          {RL('POS Cash', pc)}
          {RL('POS Digital', pd2)}
          {RL('Accounts Receivable', ar)}
          {RL('Inventory at Cost', ic)}
          {RL('Total Assets', ta, 'bg-[#f0fdf4]')}
          
          <div className="mt-6">
            {SectionHeader('Liabilities & Expenses')}
            {RL('Cash Payments (Vouchers)', pyT)}
            {RL('Recorded Expenses', exT)}
            {RL('Accounts Payable', ap)}
            {RL('Total Liabilities', tl, 'bg-[#fef2f2]')}
          </div>
          
          <div className="mt-8 p-4 bg-[#f0fdf4] border-2 border-[rgba(21,128,61,0.2)] rounded-xl flex justify-between items-center">
            <span className="text-sm font-extrabold text-slate-900">Net Worth (Equity)</span>
            <span className="text-xl font-extrabold text-green-primary tracking-tight">{Nu(eq)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCF = () => {
    const pc = state.posSales.filter(r => r.method === 'Cash').reduce((s, r) => s + r.total, 0);
    const pd2 = state.posSales.filter(r => r.method !== 'Cash').reduce((s, r) => s + r.total, 0);
    const ic = state.invoices.reduce((s, r) => s + r.paid, 0);
    const rT = state.vouchers.filter(v => v.type === 'Receipt').reduce((s, r) => s + r.amount, 0);
    const ti = rT + pc + pd2 + ic;
    
    const pp = state.purchases.filter(r => r.status === 'Paid').reduce((s, r) => s + r.grand, 0);
    const pyT = state.vouchers.filter(v => v.type === 'Payment').reduce((s, r) => s + r.amount, 0);
    const exT = state.expenses.reduce((s, r) => s + r.amount, 0);
    const to = pyT + pp + exT;
    const net = ti - to;

    return (
      <div className="max-w-xl space-y-6">
        <div className="card-container p-6">
          {SectionHeader('Cash Inflows')}
          {RL('Receipt Vouchers', rT)}
          {RL('POS Cash', pc)}
          {RL('POS Digital', pd2)}
          {RL('Invoice Collections', ic)}
          {RL('Total Inflows', ti, 'bg-[#f0fdf4]')}
          
          <div className="mt-6">
            {SectionHeader('Cash Outflows')}
            {RL('Payment Vouchers', pyT)}
            {RL('Expenses Paid', exT)}
            {RL('Purchases Paid', pp)}
            {RL('Total Outflows', to, 'bg-[#fef2f2]')}
          </div>
          
          <div className="mt-8 p-4 bg-[#eff6ff] border-2 border-[rgba(37,99,235,0.2)] rounded-xl flex justify-between items-center">
            <span className="text-sm font-extrabold text-slate-900">Net Cash Flow</span>
            <span className={`text-xl font-extrabold tracking-tight ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{Nu(net)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTB = () => {
    const pT = state.posSales.reduce((s, r) => s + r.total, 0);
    const ptx = state.posSales.reduce((s, r) => s + r.tax, 0);
    const iR = state.invoices.reduce((s, r) => s + r.grand, 0);
    const rT = state.vouchers.filter(v => v.type === 'Receipt').reduce((s, r) => s + r.amount, 0);
    
    const pyT = state.vouchers.filter(v => v.type === 'Payment').reduce((s, r) => s + r.amount, 0);
    const exT = state.expenses.reduce((s, r) => s + r.amount, 0);
    const pv = state.purchases.reduce((s, r) => s + r.val, 0);
    const pd3 = state.purchases.reduce((s, r) => s + r.cd, 0);
    const ps = state.purchases.reduce((s, r) => s + r.st, 0);
    
    const tD = pyT + exT + pv + pd3 + ps;
    const tC = pT + ptx + iR + rT;

    return (
      <div className="max-w-2xl">
        <div className="card-container overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Account</th>
                <th className="table-header text-right">Debit (Nu.)</th>
                <th className="table-header text-right">Credit (Nu.)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={3} className="bg-[#f0fdf4] px-4 py-2 text-[10px] font-extrabold text-green-primary uppercase tracking-widest">Income — Credit Side</td></tr>
              <tr><td className="table-cell">POS Sales</td><td className="table-cell"></td><td className="table-cell text-right text-green-secondary">{Nu(pT)}</td></tr>
              <tr><td className="table-cell">POS Tax Collected</td><td className="table-cell"></td><td className="table-cell text-right text-green-secondary">{Nu(ptx)}</td></tr>
              <tr><td className="table-cell">Invoice Revenue</td><td className="table-cell"></td><td className="table-cell text-right text-green-secondary">{Nu(iR)}</td></tr>
              <tr><td className="table-cell">Cash Receipts</td><td className="table-cell"></td><td className="table-cell text-right text-green-secondary">{Nu(rT)}</td></tr>
              
              <tr><td colSpan={3} className="bg-[#fef2f2] px-4 py-2 text-[10px] font-extrabold text-red-600 uppercase tracking-widest">Expenses — Debit Side</td></tr>
              <tr><td className="table-cell">Cash Payments (Vouchers)</td><td className="table-cell text-right text-red-600">{Nu(pyT)}</td><td className="table-cell"></td></tr>
              <tr><td className="table-cell">Recorded Expenses</td><td className="table-cell text-right text-red-600">{Nu(exT)}</td><td className="table-cell"></td></tr>
              <tr><td className="table-cell">Purchases Value</td><td className="table-cell text-right text-red-600">{Nu(pv)}</td><td className="table-cell"></td></tr>
              <tr><td className="table-cell">Customs Duty</td><td className="table-cell text-right text-red-600">{Nu(pd3)}</td><td className="table-cell"></td></tr>
              <tr><td className="table-cell">Sales Tax on Purchases</td><td className="table-cell text-right text-red-600">{Nu(ps)}</td><td className="table-cell"></td></tr>
              
              <tr className="bg-slate-50 font-extrabold">
                <td className="table-cell">Total</td>
                <td className="table-cell text-right text-red-600">{Nu(tD)}</td>
                <td className="table-cell text-right text-green-secondary">{Nu(tC)}</td>
              </tr>
              <tr className="bg-[#fff7ed] font-extrabold">
                <td className="table-cell text-orange-primary">Net Difference</td>
                <td colSpan={2} className="table-cell text-right text-orange-primary">{Nu(tC - tD)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCategoryReport = () => {
    const categoryTotals: Record<string, { qty: number; net: number; tax: number; total: number }> = {};

    // Helper to process lines
    const processLines = (lines: any[]) => {
      lines.forEach(line => {
        if (!line.btc) return;
        const item = state.items.find(i => i.btc === line.btc);
        const category = item?.category || 'Uncategorized';
        
        if (!categoryTotals[category]) {
          categoryTotals[category] = { qty: 0, net: 0, tax: 0, total: 0 };
        }
        
        categoryTotals[category].qty += (line.qty || 0);
        categoryTotals[category].net += (line.net || 0);
        categoryTotals[category].tax += (line.tax || 0);
        categoryTotals[category].total += (line.total || 0);
      });
    };

    // Process Invoices
    state.invoices.forEach(inv => {
      if (inv.lines) processLines(inv.lines);
    });

    // Process POS Sales
    state.posSales.forEach(pos => {
      if (pos.lines) processLines(pos.lines);
    });

    const data = Object.entries(categoryTotals).map(([name, values]) => ({
      name,
      ...values
    })).sort((a, b) => b.total - a.total);

    const totalSales = data.reduce((sum, item) => sum + item.total, 0);
    const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

    return (
      <div className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-container p-6">
            {SectionHeader('Sales by Category')}
            <div className="h-64 mt-4">
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="total"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => Nu(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No sales data available
                </div>
              )}
            </div>
          </div>

          <div className="card-container p-6">
            {SectionHeader('Category Breakdown')}
            <div className="mt-4 space-y-4">
              {data.length > 0 ? data.map((cat, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{cat.name}</div>
                      <div className="text-xs text-slate-500">{cat.qty} items sold</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-white">{Nu(cat.total)}</div>
                    <div className="text-xs text-slate-500">{((cat.total / totalSales) * 100).toFixed(1)}%</div>
                  </div>
                </div>
              )) : (
                <div className="text-center text-slate-400 text-sm py-8">
                  No sales data available
                </div>
              )}
              
              {data.length > 0 && (
                <div className="mt-6 pt-4 border-t-2 border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-widest text-xs">Total Sales</span>
                  <span className="font-extrabold text-orange-primary text-lg">{Nu(totalSales)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    switch (type) {
      case 'pnl': return renderPNL();
      case 'bs': return renderBS();
      case 'cf': return renderCF();
      case 'tb': return renderTB();
      case 'cat': return renderCategoryReport();
      default: return null;
    }
  };

  return (
    <div className="space-y-4" ref={reportRef}>
      <div className="flex justify-end gap-3 no-print">
        <button 
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="btn-secondary flex items-center gap-2 text-xs py-1.5"
        >
          <FileDown size={14} />
          {isExporting ? 'Exporting...' : 'Download PDF'}
        </button>
        <button 
          onClick={handlePrint}
          className="bg-slate-900 text-white px-4 py-1.5 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 text-xs"
        >
          <Printer size={14} />
          Print Report
        </button>
      </div>
      {/* Print-only header */}
      <div className="print-only mb-6 text-center">
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
        <div className="mt-4 border-b-2 border-slate-900 pb-2">
          <h2 className="text-xl font-extrabold uppercase tracking-wider">
            {type === 'pnl' ? 'Profit & Loss Statement' : type === 'bs' ? 'Balance Sheet' : type === 'cf' ? 'Cash Flow Statement' : 'Trial Balance'}
          </h2>
          <p className="text-xs text-slate-500">Generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {renderReport()}
    </div>
  );
};

export default Reports;
