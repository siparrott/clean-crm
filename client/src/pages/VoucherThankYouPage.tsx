import React, { useEffect } from 'react';

const VoucherThankYouPage: React.FC = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id');
    if (!sid) return;
    const apiBase = import.meta.env.VITE_API_URL || '';
    const href = `${apiBase}/voucher/pdf?session_id=${encodeURIComponent(sid)}`;
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
