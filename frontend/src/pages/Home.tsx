import { Link } from 'react-router-dom'
import '../css/Home.css'

const Home: React.FC = () => {
  return (
    <main className="home">
      {/* Hero */}
      <section className="hero">
        <h1>LiquiVerde</h1>
        <p>
          Plataforma inteligente de retail que te ayuda a ahorrar dinero mientras
          tomas decisiones de compra más sostenibles.
        </p>
        <Link to="/optimize" className="cta">
          Optimizar mi compra
        </Link>
      </section>

      {/* Features */}
      <section className="features">
        <div className="card">
          <h3>💰 Ahorro</h3>
          <p>
            Compara productos y optimiza tu lista de compras según tu presupuesto.
          </p>
        </div>

        <div className="card">
          <h3>🌱 Sostenibilidad</h3>
          <p>
            Evalúa el impacto ambiental y social de los productos que consumes.
          </p>
        </div>

        <div className="card">
          <h3>🧠 Decisiones Inteligentes</h3>
          <p>
            Algoritmos de optimización que equilibran precio y sostenibilidad.
          </p>
        </div>
      </section>
    </main>
  )
}

export default Home
