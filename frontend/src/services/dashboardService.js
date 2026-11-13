import api from './api';

export const dashboardService = {
  async getDashboardStats(params = {}) {
    const response = await api.get('/dashboard/stats', { params });
    return response.data;
  },

  async getUniversityDashboard(universityId, params = {}) {
    const response = await api.get(`/dashboard/university/${universityId}`, { params });
    return response.data;
  },
};

export default dashboardService;
