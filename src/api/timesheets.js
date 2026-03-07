import api from './client';

export const getTimesheets = (params) =>
  api.get('/timesheets', { params }).then(r => r.data);

export const getTimesheet = (id) =>
  api.get(`/timesheets/${id}`).then(r => r.data);

export const createTimesheet = (data) =>
  api.post('/timesheets', data).then(r => r.data);

export const saveEntries = (id, entries) =>
  api.put(`/timesheets/${id}/entries`, entries).then(r => r.data);

export const submitTimesheet = (id, notes) =>
  api.post(`/timesheets/${id}/submit`, { notes }).then(r => r.data);

export const getProjects = () =>
  api.get('/projects').then(r => r.data);

export const getHolidays = (year) =>
  api.get('/holidays', { params: { year } }).then(r => r.data);