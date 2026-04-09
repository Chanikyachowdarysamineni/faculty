// API configuration for mobile app
// Update BASE_URL to match your backend server

const API_CONFIG = {
  // Update this to your backend server URL
  BASE_URL: 'http://192.168.1.your-ip:5000', // For development
  // For production:
  // BASE_URL: 'https://your-production-url.com',
  
  TIMEOUT: 10000,
  
  ENDPOINTS: {
    // Auth
    LOGIN: '/deva/auth/login',
    LOGOUT: '/deva/auth/logout',
    REFRESH_TOKEN: '/deva/auth/refresh',
    
    // Faculty
    FACULTY: '/deva/faculty',
    FACULTY_BY_ID: (id) => `/deva/faculty/${id}`,
    
    // Courses
    COURSES: '/deva/courses',
    COURSES_BY_ID: (id) => `/deva/courses/${id}`,
    
    // Workload
    WORKLOADS: '/deva/workloads',
    WORKLOAD_BY_FACULTY: (facultyId) => `/deva/workloads/faculty/${facultyId}`,
    
    // Allocations
    ALLOCATIONS: '/deva/allocations',
    ALLOCATIONS_BY_FACULTY: (facultyId) => `/deva/allocations/faculty/${facultyId}`,
    
    // Submissions
    SUBMISSIONS: '/deva/submissions',
    SUBMISSIONS_BY_FACULTY: (facultyId) => `/deva/submissions/faculty/${facultyId}`,
    SUBMISSION_BY_ID: (id) => `/deva/submissions/${id}`,
    
    // Settings
    SETTINGS: '/deva/settings',
    FORM_STATUS: '/deva/settings/form-status',
    EDIT_STATUS: '/deva/settings/edit-status',
    
    // Stats
    STATS: '/deva/stats',
  }
};

export default API_CONFIG;
