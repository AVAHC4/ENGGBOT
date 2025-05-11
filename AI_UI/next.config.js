/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable Vercel deployment badge/logo (the "N" circle)
  images: {
    disableStaticImages: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // This ensures the Vercel logo is not displayed and disables the loading indicator
  devIndicators: false,
}

module.exports = nextConfig 