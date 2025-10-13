FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git curl bash \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

RUN npm install -D @rollup/rollup-linux-x64-gnu

COPY . .

EXPOSE 5173
CMD ["bash","-lc","npm run dev -- --host 0.0.0.0"]