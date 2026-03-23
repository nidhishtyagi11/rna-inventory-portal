export default function KPICard({ title, value, subtitle, icon, highlight }) {
  return (
    <div className={`kpi-card ${highlight ? 'highlight' : 'glass-panel'}`}>
      <div className="card-header">
        <span className="title">{title}</span>
        {icon && <span className="material-symbols-outlined icon">{icon}</span>}
      </div>
      <div className="card-value">
        {value}
      </div>
      {subtitle && <div className="card-subtitle">{subtitle}</div>}

      <style jsx>{`
        .kpi-card {
          padding: 1rem 1.25rem;
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          border: 1px solid var(--outline-variant);
          flex: 1;
          min-width: 200px;
        }
        .kpi-card.highlight {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
          color: var(--on-primary-container);
          border: none;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .highlight .title {
          color: rgba(255, 255, 255, 0.8);
        }
        .icon {
          color: var(--tertiary);
          font-size: 1.5rem;
        }
        .highlight .icon {
          color: var(--on-primary-container);
        }
        .card-value {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1;
          margin: 0.15rem 0;
        }
        .card-subtitle {
          font-size: 0.75rem;
          color: var(--outline);
        }
        .highlight .card-subtitle {
          color: rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </div>
  );
}
