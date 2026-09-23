import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'outline' | 'secondary'
  isLoading?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  isLoading = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          backgroundColor: '#e53e3e',
          color: '#ffffff',
          border: '1px solid #c53030',
        }
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: '#4a5568',
          border: '1px solid #cbd5e0',
        }
      case 'secondary':
        return {
          backgroundColor: '#edf2f7',
          color: '#2d3748',
          border: '1px solid #e2e8f0',
        }
      case 'primary':
      default:
        return {
          backgroundColor: '#2b6cb0',
          color: '#ffffff',
          border: '1px solid #2c5282',
        }
    }
  }

  const baseStyle: React.CSSProperties = {
    padding: '0.625rem 1.25rem',
    borderRadius: '6px',
    fontWeight: 500,
    fontSize: '0.95rem',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.65 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    ...getVariantStyles(),
    ...style,
  }

  return (
    <button disabled={disabled || isLoading} style={baseStyle} {...props}>
      {isLoading ? 'Processing...' : children}
    </button>
  )
}
