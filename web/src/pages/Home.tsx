import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Database } from '../types/database.types'

type Venue = Database['public']['Tables']['venues']['Row']

export default function Home() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchVenues() {
      try {
        setLoading(true)
        setError(null)
        const { data, error: fetchError } = await supabase
          .from('venues')
          .select('*')

        if (fetchError) {
          throw fetchError
        }

        if (isMounted && data) {
          setVenues(data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch venues')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void fetchVenues()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div>
      <header>
        <h1>Khel.com Marketplace</h1>
        <nav>
          <Link to="/partner/join">Partner Portal</Link>
        </nav>
      </header>

      <section>
        <h2>Venues Connection Test</h2>
        {loading && <p>Loading venues from database...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {!loading && !error && (
          <div>
            <p>Fetched {venues.length} venue(s) successfully.</p>
            <pre>{JSON.stringify(venues, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  )
}
