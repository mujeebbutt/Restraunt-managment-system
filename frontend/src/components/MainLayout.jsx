import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { settingsAPI, menuAPI, ordersAPI, stockAPI } from '../services/api';

const MainLayout = () => {
  const [timeStr, setTimeStr] = useState('');
  const [branding, setBranding] = useState({ shop_name: 'RMS POS' });
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // Retrieve current logged in employee details
  const staffJson = localStorage.getItem('rms_staff');
  const staff = staffJson ? JSON.parse(staffJson) : { name: 'Staff Operator', role: 'Staff' };

  // Setup real-time system clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const fetchBranding = async () => {
      try {
        const data = await settingsAPI.getPublic();
        setBranding(data);
        
        // Dynamically set CSS variables if theme color is provided
        if (data.theme_color) {
          document.documentElement.style.setProperty('--color-primary', data.theme_color);
        }
      } catch (err) {
        console.warn('Failed to load branding:', err);
      }
    };
    fetchBranding();

    return () => clearInterval(interval);
  }, []);

  // Fetch all menu items on mount for search
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const items = await menuAPI.listItems();
        setAllMenuItems(items);
      } catch (err) {
        console.warn('Failed to load menu items for search:', err);
      }
    };
    fetchMenuItems();
  }, []);

  // Fetch notifications on mount and periodically
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notifs = [];

        // Fetch recent orders
        try {
          const orders = await ordersAPI.list();
          const recentOrders = (orders || []).slice(0, 3);
          recentOrders.forEach((order) => {
            notifs.push({
              id: `order-${order.id}`,
              type: 'order',
              icon: 'receipt_long',
              title: `Order #${order.id}`,
              message: `Status: ${order.status || 'pending'} — ${order.order_type || 'dine-in'}`,
              time: order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
              read: false,
            });
          });
        } catch (e) {
          // orders endpoint may fail silently
        }

        // Fetch low stock alerts
        try {
          const lowStockItems = await stockAPI.list(true);
          (lowStockItems || []).slice(0, 3).forEach((item) => {
            notifs.push({
              id: `stock-${item.id}`,
              type: 'stock',
              icon: 'inventory_2',
              title: `Low Stock: ${item.name}`,
              message: `Only ${item.quantity} ${item.unit || 'units'} remaining`,
              time: 'Alert',
              read: false,
            });
          });
        } catch (e) {
          // stock endpoint may fail silently
        }

        // Add a system notification
        notifs.push({
          id: 'system-1',
          type: 'system',
          icon: 'info',
          title: 'System Online',
          message: 'POS system is running normally',
          time: 'Now',
          read: true,
        });

        setNotifications(notifs);
      } catch (err) {
        console.warn('Failed to load notifications:', err);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle search input
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const filtered = allMenuItems.filter((item) =>
      item.name?.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
    setShowSearchResults(true);
  }, [allMenuItems]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('rms_token');
    localStorage.removeItem('rms_staff');
    navigate('/login', { replace: true });
  };

  const handleSearchResultClick = (item) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/orders?itemId=${item.id}`);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: 'dashboard' },
    { to: '/orders', label: 'Orders', icon: 'receipt_long' },
    { to: '/menu', label: 'Menu Manager', icon: 'restaurant_menu' },
    { to: '/stock', label: 'Stock Inventory', icon: 'inventory_2' },
    { to: '/reports', label: 'Reports & Audit', icon: 'assessment' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-on-surface">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-40 bg-white border-b border-outline-variant h-14 flex items-center justify-between px-margin-desktop">
        <div className="flex items-center gap-4">
          <span className="font-headline-md text-headline-md font-bold text-primary truncate max-w-[200px]">{branding.shop_name}</span>
          {/* Search Bar */}
          <div className="hidden md:flex relative" ref={searchRef}>
            <div className="flex bg-surface-container rounded-full px-4 py-1.5 items-center gap-2 border border-outline-variant">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <input
                className="bg-transparent border-none focus:ring-0 text-label-md font-label-md w-64 placeholder:text-on-surface-variant/50 outline-none"
                placeholder="Search menu items..."
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => { if (searchQuery.trim()) setShowSearchResults(true); }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}
                  className="text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-outline-variant overflow-hidden z-50">
                {searchResults.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSearchResultClick(item)}
                        className="w-full text-left px-4 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/50 last:border-b-0 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-label-lg text-label-lg text-on-surface truncate">{item.name}</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {item.category_name || item.category?.name || 'Uncategorized'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-label-md text-label-md text-primary font-semibold">
                            PKR {Number(item.price || 0).toLocaleString()}
                          </span>
                          <span className={`inline-block w-2 h-2 rounded-full ${item.is_available !== false ? 'bg-green-500' : 'bg-red-400'}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-[32px] mb-2">search_off</span>
                    <p className="font-body-md text-body-md text-on-surface-variant">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action controls & clock */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary-fixed text-on-primary-fixed-variant px-3 py-1 rounded-lg font-data-mono text-label-md flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              <span>{timeStr}</span>
            </div>
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                className="p-2 hover:bg-surface-container-high transition-colors rounded-full relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <span className="material-symbols-outlined text-primary">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-outline-variant overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
                    <h3 className="font-label-lg text-label-lg text-on-surface font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-primary font-label-sm text-label-sm hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 border-b border-outline-variant/50 last:border-b-0 flex items-start gap-3 transition-colors ${
                            !notif.read ? 'bg-primary/5' : 'hover:bg-surface-container-low'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[20px] mt-0.5 ${
                            notif.type === 'order' ? 'text-primary' :
                            notif.type === 'stock' ? 'text-amber-600' :
                            'text-on-surface-variant'
                          }`}>
                            {notif.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-label-md text-label-md text-on-surface truncate">{notif.title}</p>
                              <span className="font-body-sm text-body-sm text-on-surface-variant shrink-0">{notif.time}</span>
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{notif.message}</p>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-[32px] mb-2">notifications_off</span>
                        <p className="font-body-md text-body-md text-on-surface-variant">No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-label-lg text-label-lg text-on-surface">{staff.name}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant capitalize">{staff.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 text-error hover:text-red-700 transition-colors rounded-full"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[24px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex pt-14 overflow-hidden min-h-0">
        {/* SideNavBar */}
        <aside className="w-64 bg-surface-container border-r border-outline-variant flex flex-col py-4 gap-stack-sm h-full select-none">
          <div className="px-6 mb-4">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Main Dashboard</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Station 01</p>
          </div>

          <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-transform active:scale-95 duration-150 ${
                    isActive
                      ? 'bg-primary text-on-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-variant'
                  }`
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-lg text-label-lg">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Shift progress indicator inside footer */}
          <div className="px-4 pb-4 mt-auto">
            <div className="bg-surface-container-highest rounded-xl p-4 border border-outline-variant">
              <p className="text-label-md font-label-md text-on-surface-variant">SHIFT PROGRESS</p>
              <div className="w-full bg-surface-variant h-2 rounded-full mt-2">
                <div className="bg-primary h-2 rounded-full w-3/4"></div>
              </div>
              <p className="text-[11px] mt-2 text-on-surface">Active Duty • 6h 15m / 8h</p>
            </div>
          </div>
        </aside>

        {/* View Outlet Page Content */}
        <div className="flex-1 h-full overflow-hidden min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
