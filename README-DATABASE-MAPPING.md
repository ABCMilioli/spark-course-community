# Mapeamento da Estrutura do Banco de Dados

Este documento explica como extrair e mapear toda a estrutura do banco de dados PostgreSQL para recriar o ambiente em outro local.

## 📋 Pré-requisitos

- Acesso ao banco de dados PostgreSQL (produção ou desenvolvimento)
- pgAdmin instalado OU psql no terminal
- Conhecimento das credenciais de acesso ao banco

## 🚀 Métodos de Extração

### Método 1: Usando pgAdmin (Recomendado)

1. **Abra o pgAdmin** e conecte-se ao banco de dados
2. **Abra o Query Tool** (ícone de lupa ou Ctrl+Shift+Q)
3. **Copie e cole** o conteúdo do arquivo `scripts/pgadmin-extract.sql`
4. **Execute o script** (F5 ou botão Execute)
5. **Salve os resultados** copiando cada seção para arquivos separados

### Método 2: Usando PowerShell (Windows)

```powershell
# Execute o script PowerShell
.\scripts\extract-schema.ps1 [host] [port] [database] [username]

# Exemplo:
.\scripts\extract-schema.ps1 localhost 5432 spark_course postgres
```

### Método 3: Usando Bash (Linux/Mac)

```bash
# Torne o script executável
chmod +x scripts/extract-schema.sh

# Execute o script
./scripts/extract-schema.sh [host] [port] [database] [username]

# Exemplo:
./scripts/extract-schema.sh localhost 5432 spark_course postgres
```

## 📁 Arquivos Gerados

Após executar os scripts, você terá os seguintes arquivos:

```
schema_output/
├── 00_summary.txt              # Resumo geral
├── 01_tables.txt               # Lista de todas as tabelas
├── 02_table_structure.txt      # Estrutura detalhada das tabelas
├── 03_foreign_keys.txt         # Chaves estrangeiras
├── 04_indexes.txt              # Índices
├── 05_views.txt                # Views
├── 06_functions.txt            # Funções
├── 07_triggers.txt             # Triggers
├── 08_record_counts.txt        # Contagem de registros
└── 09_complete_migration.sql   # Migration completa
```

## 🗂️ Estrutura do Banco

O sistema possui as seguintes categorias principais de tabelas:

### 👥 Usuários e Autenticação
- `profiles` - Perfis de usuários
- `email_verification_tokens` - Tokens de verificação de email
- `password_reset_tokens` - Tokens de reset de senha

### 📚 Cursos e Conteúdo
- `courses` - Cursos
- `modules` - Módulos dos cursos
- `lessons` - Lições
- `enrollments` - Matrículas em cursos
- `lesson_completions` - Conclusão de lições
- `course_ratings` - Avaliações de cursos

### 💰 Sistema de Pagamentos
- `payments` - Pagamentos
- `external_checkouts` - Checkouts externos
- `temp_cpf_checkout` - Checkouts temporários por CPF

### 👥 Turmas
- `classes` - Turmas
- `class_instances` - Instâncias de turmas
- `class_enrollments` - Matrículas em turmas
- `class_instance_enrollments` - Matrículas em instâncias
- `class_courses` - Cursos em turmas
- `class_content` - Conteúdo de turmas
- `class_instance_content` - Conteúdo de instâncias

### 💬 Comunidade e Fórum
- `posts` - Posts da comunidade
- `post_likes` - Likes em posts
- `post_favorites` - Favoritos em posts
- `comments` - Comentários
- `comment_likes` - Likes em comentários
- `forum_topics` - Tópicos do fórum
- `forum_posts` - Posts do fórum
- `forum_replies` - Respostas do fórum
- `forum_tags` - Tags do fórum

### 💌 Sistema de Mensagens
- `conversations` - Conversas
- `conversation_participants` - Participantes
- `messages` - Mensagens

### 🔔 Notificações
- `notifications` - Notificações

### 🌐 Webhooks
- `webhooks` - Configurações de webhooks
- `webhook_logs` - Logs de webhooks

### 📧 Sistema de Email
- `email_templates` - Templates de email
- `email_campaigns` - Campanhas de email
- `email_campaign_recipients` - Destinatários
- `email_send_logs` - Logs de envio

### 💭 Comentários em Lições
- `lesson_comments` - Comentários em lições
- `lesson_comment_likes` - Likes em comentários

## 🔧 Como Usar os Resultados

### 1. Revisar a Estrutura
```bash
# Visualizar resumo
cat schema_output/00_summary.txt

# Ver todas as tabelas
cat schema_output/01_tables.txt

# Ver estrutura detalhada
cat schema_output/02_table_structure.txt
```

### 2. Gerar Migration Completa
O arquivo `09_complete_migration.sql` contém uma migration completa que pode ser executada para recriar todo o banco.

### 3. Aplicar no Novo Ambiente
```sql
-- No novo banco de dados
\i schema_output/09_complete_migration.sql
```

## ⚠️ Considerações Importantes

### Dados de Produção
- **NUNCA** execute scripts de extração em horário de pico
- Use `EXPLAIN ANALYZE` para verificar performance
- Considere usar `pg_dump` para backup completo

### Ordem de Criação
As tabelas devem ser criadas na seguinte ordem:
1. Tabelas independentes (profiles, courses, etc.)
2. Tabelas com dependências simples
3. Tabelas com múltiplas dependências
4. Views e funções
5. Triggers

### Extensões Necessárias
```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## 🐛 Solução de Problemas

### Erro de Conexão
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais de acesso
- Verifique se o firewall permite conexão

### Erro de Permissão
- Certifique-se de que o usuário tem permissões de leitura
- Use `GRANT` se necessário

### Erro de Memória
- Para bancos grandes, execute as queries em lotes
- Use `LIMIT` e `OFFSET` para paginar resultados

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do PostgreSQL
2. Teste as queries individualmente
3. Verifique se todas as extensões estão habilitadas
4. Confirme se o banco está acessível

## 🔄 Próximos Passos

Após extrair a estrutura:
1. **Teste** a migration em ambiente de desenvolvimento
2. **Ajuste** a ordem das tabelas se necessário
3. **Adicione** dados de seed se necessário
4. **Configure** as variáveis de ambiente
5. **Teste** a aplicação no novo ambiente 