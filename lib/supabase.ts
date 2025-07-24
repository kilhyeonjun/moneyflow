import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        // 토큰 갱신 실패 시 자동 로그아웃
        onAuthStateChange: (event, session) => {
          if (event === 'TOKEN_REFRESHED' && !session) {
            // 토큰 갱신 실패 시 로그아웃 처리
            console.warn('토큰 갱신 실패, 자동 로그아웃 처리')
            if (typeof window !== 'undefined') {
              localStorage.removeItem('selectedOrganization')
              window.location.href = '/login'
            }
          }
        }
      }
    }
  )
}

export const supabase = createClient()
