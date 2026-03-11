import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Shield, Fingerprint, Plane, Settings, Bell, Moon,
  FileText, Sparkles, Lock, HelpCircle, LogOut, ChevronRight
} from 'lucide-react'
import { Button, Card, Toggle, Avatar, ListItem, SectionHeader } from '../../components/ui'
import useStore from '../../lib/store'
import { signOutUser } from '../../lib/firebase'

export default function Profile() {
  const navigate = useNavigate()
  const { user, userProfile, isDemo, darkMode, privacyMode, toggleDarkMode, togglePrivacyMode } = useStore()
  const [faceIdEnabled, setFaceIdEnabled] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const userName = userProfile?.displayName || user?.displayName || 'Alex'
  const partnerName = 'Sam'

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOutUser()
      navigate('/login')
    } catch (error) {
      console.error('Erro ao sair:', error)
      setSigningOut(false)
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
          <Avatar name={userName} size="xl" />
          <Avatar
            name={partnerName}
            size="xl"
            className="-ml-6 ring-4 ring-orange-50 dark:ring-slate-900"
          />
        </div>

        <h1 className="text-xl font-bold text-slate-800 dark:text-white">
          {userName} & {partnerName}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Conta Compartilhada Unity Finance
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Gerenciando juntos desde 2023
        </p>
      </motion.div>

      <div className="px-5 space-y-6">
        {/* Seguranca & Privacidade */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SectionHeader title="Seguranca & Privacidade" />
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

        {/* Viagem & Financas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionHeader title="Viagem & Financas" />
          <Card padding="p-2">
            <ListItem
              icon={Plane}
              iconColor="bg-sky-50 dark:bg-sky-900/20 text-sky-500"
              title="Modo Viagem"
              subtitle="Orcamento multi-moeda"
              onClick={() => navigate('/app/travel')}
            />
            <ListItem
              icon={Settings}
              iconColor="bg-slate-100 dark:bg-slate-700/50 text-slate-500"
              title="Configuracoes da Conta"
              onClick={() => navigate('/app/split/config')}
            />
            <ListItem
              icon={Bell}
              iconColor="bg-amber-50 dark:bg-amber-900/20 text-amber-500"
              title="Preferencias de Notificacao"
              onClick={() => navigate('/app/notifications')}
            />
          </Card>
        </motion.div>

        {/* Aparencia */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SectionHeader title="Aparencia" />
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
              title="Exportar Relatorios"
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
          Unity Finance v1.0.0 {isDemo && '(Demo)'}
        </p>
      </div>
    </div>
  )
}
