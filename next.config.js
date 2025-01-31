/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      }
    ],
    domains: [
      'localhost', // 개발 환경 허용
      'vegavery.com' // 실제 도메인
    ],
  }
}

module.exports = nextConfig 