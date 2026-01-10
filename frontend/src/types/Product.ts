export interface Product {
  id: number
  name: string
  unitPrice: number      
  ecoScore: number
  socialScore: number
  category: string
  barcode?: string       
  imageUrl?: string      
}
