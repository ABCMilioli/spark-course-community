# Debug: Problema de Envio de E-mails

## Problema Reportado
- E-mails não estão sendo enviados
- Não há logs no console
- Não há logs no backend

## Passos de Debug

### 1. Verificar se o Frontend está Chamando o Endpoint

**Problema Identificado**: O frontend estava usando uma simulação (mock) em vez de chamar o endpoint real.

**Solução Aplicada**: ✅ Corrigido o `LoginForm.tsx` para chamar `/api/auth/forgot-password`

### 2. Verificar Logs Detalhados

Adicionei logs detalhados em:
- ✅ `backend/routes/auth.js` - Endpoint de forgot-password
- ✅ `backend/modules/passwordReset.js` - Módulo de recuperação
- ✅ `backend/services/emailService.js` - Serviço de e-mail

### 3. Testar o Endpoint Diretamente

```bash
# Teste simples
node scripts/test-forgot-password-simple.js seu-email@exemplo.com

# Teste com axios (se disponível)
node scripts/test-forgot-password.js seu-email@exemplo.com
```

### 4. Verificar Variáveis de Ambiente

```bash
# Verificar se as variáveis SMTP estão definidas
echo $SMTP_HOST
echo $SMTP_PORT
echo $SMTP_USER
echo $SMTP_PASS
echo $SMTP_FROM
```

### 5. Testar Serviço de E-mail

```bash
# Testar apenas o serviço de e-mail
node scripts/test-email-service.js
```

## Checklist de Verificação

### Frontend
- [ ] LoginForm está chamando `/api/auth/forgot-password`
- [ ] Console do navegador mostra logs
- [ ] Modal de "Esqueci minha senha?" abre
- [ ] E-mail é enviado no formulário

### Backend
- [ ] Servidor está rodando na porta 8080
- [ ] Logs aparecem no console do backend
- [ ] Endpoint `/api/auth/forgot-password` responde
- [ ] Variáveis SMTP estão configuradas

### Banco de Dados
- [ ] Migration `password_reset_tokens` foi aplicada
- [ ] Tabela `profiles` tem usuários cadastrados
- [ ] Conexão com banco está funcionando

### SMTP
- [ ] Variáveis SMTP estão definidas
- [ ] Credenciais SMTP estão corretas
- [ ] Servidor SMTP está acessível
- [ ] Porta SMTP não está bloqueada

## Comandos Úteis

### Verificar Logs do Container
```bash
docker-compose logs app | grep -i "password\|email\|smtp"
```

### Verificar Variáveis no Container
```bash
docker-compose exec app env | grep SMTP
```

### Testar Conexão SMTP
```bash
telnet smtp.gmail.com 587
```

### Verificar Banco de Dados
```bash
docker-compose exec postgres psql -U postgres -d spark_course -c "SELECT * FROM password_reset_tokens;"
```

## Possíveis Causas

1. **Frontend não chama endpoint** ✅ RESOLVIDO
2. **Variáveis SMTP não configuradas**
3. **Credenciais SMTP incorretas**
4. **Servidor SMTP inacessível**
5. **Firewall bloqueando porta SMTP**
6. **Migration não aplicada**
7. **Usuário não existe no banco**

## Próximos Passos

1. **Suba o serviço** com as correções
2. **Teste o frontend** - clique em "Esqueci minha senha?"
3. **Verifique os logs** do backend
4. **Configure SMTP** se necessário
5. **Teste com script** se ainda não funcionar

## Configuração SMTP Exemplo (Gmail)

```bash
# No docker-compose.yml ou .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM=seu-email@gmail.com
```

**Importante**: Para Gmail, use "Senha de App" em vez da senha normal! 