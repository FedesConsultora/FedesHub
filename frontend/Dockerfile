# frontend/Dockerfile
# --------------------------------------
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# vite con hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]