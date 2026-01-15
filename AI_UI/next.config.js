 
const nextConfig = {

  reactStrictMode: true,
   
   
  compiler: {
     
    removeConsole: false,
  },
   
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
   
  devIndicators: {
    buildActivity: false,
  },
   
  webpack: (config, { isServer }) => {
     
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        child_process: false,
      };
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    }


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