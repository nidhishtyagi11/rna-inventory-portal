// Basic reusable DataTable component
export default function DataTable({ columns, data, onRowClick }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <p>No data available to display.</p>
      </div>
    );
  }

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
          {data.map((row, rowIndex) => (
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

      <style jsx>{`
        .table-container {
          width: 100%;
          border-radius: 0.5rem;
          overflow: hidden;
          background-color: var(--surface-container-low);
          border: 1px solid var(--surface-container-high);
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
      `}</style>
    </div>
  );
}
