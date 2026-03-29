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
  const [searchTerm, setSearchTerm] = useState('');
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

  const totalItems = inventory.length;
  const itemsIssued = inventory.reduce((acc, curr) => acc + (curr.issuedStock || 0), 0);
  const totalStockSum = inventory.reduce((acc, curr) => acc + (curr.totalStock || 0), 0);
  const depletedItems = inventory.filter(inv => {
    const total = parseInt(inv.totalStock, 10) || 0;
    const issued = parseInt(inv.issuedStock, 10) || 0;
    const returned = parseInt(inv.returnedStock, 10) || 0;
    const available = total - issued + returned;
    return total > 0 && available <= 0;
  }).length;
  
  // Table Data Preparation
  const tableData = inventory.map(item => {
    const total = parseInt(item.totalStock, 10) || 0;
    const issued = parseInt(item.issuedStock, 10) || 0;
    const returned = parseInt(item.returnedStock, 10) || 0;
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
      returned,
      available,
      status,
      variant
    };
  });

  const columns = [
    { header: 'Item Name', accessorKey: 'itemName' },
    { header: 'Total Base Stock', accessorKey: 'total', align: 'right' },
    { 
      header: <span style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px'}}><span style={{color:'var(--outline)', fontSize:'1.1em', fontWeight:400}}>-</span> Issued</span>, 
      accessorKey: 'issued', align: 'right' 
    },
    { 
      header: <span style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px'}}><span style={{color:'var(--outline)', fontSize:'1.1em', fontWeight:400}}>+</span> Returned</span>, 
      accessorKey: 'returned', align: 'right' 
    },
    { 
      header: <span style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px'}}><span style={{color:'var(--outline)', fontSize:'1.1em', fontWeight:400}}>=</span> Available</span>, 
      accessorKey: 'available', align: 'right' 
    },
    { 
      header: 'Status', 
      cell: (row) => <Badge variant={row.variant}>{row.status}</Badge>
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="action-buttons">
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
          <h1 className="headline">Inventory Management</h1>
          <p className="subtitle" style={{display: 'flex', alignItems: 'center', gap: '0.4rem'}}>
            <span className="live-dot pulse"></span>
            Showing {totalItems} Items
          </p>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div className="search-bar-wrap">
            <span className="material-symbols-outlined search-icon">search</span>
            <input 
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="primary-gradient action-btn" onClick={() => setShipmentModalOpen(true)}>
            <span className="material-symbols-outlined">local_shipping</span>
            Log Shipment
          </button>
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric">
          <span className="metric-val">{totalItems}</span>
          <span className="metric-label">Total Item Types</span>
        </div>
        <div className="metric">
          <span className="metric-val">{totalStockSum}</span>
          <span className="metric-label">Total Base Stock</span>
        </div>
        <div className="metric">
          <span className="metric-val">{itemsIssued}</span>
          <span className="metric-label">Items In Use</span>
        </div>
        <div className="metric warning">
          <span className="metric-val">{depletedItems}</span>
          <span className="metric-label">DEPLETED ITEMS</span>
        </div>
      </div>

      {loading ? (
        <p>Loading inventory data...</p>
      ) : (
        <DataTable 
          columns={columns} 
          data={tableData.filter(item => item.itemName.toLowerCase().includes(searchTerm.toLowerCase()))} 
        />
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
        .icon-small {
          font-size: 1.1rem;
          display: flex;
          align-items: center;
        }
        .search-bar-wrap { position: relative; }
        .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--outline); font-size: 1.25rem; pointer-events: none; }
        .search-input { padding: 0.75rem 1rem 0.75rem 2.5rem; border-radius: 0.5rem; border: 1px solid var(--outline-variant); background: var(--surface-container-high); color: var(--on-surface); font-family: 'Inter', sans-serif; width: 250px; }
        .search-input:focus { outline: none; border-color: var(--primary); }
      `}</style>
    </Layout>
  );
}
