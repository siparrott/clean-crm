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
