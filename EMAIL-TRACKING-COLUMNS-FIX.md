# Correção das Colunas de Rastreamento de Email

## Problema
O sistema de campanhas de email está apresentando erro:
```
error: column "delivered_count" does not exist
```

Isso acontece porque as colunas `delivered_count` e `bounced_count` não foram criadas na tabela `email_campaigns`.

## Solução

### Opção 1: Reiniciar o Docker (Recomendado)
Como o banco está em Docker e as migrations rodam automaticamente, a forma mais simples é:

1. **Parar o Docker:**
   ```bash
   docker-compose down
   ```

2. **Subir novamente:**
   ```bash
   docker-compose up -d
   ```

3. **Verificar se as migrations foram aplicadas:**
   - A migration `20250121000002-add-missing-tracking-columns.sql` será executada automaticamente
   - As colunas `delivered_count` e `bounced_count` serão adicionadas

### Opção 2: Executar SQL Manualmente
Se preferir não reiniciar o Docker, execute o script SQL:

1. **Conectar ao banco via Supabase Dashboard ou psql**
2. **Executar o script:**
   ```sql
   -- Adicionar colunas se não existirem
   ALTER TABLE public.email_campaigns 
   ADD COLUMN IF NOT EXISTS delivered_count INT DEFAULT 0,
   ADD COLUMN IF NOT EXISTS bounced_count INT DEFAULT 0;
   
   -- Adicionar comentários
   COMMENT ON COLUMN public.email_campaigns.delivered_count IS 'Número de emails entregues com sucesso';
   COMMENT ON COLUMN public.email_campaigns.bounced_count IS 'Número de emails que retornaram (bounce)';
   ```

### Opção 3: Usar o Script Pronto
Execute o arquivo `scripts/fix-email-tracking-columns.sql` no seu cliente SQL.

## Verificação
Após aplicar a correção, verifique se as colunas foram criadas:

```sql
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'email_campaigns' 
AND column_name IN ('delivered_count', 'bounced_count')
ORDER BY column_name;
```

## Resultado Esperado
```
column_name      | data_type | column_default | is_nullable
-----------------|-----------|----------------|------------
bounced_count    | integer   | 0              | YES
delivered_count  | integer   | 0              | YES
```

## Próximos Passos
1. ✅ Aplicar a correção
2. ✅ Reiniciar o backend (se necessário)
3. ✅ Testar o envio de uma nova campanha
4. ✅ Verificar as estatísticas no dashboard

## Arquivos Modificados
- `supabase/migrations/20250121000000-create-email-campaigns-system.sql` - Migration principal atualizada
- `supabase/migrations/20250121000002-add-missing-tracking-columns.sql` - Migration para adicionar colunas faltantes
- `scripts/fix-email-tracking-columns.sql` - Script SQL para correção manual

## Nota
As campanhas existentes terão `delivered_count = 0` e `bounced_count = 0`. Novas campanhas serão rastreadas corretamente. 