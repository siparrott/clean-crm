import React, { useState, useEffect } from 'react';
import { X, Plus, CreditCard, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { addInvoicePayment } from '../../api/invoices';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

interface PaymentTrackerProps {
  invoiceId: string;
  invoiceTotal: number;
  currency: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
}

const PaymentTracker: React.FC<PaymentTrackerProps> = ({
  invoiceId,
  invoiceTotal,
  currency,
  isOpen,
  onClose,
  onPaymentAdded
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_method: 'bank_transfer',
    payment_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchPayments();
    }
  }, [isOpen, invoiceId]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/crm/invoices/${invoiceId}/payments`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }
      
      const data = await response.json();
      setPayments(data || []);
    } catch (err) {
      // console.error removed
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/crm/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newPayment)
      });
      
      if (!response.ok) {
        throw new Error('Failed to add payment');
      }
      
      // Reset form
      setNewPayment({
        amount: 0,
        payment_method: 'bank_transfer',
        payment_reference: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      
      setShowAddPayment(false);
      await fetchPayments();
      onPaymentAdded();
    } catch (err) {
      // console.error removed
      setError('Failed to add payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      setLoading(true);
      
      const response = await fetch(`/api/crm/invoices/${invoiceId}/payments/${paymentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete payment');
      }
      
      await fetchPayments();
      onPaymentAdded();
    } catch (err) {
      // console.error removed
      setError('Failed to delete payment');
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = invoiceTotal - totalPaid;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      bank_transfer: 'Bank Transfer',
      credit_card: 'Credit Card',
      paypal: 'PayPal',
      stripe: 'Stripe',
      cash: 'Cash',
      check: 'Check'
    };
    return methods[method] || method;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Payment Tracker</h2>
            <p className="text-gray-600">Track payments for this invoice</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Payment Summary */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Invoice Total</p>
                  <p className="text-lg font-semibold">{formatCurrency(invoiceTotal)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Paid</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(remainingBalance)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Payment Button */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
            <button
              onClick={() => setShowAddPayment(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Add Payment
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Add Payment Form */}
          {showAddPayment && (
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Add New Payment</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    step="0.01"
                    min="0"
                    max={remainingBalance}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder={`Max: ${formatCurrency(remainingBalance)}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={newPayment.payment_method}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="paypal">PayPal</option>
                    <option value="stripe">Stripe</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={newPayment.payment_date}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={newPayment.payment_reference}
                    onChange={(e) => setNewPayment(prev => ({ ...prev, payment_reference: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Transaction ID, Check #, etc."
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Additional notes about this payment..."
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddPayment(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  disabled={loading || newPayment.amount <= 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {loading ? 'Adding...' : 'Add Payment'}
                </button>
              </div>
            </div>
          )}

          {/* Payments List */}
          {loading && !showAddPayment ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              <span className="ml-2 text-gray-600">Loading payments...</span>
            </div>
          ) : payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-600">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          {getPaymentMethodLabel(payment.payment_method)}
                        </span>
                      </div>
                      
                      {payment.payment_reference && (
                        <p className="text-sm text-gray-600 mt-1">
                          Ref: {payment.payment_reference}
                        </p>
                      )}
                      
                      {payment.notes && (
                        <p className="text-sm text-gray-600 mt-1">{payment.notes}</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete payment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No payments recorded yet</p>
              <p className="text-sm text-gray-500">Add the first payment to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentTracker;
