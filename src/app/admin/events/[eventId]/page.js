"use client";

import { use, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import KPICard from '@/components/KPICard';
import Modal from '@/components/Modal';
import { getEvent, getTransactions, getInventoryStock, updateStock, addTransaction, getTickets } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EventDetailPage({ params }) {
  const unwrappedParams = use(params);
  const { eventId } = unwrappedParams;
  const { user } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form states
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');

  const fetchAllData = async () => {
    try {
      const [ev, allTx, inv, allTickets] = await Promise.all([
        getEvent(eventId),
        getTransactions(),
        getInventoryStock(),
        getTickets()
      ]);
      if (ev) setEvent(ev);
      
      const eventTx = allTx.filter(t => t.eventId === eventId);
      eventTx.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(eventTx);
      setInventory(inv);
      
      const eventTickets = allTickets.filter(t => t.eventId === eventId || t.clubId === ev?.clubId);
      setTickets(eventTickets);
    } catch (err) {
      console.error("Error fetching event details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [eventId]);

  if (loading) return <Layout adminOnly={true}><p>Connecting to secure node...</p></Layout>;
  if (!event) return <Layout adminOnly={true}><p>Event databank not found.</p></Layout>;

  // Compute Event Specific KPIs
  const requestedItems = event.inventoryRequests || {};
  let totalReq = 0;
  let totalIss = 0;
  let totalRet = 0;

  const itemBreakdown = Object.keys(requestedItems).map(itemName => {
    const requested = parseInt(requestedItems[itemName], 10) || 0;
    const itemTx = transactions.filter(t => t.itemName === itemName);
    const issued = itemTx.filter(t => t.type === 'Issuance').reduce((sum, t) => sum + (t.quantity || 0), 0);
    const returned = itemTx.filter(t => t.type === 'Return').reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    totalReq += requested;
    totalIss += issued;
    totalRet += returned;

    const pending = Math.max(0, requested - issued);
    const inUse = Math.max(0, issued - returned);

    let status = 'Pending';
    let variant = 'error';
    if (issued >= requested && returned === issued && issued > 0) {
      status = 'Returned';
      variant = 'default';
    } else if (issued >= requested) {
      status = 'Fully Issued';
      variant = 'success';
    } else if (issued > 0) {
      status = 'Partial';
      variant = 'warning';
    }

    return { itemName, requested, issued, inUse, pending, returned, status, variant };
  });

  const totalPending = Math.max(0, totalReq - totalIss);

  const itemColumns = [
    { header: 'Inventory Type', accessorKey: 'itemName' },
    { header: 'Requested', accessorKey: 'requested', align: 'right' },
    { header: 'Issued', accessorKey: 'issued', align: 'right' },
    { header: 'In Use', accessorKey: 'inUse', align: 'right' },
    { header: 'Pending', accessorKey: 'pending', align: 'right' },
    { header: 'Returned', accessorKey: 'returned', align: 'right' },
    { 
      header: 'Status', 
      cell: (row) => <Badge variant={row.variant}>{row.status}</Badge> 
    }
  ];

  // --- Modal Logic ---
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    
    const qty = parseInt(quantity, 10);
    if (!selectedItemId || isNaN(qty) || qty <= 0) {
      alert("Invalid selection or quantity.");
      setActionLoading(false);
      return;
    }

    const item = inventory.find(i => i.id === selectedItemId);
    const available = (item.totalStock || 0) - (item.issuedStock || 0) + (item.returnedStock || 0);

    if (qty > available) {
      alert(`Cannot issue ${qty}. Only ${available} available.`);
      setActionLoading(false);
      return;
    }

    try {
      await updateStock(item.id, { issuedStock: (item.issuedStock || 0) + qty });
      await addTransaction({
        type: 'Issuance',
        itemName: item.itemName,
        itemId: item.id,
        quantity: qty,
        eventId: event.id,
        eventName: event.eventName,
        clubId: event.clubId,
        clubName: event.clubName,
        location: event.location,
        userId: user?.uid,
        userName: user?.displayName,
        day: 'Day 1'
      });
      setIsIssueOpen(false);
      setQuantity('');
      setSelectedItemId('');
      fetchAllData();
    } catch (err) {
      console.error(err);
      alert("Failed to issue inventory.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    
    const qty = parseInt(quantity, 10);
    if (!selectedItemId || isNaN(qty) || qty <= 0) {
      alert("Invalid selection or quantity.");
      setActionLoading(false);
      return;
    }

    const item = inventory.find(i => i.id === selectedItemId);
    
    // Find the breakdown instance for this item to ensure they aren't returning more than they have in use.
    // If it's not in the breakdown (wasn't requested but was magically issued), we calculate from transactions
    const itemTx = transactions.filter(t => t.itemId === item.id);
    const issuedToEvent = itemTx.filter(t => t.type === 'Issuance').reduce((sum, t) => sum + (t.quantity || 0), 0);
    const returnedByEvent = itemTx.filter(t => t.type === 'Return').reduce((sum, t) => sum + (t.quantity || 0), 0);
    const currentlyInUse = issuedToEvent - returnedByEvent;

    if (qty > currentlyInUse) {
      alert(`Cannot return ${qty}. Only ${currentlyInUse} ${item.itemName} are currently in use by this event.`);
      setActionLoading(false);
      return;
    }

    try {
      await updateStock(item.id, { returnedStock: (item.returnedStock || 0) + qty });
      await addTransaction({
        type: 'Return',
        itemName: item.itemName,
        itemId: item.id,
        quantity: qty,
        eventId: event.id,
        eventName: event.eventName,
        clubId: event.clubId,
        clubName: event.clubName,
        location: event.location,
        userId: user?.uid,
        userName: user?.displayName,
        day: 'Day 1'
      });
      setIsReturnOpen(false);
      setQuantity('');
      setSelectedItemId('');
      fetchAllData();
    } catch (err) {
      console.error(err);
      alert("Failed to return inventory.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout adminOnly={true}>
      <div className="breadcrumb">
        <Link href="/admin/dashboard" className="back-link btn-secondary-style">
          <span className="material-symbols-outlined">west</span>
          Return to Command Centre
        </Link>
      </div>

      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="headline club-title">{event.clubName}</h1>
            <div className="meta-row">
              <span className="meta-item"><span className="material-symbols-outlined">event</span>{event.eventName}</span>
              <span className="meta-item"><span className="material-symbols-outlined">location_on</span>{event.location}</span>
              <span className="meta-item"><span className="material-symbols-outlined">badge</span>{event.coordinatorName || 'Unknown Coord'} ({event.contact || 'No Comm'})</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-secondary fade-btn" onClick={() => setIsReturnOpen(true)}>Return Inventory</button>
            <button className="btn-primary primary-gradient" onClick={() => setIsIssueOpen(true)}>Issue Inventory</button>
          </div>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KPICard title="Tickets Raised" value={tickets.length} highlight={tickets.length > 0} icon="confirmation_number" />
        <KPICard title="Total Issued" value={totalIss} icon="check_circle" />
        <KPICard title="Total Returned" value={totalRet} subtitle="Total items returned safely" icon="inventory_2" />
      </div>

      <div className="content-grid">
        <div className="main-col">
          <div className="section-header">
            <h2 className="headline" style={{fontSize: '1.25rem'}}>Assigned Inventory</h2>
            <span className="badge-outline">{itemBreakdown.length} INVENTORY TYPES</span>
          </div>
          <DataTable columns={itemColumns} data={itemBreakdown} />
        </div>

        <div className="side-col">
          <div className="glass-panel side-panel" style={{marginBottom: '1.5rem'}}>
            <h3 className="headline" style={{fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--surface-container)', paddingBottom: '0.75rem'}}>Special Requirements</h3>
            <p style={{color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>
              {event.specialRequirements && event.specialRequirements.trim() !== '' && event.specialRequirements.trim().toLowerCase() !== 'no' 
                ? event.specialRequirements 
                : "No special requirements registered for this event."}
            </p>
          </div>

          <div className="glass-panel side-panel">
            <h3 className="headline" style={{fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--surface-container)', paddingBottom: '0.75rem'}}>Tickets Raised</h3>
            {tickets.length === 0 ? (
              <p style={{color: 'var(--outline)', fontSize: '0.875rem'}}>No tickets raised.</p>
            ) : (
              <div className="ticket-list" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {tickets.map(t => (
                  <div key={t.id} className="ticket-item" style={{paddingBottom: '1rem', borderBottom: '1px solid var(--surface-container)'}}>
                     <div style={{display: 'flex', marginBottom: '0.5rem', alignItems: 'center'}}>
                       <span style={{fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'Space Grotesk, sans-serif', textTransform: 'uppercase'}}>
                         <span className="material-symbols-outlined" style={{fontSize: '0.875rem'}}>location_on</span>
                         {t.location || 'Unknown Location'}
                       </span>
                     </div>
                     <p style={{fontSize: '0.875rem', color: 'var(--on-surface)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{t.description}</p>
                     {t.status && (
                       <div style={{marginTop: '0.5rem'}}>
                         <Badge variant={t.status === 'Open' ? 'warning' : 'success'}>{t.status}</Badge>
                       </div>
                     )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Issue Modal --- */}
      <Modal isOpen={isIssueOpen} onClose={() => { setIsIssueOpen(false); setSelectedItemId(''); setQuantity(''); }} title={`Issue to ${event.clubName}`}>
        <form onSubmit={handleIssueSubmit} className="stock-form">
          <div className="form-group">
             <label>Select Inventory Type</label>
             <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} required>
               <option value="" disabled>-- Choose an Item --</option>
               {inventory.map(inv => {
                 const available = (inv.totalStock || 0) - (inv.issuedStock || 0) + (inv.returnedStock || 0);
                 return (
                   <option key={inv.id} value={inv.id} disabled={available === 0}>
                     {inv.itemName} ({available} available)
                   </option>
                 );
               })}
             </select>
          </div>
          <div className="form-group">
             <label>Quantity</label>
             <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 5" required min="1" />
          </div>
          <div className="form-actions">
             <button type="button" className="btn-secondary fade-btn" onClick={() => setIsIssueOpen(false)} disabled={actionLoading}>Cancel</button>
             <button type="submit" className="btn-primary primary-gradient" disabled={actionLoading || !selectedItemId}>
               {actionLoading ? 'Processing...' : 'Confirm Issuing'}
             </button>
          </div>
        </form>
      </Modal>

      {/* --- Return Modal --- */}
      <Modal isOpen={isReturnOpen} onClose={() => { setIsReturnOpen(false); setSelectedItemId(''); setQuantity(''); }} title={`Process Return from ${event.clubName}`}>
        <form onSubmit={handleReturnSubmit} className="stock-form">
          <div className="form-group">
             <label>Select Inventory Type Expected</label>
             <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} required>
               <option value="" disabled>-- Items Currently In Use --</option>
               {inventory.filter(inv => {
                  const itemTx = transactions.filter(t => t.itemId === inv.id);
                  const issuedToEvent = itemTx.filter(t => t.type === 'Issuance').reduce((sum, t) => sum + (t.quantity || 0), 0);
                  const returnedByEvent = itemTx.filter(t => t.type === 'Return').reduce((sum, t) => sum + (t.quantity || 0), 0);
                  return (issuedToEvent - returnedByEvent) > 0;
               }).map(inv => {
                  const itemTx = transactions.filter(t => t.itemId === inv.id);
                  const issuedToEvent = itemTx.filter(t => t.type === 'Issuance').reduce((sum, t) => sum + (t.quantity || 0), 0);
                  const returnedByEvent = itemTx.filter(t => t.type === 'Return').reduce((sum, t) => sum + (t.quantity || 0), 0);
                  const inUse = issuedToEvent - returnedByEvent;
                  return (
                   <option key={inv.id} value={inv.id}>
                     {inv.itemName} ({inUse} currently borrowed)
                   </option>
                 );
               })}
             </select>
          </div>
          <div className="form-group">
             <label>Quantity Returned</label>
             <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 5" required min="1" />
          </div>
          <div className="form-actions">
             <button type="button" className="btn-secondary fade-btn" onClick={() => setIsReturnOpen(false)} disabled={actionLoading}>Cancel</button>
             <button type="submit" className="btn-primary primary-gradient" disabled={actionLoading || !selectedItemId}>
               {actionLoading ? 'Processing...' : 'Confirm Return'}
             </button>
          </div>
        </form>
      </Modal>

      <style jsx global>{`
        .breadcrumb { margin-bottom: 2rem; }
        .btn-secondary-style { 
          display: inline-flex; align-items: center; gap: 0.5rem; 
          background: var(--surface-container-high); color: var(--on-surface); 
          border: 1px solid var(--surface-container-highest); border-radius: 0.5rem; 
          padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; 
          text-decoration: none; transition: background 0.2s, border-color 0.2s; 
        }
        .btn-secondary-style:hover { background: var(--surface-container-highest); border-color: var(--outline-variant); }
        
        .page-header { margin-bottom: 2.5rem; }
        .header-content { display: flex; justify-content: space-between; align-items: flex-start; }
        .header-actions { display: flex; gap: 1rem; }
        
        button { padding: 0.625rem 1.25rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; }
        .fade-btn { background: transparent; border: 1px solid var(--outline-variant); color: var(--on-surface); }
        .fade-btn:hover { background: var(--surface-container-high); border-color: var(--outline); }
        .btn-primary { border: none; color: white; }
        .primary-gradient { background: linear-gradient(135deg, var(--primary), var(--secondary)); }
        
        .club-title { font-size: 3rem; letter-spacing: 0em; margin-bottom: 0.75rem; text-transform: none; color: var(--on-surface); }
        .meta-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .meta-item { display: flex; align-items: center; gap: 0.375rem; color: var(--outline); font-family: 'Space Grotesk', sans-serif; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-item .material-symbols-outlined { font-size: 1.125rem; color: var(--primary); }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
        
        .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .badge-outline { font-size: 0.75rem; color: var(--outline); font-weight: 600; padding: 0.25rem 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif;}
        
        .side-panel { padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--surface-container-high); background: rgba(255,255,255,0.02); }
        
        .timeline { position: relative; padding-left: 1.5rem; }
        .timeline::before { content: ''; position: absolute; left: 0.375rem; top: 0; bottom: 0; width: 2px; background-color: var(--surface-container); }
        .timeline-item { position: relative; margin-bottom: 1.25rem; }
        .timeline-item:last-child { margin-bottom: 0; }
        .timeline-marker { position: absolute; left: -1.375rem; top: 0.25rem; width: 0.5rem; height: 0.5rem; border-radius: 50%; background-color: var(--tertiary); border: 2px solid var(--surface-container-low); }
        .timeline-text { font-size: 0.875rem; color: var(--on-surface); margin-bottom: 0.25rem; line-height: 1.3;}
        .timeline-meta { display: flex; justify-content: space-between; align-items: center; }
        .timeline-time { font-size: 0.75rem; color: var(--outline); }
        .timeline-user { font-size: 0.65rem; color: var(--outline-variant); background: rgba(255,255,255,0.05); padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
        
        /* Modal Form Styles */
        .stock-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-size: 0.875rem; color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.05em; }
        .form-group input, .form-group select { padding: 0.75rem 1rem; background-color: var(--surface-container-highest); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-size: 1rem; font-family: 'Inter', sans-serif; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }
        .form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
      `}</style>
    </Layout>
  );
}
