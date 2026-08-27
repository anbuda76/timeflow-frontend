import api from './client';

// ── Albo Fornitori ──────────────────────────────────────────────────────────
export const getVendors     = ()           => api.get('/vendors').then(r => r.data);
export const createVendor   = (data)       => api.post('/vendors', data).then(r => r.data);
export const updateVendor   = (id, data)   => api.put(`/vendors/${id}`, data).then(r => r.data);
export const deleteVendor   = (id)         => api.delete(`/vendors/${id}`).then(r => r.data);

// ── Costi Esterni ────────────────────────────────────────────────────────────
export const getVendorCosts   = (params)     => api.get('/vendors/costs', { params }).then(r => r.data);
export const createVendorCost = (data)       => api.post('/vendors/costs', data).then(r => r.data);
export const updateVendorCost = (id, data)   => api.put(`/vendors/costs/${id}`, data).then(r => r.data);
export const deleteVendorCost = (id)         => api.delete(`/vendors/costs/${id}`).then(r => r.data);
