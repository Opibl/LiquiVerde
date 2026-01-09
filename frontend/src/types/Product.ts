export interface Product {
  id: number
  name: string
  unitPrice: number      // precio unitario
  ecoScore: number
  socialScore: number
  category: string
  imageUrl?: string      // ✅ IMAGEN (opcional)
}
