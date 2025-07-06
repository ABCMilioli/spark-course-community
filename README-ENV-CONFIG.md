# Configuração de Ambiente Dinâmica

Este projeto implementa um sistema de configuração de ambiente dinâmica que permite que o frontend leia variáveis de ambiente em tempo de execução, mesmo sendo um build estático.

## Como Funciona

1. **Build Time**: O Vite ainda precisa de um valor para `VITE_API_URL` durante o build
2. **Runtime**: Um script gera um arquivo `env.js` com as variáveis de ambiente reais do container
3. **Frontend**: O frontend lê as configurações do arquivo `env.js` ao invés de `import.meta.env`

## Arquivos Criados/Modificados

### Scripts
- `scripts/generate-env-js.sh` - Gera o arquivo `env.js` com variáveis de ambiente
- `scripts/test-env-config.sh` - Testa a configuração localmente

### Frontend
- `src/lib/env.ts` - Utilitário para acessar configurações de ambiente
- `src/lib/utils.ts` - Atualizado para usar o novo sistema
- `index.html` - Carrega o arquivo `env.js`

### Backend
- `backend/entrypoint.sh` - Executa o script de geração antes de iniciar o backend
- `Dockerfile` - Inclui o script de geração

## Como Usar

### 1. Desenvolvimento Local

```bash
# O frontend usará as variáveis do .env ou valores padrão
npm run dev
```

### 2. Build Local

```bash
# Build com valor padrão
npm run build

# Build com valor customizado
VITE_API_URL=https://meu-dominio.com npm run build
```

### 3. Docker Build

```bash
# Build com valor padrão
docker build -t minha-imagem .

# Build com valor customizado
docker build --build-arg VITE_API_URL=https://meu-dominio.com -t minha-imagem .
```

### 4. Docker Run

```bash
# O container usará a variável de ambiente para gerar env.js
docker run -e VITE_API_URL=https://meu-dominio.com minha-imagem
```

### 5. Docker Swarm

No seu `docker-stack.yml`:

```yaml
version: '3.8'
services:
  app:
    image: minha-imagem
    environment:
      - VITE_API_URL=https://community.iacas.top
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=spark_course
```

## Testando

### Teste Local (Linux/Mac)
```bash
chmod +x scripts/test-env-config.sh
./scripts/test-env-config.sh
```

### Teste Manual
```bash
# Simular container
VITE_API_URL=https://teste.com ./scripts/generate-env-js.sh
cat public/env.js
```

## Vantagens

1. **Flexibilidade**: Mesma imagem pode ser usada em diferentes ambientes
2. **Segurança**: Configurações sensíveis podem ser passadas via secrets
3. **Simplicidade**: Não precisa rebuildar para mudar configurações
4. **Compatibilidade**: Funciona com Docker Swarm, Kubernetes, etc.

## Troubleshooting

### Frontend não carrega configurações
- Verifique se o arquivo `env.js` está sendo gerado no container
- Verifique se o arquivo está sendo servido pelo backend
- Verifique os logs do container para erros no script

### Configurações não são aplicadas
- Verifique se a variável de ambiente está definida no container
- Verifique se o script `generate-env-js.sh` está sendo executado
- Verifique se o arquivo `env.js` tem o conteúdo correto

### Erro de CORS ou rede
- Verifique se `VITE_API_URL` aponta para o domínio correto
- Verifique se o backend está configurado para aceitar requisições do frontend 