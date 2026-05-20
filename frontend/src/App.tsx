import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import SessionPage from './pages/SessionPage'
import BlocklistPage from './pages/BlocklistPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/session" replace />} />
          <Route path="session" element={<SessionPage />} />
          <Route path="blocklist" element={<BlocklistPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
