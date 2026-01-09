export interface Product {
  id: number
  name: string
  unitPrice: number      // ✅ precio unitario CLARO
  ecoScore: number
  socialScore: number
  category: string
}
