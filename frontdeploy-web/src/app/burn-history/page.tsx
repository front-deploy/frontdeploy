import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

// Define the interface for a BurnHistory item
interface BurnRecord {
  id: string;
  solSpent: number;
  fdpBought: number | null;
  fdpBurned: number;
  txHash: string;
  createdAt: string;
}

export const revalidate = 60; // Revalidate the page every 60 seconds

export default async function BurnHistoryPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  let history: BurnRecord[] = [];
  let error: string | null = null;

  try {
    const res = await fetch(`${apiUrl}/burn-history`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    history = await res.json();
  } catch (err) {
    console.error('Failed to fetch burn history:', err);
    error = 'Failed to load burn history. The data service might be temporarily unavailable.';
  }

  return (
    <div style={{ background: 'var(--gray-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '120px 20px 60px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '10px', color: 'var(--gray-900)' }}>
          Treasury Burn History
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--gray-600)', marginBottom: '40px' }}>
          Transparent, verifiable on-chain records of 90% of all deployment fees being used to buy back and burn $FDP. 
          <br/>
          <span style={{ fontSize: '0.95rem', color: 'var(--gray-500)', marginTop: '8px', display: 'inline-block' }}>
            ⏳ <strong>Note:</strong> The automated buyback and burn process runs every 6 hours.
          </span>
        </p>

        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--gray-100)', borderBottom: '1px solid var(--gray-200)' }}>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-700)' }}>Date & Time</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-700)' }}>SOL Spent</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-700)' }}>$FDP Burned</th>
                <th style={{ padding: '16px', fontWeight: '600', color: 'var(--gray-700)' }}>Transaction</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                    No burn records found yet. Check back soon after the next deployment batch!
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td suppressHydrationWarning style={{ padding: '16px', color: '#000' }}>
                      {new Date(record.createdAt).toLocaleString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '16px', color: '#000', fontWeight: '500' }}>
                      {record.solSpent.toFixed(4)} SOL
                    </td>
                    <td style={{ padding: '16px', color: '#991b1b', fontWeight: '600' }}>
                      🔥 {record.fdpBurned.toLocaleString()} FDP
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
