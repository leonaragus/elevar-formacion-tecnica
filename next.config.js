/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse", "pdfjs-dist"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
