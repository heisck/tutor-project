export const PROFILE_PATHS = {
  course: (courseId: string) => `/api/v1/courses/${courseId}`,
  courses: '/api/v1/courses',
  profile: '/api/v1/profile',
} as const;

export const ACADEMIC_LEVELS = [
  'high school',
  'undergraduate',
  'postgraduate',
  'professional',
] as const;

export type AcademicLevel = (typeof ACADEMIC_LEVELS)[number];

export interface InstitutionSummary {
  country: string | null;
  id: string;
  name: string;
  type: string | null;
}

export interface UserProfileResponse {
  authProvider: 'email' | 'google';
  department: string | null;
  email: string;
  emailVerified: boolean;
  id: string;
  institution: InstitutionSummary | null;
  level: AcademicLevel | null;
  role: 'student' | 'admin';
  username: string | null;
}

export interface CourseResponse {
  code: string | null;
  createdAt: string;
  examDate: string | null;
  id: string;
  level: string | null;
  name: string;
  updatedAt: string;
}

export interface CreateCourseRequest {
  code?: string | null;
  examDate?: string | null;
  level?: string | null;
  name: string;
}

export interface UpdateCourseRequest {
  code?: string | null;
  examDate?: string | null;
  level?: string | null;
  name?: string;
}
