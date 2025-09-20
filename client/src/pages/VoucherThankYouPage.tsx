import React, { useEffect } from 'react';

const VoucherThankYouPage: React.FC = () => {
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
      href = `${apiBase}/voucher/pdf?session_id=${encodeURIComponent(sid)}`;
    }

    if (!href) return;
    const link = document.createElement('a');
    link.href = href;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
    const btn = document.getElementById('download-again');
    if (btn) btn.setAttribute('data-href', href);
  }, []);

  const handleDownloadAgain = () => {
    const btn = document.getElementById('download-again');
    const href = btn?.getAttribute('data-href');
    if (href) window.location.href = href;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">Vielen Dank für Ihren Kauf!</h1>
        <p className="mb-4">Ihr personalisierter Gutschein wird jetzt heruntergeladen.</p>
        <button id="download-again" onClick={handleDownloadAgain} className="bg-purple-600 text-white px-4 py-2 rounded">
          Gutschein erneut herunterladen
        </button>
      </div>
    </div>
  );
};

export default VoucherThankYouPage;
