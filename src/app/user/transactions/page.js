"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { getTransactions } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function UserTransactions() {
  const { clubData } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  useEffect(() => {
    if (!clubData?.id) return;
    (async () => {
      try {
        const allTx = await getTransactions();
        const clubTx = allTx
          .filter(t => t.clubId === clubData.id && !t.isUndone)
          .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setTransactions(clubTx);
      } catch (err) {
        console.error("Error fetching transactions", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [clubData]);

  const filtered = transactions.filter(tx => {
    const matchSearch = !searchQuery || tx.itemName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || tx.type === typeFilter;
    return matchSearch && matchType;
  });

  const formatDate = (ts) => {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const columns = [
    { header: 'Item', accessorKey: 'itemName' },
    { header: 'Quantity', accessorKey: 'quantity', align: 'right' },
    {
      header: 'Type',
      cell: (row) => {
        const variant = row.type === 'Issuance' ? 'error' : row.type === 'Return' ? 'success' : 'info';
        return <Badge variant={variant}>{row.type}</Badge>;
      }
    },
    { header: 'Timestamp', cell: (row) => formatDate(row.timestamp) },
  ];

  return (
    <Layout adminOnly={false}>
      <div className="page-header">
        <div>
          <h1 className="headline">Transactions</h1>
          <p className="subtitle">{clubData?.name || 'Your Club'} · All activity</p>
        </div>
      </div>

      <div className="controls-row">
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="type-select">
          <option value="All">All Types</option>
          <option value="Issuance">Issuance</option>
          <option value="Return">Return</option>
        </select>
        <span className="count-badge">{filtered.length} transactions</span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--outline)' }}>Loading transactions...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">No transactions found.</div>
      ) : (
        <DataTable columns={columns} data={filtered} />
      )}

      <style jsx>{`
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
        .subtitle { color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.875rem; margin-top: 0.25rem; }
        .controls-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .search-input, .type-select {
          background: var(--surface-container-highest);
          border: 1px solid var(--outline-variant);
          border-radius: 0.5rem;
          color: var(--on-surface);
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input { min-width: 200px; }
        .search-input:focus, .type-select:focus { border-color: var(--primary); }
        .count-badge { font-size: 0.75rem; color: var(--outline); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif; white-space: nowrap; }
        .empty-state { padding: 2rem; text-align: center; border: 1px dashed var(--outline-variant); border-radius: 0.5rem; color: var(--outline); font-family: 'Inter', sans-serif; background: var(--surface-container-low); }
      `}</style>
    </Layout>
  );
}
