/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  async redirects() {
    return [
      { source: '/esteira', destination: '/leads', permanent: false },
      { source: '/automacoes', destination: '/campanhas', permanent: false },
      { source: '/sofia', destination: '/conversas', permanent: false },
      { source: '/ajuda', destination: '/download-extensao', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { 
            key: 'Content-Security-Policy', 
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://*.supabase.co https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://api.groq.com https://api.mercadopago.com; media-src 'self' blob:; frame-src 'self' https://web.whatsapp.com https://wa.me; object-src 'none'; base-uri 'self'; form-action 'self';" 
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig;
