import api from './api';

export const attendanceService = {
  async getDailySheet(sectionId, date) {
    const response = await api.get('/attendance/daily-sheet', {
      params: { sectionId, date },
    });
    return response.data;
  },

  async submitDailyAttendance(data) {
    const response = await api.post('/attendance/submit', data);
    return response.data;
  },

  async syncAttendanceBatch(data) {
    const response = await api.post('/attendance/sync-batch', data);
    return response.data;
  },

  async checkHealth() {
    const response = await api.get('/health', { timeout: 4000 });
    return response.data;
  },

  async updateStudentRecord(recordId, data) {
    const response = await api.patch(`/attendance/records/${recordId}`, data);
    return response.data;
  },

  async getAuditLogs(params = {}) {
    const response = await api.get('/attendance/audit-logs', { params });
    return response.data;
  },

  async getSectionHistory(sectionId, month, year) {
    const response = await api.get('/attendance/history', {
      params: { sectionId, month, year },
    });
    return response.data;
  },

  async getStudentAttendance(studentId, params = {}) {
    const response = await api.get(`/attendance/student/${studentId}`, { params });
    return response.data;
  },

  async previewUniversityCalendar(data) {
    const response = await api.post('/attendance/university-calendar/preview', data);
    return response.data;
  },

  async applyUniversityCalendar(data) {
    const response = await api.post('/attendance/university-calendar/apply', data);
    return response.data;
  },
};

export default attendanceService;
