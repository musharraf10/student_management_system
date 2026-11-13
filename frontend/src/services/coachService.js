import api from './api';

export const coachService = {
  async getCoaches(params = {}) {
    const response = await api.get('/coaches', { params });
    return response.data;
  },

  async getCoachById(id) {
    const response = await api.get(`/coaches/${id}`);
    return response.data;
  },

  async createCoach(data) {
    const response = await api.post('/coaches', data);
    return response.data;
  },

  async updateCoach(id, data) {
    const response = await api.put(`/coaches/${id}`, data);
    return response.data;
  },

  async updateCoachPermissions(id, permissions) {
    const response = await api.patch(`/coaches/${id}/permissions`, { permissions });
    return response.data;
  },
};

export default coachService;
