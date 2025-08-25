import { supabase } from './supabase';

export interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  totalClients: number;
  conversionRate: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  bookingsByType: Array<{ type: string; count: number }>;
  clientAcquisition: Array<{ month: string; clients: number }>;
  topServices: Array<{ service: string; revenue: number; bookings: number }>;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  revenueGrowth: number;
  unpaidInvoices: number;
  unpaidAmount: number;
}

export interface ClientMetrics {
  totalClients: number;
  newClientsThisMonth: number;
  clientGrowthRate: number;
  averageClientValue: number;
  topClients: Array<{ name: string; totalSpent: number; bookings: number }>;
}

export interface BookingMetrics {
  totalBookings: number;
  bookingsThisMonth: number;
  bookingGrowthRate: number;
  averageBookingValue: number;
  bookingsByStatus: Array<{ status: string; count: number }>;
  bookingsByService: Array<{ service: string; count: number; revenue: number }>;
}

export interface LeadMetrics {
  totalLeads: number;
  newLeadsThisMonth: number;
  conversionRate: number;
  leadSources: Array<{ source: string; count: number }>;
  leadsByStatus: Array<{ status: string; count: number }>;
}

export const analyticsService = {
  async getAnalyticsData(): Promise<AnalyticsData> {
    try {
      // Get revenue data
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid');

      // Get booking data
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*');

      // Get client data
      const { data: clients } = await supabase
        .from('clients')
        .select('*');

      // Calculate metrics
      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const totalBookings = bookings?.length || 0;
      const totalClients = clients?.length || 0;
      const conversionRate = totalClients > 0 ? (totalBookings / totalClients) * 100 : 0;

      // Calculate monthly revenue
      const monthlyRevenue = this.calculateMonthlyRevenue(invoices || []);

      // Calculate bookings by type
      const bookingsByType = this.calculateBookingsByType(bookings || []);

      // Calculate client acquisition
      const clientAcquisition = this.calculateClientAcquisition(clients || []);

      // Calculate top services
      const topServices = this.calculateTopServices(bookings || [], invoices || []);

      return {
        totalRevenue,
        totalBookings,
        totalClients,
        conversionRate,
        monthlyRevenue,
        bookingsByType,
        clientAcquisition,
        topServices
      };
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async getRevenueMetrics(): Promise<RevenueMetrics> {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*');

      const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
      const unpaidInvoices = invoices?.filter(inv => inv.status === 'pending') || [];

      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      // Calculate monthly revenue (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyRevenue = paidInvoices
        .filter(inv => {
          const invoiceDate = new Date(inv.created_at);
          return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      const averageOrderValue = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;

      // Calculate growth rate (simple month-over-month)
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const lastMonthRevenue = paidInvoices
        .filter(inv => {
          const invoiceDate = new Date(inv.created_at);
          return invoiceDate.getMonth() === lastMonth && invoiceDate.getFullYear() === lastMonthYear;
        })
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      const revenueGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      return {
        totalRevenue,
        monthlyRevenue,
        averageOrderValue,
        revenueGrowth,
        unpaidInvoices: unpaidInvoices.length,
        unpaidAmount
      };
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async getClientMetrics(): Promise<ClientMetrics> {
    try {
      const { data: clients } = await supabase
        .from('clients')
        .select('*');

      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid');

      const totalClients = clients?.length || 0;

      // Calculate new clients this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newClientsThisMonth = clients?.filter(client => {
        const clientDate = new Date(client.created_at);
        return clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear;
      }).length || 0;

      // Calculate growth rate
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const newClientsLastMonth = clients?.filter(client => {
        const clientDate = new Date(client.created_at);
        return clientDate.getMonth() === lastMonth && clientDate.getFullYear() === lastMonthYear;
      }).length || 0;

      const clientGrowthRate = newClientsLastMonth > 0 ? ((newClientsThisMonth - newClientsLastMonth) / newClientsLastMonth) * 100 : 0;

      // Calculate average client value
      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const averageClientValue = totalClients > 0 ? totalRevenue / totalClients : 0;

      // Calculate top clients
      const clientRevenue = new Map();
      const clientBookings = new Map();

      invoices?.forEach(invoice => {
        const clientId = invoice.client_id;
        const currentRevenue = clientRevenue.get(clientId) || 0;
        const currentBookings = clientBookings.get(clientId) || 0;
        clientRevenue.set(clientId, currentRevenue + (invoice.total_amount || 0));
        clientBookings.set(clientId, currentBookings + 1);
      });

      const topClients = Array.from(clientRevenue.entries())
        .map(([clientId, revenue]) => {
          const client = clients?.find(c => c.id === clientId);
          return {
            name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
            totalSpent: revenue,
            bookings: clientBookings.get(clientId) || 0
          };
        })
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      return {
        totalClients,
        newClientsThisMonth,
        clientGrowthRate,
        averageClientValue,
        topClients
      };
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  calculateMonthlyRevenue(invoices: any[]): Array<{ month: string; revenue: number }> {
    const monthlyData = new Map();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      monthlyData.set(monthKey, 0);
    }

    // Add invoice data
    invoices.forEach(invoice => {
      const date = new Date(invoice.created_at);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      if (monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, monthlyData.get(monthKey) + (invoice.total_amount || 0));
      }
    });

    return Array.from(monthlyData.entries()).map(([month, revenue]) => ({
      month,
      revenue
    }));
  },

  calculateBookingsByType(bookings: any[]): Array<{ type: string; count: number }> {
    const typeCount = new Map();

    bookings.forEach(booking => {
      const type = booking.service_type || 'Other';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });

    return Array.from(typeCount.entries()).map(([type, count]) => ({
      type,
      count
    }));
  },

  calculateClientAcquisition(clients: any[]): Array<{ month: string; clients: number }> {
    const monthlyData = new Map();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      monthlyData.set(monthKey, 0);
    }

    // Add client data
    clients.forEach(client => {
      const date = new Date(client.created_at);
      const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
      if (monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, monthlyData.get(monthKey) + 1);
      }
    });

    return Array.from(monthlyData.entries()).map(([month, clients]) => ({
      month,
      clients
    }));
  },

  calculateTopServices(bookings: any[], invoices: any[]): Array<{ service: string; revenue: number; bookings: number }> {
    const serviceData = new Map();

    bookings.forEach(booking => {
      const service = booking.service_type || 'Other';
      if (!serviceData.has(service)) {
        serviceData.set(service, { revenue: 0, bookings: 0 });
      }
      serviceData.get(service).bookings++;
    });

    invoices.forEach(invoice => {
      const service = invoice.service_type || 'Other';
      if (!serviceData.has(service)) {
        serviceData.set(service, { revenue: 0, bookings: 0 });
      }
      serviceData.get(service).revenue += invoice.total_amount || 0;
    });

    return Array.from(serviceData.entries())
      .map(([service, data]) => ({
        service,
        revenue: data.revenue,
        bookings: data.bookings
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }
};
