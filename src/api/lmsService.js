import { apiFetch } from '../lib/api';

export const lmsService = {
  // Admin / HR
  async getAllAdmin() {
    try {
      const response = await apiFetch('/api/lms/courses');
      if (!response.ok) throw new Error('Error fetching courses');
      return await response.json();
    } catch (error) {
      console.error('Error fetching admin courses:', error);
      return [];
    }
  },

  async getStats() {
    try {
      const response = await apiFetch('/api/lms/stats');
      if (!response.ok) throw new Error('Error fetching stats');
      return await response.json();
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      return { coursesCount: 0, enrollmentsCount: 0, certsCount: 0 };
    }
  },

  async saveCourse(courseData) {
    try {
      const url = courseData.id ? `/api/lms/courses/${courseData.id}` : '/api/lms/courses';
      const method = courseData.id ? 'PUT' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(courseData)
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error saving course');
      }
      return await response.json();
    } catch (error) {
      console.error('Error saving course:', error);
      throw error;
    }
  },

  // Student
  async getMyCourses() {
    try {
      const response = await apiFetch('/api/lms/my-courses');
      if (!response.ok) throw new Error('Error fetching my courses');
      const data = await response.json();
      
      return data.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnail: c.thumbnail || "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=400",
        category: c.level || 'GENERAL',
        duration: "2.5h", // Ideally calculated from modules
        lessons: c.modules?.reduce((acc, m) => acc + m.lessons.length, 0) || 0,
        progress: c.progress || 0,
        completed: c.completed || false,
        isEnrolled: c.isEnrolled || false,
      }));
    } catch (error) {
      console.error('Error fetching my courses:', error);
      return [];
    }
  },

  async getCourse(id) {
    try {
      const response = await apiFetch(`/api/lms/courses/${id}`);
      if (!response.ok) throw new Error('Course not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  },

  async enrollCourse(courseId) {
    try {
      const response = await apiFetch('/api/lms/enroll', {
        method: 'POST',
        body: JSON.stringify({ courseId })
      });
      if (!response.ok) throw new Error('Error enrolling');
      return await response.json();
    } catch (error) {
      console.error('Error enrolling:', error);
      throw error;
    }
  },

  async updateLessonProgress(courseId, lessonId, isComplete) {
    try {
      const response = await apiFetch('/api/lms/progress', {
        method: 'POST',
        body: JSON.stringify({ courseId, lessonId, isComplete })
      });
      if (!response.ok) throw new Error('Error updating progress');
      return await response.json(); // { progressPct, completedLessonsCount }
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  },

  async completeCourse(courseId, passedExam) {
    try {
      const response = await apiFetch('/api/lms/complete-course', {
        method: 'POST',
        body: JSON.stringify({ courseId, passedExam })
      });
      if (!response.ok) throw new Error('Error completing course');
      return await response.json(); // { enrollment, certificate }
    } catch (error) {
      console.error('Error completing course:', error);
      throw error;
    }
  }
};
