"use client";

import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import { useEffect, useState } from 'react';
import { getInventoryStock, updateStock } from '@/lib/firestore';
import AddStockModal from './AddStockModal';
import IssueModal from './IssueModal';
import ShipmentModal from './ShipmentModal';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await getInventoryStock();
      setInventory(data);
    } catch (err) {
      console.error("Error fetching inventory", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenStockModal = (item) => {
    setSelectedItem(item);
    setStockModalOpen(true);
  };

  const handleOpenIssueModal = (item) => {
    setSelectedItem(item);
    setIssueModalOpen(true);
  };

  const handleToggleLow = async (item) => {
    try {
      await updateStock(item.id, { isLow: !item.isLow });
      fetchInventory();
    } catch (err) {
      console.error('Failed to toggle low status', err);
    }
  };

  const totalItems = inventory.length;
  const itemsIssued = inventory.reduce((acc, curr) => acc + (curr.issuedStock || 0), 0);
  const totalStockSum = inventory.reduce((acc, curr) => acc + (curr.totalStock || 0), 0);
  const lowItems = inventory.filter(inv => inv.isLow).length;
  
  // Table Data Preparation
  const tableData = inventory.map(item => {
    const total = item.totalStock || 0;
    const issued = item.issuedStock || 0;
    const returned = item.returnedStock || 0;
    const available = total - issued + returned;
    
    let status = 'Stocked';
    let variant = 'success';
    
    if (available === 0 && total > 0) {
      status = 'Depleted';
      variant = 'error';
    } else if (available > 0 && available < (total * 0.2)) {
      status = 'Low Stock';
      variant = 'warning';
    } else if (total === 0) {
       status = 'No Base Stock';
       variant = 'default';
    }

    return {
      ...item,
      total,
      issued,
      available,
      status,
      variant
    };
  });

  const columns = [
    { header: 'Item Name', accessorKey: 'itemName' },
    { header: 'Total Base Stock', accessorKey: 'total', align: 'right' },
    { header: 'Issued', accessorKey: 'issued', align: 'right' },
    { header: 'Available', accessorKey: 'available', align: 'right' },
    { 
      header: 'Status', 
      cell: (row) => <Badge variant={row.variant}>{row.status}</Badge> 
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="action-buttons">
          <button className={`action-pill ${row.isLow ? 'pill-unmark' : 'pill-low'}`} onClick={() => handleToggleLow(row)}>
            {row.isLow ? 'Unmark Low' : 'Mark Low'}
          </button>
          <button className="action-pill pill-add" onClick={() => handleOpenStockModal(row)}>
            <span className="material-symbols-outlined icon-small">add</span>
            Add Stock
          </button>
          <button className="action-pill pill-issue" onClick={() => handleOpenIssueModal(row)}>
            Issue
          </button>
        </div>
      )
    }
  ];

  return (
    <Layout adminOnly={true}>
      <div className="page-header">
        <div>
          <h1 className="headline">Inventory Stock</h1>
          <p className="subtitle" style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
            <span className="live-dot pulse"></span>
            Showing {totalItems} Items
          </p>
        </div>
        <button className="primary-gradient action-btn" onClick={() => setShipmentModalOpen(true)}>
          <span className="material-symbols-outlined">local_shipping</span>
          Log Shipment
        </button>
      </div>

      <div className="metrics-row">
        <div className="metric">
          <span className="metric-val">{totalItems}</span>
          <span className="metric-label">Total Asset Types</span>
        </div>
        <div className="metric">
          <span className="metric-val">{totalStockSum}</span>
          <span className="metric-label">Total Base Stock</span>
        </div>
        <div className="metric">
          <span className="metric-val">{itemsIssued}</span>
          <span className="metric-label">Assets In Use</span>
        </div>
        <div className="metric warning">
          <span className="metric-val">{lowItems}</span>
          <span className="metric-label">LOW ITEMS</span>
        </div>
      </div>

      {loading ? (
        <p>Loading inventory data...</p>
      ) : (
        <DataTable columns={columns} data={tableData} />
      )}

      {/* Modals */}
      <AddStockModal 
        isOpen={stockModalOpen} 
        onClose={() => setStockModalOpen(false)} 
        item={selectedItem}
        onStockAdded={fetchInventory}
      />
      
      <IssueModal 
        isOpen={issueModalOpen} 
        onClose={() => setIssueModalOpen(false)} 
        item={selectedItem}
        onStockIssued={fetchInventory}
      />

      <ShipmentModal
        isOpen={shipmentModalOpen}
        onClose={() => setShipmentModalOpen(false)}
        inventoryItems={inventory}
        onShipmentAdded={fetchInventory}
      />

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .subtitle {
          color: var(--on-surface-variant);
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .live-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background-color: var(--error);
          border-radius: 50%;
        }
        .pulse {
          animation: pulse-animation 2s infinite;
        }
        @keyframes pulse-animation {
          0% { box-shadow: 0 0 0 0 rgba(255, 180, 171, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(255, 180, 171, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 180, 171, 0); }
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: 2rem;
          border: none;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .action-btn:hover {
          transform: translateY(-1px);
        }
        .metrics-row {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--surface-container);
        }
        .metric {
          display: flex;
          flex-direction: column;
        }
        .metric-val {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
        }
        .metric-label {
          font-size: 0.75rem;
          color: var(--outline);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.5rem;
        }
        .metric.warning .metric-val {
          color: var(--error);
        }
        .primary-btn:hover {
          background: rgba(171, 199, 255, 0.2);
        }
      `}</style>
      <style jsx global>{`
        .action-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        .action-pill {
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          height: 32px;
          max-height: 32px;
          gap: 0.375rem;
          padding: 0 0.875rem;
          border-radius: 0.375rem;
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
          border: none;
          line-height: normal;
          overflow: hidden;
        }
        .action-pill:hover {
          opacity: 0.85;
          transform: translateY(-1px);
        }
        .pill-add {
          background-color: rgba(46, 196, 182, 0.15);
          color: #2ec4b6;
          border: 1px solid rgba(46, 196, 182, 0.3);
        }
        .pill-issue {
          background-color: rgba(67, 143, 255, 0.15);
          color: #438fff;
          border: 1px solid rgba(67, 143, 255, 0.3);
        }
        .pill-low {
          background-color: rgba(255, 180, 171, 0.15);
          color: var(--error);
          border: 1px solid rgba(255, 180, 171, 0.3);
        }
        .pill-unmark {
          background-color: transparent;
          color: var(--outline);
          border: 1px solid var(--outline-variant);
        }
        .icon-small {
          font-size: 1.1rem;
          display: flex;
          align-items: center;
        }
      `}</style>
    </Layout>
  );
}
