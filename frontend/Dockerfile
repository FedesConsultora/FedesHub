FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git curl bash \
  && rm -rf /var/lib/apt/lists/*

# Fuerza a Rollup a usar la implementación JS (no binario nativo)
ENV ROLLUP_SKIP_NODEJS_NATIVE=1
# Evita instalar dependencias "optional" (las nativas de rollup son opcionales)
ENV npm_config_optional=false

WORKDIR /usr/src/app

# ⚠️ Evitamos el bug de npm con el lockfile: instalamos SIN package-lock.json
COPY package*.json ./
RUN rm -f package-lock.json && npm install

COPY . .

EXPOSE 5173
CMD ["bash","-lc","npm run dev -- --host 0.0.0.0"]
