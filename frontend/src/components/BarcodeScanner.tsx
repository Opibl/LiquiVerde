import { useState } from 'react'
import type { Product } from '../types/Product'

type Props = {
  products: Product[]
  onProductFound: (product: Product) => void
}

const BarcodeScanner: React.FC<Props> = ({
  products,
  onProductFound,
}) => {
  const [barcode, setBarcode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleScan = () => {
    const product = products.find(
      p => p.barcode === barcode
    )

    if (!product) {
      setError('Producto no encontrado')
      return
    }

    setError(null)
    onProductFound(product)
    setBarcode('')
  }

  return (
    <div className="barcode-scanner">
      <input
        type="text"
        placeholder="Escanea o ingresa código de barras"
        value={barcode}
        onChange={e => setBarcode(e.target.value)}
      />

      <button onClick={handleScan}>
        Agregar por código
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  )
}

export default BarcodeScanner
