import { useState } from 'react'
import type { Product } from '../types/Product'
import '../css/ProductSearch.css'

/* =========================
   TIPOS
========================= */
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

const ITEMS_PER_PAGE = 10

const ProductSearch: React.FC<Props> = ({
  products,
  selected,
  onAdd,
  onRemove,
  onRemoveAll,
}) => {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  /* =========================
     FILTRADO
  ========================= */
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  /* =========================
     PAGINACIÓN
  ========================= */
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

      <ul className="product-list">
        {paginated.map(p => {
          const selectedItem = getSelected(p.id)

          return (
            <li key={p.id} className="product-item">
              <span className="product-name">
                {p.name}
                <span className="product-price">
                  {' '}
                  ${p.unitPrice.toLocaleString('es-CL')}
                </span>
              </span>

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
                    x{selectedItem.quantity}
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
            </li>
          )
        })}
      </ul>

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
