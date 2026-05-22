import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tablesAPI, ordersAPI, staffAPI } from '../services/api';

const Dashboard = () => {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSection, setFilterSection] = useState('All');
  
  // Current active shift information
  const [activeShift, setActiveShift] = useState({ name: 'Loading...', hours: '' });
  const navigate = useNavigate();

  const determineShift = () => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 16) {
      setActiveShift({ name: 'Morning Shift', hours: '08:00 AM - 04:00 PM' });
    } else if (hour >= 16 && hour < 24) {
      setActiveShift({ name: 'Evening Shift', hours: '04:00 PM - 12:00 AM' });
    } else {
      setActiveShift({ name: 'Night Shift', hours: '12:00 AM - 08:00 AM' });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const tablesData = await tablesAPI.list();
      setTables(tablesData);
      
      const ordersData = await ordersAPI.list();
      setOrders(ordersData);
      
      determineShift();
      
      if (selectedTable) {
        const updated = tablesData.find(t => t.id === selectedTable.id);
        setSelectedTable(updated || null);
      }
    } catch (err) {
      setError('Could not load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 10 seconds for real-time dashboard feel
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTable = (table) => {
    setSelectedTable(table);
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedTable) return;
    try {
      const updated = await tablesAPI.update(selectedTable.id, { status });
      setSelectedTable(updated);
      const updatedTables = tables.map(t => t.id === updated.id ? updated : t);
      setTables(updatedTables);
    } catch (err) {
      alert('Failed to update table status');
    }
  };

  const handleOpenOrder = () => {
    if (!selectedTable) return;
    navigate(`/orders?tableId=${selectedTable.id}&tableName=${encodeURIComponent(selectedTable.name)}`);
  };

  const handleQuickPay = async (e, order) => {
    e.stopPropagation(); // Prevent triggering the row click
    try {
      if (!window.confirm(`Mark order #${order.order_number} as PAID in Cash?`)) return;
      await ordersAPI.pay(order.id, {
        payment_method: 'cash',
        amount_paid: order.total,
        discount: order.discount || 0
      });
      loadData();
    } catch (err) {
      alert('Failed to mark payment as received');
    }
  };

  // Filter sections
  const sections = ['All', ...new Set(tables.map(t => t.section).filter(Boolean))];
  const filteredTables = filterSection === 'All' 
    ? tables 
    : tables.filter(t => t.section === filterSection);

  // Stats calculations
  const occupiedTablesCount = tables.filter(t => t.status === 'occupied').length;
  const reservedTablesCount = tables.filter(t => t.status === 'reserved').length;
  const cleaningTablesCount = tables.filter(t => t.status === 'pending').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const ordersToday = orders.filter(o => o.created_at?.startsWith(todayStr));
  const paidOrdersToday = ordersToday.filter(o => o.status === 'paid');
  const pendingOrdersToday = ordersToday.filter(o => o.status === 'open');

  const revenueToday = paidOrdersToday.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
  const pendingBillsAmount = pendingOrdersToday.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

  // Status mapping
  const statusColors = {
    free: 'border-green-500 text-green-700 bg-green-50/30',
    occupied: 'border-yellow-500 text-yellow-700 bg-yellow-50/30',
    pending: 'border-red-500 text-red-700 bg-red-50/30', // Pending Bill
    reserved: 'border-indigo-500 text-indigo-700 bg-indigo-50/30'
  };

  const statusBadges = {
    free: 'bg-green-500 text-white',
    occupied: 'bg-yellow-500 text-slate-900 font-bold',
    pending: 'bg-red-600 text-white font-bold',
    reserved: 'bg-indigo-600 text-white font-bold'
  };

  // Current Staff logged in
  const currentStaff = JSON.parse(localStorage.getItem('rms_staff') || '{}');

  return (
    <div className="h-full flex overflow-hidden bg-slate-50 font-sans">
      {/* Seating Map view */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 select-none">
        
        {/* Active Shift Tracking Bar */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-6 py-3.5 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-[28px] animate-pulse">schedule</span>
            <div>
              <h4 className="text-sm font-extrabold tracking-wide uppercase text-indigo-200">Active Shift Operation</h4>
              <p className="text-xs text-white/70 font-semibold">{activeShift.name} ({activeShift.hours})</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-xl border border-white/10">
            <span className="material-symbols-outlined text-green-400 text-[18px]">account_circle</span>
            <div className="text-right">
              <p className="text-xs font-bold">{currentStaff.name || 'Staff'}</p>
              <p className="text-[10px] text-white/60 uppercase font-extrabold tracking-wider">{currentStaff.role || 'Operator'}</p>
            </div>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-yellow-100 text-yellow-800 p-3.5 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">table_restaurant</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Occupied Seating</p>
              <h3 className="text-xl font-black text-slate-800">{occupiedTablesCount} / {tables.length}</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-blue-100 text-blue-800 p-3.5 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orders Today</p>
              <h3 className="text-xl font-black text-slate-800">{ordersToday.length}</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-green-100 text-green-800 p-3.5 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">payments</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue Today</p>
              <h3 className="text-xl font-black text-slate-800">PKR {revenueToday.toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-red-100 text-red-800 p-3.5 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">pending_actions</span>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Bills</p>
              <h3 className="text-xl font-black text-slate-800">{pendingOrdersToday.length} (PKR {pendingBillsAmount.toLocaleString()})</h3>
            </div>
          </div>

        </div>

        {/* Legend bar and Filter controls */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs font-bold text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-xs font-bold text-slate-600">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs font-bold text-slate-600">Pending Bill</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-xs font-bold text-slate-600">Reserved</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Floor Section:</span>
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
              {sections.map(section => (
                <button
                  key={section}
                  onClick={() => setFilterSection(section)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    filterSection === section 
                      ? 'bg-white shadow-sm text-primary' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Seating Layout Grid */}
        <div className="bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200 p-8 min-h-[480px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-80 gap-2">
              <span className="material-symbols-outlined text-primary text-[48px] animate-spin">sync</span>
              <p className="font-bold text-slate-600">Loading tables layout arrange...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-80 text-red-500 font-semibold">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {filteredTables.map((table) => {
                const shapeClass = table.shape === 'round' 
                  ? 'rounded-full w-32 h-32 self-center mx-auto' 
                  : table.shape === 'rectangle' 
                    ? 'rounded-xl h-32 w-full col-span-1' 
                    : 'rounded-xl h-32 w-full'; // Default square
                
                const isSelected = selectedTable && selectedTable.id === table.id;

                return (
                  <div
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    className={`bg-white border-2 flex flex-col items-center justify-center p-4 relative cursor-pointer active:scale-95 transition-all shadow-sm ${
                      shapeClass
                    } ${statusColors[table.status] || 'border-slate-200'} ${
                      isSelected ? 'ring-4 ring-primary/20 border-primary' : ''
                    }`}
                  >
                    <span className="text-base font-black text-slate-800">{table.name}</span>
                    <div className="flex gap-1 items-center mt-1">
                      <span className="material-symbols-outlined text-slate-400 text-[16px]">person</span>
                      <span className="text-xs font-semibold text-slate-500">{table.capacity} Guests</span>
                    </div>
                    
                    {table.status !== 'free' && (
                      <div className={`absolute -bottom-2.5 px-3 py-0.5 text-[9px] font-bold rounded-full border shadow-sm ${statusBadges[table.status]}`}>
                        {table.status === 'pending' ? 'PENDING BILL' : table.status.toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar actions */}
      <aside className="w-80 bg-white border-l border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto select-none shadow-md">
        
        {/* Table detail widget */}
        {selectedTable ? (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <h4 className="text-lg font-black text-slate-800">{selectedTable.name}</h4>
              <p className="text-xs text-slate-500 font-semibold">{selectedTable.section} • Capacity: {selectedTable.capacity} guests</p>
            </div>
            
            <div className="h-[1px] bg-slate-200"></div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Update Seating Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleUpdateStatus('free')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                    selectedTable.status === 'free'
                      ? 'bg-green-600 border-green-600 text-white shadow-sm font-extrabold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Available
                </button>
                <button
                  onClick={() => handleUpdateStatus('occupied')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                    selectedTable.status === 'occupied'
                      ? 'bg-yellow-500 border-yellow-500 text-slate-900 shadow-sm font-extrabold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Occupied
                </button>
                <button
                  onClick={() => handleUpdateStatus('pending')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all col-span-2 ${
                    selectedTable.status === 'pending'
                      ? 'bg-red-600 border-red-600 text-white shadow-sm font-extrabold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Pending Bill
                </button>
                <button
                  onClick={() => handleUpdateStatus('reserved')}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all col-span-2 ${
                    selectedTable.status === 'reserved'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-extrabold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Reserved
                </button>
              </div>
            </div>

            <button
              onClick={handleOpenOrder}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-indigo-700 text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-transform hover:shadow-lg hover:shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Open POS Order</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10 opacity-70">
            <span className="material-symbols-outlined text-[48px] text-slate-300">touch_app</span>
            <p className="font-bold mt-2 text-slate-700">Select Seating Table</p>
            <p className="text-xs text-slate-500 mt-1">Click any table on the map to modify occupancy status or open new order</p>
          </div>
        )}

        <div className="h-[1px] bg-slate-200"></div>

        {/* Recent orders widget */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Seating Orders</h4>
          <div className="space-y-2.5">
            {orders.filter(o => o.status === 'open').length === 0 ? (
              <p className="text-xs text-slate-400 italic">No active dining/takeaway sessions</p>
            ) : (
              orders.filter(o => o.status === 'open').slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders?orderId=${order.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-slate-200"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{order.table ? `Table ${order.table.name}` : `Takeaway ${order.customer_name || ''}`} • #{order.order_number}</p>
                    <p className="text-[10px] font-bold text-primary">PKR {parseFloat(order.total || 0).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={(e) => handleQuickPay(e, order)}
                    className="text-[9px] font-extrabold px-2 py-1 rounded bg-green-100 hover:bg-green-200 border border-green-300 text-green-800 transition-colors shadow-sm"
                  >
                    Payment Rcvd
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kitchen active banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between mt-auto overflow-hidden relative">
          <div className="z-10">
            <p className="text-slate-800 font-bold text-sm">Kitchen Monitor</p>
            <p className="text-slate-500 text-[11px] font-medium">Automatic POS sync is active</p>
          </div>
          <span className="material-symbols-outlined text-[36px] text-indigo-600/20 absolute -right-1 -bottom-1">restaurant</span>
        </div>

      </aside>
    </div>
  );
};

export default Dashboard;
