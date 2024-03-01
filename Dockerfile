FROM node:18-alpine as builder

RUN apk --no-cache add bash

WORKDIR /app

RUN npm install -g pnpm

COPY package*.json ./

RUN pnpm install

COPY . .

CMD ["pnpm", "run", "dev"]

LABEL org.opencontainers.image.title="app-banner"                                  \
      org.opencontainers.image.description="Descrição do projeto app-banner."      \
      org.opencontainers.image.url="URL do seu projeto"                            \
      org.opencontainers.image.source="https://github.com/JoaoOlivio/app-banner"   \
      org.opencontainers.image.authors="T-sync <dev@tsync.com.br>"