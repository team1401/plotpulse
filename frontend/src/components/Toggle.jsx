import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function Toggle({ 
  label, 
  checked, 
  onChange, 
  description,
  className = '' 
}) {
  return (
    <div className={clsx('flex items-start gap-3', className)}>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-11 h-6 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/50',
          checked ? 'bg-primary-500' : 'bg-white/10'
        )}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
        />
      </button>
      
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <div className="text-sm font-medium text-slate-300">
              {label}
            </div>
          )}
          {description && (
            <div className="text-xs text-slate-500 mt-0.5">
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
