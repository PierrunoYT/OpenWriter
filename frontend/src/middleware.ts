import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only apply middleware to /api/proxy routes
  if (pathname.startsWith('/api/proxy/')) {
    const backendUrl = 'http://localhost:3001';
    const targetPath = pathname.replace('/api/proxy', '/api');
    const url = new URL(targetPath, backendUrl);
    
    // Forward the search params
    const searchParams = request.nextUrl.searchParams;
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    
    // Return rewrite to backend
    return NextResponse.rewrite(url);
  }
  
  // Continue for all other routes
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/api/proxy/:path*',
};