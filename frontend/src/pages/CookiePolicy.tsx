import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import Card from '../components/Card'
import CookieSettingsButton from '../features/cookies/CookieSettingsButton'

export default function CookiePolicy() {
  const { t } = useTranslation()

  const cookies = [
    {
      name: 'sessionid',
      purpose: t('cookies.policy.table.sessionid.purpose'),
      type: t('cookies.policy.table.firstParty'),
      duration: t('cookies.policy.table.session'),
    },
    {
      name: 'csrftoken',
      purpose: t('cookies.policy.table.csrftoken.purpose'),
      type: t('cookies.policy.table.firstParty'),
      duration: t('cookies.policy.table.session'),
    },
    {
      name: 'cookie_consent',
      purpose: t('cookies.policy.table.cookieConsent.purpose'),
      type: t('cookies.policy.table.firstParty'),
      duration: t('cookies.policy.table.twelveMonths'),
    },
    {
      name: '_ga',
      purpose: t('cookies.policy.table.analytics.purpose'),
      type: t('cookies.policy.table.thirdParty'),
      duration: t('cookies.policy.table.twoYears'),
      note: t('cookies.policy.table.analytics.note'),
    },
    {
      name: '_gid',
      purpose: t('cookies.policy.table.analytics.purpose'),
      type: t('cookies.policy.table.thirdParty'),
      duration: t('cookies.policy.table.oneDay'),
      note: t('cookies.policy.table.analytics.note'),
    },
  ]

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-main mb-4">
              {t('cookies.policy.title')}
            </h1>
            <p className="text-text-secondary">
              {t('cookies.policy.lastUpdated')}: {new Date().toLocaleDateString('pt-PT')}
            </p>
          </div>

          {/* Who We Are */}
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-text-main mb-4">
              {t('cookies.policy.whoWeAre.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('cookies.policy.whoWeAre.description')}
            </p>
            <p className="text-text-secondary">
              <strong>{t('cookies.policy.whoWeAre.dataController')}:</strong>{' '}
              {t('cookies.policy.whoWeAre.contact')}
            </p>
          </Card>

          {/* What Are Cookies */}
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-text-main mb-4">
              {t('cookies.policy.whatAreCookies.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('cookies.policy.whatAreCookies.description')}
            </p>
            <p className="text-text-secondary">
              {t('cookies.policy.whatAreCookies.types')}
            </p>
          </Card>

          {/* Types of Cookies */}
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-text-main mb-4">
              {t('cookies.policy.types.title')}
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-text-main mb-2">
                  {t('cookies.policy.types.necessary.title')}
                </h3>
                <p className="text-text-secondary">
                  {t('cookies.policy.types.necessary.description')}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-text-main mb-2">
                  {t('cookies.policy.types.functional.title')}
                </h3>
                <p className="text-text-secondary">
                  {t('cookies.policy.types.functional.description')}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-text-main mb-2">
                  {t('cookies.policy.types.analytics.title')}
                </h3>
                <p className="text-text-secondary">
                  {t('cookies.policy.types.analytics.description')}
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-text-main mb-2">
                  {t('cookies.policy.types.marketing.title')}
                </h3>
                <p className="text-text-secondary">
                  {t('cookies.policy.types.marketing.description')}
                </p>
              </div>
            </div>
          </Card>

          {/* Cookies We Use */}
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-text-main mb-4">
              {t('cookies.policy.cookiesWeUse.title')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border-soft">
                    <th className="text-left py-3 px-4 font-semibold text-text-main">
                      {t('cookies.policy.table.name')}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-text-main">
                      {t('cookies.policy.table.purpose')}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-text-main">
                      {t('cookies.policy.table.type')}
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-text-main">
                      {t('cookies.policy.table.duration')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map((cookie, index) => (
                    <tr
                      key={index}
                      className="border-b border-border-soft hover:bg-surface/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-text-main font-mono text-sm">
                        {cookie.name}
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-sm">
                        {cookie.purpose}
                        {cookie.note && (
                          <span className="block text-xs text-text-secondary mt-1 italic">
                            {cookie.note}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-sm">
                        {cookie.type}
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-sm">
                        {cookie.duration}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Manage Preferences */}
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-text-main mb-4">
              {t('cookies.policy.managePreferences.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('cookies.policy.managePreferences.description')}
            </p>
            <div className="flex items-center gap-3">
              <CookieSettingsButton variant="button" />
            </div>
            <p className="text-text-secondary mt-4 text-sm">
              {t('cookies.policy.managePreferences.browser')}
            </p>
          </Card>

          {/* Legal Basis and GDPR */}
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-text-main mb-4">
              {t('cookies.policy.legalBasis.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('cookies.policy.legalBasis.description')}
            </p>
            <p className="text-text-secondary">
              {t('cookies.policy.legalBasis.withdraw')}
            </p>
          </Card>

          {/* Data Subject Rights */}
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-text-main mb-4">
              {t('cookies.policy.rights.title')}
            </h2>
            <p className="text-text-secondary mb-4">
              {t('cookies.policy.rights.description')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-text-secondary">
              <li>{t('cookies.policy.rights.access')}</li>
              <li>{t('cookies.policy.rights.rectification')}</li>
              <li>{t('cookies.policy.rights.erasure')}</li>
              <li>{t('cookies.policy.rights.limit')}</li>
              <li>{t('cookies.policy.rights.oppose')}</li>
              <li>{t('cookies.policy.rights.portability')}</li>
            </ul>
            <p className="text-text-secondary mt-4">
              <strong>{t('cookies.policy.rights.contact')}:</strong>{' '}
              <a
                href="mailto:support@secretsanta.example"
                className="text-primary hover:underline"
              >
                support@secretsanta.example
              </a>
            </p>
          </Card>

          {/* Updates */}
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-text-main mb-4">
              {t('cookies.policy.updates.title')}
            </h2>
            <p className="text-text-secondary">
              {t('cookies.policy.updates.description')}
            </p>
          </Card>

          {/* Back Link */}
          <div className="text-center">
            <Link
              to="/"
              className="text-primary hover:underline font-medium"
            >
              {t('cookies.policy.backToHome')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

