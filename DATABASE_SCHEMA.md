# Esquema do Banco de Dados

## Tabelas

### class_content
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- class_id: uuid, FK → class_instances.id, NOT NULL
- author_id: uuid, FK → profiles.id, NOT NULL
- title: text, NOT NULL
- content: text, NULL
- content_type: text, NOT NULL, DEFAULT 'announcement'
- is_pinned: boolean, NULL, DEFAULT false
- created_at: timestamptz, NOT NULL, DEFAULT now()
- updated_at: timestamptz, NOT NULL, DEFAULT now()

### class_courses
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- class_id: uuid, FK → class_instances.id, NOT NULL
- course_id: uuid, FK → courses.id, NOT NULL
- is_required: boolean, NULL, DEFAULT false
- order_index: integer, NULL, DEFAULT 0
- created_at: timestamptz, NOT NULL, DEFAULT now()

### class_enrollments
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- class_id: uuid, FK → class_instances.id, NOT NULL
- user_id: uuid, FK → profiles.id, NOT NULL
- enrolled_at: timestamptz, NOT NULL, DEFAULT now()
- role: text, NOT NULL, DEFAULT 'student'
- status: text, NOT NULL, DEFAULT 'active'

### class_instance_content
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- class_instance_id: uuid, NOT NULL
- author_id: uuid, FK → profiles.id, NOT NULL
- title: text, NOT NULL
- content: text, NULL
- content_type: text, NOT NULL, DEFAULT 'announcement'
- is_pinned: boolean, NULL, DEFAULT false
- created_at: timestamptz, NOT NULL, DEFAULT now()
- updated_at: timestamptz, NOT NULL, DEFAULT now()
- file_url: text, NULL
- file_name: text, NULL
- file_size: integer, NULL
- file_type: text, NULL

### class_instance_enrollments
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- class_instance_id: uuid, NOT NULL
- user_id: uuid, FK → profiles.id, NOT NULL
- enrolled_at: timestamptz, NOT NULL, DEFAULT now()
- role: text, NOT NULL, DEFAULT 'student'
- status: text, NOT NULL, DEFAULT 'active'

### class_instances
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- instance_name: text, NOT NULL
- instance_description: text, NULL
- instructor_id: uuid, FK → profiles.id, NOT NULL
- is_public: boolean, NULL, DEFAULT false
- is_active: boolean, NULL, DEFAULT true
- max_students: integer, NULL
- created_at: timestamptz, NOT NULL, DEFAULT now()
- updated_at: timestamptz, NOT NULL, DEFAULT now()
- course_id: uuid, FK → courses.id, NULL
- start_date: date, NULL
- end_date: date, NULL
- schedule: text, NULL
- location: text, NULL

### classes
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- name: text, NOT NULL
- description: text, NULL
- instructor_id: uuid, FK → profiles.id, NOT NULL
- is_public: boolean, NULL, DEFAULT false
- is_active: boolean, NULL, DEFAULT true
- max_students: integer, NULL
- created_at: timestamptz, NOT NULL, DEFAULT now()
- updated_at: timestamptz, NOT NULL, DEFAULT now()

### comment_likes
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- comment_id: uuid, FK → comments.id, NOT NULL
- user_id: uuid, FK → profiles.id, NOT NULL
- created_at: timestamptz, NULL, DEFAULT now()

### comments
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- post_id: uuid, FK → posts.id, NOT NULL
- user_id: uuid, FK → profiles.id, NOT NULL
- content: text, NOT NULL
- created_at: timestamptz, NOT NULL, DEFAULT now()

### conversation_participants
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- conversation_id: uuid, FK → conversations.id, NOT NULL
- user_id: uuid, FK → profiles.id, NOT NULL
- joined_at: timestamptz, NOT NULL, DEFAULT now()
- last_read_at: timestamptz, NULL
- is_admin: boolean, NULL, DEFAULT false

### conversations
- id: uuid, PK, NOT NULL, DEFAULT gen_random_uuid()
- title: text, NULL
- type: text, NOT NULL, DEFAULT 'direct'
- created_at: timestamptz, NOT NULL, DEFAULT now()
- updated_at: timestamptz, NOT NULL, DEFAULT now()

# ... (continua para todas as tabelas e views, conforme extraído do banco)

# Relações (Chaves Estrangeiras)

- class_content.author_id → profiles.id
- class_content.class_id → class_instances.id
- class_courses.class_id → class_instances.id
- class_courses.course_id → courses.id
- class_enrollments.user_id → profiles.id
- class_enrollments.class_id → class_instances.id
- class_instance_content.author_id → profiles.id
- class_instance_enrollments.user_id → profiles.id
- class_instances.course_id → courses.id
- class_instances.instructor_id → profiles.id
- classes.instructor_id → profiles.id
- comment_likes.user_id → profiles.id
- comment_likes.comment_id → comments.id
- comments.post_id → posts.id
- comments.user_id → profiles.id
- conversation_participants.conversation_id → conversations.id
- conversation_participants.user_id → profiles.id
- course_ratings.course_id → courses.id
- course_ratings.user_id → profiles.id
- courses.instructor_id → profiles.id
- email_campaign_recipients.campaign_id → email_campaigns.id
- email_campaign_recipients.user_id → profiles.id
- email_campaigns.created_by → profiles.id
- email_send_logs.recipient_id → email_campaign_recipients.id
- email_send_logs.user_id → profiles.id
- email_send_logs.campaign_id → email_campaigns.id
- email_templates.created_by → profiles.id
- enrollments.user_id → profiles.id
- enrollments.course_id → courses.id
- external_checkouts.course_id → courses.id
- external_checkouts.user_id → profiles.id
- forum_post_favorites.user_id → profiles.id
- forum_post_favorites.post_id → forum_posts.id
- forum_post_likes.post_id → forum_posts.id
- forum_post_likes.user_id → profiles.id
- forum_post_tags.post_id → forum_posts.id
- forum_post_tags.tag_id → forum_tags.id
- forum_posts.author_id → profiles.id
- forum_posts.topic_id → forum_topics.id
- forum_replies.parent_reply_id → forum_replies.id
- forum_replies.author_id → profiles.id
- forum_replies.post_id → forum_posts.id
- forum_reply_likes.user_id → profiles.id
- forum_reply_likes.reply_id → forum_replies.id
- forum_topics.created_by → profiles.id
- lesson_comment_likes.comment_id → lesson_comments.id
- lesson_comment_likes.user_id → profiles.id
- lesson_comments.lesson_id → lessons.id
- lesson_comments.user_id → profiles.id
- lesson_comments.parent_id → lesson_comments.id
- lesson_completions.user_id → profiles.id
- lesson_completions.lesson_id → lessons.id
- lessons.module_id → modules.id
- messages.conversation_id → conversations.id
- messages.sender_id → profiles.id
- messages.reply_to_id → messages.id
- modules.course_id → courses.id
- notifications.user_id → profiles.id
- password_reset_tokens.user_id → profiles.id
- payments.course_id → courses.id
- payments.user_id → profiles.id
- post_favorites.post_id → posts.id
- post_favorites.user_id → profiles.id
- post_likes.user_id → profiles.id
- post_likes.post_id → posts.id
- posts.author_id → profiles.id
- temp_cpf_checkout.course_id → courses.id
- webhook_logs.webhook_id → webhooks.id

# Views

- class_courses_with_details
- conversations_with_last_message
- lesson_comments_with_user
- external_checkout_stats
- payment_details
- messages_with_sender
- user_class_access

# Observações

- Campos do tipo UUID são chaves primárias, exceto quando especificado.
- Campos com FOREIGN KEY indicam relacionamento entre tabelas.
- Campos com UNIQUE não aceitam valores duplicados.
- Campos com NOT NULL são obrigatórios. 