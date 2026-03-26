export default function Badge({ variant = 'default', children, className = '', style = {} }) {
  let bgColor = 'rgba(139, 144, 160, 0.15)';
  let textColor = 'var(--outline)';

  switch (variant) {
    case 'success':
      bgColor = 'rgba(0, 218, 243, 0.15)';
      textColor = 'var(--tertiary)';
      break;
    case 'warning':
      bgColor = 'rgba(173, 203, 218, 0.15)';
      textColor = 'var(--secondary)';
      break;
    case 'error':
      bgColor = 'rgba(255, 180, 171, 0.15)';
      textColor = 'var(--error)';
      break;
    case 'info':
      bgColor = 'rgba(171, 199, 255, 0.15)';
      textColor = 'var(--primary)';
      break;
    default:
      break;
  }

  return (
    <span className={`badge ${className}`} style={{ backgroundColor: bgColor, color: textColor, ...style }}>
      {children}
      <style jsx>{`
        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.15rem 0.4rem;
          border-radius: 0.2rem;
          font-size: 0.65rem;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </span>
  );
}
