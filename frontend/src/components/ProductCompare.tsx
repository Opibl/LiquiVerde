import type { Product } from '../types/Product'

const ProductCompare: React.FC<{ products: Product[] }> = ({ products }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Precio</th>
          <th>Eco Score</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>${p.price}</td>
            <td>{p.ecoScore}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default ProductCompare
