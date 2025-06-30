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
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  thumbnail_url?: string;
  thumbnail?: string;
  price: number;
  created_at: string;
  updated_at: string;
  instructor_name: string;
  instructor_avatar?: string;
  enrollment_count: number;
  rating: number;
  rating_count?: number;
  category?: string;
  level?: string;
  duration?: string;
  students_count?: number;
  tags?: string[];
  total_lessons?: number;
  total_duration?: number;
  enrolled_students_count?: number;
  user_rating?: number;
  rating_stats?: CourseRatingStats;
  instructor?: {
    id: string;
    name: string;
    avatar_url?: string;
    bio?: string;
    created_at: string;
  };
  modules?: ModuleWithLessons[];
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
  youtube_id?: string;
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
  course_id: string;
  course_title: string;
  instructor_id: string;
  instructor_name: string;
  instance_name: string;
  instance_description?: string;
  is_public: boolean;
  max_students?: number;
  current_students: number;
  start_date?: string;
  end_date?: string;
  schedule?: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassCourse {
  id: string;
  class_id: string;
  course_id: string;
  course_title: string;
  course_description?: string;
  course_thumbnail?: string;
  category?: string;
  level?: string;
  price?: number;
  instructor_name?: string;
  instructor_avatar?: string;
  is_required: boolean;
  order_index: number;
  created_at: string;
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
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
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
  class_instance_id: string;
  class_instance_name: string;
  course_id: string;
  course_title: string;
  is_public: boolean;
  user_role: 'student' | 'assistant' | 'instructor' | 'viewer';
  enrollment_status: 'active' | 'inactive' | 'suspended';
  instructor_name: string;
}

export interface ClassInstance {
  id: string;
  course_id: string;
  instructor_id: string;
  instance_name: string;
  instance_description?: string;
  is_public: boolean;
  is_active: boolean;
  max_students?: number;
  start_date?: string;
  end_date?: string;
  schedule?: string;
  location?: string;
  created_at: string;
  updated_at: string;
  instructor_name: string;
  course_title: string;
  current_students: number;
}

export interface ClassInstanceEnrollment {
  id: string;
  class_instance_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  enrolled_at: string;
  role: 'student' | 'assistant' | 'instructor';
  status: 'active' | 'inactive' | 'suspended';
}

export interface ClassInstanceContent {
  id: string;
  class_instance_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  title: string;
  content: string;
  content_type: 'announcement' | 'material' | 'assignment';
  is_pinned: boolean;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassInstanceWithDetails extends ClassInstance {
  enrollments: ClassInstanceEnrollment[];
  content: ClassInstanceContent[];
}

// Sistema de Comentários em Aulas
export interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar?: string;
  user_role: string;
  likes_count: number;
  replies_count: number;
  is_liked_by_user?: boolean;
  replies?: LessonComment[];
}

export interface CreateCommentData {
  lesson_id: string;
  content: string;
  parent_id?: string;
}

export interface UpdateCommentData {
  content: string;
}

// Sistema de Notificações
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'comment' | 'reply' | 'like' | 'system';
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationCount {
  unread_count: number;
  total_count: number;
}

// Sistema de Avaliações de Cursos
export interface CourseRating {
  id: string;
  course_id: string;
  user_id: string;
  rating: number; // 1-5 estrelas
  review?: string; // Comentário opcional
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar?: string;
  user_role: string;
}

export interface CourseRatingStats {
  course_id: string;
  total_ratings: number;
  average_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  satisfaction_percentage: number;
}

export interface CreateRatingData {
  course_id: string;
  rating: number;
  review?: string;
}

export interface UpdateRatingData {
  rating: number;
  review?: string;
}

// ===== TIPOS DO FÓRUM =====

export interface ForumTopic {
  id: string;
  title: string;
  description?: string;
  slug: string;
  is_active: boolean;
  is_pinned: boolean;
  order_index: number;
  created_by: string;
  created_by_name: string;
  created_by_avatar?: string;
  created_at: string;
  updated_at: string;
  posts_count: number;
  replies_count: number;
  last_activity?: string;
}

export interface ForumPost {
  id: string;
  topic_id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  author_role: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  replies_count: number;
  likes_count: number;
  favorites_count: number;
  is_liked_by_user: boolean;
  is_favorited_by_user: boolean;
  tags: string[];
}

export interface ForumReply {
  id: string;
  post_id: string;
  parent_reply_id?: string;
  content: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  author_role: string;
  is_solution: boolean;
  created_at: string;
  updated_at: string;
  likes_count: number;
  is_liked_by_user: boolean;
}

export interface ForumTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ForumPostDetail extends ForumPost {
  topic_title: string;
  topic_slug: string;
}

export interface ForumPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ForumTopicPosts {
  topic: ForumTopic;
  posts: ForumPost[];
  pagination: ForumPagination;
}

export interface ForumPostWithReplies {
  post: ForumPostDetail;
  replies: ForumReply[];
}
