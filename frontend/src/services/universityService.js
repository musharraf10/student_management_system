import api from './api';

export const universityService = {
  async getUniversities(params = {}) {
    const response = await api.get('/universities', { params });
    return response.data;
  },

  async getUniversityById(id) {
    const response = await api.get(`/universities/${id}`);
    return response.data;
  },

  async createUniversity(data) {
    const response = await api.post('/universities', data);
    return response.data;
  },

  async updateUniversity(id, data) {
    const response = await api.put(`/universities/${id}`, data);
    return response.data;
  },
};

export default universityService;
