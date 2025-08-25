import { supabase } from './supabase';
import {
  EmailCampaign,
  EmailSequence,
  Subscriber,
  Segment,
  EmailTemplate,
  AutomationRule,
  EmailAnalytics,
  EmailEvent,
  AIInsight,
  AIRecommendation
} from '../types/email-marketing';

// Campaign Management
export async function createCampaign(campaign: Partial<EmailCampaign>): Promise<EmailCampaign> {
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert([campaign])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCampaign(id: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign> {
  const { data, error } = await supabase
    .from('email_campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCampaigns(filters?: Record<string, any>): Promise<EmailCampaign[]> {
  let query = supabase.from('email_campaigns').select('*');
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function sendCampaign(id: string, options?: { test_send?: boolean; test_emails?: string[] }): Promise<void> {
  const response = await fetch('/api/email/campaigns/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaign_id: id, ...options })
  });

  if (!response.ok) {
    throw new Error('Failed to send campaign');
  }
}

export async function duplicateCampaign(id: string, name?: string): Promise<EmailCampaign> {
  const { data: original, error: fetchError } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const duplicate = {
    ...original,
    id: undefined,
    name: name || `${original.name} (Copy)`,
    status: 'draft' as const,
    scheduled_at: null,
    sent_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return createCampaign(duplicate);
}

// Email Sequences (Drip Campaigns)
export async function createSequence(sequence: Partial<EmailSequence>): Promise<EmailSequence> {
  const { data, error } = await supabase
    .from('email_sequences')
    .insert([sequence])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSequences(): Promise<EmailSequence[]> {
  const { data, error } = await supabase
    .from('email_sequences')
    .select('*, emails:sequence_emails(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateSequence(id: string, updates: Partial<EmailSequence>): Promise<EmailSequence> {
  const { data, error } = await supabase
    .from('email_sequences')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function enrollSubscriberInSequence(subscriberId: string, sequenceId: string): Promise<void> {
  const { error } = await supabase
    .from('sequence_enrollments')
    .insert([{
      subscriber_id: subscriberId,
      sequence_id: sequenceId,
      status: 'active',
      current_email_index: 0,
      enrolled_at: new Date().toISOString()
    }]);

  if (error) throw error;
}

// Subscriber Management
export async function createSubscriber(subscriber: Partial<Subscriber>): Promise<Subscriber> {
  const { data, error } = await supabase
    .from('email_subscribers')
    .insert([subscriber])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSubscribers(filters?: {
  status?: string;
  tags?: string[];
  segment?: string;
  search?: string;
}): Promise<Subscriber[]> {
  let query = supabase.from('email_subscribers').select('*');

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  if (filters?.search) {
    query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('subscription_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateSubscriber(id: string, updates: Partial<Subscriber>): Promise<Subscriber> {
  const { data, error } = await supabase
    .from('email_subscribers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addTagsToSubscriber(subscriberId: string, tags: string[]): Promise<void> {
  const { data: subscriber, error: fetchError } = await supabase
    .from('email_subscribers')
    .select('tags')
    .eq('id', subscriberId)
    .single();

  if (fetchError) throw fetchError;

  const existingTags = subscriber.tags || [];
  const newTags = [...new Set([...existingTags, ...tags])];

  const { error: updateError } = await supabase
    .from('email_subscribers')
    .update({ tags: newTags })
    .eq('id', subscriberId);

  if (updateError) throw updateError;
}

export async function removeTagsFromSubscriber(subscriberId: string, tags: string[]): Promise<void> {
  const { data: subscriber, error: fetchError } = await supabase
    .from('email_subscribers')
    .select('tags')
    .eq('id', subscriberId)
    .single();

  if (fetchError) throw fetchError;
  const existingTags: string[] = subscriber.tags || [];
  const newTags = existingTags.filter((tag: string) => !tags.includes(tag));

  const { error: updateError } = await supabase
    .from('email_subscribers')
    .update({ tags: newTags })
    .eq('id', subscriberId);

  if (updateError) throw updateError;
}

// Segment Management
export async function createSegment(segment: Partial<Segment>): Promise<Segment> {
  const { data, error } = await supabase
    .from('email_segments')
    .insert([segment])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSegments(): Promise<Segment[]> {
  const { data, error } = await supabase
    .from('email_segments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateSegment(id: string, updates: Partial<Segment>): Promise<Segment> {
  const { data, error } = await supabase
    .from('email_segments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSegmentSubscribers(segmentId: string): Promise<Subscriber[]> {  // This would implement the segment logic based on conditions
  const { error: segmentError } = await supabase
    .from('email_segments')
    .select('*')
    .eq('id', segmentId)
    .single();

  if (segmentError) throw segmentError;

  // Apply segment conditions to get matching subscribers
  // This is a simplified implementation - in reality, you'd build dynamic queries
  const { data, error } = await supabase
    .from('email_subscribers')
    .select('*')
    .eq('status', 'subscribed');

  if (error) throw error;
  return data || [];
}

// Template Management
export async function createTemplate(template: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .insert([template])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTemplates(category?: string): Promise<EmailTemplate[]> {
  let query = supabase.from('email_templates').select('*');
  
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Automation Rules
export async function createAutomationRule(rule: Partial<AutomationRule>): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('email_automation_rules')
    .insert([rule])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAutomationRules(): Promise<AutomationRule[]> {
  const { data, error } = await supabase
    .from('email_automation_rules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateAutomationRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('email_automation_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Analytics
export async function getCampaignAnalytics(campaignId: string, period: string = 'month'): Promise<EmailAnalytics> {
  const response = await fetch(`/api/email/analytics/campaign/${campaignId}?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch campaign analytics');
  }
  return response.json();
}

export async function getSequenceAnalytics(sequenceId: string): Promise<EmailAnalytics> {
  const response = await fetch(`/api/email/analytics/sequence/${sequenceId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch sequence analytics');
  }
  return response.json();
}

export async function getOverallAnalytics(period: string = 'month'): Promise<EmailAnalytics> {
  const response = await fetch(`/api/email/analytics/overall?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch overall analytics');
  }
  return response.json();
}

// AI-Powered Features
export async function getAIInsights(type?: string): Promise<AIInsight[]> {
  const response = await fetch(`/api/email/ai/insights${type ? `?type=${type}` : ''}`);
  if (!response.ok) {
    throw new Error('Failed to fetch AI insights');
  }
  return response.json();
}

export async function getAIRecommendations(campaignId?: string): Promise<AIRecommendation[]> {
  const response = await fetch(`/api/email/ai/recommendations${campaignId ? `?campaign_id=${campaignId}` : ''}`);
  if (!response.ok) {
    throw new Error('Failed to fetch AI recommendations');
  }
  return response.json();
}

export async function generateSubjectLine(content: string, audience: string): Promise<string[]> {
  const response = await fetch('/api/email/ai/subject-lines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, audience })
  });

  if (!response.ok) {
    throw new Error('Failed to generate subject lines');
  }

  const data = await response.json();
  return data.suggestions;
}

export async function optimizeSendTime(subscriberId: string): Promise<string> {
  const response = await fetch(`/api/email/ai/send-time/${subscriberId}`);
  if (!response.ok) {
    throw new Error('Failed to optimize send time');
  }

  const data = await response.json();
  return data.optimal_time;
}

export async function predictEngagement(campaignId: string): Promise<{
  predicted_open_rate: number;
  predicted_click_rate: number;
  confidence: number;
}> {
  const response = await fetch(`/api/email/ai/predict-engagement/${campaignId}`);
  if (!response.ok) {
    throw new Error('Failed to predict engagement');
  }
  return response.json();
}

// Event Tracking
export async function trackEmailEvent(event: Partial<EmailEvent>): Promise<void> {
  const { error } = await supabase
    .from('email_events')
    .insert([event]);

  if (error) throw error;
}

export async function getEmailEvents(filters?: {
  campaign_id?: string;
  subscriber_id?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<EmailEvent[]> {
  let query = supabase.from('email_events').select('*');

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (key === 'start_date') {
          query = query.gte('timestamp', value);
        } else if (key === 'end_date') {
          query = query.lte('timestamp', value);
        } else {
          query = query.eq(key, value);
        }
      }
    });
  }

  const { data, error } = await query.order('timestamp', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Advanced Features
export async function createABTest(campaignId: string, testConfig: any): Promise<void> {
  const response = await fetch('/api/email/ab-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaign_id: campaignId, config: testConfig })
  });

  if (!response.ok) {
    throw new Error('Failed to create A/B test');
  }
}

export async function getDeliverabilityReport(): Promise<{
  reputation_score: number;
  bounce_rate: number;
  complaint_rate: number;
  spam_score: number;
  domain_health: Record<string, any>;
  recommendations: string[];
}> {
  const response = await fetch('/api/email/deliverability');
  if (!response.ok) {
    throw new Error('Failed to fetch deliverability report');
  }
  return response.json();
}

export async function validateEmailList(emails: string[]): Promise<{
  valid: string[];
  invalid: string[];
  risky: string[];
  unknown: string[];
}> {
  const response = await fetch('/api/email/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails })
  });

  if (!response.ok) {
    throw new Error('Failed to validate email list');
  }
  return response.json();
}

export async function sendTransactionalEmail(data: {
  to: string;
  template_id: string;
  variables: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}): Promise<void> {
  const response = await fetch('/api/email/transactional', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to send transactional email');
  }
}

// Bulk Operations
export async function bulkImportSubscribers(subscribers: Partial<Subscriber>[]): Promise<{
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}> {
  const response = await fetch('/api/email/subscribers/bulk-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscribers })
  });

  if (!response.ok) {
    throw new Error('Failed to import subscribers');
  }
  return response.json();
}

export async function bulkUpdateSubscribers(updates: {
  subscriber_ids: string[];
  changes: Partial<Subscriber>;
}): Promise<void> {
  const response = await fetch('/api/email/subscribers/bulk-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    throw new Error('Failed to update subscribers');
  }
}
