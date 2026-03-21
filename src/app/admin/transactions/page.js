"use client";

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { getTransactions } from '@/lib/firestore';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getTransactions();
        // Sort newest first
        data.sort((a, b) => b.timestamp - a.timestamp);
        setTransactions(data);
      } catch (err) {
        console.error("Error fetching transactions", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredTx = filterType === 'All' 
    ? transactions 
    : transactions.filter(t => t.type === filterType);

  const columns = [
    { 
      header: 'Type', 
      cell: (row) => {
        let variant = 'default';
        if (row.type === 'Issuance') variant = 'info';
        if (row.type === 'Incoming') variant = 'primary';
        if (row.type === 'Return') variant = 'success';
        return <Badge variant={variant}>{row.type}</Badge>;
      }
    },
    { header: 'Item Name', accessorKey: 'itemName' },
    { header: 'Qty', accessorKey: 'quantity', align: 'right' },
    { 
      header: 'Target / Event', 
      cell: (row) => row.clubName ? `${row.clubName} (${row.eventName})` : 'System / Base'
    },
    { header: 'Location', accessorKey: 'location' },
    { 
      header: 'Timestamp', 
      cell: (row) => row.timestamp?.toDate ? row.timestamp.toDate().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'N/A' 
    },
    { header: 'Authorized By', accessorKey: 'userName' },
  ];

  return (
    <Layout adminOnly={true}>
      <div className="page-header">
        <div>
          <h1 className="headline">Transaction Logs</h1>
          <p className="subtitle">Showing {filteredTx.length} records</p>
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
        select:focus {
          border-color: var(--primary);
        }
      `}</style>
    </Layout>
  );
}
