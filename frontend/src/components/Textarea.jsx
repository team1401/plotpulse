import TextareaAutosize from 'react-textarea-autosize'
import clsx from 'clsx'

export default function Textarea({
  label,
  error,
  className = '',
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      <TextareaAutosize
        minRows={3}
        className={clsx(
          'w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all resize-none font-serif text-lg leading-relaxed',
          error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500/50'
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
