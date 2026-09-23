export interface SpinnerProps {
  label?: string
}

export default function Spinner({ label = 'Loading...' }: SpinnerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '1.5rem',
        color: '#4a5568',
        fontSize: '0.95rem',
      }}
    >
      <div
        style={{
          width: '18px',
          height: '18px',
          border: '2px solid #cbd5e0',
          borderTopColor: '#2b6cb0',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span>{label}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
