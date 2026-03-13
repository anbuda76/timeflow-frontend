import api from './client';

export const getHolidays = (year) =>
  api.get('/holidays/', { params: { year } }).then(r => r.data);

export const createHoliday = (data) =>
  api.post('/holidays/', data).then(r => r.data);

export const deleteHoliday = (id) =>
  api.delete(`/holidays/${id}`);

export const preloadItalianHolidays = (year) =>
  api.post(`/holidays/preload/${year}`).then(r => r.data);