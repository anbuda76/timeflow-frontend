import api from './client';

export const getTimesheet = (id) =>
  api.get(`/timesheets/${id}`).then(r => r.data);

export const reviewTimesheet = (id, approved, rejection_note) =>
  api.post(`/timesheets/${id}/review`, { approved, rejection_note }).then(r => r.data);