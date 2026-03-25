"use client";

import { useState } from 'react';
import Layout from '@/components/Layout';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { globalSystemReset } from '@/lib/firestore';

// These are the exact column headers expected in the CSV.
// Quantities for each inventory item are club-level attributes.
const INVENTORY_ITEMS = [
  'Mattresses', 'Quilts', 'Tables', 'Tablecloths', 'Fans', 'Chairs',
  'Extension Boxes', 'LED Lights', 'Red Carpets', 'Green Carpets',
  'White Curtains', 'Coloured Curtains', 'Buckets', 'Mugs'
];

// Maximum number of events we support per club in the CSV schema
const MAX_EVENTS = 10;

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // System Reset States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPasswordText, setResetPasswordText] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Detect how many event columns exist in the CSV based on "Event N" header pattern
  const detectEventColumns = (fields) => {
    let maxN = 0;
    fields.forEach(f => {
      const m = f.trim().match(/^Event (\d+)$/i);
      if (m) maxN = Math.max(maxN, parseInt(m[1]));
    });
    return maxN;
  };

  const parseFile = (f) => {
    setFile(f);
    setFileName(f.name);
    setSuccess(false);
    setErrors([]);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results.data);
        validateData(results.data, results.meta.fields || []);
      }
    });
  };

  const validateData = (rows, fields) => {
    const errs = [];
    const eventCount = detectEventColumns(fields);
    if (eventCount === 0) errs.push('No "Event N / Location N" columns found. At minimum, add "Event 1" and "Location 1" columns.');
    rows.forEach((row, i) => {
      if (!row['Club Name']) errs.push(`Row ${i + 2}: Missing "Club Name"`);
      if (!row['Event 1']) errs.push(`Row ${i + 2}: Missing "Event 1"`);
      if (!row['Location 1']) errs.push(`Row ${i + 2}: Missing "Location 1"`);
    });
    setErrors(errs);
  };

  const handleFileInput = (e) => {
    const f = e.target.files[0];
    if (f) parseFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) parseFile(f);
  };

  const processUpload = async () => {
    if (!previewData.length || errors.length) return;
    setLoading(true);

    try {
      // --- Step 1: Ensure all inventory stock items exist ---
      const stockRef = collection(db, 'inventoryStock');
      const stockSnap = await getDocs(stockRef);
      const existingStock = {};
      stockSnap.docs.forEach(d => { existingStock[d.data().itemName] = d.id; });

      for (const item of INVENTORY_ITEMS) {
        if (!existingStock[item]) {
          const newDoc = await addDoc(stockRef, {
            itemName: item,
            totalStock: 0,
            issuedStock: 0,
            returnedStock: 0
          });
          existingStock[item] = newDoc.id;
        }
      }

      // --- Step 2: Process each row as a single Club ---
      const clubsRef = collection(db, 'clubs');
      const eventsRef = collection(db, 'events');

      // Detect max event count by scanning ALL rows (not just first),
      // to handle clubs with more events that appear later in the CSV.
      const allFieldSets = previewData.map(r => Object.keys(r));
      const mergedFields = [...new Set(allFieldSets.flat())];
      const eventCount = detectEventColumns(mergedFields);

      // Pre-load existing clubs to allow upsert (avoid duplicates on re-upload)
      const existingClubsSnap = await getDocs(clubsRef);
      const existingClubsByName = {};
      existingClubsSnap.docs.forEach(d => { existingClubsByName[d.data().name] = d.id; });

      let clubsCreated = 0;
      let eventsCreated = 0;

      for (const row of previewData) {
        if (!row['Club Name']) continue;

        // 2a. Build inventory requests (club-level)
        const inventoryRequests = {};
        for (const item of INVENTORY_ITEMS) {
          const val = parseInt(row[item], 10);
          if (!isNaN(val) && val > 0) {
            inventoryRequests[item] = val;
          }
        }

        const clubPayload = {
          name: row['Club Name'],
          coordinatorName: row['Coordinator Name'] || '',
          contact: row['Contact'] || '',
          email: row['Email'] || '',
          username: row['Username'] || '',
          password: row['Password'] || '',
          specialRequirements: row['Special Requirements'] || '',
          notes: row['Notes'] || '',
          inventoryRequests,
          createdAt: new Date().toISOString()
        };

        // 2b. Upsert club — reuse existing document if a club with this name exists
        let clubId = existingClubsByName[row['Club Name']];
        if (clubId) {
          // Update existing club document in place
          await updateDoc(doc(db, 'clubs', clubId), clubPayload);
          // Delete old events for this club so we recreate them cleanly
          const oldEvSnap = await getDocs(eventsRef);
          const delOld = oldEvSnap.docs
            .filter(d => d.data().clubId === clubId)
            .map(d => deleteDoc(doc(db, 'events', d.id)));
          await Promise.all(delOld);
        } else {
          const clubDoc = await addDoc(clubsRef, clubPayload);
          clubId = clubDoc.id;
          existingClubsByName[row['Club Name']] = clubId;
          clubsCreated++;
        }

        // 2c. Create each event linked to this club
        for (let n = 1; n <= eventCount; n++) {
          const eventName = row[`Event ${n}`];
          const location = row[`Location ${n}`];
          if (!eventName || !eventName.trim()) continue; // skip empty event slots

          await addDoc(eventsRef, {
            clubId,
            clubName: row['Club Name'],
            eventName: eventName.trim(),
            location: location ? location.trim() : '',
            createdAt: new Date().toISOString()
          });
          eventsCreated++;
        }
      }

      setSuccess(true);
      setPreviewData([]);
      setFile(null);
      setFileName('');
      alert(`✅ Successfully imported ${clubsCreated} clubs and ${eventsCreated} events from CSV!`);
    } catch (err) {
      console.error("CSV upload error:", err);
      alert(`❌ Import failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSystemReset = async (e) => {
    e.preventDefault();
    if (resetPasswordText !== 'SAC24@BITS') {
      setResetError('Incorrect system password.');
      return;
    }
    setResetError('');
    setIsResetting(true);
    try {
      await globalSystemReset();
      setShowResetModal(false);
      setResetPasswordText('');
      alert('✅ System format complete. Environment restored to baseline parameters.');
    } catch (err) {
      console.error(err);
      setResetError('Fatal reset sequence error.');
    } finally {
      setIsResetting(false);
    }
  };

  // Detect how many events ANY row has (scan ALL rows, not just first)
  const allPreviewFields = [...new Set(previewData.flatMap(r => Object.keys(r)))];
  const previewEventCount = detectEventColumns(allPreviewFields); // No cap - show all event columns

  return (
    <Layout adminOnly={true}>
      <div className="page-header header-spread">
        <div>
          <h1 className="headline">Data Initialization</h1>
          <p className="subtitle">Import clubs and events via CSV — one row per club</p>
        </div>
        <button 
          className="system-reset-btn" 
          onClick={() => { setShowResetModal(true); setResetError(''); setResetPasswordText(''); }}
        >
          <span className="material-symbols-outlined">warning</span>
          System Reset
        </button>
      </div>

      {/* Schema Reference */}
      <div className="schema-card glass-panel">
        <h3 className="schema-title">
          <span className="material-symbols-outlined">schema</span>
          Expected CSV Structure (One Row = One Club)
        </h3>
        <div className="schema-grid">
          <div className="schema-group">
            <span className="schema-label">Required</span>
            {['Club Name', 'Event 1', 'Location 1'].map(col => (
              <span key={col} className="schema-tag required">{col}</span>
            ))}
          </div>
          <div className="schema-group">
            <span className="schema-label">Multi-Event (repeat N times)</span>
            {['Event N', 'Location N'].map(col => (
              <span key={col} className="schema-tag optional">{col}</span>
            ))}
          </div>
          <div className="schema-group">
            <span className="schema-label">Club Attributes (optional)</span>
            {['Coordinator Name', 'Contact', 'Email', 'Username', 'Password', 'Special Requirements', 'Notes'].map(col => (
              <span key={col} className="schema-tag optional">{col}</span>
            ))}
          </div>
          <div className="schema-group">
            <span className="schema-label">Inventory Items (numeric, club-level)</span>
            {INVENTORY_ITEMS.map(item => (
              <span key={item} className="schema-tag item">{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`upload-zone glass-panel ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <span className="material-symbols-outlined upload-icon">cloud_upload</span>
        <h3>{fileName || 'Drag & drop your CSV here'}</h3>
        <p>{fileName ? `${previewData.length} clubs detected` : 'or click to browse your computer'}</p>
        <label className="browse-btn primary-gradient">
          Browse File
          <input type="file" accept=".csv" onChange={handleFileInput} hidden />
        </label>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="errors-panel">
          <h4>
            <span className="material-symbols-outlined">error</span>
            {errors.length} Validation {errors.length === 1 ? 'Error' : 'Errors'}
          </h4>
          <ul>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Preview Table */}
      {previewData.length > 0 && (
        <div className="preview-panel">
          <div className="preview-header">
            <h3 className="headline" style={{fontSize: '1.125rem'}}>
              Preview — {previewData.length} Clubs
            </h3>
            <button
              className="primary-gradient confirm-btn"
              onClick={processUpload}
              disabled={loading || errors.length > 0}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined spin">progress_activity</span>
                  Importing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">cloud_sync</span>
                  Confirm & Sync to Firestore
                </>
              )}
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Club Name</th>
                  {Array.from({length: previewEventCount}, (_, i) => (
                    <th key={i}>Event {i + 1} / Location</th>
                  ))}
                  <th>Special Req</th>
                  <th>Items Requested</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 20).map((row, idx) => {
                  const numItems = INVENTORY_ITEMS.reduce((sum, item) => {
                    const v = parseInt(row[item], 10);
                    return sum + (isNaN(v) || v <= 0 ? 0 : 1);
                  }, 0);
                  const hasError = !row['Club Name'] || !row['Event 1'];
                  return (
                    <tr key={idx} className={hasError ? 'row-error' : ''}>
                      <td className="row-num">{idx + 1}</td>
                      <td>{row['Club Name'] || <span className="missing">—</span>}</td>
                      {Array.from({length: previewEventCount}, (_, i) => (
                        <td key={i}>
                          <div style={{lineHeight: 1.3}}>
                            <div>{row[`Event ${i+1}`] || <span className="missing">—</span>}</div>
                            {row[`Location ${i+1}`] && <div style={{fontSize:'0.7rem', color:'var(--outline)'}}>{row[`Location ${i+1}`]}</div>}
                          </div>
                        </td>
                      ))}
                      <td>
                        <span className={`req-badge ${row['Special Requirements'] && row['Special Requirements'].trim() !== '' && row['Special Requirements'].trim().toLowerCase() !== 'no' ? 'yes' : 'no'}`}>
                          {row['Special Requirements'] && row['Special Requirements'].trim() !== '' && row['Special Requirements'].trim().toLowerCase() !== 'no' 
                            ? (row['Special Requirements'].length > 20 ? row['Special Requirements'].substring(0, 20) + '...' : row['Special Requirements'])
                            : 'None'}
                        </span>
                      </td>
                      <td className="items-count">{numItems} item types</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {previewData.length > 20 && (
              <p className="more-rows">+ {previewData.length - 20} more rows not shown in preview</p>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="success-banner">
          <span className="material-symbols-outlined">check_circle</span>
          Import complete! Head to the <a href="/admin/dashboard">Dashboard</a> to see your data.
        </div>
      )}

      {/* System Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h2 className="headline" style={{fontSize: '1.25rem', color: 'var(--error)'}}>DANGER: SYSTEM RESET</h2>
            <p className="subtitle" style={{marginBottom: '1.5rem', lineHeight: '1.4'}}>
               This action will irrevocably wipe all transaction records, reset physical inventory to baseline levels, wipe all special requirements, and clear existing ingested CSV maps.
            </p>
            <form onSubmit={handleSystemReset}>
              <div className="input-group">
                <label>System Administrator Passcode</label>
                <input 
                  type="password" 
                  autoFocus
                  required
                  placeholder="Enter override password"
                  value={resetPasswordText} 
                  onChange={(e) => setResetPasswordText(e.target.value)} 
                />
              </div>
              {resetError && <p className="error-text">{resetError}</p>}
              <div className="modal-actions" style={{marginTop: '1.5rem'}}>
                <button type="button" className="secondary-gradient btn" onClick={() => setShowResetModal(false)} disabled={isResetting}>Cancel</button>
                <button type="submit" className="danger-btn btn" disabled={isResetting}>
                  {isResetting ? 'Formatting...' : 'EXECUTE FORMAT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-header { margin-bottom: 2rem; }
        .header-spread { display: flex; justify-content: space-between; align-items: flex-start; }
        .system-reset-btn { background: rgba(242,139,130,0.1); color: var(--error); border: 1px solid rgba(242,139,130,0.3); padding: 0.5rem 1rem; border-radius: 0.5rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-family: 'Space Grotesk', sans-serif; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.75rem; }
        .system-reset-btn:hover { background: rgba(242,139,130,0.2); border-color: var(--error); box-shadow: 0 0 10px rgba(242,139,130,0.2); }
        .subtitle { color: var(--on-surface-variant); font-size: 0.875rem; margin-top: 0.25rem; }

        /* Schema */
        .schema-card {
          padding: 1.25rem 1.5rem;
          border-radius: 0.75rem;
          border: 1px solid var(--surface-container-high);
          margin-bottom: 1.5rem;
        }
        .schema-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--on-surface);
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .schema-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .schema-group { display: flex; flex-wrap: wrap; gap: 0.375rem; align-items: center; }
        .schema-label { font-size: 0.65rem; color: var(--outline); text-transform: uppercase; letter-spacing: 0.1em; margin-right: 0.25rem; min-width: 140px; }
        .schema-tag { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-family: 'Space Grotesk', monospace; }
        .schema-tag.required { background: rgba(242,139,130,0.12); color: #f28b82; border: 1px solid rgba(242,139,130,0.2); }
        .schema-tag.optional { background: rgba(255,255,255,0.05); color: var(--outline); border: 1px solid var(--surface-container-high); }
        .schema-tag.item { background: rgba(171,199,255,0.08); color: var(--primary); border: 1px solid rgba(171,199,255,0.15); }

        /* Upload zone */
        .upload-zone {
          padding: 3rem;
          border-radius: 1rem;
          border: 2px dashed var(--outline-variant);
          text-align: center;
          margin-bottom: 1.5rem;
          transition: border-color 0.2s, background 0.2s;
          cursor: default;
        }
        .upload-zone.dragging {
          border-color: var(--primary);
          background: rgba(171,199,255,0.05);
        }
        .upload-icon { font-size: 3rem; color: var(--primary); opacity: 0.8; margin-bottom: 0.75rem; }
        .upload-zone h3 { font-size: 1rem; color: var(--on-surface); margin-bottom: 0.5rem; }
        .upload-zone p { font-size: 0.875rem; color: var(--on-surface-variant); margin-bottom: 1.5rem; }
        .browse-btn {
          display: inline-block;
          padding: 0.625rem 1.5rem;
          border-radius: 2rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
        }

        /* Errors */
        .errors-panel {
          background: rgba(242,139,130,0.08);
          border: 1px solid rgba(242,139,130,0.2);
          border-radius: 0.5rem;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          color: #f28b82;
        }
        .errors-panel h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        .errors-panel ul { font-size: 0.8125rem; padding-left: 1.25rem; }
        .errors-panel li { margin-bottom: 0.25rem; }

        /* Preview */
        .preview-panel {
          background: var(--surface-container-low);
          border: 1px solid var(--surface-container-high);
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--surface-container);
        }
        .confirm-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          border: none;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: opacity 0.2s;
        }
        .confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        th { padding: 0.75rem 1rem; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--outline); background: var(--surface-container); text-align: left; }
        td { padding: 0.75rem 1rem; color: var(--on-surface); border-bottom: 1px solid var(--surface-container); }
        tr.row-error td { background: rgba(242,139,130,0.05); }
        .row-num { color: var(--outline); font-size: 0.75rem; font-family: monospace; }
        .missing { color: var(--error, #f28b82); }
        .items-count { color: var(--primary); font-family: 'Space Grotesk', sans-serif; }
        .req-badge { font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 0.25rem; }
        .req-badge.yes { background: rgba(242,139,130,0.12); color: #f28b82; }
        .req-badge.no { background: var(--surface-container); color: var(--outline); }
        .more-rows { text-align: center; padding: 1rem; font-size: 0.8125rem; color: var(--outline); font-style: italic; }

        /* Success */
        .success-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: rgba(100,220,140,0.08);
          border: 1px solid rgba(100,220,140,0.2);
          border-radius: 0.5rem;
          color: #64dc8c;
          font-size: 0.875rem;
        }
        .success-banner a { color: var(--primary); text-decoration: underline; }

        /* Modal Subsystems */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: var(--surface-container-low); padding: 2rem; border-radius: 1rem; width: 100%; max-width: 400px; border: 1px solid var(--error); box-shadow: 0 0 30px rgba(242, 139, 130, 0.15); }
        .input-group label { display: block; font-size: 0.75rem; color: var(--outline); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.1em; }
        .input-group input { width: 100%; padding: 0.75rem; background: var(--surface-container-high); border: 1px solid var(--outline-variant); border-radius: 0.5rem; color: var(--on-surface); font-family: 'Inter', sans-serif; transition: border-color 0.2s; }
        .input-group input:focus { outline: none; border-color: var(--error); }
        .error-text { color: var(--error); font-size: 0.75rem; margin-top: 0.5rem; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
        .btn { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: opacity 0.2s; border: none; }
        .btn:disabled { opacity: 0.5; }
        .secondary-gradient { background: var(--surface-container-high); color: var(--on-surface); border: 1px solid var(--outline-variant); }
        .danger-btn { background: #5c1813; color: #ffb4ab; border: 1px solid #ffb4ab; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </Layout>
  );
}
