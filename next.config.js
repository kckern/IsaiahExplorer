/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CRA uses /public for static assets — Next.js does too, so no remapping needed.
  // The legacy `--openssl-legacy-provider` flag is not required for Next.js builds.
};

module.exports = nextConfig;
