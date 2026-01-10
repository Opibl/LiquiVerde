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
  ECO SCORE
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
  SOCIAL SCORE
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
  FUNCIÓN DE UTILIDAD (CES)
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
  SUSTITUCIONES (POST-OPTIMIZACIÓN)
====================================================== */

const detectSubstitutions = (optimizedItems, allProducts) => {
  const subs = []

  optimizedItems.forEach(item => {
    const baseScore = sustainabilityUtility(
      item.eco_score,
      item.social_score
    )

    const better = allProducts.find(p =>
      p.id !== item.id &&
      p.category === item.category &&
      p.price <= item.price &&
      sustainabilityUtility(
        p.eco_score,
        p.social_score
      ) > baseScore
    )

    if (better) {
      subs.push({
        fromId: item.id,
        fromName: item.name,
        toProduct: better,
        reason: 'Mayor sostenibilidad con igual o menor precio',
      })
    }
  })

  return subs
}

/* ======================================================
  ROUTES
====================================================== */

app.get('/api/products', async (_, res) => {
  const r = await pool.query(
    `SELECT
       id,
       name,
       barcode,                         
       price,
       eco_score   AS "ecoScore",
       social_score AS "socialScore",
       category,
       image_url
     FROM products
     LIMIT 2000`
  )

  res.json({ products: r.rows })
})


const translateToSpanish = async (text, source = 'auto') => {
  try {
    const res = await fetch('http://localhost:5000/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source,
        target: 'es',
        format: 'text',
      }),
    })

    if (!res.ok) return text

    const data = await res.json()
    return data.translatedText || text
  } catch (err) {
    console.error('Error traducción:', err.message)
    return text
  }
}

app.post('/api/seed-openfood', async (_, res) => {
  await pool.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE')

  const MAX_PAGES = 5
  const seen = new Set()
  let inserted = 0

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${OPEN_FOOD_URL}&page=${page}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LiquiVerde/1.0',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`Error en OFF page ${page}`)
      break
    }

    const data = await response.json()
    if (!data.products || data.products.length === 0) break

    for (const p of data.products) {
      let name = null

      // ✅ PRIORIDAD CORRECTA POR IDIOMA
      if (p.product_name_es || p.generic_name_es) {
        name = p.product_name_es || p.generic_name_es
      } else if (p.product_name_fr || p.generic_name_fr) {
        name = await translateToSpanish(
          p.product_name_fr || p.generic_name_fr,
          'fr'
        )
      } else if (p.product_name_en || p.generic_name_en) {
        name = await translateToSpanish(
          p.product_name_en || p.generic_name_en,
          'en'
        )
      } else if (p.product_name_ar || p.generic_name_ar) {
        name = await translateToSpanish(
          p.product_name_ar || p.generic_name_ar,
          'ar'
        )
      } else if (p.product_name || p.generic_name) {
        name = await translateToSpanish(
          p.product_name || p.generic_name,
          'auto'
        )
      } else {
        continue
      }

      const norm = normalizeName(name)
      if (!norm || seen.has(norm)) continue
      seen.add(norm)

      await pool.query(
        `INSERT INTO products
         (name, normalized_name, barcode, price, eco_score, social_score, category, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (normalized_name) DO NOTHING`,
        [
          name,
          norm,
          p.code || null,
          estimateChileanPrice(p),
          estimateEcoScore(p),
          estimateSocialScore(p),
          getMainCategory(p.categories_tags),
          p.image_front_url ||
            p.image_url ||
            p.image_small_url ||
            null,
        ]
      )

      inserted++

      // ⏳ delay suave
      await new Promise(r => setTimeout(r, 150))
    }
  }

  res.json({ inserted })
})


app.post('/api/optimize', async (req, res) => {
  const { budget, items } = req.body

  const db = await pool.query(
    'SELECT * FROM products WHERE id = ANY($1)',
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

  const allProducts = (await pool.query(
    'SELECT * FROM products'
  )).rows

  const substitutions = detectSubstitutions(
    chosen.items,
    allProducts
  )

  res.json({
    originalTotal,
    optimized: chosen.items,
    substitutions,
  })
})

app.get('/api/products/barcode/:code', async (req, res) => {
  const { code } = req.params

  const r = await pool.query(
    'SELECT * FROM products WHERE barcode = $1 LIMIT 1',
    [code]
  )

  if (r.rows.length === 0) {
    return res.status(404).json({
      error: 'Producto no encontrado',
    })
  }

  res.json(r.rows[0])
})


app.listen(PORT, () =>
  console.log(`Backend listo en http://localhost:${PORT}`)
)
