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

export interface PublicProfile {
  id: string;
  name: string;
  role: 'student' | 'instructor' | 'admin';
  bio?: string;
  avatar_url?: string;
  created_at: string;
  stats: {
    posts_count: number;
    courses_enrolled: number;
    forum_posts_count: number;
  };
  recent_posts: Post[];
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
  type: 'comment' | 'reply' | 'like' | 'system' | 'forum_reply' | 'forum_new_post' | 'community_new_post' | 'community_comment';
  reference_id?: string;
  reference_type?: 'forum_post' | 'forum_topic' | 'forum_reply' | 'course' | 'lesson' | 'lesson_comment' | 'community_post' | 'class';
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
  cover_image_url?: string;
  banner_image_url?: string;
}

export interface ForumPost {
  id: string;
  topic_id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  author_name?: string;
  author_avatar?: string;
  author_role?: string;
  likes_count?: number;
  favorites_count?: number;
  replies_count?: number;
  is_liked_by_user?: boolean;
  is_favorited_by_user?: boolean;
  tags?: string[];
  topic_title?: string;
  topic_slug?: string;
  content_image_url?: string;
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

// ===== SISTEMA DE MENSAGENS =====
export interface Conversation {
  id: string;
  title?: string;
  type: 'direct' | 'group';
  created_at: string;
  updated_at: string;
  last_message_content?: string;
  last_message_at?: string;
  last_message_sender_id?: string;
  last_message_sender_name?: string;
  last_message_sender_avatar?: string;
  unread_count?: number;
  participants?: ConversationParticipant[];
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_role: string;
  joined_at: string;
  last_read_at?: string;
  is_active: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_message_id?: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  sender_name: string;
  sender_avatar?: string;
  sender_role: string;
  reply_to_message?: Message;
}

export interface CreateMessageData {
  content: string;
  message_type?: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  reply_to_message_id?: string;
}

export interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
  participants: ConversationParticipant[];
}

// Sistema de Webhooks
export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret_key?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  response_status?: number;
  response_body?: string;
  error_message?: string;
  attempt_count: number;
  is_success: boolean;
  created_at: string;
}

export interface CreateWebhookData {
  name: string;
  url: string;
  events: string[];
  is_active?: boolean;
  secret_key?: string;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: string[];
  is_active?: boolean;
  secret_key?: string;
}

// Tipos de eventos disponíveis
export const WEBHOOK_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  COURSE_CREATED: 'course.created',
  COURSE_UPDATED: 'course.updated',
  COURSE_DELETED: 'course.deleted',
  POST_CREATED: 'post.created',
  POST_UPDATED: 'post.updated',
  POST_DELETED: 'post.deleted',
  ENROLLMENT_CREATED: 'enrollment.created',
  ENROLLMENT_COMPLETED: 'enrollment.completed',
  CLASS_CREATED: 'class.created',
  CLASS_UPDATED: 'class.updated',
  CLASS_DELETED: 'class.deleted',
  LESSON_COMPLETED: 'lesson.completed',
  COMMENT_CREATED: 'comment.created',
  COMMENT_UPDATED: 'comment.updated',
  COMMENT_DELETED: 'comment.deleted',
  LESSON_COMMENT_CREATED: 'lesson_comment.created',
  LESSON_COMMENT_UPDATED: 'lesson_comment.updated',
  LESSON_COMMENT_DELETED: 'lesson_comment.deleted',
  FORUM_REPLY_CREATED: 'forum_reply.created',
  FORUM_REPLY_UPDATED: 'forum_reply.updated',
  FORUM_REPLY_DELETED: 'forum_reply.deleted',
  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS];

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  [WEBHOOK_EVENTS.USER_CREATED]: 'Usuário Criado',
  [WEBHOOK_EVENTS.USER_UPDATED]: 'Usuário Atualizado',
  [WEBHOOK_EVENTS.USER_DELETED]: 'Usuário Deletado',
  [WEBHOOK_EVENTS.COURSE_CREATED]: 'Curso Criado',
  [WEBHOOK_EVENTS.COURSE_UPDATED]: 'Curso Atualizado',
  [WEBHOOK_EVENTS.COURSE_DELETED]: 'Curso Deletado',
  [WEBHOOK_EVENTS.POST_CREATED]: 'Post Criado',
  [WEBHOOK_EVENTS.POST_UPDATED]: 'Post Atualizado',
  [WEBHOOK_EVENTS.POST_DELETED]: 'Post Deletado',
  [WEBHOOK_EVENTS.ENROLLMENT_CREATED]: 'Matrícula Criada',
  [WEBHOOK_EVENTS.ENROLLMENT_COMPLETED]: 'Matrícula Concluída',
  [WEBHOOK_EVENTS.CLASS_CREATED]: 'Turma Criada',
  [WEBHOOK_EVENTS.CLASS_UPDATED]: 'Turma Atualizada',
  [WEBHOOK_EVENTS.CLASS_DELETED]: 'Turma Deletada',
  [WEBHOOK_EVENTS.LESSON_COMPLETED]: 'Aula Concluída',
  [WEBHOOK_EVENTS.COMMENT_CREATED]: 'Comentário Criado',
  [WEBHOOK_EVENTS.COMMENT_UPDATED]: 'Comentário Atualizado',
  [WEBHOOK_EVENTS.COMMENT_DELETED]: 'Comentário Deletado',
  [WEBHOOK_EVENTS.LESSON_COMMENT_CREATED]: 'Comentário de Aula Criado',
  [WEBHOOK_EVENTS.LESSON_COMMENT_UPDATED]: 'Comentário de Aula Atualizado',
  [WEBHOOK_EVENTS.LESSON_COMMENT_DELETED]: 'Comentário de Aula Deletado',
  [WEBHOOK_EVENTS.FORUM_REPLY_CREATED]: 'Resposta do Fórum Criada',
  [WEBHOOK_EVENTS.FORUM_REPLY_UPDATED]: 'Resposta do Fórum Atualizada',
  [WEBHOOK_EVENTS.FORUM_REPLY_DELETED]: 'Resposta do Fórum Deletada',
  [WEBHOOK_EVENTS.NOTIFICATION_CREATED]: 'Notificação Criada',
};

// Sistema de Campanhas de Email
export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  campaign_type: 'post' | 'forum' | 'course' | 'lesson' | 'class_material' | 'custom';
  target_audience: 'all' | 'instructors' | 'students' | 'specific_classes' | 'custom_filter';
  target_classes?: string[];
  custom_filter?: any;
  scheduled_at?: string;
  sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  reference_id?: string;
  reference_type?: string;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  creator_name?: string;
  recipients_count?: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject_template: string;
  html_template: string;
  text_template?: string;
  campaign_type: 'post' | 'forum' | 'course' | 'lesson' | 'class_material' | 'custom';
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface EmailRecipient {
  id: string;
  campaign_id: string;
  user_id: string;
  email: string;
  name: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounce_reason?: string;
  created_at: string;
}

export interface EmailSendLog {
  id: string;
  campaign_id: string;
  recipient_id: string;
  user_id: string;
  email: string;
  action: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  details?: any;
  created_at: string;
  user_name?: string;
}

export interface CampaignStats {
  campaign: EmailCampaign;
  stats: {
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    opened_count: number;
    clicked_count: number;
    bounced_count: number;
    failed_count: number;
  };
  recent_logs: EmailSendLog[];
}

export interface RecipientPreview {
  count: number;
  recipients: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
}

export interface ContentData {
  post_title?: string;
  post_excerpt?: string;
  post_url?: string;
  author_name?: string;
  created_at?: string;
  topic_title?: string;
  course_title?: string;
  course_description?: string;
  course_url?: string;
  instructor_name?: string;
  total_lessons?: number;
  course_level?: string;
  course_duration?: string;
  lesson_title?: string;
  lesson_description?: string;
  lesson_url?: string;
  module_title?: string;
  lesson_duration?: string;
  material_title?: string;
  material_description?: string;
  material_url?: string;
  class_name?: string;
  material_type?: string;
}
