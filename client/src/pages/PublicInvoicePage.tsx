import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, MessageCircle, Printer } from 'lucide-react';
import InvoiceTemplate from '../components/invoice/InvoiceTemplate';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  subtotal_amount: number;
  discount_amount: number;
  currency: string;
  status: string;
  due_date: string;
  payment_terms: string;
  notes?: string;
  created_at: string;
  client?: {
    name: string;
    email: string;
    address1?: string;
    city?: string;
    country?: string;
  };
  items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    line_total: number;
  }>;
}

const PublicInvoicePage: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/invoices/public/${invoiceId}`);
        
        if (!response.ok) {
          throw new Error('Invoice not found');
        }
        
        const data = await response.json();
        setInvoice(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    
    try {
      const response = await fetch(`/api/crm/invoices/${invoice.id}/pdf`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Rechnung-${invoice.invoice_number || invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF download failed. Please try again.');
    }
  };

  const handleWhatsAppContact = () => {
    const message = `Hello! I have a question about invoice #${invoice?.invoice_number}`;
    const whatsappUrl = `https://wa.me/4367763399210?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600 mb-4">
            {error || 'The invoice you are looking for does not exist or has been removed.'}
          </p>
          <a 
            href="https://newagefotografie.com" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to New Age Fotografie
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Actions */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Invoice #{invoice.invoice_number}
              </h1>
              <p className="text-sm text-gray-600">
                From New Age Fotografie
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleWhatsAppContact}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contact Us</span>
              </button>
              
              <button
                onClick={handlePrintInvoice}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <InvoiceTemplate invoice={invoice} />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">
              Questions about this invoice? Contact us on WhatsApp or email us at{' '}
              <a 
                href="mailto:hallo@newagefotografie.com"
                className="text-blue-600 hover:text-blue-800"
              >
                hallo@newagefotografie.com
              </a>
            </p>
            <p>
              © 2025 New Age Fotografie - Professional Photography Services in Vienna
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicInvoicePage;