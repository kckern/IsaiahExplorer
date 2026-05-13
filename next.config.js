/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CRA uses /public for static assets — Next.js does too, so no remapping needed.
  // The legacy `--openssl-legacy-provider` flag is not required for Next.js builds.
  webpack: (config) => {
    // Make `import x from './foo.png'` return a URL string (CRA-compatible)
    // instead of Next.js's default StaticImageData object. The legacy components
    // under src/Components/ use `<img src={x}>` directly — adapting the loader
    // here is one line; rewriting every import would be a dozen file edits and
    // leave a permanent `.src` pattern that disappears the moment CRA is gone.
    config.module.rules.unshift({
      test: /\.(png|jpe?g|gif|svg|webp)$/i,
      type: 'asset/resource',
    });
    return config;
  },
};

module.exports = nextConfig;
