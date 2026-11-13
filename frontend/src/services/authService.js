import api from './api';

export const authService = {
  /**
   * Log in user
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Fetch current authenticated user profile
   */
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Initial Super Admin (Zonal Manager) setup
   * @param {Object} adminData
   */
  async setupInitialAdmin(adminData) {
    const response = await api.post('/auth/setup-admin', adminData);
    return response.data;
  },
};

export default authService;
