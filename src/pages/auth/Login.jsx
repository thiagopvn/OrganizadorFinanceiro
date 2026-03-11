import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, Mail, Lock, Loader2, AlertCircle, Play } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import { signIn, signInWithGoogle } from '../../lib/firebase'
import useStore from '../../lib/store'

export default function Login() {
  const navigate = useNavigate()
  const { setIsDemo } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Preencha todos os campos.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/app/home')
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
        'auth/wrong-password': 'Senha incorreta. Tente novamente.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
        'auth/invalid-credential': 'E-mail ou senha incorretos.'
      }
      setError(messages[err.code] || 'Erro ao entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      navigate('/app/home')
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Erro ao entrar com Google. Tente novamente.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleDemo = () => {
    setIsDemo(true)
    navigate('/app/home')
  }

  return (
    <div className="min-h-[100dvh] bg-orange-50 dark:bg-slate-900 flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo / Branding */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center shadow-lg shadow-brand-500/30 mb-5"
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          >
            <DollarSign className="w-10 h-10 text-white" strokeWidth={2.5} />
          </motion.div>
          <motion.h1
            className="text-2xl font-bold text-slate-900 dark:text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Unity Finance
          </motion.h1>
          <motion.p
            className="text-sm text-slate-500 dark:text-slate-400 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Gestão financeira para casais
          </motion.p>
        </div>

        {/* Heading */}
        <motion.h2
          className="text-xl font-bold text-slate-800 dark:text-white text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Bem-vindo de volta
        </motion.h2>

        {/* Error message */}
        {error && (
          <motion.div
            className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 mb-5 text-sm"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="E-mail"
            icon={Mail}
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label="Senha"
            icon={Lock}
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={loading || googleLoading}
          >
            Entrar
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">ou</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Google Sign In */}
        <Button
          variant="outline"
          fullWidth
          size="lg"
          onClick={handleGoogle}
          loading={googleLoading}
          disabled={loading || googleLoading}
          className="mb-4"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Entrar com Google
        </Button>

        {/* Register link */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Não tem conta?{' '}
          <Link to="/register" className="text-brand-500 hover:text-brand-600 font-semibold">
            Criar conta
          </Link>
        </p>

        {/* Demo mode */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="ghost"
            size="md"
            icon={Play}
            onClick={handleDemo}
            disabled={loading || googleLoading}
          >
            Modo Demonstração
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
