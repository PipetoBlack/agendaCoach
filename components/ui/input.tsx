import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    const iosDateTimeFix =
      type === 'date' || type === 'time' || type === 'datetime-local'
        ? 'appearance-none [\&::-webkit-datetime-edit]:px-2 [\&::-webkit-datetime-edit-fields-wrapper]:px-1 [\&::-webkit-date-and-time-value]:min-h-[2.75rem] [\&::-webkit-inner-spin-button]:m-0 [\&::-webkit-clear-button]:hidden [\&::-webkit-calendar-picker-indicator]:px-2'
        : ''
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          iosDateTimeFix,
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
