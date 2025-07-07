const crypto = require('crypto');
const { sendMail } = require('../services/emailService');

// Função para processar templates com variáveis
function processTemplate(template, variables) {
  let processed = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, value || '');
  }
  return processed;
}

// Função para obter destinatários baseado na segmentação
async function getRecipients(pool, targetAudience, targetClasses = [], customFilter = null) {
  let query = `
    SELECT DISTINCT p.id, p.name, p.email, p.role
    FROM profiles p
    WHERE p.email IS NOT NULL AND p.email != ''
  `;
  
  const params = [];
  let paramIndex = 1;
  
  switch (targetAudience) {
    case 'all':
      // Todos os usuários
      break;
      
    case 'instructors':
      query += ` AND p.role IN ('admin', 'instructor')`;
      break;
      
    case 'students':
      query += ` AND p.role = 'student'`;
      break;
      
    case 'specific_classes':
      if (targetClasses && targetClasses.length > 0) {
        query += `
          AND p.id IN (
            SELECT DISTINCT cie.user_id 
            FROM class_instance_enrollments cie 
            WHERE cie.class_instance_id = ANY($${paramIndex}) 
            AND cie.status = 'active'
          )
        `;
        params.push(targetClasses);
        paramIndex++;
      }
      break;
      
    case 'custom_filter':
      if (customFilter) {
        // Implementar filtros personalizados baseado no JSONB
        if (customFilter.role) {
          query += ` AND p.role = $${paramIndex}`;
          params.push(customFilter.role);
          paramIndex++;
        }
        
        if (customFilter.createdAfter) {
          query += ` AND p.created_at >= $${paramIndex}`;
          params.push(customFilter.createdAfter);
          paramIndex++;
        }
        
        if (customFilter.hasEnrollments) {
          query += ` AND p.id IN (SELECT DISTINCT user_id FROM enrollments)`;
        }
      }
      break;
  }
  
  query += ` ORDER BY p.name`;
  
  const { rows } = await pool.query(query, params);
  return rows;
}

// Função para obter dados do conteúdo relacionado
async function getContentData(pool, referenceId, referenceType) {
  if (!referenceId || !referenceType) return {};
  
  switch (referenceType) {
    case 'post':
      const postResult = await pool.query(`
        SELECT p.*, pr.name as author_name
        FROM posts p
        JOIN profiles pr ON p.author_id = pr.id
        WHERE p.id = $1
      `, [referenceId]);
      
      if (postResult.rows.length > 0) {
        const post = postResult.rows[0];
        return {
          post_title: post.title,
          post_excerpt: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
          post_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/post/${post.id}`,
          author_name: post.author_name,
          created_at: new Date(post.created_at).toLocaleDateString('pt-BR')
        };
      }
      break;
      
    case 'forum_post':
      const forumResult = await pool.query(`
        SELECT fp.*, ft.title as topic_title, pr.name as author_name
        FROM forum_posts fp
        JOIN forum_topics ft ON fp.topic_id = ft.id
        JOIN profiles pr ON fp.author_id = pr.id
        WHERE fp.id = $1
      `, [referenceId]);
      
      if (forumResult.rows.length > 0) {
        const post = forumResult.rows[0];
        return {
          post_title: post.title,
          topic_title: post.topic_title,
          post_excerpt: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
          post_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forum/post/${post.id}`,
          author_name: post.author_name,
          created_at: new Date(post.created_at).toLocaleDateString('pt-BR')
        };
      }
      break;
      
    case 'course':
      const courseResult = await pool.query(`
        SELECT c.*, pr.name as instructor_name,
               (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = c.id) as total_lessons
        FROM courses c
        JOIN profiles pr ON c.instructor_id = pr.id
        WHERE c.id = $1
      `, [referenceId]);
      
      if (courseResult.rows.length > 0) {
        const course = courseResult.rows[0];
        return {
          course_title: course.title,
          course_description: course.description,
          course_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/course/${course.id}`,
          instructor_name: course.instructor_name,
          total_lessons: course.total_lessons,
          course_level: course.level || 'Intermediário',
          course_duration: course.duration || 'Variável'
        };
      }
      break;
      
    case 'lesson':
      const lessonResult = await pool.query(`
        SELECT l.*, m.title as module_title, c.title as course_title, c.id as course_id, pr.name as instructor_name
        FROM lessons l
        JOIN modules m ON l.module_id = m.id
        JOIN courses c ON m.course_id = c.id
        JOIN profiles pr ON c.instructor_id = pr.id
        WHERE l.id = $1
      `, [referenceId]);
      
      if (lessonResult.rows.length > 0) {
        const lesson = lessonResult.rows[0];
        return {
          lesson_title: lesson.title,
          lesson_description: lesson.description,
          lesson_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/player?courseId=${lesson.course_id}&lessonId=${lesson.id}`,
          course_title: lesson.course_title,
          module_title: lesson.module_title,
          instructor_name: lesson.instructor_name,
          lesson_duration: lesson.duration || 'Variável'
        };
      }
      break;
      
    case 'class_material':
      // Implementar para materiais de turma
      break;
  }
  
  return {};
}

// Função para criar campanha
async function createCampaign(pool, campaignData, userId) {
  const {
    name,
    subject,
    html_content,
    text_content,
    campaign_type,
    target_audience,
    target_classes,
    custom_filter,
    scheduled_at,
    reference_id,
    reference_type
  } = campaignData;
  
  const id = crypto.randomUUID();
  
  const { rows } = await pool.query(`
    INSERT INTO email_campaigns (
      id, name, subject, html_content, text_content, campaign_type,
      target_audience, target_classes, custom_filter, scheduled_at,
      created_by, reference_id, reference_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    id, name, subject, html_content, text_content, campaign_type,
    target_audience, target_classes, custom_filter, scheduled_at,
    userId, reference_id, reference_type
  ]);
  
  return rows[0];
}

// Função para obter campanhas
async function getCampaigns(pool, userId, filters = {}) {
  let query = `
    SELECT ec.*, p.name as creator_name,
           (SELECT COUNT(*) FROM email_campaign_recipients WHERE campaign_id = ec.id) as recipients_count
    FROM email_campaigns ec
    JOIN profiles p ON ec.created_by = p.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;
  
  // Filtrar por status
  if (filters.status) {
    query += ` AND ec.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }
  
  // Filtrar por tipo
  if (filters.campaign_type) {
    query += ` AND ec.campaign_type = $${paramIndex}`;
    params.push(filters.campaign_type);
    paramIndex++;
  }
  
  // Filtrar por criador (se não for admin)
  const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [userId]);
  if (userResult.rows.length > 0 && userResult.rows[0].role !== 'admin') {
    query += ` AND ec.created_by = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }
  
  query += ` ORDER BY ec.created_at DESC`;
  
  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
  }
  
  const { rows } = await pool.query(query, params);
  return rows;
}

// Função para obter campanha específica
async function getCampaign(pool, campaignId, userId) {
  const { rows } = await pool.query(`
    SELECT ec.*, p.name as creator_name
    FROM email_campaigns ec
    JOIN profiles p ON ec.created_by = p.id
    WHERE ec.id = $1
  `, [campaignId]);
  
  if (rows.length === 0) {
    throw new Error('Campanha não encontrada');
  }
  
  const campaign = rows[0];
  
  // Verificar permissão
  const userResult = await pool.query('SELECT role FROM profiles WHERE id = $1', [userId]);
  if (userResult.rows.length > 0 && userResult.rows[0].role !== 'admin' && campaign.created_by !== userId) {
    throw new Error('Sem permissão para acessar esta campanha');
  }
  
  return campaign;
}

// Função para atualizar campanha
async function updateCampaign(pool, campaignId, updateData, userId) {
  const campaign = await getCampaign(pool, campaignId, userId);
  
  const allowedFields = [
    'name', 'subject', 'html_content', 'text_content', 'campaign_type',
    'target_audience', 'target_classes', 'custom_filter', 'scheduled_at'
  ];
  
  const updateFields = [];
  const params = [];
  let paramIndex = 1;
  
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updateFields.push(`${field} = $${paramIndex}`);
      params.push(updateData[field]);
      paramIndex++;
    }
  }
  
  if (updateFields.length === 0) {
    throw new Error('Nenhum campo válido para atualizar');
  }
  
  params.push(campaignId);
  
  const { rows } = await pool.query(`
    UPDATE email_campaigns 
    SET ${updateFields.join(', ')}, updated_at = NOW()
    WHERE id = $${paramIndex}
    RETURNING *
  `, params);
  
  return rows[0];
}

// Função para deletar campanha
async function deleteCampaign(pool, campaignId, userId) {
  const campaign = await getCampaign(pool, campaignId, userId);
  
  if (campaign.status === 'sent' || campaign.status === 'sending') {
    throw new Error('Não é possível deletar uma campanha já enviada');
  }
  
  await pool.query('DELETE FROM email_campaigns WHERE id = $1', [campaignId]);
  return { success: true };
}

// Função para agendar campanha
async function scheduleCampaign(pool, campaignId, scheduledAt, userId) {
  const campaign = await getCampaign(pool, campaignId, userId);
  
  if (campaign.status !== 'draft') {
    throw new Error('Apenas campanhas em rascunho podem ser agendadas');
  }
  
  const { rows } = await pool.query(`
    UPDATE email_campaigns 
    SET status = 'scheduled', scheduled_at = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [scheduledAt, campaignId]);
  
  return rows[0];
}

// Função para cancelar campanha
async function cancelCampaign(pool, campaignId, userId) {
  const campaign = await getCampaign(pool, campaignId, userId);
  
  if (campaign.status === 'sent') {
    throw new Error('Não é possível cancelar uma campanha já enviada');
  }
  
  const { rows } = await pool.query(`
    UPDATE email_campaigns 
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [campaignId]);
  
  return rows[0];
}

// Função para enviar campanha imediatamente
async function sendCampaignNow(pool, campaignId, userId) {
  const campaign = await getCampaign(pool, campaignId, userId);
  
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new Error('Apenas campanhas em rascunho ou agendadas podem ser enviadas');
  }
  
  // Atualizar status para enviando
  await pool.query(`
    UPDATE email_campaigns 
    SET status = 'sending', updated_at = NOW()
    WHERE id = $1
  `, [campaignId]);
  
  try {
    // Obter destinatários
    const recipients = await getRecipients(pool, campaign.target_audience, campaign.target_classes, campaign.custom_filter);
    
    if (recipients.length === 0) {
      throw new Error('Nenhum destinatário encontrado para esta campanha');
    }
    
    // Obter dados do conteúdo relacionado
    const contentData = await getContentData(pool, campaign.reference_id, campaign.reference_type);
    
    // Processar templates
    const subject = processTemplate(campaign.subject, contentData);
    const htmlContent = processTemplate(campaign.html_content, contentData);
    const textContent = campaign.text_content ? processTemplate(campaign.text_content, contentData) : null;
    
    // Criar registros de destinatários
    const recipientIds = [];
    for (const recipient of recipients) {
      const recipientId = crypto.randomUUID();
      await pool.query(`
        INSERT INTO email_campaign_recipients (id, campaign_id, user_id, email, name, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
      `, [recipientId, campaignId, recipient.id, recipient.email, recipient.name]);
      recipientIds.push(recipientId);
    }
    
    // Atualizar contagem de destinatários
    await pool.query(`
      UPDATE email_campaigns 
      SET total_recipients = $1, updated_at = NOW()
      WHERE id = $2
    `, [recipients.length, campaignId]);
    
    // Enviar emails
    let sentCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const recipientId = recipientIds[i];
      
      try {
        // Adicionar variáveis específicas do destinatário
        const recipientData = {
          ...contentData,
          user_name: recipient.name,
          user_email: recipient.email,
          unsubscribe_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/unsubscribe?email=${encodeURIComponent(recipient.email)}`
        };
        
        const finalSubject = processTemplate(subject, recipientData);
        const finalHtml = processTemplate(htmlContent, recipientData);
        const finalText = textContent ? processTemplate(textContent, recipientData) : null;
        
        // Adicionar pixel de rastreamento para abertura
        const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email-campaigns/webhook/${campaignId}/${recipientId}/opened" width="1" height="1" style="display:none;" alt="" />`;
        
        // Adicionar o pixel no final do HTML, mesmo se não houver tag </body>
        let htmlWithTracking;
        if (finalHtml.includes('</body>')) {
          htmlWithTracking = finalHtml.replace('</body>', `${trackingPixel}</body>`);
        } else {
          htmlWithTracking = finalHtml + trackingPixel;
        }
        
        // Adicionar rastreamento de cliques nos links
        const htmlWithClickTracking = htmlWithTracking.replace(
          /<a\s+href="([^"]+)"/gi,
          `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email-campaigns/webhook/${campaignId}/${recipientId}/clicked?url=$1"`
        );
        
        // Enviar email
        await sendMail({
          to: recipient.email,
          subject: finalSubject,
          html: htmlWithClickTracking,
          text: finalText
        });
        
        // Atualizar status do destinatário para 'delivered' (assumindo que foi entregue)
        await pool.query(`
          UPDATE email_campaign_recipients 
          SET status = 'delivered', sent_at = NOW(), delivered_at = NOW(), was_delivered = true
          WHERE id = $1
        `, [recipientId]);
        
        // Registrar log
        await pool.query(`
          INSERT INTO email_send_logs (campaign_id, recipient_id, user_id, email, action)
          VALUES ($1, $2, $3, $4, 'sent')
        `, [campaignId, recipientId, recipient.id, recipient.email]);
        
        sentCount++;
        
        // Pequena pausa para não sobrecarregar o servidor SMTP
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Erro ao enviar email para ${recipient.email}:`, error);
        
        // Atualizar status do destinatário
        await pool.query(`
          UPDATE email_campaign_recipients 
          SET status = 'failed', bounce_reason = $1
          WHERE id = $2
        `, [error.message, recipientId]);
        
        // Registrar log
        await pool.query(`
          INSERT INTO email_send_logs (campaign_id, recipient_id, user_id, email, action, details)
          VALUES ($1, $2, $3, $4, 'failed', $5)
        `, [campaignId, recipientId, recipient.id, recipient.email, { error: error.message }]);
        
        failedCount++;
      }
    }
    
    // Atualizar status final da campanha
    await pool.query(`
      UPDATE email_campaigns 
      SET status = 'sent', sent_at = NOW(), sent_count = $1, updated_at = NOW()
      WHERE id = $2
    `, [sentCount, campaignId]);
    
    return {
      success: true,
      total_recipients: recipients.length,
      sent_count: sentCount,
      failed_count: failedCount
    };
    
  } catch (error) {
    // Em caso de erro, voltar status para draft
    await pool.query(`
      UPDATE email_campaigns 
      SET status = 'draft', updated_at = NOW()
      WHERE id = $1
    `, [campaignId]);
    
    throw error;
  }
}

// Função para obter templates
async function getTemplates(pool, campaignType = null) {
  let query = `
    SELECT et.*, p.name as creator_name
    FROM email_templates et
    JOIN profiles p ON et.created_by = p.id
  `;
  
  const params = [];
  
  if (campaignType) {
    query += ` WHERE et.campaign_type = $1`;
    params.push(campaignType);
  }
  
  query += ` ORDER BY et.is_default DESC, et.name ASC`;
  
  const { rows } = await pool.query(query, params);
  return rows;
}

// Função para obter estatísticas da campanha
async function getCampaignStats(pool, campaignId, userId) {
  const campaign = await getCampaign(pool, campaignId, userId);
  
  // Estatísticas baseadas nas flags booleanas
  const statsResult = await pool.query(`
    SELECT 
      COUNT(*) as total_recipients,
      COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
      COUNT(CASE WHEN was_delivered THEN 1 END) as delivered_count,
      COUNT(CASE WHEN was_opened THEN 1 END) as opened_count,
      COUNT(CASE WHEN was_clicked THEN 1 END) as clicked_count,
      COUNT(CASE WHEN was_bounced THEN 1 END) as bounced_count,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
    FROM email_campaign_recipients
    WHERE campaign_id = $1
  `, [campaignId]);
  
  const stats = statsResult.rows[0];
  
  // Logs recentes
  const logsResult = await pool.query(`
    SELECT esl.*, p.name as user_name
    FROM email_send_logs esl
    JOIN profiles p ON esl.user_id = p.id
    WHERE esl.campaign_id = $1
    ORDER BY esl.created_at DESC
    LIMIT 50
  `, [campaignId]);
  
  return {
    campaign,
    stats,
    recent_logs: logsResult.rows
  };
}

// Função para processar webhooks de email (abertura, clique, etc.)
async function processEmailWebhook(pool, campaignId, recipientId, action, details = {}) {
  console.log(`[WEBHOOK] Processando ${action} para campanha ${campaignId}, destinatário ${recipientId}`);
  
  const statusMap = {
    'delivered': 'delivered',
    'opened': 'opened',
    'clicked': 'clicked',
    'bounced': 'bounced'
  };
  const flagMap = {
    'delivered': 'was_delivered',
    'opened': 'was_opened',
    'clicked': 'was_clicked',
    'bounced': 'was_bounced'
  };
  
  if (statusMap[action]) {
    // Atualizar status e flag booleana do destinatário
    await pool.query(`
      UPDATE email_campaign_recipients 
      SET status = $1, ${action}_at = NOW(), ${flagMap[action]} = true
      WHERE id = $2
    `, [statusMap[action], recipientId]);
    
    console.log(`[WEBHOOK] Status e flag atualizados para ${action}`);
  }
  
  // Buscar informações do destinatário para o log
  const recipientResult = await pool.query(`
    SELECT user_id, email FROM email_campaign_recipients WHERE id = $1
  `, [recipientId]);
  
  if (recipientResult.rows.length > 0) {
    const recipient = recipientResult.rows[0];
    
    // Registrar log
    await pool.query(`
      INSERT INTO email_send_logs (campaign_id, recipient_id, user_id, email, action, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [campaignId, recipientId, recipient.user_id, recipient.email, action, details]);
    
    console.log(`[WEBHOOK] Log registrado para ${action}`);
  }
}

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  scheduleCampaign,
  cancelCampaign,
  sendCampaignNow,
  getTemplates,
  getCampaignStats,
  processEmailWebhook,
  getRecipients,
  getContentData
}; 