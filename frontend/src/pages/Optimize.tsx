import { useEffect, useState } from 'react'
import type { Product } from '../types/Product'
import { fetchProducts } from '../data/products'
import ProductSearch from '../components/ProductSearch'
import Dashboard from '../components/Dashboard'
import '../css/Optimize.css'
import FinalShoppingList from '../components/FinalShoppingList'


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
          unitPrice: product.unitPrice, // ✅ CLAVE
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

  

  /* =========================
     OPTIMIZACIÓN (BACKEND)
  ========================= */
  const optimize = async (overrideSelected?: SelectedProduct[]) => {
    if (!budget) {
      alert('Confirma un presupuesto')
      return
    }


    // guardar snapshot de la lista original
    
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
          unitPrice: p.price,                 // precio unitario
          totalPrice: p.price * p.quantity,   // total por producto
          ecoScore: p.eco_score,
          socialScore: p.social_score,
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
              quantity: s.quantity ?? 1, // o la que corresponda
              unitPrice: s.toProduct.price,
              totalPrice:
                s.toProduct.price *
                (s.quantity ?? 1),
              ecoScore: s.toProduct.eco_score,
              socialScore: s.toProduct.social_score,
            },
          }))

        setSubstitutions(normalizedSubstitutions)

    } catch (err) {
      console.error(err)
      alert('Error al optimizar la compra')
    }
  }

  /* =========================
     ACEPTAR SUSTITUCIÓN (OPCIÓN B)
  ========================= */
  const acceptSubstitution = (s: Substitution) => {
    const updatedSelected: SelectedProduct[] = selected.map(p =>
      p.id === s.fromId
        ? {
            id: s.toProduct.id,
            name: s.toProduct.name,
            unitPrice: s.toProduct.unitPrice,
            quantity: p.quantity, // se conserva cantidad
            totalPrice: s.toProduct.unitPrice * p.quantity,
          }
        : p
    )

    const newTotal = updatedSelected.reduce(
      (sum, p) => sum + p.unitPrice * p.quantity,
      0
    )

    if (budget !== null && newTotal > budget) {
      alert('Esta sustitución supera el presupuesto disponible.')
      return
    }

    setSelected(updatedSelected)
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
                      <td>{p.name}</td>
                      <td>x{p.quantity}</td>
                      <td>{p.unitPrice}</td>
                      <td>
                        {(p.unitPrice * p.quantity).toLocaleString('es-CL')}
                      </td>

                      <td>
                        {stillPresent ? (
                          '✔️ Optimizado'
                        ) : (
                          '❌ Eliminado'
                        )}
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
          disabled={!budget || selected.length === 0}
        >
          Optimizar compra sostenible
        </button>

        {result.length > 0 && budget !== null && (
          <section className="card">
            <h2>3️⃣ Dashboard de impacto</h2>
            <Dashboard
              products={result}
              budget={budget}
              originalTotal={originalTotal}
            />
          </section>
        )}
      </div>

      {result.length > 0 && (
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

      {substitutions.length > 0 && (
        <section className="card">
          <h2>🔁 Sugerencias de sustitución</h2>

          {substitutions.map((s, i) => (
            <div key={i} className="sub-card">
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
          ))}
        </section>
      )}
    </main>
  )
}

export default Optimize
