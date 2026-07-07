/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            // 'unsafe-inline' script-src is required until the legacy SPA sheds
            // inline handlers (Phase 5). Clicky origins are pre-allowed for the
            // analytics restore (Task 13); Google Fonts are the only other
            // external origins (app/layout.tsx).
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' static.getclicky.com in.getclicky.com; " +
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
              "font-src 'self' fonts.gstatic.com; " +
              "img-src 'self' data:; " +
              "media-src 'self'; " +
              "connect-src 'self' in.getclicky.com; " +
              "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
  // Disable Next.js's built-in StaticImageData transform so `import x from
  // './foo.png'` returns a URL string. Without this, Next's image loader runs
  // before our asset/resource rule, replaces the PNG bytes with a JS module
  // (`export default { src, blurDataURL, ... }`), and the resulting file
  // shipped at /_next/static/media/<hash>.png is text — every <img> on the
  // page renders as broken. The legacy components under src/Components/ use
  // `<img src={x}>` directly, so a string URL is what we want.
  images: { disableStaticImages: true },
  webpack: (config) => {
    config.module.rules.unshift({
      test: /\.(png|jpe?g|gif|svg|webp)$/i,
      type: 'asset/resource',
    });
    return config;
  },
};

module.exports = nextConfig;
