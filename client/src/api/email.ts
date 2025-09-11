import { supabase } from '../lib/supabaseClient';

export interface Message {
  id: string;
  from_email: string;
  to_email: string;
  subject: string | null;
  body: string | null;
  thread_id: string | null;
  created_at: string;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
}

export async function fetchMessages() {
  const { data, error } = await supabase
    .from<Message>('messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function sendMessage(payload: Omit<Message, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from<Message>('messages')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveEmailSettings(settings: EmailSettings) {
  const response = await fetch('/api/email/settings/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save email settings');
  }

  return response.json();
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const response = await fetch('/api/email/settings', {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get email settings');
  }

  const result = await response.json();
  return {
    smtpHost: result.settings.smtp_host,
    smtpPort: result.settings.smtp_port.toString(),
    smtpUser: result.settings.smtp_user,
    smtpPass: result.settings.smtp_pass,
    fromEmail: result.settings.from_email,
    fromName: result.settings.from_name
  };
}
