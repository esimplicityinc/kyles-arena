import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Analytics from './pages/Analytics.jsx'
import Favorites from './pages/Favorites.jsx'
import Sources from './pages/Sources.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/sources" element={<Sources />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
