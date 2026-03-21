export default function Badge({ variant = 'default', children }) {
  let bgColor = 'var(--surface-container-highest)';
  let textColor = 'var(--on-surface)';

  switch (variant) {
    case 'success':
      bgColor = 'var(--tertiary-container)';
      textColor = 'var(--on-tertiary-fixed)';
      break;
    case 'warning':
      bgColor = 'var(--secondary-container)';
      textColor = 'var(--on-secondary-container)';
      break;
    case 'error':
      bgColor = 'var(--error-container)';
      textColor = 'var(--on-error-container)';
      break;
    case 'info':
      bgColor = 'var(--primary-container)';
      textColor = 'var(--on-primary-container)';
      break;
    default:
      break;
  }

  return (
    <span className="badge" style={{ backgroundColor: bgColor, color: textColor }}>
      {children}
      <style jsx>{`
        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }
      `}</style>
    </span>
  );
}
