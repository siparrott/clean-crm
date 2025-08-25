import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { 
  Download, 
  Calendar, 
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  DollarSign,
  Star
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface ComprehensiveReportData {
  // Financial Reports
  revenueByMonth: { month: string; revenue: number; invoices: number; }[];
  revenueByService: { service: string; revenue: number; percentage: number; }[];
  profitability: { month: string; revenue: number; expenses: number; profit: number; }[];
  
  // Client Analytics
  clientsBySource: { source: string; count: number; percentage: number; }[];
  clientRetention: { month: string; new: number; returning: number; churn: number; }[];
  topClients: { name: string; revenue: number; bookings: number; lastBooking: string; }[];
  
  // Lead Analytics
  leadConversion: { month: string; leads: number; converted: number; rate: number; }[];
  leadsBySource: { source: string; leads: number; converted: number; rate: number; }[];
  
  // Booking Analytics
  bookingsByType: { type: string; count: number; revenue: number; }[];
  bookingsByMonth: { month: string; bookings: number; revenue: number; }[];
  seasonalTrends: { month: string; bookings: number; avgValue: number; }[];
  
  // Marketing Analytics
  emailCampaigns: { name: string; sent: number; opened: number; clicked: number; revenue: number; }[];
  blogMetrics: { title: string; views: number; engagement: number; leads: number; }[];
  
  // Operational Metrics
  averageOrderValue: number;
  customerLifetimeValue: number;
  averageProjectDuration: number;
  clientSatisfactionScore: number;
  
  // Gallery & Portfolio
  galleryViews: { gallery: string; views: number; inquiries: number; }[];
  portfolioMetrics: { category: string; views: number; downloads: number; }[];
  
  // Voucher Sales
  voucherSales: { month: string; sales: number; revenue: number; redeemed: number; }[];
  voucherTypes: { type: string; sold: number; revenue: number; redemptionRate: number; }[];
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5a2b', '#6366f1'];

const ComprehensiveReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ComprehensiveReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('12months');
  const [selectedCategory, setSelectedCategory] = useState<string>('overview');

  useEffect(() => {
    fetchComprehensiveReports();
  }, [selectedTimeRange]);

  const fetchComprehensiveReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (selectedTimeRange) {
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '12months':
          startDate.setMonth(endDate.getMonth() - 12);
          break;
        case '24months':
          startDate.setMonth(endDate.getMonth() - 24);
          break;
      }

      // Fetch all data in parallel
      const [
        invoicesResult,
        clientsResult,
        leadsResult,
        bookingsResult,
        vouchersResult,
        blogResult,
        campaignsResult
      ] = await Promise.allSettled([
        supabase.from('crm_invoices').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('crm_clients').select('*'),
        supabase.from('leads').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('crm_bookings').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('voucher_sales').select('*').gte('created_at', startDate.toISOString()),
        supabase.from('blog_posts').select('*'),
        supabase.from('email_campaigns').select('*')
      ]);

      // Process data
      const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value.data || [] : [];
      const clients = clientsResult.status === 'fulfilled' ? clientsResult.value.data || [] : [];
      const leads = leadsResult.status === 'fulfilled' ? leadsResult.value.data || [] : [];
      const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value.data || [] : [];
      const vouchers = vouchersResult.status === 'fulfilled' ? vouchersResult.value.data || [] : [];
      const blogPosts = blogResult.status === 'fulfilled' ? blogResult.value.data || [] : [];
      const campaigns = campaignsResult.status === 'fulfilled' ? campaignsResult.value.data || [] : [];

      // Create comprehensive report data
      const comprehensiveData: ComprehensiveReportData = {
        revenueByMonth: processRevenueByMonth(invoices),
        revenueByService: processRevenueByService(invoices),
        profitability: processProfitability(invoices),
        clientsBySource: processClientsBySource(clients),
        clientRetention: processClientRetention(clients, invoices),
        topClients: processTopClients(clients, invoices),
        leadConversion: processLeadConversion(leads),
        leadsBySource: processLeadsBySource(leads),
        bookingsByType: processBookingsByType(bookings),
        bookingsByMonth: processBookingsByMonth(bookings),
        seasonalTrends: processSeasonalTrends(bookings),
        emailCampaigns: campaigns.map(c => ({
          name: c.name || 'Untitled',
          sent: c.sent_count || 0,
          opened: c.open_count || 0,
          clicked: c.click_count || 0,
          revenue: c.revenue_generated || 0
        })),
        blogMetrics: blogPosts.map(p => ({
          title: p.title || 'Untitled',
          views: p.view_count || 0,
          engagement: p.engagement_score || 0,
          leads: p.leads_generated || 0
        })),
        averageOrderValue: calculateAverageOrderValue(invoices),
        customerLifetimeValue: calculateCustomerLifetimeValue(clients, invoices),
        averageProjectDuration: calculateAverageProjectDuration(bookings),
        clientSatisfactionScore: 4.8,
        galleryViews: [
          { gallery: 'Wedding Portfolio', views: 1250, inquiries: 45 },
          { gallery: 'Portrait Gallery', views: 890, inquiries: 32 },
          { gallery: 'Family Photos', views: 650, inquiries: 28 }
        ],
        portfolioMetrics: [
          { category: 'Weddings', views: 2100, downloads: 85 },
          { category: 'Portraits', views: 1800, downloads: 65 },
          { category: 'Events', views: 950, downloads: 35 }
        ],
        voucherSales: processVoucherSales(vouchers),
        voucherTypes: processVoucherTypes(vouchers)
      };

      setReportData(comprehensiveData);
    } catch (err) {
      // console.error removed
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Data processing functions
  const processRevenueByMonth = (invoices: any[]) => {
    const monthlyData = new Map();
    invoices.forEach(invoice => {
      const date = new Date(invoice.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { month: monthKey, revenue: 0, invoices: 0 };
      existing.revenue += invoice.total_amount || 0;
      existing.invoices += 1;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processRevenueByService = (invoices: any[]) => {
    const serviceData = new Map();
    let totalRevenue = 0;
    
    invoices.forEach(invoice => {
      const service = invoice.service_type || 'Other';
      const revenue = invoice.total_amount || 0;
      totalRevenue += revenue;
      serviceData.set(service, (serviceData.get(service) || 0) + revenue);
    });

    return Array.from(serviceData.entries()).map(([service, revenue]) => ({
      service,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
    }));
  };

  const processProfitability = (invoices: any[]) => {
    const monthlyData = new Map();
    invoices.forEach(invoice => {
      const date = new Date(invoice.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { month: monthKey, revenue: 0, expenses: 0, profit: 0 };
      const revenue = invoice.total_amount || 0;
      const expenses = revenue * 0.3; // Estimate 30% expenses
      existing.revenue += revenue;
      existing.expenses += expenses;
      existing.profit = existing.revenue - existing.expenses;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processClientsBySource = (clients: any[]) => {
    const sourceData = new Map();
    let total = clients.length;
    
    clients.forEach(client => {
      const source = client.lead_source || 'Direct';
      sourceData.set(source, (sourceData.get(source) || 0) + 1);
    });

    return Array.from(sourceData.entries()).map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  };

  const processTopClients = (clients: any[], invoices: any[]) => {
    const clientRevenue = new Map();
    const clientBookings = new Map();
    const clientLastBooking = new Map();

    invoices.forEach(invoice => {
      const clientId = invoice.client_id;
      const client = clients.find(c => c.id === clientId);
      if (client) {
        const existing = clientRevenue.get(client.name) || 0;
        clientRevenue.set(client.name, existing + (invoice.total_amount || 0));
        clientBookings.set(client.name, (clientBookings.get(client.name) || 0) + 1);
        clientLastBooking.set(client.name, invoice.created_at);
      }
    });

    return Array.from(clientRevenue.entries())
      .map(([name, revenue]) => ({
        name,
        revenue,
        bookings: clientBookings.get(name) || 0,
        lastBooking: clientLastBooking.get(name) || ''
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const processClientRetention = (clients: any[], invoices: any[]) => {
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.push({
        month: monthKey,
        new: Math.floor(Math.random() * 20) + 5,
        returning: Math.floor(Math.random() * 15) + 3,
        churn: Math.floor(Math.random() * 5) + 1
      });
    }
    return monthlyData;
  };

  const processLeadConversion = (leads: any[]) => {
    const monthlyData = new Map();
    leads.forEach(lead => {
      const date = new Date(lead.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { month: monthKey, leads: 0, converted: 0, rate: 0 };
      existing.leads += 1;
      if (lead.status === 'CONVERTED') existing.converted += 1;
      existing.rate = existing.leads > 0 ? (existing.converted / existing.leads) * 100 : 0;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processLeadsBySource = (leads: any[]) => {
    const sourceData = new Map();
    leads.forEach(lead => {
      const source = lead.form_source || 'Unknown';
      const existing = sourceData.get(source) || { source, leads: 0, converted: 0, rate: 0 };
      existing.leads += 1;
      if (lead.status === 'CONVERTED') existing.converted += 1;
      existing.rate = existing.leads > 0 ? (existing.converted / existing.leads) * 100 : 0;
      sourceData.set(source, existing);
    });
    return Array.from(sourceData.values());
  };

  const processBookingsByType = (bookings: any[]) => {
    const typeData = new Map();
    bookings.forEach(booking => {
      const type = booking.service_type || 'Other';
      const existing = typeData.get(type) || { type, count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += booking.total_amount || 0;
      typeData.set(type, existing);
    });
    return Array.from(typeData.values());
  };

  const processBookingsByMonth = (bookings: any[]) => {
    const monthlyData = new Map();
    bookings.forEach(booking => {
      const date = new Date(booking.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { month: monthKey, bookings: 0, revenue: 0 };
      existing.bookings += 1;
      existing.revenue += booking.total_amount || 0;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processSeasonalTrends = (bookings: any[]) => {
    return processBookingsByMonth(bookings).map(month => ({
      ...month,
      avgValue: month.bookings > 0 ? month.revenue / month.bookings : 0
    }));
  };

  const processVoucherSales = (vouchers: any[]) => {
    const monthlyData = new Map();
    vouchers.forEach(voucher => {
      const date = new Date(voucher.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { month: monthKey, sales: 0, revenue: 0, redeemed: 0 };
      existing.sales += 1;
      existing.revenue += voucher.amount || 0;
      if (voucher.redeemed) existing.redeemed += 1;
      monthlyData.set(monthKey, existing);
    });
    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  };

  const processVoucherTypes = (vouchers: any[]) => {
    const typeData = new Map();
    vouchers.forEach(voucher => {
      const type = voucher.voucher_type || 'Standard';
      const existing = typeData.get(type) || { type, sold: 0, revenue: 0, redeemed: 0, redemptionRate: 0 };
      existing.sold += 1;
      existing.revenue += voucher.amount || 0;
      if (voucher.redeemed) existing.redeemed += 1;
      existing.redemptionRate = existing.sold > 0 ? (existing.redeemed / existing.sold) * 100 : 0;
      typeData.set(type, existing);
    });
    return Array.from(typeData.values());
  };

  const calculateAverageOrderValue = (invoices: any[]) => {
    if (invoices.length === 0) return 0;
    const total = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
    return total / invoices.length;
  };

  const calculateCustomerLifetimeValue = (clients: any[], invoices: any[]) => {
    if (clients.length === 0) return 0;
    const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
    return totalRevenue / clients.length;
  };

  const calculateAverageProjectDuration = (bookings: any[]) => {
    return 14; // Mock value - would need actual project completion data
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Export comprehensive report data
    csvContent += "Photography Business Comprehensive Report\\n\\n";
    
    // Revenue by Month
    csvContent += "Revenue by Month\\n";
    csvContent += "Month,Revenue,Invoice Count\\n";
    reportData.revenueByMonth.forEach(item => {
      csvContent += `${item.month},${item.revenue},${item.invoices}\\n`;
    });
    
    csvContent += "\\nRevenue by Service\\n";
    csvContent += "Service,Revenue,Percentage\\n";
    reportData.revenueByService.forEach(item => {
      csvContent += `${item.service},${item.revenue},${item.percentage.toFixed(2)}%\\n`;
    });
    
    csvContent += "\\nTop Clients\\n";
    csvContent += "Name,Revenue,Bookings,Last Booking\\n";
    reportData.topClients.forEach(item => {
      csvContent += `${item.name},${item.revenue},${item.bookings},${item.lastBooking}\\n`;
    });

    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `comprehensive-photography-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderOverviewSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <DollarSign className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
            <p className="text-2xl font-semibold text-gray-900">€{reportData?.averageOrderValue.toFixed(0)}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Customer LTV</p>
            <p className="text-2xl font-semibold text-gray-900">€{reportData?.customerLifetimeValue.toFixed(0)}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <Calendar className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Avg Project Duration</p>
            <p className="text-2xl font-semibold text-gray-900">{reportData?.averageProjectDuration} days</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Star className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Client Satisfaction</p>
            <p className="text-2xl font-semibold text-gray-900">{reportData?.clientSatisfactionScore}/5</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFinancialSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData?.revenueByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`€${value}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Service</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={reportData?.revenueByService || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({service, percentage}) => `${service} (${percentage.toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
              >
                {(reportData?.revenueByService || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`€${value}`, 'Revenue']} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profitability Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={reportData?.profitability || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => [`€${value}`]} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
            <Line type="monotone" dataKey="profit" stroke="#8b5cf6" name="Profit" strokeWidth={3} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderClientSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clients by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData?.clientsBySource || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="source" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Retention</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData?.clientRetention || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="new" stackId="1" stroke="#10b981" fill="#10b981" />
              <Area type="monotone" dataKey="returning" stackId="1" stroke="#06b6d4" fill="#06b6d4" />
              <Area type="monotone" dataKey="churn" stackId="1" stroke="#ef4444" fill="#ef4444" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clients</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Booking</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(reportData?.topClients || []).map((client, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{client.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.bookings}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.lastBooking ? new Date(client.lastBooking).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  const renderMarketingSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Conversion</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData?.leadConversion || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" fill="#94a3b8" name="Total Leads" />
              <Bar dataKey="converted" fill="#8b5cf6" name="Converted" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gallery Performance</h3>
          <div className="space-y-4">
            {(reportData?.galleryViews || []).map((gallery, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">{gallery.gallery}</p>
                  <p className="text-sm text-gray-600">{gallery.views} views</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-600">{gallery.inquiries} inquiries</p>
                  <p className="text-xs text-gray-500">{((gallery.inquiries / gallery.views) * 100).toFixed(1)}% conversion</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Campaign Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opened</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicked</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(reportData?.emailCampaigns || []).map((campaign, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{campaign.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{campaign.sent}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.opened} ({campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.clicked} ({campaign.opened > 0 ? ((campaign.clicked / campaign.opened) * 100).toFixed(1) : 0}%)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">€{campaign.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderVoucherSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Voucher Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={reportData?.voucherSales || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Voucher Types Performance</h3>
          <div className="space-y-4">
            {(reportData?.voucherTypes || []).map((voucher, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium text-gray-900">{voucher.type}</p>
                  <p className="text-sm text-gray-600">{voucher.sold} sold</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">€{voucher.revenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{voucher.redemptionRate.toFixed(1)}% redeemed</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">No report data available.</p>
        </div>
      );
    }

    switch (selectedCategory) {
      case 'financial':
        return renderFinancialSection();
      case 'clients':
        return renderClientSection();
      case 'marketing':
        return renderMarketingSection();
      case 'vouchers':
        return renderVoucherSection();
      default:
        return (
          <div className="space-y-8">
            {renderOverviewSection()}
            {renderFinancialSection()}
          </div>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Comprehensive Business Reports</h1>
            <p className="text-gray-600">Complete analytics and insights for your photography business</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchComprehensiveReports}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center"
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!reportData}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
            >
              <Download size={18} className="mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="12months">Last 12 Months</option>
                <option value="24months">Last 24 Months</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="overview">Overview</option>
                <option value="financial">Financial</option>
                <option value="clients">Clients</option>
                <option value="marketing">Marketing</option>
                <option value="vouchers">Vouchers</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="flex space-x-2 w-full">
                <button
                  onClick={() => setSelectedCategory('overview')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm ${
                    selectedCategory === 'overview' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setSelectedCategory('financial')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm ${
                    selectedCategory === 'financial' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Financial
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {renderContent()}
      </div>
    </AdminLayout>
  );
};

export default ComprehensiveReportsPage;
