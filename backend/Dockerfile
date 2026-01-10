# Imagen base
FROM node:18-alpine

# Directorio de trabajo
WORKDIR /app

# Copiamos dependencias primero (mejor cache)
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Puerto del backend
EXPOSE 3001

# Comando de arranque
CMD ["npm", "run", "dev"]
