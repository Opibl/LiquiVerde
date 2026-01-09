import type { Product } from '../types/Product'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

/**
 * Productos fallback (si el backend falla)
 */
const fallbackProducts: Product[] = [
  {
    id: 1,
    name: 'Leche Orgánica',
    unitPrice: 1200,
    ecoScore: 85,
    socialScore: 70,
    category: 'dairy',
  },
  {
    id: 2,
    name: 'Leche Tradicional',
    unitPrice: 900,
    ecoScore: 45,
    socialScore: 50,
    category: 'dairy',
  },
  {
    id: 3,
    name: 'Pan Integral',
    unitPrice: 1000,
    ecoScore: 70,
    socialScore: 60,
    category: 'bakery',
  },
  {
    id: 4,
    name: 'Pan Blanco',
    unitPrice: 800,
    ecoScore: 40,
    socialScore: 45,
    category: 'bakery',
  },
]

/**
 * Fetch desde TU BACKEND (DB → API → Frontend)
 * Normaliza price → unitPrice
 */
export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/products`)

    if (!res.ok) {
      throw new Error(`Backend HTTP ${res.status}`)
    }

    const data = await res.json()

    console.log(
      '📦 Productos recibidos del backend:',
      data.products
    )

    if (!Array.isArray(data.products)) {
      throw new Error('Formato inválido del backend')
    }

    // 🔑 NORMALIZACIÓN CLAVE
    return data.products.map((p: any) => ({
      id: p.id,
      name: p.name,
      unitPrice: p.unitPrice ?? p.price, // 👈 AQUÍ estaba el bug
      ecoScore: p.ecoScore,
      socialScore: p.socialScore,
      category: p.category,
    }))
  } catch (error) {
    console.warn(
      '⚠️ Backend no disponible, usando fallback',
      error
    )
    return fallbackProducts
  }
}
