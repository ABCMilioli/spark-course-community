Lista de tabelas

"TABELA: class_content"
"TABELA: class_courses"
"TABELA: class_enrollments"
"TABELA: class_instance_content"
"TABELA: class_instance_enrollments"
"TABELA: class_instances"
"TABELA: classes"
"TABELA: comment_likes"
"TABELA: comments"
"TABELA: conversation_participants"
"TABELA: conversations"
"TABELA: course_ratings"
"TABELA: courses"
"TABELA: email_campaign_recipients"
"TABELA: email_campaigns"
"TABELA: email_send_logs"
"TABELA: email_templates"
"TABELA: email_verification_tokens"
"TABELA: enrollments"
"TABELA: external_checkouts"
"TABELA: forum_post_favorites"
"TABELA: forum_post_likes"
"TABELA: forum_post_tags"
"TABELA: forum_posts"
"TABELA: forum_replies"
"TABELA: forum_reply_likes"
"TABELA: forum_tags"
"TABELA: forum_topics"
"TABELA: lesson_comment_likes"
"TABELA: lesson_comments"
"TABELA: lesson_completions"
"TABELA: lessons"
"TABELA: mercadopago_webhooks"
"TABELA: messages"
"TABELA: migrations_applied"
"TABELA: modules"
"TABELA: notifications"
"TABELA: password_reset_tokens"
"TABELA: payments"
"TABELA: post_favorites"
"TABELA: post_likes"
"TABELA: posts"
"TABELA: profiles"
"TABELA: stripe_webhooks"
"TABELA: temp_cpf_checkout"
"TABELA: webhook_logs"
"TABELA: webhooks"


Detalhe de cada tabelas

"TABELA: class_content | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: class_content | COLUNA: class_id | TIPO: uuid NOT NULL"
"TABELA: class_content | COLUNA: author_id | TIPO: uuid NOT NULL"
"TABELA: class_content | COLUNA: title | TIPO: text NOT NULL"
"TABELA: class_content | COLUNA: content | TIPO: text"
"TABELA: class_content | COLUNA: content_type | TIPO: text NOT NULL DEFAULT 'announcement'::text"
"TABELA: class_content | COLUNA: is_pinned | TIPO: boolean DEFAULT false"
"TABELA: class_content | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: class_content | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: class_courses | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: class_courses | COLUNA: class_id | TIPO: uuid NOT NULL"
"TABELA: class_courses | COLUNA: course_id | TIPO: uuid NOT NULL"
"TABELA: class_courses | COLUNA: is_required | TIPO: boolean DEFAULT false"
"TABELA: class_courses | COLUNA: order_index | TIPO: integer DEFAULT 0"
"TABELA: class_courses | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: class_enrollments | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: class_enrollments | COLUNA: class_id | TIPO: uuid NOT NULL"
"TABELA: class_enrollments | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: class_enrollments | COLUNA: enrolled_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: class_enrollments | COLUNA: role | TIPO: text NOT NULL DEFAULT 'student'::text"
"TABELA: class_enrollments | COLUNA: status | TIPO: text NOT NULL DEFAULT 'active'::text"
"TABELA: class_instance_content | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: class_instance_content | COLUNA: class_instance_id | TIPO: uuid NOT NULL"
"TABELA: class_instance_content | COLUNA: author_id | TIPO: uuid NOT NULL"
"TABELA: class_instance_content | COLUNA: title | TIPO: text NOT NULL"
"TABELA: class_instance_content | COLUNA: content | TIPO: text"
"TABELA: class_instance_content | COLUNA: content_type | TIPO: text NOT NULL DEFAULT 'announcement'::text"
"TABELA: class_instance_content | COLUNA: is_pinned | TIPO: boolean DEFAULT false"
"TABELA: class_instance_content | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: class_instance_content | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: class_instance_content | COLUNA: file_url | TIPO: text"
"TABELA: class_instance_content | COLUNA: file_name | TIPO: text"
"TABELA: class_instance_content | COLUNA: file_size | TIPO: integer"
"TABELA: class_instance_content | COLUNA: file_type | TIPO: text"
"TABELA: class_instance_enrollments | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: class_instance_enrollments | COLUNA: class_instance_id | TIPO: uuid NOT NULL"
"TABELA: class_instance_enrollments | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: class_instance_enrollments | COLUNA: enrolled_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: class_instance_enrollments | COLUNA: role | TIPO: text NOT NULL DEFAULT 'student'::text"
"TABELA: class_instance_enrollments | COLUNA: status | TIPO: text NOT NULL DEFAULT 'active'::text"
"TABELA: class_instances | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: class_instances | COLUNA: instance_name | TIPO: text NOT NULL"
"TABELA: class_instances | COLUNA: instance_description | TIPO: text"
"TABELA: class_instances | COLUNA: instructor_id | TIPO: uuid NOT NULL"
"TABELA: class_instances | COLUNA: is_public | TIPO: boolean DEFAULT false"
"TABELA: class_instances | COLUNA: is_active | TIPO: boolean DEFAULT true"
"TABELA: class_instances | COLUNA: max_students | TIPO: integer"
"TABELA: class_instances | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: class_instances | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: class_instances | COLUNA: course_id | TIPO: uuid"
"TABELA: class_instances | COLUNA: start_date | TIPO: date"
"TABELA: class_instances | COLUNA: end_date | TIPO: date"
"TABELA: class_instances | COLUNA: schedule | TIPO: text"
"TABELA: class_instances | COLUNA: location | TIPO: text"
"TABELA: classes | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: classes | COLUNA: name | TIPO: text NOT NULL"
"TABELA: classes | COLUNA: description | TIPO: text"
"TABELA: classes | COLUNA: instructor_id | TIPO: uuid NOT NULL"
"TABELA: classes | COLUNA: is_public | TIPO: boolean DEFAULT false"
"TABELA: classes | COLUNA: is_active | TIPO: boolean DEFAULT true"
"TABELA: classes | COLUNA: max_students | TIPO: integer"
"TABELA: classes | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: classes | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: comment_likes | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: comment_likes | COLUNA: comment_id | TIPO: uuid NOT NULL"
"TABELA: comment_likes | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: comment_likes | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: comments | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: comments | COLUNA: post_id | TIPO: uuid NOT NULL"
"TABELA: comments | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: comments | COLUNA: content | TIPO: text NOT NULL"
"TABELA: comments | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: conversation_participants | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: conversation_participants | COLUNA: conversation_id | TIPO: uuid NOT NULL"
"TABELA: conversation_participants | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: conversation_participants | COLUNA: joined_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: conversation_participants | COLUNA: last_read_at | TIPO: timestamp with time zone"
"TABELA: conversation_participants | COLUNA: is_admin | TIPO: boolean DEFAULT false"
"TABELA: conversations | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: conversations | COLUNA: title | TIPO: text"
"TABELA: conversations | COLUNA: type | TIPO: text NOT NULL DEFAULT 'direct'::text"
"TABELA: conversations | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: conversations | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: course_ratings | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: course_ratings | COLUNA: course_id | TIPO: uuid NOT NULL"
"TABELA: course_ratings | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: course_ratings | COLUNA: rating | TIPO: integer NOT NULL"
"TABELA: course_ratings | COLUNA: review | TIPO: text"
"TABELA: course_ratings | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: course_ratings | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: courses | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: courses | COLUNA: title | TIPO: text NOT NULL"
"TABELA: courses | COLUNA: description | TIPO: text"
"TABELA: courses | COLUNA: thumbnail_url | TIPO: text"
"TABELA: courses | COLUNA: level | TIPO: USER-DEFINED NOT NULL"
"TABELA: courses | COLUNA: duration | TIPO: text"
"TABELA: courses | COLUNA: instructor_id | TIPO: uuid"
"TABELA: courses | COLUNA: students_count | TIPO: integer DEFAULT 0"
"TABELA: courses | COLUNA: rating | TIPO: numeric DEFAULT 0.0"
"TABELA: courses | COLUNA: price | TIPO: numeric DEFAULT 0.00"
"TABELA: courses | COLUNA: tags | TIPO: ARRAY"
"TABELA: courses | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: courses | COLUNA: demo_video | TIPO: text"
"TABELA: courses | COLUNA: payment_gateway | TIPO: text DEFAULT 'mercadopago'::text"
"TABELA: courses | COLUNA: external_checkout_url | TIPO: text"
"TABELA: courses | COLUNA: category | TIPO: text"
"TABELA: courses | COLUNA: ispaid | TIPO: boolean DEFAULT false"
"TABELA: courses | COLUNA: updated_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: courses | COLUNA: is_active | TIPO: boolean DEFAULT true"
"TABELA: email_campaign_recipients | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: email_campaign_recipients | COLUNA: campaign_id | TIPO: uuid NOT NULL"
"TABELA: email_campaign_recipients | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: email_campaign_recipients | COLUNA: email | TIPO: text NOT NULL"
"TABELA: email_campaign_recipients | COLUNA: name | TIPO: text NOT NULL"
"TABELA: email_campaign_recipients | COLUNA: status | TIPO: text NOT NULL DEFAULT 'pending'::text"
"TABELA: email_campaign_recipients | COLUNA: sent_at | TIPO: timestamp with time zone"
"TABELA: email_campaign_recipients | COLUNA: delivered_at | TIPO: timestamp with time zone"
"TABELA: email_campaign_recipients | COLUNA: opened_at | TIPO: timestamp with time zone"
"TABELA: email_campaign_recipients | COLUNA: clicked_at | TIPO: timestamp with time zone"
"TABELA: email_campaign_recipients | COLUNA: bounce_reason | TIPO: text"
"TABELA: email_campaign_recipients | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: email_campaign_recipients | COLUNA: was_delivered | TIPO: boolean DEFAULT false"
"TABELA: email_campaign_recipients | COLUNA: was_opened | TIPO: boolean DEFAULT false"
"TABELA: email_campaign_recipients | COLUNA: was_clicked | TIPO: boolean DEFAULT false"
"TABELA: email_campaign_recipients | COLUNA: was_bounced | TIPO: boolean DEFAULT false"
"TABELA: email_campaigns | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: email_campaigns | COLUNA: name | TIPO: text NOT NULL"
"TABELA: email_campaigns | COLUNA: subject | TIPO: text NOT NULL"
"TABELA: email_campaigns | COLUNA: html_content | TIPO: text NOT NULL"
"TABELA: email_campaigns | COLUNA: text_content | TIPO: text"
"TABELA: email_campaigns | COLUNA: status | TIPO: text NOT NULL DEFAULT 'draft'::text"
"TABELA: email_campaigns | COLUNA: campaign_type | TIPO: text NOT NULL"
"TABELA: email_campaigns | COLUNA: target_audience | TIPO: text NOT NULL DEFAULT 'all'::text"
"TABELA: email_campaigns | COLUNA: target_classes | TIPO: ARRAY"
"TABELA: email_campaigns | COLUNA: custom_filter | TIPO: jsonb"
"TABELA: email_campaigns | COLUNA: scheduled_at | TIPO: timestamp with time zone"
"TABELA: email_campaigns | COLUNA: sent_at | TIPO: timestamp with time zone"
"TABELA: email_campaigns | COLUNA: created_by | TIPO: uuid NOT NULL"
"TABELA: email_campaigns | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: email_campaigns | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: email_campaigns | COLUNA: reference_id | TIPO: uuid"
"TABELA: email_campaigns | COLUNA: reference_type | TIPO: text"
"TABELA: email_campaigns | COLUNA: total_recipients | TIPO: integer DEFAULT 0"
"TABELA: email_campaigns | COLUNA: sent_count | TIPO: integer DEFAULT 0"
"TABELA: email_campaigns | COLUNA: opened_count | TIPO: integer DEFAULT 0"
"TABELA: email_campaigns | COLUNA: clicked_count | TIPO: integer DEFAULT 0"
"TABELA: email_campaigns | COLUNA: delivered_count | TIPO: integer DEFAULT 0"
"TABELA: email_campaigns | COLUNA: bounced_count | TIPO: integer DEFAULT 0"
"TABELA: email_send_logs | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: email_send_logs | COLUNA: campaign_id | TIPO: uuid NOT NULL"
"TABELA: email_send_logs | COLUNA: recipient_id | TIPO: uuid NOT NULL"
"TABELA: email_send_logs | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: email_send_logs | COLUNA: email | TIPO: text NOT NULL"
"TABELA: email_send_logs | COLUNA: action | TIPO: text NOT NULL"
"TABELA: email_send_logs | COLUNA: details | TIPO: jsonb"
"TABELA: email_send_logs | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: email_templates | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: email_templates | COLUNA: name | TIPO: text NOT NULL"
"TABELA: email_templates | COLUNA: subject_template | TIPO: text NOT NULL"
"TABELA: email_templates | COLUNA: html_template | TIPO: text NOT NULL"
"TABELA: email_templates | COLUNA: text_template | TIPO: text"
"TABELA: email_templates | COLUNA: campaign_type | TIPO: text NOT NULL"
"TABELA: email_templates | COLUNA: is_default | TIPO: boolean DEFAULT false"
"TABELA: email_templates | COLUNA: created_by | TIPO: uuid NOT NULL"
"TABELA: email_templates | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: email_templates | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: email_verification_tokens | COLUNA: id | TIPO: integer NOT NULL DEFAULT nextval('email_verification_tokens_id_seq'::regclass)"
"TABELA: email_verification_tokens | COLUNA: email | TIPO: character varying(255) NOT NULL"
"TABELA: email_verification_tokens | COLUNA: token | TIPO: character varying(128) NOT NULL"
"TABELA: email_verification_tokens | COLUNA: name | TIPO: character varying(255) NOT NULL"
"TABELA: email_verification_tokens | COLUNA: password_hash | TIPO: character varying(255) NOT NULL"
"TABELA: email_verification_tokens | COLUNA: expires_at | TIPO: timestamp without time zone NOT NULL"
"TABELA: email_verification_tokens | COLUNA: created_at | TIPO: timestamp without time zone NOT NULL DEFAULT now()"
"TABELA: enrollments | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: enrollments | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: enrollments | COLUNA: course_id | TIPO: uuid NOT NULL"
"TABELA: enrollments | COLUNA: enrolled_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: enrollments | COLUNA: progress | TIPO: integer DEFAULT 0"
"TABELA: enrollments | COLUNA: completed_at | TIPO: timestamp with time zone"
"TABELA: external_checkouts | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: external_checkouts | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: external_checkouts | COLUNA: course_id | TIPO: uuid NOT NULL"
"TABELA: external_checkouts | COLUNA: gateway | TIPO: text NOT NULL"
"TABELA: external_checkouts | COLUNA: checkout_url | TIPO: text NOT NULL"
"TABELA: external_checkouts | COLUNA: status | TIPO: text NOT NULL DEFAULT 'pending'::text"
"TABELA: external_checkouts | COLUNA: payment_id | TIPO: text"
"TABELA: external_checkouts | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: external_checkouts | COLUNA: completed_at | TIPO: timestamp with time zone"
"TABELA: external_checkouts | COLUNA: metadata | TIPO: jsonb DEFAULT '{}'::jsonb"
"TABELA: forum_post_favorites | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: forum_post_favorites | COLUNA: post_id | TIPO: uuid NOT NULL"
"TABELA: forum_post_favorites | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: forum_post_favorites | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_post_likes | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: forum_post_likes | COLUNA: post_id | TIPO: uuid NOT NULL"
"TABELA: forum_post_likes | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: forum_post_likes | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_post_tags | COLUNA: post_id | TIPO: uuid NOT NULL"
"TABELA: forum_post_tags | COLUNA: tag_id | TIPO: uuid NOT NULL"
"TABELA: forum_posts | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: forum_posts | COLUNA: topic_id | TIPO: uuid NOT NULL"
"TABELA: forum_posts | COLUNA: title | TIPO: character varying(255) NOT NULL"
"TABELA: forum_posts | COLUNA: content | TIPO: text NOT NULL"
"TABELA: forum_posts | COLUNA: author_id | TIPO: uuid NOT NULL"
"TABELA: forum_posts | COLUNA: is_pinned | TIPO: boolean DEFAULT false"
"TABELA: forum_posts | COLUNA: is_locked | TIPO: boolean DEFAULT false"
"TABELA: forum_posts | COLUNA: view_count | TIPO: integer DEFAULT 0"
"TABELA: forum_posts | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_posts | COLUNA: updated_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_posts | COLUNA: content_image_url | TIPO: text"
"TABELA: forum_replies | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: forum_replies | COLUNA: post_id | TIPO: uuid NOT NULL"
"TABELA: forum_replies | COLUNA: parent_reply_id | TIPO: uuid"
"TABELA: forum_replies | COLUNA: content | TIPO: text NOT NULL"
"TABELA: forum_replies | COLUNA: author_id | TIPO: uuid NOT NULL"
"TABELA: forum_replies | COLUNA: is_solution | TIPO: boolean DEFAULT false"
"TABELA: forum_replies | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_replies | COLUNA: updated_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_reply_likes | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: forum_reply_likes | COLUNA: reply_id | TIPO: uuid NOT NULL"
"TABELA: forum_reply_likes | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: forum_reply_likes | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_tags | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: forum_tags | COLUNA: name | TIPO: character varying(50) NOT NULL"
"TABELA: forum_tags | COLUNA: color | TIPO: character varying(7) DEFAULT '#3B82F6'::character varying"
"TABELA: forum_tags | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_topics | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: forum_topics | COLUNA: title | TIPO: character varying(255) NOT NULL"
"TABELA: forum_topics | COLUNA: description | TIPO: text"
"TABELA: forum_topics | COLUNA: slug | TIPO: character varying(255) NOT NULL"
"TABELA: forum_topics | COLUNA: is_active | TIPO: boolean DEFAULT true"
"TABELA: forum_topics | COLUNA: is_pinned | TIPO: boolean DEFAULT false"
"TABELA: forum_topics | COLUNA: order_index | TIPO: integer DEFAULT 0"
"TABELA: forum_topics | COLUNA: created_by | TIPO: uuid NOT NULL"
"TABELA: forum_topics | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_topics | COLUNA: updated_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: forum_topics | COLUNA: cover_image_url | TIPO: text"
"TABELA: forum_topics | COLUNA: banner_image_url | TIPO: text"
"TABELA: lesson_comment_likes | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: lesson_comment_likes | COLUNA: comment_id | TIPO: uuid NOT NULL"
"TABELA: lesson_comment_likes | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: lesson_comment_likes | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: lesson_comments | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: lesson_comments | COLUNA: lesson_id | TIPO: uuid NOT NULL"
"TABELA: lesson_comments | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: lesson_comments | COLUNA: content | TIPO: text NOT NULL"
"TABELA: lesson_comments | COLUNA: parent_id | TIPO: uuid"
"TABELA: lesson_comments | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: lesson_comments | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: lesson_completions | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: lesson_completions | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: lesson_completions | COLUNA: lesson_id | TIPO: uuid NOT NULL"
"TABELA: lesson_completions | COLUNA: completed_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: lessons | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: lessons | COLUNA: module_id | TIPO: uuid NOT NULL"
"TABELA: lessons | COLUNA: title | TIPO: text NOT NULL"
"TABELA: lessons | COLUNA: description | TIPO: text"
"TABELA: lessons | COLUNA: youtube_id | TIPO: text"
"TABELA: lessons | COLUNA: duration | TIPO: text"
"TABELA: lessons | COLUNA: lesson_order | TIPO: integer NOT NULL"
"TABELA: lessons | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: lessons | COLUNA: is_visible | TIPO: boolean NOT NULL DEFAULT true"
"TABELA: lessons | COLUNA: release_days | TIPO: integer DEFAULT 0"
"TABELA: lessons | COLUNA: video_url | TIPO: text"
"TABELA: mercadopago_webhooks | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: mercadopago_webhooks | COLUNA: mp_event_id | TIPO: text NOT NULL"
"TABELA: mercadopago_webhooks | COLUNA: event_type | TIPO: text NOT NULL"
"TABELA: mercadopago_webhooks | COLUNA: payment_id | TIPO: text"
"TABELA: mercadopago_webhooks | COLUNA: external_reference | TIPO: text"
"TABELA: mercadopago_webhooks | COLUNA: status | TIPO: text NOT NULL DEFAULT 'pending'::text"
"TABELA: mercadopago_webhooks | COLUNA: payload | TIPO: jsonb NOT NULL"
"TABELA: mercadopago_webhooks | COLUNA: processed_at | TIPO: timestamp with time zone"
"TABELA: mercadopago_webhooks | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: messages | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: messages | COLUNA: conversation_id | TIPO: uuid NOT NULL"
"TABELA: messages | COLUNA: sender_id | TIPO: uuid NOT NULL"
"TABELA: messages | COLUNA: content | TIPO: text NOT NULL"
"TABELA: messages | COLUNA: type | TIPO: text NOT NULL DEFAULT 'text'::text"
"TABELA: messages | COLUNA: attachments | TIPO: jsonb DEFAULT '[]'::jsonb"
"TABELA: messages | COLUNA: reply_to_id | TIPO: uuid"
"TABELA: messages | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: messages | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: migrations_applied | COLUNA: id | TIPO: integer NOT NULL DEFAULT nextval('migrations_applied_id_seq'::regclass)"
"TABELA: migrations_applied | COLUNA: migration_name | TIPO: character varying(255) NOT NULL"
"TABELA: migrations_applied | COLUNA: applied_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: modules | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: modules | COLUNA: course_id | TIPO: uuid NOT NULL"
"TABELA: modules | COLUNA: title | TIPO: text NOT NULL"
"TABELA: modules | COLUNA: module_order | TIPO: integer NOT NULL"
"TABELA: modules | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: modules | COLUNA: is_visible | TIPO: boolean NOT NULL DEFAULT true"
"TABELA: notifications | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: notifications | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: notifications | COLUNA: title | TIPO: text NOT NULL"
"TABELA: notifications | COLUNA: message | TIPO: text NOT NULL"
"TABELA: notifications | COLUNA: type | TIPO: text NOT NULL DEFAULT 'comment'::text"
"TABELA: notifications | COLUNA: reference_id | TIPO: uuid"
"TABELA: notifications | COLUNA: reference_type | TIPO: text"
"TABELA: notifications | COLUNA: is_read | TIPO: boolean DEFAULT false"
"TABELA: notifications | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: password_reset_tokens | COLUNA: id | TIPO: integer NOT NULL DEFAULT nextval('password_reset_tokens_id_seq'::regclass)"
"TABELA: password_reset_tokens | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: password_reset_tokens | COLUNA: token | TIPO: character varying(128) NOT NULL"
"TABELA: password_reset_tokens | COLUNA: expires_at | TIPO: timestamp without time zone NOT NULL"
"TABELA: password_reset_tokens | COLUNA: created_at | TIPO: timestamp without time zone NOT NULL DEFAULT now()"
"TABELA: payments | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: payments | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: payments | COLUNA: course_id | TIPO: uuid NOT NULL"
"TABELA: payments | COLUNA: stripe_payment_intent_id | TIPO: text"
"TABELA: payments | COLUNA: amount | TIPO: numeric NOT NULL"
"TABELA: payments | COLUNA: currency | TIPO: text NOT NULL DEFAULT 'BRL'::text"
"TABELA: payments | COLUNA: status | TIPO: text NOT NULL DEFAULT 'pending'::text"
"TABELA: payments | COLUNA: payment_method | TIPO: text"
"TABELA: payments | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: payments | COLUNA: updated_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: payments | COLUNA: metadata | TIPO: jsonb"
"TABELA: payments | COLUNA: gateway | TIPO: text NOT NULL DEFAULT 'stripe'::text"
"TABELA: payments | COLUNA: external_reference | TIPO: text"
"TABELA: payments | COLUNA: payment_method_details | TIPO: jsonb"
"TABELA: post_favorites | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: post_favorites | COLUNA: post_id | TIPO: uuid NOT NULL"
"TABELA: post_favorites | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: post_favorites | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: post_likes | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: post_likes | COLUNA: post_id | TIPO: uuid NOT NULL"
"TABELA: post_likes | COLUNA: user_id | TIPO: uuid NOT NULL"
"TABELA: post_likes | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: posts | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: posts | COLUNA: title | TIPO: text NOT NULL"
"TABELA: posts | COLUNA: content | TIPO: text"
"TABELA: posts | COLUNA: author_id | TIPO: uuid NOT NULL"
"TABELA: posts | COLUNA: likes_count | TIPO: integer DEFAULT 0"
"TABELA: posts | COLUNA: comments_count | TIPO: integer DEFAULT 0"
"TABELA: posts | COLUNA: category | TIPO: text"
"TABELA: posts | COLUNA: tags | TIPO: ARRAY"
"TABELA: posts | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: posts | COLUNA: cover_image | TIPO: text"
"TABELA: posts | COLUNA: video_url | TIPO: text"
"TABELA: profiles | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: profiles | COLUNA: name | TIPO: text NOT NULL"
"TABELA: profiles | COLUNA: email | TIPO: text NOT NULL"
"TABELA: profiles | COLUNA: avatar_url | TIPO: text"
"TABELA: profiles | COLUNA: role | TIPO: USER-DEFINED NOT NULL DEFAULT 'student'::user_role"
"TABELA: profiles | COLUNA: bio | TIPO: text"
"TABELA: profiles | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: profiles | COLUNA: password_hash | TIPO: text"
"TABELA: profiles | COLUNA: cpf | TIPO: character varying(14)"
"TABELA: stripe_webhooks | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: stripe_webhooks | COLUNA: stripe_event_id | TIPO: text NOT NULL"
"TABELA: stripe_webhooks | COLUNA: event_type | TIPO: text NOT NULL"
"TABELA: stripe_webhooks | COLUNA: payment_intent_id | TIPO: text"
"TABELA: stripe_webhooks | COLUNA: status | TIPO: text NOT NULL DEFAULT 'pending'::text"
"TABELA: stripe_webhooks | COLUNA: payload | TIPO: jsonb NOT NULL"
"TABELA: stripe_webhooks | COLUNA: processed_at | TIPO: timestamp with time zone"
"TABELA: stripe_webhooks | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: temp_cpf_checkout | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: temp_cpf_checkout | COLUNA: cpf | TIPO: character varying(14) NOT NULL"
"TABELA: temp_cpf_checkout | COLUNA: course_id | TIPO: uuid NOT NULL"
"TABELA: temp_cpf_checkout | COLUNA: course_name | TIPO: text NOT NULL"
"TABELA: temp_cpf_checkout | COLUNA: user_email | TIPO: text"
"TABELA: temp_cpf_checkout | COLUNA: user_name | TIPO: text"
"TABELA: temp_cpf_checkout | COLUNA: checkout_url | TIPO: text NOT NULL"
"TABELA: temp_cpf_checkout | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: temp_cpf_checkout | COLUNA: expires_at | TIPO: timestamp with time zone NOT NULL DEFAULT (now() + '01:00:00'::interval)"
"TABELA: temp_cpf_checkout | COLUNA: is_used | TIPO: boolean DEFAULT false"
"TABELA: webhook_logs | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: webhook_logs | COLUNA: webhook_id | TIPO: uuid NOT NULL"
"TABELA: webhook_logs | COLUNA: event_type | TIPO: text NOT NULL"
"TABELA: webhook_logs | COLUNA: payload | TIPO: jsonb NOT NULL"
"TABELA: webhook_logs | COLUNA: response_status | TIPO: integer"
"TABELA: webhook_logs | COLUNA: response_body | TIPO: text"
"TABELA: webhook_logs | COLUNA: error_message | TIPO: text"
"TABELA: webhook_logs | COLUNA: attempt_count | TIPO: integer NOT NULL DEFAULT 1"
"TABELA: webhook_logs | COLUNA: is_success | TIPO: boolean NOT NULL DEFAULT false"
"TABELA: webhook_logs | COLUNA: created_at | TIPO: timestamp with time zone NOT NULL DEFAULT now()"
"TABELA: webhooks | COLUNA: id | TIPO: uuid NOT NULL DEFAULT gen_random_uuid()"
"TABELA: webhooks | COLUNA: name | TIPO: character varying(255) NOT NULL"
"TABELA: webhooks | COLUNA: url | TIPO: character varying(500) NOT NULL"
"TABELA: webhooks | COLUNA: events | TIPO: ARRAY NOT NULL DEFAULT '{}'::text[]"
"TABELA: webhooks | COLUNA: is_active | TIPO: boolean DEFAULT true"
"TABELA: webhooks | COLUNA: secret_key | TIPO: character varying(255)"
"TABELA: webhooks | COLUNA: created_at | TIPO: timestamp with time zone DEFAULT now()"
"TABELA: webhooks | COLUNA: updated_at | TIPO: timestamp with time zone DEFAULT now()"


chave estrangeiras


"FK: class_content.author_id -> profiles.id"
"FK: class_content.class_id -> class_instances.id"
"FK: class_courses.class_id -> class_instances.id"
"FK: class_courses.course_id -> courses.id"
"FK: class_enrollments.class_id -> class_instances.id"
"FK: class_enrollments.user_id -> profiles.id"
"FK: class_instance_content.author_id -> profiles.id"
"FK: class_instance_enrollments.user_id -> profiles.id"
"FK: class_instances.course_id -> courses.id"
"FK: class_instances.instructor_id -> profiles.id"
"FK: classes.instructor_id -> profiles.id"
"FK: comment_likes.comment_id -> comments.id"
"FK: comment_likes.user_id -> profiles.id"
"FK: comments.post_id -> posts.id"
"FK: comments.user_id -> profiles.id"
"FK: conversation_participants.conversation_id -> conversations.id"
"FK: conversation_participants.user_id -> profiles.id"
"FK: course_ratings.course_id -> courses.id"
"FK: course_ratings.user_id -> profiles.id"
"FK: courses.instructor_id -> profiles.id"
"FK: email_campaign_recipients.campaign_id -> email_campaigns.id"
"FK: email_campaign_recipients.user_id -> profiles.id"
"FK: email_campaigns.created_by -> profiles.id"
"FK: email_send_logs.campaign_id -> email_campaigns.id"
"FK: email_send_logs.recipient_id -> email_campaign_recipients.id"
"FK: email_send_logs.user_id -> profiles.id"
"FK: email_templates.created_by -> profiles.id"
"FK: enrollments.course_id -> courses.id"
"FK: enrollments.user_id -> profiles.id"
"FK: external_checkouts.course_id -> courses.id"
"FK: external_checkouts.user_id -> profiles.id"
"FK: forum_post_favorites.post_id -> forum_posts.id"
"FK: forum_post_favorites.user_id -> profiles.id"
"FK: forum_post_likes.post_id -> forum_posts.id"
"FK: forum_post_likes.user_id -> profiles.id"
"FK: forum_post_tags.post_id -> forum_posts.id"
"FK: forum_post_tags.tag_id -> forum_tags.id"
"FK: forum_posts.author_id -> profiles.id"
"FK: forum_posts.topic_id -> forum_topics.id"
"FK: forum_replies.author_id -> profiles.id"
"FK: forum_replies.parent_reply_id -> forum_replies.id"
"FK: forum_replies.post_id -> forum_posts.id"
"FK: forum_reply_likes.reply_id -> forum_replies.id"
"FK: forum_reply_likes.user_id -> profiles.id"
"FK: forum_topics.created_by -> profiles.id"
"FK: lesson_comment_likes.comment_id -> lesson_comments.id"
"FK: lesson_comment_likes.user_id -> profiles.id"
"FK: lesson_comments.lesson_id -> lessons.id"
"FK: lesson_comments.parent_id -> lesson_comments.id"
"FK: lesson_comments.user_id -> profiles.id"
"FK: lesson_completions.lesson_id -> lessons.id"
"FK: lesson_completions.user_id -> profiles.id"
"FK: lessons.module_id -> modules.id"
"FK: messages.conversation_id -> conversations.id"
"FK: messages.reply_to_id -> messages.id"
"FK: messages.sender_id -> profiles.id"
"FK: modules.course_id -> courses.id"
"FK: notifications.user_id -> profiles.id"
"FK: password_reset_tokens.user_id -> profiles.id"
"FK: payments.course_id -> courses.id"
"FK: payments.user_id -> profiles.id"
"FK: post_favorites.post_id -> posts.id"
"FK: post_favorites.user_id -> profiles.id"
"FK: post_likes.post_id -> posts.id"
"FK: post_likes.user_id -> profiles.id"
"FK: posts.author_id -> profiles.id"
"FK: temp_cpf_checkout.course_id -> courses.id"
"FK: webhook_logs.webhook_id -> webhooks.id"

Indicie 

"INDICE: class_content.class_content_pkey1 -> CREATE UNIQUE INDEX class_content_pkey1 ON public.class_content USING btree (id)"
"INDICE: class_content.idx_class_content_class_id -> CREATE INDEX idx_class_content_class_id ON public.class_content USING btree (class_id)"
"INDICE: class_courses.class_courses_class_instance_id_course_id_key -> CREATE UNIQUE INDEX class_courses_class_instance_id_course_id_key ON public.class_courses USING btree (class_id, course_id)"
"INDICE: class_courses.idx_class_courses_class_id -> CREATE INDEX idx_class_courses_class_id ON public.class_courses USING btree (class_id)"
"INDICE: class_courses.idx_class_courses_course_id -> CREATE INDEX idx_class_courses_course_id ON public.class_courses USING btree (course_id)"
"INDICE: class_courses.idx_class_courses_order_index -> CREATE INDEX idx_class_courses_order_index ON public.class_courses USING btree (order_index)"
"INDICE: class_enrollments.class_enrollments_class_id_user_id_key1 -> CREATE UNIQUE INDEX class_enrollments_class_id_user_id_key1 ON public.class_enrollments USING btree (class_id, user_id)"
"INDICE: class_enrollments.class_enrollments_pkey1 -> CREATE UNIQUE INDEX class_enrollments_pkey1 ON public.class_enrollments USING btree (id)"
"INDICE: class_enrollments.idx_class_enrollments_class_id -> CREATE INDEX idx_class_enrollments_class_id ON public.class_enrollments USING btree (class_id)"
"INDICE: class_enrollments.idx_class_enrollments_user_id -> CREATE INDEX idx_class_enrollments_user_id ON public.class_enrollments USING btree (user_id)"
"INDICE: class_instance_content.idx_class_instance_content_has_file -> CREATE INDEX idx_class_instance_content_has_file ON public.class_instance_content USING btree (file_url) WHERE (file_url IS NOT NULL)"
"INDICE: class_instance_content.idx_class_instance_content_instance_id -> CREATE INDEX idx_class_instance_content_instance_id ON public.class_instance_content USING btree (class_instance_id)"
"INDICE: class_instance_enrollments.class_enrollments_class_id_user_id_key -> CREATE UNIQUE INDEX class_enrollments_class_id_user_id_key ON public.class_instance_enrollments USING btree (class_instance_id, user_id)"
"INDICE: class_instance_enrollments.idx_class_instance_enrollments_instance_id -> CREATE INDEX idx_class_instance_enrollments_instance_id ON public.class_instance_enrollments USING btree (class_instance_id)"
"INDICE: class_instance_enrollments.idx_class_instance_enrollments_user_id -> CREATE INDEX idx_class_instance_enrollments_user_id ON public.class_instance_enrollments USING btree (user_id)"
"INDICE: class_instances.idx_class_instances_course_id -> CREATE INDEX idx_class_instances_course_id ON public.class_instances USING btree (course_id)"
"INDICE: class_instances.idx_class_instances_instructor_id -> CREATE INDEX idx_class_instances_instructor_id ON public.class_instances USING btree (instructor_id)"
"INDICE: class_instances.idx_class_instances_is_public -> CREATE INDEX idx_class_instances_is_public ON public.class_instances USING btree (is_public)"
"INDICE: classes.classes_pkey1 -> CREATE UNIQUE INDEX classes_pkey1 ON public.classes USING btree (id)"
"INDICE: classes.idx_classes_instructor_id -> CREATE INDEX idx_classes_instructor_id ON public.classes USING btree (instructor_id)"
"INDICE: classes.idx_classes_is_public -> CREATE INDEX idx_classes_is_public ON public.classes USING btree (is_public)"
"INDICE: comment_likes.comment_likes_comment_id_user_id_key -> CREATE UNIQUE INDEX comment_likes_comment_id_user_id_key ON public.comment_likes USING btree (comment_id, user_id)"
"INDICE: comment_likes.idx_comment_likes_comment_id -> CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes USING btree (comment_id)"
"INDICE: comment_likes.idx_comment_likes_created_at -> CREATE INDEX idx_comment_likes_created_at ON public.comment_likes USING btree (created_at)"
"INDICE: comment_likes.idx_comment_likes_user_id -> CREATE INDEX idx_comment_likes_user_id ON public.comment_likes USING btree (user_id)"
"INDICE: conversation_participants.conversation_participants_conversation_id_user_id_key -> CREATE UNIQUE INDEX conversation_participants_conversation_id_user_id_key ON public.conversation_participants USING btree (conversation_id, user_id)"
"INDICE: conversation_participants.idx_conversation_participants_conversation_id -> CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants USING btree (conversation_id)"
"INDICE: conversation_participants.idx_conversation_participants_last_read_at -> CREATE INDEX idx_conversation_participants_last_read_at ON public.conversation_participants USING btree (last_read_at)"
"INDICE: conversation_participants.idx_conversation_participants_user_id -> CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants USING btree (user_id)"
"INDICE: conversations.idx_conversations_type -> CREATE INDEX idx_conversations_type ON public.conversations USING btree (type)"
"INDICE: conversations.idx_conversations_updated_at -> CREATE INDEX idx_conversations_updated_at ON public.conversations USING btree (updated_at DESC)"
"INDICE: course_ratings.course_ratings_course_id_user_id_key -> CREATE UNIQUE INDEX course_ratings_course_id_user_id_key ON public.course_ratings USING btree (course_id, user_id)"
"INDICE: course_ratings.idx_course_ratings_course_id -> CREATE INDEX idx_course_ratings_course_id ON public.course_ratings USING btree (course_id)"
"INDICE: course_ratings.idx_course_ratings_user_id -> CREATE INDEX idx_course_ratings_user_id ON public.course_ratings USING btree (user_id)"
"INDICE: email_campaign_recipients.email_campaign_recipients_campaign_id_user_id_key -> CREATE UNIQUE INDEX email_campaign_recipients_campaign_id_user_id_key ON public.email_campaign_recipients USING btree (campaign_id, user_id)"
"INDICE: email_campaign_recipients.idx_email_campaign_recipients_campaign -> CREATE INDEX idx_email_campaign_recipients_campaign ON public.email_campaign_recipients USING btree (campaign_id)"
"INDICE: email_campaign_recipients.idx_email_campaign_recipients_status -> CREATE INDEX idx_email_campaign_recipients_status ON public.email_campaign_recipients USING btree (status)"
"INDICE: email_campaign_recipients.idx_email_campaign_recipients_user -> CREATE INDEX idx_email_campaign_recipients_user ON public.email_campaign_recipients USING btree (user_id)"
"INDICE: email_campaigns.idx_email_campaigns_created_by -> CREATE INDEX idx_email_campaigns_created_by ON public.email_campaigns USING btree (created_by)"
"INDICE: email_campaigns.idx_email_campaigns_scheduled -> CREATE INDEX idx_email_campaigns_scheduled ON public.email_campaigns USING btree (scheduled_at)"
"INDICE: email_campaigns.idx_email_campaigns_status -> CREATE INDEX idx_email_campaigns_status ON public.email_campaigns USING btree (status)"
"INDICE: email_campaigns.idx_email_campaigns_type -> CREATE INDEX idx_email_campaigns_type ON public.email_campaigns USING btree (campaign_type)"
"INDICE: email_send_logs.idx_email_send_logs_action -> CREATE INDEX idx_email_send_logs_action ON public.email_send_logs USING btree (action)"
"INDICE: email_send_logs.idx_email_send_logs_campaign -> CREATE INDEX idx_email_send_logs_campaign ON public.email_send_logs USING btree (campaign_id)"
"INDICE: email_send_logs.idx_email_send_logs_created -> CREATE INDEX idx_email_send_logs_created ON public.email_send_logs USING btree (created_at)"
"INDICE: email_templates.idx_email_templates_default -> CREATE INDEX idx_email_templates_default ON public.email_templates USING btree (is_default)"
"INDICE: email_templates.idx_email_templates_type -> CREATE INDEX idx_email_templates_type ON public.email_templates USING btree (campaign_type)"
"INDICE: email_verification_tokens.email_verification_tokens_email_key -> CREATE UNIQUE INDEX email_verification_tokens_email_key ON public.email_verification_tokens USING btree (email)"
"INDICE: email_verification_tokens.email_verification_tokens_token_key -> CREATE UNIQUE INDEX email_verification_tokens_token_key ON public.email_verification_tokens USING btree (token)"
"INDICE: email_verification_tokens.idx_email_verification_tokens_email -> CREATE INDEX idx_email_verification_tokens_email ON public.email_verification_tokens USING btree (email)"
"INDICE: email_verification_tokens.idx_email_verification_tokens_expires -> CREATE INDEX idx_email_verification_tokens_expires ON public.email_verification_tokens USING btree (expires_at)"
"INDICE: email_verification_tokens.idx_email_verification_tokens_token -> CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens USING btree (token)"
"INDICE: enrollments.enrollments_user_id_course_id_key -> CREATE UNIQUE INDEX enrollments_user_id_course_id_key ON public.enrollments USING btree (user_id, course_id)"
"INDICE: external_checkouts.idx_external_checkouts_course_id -> CREATE INDEX idx_external_checkouts_course_id ON public.external_checkouts USING btree (course_id)"
"INDICE: external_checkouts.idx_external_checkouts_created_at -> CREATE INDEX idx_external_checkouts_created_at ON public.external_checkouts USING btree (created_at)"
"INDICE: external_checkouts.idx_external_checkouts_payment_id -> CREATE INDEX idx_external_checkouts_payment_id ON public.external_checkouts USING btree (payment_id)"
"INDICE: external_checkouts.idx_external_checkouts_status -> CREATE INDEX idx_external_checkouts_status ON public.external_checkouts USING btree (status)"
"INDICE: external_checkouts.idx_external_checkouts_unique_pending -> CREATE UNIQUE INDEX idx_external_checkouts_unique_pending ON public.external_checkouts USING btree (user_id, course_id) WHERE (status = 'pending'::text)"
"INDICE: external_checkouts.idx_external_checkouts_user_id -> CREATE INDEX idx_external_checkouts_user_id ON public.external_checkouts USING btree (user_id)"
"INDICE: forum_post_favorites.forum_post_favorites_post_id_user_id_key -> CREATE UNIQUE INDEX forum_post_favorites_post_id_user_id_key ON public.forum_post_favorites USING btree (post_id, user_id)"
"INDICE: forum_post_likes.forum_post_likes_post_id_user_id_key -> CREATE UNIQUE INDEX forum_post_likes_post_id_user_id_key ON public.forum_post_likes USING btree (post_id, user_id)"
"INDICE: forum_post_likes.idx_forum_post_likes_post -> CREATE INDEX idx_forum_post_likes_post ON public.forum_post_likes USING btree (post_id)"
"INDICE: forum_posts.idx_forum_posts_author -> CREATE INDEX idx_forum_posts_author ON public.forum_posts USING btree (author_id)"
"INDICE: forum_posts.idx_forum_posts_topic -> CREATE INDEX idx_forum_posts_topic ON public.forum_posts USING btree (topic_id, created_at)"
"INDICE: forum_replies.idx_forum_replies_parent -> CREATE INDEX idx_forum_replies_parent ON public.forum_replies USING btree (parent_reply_id)"
"INDICE: forum_replies.idx_forum_replies_post -> CREATE INDEX idx_forum_replies_post ON public.forum_replies USING btree (post_id, created_at)"
"INDICE: forum_reply_likes.forum_reply_likes_reply_id_user_id_key -> CREATE UNIQUE INDEX forum_reply_likes_reply_id_user_id_key ON public.forum_reply_likes USING btree (reply_id, user_id)"
"INDICE: forum_reply_likes.idx_forum_reply_likes_reply -> CREATE INDEX idx_forum_reply_likes_reply ON public.forum_reply_likes USING btree (reply_id)"
"INDICE: forum_tags.forum_tags_name_key -> CREATE UNIQUE INDEX forum_tags_name_key ON public.forum_tags USING btree (name)"
"INDICE: forum_topics.forum_topics_slug_key -> CREATE UNIQUE INDEX forum_topics_slug_key ON public.forum_topics USING btree (slug)"
"INDICE: forum_topics.idx_forum_topics_active -> CREATE INDEX idx_forum_topics_active ON public.forum_topics USING btree (is_active, order_index)"
"INDICE: lesson_comment_likes.idx_lesson_comment_likes_comment_id -> CREATE INDEX idx_lesson_comment_likes_comment_id ON public.lesson_comment_likes USING btree (comment_id)"
"INDICE: lesson_comment_likes.idx_lesson_comment_likes_user_id -> CREATE INDEX idx_lesson_comment_likes_user_id ON public.lesson_comment_likes USING btree (user_id)"
"INDICE: lesson_comment_likes.lesson_comment_likes_comment_id_user_id_key -> CREATE UNIQUE INDEX lesson_comment_likes_comment_id_user_id_key ON public.lesson_comment_likes USING btree (comment_id, user_id)"
"INDICE: lesson_comments.idx_lesson_comments_created_at -> CREATE INDEX idx_lesson_comments_created_at ON public.lesson_comments USING btree (created_at)"
"INDICE: lesson_comments.idx_lesson_comments_lesson_id -> CREATE INDEX idx_lesson_comments_lesson_id ON public.lesson_comments USING btree (lesson_id)"
"INDICE: lesson_comments.idx_lesson_comments_parent_id -> CREATE INDEX idx_lesson_comments_parent_id ON public.lesson_comments USING btree (parent_id)"
"INDICE: lesson_comments.idx_lesson_comments_user_id -> CREATE INDEX idx_lesson_comments_user_id ON public.lesson_comments USING btree (user_id)"
"INDICE: lesson_completions.idx_lesson_completions_lesson_id -> CREATE INDEX idx_lesson_completions_lesson_id ON public.lesson_completions USING btree (lesson_id)"
"INDICE: lesson_completions.idx_lesson_completions_user_id -> CREATE INDEX idx_lesson_completions_user_id ON public.lesson_completions USING btree (user_id)"
"INDICE: lesson_completions.lesson_completions_user_id_lesson_id_key -> CREATE UNIQUE INDEX lesson_completions_user_id_lesson_id_key ON public.lesson_completions USING btree (user_id, lesson_id)"
"INDICE: lessons.idx_lessons_release_days -> CREATE INDEX idx_lessons_release_days ON public.lessons USING btree (release_days)"
"INDICE: lessons.idx_lessons_visible -> CREATE INDEX idx_lessons_visible ON public.lessons USING btree (is_visible)"
"INDICE: mercadopago_webhooks.idx_mercadopago_webhooks_event_type -> CREATE INDEX idx_mercadopago_webhooks_event_type ON public.mercadopago_webhooks USING btree (event_type)"
"INDICE: mercadopago_webhooks.idx_mercadopago_webhooks_external_reference -> CREATE INDEX idx_mercadopago_webhooks_external_reference ON public.mercadopago_webhooks USING btree (external_reference)"
"INDICE: mercadopago_webhooks.idx_mercadopago_webhooks_payment_id -> CREATE INDEX idx_mercadopago_webhooks_payment_id ON public.mercadopago_webhooks USING btree (payment_id)"
"INDICE: mercadopago_webhooks.idx_mercadopago_webhooks_status -> CREATE INDEX idx_mercadopago_webhooks_status ON public.mercadopago_webhooks USING btree (status)"
"INDICE: mercadopago_webhooks.mercadopago_webhooks_mp_event_id_key -> CREATE UNIQUE INDEX mercadopago_webhooks_mp_event_id_key ON public.mercadopago_webhooks USING btree (mp_event_id)"
"INDICE: messages.idx_messages_conversation_id -> CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id)"
"INDICE: messages.idx_messages_created_at -> CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC)"
"INDICE: messages.idx_messages_reply_to_id -> CREATE INDEX idx_messages_reply_to_id ON public.messages USING btree (reply_to_id)"
"INDICE: messages.idx_messages_sender_id -> CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id)"
"INDICE: migrations_applied.migrations_applied_migration_name_key -> CREATE UNIQUE INDEX migrations_applied_migration_name_key ON public.migrations_applied USING btree (migration_name)"
"INDICE: modules.idx_modules_visible -> CREATE INDEX idx_modules_visible ON public.modules USING btree (is_visible)"
"INDICE: notifications.idx_notifications_created_at -> CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at)"
"INDICE: notifications.idx_notifications_is_read -> CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read)"
"INDICE: notifications.idx_notifications_user_id -> CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id)"
"INDICE: password_reset_tokens.idx_password_reset_tokens_token -> CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token)"
"INDICE: password_reset_tokens.idx_password_reset_tokens_user_id -> CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id)"
"INDICE: password_reset_tokens.password_reset_tokens_token_key -> CREATE UNIQUE INDEX password_reset_tokens_token_key ON public.password_reset_tokens USING btree (token)"
"INDICE: payments.idx_payments_course_id -> CREATE INDEX idx_payments_course_id ON public.payments USING btree (course_id)"
"INDICE: payments.idx_payments_external_reference -> CREATE INDEX idx_payments_external_reference ON public.payments USING btree (external_reference)"
"INDICE: payments.idx_payments_gateway -> CREATE INDEX idx_payments_gateway ON public.payments USING btree (gateway)"
"INDICE: payments.idx_payments_status -> CREATE INDEX idx_payments_status ON public.payments USING btree (status)"
"INDICE: payments.idx_payments_stripe_payment_intent_id -> CREATE INDEX idx_payments_stripe_payment_intent_id ON public.payments USING btree (stripe_payment_intent_id)"
"INDICE: payments.idx_payments_user_id -> CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id)"
"INDICE: payments.payments_stripe_payment_intent_id_key -> CREATE UNIQUE INDEX payments_stripe_payment_intent_id_key ON public.payments USING btree (stripe_payment_intent_id)"
"INDICE: post_favorites.post_favorites_post_id_user_id_key -> CREATE UNIQUE INDEX post_favorites_post_id_user_id_key ON public.post_favorites USING btree (post_id, user_id)"
"INDICE: post_likes.post_likes_post_id_user_id_key -> CREATE UNIQUE INDEX post_likes_post_id_user_id_key ON public.post_likes USING btree (post_id, user_id)"
"INDICE: profiles.profiles_email_key -> CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email)"
"INDICE: stripe_webhooks.idx_stripe_webhooks_event_type -> CREATE INDEX idx_stripe_webhooks_event_type ON public.stripe_webhooks USING btree (event_type)"
"INDICE: stripe_webhooks.idx_stripe_webhooks_payment_intent_id -> CREATE INDEX idx_stripe_webhooks_payment_intent_id ON public.stripe_webhooks USING btree (payment_intent_id)"
"INDICE: stripe_webhooks.idx_stripe_webhooks_status -> CREATE INDEX idx_stripe_webhooks_status ON public.stripe_webhooks USING btree (status)"
"INDICE: stripe_webhooks.stripe_webhooks_stripe_event_id_key -> CREATE UNIQUE INDEX stripe_webhooks_stripe_event_id_key ON public.stripe_webhooks USING btree (stripe_event_id)"
"INDICE: temp_cpf_checkout.idx_temp_cpf_checkout_course_id -> CREATE INDEX idx_temp_cpf_checkout_course_id ON public.temp_cpf_checkout USING btree (course_id)"
"INDICE: temp_cpf_checkout.idx_temp_cpf_checkout_cpf -> CREATE INDEX idx_temp_cpf_checkout_cpf ON public.temp_cpf_checkout USING btree (cpf)"
"INDICE: temp_cpf_checkout.idx_temp_cpf_checkout_expires_at -> CREATE INDEX idx_temp_cpf_checkout_expires_at ON public.temp_cpf_checkout USING btree (expires_at)"
"INDICE: temp_cpf_checkout.idx_temp_cpf_checkout_is_used -> CREATE INDEX idx_temp_cpf_checkout_is_used ON public.temp_cpf_checkout USING btree (is_used)"
"INDICE: webhook_logs.idx_webhook_logs_created_at -> CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs USING btree (created_at)"
"INDICE: webhook_logs.idx_webhook_logs_event_type -> CREATE INDEX idx_webhook_logs_event_type ON public.webhook_logs USING btree (event_type)"
"INDICE: webhook_logs.idx_webhook_logs_webhook_id -> CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs USING btree (webhook_id)"
"INDICE: webhooks.idx_webhooks_active -> CREATE INDEX idx_webhooks_active ON public.webhooks USING btree (is_active)"
"INDICE: webhooks.idx_webhooks_events -> CREATE INDEX idx_webhooks_events ON public.webhooks USING gin (events)"


views 


"VIEW: class_courses_with_details ->  SELECT cc.id,
    cc.class_id AS class_instance_id,
    cc.course_id,
    cc.is_required,
    cc.order_index,
    cc.created_at,
    c.title AS course_title,
    c.description AS course_description,
    c.thumbnail_url AS course_thumbnail,
    c.level,
    c.price,
    p.name AS instructor_name,
    p.avatar_url AS instructor_avatar,
    ci.instance_name AS class_instance_name
   FROM (((class_courses cc
     JOIN courses c ON ((cc.course_id = c.id)))
     JOIN profiles p ON ((c.instructor_id = p.id)))
     JOIN class_instances ci ON ((cc.class_id = ci.id)))
  ORDER BY cc.order_index, cc.created_at;"
"VIEW: conversations_with_last_message ->  SELECT c.id,
    c.title,
    c.type,
    c.created_at,
    c.updated_at,
    lm.content AS last_message_content,
    lm.created_at AS last_message_at,
    lm.sender_name AS last_message_sender,
    array_agg(json_build_object('user_id', cp.user_id, 'name', p.name, 'avatar_url', p.avatar_url, 'last_read_at', cp.last_read_at, 'is_admin', cp.is_admin)) AS participants
   FROM (((conversations c
     LEFT JOIN conversation_participants cp ON ((c.id = cp.conversation_id)))
     LEFT JOIN profiles p ON ((cp.user_id = p.id)))
     LEFT JOIN ( SELECT DISTINCT ON (m.conversation_id) m.conversation_id,
            m.content,
            m.created_at,
            sender.name AS sender_name
           FROM (messages m
             JOIN profiles sender ON ((m.sender_id = sender.id)))
          ORDER BY m.conversation_id, m.created_at DESC) lm ON ((c.id = lm.conversation_id)))
  GROUP BY c.id, c.title, c.type, c.created_at, c.updated_at, lm.content, lm.created_at, lm.sender_name;"
"VIEW: external_checkout_stats ->  SELECT gateway,
    status,
    count(*) AS total_checkouts,
    count(
        CASE
            WHEN (status = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_checkouts,
    count(
        CASE
            WHEN (status = 'failed'::text) THEN 1
            ELSE NULL::integer
        END) AS failed_checkouts,
    count(
        CASE
            WHEN (status = 'cancelled'::text) THEN 1
            ELSE NULL::integer
        END) AS cancelled_checkouts,
    avg((EXTRACT(epoch FROM (completed_at - created_at)) / (3600)::numeric)) AS avg_completion_hours
   FROM external_checkouts
  GROUP BY gateway, status;"
"VIEW: lesson_comments_with_user ->  SELECT lc.id,
    lc.lesson_id,
    lc.user_id,
    lc.content,
    lc.parent_id,
    lc.created_at,
    lc.updated_at,
    p.name AS user_name,
    p.avatar_url AS user_avatar,
    p.role AS user_role,
    ( SELECT count(*) AS count
           FROM lesson_comment_likes
          WHERE (lesson_comment_likes.comment_id = lc.id)) AS likes_count,
    ( SELECT count(*) AS count
           FROM lesson_comments
          WHERE (lesson_comments.parent_id = lc.id)) AS replies_count
   FROM (lesson_comments lc
     JOIN profiles p ON ((lc.user_id = p.id)))
  ORDER BY lc.created_at DESC;"
"VIEW: messages_with_sender ->  SELECT m.id,
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
   FROM (((messages m
     JOIN profiles sender ON ((m.sender_id = sender.id)))
     LEFT JOIN messages reply_msg ON ((m.reply_to_id = reply_msg.id)))
     LEFT JOIN profiles reply_sender ON ((reply_msg.sender_id = reply_sender.id)));"
"VIEW: payment_details ->  SELECT p.id,
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
   FROM ((payments p
     JOIN profiles u ON ((p.user_id = u.id)))
     JOIN courses c ON ((p.course_id = c.id)));"
"VIEW: user_class_access ->  SELECT u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    c.id AS class_id,
    c.name AS class_name,
    c.is_public,
    ce.role AS user_role,
    ce.status AS enrollment_status,
    p.name AS instructor_name
   FROM (((profiles u
     JOIN class_enrollments ce ON ((u.id = ce.user_id)))
     JOIN classes c ON ((ce.class_id = c.id)))
     JOIN profiles p ON ((c.instructor_id = p.id)))
  WHERE ((ce.status = 'active'::text) AND (c.is_active = true))
UNION
 SELECT p.id AS user_id,
    p.name AS user_name,
    p.email AS user_email,
    c.id AS class_id,
    c.name AS class_name,
    c.is_public,
    'instructor'::text AS user_role,
    'active'::text AS enrollment_status,
    p.name AS instructor_name
   FROM (classes c
     JOIN profiles p ON ((c.instructor_id = p.id)))
  WHERE (c.is_active = true)
UNION
 SELECT u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    c.id AS class_id,
    c.name AS class_name,
    c.is_public,
    'viewer'::text AS user_role,
    'active'::text AS enrollment_status,
    p.name AS instructor_name
   FROM ((profiles u
     CROSS JOIN classes c)
     JOIN profiles p ON ((c.instructor_id = p.id)))
  WHERE ((c.is_public = true) AND (c.is_active = true));"


Funções 



"FUNCAO: add_default_course_to_class -> CREATE OR REPLACE FUNCTION public.add_default_course_to_class()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Adicionar o curso base da turma como primeiro curso
    -- Usar class_id em vez de class_instance_id conforme estrutura atual da tabela
    INSERT INTO public.class_courses (class_id, course_id, is_required, order_index)
    VALUES (NEW.id, NEW.course_id, true, 0);

    RETURN NEW;
END;
$function$
"
"FUNCAO: cleanup_expired_temp_cpf -> CREATE OR REPLACE FUNCTION public.cleanup_expired_temp_cpf()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM public.temp_cpf_checkout 
    WHERE expires_at < now() OR is_used = true;
END;
$function$
"
"FUNCAO: generate_slug -> CREATE OR REPLACE FUNCTION public.generate_slug(title text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN lower(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'));
END;
$function$
"
"FUNCAO: get_class_course_stats -> CREATE OR REPLACE FUNCTION public.get_class_course_stats(class_instance_uuid uuid)
 RETURNS TABLE(total_courses bigint, required_courses bigint, optional_courses bigint, total_students bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(cc.id) as total_courses,
        COUNT(cc.id) FILTER (WHERE cc.is_required = true) as required_courses,
        COUNT(cc.id) FILTER (WHERE cc.is_required = false) as optional_courses,
        COUNT(DISTINCT cie.user_id) as total_students
    FROM public.class_instances ci
    LEFT JOIN public.class_courses cc ON ci.id = cc.class_instance_id
    LEFT JOIN public.class_instance_enrollments cie ON ci.id = cie.class_instance_id
    WHERE ci.id = class_instance_uuid
    GROUP BY ci.id;
END;
$function$
"
"FUNCAO: get_or_create_direct_conversation -> CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(user1_id uuid, user2_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
    conversation_uuid UUID;
BEGIN
    -- Buscar conversa existente entre os dois usuários
    SELECT c.id INTO conversation_uuid
    FROM public.conversations c
    WHERE c.type = 'direct'
      AND EXISTS (
          SELECT 1 FROM public.conversation_participants cp1 
          WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
      )
      AND EXISTS (
          SELECT 1 FROM public.conversation_participants cp2 
          WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
      )
      AND (
          SELECT COUNT(*) FROM public.conversation_participants cp 
          WHERE cp.conversation_id = c.id
      ) = 2;

    -- Se não existe, criar nova conversa
    IF conversation_uuid IS NULL THEN
        INSERT INTO public.conversations (type) 
        VALUES ('direct') 
        RETURNING id INTO conversation_uuid;
        
        -- Adicionar os dois participantes
        INSERT INTO public.conversation_participants (conversation_id, user_id) 
        VALUES 
            (conversation_uuid, user1_id),
            (conversation_uuid, user2_id);
    END IF;

    RETURN conversation_uuid;
END;
$function$
"
"FUNCAO: get_payment_stats -> CREATE OR REPLACE FUNCTION public.get_payment_stats()
 RETURNS TABLE(gateway text, total_payments bigint, total_amount numeric, success_rate numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        p.gateway,
        COUNT(*) as total_payments,
        SUM(p.amount) as total_amount,
        ROUND(
            (COUNT(*) FILTER (WHERE p.status = 'succeeded')::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
        ) as success_rate
    FROM public.payments p
    GROUP BY p.gateway
    ORDER BY total_amount DESC;
END;
$function$
"
"FUNCAO: handle_new_user -> CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', substring(new.email from 1 for position('@' in new.email) - 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/8.x/initials/svg?seed=' || new.email),
    'free'::public.user_role
  );
  RETURN new;
END;
$function$
"
"FUNCAO: reorder_class_courses -> CREATE OR REPLACE FUNCTION public.reorder_class_courses()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Reordenar os cursos restantes
    UPDATE class_courses 
    SET order_index = subquery.new_order
    FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY order_index) - 1 as new_order
        FROM class_courses 
        WHERE class_instance_id = OLD.class_instance_id
    ) as subquery
    WHERE class_courses.id = subquery.id;
    
    RETURN OLD;
END;
$function$
"
"FUNCAO: update_conversation_on_message -> CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE public.conversations 
    SET updated_at = now() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$function$
"
"FUNCAO: update_updated_at_column -> CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
"
"FUNCAO: update_webhook_updated_at -> CREATE OR REPLACE FUNCTION public.update_webhook_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
"

triger


"TRIGGER: trigger_add_default_course na tabela class_instances -> EXECUTE FUNCTION add_default_course_to_class()"
"TRIGGER: update_conversations_updated_at na tabela conversations -> EXECUTE FUNCTION update_updated_at_column()"
"TRIGGER: update_courses_updated_at na tabela courses -> EXECUTE FUNCTION update_updated_at_column()"
"TRIGGER: update_email_campaigns_updated_at na tabela email_campaigns -> EXECUTE FUNCTION update_updated_at_column()"
"TRIGGER: update_email_templates_updated_at na tabela email_templates -> EXECUTE FUNCTION update_updated_at_column()"
"TRIGGER: update_conversation_on_new_message na tabela messages -> EXECUTE FUNCTION update_conversation_on_message()"
"TRIGGER: update_messages_updated_at na tabela messages -> EXECUTE FUNCTION update_updated_at_column()"
"TRIGGER: update_payments_updated_at na tabela payments -> EXECUTE FUNCTION update_updated_at_column()"
"TRIGGER: trigger_update_webhook_updated_at na tabela webhooks -> EXECUTE FUNCTION update_webhook_updated_at()"


cintagem de registro

NOTICE:  === CONTAGEM DE REGISTROS ===
NOTICE:  class_content: 0 registros
NOTICE:  class_courses: 5 registros
NOTICE:  class_enrollments: 0 registros
NOTICE:  class_instance_content: 2 registros
NOTICE:  class_instance_enrollments: 3 registros
NOTICE:  class_instances: 4 registros
NOTICE:  classes: 0 registros
NOTICE:  comment_likes: 0 registros
NOTICE:  comments: 17 registros
NOTICE:  conversation_participants: 10 registros
NOTICE:  conversations: 5 registros
NOTICE:  course_ratings: 5 registros
NOTICE:  courses: 10 registros
NOTICE:  email_campaign_recipients: 16 registros
NOTICE:  email_campaigns: 6 registros
NOTICE:  email_send_logs: 32 registros
NOTICE:  email_templates: 5 registros
NOTICE:  email_verification_tokens: 1 registros
NOTICE:  enrollments: 15 registros
NOTICE:  external_checkouts: 0 registros
NOTICE:  forum_post_favorites: 4 registros
NOTICE:  forum_post_likes: 5 registros
NOTICE:  forum_post_tags: 3 registros
NOTICE:  forum_posts: 3 registros
NOTICE:  forum_replies: 12 registros
NOTICE:  forum_reply_likes: 5 registros
NOTICE:  forum_tags: 10 registros
NOTICE:  forum_topics: 7 registros
NOTICE:  lesson_comment_likes: 6 registros
NOTICE:  lesson_comments: 7 registros
NOTICE:  lesson_completions: 2 registros
NOTICE:  lessons: 8 registros
NOTICE:  mercadopago_webhooks: 0 registros
NOTICE:  messages: 7 registros
NOTICE:  migrations_applied: 40 registros
NOTICE:  modules: 7 registros
NOTICE:  notifications: 5 registros
NOTICE:  password_reset_tokens: 0 registros
NOTICE:  payments: 7 registros
NOTICE:  post_favorites: 6 registros
NOTICE:  post_likes: 10 registros
NOTICE:  posts: 7 registros
NOTICE:  profiles: 8 registros
NOTICE:  stripe_webhooks: 0 registros
NOTICE:  temp_cpf_checkout: 0 registros
NOTICE:  webhook_logs: 24 registros
NOTICE:  webhooks: 1 registros
DO

Query returned successfully in 343 msec.


tamanho de tabelas 


"TAMANHO: profiles -> 152 kB"
"TAMANHO: payments -> 144 kB"
"TAMANHO: email_campaigns -> 128 kB"
"TAMANHO: conversation_participants -> 120 kB"
"TAMANHO: webhook_logs -> 112 kB"
"TAMANHO: email_verification_tokens -> 112 kB"
"TAMANHO: messages -> 96 kB"
"TAMANHO: lesson_comments -> 96 kB"
"TAMANHO: email_campaign_recipients -> 96 kB"
"TAMANHO: notifications -> 96 kB"
"TAMANHO: class_courses -> 88 kB"
"TAMANHO: class_instances -> 80 kB"
"TAMANHO: class_instance_enrollments -> 80 kB"
"TAMANHO: email_send_logs -> 80 kB"
"TAMANHO: course_ratings -> 80 kB"
"TAMANHO: lesson_completions -> 72 kB"
"TAMANHO: webhooks -> 72 kB"
"TAMANHO: lesson_comment_likes -> 72 kB"
"TAMANHO: password_reset_tokens -> 72 kB"
"TAMANHO: forum_topics -> 64 kB"
"TAMANHO: forum_posts -> 64 kB"
"TAMANHO: lessons -> 64 kB"
"TAMANHO: email_templates -> 64 kB"
"TAMANHO: class_instance_content -> 64 kB"
"TAMANHO: conversations -> 64 kB"
"TAMANHO: forum_replies -> 64 kB"
"TAMANHO: external_checkouts -> 64 kB"
"TAMANHO: mercadopago_webhooks -> 56 kB"
"TAMANHO: forum_post_likes -> 56 kB"
"TAMANHO: forum_reply_likes -> 56 kB"
"TAMANHO: modules -> 48 kB"
"TAMANHO: stripe_webhooks -> 48 kB"
"TAMANHO: temp_cpf_checkout -> 48 kB"
"TAMANHO: forum_tags -> 40 kB"
"TAMANHO: forum_post_favorites -> 40 kB"
"TAMANHO: post_favorites -> 40 kB"
"TAMANHO: comment_likes -> 40 kB"
"TAMANHO: post_likes -> 40 kB"
"TAMANHO: class_enrollments -> 40 kB"
"TAMANHO: enrollments -> 40 kB"
"TAMANHO: migrations_applied -> 40 kB"
"TAMANHO: classes -> 32 kB"
"TAMANHO: comments -> 32 kB"
"TAMANHO: courses -> 32 kB"
"TAMANHO: posts -> 32 kB"
"TAMANHO: class_content -> 24 kB"
"TAMANHO: forum_post_tags -> 24 kB"



banco


"BANCO: community"
"USUARIO: postgres"
"VERSAO: PostgreSQL 16.9 (Debian 16.9-1.pgdg120+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14) 12.2.0, 64-bit"

