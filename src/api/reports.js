import api from './client';

export const getCostReport = (params) =>
  api.get('/reports/costs', { params }).then(r => r.data);

export const getMonthlyTrend = (params) =>
  api.get('/reports/monthly-trend', { params }).then(r => r.data);

export const exportExcel = async (params) => {
  const response = await api.get('/reports/export-excel', {
    params,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `timeflow_export_${params.year}_${String(params.month).padStart(2,'0')}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};