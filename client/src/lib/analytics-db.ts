import { createClient } from '@supabase/supabase-js';

// Separate Supabase project for analytics (if needed)
const analyticsUrl = import.meta.env.VITE_ANALYTICS_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const analyticsKey = import.meta.env.VITE_ANALYTICS_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const analyticsDb = createClient(analyticsUrl, analyticsKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Analytics data types
export interface BusinessMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_type: 'revenue' | 'bookings' | 'leads' | 'conversion_rate' | 'client_satisfaction';
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_start: string;
  period_end: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ClientAnalytics {
  id: string;
  client_id: string;
  total_bookings: number;
  total_revenue: number;
  average_session_value: number;
  last_booking_date: string;
  client_lifetime_value: number;
  referral_count: number;
  satisfaction_score: number;
  created_at: string;
  updated_at: string;
}

export interface MarketingAnalytics {
  id: string;
  campaign_name: string;
  campaign_type: 'social_media' | 'email' | 'google_ads' | 'referral' | 'organic';
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  revenue: number;
  roi: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

// Analytics service functions
export class AnalyticsService {
  static async trackBusinessMetric(metric: Omit<BusinessMetric, 'id' | 'created_at'>) {
    const { data, error } = await analyticsDb
      .from('business_metrics')
      .insert([metric])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getBusinessMetrics(
    metricType?: string,
    periodType?: string,
    startDate?: string,
    endDate?: string
  ) {
    let query = analyticsDb.from('business_metrics').select('*');

    if (metricType) query = query.eq('metric_type', metricType);
    if (periodType) query = query.eq('period_type', periodType);
    if (startDate) query = query.gte('period_start', startDate);
    if (endDate) query = query.lte('period_end', endDate);

    const { data, error } = await query.order('period_start', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async updateClientAnalytics(clientId: string, analytics: Partial<ClientAnalytics>) {
    const { data, error } = await analyticsDb
      .from('client_analytics')
      .upsert([{ client_id: clientId, ...analytics, updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getClientAnalytics(clientId?: string) {
    let query = analyticsDb.from('client_analytics').select('*');
    
    if (clientId) query = query.eq('client_id', clientId);

    const { data, error } = await query.order('total_revenue', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async trackMarketingCampaign(campaign: Omit<MarketingAnalytics, 'id' | 'created_at'>) {
    const { data, error } = await analyticsDb
      .from('marketing_analytics')
      .insert([campaign])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getMarketingAnalytics(campaignType?: string, startDate?: string, endDate?: string) {
    let query = analyticsDb.from('marketing_analytics').select('*');

    if (campaignType) query = query.eq('campaign_type', campaignType);
    if (startDate) query = query.gte('period_start', startDate);
    if (endDate) query = query.lte('period_end', endDate);

    const { data, error } = await query.order('period_start', { ascending: false });
    if (error) throw error;
    return data;
  }

  // Calculate derived metrics
  static async calculateMonthlyRevenue(year: number, month: number) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    const { data, error } = await analyticsDb
      .from('business_metrics')
      .select('metric_value')
      .eq('metric_type', 'revenue')
      .eq('period_type', 'daily')
      .gte('period_start', startDate)
      .lte('period_end', endDate);

    if (error) throw error;
    
    const totalRevenue = data?.reduce((sum, metric) => sum + metric.metric_value, 0) || 0;
    
    // Store monthly aggregate
    await this.trackBusinessMetric({
      metric_name: 'monthly_revenue',
      metric_value: totalRevenue,
      metric_type: 'revenue',
      period_type: 'monthly',
      period_start: startDate,
      period_end: endDate
    });

    return totalRevenue;
  }

  static async calculateClientLifetimeValue(clientId: string) {
    // This would integrate with your main CRM database
    // to calculate total revenue from a specific client
    const { data: orders } = await analyticsDb
      .from('client_orders') // This would be a view or synced table
      .select('total_amount')
      .eq('client_id', clientId);

    const ltv = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

    await this.updateClientAnalytics(clientId, {
      client_lifetime_value: ltv
    });

    return ltv;
  }
}