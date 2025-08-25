import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import EmbeddedCRMChat from '../../components/chat/EmbeddedCRMChat';
import { supabase } from '../../lib/supabase';
import { 
  BarChart as BarChartIcon, 
  Calendar as CalendarIcon, 
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Camera,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  // Key Metrics
  totalRevenue: number;
  monthlyRevenue: number;
  totalClients: number;
  newLeads: number;
  pendingInvoices: number;
  upcomingBookings: number;
  
  // Charts Data
  revenueChart: { month: string; revenue: number; bookings: number; }[];
  leadConversionChart: { month: string; leads: number; converted: number; }[];
  serviceDistribution: { service: string; count: number; revenue: number; }[];
  
  // Recent Activity
  recentLeads: any[];
  recentBookings: any[];
  recentInvoices: any[];
  
  // Performance Indicators
  monthlyGrowth: number;
  conversionRate: number;
  averageOrderValue: number;
  clientSatisfaction: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30days');

  // CRM Operations Assistant configuration
  const CRM_ASSISTANT_ID = 'asst_crm_operations_v1'; // Replace with your actual assistant ID

  const handleCRMAction = (action: any) => {
    // console.log removed
    
    // Handle different types of CRM actions
    switch (action.type) {
      case 'email':
        // Handle email actions (booking confirmations, replies, etc.)
        handleEmailAction(action);
        break;
      case 'booking':
        // Handle booking actions (create, update, cancel appointments)
        handleBookingAction(action);
        break;
      case 'client':
        // Handle client actions (add, update client records)
        handleClientAction(action);
        break;
      case 'invoice':
        // Handle invoice actions (generate, send invoices)
        handleInvoiceAction(action);
        break;
      case 'data':
        // Handle data actions (reports, exports)
        handleDataAction(action);
        break;
      case 'calendar':
        // Handle calendar actions (schedule, send invites)
        handleCalendarAction(action);
        break;
      default:
        // console.log removed
    }
    
    // Refresh dashboard data after action
    fetchDashboardData();
  };

  const handleEmailAction = (action: any) => {
    // Implement email-specific actions
    // console.log removed
    // This would integrate with your email system
  };

  const handleBookingAction = (action: any) => {
    // Implement booking-specific actions
    // console.log removed
    // This would integrate with your booking system
  };

  const handleClientAction = (action: any) => {
    // Implement client-specific actions
    // console.log removed
    // This would navigate to clients page or refresh client data
    if (action.action === 'view_clients') {
      navigate('/admin/clients');
    }
  };

  const handleInvoiceAction = (action: any) => {
    // Implement invoice-specific actions
    // console.log removed
    // This would integrate with your invoicing system
    if (action.action === 'view_invoices') {
      navigate('/admin/invoices');
    }
  };

  const handleDataAction = (action: any) => {
    // Implement data-specific actions
    // console.log removed
    // This would generate reports or export data
  };

  const handleCalendarAction = (action: any) => {
    // Implement calendar-specific actions
    // console.log removed
    // This would integrate with your calendar system
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Use the dedicated dashboard metrics endpoint that correctly calculates paid revenue
      const [
        metricsResponse,
        leadsResponse,
        bookingsResponse,
        invoicesResponse
      ] = await Promise.allSettled([
        fetch('/api/crm/dashboard/metrics'),
        fetch('/api/crm/leads'),
        fetch('/api/photography/sessions'),
        fetch('/api/crm/invoices')
      ]);

      // Process API responses
      const metrics = metricsResponse.status === 'fulfilled' && metricsResponse.value.ok ? 
        await metricsResponse.value.json() : {};
      const allLeads = leadsResponse.status === 'fulfilled' && leadsResponse.value.ok ? 
        await leadsResponse.value.json() : [];
      const bookings = bookingsResponse.status === 'fulfilled' && bookingsResponse.value.ok ? 
        await bookingsResponse.value.json() : [];
      const invoices = invoicesResponse.status === 'fulfilled' && invoicesResponse.value.ok ? 
        await invoicesResponse.value.json() : [];
      
      // Filter for new leads (last 30 days) - simplified to avoid date errors
      const newLeads = allLeads.filter((lead: any) => {
        try {
          const createdDate = new Date(lead.createdAt || lead.created_at);
          if (isNaN(createdDate.getTime())) return false;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return createdDate >= thirtyDaysAgo;
        } catch (error) {
          return false;
        }
      });
      
      // Filter for paid invoices to create charts
      const paidInvoices = invoices.filter((inv: any) => inv.status === 'paid');

      // Create simplified chart data
      const chartData = createMockChartData(
        metrics.totalRevenue || 0,
        metrics.paidInvoices || 0,
        allLeads.length
      );

      const dashboardData: DashboardData = {
        totalRevenue: metrics.totalRevenue || 0,
        monthlyRevenue: metrics.totalRevenue || 0,
        totalClients: metrics.totalClients || 0,
        newLeads: newLeads.length,
        pendingInvoices: invoices.filter((inv: any) => inv.status === 'pending').length,
        upcomingBookings: metrics.upcomingSessions || 0,
        revenueChart: chartData.revenueChart,
        leadConversionChart: chartData.leadConversionChart,
        serviceDistribution: chartData.serviceDistribution,
        recentLeads: newLeads.slice(0, 5),
        recentBookings: bookings.slice(0, 5),
        recentInvoices: paidInvoices.slice(0, 5),
        monthlyGrowth: 0, // Would need historical data
        conversionRate: allLeads.length > 0 ? (allLeads.filter(l => l.status === 'CONVERTED').length / allLeads.length) * 100 : 0,
        averageOrderValue: metrics.avgOrderValue || 0,
        clientSatisfaction: 4.8 // Mock data
      };

      setDashboardData(dashboardData);
    } catch (error) {
      // console.error removed
    } finally {
      setLoading(false);
    }
  };

  // Simplified chart processing without date parsing
  const createMockChartData = (revenue: number, invoiceCount: number, leadCount: number) => {
    return {
      revenueChart: [
        { month: 'Jul 2025', revenue: revenue, bookings: invoiceCount }
      ],
      leadConversionChart: [
        { month: 'Jul 2025', leads: leadCount, converted: 0 }
      ],
      serviceDistribution: [
        { service: 'Photography Services', count: invoiceCount, revenue: revenue }
      ]
    };
  };

  const MetricCard = ({ title, value, change, icon: Icon, color }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-1">
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderKeyMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total Revenue"
        value={`€${dashboardData?.totalRevenue.toLocaleString()}`}
        change={dashboardData?.monthlyGrowth}
        icon={DollarSign}
        color="bg-purple-500"
      />
      <MetricCard
        title="New Leads"
        value={dashboardData?.newLeads}
        icon={Users}
        color="bg-blue-500"
      />
      <MetricCard
        title="Upcoming Bookings"
        value={dashboardData?.upcomingBookings}
        icon={CalendarIcon}
        color="bg-green-500"
      />
      <MetricCard
        title="Conversion Rate"
        value={`${dashboardData?.conversionRate.toFixed(1)}%`}
        icon={TrendingUp}
        color="bg-orange-500"
      />
    </div>
  );

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dashboardData?.revenueChart || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={dashboardData?.serviceDistribution || []}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({service, count}) => `${service} (${count})`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="revenue"
            >
              {(dashboardData?.serviceDistribution || []).map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`€${value}`, 'Revenue']} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderRecentActivity = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Leads */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
            <button
              onClick={() => navigate('/admin/leads')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {(dashboardData?.recentLeads || []).slice(0, 5).map((lead, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {lead.name}
                  </p>
                  <p className="text-sm text-gray-600">{lead.email}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {lead.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {(() => {
                    try {
                      const date = new Date(lead.createdAt || lead.created_at);
                      return isNaN(date.getTime()) ? 'Recent' : format(date, 'MMM dd');
                    } catch (error) {
                      return 'Recent';
                    }
                  })()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Bookings</h3>
            <button
              onClick={() => navigate('/admin/calendar')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View Calendar
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {(dashboardData?.recentBookings || []).slice(0, 5).map((booking, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{booking.client_name || 'Client'}</p>
                  <p className="text-sm text-gray-600">{booking.service_type}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {(() => {
                      try {
                        const date = new Date(booking.booking_date || booking.sessionDate || booking.created_at);
                        return isNaN(date.getTime()) ? 'No date' : format(date, 'MMM dd, HH:mm');
                      } catch (error) {
                        return 'No date';
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
            <button
              onClick={() => navigate('/admin/invoices')}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {(dashboardData?.recentInvoices || []).slice(0, 5).map((invoice, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Invoice #{invoice.id?.substring(0, 8)}</p>
                  <p className="text-sm text-gray-600">€{(parseFloat(invoice.total) || 0).toFixed(2)}</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {(() => {
                    try {
                      const date = new Date(invoice.createdAt || invoice.created_at);
                      return isNaN(date.getTime()) ? 'Recent' : format(date, 'MMM dd');
                    } catch (error) {
                      return 'Recent';
                    }
                  })()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/admin/leads')}
          className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Users className="h-5 w-5 text-purple-600 mr-2" />
          <span className="text-sm font-medium">Add Lead</span>
        </button>
        <button
          onClick={() => navigate('/admin/calendar')}
          className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <CalendarIcon className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-sm font-medium">Schedule</span>
        </button>
        <button
          onClick={() => navigate('/admin/invoices')}
          className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FileText className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-sm font-medium">Create Invoice</span>
        </button>
        <button
          onClick={() => navigate('/admin/gallery')}
          className="flex items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Camera className="h-5 w-5 text-orange-600 mr-2" />
          <span className="text-sm font-medium">Upload Photos</span>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* DEBUG: AI Chat moved to bottom - June 26, 2025 */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overview of your photography business</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <button
              onClick={() => navigate('/admin/reports')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <BarChartIcon size={16} className="mr-2" />
              View Reports
            </button>
          </div>
        </div>


        {/* CRM Operations Assistant - Moved to top */}
        <div className="mt-6">
          {/* Quick Actions Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleCRMAction('reply_to_emails')}
                className="flex items-center space-x-3 text-sm p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-200 rounded-lg text-left transition-all group"
              >
                <svg className="h-5 w-5 text-blue-600 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">Reply to emails</span>
              </button>
              <button
                onClick={() => handleCRMAction('send_booking_confirmations')}
                className="flex items-center space-x-3 text-sm p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200 rounded-lg text-left transition-all group"
              >
                <svg className="h-5 w-5 text-green-600 group-hover:text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">Send booking confirmations</span>
              </button>
              <button
                onClick={() => handleCRMAction('add_new_client')}
                className="flex items-center space-x-3 text-sm p-4 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 border border-purple-200 rounded-lg text-left transition-all group"
              >
                <svg className="h-5 w-5 text-purple-600 group-hover:text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">Add new client</span>
              </button>
              <button
                onClick={() => handleCRMAction('generate_invoice')}
                className="flex items-center space-x-3 text-sm p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 border border-yellow-200 rounded-lg text-left transition-all group"
              >
                <svg className="h-5 w-5 text-yellow-600 group-hover:text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">Generate invoice</span>
              </button>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
              CRM Operations Assistant
            </h3>
            <EmbeddedCRMChat
              assistantId={CRM_ASSISTANT_ID}
              onCRMAction={handleCRMAction}
              height="600px"
              title="CRM Operations Assistant"
              className="w-full"
            />
          </div>
        </div>

        {/* Key Metrics */}
        {renderKeyMetrics()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Charts */}
        {renderCharts()}

        {/* Recent Activity */}
        {renderRecentActivity()}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
