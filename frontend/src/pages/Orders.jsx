import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api, { menuAPI, tablesAPI, ordersAPI, settingsAPI, invoicesAPI, staffAPI } from '../services/api';

const Orders = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected table from dashboard redirect
  const preSelectedTableId = searchParams.get('tableId');

  // POS State
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState(''); // Empty initially to force Step 1 selection
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedWaiterId, setSelectedWaiterId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Settings & tax config
  const [taxPercent, setTaxPercent] = useState(16); // Default 16%
  const [currency, setCurrency] = useState('PKR');

  // Step flow state
  const [orderSetupComplete, setOrderSetupComplete] = useState(false);

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  
  // Variant Modal State
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [chosenVariant, setChosenVariant] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemNotes, setItemNotes] = useState('');

  // Discount / Manager PIN states
  const [discountAmount, setDiscountAmount] = useState(0);
  const [managerPin, setManagerPin] = useState('');
  const [showManagerPinPrompt, setShowManagerPinPrompt] = useState(false);

  // Payment Modal Calculator
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [completedInvoiceId, setCompletedInvoiceId] = useState(null);
  const [paymentReceivedState, setPaymentReceivedState] = useState(null);

  const handleDownloadPdf = async (invoiceId) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download invoice PDF. Make sure you are logged in.');
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const cats = await menuAPI.listCategories();
      setCategories(cats);
      
      const items = await menuAPI.listItems();
      setMenuItems(items);
      
      const tbls = await tablesAPI.list();
      setTables(tbls);
      
      const staff = await staffAPI.list();
      setStaffList(staff.filter(s => s.is_active));
      
      const settings = await settingsAPI.list();
      const taxSetting = settings.find(s => s.key === 'tax_percent');
      const curSetting = settings.find(s => s.key === 'currency');
      if (taxSetting) setTaxPercent(parseFloat(taxSetting.value));
      if (curSetting) setCurrency(curSetting.value);
    } catch (err) {
      setError('Could not sync POS records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    if (preSelectedTableId) {
      setOrderType('dine_in');
      setSelectedTableId(preSelectedTableId);
      // Wait for table to auto-setup
    }
  }, [preSelectedTableId]);

  // Handle Cash Calculator Change
  useEffect(() => {
    const totalVal = calculateTotal();
    const paidVal = parseFloat(amountPaid || 0);
    if (paidVal >= totalVal) {
      setChangeAmount(paidVal - totalVal);
    } else {
      setChangeAmount(0);
    }
  }, [amountPaid, cart, discountAmount]);

  // Add Item to Cart (Triggered from menu or variant modal)
  const handleAddToCart = (item, variantName, qty = 1, notes = '') => {
    const price = variantName ? item.variants[variantName] : parseFloat(item.price);
    const cartId = variantName ? `${item.id}-${variantName}` : `${item.id}`;
    const name = variantName ? `${item.name} (${variantName})` : item.name;

    // Check if out of stock
    const currentStock = item.stock ? item.stock.quantity : 999;
    const inCartQty = cart.find(c => c.id === cartId)?.qty || 0;
    
    if (currentStock <= inCartQty) {
      alert(`${item.name} has insufficient stock levels!`);
      return;
    }

    setCart(prev => {
      const exists = prev.find(c => c.id === cartId);
      if (exists) {
        return prev.map(c => c.id === cartId ? { ...c, qty: c.qty + qty } : c);
      }
      return [...prev, { 
        id: cartId, 
        menuItemId: item.id, 
        name, 
        price, 
        qty, 
        variant_name: variantName, 
        note: notes 
      }];
    });

    setShowVariantModal(false);
  };

  // Click on menu card
  const handleItemClick = (item) => {
    if (item.variants && Object.keys(item.variants).length > 0) {
      setSelectedMenuItem(item);
      setChosenVariant(Object.keys(item.variants)[0]);
      setItemQty(1);
      setItemNotes('');
      setShowVariantModal(true);
    } else {
      handleAddToCart(item, null, 1, '');
    }
  };

  // Adjust Cart Qty
  const handleUpdateQty = (cartId, change) => {
    setCart(prev => {
      const item = prev.find(c => c.id === cartId);
      if (!item) return prev;
      
      const newQty = item.qty + change;
      if (newQty <= 0) {
        return prev.filter(c => c.id !== cartId);
      }
      
      // Check stock limit for menu items
      const menuObj = menuItems.find(m => m.id === item.menuItemId);
      const stockAvailable = menuObj?.stock ? menuObj.stock.quantity : 999;
      if (change > 0 && stockAvailable <= item.qty) {
        alert('Insufficient stock levels remaining!');
        return prev;
      }
      
      return prev.map(c => c.id === cartId ? { ...c, qty: newQty } : c);
    });
  };

  // Add kitchen note
  const handleUpdateNote = (cartId, note) => {
    setCart(prev => prev.map(c => c.id === cartId ? { ...c, note } : c));
  };

  // Computations
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  };

  const calculateTax = () => {
    const sub = calculateSubtotal();
    const disc = parseFloat(discountAmount || 0);
    const taxable = Math.max(0, sub - disc);
    return taxable * (taxPercent / 100);
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const disc = parseFloat(discountAmount || 0);
    return Math.max(0, sub - disc) + calculateTax();
  };

  const isDiscountHigh = () => {
    const sub = calculateSubtotal();
    if (sub === 0) return false;
    const disc = parseFloat(discountAmount || 0);
    return disc > (sub * 0.10);
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setManagerPin('');
    setActiveOrderId(null);
  };

  const handleResetSetup = () => {
    handleClearCart();
    setOrderType('');
    setSelectedTableId('');
    setSelectedWaiterId('');
    setCustomerName('');
    setOrderSetupComplete(false);
  };

  const handleStartOrder = () => {
    setOrderSetupComplete(true);
    const itemId = searchParams.get('itemId');
    if (itemId) {
      const item = menuItems.find(i => i.id === parseInt(itemId));
      if (item) {
        handleItemClick(item);
      }
      // Clear search params to clean up URL
      navigate('/orders', { replace: true });
    }
  };

  // Place Order (Submit Pending/Draft Order to Backend)
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert('Your billing cart is empty.');
      return;
    }
    if (orderType === 'dine_in' && !selectedTableId) {
      alert('Please link a Dining Table for Dine-In orders.');
      return;
    }

    if (isDiscountHigh() && !managerPin) {
      setShowManagerPinPrompt(true);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const payload = {
        order_type: orderType,
        table_id: orderType === 'dine_in' ? parseInt(selectedTableId) : null,
        staff_id: orderType === 'dine_in' ? parseInt(selectedWaiterId) : null,
        customer_name: orderType === 'take_away' && customerName ? customerName : null,
        discount: parseFloat(discountAmount || 0),
        manager_pin: managerPin || null,
        items: cart.map(c => ({
          menu_item_id: c.menuItemId,
          quantity: c.qty,
          variant_name: c.variant_name || null,
          notes: c.note || null
        }))
      };

      let res;
      if (activeOrderId) {
        res = await ordersAPI.update(activeOrderId, payload);
      } else {
        res = await ordersAPI.create(payload);
        setActiveOrderId(res.id);
      }
      
      alert(`Order draft saved! Order #${res.order_number}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit order');
      alert(err.response?.data?.detail || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Pay Dialog
  const handleOpenPay = async () => {
    if (cart.length === 0) {
      alert('Your billing cart is empty.');
      return;
    }
    if (orderType === 'dine_in' && !selectedTableId) {
      alert('Please link a Dining Table for Dine-In orders.');
      return;
    }

    if (isDiscountHigh() && !managerPin) {
      setShowManagerPinPrompt(true);
      return;
    }

    const totalVal = Math.ceil(calculateTotal());
    setAmountPaid(totalVal.toString());
    setPaymentSuccess(false);
    setPaymentReceivedState(null);
    setShowPayModal(true);
  };

  // Finalize Payment & Print
  const handleFinalizePayment = async () => {
    const totalVal = calculateTotal();
    const paidVal = parseFloat(amountPaid || 0);
    
    if (paymentMethod === 'cash' && paidVal < totalVal) {
      alert('Amount received is less than the transaction total.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Step 1: Create or update draft
      const payload = {
        order_type: orderType,
        table_id: orderType === 'dine_in' ? parseInt(selectedTableId) : null,
        staff_id: orderType === 'dine_in' ? parseInt(selectedWaiterId) : null,
        customer_name: orderType === 'take_away' && customerName ? customerName : null,
        discount: parseFloat(discountAmount || 0),
        manager_pin: managerPin || null,
        items: cart.map(c => ({
          menu_item_id: c.menuItemId,
          quantity: c.qty,
          variant_name: c.variant_name || null,
          notes: c.note || null
        }))
      };

      let currentOrderId = activeOrderId;
      if (!currentOrderId) {
        const orderRes = await ordersAPI.create(payload);
        currentOrderId = orderRes.id;
      } else {
        await ordersAPI.update(currentOrderId, payload);
      }

      // Step 2: Pay/Checkout
      const payPayload = {
        payment_method: paymentMethod,
        discount: parseFloat(discountAmount || 0),
        amount_paid: paidVal,
        manager_pin: managerPin || null
      };

      const invoiceRes = await ordersAPI.pay(currentOrderId, payPayload);
      
      setCompletedInvoiceId(invoiceRes.id);
      setPaymentSuccess(true);
      
      try {
        await invoicesAPI.reprint(invoiceRes.id);
      } catch (printErr) {
        console.warn('Receipt printing triggered warning: ', printErr);
      }

    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to complete transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintDraftBill = async () => {
    try {
      setSubmitting(true);
      
      const payload = {
        order_type: orderType,
        table_id: orderType === 'dine_in' ? parseInt(selectedTableId) : null,
        staff_id: orderType === 'dine_in' ? parseInt(selectedWaiterId) : null,
        customer_name: orderType === 'take_away' && customerName ? customerName : null,
        discount: parseFloat(discountAmount || 0),
        manager_pin: managerPin || null,
        items: cart.map(c => ({
          menu_item_id: c.menuItemId,
          quantity: c.qty,
          variant_name: c.variant_name || null,
          notes: c.note || null
        }))
      };

      let currentOrderId = activeOrderId;
      if (!currentOrderId) {
        const orderRes = await ordersAPI.create(payload);
        currentOrderId = orderRes.id;
      } else {
        await ordersAPI.update(currentOrderId, payload);
      }

      const res = await ordersAPI.printDraft(currentOrderId);
      setCompletedInvoiceId(res.invoice_id);
      setPaymentSuccess(true);
      
      try {
        await invoicesAPI.reprint(res.invoice_id);
      } catch (e) {}
    } catch (err) {
      alert('Failed to print draft bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishTransaction = () => {
    setShowPayModal(false);
    handleResetSetup();
    loadInitialData(); // Reload menu/stock states
  };

  // Filter Items
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex overflow-hidden bg-slate-50 select-none relative font-sans">
      
      {/* STEP 1 & 2: SETUP OVERLAY SCREEN */}
      {!orderSetupComplete && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col gap-6 transform hover:scale-[1.005] transition-all">
            
            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-primary text-[28px]">point_of_sale</span>
                Configure POS Order
              </h2>
              <p className="text-slate-500 text-sm mt-1">Specify order channel and parameters before starting the order</p>
            </div>

            {/* Selection of Order Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Step 1: Order Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setOrderType('dine_in'); setSelectedTableId(''); }}
                  className={`py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    orderType === 'dine_in'
                      ? 'border-primary bg-primary/5 text-primary font-bold shadow-md'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[32px]">table_restaurant</span>
                  <span className="text-sm">Dine In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setOrderType('take_away'); setSelectedTableId(''); }}
                  className={`py-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                    orderType === 'take_away'
                      ? 'border-primary bg-primary/5 text-primary font-bold shadow-md'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[32px]">local_mall</span>
                  <span className="text-sm">Take Away</span>
                </button>
              </div>
            </div>

            {/* Selection of Sub-Details */}
            {orderType === 'dine_in' && (
              <div className="space-y-4 animate-fadeIn">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Step 2: Table & Waiter Setup</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-500">Select Table</span>
                    <select
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold"
                    >
                      <option value="">-- Table --</option>
                      {tables.map(t => (
                        <option key={t.id} value={t.id} disabled={t.status !== 'free'}>
                          {t.name} ({t.section} - Cap: {t.capacity}) {t.status !== 'free' ? '[Occupied]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-500">Select Waiter</span>
                    <select
                      value={selectedWaiterId}
                      onChange={(e) => setSelectedWaiterId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold"
                    >
                      <option value="">-- Waiter --</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {orderType === 'take_away' && (
              <div className="space-y-2 animate-fadeIn">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Step 2: Customer Identity</label>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">Customer Name (Optional)</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter name..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleStartOrder}
              disabled={loading || !orderType || (orderType === 'dine_in' && (!selectedTableId || !selectedWaiterId))}
              className="w-full bg-primary hover:bg-primary/95 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[20px]">play_circle</span>
              <span>START ORDER</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Order View */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Controls Bar */}
        <div className="p-4 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 rounded-xl p-1.5 flex items-center gap-2 border border-slate-200">
              <span className="material-symbols-outlined text-[20px] text-primary">
                {orderType === 'dine_in' ? 'table_restaurant' : 'local_mall'}
              </span>
              <span className="text-sm font-bold text-slate-800 capitalize">
                {orderType === 'dine_in' ? `Dine In: Table ${tables.find(t => t.id === parseInt(selectedTableId))?.name || selectedTableId}` : `Take Away ${customerName ? `(${customerName})` : ''}`}
              </span>
              <button
                onClick={handleResetSetup}
                className="ml-2 p-1 text-slate-400 hover:text-red-600 transition-colors rounded-full"
                title="Change setup"
              >
                <span className="material-symbols-outlined text-[16px]">sync_alt</span>
              </button>
            </div>
            
            {orderType === 'dine_in' && (
              <div className="text-xs font-semibold text-slate-500">
                Staff: <span className="text-slate-800 font-bold">{staffList.find(s => s.id === parseInt(selectedWaiterId))?.name || selectedWaiterId}</span>
              </div>
            )}
          </div>

          <div className="flex items-center bg-slate-100 rounded-full px-4 py-1.5 border border-slate-200">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
            <input
              className="bg-transparent border-none focus:ring-0 text-sm font-semibold w-56 placeholder:text-slate-400 outline-none ml-2"
              placeholder="Search dishes..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category Carousel Scroll */}
        <div className="flex overflow-x-auto gap-2 px-4 py-3 border-b border-slate-200 bg-white no-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`flex-shrink-0 px-5 py-1.5 rounded-full text-sm font-bold transition-all ${
              selectedCategory === 'All' 
                ? 'bg-primary text-white shadow-sm' 
                : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`flex-shrink-0 px-5 py-1.5 rounded-full text-sm font-bold transition-all ${
                selectedCategory === cat.name 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Listing Grid */}
        <div className="flex-1 overflow-y-auto p-4 order-scroll">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <span className="material-symbols-outlined text-primary text-[48px] animate-spin">sync</span>
              <p className="font-bold text-slate-600">Loading POS menu catalogue...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10 opacity-60">
              <span className="material-symbols-outlined text-[48px]">no_food</span>
              <p className="font-bold mt-2">No matching food items available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fadeIn">
              {filteredItems.map((item) => {
                const stockQty = item.stock ? item.stock.quantity : 999;
                const isOutOfStock = stockQty <= 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && handleItemClick(item)}
                    className={`bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col group cursor-pointer hover:border-primary transition-colors active:scale-95 duration-150 relative shadow-sm hover:shadow-md ${
                      isOutOfStock ? 'opacity-55 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="relative h-28 w-full bg-slate-50 overflow-hidden">
                      {item.image_path ? (
                        <img 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          src={`http://localhost:8000${item.image_path}`} 
                          alt={item.name} 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <span className="material-symbols-outlined text-[40px]">restaurant</span>
                        </div>
                      )}
                      
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="text-slate-800 text-[14px] leading-snug font-bold mb-1 line-clamp-2">{item.name}</h3>
                      <div className="flex justify-between items-center mt-auto pt-2 border-t border-slate-50">
                        <span className="text-primary font-bold text-sm">
                          PKR {parseFloat(item.price).toLocaleString()}
                        </span>
                        {item.variants && Object.keys(item.variants).length > 0 && (
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase">Options</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Cart Summary Panel */}
      <aside className="w-96 h-full bg-slate-50 border-l border-slate-200 flex flex-col z-30 shadow-md">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Billing Cart</h2>
            <p className="text-xs text-slate-500 font-medium">Assemble customer invoice and settlement</p>
          </div>
          <button
            onClick={handleClearCart}
            className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-700 transition-colors rounded-full"
            title="Clear Cart"
          >
            <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
          </button>
        </div>

        {/* Selected List */}
        <div className="flex-1 overflow-y-auto order-scroll bg-white">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 opacity-60">
              <span className="material-symbols-outlined text-[48px] text-slate-300">shopping_cart</span>
              <p className="font-bold mt-2">Order Cart is Empty</p>
              <p className="text-xs mt-1">Select menu card items to assemble customer invoice.</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-3">Item</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 max-w-[160px]">
                      <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                      <input
                        type="text"
                        placeholder="Add kitchen note..."
                        value={item.note || ''}
                        onChange={(e) => handleUpdateNote(item.id, e.target.value)}
                        className="w-full text-[10px] mt-1 border-none focus:ring-0 p-0 text-slate-500 placeholder:text-slate-300 bg-transparent outline-none focus:border-b focus:border-primary"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-700 text-sm transition-all font-extrabold active:scale-95"
                        >
                          -
                        </button>
                        <span className="text-sm font-bold w-4 text-slate-800">{item.qty}</span>
                        <button
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:bg-primary-container hover:text-on-primary-container text-sm transition-all font-extrabold active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-right text-sm font-bold text-slate-800">
                      PKR {(item.price * item.qty).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Costing calculation panel */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-bold text-slate-700">PKR {calculateSubtotal().toLocaleString()}</span>
            </div>
            
            {/* Discount Section */}
            <div className="flex items-center justify-between text-slate-500">
              <span>Discount</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value || 0)))}
                  className="w-20 border border-slate-200 rounded px-2 py-0.5 text-right font-bold focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
                <span className="text-xs font-bold">PKR</span>
              </div>
            </div>

            {/* Discount Warning Badge */}
            {isDiscountHigh() && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-700 text-xs font-bold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span>Discount &gt;10% (Requires Manager Approval)</span>
                </span>
                {managerPin ? (
                  <span className="text-green-600 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>PIN Entered</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setShowManagerPinPrompt(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded font-extrabold"
                  >
                    Authorize
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-between text-slate-500">
              <span>Tax ({taxPercent}%)</span>
              <span className="font-bold text-slate-700">PKR {calculateTax().toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between pt-2 border-t border-dashed border-slate-200">
              <span className="font-bold text-slate-800 text-base">Grand Total</span>
              <span className="text-primary text-xl font-extrabold">
                PKR {calculateTotal().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              onClick={handleOpenPay}
              disabled={submitting || cart.length === 0 || (isDiscountHigh() && !managerPin)}
              className="w-full bg-primary text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/95 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined">payments</span>
              <span>Finalize Payment</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePlaceOrder}
                disabled={submitting || cart.length === 0}
                className="h-10 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] text-xs font-bold disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                Save Draft
              </button>
              <button
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="h-10 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] text-xs font-bold disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* SELECT VARIANT MODAL */}
      {showVariantModal && selectedMenuItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-800">
                Configure {selectedMenuItem.name}
              </h3>
              <button 
                onClick={() => setShowVariantModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Select size/crust variants */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Choose Variant Options</span>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedMenuItem.variants).map(([vName, vPrice]) => (
                    <button
                      key={vName}
                      type="button"
                      onClick={() => setChosenVariant(vName)}
                      className={`py-3 rounded-xl border flex flex-col items-center gap-0.5 transition-all ${
                        chosenVariant === vName
                          ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm">{vName}</span>
                      <span className="text-xs font-bold">PKR {vPrice.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between border-t border-b border-slate-100 py-3">
                <span className="text-sm font-semibold text-slate-700">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-700 text-lg font-bold"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold text-slate-800 w-6 text-center">{itemQty}</span>
                  <button
                    type="button"
                    onClick={() => setItemQty(itemQty + 1)}
                    className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-700 text-lg font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Special Instructions / Modifiers</span>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g. Extra spicy, no onions, etc."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              <button
                onClick={() => handleAddToCart(selectedMenuItem, chosenVariant, itemQty, itemNotes)}
                className="w-full bg-primary hover:bg-primary/95 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-2"
              >
                <span className="material-symbols-outlined">add_shopping_cart</span>
                <span>ADD TO CART • PKR {((selectedMenuItem.variants[chosenVariant] || 0) * itemQty).toLocaleString()}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGER PIN PROMPT MODAL */}
      {showManagerPinPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500">lock</span>
                Manager PIN Validation
              </h3>
              <button 
                onClick={() => setShowManagerPinPrompt(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              Applying a discount greater than 10% requires manager credential approval. Please type a valid manager passcode to authorization.
            </p>

            <input
              type="password"
              placeholder="Manager PIN / Password"
              value={managerPin}
              onChange={(e) => setManagerPin(e.target.value)}
              className="w-full border border-slate-200 rounded-xl h-12 px-4 text-center font-bold tracking-widest text-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              autoFocus
            />

            <button
              onClick={() => setShowManagerPinPrompt(false)}
              className="w-full bg-primary hover:bg-primary/95 text-white h-11 rounded-xl font-bold transition-all"
            >
              APPROVE DISCOUNT
            </button>
          </div>
        </div>
      )}

      {/* Payment Processing Checkout Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">point_of_sale</span>
                Transaction Settlement
              </h3>
              {!paymentSuccess && (
                <button 
                  onClick={() => setShowPayModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            {!paymentSuccess ? (
              <div className="flex flex-col gap-6">
                {paymentReceivedState === null ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center gap-6">
                    <span className="material-symbols-outlined text-[64px] text-primary">contactless</span>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800">Has payment been received?</h4>
                      <p className="text-slate-500 text-sm mt-1.5">Select YES to record payment. Select NO to print a pending bill.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                      <button
                        onClick={() => setPaymentReceivedState('yes')}
                        className="py-3 rounded-xl border-2 border-primary bg-primary text-white font-bold transition-all hover:bg-primary/90 shadow-md active:scale-95"
                      >
                        Yes, Payment Done
                      </button>
                      <button
                        onClick={() => setPaymentReceivedState('no')}
                        className="py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold transition-all hover:bg-slate-50 active:scale-95"
                      >
                        No, Print Pending Bill
                      </button>
                    </div>
                  </div>
                ) : paymentReceivedState === 'no' ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center gap-6">
                     <span className="material-symbols-outlined text-[64px] text-yellow-500">receipt_long</span>
                     <div>
                       <h4 className="text-xl font-bold text-slate-800">Print Pending Bill</h4>
                       <p className="text-slate-500 text-sm mt-1.5">The order will remain open and pending on the dashboard.</p>
                     </div>
                     <button
                        onClick={handlePrintDraftBill}
                        disabled={submitting}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4 hover:shadow-lg active:scale-[0.98]"
                      >
                        {submitting ? (
                          <span className="material-symbols-outlined animate-spin text-[22px]">sync</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[20px]">print</span>
                            <span>PRINT PENDING BILL</span>
                          </>
                        )}
                      </button>
                  </div>
                ) : (
                  <>
                    {/* Method Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Settlement Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['cash', 'card', 'online'].map(method => (
                          <button
                            key={method}
                            onClick={() => setPaymentMethod(method)}
                            className={`py-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                              paymentMethod === method
                                ? 'bg-primary border-primary text-white shadow-md font-bold scale-[1.02]'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {method === 'cash' ? 'payments' : method === 'card' ? 'credit_card' : 'qr_code_scanner'}
                            </span>
                            <span className="capitalize text-xs font-bold">{method}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount Ledger info */}
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                      <div className="flex justify-between font-bold text-sm text-slate-700">
                        <span>Billing Amount Due:</span>
                        <span className="text-primary text-base">PKR {calculateTotal().toLocaleString()}</span>
                      </div>
                      
                      {paymentMethod === 'cash' && (
                        <>
                          <div className="h-[1px] bg-slate-200 my-2"></div>
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cash Received (PKR)</label>
                            <input
                              type="number"
                              className="bg-white border border-slate-200 rounded-lg py-1 px-3 w-40 text-right font-bold text-base focus:ring-1 focus:ring-primary outline-none"
                              value={amountPaid}
                              onChange={(e) => setAmountPaid(e.target.value)}
                            />
                          </div>
                          <div className="flex justify-between font-bold text-sm mt-1.5 text-red-600">
                            <span>Change Tendered:</span>
                            <span className="text-base">PKR {changeAmount.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Quick cash denomination shortcuts */}
                    {paymentMethod === 'cash' && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PKR Denomination Tenders</span>
                        <div className="grid grid-cols-4 gap-2">
                          {[100, 500, 1000, 5000].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setAmountPaid(val.toString())}
                              className="py-2 bg-slate-50 hover:bg-slate-100 font-bold text-sm rounded-lg border border-slate-200 text-slate-700"
                            >
                              +{val}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleFinalizePayment}
                      disabled={submitting}
                      className="w-full bg-primary hover:bg-primary/95 text-white h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
                    >
                      {submitting ? (
                        <span className="material-symbols-outlined animate-spin text-[22px]">sync</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                          <span>RECORD PAYMENT & PRINT TICKET</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center gap-4">
                <span className="material-symbols-outlined text-[64px] text-green-500 animate-bounce">check_circle</span>
                <div>
                  <h4 className="text-xl font-bold text-green-600">Checkout Finalized!</h4>
                  <p className="text-slate-500 text-sm mt-1.5">Transaction payment logged and stock inventory audited.</p>
                </div>

                <div className="flex gap-2 w-full max-w-sm mt-4">
                  <button
                    onClick={() => handleDownloadPdf(completedInvoiceId)}
                    className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    PDF Receipt
                  </button>
                  <button
                    onClick={() => invoicesAPI.reprint(completedInvoiceId)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">print</span>
                    Reprint Invoice
                  </button>
                </div>

                <button
                  onClick={handleFinishTransaction}
                  className="w-full bg-primary hover:bg-primary/95 text-white h-12 rounded-xl font-bold hover:shadow-lg transition-all mt-6"
                >
                  OPEN NEW SALE
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Orders;
