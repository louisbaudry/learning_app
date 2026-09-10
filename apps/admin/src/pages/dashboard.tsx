import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  full_name: string
  language: string
}

interface Family {
  id: string
  name: string
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // Get profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
        }

        // Get families (via family_members)
        const { data: familiesData } = await supabase
          .from('families')
          .select('*')
          .in(
            'id',
            (
              await supabase
                .from('family_members')
                .select('family_id')
                .eq('profile_id', user.id)
            ).data?.map((fm) => fm.family_id) || []
          )

        if (familiesData) {
          setFamilies(familiesData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {profile && (
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
          <h2>Welcome, {profile.full_name || profile.id}!</h2>
          <p>Language: {profile.language}</p>
        </div>
      )}

      <section>
        <h2>Your Families</h2>
        {families.length === 0 ? (
          <p>No families yet. Create one to get started!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {families.map((family) => (
              <li
                key={family.id}
                style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fafafa',
                }}
              >
                <strong style={{ fontSize: '1.1rem' }}>{family.name}</strong>
                <br />
                <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>{family.id}</small>
                <div style={{ marginTop: '0.75rem' }}>
                  <a
                    href={`/families/${family.id}/students`}
                    style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#007bff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      marginRight: '0.5rem',
                    }}
                  >
                    Manage Students
                  </a>
                  <button style={{ marginLeft: '0.5rem' }}>Edit Family</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button style={{ marginTop: '1rem' }}>+ Create Family</button>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Quick Links</h2>
        <ul>
          <li>
            <a href="#students">Manage Students</a>
          </li>
          <li>
            <a href="#content">Create Content</a>
          </li>
          <li>
            <a href="#assignments">Manage Assignments</a>
          </li>
          <li>
            <a href="#progress">View Progress</a>
          </li>
        </ul>
      </section>
    </div>
  )
}
