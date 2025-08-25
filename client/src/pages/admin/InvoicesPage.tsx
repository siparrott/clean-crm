import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdvancedInvoiceForm from '../../components/admin/AdvancedInvoiceForm';
import InvoiceViewer from '../../components/admin/InvoiceViewer';
import PaymentTracker from '../../components/admin/PaymentTracker';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Send, 
  DollarSign, 
  Calendar, 
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
}

const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
  const [paymentTrackingInvoice, setPaymentTrackingInvoice] = useState<{ id: string; total: number; currency: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/crm/invoices', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      
      // Format the data to match expected interface based on database schema
      const formattedInvoices = data.map((invoice: any) => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id,
        client_name: invoice.client_name || 'Unknown Client',
        amount: parseFloat(invoice.subtotal || 0),
        tax_amount: parseFloat(invoice.tax_amount || 0), 
        total_amount: parseFloat(invoice.total || 0),
        status: invoice.status?.toLowerCase() || 'pending',
        due_date: invoice.due_date,
        paid_date: null, // Not in current schema
        notes: invoice.notes || '',
        created_at: invoice.created_at
      }));
      
      setInvoices(formattedInvoices || []);
    } catch (err) {
      // console.error removed
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];
    
    // Apply search filter
    if (searchTerm && invoices.length > 0) {
      filtered = filtered.filter(invoice => 
        (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }
    
    setFilteredInvoices(filtered);
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/crm/invoices/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }
      
      // Remove from local state
      setInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== id));
      setDeleteConfirmation(null);
    } catch (err) {
      // console.error removed
      setError('Failed to delete invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      
      const updateData: any = {
        status: newStatus,
      };
      
      // If marking as paid, set the paid date
      if (newStatus === 'paid') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      }
      
      const response = await fetch(`/api/crm/invoices/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update invoice status');
      }
      
      // Update local state
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => 
          invoice.id === id 
            ? { ...invoice, status: newStatus as any, paid_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : invoice.paid_date } 
            : invoice
        )
      );
    } catch (err) {
      setError('Failed to update invoice status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Invoice['status']) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
      cancelled: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Cancelled' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status || 'Unknown' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'paid' && new Date(dueDate) < new Date();
  };

  const downloadInvoicePDF = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/crm/invoices/${invoiceId}/pdf`, {
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
      a.download = `Invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
    } catch (error) {
      alert('PDF download failed. Please try again.');
    }
  };

  const getTotalStats = () => {
    if (!filteredInvoices || filteredInvoices.length === 0) {
      return { totalAmount: 0, paidAmount: 0, overdueAmount: 0 };
    }
    
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paidAmount = filteredInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const overdueAmount = filteredInvoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    return { totalAmount, paidAmount, overdueAmount };
  };

  const stats = getTotalStats();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Invoices Management</h1>
            <p className="text-gray-600">Create, send, and track client invoices</p>
          </div>          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <Plus size={20} className="mr-2" />
            Create Invoice
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invoiced</p>
                <p className="text-2xl font-semibold text-gray-900">€{(stats.totalAmount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                <p className="text-2xl font-semibold text-gray-900">€{(stats.paidAmount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                <p className="text-2xl font-semibold text-gray-900">€{(stats.overdueAmount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter size={20} className="mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
              <span className="ml-2 text-gray-600">Loading invoices...</span>
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="overflow-x-auto">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className={`hover:bg-gray-50 ${
                      isOverdue(invoice.due_date, invoice.status) ? 'bg-red-50' : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                          <div className="text-sm text-gray-500">
                            Created {new Date(invoice.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">€{(invoice.total_amount || 0).toFixed(2)}</div>
                        <div className="text-sm text-gray-500">
                          €{(invoice.amount || 0).toFixed(2)} + €{(invoice.tax_amount || 0).toFixed(2)} tax
                        </div>
                      </td>                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${
                          isOverdue(invoice.due_date, invoice.status) ? 'text-red-600 font-medium' : 'text-gray-900'
                        }`}>
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                        {invoice.paid_date && (
                          <div className="text-sm text-green-600">
                            Paid {new Date(invoice.paid_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">                        <div className="flex space-x-2">
                          <button 
                            onClick={() => setViewingInvoiceId(invoice.id)}
                            className="text-blue-600 hover:text-blue-900" 
                            title="View"
                          >
                            <Eye size={16} />
                          </button>                          <button 
                            onClick={() => handleStatusChange(invoice.id, invoice.status === 'draft' ? 'sent' : invoice.status === 'sent' ? 'paid' : 'draft')}
                            className="text-green-600 hover:text-green-900" 
                            title="Change Status"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => setPaymentTrackingInvoice({ 
                              id: invoice.id, 
                              total: invoice.total_amount || 0, 
                              currency: 'EUR' 
                            })}
                            className="text-purple-600 hover:text-purple-900" 
                            title="Track Payments"
                          >
                            <DollarSign size={16} />
                          </button>
                          <button 
                            onClick={() => downloadInvoicePDF(invoice.id)}
                            className="text-indigo-600 hover:text-indigo-900" 
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </button>
                          {invoice.status === 'draft' && (
                            <button className="text-indigo-600 hover:text-indigo-900" title="Send">
                              <Send size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => setDeleteConfirmation(invoice.id)}
                            className="text-red-600 hover:text-red-900" 
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No invoices found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmation && handleDeleteInvoice(deleteConfirmation)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}      {/* Payment Tracker */}
      {paymentTrackingInvoice && (
        <PaymentTracker
          invoiceId={paymentTrackingInvoice.id}
          invoiceTotal={paymentTrackingInvoice.total}
          currency={paymentTrackingInvoice.currency}
          isOpen={Boolean(paymentTrackingInvoice)}
          onClose={() => setPaymentTrackingInvoice(null)}
          onPaymentAdded={() => {
            fetchInvoices();
          }}
        />
      )}

      {/* Invoice Viewer */}
      {viewingInvoiceId && (
        <InvoiceViewer
          invoiceId={viewingInvoiceId}
          isOpen={Boolean(viewingInvoiceId)}
          onClose={() => setViewingInvoiceId(null)}
        />
      )}

      {/* Create Invoice Modal */}
      <AdvancedInvoiceForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchInvoices();
          setShowCreateModal(false);
        }}
      />
    </AdminLayout>
  );
};

export default InvoicesPage;