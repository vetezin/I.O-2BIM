FROM node:24-bookworm-slim
WORKDIR /app

COPY serve.cjs gemini.cjs *.html ./
COPY css/ css/
COPY js/ js/
COPY dashboard/ dashboard/

USER node
CMD ["node", "serve.cjs"]
