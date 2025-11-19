import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { cookieAPI } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import {
  readCookieConsent,
  saveCookieConsent,
  isConsentExpired,
  clearCookieConsent,
  type CookieConsent,
} from './cookieUtils'

interface CookieConsentContextType {
  consent: CookieConsent | null
  isBannerVisible: boolean
  openSettings: () => void
  closeSettings: () => void
  acceptAll: () => void
  rejectNonEssential: () => void
  savePreferences: (preferences: {
    functional: boolean
    analytics: boolean
    marketing: boolean
  }) => void
  isSettingsOpen: boolean
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined)

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [isBannerVisible, setIsBannerVisible] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { user } = useAuth()

  // Load consent on mount
  useEffect(() => {
    const existingConsent = readCookieConsent()
    
    if (existingConsent) {
      // Check if consent is expired
      if (isConsentExpired(existingConsent)) {
        clearConsent()
        setIsBannerVisible(true)
      } else {
        setConsent(existingConsent)
        setIsBannerVisible(false)
      }
    } else {
      setIsBannerVisible(true)
    }
  }, [])

  // Sync consent to backend when user is logged in
  const syncConsentMutation = useMutation({
    mutationFn: (consentData: {
      necessary: boolean
      functional: boolean
      analytics: boolean
      marketing: boolean
    }) => cookieAPI.saveConsent(consentData),
  })

  const clearConsent = useCallback(() => {
    clearCookieConsent()
    setConsent(null)
    setIsBannerVisible(true)
  }, [])

  const updateConsent = useCallback(
    (newConsent: Omit<CookieConsent, 'timestamp' | 'version'>) => {
      saveCookieConsent(newConsent)
      const fullConsent: CookieConsent = {
        ...newConsent,
        version: 1,
        timestamp: new Date().toISOString(),
      }
      setConsent(fullConsent)
      setIsBannerVisible(false)
      setIsSettingsOpen(false)

      // Sync to backend if user is logged in
      if (user) {
        syncConsentMutation.mutate({
          necessary: fullConsent.necessary,
          functional: fullConsent.functional,
          analytics: fullConsent.analytics,
          marketing: fullConsent.marketing,
        })
      }

      // Enable/disable features based on consent
      if (fullConsent.analytics) {
        enableAnalytics()
      } else {
        disableAnalytics()
      }

      if (fullConsent.marketing) {
        enableMarketing()
      } else {
        disableMarketing()
      }
    },
    [user, syncConsentMutation]
  )

  const acceptAll = useCallback(() => {
    updateConsent({
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    })
  }, [updateConsent])

  const rejectNonEssential = useCallback(() => {
    updateConsent({
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    })
  }, [updateConsent])

  const savePreferences = useCallback(
    (preferences: { functional: boolean; analytics: boolean; marketing: boolean }) => {
      updateConsent({
        necessary: true,
        ...preferences,
      })
    },
    [updateConsent]
  )

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true)
    setIsBannerVisible(false)
  }, [])

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false)
    // Show banner again if no consent exists
    if (!consent) {
      setIsBannerVisible(true)
    }
  }, [consent])

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        isBannerVisible,
        openSettings,
        closeSettings,
        acceptAll,
        rejectNonEssential,
        savePreferences,
        isSettingsOpen,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext)
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider')
  }
  return context
}

/**
 * Placeholder functions for enabling/disabling features
 * These should be implemented based on your analytics/marketing tools
 */

function enableAnalytics() {
  // Example: Google Analytics
  // if (typeof window !== 'undefined' && !window.gtag) {
  //   const script = document.createElement('script')
  //   script.async = true
  //   script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID'
  //   document.head.appendChild(script)
  //
  //   window.dataLayer = window.dataLayer || []
  //   function gtag(...args: any[]) {
  //     window.dataLayer.push(args)
  //   }
  //   window.gtag = gtag
  //   gtag('js', new Date())
  //   gtag('config', 'GA_MEASUREMENT_ID')
  // }
  console.log('Analytics enabled')
}

function disableAnalytics() {
  // Example: Disable Google Analytics
  // if (typeof window !== 'undefined' && window.gtag) {
  //   // Clear cookies
  //   document.cookie.split(';').forEach((c) => {
  //     if (c.trim().startsWith('_ga') || c.trim().startsWith('_gid')) {
  //       document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
  //     }
  //   })
  //   delete window.gtag
  //   delete window.dataLayer
  // }
  console.log('Analytics disabled')
}

function enableMarketing() {
  // Example: Facebook Pixel, Google Ads, etc.
  // if (typeof window !== 'undefined' && !window.fbq) {
  //   !function(f,b,e,v,n,t,s)
  //   {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  //   n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  //   if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  //   n.queue=[];t=b.createElement(e);t.async=!0;
  //   t.src=v;s=b.getElementsByTagName(e)[0];
  //   s.parentNode.insertBefore(t,s)}(window, document,'script',
  //   'https://connect.facebook.net/en_US/fbevents.js');
  //   fbq('init', 'PIXEL_ID');
  //   fbq('track', 'PageView');
  // }
  console.log('Marketing enabled')
}

function disableMarketing() {
  // Example: Disable marketing pixels
  // if (typeof window !== 'undefined' && window.fbq) {
  //   delete window.fbq
  // }
  console.log('Marketing disabled')
}

