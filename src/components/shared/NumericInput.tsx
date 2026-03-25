import { forwardRef } from 'react'

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number | string
  onChange: (value: number) => void
  unit?: string
  allowEmpty?: boolean
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, unit, allowEmpty, className = '', ...rest }, ref) => {
    return (
      <div className="relative flex items-center">
        <input
          ref={ref}
          type="number"
          value={value}
          onChange={e => {
            const v = e.target.value
            if (allowEmpty && v === '') {
              onChange(0)
              return
            }
            const n = parseFloat(v)
            if (!isNaN(n)) onChange(n)
          }}
          className={`bg-slate-800 border border-slate-600 text-slate-100 rounded px-2 py-1.5 text-sm
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
            ${unit ? 'pr-10' : ''}
            ${className}`}
          {...rest}
        />
        {unit && (
          <span className="absolute right-2 text-slate-400 text-xs pointer-events-none select-none">
            {unit}
          </span>
        )}
      </div>
    )
  }
)
NumericInput.displayName = 'NumericInput'
