import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(15, 15, 30, 0.95)',
            color: '#e2e8f0',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#0f0f1e' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#0f0f1e' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
