import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function Card({ 
  children, 
  className = '', 
  hover = false,
  gradient = false,
  ...props 
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      className={clsx(
        'rounded-xl backdrop-blur-xl transition-all',
        gradient
          ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10'
          : 'bg-slate-900/50 border border-white/5',
        hover && 'cursor-pointer hover:border-white/20 hover:shadow-2xl hover:shadow-primary-500/10',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
