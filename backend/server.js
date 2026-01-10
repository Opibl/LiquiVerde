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
  Utils generales
====================================================== */

const normalizeName = (name = '') =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()

const randomBetween = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const clamp = (x, min = 0, max = 100) =>
  Math.max(min, Math.min(max, x))

const normalize01 = (x, min = 0, max = 100) =>
  (clamp(x, min, max) - min) / (max - min)

/* ======================================================
  Precio estimado Chile
====================================================== */

const estimateChileanPrice = (product) => {
  const c = product.categories_tags || []

  if (c.some(x => x.includes('milk') || x.includes('dairy')))
    return randomBetween(700, 1200)
  if (c.some(x => x.includes('bread')))
    return randomBetween(800, 1200)
  if (c.some(x => x.includes('water') || x.includes('beverage')))
    return randomBetween(500, 1000)
  if (c.some(x => x.includes('rice') || x.includes('cereal')))
    return randomBetween(900, 1500)
  if (c.some(x => x.includes('legume')))
    return randomBetween(800, 1200)
  if (c.some(x => x.includes('oil')))
    return randomBetween(1800, 3000)
  if (c.some(x => x.includes('chocolate') || x.includes('snack')))
    return randomBetween(900, 2500)

  return randomBetween(800, 1500)
}

/* ======================================================
  ECO SCORE (mejorado)
====================================================== */

const estimateEcoScore = (p) => {
  let score = 50
  const c = p.categories_tags || []
  const labels = p.labels_tags || []
  const nova = p.nova_groups_tags || []
  const packaging = p.packaging_tags || []

  if (c.some(x => x.includes('legumes'))) score += 15
  if (c.some(x => x.includes('vegetables'))) score += 15
  if (c.some(x => x.includes('fruits'))) score += 15
  if (c.some(x => x.includes('meat'))) score -= 20
  if (c.some(x => x.includes('dairy'))) score -= 10

  if (nova.includes('en:nova-group-4')) score -= 20
  if (nova.includes('en:nova-group-1')) score += 10

  if (packaging.some(x => x.includes('plastic'))) score -= 10
  if (packaging.some(x => x.includes('glass'))) score += 5
  if (packaging.some(x => x.includes('paper'))) score += 5

  if (labels.includes('en:organic')) score += 10

  if (p.ecoscore_grade === 'a') score += 10
  if (p.ecoscore_grade === 'b') score += 5
  if (p.ecoscore_grade === 'd') score -= 10
  if (p.ecoscore_grade === 'e') score -= 20

  return clamp(score)
}

/* ======================================================
  SOCIAL SCORE (mejorado)
====================================================== */

const estimateSocialScore = (p) => {
  let score = 50
  const labels = p.labels_tags || []
  const countries = p.countries_tags || []
  const nova = p.nova_groups_tags || []

  if (countries.includes('en:chile')) score += 15
  else if (countries.length > 0) score += 5

  if (labels.includes('en:fair-trade')) score += 20
  if (labels.includes('en:small-producers')) score += 10

  if (nova.includes('en:nova-group-4')) score -= 25
  if (nova.includes('en:nova-group-1')) score += 10

  return clamp(score)
}

/* ======================================================
  FUNCIÓN DE UTILIDAD (NÚCLEO MATEMÁTICO)
====================================================== */

const sustainabilityUtility = (
  eco,
  social,
  weights = { eco: 0.6, social: 0.4 },
  rho = 0.5
) => {
  const e = normalize01(eco)
  const s = normalize01(social)

  return Math.pow(
    weights.eco * Math.pow(e, rho) +
    weights.social * Math.pow(s, rho),
    1 / rho
  )
}

/* ======================================================
  CATEGORÍA PRINCIPAL
====================================================== */

const getMainCategory = (categories = []) => {
  const c = categories.join(' ').toLowerCase()

  if (c.includes('milk') || c.includes('dairy')) return 'dairy'
  if (c.includes('bread') || c.includes('bakery')) return 'bakery'
  if (c.includes('snack') || c.includes('chocolate')) return 'snacks'
  if (c.includes('water') || c.includes('beverage')) return 'beverages'
  if (c.includes('cereal')) return 'cereals'
  if (c.includes('rice') || c.includes('grains')) return 'grains'
  if (c.includes('legume') || c.includes('beans')) return 'legumes'
  if (c.includes('oil')) return 'oils'
  if (c.includes('meat')) return 'meat'
  if (c.includes('fish') || c.includes('seafood')) return 'seafood'
  if (c.includes('fruit') || c.includes('vegetable')) return 'produce'

  return 'other'
}

/* ======================================================
  OPTIMIZACIÓN MULTIOBJETIVO
====================================================== */

const optimizeByObjective = (items, budget, objective) => {
  const scored = items.map(p => {
    let value = 0

    if (objective === 'sustainability') {
      value =
        sustainabilityUtility(
          p.eco_score,
          p.social_score
        ) * p.quantity
    }

    if (objective === 'price') {
      value = -p.price * p.quantity
    }

    return {
      ...p,
      value,
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
            scored[i - 1].value
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

const evaluateSolution = (items) => ({
  items,
  totalPrice: items.reduce((s, p) => s + p.price * p.quantity, 0),
  sustainability: items.reduce(
    (s, p) =>
      s +
      sustainabilityUtility(
        p.eco_score,
        p.social_score
      ) * p.quantity,
    0
  ),
})

const dominates = (a, b) =>
  a.totalPrice <= b.totalPrice &&
  a.sustainability >= b.sustainability &&
  (
    a.totalPrice < b.totalPrice ||
    a.sustainability > b.sustainability
  )

const paretoFront = (solutions) =>
  solutions.filter(s1 =>
    !solutions.some(s2 => dominates(s2, s1))
  )

/* ======================================================
  ROUTES
====================================================== */

app.get('/api/products', async (_, res) => {
  try {
    const r = await pool.query(
      'SELECT id,name,price,eco_score AS "ecoScore",social_score AS "socialScore",category,image_url FROM products LIMIT 2000'
    )
    res.json({ products: r.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/seed-openfood', async (_, res) => {
  try {
    await pool.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE')

    const response = await fetch(OPEN_FOOD_URL, {
      headers: { 'User-Agent': 'LiquiVerde/1.0' },
    })

    const data = await response.json()
    const seen = new Set()

    const products = data.products
      .filter(p => p.product_name)
      .map(p => {
        const name = p.product_name_es || p.product_name
        const norm = normalizeName(name)
        if (!norm || seen.has(norm)) return null
        seen.add(norm)

        return {
          name,
          normalized_name: norm,
          price: estimateChileanPrice(p),
          eco_score: estimateEcoScore(p),
          social_score: estimateSocialScore(p),
          category: getMainCategory(p.categories_tags),
          image_url:
            p.image_front_url ||
            p.image_url ||
            p.image_small_url ||
            null,
        }
      })
      .filter(Boolean)
      .slice(0, 2000)

    for (const p of products) {
      await pool.query(
        `INSERT INTO products 
         (name, normalized_name, price, eco_score, social_score, category, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (normalized_name) DO NOTHING`,
        Object.values(p)
      )
    }

    res.json({ inserted: products.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/optimize', async (req, res) => {
  const { budget, items } = req.body

  const db = await pool.query(
    `SELECT * FROM products WHERE id = ANY($1)`,
    [items.map(i => i.id)]
  )

  const enriched = db.rows.map(p => ({
    ...p,
    quantity: items.find(i => i.id === p.id).quantity,
  }))

  const originalTotal = enriched.reduce(
    (s, p) => s + p.price * p.quantity,
    0
  )

  const solutions = [
    optimizeByObjective(enriched, budget, 'sustainability'),
    optimizeByObjective(enriched, budget, 'price'),
  ].map(evaluateSolution)

  const pareto = paretoFront(solutions)

  const chosen = pareto.sort(
    (a, b) => b.sustainability - a.sustainability
  )[0]

  res.json({
    originalTotal,
    optimized: chosen.items,
  })
})

app.listen(PORT, () =>
  console.log(`Backend listo en http://localhost:${PORT}`)
)
