FROM node:18-alpine as builder
RUN apk --no-cache add bash
WORKDIR /app
COPY package*.json ./

# Copiando arquivos específicos do projeto "app-banner"
# Nota: Adicione ou remova comandos COPY conforme necessário para o seu projeto
COPY . .

CMD ["npm", "run", "dev"]

# Metadado
LABEL org.opencontainers.image.title="app-banner"                                  \
      org.opencontainers.image.description="Descrição do projeto app-banner."      \
      org.opencontainers.image.url="URL do seu projeto"                            \
      org.opencontainers.image.source="https://github.com/JoaoOlivio/app-banner"   \
      org.opencontainers.image.authors="T-sync <dev@tsync.com.br>"

