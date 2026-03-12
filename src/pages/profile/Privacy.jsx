import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../../components/layout'
import { Button, Card, Toggle, SectionHeader } from '../../components/ui'
import useStore from '../../lib/store'
import { updatePrivacySettings } from '../../lib/firebase'

export default function Privacy() {
  const { privacyMode, togglePrivacyMode, user, userProfile } = useStore()

  const savedPrivacy = userProfile?.privacySettings || {}
  const [hideIndividualBalance, setHideIndividualBalance] = useState(savedPrivacy.hideIndividualBalance ?? false)
  const [autoPrivateMode, setAutoPrivateMode] = useState(savedPrivacy.autoPrivateMode ?? true)
  const [saving, setSaving] = useState(false)

  const [categorySharing, setCategorySharing] = useState(savedPrivacy.categorySharing ?? {
    presentes: true,
    saude: true,
    alimentacao: true,
    compras_pessoais: false,
  })

  const toggleCategory = (key) => {
    setCategorySharing(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleStopSharing = () => {
    setCategorySharing({
      presentes: false,
      saude: false,
      alimentacao: false,
      compras_pessoais: false,
    })
  }

  // Persist changes to Firebase
  useEffect(() => {
    if (!user?.uid) return
    const timeout = setTimeout(async () => {
      setSaving(true)
      try {
        await updatePrivacySettings(user.uid, {
          hideIndividualBalance,
          autoPrivateMode,
          categorySharing
        })
      } catch (e) {
        console.warn('Erro ao salvar privacidade:', e)
      } finally {
        setSaving(false)
      }
    }, 800) // Debounce 800ms
    return () => clearTimeout(timeout)
  }, [hideIndividualBalance, autoPrivateMode, categorySharing, user?.uid])

  const categoryLabels = {
    presentes: 'Presentes',
    saude: 'Saúde',
    alimentacao: 'Alimentação',
    compras_pessoais: 'Compras Pessoais',
  }

  return (
    <div className="pb-8">
      <PageHeader
        title="Privacidade"
        actions={
          saving && (
            <span className="text-[10px] text-brand-500 font-semibold animate-pulse">
              Salvando...
            </span>
          )
        }
      />

      <div className="px-5 space-y-6 mt-4">
        {/* Security Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/30">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-brand-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Seus dados estão seguros
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  O Unity Finance utiliza criptografia de ponta a ponta para proteger todas as
                  suas informações financeiras. Nenhum dado pessoal é compartilhado com terceiros.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Geral */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SectionHeader title="Geral" />
          <Card>
            <Toggle
              checked={hideIndividualBalance}
              onChange={setHideIndividualBalance}
              label="Ocultar Saldo Individual"
              description="Seu saldo pessoal não será visível para o parceiro"
            />
            <div className="border-t border-slate-100 dark:border-slate-700/50 my-1" />
            <Toggle
              checked={autoPrivateMode}
              onChange={setAutoPrivateMode}
              label="Modo Privado Automático"
              description="Ativar automaticamente ao detectar presença de terceiros"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 px-1 leading-relaxed">
              O modo privado automático utiliza sensores do dispositivo para ocultar valores
              quando detecta que outra pessoa pode estar visualizando a tela.
            </p>
          </Card>
        </motion.div>

        {/* Compartilhamento de Categorias */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SectionHeader title="Compartilhamento de Categorias" />
          <Card>
            {Object.entries(categoryLabels).map(([key, label], index) => (
              <div key={key}>
                {index > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-700/50 my-1" />
                )}
                <Toggle
                  checked={categorySharing[key]}
                  onChange={() => toggleCategory(key)}
                  label={label}
                  description={
                    categorySharing[key]
                      ? 'Visível para o parceiro'
                      : 'Oculto do parceiro'
                  }
                />
              </div>
            ))}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 px-1 leading-relaxed">
              Gastos em categorias desativadas não aparecerão na linha do tempo compartilhada.
              As alterações são salvas automaticamente.
            </p>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pt-2"
        >
          <Button
            variant="danger"
            fullWidth
            icon={AlertTriangle}
            onClick={handleStopSharing}
          >
            Interromper todo compartilhamento
          </Button>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-2">
            Isso ocultará todas as suas transações da visualização do parceiro.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
