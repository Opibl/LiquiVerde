OPTIMIZACIÓN DE COMPRA SOSTENIBLE
================================

Aplicación full-stack para optimizar una lista de compras bajo un
presupuesto limitado, maximizando el impacto sostenible
(ambiental, social y económico) usando datos reales de Open Food Facts.

Este proyecto fue desarrollado como prueba técnica para el cargo
Software Engineer I.


STACK TECNOLÓGICO
-----------------

Frontend:
- React
- TypeScript
- CSS modular

Backend:
- Node.js
- Express
- PostgreSQL
- Open Food Facts API


FUNCIONALIDADES PRINCIPALES
---------------------------

- Selección manual de productos con cantidades
- Optimización automática de la compra según presupuesto
- Algoritmo de mochila multi-objetivo
- Sistema de scoring de sostenibilidad
- Sugerencias inteligentes de sustitución
- Dashboard de impacto (ahorro y sostenibilidad)
- Comparación entre lista original y lista optimizada


INSTALACIÓN Y EJECUCIÓN LOCAL
-----------------------------

Requisitos:
- Node.js >= 18
- npm o yarn
- PostgreSQL


1) Clonar repositorio

git clone https://github.com/Opibl/LiquiVerde.git
cd tu-repo


2) Backend

cd backend
npm install

Crear archivo .env en la carpeta backend:

DATABASE_URL=postgresql://usuario:password@localhost:5432/optimiza_db
PORT=3001


Crear tabla de productos:

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT UNIQUE NOT NULL,
  barcode VARCHAR(32),              
  price INTEGER NOT NULL CHECK (price >= 0),
  eco_score INTEGER CHECK (eco_score BETWEEN 0 AND 100),
  social_score INTEGER CHECK (social_score BETWEEN 0 AND 100),
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);



Poblar base de datos desde Open Food Facts:

POST http://localhost:3001/api/seed-openfood

Ejemplo: Invoke-RestMethod -Method POST -Uri http://localhost:3001/api/seed-openfood


TRADUCCIÓN AUTOMÁTICA (DOCKER)

Para normalizar nombres de productos en español, el backend utiliza
LibreTranslate ejecutado localmente con Docker.

Se cargan explícitamente los idiomas necesarios para evitar errores de
detección en nombres cortos de productos.

docker run -p 5000:5000 -e LT_LOAD_ONLY=es,en,fr,ar -e LT_DISABLE_WEB_UI=true libretranslate/libretranslate



El backend consume el servicio en:

http://localhost:5000/translate


La traducción se aplica solo cuando Open Food Facts no provee el nombre
en español, forzando el idioma de origen cuando es conocido
(fr, en, ar) para asegurar consistencia.


Iniciar backend:

npm start


3) Frontend

cd frontend
npm install
npm run dev

Abrir en el navegador:

http://localhost:5173


VARIABLES DE ENTORNO
-------------------

DATABASE_URL : conexión a PostgreSQL
PORT         : puerto del backend

No se requieren API keys privadas para Open Food Facts.


ALGORITMOS IMPLEMENTADOS
-----------------------

1) Algoritmo de Mochila (Knapsack) Multi-objetivo

Se implementó una variante del problema de la mochila 0/1 donde:

- El presupuesto es una restricción dura
- El objetivo principal es maximizar la sostenibilidad total de la compra

La función objetivo combina:
- EcoScore (impacto ambiental)
- SocialScore (impacto social)

El precio no forma parte de la función objetivo directa, sino que se utiliza
como una restricción estricta del sistema y como criterio secundario de
comparación entre soluciones eficientes.

El algoritmo nunca permite superar el presupuesto definido por el usuario.

### Criterios de Optimización y Prioridades

El sistema implementa una optimización multi-objetivo bajo una restricción
estricta de presupuesto.

Las prioridades del algoritmo son:

1. Nunca exceder el presupuesto definido por el usuario.
2. Maximizar la sostenibilidad total de la compra (impacto ambiental y social).
3. Utilizar el precio únicamente como restricción y criterio secundario
   de comparación entre soluciones eficientes.

Las cantidades de productos son definidas explícitamente por el usuario
y se consideran fijas durante la optimización. Cada producto se modela
como un ítem compuesto (precio × cantidad).

Para la optimización se generan múltiples soluciones candidatas con
objetivos distintos (maximización de sostenibilidad y minimización de precio).
Estas soluciones se evalúan utilizando criterios de Pareto, y la solución
final seleccionada es aquella que maximiza la sostenibilidad dentro del
conjunto de soluciones no dominadas.

Este enfoque permite manejar trade-offs reales entre costo y sostenibilidad
de forma transparente y controlada.




2) Sistema de Scoring de Sostenibilidad

Cada producto recibe un puntaje considerando:
- Categoría del producto
- Nivel de procesamiento (NOVA)
- Origen
- Certificaciones (orgánico, fair trade, local)
- Precio estimado en mercado chileno

El eco score promedio se calcula ponderando por la cantidad comprada.


3) Algoritmo de Sustitución Inteligente (Bonus)

Para cada producto optimizado:
- Se buscan alternativas de la misma categoría
- Con mejor ecoScore
- Y menor o igual precio

El usuario puede aceptar o rechazar la sustitución.
Si se acepta, la compra se reoptimiza manteniendo el presupuesto.


DASHBOARD DE IMPACTO
-------------------

El dashboard muestra:
- Gasto original
- Gasto optimizado
- Ahorro real
- Eco score promedio
- Nivel de sostenibilidad (Bajo / Medio / Alto)

También se muestra una comparación entre la lista original y la lista
optimizada para identificar productos eliminados.


USO DE LA APLICACIÓN
-------------------

1. El usuario selecciona productos desde el catálogo
2. Define la cantidad de cada producto
3. Ingresa un presupuesto máximo
4. El sistema genera una lista optimizada
5. Se muestran:
   - Lista original
   - Lista optimizada
   - Ahorro
   - Puntaje de sostenibilidad
6. El usuario puede aceptar sustituciones sugeridas


USO DE IA
---------

Durante el desarrollo se utilizó IA generativa como asistente
de apoyo, principalmente para:

- Detección de errores
- Buenas prácticas en React y TypeScript
- Apoyo en la redacción de documentación

Toda la arquitectura, decisiones de diseño, implementación y código
final fueron realizados y validados por el autor.


DEPLOY EN LA NUBE
---------

La aplicación fue desplegada utilizando servicios cloud independientes para el frontend y el backend, siguiendo buenas prácticas de separación de responsabilidades.

Frontend

El frontend fue desplegado en Netlify, utilizando su integración continua desde GitHub.

URL pública:
https://liquiverde.netlify.app

Build automático a partir del branch principal

Configurado para aplicaciones React con Vite

Manejo automático de HTTPS y CDN

Backend

El backend fue desplegado en Railway, utilizando Node.js con PostgreSQL administrado.

URL base de la API:
https://liquiverde-production.up.railway.app

Variables de entorno configuradas desde Railway

Base de datos PostgreSQL provisionada en el mismo entorno

Soporte para escalado y logs en tiempo real

Consideraciones de Arquitectura

El frontend consume el backend mediante API REST pública

No se requieren API keys privadas para Open Food Facts

La arquitectura permite escalar frontend y backend de forma independiente

El entorno local y el entorno productivo comparten la misma estructura de configuración
