import type { Product } from '../types/Product'

const OptimizeResult: React.FC<{ products: Product[] }> = ({ products }) => {
  const total = products.reduce((sum, p) => sum + p.price, 0)
  const ecoAvg =
    products.reduce((sum, p) => sum + p.ecoScore, 0) / (products.length || 1)

  return (
    <>
      <h2>Resultado</h2>
      <p>Total: ${total}</p>
      <p>Eco Score promedio: {ecoAvg.toFixed(1)}</p>

      <ul>
        {products.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </>
  )
}

export default OptimizeResult
