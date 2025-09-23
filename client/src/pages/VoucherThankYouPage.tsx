import React, { useEffect, useState } from 'react';

const VoucherThankYouPage: React.FC = () => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get('preview');
    const sid = params.get('session_id');
    const apiBase = import.meta.env.VITE_API_URL || '';

  let href: string | null = null;
    if (preview === '1') {
      const sku = params.get('sku') || 'Family-Basic';
      const name = params.get('name') || 'Anna Muster';
      const from = params.get('from') || 'Max Beispiel';
      const message = params.get('message') || 'Alles Gute zum besonderen Anlass!';
      const amount = params.get('amount') || '95.00';
      href = `${apiBase}/voucher/pdf/preview?sku=${encodeURIComponent(sku)}&name=${encodeURIComponent(name)}&from=${encodeURIComponent(from)}&message=${encodeURIComponent(message)}&amount=${encodeURIComponent(amount)}`;
    } else if (sid) {
      // Ask server to return a valid, time-limited signed link for this session
      href = null;
      (async () => {
        try {
          const r = await fetch(`${window.location.origin}/api/vouchers/signed-link?session_id=${encodeURIComponent(sid)}`);
          if (r.ok) {
            const j = await r.json();
            if (j?.success && j.url) {
              setDownloadUrl(j.url);
              // Auto-start download
              const a = document.createElement('a');
              a.href = j.url;
              a.download = '';
              document.body.appendChild(a);
              a.click();
              a.remove();
              return;
            }
          }
        } catch {}
        // Fallback to legacy direct endpoint
        const fb = `${apiBase}/voucher/pdf?session_id=${encodeURIComponent(sid)}`;
        setDownloadUrl(fb);
        const a = document.createElement('a');
        a.href = fb;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        a.remove();
      })();
    }
  }, []);

  const handleDownloadAgain = () => {
    if (downloadUrl) window.location.href = downloadUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Vielen Dank für Ihren Kauf!</h1>
        <p className="mb-4">Ihr personalisierter Gutschein steht zum Download bereit.</p>
        <a
          id="download-again"
          href={downloadUrl || '#'}
          onClick={(e)=>{ if (!downloadUrl) e.preventDefault(); }}
          className={`inline-flex items-center justify-center px-4 py-2 rounded ${downloadUrl ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
        >
          Gutschein herunterladen
        </a>
      </div>
    </div>
  );
};

export default VoucherThankYouPage;
