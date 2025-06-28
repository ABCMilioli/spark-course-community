# Sistema de Comentários e Notificações

Este documento descreve como configurar e usar o sistema de comentários e notificações implementado no projeto.

## 📋 Funcionalidades Implementadas

### ✅ Sistema de Comentários
- Comentários em aulas específicas
- Curtidas em comentários
- Sistema de respostas aninhadas (preparado)
- Contadores de likes e respostas
- Interface responsiva e moderna

### ✅ Sistema de Notificações
- Notificações em tempo real
- Diferentes tipos: comentário, resposta, like, sistema
- Contador de notificações não lidas
- Interface no header da aplicação

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

1. **`lesson_comments`** - Comentários das aulas
   - `id` (UUID, Primary Key)
   - `lesson_id` (UUID, Foreign Key)
   - `user_id` (UUID, Foreign Key)
   - `content` (TEXT)
   - `parent_id` (UUID, Foreign Key para respostas)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

2. **`lesson_comment_likes`** - Curtidas nos comentários
   - `id` (UUID, Primary Key)
   - `comment_id` (UUID, Foreign Key)
   - `user_id` (UUID, Foreign Key)
   - `created_at` (TIMESTAMPTZ)
   - Unique constraint em (comment_id, user_id)

3. **`notifications`** - Notificações dos usuários
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key)
   - `title` (TEXT)
   - `message` (TEXT)
   - `type` (TEXT: 'comment', 'reply', 'like', 'system')
   - `reference_id` (UUID)
   - `reference_type` (TEXT)
   - `is_read` (BOOLEAN)
   - `created_at` (TIMESTAMPTZ)

### Views e Índices
- **`lesson_comments_with_user`** - View com informações do usuário e contadores
- Índices para performance em todas as tabelas
- Trigger para atualizar `updated_at` automaticamente

## 🚀 Configuração

### 1. Configurar Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no seu arquivo `.env`:

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha
POSTGRES_DB=spark_community

# JWT
JWT_SECRET=seu_jwt_secret
```

### 2. Executar Script de Configuração

```bash
# Usando npm
npm run setup-db

# Ou executar diretamente
node scripts/setup-database.js
```

### 3. Verificar Instalação

Após executar o script, você deve ver a mensagem:
```
✅ Banco de dados configurado com sucesso!
📋 Tabelas criadas:
   - lesson_comments
   - lesson_comment_likes
   - notifications
   - Índices e views
```

## 🔧 Endpoints da API

### Comentários

- `GET /api/lessons/:lessonId/comments` - Buscar comentários de uma aula
- `POST /api/lessons/:lessonId/comments` - Criar novo comentário
- `POST /api/comments/:commentId/like` - Curtir/descurtir comentário

### Notificações

- `GET /api/notifications` - Buscar notificações do usuário
- `GET /api/notifications/count` - Contador de notificações não lidas

## 🎨 Componentes Frontend

### `LessonComments.tsx`
- Exibe lista de comentários
- Formulário para adicionar comentários
- Sistema de curtidas
- Interface responsiva

### `NotificationBell.tsx`
- Ícone de notificações no header
- Contador de notificações não lidas
- Popover com lista de notificações
- Atualização automática a cada 30 segundos

## 📱 Como Usar

### Para Usuários
1. Acesse uma aula no player de vídeo (`/player?courseId=...`)
2. Role para baixo até a seção "Comentários"
3. Digite seu comentário e clique em "Comentar"
4. Use o botão de coração para curtir comentários
5. Veja notificações no ícone do sino no header

### Para Desenvolvedores
1. Os comentários são carregados automaticamente quando você acessa uma aula
2. As notificações são atualizadas a cada 30 segundos
3. Todos os dados são sincronizados em tempo real

## 🔮 Próximas Funcionalidades

- [ ] Sistema de respostas aninhadas completo
- [ ] Edição e exclusão de comentários
- [ ] Moderação de comentários
- [ ] Notificações push
- [ ] Filtros e busca em comentários
- [ ] Sistema de denúncias

## 🐛 Solução de Problemas

### Erro de Conexão com Banco
```
❌ Erro ao configurar banco de dados: connect ECONNREFUSED
```
**Solução:** Verifique se o PostgreSQL está rodando e as variáveis de ambiente estão corretas.

### Erro de Tabela Não Encontrada
```
❌ relation "lessons" does not exist
```
**Solução:** Certifique-se de que as tabelas básicas do sistema (lessons, profiles) já existem.

### Comentários Não Aparecem
**Solução:** Verifique se o usuário está autenticado e se a aula existe no banco de dados.

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do console do navegador
2. Logs do backend
3. Estrutura do banco de dados
4. Configuração das variáveis de ambiente 