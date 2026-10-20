/** @type {import('next').NextConfig} */
const nextConfig = {
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
