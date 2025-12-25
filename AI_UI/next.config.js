/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TEMPORARILY ENABLED FOR DEBUGGING - to be reverted
  // Remove ALL console output in production (completely clean console)
  compiler: {
    // removeConsole: process.env.NODE_ENV === 'production',
    removeConsole: false,
  },
  // Disable Vercel deployment badge/logo (the "N" circle)
  images: {
    disableStaticImages: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // This ensures the Vercel logo is not displayed and disables the loading indicator
  devIndicators: {
    buildActivity: false,
  },
  // Webpack configuration for Transformers.js (Whisper)
  webpack: (config, { isServer }) => {
    // Externalize onnxruntime-node (Node.js only) - we use onnxruntime-web in browser
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push('onnxruntime-node');
    }
    // Handle .node files
    config.resolve.extensions.push('.node');
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader'
    });
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ];
  },
}

module.exports = nextConfig