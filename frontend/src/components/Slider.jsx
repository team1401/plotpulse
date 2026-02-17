import clsx from 'clsx'

export default function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showValue = true,
  labels = {},
  className = ''
}) {
  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">
            {label}
          </label>
          {showValue && (
            <span className="text-sm text-slate-400">{value}</span>
          )}
        </div>
      )}
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`
        }}
      />
      
      {Object.keys(labels).length > 0 && (
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          {Object.entries(labels).map(([key, label]) => (
            <span key={key}>{label}</span>
          ))}
        </div>
      )}
      
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0ea5e9, #06b6d4);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.4);
        }
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0ea5e9, #06b6d4);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.4);
        }
      `}</style>
    </div>
  )
}
