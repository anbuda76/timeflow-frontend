import api from './client';

export const getCostReport = (params) =>
  api.get('/reports/costs', { params }).then(r => r.data);

export const getMonthlyTrend = (params) =>
  api.get('/reports/monthly-trend', { params }).then(r => r.data);