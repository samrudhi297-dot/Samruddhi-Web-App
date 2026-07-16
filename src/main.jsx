import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './legacyVendor.js'
import App from './App.jsx'
import './index.css'
import './legacy-fixes.css'
import './premium-ui.css'
import './premium-ui-phase2.css'
import './premium-ui-phase3.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
