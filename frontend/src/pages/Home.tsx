import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Globe, Gift, Users, Lock, MessageCircle, Calendar } from 'lucide-react'
import Button from '../components/Button'
import logo from '../assets/img/logo_256.png'
import CookieBanner from '../features/cookies/CookieBanner'
import CookieSettingsModal from '../features/cookies/CookieSettingsModal'
import CookieSettingsButton from '../features/cookies/CookieSettingsButton'
import opengiftImg from '../assets/img/opengift.png'
import privatepublicImg from '../assets/img/privateandpublic.png'
import addfriendsImg from '../assets/img/youcanaddafriends.png'
import creategroupImg from '../assets/img/youcancreategroup.png'
import { useState } from 'react'

export default function Home() {
  const { t, i18n } = useTranslation()
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    setShowLanguageMenu(false)
  }

  const currentLanguage = (i18n.language || 'en').split('-')[0]
  const languages = [
    { code: 'pt', label: 'Português' },
    { code: 'en', label: 'English' },
  ]

  const features = [
    {
      key: 'createGroups',
      icon: creategroupImg,
      iconComponent: Users,
      color: 'from-primary to-primary-light',
    },
    {
      key: 'addFriends',
      icon: addfriendsImg,
      iconComponent: Users,
      color: 'from-secondary to-secondary-light',
    },
    {
      key: 'secureMessages',
      icon: null,
      iconComponent: MessageCircle,
      color: 'from-primary to-primary-light',
    },
    {
      key: 'giftIdeas',
      icon: opengiftImg,
      iconComponent: Gift,
      color: 'from-secondary to-secondary-light',
    },
    {
      key: 'adminDraw',
      icon: null,
      iconComponent: Users,
      color: 'from-primary to-primary-light',
    },
    {
      key: 'revealDay',
      icon: null,
      iconComponent: Calendar,
      color: 'from-secondary to-secondary-light',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
      },
    },
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary text-text-on-light shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={logo} alt="Secret Santa" className="h-10 w-10" />
              <span className="text-xl font-bold hidden sm:block">Secret Santa</span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg border-2 border-text-on-light/30 text-text-on-light bg-transparent hover:bg-primary/20 transition-colors"
                  aria-label={t('nav.language')}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-sm font-medium uppercase hidden sm:block">{currentLanguage}</span>
                </button>

                {showLanguageMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowLanguageMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-40 bg-background rounded-lg shadow-xl border border-border-soft py-2 z-20"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => changeLanguage(lang.code)}
                          className={`w-full text-left px-4 py-2 hover:bg-surface transition-colors ${
                            currentLanguage === lang.code
                              ? 'text-primary font-semibold'
                              : 'text-text-main'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </div>

              <Link to="/login">
                <Button variant="primary" className="bg-white text-secondary hover:bg-text-on-light">
                  {t('home.login')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center"
          >
            <motion.div variants={itemVariants}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-text-main mb-6">
                {t('home.title')}
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-text-secondary mb-8 max-w-2xl mx-auto">
                {t('home.subtitle')}
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link to="/register">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="primary" className="text-lg px-8 py-4 w-full sm:w-auto">
                    {t('home.getStarted')}
                  </Button>
                </motion.div>
              </Link>
              <Link to="/login">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="secondary" className="text-lg px-8 py-4 w-full sm:w-auto">
                    {t('home.login')}
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-surface/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-main mb-4">
              {t('home.features.title')}
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature) => {
              const IconComponent = feature.iconComponent
              return (
                <motion.div
                  key={feature.key}
                  variants={itemVariants}
                  whileHover={{ y: -8 }}
                  className="bg-background rounded-2xl p-6 shadow-lg border border-border-soft hover:shadow-xl transition-shadow"
                >
                  <div className="flex flex-col items-center text-center h-full">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                      {feature.icon ? (
                        <img
                          src={feature.icon}
                          alt={t(`home.features.${feature.key}.title`)}
                          className="w-full h-full object-contain p-2"
                        />
                      ) : (
                        <IconComponent className="w-10 h-10 text-white" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-text-main mb-3">
                      {t(`home.features.${feature.key}.title`)}
                    </h3>
                    <p className="text-text-secondary text-sm sm:text-base">
                      {t(`home.features.${feature.key}.description`)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Private/Public Groups Highlight */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
          >
            <div className="flex-1">
              <img
                src={privatepublicImg}
                alt="Private and Public Groups"
                className="w-full max-w-lg mx-auto rounded-2xl shadow-2xl"
              />
            </div>
            <div className="flex-1 text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl font-bold text-text-main mb-4">
                {t('home.features.createGroups.title')}
              </h2>
              <p className="text-lg text-text-secondary mb-6">
                {t('home.features.createGroups.description')}
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                  <Lock className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-primary">{t('groups.private')}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-lg">
                  <Users className="w-5 h-5 text-secondary" />
                  <span className="font-semibold text-secondary">{t('groups.public')}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-primary-light text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
        </div>
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              {t('home.cta.title')}
            </h2>
            <p className="text-xl mb-8 opacity-90">
              {t('home.cta.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="secondary"
                    className="bg-white text-primary hover:bg-text-on-light border-white text-lg px-8 py-4"
                  >
                    {t('home.getStarted')}
                  </Button>
                </motion.div>
              </Link>
              <Link to="/login">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="secondary"
                    className="bg-transparent text-white border-white hover:bg-white/10 text-lg px-8 py-4"
                  >
                    {t('home.login')}
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface py-8 px-4 border-t border-border-soft">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
                <img src={logo} alt="Secret Santa" className="h-8 w-8" />
                <span className="text-lg font-bold text-text-main">Secret Santa</span>
              </div>
              <p className="text-text-secondary text-sm">
                © {new Date().getFullYear()} Secret Santa. {t('home.footer.rights')}
              </p>
            </div>
            <div className="flex gap-4">
              <CookieSettingsButton variant="link" />
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Banner */}
      <CookieBanner />

      {/* Cookie Settings Modal */}
      <CookieSettingsModal />
    </div>
  )
}

