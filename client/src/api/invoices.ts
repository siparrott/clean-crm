import { supabase } from '../lib/supabase';

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
  const { data, error } = await supabase
    .from('crm_invoices')
    .select(`
      *,
      crm_clients(name, email)
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
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
  // Start transaction
  const { data: user } = await supabase.auth.getUser();
  
  try {
    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('crm_invoices')
      .insert([{
        client_id: payload.client_id,
        due_date: payload.due_date,
        payment_terms: payload.payment_terms,
        currency: payload.currency,
        notes: payload.notes,
        discount_amount: payload.discount_amount || 0,
        status: 'draft',
        created_by: user.user?.id
      }])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create line items
    const itemsToInsert = payload.items.map((item, index) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      sort_order: index
    }));

    const { error: itemsError } = await supabase
      .from('crm_invoice_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Create audit log entry
    await supabase
      .from('crm_invoice_audit_log')
      .insert([{
        invoice_id: invoice.id,
        action: 'created',
        new_values: {
          invoice_number: invoice.invoice_number,
          client_id: payload.client_id,
          status: 'draft'
        },
        user_id: user.user?.id,
        user_email: user.user?.email
      }]);

    return invoice;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

export async function updateInvoiceStatus(id: string, status: string) {
  const { data: user } = await supabase.auth.getUser();
  
  // Get current invoice data for audit
  const { data: currentInvoice } = await supabase
    .from('crm_invoices')
    .select('*')
    .eq('id', id)
    .single();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  // Set dates based on status
  if (status === 'sent' && !currentInvoice?.sent_date) {
    updateData.sent_date = new Date().toISOString();
  }
  if (status === 'paid' && !currentInvoice?.paid_date) {
    updateData.paid_date = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('crm_invoices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Create audit log entry
  await supabase
    .from('crm_invoice_audit_log')
    .insert([{
      invoice_id: id,
      action: 'updated',
      old_values: { status: currentInvoice?.status },
      new_values: { status },
      user_id: user.user?.id,
      user_email: user.user?.email
    }]);

  return data;
}

export async function deleteInvoice(id: string) {
  const { data: user } = await supabase.auth.getUser();
  
  // Create audit log entry before deletion
  await supabase
    .from('crm_invoice_audit_log')
    .insert([{
      invoice_id: id,
      action: 'deleted',
      user_id: user.user?.id,
      user_email: user.user?.email
    }]);

  const { error } = await supabase
    .from('crm_invoices')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function addInvoicePayment(invoiceId: string, payment: {
  amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_date: string;
  notes?: string;
}) {
  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('crm_invoice_payments')
    .insert([{
      invoice_id: invoiceId,
      ...payment,
      created_by: user.user?.id
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
