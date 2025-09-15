// Remove supabase import - we use Neon via server endpoints
// import { supabase } from '../lib/supabase';

export interface Invoice {
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
  paid_date?: string;
  sent_date?: string;
  payment_terms: string;
  notes?: string;
  pdf_url?: string;
  template_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: 'bank_transfer' | 'credit_card' | 'paypal' | 'stripe' | 'cash' | 'check';
  payment_reference?: string;
  payment_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CreateInvoiceData {
  client_id: string;
  due_date: string;
  payment_terms: string;
  currency: string;
  notes?: string;
  discount_amount?: number;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }[];
}

export async function listInvoices() {
  // Use our full-server.js API endpoint
  const response = await fetch('/api/invoices');
  if (!response.ok) {
    throw new Error('Failed to fetch invoices');
  }
  return response.json();
}

export async function getInvoice(id: string) {
  const { data, error } = await supabase
    .from('crm_invoices')
    .select(`
      *,
      crm_clients(name, email, address1, city, country),
      crm_invoice_items(*),
      crm_invoice_payments(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createInvoice(payload: CreateInvoiceData) {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create invoice');
  }

  return response.json();
}

export async function updateInvoiceStatus(id: string, status: string) {
  const response = await fetch(`/api/invoices/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update invoice status');
  }

  return response.json();
}

export async function deleteInvoice(id: string) {
  const response = await fetch(`/api/invoices/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete invoice');
  }

  return response.json();
}

export async function addInvoicePayment(invoiceId: string, payment: {
  amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_date: string;
  notes?: string;
}) {
  const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payment),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add payment');
  }

  return response.json();
}
    }])
    .select()
    .single();

  if (error) throw error;

  // Check if invoice is fully paid
  const { data: invoice } = await supabase
    .from('crm_invoices')
    .select('total_amount')
    .eq('id', invoiceId)
    .single();

  const { data: payments } = await supabase
    .from('crm_invoice_payments')
    .select('amount')
    .eq('invoice_id', invoiceId);

  const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  
  if (invoice && totalPaid >= invoice.total_amount) {
    await updateInvoiceStatus(invoiceId, 'paid');
  }

  return data;
}
