import type { Product } from '../types/Product'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

export const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch(`${BACKEND_URL}/api/products`)

  if (!res.ok) {
    throw new Error(`Backend HTTP ${res.status}`)
  }

  const data = await res.json()

  console.log(
    'Productos recibidos del backend:',
    data.products
  )

  if (!Array.isArray(data.products)) {
    throw new Error('Formato inválido del backend')
  }

  // Normalización
  return data.products.map((p: any) => ({
    id: p.id,
    name: p.name,
    unitPrice: p.unitPrice ?? p.price,
    ecoScore: p.ecoScore,
    socialScore: p.socialScore,
    category: p.category,
  }))
}
