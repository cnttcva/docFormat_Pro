FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    fontconfig \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto-core \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server.cjs ./

ENV NODE_ENV=production

EXPOSE 8787

CMD ["node", "server.cjs"]