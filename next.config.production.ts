import type { NextConfig } from 'next'

/**
 * 生产环境 Next.js 配置
 * 
 * 优化项：
 * - 启用 standalone 输出（Docker 部署）
 * - 启用 Gzip 压缩
 * - 隐藏 X-Powered-By 头
 * - 优化图片加载
 */

const nextConfig: NextConfig = {
  // 输出模式：standalone 用于 Docker 部署
  output: 'standalone',
  
  // 启用 Gzip 压缩
  compress: true,
  
  // 隐藏 X-Powered-By 头（安全）
  poweredByHeader: false,
  
  // 严格模式
  reactStrictMode: true,
  
  // 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // 生产环境日志
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Webpack 配置
  webpack: (config, { isServer }) => {
    // 生产环境优化
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      }
    }
    
    return config
  },
  
  // 环境变量（公开给客户端）
  env: {
    NEXT_PUBLIC_APP_NAME: 'Sky Chat',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // 重定向规则
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },
  
  // 请求头配置
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig

