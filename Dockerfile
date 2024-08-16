# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.5.1

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY . .

RUN npm install

USER node

EXPOSE 8080

CMD ["node", "app.js"]
