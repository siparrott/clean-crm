import React, { useEffect, useState } from 'react';
import { listInvoices } from '../../api/invoices';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const data = await listInvoices();
        setInvoices(data ?? []);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load invoices');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1>Invoices</h1>
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Amount</th>
            <th>Status</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.client_id ?? '—'}</td>
              <td>{inv.amount}</td>
              <td>{inv.status}</td>
              <td>
                {inv.pdf_url ? (
                  <a href={inv.pdf_url} target="_blank" rel="noreferrer">
                    View
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
