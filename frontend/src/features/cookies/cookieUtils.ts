/**
 * Cookie utility functions for managing cookie consent
 * Best practices: secure, sameSite, httpOnly (for server-side cookies)
 */

export interface CookieConsent {
  version: number
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
  timestamp: string
}

const COOKIE_NAME = 'cookie_consent'
const COOKIE_EXPIRY_DAYS = 365 // 12 months

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  
  return null
}

/**
 * Set a cookie with best-practice security attributes
 */
function setCookie(
  name: string,
  value: string,
  days: number = COOKIE_EXPIRY_DAYS,
  options: {
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  } = {}
): void {
  if (typeof document === 'undefined') return

  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

  const secure = options.secure ?? (window.location.protocol === 'https:')
  const sameSite = options.sameSite ?? 'Lax'

  let cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=${sameSite}`
  
  if (secure) {
    cookieString += '; Secure'
  }

  document.cookie = cookieString
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return
  
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

/**
 * Read cookie consent from cookie
 */
export function readCookieConsent(): CookieConsent | null {
  try {
    const cookieValue = getCookie(COOKIE_NAME)
    if (!cookieValue) return null

    const parsed = JSON.parse(decodeURIComponent(cookieValue)) as CookieConsent
    
    // Validate structure
    if (
      typeof parsed.version === 'number' &&
      typeof parsed.necessary === 'boolean' &&
      typeof parsed.functional === 'boolean' &&
      typeof parsed.analytics === 'boolean' &&
      typeof parsed.marketing === 'boolean' &&
      typeof parsed.timestamp === 'string'
    ) {
      return parsed
    }
  } catch (error) {
    console.warn('Failed to parse cookie consent:', error)
  }

  return null
}

/**
 * Save cookie consent to cookie
 */
export function saveCookieConsent(consent: Omit<CookieConsent, 'timestamp' | 'version'>): void {
  const consentData: CookieConsent = {
    ...consent,
    version: 1,
    timestamp: new Date().toISOString(),
  }

  setCookie(COOKIE_NAME, JSON.stringify(consentData), COOKIE_EXPIRY_DAYS, {
    secure: true,
    sameSite: 'Lax',
  })
}

/**
 * Check if consent is expired (older than 12 months)
 */
export function isConsentExpired(consent: CookieConsent): boolean {
  const consentDate = new Date(consent.timestamp)
  const now = new Date()
  const monthsDiff = (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  
  return monthsDiff >= 12
}

/**
 * Clear cookie consent
 */
export function clearCookieConsent(): void {
  deleteCookie(COOKIE_NAME)
}

