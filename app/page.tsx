'use client';

import { useState, useEffect, useRef } from 'react';
import { LabelEntry } from '../lib/types';

export default function Home() {
  const [entries, setEntries] = useState<LabelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'table' | 'sheet'>('table');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggedEntry, setDraggedEntry] = useState<LabelEntry | null>(null);
  const [previewLayout, setPreviewLayout] = useState<(LabelEntry | null)[]>([]);
  const [currentEggNumber, setCurrentEggNumber] = useState<number>(0);
  const [resetNumber, setResetNumber] = useState<string>('');

  useEffect(() => {
    console.log('Component mounted, calling fetchData');
    fetchData();
    fetchCurrentEggNumber();
  }, []);

  useEffect(() => {
    // Initialize preview layout with entries in order (excluding reset entries)
    const layout = Array(24).fill(null);
    const nonResetEntries = entries.filter(entry => !entry.isReset);
    nonResetEntries.forEach((entry, index) => {
      if (index < 24) {
        layout[index] = entry;
      }
    });
    setPreviewLayout(layout);
  }, [entries]);

  const fetchData = async () => {
    try {
      console.log('Fetching data...');
      setLoading(true);
      
      const response = await fetch('/api/data');
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        setEntries(data.entries || []);
      } else {
        console.log('API failed, using empty array');
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentEggNumber = async () => {
    try {
      const response = await fetch('/api/egg-number');
      if (response.ok) {
        const data = await response.json();
        setCurrentEggNumber(data.currentEggNumber);
      }
    } catch (error) {
      console.error('Error fetching current egg number:', error);
    }
  };

  const handleResetEggNumber = async () => {
    const number = parseInt(resetNumber);
    if (isNaN(number) || number < 1) {
      alert('Please enter a valid positive number');
      return;
    }

    try {
      const response = await fetch('/api/egg-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentEggNumber(data.currentEggNumber);
        setResetNumber('');
        alert(`Egg number reset to ${number}`);
        await fetchData(); // Refresh data to show the reset entry
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error resetting egg number:', error);
      alert('Error resetting egg number');
    }
  };



  const handleDelete = async (entryId: string) => {
    console.log('Deleting entry:', entryId);
    
    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
        }),
      });
      
      console.log('Delete response status:', response.status);
      
      if (response.ok) {
        console.log('Entry deleted successfully');
        await fetchData(); // Refresh data
      } else {
        console.log('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleDragStart = (entry: LabelEntry, index: number) => {
    setDraggedEntry(entry);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (!draggedEntry) return;

    const newLayout = [...previewLayout];
    
    // Find the source index of the dragged entry
    const sourceIndex = newLayout.findIndex(item => item?.id === draggedEntry.id);
    
    if (sourceIndex !== -1) {
      // If target position is empty, move the entry
      if (newLayout[targetIndex] === null) {
        newLayout[targetIndex] = draggedEntry;
        newLayout[sourceIndex] = null;
      } else {
        // If target position has an entry, swap them
        const temp = newLayout[targetIndex];
        newLayout[targetIndex] = draggedEntry;
        newLayout[sourceIndex] = temp;
      }
      
      setPreviewLayout(newLayout);
    }
    
    setDraggedEntry(null);
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
     const labelSize = 4.3 * 118.11; // 4.3cm x 4.3cm
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
    for (let index = 0; index < labelsPerRow * labelsPerCol; index++) {
      const entry = previewLayout[index];
      if (!entry) continue;
      
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

  // Function to render the exact same layout as the print version
  const renderPrintLayout = () => {
    if (entries.length === 0) return null;

    // A4 dimensions in cm
    const pageWidth = 21; // cm
    const pageHeight = 29.7; // cm
    
    // Margins in cm
    const topMargin = 1.3;
    const bottomMargin = 1.3;
    const leftMargin = 2;
    const rightMargin = 2;
    
         // Label dimensions in cm
     const labelSize = 4.3; // 4.3cm x 4.3cm
     const verticalGap = 0.5; // 0.5cm
     const horizontalGap = 0.8; // 0.8cm
    
    // Grid dimensions
    const labelsPerRow = 4;
    const labelsPerCol = 6;
    
    // Calculate available space
    const availableWidth = pageWidth - leftMargin - rightMargin;
    const availableHeight = pageHeight - topMargin - bottomMargin;
    
    // Calculate grid dimensions
    const gridWidth = (labelsPerRow * labelSize) + ((labelsPerRow - 1) * horizontalGap);
    const gridHeight = (labelsPerCol * labelSize) + ((labelsPerCol - 1) * verticalGap);
    
    // Calculate starting position to center the grid
    const startX = leftMargin + (availableWidth - gridWidth) / 2;
    const startY = topMargin + (availableHeight - gridHeight) / 2;

    // Scale factor for preview (convert cm to pixels for display)
    const scaleFactor = 20; // 1cm = 20px for preview
    
    const previewWidth = pageWidth * scaleFactor;
    const previewHeight = pageHeight * scaleFactor;
    
    return (
      <div style={{
        width: previewWidth,
        height: previewHeight,
        margin: '0 auto',
        border: '2px solid #333',
        background: 'white',
        position: 'relative',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        {/* Labels grid */}
        {Array.from({ length: labelsPerRow * labelsPerCol }, (_, index) => {
          const entry = previewLayout[index];
          const row = Math.floor(index / labelsPerRow);
          const col = index % labelsPerRow;
          
          const x = (startX + (col * (labelSize + horizontalGap))) * scaleFactor;
          const y = (startY + (row * (labelSize + verticalGap))) * scaleFactor;
          const size = labelSize * scaleFactor;
          
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                border: '2px solid #333',
                background: 'white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px',
                boxSizing: 'border-box',
                cursor: entry ? 'grab' : 'default'
              }}
              draggable={!!entry}
              onDragStart={entry ? () => handleDragStart(entry, index) : undefined}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              onMouseEnter={() => setHoveredId(entry?.id || null)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {entry ? (
                <>
                  {/* Cage (top, larger font) */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '2px',
                    textAlign: 'center'
                  }}>
                    {entry.cage}
                  </div>
                  
                  {/* Name (middle) */}
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    marginBottom: '2px',
                    textAlign: 'center'
                  }}>
                    {entry.name || entry.egg_id}
                  </div>
                  
                  {/* Egg ID */}
                  <div style={{
                    fontSize: '8px',
                    marginBottom: '4px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    {entry.egg_id}
                  </div>
                  
                  {/* QR Code */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '1px solid #ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img 
                      src={`/api/qr?link=${encodeURIComponent(entry.link)}`}
                      alt="QR Code"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  
                  {/* Delete button on hover */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      opacity: hoveredId === entry.id ? 1 : 0,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <button
                      onClick={() => handleDelete(entry.id)}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1
                      }}
                      title="Delete this entry"
                    >
                      ×
                    </button>
                  </div>
                </>
              ) : (
                // Empty label placeholder
                <div style={{
                  color: '#ccc',
                  fontSize: '8px',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  Empty
                </div>
              )}
            </div>
          );
        })}
        
        {/* Page dimensions label */}
        <div style={{
          position: 'absolute',
          bottom: '5px',
          right: '5px',
          fontSize: '8px',
          color: '#999',
          background: 'white',
          padding: '2px 4px',
          border: '1px solid #ddd'
        }}>
          {pageWidth}cm × {pageHeight}cm
        </div>
      </div>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Egg Label Tracker</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('table')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            background: activeTab === 'table' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'table' ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Table View
        </button>
        <button
          onClick={() => setActiveTab('sheet')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'sheet' ? '#007bff' : '#f8f9fa',
            color: activeTab === 'sheet' ? 'white' : '#333',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Label Sheet
        </button>
      </div>

             {/* Current Egg Number Display and Reset */}
       <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
         <h3>Egg Number Management</h3>
         
         <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
             <strong>Current Egg #: {currentEggNumber}</strong>
             <span style={{ color: '#666', fontSize: '14px' }}>(Next available number)</span>
           </div>
           <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
             <input
               type="number"
               value={resetNumber}
               onChange={(e) => setResetNumber(e.target.value)}
               placeholder="Enter new egg number"
               min="1"
               style={{ padding: '8px', width: '200px', border: '1px solid #ccc', borderRadius: '4px' }}
             />
             <button
               type="button"
               onClick={handleResetEggNumber}
               style={{ 
                 padding: '8px 16px', 
                 background: '#dc3545', 
                 color: 'white', 
                 border: 'none', 
                 borderRadius: '4px',
                 cursor: 'pointer'
               }}
             >
               Reset Egg #
             </button>
           </div>
           <p style={{ marginTop: '10px', color: '#666', fontSize: '14px' }}>
             <strong>Note:</strong> New entries can only be added via webhook from Notion. Manual entry is disabled.
           </p>
         </div>
       </div>

      {/* Table View */}
      {activeTab === 'table' && (
        <div>
          <h3>Entries ({entries.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Egg ID</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Cage</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Link</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>QR Preview</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    No entries found. Add your first egg label!
                  </td>
                </tr>
              ) : (
                entries
                  .filter(entry => !entry.isReset) // Filter out reset entries
                  .map((entry) => (
                  <tr key={entry.id}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{entry.egg_id}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{entry.name}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{entry.cage}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <a href={entry.link} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                        {entry.link.length > 50 ? `${entry.link.substring(0, 50)}...` : entry.link}
                      </a>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <img 
                        src={`/api/qr?link=${encodeURIComponent(entry.link)}`}
                        alt="QR Code"
                        style={{ width: '60px', height: '60px', border: '1px solid #ddd' }}
                      />
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
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
        <div>
                     <div style={{ marginBottom: '20px', textAlign: 'center' }}>
             <button
               onClick={downloadSheet}
               style={{
                 padding: '12px 24px',
                 background: '#28a745',
                 color: 'white',
                 border: 'none',
                 borderRadius: '6px',
                 fontSize: '16px',
                 cursor: 'pointer',
                 marginRight: '10px'
               }}
             >
               🖨️ Download Current Page as PNG
             </button>
             <button
               onClick={() => {
                 const layout = Array(24).fill(null);
                 const nonResetEntries = entries.filter(entry => !entry.isReset);
                 nonResetEntries.forEach((entry, index) => {
                   if (index < 24) {
                     layout[index] = entry;
                   }
                 });
                 setPreviewLayout(layout);
               }}
               style={{
                 padding: '12px 24px',
                 background: '#6c757d',
                 color: 'white',
                 border: 'none',
                 borderRadius: '6px',
                 fontSize: '16px',
                 cursor: 'pointer'
               }}
             >
               🔄 Reset Layout
             </button>
                            <p style={{ marginTop: '10px', color: '#666' }}>
                 A4 (21cm × 29.7cm) - 4.3cm × 4.3cm labels, 4×6 grid layout
               </p>
             
             {/* Page Navigation for Multiple Pages */}
             {entries.filter(entry => !entry.isReset).length > 24 && (
               <div style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                 <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Multiple Pages Available</h4>
                 <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
                   You have {entries.filter(entry => !entry.isReset).length} entries, which requires {Math.ceil(entries.filter(entry => !entry.isReset).length / 24)} pages.
                 </p>
                 <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                   {Array.from({ length: Math.ceil(entries.filter(entry => !entry.isReset).length / 24) }, (_, pageIndex) => (
                     <button
                       key={pageIndex}
                       onClick={() => {
                         const layout = Array(24).fill(null);
                         const nonResetEntries = entries.filter(entry => !entry.isReset);
                         const startIndex = pageIndex * 24;
                         nonResetEntries.slice(startIndex, startIndex + 24).forEach((entry, index) => {
                           layout[index] = entry;
                         });
                         setPreviewLayout(layout);
                       }}
                       style={{
                         padding: '8px 16px',
                         background: '#007bff',
                         color: 'white',
                         border: 'none',
                         borderRadius: '4px',
                         cursor: 'pointer',
                         fontSize: '14px'
                       }}
                     >
                       Page {pageIndex + 1}
                     </button>
                   ))}
                 </div>
                 <p style={{ marginTop: '10px', color: '#666', fontSize: '12px' }}>
                   <strong>Tip:</strong> Click a page number to view and download that specific page of labels.
                 </p>
               </div>
             )}
           </div>

          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p>No entries found. Add some egg labels first!</p>
            </div>
          ) : (
            <div>
              <h3>Print Layout Preview - {entries.length} Labels</h3>
              <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                Drag and drop labels to rearrange the layout. The downloaded PNG will match this preview exactly.
              </p>
              
              {/* Exact print layout preview */}
              <div style={{ 
                display: 'flex',
                justifyContent: 'center',
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '8px',
                overflow: 'auto'
              }}>
                {renderPrintLayout()}
              </div>
              
              {/* Grid info */}
              <div style={{ 
                textAlign: 'center', 
                marginTop: '20px', 
                padding: '15px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '6px',
                maxWidth: '600px',
                margin: '20px auto 0'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Layout Specifications</h4>
                                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                   <div><strong>Page Size:</strong> A4 (21cm × 29.7cm)</div>
                   <div><strong>Labels per page:</strong> 24 (4×6 grid)</div>
                   <div><strong>Label size:</strong> 4.3cm × 4.3cm</div>
                   <div><strong>Margins:</strong> 2cm sides, 1.3cm top/bottom</div>
                   <div><strong>Horizontal gap:</strong> 0.8cm</div>
                   <div><strong>Vertical gap:</strong> 0.5cm</div>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
