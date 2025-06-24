-- 1. Create custom types for user roles and course levels
CREATE TYPE public.user_role AS ENUM ('free', 'premium', 'instructor', 'admin', 'moderator');
CREATE TYPE public.course_level AS ENUM ('Iniciante', 'Intermediário', 'Avançado');

-- 2. Create profiles table to store public user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'free',
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Stores public user profile information.';

-- 3. Create courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    level public.course_level NOT NULL,
    duration TEXT,
    instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    students_count INT DEFAULT 0,
    rating NUMERIC(2,1) DEFAULT 0.0,
    price NUMERIC(10, 2) DEFAULT 0.00,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.courses IS 'Stores course information.';

-- 4. Create posts table
CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.posts IS 'Stores community posts.';

