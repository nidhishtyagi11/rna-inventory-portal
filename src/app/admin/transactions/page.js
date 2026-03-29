"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { getTransactions, undoTransaction } from '@/lib/firestore';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [searchClub, setSearchClub] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      // Sort newest first
      data.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(data);
    } catch (err) {
      console.error("Error fetching transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUndo = async (txId) => {
    if (confirm("Are you sure you want to undo this transaction? The inventory quantities will be reversed.")) {
      try {
        await undoTransaction(txId);
        fetchData();
      } catch(err) {
        console.error(err);
        alert("Failed to undo transaction");
      }
    }
  };

  const filteredTx = transactions.filter(t => {
    const typeMatch = filterType === 'All' || t.type === filterType;
    if (!typeMatch) return false;
    
    if (!searchClub) return true;
    const clubName = t.clubName || 'System / Incoming';
    return clubName.toLowerCase().includes(searchClub.toLowerCase());
  });

  const columns = [
    { 
      header: 'Type', 
      cell: (row) => {
        if (row.isUndone) return <Badge variant="default">Undone</Badge>;
        let variant = 'default';
        if (row.type === 'Issuance') variant = 'info';
        if (row.type === 'Incoming') variant = 'primary';
        if (row.type === 'Return') variant = 'success';
        return <Badge variant={variant}>{row.type}</Badge>;
      }
    },
    { 
      header: 'Item Name', 
      accessorKey: 'itemName',
      cell: (row) => <span style={{ opacity: row.isUndone ? 0.5 : 1, textDecoration: row.isUndone ? 'line-through' : 'none' }}>{row.itemName}</span>
    },
    { 
      header: 'Qty', 
      accessorKey: 'quantity',
      align: 'right',
      cell: (row) => <span style={{ opacity: row.isUndone ? 0.5 : 1, textDecoration: row.isUndone ? 'line-through' : 'none' }}>{row.quantity}</span>
    },
    { 
      header: 'Club', 
      cell: (row) => <span style={{ opacity: row.isUndone ? 0.5 : 1 }}>{row.clubName || 'System / Incoming'}</span>
    },
    { 
      header: 'Timestamp', 
      cell: (row) => <span style={{ opacity: row.isUndone ? 0.5 : 1 }}>{row.timestamp?.toDate ? row.timestamp.toDate().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'N/A'}</span>
    },
    { 
      header: 'Authorized By', 
      accessorKey: 'userName',
      cell: (row) => <span style={{ opacity: row.isUndone ? 0.5 : 1 }}>{row.userName}</span>
    },
    {
      header: '',
      align: 'right',
      cell: (row) => (
        !row.isUndone && (
          <button onClick={() => handleUndo(row.id)} className="action-pill pill-undo" title="Undo Transaction">
            <span className="material-symbols-outlined icon-small">undo</span>
            Undo
          </button>
        )
      )
    }
  ];

  return (
    <Layout adminOnly={true}>
      <div className="page-header">
        <div>
          <h1 className="headline">Transaction Logs</h1>
          <p className="subtitle">Showing {filteredTx.length} records</p>
        </div>
        
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div className="search-bar-wrap">
            <span className="material-symbols-outlined search-icon">search</span>
            <input 
              type="text"
              placeholder="Search clubs..."
              value={searchClub}
              onChange={(e) => setSearchClub(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-group">
            <label>Filter Type:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="All">All Transactions</option>
              <option value="Issuance">Issuance</option>
              <option value="Return">Return</option>
              <option value="Incoming">Incoming Stock</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Loading transaction logs...</p>
      ) : (
         <DataTable columns={columns} data={filteredTx} />
      )}

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
        }
        .subtitle {
          color: var(--on-surface-variant);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .filter-group label {
          font-size: 0.75rem;
          color: var(--outline);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        select {
          padding: 0.5rem 1rem;
          background-color: var(--surface-container-highest);
          border: 1px solid var(--outline-variant);
          border-radius: 0.5rem;
          color: var(--on-surface);
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          outline: none;
        }
        }
        select:focus {
          border-color: var(--primary);
        }

        .search-bar-wrap { position: relative; }
        .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--outline); font-size: 1.25rem; pointer-events: none; }
        .search-input { padding: 0.5rem 1rem 0.5rem 2.25rem; border-radius: 0.5rem; border: 1px solid var(--outline-variant); background: var(--surface-container-highest); color: var(--on-surface); font-family: 'Inter', sans-serif; width: 200px; font-size: 0.875rem;}
        .search-input:focus { outline: none; border-color: var(--primary); }
      `}</style>
      <style jsx global>{`
        .action-pill {
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          height: 28px;
          gap: 0.375rem;
          padding: 0 0.75rem;
          border-radius: 0.375rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s, background-color 0.15s;
          border: none;
          line-height: normal;
        }
        .action-pill:hover {
          opacity: 0.85;
          transform: translateY(-1px);
        }
        .pill-undo {
          background-color: transparent;
          color: var(--error);
          border: 1px solid rgba(255, 180, 171, 0.4);
        }
        .pill-undo:hover {
          background-color: rgba(255, 180, 171, 0.1);
        }
        .icon-small {
          font-size: 1rem;
          display: flex;
          align-items: center;
        }
      `}</style>
    </Layout>
  );
}
