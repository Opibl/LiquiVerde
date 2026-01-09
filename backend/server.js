import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import pool from './db.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

/* ======================================================
  Open Food Facts (Chile)
====================================================== */
const OPEN_FOOD_URL =
  'https://world.openfoodfacts.org/api/v2/search?' +
  'categories=food' +
  '&tagtype_0=countries' +
  '&tag_contains_0=contains' +
  '&tag_0=chile' +
  '&page_size=2000'

/* ======================================================
  Utils
====================================================== */

// Normaliza nombres para evitar duplicados
const normalizeName = (name = '') =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()

const randomBetween = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const estimateChileanPrice = (product) => {
  const categories = product.categories_tags || []

  if (categories.some(c => c.includes('milk') || c.includes('dairy')))
    return randomBetween(700, 1200)

  if (categories.some(c => c.includes('bread')))
    return randomBetween(800, 1200)

  if (categories.some(c => c.includes('water') || c.includes('beverage')))
    return randomBetween(500, 1000)

  if (categories.some(c => c.includes('rice') || c.includes('cereal')))
    return randomBetween(900, 1500)

  if (categories.some(c => c.includes('legume')))
    return randomBetween(800, 1200)

  if (categories.some(c => c.includes('oil')))
    return randomBetween(1800, 3000)

  if (categories.some(c => c.includes('chocolate') || c.includes('snack')))
    return randomBetween(900, 2500)

  return randomBetween(800, 1500)
}

const estimateEcoScore = (p) => {
  const categories = p.categories_tags || []
  let score = 50

  if (categories.some(c => c.includes('legumes'))) score += 30
  if (categories.some(c => c.includes('fruits'))) score += 25
  if (categories.some(c => c.includes('vegetables'))) score += 25
  if (categories.some(c => c.includes('water'))) score += 20
  if (categories.some(c => c.includes('whole'))) score += 15

  if (categories.some(c => c.includes('chocolate'))) score -= 20
  if (categories.some(c => c.includes('snacks'))) score -= 20
  if (categories.some(c => c.includes('ultra'))) score -= 25

  if (p.ecoscore_grade === 'a') score += 10
  if (p.ecoscore_grade === 'b') score += 5
  if (p.ecoscore_grade === 'd') score -= 10
  if (p.ecoscore_grade === 'e') score -= 20

  return Math.max(20, Math.min(score, 95))
}

// 🆕 Categoría principal (para sustituciones del mismo tipo)
const getMainCategory = (categories = []) => {
  const c = categories.join(' ').toLowerCase()

  // 🥛 LÁCTEOS
  if (
    c.includes('milk') ||
    c.includes('dairy') ||
    c.includes('cheese') ||
    c.includes('yogurt')
  ) return 'dairy'

  // 🍞 PANADERÍA
  if (
    c.includes('bread') ||
    c.includes('bakery') ||
    c.includes('toast')
  ) return 'bakery'

  // 🍪 GALLETAS / SNACKS DULCES
  if (
    c.includes('biscuits') ||
    c.includes('cookies') ||
    c.includes('chocolate') ||
    c.includes('snack') ||
    c.includes('sweets') ||
    c.includes('candy')
  ) return 'snacks'

  // 🥤 BEBIDAS
  if (
    c.includes('beverage') ||
    c.includes('drinks') ||
    c.includes('water') ||
    c.includes('juice') ||
    c.includes('soda')
  ) return 'beverages'

  // 🌾 CEREALES
  if (
    c.includes('cereal') ||
    c.includes('breakfast')
  ) return 'cereals'

  // 🍚 ARROZ / GRANOS
  if (
    c.includes('rice') ||
    c.includes('grains')
  ) return 'grains'

  // 🫘 LEGUMBRES
  if (
    c.includes('legume') ||
    c.includes('lentils') ||
    c.includes('beans') ||
    c.includes('chickpeas')
  ) return 'legumes'

  // 🥫 CONSERVAS
  if (
    c.includes('canned') ||
    c.includes('preserved')
  ) return 'canned'

  // 🛢️ ACEITES Y GRASAS
  if (
    c.includes('oil') ||
    c.includes('fat')
  ) return 'oils'

  // 🥩 CARNES
  if (
    c.includes('meat') ||
    c.includes('beef') ||
    c.includes('chicken') ||
    c.includes('pork')
  ) return 'meat'

  // 🐟 PESCADOS
  if (
    c.includes('fish') ||
    c.includes('seafood')
  ) return 'seafood'

  // 🥦 FRUTAS Y VERDURAS
  if (
    c.includes('fruit') ||
    c.includes('vegetable') ||
    c.includes('veggie')
  ) return 'produce'

  // 🧂 OTROS
  return 'other'
}

const estimateSocialScore = (p) => {
  let score = 50 // base neutra

  const countries = p.countries_tags || []
  const labels = p.labels_tags || []
  const nova = p.nova_groups_tags || []
  const lang = p.lang || ''

  /* 🌍 Origen / cercanía */
  if (countries.includes('en:chile')) score += 20
  else if (countries.length > 0) score += 10

  /* 🏷️ Certificaciones sociales */
  if (labels.some(l => l.includes('fair-trade'))) score += 20
  if (labels.some(l => l.includes('organic'))) score += 10
  if (labels.some(l => l.includes('local'))) score += 10

  /* 🏭 Nivel de procesamiento */
  if (nova.includes('en:nova-group-4')) score -= 20 // ultraprocesado
  if (nova.includes('en:nova-group-1')) score += 10 // sin procesar

  /* 🗣️ Idioma local */
  if (lang === 'es') score += 5

  return Math.max(30, Math.min(score, 95))
}


/* ======================================================
  Optimización y scoring
====================================================== */

const calculateSustainability = (ecoScore, socialScore, price) => {
  const economicScore = Math.max(0, 100 - price / 20)
  return ecoScore * 0.5 + socialScore * 0.3 + economicScore * 0.2
}

const optimizeShopping = (items, budget) => {
  const scored = items.map(p => {
    const sustainability =
      calculateSustainability(
        p.eco_score,
        p.social_score,
        p.price
      ) * p.quantity

    return {
      ...p,
      sustainability,
      totalPrice: p.price * p.quantity,
    }
  })

  const n = scored.length
  const B = budget

  const dp = Array.from({ length: n + 1 }, () =>
    Array(B + 1).fill(0)
  )

  for (let i = 1; i <= n; i++) {
    for (let b = 0; b <= B; b++) {
      if (scored[i - 1].totalPrice <= b) {
        dp[i][b] = Math.max(
          dp[i - 1][b],
          dp[i - 1][b - scored[i - 1].totalPrice] +
            scored[i - 1].sustainability
        )
      } else {
        dp[i][b] = dp[i - 1][b]
      }
    }
  }

  const chosen = []
  let b = B

  for (let i = n; i > 0; i--) {
    if (dp[i][b] !== dp[i - 1][b]) {
      chosen.push(scored[i - 1])
      b -= scored[i - 1].totalPrice
    }
  }

  return chosen.reverse()
}

const detectSubstitutions = (optimized, allProducts) => {
  const substitutions = []

  optimized.forEach(item => {
    const alternative = allProducts.find(p =>
      p.category === item.category &&
      p.eco_score > item.eco_score &&
      p.price <= item.price &&
      !optimized.some(o => o.id === p.id)
    )

    if (alternative) {
      substitutions.push({
        fromId: item.id,
        fromName: item.name,
        toProduct: alternative,
        reason: 'Mismo tipo con mejor ecoScore y menor precio',
      })
    }
  })

  return substitutions
}


/* ======================================================
  GET /api/products
====================================================== */
app.get('/api/products', async (_, res) => {
  try {
    const db = await pool.query(`
      SELECT
        id,
        name,
        price,
        eco_score    AS "ecoScore",
        social_score AS "socialScore",
        category
      FROM products
      ORDER BY id
      LIMIT 2000
    `)

    res.json({ products: db.rows })
  } catch (error) {
    console.error('Error productos:', error)
    res.status(500).json({ error: 'Error cargando productos' })
  }
})

/* ======================================================
  POST /api/seed-openfood
====================================================== */
app.post('/api/seed-openfood', async (_, res) => {
  try {
    console.log('Seed Open Food Facts iniciado')

    // Limpiar tabla
    await pool.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE')

    const response = await fetch(OPEN_FOOD_URL, {
      headers: { 'User-Agent': 'LiquiVerde/1.0 (academic project)' },
    })

    if (!response.ok) {
      throw new Error(`OpenFood HTTP ${response.status}`)
    }

    const data = await response.json()

    console.log('COLUMNAS DEL PRODUCTO:')
    console.log(Object.keys(data.products[0]))

    // DEDUPLICACIÓN REAL
    const seen = new Set()

    const products = data.products
      .filter(p => p.product_name)
      .map(p => {
        const name =
          p.product_name_es ||
          p.product_name_en ||
          p.product_name

        const normalized = normalizeName(name)
        if (!normalized || seen.has(normalized)) return null

        seen.add(normalized)

        return {
          name,
          normalized_name: normalized,
          price: estimateChileanPrice(p),
          eco_score: estimateEcoScore(p),
          social_score: estimateSocialScore(p),
          category: getMainCategory(p.categories_tags),
        }
      })
      .filter(Boolean)
      .slice(0, 2000)

    for (const p of products) {
      await pool.query(
        `
        INSERT INTO products
        (name, normalized_name, price, eco_score, social_score, category)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (normalized_name) DO NOTHING
        `,
        [
          p.name,
          p.normalized_name,
          p.price,
          p.eco_score,
          p.social_score,
          p.category,
        ]
      )
    }

    console.log(`Seed completo: ${products.length} productos únicos`)

    res.json({
      success: true,
      inserted: products.length,
    })
  } catch (error) {
    console.error('Seed error:', error)
    res.status(500).json({ error: 'Error poblando base de datos' })
  }
})

/* ======================================================
  Test DB
====================================================== */
app.get('/api/test-db', async (_, res) => {
  const r = await pool.query('SELECT NOW()')
  res.json(r.rows[0])
})


/* ======================================================
  POST /api/optimize
====================================================== */
app.post('/api/optimize', async (req, res) => {
  try {
    const { budget, items } = req.body

    if (!budget || !items || items.length === 0) {
      return res.status(400).json({ error: 'Datos inválidos' })
    }

    // Traer productos seleccionados
    const db = await pool.query(
      `SELECT * FROM products WHERE id = ANY($1)`,
      [items.map(i => i.id)]
    )

    const enriched = db.rows.map(p => {
      const selected = items.find(i => i.id === p.id)
      return {
        ...p,
        quantity: selected.quantity,
      }
    })

    const originalTotal = enriched.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    )

    const optimized = optimizeShopping(enriched, budget)

    const allProducts = (
      await pool.query('SELECT * FROM products')
    ).rows

    const substitutions = detectSubstitutions(
      optimized,
      allProducts
    )

    res.json({
      originalTotal,
      optimized,
      substitutions,
    })
  } catch (error) {
    console.error('Error optimizando:', error)
    res.status(500).json({ error: 'Error optimizando compra' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`)
})
