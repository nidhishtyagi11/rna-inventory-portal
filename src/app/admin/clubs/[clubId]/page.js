"use client";

import { use, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import Badge from '@/components/Badge';
import KPICard from '@/components/KPICard';
import { getClubs, getEvents, getTransactions, getInventoryStock, updateStock, addTransaction, getTickets } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function ClubDetailPage({ params }) {
  const unwrappedParams = use(params);
  const { clubId } = unwrappedParams;
  const { user } = useAuth();

  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for tabular bulk issue/return
  const [actionAmounts, setActionAmounts] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAllData = async () => {
    try {
      const [allClubs, allEvents, allTx, inv, allTickets] = await Promise.all([
        getClubs(),
        getEvents(),
        getTransactions(),
        getInventoryStock(),
        getTickets()
      ]);

      const foundClub = allClubs.find(c => c.id === clubId);
      if (foundClub) setClub(foundClub);

      const clubEvents = allEvents.filter(e => e.clubId === clubId);
      setEvents(clubEvents);

      const clubTx = allTx.filter(t => t.clubId === clubId);
      clubTx.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(clubTx);

      setInventory(inv);

      const clubEventIds = clubEvents.map(e => e.id);
      const clubTickets = allTickets.filter(t =>
        t.clubId === clubId || clubEventIds.includes(t.eventId)
      );
      setTickets(clubTickets);
    } catch (err) {
      console.error("Error fetching club details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [clubId]);

  if (loading) return <Layout adminOnly={true}><p>Loading club data...</p></Layout>;
  if (!club) return <Layout adminOnly={true}><p>Club not found.</p></Layout>;

  const requestedItems = club.inventoryRequests || {};
  let totalReq = 0;
  let totalIss = 0;
  let totalRet = 0;

  const itemBreakdown = Object.keys(requestedItems).map(itemName => {
    const requested = parseInt(requestedItems[itemName], 10) || 0;
    const itemTx = transactions.filter(t => t.itemName === itemName && !t.isUndone);
    const issued = itemTx.filter(t => t.type === 'Issuance').reduce((sum, t) => sum + (t.quantity || 0), 0);
    const returned = itemTx.filter(t => t.type === 'Return').reduce((sum, t) => sum + (t.quantity || 0), 0);

    totalReq += requested;
    totalIss += issued;
    totalRet += returned;

    let dotColor = 'var(--error)'; // not issued
    if (requested > 0 && issued >= requested && returned >= issued) dotColor = '#abc7fb'; // fully returned
    else if (issued >= requested) dotColor = 'var(--success, #64dc8c)'; // fully
    else if (issued > 0) dotColor = 'var(--warning, #ffca28)'; // partial

    const invItem = inventory.find(i => i.itemName === itemName);
    let available = 0;
    if (invItem) {
      available = (invItem.totalStock || 0) - (invItem.issuedStock || 0) + (invItem.returnedStock || 0);
    }

    return { itemName, requested, issued, returned, dotColor, available };
  });

  const handleActionInputChange = (itemName, val) => {
    setActionAmounts(prev => ({
      ...prev,
      [itemName]: val
    }));
  };

  const handleBulkAction = async (actionType) => {
    setActionLoading(true);
    let successCount = 0;
    
    for (const item of itemBreakdown) {
      const inputVal = parseInt(actionAmounts[item.itemName], 10);
      if (isNaN(inputVal) || inputVal <= 0) continue;
      
      const inventoryItem = inventory.find(i => i.itemName === item.itemName);
      if (!inventoryItem) continue;

      if (actionType === 'Issue') {
        const available = (inventoryItem.totalStock || 0) - (inventoryItem.issuedStock || 0) + (inventoryItem.returnedStock || 0);
        if (inputVal > available) {
          alert(`Cannot issue ${inputVal} ${item.itemName}. Only ${available} available in base stock.`);
          continue;
        }
        await updateStock(inventoryItem.id, { issuedStock: (inventoryItem.issuedStock || 0) + inputVal });
        await addTransaction({
          type: 'Issuance',
          itemName: item.itemName,
          itemId: inventoryItem.id,
          quantity: inputVal,
          clubId: club.id,
          clubName: club.name,
          userId: user?.uid,
          userName: user?.displayName,
          day: 'Day 1'
        });
        successCount++;
      } else if (actionType === 'Return') {
        const currentlyInUse = item.issued - item.returned;
        if (inputVal > currentlyInUse) {
          alert(`Cannot return ${inputVal} ${item.itemName}. Only ${currentlyInUse} currently in use by this club.`);
          continue;
        }
        await updateStock(inventoryItem.id, { returnedStock: (inventoryItem.returnedStock || 0) + inputVal });
        await addTransaction({
          type: 'Return',
          itemName: item.itemName,
          itemId: inventoryItem.id,
          quantity: inputVal,
          clubId: club.id,
          clubName: club.name,
          userId: user?.uid,
          userName: user?.displayName,
          day: 'Day 1'
        });
        successCount++;
      }
    }

    if (successCount > 0) {
      setActionAmounts({});
      fetchAllData();
    }
    setActionLoading(false);
  };

  const itemColumns = [
    { 
      header: 'Status', 
      cell: (row) => (
        <div style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: row.dotColor, margin: '0 auto'}} title={`${row.issued}/${row.requested} Issued`} />
      ),
      align: 'center'
    },
    { header: 'Inventory Type', accessorKey: 'itemName' },
    { header: 'Req.', accessorKey: 'requested', align: 'right' },
    { header: 'Issued', accessorKey: 'issued', align: 'right' },
    { header: 'Ret.', accessorKey: 'returned', align: 'right' },
    { header: 'Avail.', accessorKey: 'available', align: 'right' },
    {
      header: 'Action Amount',
      align: 'right',
      cell: (row) => (
        <input 
          type="number"
          min="0"
          max={row.requested}
          value={actionAmounts[row.itemName] || ''}
          onChange={(e) => handleActionInputChange(row.itemName, e.target.value)}
          className="inline-action-input"
          placeholder="0"
        />
      )
    }
  ];

  return (
    <Layout adminOnly={true}>
      <div className="breadcrumb">
        <Link href="/admin/dashboard" className="back-link btn-secondary-style">
          <span className="material-symbols-outlined">west</span>
          Return to Dashboard
        </Link>
      </div>

      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="headline club-title">{club.name}</h1>
            <div className="meta-row">
              {club.coordinatorName && (
                <span className="meta-item">
                  <span className="material-symbols-outlined">badge</span>
                  {club.coordinatorName}
                </span>
              )}
              {club.contact && (
                <span className="meta-item">
                  <span className="material-symbols-outlined">call</span>
                  {club.contact}
                </span>
              )}
              <span className="meta-item">
                <span className="material-symbols-outlined">event</span>
                {events.length} Event{events.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>



      <div className="content-grid">
        <div className="main-col">
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <KPICard title="Total Issued" value={totalIss} icon="check_circle" />
            <KPICard title="Total Returned" value={totalRet} icon="inventory_2" />
          </div>

          <div className="section-header">
            <h2 className="headline" style={{fontSize: '1.25rem'}}>Assigned Inventory</h2>
            <span className="badge-outline">{itemBreakdown.length} ITEM TYPES</span>
          </div>
          {itemBreakdown.length === 0 ? (
            <div style={{padding: '2rem', border: '1px solid var(--surface-container)', borderRadius: '0.5rem', color: 'var(--outline)'}}>
              No inventory requests found for this club.
            </div>
          ) : (
            <div className="table-container-wrap">
              <DataTable columns={itemColumns} data={itemBreakdown} />
              <div className="table-actions-footer">
                <button className="btn-secondary fade-btn" onClick={() => handleBulkAction('Return')} disabled={actionLoading}>
                  Return Inventory
                </button>
                <button className="btn-primary primary-gradient" onClick={() => handleBulkAction('Issue')} disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : 'Issue Inventory'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="side-col">
          {/* Events & Tickets per Event */}
          <div className="glass-panel side-panel" style={{marginBottom: '1.5rem'}}>
            <h3 className="headline" style={{fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--surface-container)', paddingBottom: '0.75rem'}}>
              Events & Active Tickets
            </h3>
            {events.length === 0 ? (
              <p style={{color: 'var(--outline)', fontSize: '0.875rem'}}>No events found for this club.</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                {events.map(ev => {
                  const eventTickets = tickets.filter(t => t.eventId === ev.id || t.eventName === ev.eventName);
                  const openCount = eventTickets.filter(t => t.status === 'Open').length;
                  return (
                    <div key={ev.id} className="event-ticket-row">
                      <div className="event-info">
                        <span className="material-symbols-outlined" style={{fontSize: '1rem', color: 'var(--primary)'}}>event</span>
                        <div>
                          <div style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--on-surface)'}}>{ev.eventName}</div>
                          {ev.location && <div style={{fontSize: '0.75rem', color: 'var(--outline)'}}>{ev.location}</div>}
                        </div>
                      </div>
                      <div className={`ticket-badge-pill ${openCount > 0 ? 'has-tickets' : 'no-tickets'}`}>
                        <span className="material-symbols-outlined" style={{fontSize: '0.875rem'}}>confirmation_number</span>
                        {openCount} ticket{openCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Special Requirements */}
          <div className="glass-panel side-panel" style={{marginBottom: '1.5rem'}}>
            <h3 className="headline" style={{fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--surface-container)', paddingBottom: '0.75rem'}}>Special Requirements</h3>
            <p style={{color: 'var(--on-surface-variant)', fontSize: '0.875rem', lineHeight: '1.5', whiteSpace: 'pre-wrap'}}>
              {club.specialRequirements && club.specialRequirements.trim() !== '' && club.specialRequirements.trim().toLowerCase() !== 'no'
                ? club.specialRequirements
                : "No special requirements registered for this club."}
            </p>
          </div>

          {/* Recent Transactions */}
          <div className="glass-panel side-panel">
            <h3 className="headline" style={{fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--surface-container)', paddingBottom: '0.75rem'}}>Recent Transactions</h3>
            {transactions.length === 0 ? (
              <p style={{color: 'var(--outline)', fontSize: '0.875rem'}}>No transactions yet.</p>
            ) : (
              <div className="timeline">
                {transactions.slice(0, 8).map(t => (
                  <div key={t.id} className="timeline-item">
                    <div className="timeline-marker" style={{backgroundColor: t.type === 'Issuance' ? 'var(--primary)' : t.type === 'Return' ? '#64dc8c' : 'var(--tertiary)'}}></div>
                    <div className="timeline-content">
                      <p className="timeline-text">
                        <strong>{t.type}</strong> — {t.itemName} × {t.quantity}
                      </p>
                      <div className="timeline-meta">
                        <span className="timeline-time">{t.timestamp ? new Date(t.timestamp.seconds ? t.timestamp.seconds * 1000 : t.timestamp).toLocaleString() : 'Unknown time'}</span>
                        {t.userName && <span className="timeline-user">{t.userName}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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

        button { padding: 0.625rem 1.25rem; font-family: 'Inter', sans-serif; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; }
        .fade-btn { background: transparent; border: 1px solid var(--outline-variant); color: var(--on-surface); }
        .fade-btn:hover { background: var(--surface-container-high); border-color: var(--outline); }
        .btn-primary { border: none; }
        .primary-gradient { background: #abc7fb; color: #040616 !important; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }

        .club-title { font-size: 3rem; letter-spacing: 0em; margin-bottom: 0.75rem; text-transform: none; color: var(--on-surface); }
        .meta-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .meta-item { display: flex; align-items: center; gap: 0.375rem; color: var(--outline); font-family: 'Space Grotesk', sans-serif; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .meta-item .material-symbols-outlined { font-size: 1.125rem; color: var(--primary); }

        .kpi-grid { display: grid; gap: 1.5rem; margin-bottom: 2.5rem; align-items: start; }
        .content-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .badge-outline { font-size: 0.75rem; color: var(--outline); font-weight: 600; padding: 0.25rem 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Space Grotesk', sans-serif; }

        .table-actions-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--surface-container); }
        .inline-action-input { width: 60px; padding: 0.375rem; border-radius: 0.375rem; border: 1px solid var(--outline-variant); background: var(--surface-container-high); color: var(--on-surface); font-family: 'Inter', sans-serif; text-align: center; }
        .inline-action-input:focus { outline: none; border-color: var(--primary); }
        /* hide spin buttons */
        .inline-action-input::-webkit-inner-spin-button, .inline-action-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .inline-action-input { -moz-appearance: textfield; }

        .side-panel { padding: 1.5rem; border-radius: 1rem; border: 1px solid var(--surface-container-high); background: rgba(255,255,255,0.02); }

        .event-ticket-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.625rem 0.75rem;
          background: var(--surface-container);
          border-radius: 0.5rem;
          gap: 0.5rem;
        }
        .event-info { display: flex; align-items: center; gap: 0.5rem; min-width: 0; flex: 1; }
        .ticket-badge-pill {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.625rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: 'Space Grotesk', sans-serif;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .ticket-badge-pill.has-tickets { background: rgba(255,180,171,0.12); color: var(--error); border: 1px solid rgba(255,180,171,0.3); }
        .ticket-badge-pill.no-tickets { background: var(--surface-container-high); color: var(--outline); border: 1px solid var(--outline-variant); }

        .timeline { position: relative; padding-left: 1.5rem; }
        .timeline::before { content: ''; position: absolute; left: 0.375rem; top: 0; bottom: 0; width: 2px; background-color: var(--surface-container); }
        .timeline-item { position: relative; margin-bottom: 1.25rem; }
        .timeline-item:last-child { margin-bottom: 0; }
        .timeline-marker { position: absolute; left: -1.375rem; top: 0.25rem; width: 0.5rem; height: 0.5rem; border-radius: 50%; border: 2px solid var(--surface-container-low); }
        .timeline-text { font-size: 0.875rem; color: var(--on-surface); margin-bottom: 0.25rem; line-height: 1.3; }
        .timeline-meta { display: flex; justify-content: space-between; align-items: center; }
        .timeline-time { font-size: 0.75rem; color: var(--outline); }
        .timeline-user { font-size: 0.65rem; color: var(--outline-variant); background: rgba(255,255,255,0.05); padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
      `}</style>
    </Layout>
  );
}
