import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = ["/sign-in"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Not signed in → bounce to sign-in (except on public paths).
  if (!session && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Already signed in but on the sign-in page → send to dashboard.
  if (session && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next internals, the auth API, and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
