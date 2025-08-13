'use client';

import { useState, useEffect } from 'react';
import { LabelEntry } from '../lib/types';
import { readEntriesFromStorage, deleteEntryFromStorage, appendEntryToStorage } from '../lib/clientStorage';

export default function Home() {
  const [entries, setEntries] = useState<LabelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'sheet'>('table');
  const [forceUpdate, setForceUpdate] = useState(0);

  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: prompt('Enter your secret to delete this entry:'),
          entryId,
        }),
      });

      if (response.ok) {
        // Remove from local state and local storage
        const updatedEntries = entries.filter(entry => entry.id !== entryId);
        setEntries(updatedEntries);
        deleteEntryFromStorage(entryId);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      alert('Failed to delete entry');
    }
  };

  useEffect(() => {
    console.log('Component mounted, calling fetchData');
    fetchData();
  }, []);

  // Debug state changes
  useEffect(() => {
    console.log('Loading state changed:', loading);
  }, [loading]);

  useEffect(() => {
    console.log('Entries state changed:', entries.length, entries);
  }, [entries]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API first
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const data = await response.json();
          console.log('API response:', data);
          console.log('Setting entries:', data.entries);
          setEntries(data.entries || []);
          console.log('Setting loading to false');
          setLoading(false);
          // Force a re-render
          setForceUpdate(prev => prev + 1);
          return;
        } else {
          console.log('API response not ok:', response.status);
        }
      } catch (apiError) {
        console.log('API not available, using local storage:', apiError);
      }
      
      // Fallback to local storage for local development
      console.log('Falling back to local storage');
      const localEntries = readEntriesFromStorage();
      setEntries(localEntries);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const downloadSheet = async () => {
    // Create a canvas to generate the sheet image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to A4 (21cm x 29.7cm) at 300 DPI
    // 21cm = 8.27 inches, 29.7cm = 11.69 inches
    canvas.width = 2480; // 21 * 118.11 (300 DPI / 2.54 cm/inch)
    canvas.height = 3507; // 29.7 * 118.11

    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Page margins in pixels (300 DPI)
    const topMargin = 1.3 * 118.11; // 1.3cm
    const bottomMargin = 1.3 * 118.11; // 1.3cm
    const leftMargin = 2 * 118.11; // 2cm
    const rightMargin = 2 * 118.11; // 2cm

    // Label dimensions in pixels (300 DPI)
    const labelSize = 4 * 118.11; // 4cm x 4cm
    const verticalGap = 0.5 * 118.11; // 0.5cm
    const horizontalGap = 0.8 * 118.11; // 0.8cm

    // Calculate available space for grid
    const availableWidth = canvas.width - leftMargin - rightMargin;
    const availableHeight = canvas.height - topMargin - bottomMargin;

    // Calculate grid dimensions
    const labelsPerRow = 4;
    const labelsPerCol = 6;

    // Calculate starting position to center the grid
    const gridWidth = (labelsPerRow * labelSize) + ((labelsPerRow - 1) * horizontalGap);
    const gridHeight = (labelsPerCol * labelSize) + ((labelsPerCol - 1) * verticalGap);
    
    const startX = leftMargin + (availableWidth - gridWidth) / 2;
    const startY = topMargin + (availableHeight - gridHeight) / 2;

    // Process entries sequentially to avoid async issues
    for (let index = 0; index < Math.min(entries.length, labelsPerRow * labelsPerCol); index++) {
      const entry = entries[index];
      const row = Math.floor(index / labelsPerRow);
      const col = index % labelsPerRow;
      
      const x = startX + (col * (labelSize + horizontalGap));
      const y = startY + (row * (labelSize + verticalGap));

      // Draw label border
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, labelSize, labelSize);

      // Draw label content - optimized spacing to use more space
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      
             // Cage (top, larger font)
       ctx.font = 'bold 40px Arial';
       ctx.fillText(entry.cage, x + labelSize/2, y + 60);

       // Name (middle, no label)
       ctx.font = 'bold 32px Arial';
       const name = entry.name || entry.egg_id;
       ctx.fillText(name, x + labelSize/2, y + 120);

      // Egg ID (below cage, no label)
      ctx.font = '28px Arial';
      ctx.fillText(entry.egg_id, x + labelSize/2, y + 160);

      // QR Code (below egg ID, centered)
      try {
        // Fetch the QR code image
        const qrResponse = await fetch(`/api/qr?link=${encodeURIComponent(entry.link)}`);
        if (qrResponse.ok) {
          const qrBlob = await qrResponse.blob();
          const qrImage = await createImageBitmap(qrBlob);
          
          // Draw the actual QR code image
          const qrSize = 250; // Increased size for better visibility
          const qrX = x + (labelSize - qrSize) / 2;
          const qrY = y + 180; // Adjusted position to accommodate larger QR
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        } else {
          // Fallback: draw QR placeholder if image fetch fails
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          const qrSize = 120;
          const qrX = x + (labelSize - qrSize) / 2;
          const qrY = y + 180;
          ctx.strokeRect(qrX, qrY, qrSize, qrSize);
          ctx.font = '16px Arial';
          ctx.fillText('QR', x + labelSize/2, qrY + qrSize + 20);
        }
      } catch (error) {
        // Fallback: draw QR placeholder if image fetch fails
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        const qrSize = 120;
        const qrX = x + (labelSize - qrSize) / 2;
        const qrY = y + 180;
        ctx.strokeRect(qrX, qrY, qrSize, qrSize);
        ctx.font = '16px Arial';
        ctx.fillText('QR', x + labelSize/2, qrY + qrSize + 20);
      }
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'egg-labels-sheet.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <h1>Egg Label Tracker</h1>
        </div>
        <div className="content">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="header">
          <h1>Egg Label Tracker</h1>
        </div>
        <div className="content">
          <p>Error: {error}</p>
          <button onClick={fetchData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Egg Label Tracker</h1>
      </div>
      <div className="content">
        {/* Debug Info */}
        <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0', borderRadius: '4px' }}>
          <strong>Debug Info:</strong> Loading: {loading.toString()}, Entries: {entries.length}, Active Tab: {activeTab}, Force Update: {forceUpdate}
          <button 
            onClick={() => {
              console.log('Manual refresh clicked');
              setForceUpdate(prev => prev + 1);
            }}
            style={{ marginLeft: '10px', padding: '5px 10px' }}
          >
            Force Refresh
          </button>
        </div>
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            Table View
          </button>
          <button 
            className={`tab-btn ${activeTab === 'sheet' ? 'active' : ''}`}
            onClick={() => setActiveTab('sheet')}
          >
            Label Sheet
          </button>
        </div>

        {/* Local Development Test Form */}
        <div className="dev-form">
          <h3>Add Test Entry (Local Development)</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const newEntry: LabelEntry = {
              id: crypto.randomUUID(),
              egg_id: formData.get('egg_id') as string,
              name: formData.get('name') as string,
              cage: formData.get('cage') as string,
              link: `https://www.notion.so/${formData.get('egg_id')}`,
              createdAt: new Date().toISOString(),
            };
            appendEntryToStorage(newEntry);
            setEntries([...entries, newEntry]);
            (e.target as HTMLFormElement).reset();
          }}>
            <div className="form-row">
              <input name="egg_id" placeholder="Egg ID" required />
              <input name="name" placeholder="Name" required />
              <input name="cage" placeholder="Cage" required />
              <button type="submit">Add Entry</button>
            </div>
          </form>
        </div>

        {/* Table View */}
        {activeTab === 'table' && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Egg ID</th>
                  <th>Name</th>
                  <th>Cage</th>
                  <th>Task/Link</th>
                  <th>QR Preview</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                      No entries found. Add your first egg label!
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.egg_id}</td>
                      <td>{entry.name}</td>
                      <td>{entry.cage}</td>
                      <td>
                        <a 
                          href={entry.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'none' }}
                        >
                          {entry.link.length > 50 ? `${entry.link.substring(0, 50)}...` : entry.link}
                        </a>
                      </td>
                      <td>
                        <img 
                          src={`/api/qr?link=${encodeURIComponent(entry.link)}`}
                          alt="QR Code"
                          className="qr-preview"
                        />
                      </td>
                      <td className="timestamp">{formatDate(entry.createdAt)}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="delete-btn"
                          title="Delete this entry"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Label Sheet View */}
        {activeTab === 'sheet' && (
          <div className="sheet-section">
            <div className="sheet-controls">
              <button 
                onClick={downloadSheet}
                className="download-btn"
                disabled={entries.length === 0}
              >
                Download Sheet as PNG
              </button>
              <p className="sheet-info">A4 (21cm x 29.7cm) - 4cm x 4cm labels, 4x6 grid layout</p>
            </div>
            
            <div className="sheet-preview">
              <div className="sheet-container">
                {entries.length === 0 ? (
                  <div className="no-entries">
                    <p>No entries found. Add some egg labels first!</p>
                  </div>
                ) : (
                  <div className="labels-grid">
                    {entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="label-item"
                        onMouseEnter={() => setHoveredId(entry.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                                                 <div className="label-content">
                           <div className="label-cage">{entry.cage}</div>
                           <div className="label-name">{entry.name || entry.egg_id}</div>
                           <div className="egg-id">{entry.egg_id}</div>
                         </div>
                        
                        <div className="qr-placeholder">
                          <img 
                            src={`/api/qr?link=${encodeURIComponent(entry.link)}`}
                            alt="QR Code"
                            className="qr-box"
                          />
                        </div>

                        {hoveredId === entry.id && (
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(entry.id)}
                            title="Delete this entry"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
