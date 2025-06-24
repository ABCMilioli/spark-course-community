FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
COPY ../supabase/migrations ./migrations
RUN chmod +x entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./entrypoint.sh"] 