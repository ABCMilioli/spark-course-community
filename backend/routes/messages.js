const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

module.exports = (pool, createNotification, getUserName) => {
  // Enviar mensagem
  router.post('/conversations/:id/messages', authenticateToken, async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { content, type = 'text', reply_to_id = null } = req.body;
      const userId = req.user.id;

      if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Conteúdo da mensagem é obrigatório.' });
      }

      // Verificar se o usuário é participante da conversa
      const participantCheck = await pool.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a esta conversa.' });
      }

      // Verificar se reply_to_id existe na conversa (se fornecido)
      if (reply_to_id) {
        const replyCheck = await pool.query(
          'SELECT 1 FROM messages WHERE id = $1 AND conversation_id = $2',
          [reply_to_id, conversationId]
        );
        if (replyCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Mensagem de resposta não encontrada.' });
        }
      }

      // Inserir mensagem
      const messageResult = await pool.query(`
        INSERT INTO messages (conversation_id, sender_id, content, type, reply_to_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [conversationId, userId, content.trim(), type, reply_to_id]);

      const messageId = messageResult.rows[0].id;

      // Buscar mensagem completa com dados do remetente
      const fullMessage = await pool.query(`
        SELECT * FROM messages_with_sender WHERE id = $1
      `, [messageId]);

      // Buscar outros participantes para notificar
      const otherParticipants = await pool.query(`
        SELECT cp.user_id, p.name
        FROM conversation_participants cp
        JOIN profiles p ON cp.user_id = p.id
        WHERE cp.conversation_id = $1 AND cp.user_id != $2
      `, [conversationId, userId]);

      // Criar notificações para outros participantes
      const senderName = await getUserName(userId);
      for (const participant of otherParticipants.rows) {
        await createNotification(
          participant.user_id,
          'Nova mensagem',
          `${senderName} enviou uma mensagem`,
          'new_message',
          conversationId,
          'conversation'
        );
      }

      res.status(201).json(fullMessage.rows[0]);
    } catch (err) {
      console.error('[POST /api/conversations/:id/messages]', err);
      res.status(500).json({ error: 'Erro ao enviar mensagem.' });
    }
  });

  // Carregar mensagens mais antigas
  router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const { before, limit = 20 } = req.query;
      const userId = req.user.id;

      // Verificar se o usuário é participante da conversa
      const participantCheck = await pool.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a esta conversa.' });
      }

      let query = `
        SELECT * FROM messages_with_sender
        WHERE conversation_id = $1
      `;
      const params = [conversationId];

      if (before) {
        query += ` AND created_at < (SELECT created_at FROM messages WHERE id = $2)`;
        params.push(before);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));

      const { rows } = await pool.query(query, params);
      
      res.json({
        messages: rows.reverse(), // Ordem cronológica
        hasMore: rows.length === parseInt(limit)
      });
    } catch (err) {
      console.error('[GET /api/conversations/:id/messages]', err);
      res.status(500).json({ error: 'Erro ao carregar mensagens.' });
    }
  });

  // Marcar conversa como lida
  router.post('/conversations/:id/mark-read', authenticateToken, async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const userId = req.user.id;

      // Verificar se o usuário é participante da conversa
      const participantCheck = await pool.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Acesso negado a esta conversa.' });
      }

      // Atualizar timestamp de leitura
      await pool.query(`
        UPDATE conversation_participants 
        SET last_read_at = NOW()
        WHERE conversation_id = $1 AND user_id = $2
      `, [conversationId, userId]);

      res.json({ success: true });
    } catch (err) {
      console.error('[POST /api/conversations/:id/mark-read]', err);
      res.status(500).json({ error: 'Erro ao marcar como lida.' });
    }
  });

  // Buscar usuários para iniciar conversa
  router.get('/users/search', authenticateToken, async (req, res) => {
    try {
      const { q, limit = 10 } = req.query;
      const userId = req.user.id;

      if (!q || q.trim() === '') {
        return res.json([]);
      }

      const { rows } = await pool.query(`
        SELECT id, name, avatar_url, role
        FROM profiles
        WHERE id != $1 
          AND (name ILIKE $2 OR email ILIKE $2)
        ORDER BY name
        LIMIT $3
      `, [userId, `%${q.trim()}%`, parseInt(limit)]);

      res.json(rows);
    } catch (err) {
      console.error('[GET /api/users/search]', err);
      res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
  });

  // Contar mensagens não lidas
  router.get('/conversations/unread-count', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;

      // Verificar se as tabelas existem primeiro
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'conversations'
        ) as conversations_exist,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'conversation_participants'
        ) as participants_exist,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'messages'
        ) as messages_exist
      `);

      const { conversations_exist, participants_exist, messages_exist } = tableCheck.rows[0];

      // Se as tabelas não existem, retornar 0
      if (!conversations_exist || !participants_exist || !messages_exist) {
        return res.json({ 
          unread_count: 0,
          total_conversations: 0
        });
      }

      // Contar mensagens não lidas
      const { rows } = await pool.query(`
        SELECT COUNT(*) as unread_count
        FROM messages m
        JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
        WHERE cp.user_id = $1 
          AND m.sender_id != $1
          AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      `, [userId]);

      // Contar total de conversas
      const { rows: conversationCount } = await pool.query(`
        SELECT COUNT(DISTINCT conversation_id) as total_conversations
        FROM conversation_participants
        WHERE user_id = $1
      `, [userId]);

      res.json({
        unread_count: parseInt(rows[0].unread_count),
        total_conversations: parseInt(conversationCount[0].total_conversations)
      });
    } catch (err) {
      console.error('[GET /api/conversations/unread-count]', err);
      res.status(500).json({ error: 'Erro ao contar mensagens não lidas.' });
    }
  });

  // Buscar conversa específica por ID
  router.get('/conversations/:id', authenticateToken, async (req, res) => {
    try {
      const { id: conversationId } = req.params;
      const userId = req.user.id;
      const { limit = 50, offset = 0 } = req.query;

      console.log('[GET /api/conversations/:id] Buscando conversa:', conversationId, 'para usuário:', userId);

      // Verificar se o usuário é participante da conversa
      const participantCheck = await pool.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        console.log('[GET /api/conversations/:id] Usuário não é participante da conversa');
        return res.status(403).json({ error: 'Acesso negado a esta conversa.' });
      }

      // Buscar dados da conversa
      const conversationResult = await pool.query(
        'SELECT * FROM conversations WHERE id = $1',
        [conversationId]
      );

      if (conversationResult.rows.length === 0) {
        console.log('[GET /api/conversations/:id] Conversa não encontrada');
        return res.status(404).json({ error: 'Conversa não encontrada.' });
      }

      // Buscar participantes
      const participantsResult = await pool.query(`
        SELECT cp.*, p.name, p.avatar_url, p.role
        FROM conversation_participants cp
        JOIN profiles p ON cp.user_id = p.id
        WHERE cp.conversation_id = $1
      `, [conversationId]);

      // Buscar mensagens
      const messagesResult = await pool.query(`
        SELECT * FROM messages_with_sender
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [conversationId, limit, offset]);

      // Marcar mensagens como lidas
      await pool.query(`
        UPDATE conversation_participants 
        SET last_read_at = NOW()
        WHERE conversation_id = $1 AND user_id = $2
      `, [conversationId, userId]);

      // Processar dados para adicionar other_user na conversa
      const conversation = conversationResult.rows[0];
      const participants = participantsResult.rows;
      const otherUser = participants.find(p => p.user_id !== userId);
      
      console.log('[GET /api/conversations/:id] Dados processados:', {
        conversationId,
        userId,
        participantsCount: participants.length,
        otherUser: otherUser ? {
          id: otherUser.user_id,
          name: otherUser.name
        } : null,
        messagesCount: messagesResult.rows.length
      });
      
      const processedConversation = {
        ...conversation,
        other_user: otherUser ? {
          id: otherUser.user_id,
          name: otherUser.name,
          avatar_url: otherUser.avatar_url,
          role: otherUser.role || 'user'
        } : null
      };

      console.log('[GET /api/conversations/:id] Conversa encontrada:', processedConversation.id);
      
      const response = {
        conversation: processedConversation,
        participants: participants,
        messages: messagesResult.rows.reverse(), // Ordem cronológica
        hasMore: messagesResult.rows.length === parseInt(limit)
      };
      
      console.log('[GET /api/conversations/:id] Estrutura da resposta:', {
        hasConversation: !!response.conversation,
        hasOtherUser: !!response.conversation.other_user,
        participantsCount: response.participants.length,
        messagesCount: response.messages.length
      });
      
      res.json(response);
    } catch (err) {
      console.error('[GET /api/conversations/:id] Erro:', err);
      res.status(500).json({ error: 'Erro ao carregar conversa.' });
    }
  });

  // Listar conversas do usuário
  router.get('/conversations', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      
      console.log('[GET /api/conversations] Buscando conversas para usuário:', userId);

      // Verificar se as tabelas existem primeiro
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'conversations'
        ) as conversations_exist,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'conversation_participants'
        ) as participants_exist,
        EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'messages'
        ) as messages_exist
      `);

      const { conversations_exist, participants_exist, messages_exist } = tableCheck.rows[0];
      console.log('[GET /api/conversations] Tabelas existem:', { conversations_exist, participants_exist, messages_exist });

      // Se as tabelas não existem, retornar array vazio
      if (!conversations_exist || !participants_exist || !messages_exist) {
        console.log('[GET /api/conversations] Tabelas não existem, retornando array vazio');
        return res.json([]);
      }

      // Usar a view que já existe no banco (como no código antigo)
      const { rows } = await pool.query(`
        SELECT * FROM conversations_with_last_message 
        WHERE id IN (
          SELECT conversation_id 
          FROM conversation_participants 
          WHERE user_id = $1
        )
        ORDER BY last_message_at DESC NULLS LAST, created_at DESC
      `, [userId]);

      // Processar dados para adicionar other_user
      const processedConversations = rows.map(conversation => {
        const participants = conversation.participants || [];
        const otherUser = participants.find(p => p.user_id !== userId);
        
        return {
          ...conversation,
          other_user: otherUser ? {
            id: otherUser.user_id,
            name: otherUser.name,
            avatar_url: otherUser.avatar_url,
            role: otherUser.role || 'user'
          } : null
        };
      });

      console.log('[GET /api/conversations] Conversas encontradas:', processedConversations.length);
      res.json(processedConversations);
    } catch (err) {
      console.error('[GET /api/conversations] Erro:', err);
      res.status(500).json({ error: 'Erro ao carregar conversas.' });
    }
  });

  // Criar conversa direta entre dois usuários
  router.post('/conversations/direct', authenticateToken, async (req, res) => {
    try {
      const { otherUserId } = req.body;
      const userId = req.user.id;

      console.log('[POST /api/conversations/direct] Criando conversa direta entre:', userId, 'e', otherUserId);

      if (!otherUserId) {
        return res.status(400).json({ error: 'ID do outro usuário é obrigatório.' });
      }

      if (otherUserId === userId) {
        return res.status(400).json({ error: 'Não é possível criar conversa consigo mesmo.' });
      }

      // Verificar se o outro usuário existe
      const userCheck = await pool.query('SELECT 1 FROM profiles WHERE id = $1', [otherUserId]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Usar função do banco para obter ou criar conversa
      const { rows } = await pool.query(
        'SELECT get_or_create_direct_conversation($1, $2) as conversation_id',
        [userId, otherUserId]
      );

      const conversationId = rows[0].conversation_id;
      
      // Buscar dados da conversa criada/encontrada com processamento do other_user
      const conversationData = await pool.query(`
        SELECT * FROM conversations_with_last_message WHERE id = $1
      `, [conversationId]);

      if (conversationData.rows.length === 0) {
        return res.status(404).json({ error: 'Conversa não encontrada.' });
      }

      // Processar dados para adicionar other_user
      const conversation = conversationData.rows[0];
      const participants = conversation.participants || [];
      const otherUser = participants.find(p => p.user_id !== userId);
      
      const processedConversation = {
        ...conversation,
        other_user: otherUser ? {
          id: otherUser.user_id,
          name: otherUser.name,
          avatar_url: otherUser.avatar_url,
          role: otherUser.role || 'user'
        } : null
      };

      console.log('[POST /api/conversations/direct] Conversa criada/encontrada:', processedConversation.id);
      res.json(processedConversation);
    } catch (err) {
      console.error('[POST /api/conversations/direct]', err);
      res.status(500).json({ error: 'Erro ao criar conversa.' });
    }
  });

  // Criar nova conversa
  router.post('/conversations', authenticateToken, async (req, res) => {
    try {
      const { title, type = 'direct', participant_ids } = req.body;
      const userId = req.user.id;

      if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
        return res.status(400).json({ error: 'IDs dos participantes são obrigatórios.' });
      }

      // Verificar se todos os participantes existem
      const participantsCheck = await pool.query(`
        SELECT id FROM profiles WHERE id = ANY($1)
      `, [participant_ids]);

      if (participantsCheck.rows.length !== participant_ids.length) {
        return res.status(400).json({ error: 'Um ou mais participantes não encontrados.' });
      }

      // Verificar se já existe uma conversa direta entre os usuários
      if (type === 'direct' && participant_ids.length === 1) {
        const existingConversation = await pool.query(`
          SELECT c.id
          FROM conversations c
          JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
          JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
          WHERE c.type = 'direct'
            AND cp1.user_id = $1
            AND cp2.user_id = $2
        `, [userId, participant_ids[0]]);

        if (existingConversation.rows.length > 0) {
          return res.json(existingConversation.rows[0]);
        }
      }

      // Criar conversa
      const conversationResult = await pool.query(`
        INSERT INTO conversations (title, type)
        VALUES ($1, $2)
        RETURNING id
      `, [title || 'Nova conversa', type]);

      const conversationId = conversationResult.rows[0].id;

      // Adicionar participantes
      const allParticipants = [userId, ...participant_ids];
      for (const participantId of allParticipants) {
        await pool.query(`
          INSERT INTO conversation_participants (conversation_id, user_id)
          VALUES ($1, $2)
        `, [conversationId, participantId]);
      }

      // Buscar conversa criada
      const { rows } = await pool.query(`
        SELECT * FROM conversations WHERE id = $1
      `, [conversationId]);

      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('[POST /api/conversations]', err);
      res.status(500).json({ error: 'Erro ao criar conversa.' });
    }
  });

  return router;
}; 