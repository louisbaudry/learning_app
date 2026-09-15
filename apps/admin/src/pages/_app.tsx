import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

// Routes that don't require a signed-in parent. `/play/*` is the
// student-facing test harness (see src/pages/play/[code].tsx) — it signs
// itself in anonymously, so the parent-auth redirect below must not fire
// for it (it would bounce the student to /login before that can happen).
function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/play/')
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session && !isPublicPath(router.pathname)) {
        router.push('/login')
      } else if (session && router.pathname === '/login') {
        router.push('/dashboard')
      }

      setIsLoading(false)
    }

    checkAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isPublicPath(router.pathname)) {
        router.push('/login')
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [router])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return <Component {...pageProps} />
}
