import React, { useRef, useState, useEffect } from 'react';
import { Nu } from '../utils';
import { Settings } from '../types';
import { X, Printer, FileDown, Share2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PrintReceiptProps {
  record: any;
  type: 'inv' | 'pur' | 'rec' | 'pay' | 'pos' | 'exp';
  settings: Settings;
  onClose: () => void;
  autoPrint?: boolean;
}

const PrintReceipt: React.FC<PrintReceiptProps> = ({ record, type, settings, onClose, autoPrint = false }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Copy all styles
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('');

    const htmlContent = `
      <html>
        <head>
          <title>Print Receipt - ${record.num}</title>
          ${styles}
          <style>
            @media print {
              body { background: white !important; margin: 0 !important; padding: 0 !important; }
              #printable-record { 
                box-shadow: none !important; 
                border: none !important; 
                width: 100% !important; 
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
                visibility: visible !important;
              }
              .no-print { display: none !important; }
            }
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
            #printable-record { padding: 20px; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div id="printable-record">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = () => {
              // Wait for images to load
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
      alert('Please allow popups to print the receipt.');
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return null;
    
    const element = printRef.current;
    const originalClassName = element.className;
    
    // Force light mode and remove shadows for capture
    element.classList.add('bg-white', 'text-slate-900', 'shadow-none');
    element.classList.remove('dark', 'shadow-lg');

    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Reduced from 3 to 2 for better mobile performance
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      // Restore original styles
      element.className = originalClassName;
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      element.className = originalClassName;
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = await handleExportPDF();
      if (pdf) {
        const customerName = (record.customer || record.supplier || record.party || 'Walk-in').replace(/[^a-z0-9]/gi, '_');
        const dateStr = (record.date || '').replace(/[^a-z0-9]/gi, '_');
        const fileName = `Invoice_${customerName}_${dateStr}.pdf`;
        
        pdf.save(fileName);
      } else {
        alert('Failed to generate PDF. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareText = async () => {
    const customerName = record.customer || record.supplier || record.party || 'Customer';
    const amount = record.grand || record.total || record.amount;
    const shopName = settings.companyName || 'Arun Optical';
    const appUrl = window.location.origin;
    const invNum = record.num || 'Invoice';
    
    const text = `Dear ${customerName}, your invoice ${invNum} for Nu. ${amount} from ${shopName} is ready.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${shopName} Invoice`,
          text: text,
        });
      } catch (error) {
        console.error('Error sharing text:', error);
      }
    } else {
      alert('Sharing is not supported on this browser.');
    }
  };

  const handleSharePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = await handleExportPDF();
      if (!pdf) {
        alert('Failed to generate PDF. Please try again.');
        return;
      }

      const customerName = (record.customer || record.supplier || record.party || 'Walk-in').replace(/[^a-z0-9]/gi, '_');
      const dateStr = (record.date || '').replace(/[^a-z0-9]/gi, '_');
      const fileName = `Invoice_${customerName}_${dateStr}.pdf`;
      
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `Invoice ${record.num} from ${settings.companyName}`
          });
        } catch (error) {
          console.error('Error sharing PDF:', error);
          // Fallback to download if share fails (e.g. user cancels or browser blocks)
          pdf.save(fileName);
        }
      } else {
        // Fallback to download if sharing files is not supported
        alert('File sharing is not supported on this browser. Downloading instead.');
        pdf.save(fileName);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.6)] backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-4 md:p-6 border-b-2 border-slate-50 flex justify-between items-center no-print sticky top-0 bg-white z-10">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900">Print Preview</h2>
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={handlePrint} disabled={isGenerating} className="btn-primary flex items-center gap-2 disabled:opacity-50 text-sm px-3 py-1.5 md:px-4 md:py-2">
              <Printer size={16} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button onClick={handleDownloadPDF} disabled={isGenerating} className="bg-slate-900 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 text-sm">
              {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FileDown size={16} className="md:w-[18px] md:h-[18px]" />} <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={handleShareText} disabled={isGenerating} className="bg-orange-primary text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold hover:bg-orange-600 transition-all flex items-center gap-2 disabled:opacity-50 text-sm">
              <Share2 size={16} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">Share</span>
            </button>
            <button onClick={handleSharePDF} disabled={isGenerating} className="bg-slate-900 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 text-sm">
              {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Share2 size={16} className="md:w-[18px] md:h-[18px]" />} <span className="hidden sm:inline">Share PDF</span>
            </button>
            <button onClick={onClose} disabled={isGenerating} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50">
              <X size={20} className="md:w-6 md:h-6 text-slate-400" />
            </button>
          </div>
        </div>
        
        <div className="p-4 md:p-6 bg-slate-50 flex justify-center overflow-x-auto">
          <div 
            id="printable-record" 
            ref={printRef}
            className="bg-white shadow-lg p-8 md:p-12 w-[210mm] min-h-[297mm] print:shadow-none print:p-0 shrink-0 origin-top"
          >
            {/* Shop Header */}
            <div className="flex justify-between items-start mb-12">
              <div className="flex gap-6 items-start">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo" className="h-20 w-auto object-contain" />
                ) : (
                  <div className="h-20 w-20 bg-[#fff7ed] rounded-2xl flex items-center justify-center text-orange-primary font-black text-2xl border-2 border-[#ffedd5]">
                    TT
                  </div>
                )}
                <div className="space-y-2">
                  <h1 className="text-3xl font-black text-orange-primary uppercase tracking-tighter leading-none">
                    {settings.companyName || 'Tsi-Thra Shop'}
                  </h1>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">{settings.address}</p>
                    <p className="text-sm font-bold text-slate-700">Phone: {settings.phone}</p>
                    <p className="text-sm font-bold text-slate-700">Email: {settings.email}</p>
                  </div>
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className="inline-block bg-orange-primary text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2">
                  {type === 'inv' ? 'Tax Invoice' : type === 'pur' ? 'Purchase Order' : type === 'pos' ? 'Cash Memo' : type === 'exp' ? 'Expense Voucher' : record.type + ' Voucher'}
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">#{record.num}</h2>
                <p className="text-sm font-bold text-slate-500">{record.date}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12 border-y-2 border-slate-100 py-8">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bill To</h3>
                <div className="space-y-1">
                  <p className="text-lg font-black text-slate-900">{record.customer || record.supplier || record.party || 'Walk-in'}</p>
                  {record.phone && <p className="text-sm font-bold text-slate-600">Phone: {record.phone}</p>}
                  {(record.powerL || record.powerR) && (
                    <div className="flex gap-4 text-xs font-bold text-slate-500 mt-2">
                      {record.powerL && <p>L: <span className="text-slate-900">{record.powerL}</span></p>}
                      {record.powerR && <p>R: <span className="text-slate-900">{record.powerR}</span></p>}
                    </div>
                  )}
                  {record.addr && <p className="text-sm font-bold text-slate-600">{record.addr}</p>}
                </div>
              </div>
              <div className="text-right space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Details</h3>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-600">Day: <span className="text-slate-900">{record.day}</span></p>
                  <p className="text-sm font-bold text-slate-600">Method: <span className="text-slate-900">{record.method}</span></p>
                  {record.due && <p className="text-sm font-bold text-slate-600 text-red-600">Due Date: {record.due}</p>}
                </div>
              </div>
            </div>


            {/* Lines Table */}
            {(type === 'inv' || type === 'pur' || type === 'pos') && (
              <div className="mb-12">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="py-4 text-left text-[10px] font-black text-slate-900 uppercase tracking-widest">Description</th>
                      <th className="py-4 text-right text-[10px] font-black text-slate-900 uppercase tracking-widest w-24">Qty</th>
                      <th className="py-4 text-right text-[10px] font-black text-slate-900 uppercase tracking-widest w-32">Rate</th>
                      <th className="py-4 text-right text-[10px] font-black text-slate-900 uppercase tracking-widest w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(record.lines || record.items).map((l: any, i: number) => (
                      <tr key={i}>
                        <td className="py-4 text-sm font-bold text-slate-700">{l.desc}</td>
                        <td className="py-4 text-right text-sm font-bold text-slate-700">{l.qty}</td>
                        <td className="py-4 text-right text-sm font-bold text-slate-700">{Nu(l.rate)}</td>
                        <td className="py-4 text-right text-sm font-black text-slate-900">{Nu(l.total || l.landed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Voucher Details */}
            {(type === 'rec' || type === 'pay' || type === 'exp') && (
              <div className="p-8 bg-slate-50 rounded-3xl mb-12 space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                    {type === 'exp' ? 'Category' : 'Particulars'}
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {type === 'exp' ? record.categoryName : record.acct}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Description</span>
                  <span className="text-sm font-bold text-slate-700">{record.desc || '—'}</span>
                </div>
              </div>
            )}

            {/* Totals Section */}
            <div className="flex justify-end pt-8 border-t-2 border-slate-100">
              <div className="w-80 space-y-4">
                {record.sub !== undefined && (
                  <div className="flex justify-between text-sm font-bold text-slate-500">
                    <span>Subtotal</span>
                    <span>{Nu(record.sub || record.val || record.net)}</span>
                  </div>
                )}
                {record.tax !== undefined && (
                  <div className="flex justify-between text-sm font-bold text-slate-500">
                    <span>Sales Tax</span>
                    <span>{Nu(record.tax || record.st)}</span>
                  </div>
                )}
                {record.disc !== undefined && record.disc > 0 && (
                  <div className="flex justify-between text-sm font-bold text-red-500">
                    <span>Discount</span>
                    <span>-{Nu(record.disc)}</span>
                  </div>
                )}
                <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center">
                  <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">Grand Total</span>
                  <span className="text-3xl font-black text-orange-primary tracking-tighter">{Nu(record.grand || record.total || record.amount)}</span>
                </div>
                {record.paid !== undefined && (
                  <div className="flex justify-between text-sm font-bold text-green-600">
                    <span>Amount Paid</span>
                    <span>{Nu(record.paid)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-24 pt-12 border-t-2 border-slate-100 flex justify-between items-end">
              <div className="text-left space-y-4">
                <div className="w-48 h-px bg-slate-300"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receiver's Signature</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Thank you for your business</p>
                <p className="text-[9px] font-bold text-slate-300 italic">Generated by Tsi-Thra Bookkeeper</p>
              </div>
              <div className="text-right space-y-4">
                <div className="w-48 h-px bg-slate-300"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          #printable-record {
            box-shadow: none !important;
            background: white !important;
          }
        }
        @page {
          size: A4;
          margin: 10mm;
        }
      `}} />
    </div>
  );
};

export default PrintReceipt;
