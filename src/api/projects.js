import api from './client';

export const getProjects = () =>
  api.get('/projects').then(r => r.data);

export const createProject = (data) =>
  api.post('/projects', data).then(r => r.data);

export const updateProject = (id, data) =>
  api.patch(`/projects/${id}`, data).then(r => r.data);

export const assignUser = (projectId, userId) =>
  api.post(`/projects/${projectId}/assign/${userId}`).then(r => r.data);

export const unassignUser = (projectId, userId) =>
  api.delete(`/projects/${projectId}/assign/${userId}`).then(r => r.data);