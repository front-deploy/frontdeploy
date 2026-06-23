import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

// Define the interface for a LaunchHistory item
interface LaunchRecord {
  id: string;
  mintAddress: string;
  ticker: string;
  name: string;
  deployerAddress: string;
  txHash: string;
  createdAt: string;
}

export const revalidate = 60; // Revalidate the page every 60 seconds

export default async function LaunchHistoryPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  let history: LaunchRecord[] = [];
  let error: string | null = null;

  try {
    const res = await fetch(`${apiUrl}/launch-history`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    history = await res.json();
  } catch (err) {
    console.error('Failed to fetch launch history:', err);
    error = 'Failed to load launch history. The data service might be temporarily unavailable.';
  }

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '120px 20px 60px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px', color: 'var(--gray-900)' }}>
          Launch History
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--gray-600)', marginBottom: '40px' }}>
          Real-time feed of all tokens launched via Frontdeploy Fast Launch.
        </p>

        {error && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger-dark)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--gray-100)', borderBottom: '1px solid var(--gray-200)' }}>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-700)' }}>Date & Time</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-700)' }}>Token</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-700)' }}>Mint Address</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-700)' }}>Deployer</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-700)' }}>Tx</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                    No tokens launched yet. Be the first to deploy using the Frontdeploy extension!
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td suppressHydrationWarning style={{ padding: '16px', color: '#000', whiteSpace: 'nowrap' }}>
                      {new Date(record.createdAt).toLocaleString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '16px', color: '#000', fontWeight: '500' }}>
                      <span style={{ fontWeight: 'bold' }}>${record.ticker}</span>
                      <br/>
                      <span style={{ fontSize: '0.85em', color: '#555' }}>{record.name}</span>
                    </td>
                    <td style={{ padding: '16px', color: '#555', fontFamily: 'monospace' }}>
                      <a 
                        href={`https://pump.fun/coin/${record.mintAddress}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: 'var(--primary)', textDecoration: 'none' }}
                      >
                        {record.mintAddress.slice(0, 6)}...{record.mintAddress.slice(-6)}
                      </a>
                    </td>
                    <td style={{ padding: '16px', color: '#555', fontFamily: 'monospace' }}>
                      {record.deployerAddress.slice(0, 6)}...{record.deployerAddress.slice(-6)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <a 
                        href={`https://solscan.io/tx/${record.txHash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="tx-link"
                      >
                        {record.txHash.slice(0, 6)}...{record.txHash.slice(-6)}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="7" y1="17" x2="17" y2="7"></line>
                          <polyline points="7 7 17 7 17 17"></polyline>
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}
