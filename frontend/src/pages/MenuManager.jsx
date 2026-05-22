import React, { useState, useEffect } from 'react';
import { menuAPI, stockAPI } from '../services/api';

const AVAILABLE_ICONS = [
  { name: 'Restaurant', value: 'restaurant' },
  { name: 'Pizza', value: 'local_pizza' },
  { name: 'Burger & Dining', value: 'lunch_dining' },
  { name: 'Coffee & Cafe', value: 'local_cafe' },
  { name: 'Desserts & Cake', value: 'cake' },
  { name: 'Ice Cream', value: 'icecream' },
  { name: 'Drinks & Bar', value: 'wine_bar' },
  { name: 'Glass / Water', value: 'local_drink' },
  { name: 'Cocktail Bar', value: 'local_bar' },
  { name: 'Juice / Smoothie', value: 'blender' },
  { name: 'Tea & Beverage', value: 'emoji_food_beverage' },
  { name: 'Bakery', value: 'bakery_dining' },
  { name: 'Fast Food', value: 'fastfood' }
];

const AVAILABLE_COLORS = [
  { name: 'Rose', value: 'bg-rose-500 text-white' },
  { name: 'Amber', value: 'bg-amber-500 text-white' },
  { name: 'Emerald', value: 'bg-emerald-500 text-white' },
  { name: 'Indigo', value: 'bg-indigo-500 text-white' },
  { name: 'Violet', value: 'bg-violet-500 text-white' },
  { name: 'Cyan', value: 'bg-cyan-500 text-white' }
];

const MenuManager = () => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Category Modal State
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null for create, object for edit
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('restaurant');
  const [catColor, setCatColor] = useState('bg-rose-500 text-white');
  const [catSortOrder, setCatSortOrder] = useState('0');
  const [submittingCat, setSubmittingCat] = useState(false);

  // Item Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null); // null for create, object for edit
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [itemSortOrder, setItemSortOrder] = useState('0');
  
  // Variants editor states
  const [variantsList, setVariantsList] = useState([]); // Array of { name, price }
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');

  // Image Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Linked Stock state
  const [linkedStockId, setLinkedStockId] = useState('');

  const [submittingItem, setSubmittingItem] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const cats = await menuAPI.listCategories();
      // Sort by sort_order
      setCategories(cats.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      
      const items = await menuAPI.listItems();
      setMenuItems(items);

      const stocks = await stockAPI.list();
      setStockItems(stocks);
    } catch (err) {
      setError('Could not retrieve menu records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Category CRUD
  const handleOpenCatModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatIcon(cat.icon === 'glass' ? 'local_drink' : (cat.icon || 'restaurant'));
      setCatColor(cat.color || 'bg-rose-500 text-white');
      setCatSortOrder(cat.sort_order?.toString() || '0');
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatIcon('restaurant');
      setCatColor('bg-rose-500 text-white');
      setCatSortOrder((categories.length * 10).toString());
    }
    setShowCatModal(true);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const payload = {
      name: catName,
      icon: catIcon,
      color: catColor,
      sort_order: parseInt(catSortOrder || '0'),
      is_active: true
    };

    try {
      setSubmittingCat(true);
      if (editingCategory) {
        await menuAPI.updateCategory(editingCategory.id, payload);
      } else {
        await menuAPI.createCategory(payload);
      }
      setShowCatModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save category');
    } finally {
      setSubmittingCat(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? All unlinked items will be uncategorized.')) return;
    try {
      await menuAPI.deleteCategory(id);
      loadData();
    } catch (err) {
      alert('Could not delete category.');
    }
  };

  const handleReorderCategory = async (cat, direction) => {
    const currentIndex = categories.findIndex(c => c.id === cat.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === categories.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetCat = categories[targetIndex];

    // Swap sort order
    try {
      const tempOrder = cat.sort_order || 0;
      await menuAPI.updateCategory(cat.id, { sort_order: targetCat.sort_order || 0 });
      await menuAPI.updateCategory(targetCat.id, { sort_order: tempOrder });
      loadData();
    } catch (err) {
      console.error('Reordering failed', err);
    }
  };

  // Open Item Modal
  const handleOpenItemModal = (item = null) => {
    setSelectedFile(null);
    setImagePreview('');
    setNewVarName('');
    setNewVarPrice('');
    
    if (item) {
      // Edit mode
      setCurrentItem(item);
      setItemName(item.name);
      setItemDescription(item.description || '');
      setItemPrice(item.price.toString());
      setItemCategoryId(item.category_id?.toString() || '');
      setItemIsAvailable(item.is_available);
      setItemSortOrder(item.sort_order?.toString() || '0');
      
      // Load variants dict into editable list format
      if (item.variants) {
        const list = Object.entries(item.variants).map(([name, price]) => ({
          name,
          price: price.toString()
        }));
        setVariantsList(list);
      } else {
        setVariantsList([]);
      }

      // Pre-populate image preview if paths exist
      if (item.image_path) {
        setImagePreview(`http://localhost:8000${item.image_path}`);
      }

      // Load associated stock item
      const linkedStock = stockItems.find(s => s.menu_item_id === item.id);
      setLinkedStockId(linkedStock ? linkedStock.id.toString() : '');
    } else {
      // Create mode
      setCurrentItem(null);
      setItemName('');
      setItemDescription('');
      setItemPrice('');
      setItemCategoryId(categories[0]?.id?.toString() || '');
      setItemIsAvailable(true);
      setItemSortOrder('0');
      setVariantsList([]);
      setLinkedStockId('');
    }
    setShowItemModal(true);
  };

  // Variants handlers
  const handleAddVariant = () => {
    if (!newVarName.trim() || !newVarPrice) return;
    setVariantsList([...variantsList, { name: newVarName.trim(), price: parseFloat(newVarPrice) }]);
    setNewVarName('');
    setNewVarPrice('');
  };

  const handleRemoveVariant = (index) => {
    setVariantsList(variantsList.filter((_, i) => i !== index));
  };

  // Image Selection change handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Create/Edit Item Submit
  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemName || !itemPrice) {
      alert('Please fill out Name and Price fields.');
      return;
    }

    // Convert variants array to dictionary
    const variantsDict = {};
    variantsList.forEach(v => {
      variantsDict[v.name] = parseFloat(v.price);
    });

    const payload = {
      name: itemName,
      description: itemDescription || null,
      price: parseFloat(itemPrice),
      category_id: itemCategoryId ? parseInt(itemCategoryId) : null,
      is_available: itemIsAvailable,
      sort_order: parseInt(itemSortOrder || '0'),
      variants: Object.keys(variantsDict).length > 0 ? variantsDict : null
    };

    try {
      setSubmittingItem(true);
      let savedItem;
      if (currentItem) {
        // Update
        savedItem = await menuAPI.updateItem(currentItem.id, payload);
      } else {
        // Create
        savedItem = await menuAPI.createItem(payload);
      }

      // If an image is selected, upload it
      if (selectedFile) {
        await menuAPI.uploadImage(savedItem.id, selectedFile);
      }

      // Update Stock linking
      // First, remove old stock linking for this item if needed
      const previousLinkedStock = stockItems.find(s => s.menu_item_id === savedItem.id);
      if (previousLinkedStock && previousLinkedStock.id.toString() !== linkedStockId) {
        await stockAPI.update(previousLinkedStock.id, {
          name: previousLinkedStock.name,
          unit: previousLinkedStock.unit,
          low_stock_threshold: previousLinkedStock.low_stock_threshold,
          menu_item_id: null
        });
      }

      // Link the new stock item
      if (linkedStockId) {
        const targetStock = stockItems.find(s => s.id.toString() === linkedStockId);
        if (targetStock) {
          await stockAPI.update(targetStock.id, {
            name: targetStock.name,
            unit: targetStock.unit,
            low_stock_threshold: targetStock.low_stock_threshold,
            menu_item_id: savedItem.id
          });
        }
      }

      setShowItemModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save menu item');
    } finally {
      setSubmittingItem(false);
    }
  };

  const handleToggleAvailable = async (item) => {
    try {
      await menuAPI.updateItem(item.id, { is_available: !item.is_available });
      setMenuItems(prev => 
        prev.map(m => m.id === item.id ? { ...m, is_available: !m.is_available } : m)
      );
    } catch (err) {
      alert('Could not toggle item availability');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await menuAPI.deleteItem(id);
      loadData();
    } catch (err) {
      alert('Could not delete menu item. It might be linked to orders.');
    }
  };

  const getLinkedStockName = (menuItemId) => {
    const linked = stockItems.find(s => s.menu_item_id === menuItemId);
    return linked ? `${linked.name} (${linked.quantity} ${linked.unit})` : 'Unlinked';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50 select-none p-6 space-y-6 font-sans">
      
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">restaurant_menu</span>
            POS Catalog & Menu Manager
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">Configure dishes, customize variants, manage category structures and coordinate upload graphics.</p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => handleOpenCatModal()}
            className="border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
            New Category
          </button>
          <button
            onClick={() => handleOpenItemModal()}
            className="bg-primary hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Main Tables Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        
        {/* Categories panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 font-bold text-xs uppercase tracking-wider text-slate-500">
            Menu Categories
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {categories.map((cat) => (
              <div 
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${cat.color || 'bg-rose-500 text-white'}`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {cat.icon === 'glass' ? 'local_drink' : (cat.icon || 'restaurant')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{cat.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">Order: {cat.sort_order || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleReorderCategory(cat, 'up')}
                    className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
                    title="Move Up"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                  </button>
                  <button 
                    onClick={() => handleReorderCategory(cat, 'down')}
                    className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded"
                    title="Move Down"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                  </button>
                  <button 
                    onClick={() => handleOpenCatModal(cat)}
                    className="p-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Items Table */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl flex flex-col shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 font-bold text-xs uppercase tracking-wider text-slate-500">
            Catalog Listings
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <span className="material-symbols-outlined text-primary text-[48px] animate-spin">sync</span>
                <p className="text-xs font-bold text-slate-500">Loading catalog items...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500 font-semibold">
                {error}
              </div>
            ) : menuItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                <span className="material-symbols-outlined text-[48px] opacity-40">restaurant_menu</span>
                <p className="text-xs font-bold mt-2">No menu items created yet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 text-[11px] text-slate-500 uppercase font-extrabold tracking-wider">
                  <tr>
                    <th className="p-4 pl-6">Dish Details</th>
                    <th className="p-4">Linked Stock Item</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-center">Variants</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                          {item.image_path ? (
                            <img 
                              src={`http://localhost:8000${item.image_path}`} 
                              alt={item.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-[20px]">image</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{item.category?.name || 'Uncategorized'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 font-bold">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] border ${
                          getLinkedStockName(item.id) === 'Unlinked'
                            ? 'bg-slate-50 border-slate-200 text-slate-400'
                            : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                        }`}>
                          {getLinkedStockName(item.id)}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800 text-sm">
                        PKR {parseFloat(item.price).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {item.variants ? (
                          <div className="flex flex-wrap gap-1 justify-center max-w-[150px] mx-auto">
                            {Object.entries(item.variants).map(([name, price]) => (
                              <span key={name} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                {name}: {price}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleAvailable(item)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition-all border ${
                            item.is_available
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-red-50 border-red-200 text-red-600'
                          }`}
                        >
                          {item.is_available ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenItemModal(item)}
                            className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Item"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Item"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Category Creation Overlay Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCatSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">{editingCategory ? 'edit' : 'bookmark_add'}</span>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowCatModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category Name:</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="e.g. Desserts, Burgers"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  autoFocus
                  disabled={submittingCat}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Menu Icon:</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_ICONS.map(ico => (
                    <button
                      key={ico.value}
                      type="button"
                      onClick={() => setCatIcon(ico.value)}
                      className={`h-10 rounded-xl border flex items-center justify-center transition-all ${
                        catIcon === ico.value
                          ? 'border-primary bg-indigo-50 text-primary font-bold shadow-sm'
                          : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                      title={ico.name}
                    >
                      <span className="material-symbols-outlined">{ico.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Color Label:</label>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_COLORS.map(col => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setCatColor(col.value)}
                      className={`py-2 text-[10px] font-bold rounded-lg border flex items-center justify-center transition-all ${
                        catColor === col.value
                          ? 'ring-2 ring-primary border-transparent'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full mr-1.5 ${col.value.split(' ')[0]}`}></div>
                      {col.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sorting Priority Weight:</label>
                <input
                  type="number"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="0"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(e.target.value)}
                  disabled={submittingCat}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingCat || !catName}
              className="w-full bg-primary text-white h-11 rounded-xl font-bold hover:bg-indigo-700 transition-all mt-2 flex items-center justify-center gap-2 text-xs"
            >
              {submittingCat ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                'Save Category'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Menu Item Form Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleItemSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">{currentItem ? 'edit' : 'add_circle'}</span>
                {currentItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowItemModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              
              {/* Image Preview & Upload section */}
              <div className="col-span-2 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 relative group">
                {imagePreview ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <img src={imagePreview} alt="Dish preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setSelectedFile(null); setImagePreview(''); }}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:scale-105 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-32 flex flex-col items-center justify-center cursor-pointer">
                    <span className="material-symbols-outlined text-slate-400 text-[36px]">add_a_photo</span>
                    <span className="text-xs font-bold text-slate-500 mt-2">Upload Display Image</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPEG, PNG or WEBP (Max 2MB)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Name:</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="e.g. Premium Beef Burger"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  disabled={submittingItem}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description (Optional):</label>
                <textarea
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none h-16 resize-none"
                  placeholder="Summarize dish toppings, preparation style, and portion sizing..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  disabled={submittingItem}
                />
              </div>

              <div className="col-span-1 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category Tag:</label>
                <select
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={itemCategoryId}
                  onChange={(e) => setItemCategoryId(e.target.value)}
                  disabled={submittingItem}
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Base Price (PKR):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-right font-data-mono font-semibold"
                  placeholder="0.00"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  disabled={submittingItem}
                />
              </div>

              {/* Variants Section */}
              <div className="col-span-2 border border-slate-100 bg-slate-50/50 p-4 rounded-xl space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Dish Variants & Pricing:</label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                    placeholder="Variant name (e.g. Small)"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-28 bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 text-right outline-none focus:border-primary"
                    placeholder="Price PKR"
                    value={newVarPrice}
                    onChange={(e) => setNewVarPrice(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 rounded-lg flex items-center justify-center"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {variantsList.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white border border-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold">
                      <span className="text-slate-700 font-bold">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-bold">PKR {item.price}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {variantsList.length === 0 && (
                    <p className="text-[10px] text-slate-400 italic">No variants created for this dish</p>
                  )}
                </div>
              </div>

              {/* Relational Stock Link */}
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Link to Raw Stock Inventory Item:</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={linkedStockId}
                  onChange={(e) => setLinkedStockId(e.target.value)}
                  disabled={submittingItem}
                >
                  <option value="">-- Choose Stock Item / Not Linked --</option>
                  {stockItems.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.quantity} {s.unit})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">Linking this menu item to an inventory item automatically deducts stock during orders.</p>
              </div>

              <div className="col-span-1 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catalog Sort Priority:</label>
                <input
                  type="number"
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-data-mono"
                  placeholder="0"
                  value={itemSortOrder}
                  onChange={(e) => setItemSortOrder(e.target.value)}
                  disabled={submittingItem}
                />
              </div>

              <div className="col-span-1 flex items-center justify-start mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemIsAvailable}
                    onChange={(e) => setItemIsAvailable(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4.5 w-4.5"
                    disabled={submittingItem}
                  />
                  <span className="text-xs font-bold text-slate-700">Available for POS sales</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingItem}
              className="w-full bg-primary hover:bg-indigo-700 text-white h-11 rounded-xl font-bold transition-all mt-4 flex items-center justify-center gap-2 text-xs"
            >
              {submittingItem ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              ) : (
                'Save Item Entry'
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default MenuManager;
