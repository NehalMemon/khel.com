import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function PartnerJoin() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) {
          throw signUpError
        }

        // If email confirmation is enabled on Supabase, notify the user; otherwise navigate to dashboard
        if (data.session) {
          navigate('/partner')
        } else if (data.user) {
          setMessage('Account created! Please check your email to confirm your account or sign in.')
        } else {
          navigate('/partner')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          throw signInError
        }

        navigate('/partner')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <p>
          <Link to="/">← Back to Marketplace</Link>
        </p>
        <h1>Partner with Khel.com</h1>
        <p style={{ fontSize: '1.1rem', color: '#4a5568' }}>
          List your venue today on Khel.com and manage your bookings effortlessly.
        </p>
        <ul>
          <li>Showcase your courts to thousands of players in Karachi</li>
          <li>Real-time booking management & slot scheduling</li>
          <li>Direct payouts with full booking transparency</li>
        </ul>
      </header>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem' }}>
        <h2>{isSignUp ? 'Create Partner Account' : 'Sign In to Partner Portal'}</h2>

        {error && (
          <div role="alert" style={{ color: '#c53030', backgroundColor: '#fff5f5', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {message && (
          <div role="status" style={{ color: '#2b6cb0', backgroundColor: '#ebf8ff', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem' }}>
              Email Address:
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '0.25rem' }}>
              Password:
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.75rem', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up as Partner' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <p>
            {isSignUp ? 'Already have a partner account?' : "Don't have a partner account yet?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setMessage(null)
              }}
              style={{ background: 'none', border: 'none', color: '#2b6cb0', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              {isSignUp ? 'Sign In here' : 'Sign Up here'}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
