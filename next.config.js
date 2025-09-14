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

  // Environment variables for Supabase
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
}

module.exports = nextConfig