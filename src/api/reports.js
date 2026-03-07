import api from './client';

export const getCostReport = (params) =>
  api.get('/reports/costs', { params }).then(r => r.data);