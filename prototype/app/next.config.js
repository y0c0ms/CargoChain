/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    // snarkjs needs these fallbacks in the browser bundle
    config.resolve.fallback = { fs: false, path: false, crypto: false };
    return config;
  },
};
