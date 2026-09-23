import type { ReactNode } from 'react'

export interface AlertProps {
  variant?: 'error' | 'warning' | 'info' | 'success'
  title?: string
  children: ReactNode
}

export default function Alert({ variant = 'error', title, children }: AlertProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          backgroundColor: '#fffaf0',
          borderColor: '#dd6b20',
          color: '#7b341e',
        }
      case 'info':
        return {
          backgroundColor: '#ebf8ff',
          borderColor: '#3182ce',
          color: '#2b6cb0',
        }
      case 'success':
        return {
          backgroundColor: '#f0fff4',
          borderColor: '#38a169',
          color: '#22543d',
        }
      case 'error':
      default:
        return {
          backgroundColor: '#fff5f5',
          borderColor: '#e53e3e',
          color: '#9b2c2c',
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div
      role="alert"
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '6px',
        borderLeft: `4px solid ${styles.borderColor}`,
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        marginBottom: '1rem',
        fontSize: '0.9rem',
      }}
    >
      {title && <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{title}</strong>}
      {children}
    </div>
  )
}
