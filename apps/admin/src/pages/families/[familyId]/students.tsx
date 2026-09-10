import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { generateDeviceLinkCode } from '@/lib/codeGenerator'

interface Student {
  id: string
  first_name: string
  birth_date: string | null
  language: string
  learner_notes: string | null
}

interface GeneratedCode {
  student_id: string
  code: string
  expires_at: string
}

export default function StudentsPage() {
  const router = useRouter()
  const { familyId } = router.query
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingCode, setGeneratingCode] = useState<string | null>(null)
  const [generatedCodes, setGeneratedCodes] = useState<Map<string, GeneratedCode>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [showNewStudentForm, setShowNewStudentForm] = useState(false)
  const [newStudentForm, setNewStudentForm] = useState({
    first_name: '',
    birth_date: '',
    language: 'fr',
    learner_notes: '',
  })

  useEffect(() => {
    if (!familyId) return

    const fetchStudents = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        // Fetch students for this family
        const { data, error } = await supabase
          .from('students')
          .select('id, first_name, birth_date, language, learner_notes')
          .eq('family_id', familyId as string)
          .order('first_name')

        if (error) {
          setError(`Failed to load students: ${error.message}`)
        } else {
          setStudents(data || [])
        }
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [familyId, router])

  const handleGenerateCode = async (studentId: string) => {
    setGeneratingCode(studentId)
    setError(null)

    try {
      const code = generateDeviceLinkCode()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        setGeneratingCode(null)
        return
      }

      // Insert the device link code
      const { data, error } = await supabase
        .from('device_link_codes')
        .insert({
          student_id: studentId,
          code: code,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        setError(`Failed to generate code: ${error.message}`)
      } else {
        // Store generated code for display
        const newMap = new Map(generatedCodes)
        newMap.set(studentId, {
          student_id: studentId,
          code: code,
          expires_at: data.expires_at,
        })
        setGeneratedCodes(newMap)
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setGeneratingCode(null)
    }
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        return
      }

      const { data, error } = await supabase
        .from('students')
        .insert({
          family_id: familyId as string,
          first_name: newStudentForm.first_name,
          birth_date: newStudentForm.birth_date || null,
          language: newStudentForm.language,
          learner_notes: newStudentForm.learner_notes || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        setError(`Failed to create student: ${error.message}`)
      } else {
        setStudents([...students, data])
        setNewStudentForm({
          first_name: '',
          birth_date: '',
          language: 'fr',
          learner_notes: '',
        })
        setShowNewStudentForm(false)
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (!familyId) return <div>Loading...</div>

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading students...</div>
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => router.back()} style={{ marginRight: '1rem' }}>
          ← Back
        </button>
        <h1>Students</h1>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #f99',
            borderRadius: '4px',
            color: '#c00',
          }}
        >
          {error}
        </div>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Your Students ({students.length})</h2>
          <button
            onClick={() => setShowNewStudentForm(!showNewStudentForm)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {showNewStudentForm ? '✕ Cancel' : '+ Add Student'}
          </button>
        </div>

        {showNewStudentForm && (
          <form
            onSubmit={handleAddStudent}
            style={{
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                First Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={newStudentForm.first_name}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, first_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Birth Date</label>
              <input
                type="date"
                value={newStudentForm.birth_date}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, birth_date: e.target.value })}
                style={{
                  padding: '0.5rem',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Language</label>
              <select
                value={newStudentForm.language}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, language: e.target.value })}
                style={{
                  padding: '0.5rem',
                  fontSize: '1rem',
                }}
              >
                <option value="fr">French (Français)</option>
                <option value="en">English</option>
                <option value="es">Spanish (Español)</option>
                <option value="uk">Ukrainian (Українська)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Learner Notes</label>
              <textarea
                value={newStudentForm.learner_notes}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, learner_notes: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  minHeight: '100px',
                  boxSizing: 'border-box',
                  fontFamily: 'sans-serif',
                }}
                placeholder="e.g., Likes math, learns well with visual aids"
              />
            </div>

            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '0.5rem',
              }}
            >
              Create Student
            </button>
          </form>
        )}

        {students.length === 0 ? (
          <p>No students yet. Add one to get started!</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {students.map((student) => {
              const generatedCode = generatedCodes.get(student.id)
              return (
                <div
                  key={student.id}
                  style={{
                    padding: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div style={{ marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{student.first_name}</h3>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#666' }}>
                      {student.birth_date ? `Born: ${new Date(student.birth_date).toLocaleDateString()}` : 'No birth date'}
                    </p>
                    <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', color: '#666' }}>
                      Language: {student.language.toUpperCase()}
                    </p>
                    {student.learner_notes && (
                      <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', fontStyle: 'italic', color: '#555' }}>
                        "{student.learner_notes}"
                      </p>
                    )}
                  </div>

                  {generatedCode ? (
                    <div
                      style={{
                        padding: '1rem',
                        backgroundColor: '#e8f5e9',
                        border: '2px solid #4caf50',
                        borderRadius: '4px',
                        marginTop: '1rem',
                      }}
                    >
                      <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#2e7d32' }}>
                        Device Link Code (valid 48 hours)
                      </p>
                      <p
                        style={{
                          margin: '0',
                          fontSize: '1.5rem',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          color: '#1b5e20',
                          letterSpacing: '2px',
                        }}
                      >
                        {generatedCode.code}
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#558b2f' }}>
                        Expires: {new Date(generatedCode.expires_at).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateCode(student.id)}
                      disabled={generatingCode === student.id}
                      style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: generatingCode === student.id ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: generatingCode === student.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {generatingCode === student.id ? 'Generating...' : '🔗 Generate Link Code'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
