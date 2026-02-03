/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rgmauuzwzsoaytsulgwg.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
};

module.exports = nextConfig;
