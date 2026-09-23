import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabaseClient'
import type { Database, Json } from '../../types/database.types'

type VenueInsert = Database['public']['Tables']['venues']['Insert']
type VenueUpdate = Database['public']['Tables']['venues']['Update']

interface VenueAmenities {
  parking: boolean
  floodlights: boolean
  indoor: boolean
  washrooms: boolean
}

const initialAmenities: VenueAmenities = {
  parking: false,
  floodlights: false,
  indoor: false,
  washrooms: false,
}

export default function MyVenue() {
  const [user, setUser] = useState<User | null>(null)
  const [venueId, setVenueId] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form Fields
  const [name, setName] = useState<string>('')
  const [slug, setSlug] = useState<string>('')
  const [slugTouched, setSlugTouched] = useState<boolean>(false)
  const [description, setDescription] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [amenities, setAmenities] = useState<VenueAmenities>(initialAmenities)

  useEffect(() => {
    let isMounted = true

    async function loadVenueData() {
      try {
        setLoading(true)
        setError(null)

        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !currentUser) {
          throw new Error(userError?.message || 'Authenticated user could not be retrieved.')
        }

        if (!isMounted) return
        setUser(currentUser)

        const { data: venue, error: venueError } = await supabase
          .from('venues')
          .select('*')
          .eq('owner_id', currentUser.id)
          .maybeSingle()

        if (venueError) {
          throw venueError
        }

        if (isMounted && venue) {
          setVenueId(venue.id)
          setName(venue.name)
          setSlug(venue.slug)
          setSlugTouched(true)
          setDescription(venue.description ?? '')
          setAddress(venue.address)

          if (venue.amenities && typeof venue.amenities === 'object' && !Array.isArray(venue.amenities)) {
            const rawAmenities = venue.amenities as Record<string, unknown>
            setAmenities({
              parking: Boolean(rawAmenities.parking),
              floodlights: Boolean(rawAmenities.floodlights),
              indoor: Boolean(rawAmenities.indoor),
              washrooms: Boolean(rawAmenities.washrooms),
            })
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load venue data.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadVenueData()

    return () => {
      isMounted = false
    }
  }, [])

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setName(val)
    if (!slugTouched && !venueId) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      )
    }
  }

  function handleSlugChange(e: ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true)
    setSlug(e.target.value)
  }

  function handleAmenityToggle(key: keyof VenueAmenities) {
    setAmenities((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!user) {
      setError('You must be authenticated to save a venue.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const amenitiesJson: Json = {
        parking: amenities.parking,
        floodlights: amenities.floodlights,
        indoor: amenities.indoor,
        washrooms: amenities.washrooms,
      }

      if (venueId) {
        // UPDATE existing venue
        const updatePayload: VenueUpdate = {
          name,
          slug,
          description: description.trim() === '' ? null : description,
          address,
          amenities: amenitiesJson,
          updated_at: new Date().toISOString(),
        }

        const { error: updateError } = await supabase
          .from('venues')
          .update(updatePayload)
          .eq('id', venueId)
          .eq('owner_id', user.id)

        if (updateError) {
          throw updateError
        }

        setSuccessMessage('Venue updated successfully!')
      } else {
        // INSERT new venue with Karachi default coordinates for PostGIS NOT NULL requirement
        const insertPayload: VenueInsert = {
          name,
          slug,
          description: description.trim() === '' ? null : description,
          address,
          amenities: amenitiesJson,
          owner_id: user.id,
          coordinates: 'POINT(67.0000 24.8600)',
        }

        const { data: newVenue, error: insertError } = await supabase
          .from('venues')
          .insert(insertPayload)
          .select('id')
          .single()

        if (insertError) {
          throw insertError
        }

        if (newVenue) {
          setVenueId(newVenue.id)
        }

        setSuccessMessage('Venue created successfully!')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error submitting venue data.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1>My Venue Settings</h1>
        <p>Loading venue details...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <h1>My Venue Settings</h1>
      <p style={{ color: '#4a5568' }}>
        Manage your venue profile, location, and on-site amenities.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            color: '#c53030',
            backgroundColor: '#fff5f5',
            padding: '0.75rem 1rem',
            borderRadius: '4px',
            border: '1px solid #feb2b2',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            color: '#276749',
            backgroundColor: '#f0fff4',
            padding: '0.75rem 1rem',
            borderRadius: '4px',
            border: '1px solid #9ae6b4',
            marginBottom: '1rem',
          }}
        >
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label htmlFor="venue-name" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Venue Name *
          </label>
          <input
            id="venue-name"
            type="text"
            required
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. Karachi Sports Arena"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label htmlFor="venue-slug" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Venue Slug (Unique URL identifier) *
          </label>
          <input
            id="venue-slug"
            type="text"
            required
            value={slug}
            onChange={handleSlugChange}
            placeholder="e.g. karachi-sports-arena"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
          <small style={{ color: '#718096' }}>URL: /venues/{slug || 'your-slug'}</small>
        </div>

        <div>
          <label htmlFor="venue-address" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Address *
          </label>
          <input
            id="venue-address"
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Block 4, Clifton, Karachi"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label htmlFor="venue-description" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Description
          </label>
          <textarea
            id="venue-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your sports facility, playing surfaces, rules, etc."
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1rem' }}>
          <legend style={{ fontWeight: 'bold', padding: '0 0.5rem' }}>Amenities</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={amenities.parking}
                onChange={() => handleAmenityToggle('parking')}
              />
              Parking
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={amenities.floodlights}
                onChange={() => handleAmenityToggle('floodlights')}
              />
              Floodlights
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={amenities.indoor}
                onChange={() => handleAmenityToggle('indoor')}
              />
              Indoor
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={amenities.washrooms}
                onChange={() => handleAmenityToggle('washrooms')}
              />
              Washrooms
            </label>
          </div>
        </fieldset>

        <div>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              fontWeight: 'bold',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : venueId ? 'Update Venue' : 'Create Venue'}
          </button>
        </div>
      </form>
    </div>
  )
}
