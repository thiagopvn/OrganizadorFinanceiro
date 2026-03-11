import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Fingerprint, Plane, Settings, Bell, Moon,
  FileText, Sparkles, Lock, HelpCircle, LogOut, ChevronRight,
  UserPlus, Copy, Check, Link2, X, Heart
} from 'lucide-react'
import { Button, Card, Toggle, Avatar, ListItem, SectionHeader, Badge } from '../../components/ui'
import useStore from '../../lib/store'
import { signOutUser, joinCouple } from '../../lib/firebase'

export default function Profile() {
  const navigate = useNavigate()
  const { user, userProfile, partner, couple, coupleId, darkMode, privacyMode, toggleDarkMode, togglePrivacyMode, reset, setPartner, setCouple } = useStore()
  const [faceIdEnabled, setFaceIdEnabled] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinSuccess, setJoinSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const userName = user?.displayName || 'Você'
  const partnerName = partner?.displayName || 'Parceiro(a)'
  const hasPartner = !!(partner && partner.uid)
  const coupleYear = couple?.createdAt?.toDate ? couple.createdAt.toDate().getFullYear() : new Date().getFullYear()

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOutUser()
      reset()
      navigate('/login')
    } catch (error) {
      console.error('Erro ao sair:', error)
      setSigningOut(false)
    }
  }

  const handleCopyCode = async () => {
    if (!coupleId) return
    try {
      await navigator.clipboard.writeText(coupleId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = coupleId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleJoinCouple = async () => {
    const code = joinCode.trim()
    if (!code) return

    setJoinError('')
    setJoinLoading(true)

    try {
      await joinCouple(code, user.uid)
      setJoinSuccess(true)
      setTimeout(() => {
        setShowJoinModal(false)
        setJoinSuccess(false)
        setJoinCode('')
        // Reload the page to re-fetch couple data
        window.location.reload()
      }, 1500)
    } catch (error) {
      if (error.message === 'Casal não encontrado') {
        setJoinError('Código inválido. Verifique e tente novamente.')
      } else if (error.message === 'Este casal já está completo') {
        setJoinError('Este casal já possui dois parceiros vinculados.')
      } else {
        setJoinError('Erro ao vincular. Tente novamente.')
      }
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <div className="pb-8">
      {/* Custom Header - Couple Profile */}
      <motion.div
        className="px-5 pt-8 pb-6 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Overlapping Avatars */}
        <div className="flex items-center justify-center mb-4">
          <Avatar src={user?.photoURL} name={userName} size="xl" />
          {hasPartner && (
            <Avatar
              src={partner?.photoURL}
              name={partnerName}
              size="xl"
              className="-ml-6 ring-4 ring-orange-50 dark:ring-slate-900"
            />
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          {hasPartner ? `${userName} & ${partnerName}` : userName}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {hasPartner ? 'Conta Compartilhada Unity Finance' : 'Convide seu parceiro(a) para começar!'}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {hasPartner ? `Gerenciando juntos desde ${coupleYear}` : user?.email}
        </p>
      </motion.div>

      <div className="px-5 space-y-6">
        {/* Invite Partner Card - only shows when no partner */}
        {!hasPartner && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="border-brand-200 dark:border-brand-800/30 bg-brand-50/50 dark:bg-brand-900/10">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-800/30 flex items-center justify-center shrink-0">
                  <Heart className="w-6 h-6 text-brand-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                    Vincular Parceiro(a)
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                    Compartilhe seu código com seu parceiro(a) ou insira o código dele(a) para gerenciar as finanças juntos.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      icon={UserPlus}
                      onClick={() => setShowInviteModal(true)}
                    >
                      Convidar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Link2}
                      onClick={() => setShowJoinModal(true)}
                    >
                      Tenho um Código
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Segurança & Privacidade */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SectionHeader title="Segurança & Privacidade" />
          <Card>
            <Toggle
              checked={privacyMode}
              onChange={togglePrivacyMode}
              label="Modo Privacidade"
              description="Ocultar saldos na tela inicial"
            />
            <div className="border-t border-slate-100 dark:border-slate-700/50 my-1" />
            <Toggle
              checked={faceIdEnabled}
              onChange={setFaceIdEnabled}
              label="FaceID / Biometria"
              description="Acesso seguro aos seus dados"
            />
          </Card>
        </motion.div>

        {/* Viagem & Finanças */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionHeader title="Viagem & Finanças" />
          <Card padding="p-2">
            <ListItem
              icon={Plane}
              iconColor="bg-sky-50 dark:bg-sky-900/20 text-sky-500"
              title="Modo Viagem"
              subtitle="Orçamento multi-moeda"
              onClick={() => navigate('/app/travel')}
            />
            <ListItem
              icon={Settings}
              iconColor="bg-slate-100 dark:bg-slate-700/50 text-slate-500"
              title="Configurações da Conta"
              onClick={() => navigate('/app/split/config')}
            />
            <ListItem
              icon={Bell}
              iconColor="bg-amber-50 dark:bg-amber-900/20 text-amber-500"
              title="Preferências de Notificação"
              onClick={() => navigate('/app/notifications')}
            />
          </Card>
        </motion.div>

        {/* Aparência */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SectionHeader title="Aparência" />
          <Card>
            <Toggle
              checked={darkMode}
              onChange={toggleDarkMode}
              label="Modo Escuro"
              description="Alterar tema da interface"
            />
          </Card>
        </motion.div>

        {/* Mais */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <SectionHeader title="Mais" />
          <Card padding="p-2">
            <ListItem
              icon={FileText}
              iconColor="bg-blue-50 dark:bg-blue-900/20 text-blue-500"
              title="Exportar Relatórios"
              onClick={() => navigate('/app/export')}
            />
            <ListItem
              icon={Sparkles}
              iconColor="bg-purple-50 dark:bg-purple-900/20 text-purple-500"
              title="Retrospectiva Anual"
              onClick={() => navigate('/app/wrapped')}
            />
            <ListItem
              icon={Lock}
              iconColor="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500"
              title="Privacidade"
              onClick={() => navigate('/app/privacy')}
            />
            <ListItem
              icon={HelpCircle}
              iconColor="bg-slate-100 dark:bg-slate-700/50 text-slate-500"
              title="Ajuda e Suporte"
              onClick={() => alert('Central de Ajuda em breve!')}
            />
          </Card>
        </motion.div>

        {/* Sign Out Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-2"
        >
          <Button
            variant="danger"
            fullWidth
            icon={LogOut}
            loading={signingOut}
            onClick={handleSignOut}
          >
            Sair do Unity Finance
          </Button>
        </motion.div>

        {/* Version footer */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 pb-4">
          Unity Finance v1.0.0
        </p>
      </div>

      {/* Invite Modal - Share your code */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-3xl p-6 space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Convidar Parceiro(a)
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="w-8 h-8 text-brand-500" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Envie este código para seu parceiro(a). Ele(a) deve criar uma conta no Unity Finance e inserir o código na tela de Perfil.
                </p>
              </div>

              {/* Couple Code */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-2 text-center">
                  Código do Casal
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-600">
                    <p className="text-sm font-mono font-bold text-slate-800 dark:text-white text-center tracking-wider select-all">
                      {coupleId || '---'}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-brand-500 text-white hover:bg-brand-600'
                    }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-emerald-500 font-medium text-center mt-2">
                    Código copiado!
                  </p>
                )}
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                Compartilhe por WhatsApp, SMS ou qualquer mensageiro. O código é único da sua conta de casal.
              </p>

              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Modal - Enter partner's code */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => { setShowJoinModal(false); setJoinError(''); setJoinCode(''); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-3xl p-6 space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Vincular ao Parceiro(a)
                </h3>
                <button
                  onClick={() => { setShowJoinModal(false); setJoinError(''); setJoinCode(''); }}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {joinSuccess ? (
                <div className="text-center py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                    Vinculado com sucesso!
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Agora vocês gerenciam as finanças juntos.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                      <Link2 className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Insira o código que seu parceiro(a) compartilhou com você.
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Código do Casal
                    </label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
                      placeholder="Cole o código aqui..."
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white text-sm font-mono text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {joinError && (
                      <p className="text-xs text-red-500 mt-2 text-center">{joinError}</p>
                    )}
                  </div>

                  <Button
                    fullWidth
                    size="lg"
                    icon={Link2}
                    loading={joinLoading}
                    onClick={handleJoinCouple}
                    disabled={!joinCode.trim()}
                  >
                    Vincular Conta
                  </Button>
                </>
              )}

              <div className="h-2" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
