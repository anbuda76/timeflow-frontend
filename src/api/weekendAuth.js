import api from './client';

export const getWeekendAuthorizations = (params) =>
  api.get('/weekend-auth/', { params }).then(r => r.data);

export const getMyWeekendAuthorizations = (params) =>
  api.get('/weekend-auth/my', { params }).then(r => r.data);

export const createWeekendAuthorization = (data) =>
  api.post('/weekend-auth/', data).then(r => r.data);

export const deleteWeekendAuthorization = (authId) =>
  api.delete(`/weekend-auth/${authId}`).then(r => r.data);

