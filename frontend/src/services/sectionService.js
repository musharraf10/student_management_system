import api from './api';

export const sectionService = {
  async getSections(params = {}) {
    const response = await api.get('/sections', { params });
    return response.data;
  },

  async getSectionById(id) {
    const response = await api.get(`/sections/${id}`);
    return response.data;
  },

  async createSection(data) {
    const response = await api.post('/sections', data);
    return response.data;
  },

  async updateSection(id, data) {
    const response = await api.put(`/sections/${id}`, data);
    return response.data;
  },
};

export default sectionService;
