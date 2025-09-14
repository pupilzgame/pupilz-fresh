/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Enable API routes
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },

  // Ensure proper handling of static files
  trailingSlash: false,

  // Environment variables for KV
  env: {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  },
}

module.exports = nextConfig