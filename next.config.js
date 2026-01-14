/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['mupdf', 'canvas'],
  },
}

module.exports = nextConfig
