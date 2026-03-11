import api from './client';

export const registerOrganization = (data) =>
  api.post('/register', data).then(r => r.data);

export const getMyOrganization = () =>
  api.get('/organizations/me').then(r => r.data);

export const updateMyOrganization = (data) =>
  api.patch('/organizations/me', data).then(r => r.data);