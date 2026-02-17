import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

export default function Select({ 
  label, 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select...',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selected = options.find(opt => opt.value === value)
  
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all flex items-center justify-between"
        >
          <span className={clsx(selected ? 'text-white' : 'text-slate-500')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className={clsx(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute z-20 w-full mt-2 py-2 rounded-lg bg-slate-800 border border-white/10 shadow-2xl max-h-60 overflow-auto"
              >
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 transition-all flex items-center justify-between group"
                  >
                    <span className={clsx(
                      'text-sm',
                      option.value === value ? 'text-primary-400' : 'text-slate-300 group-hover:text-white'
                    )}>
                      {option.label}
                    </span>
                    {option.value === value && (
                      <Check className="w-4 h-4 text-primary-400" />
                    )}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
