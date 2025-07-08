# 🔄 Fluxo de Checkout - Konektus

## 🎯 **Visão Geral**

O sistema implementa um fluxo inteligente de checkout que detecta automaticamente se o curso deve usar checkout interno ou externo, baseado no `payment_gateway` configurado.

## 🏗️ **Tipos de Checkout**

### **Checkout Interno**
- **Gateways**: Mercado Pago, Stripe
- **Processamento**: Na própria plataforma
- **Matrícula**: Automática após pagamento

### **Checkout Externo**
- **Gateways**: Hotmart, Kiwify
- **Processamento**: Plataforma externa
- **Matrícula**: Via API externa (N8N)

## 📋 **Fluxo Detalhado**

### **1. Detecção Automática**

```typescript
// Verificação do tipo de checkout
const isInternalCheckout = course.payment_gateway === 'mercadopago' || course.payment_gateway === 'stripe';
const isExternalCheckout = course.payment_gateway === 'hotmart' || course.payment_gateway === 'kiwify';
```

### **2. Interface do Usuário**

#### **Botão Único para Todos os Cursos Pagos**
```tsx
// Um botão que se comporta conforme o checkout configurado
<Button onClick={handleEnrollClick} className="w-full">
  {(() => {
    if (course.payment_gateway === 'mercadopago') return 'Comprar com Mercado Pago';
    if (course.payment_gateway === 'stripe') return 'Comprar com Stripe';
    if (course.payment_gateway === 'hotmart') return 'Comprar no Hotmart';
    if (course.payment_gateway === 'kiwify') return 'Comprar no Kiwify';
    return 'Comprar Curso';
  })()}
</Button>
```

#### **Modal para Checkout Externo**
```tsx
// Modal que abre quando o botão é clicado para checkout externo
<Dialog open={showCpfModal} onOpenChange={setShowCpfModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Informe seu CPF</DialogTitle>
      <DialogDescription>
        Para prosseguir com a compra, precisamos do seu CPF.
      </DialogDescription>
    </DialogHeader>
    <Input
      placeholder="000.000.000-00"
      value={cpf}
      onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
    />
    <DialogFooter>
      <Button onClick={handleExternalPayment}>
        Continuar para Checkout
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 🔄 **Fluxo de Checkout Externo**

### **1. Preenchimento do CPF**
```typescript
const handleExternalPayment = async () => {
  if (!cpf || cpf.length < 11) {
    toast.error('Informe um CPF válido');
    return;
  }
  // ... continua
};
```

### **2. Salvamento Permanente do CPF**
```typescript
// Salvar CPF no backend
await axios.post(`${API_URL}/external/save-cpf`, {
  cpf: cpf.replace(/\D/g, ''),
  course_id: course.id
}, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### **3. Redirecionamento**
```typescript
// Redirecionar para checkout externo
window.location.href = course.external_checkout_url;
```

## 🔧 **Backend - Salvamento de CPF**

### **Rota: POST /api/external/save-cpf**

```javascript
router.post('/save-cpf', async (req, res) => {
  const { cpf, course_id } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Validações
  if (!cpf || !course_id) {
    return res.status(400).json({ error: 'CPF e course_id são obrigatórios.' });
  }

  // Verificar se é checkout externo
  const course = await pool.query(
    'SELECT id, title, payment_gateway, external_checkout_url FROM courses WHERE id = $1',
    [course_id]
  );
  
  const isExternalCheckout = course.payment_gateway === 'hotmart' || course.payment_gateway === 'kiwify';
  
  if (!isExternalCheckout || !course.external_checkout_url) {
    return res.status(400).json({ error: 'Este curso não suporta checkout externo.' });
  }

  // Salvar CPF permanentemente
  if (token) {
    // Usuário logado - atualizar CPF
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await pool.query('UPDATE profiles SET cpf = $1 WHERE id = $2', [cleanCpf, decoded.id]);
  } else {
    // Usuário anônimo - criar perfil
    const userId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO profiles (id, cpf, name, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, cleanCpf, `Usuário ${cleanCpf.slice(-4)}`]
    );
  }

  return res.json({
    success: true,
    message: 'CPF salvo com sucesso. Redirecionando para checkout externo...',
    course_title: course.title,
    payment_gateway: course.payment_gateway
  });
});
```

## 🔄 **Integração com N8N**

### **Fluxo Completo**

1. **Usuário preenche CPF** → Salvo permanentemente no banco
2. **Redirecionamento** → Hotmart/Kiwify
3. **Pagamento externo** → Processado pela plataforma externa
4. **Webhook N8N** → Notifica pagamento bem-sucedido
5. **Busca por nome** → N8N busca curso por título
6. **Matrícula via API** → N8N chama `/api/external/enroll`

### **API Externa de Matrícula**

```bash
# N8N chama esta API após pagamento bem-sucedido
curl -X POST https://SEU_DOMINIO/api/external/enroll \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user": {"cpf": "12345678900", "email": "aluno@email.com", "name": "Aluno"},
    "course_id": "uuid-do-curso",
    "action": "enroll"
  }'
```

## 📊 **Estrutura de Dados**

### **Tabela profiles**
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) NOT NULL UNIQUE;

COMMENT ON COLUMN public.profiles.cpf IS 'CPF do usuário, obrigatório e único.';
```

### **Tabela courses**
```sql
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'mercadopago',
  ADD COLUMN IF NOT EXISTS external_checkout_url TEXT;

COMMENT ON COLUMN public.courses.payment_gateway IS 'Gateway de pagamento do curso';
COMMENT ON COLUMN public.courses.external_checkout_url IS 'URL do checkout externo';
```

## 🧪 **Testes**

### **Script de Teste**
```bash
# Executar testes completos
node scripts/test-checkout-flow.js

# Configurar token
export TEST_TOKEN="seu_token_aqui"
```

### **Testes Incluídos**
- ✅ Criação de cursos com checkout interno/externo
- ✅ Detecção automática do tipo de checkout
- ✅ Salvamento permanente de CPF
- ✅ Redirecionamento para checkout externo
- ✅ API externa para matrícula (N8N)
- ✅ Limpeza de dados de teste

## 🎨 **Interface do Usuário**

### **Estados da Interface**

1. **Curso Gratuito**: Botão "Matricular-se Gratuitamente"
2. **Curso Pago**: Botão único que se comporta conforme o checkout configurado
   - **Checkout Interno**: Redireciona direto para página de pagamento
   - **Checkout Externo**: Abre modal para capturar CPF

### **Validações**

- ✅ CPF obrigatório para checkout externo
- ✅ Validação de formato de CPF
- ✅ Verificação de CPF duplicado
- ✅ Verificação de gateway válido

## 🔍 **Troubleshooting**

### **Erro: "CPF já está em uso"**
```javascript
// Verificar se o CPF já existe
const existingUser = await pool.query('SELECT id FROM profiles WHERE cpf = $1', [cleanCpf]);
if (existingUser.rows.length > 0) {
  return res.status(409).json({ error: 'CPF já está em uso por outro usuário.' });
}
```

### **Erro: "Este curso não suporta checkout externo"**
```javascript
// Verificar gateway e URL
const isExternalCheckout = course.payment_gateway === 'hotmart' || course.payment_gateway === 'kiwify';
if (!isExternalCheckout || !course.external_checkout_url) {
  return res.status(400).json({ error: 'Este curso não suporta checkout externo.' });
}
```

## 🚀 **Próximos Passos**

### **Melhorias Planejadas**
- [ ] Validação de CPF mais robusta
- [ ] Integração com mais gateways externos
- [ ] Webhooks automáticos para N8N
- [ ] Relatórios de conversão por gateway
- [ ] Templates de checkout personalizados

---

**Este fluxo garante máxima flexibilidade para instrutores e uma experiência de usuário otimizada para cada tipo de checkout.** 