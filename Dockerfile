FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    ALLOW_PRIVATE_ENDPOINTS=0

COPY package.json server.mjs ./
COPY public ./public

USER node

EXPOSE 8080

CMD ["node", "server.mjs"]
