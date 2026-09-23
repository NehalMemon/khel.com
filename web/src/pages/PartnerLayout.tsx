import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function PartnerLayout() {
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()

  async function handleSignOut() {
    try {
      setSigningOut(true)
      await supabase.auth.signOut()
      navigate('/partner/join')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: '220px', padding: '1rem', borderRight: '1px solid #ccc' }}>
        <h2>Partner Portal</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link to="/partner">My Venue</Link>
          <Link to="/partner/courts">Courts</Link>
          <Link to="/partner/schedule">Schedule</Link>
          <Link to="/partner/bookings">Bookings</Link>
        </nav>
        <hr style={{ margin: '1.5rem 0' }} />
        <div>
          <button type="button" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: '1rem' }}>
        <Outlet />
      </main>
    </div>
  )
}
