# backend/Dockerfile
FROM node:20-alpine

# deps necesarios para compilar pg y bcrypt si aplica (aunque ya los tienes)
RUN apk add --no-cache python3 make g++ bash

WORKDIR /usr/src/app

COPY package*.json ./
# En producción usamos npm install
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

# En producción usamos node directamente, no nodemon
CMD ["npm", "start"]
