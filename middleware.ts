import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user }, error } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Define protected routes
  const protectedRoutes = ['/org', '/organizations', '/dashboard']
  const authRoutes = ['/login', '/signup']

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url)
    
    // Preserve the intended destination for redirect after login
    if (pathname !== '/organizations' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated and trying to access auth routes
  if (user && isAuthRoute) {
    // Check if there's a redirect parameter
    const redirectTo = request.nextUrl.searchParams.get('redirect')
    
    if (redirectTo) {
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }
    
    // Default redirect to organizations page
    return NextResponse.redirect(new URL('/organizations', request.url))
  }

  // Redirect root path to appropriate page
  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/organizations', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect old dashboard route to organizations
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/organizations', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}