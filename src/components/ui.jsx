import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState } from 'react'
import { getInitials } from '../lib/utils'

// Button
export function Button({ children, variant = 'primary', size = 'md', fullWidth, icon: Icon, loading, disabled, className = '', ...props }) {
  const base = 'inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25',
    outline: 'border-2 border-brand-500 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10',
    ghost: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
  }
  const sizes = {
    sm: 'text-sm px-3 py-2 rounded-xl gap-1.5',
    md: 'text-sm px-5 py-3 rounded-xl gap-2',
    lg: 'text-base px-6 py-4 rounded-2xl gap-2.5'
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  )
}

// Card
export function Card({ children, className = '', padding = 'p-5', onClick, animated = false }) {
  const Comp = animated ? motion.div : 'div'
  const animProps = animated ? {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  } : {}

  return (
    <Comp
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 ${padding} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
      onClick={onClick}
      {...animProps}
    >
      {children}
    </Comp>
  )
}

// Input
export const Input = forwardRef(function Input({ label, icon: Icon, error, className = '', type = 'text', ...props }, ref) {
  const [showPass, setShowPass] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          ref={ref}
          type={isPassword && showPass ? 'text' : type}
          className={`w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all ${Icon ? 'pl-11' : ''} ${error ? 'border-red-400 focus:ring-red-500/50' : ''}`}
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
})

// Badge
export function Badge({ children, variant = 'info', className = '' }) {
  const variants = {
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ProgressBar
export function ProgressBar({ value = 0, max = 100, color, size = 'md', showLabel, className = '' }) {
  const percent = Math.min((value / max) * 100, 100)
  const autoColor = color || (percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-orange-500' : percent >= 60 ? 'bg-amber-500' : 'bg-emerald-500')
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

  return (
    <div className={className}>
      <div className={`w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden ${heights[size]}`}>
        <motion.div
          className={`${autoColor} ${heights[size]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">{Math.round(percent)}%</span>
        </div>
      )}
    </div>
  )
}

// Toggle
export function Toggle({ checked, onChange, label, description }) {
  return (
    <button className="flex items-center justify-between w-full py-2" onClick={() => onChange(!checked)}>
      <div>
        {label && <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>}
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <motion.div
          className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  )
}

// Avatar
export function Avatar({ src, name, size = 'md', className = '' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-xl' }

  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ${className}`} />
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 font-bold flex items-center justify-center ${className}`}>
      {getInitials(name)}
    </div>
  )
}

// Modal
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative bg-white dark:bg-slate-800 rounded-3xl ${widths[size]} w-full shadow-2xl overflow-hidden`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            {title && (
              <div className="flex items-center justify-between p-5 pb-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// BottomSheet
export function BottomSheet({ isOpen, onClose, children, title }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-3xl max-h-[90vh] overflow-auto safe-bottom"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
            )}
            <div className="px-5 pb-8">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// EmptyState
export function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-brand-500" />
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">{description}</p>}
      {action && <Button onClick={onAction}>{action}</Button>}
    </div>
  )
}

// ListItem
export function ListItem({ icon: Icon, iconColor, title, subtitle, right, onClick, chevron = true }) {
  return (
    <button
      className="flex items-center w-full py-3.5 gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl px-2 transition-colors"
      onClick={onClick}
    >
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor || 'bg-brand-50 dark:bg-brand-900/20 text-brand-500'}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
      </div>
      {right && <div className="text-right shrink-0">{right}</div>}
      {chevron && !right && <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
    </button>
  )
}

// Tab bar
export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            active === tab.key
              ? 'bg-white dark:bg-slate-600 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// Section header
export function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</h3>
      {action && (
        <button onClick={onAction} className="text-xs font-semibold text-brand-500 hover:text-brand-600">
          {action}
        </button>
      )}
    </div>
  )
}

// Offline banner
export function OfflineBanner() {
  return (
    <motion.div
      className="bg-amber-500 text-white text-center py-2 text-xs font-semibold"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
    >
      📡 Você está offline. Os dados serão sincronizados quando reconectar.
    </motion.div>
  )
}
