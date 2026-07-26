import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get('session_token');
    const { pathname } = request.nextUrl;

    const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
    const isProtectedRoute = pathname.startsWith('/chats') || pathname.startsWith('/settings');

    if (!sessionCookie && isProtectedRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (sessionCookie && isAuthRoute) {
        return NextResponse.redirect(new URL('/chats', request.url));
    }

    if (pathname === '/') {
        if (sessionCookie) {
            return NextResponse.redirect(new URL('/chats', request.url));
        } else {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/login', '/register', '/chats/:path*', '/settings/:path*'],
};
