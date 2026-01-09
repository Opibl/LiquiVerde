import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Optimize from './pages/Optimize'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/optimize" element={<Optimize />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
