import React from 'react'
import { createRoot } from 'react-dom/client'
import SimulatorApp from './sim/SimulatorApp.jsx'
import './ui/styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SimulatorApp />
  </React.StrictMode>,
)
