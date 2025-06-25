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
  price: number;
  created_at: string;
  updated_at: string;
  instructor_name: string;
  instructor_avatar?: string;
  enrollment_count: number;
  rating: number;
  rating_count: number;
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
