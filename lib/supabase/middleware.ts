import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ACTIVATION_ROUTE, isPlanRestricted } from '@/lib/plan'

type CookieMethods = NonNullable<NonNullable<Parameters<typeof createServerClient>[2]>['cookies']>
type CookieToSet = Parameters<NonNullable<CookieMethods['setAll']>>[0][number]

const PROTECTED_ROUTE_PREFIXES = ['/dashboard', '/evaluacion'] as const

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isActivationRoute(pathname: string) {
  return pathname === ACTIVATION_ROUTE || pathname.startsWith(`${ACTIVATION_ROUTE}/`)
}

function redirectWithCookies(url: URL, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(url)

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value)
  })

  return redirectResponse
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if Supabase environment variables are configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.log('[v0] Supabase environment variables not configured')
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const requiresAuth = isProtectedRoute(pathname)

  if (requiresAuth && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return redirectWithCookies(url, supabaseResponse)
  }

  if (!user || !requiresAuth) {
    return supabaseResponse
  }

  const { data: profile, error: profileError } = await supabase
    .from('perfiles')
    .select('estado, plan_tipo, plan_fin')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return supabaseResponse
  }

  const restricted = isPlanRestricted(profile)

  if (restricted && !isActivationRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = ACTIVATION_ROUTE
    url.search = ''
    return redirectWithCookies(url, supabaseResponse)
  }

  if (!restricted && isActivationRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return redirectWithCookies(url, supabaseResponse)
  }

  return supabaseResponse
}
