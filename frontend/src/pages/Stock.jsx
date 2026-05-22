import React, { useState, useEffect } from 'react';
import { stockAPI, menuAPI } from '../services/api';

const Stock = () => {
  const [stockItems, setStockItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null); // null for create, object for edit
  const [stockName, setStockName] = useState('');
  const [stockUnit, setStockUnit] = useState('servings');
  const [stockQty, setStockQty] = useState('0');
  const [stockThreshold, setStockThreshold] = useState('5');
  const [stockMenuItemId, setStockMenuItemId] = useState('');
  const [submittingItem, setSubmittingItem] = useState(false);

  // Manual Adjustment Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [adjustChange, setAdjustChange] = useState('');
  const [adjustType, setAdjustType] = useState('add'); // add or subtract
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // History Panel state
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const stocks = await stockAPI.list();
      setStockItems(stocks);
      
      const menus = await menuAPI.listItems();
      setMenuItems(menus);
    } catch (err) {
      setError('Could not retrieve stock logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Create/Edit Stock Item Modal
  const handleOpenItemModal = (item = null) => {
    if (item) {
      setCurrentItem(item);
      setStockName(item.name);
      setStockUnit(item.unit);
      setStockQty(item.quantity.toString());
      setStockThreshold(item.low_stock_threshold.toString());
      setStockMenuItemId(item.menu_item_id?.toString() || '');
    } else {
      setCurrentItem(null);
      setStockName('');
      setStockUnit('servings');
      setStockQty('0');
      setStockThreshold('5');
      setStockMenuItemId('');
    }
    setShowItemModal(true);
  };

  // Create/Edit Item Submit
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!stockName || !stockUnit) return;

    const payload = {
      name: stockName,
      unit: stockUnit,
      quantity: parseFloat(stockQty || '0'),
      low_stock_threshold: parseFloat(stockThreshold || '0'),
      menu_item_id: stockMenuItemId ? parseInt(stockMenuItemId) : null
    };

    try {
      setSubmittingItem(true);
      if (currentItem) {
        await stockAPI.update(currentItem.id, payload);
      } else {
        await stockAPI.create(payload);
      }
      setShowItemModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save stock item');
    } finally {
      setSubmittingItem(false);
    }
  };

  // Open Manual Adjustment Modal
  const handleOpenAdjust = (item = null) => {
    setSelectedStockId(item ? item.id.toString() : (stockItems[0]?.id?.toString() || ''));
    setAdjustChange('');
    setAdjustType('add');
    setAdjustReason('');
    setShowAdjustModal(true);
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStockId || !adjustChange) return;

    const changeVal = parseFloat(adjustChange);
    const finalChange = adjustType === 'add' ? changeVal : -changeVal;

    try {
      setSubmittingAdjust(true);
      await stockAPI.adjust({
        stock_item_id: parseInt(selectedStockId),
        quantity_change: finalChange,
        reason: adjustReason || null
      });
      setShowAdjustModal(false);
      loadData();
      
      // Refresh active history log if open
      if (selectedHistoryItem && selectedHistoryItem.id === parseInt(selectedStockId)) {
        handleViewHistory(selectedHistoryItem);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit stock adjustment');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // View Adjustment Logs for specific item
  const handleViewHistory = async (item) => {
    setSelectedHistoryItem(item);
    try {
      setHistoryLoading(true);
      const data = await stockAPI.listAdjustments(item.id);
      // Sort adjustments desc by time
      setAdjustments(data.sort((a, b) => new Date(b.adjusted_at) - new Date(a.adjusted_at)));
    } catch (err) {
      console.error(err);
      setAdjustments([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Helper: Find menu item name from ID
  const getMenuItemName = (menuId) => {
    if (!menuId) return 'Not Linked';
    const found = menuItems.find(m => m.id === menuId);
    return found ? found.name : 'Linked Dish Removed';
  };

  return (
    <div className="h-full flex overflow-hidden bg-surface-bright select-none p-margin-desktop space-y-0 gap-6">
      
      {/* Stock Main Table */}
      <main className="flex-1 flex flex-col overflow-hidden space-y-stack-md h-full">
        
        {/* Header section */}
        <div className="flex justify-between items-center bg-white border border-outline-variant p-4 rounded-lg shadow-sm">
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary">Inventory Stock Control</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Manage ingredients, monitor portion serving thresholds, and log stock changes.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenAdjust()}
              className="border border-outline text-on-surface font-label-lg px-4 py-2 rounded-lg hover:bg-surface-container transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">exposure</span>
              Quick Adjust
            </button>
            <button
              onClick={() => handleOpenItemModal()}
              className="bg-primary text-on-primary font-label-lg px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              New Stock Item
            </button>
          </div>
        </div>

        {/* List Card */}
        <div className="flex-1 bg-white border border-outline-variant rounded-xl flex flex-col shadow-sm overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low font-bold font-headline-sm text-[16px] text-on-surface flex justify-between items-center">
            <span>Ingredients & Portions Inventory</span>
            <span className="bg-error-container text-error text-[10px] font-bold px-3 py-1 rounded-full font-data-mono uppercase">
              {stockItems.filter(s => s.quantity <= s.low_stock_threshold).length} Low Stock Alert(s)
            </span>
          </div>

          <div className="flex-1 overflow-auto order-scroll">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <span className="material-symbols-outlined text-primary text-[48px] animate-spin">sync</span>
                <p className="font-label-lg">Loading inventory audit levels...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-error font-semibold">
                {error}
              </div>
            ) : stockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-60">
                <span className="material-symbols-outlined text-[48px]">inventory</span>
                <p className="font-label-lg mt-2">No stock items configured</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-low border-b border-outline-variant z-10 text-xs text-on-surface-variant font-bold">
                  <tr>
                    <th className="p-4">Stock Name</th>
                    <th className="p-4">Associated POS Dish</th>
                    <th className="p-4 text-right">In-Stock Quantity</th>
                    <th className="p-4 text-right">Warning Limit</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Audit Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-sm">
                  {stockItems.map((item) => {
                    const isLow = item.quantity <= item.low_stock_threshold;
                    const isSelected = selectedHistoryItem && selectedHistoryItem.id === item.id;

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-surface-container/20 transition-colors ${
                          isSelected ? 'bg-primary-fixed/20' : ''
                        }`}
                      >
                        <td className="p-4">
                          <p className="font-bold text-on-surface text-sm">{item.name}</p>
                          <span className="text-[10px] text-on-surface-variant capitalize">Unit: {item.unit}</span>
                        </td>
                        <td className="p-4 text-on-surface-variant font-medium text-xs">
                          {getMenuItemName(item.menu_item_id)}
                        </td>
                        <td className="p-4 text-right font-data-mono font-bold text-sm">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-4 text-right font-data-mono text-on-surface-variant text-xs">
                          {item.low_stock_threshold} {item.unit}
                        </td>
                        <td className="p-4 text-center">
                          {isLow ? (
                            <span className="bg-error-container text-error text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] font-bold">warning</span>
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              HEALTHY
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleViewHistory(item)}
                              className="px-2.5 py-1 text-xs border border-outline rounded-lg font-semibold hover:bg-surface-container text-on-surface flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">history</span>
                              History
                            </button>
                            <button
                              onClick={() => handleOpenItemModal(item)}
                              className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors"
                              title="Edit Item"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Adjustments History Right Side Panel */}
      <aside className="w-80 bg-white border border-outline-variant rounded-xl p-4 flex flex-col gap-4 shadow-sm overflow-hidden h-full">
        {selectedHistoryItem ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <div>
                <h4 className="font-headline-sm text-headline-sm font-bold text-primary">{selectedHistoryItem.name}</h4>
                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wide">Adjustment Ledger</p>
              </div>
              <button 
                onClick={() => setSelectedHistoryItem(null)}
                className="p-1 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <button
              onClick={() => handleOpenAdjust(selectedHistoryItem)}
              className="w-full bg-surface-container-high hover:bg-surface-variant text-on-surface py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 transition-all mt-3 mb-1"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Manual Stock Entry
            </button>

            <div className="flex-1 overflow-y-auto order-scroll mt-2 space-y-2 pr-1">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-1 opacity-70">
                  <span className="material-symbols-outlined text-primary text-[24px] animate-spin">sync</span>
                  <p className="text-xs">Fetching logs...</p>
                </div>
              ) : adjustments.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant opacity-60 italic text-center py-10">No stock adjustment entries logged</p>
              ) : (
                adjustments.map((adj) => {
                  const isAdd = adj.quantity_change > 0;
                  const dateStr = new Date(adj.adjusted_at).toLocaleString([], {
                    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <div 
                      key={adj.id} 
                      className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/35 text-xs flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                          isAdd ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isAdd ? '+' : ''}{adj.quantity_change} {selectedHistoryItem.unit}
                        </span>
                        <span className="font-data-mono text-[9px] text-on-surface-variant">{dateStr}</span>
                      </div>
                      <p className="text-on-surface-variant font-medium mt-1 leading-snug">
                        Reason: {adj.reason || <span className="italic opacity-50">Standard audit adjustment</span>}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-on-surface-variant py-10">
            <span className="material-symbols-outlined text-[48px] text-outline opacity-40">inventory_2</span>
            <p className="font-label-lg mt-2">Audit Ledger</p>
            <p className="text-xs opacity-60 px-4">Click "History" on any inventory item in the table to display its adjustment track logs and manual ledger logs here.</p>
          </div>
        )}
      </aside>

      {/* Stock Item Creation Form Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleItemSubmit} className="bg-white border border-outline-variant rounded-xl max-w-sm w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined">{currentItem ? 'edit' : 'add_circle'}</span>
                {currentItem ? 'Edit Stock Item' : 'New Stock Item'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowItemModal(false)}
                className="p-1 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-label-md font-label-md text-on-surface-variant">Stock Name:</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. Potatoes, Beef Chuck"
                  value={stockName}
                  onChange={(e) => setStockName(e.target.value)}
                  disabled={submittingItem}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-label-md font-label-md text-on-surface-variant">Measurement Unit:</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 focus:ring-1 focus:ring-primary outline-none"
                    placeholder="e.g. kg, liters, portions"
                    value={stockUnit}
                    onChange={(e) => setStockUnit(e.target.value)}
                    disabled={submittingItem}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-label-md font-label-md text-on-surface-variant">Initial Quantity:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 focus:ring-1 focus:ring-primary outline-none text-right font-data-mono font-semibold"
                    placeholder="0"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    disabled={submittingItem || currentItem} // Quantity is updated via adjustments if editing
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-label-md font-label-md text-on-surface-variant">Low Stock Warning:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 focus:ring-1 focus:ring-primary outline-none text-right font-data-mono font-semibold"
                    placeholder="5"
                    value={stockThreshold}
                    onChange={(e) => setStockThreshold(e.target.value)}
                    disabled={submittingItem}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-label-md font-label-md text-on-surface-variant">Link Menu Dish:</label>
                  <select
                    className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 focus:ring-1 focus:ring-primary outline-none"
                    value={stockMenuItemId}
                    onChange={(e) => setStockMenuItemId(e.target.value)}
                    disabled={submittingItem}
                  >
                    <option value="">-- None / Raw --</option>
                    {menuItems.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingItem}
              className="w-full bg-primary text-on-primary h-12 rounded-lg font-headline-sm font-semibold hover:opacity-90 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
            >
              {submittingItem ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                'Save Stock Item'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Manual Adjustment Form Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAdjustSubmit} className="bg-white border border-outline-variant rounded-xl max-w-sm w-full p-6 shadow-xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-outline-variant pb-2">
              <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined">exposure</span>
                Manual Stock Entry
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAdjustModal(false)}
                className="p-1 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-label-md font-label-md text-on-surface-variant">Select Stock Item:</label>
                <select
                  required
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 focus:ring-1 focus:ring-primary outline-none"
                  value={selectedStockId}
                  onChange={(e) => setSelectedStockId(e.target.value)}
                  disabled={submittingAdjust}
                >
                  {stockItems.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Current: {s.quantity} {s.unit})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-label-md font-label-md text-on-surface-variant">Adjustment Action:</label>
                  <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setAdjustType('add')}
                      className={`flex-1 py-1 text-xs font-semibold rounded transition-all ${
                        adjustType === 'add' ? 'bg-white shadow-sm text-green-700 font-bold' : 'text-on-surface-variant'
                      }`}
                    >
                      ADD (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('subtract')}
                      className={`flex-1 py-1 text-xs font-semibold rounded transition-all ${
                        adjustType === 'subtract' ? 'bg-white shadow-sm text-red-700 font-bold' : 'text-on-surface-variant'
                      }`}
                    >
                      DEDUCT (-)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-label-md font-label-md text-on-surface-variant">Adjust Quantity:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 focus:ring-1 focus:ring-primary outline-none text-right font-data-mono font-semibold"
                    placeholder="0"
                    value={adjustChange}
                    onChange={(e) => setAdjustChange(e.target.value)}
                    disabled={submittingAdjust}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-label-md font-label-md text-on-surface-variant">Reason / Notes:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supplier delivery, Spillage, Expired stock"
                  className="w-full bg-white border border-outline-variant rounded-lg py-2 px-3 focus:ring-1 focus:ring-primary outline-none"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  disabled={submittingAdjust}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingAdjust || !adjustChange || !adjustReason}
              className="w-full bg-primary text-on-primary h-12 rounded-lg font-headline-sm font-semibold hover:opacity-90 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
            >
              {submittingAdjust ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                'Save Adjustments'
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default Stock;
