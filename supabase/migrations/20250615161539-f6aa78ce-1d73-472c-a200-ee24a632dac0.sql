-- Table for user enrollments in courses
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    progress INT DEFAULT 0, -- Percentage
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, course_id)
);
COMMENT ON TABLE public.enrollments IS 'Tracks user enrollment and progress in courses.';

-- Table for course modules
CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    module_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.modules IS 'Stores modules for each course.';

-- Table for lessons within modules
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    youtube_id TEXT, -- For video content
    duration TEXT,
    lesson_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.lessons IS 'Stores lessons for each module.';

-- Table to track completed lessons by users
CREATE TABLE public.lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);
COMMENT ON TABLE public.lesson_completions IS 'Tracks which lessons a user has completed.';
