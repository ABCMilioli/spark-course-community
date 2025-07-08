# Sistema de Verificação de Email

Este documento explica o sistema de verificação de email implementado no Konektus, que garante que apenas usuários com emails válidos possam criar contas.

## 🎯 Funcionalidades

- ✅ **Verificação obrigatória** antes da criação da conta
- ✅ **Email personalizado** com design profissional
- ✅ **Tokens seguros** com expiração de 24 horas
- ✅ **Reenvio de verificação** para casos de email não recebido
- ✅ **Interface amigável** para confirmação
- ✅ **Integração completa** com sistema existente
- ✅ **Logs detalhados** para debugging

## 🏗️ Arquitetura

### Fluxo de Cadastro (2 Etapas)

1. **Etapa 1 - Solicitar Verificação:**
   - Usuário preenche formulário de cadastro
   - Sistema valida dados e verifica se email já existe
   - Gera token único e salva dados temporários
   - Envia email com link de verificação

2. **Etapa 2 - Confirmar Email:**
   - Usuário clica no link do email
   - Sistema valida token e cria conta
   - Remove token usado e redireciona para login

### Tabelas do Banco

```sql
-- Tabela de tokens de verificação
CREATE TABLE email_verification_tokens (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  token VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 🚀 Instalação

### 1. Aplicar Migration

```bash
# Tornar o script executável
chmod +x scripts/apply-email-verification-migration.sh

# Aplicar migration
./scripts/apply-email-verification-migration.sh
```

### 2. Configurar SMTP

Adicione as variáveis SMTP ao seu `.env` ou `docker-compose.yml`:

```bash
# Configurações SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=seu-email@gmail.com

# URL da aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Reiniciar Aplicação

```bash
docker-compose restart app
```

## 🧪 Testes

### Teste Automatizado

```bash
# Teste básico
node scripts/test-email-verification.js

# Teste com dados específicos
node scripts/test-email-verification.js seu-email@exemplo.com "Seu Nome" "senha123"
```

### Teste Manual

1. **Acesse a aplicação:** `http://localhost:3000`
2. **Clique em "Criar Conta"**
3. **Preencha os dados** e envie
4. **Verifique o email** (incluindo spam)
5. **Clique no link** de verificação
6. **Teste o login** com a conta criada

## 📧 Endpoints da API

### POST `/api/auth/signup-request`
Solicita verificação de email.

**Request:**
```json
{
  "name": "Nome do Usuário",
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "message": "E-mail de verificação enviado. Verifique sua caixa de entrada e spam."
}
```

### POST `/api/auth/signup-confirm`
Confirma verificação de email.

**Request:**
```json
{
  "token": "token-de-verificacao"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "message": "Email confirmado com sucesso! Sua conta foi criada.",
  "user": {
    "id": "uuid-do-usuario",
    "name": "Nome do Usuário",
    "email": "usuario@exemplo.com",
    "role": "student"
  }
}
```

### POST `/api/auth/resend-verification`
Reenvia email de verificação.

**Request:**
```json
{
  "email": "usuario@exemplo.com"
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "message": "Novo e-mail de verificação enviado. Verifique sua caixa de entrada e spam."
}
```

## 🎨 Interface do Usuário

### Página de Verificação (`/verify-email`)

- **Verificação automática** quando token está na URL
- **Formulário de reenvio** quando não há token
- **Estados visuais** para loading, sucesso e erro
- **Redirecionamento automático** após sucesso

### Modal de Confirmação

- **Aparece após cadastro** bem-sucedido
- **Mostra email** para onde foi enviado
- **Instruções claras** sobre verificação

## 🔧 Configuração Avançada

### Personalizar Email

Edite o template em `backend/modules/emailVerification.js`:

```javascript
await sendMail({
  to: email,
          subject: 'Confirme seu email - Konektus',
  html: `
    <div style="font-family: Arial, sans-serif;">
      <h2>Olá ${name}!</h2>
      <p>Para completar seu cadastro, clique no link:</p>
      <a href="${verificationLink}">Confirmar Email</a>
    </div>
  `
});
```

### Alterar Tempo de Expiração

Modifique em `backend/modules/emailVerification.js`:

```javascript
// Mudar de 24 horas para 48 horas, por exemplo
const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
```

### Limpeza Automática

Os tokens expirados são limpos automaticamente:
- **Na solicitação** de nova verificação
- **Na confirmação** de verificação

## 🛡️ Segurança

### Medidas Implementadas

- **Tokens únicos** de 64 caracteres hexadecimais
- **Expiração automática** em 24 horas
- **Uso único** - token é removido após confirmação
- **Validação de email** antes de salvar dados
- **Proteção contra duplicação** de emails
- **Logs detalhados** para auditoria

### Boas Práticas

- **Não revelar** se email existe ou não
- **Limpar tokens** expirados regularmente
- **Validar dados** em todas as etapas
- **Usar HTTPS** em produção
- **Configurar SPF/DKIM** para melhor deliverability

## 📊 Monitoramento

### Logs Importantes

```bash
# Ver logs de verificação
docker-compose logs app | grep "emailVerification"

# Ver logs de email
docker-compose logs app | grep "email\|SMTP"

# Ver logs de signup
docker-compose logs app | grep "signup"
```

### Métricas do Banco

```sql
-- Tokens ativos
SELECT COUNT(*) FROM email_verification_tokens WHERE expires_at > NOW();

-- Tokens expirados
SELECT COUNT(*) FROM email_verification_tokens WHERE expires_at < NOW();

-- Limpar tokens expirados manualmente
DELETE FROM email_verification_tokens WHERE expires_at < NOW();
```

## 🔄 Migração do Sistema Anterior

### Usuários Existentes

- **Não são afetados** - continuam funcionando normalmente
- **Novos cadastros** usam o novo sistema
- **Compatibilidade total** mantida

### Rollback (se necessário)

```bash
# Remover tabela
docker-compose exec postgres psql -U postgres -d spark_course -c "DROP TABLE email_verification_tokens;"

# Reverter endpoints (remover do auth.js)
# Reverter frontend (remover do LoginForm.tsx)
```

## 🐛 Troubleshooting

### Email não chega

1. **Verificar configuração SMTP:**
   ```bash
   node scripts/test-email-service.js
   ```

2. **Verificar logs:**
   ```bash
   docker-compose logs app | grep "emailVerification"
   ```

3. **Verificar spam** e filtros de email

### Token inválido/expirado

1. **Solicitar novo link** na página de verificação
2. **Verificar logs** para detalhes do erro
3. **Limpar tokens** expirados se necessário

### Erro de banco de dados

1. **Verificar migration:**
   ```bash
   docker-compose exec postgres psql -U postgres -d spark_course -c "\dt email_verification_tokens"
   ```

2. **Reaplicar migration** se necessário

### Frontend não funciona

1. **Verificar rotas** no App.tsx
2. **Verificar contexto** AuthContext.tsx
3. **Verificar console** do navegador

## 📈 Próximas Melhorias

- [ ] **Rate limiting** para solicitações
- [ ] **Captcha** para prevenir spam
- [ ] **Verificação por SMS** como alternativa
- [ ] **Notificação de login** após verificação
- [ ] **Histórico de verificações** por usuário
- [ ] **Métricas avançadas** de conversão

## 📞 Suporte

Para problemas ou dúvidas:

1. **Verifique os logs** do container
2. **Teste com scripts** fornecidos
3. **Confirme configuração** SMTP
4. **Verifique se migration** foi aplicada
5. **Teste fluxo completo** manualmente

---

**Implementado com ❤️ para o Konektus** 