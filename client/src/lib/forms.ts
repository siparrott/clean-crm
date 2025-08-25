import { supabase } from './supabase';

interface ContactFormData {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

interface WaitlistFormData extends ContactFormData {
  preferredDate: string;
}

export async function submitContactForm(formData: ContactFormData) {
  try {
    // First try the Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public/contact/kontakt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      // If Edge Function fails, fall back to direct database insert
      // console.warn removed
      return await submitContactFormFallback(formData);
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    // Fallback to direct database insert
    return await submitContactFormFallback(formData);
  }
}

export async function submitWaitlistForm(formData: WaitlistFormData) {
  try {
    // First try the Edge Function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public/contact/warteliste`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      // If Edge Function fails, fall back to direct database insert
      // console.warn removed
      return await submitWaitlistFormFallback(formData);
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    // Fallback to direct database insert
    return await submitWaitlistFormFallback(formData);
  }
}

// Fallback functions that insert directly into the database
async function submitContactFormFallback(formData: ContactFormData) {
  try {
    const response = await fetch('/api/public/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        message: formData.message,
        source: 'KONTAKT',
        status: 'new'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit contact form');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw new Error('Failed to submit contact form');
  }
}

async function submitWaitlistFormFallback(formData: WaitlistFormData) {
  const message = `Preferred Date: ${formData.preferredDate}${formData.message ? '\n\nMessage: ' + formData.message : ''}`;

  try {
    const response = await fetch('/api/public/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        message: message,
        source: 'WARTELISTE',
        status: 'new'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit waitlist form');
    }

    return await response.json();
  } catch (error) {
    // console.error removed
    throw new Error('Failed to submit waitlist form');
  }
}

export async function submitNewsletterForm(email: string) {
  try {
    // Use the backend API endpoint
    const response = await fetch('/api/public/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Newsletter Subscriber',
        email: email,
        phone: null,
        message: 'Newsletter signup - €50 Print Gutschein interest',
        source: 'NEWSLETTER',
        status: 'new'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit newsletter signup');
    }

    const result = await response.json();
    return { success: true, data: result, message: 'Newsletter signup successful!' };
  } catch (error) {
    // console.error removed
    throw new Error('Failed to process newsletter signup - please try again later');
  }
}

async function submitNewsletterFormFallback(email: string) {
  try {
    // First try to use the database function if it exists
    const { data: functionResult, error: functionError } = await supabase
      .rpc('handle_newsletter_signup', { email_input: email });

    if (!functionError && functionResult?.success) {
      return functionResult;
    }

    // console.log removed

    // Check if user already exists in leads table
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id, email, form_source')
      .eq('email', email);

    if (existingLeads && existingLeads.length > 0) {
      // Check if they already have a newsletter signup lead
      const hasNewsletterLead = existingLeads.some(lead => 
        lead.form_source === 'NEWSLETTER' || 
        (lead.form_source === 'KONTAKT' && lead.email === email)
      );
      
      if (hasNewsletterLead) {
        return { success: true, message: 'Already subscribed to newsletter!' };
      }
    }

    // Try to create lead with NEWSLETTER form_source first
    let leadData = {
      first_name: 'Newsletter',
      last_name: 'Subscriber',
      email: email,
      message: 'Newsletter signup - €50 Print Gutschein',
      form_source: 'NEWSLETTER',
      status: 'NEW'
    };

    let { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    // If NEWSLETTER form_source fails, fall back to KONTAKT
    if (error && (error.message?.includes('form_source') || error.code === '23514')) {
      // console.log removed
      leadData = {
        ...leadData,
        form_source: 'KONTAKT',
        message: 'Newsletter signup - €50 Print Gutschein (via Contact Form)'
      };

      const result = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      // If email already exists as a lead, don't treat as error
      if (error.code === '23505') {
        return { success: true, message: 'Already subscribed to newsletter!' };
      }
      // console.error removed
      throw new Error(`Database error: ${error.message}. Please ensure the 'leads' table exists and is properly configured.`);
    }

    // Also try to add to newsletter_subscribers table if it exists
    try {
      const { error: subscriberError } = await supabase
        .from('newsletter_subscribers')
        .insert([{ 
          email,
          created_at: new Date().toISOString(),
          active: true
        }]);
      
      if (subscriberError && subscriberError.code !== '23505') {
        // console.warn removed
      }
    } catch (subscriptionError) {
      // Don't fail if newsletter_subscribers insert fails
      // console.warn removed
    }

    return { success: true, data, message: 'Newsletter signup successful' };
  } catch (error) {
    // console.error removed
    throw new Error('Failed to process newsletter signup - please try again later');
  }
}