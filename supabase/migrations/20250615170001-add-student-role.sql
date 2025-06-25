-- Adicionar role 'student' ao tipo user_role
-- Primeiro, vamos verificar se o tipo existe e adicionar o valor 'student'
DO $$
BEGIN
    -- Verificar se o tipo user_role existe
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Adicionar 'student' ao enum se não existir
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
            AND enumlabel = 'student'
        ) THEN
            ALTER TYPE public.user_role ADD VALUE 'student';
        END IF;
    ELSE
        -- Se o tipo não existe, criar com todos os valores
        CREATE TYPE public.user_role AS ENUM ('free', 'premium', 'instructor', 'admin', 'moderator', 'student');
    END IF;
END $$;

-- Atualizar o valor padrão da tabela profiles para usar 'student' em vez de 'free'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'student';

-- Atualizar usuários existentes que têm role 'free' para 'student'
UPDATE public.profiles SET role = 'student' WHERE role = 'free'; 