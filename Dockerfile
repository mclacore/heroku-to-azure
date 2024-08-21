# syntax=docker/dockerfile:1

ARG NODE_VERSION=16

FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

WORKDIR /usr/src/app/client

RUN npm install

RUN npm run build

WORKDIR /usr/src/app

USER node

EXPOSE 8080

CMD ["node", "app.js"]
