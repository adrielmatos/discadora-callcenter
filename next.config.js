/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          { 
            key: 'Content-Security-Policy', 
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.googleapis.com https://api.groq.com https://api.mercadopago.com wss://*.supabase.co data: blob:; img-src 'self' data: https: blob:; frame-src 'self' https://web.whatsapp.com https://wa.me;" 
          }
        ],
      },
    ];
  },
};

module.exports = nextConfig;
