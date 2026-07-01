import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow auth pages without authentication
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.next()
  }

  // Check if user is authenticated by looking for session cookie
  const session = request.cookies.get('sb-auth-token')

  if (!session) {
    // Redirect to login if not authenticated
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
