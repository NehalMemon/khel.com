import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface ProtectedRouteProps {
  children?: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          throw error
        }
        if (isMounted) {
          setSession(data.session)
        }
      } catch (err) {
        console.error('Session verification error:', err)
        if (isMounted) {
          setSession(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <div>Verifying session...</div>
  }

  if (!session) {
    return <Navigate to="/partner/join" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
