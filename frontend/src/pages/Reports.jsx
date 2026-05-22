import React, { useState, useEffect } from 'react';
import api, { invoicesAPI, settingsAPI } from '../services/api';

const Reports = () => {
  const [invoices, setInvoices] = useState([]);
  const [currency, setCurrency] = useState('PKR');
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [printLoadingId, setPrintLoadingId] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await invoicesAPI.list();
      // Sort invoices desc by date
      setInvoices(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

      const settings = await settingsAPI.list();
      const curSetting = settings.find(s => s.key === 'currency');
      if (curSetting) setCurrency(curSetting.value);
    } catch (err) {
      setError('Could not retrieve report logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download invoice PDF. Make sure you are logged in.');
    }
  };

  // Quick Analytics calculations
  const calculateTotalSales = () => {
    return invoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
  };

  const calculateAverageTicket = () => {
    if (invoices.length === 0) return 0;
    return calculateTotalSales() / invoices.length;
  };

  const calculateTotalTaxCollected = () => {
    return invoices.reduce((sum, inv) => sum + parseFloat(inv.tax || 0), 0);
  };

  // Reprint Receipt trigger
  const handleReprint = async (invoiceId) => {
    try {
      setPrintLoadingId(invoiceId);
      await invoicesAPI.reprint(invoiceId);
      alert('Thermal printing job sent successfully!');
    } catch (err) {
      alert('Failed to send print job. Verify printer daemon connectivity.');
    } finally {
      setPrintLoadingId(null);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    return inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (inv.order?.order_number && inv.order.order_number.toString().includes(searchQuery));
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface-bright select-none p-margin-desktop space-y-stack-md">
      
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white border border-outline-variant p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-primary">Sales Reports & Invoices</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Review financial performance metrics, sales taxes, and reprint historical transaction invoices.</p>
        </div>
        <button
          onClick={loadData}
          className="border border-outline text-on-surface font-label-lg px-4 py-2 rounded-lg hover:bg-surface-container transition-all flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">sync</span>
          Sync Reports
        </button>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="bg-white border border-outline-variant p-4 rounded-lg flex items-center gap-4 shadow-sm">
          <div className="bg-primary-container text-on-primary-container p-3 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">monetization_on</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant">Gross Earnings</p>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {currency} {calculateTotalSales().toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white border border-outline-variant p-4 rounded-lg flex items-center gap-4 shadow-sm">
          <div className="bg-tertiary-container text-on-tertiary-container p-3 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">analytics</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant">Orders Audited</p>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{invoices.length} checkouts</h3>
          </div>
        </div>

        <div className="bg-white border border-outline-variant p-4 rounded-lg flex items-center gap-4 shadow-sm">
          <div className="bg-secondary-container text-on-secondary-container p-3 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant">Average Ticket</p>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {currency} {calculateAverageTicket().toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white border border-outline-variant p-4 rounded-lg flex items-center gap-4 shadow-sm">
          <div className="bg-error-container text-on-error-container p-3 rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">percent</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant">Total Tax Collected</p>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface text-error">
              {currency} {calculateTotalTaxCollected().toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="flex-1 bg-white border border-outline-variant rounded-xl flex flex-col shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between flex-wrap gap-2">
          <span className="font-bold font-headline-sm text-[16px] text-on-surface">Historical Invoices Ledger</span>
          
          <div className="flex items-center bg-white rounded-lg px-3 py-1 border border-outline-variant">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-xs font-label-md w-52 placeholder:text-on-surface-variant/50 outline-none ml-2"
              placeholder="Search Invoice No..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto order-scroll">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <span className="material-symbols-outlined text-primary text-[48px] animate-spin">sync</span>
              <p className="font-label-lg">Loading invoices ledger logs...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-error font-semibold">
              {error}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-60">
              <span className="material-symbols-outlined text-[48px]">receipt</span>
              <p className="font-label-lg mt-2">No matching transactions logged</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-container-low border-b border-outline-variant z-10 text-xs text-on-surface-variant font-bold">
                <tr>
                  <th className="p-4">Invoice ID / Number</th>
                  <th className="p-4">Billing Date</th>
                  <th className="p-4 text-center">Checkout Method</th>
                  <th className="p-4 text-right">Subtotal</th>
                  <th className="p-4 text-right">Tax Paid</th>
                  <th className="p-4 text-right">Invoice Total</th>
                  <th className="p-4 text-right">Receipt Commands</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm">
                {filteredInvoices.map((inv) => {
                  const dateStr = new Date(inv.created_at).toLocaleString([], {
                    month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr 
                      key={inv.id} 
                      className="hover:bg-surface-container/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <td className="p-4 font-bold text-on-surface text-sm">
                        {inv.invoice_number}
                        {inv.order && (
                          <span className="text-[10px] bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded ml-2 font-data-mono">
                            Order #{inv.order.order_number}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-on-surface-variant text-xs">{dateStr}</td>
                      <td className="p-4 text-center">
                        <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded uppercase font-data-mono">
                          {inv.payment_method}
                        </span>
                      </td>
                      <td className="p-4 text-right font-data-mono text-xs">
                        {currency} {parseFloat(inv.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-data-mono text-xs text-on-surface-variant">
                        {currency} {parseFloat(inv.tax).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-data-mono font-bold text-primary">
                        {currency} {parseFloat(inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-xs text-primary font-bold hover:underline">View Receipt</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invoice View Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
                Receipt {selectedInvoice.invoice_number}
              </h3>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 bg-white flex-1 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Total Paid</p>
                <h2 className="text-3xl font-black text-primary">{currency} {parseFloat(selectedInvoice.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                <span className="inline-block mt-2 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  {selectedInvoice.payment_method}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Date</span>
                  <span className="font-bold">{new Date(selectedInvoice.created_at).toLocaleString()}</span>
                </div>
                {selectedInvoice.order && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Order ID</span>
                    <span className="font-bold">#{selectedInvoice.order.order_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Subtotal</span>
                  <span className="font-mono">{currency} {parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Tax</span>
                  <span className="font-mono">{currency} {parseFloat(selectedInvoice.tax).toFixed(2)}</span>
                </div>
                {parseFloat(selectedInvoice.discount || 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="font-semibold">Discount</span>
                    <span className="font-mono">- {currency} {parseFloat(selectedInvoice.discount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number)}
                className="flex items-center justify-center gap-2 border-2 border-primary text-primary hover:bg-primary/5 py-2.5 rounded-xl font-bold transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                Save PDF
              </button>
              <button
                onClick={() => {
                  handleReprint(selectedInvoice.id);
                  setSelectedInvoice(null);
                }}
                disabled={printLoadingId === selectedInvoice.id}
                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">print</span>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
