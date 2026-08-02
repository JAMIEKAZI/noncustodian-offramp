/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress Turbopack config warning
  turbopack: {},
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      '@x402/core': false,
      '@x402/evm': false,
      '@x402/svm': false,
    };
    return config;
  },
};

export default nextConfig;