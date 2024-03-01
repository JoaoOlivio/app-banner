FROM node:18-alpine as builder
RUN apk --no-cache add bash
WORKDIR /app
COPY package*.json ./
ENV CI 1
RUN npm ci --legacy-peer-deps

# Copiando arquivos específicos do projeto "app-banner"
# Nota: Adicione ou remova comandos COPY conforme necessário para o seu projeto
COPY . .

# Assumindo que o projeto tem um script de construção
RUN npm run build

# Ajuste para o diretório de saída do seu projeto, se necessário
FROM nginx:alpine
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# Metadados da imagem, ajuste conforme necessário
LABEL org.opencontainers.image.title="app-banner"                                  \
      org.opencontainers.image.description="Descrição do projeto app-banner."      \
      org.opencontainers.image.url="URL do seu projeto"                            \
      org.opencontainers.image.source="https://github.com/JoaoOlivio/app-banner"   \
      org.opencontainers.image.authors="T-sync <dev@tsync.com.br>"