import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './temas.css'
import './index.css'
import { aplicarTema, getTema } from './utils/tema'
import { aplicarAcessibilidade } from './utils/acessibilidade'
import App from './App.jsx'

aplicarTema(getTema())
aplicarAcessibilidade()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
