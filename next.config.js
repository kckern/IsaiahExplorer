/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
