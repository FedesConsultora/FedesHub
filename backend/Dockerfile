# backend/Dockerfile
FROM node:20-alpine

# deps necesarios para compilar pg y bcrypt
RUN apk add --no-cache python3 make g++ bash

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN npm install -g nodemon

COPY . .

EXPOSE 4000

# arrancar con nodemon para hot reload
CMD ["npm", "run", "dev"]
