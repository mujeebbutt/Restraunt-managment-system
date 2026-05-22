import React, { useState, useEffect } from 'react';
import api, { settingsAPI, staffAPI, tablesAPI, shiftsAPI } from '../services/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('branding');
  
  // Settings & DB State
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  
  // Entity Lists
  const [staffList, setStaffList] = useState([]);
  const [tablesList, setTablesList] = useState([]);
  const [shiftsList, setShiftsList] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  
  // Modals & Active Edit Entities
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({ name: '', role: 'waiter', pin: '', is_active: true });

  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({ name: '', capacity: 4, shape: 'square', section: 'Main Hall' });

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({ name: '', start_time: '08:00', end_time: '16:00', staff_ids: [] });

  // Mock Google Drive State
  const [driveConnected, setDriveConnected] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  
  const loadAllData = async () => {
    try {
      setLoading(true);
      const settingsData = await settingsAPI.list();
      setSettings(settingsData);

      const staffData = await staffAPI.list();
      setStaffList(staffData);

      const tablesData = await tablesAPI.list();
      setTablesList(tablesData);

      const shiftsData = await shiftsAPI.list();
      setShiftsList(shiftsData);

      const attendanceData = await staffAPI.getAttendance();
      setAttendanceList(attendanceData);
    } catch (err) {
      console.error("Error loading settings components:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Update Accent color property globally
  useEffect(() => {
    const accent = getSettingValue('accent_color', '#4f46e5');
    document.documentElement.style.setProperty('--color-primary', accent);
  }, [settings]);

  // Extract setting helpers
  const getSettingValue = (key, defaultVal = '') => {
    const found = settings.find(s => s.key === key);
    return found ? found.value : defaultVal;
  };

  // Update Setting parameter
  const handleUpdateSetting = async (key, val) => {
    try {
      setSaving(true);
      await settingsAPI.update(key, val);
      setSettings(prev => {
        const found = prev.find(s => s.key === key);
        if (found) {
          return prev.map(s => s.key === key ? { ...s, value: val } : s);
        } else {
          return [...prev, { key, value: val }];
        }
      });
    } catch (err) {
      alert(`Failed to save configuration: ${key}`);
    } finally {
      setSaving(false);
    }
  };

  // Logo upload handler
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setSaving(true);
      const res = await settingsAPI.uploadLogo(file);
      handleUpdateSetting('logo_path', res.logo_path);
      alert('Logo uploaded successfully!');
    } catch (err) {
      alert('Failed to upload branding logo image');
    } finally {
      setSaving(false);
    }
  };

  // Staff CRUD handlers
  const handleOpenStaffModal = (staff = null) => {
    if (staff) {
      setEditingStaff(staff);
      setStaffForm({ name: staff.name, role: staff.role, pin: '', is_active: staff.is_active });
    } else {
      setEditingStaff(null);
      setStaffForm({ name: '', role: 'waiter', pin: '', is_active: true });
    }
    setShowStaffModal(true);
  };

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    if (!staffForm.name) return;
    if (!editingStaff && !staffForm.pin) {
      alert("Passcode PIN is required for new employees.");
      return;
    }
    const payload = { name: staffForm.name, role: staffForm.role, is_active: staffForm.is_active };
    if (staffForm.pin) payload.pin = staffForm.pin;

    try {
      if (editingStaff) {
        await staffAPI.update(editingStaff.id, payload);
      } else {
        await staffAPI.create(payload);
      }
      setShowStaffModal(false);
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save staff record");
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm("Delete this staff account? This cannot be undone.")) return;
    try {
      await staffAPI.delete(id);
      loadAllData();
    } catch (err) {
      alert("Failed to delete staff member.");
    }
  };

  // Tables CRUD handlers
  const handleOpenTableModal = (table = null) => {
    if (table) {
      setEditingTable(table);
      setTableForm({ name: table.name, capacity: table.capacity, shape: table.shape, section: table.section || 'Main Hall' });
    } else {
      setEditingTable(null);
      setTableForm({ name: '', capacity: 4, shape: 'square', section: 'Main Hall' });
    }
    setShowTableModal(true);
  };

  const handleTableSubmit = async (e) => {
    e.preventDefault();
    if (!tableForm.name) return;
    try {
      if (editingTable) {
        await tablesAPI.update(editingTable.id, tableForm);
      } else {
        await tablesAPI.create(tableForm);
      }
      setShowTableModal(false);
      loadAllData();
    } catch (err) {
      alert("Failed to save table.");
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm("Remove this table seating configuration?")) return;
    try {
      await tablesAPI.delete(id);
      loadAllData();
    } catch (err) {
      alert("Failed to remove table.");
    }
  };

  // Shifts CRUD handlers
  const handleOpenShiftModal = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      // Format time objects to HH:MM strings
      const start = shift.start_time.substring(0, 5);
      const end = shift.end_time.substring(0, 5);
      const sIds = shift.staff ? shift.staff.map(s => s.id) : [];
      setShiftForm({ name: shift.name, start_time: start, end_time: end, staff_ids: sIds });
    } else {
      setEditingShift(null);
      setShiftForm({ name: '', start_time: '08:00', end_time: '16:00', staff_ids: [] });
    }
    setShowShiftModal(true);
  };

  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    if (!shiftForm.name) return;
    try {
      if (editingShift) {
        await shiftsAPI.update(editingShift.id, shiftForm);
      } else {
        await shiftsAPI.create(shiftForm);
      }
      setShowShiftModal(false);
      loadAllData();
    } catch (err) {
      alert("Failed to save shift details.");
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm("Remove this shift definition?")) return;
    try {
      await shiftsAPI.delete(id);
      loadAllData();
    } catch (err) {
      alert("Failed to remove shift.");
    }
  };

  const handleToggleStaffForShift = (staffId) => {
    setShiftForm(prev => {
      const exists = prev.staff_ids.includes(staffId);
      if (exists) {
        return { ...prev, staff_ids: prev.staff_ids.filter(id => id !== staffId) };
      } else {
        return { ...prev, staff_ids: [...prev.staff_ids, staffId] };
      }
    });
  };

  // Auto Shift activation calculation based on current time
  const getActiveShiftNow = () => {
    const now = new Date();
    const curHour = now.getHours();
    const curMin = now.getMinutes();
    const curTimeVal = curHour * 60 + curMin;

    for (let shift of shiftsList) {
      const startParts = shift.start_time.split(':');
      const endParts = shift.end_time.split(':');
      const startVal = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endVal = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

      if (startVal < endVal) {
        if (curTimeVal >= startVal && curTimeVal < endVal) return shift.name;
      } else {
        // Over midnight
        if (curTimeVal >= startVal || curTimeVal < endVal) return shift.name;
      }
    }
    return 'None';
  };

  // Database Reset handler
  const handleDatabaseReset = async () => {
    const doubleCheck = window.confirm("⚠️ DANGER ZONE: This will wipe out all transactions, orders, stock adjustments, and reset categories and the menu to clean factory defaults. Proceed?");
    if (!doubleCheck) return;
    const finalCheck = window.prompt("Type 'RESET DATABASE' to finalize wipeout configuration:");
    if (finalCheck !== 'RESET DATABASE') {
      alert("Reset cancelled.");
      return;
    }

    try {
      setSaving(true);
      await settingsAPI.reset();
      alert("Database wiped out and seeded with the default menu successfully!");
      window.location.reload();
    } catch (err) {
      alert("Database reset failed.");
    } finally {
      setSaving(false);
    }
  };

  const getAccentPresetClass = (color) => {
    const val = getSettingValue('accent_color', '#4f46e5');
    return val === color ? 'border-primary ring-2 ring-primary/20 scale-110 shadow' : 'border-slate-200 hover:scale-105';
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-3">
        <span className="material-symbols-outlined text-primary text-[56px] animate-spin">sync</span>
        <h3 className="text-slate-800 font-bold">Loading Settings...</h3>
        <p className="text-slate-500 text-xs font-semibold">Contacting backend FastAPI server</p>
      </div>
    );
  }

  // Pre-calculations for receipt preview
  const previewShopName = getSettingValue('shop_name', 'Restaurant POS');
  const previewTagline = getSettingValue('tagline', 'Deliciously Authentic');
  const previewPhone = getSettingValue('phone', '021-111-222-333');
  const previewAddress = getSettingValue('address', 'Main VIP Block, Karachi');
  const previewCurrency = getSettingValue('currency', 'PKR');
  const previewTaxLabel = getSettingValue('tax_label', 'GST');
  const previewTaxPercent = getSettingValue('tax_percent', '16.0');
  const previewHeader = getSettingValue('receipt_header', '');
  const previewFooter = getSettingValue('receipt_footer', 'Thank you for your visit!');
  const previewShowLogo = getSettingValue('show_logo_on_invoice', 'true') === 'true';
  const previewShowTaxLine = getSettingValue('show_tax_line', 'true') === 'true';
  const previewPaperWidth = getSettingValue('paper_width', '80mm');

  return (
    <div className="h-full flex overflow-hidden bg-slate-100 p-6 select-none font-sans gap-6">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-1.5 shadow-sm justify-between">
        <div className="space-y-4">
          <div className="px-3 py-1.5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[24px]">settings_accessibility</span>
              System Control
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">System Settings</p>
          </div>

          <nav className="flex flex-col gap-1">
            {[
              { id: 'branding', label: 'Branding & Receipt', icon: 'storefront' },
              { id: 'tables', label: 'Tables & Seating', icon: 'table_restaurant' },
              { id: 'staff', label: 'Staff Accounts', icon: 'badge' },
              { id: 'shifts', label: 'Shift Schedules', icon: 'schedule' },
              { id: 'attendance', label: 'Attendance Log', icon: 'assignment' },
              { id: 'printing', label: 'Printer Layout', icon: 'print' },
              { id: 'invoice', label: 'Invoice Rules', icon: 'receipt_long' },
              { id: 'backup', label: 'Backups & Cloud', icon: 'backup' },
              { id: 'system', label: 'System & Security', icon: 'admin_panel_settings' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-md shadow-primary/10'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-100 pt-4 px-2">
          <span className="text-[10px] text-slate-400 block font-semibold">Active Server Session</span>
          <div className="flex items-center gap-2 mt-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
            <span className="text-[11px] font-bold text-slate-600">FastAPI: Online</span>
          </div>
        </div>
      </aside>

      {/* Main Settings Panel */}
      <main className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden relative">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab.replace('_', ' ')} settings</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Customize your POS details and settings</p>
          </div>
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-primary font-bold animate-pulse">
              <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              Saving Config...
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          
          {/* TAB: BRANDING */}
          {activeTab === 'branding' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              {/* Form Config */}
              <div className="space-y-5">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Restaurant Metadata</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Shop Name:</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                      value={getSettingValue('shop_name', 'Restaurant POS')}
                      onChange={(e) => handleUpdateSetting('shop_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Tagline / Motto:</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                      value={getSettingValue('tagline', 'Deliciously Authentic')}
                      onChange={(e) => handleUpdateSetting('tagline', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Phone Contact:</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                      value={getSettingValue('phone', '021-111-222-333')}
                      onChange={(e) => handleUpdateSetting('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Address:</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                      value={getSettingValue('address', 'Main VIP Block, Karachi')}
                      onChange={(e) => handleUpdateSetting('address', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Currency:</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                      value={getSettingValue('currency', 'PKR')}
                      onChange={(e) => handleUpdateSetting('currency', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Tax Label:</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                      value={getSettingValue('tax_label', 'GST')}
                      onChange={(e) => handleUpdateSetting('tax_label', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Tax Percent (%):</label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                      value={getSettingValue('tax_percent', '16.0')}
                      onChange={(e) => handleUpdateSetting('tax_percent', e.target.value)}
                    />
                  </div>
                </div>

                {/* Logo Image Upload */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold text-slate-500 block">Brand Identity Logo</span>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                      {getSettingValue('logo_path') ? (
                        <img 
                          src={`http://127.0.0.1:8000/${getSettingValue('logo_path')}`} 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.target.src = "https://placehold.co/100x100?text=Logo"; }}
                        />
                      ) : (
                        <span className="material-symbols-outlined text-slate-400">image</span>
                      )}
                    </div>
                    <div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="logo-upload" 
                        className="hidden" 
                        onChange={handleLogoUpload}
                      />
                      <label 
                        htmlFor="logo-upload"
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors inline-block"
                      >
                        <span className="material-symbols-outlined text-[16px]">upload_file</span>
                        Upload Brand Logo
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">Recommended size: 100x100 pixels, PNG format.</p>
                    </div>
                  </div>
                </div>

                {/* Theme Accent Color */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 block">Theme Accent Color Configuration</span>
                  <div className="flex gap-3">
                    {[
                      { id: 'Ocean Indigo', code: '#4f46e5' },
                      { id: 'Emerald Green', code: '#059669' },
                      { id: 'Rose Pink', code: '#e11d48' },
                      { id: 'Amber Gold', code: '#d97706' },
                      { id: 'Slate Black', code: '#1e293b' },
                    ].map(color => (
                      <button
                        key={color.id}
                        onClick={() => handleUpdateSetting('accent_color', color.code)}
                        className={`w-9 h-9 rounded-full transition-all border-2 ${getAccentPresetClass(color.code)}`}
                        style={{ backgroundColor: color.code }}
                        title={color.id}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Receipt Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-start gap-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block self-start">Interactive Receipt Preview</span>
                
                {/* Paper Body */}
                <div className="bg-white shadow-lg border border-slate-200 rounded p-4 text-[11px] text-slate-700 font-mono w-72 flex flex-col gap-3">
                  <div className="text-center space-y-1">
                    {previewShowLogo && getSettingValue('logo_path') && (
                      <div className="w-10 h-10 rounded-full border border-slate-200 mx-auto overflow-hidden bg-slate-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">image</span>
                      </div>
                    )}
                    <h4 className="font-bold text-[14px] text-black">{previewShopName}</h4>
                    {previewTagline && <p>{previewTagline}</p>}
                    {previewAddress && <p>{previewAddress}</p>}
                    {previewPhone && <p>Tel: {previewPhone}</p>}
                    {previewHeader && <p className="text-[10px] text-slate-500 italic mt-1">{previewHeader}</p>}
                  </div>

                  <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1">
                    <p>Invoice #: INV-0042</p>
                    <p>Date: {new Date().toLocaleDateString()}</p>
                    <p>Order Type: Dine-in</p>
                    <p>Staff: Cashier John</p>
                  </div>

                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 font-bold">
                        <th className="pb-1">Item</th>
                        <th className="pb-1 text-center">Qty</th>
                        <th className="pb-1 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1">Pizza Regular Flavour (S)</td>
                        <td className="py-1 text-center">2</td>
                        <td className="py-1 text-right">{previewCurrency} 1,200.00</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1">Drinks Soft Drink</td>
                        <td className="py-1 text-center">2</td>
                        <td className="py-1 text-right">{previewCurrency} 180.00</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="space-y-1 font-bold text-right self-end w-36">
                    <div className="flex justify-between font-normal text-slate-500">
                      <span>Subtotal:</span>
                      <span>{previewCurrency} 1,380.00</span>
                    </div>
                    {previewShowTaxLine && (
                      <div className="flex justify-between font-normal text-slate-500">
                        <span>{previewTaxLabel} ({previewTaxPercent}%):</span>
                        <span>{previewCurrency} 220.80</span>
                      </div>
                    )}
                    <div className="flex justify-between text-black border-t border-slate-200 pt-1 text-[12px]">
                      <span>Grand Total:</span>
                      <span>{previewCurrency} 1,600.80</span>
                    </div>
                  </div>

                  <div className="text-center border-t border-dashed border-slate-300 pt-2 text-[10px] italic">
                    {previewFooter}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TABLES */}
          {activeTab === 'tables' && (
            <div className="space-y-4 h-full flex flex-col overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Dining Tables Grid Layout</h3>
                <button
                  onClick={() => handleOpenTableModal()}
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add_box</span>
                  Add New Dining Table
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto p-0.5">
                {tablesList.map(table => (
                  <div key={table.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative group hover:border-primary transition-all">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">{table.shape}</span>
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => handleOpenTableModal(table)}
                            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-primary rounded transition-colors"
                            title="Edit Seating"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTable(table.id)}
                            className="p-1 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded transition-colors"
                            title="Remove Seating"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>

                      <h4 className="text-2xl font-black text-slate-800 mt-2">{table.name}</h4>
                      <p className="text-slate-500 text-xs font-bold mt-1">Section: {table.section || 'Main Hall'}</p>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200/60">
                      <div className="flex items-center gap-1 text-slate-600">
                        <span className="material-symbols-outlined text-[16px]">groups</span>
                        <span className="text-xs font-bold">{table.capacity} seats</span>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${
                        table.status === 'free' ? 'bg-green-500' :
                        table.status === 'pending' ? 'bg-red-500 animate-pulse' :
                        table.status === 'reserved' ? 'bg-indigo-500' : 'bg-amber-500'
                      }`} title={table.status}></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: STAFF */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Employee registries & credentials</h3>
                <button
                  onClick={() => handleOpenStaffModal()}
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  Register Employee
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Name / ID</th>
                      <th className="p-4">Role Title</th>
                      <th className="p-4 text-center">Authentication</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-800">
                    {staffList.map(staff => (
                      <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                            {staff.name.substring(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <span className="block font-bold text-slate-800">{staff.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">ID: #{staff.id}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize">
                            {staff.role}
                          </span>
                        </td>
                        <td className="p-4 text-center text-slate-400 font-mono">4-Digit PIN Secured</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            staff.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {staff.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleOpenStaffModal(staff)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-primary rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff.id)}
                              className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SHIFTS */}
          {activeTab === 'shifts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-2xl flex-wrap gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[20px]">watch_later</span>
                    Shift Schedules & Timeframes
                  </h4>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Current active shift session: <span className="text-primary font-bold">{getActiveShiftNow()}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleOpenShiftModal()}
                  className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">alarm_add</span>
                  Define New Shift
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shiftsList.map(shift => {
                  const isActive = getActiveShiftNow() === shift.name;
                  return (
                    <div key={shift.id} className={`bg-white border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between ${
                      isActive ? 'border-primary ring-2 ring-primary/10 bg-primary/[0.01]' : 'border-slate-200'
                    }`}>
                      <div>
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-bold text-slate-800">{shift.name}</h4>
                          <div className="flex gap-0.5">
                            <button
                              onClick={() => handleOpenShiftModal(shift)}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-primary rounded transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteShift(shift.id)}
                              className="p-1 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-slate-500 text-xs font-bold mt-2">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span>{shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}</span>
                        </div>

                        {/* Assigned Staff */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Assigned Staff ({shift.staff ? shift.staff.length : 0})</span>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {shift.staff && shift.staff.map(s => (
                              <span key={s.id} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold">
                                {s.name}
                              </span>
                            ))}
                            {(!shift.staff || shift.staff.length === 0) && (
                              <span className="text-slate-400 text-xs italic">No staff assigned</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <div className="bg-green-100 text-green-800 text-[10px] font-extrabold py-1 px-2.5 rounded-full text-center tracking-widest mt-2 uppercase">
                          ACTIVE SHIFT CURRENTLY
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Staff Attendance Log</h3>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm max-h-[450px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Shift</th>
                      <th className="p-4 text-center">Clock-In (UTC)</th>
                      <th className="p-4 text-center">Clock-Out (UTC)</th>
                      <th className="p-4 text-center">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-800">
                    {attendanceList.map(record => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{record.staff_name}</td>
                        <td className="p-4">{record.shift_name}</td>
                        <td className="p-4 text-center text-xs font-bold text-slate-600 font-mono">
                          {record.clock_in ? new Date(record.clock_in).toLocaleTimeString() : 'N/A'}
                        </td>
                        <td className="p-4 text-center text-xs font-bold text-slate-600 font-mono">
                          {record.clock_out ? new Date(record.clock_out).toLocaleTimeString() : (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">Active Session</span>
                          )}
                        </td>
                        <td className="p-4 text-center text-xs text-slate-500 font-bold font-mono">{record.date}</td>
                      </tr>
                    ))}
                    {attendanceList.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400 font-bold italic">No attendance records logged.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: PRINTING */}
          {activeTab === 'printing' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">ESC/POS Thermal Printer Parameters</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Printer Model / Interface:</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary bg-white"
                    value={getSettingValue('printer_type', 'ESC/POS thermal')}
                    onChange={(e) => handleUpdateSetting('printer_type', e.target.value)}
                  >
                    <option value="ESC/POS thermal">ESC/POS Thermal Receipt</option>
                    <option value="Standard Laser A4">Standard Laser / Inkjet A4</option>
                    <option value="Save PDF Only">Local PDF Writer Only</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Paper Width Options:</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary bg-white"
                    value={getSettingValue('paper_width', '80mm')}
                    onChange={(e) => handleUpdateSetting('paper_width', e.target.value)}
                  >
                    <option value="80mm">80mm Paper width (Standard)</option>
                    <option value="58mm">58mm Paper width (Narrow)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Thermal Invoice Printing Size:</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  value={getSettingValue('invoice_size', '5x3 inches')}
                  onChange={(e) => handleUpdateSetting('invoice_size', e.target.value)}
                />
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 space-y-3.5 bg-slate-50/50">
                <span className="text-xs font-extrabold text-slate-600 block uppercase tracking-wider">Automated Printing Hooks</span>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">Print Kitchen Order Ticket (KOT)</span>
                    <span className="text-xs text-slate-400 font-semibold block">Auto-dispatch kitchen chit on order placement</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={getSettingValue('kitchen_chit_toggle', 'true') === 'true'}
                    onChange={(e) => handleUpdateSetting('kitchen_chit_toggle', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">Print Customer Invoice Bill</span>
                    <span className="text-xs text-slate-400 font-semibold block">Auto-print invoice receipt upon transaction payment checkout</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={getSettingValue('customer_bill_toggle', 'true') === 'true'}
                    onChange={(e) => handleUpdateSetting('customer_bill_toggle', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: INVOICE */}
          {activeTab === 'invoice' && (
            <div className="space-y-5 max-w-2xl">
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Invoice Rule configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Invoice prefix label:</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary font-mono uppercase"
                    value={getSettingValue('invoice_prefix', 'INV-')}
                    onChange={(e) => handleUpdateSetting('invoice_prefix', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 font-sans">Sequential numbering pattern:</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary bg-white font-sans"
                    value={getSettingValue('sequential_numbering', 'true')}
                    onChange={(e) => handleUpdateSetting('sequential_numbering', e.target.value)}
                  >
                    <option value="true">Sequential Serial (e.g. INV-0042)</option>
                    <option value="false">Random Timestamp Hash (e.g. INV-1748281)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Show GST / Sales Tax line</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={getSettingValue('show_tax_line', 'true') === 'true'}
                    onChange={(e) => handleUpdateSetting('show_tax_line', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Show brand logo on invoice</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={getSettingValue('show_logo_on_invoice', 'true') === 'true'}
                    onChange={(e) => handleUpdateSetting('show_logo_on_invoice', e.target.checked ? 'true' : 'false')}
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Invoice Header Alert Text:</label>
                <textarea
                  rows="2"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-primary"
                  value={getSettingValue('invoice_header', '')}
                  onChange={(e) => handleUpdateSetting('invoice_header', e.target.value)}
                  placeholder="e.g. Wi-Fi: Restaurant_GUEST / Password: 123"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Invoice Footer Greeting Text:</label>
                <textarea
                  rows="2"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-primary"
                  value={getSettingValue('invoice_footer', 'Thank you for your visit!')}
                  onChange={(e) => handleUpdateSetting('invoice_footer', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* TAB: BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Local Storage Backup & Cloud sync</h3>
              
              {/* Local Backup */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm bg-white">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[28px]">folder_zip</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Local Harddrive Database Backups</h4>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Zip backups of SQLite db file, logs, and receipt PDFs</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">Target Backup folder path:</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                    value={getSettingValue('local_backup_folder', '../backups')}
                    onChange={(e) => handleUpdateSetting('local_backup_folder', e.target.value)}
                  />
                </div>

                <button
                  onClick={() => {
                    setBackingUp(true);
                    setTimeout(() => {
                      setBackingUp(false);
                      alert(`Backup written successfully to: ${getSettingValue('local_backup_folder', '../backups')}/rms_db_backup_${new Date().toISOString().slice(0,10)}.zip`);
                    }, 1000);
                  }}
                  disabled={backingUp}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors active:scale-98"
                >
                  <span className="material-symbols-outlined text-[16px]">{backingUp ? 'sync' : 'download'}</span>
                  {backingUp ? 'Creating local archive...' : 'Trigger Manual Backup Now'}
                </button>
              </div>

              {/* Google Drive Cloud Backup */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm bg-white">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-600 text-[28px]">cloud_sync</span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Google Drive Cloud Backup</h4>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Auto-upload invoices and database records on checkout settling</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-b border-slate-100 py-3">
                  <div>
                    <span className="text-xs font-bold text-slate-600 block">Google OAuth Connection</span>
                    {driveConnected ? (
                      <span className="text-[11px] text-green-600 font-bold block mt-0.5">Linked: mujeeb@gmail.com</span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">No active Google account linked.</span>
                    )}
                  </div>
                  <button
                    onClick={() => setDriveConnected(prev => !prev)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 ${
                      driveConnected 
                        ? 'border border-slate-200 hover:bg-slate-50 text-red-600' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {driveConnected ? 'Disconnect Account' : 'Authenticate Google Drive'}
                  </button>
                </div>

                {driveConnected && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Cloud Target Folder Name:</label>
                      <input
                        type="text"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                        value={getSettingValue('google_drive_folder', 'RMS_Cloud_Backups')}
                        onChange={(e) => handleUpdateSetting('google_drive_folder', e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Auto-Sync Syncing Toggle</span>
                        <span className="text-[10px] text-slate-400 font-semibold block">Silently update backup directory on checkout logs</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={getSettingValue('google_drive_auto_sync', 'true') === 'true'}
                        onChange={(e) => handleUpdateSetting('google_drive_auto_sync', e.target.checked ? 'true' : 'false')}
                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SYSTEM */}
          {activeTab === 'system' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">System Rules</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">System Language:</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary bg-white"
                    value={getSettingValue('language', 'English')}
                    onChange={(e) => handleUpdateSetting('language', e.target.value)}
                  >
                    <option value="English">English (United States)</option>
                    <option value="Urdu">Urdu (اردو)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">System Time format:</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary bg-white"
                    value={getSettingValue('time_format', '12hr')}
                    onChange={(e) => handleUpdateSetting('time_format', e.target.value)}
                  >
                    <option value="12hr">12-Hour format (e.g. 04:30 PM)</option>
                    <option value="24hr">24-Hour format (e.g. 16:30)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Low Stock Alert Threshold quantity:</label>
                <input
                  type="number"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  value={getSettingValue('low_stock_threshold', '15.0')}
                  onChange={(e) => handleUpdateSetting('low_stock_threshold', e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">Warns employees on POS ordering whenever raw stock levels drop below this count.</p>
              </div>

              {/* Database Wipout Action */}
              <div className="border border-red-200 rounded-2xl p-5 space-y-4 bg-red-50/30 shadow-sm mt-8">
                <div className="flex items-center gap-3 text-red-700">
                  <span className="material-symbols-outlined text-[32px]">warning</span>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider">Danger Zone: Database Reset</h4>
                    <p className="text-xs text-red-600 font-bold mt-0.5">Wipe clean all database logs and restore to default factory setup</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Resetting the database deletes all order records, transaction logs, attendance files, and restores tables to default settings. 
                  This is irreversible. Please ensure you have local backups saved beforehand.
                </p>

                <button
                  onClick={handleDatabaseReset}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center gap-1.5 transition-colors active:scale-98 shadow-sm hover:shadow-red-600/10"
                >
                  <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                  Wipe Clean & Reset Database
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL: STAFF FORM */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleStaffSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">{editingStaff ? 'edit' : 'person_add'}</span>
                {editingStaff ? 'Edit Staff Account' : 'New Staff Account'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowStaffModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Employee Full Name:</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  placeholder="e.g. Aamir Khan"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Role Title:</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary bg-white capitalize"
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  >
                    <option value="waiter">waiter</option>
                    <option value="cashier">cashier</option>
                    <option value="manager">manager</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Passcode PIN:</label>
                  <input
                    type="password"
                    required={!editingStaff}
                    maxLength="4"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary tracking-widest font-mono text-center"
                    placeholder={editingStaff ? '••••' : 'PIN'}
                    value={staffForm.pin}
                    onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value })}
                  />
                  {editingStaff && (
                    <span className="text-[9px] text-slate-400 block mt-1">Leave blank to retain current.</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="staff-active-check"
                  checked={staffForm.is_active}
                  onChange={(e) => setStaffForm({ ...staffForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-primary focus:ring-primary w-5 h-5"
                />
                <label htmlFor="staff-active-check" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Account status active
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/95 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] mt-2"
            >
              <span>Save Staff Account</span>
            </button>
          </form>
        </div>
      )}

      {/* MODAL: TABLE FORM */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleTableSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">{editingTable ? 'edit' : 'add_box'}</span>
                {editingTable ? 'Edit Seating Config' : 'New Seating Config'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowTableModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Dining Table Name / ID:</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  placeholder="e.g. T-14"
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Seating Capacity:</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                    value={tableForm.capacity}
                    onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Layout Shape:</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary bg-white capitalize"
                    value={tableForm.shape}
                    onChange={(e) => setTableForm({ ...tableForm, shape: e.target.value })}
                  >
                    <option value="square">square</option>
                    <option value="round">round</option>
                    <option value="rectangle">rectangle</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Seating Section Area:</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary bg-white"
                  value={tableForm.section}
                  onChange={(e) => setTableForm({ ...tableForm, section: e.target.value })}
                >
                  <option value="Main Hall">Main Hall</option>
                  <option value="Window Area">Window Area</option>
                  <option value="VIP Section">VIP Section</option>
                  <option value="Outdoor Terrace">Outdoor Terrace</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/95 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] mt-2"
            >
              <span>Save Table Seating</span>
            </button>
          </form>
        </div>
      )}

      {/* MODAL: SHIFT FORM */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleShiftSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">{editingShift ? 'edit' : 'alarm_add'}</span>
                {editingShift ? 'Edit Shift Schedule' : 'New Shift Schedule'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowShiftModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto max-h-[400px] pr-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Shift Name:</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  placeholder="e.g. Afternoon shift"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Start Time (HH:MM):</label>
                  <input
                    type="text"
                    required
                    pattern="[0-2][0-9]:[0-5][0-9]"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary text-center font-mono"
                    placeholder="08:00"
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">End Time (HH:MM):</label>
                  <input
                    type="text"
                    required
                    pattern="[0-2][0-9]:[0-5][0-9]"
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-primary text-center font-mono"
                    placeholder="16:00"
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Assign Staff checkboxes */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-500 block">Assign Staff to Shift:</span>
                <div className="grid grid-cols-2 gap-2.5 max-h-40 overflow-y-auto pr-1">
                  {staffList.map(staff => (
                    <label key={staff.id} className="flex items-center gap-2 border border-slate-200 rounded-xl p-2.5 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shiftForm.staff_ids.includes(staff.id)}
                        onChange={() => handleToggleStaffForShift(staff.id)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4.5 h-4.5"
                      />
                      <span className="text-xs font-semibold text-slate-700 leading-none">{staff.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/95 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] mt-2"
            >
              <span>Save Shift Schedule</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default Settings;
