# 1. Imagen base oficial de Node.js
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# 2. Copiar manifiestos y esquema de Prisma
COPY package*.json ./
COPY prisma ./prisma/

# 3. Instalar dependencias completas
RUN npm install

# 4. Copiar código fuente, generar Prisma Client y compilar NestJS
COPY . .
RUN npx prisma generate
RUN npm run build

# 5. Etapa final de producción
FROM node:20-alpine

WORKDIR /usr/src/app

# Copiar manifiestos e instalar solo producción
COPY package*.json ./
RUN npm install --only=production

# Copiar todo el directorio de distribución compilado y cliente de Prisma
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

# Arrancar buscando la ruta estándar compilada de NestJS
CMD ["sh", "-c", "if [ -f dist/main.js ]; then node dist/main.js; else node dist/src/main.js; fi"]