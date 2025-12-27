/**
 * 地区检测服务
 * 
 * 使用 ip-api.com 免费服务检测 IP 地区
 */

/** 允许使用生图功能的国家代码 */
const ALLOWED_COUNTRIES = ['CN']

/**
 * 从请求头获取客户端 IP
 */
export function getClientIP(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  return null
}

/**
 * 检测 IP 所在国家
 */
export async function getCountryCode(ip: string | null): Promise<string | null> {
  // 测试模式
  if (process.env.GEO_TEST_MODE === 'block') {
    return 'HK'
  }
  
  // 本地 IP
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return 'CN'
  }
  
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(3000),
    })
    const data = await res.json()
    return data.countryCode || null
  } catch {
    return null
  }
}

/**
 * 检测是否在中国大陆
 */
export function isAllowedCountry(countryCode: string | null): boolean {
  if (!countryCode) return true // 检测失败默认允许
  return ALLOWED_COUNTRIES.includes(countryCode)
}
