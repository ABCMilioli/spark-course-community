# Deploy Docker Swarm com Estrutura Unificada (Frontend + Backend)

## Estrutura
- Um único container serve tanto o React (frontend) quanto a API (backend Express).
- O build do React é servido pelo Express na rota `/`.

## Pré-requisitos

- Docker instalado
- Domínio configurado (para SSL)
- Acesso root/sudo
- Conta no Docker Hub (para push da imagem)

## Configuração Rápida

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd spark-course-community
```

### 2. Configure o domínio e email
Edite os arquivos:
- `docker-stack.yml` - linha 18: `Host(\`seu-dominio.com\`)`
- `traefik-stack.yml` - linha 13: `DIGITE O SEU EMAIL`

### 3. Build e Deploy

#### Opção A: Build Local + Deploy
```bash
chmod +x build-local.sh
./build-local.sh
./deploy.sh
```

#### Opção B: Build + Push para Docker Hub + Deploy
```bash
chmod +x build-and-push.sh
./build-and-push.sh
./deploy.sh
```

## Docker Hub

### Imagem
- **Nome**: `automacaodebaixocusto/spark-course-unificado`
- **Tag**: `latest`
- **URL**: https://hub.docker.com/r/automacaodebaixocusto/spark-course-unificado

### Scripts Disponíveis

- **`build-local.sh`** - Build local da imagem
- **`build-and-push.sh`** - Build + Push para Docker Hub
- **`deploy.sh`** - Deploy completo no Swarm

### Push para Docker Hub
```bash
# Login no Docker Hub
docker login

# Build e push
./build-and-push.sh
```

## Estrutura dos Arquivos

- `Dockerfile` - Build da aplicação
- `nginx.conf` - Configuração do servidor web
- `docker-stack.yml` - Stack da aplicação
- `traefik-stack.yml` - Stack do Traefik (compatível com sua configuração)
- `deploy.sh` - Script de deploy automatizado
- `build-local.sh` - Script de build local
- `build-and-push.sh` - Script de build e push

## Diferenças da Configuração Original

### Traefik
- **Versão**: v2.11.2 (mais recente)
- **Certificados**: `letsencryptresolver` (nome do resolver)
- **Volumes**: `volume_swarm_certificates` e `volume_swarm_shared`
- **Redirecionamento**: HTTP → HTTPS automático
- **Logs**: Configuração detalhada de logs

### Aplicação
- **Certificados**: Usa `letsencryptresolver` em vez de `letsencrypt`
- **Rede**: Especifica nome da rede externa
- **Imagem**: `automacaodebaixocusto/spark-course-unificado:latest`

## Comandos Úteis

```bash
# Ver status dos serviços
docker stack services spark-course

# Ver logs
docker service logs spark-course_app

# Escalar serviço
docker service scale spark-course_app=3

# Remover stack
docker stack rm spark-course

# Ver redes
docker network ls

# Ver volumes
docker volume ls

# Ver imagens locais
docker images automacaodebaixocusto/spark-course-unificado
```

## Acessos

- **Aplicação**: https://community.iacas.top
- **Dashboard Traefik**: http://traefik.community.iacas.top:8080

## Troubleshooting

### SSL não funciona
- Verifique se o domínio está apontando para o servidor
- Confirme se as portas 80 e 443 estão abertas
- Verifique os logs: `docker service logs traefik_traefik`
- Confirme se o email está configurado em `traefik-stack.yml`

### Aplicação não carrega
- Verifique se o Supabase está configurado corretamente
- Confirme se a rede `network_public` existe
- Verifique os logs: `docker service logs spark-course_app`

### Volumes não encontrados
```bash
# Criar volumes manualmente se necessário
docker volume create volume_swarm_certificates
docker volume create volume_swarm_shared
```

### Erro no push para Docker Hub
- Verifique se está logado: `docker login`
- Confirme se tem permissão no repositório
- Verifique a conexão com a internet 

## Build e Deploy

### 1. Build da imagem
```bash
docker build -t automacaodebaixocusto/spark-course-unificado:latest .
docker push automacaodebaixocusto/spark-course-unificado:latest
```

### 2. Suba a stack
```bash
docker stack deploy -c docker-stack.yml spark-course
```

## Exemplo de docker-stack.yml
```yaml
version: '3.8'
services:
  app:
    image: automacaodebaixocusto/spark-course-unificado:latest
    environment:
      - JWT_SECRET=um-segredo-bem-forte
      - POSTGRES_HOST=postgres_postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=nome_do_banco
      - POSTGRES_USER=usuario
      - POSTGRES_PASSWORD=senha
    networks:
      - network_public
    deploy:
      replicas: 1
networks:
  network_public:
    external: true
```

## Acesso
- O frontend React estará disponível na raiz do domínio.
- As rotas da API continuam funcionando normalmente (ex: `/api/auth/login`).

## Observações
- Não é mais necessário Nginx ou dois containers separados.
- O Express serve tudo: API e arquivos estáticos do React.
- Para escalar separadamente, volte a separar os serviços. 