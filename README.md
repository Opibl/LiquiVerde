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
  normalized_name TEXT UNIQUE,
  price INTEGER,
  eco_score INTEGER,
  social_score INTEGER,
  category TEXT
);


Poblar base de datos desde Open Food Facts:

POST http://localhost:3001/api/seed-openfood

Ejemplo: Invoke-RestMethod -Method POST -Uri http://localhost:3001/api/seed-openfood


Iniciar backend:

npm run dev


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
- El objetivo es maximizar la sostenibilidad total

La función objetivo combina:
- EcoScore (impacto ambiental)
- SocialScore (impacto social)
- Precio (impacto económico)

El algoritmo nunca permite superar el presupuesto definido.


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


USO DE IA
---------

Durante el desarrollo se utilizó IA generativa como asistente
de apoyo, principalmente para:

- Detección de errores
- Buenas prácticas en React y TypeScript
- Apoyo en la redacción de documentación

Toda la arquitectura, decisiones de diseño, implementación y código
final fueron realizados y validados por el autor.

