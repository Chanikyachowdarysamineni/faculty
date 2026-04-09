import { AxiosInstance } from 'axios';
import API_CONFIG from '../constants/apiConfig';

export class FacultyService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAllFaculty(page = 1, limit = 100) {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.FACULTY, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getFacultyById(id: string) {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.FACULTY_BY_ID(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async addFaculty(data: any) {
    try {
      const response = await this.api.post(API_CONFIG.ENDPOINTS.FACULTY, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateFaculty(id: string, data: any) {
    try {
      const response = await this.api.put(
        API_CONFIG.ENDPOINTS.FACULTY_BY_ID(id),
        data
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteFaculty(id: string) {
    try {
      const response = await this.api.delete(
        API_CONFIG.ENDPOINTS.FACULTY_BY_ID(id)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export class CourseService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAllCourses(page = 1, limit = 100) {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.COURSES, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getCourseById(id: string) {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.COURSES_BY_ID(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async addCourse(data: any) {
    try {
      const response = await this.api.post(API_CONFIG.ENDPOINTS.COURSES, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateCourse(id: string, data: any) {
    try {
      const response = await this.api.put(
        API_CONFIG.ENDPOINTS.COURSES_BY_ID(id),
        data
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteCourse(id: string) {
    try {
      const response = await this.api.delete(
        API_CONFIG.ENDPOINTS.COURSES_BY_ID(id)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export class WorkloadService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAllWorkloads(page = 1, limit = 100) {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.WORKLOADS, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getWorkloadByFaculty(facultyId: string) {
    try {
      const response = await this.api.get(
        API_CONFIG.ENDPOINTS.WORKLOAD_BY_FACULTY(facultyId)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export class AllocationService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAllAllocations(page = 1, limit = 100) {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.ALLOCATIONS, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getAllocationsByFaculty(facultyId: string) {
    try {
      const response = await this.api.get(
        API_CONFIG.ENDPOINTS.ALLOCATIONS_BY_FACULTY(facultyId)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export class SubmissionService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getAllSubmissions(page = 1, limit = 100) {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.SUBMISSIONS, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getSubmissionsByFaculty(facultyId: string) {
    try {
      const response = await this.api.get(
        API_CONFIG.ENDPOINTS.SUBMISSIONS_BY_FACULTY(facultyId)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getSubmissionById(id: string) {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.SUBMISSION_BY_ID(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createSubmission(data: any) {
    try {
      const response = await this.api.post(API_CONFIG.ENDPOINTS.SUBMISSIONS, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateSubmission(id: string, data: any) {
    try {
      const response = await this.api.put(
        API_CONFIG.ENDPOINTS.SUBMISSION_BY_ID(id),
        data
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteSubmission(id: string) {
    try {
      const response = await this.api.delete(
        API_CONFIG.ENDPOINTS.SUBMISSION_BY_ID(id)
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export class SettingsService {
  private api: AxiosInstance;

  constructor(api: AxiosInstance) {
    this.api = api;
  }

  async getFormStatus() {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.FORM_STATUS);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getEditStatus() {
    try {
      const response = await this.api.get(API_CONFIG.ENDPOINTS.EDIT_STATUS);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateFormStatus(formEnabled: boolean) {
    try {
      const response = await this.api.put(API_CONFIG.ENDPOINTS.FORM_STATUS, {
        formEnabled,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateEditStatus(editEnabled: boolean) {
    try {
      const response = await this.api.put(API_CONFIG.ENDPOINTS.EDIT_STATUS, {
        editEnabled,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
