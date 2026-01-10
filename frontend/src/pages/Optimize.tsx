import { useEffect, useState } from 'react'
import type { Product } from '../types/Product'
import { fetchProducts } from '../data/products'
import ProductSearch from '../components/ProductSearch'
import Dashboard from '../components/Dashboard'
import '../css/Optimize.css'
import FinalShoppingList from '../components/FinalShoppingList'
import BarcodeCameraScanner from '../components/BarcodeCameraScanner'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

type SelectedProduct = {
  id: number
  name: string
  unitPrice: number
  quantity: number
}

type OptimizedProduct = {
  id: number
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  ecoScore?: number
  socialScore?: number
  imageUrl?: string
}


type Substitution = {
  fromId: number
  fromName: string
  toProduct: OptimizedProduct
  reason: string
}

const Optimize: React.FC = () => {
  const [budgetDraft, setBudgetDraft] = useState('')
  const [budget, setBudget] = useState<number | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<SelectedProduct[]>([])

  const [result, setResult] = useState<OptimizedProduct[]>([])
  const [originalTotal, setOriginalTotal] = useState(0)
  const [substitutions, setSubstitutions] = useState<Substitution[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [budgetConfirmed, setBudgetConfirmed] = useState(false)
  const [originalList, setOriginalList] = useState<SelectedProduct[]>([])

  const [barcode, setBarcode] = useState('')
  const [barcodeError, setBarcodeError] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)


  const resetOptimization = () => {
    setResult([])
    setSubstitutions([])
    setOriginalList([])
    setOriginalTotal(0)
  }


  const hasResult = result.length > 0

  /* =========================
     Cargar productos
  ========================= */
  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => setError('Error cargando productos'))
      .finally(() => setLoading(false))
  }, [])

  /* =========================
     Cantidades
  ========================= */
  const addProduct = (product: Product) => {
    const existing = selected.find(p => p.id === product.id)

    if (existing) {
      setSelected(
        selected.map(p =>
          p.id === product.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      )
    } else {
      setSelected([
        ...selected,
        {
          id: product.id,
          name: product.name,
          unitPrice: product.unitPrice,
          quantity: 1,
        },
      ])
    }
  }

  const removeProduct = (id: number) => {
    setSelected(
      selected
        .map(p =>
          p.id === id ? { ...p, quantity: p.quantity - 1 } : p
        )
        .filter(p => p.quantity > 0)
    )
  }

  const removeAllProduct = (id: number) => {
    setSelected(selected.filter(p => p.id !== id))
  }


  const searchByBarcode = async () => {
    if (!barcode) return

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/products/barcode/${barcode}`
      )

      if (!res.ok) {
        setBarcodeError('Producto no encontrado')
        return
      }

      const p = await res.json()

      const product: Product = {
        id: p.id,
        name: p.name,
        unitPrice: p.price,
        ecoScore: p.eco_score,
        socialScore: p.social_score,
        category: p.category,
        barcode: p.barcode,
        imageUrl: p.image_url,
      }

      addProduct(product)
      setBarcode('')
      setBarcodeError(null)
    } catch {
      setBarcodeError('Error buscando producto')
    }
  }

  /* =========================
     OPTIMIZACIÓN
  ========================= */
  const optimize = async (overrideSelected?: SelectedProduct[]) => {
    if (!budget) {
      alert('Confirma un presupuesto')
      return
    }

    setOriginalList(overrideSelected || selected)

    const itemsToSend = (overrideSelected || selected).map(p => ({
      id: p.id,
      quantity: p.quantity,
    }))

    try {
      const res = await fetch(`${BACKEND_URL}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget,
          items: itemsToSend,
        }),
      })

      if (!res.ok) throw new Error('Error optimizando')

      const data = await res.json()

      const normalized: OptimizedProduct[] = data.optimized.map(
        (p: any) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          unitPrice: p.price,
          totalPrice: p.price * p.quantity,
          ecoScore: p.eco_score,
          socialScore: p.social_score,
          imageUrl: p.image_url,
        })
      )


      setResult(normalized)
      setOriginalTotal(data.originalTotal)

      const normalizedSubstitutions: Substitution[] =
        (data.substitutions || []).map((s: any) => ({
          fromId: s.fromId,
          fromName: s.fromName,
          reason: s.reason,
          toProduct: {
            id: s.toProduct.id,
            name: s.toProduct.name,
            quantity: s.quantity ?? 1,
            unitPrice: s.toProduct.price,
            totalPrice:
              s.toProduct.price * (s.quantity ?? 1),
            ecoScore: s.toProduct.eco_score,
            socialScore: s.toProduct.social_score,
            imageUrl: s.toProduct.image_url,
          },

        }))

      setSubstitutions(normalizedSubstitutions)
    } catch (err) {
      console.error(err)
      alert('Error al optimizar la compra')
    }
  }
 const acceptSubstitution = (s: Substitution) => {
    const updatedResult: OptimizedProduct[] = result.map(p =>
      p.id === s.fromId
        ? {
            ...s.toProduct,
            quantity: p.quantity,
            totalPrice: s.toProduct.unitPrice * p.quantity,
          }
        : p
    )

    const newTotal = updatedResult.reduce(
      (sum, p) => sum + p.totalPrice,
      0
    )

    if (budget !== null && newTotal > budget) {
      alert('Esta sustitución supera el presupuesto disponible.')
      return
    }

    // 🔄 actualizar selected ANTES de optimizar
    const updatedSelected: SelectedProduct[] = updatedResult.map(p => ({
      id: p.id,
      name: p.name,
      unitPrice: p.unitPrice,
      quantity: p.quantity,
    }))

    setSelected(updatedSelected)
    setResult(updatedResult)

    //RE-OPTIMIZAR automáticamente
    optimize(updatedSelected)
  }




  /* =========================
     Presupuesto
  ========================= */
  const confirmBudget = () => {
    const value = Number(budgetDraft)

    if (!value || value <= 0) {
      alert('Ingresa un presupuesto válido')
      return
    }

    setBudget(Math.round(value))
    setBudgetConfirmed(true)
    resetOptimization()
  }


  /* =========================
     UI
  ========================= */
  return (
    <main className="optimize">
      <div className="optimize-container">
        <header className="optimize-header">
          <h1>Optimizar compra</h1>
          <p>Optimización multi-objetivo de impacto sostenible</p>
        </header>

        <section className="card">
          <h2>1️⃣ Presupuesto</h2>

         <input
            type="number"
            placeholder="Ej: 3000"
            value={budgetDraft}
            onChange={e => {
              setBudgetDraft(e.target.value)
              setBudgetConfirmed(false)
              resetOptimization()
            }}
          />


          <button
            className="confirm-budget-btn"
            onClick={confirmBudget}
          >
            Confirmar presupuesto
          </button>

          {budgetConfirmed && (
            <p>
              Presupuesto confirmado:{' '}
              <strong>${budget}</strong>
            </p>
          )}
        </section>

        <section className="card">
          <h2>2️⃣ Seleccionar productos</h2>

         <div className="barcode-section">
            <label className="barcode-label">
              📦 Escanear producto
            </label>

            <div className="barcode-input-row">
              <input
                type="text"
                placeholder="Código de barras"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') searchByBarcode()
                }}
              />

              <button onClick={searchByBarcode}>➕</button>

              <button
                className="camera-btn"
                onClick={() => setShowScanner(true)}
                title="Abrir cámara"
              >
                📷
              </button>
            </div>

            {barcodeError && (
              <p className="barcode-error">{barcodeError}</p>
            )}
          </div>



          {!loading && !error && (
            <ProductSearch
              products={products}
              selected={selected}
              onAdd={addProduct}
              onRemove={removeProduct}
              onRemoveAll={removeAllProduct}
            />
          )}
        </section>

        {originalList.length > 0 && (
          <section className="card">
            <h2>Lista original</h2>

            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {originalList.map(p => {
                  const stillPresent = result.some(
                    r => r.id === p.id
                  )

                  return (
                    <tr
                      key={p.id}
                      style={{
                        opacity: stillPresent ? 1 : 0.5,
                      }}
                    >
                      <td data-label="Producto">{p.name}</td>
                      <td data-label="Cantidad">x{p.quantity}</td>
                      <td data-label="Precio unitario">{p.unitPrice}</td>
                      <td data-label="Total">
                        {(p.unitPrice * p.quantity).toLocaleString('es-CL')}
                      </td>
                      <td data-label="Estado">
                        {stillPresent ? '✔️ Optimizado' : '❌ Eliminado'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        <button
          className="optimize-btn"
          onClick={() => optimize()}
          disabled={
            !budgetConfirmed ||
            selected.length === 0
          }
        >
          Optimizar compra sostenible
        </button>

        {hasResult && (
          <section className="card">
            <h2>3️⃣ Dashboard de impacto</h2>
            <Dashboard
              products={result}
              budget={budget!}
              originalTotal={originalTotal}
            />
          </section>
        )}
      </div>

      {hasResult && (
        <FinalShoppingList
          products={result.map(p => ({
            id: p.id,
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            totalPrice: p.totalPrice,
          }))}
        />
      )}

      {hasResult && substitutions.length > 0 && (
        <section className="card">
          <h2>🔁 Sugerencias de sustitución</h2>

          {substitutions.map((s, i) => (
            <div key={i} className="sub-card">
              <div className="sub-product">
                <img
                  src={s.toProduct.imageUrl || '/img/placeholder.png'}
                  alt={s.toProduct.name}
                  className="sub-image"
                />

                <div className="sub-info">
                  <p>
                    Reemplazar <strong>{s.fromName}</strong> por{' '}
                    <strong>{s.toProduct.name}</strong>
                  </p>
                  <p className="sub-reason">{s.reason}</p>

                  <button
                    className="accept-sub-btn"
                    onClick={() => acceptSubstitution(s)}
                  >
                    Aceptar sustitución
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {hasResult && originalList.length > 0 && (
        <details className="card">
          <summary>Ver lista original</summary>

          <table>
            <tbody>
              {originalList.map(p => (
                <tr key={p.id}>
                  <td data-label="Producto">{p.name}</td>
                  <td data-label="Cantidad">x{p.quantity}</td>
                  <td data-label="Precio unitario">{p.unitPrice}</td>
                  <td data-label="Total">
                    {(p.unitPrice * p.quantity).toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {showScanner && (
        <BarcodeCameraScanner
          onDetected={code => {
            setBarcode(code)
            searchByBarcode()
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
  
    </main>
  )
}

export default Optimize
