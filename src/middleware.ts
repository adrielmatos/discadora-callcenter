import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/termos",
  "/privacidade",
  "/download-extensao"
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignora assets estáticos, mídia e rotas de API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/mockups") ||
    pathname.startsWith("/brand") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.includes(pathname);

  // Procura por token de sessão Supabase nos cookies do navegador
  const allCookies = req.cookies.getAll();
  const hasAuthToken = allCookies.some(c => 
    (c.name.startsWith("sb-") && c.name.endsWith("-auth-token") && c.value) ||
    c.name === "supabase-auth-token"
  );

  // Se for rota privada e não possuir sessão ativa nos cookies, redireciona ao login
  if (!isPublic && !hasAuthToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Se já autenticado e tentar acessar /login, redireciona ao dashboard
  if (pathname === "/login" && hasAuthToken) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.svg).*)",
  ],
};
