import { REFRESH_TOKEN_COOKIE } from '@lang/shared';
import { NextResponse, type NextRequest } from 'next/server';

// Chặn sớm các route cần đăng nhập khi chắc chắn chưa có phiên (không có cookie
// refresh). Cookie còn nhưng hết hạn thì trang tự refresh thất bại và chuyển về
// /login; quyền theo role luôn do API kiểm tra.
export function middleware(request: NextRequest) {
  if (request.cookies.has(REFRESH_TOKEN_COOKIE)) {
    return NextResponse.next();
  }
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = `?next=${encodeURIComponent(
    request.nextUrl.pathname + request.nextUrl.search,
  )}`;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/me/:path*',
    '/admin/:path*',
    '/user-manual/:path*',
    '/t/:slug/dashboard/:path*',
    '/t/:slug/exams/:path*',
    '/t/:slug/attempts/:path*',
    '/t/:slug/lessons/:path*',
    '/t/:slug/lesson-attempts/:path*',
  ],
};
