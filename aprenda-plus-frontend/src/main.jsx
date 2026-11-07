import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './temas.css'
import './index.css'
import { aplicarTema, getTema } from './utils/tema'
import App from './App.jsx'

aplicarTema(getTema())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
