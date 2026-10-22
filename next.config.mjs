/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/pos',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
