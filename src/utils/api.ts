// API utility functions for making authenticated requests

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';

interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const apiRequest = async (endpoint: string, options: ApiOptions = {}) => {
  // Read token from sessionStorage to avoid persistent auto-login across browser restarts
  const token = sessionStorage.getItem('token');
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Specific API functions
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  
  register: (userData: any) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: userData,
    }),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/passwords/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
};

export const facilityApi = {
  getAll: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/facilities${queryString}`);
  },
  
  getById: (id: string) => apiRequest(`/facilities/${id}`),
  
  create: (data: any) =>
    apiRequest('/facilities', {
      method: 'POST',
      body: data,
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/facilities/${id}`, {
      method: 'PATCH',
      body: data,
    }),
  
  delete: (id: string) =>
    apiRequest(`/facilities/${id}`, {
      method: 'DELETE',
    }),
};

export const bookingApi = {
  getAll: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/bookings${queryString}`);
  },
  
  getById: (id: string) => apiRequest(`/bookings/${id}`),
  
  create: (data: any) =>
    apiRequest('/bookings', {
      method: 'POST',
      body: data,
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/bookings/${id}`, {
      method: 'PATCH',
      body: data,
    }),
  
  approve: (id: string, notes?: string) =>
    apiRequest(`/bookings/${id}/approve`, {
      method: 'PATCH',
      body: { notes },
    }),
  
  reject: (id: string, reason: string) =>
    apiRequest(`/bookings/${id}/reject`, {
      method: 'PATCH',
      body: { reason },
    }),
  
  checkIn: (id: string, code: string) =>
    apiRequest(`/bookings/${id}/check-in`, {
      method: 'POST',
      body: { code },
    }),
  
  checkOut: (id: string, notes?: string, damageReported?: boolean) =>
    apiRequest(`/bookings/${id}/check-out`, {
      method: 'POST',
      body: { notes, damageReported },
    }),

  cancel: (id: string, notes?: string) =>
    apiRequest(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: { notes },
    }),
    
  delete: (id: string) =>
    apiRequest(`/bookings/${id}`, {
      method: 'DELETE',
    }),
};

export const userApi = {
  getAll: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/users${queryString}`);
  },
  
  getById: (id: string) => apiRequest(`/users/${id}`),
  
  register: (userData: any) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: userData,
    }),
  
  update: (id: string, data: any) =>
    apiRequest(`/users/${id}`, {
      method: 'PATCH',
      body: data,
    }),
  
  verify: (id: string) =>
    apiRequest(`/users/${id}/verify`, {
      method: 'POST',
    }),
  
  suspend: (id: string) =>
    apiRequest(`/users/${id}/suspend`, {
      method: 'POST',
    }),
  
  activate: (id: string) =>
    apiRequest(`/users/${id}/activate`, {
      method: 'POST',
    }),

  getPendingVerification: () => 
    apiRequest('/users/pending/verification'),
};

export const notificationApi = {
  getAll: () => apiRequest('/notifications'),
  
  markAsRead: (id: string) =>
    apiRequest(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
  
  markAllAsRead: () =>
    apiRequest('/notifications/mark-all-read', {
      method: 'PATCH',
    }),
  
  delete: (id: string) =>
    apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    }),
};

export const systemSettingsApi = {
  get: () => apiRequest('/system-settings'),
  
  update: (data: any) =>
    apiRequest('/system-settings', {
      method: 'PATCH',
      body: data,
    }),
  
  reset: () =>
    apiRequest('/system-settings/reset', {
      method: 'POST',
    }),
};

export const feedbackApi = {
  getAll: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/feedback${queryString}`);
  },
  
  getMy: () => apiRequest('/feedback/my'),
  
  create: (data: any) =>
    apiRequest('/feedback', {
      method: 'POST',
      body: data,
    }),
  
  respond: (id: string, response: string) =>
    apiRequest(`/feedback/${id}/respond`, {
      method: 'PATCH',
      body: { response },
    }),
  
  getStats: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/feedback/stats${queryString}`);
  },
};

export const qrScannerApi = {
  scan: (code: string) =>
    apiRequest('/qr-scanner/scan', {
      method: 'POST',
      body: { code },
    }),
  
  lookup: (code: string) => apiRequest(`/qr-scanner/lookup/${code}`),
};

export const checkInRequestApi = {
  getAll: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/check-in-requests${queryString}`);
  },
  
  getMy: () => apiRequest('/check-in-requests/my'),
  
  create: (data: any) =>
    apiRequest('/check-in-requests', {
      method: 'POST',
      body: data,
    }),
  
  approve: (id: string, damageReport?: any) =>
    apiRequest(`/check-in-requests/${id}/approve`, {
      method: 'PATCH',
      body: { damageReport },
    }),
  
  reject: (id: string) =>
    apiRequest(`/check-in-requests/${id}/reject`, {
      method: 'PATCH',
    }),
};