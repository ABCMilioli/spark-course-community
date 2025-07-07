# Sistema de Recuperação de Senha

Este documento explica como configurar e usar o sistema de recuperação de senha implementado no Spark Course Community.

## Funcionalidades

- ✅ Solicitar recuperação de senha via e-mail
- ✅ Tokens seguros com expiração (1 hora)
- ✅ Interface amigável para redefinição
- ✅ Integração completa com o sistema de autenticação
- ✅ E-mails personalizados com links seguros

## Configuração

### 1. Variáveis de Ambiente SMTP

Adicione as seguintes variáveis ao seu arquivo `.env` ou configuração Docker:

```bash
# Configurações SMTP para recuperação de senha
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=seu-email@gmail.com

# URL da aplicação (usada nos links de e-mail)
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
```

### 2. Configuração Gmail

Para usar Gmail como servidor SMTP:

1. **Ative a verificação em duas etapas** na sua conta Google
2. **Gere uma senha de app**:
   - Vá em "Gerenciar sua Conta Google"
   - Segurança → Verificação em duas etapas → Senhas de app
   - Gere uma senha para "E-mail"
3. **Use a senha de app** na variável `SMTP_PASS`

### 3. Outros Provedores SMTP

#### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Yahoo
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Provedor Customizado
```bash
SMTP_HOST=seu-servidor-smtp.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Estrutura do Banco de Dados

A migration `20250706000000-create-password-reset-tokens.sql` cria a tabela:

```sql
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Fluxo de Funcionamento

### 1. Solicitar Recuperação
- Usuário clica em "Esqueci minha senha?" no login
- Digita o e-mail cadastrado
- Sistema gera token único e salva no banco
- E-mail é enviado com link de recuperação

### 2. Redefinir Senha
- Usuário clica no link do e-mail
- Acessa página `/reset-password?token=...`
- Digita nova senha e confirma
- Sistema valida token e atualiza senha
- Token é removido do banco
- Usuário é redirecionado para login

### 3. Segurança
- Tokens expiram em 1 hora
- Tokens são únicos e não reutilizáveis
- Senhas são hasheadas com bcrypt
- E-mails não revelam se o usuário existe

## Testes

### Teste do Serviço de E-mail

```bash
# Testar configuração SMTP
node scripts/test-email-service.js
```

### Teste Completo do Fluxo

1. **Configure as variáveis SMTP**
2. **Suba o serviço**: `docker-compose up -d`
3. **Acesse o login** e clique em "Esqueci minha senha?"
4. **Digite um e-mail válido** e envie
5. **Verifique o e-mail** (incluindo spam)
6. **Clique no link** e redefina a senha
7. **Teste o login** com a nova senha

## Troubleshooting

### Erro: "Cannot find module 'nodemailer'"
```bash
cd backend && npm install
```

### Erro: "Authentication failed"
- Verifique se está usando senha de app (Gmail)
- Confirme se a verificação em duas etapas está ativa
- Teste as credenciais em outro cliente

### Erro: "Connection timeout"
- Verifique se a porta SMTP não está bloqueada
- Teste conectividade: `telnet smtp.gmail.com 587`
- Verifique firewall/antivírus

### E-mail não chega
- Verifique pasta de spam
- Confirme se o e-mail está correto
- Teste com `scripts/test-email-service.js`

### Token inválido/expirado
- Tokens expiram em 1 hora
- Cada token só pode ser usado uma vez
- Solicite novo link se necessário

## Personalização

### E-mail de Recuperação

Edite o template em `backend/modules/passwordReset.js`:

```javascript
await sendMail({
  to: user.email,
  subject: 'Recuperação de senha - Spark Course',
  html: `
    <h2>Olá ${user.name}!</h2>
    <p>Para redefinir sua senha, clique no link abaixo:</p>
    <p><a href="${resetLink}">Redefinir Senha</a></p>
    <p>Este link expira em 1 hora.</p>
    <p>Se não foi você, ignore este e-mail.</p>
  `,
});
```

### Tempo de Expiração

Altere em `backend/modules/passwordReset.js`:

```javascript
// Mudar de 1 hora para 2 horas, por exemplo
'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'2 hours\')'
```

## Monitoramento

### Logs de E-mail
```bash
# Ver logs do container
docker-compose logs app | grep "email\|SMTP"
```

### Tokens no Banco
```sql
-- Verificar tokens ativos
SELECT * FROM password_reset_tokens WHERE expires_at > NOW();

-- Limpar tokens expirados
DELETE FROM password_reset_tokens WHERE expires_at < NOW();
```

## Próximos Passos

- [ ] Adicionar rate limiting para solicitações
- [ ] Implementar notificação de login suspeito
- [ ] Adicionar histórico de mudanças de senha
- [ ] Implementar verificação de força da senha
- [ ] Adicionar opção de recuperação por SMS

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do container
2. Teste com `scripts/test-email-service.js`
3. Confirme configuração SMTP
4. Verifique se a migration foi aplicada 