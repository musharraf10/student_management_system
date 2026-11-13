import api from './api';

export const studentService = {
  async getStudents(params = {}) {
    const response = await api.get('/students', { params });
    return response.data;
  },

  async getStudentById(id) {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  async createStudent(data) {
    const response = await api.post('/students', data);
    return response.data;
  },

  async updateStudent(id, data) {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  async transferStudent(id, newSectionId) {
    const response = await api.patch(`/students/${id}/transfer`, { newSectionId });
    return response.data;
  },

  async deactivateStudent(id, reason = '') {
    const response = await api.patch(`/students/${id}/deactivate`, { reason });
    return response.data;
  },

  async restoreStudent(id) {
    const response = await api.patch(`/students/${id}/restore`);
    return response.data;
  },

  async previewStudentsExcel(formData) {
    const response = await api.post('/students/preview-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async importStudentsExcel(formData) {
    const response = await api.post('/students/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async exportStudentsExcel(params = {}) {
    const response = await api.get('/students/export-excel', {
      params,
      responseType: 'blob',
    });

    // Create a download link for the Excel file
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Students_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default studentService;
