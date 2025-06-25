# 1. Build do frontend (React)
FROM node:18 AS frontend
WORKDIR /app/frontend
COPY ./src ./src
COPY ./public ./public
COPY ./index.html ./
COPY ./vite.config.ts ./
COPY ./tsconfig*.json ./
COPY ./tailwind.config.ts ./
COPY ./postcss.config.js ./
COPY ./components.json ./
COPY package*.json ./
# Instalar dependências
RUN npm install
RUN npm run build

# 2. Build do backend (Express)
FROM node:18-alpine AS backend
WORKDIR /app
# Instalar postgresql-client para pg_isready
RUN apk add --no-cache postgresql-client
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/. .
COPY --from=frontend /app/frontend/dist ./public
COPY supabase/migrations ./migrations
COPY backend/entrypoint.sh .
RUN chmod +x entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./entrypoint.sh"] 