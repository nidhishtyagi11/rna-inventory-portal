import { useState } from 'react';

// Basic reusable DataTable component
export default function DataTable({ columns, data, onRowClick, itemsPerPage = 0 }) {
  const [currentPage, setCurrentPage] = useState(1);

  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <p>No data available to display.</p>
      </div>
    );
  }

  const isPaginated = itemsPerPage > 0 && data.length > itemsPerPage;
  const totalPages = isPaginated ? Math.ceil(data.length / itemsPerPage) : 1;
  const startIndex = isPaginated ? (currentPage - 1) * itemsPerPage : 0;
  const displayData = isPaginated ? data.slice(startIndex, startIndex + itemsPerPage) : data;

  const handlePrev = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };
  const handleNext = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };

  return (
    <div className="table-container glass-panel">
      <table>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th key={index} className={col.align === 'right' ? 'align-right' : ''}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, rowIndex) => (
            <tr 
              key={rowIndex}
              onClick={() => onRowClick && onRowClick(row)}
              className={onRowClick ? 'clickable-row' : ''}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={col.align === 'right' ? 'align-right' : ''}>
                  {col.cell ? col.cell(row) : row[col.accessorKey]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {isPaginated && (
        <div className="pagination-controls">
           <span className="pagination-info">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, data.length)} of {data.length} records</span>
           <div className="pagination-buttons">
             <button onClick={handlePrev} disabled={currentPage === 1}>
                <span className="material-symbols-outlined">chevron_left</span>
             </button>
             <span className="page-indicator">Page {currentPage} of {totalPages}</span>
             <button onClick={handleNext} disabled={currentPage === totalPages}>
                <span className="material-symbols-outlined">chevron_right</span>
             </button>
           </div>
        </div>
      )}

      <style jsx>{`
        .table-container {
          width: 100%;
          border-radius: 0.5rem;
          overflow: hidden;
          background-color: var(--surface-container-low);
          border: 1px solid var(--surface-container-high);
          display: flex;
          flex-direction: column;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        th {
          padding: 1rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--outline);
          border-bottom: 1px solid var(--surface-container-high);
          font-weight: 600;
        }
        td {
          padding: 1rem;
          font-size: 0.875rem;
          color: var(--on-surface);
          border-bottom: 1px solid var(--surface-container);
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:hover td {
           background-color: var(--surface-bright);
        }
        .clickable-row {
           cursor: pointer;
        }
        .clickable-row:hover td {
           background-color: rgba(171, 199, 255, 0.05);
        }
        .align-right {
          text-align: right;
        }
        .empty-state {
          padding: 3rem;
          text-align: center;
          color: var(--on-surface-variant);
          background-color: var(--surface-container-low);
          border-radius: 0.5rem;
        }
        .pagination-controls {
           display: flex;
           justify-content: space-between;
           align-items: center;
           padding: 0.75rem 1.25rem;
           background-color: var(--surface-container-low);
           border-top: 1px solid var(--surface-container-high);
        }
        .pagination-info {
           font-size: 0.75rem;
           color: var(--outline);
        }
        .pagination-buttons {
           display: flex;
           align-items: center;
           gap: 1rem;
        }
        .pagination-buttons button {
           background: var(--surface-container-high);
           border: 1px solid var(--outline-variant);
           border-radius: 0.25rem;
           color: var(--on-surface);
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: center;
           padding: 0.25rem;
           transition: background 0.15s;
        }
        .pagination-buttons button:hover:not(:disabled) {
           background: var(--surface-bright);
        }
        .pagination-buttons button:disabled {
           opacity: 0.5;
           cursor: not-allowed;
        }
        .page-indicator {
           font-size: 0.8125rem;
           color: var(--on-surface);
           font-weight: 500;
        }
      `}</style>
    </div>
  );
}
