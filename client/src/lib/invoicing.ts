import { supabase } from './supabase';
import jsPDF from 'jspdf';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax_rate?: number;
  category?: string;
}

export interface Invoice {
  id?: string;
  invoice_number: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
  client_address?: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  terms?: string;
  payment_method?: string;
  paid_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  company?: string;
  tax_number?: string;
}

export interface PriceListItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  unit?: string;
  tax_rate?: number;
  is_active: boolean;
}

// Invoice generation utilities
export const invoiceService = {
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get the latest invoice number for this year
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `INV-${year}%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (error) {
      // console.error removed
    }

    let nextNumber = 1;
    if (data && data.length > 0) {
      const lastNumber = data[0].invoice_number;
      const lastSequence = parseInt(lastNumber.split('-')[2] || '0');
      nextNumber = lastSequence + 1;
    }

    return `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
  },

  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          ...invoiceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async getInvoices(limit = 50, offset = 0): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            email,
            company
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data || [];
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            email,
            phone,
            address,
            city,
            postal_code,
            country,
            company,
            tax_number
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      // console.error removed
      return null;
    }
  },

  async deleteInvoice(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  calculateInvoiceTotals(items: InvoiceItem[]): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemTax = item.amount * ((item.tax_rate || 0) / 100);
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

// PDF generation
export const pdfService = {
  generateInvoicePDF(invoice: Invoice, client: Client): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Company header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TogNinja', 20, yPosition);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Photography Services', 20, yPosition + 8);
    doc.text('info@togninja.com | www.togninja.com', 20, yPosition + 16);

    // Invoice title and number
    yPosition += 40;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 60, yPosition, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - 60, yPosition + 12, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, pageWidth - 60, yPosition + 20, { align: 'right' });
    doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 60, yPosition + 28, { align: 'right' });

    // Client information
    yPosition += 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, yPosition);
    
    doc.setFont('helvetica', 'normal');
    yPosition += 8;
    if (client.company) {
      doc.text(client.company, 20, yPosition);
      yPosition += 6;
    }
    doc.text(`${client.first_name} ${client.last_name}`, 20, yPosition);
    yPosition += 6;
    if (client.address) {
      doc.text(client.address, 20, yPosition);
      yPosition += 6;
    }
    if (client.city || client.postal_code) {
      doc.text(`${client.city || ''} ${client.postal_code || ''}`, 20, yPosition);
      yPosition += 6;
    }
    if (client.email) {
      doc.text(client.email, 20, yPosition);
      yPosition += 6;
    }

    // Items table
    yPosition += 20;
    const tableTop = yPosition;
    
    // Table headers
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 20, yPosition);
    doc.text('Qty', 120, yPosition, { align: 'center' });
    doc.text('Rate', 140, yPosition, { align: 'right' });
    doc.text('Amount', pageWidth - 20, yPosition, { align: 'right' });
    
    // Table line
    yPosition += 4;
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    
    // Table items
    doc.setFont('helvetica', 'normal');
    yPosition += 8;
    
    invoice.items.forEach(item => {
      doc.text(item.description, 20, yPosition);
      doc.text(item.quantity.toString(), 120, yPosition, { align: 'center' });
      doc.text(`€${item.rate.toFixed(2)}`, 140, yPosition, { align: 'right' });
      doc.text(`€${item.amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 8;
    });

    // Totals
    yPosition += 10;
    doc.line(120, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;
    
    doc.text(`Subtotal: €${invoice.subtotal.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 6;
    doc.text(`Tax: €${invoice.tax_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: €${invoice.total_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });

    // Notes and terms
    if (invoice.notes || invoice.terms) {
      yPosition += 30;
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, yPosition);
      
      doc.setFont('helvetica', 'normal');
      yPosition += 8;
      if (invoice.notes) {
        const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
        doc.text(notesLines, 20, yPosition);
        yPosition += notesLines.length * 6;
      }
      
      if (invoice.terms) {
        yPosition += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Terms:', 20, yPosition);
        
        doc.setFont('helvetica', 'normal');
        yPosition += 8;
        const termsLines = doc.splitTextToSize(invoice.terms, pageWidth - 40);
        doc.text(termsLines, 20, yPosition);
      }
    }

    return doc;
  },

  downloadInvoicePDF(invoice: Invoice, client: Client): void {
    const doc = this.generateInvoicePDF(invoice, client);
    doc.save(`invoice-${invoice.invoice_number}.pdf`);
  },

  getInvoicePDFBlob(invoice: Invoice, client: Client): Blob {
    const doc = this.generateInvoicePDF(invoice, client);
    return doc.output('blob');
  }
};

// Email service
export const emailService = {
  async sendInvoiceEmail(invoice: Invoice, client: Client, customMessage?: string): Promise<void> {
    try {
      // Generate PDF
      const pdfBlob = pdfService.getInvoicePDFBlob(invoice, client);
      
      // Convert blob to base64
      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // Send email via Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          to: client.email,
          subject: `Invoice ${invoice.invoice_number} from TogNinja`,
          invoice: invoice,
          client: client,
          customMessage: customMessage,
          pdfAttachment: pdfBase64
        }
      });

      if (error) throw error;

      // Update invoice status
      await invoiceService.updateInvoice(invoice.id!, { status: 'sent' });

      return data;
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async sendPaymentReminder(invoice: Invoice, client: Client): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
        body: {
          to: client.email,
          subject: `Payment Reminder - Invoice ${invoice.invoice_number}`,
          invoice: invoice,
          client: client
        }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      // console.error removed
      throw error;
    }
  }
};

// Price list service
export const priceListService = {
  async getPriceListItems(): Promise<PriceListItem[]> {
    try {
      const response = await fetch('/api/crm/price-list');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  },

  async createPriceListItem(item: Omit<PriceListItem, 'id'>): Promise<PriceListItem> {
    try {
      const { data, error } = await supabase
        .from('price_list')
        .insert([item])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async updatePriceListItem(id: string, updates: Partial<PriceListItem>): Promise<PriceListItem> {
    try {
      const { data, error } = await supabase
        .from('price_list')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async deletePriceListItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('price_list')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async importPriceList(items: Omit<PriceListItem, 'id'>[]): Promise<PriceListItem[]> {
    try {
      const { data, error } = await supabase
        .from('price_list')
        .insert(items)
        .select();

      if (error) throw error;

      return data || [];
    } catch (error) {
      // console.error removed
      throw error;
    }
  }
};

// Payment tracking
export const paymentService = {
  async markInvoiceAsPaid(invoiceId: string, paymentDate?: string, paymentMethod?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: paymentDate || new Date().toISOString(),
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async getPaymentStats(): Promise<{
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    averagePaymentTime: number;
  }> {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*');

      if (error) throw error;

      const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
      const pendingInvoices = invoices?.filter(inv => inv.status === 'sent') || [];
      const overdueInvoices = invoices?.filter(inv => {
        return inv.status === 'sent' && new Date(inv.due_date) < new Date();
      }) || [];

      const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

      // Calculate average payment time
      const paymentTimes = paidInvoices
        .filter(inv => inv.paid_date && inv.issue_date)
        .map(inv => {
          const issueDate = new Date(inv.issue_date);
          const paidDate = new Date(inv.paid_date!);
          return Math.floor((paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
        });

      const averagePaymentTime = paymentTimes.length > 0 
        ? paymentTimes.reduce((sum, days) => sum + days, 0) / paymentTimes.length
        : 0;

      return {
        totalPaid,
        totalPending,
        totalOverdue,
        averagePaymentTime: Math.round(averagePaymentTime)
      };
    } catch (error) {
      // console.error removed
      throw error;
    }
  }
};
