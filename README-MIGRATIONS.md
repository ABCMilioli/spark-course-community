# Sistema de Migrations

## Como Funciona

O sistema de migrations é executado automaticamente quando o container Docker inicia, através do arquivo `backend/entrypoint.sh`.

### Processo de Execução

1. **Inicialização do Container**: Quando o container inicia, o `entrypoint.sh` é executado
2. **Aguardar Banco**: O script aguarda o PostgreSQL ficar disponível usando `pg_isready`
3. **Verificar Migrations**: Cria uma tabela `migrations_applied` para controlar quais migrations já foram executadas
4. **Executar Migrations Pendentes**: Apenas as migrations que ainda não foram aplicadas são executadas
5. **Registrar Sucesso**: Cada migration bem-sucedida é registrada na tabela de controle
6. **Iniciar Backend**: Se todas as migrations forem bem-sucedidas, o backend é iniciado

### Sistema de Controle

O sistema agora mantém uma tabela `migrations_applied` que registra:
- `id`: Identificador único
- `migration_name`: Nome do arquivo da migration
- `applied_at`: Data/hora quando foi aplicada

**Benefícios:**
- ✅ **Não recria tabelas**: Evita perder dados existentes
- ✅ **Execução única**: Cada migration é executada apenas uma vez
- ✅ **Rápido**: Container inicia mais rápido após a primeira execução
- ✅ **Seguro**: Não há risco de executar migrations duplicadas

### Estrutura de Arquivos

```
supabase/migrations/           # Migrations originais
├── 20240616190000-*.sql      # Migrations antigas
├── 20250615170000-*.sql      # Migrations do sistema de turmas
└── 20250104000000-fix-migration-conflicts.sql  # Migration de correção

Dockerfile                     # Copia migrations para /app/migrations
backend/entrypoint.sh         # Executa migrations automaticamente com controle
scripts/check-migrations.sh   # Verifica status das migrations
scripts/reset-migrations.sh   # Reseta controle de migrations (dev)
```

### Ordem de Execução

As migrations são executadas em ordem alfabética/numerica dos nomes dos arquivos:

1. `20240616190000-create-post-likes.sql`
2. `20240616191000-create-comments.sql`
3. `20240616192000-create-post-favorites.sql`
4. `20240617190000-add-video-url-to-lessons.sql`
5. `20240701120000-create-course-ratings.sql`
6. `20250101000000-create-lesson-comments.sql`
7. `20250104000000-fix-migration-conflicts.sql` ← **Migration de correção**
8. `20250615170000-add-password-hash.sql`
9. `20250615170001-add-student-role.sql`
10. `20250615170002-create-classes-system.sql`
11. `20250615170003-add-module-lesson-visibility.sql`
12. `20250615170004-fix-user-class-access-view.sql`

### Migration de Correção

A migration `20250104000000-fix-migration-conflicts.sql` foi criada para resolver conflitos entre migrations existentes. Ela:

- ✅ Usa `IF NOT EXISTS` e `IF EXISTS` para evitar erros
- ✅ Verifica se estruturas existem antes de modificá-las
- ✅ **NÃO DROPA DADOS EXISTENTES** da tabela `class_courses`
- ✅ Recria views e funções de forma segura
- ✅ Adiciona colunas apenas se não existirem
- ✅ É idempotente (pode ser executada múltiplas vezes sem problemas)

### Migrations Removidas

As seguintes migrations foram removidas por causarem conflitos:

- ❌ `20250615170005-restructure-classes-system.sql`
- ❌ `20250615170006-add-demo-video-to-courses.sql`
- ❌ `20250615170007-add-demo-video-to-courses-fix.sql`
- ❌ `20250615170008-add-file-support-to-class-content.sql`
- ❌ `20250615170009-test-class-courses.sql`
- ❌ `20250628120000-create-lesson-completions.sql`
- ❌ `20259999999999-recreate-class-courses.sql`

### Comandos Úteis

#### Verificar Status das Migrations
```bash
./scripts/check-migrations.sh
```

#### Resetar Controle de Migrations (Desenvolvimento)
```bash
./scripts/reset-migrations.sh
```

#### Testar Migrations
```bash
# Teste completo
./scripts/test-migrations.sh

# Ou manualmente
docker-compose down -v
docker-compose up -d
docker-compose logs app
```

#### Ver Logs de Migrations
```bash
# Ver logs do container
docker-compose logs app

# Filtrar apenas logs de migrations
docker-compose logs app | grep "Migration"
```

### Troubleshooting

**Problema**: Migration falha com erro de coluna já existe
**Solução**: Usar `IF NOT EXISTS` na migration

**Problema**: Migration falha com erro de tabela não existe
**Solução**: Usar `IF EXISTS` antes de referenciar a tabela

**Problema**: Container para de funcionar após migration
**Solução**: Verificar logs com `docker-compose logs app`

**Problema**: Migration não está sendo executada
**Solução**: Verificar se está registrada com `./scripts/check-migrations.sh`

**Problema**: Dados foram perdidos
**Solução**: Verificar se a migration não tem `DROP TABLE` desnecessário

### Boas Práticas

1. **Sempre use verificações**: `IF EXISTS`, `IF NOT EXISTS`
2. **Seja idempotente**: Migrations devem poder ser executadas múltiplas vezes
3. **NÃO DROPE dados**: Use `CREATE TABLE IF NOT EXISTS` em vez de `DROP TABLE`
4. **Teste localmente**: Use `./scripts/test-migrations.sh` antes de fazer deploy
5. **Nomenclatura**: Use timestamp no início do nome do arquivo
6. **Comentários**: Documente o que a migration faz
7. **Verifique status**: Use `./scripts/check-migrations.sh` para monitorar

### Exemplo de Migration Segura

```sql
-- Migration segura que pode ser executada múltiplas vezes
-- NÃO DROPA DADOS EXISTENTES

-- Adicionar coluna apenas se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'minha_tabela' AND column_name = 'nova_coluna') THEN
        ALTER TABLE minha_tabela ADD COLUMN nova_coluna TEXT;
    END IF;
END $$;

-- Criar índice apenas se não existir
CREATE INDEX IF NOT EXISTS idx_minha_tabela_nova_coluna ON minha_tabela(nova_coluna);

-- Criar tabela apenas se não existir
CREATE TABLE IF NOT EXISTS nova_tabela (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL
);
```

### Fluxo de Desenvolvimento

1. **Criar nova migration**: Adicione arquivo SQL em `supabase/migrations/`
2. **Testar localmente**: Execute `./scripts/test-migrations.sh`
3. **Verificar status**: Use `./scripts/check-migrations.sh`
4. **Fazer deploy**: As migrations serão aplicadas automaticamente
5. **Monitorar**: Verifique logs para confirmar sucesso 