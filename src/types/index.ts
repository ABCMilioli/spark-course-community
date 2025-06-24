import { Database } from "@/integrations/supabase/types";

export type Post = Database['public']['Tables']['posts']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type Module = Database['public']['Tables']['modules']['Row'];
export type Lesson = Database['public']['Tables']['lessons']['Row'];
export type Enrollment = Database['public']['Tables']['enrollments']['Row'];
export type LessonCompletion = Database['public']['Tables']['lesson_completions']['Row'];

export type PostWithAuthor = Post & {
  profiles: Profile | null;
};

export type CourseWithInstructor = Course & {
  profiles: Profile | null;
};

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
