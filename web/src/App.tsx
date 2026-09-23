import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import PartnerJoin from './pages/PartnerJoin'
import PartnerLayout from './pages/PartnerLayout'
import ProtectedRoute from './components/ProtectedRoute'
import MyVenue from './pages/partner/MyVenue'
import Courts from './pages/partner/Courts'
import Schedule from './pages/partner/Schedule'
import Bookings from './pages/partner/Bookings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/partner/join" element={<PartnerJoin />} />
        <Route
          path="/partner"
          element={
            <ProtectedRoute>
              <PartnerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MyVenue />} />
          <Route path="courts" element={<Courts />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="bookings" element={<Bookings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
