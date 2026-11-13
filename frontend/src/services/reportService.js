import api from './api';

const downloadBlob = (data, defaultFileName) => {
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', defaultFileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const reportService = {
  async getReportPreview(params) {
    const response = await api.get('/reports/preview', { params });
    return response.data;
  },

  async downloadMonthlyReport(params) {
    const response = await api.get('/reports/monthly', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      `Monthly_Attendance_Section_${params.sectionId || 'All'}_${params.month}_${params.year}.xlsx`
    );
  },

  async downloadUniversityReport(params) {
    const response = await api.get('/reports/university', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      `University_Attendance_${params.universityId}_${params.month}_${params.year}.xlsx`
    );
  },

  async downloadSemesterReport(params) {
    const response = await api.get('/reports/semester', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      `Semester_Attendance_${params.academicYear}_${params.startDate}_to_${params.endDate}.xlsx`
    );
  },

  async downloadStudentReport(params) {
    const response = await api.get('/reports/student', {
      params,
      responseType: 'blob',
    });
    downloadBlob(
      response.data,
      `Student_Attendance_${params.studentId}_Report.xlsx`
    );
  },
};

export default reportService;
