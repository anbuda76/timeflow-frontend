import api from './client';

export const getOrganizations = () =>
  api.get('/organizations/').then(r => r.data);

export const updateOrganization = (id, data) =>
  api.patch(`/organizations/${id}`, data).then(r => r.data);