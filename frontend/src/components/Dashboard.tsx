import '../css/Dashboard.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
)

interface DashboardProduct {
  id: number
  name: string
  quantity: number
  totalPrice: number
  ecoScore?: number
}

interface Props {
  products: DashboardProduct[]
  budget: number
  originalTotal: number
}

const Dashboard: React.FC<Props> = ({
  products,
  originalTotal,
}) => {
  /* =========================
     Totales
  ========================= */
  const optimizedTotal = products.reduce(
    (sum, p) => sum + (Number(p.totalPrice) || 0),
    0
  )

  const ahorroReal = originalTotal - optimizedTotal

  const totalUnits = products.reduce(
    (sum, p) => sum + (p.quantity || 0),
    0
  )

  /* =========================
     Eco score promedio
  ========================= */
  const ecoAvgRaw =
    products.reduce(
      (sum, p) =>
        sum +
        (Number(p.ecoScore) || 0) *
          (p.quantity || 0),
      0
    ) / (totalUnits || 1)

  const ecoAvg = Math.min(100, Math.max(0, ecoAvgRaw))

  /* =========================
     Utils
  ========================= */
  const formatCLP = (value: number) =>
    value.toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    })

  /* =========================
     DATA CHARTS
  ========================= */

  // Gráfico barras
  const spendingData = {
    labels: ['Original', 'Optimizado'],
    datasets: [
      {
        label: 'Gasto',
        data: [originalTotal, optimizedTotal],
        backgroundColor: ['#ef4444', '#22c55e'],
      },
    ],
  }

  // Gráfico torta
  const distributionData = {
    labels: products.map(p => p.name),
    datasets: [
      {
        data: products.map(p => p.totalPrice),
        backgroundColor: [
          '#4ade80',
          '#22c55e',
          '#16a34a',
          '#15803d',
          '#166534',
        ],
      },
    ],
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="dashboard">

      {/* Tabla final */}
      <section className="table">
        <h3>Lista final optimizada</h3>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Total</th>
              <th>Eco score</th>
            </tr>
          </thead>

          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td data-label="Producto">{p.name}</td>
                <td data-label="Cantidad">x{p.quantity}</td>
                <td data-label="Total">
                  {formatCLP(p.totalPrice)}
                </td>
                <td data-label="Eco score">
                  {p.ecoScore ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {/* KPIs */}
      <section className="kpis">
        <div className="kpi">
          <span>Gasto original</span>
          <strong>{formatCLP(originalTotal)}</strong>
        </div>

        <div className="kpi">
          <span>Gasto optimizado</span>
          <strong>{formatCLP(optimizedTotal)}</strong>
        </div>

        <div className="kpi">
          <span>Ahorro real</span>
          <strong
            className={
              ahorroReal > 0 ? 'positive' : 'negative'
            }
          >
            {formatCLP(ahorroReal)}
          </strong>
        </div>

        <div className="kpi">
          <span>Eco score promedio</span>
          <strong>{ecoAvg.toFixed(1)}</strong>
        </div>
      </section>


      {/* ===== GRÁFICO BARRAS ===== */}
      <section className="chart">
        <h3>Comparación de gasto</h3>
        <Bar data={spendingData} />
      </section>

      {/* Impacto ambiental */}
      <section className="impact">
        <h3>Impacto ambiental de la compra</h3>

        {/* Barra de impacto */}
        <div className="impact-bar">
          <div
            className="impact-bar-fill"
            style={{ width: `${ecoAvg}%` }}
          />
        </div>

        <p>
          Nivel de sostenibilidad:{' '}
          <strong>
            {ecoAvg >= 70
              ? 'Alto 🌿'
              : ecoAvg >= 40
              ? 'Medio ⚖️'
              : 'Bajo ⚠️'}
          </strong>
        </p>
      </section>

      {/* ===== GRÁFICO TORTA ===== */}
      <section className="chart">
        <h3>Distribución del gasto</h3>
        <Pie data={distributionData} />
      </section>

      {/* Nota */}
      <p className="dashboard-note">
        El ahorro se calcula comparando la compra
        original con la compra optimizada, no con
        el presupuesto máximo.
      </p>
    </div>
  )
}

export default Dashboard
