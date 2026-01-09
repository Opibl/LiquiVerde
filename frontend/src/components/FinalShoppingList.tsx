import '../css/FinalShoppingList.css'

type FinalItem = {
  id: number
  name: string
  quantity: number
  unitPrice: number     // ✅ precio unitario
  totalPrice: number    // ✅ subtotal por producto
}

type Props = {
  products: FinalItem[]
}

const FinalShoppingList: React.FC<Props> = ({ products }) => {
  const total = products.reduce(
    (sum, p) => sum + (p.totalPrice || 0),
    0
  )

  const formatCLP = (value: number) =>
    value.toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    })

  return (
    <section className="final-list card">
      <h2>Lista final de compra</h2>

      <table className="final-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>

        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>x{p.quantity}</td>
              <td>{formatCLP(p.unitPrice)}</td>
              <td>{formatCLP(p.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="final-total">
        Total compra:{' '}
        <strong>{formatCLP(total)}</strong>
      </div>
    </section>
  )
}

export default FinalShoppingList
