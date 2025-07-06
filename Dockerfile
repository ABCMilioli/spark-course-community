# 1. Build do frontend (React)
FROM node:18 AS frontend
WORKDIR /app/frontend

# Definir variável de ambiente para o build (valor padrão, pode ser sobrescrito)
ARG VITE_API_URL=https://community.iacas.top
ENV VITE_API_URL=${VITE_API_URL}

# Copiar arquivos do frontend
COPY ./src ./src
COPY ./public ./public
COPY ./index.html ./
COPY ./vite.config.ts ./
COPY ./tsconfig*.json ./
COPY ./tailwind.config.ts ./
COPY ./postcss.config.js ./
COPY ./components.json ./
COPY package*.json ./

# Instalar dependências e fazer build
RUN npm install
RUN npm run build

# 2. Build do backend (Express)
FROM node:18 AS backend
WORKDIR /app

# Instalar postgresql-client para pg_isready
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências do backend
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copiar arquivos do backend e frontend buildado
COPY backend/. .
COPY --from=frontend /app/frontend/dist ./public
COPY supabase/migrations ./migrations
COPY backend/entrypoint.sh .
COPY scripts/generate-env-js.sh .
RUN chmod +x entrypoint.sh
RUN chmod +x generate-env-js.sh

EXPOSE 3001
ENTRYPOINT ["./entrypoint.sh"] 