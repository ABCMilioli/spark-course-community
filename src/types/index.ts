import { Database } from "@/integrations/supabase/types";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  bio?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  favorites_count: number;
  category?: string;
  tags?: string[];
  author_name: string;
  author_avatar?: string;
  cover_image?: string;
  video_url?: string;
}

export interface PostWithAuthor extends Post {
  author: Profile;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  instructor_id: number;
  thumbnail_url?: string;
  thumbnail?: string;
  price: number;
  created_at: string;
  updated_at: string;
  instructor_name: string;
  instructor_avatar?: string;
  enrollment_count: number;
  rating: number;
  rating_count: number;
  category?: string;
  level?: string;
}

export interface CourseWithInstructor extends Course {
  instructor: Profile;
}

export interface Enrollment {
  id: number;
  user_id: number;
  course_id: number;
  enrolled_at: string;
  progress: number;
  completed_at?: string;
  course_title: string;
  course_description: string;
  course_thumbnail?: string;
  instructor_name?: string;
}

export interface Module {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  order_index: number;
  is_visible: boolean;
  lessons: Lesson[];
}

export interface Lesson {
  id: number;
  module_id: number;
  title: string;
  description?: string;
  video_url?: string;
  duration?: number;
  order_index: number;
  is_free: boolean;
  is_visible: boolean;
  release_days: number;
}

export interface Comment {
  id: number;
  post_id: number;
  author_id: number;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar?: string;
}

export interface DashboardStats {
  total_users: number;
  total_courses: number;
  total_posts: number;
  total_enrollments: number;
  recent_users: Profile[];
  recent_courses: Course[];
  recent_posts: Post[];
}

// For Courses page
export type EnrolledCourse = CourseWithInstructor & {
  progress: number | null;
};

// For Video Player page
export type LessonWithCompletion = Lesson & {
  isCompleted: boolean;
};

export type ModuleWithLessons = Module & {
  lessons: LessonWithCompletion[];
};

export type CourseForPlayer = CourseWithInstructor & {
  modules: ModuleWithLessons[];
  progressPercentage: number | null;
};

// For Course Admin page
export type ModuleWithLessonsAdmin = Module & {
  lessons: Lesson[];
};

export type CourseForAdmin = CourseWithInstructor & {
  modules: ModuleWithLessonsAdmin[];
};

// Sistema de Turmas
export interface Class {
  id: string;
  name: string;
  description?: string;
  instructor_id: string;
  instructor_name: string;
  is_public: boolean;
  is_active: boolean;
  max_students?: number;
  current_students: number;
  created_at: string;
  updated_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  enrolled_at: string;
  role: 'student' | 'assistant' | 'instructor';
  status: 'active' | 'inactive' | 'suspended';
}

export interface ClassCourse {
  id: string;
  class_id: string;
  course_id: string;
  course_title: string;
  course_description?: string;
  course_thumbnail?: string;
  is_required: boolean;
  order_index: number;
  created_at: string;
}

export interface ClassContent {
  id: string;
  class_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  title: string;
  content: string;
  content_type: 'announcement' | 'material' | 'assignment';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassWithDetails extends Class {
  enrollments: ClassEnrollment[];
  courses: ClassCourse[];
  recent_content: ClassContent[];
}

export interface UserClassAccess {
  user_id: string;
  user_name: string;
  user_email: string;
  class_id: string;
  class_name: string;
  is_public: boolean;
  user_role: 'student' | 'assistant' | 'instructor' | 'viewer';
  enrollment_status: 'active' | 'inactive' | 'suspended';
  instructor_name: string;
}
