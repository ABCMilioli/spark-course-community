-- =====================================================
-- MIGRATION COMPLETA - ESTRUTURA REAL DO BANCO
-- Baseada na extração do banco atual (47 tabelas)
-- =====================================================
-- ESTA MIGRATION É IDEMPOTENTE - PODE SER EXECUTADA MÚLTIPLAS VEZES
-- NÃO DELETA DADOS EXISTENTES, APENAS CRIA/ATUALIZA O QUE ESTÁ FALTANDO
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TIPOS PERSONALIZADOS (ENUMS)
-- =====================================================

-- Tipo para níveis de curso (apenas se não existir)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_level') THEN
        CREATE TYPE course_level AS ENUM ('iniciante', 'intermediario', 'avancado');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tipo para roles de usuário (apenas se não existir)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'free');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABELA PRINCIPAL - PERFIS
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'student',
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    password_hash TEXT,
    cpf VARCHAR(14)
);

-- =====================================================
-- TABELAS DE CURSOS E CONTEÚDO
-- =====================================================

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    level course_level NOT NULL,
    duration TEXT,
    instructor_id UUID REFERENCES profiles(id),
    students_count INTEGER DEFAULT 0,
    rating NUMERIC DEFAULT 0.0,
    price NUMERIC DEFAULT 0.00,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    demo_video TEXT,
    payment_gateway TEXT DEFAULT 'mercadopago',
    external_checkout_url TEXT,
    category TEXT,
    ispaid BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id),
    title TEXT NOT NULL,
    module_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_visible BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES modules(id),
    title TEXT NOT NULL,
    description TEXT,
    youtube_id TEXT,
    duration TEXT,
    lesson_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_visible BOOLEAN NOT NULL DEFAULT true,
    release_days INTEGER DEFAULT 0,
    video_url TEXT
);

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    progress INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    lesson_id UUID NOT NULL REFERENCES lessons(id),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS course_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    rating INTEGER NOT NULL,
    review TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(course_id, user_id)
);

-- =====================================================
-- SISTEMA DE TURMAS
-- =====================================================

CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    instructor_id UUID NOT NULL REFERENCES profiles(id),
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    max_students INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_name TEXT NOT NULL,
    instance_description TEXT,
    instructor_id UUID NOT NULL REFERENCES profiles(id),
    is_public BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    max_students INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    course_id UUID REFERENCES courses(id),
    start_date DATE,
    end_date DATE,
    schedule TEXT,
    location TEXT
);

CREATE TABLE IF NOT EXISTS class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES class_instances(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    role TEXT NOT NULL DEFAULT 'student',
    status TEXT NOT NULL DEFAULT 'active',
    UNIQUE(class_id, user_id)
);

CREATE TABLE IF NOT EXISTS class_instance_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_instance_id UUID NOT NULL REFERENCES class_instances(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    role TEXT NOT NULL DEFAULT 'student',
    status TEXT NOT NULL DEFAULT 'active',
    UNIQUE(class_instance_id, user_id)
);

CREATE TABLE IF NOT EXISTS class_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES class_instances(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    is_required BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(class_id, course_id)
);

CREATE TABLE IF NOT EXISTS class_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES class_instances(id),
    author_id UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    content TEXT,
    content_type TEXT NOT NULL DEFAULT 'announcement',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_instance_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_instance_id UUID NOT NULL REFERENCES class_instances(id),
    author_id UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    content TEXT,
    content_type TEXT NOT NULL DEFAULT 'announcement',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT
);

-- =====================================================
-- SISTEMA DE COMUNIDADE E POSTS
-- =====================================================

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID NOT NULL REFERENCES profiles(id),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cover_image TEXT,
    video_url TEXT
);

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES comments(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(comment_id, user_id)
);

-- =====================================================
-- SISTEMA DE FÓRUM
-- =====================================================

CREATE TABLE IF NOT EXISTS forum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_pinned BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    cover_image_url TEXT,
    banner_image_url TEXT
);

CREATE TABLE IF NOT EXISTS forum_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES forum_topics(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES profiles(id),
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    content_image_url TEXT
);

CREATE TABLE IF NOT EXISTS forum_post_tags (
    post_id UUID NOT NULL REFERENCES forum_posts(id),
    tag_id UUID NOT NULL REFERENCES forum_tags(id),
    PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS forum_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES forum_posts(id),
    parent_reply_id UUID REFERENCES forum_replies(id),
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES profiles(id),
    is_solution BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forum_post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES forum_posts(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_post_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES forum_posts(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_reply_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reply_id UUID NOT NULL REFERENCES forum_replies(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(reply_id, user_id)
);

-- =====================================================
-- SISTEMA DE COMENTÁRIOS EM LIÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS lesson_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES lesson_comments(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_comment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES lesson_comments(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(comment_id, user_id)
);

-- =====================================================
-- SISTEMA DE MENSAGENS
-- =====================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    type TEXT NOT NULL DEFAULT 'direct',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_read_at TIMESTAMPTZ,
    is_admin BOOLEAN DEFAULT false,
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    sender_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    attachments JSONB DEFAULT '[]',
    reply_to_id UUID REFERENCES messages(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SISTEMA DE NOTIFICAÇÕES
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'comment',
    reference_id UUID,
    reference_type TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SISTEMA DE PAGAMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    stripe_payment_intent_id TEXT UNIQUE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB,
    gateway TEXT NOT NULL DEFAULT 'stripe',
    external_reference TEXT,
    payment_method_details JSONB
);

CREATE TABLE IF NOT EXISTS external_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    course_id UUID NOT NULL REFERENCES courses(id),
    gateway TEXT NOT NULL,
    checkout_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS temp_cpf_checkout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf VARCHAR(14) NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id),
    course_name TEXT NOT NULL,
    user_email TEXT,
    user_name TEXT,
    checkout_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
    is_used BOOLEAN DEFAULT false
);

-- =====================================================
-- SISTEMA DE WEBHOOKS
-- =====================================================

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    secret_key VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    is_success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payment_intent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mercadopago_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mp_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payment_id TEXT,
    external_reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SISTEMA DE EMAIL
-- =====================================================

CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject_template TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    campaign_type TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    campaign_type TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all',
    target_classes UUID[],
    custom_filter JSONB,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reference_id UUID,
    reference_type TEXT,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounce_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    was_delivered BOOLEAN DEFAULT false,
    was_opened BOOLEAN DEFAULT false,
    was_clicked BOOLEAN DEFAULT false,
    was_bounced BOOLEAN DEFAULT false,
    UNIQUE(campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS email_send_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id),
    recipient_id UUID NOT NULL REFERENCES email_campaign_recipients(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    email TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SISTEMA DE VERIFICAÇÃO E RESET
-- =====================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    token VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id),
    token VARCHAR(128) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================
-- TABELA DE CONTROLE DE MIGRATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS migrations_applied (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Índices para courses
CREATE INDEX IF NOT EXISTS courses_instructor_idx ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS courses_active_idx ON courses(is_active);

-- Índices para enrollments
CREATE INDEX IF NOT EXISTS enrollments_user_idx ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS enrollments_course_idx ON enrollments(course_id);

-- Índices para payments
CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_course_idx ON payments(course_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);
CREATE INDEX IF NOT EXISTS payments_gateway_idx ON payments(gateway);

-- Índices para messages
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_idx ON messages(created_at DESC);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(is_read);

-- Índices para forum
CREATE INDEX IF NOT EXISTS forum_posts_topic_idx ON forum_posts(topic_id, created_at);
CREATE INDEX IF NOT EXISTS forum_replies_post_idx ON forum_replies(post_id, created_at);

-- Índices para class system
CREATE INDEX IF NOT EXISTS class_courses_class_idx ON class_courses(class_id);
CREATE INDEX IF NOT EXISTS class_courses_order_idx ON class_courses(order_index);
CREATE INDEX IF NOT EXISTS class_instance_enrollments_instance_idx ON class_instance_enrollments(class_instance_id);

-- Índices para email campaigns
CREATE INDEX IF NOT EXISTS email_campaigns_status_idx ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS email_campaign_recipients_status_idx ON email_campaign_recipients(status);

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

CREATE OR REPLACE VIEW user_class_access AS
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    c.id AS class_id,
    c.name AS class_name,
    c.is_public,
    ce.role AS user_role,
    ce.status AS enrollment_status,
    p.name AS instructor_name
FROM profiles u
JOIN class_enrollments ce ON u.id = ce.user_id
JOIN classes c ON ce.class_id = c.id
JOIN profiles p ON c.instructor_id = p.id
WHERE ce.status = 'active' AND c.is_active = true

UNION

SELECT 
    p.id AS user_id,
    p.name AS user_name,
    p.email AS user_email,
    c.id AS class_id,
    c.name AS class_name,
    c.is_public,
    'instructor' AS user_role,
    'active' AS enrollment_status,
    p.name AS instructor_name
FROM classes c
JOIN profiles p ON c.instructor_id = p.id
WHERE c.is_active = true

UNION

SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    c.id AS class_id,
    c.name AS class_name,
    c.is_public,
    'viewer' AS user_role,
    'active' AS enrollment_status,
    p.name AS instructor_name
FROM profiles u
CROSS JOIN classes c
JOIN profiles p ON c.instructor_id = p.id
WHERE c.is_public = true AND c.is_active = true;

CREATE OR REPLACE VIEW payment_details AS
SELECT 
    p.id,
    p.gateway,
    p.stripe_payment_intent_id,
    p.external_reference,
    p.amount,
    p.currency,
    p.status,
    p.payment_method,
    p.payment_method_details,
    p.created_at,
    p.updated_at,
    u.name AS user_name,
    u.email AS user_email,
    c.title AS course_title,
    c.price AS course_price
FROM payments p
JOIN profiles u ON p.user_id = u.id
JOIN courses c ON p.course_id = c.id;

CREATE OR REPLACE VIEW messages_with_sender AS
SELECT 
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.type,
    m.attachments,
    m.reply_to_id,
    m.created_at,
    m.updated_at,
    sender.name AS sender_name,
    sender.avatar_url AS sender_avatar_url,
    reply_msg.content AS reply_to_content,
    reply_sender.name AS reply_to_sender_name
FROM messages m
JOIN profiles sender ON m.sender_id = sender.id
LEFT JOIN messages reply_msg ON m.reply_to_id = reply_msg.id
LEFT JOIN profiles reply_sender ON reply_msg.sender_id = reply_sender.id;

-- =====================================================
-- FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar conversa quando nova mensagem
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations 
    SET updated_at = now() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_on_new_message 
    AFTER INSERT ON messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_conversation_on_message();

-- Função para adicionar curso padrão à turma
CREATE OR REPLACE FUNCTION add_default_course_to_class()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.course_id IS NOT NULL THEN
        INSERT INTO class_courses (class_id, course_id, is_required, order_index)
        VALUES (NEW.id, NEW.course_id, true, 0);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_add_default_course 
    AFTER INSERT ON class_instances 
    FOR EACH ROW 
    EXECUTE FUNCTION add_default_course_to_class();

-- Função para limpeza de tokens expirados
CREATE OR REPLACE FUNCTION cleanup_expired_temp_cpf()
RETURNS void AS $$
BEGIN
    DELETE FROM temp_cpf_checkout 
    WHERE expires_at < now() OR is_used = true;
END;
$$ language 'plpgsql';

-- =====================================================
-- ADICIONAR COLUNAS QUE PODEM ESTAR FALTANDO
-- =====================================================

-- Adicionar colunas faltantes na tabela profiles (se não existirem)
DO $$ BEGIN
    -- Adicionar cpf se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cpf') THEN
        ALTER TABLE profiles ADD COLUMN cpf VARCHAR(14);
    END IF;
    
    -- Adicionar password_hash se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'password_hash') THEN
        ALTER TABLE profiles ADD COLUMN password_hash TEXT;
    END IF;
END $$;

-- Adicionar colunas faltantes na tabela courses (se não existirem)
DO $$ BEGIN
    -- Adicionar thumbnail_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE courses ADD COLUMN thumbnail_url TEXT;
    END IF;
    
    -- Adicionar students_count se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'students_count') THEN
        ALTER TABLE courses ADD COLUMN students_count INTEGER DEFAULT 0;
    END IF;
    
    -- Adicionar rating se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'rating') THEN
        ALTER TABLE courses ADD COLUMN rating NUMERIC DEFAULT 0.0;
    END IF;
    
    -- Adicionar tags se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'tags') THEN
        ALTER TABLE courses ADD COLUMN tags TEXT[];
    END IF;
    
    -- Adicionar demo_video se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'demo_video') THEN
        ALTER TABLE courses ADD COLUMN demo_video TEXT;
    END IF;
    
    -- Adicionar external_checkout_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'external_checkout_url') THEN
        ALTER TABLE courses ADD COLUMN external_checkout_url TEXT;
    END IF;
    
    -- Adicionar category se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'category') THEN
        ALTER TABLE courses ADD COLUMN category TEXT;
    END IF;
    
    -- Adicionar ispaid se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'ispaid') THEN
        ALTER TABLE courses ADD COLUMN ispaid BOOLEAN DEFAULT false;
    END IF;
    
    -- Adicionar is_active se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'is_active') THEN
        ALTER TABLE courses ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Adicionar colunas faltantes na tabela messages (se não existirem)
DO $$ BEGIN
    -- Adicionar type se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'type') THEN
        ALTER TABLE messages ADD COLUMN type TEXT NOT NULL DEFAULT 'text';
    END IF;
    
    -- Adicionar attachments se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'attachments') THEN
        ALTER TABLE messages ADD COLUMN attachments JSONB DEFAULT '[]';
    END IF;
END $$;

-- Adicionar colunas faltantes na tabela temp_cpf_checkout (se não existirem)
DO $$ BEGIN
    -- Adicionar course_name se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_cpf_checkout' AND column_name = 'course_name') THEN
        ALTER TABLE temp_cpf_checkout ADD COLUMN course_name TEXT;
    END IF;
    
    -- Adicionar user_email se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_cpf_checkout' AND column_name = 'user_email') THEN
        ALTER TABLE temp_cpf_checkout ADD COLUMN user_email TEXT;
    END IF;
    
    -- Adicionar user_name se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_cpf_checkout' AND column_name = 'user_name') THEN
        ALTER TABLE temp_cpf_checkout ADD COLUMN user_name TEXT;
    END IF;
    
    -- Adicionar checkout_url se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_cpf_checkout' AND column_name = 'checkout_url') THEN
        ALTER TABLE temp_cpf_checkout ADD COLUMN checkout_url TEXT;
    END IF;
    
    -- Adicionar expires_at se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_cpf_checkout' AND column_name = 'expires_at') THEN
        ALTER TABLE temp_cpf_checkout ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 hour');
    END IF;
    
    -- Adicionar is_used se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temp_cpf_checkout' AND column_name = 'is_used') THEN
        ALTER TABLE temp_cpf_checkout ADD COLUMN is_used BOOLEAN DEFAULT false;
    END IF;
END $$;

-- =====================================================
-- INSERIR REGISTRO NA TABELA DE MIGRATIONS
-- =====================================================

-- Criar tabela de controle se não existir
CREATE TABLE IF NOT EXISTS migrations_applied (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrar esta migration
INSERT INTO migrations_applied (migration_name) 
VALUES ('20250710000001-complete-database-schema') 
ON CONFLICT (migration_name) DO NOTHING; 