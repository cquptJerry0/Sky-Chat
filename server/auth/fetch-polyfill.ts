/**
 * Fetch Polyfill for Auth.js
 *
 * 解决 Next.js 16 + Auth.js beta.30 的 undici fetch 兼容性问题
 */

import nodeFetch from 'node-fetch'

// 只在服务器端且 global.fetch 有问题时使用 polyfill
if (typeof window === 'undefined') {
  // @ts-expect-error - node-fetch 类型与全局 fetch 不完全兼容
  global.fetch = nodeFetch
}

