-- Sistema de Campanhas de Email
-- Permite criar e gerenciar campanhas de email para divulgação de conteúdo

-- 1. Tabela de Campanhas
CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('post', 'forum', 'course', 'lesson', 'class_material', 'custom')),
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'instructors', 'students', 'specific_classes', 'custom_filter')),
    target_classes UUID[], -- IDs das turmas específicas
    custom_filter JSONB, -- Filtros personalizados
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reference_id UUID, -- ID do post, curso, etc. relacionado
    reference_type TEXT, -- Tipo do conteúdo relacionado
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    opened_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    bounced_count INT DEFAULT 0
);
COMMENT ON TABLE public.email_campaigns IS 'Campanhas de email para divulgação de conteúdo.';
COMMENT ON COLUMN public.email_campaigns.delivered_count IS 'Número de emails entregues com sucesso';
COMMENT ON COLUMN public.email_campaigns.bounced_count IS 'Número de emails que retornaram (bounce)';

-- 2. Tabela de Destinatários das Campanhas
CREATE TABLE public.email_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounce_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(campaign_id, user_id)
);
COMMENT ON TABLE public.email_campaign_recipients IS 'Destinatários de cada campanha de email.';

-- 3. Tabela de Templates de Email
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject_template TEXT NOT NULL,
    html_template TEXT NOT NULL,
    text_template TEXT,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN ('post', 'forum', 'course', 'lesson', 'class_material', 'custom')),
    is_default BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.email_templates IS 'Templates pré-definidos para campanhas de email.';

-- 4. Tabela de Logs de Envio
CREATE TABLE public.email_send_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.email_campaign_recipients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.email_send_logs IS 'Logs detalhados de envio e interação com emails.';

-- 5. Índices para performance
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_campaigns_type ON public.email_campaigns(campaign_type);
CREATE INDEX idx_email_campaigns_scheduled ON public.email_campaigns(scheduled_at);
CREATE INDEX idx_email_campaigns_created_by ON public.email_campaigns(created_by);
CREATE INDEX idx_email_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX idx_email_campaign_recipients_status ON public.email_campaign_recipients(status);
CREATE INDEX idx_email_campaign_recipients_user ON public.email_campaign_recipients(user_id);
CREATE INDEX idx_email_templates_type ON public.email_templates(campaign_type);
CREATE INDEX idx_email_templates_default ON public.email_templates(is_default);
CREATE INDEX idx_email_send_logs_campaign ON public.email_send_logs(campaign_id);
CREATE INDEX idx_email_send_logs_action ON public.email_send_logs(action);
CREATE INDEX idx_email_send_logs_created ON public.email_send_logs(created_at);

-- 6. Inserir templates padrão
INSERT INTO public.email_templates (id, name, subject_template, html_template, text_template, campaign_type, is_default, created_by) VALUES
-- Template para Posts
(
    gen_random_uuid(),
    'Divulgação de Post',
    'Novo post na comunidade: {{post_title}}',
    '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Konektus</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Novo conteúdo na comunidade</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">{{post_title}}</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">{{post_excerpt}}</p>
                <p style="color: #999; font-size: 14px;">Por {{author_name}} • {{created_at}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{post_url}}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block; 
                          font-weight: bold;">
                    Ler Post Completo
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center;">
                Não quer receber estes emails? <a href="{{unsubscribe_url}}" style="color: #667eea;">Cancelar inscrição</a>
            </p>
        </div>
    </div>
    ',
    'Novo post na comunidade: {{post_title}}

{{post_excerpt}}

Por {{author_name}} • {{created_at}}

Ler post completo: {{post_url}}

Para cancelar inscrição: {{unsubscribe_url}}',
    'post',
    true,
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
),

-- Template para Fórum
(
    gen_random_uuid(),
    'Divulgação de Fórum',
    'Novo post no fórum: {{post_title}}',
    '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Konektus</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Novo post no fórum</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">{{post_title}}</h2>
            <p style="color: #666; margin-bottom: 15px;">Tópico: <strong>{{topic_title}}</strong></p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">{{post_excerpt}}</p>
                <p style="color: #999; font-size: 14px;">Por {{author_name}} • {{created_at}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{post_url}}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block; 
                          font-weight: bold;">
                    Ver Post no Fórum
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center;">
                Não quer receber estes emails? <a href="{{unsubscribe_url}}" style="color: #667eea;">Cancelar inscrição</a>
            </p>
        </div>
    </div>
    ',
    'Novo post no fórum: {{post_title}}

Tópico: {{topic_title}}

{{post_excerpt}}

Por {{author_name}} • {{created_at}}

Ver post no fórum: {{post_url}}

Para cancelar inscrição: {{unsubscribe_url}}',
    'forum',
    true,
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
),

-- Template para Cursos
(
    gen_random_uuid(),
    'Novo Curso Disponível',
    'Novo curso disponível: {{course_title}}',
    '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Konektus</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Novo curso disponível</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">{{course_title}}</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">{{course_description}}</p>
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <span style="color: #999; font-size: 14px;">Instrutor: {{instructor_name}}</span>
                    <span style="color: #999; font-size: 14px;">{{total_lessons}} aulas</span>
                </div>
                <p style="color: #999; font-size: 14px;">Nível: {{course_level}} • {{course_duration}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{course_url}}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block; 
                          font-weight: bold;">
                    Ver Curso
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center;">
                Não quer receber estes emails? <a href="{{unsubscribe_url}}" style="color: #667eea;">Cancelar inscrição</a>
            </p>
        </div>
    </div>
    ',
    'Novo curso disponível: {{course_title}}

{{course_description}}

Instrutor: {{instructor_name}}
{{total_lessons}} aulas • Nível: {{course_level}} • {{course_duration}}

Ver curso: {{course_url}}

Para cancelar inscrição: {{unsubscribe_url}}',
    'course',
    true,
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
),

-- Template para Aulas
(
    gen_random_uuid(),
    'Nova Aula Disponível',
    'Nova aula: {{lesson_title}}',
    '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Konektus</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Nova aula disponível</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">{{lesson_title}}</h2>
            <p style="color: #666; margin-bottom: 15px;">Curso: <strong>{{course_title}}</strong></p>
            <p style="color: #666; margin-bottom: 15px;">Módulo: <strong>{{module_title}}</strong></p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">{{lesson_description}}</p>
                <p style="color: #999; font-size: 14px;">Duração: {{lesson_duration}} • Instrutor: {{instructor_name}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{lesson_url}}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block; 
                          font-weight: bold;">
                    Assistir Aula
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center;">
                Não quer receber estes emails? <a href="{{unsubscribe_url}}" style="color: #667eea;">Cancelar inscrição</a>
            </p>
        </div>
    </div>
    ',
    'Nova aula: {{lesson_title}}

Curso: {{course_title}}
Módulo: {{module_title}}

{{lesson_description}}

Duração: {{lesson_duration}} • Instrutor: {{instructor_name}}

Assistir aula: {{lesson_url}}

Para cancelar inscrição: {{unsubscribe_url}}',
    'lesson',
    true,
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
),

-- Template para Materiais de Turma
(
    gen_random_uuid(),
    'Material de Turma',
    'Novo material na turma: {{class_name}}',
    '
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Konektus</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Novo material na sua turma</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">{{material_title}}</h2>
            <p style="color: #666; margin-bottom: 15px;">Turma: <strong>{{class_name}}</strong></p>
            <p style="color: #666; margin-bottom: 15px;">Instrutor: <strong>{{instructor_name}}</strong></p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">{{material_description}}</p>
                <p style="color: #999; font-size: 14px;">Tipo: {{material_type}} • {{created_at}}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{material_url}}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 8px; 
                          display: inline-block; 
                          font-weight: bold;">
                    Ver Material
                </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center;">
                Não quer receber estes emails? <a href="{{unsubscribe_url}}" style="color: #667eea;">Cancelar inscrição</a>
            </p>
        </div>
    </div>
    ',
    'Novo material na turma: {{material_title}}

Turma: {{class_name}}
Instrutor: {{instructor_name}}

{{material_description}}

Tipo: {{material_type}} • {{created_at}}

Ver material: {{material_url}}

Para cancelar inscrição: {{unsubscribe_url}}',
    'class_material',
    true,
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
);

-- 7. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Triggers para updated_at
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 