import { useState } from 'react'
import type { Product } from '../types/Product'
import '../css/ProductSearch.css'

type SelectedProduct = {
  id: number
  name: string
  unitPrice: number
  quantity: number
}

interface Props {
  products: Product[]
  selected: SelectedProduct[]
  onAdd: (product: Product) => void
  onRemove: (id: number) => void
  onRemoveAll: (id: number) => void
}

const ITEMS_PER_PAGE = 12

const ProductSearch: React.FC<Props> = ({
  products,
  selected,
  onAdd,
  onRemove,
  onRemoveAll,
}) => {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const start = (page - 1) * ITEMS_PER_PAGE
  const paginated = filtered.slice(start, start + ITEMS_PER_PAGE)

  const getSelected = (id: number) =>
    selected.find(p => p.id === id)

  const handleSearch = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  return (
    <div className="product-search">
      <input
        className="product-search-input"
        placeholder="Buscar producto..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
      />

      <div className="product-grid">
        {paginated.map(p => {
          const selectedItem = getSelected(p.id)

          return (
            <div key={p.id} className="product-card">
              <img
                src={p.imageUrl || '/img/placeholder.png'}
                alt={p.name}
                className="product-image"
              />

              <div className="product-info">
                <h3>{p.name}</h3>
                <p className="product-price">
                  ${p.unitPrice.toLocaleString('es-CL')}
                </p>

                {!selectedItem ? (
                  <button
                    className="product-add-btn"
                    onClick={() => onAdd(p)}
                  >
                    Agregar
                  </button>
                ) : (
                  <div className="product-qty">
                    <button
                      className="qty-btn"
                      onClick={() => onRemove(p.id)}
                    >
                      −
                    </button>

                    <span className="qty-value">
                      {selectedItem.quantity}
                    </span>

                    <button
                      className="qty-btn"
                      onClick={() => onAdd(p)}
                    >
                      +
                    </button>

                    <button
                      className="remove-all-btn"
                      onClick={() => onRemoveAll(p.id)}
                      title="Eliminar producto"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            ◀ Anterior
          </button>

          <span>
            Página {page} de {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Siguiente ▶
          </button>
        </div>
      )}
    </div>
  )
}

export default ProductSearch
