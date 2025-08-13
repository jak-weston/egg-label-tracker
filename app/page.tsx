'use client';

import { useState, useEffect } from 'react';
import { LabelEntry } from '../lib/types';

export default function Home() {
  const [entries, setEntries] = useState<LabelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
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
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Egg ID</th>
                <th>Name</th>
                <th>Cage</th>
                <th>Link</th>
                <th>QR Preview</th>
                <th>PDF</th>
                <th>Created</th>
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
                    <td>
                      <a 
                        href={`/api/pdf?id=${entry.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pdf-link"
                      >
                        Download PDF
                      </a>
                    </td>
                    <td className="timestamp">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
