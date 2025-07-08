# 🔧 Correção da Tabela Courses - Konektus

## 🚨 **Problema Identificado**

O erro `column "category" of relation "courses" does not exist` indica que a tabela `courses` está incompleta e faltam várias colunas necessárias para o funcionamento do sistema.

## 📋 **Colunas Faltantes**

A tabela `courses` original não possui as seguintes colunas:

- ❌ `category` - Categoria do curso
- ❌ `demo_video` - URL do vídeo de demonstração
- ❌ `isPaid` - Indica se o curso é pago
- ❌ `updated_at` - Data da última atualização
- ❌ `is_active` - Indica se o curso está ativo
- ❌ `payment_gateway` - Gateway de pagamento
- ❌ `external_checkout_url` - URL de checkout externo

## 🛠️ **Solução**

### **1. Aplicar Migration**

#### **Windows (PowerShell)**
```powershell
# Execute o script PowerShell
.\scripts\apply-missing-columns.ps1
```

#### **Linux/Mac (Bash)**
```bash
# Execute o script Bash
./scripts/apply-missing-columns.sh
```

#### **Manual (SQL)**
```sql
-- Execute diretamente no banco
psql DATABASE_URL -f supabase/migrations/20250707200000-add-missing-course-columns.sql
```

### **2. Verificar Aplicação**

```sql
-- Verificar se as colunas foram adicionadas
psql DATABASE_URL -f scripts/check-courses-table.sql
```

## 📊 **Estrutura Final da Tabela**

Após a correção, a tabela `courses` terá a seguinte estrutura:

```sql
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    level public.course_level NOT NULL,
    duration TEXT,
    instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    students_count INT DEFAULT 0,
    rating NUMERIC(2,1) DEFAULT 0.0,
    price NUMERIC(10, 2) DEFAULT 0.00,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Colunas adicionadas pela migration
    category TEXT,
    demo_video TEXT,
    isPaid BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    payment_gateway TEXT DEFAULT 'mercadopago',
    external_checkout_url TEXT
);
```

## 🔧 **Funcionalidades Adicionadas**

### **1. Trigger Automático**
```sql
-- Atualiza updated_at automaticamente
CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON public.courses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### **2. Comentários nas Colunas**
```sql
COMMENT ON COLUMN public.courses.category IS 'Categoria do curso';
COMMENT ON COLUMN public.courses.demo_video IS 'URL do vídeo de demonstração do curso';
COMMENT ON COLUMN public.courses.isPaid IS 'Indica se o curso é pago';
-- ... outros comentários
```

## 🧪 **Teste da Correção**

### **1. Verificar Estrutura**
```sql
-- Verificar todas as colunas
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'courses' 
ORDER BY ordinal_position;
```

### **2. Testar Criação de Curso**
```bash
# Execute o script de teste
node scripts/test-gateway-config.js
```

### **3. Verificar no Frontend**
- Acesse a área administrativa
- Tente criar um novo curso
- Verifique se não há mais erros

## 🚀 **Próximos Passos**

Após aplicar a correção:

1. ✅ **Teste a criação de cursos** no frontend
2. ✅ **Verifique a edição de cursos** existentes
3. ✅ **Teste a seleção de gateway** de pagamento
4. ✅ **Confirme que as URLs externas** funcionam

## 📝 **Logs de Verificação**

### **Antes da Correção**
```
[POST /api/courses] error: column "category" of relation "courses" does not exist
```

### **Após a Correção**
```
✅ Migration aplicada com sucesso!
✅ Curso criado com sucesso: { id: "...", title: "...", payment_gateway: "mercadopago" }
```

## 🔍 **Troubleshooting**

### **Erro: "DATABASE_URL não configurada"**
```bash
# Configure a variável de ambiente
export DATABASE_URL="postgresql://user:password@localhost:5432/database"

# Ou use o arquivo .env
echo "DATABASE_URL=postgresql://user:password@localhost:5432/database" > .env
```

### **Erro: "psql não encontrado"**
```bash
# Instale o PostgreSQL client
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql

# Windows
# Baixe do site oficial do PostgreSQL
```

### **Erro: "Permissão negada"**
```bash
# Verifique as permissões do banco
# Certifique-se de que o usuário tem permissão para ALTER TABLE
```

---

**Esta correção resolve o problema fundamental da estrutura da tabela e permite que o sistema de seleção de gateway funcione corretamente.** 