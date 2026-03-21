import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = '500px' }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="headline" style={{ fontSize: '1.5rem', marginBottom: 0 }}>{title}</h2>
          <button className="close-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          width: 100%;
          max-width: ${maxWidth};
          background-color: var(--surface-container-high);
          border: 1px solid var(--outline-variant);
          border-radius: 1rem;
          box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--surface-container);
        }
        .close-btn {
          background: transparent;
          border: none;
          color: var(--outline);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border-radius: 50%;
          transition: background-color 0.2s, color 0.2s;
        }
        .close-btn:hover {
          background-color: var(--surface-container-highest);
          color: var(--on-surface);
        }
        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
