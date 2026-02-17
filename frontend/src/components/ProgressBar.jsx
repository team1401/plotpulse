import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function ProgressBar({ 
  value, 
  max = 100, 
  label,
  showPercentage = true,
  size = 'md',
  animated = true,
  className = ''
}) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }
  
  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          {label && <span className="text-slate-300">{label}</span>}
          {showPercentage && (
            <span className="text-slate-400 font-medium">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      
      <div className={clsx(
        'w-full bg-white/5 rounded-full overflow-hidden',
        sizes[size]
      )}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={animated ? { 
            duration: 0.5, 
            ease: 'easeOut' 
          } : { duration: 0 }}
          className={clsx(
            'h-full bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500 rounded-full relative overflow-hidden',
            animated && 'before:absolute before:inset-0 before:bg-shimmer before:animate-shimmer'
          )}
        />
      </div>
    </div>
  )
}
