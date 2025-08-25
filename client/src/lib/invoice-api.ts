import { apiRequest, queryClient } from './queryClient';

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate?: string;
  sortOrder: number;
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  discountAmount?: string;
  currency: string;
  paymentTerms?: string;
  notes?: string;
  items?: InvoiceItem[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CreateInvoiceData {
  clientId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  paymentTerms?: string;
  notes?: string;
  discountAmount?: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
  }[];
}

export const invoiceApi = {
  async getInvoices(): Promise<Invoice[]> {
    return apiRequest('/api/crm/invoices');
  },

  async getInvoice(id: string): Promise<Invoice> {
    return apiRequest(`/api/crm/invoices/${id}`);
  },

  async createInvoice(data: CreateInvoiceData): Promise<Invoice> {
    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = data.items.reduce((sum, item) => {
      const itemTax = (item.quantity * item.unit_price) * ((item.tax_rate || 0) / 100);
      return sum + itemTax;
    }, 0);
    const discount = parseFloat(data.discountAmount || '0');
    const total = subtotal + taxAmount - discount;

    // Generate invoice number if not provided
    const timestamp = Date.now();
    const invoiceNumber = `INV-${timestamp}`;

    const invoiceData = {
      invoiceNumber,
      clientId: data.clientId,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      currency: data.currency,
      paymentTerms: data.paymentTerms || '',
      notes: data.notes || '',
      subtotalAmount: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: total.toFixed(2),
      discountAmount: discount.toFixed(2),
      status: 'draft' as const,
      items: data.items
    };

    const result = await apiRequest('/api/crm/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceData)
    });

    // Invalidate invoices cache
    queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
    
    return result;
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    const result = await apiRequest(`/api/crm/invoices/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
    queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices', id] });
    
    return result;
  },

  async deleteInvoice(id: string): Promise<void> {
    await apiRequest(`/api/crm/invoices/${id}`, {
      method: 'DELETE'
    });

    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: ['/api/crm/invoices'] });
  },

  calculateInvoiceTotals(items: InvoiceItem[]): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      return sum + (quantity * unitPrice);
    }, 0);
    
    const taxAmount = items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const taxRate = parseFloat(item.taxRate || '0');
      const itemTax = (quantity * unitPrice) * (taxRate / 100);
      return sum + itemTax;
    }, 0);
    
    const total = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }
};