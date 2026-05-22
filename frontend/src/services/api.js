import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically attach JWT token on requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle session expiration or unauthorized redirects
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('rms_token');
      localStorage.removeItem('rms_staff');
      // Redirect to state-based hash login
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (pin) => {
    const response = await api.post('/auth/login', { pin });
    return response.data;
  },
};

export const staffAPI = {
  list: async () => {
    const response = await api.get('/staff/');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/staff/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/staff/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  },
  clockIn: async (staffId, shiftId) => {
    const response = await api.post('/staff/attendance/clock-in', { staff_id: staffId, shift_id: shiftId });
    return response.data;
  },
  clockOut: async (staffId, shiftId) => {
    const response = await api.post('/staff/attendance/clock-out', { staff_id: staffId, shift_id: shiftId });
    return response.data;
  },
  getAttendance: async () => {
    const response = await api.get('/staff/attendance/history');
    return response.data;
  },
};

export const tablesAPI = {
  list: async () => {
    const response = await api.get('/tables/');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/tables/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/tables/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/tables/${id}`);
    return response.data;
  },
};

export const menuAPI = {
  listCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  createCategory: async (data) => {
    const response = await api.post('/categories', data);
    return response.data;
  },
  updateCategory: async (id, data) => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },
  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
  listItems: async () => {
    const response = await api.get('/menu-items');
    return response.data;
  },
  createItem: async (data) => {
    const response = await api.post('/menu-items', data);
    return response.data;
  },
  updateItem: async (id, data) => {
    const response = await api.put(`/menu-items/${id}`, data);
    return response.data;
  },
  deleteItem: async (id) => {
    const response = await api.delete(`/menu-items/${id}`);
    return response.data;
  },
  uploadImage: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/menu-items/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const ordersAPI = {
  list: async (status, type) => {
    const params = {};
    if (status) params.status = status;
    if (type) params.order_type = type;
    const response = await api.get('/orders/', { params });
    return response.data;
  },
  get: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/orders/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/orders/${id}`, data);
    return response.data;
  },
  pay: async (id, paymentData) => {
    const response = await api.post(`/orders/${id}/pay`, paymentData);
    return response.data;
  },
  printDraft: async (id) => {
    const response = await api.post(`/orders/${id}/print-draft`);
    return response.data;
  },
};

export const stockAPI = {
  list: async (lowStockOnly = false) => {
    const response = await api.get('/stock/', { params: { low_stock_only: lowStockOnly } });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/stock/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/stock/${id}`, data);
    return response.data;
  },
  adjust: async (data) => {
    const response = await api.post('/stock/adjustments', data);
    return response.data;
  },
  listAdjustments: async (stockItemId) => {
    const params = stockItemId ? { stock_item_id: stockItemId } : {};
    const response = await api.get('/stock/adjustments/all', { params });
    return response.data;
  },
};

export const settingsAPI = {
  getPublic: async () => {
    const response = await api.get('/settings/public');
    return response.data;
  },
  list: async () => {
    const response = await api.get('/settings/');
    return response.data;
  },
  update: async (key, value) => {
    const response = await api.put(`/settings/${key}`, { value });
    return response.data;
  },
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  reset: async () => {
    const response = await api.post('/settings/reset');
    return response.data;
  },
};

export const invoicesAPI = {
  list: async () => {
    const response = await api.get('/invoices/');
    return response.data;
  },
  getPdfUrl: (id) => {
    return `${API_BASE_URL}/invoices/${id}/pdf`;
  },
  reprint: async (id) => {
    const response = await api.post(`/invoices/${id}/reprint`);
    return response.data;
  },
};

export const shiftsAPI = {
  list: async () => {
    const response = await api.get('/shifts/');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/shifts/', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/shifts/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/shifts/${id}`);
    return response.data;
  },
};

export default api;
