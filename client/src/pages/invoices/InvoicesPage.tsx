import React, { useEffect, useState } from 'react';
import { Plus, Download, Send, Eye, Edit, Trash2, MessageCircle } from 'lucide-react';
import { listInvoices, createInvoice, updateInvoiceStatus, deleteInvoice } from '../../api/invoices';
import InvoiceTemplate from '../../components/invoice/InvoiceTemplate';
import PriceListModal from '../../components/invoice/PriceListModal';

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
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  payment_terms: string;
  notes?: string;
  pdf_url?: string;
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPriceListModal, setShowPriceListModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list');

  // New invoice form state
  const [newInvoice, setNewInvoice] = useState({
    client_id: '',
    client_name: '',
    client_email: '',
    client_address: '',
    client_city: '',
    client_country: '',
    due_date: '',
    payment_terms: '30 days',
    currency: 'EUR',
    notes: '',
    discount_amount: 0,
    items: [] as Array<{
      description: string;
      quantity: number;
      unit_price: number;
      tax_rate: number;
    }>
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await listInvoices();
      setInvoices(data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const invoiceData = {
        client_id: newInvoice.client_id,
        due_date: newInvoice.due_date,
        payment_terms: newInvoice.payment_terms,
        currency: newInvoice.currency,
        notes: newInvoice.notes,
        discount_amount: newInvoice.discount_amount,
        items: newInvoice.items
      };

      await createInvoice(invoiceData);
      setShowCreateModal(false);
      fetchInvoices();
      
      // Reset form
      setNewInvoice({
        client_id: '',
        client_name: '',
        client_email: '',
        client_address: '',
        client_city: '',
        client_country: '',
        due_date: '',
        payment_terms: '30 days',
        currency: 'EUR',
        notes: '',
        discount_amount: 0,
        items: []
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStatusUpdate = async (invoiceId: string, status: string) => {
    try {
      await updateInvoiceStatus(invoiceId, status);
      fetchInvoices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice(invoiceId);
        fetchInvoices();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handlePreviewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewMode('preview');
  };

  const handleAddItemFromPriceList = (item: any) => {
    const newItem = {
      description: item.name,
      quantity: 1,
      unit_price: item.price,
      tax_rate: item.taxRate || 19
    };
    
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const handleSendWhatsApp = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowWhatsAppModal(true);
    // Pre-populate phone number if available
    setWhatsAppPhone('');
  };

  const handleConfirmWhatsAppSend = async () => {
    if (!selectedInvoice || !whatsAppPhone.trim()) {
      alert('Please enter a valid phone number');
      return;
    }

    try {
      const response = await fetch('/api/invoices/share-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: selectedInvoice.id,
          phone_number: whatsAppPhone.replace(/\D/g, '') // Remove non-digits
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Open WhatsApp with the prepared message
        window.open(result.whatsapp_url, '_blank');
        
        // Update invoice status to 'sent' if it was draft
        if (selectedInvoice.status === 'draft') {
          await handleStatusUpdate(selectedInvoice.id, 'sent');
        }
        
        setShowWhatsAppModal(false);
        setWhatsAppPhone('');
        setSelectedInvoice(null);
        
        // Refresh invoices to show updated status
        fetchInvoices();
      } else {
        alert('Failed to create WhatsApp message: ' + result.error);
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      alert('Failed to send WhatsApp message');
    }
  };

  const calculateInvoiceTotals = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );
    const discountAmount = (subtotal * (newInvoice.discount_amount || 0)) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * 0.19; // 19% VAT
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg">Loading invoices...</div>
    </div>
  );

  if (error) return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {error}
    </div>
  );

  if (viewMode === 'preview' && selectedInvoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode('list')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Invoices
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => handleSendWhatsApp(selectedInvoice)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
        <InvoiceTemplate invoice={selectedInvoice} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    #{invoice.invoice_number}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {invoice.client?.name || invoice.client_id}
                  </div>
                  <div className="text-sm text-gray-500">
                    {invoice.client?.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  €{invoice.total_amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(invoice.due_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handlePreviewInvoice(invoice)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(invoice)}
                      className="text-green-600 hover:text-green-900"
                      title="Send via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(invoice.id, invoice.status === 'draft' ? 'sent' : 'paid')}
                      className="text-blue-600 hover:text-blue-900"
                      title="Update Status"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Invoice</h3>
              
              {/* Client Information */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={newInvoice.client_id}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Invoice Items</h4>
                  <button
                    onClick={() => setShowPriceListModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Add from Price Guide
                  </button>
                </div>
                
                {newInvoice.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2 mb-2 p-3 bg-gray-50 rounded">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...newInvoice.items];
                        newItems[index].description = e.target.value;
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 border rounded"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...newInvoice.items];
                        newItems[index].quantity = parseInt(e.target.value) || 0;
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 border rounded"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => {
                        const newItems = [...newInvoice.items];
                        newItems[index].unit_price = parseFloat(e.target.value) || 0;
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 border rounded"
                    />
                    <input
                      type="number"
                      placeholder="Tax %"
                      value={item.tax_rate}
                      onChange={(e) => {
                        const newItems = [...newInvoice.items];
                        newItems[index].tax_rate = parseFloat(e.target.value) || 0;
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 border rounded"
                    />
                    <button
                      onClick={() => {
                        const newItems = newInvoice.items.filter((_, i) => i !== index);
                        setNewInvoice(prev => ({ ...prev, items: newItems }));
                      }}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    const newItem = {
                      description: '',
                      quantity: 1,
                      unit_price: 0,
                      tax_rate: 19
                    };
                    setNewInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Item
                </button>
              </div>

              {/* Totals Preview */}
              {newInvoice.items.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded">
                  <h4 className="font-medium mb-2">Invoice Totals</h4>
                  {(() => {
                    const totals = calculateInvoiceTotals();
                    return (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>€{totals.subtotal.toFixed(2)}</span>
                        </div>
                        {totals.discountAmount > 0 && (
                          <div className="flex justify-between">
                            <span>Discount:</span>
                            <span>-€{totals.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tax (19%):</span>
                          <span>€{totals.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>€{totals.total.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={!newInvoice.client_id || !newInvoice.due_date || newInvoice.items.length === 0}
                >
                  Create Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price List Modal */}
      {showPriceListModal && (
        <PriceListModal
          onClose={() => setShowPriceListModal(false)}
          onSelectItem={handleAddItemFromPriceList}
        />
      )}

      {/* WhatsApp Share Modal */}
      {showWhatsAppModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Send Invoice via WhatsApp
              </h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  Invoice: <span className="font-medium">#{selectedInvoice.invoice_number}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Amount: <span className="font-medium">€{selectedInvoice.total_amount.toFixed(2)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Client: <span className="font-medium">{selectedInvoice.client?.name || selectedInvoice.client_id}</span>
                </p>
              </div>

              <div className="mb-4">
                <label htmlFor="whatsapp-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Phone Number (with country code)
                </label>
                <input
                  type="tel"
                  id="whatsapp-phone"
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  placeholder="e.g., +436641234567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +43 for Austria, +49 for Germany)
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    setWhatsAppPhone('');
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmWhatsAppSend}
                  disabled={!whatsAppPhone.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
