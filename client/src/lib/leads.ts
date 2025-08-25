import { supabase } from './supabase';

export interface Lead {
  id: string;
  form_source: 'WARTELISTE' | 'KONTAKT';
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  created_at: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED';
}

export async function getLeads(status?: 'NEW' | 'CONTACTED' | 'CONVERTED') {
  try {
    const url = status ? `/api/crm/leads?status=${status.toLowerCase()}` : '/api/crm/leads';
    // Fetching leads from API
    
    const response = await fetch(url, {
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Response received
    
    if (!response.ok) {
      const errorText = await response.text();
      // console.error removed
      throw new Error(`Failed to fetch leads: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    // Raw API data received
    
    // Transform the CRM lead data to match the expected Lead interface
    const transformedData = data.map((lead: any) => ({
      id: lead.id,
      first_name: lead.name ? lead.name.split(' ')[0] : '',
      last_name: lead.name ? lead.name.split(' ').slice(1).join(' ') : '',
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      form_source: lead.source || 'MANUAL',
      status: lead.status ? lead.status.toUpperCase() : 'NEW',
      created_at: lead.createdAt
    }));
    
    // Data transformation completed
    return transformedData;
  } catch (error) {
    // console.error removed
    throw error;
  }
}

export async function updateLeadStatus(id: string, status: 'NEW' | 'CONTACTED' | 'CONVERTED') {
  try {
    const response = await fetch(`/api/crm/leads/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: status.toLowerCase() }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update lead status');
    }
    
    return await response.json();
  } catch (error) {
    // console.error removed
    throw error;
  }
}

export async function deleteLead(id: string) {
  try {
    const response = await fetch(`/api/crm/leads/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete lead');
    }
    
    return true;
  } catch (error) {
    // console.error removed
    throw error;
  }
}