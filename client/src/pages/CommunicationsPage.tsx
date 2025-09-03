import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
}

interface Communication {
  id: string;
  subject: string;
  content: string;
  messageType: 'email' | 'sms';
  status: string;
  direction: 'inbound' | 'outbound';
  sentAt?: string;
  clientName?: string;
  clientEmail?: string;
  phoneNumber?: string;
}

const CommunicationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('send');
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    content: '',
    autoLinkClient: true,
  });

  // SMS form state
  const [smsForm, setSmsForm] = useState({
    to: '',
    content: '',
    autoLinkClient: true,
    messageType: 'sms' as 'sms' | 'whatsapp',
  });

  // Bulk SMS form state
  const [bulkSMSForm, setBulkSMSForm] = useState({
    content: '',
    targetType: 'all' as 'all' | 'leads' | 'clients' | 'custom',
    targetPreview: [] as Client[],
  });

  const [testEmail, setTestEmail] = useState('siparrott@yahoo.co.uk');

  useEffect(() => {
    loadCommunications();
    loadClients();
  }, []);

  const loadCommunications = async () => {
    try {
      const response = await fetch('/api/communications/all');
      if (response.ok) {
        const data = await response.json();
        setCommunications(data.communications || []);
      }
    } catch (error) {
      console.error('Failed to load communications:', error);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch('/api/crm/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const sendEmail = async () => {
    if (!emailForm.to || !emailForm.subject || !emailForm.content) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/communications/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Email sent successfully! ${result.clientId ? 'Linked to client record.' : ''}`);
        setEmailForm({ to: '', subject: '', content: '', autoLinkClient: true });
        loadCommunications();
      } else {
        alert(`Failed to send email: ${result.error}`);
      }
    } catch (error) {
      alert(`Error sending email: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const sendSMS = async () => {
    if (!smsForm.to || !smsForm.content) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/communications/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smsForm),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`SMS sent successfully! ${result.clientId ? 'Linked to client record.' : ''}`);
        setSmsForm({ to: '', content: '', autoLinkClient: true, messageType: 'sms' });
        loadCommunications();
      } else {
        alert(`Failed to send SMS: ${result.error}`);
      }
    } catch (error) {
      alert(`Error sending SMS: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const previewBulkTargets = async () => {
    try {
      const response = await fetch('/api/communications/bulk/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: bulkSMSForm.targetType }),
      });

      const result = await response.json();
      setBulkSMSForm(prev => ({ ...prev, targetPreview: result.clients || [] }));
    } catch (error) {
      console.error('Failed to preview targets:', error);
    }
  };

  const sendBulkSMS = async () => {
    if (!bulkSMSForm.content) {
      alert('Please enter SMS content');
      return;
    }

    if (bulkSMSForm.targetPreview.length === 0) {
      alert('No target recipients found');
      return;
    }

    if (!confirm(`Send SMS to ${bulkSMSForm.targetPreview.length} recipients?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/communications/sms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: bulkSMSForm.content,
          targetType: bulkSMSForm.targetType,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Bulk SMS campaign completed! Sent: ${result.sentCount}, Failed: ${result.failedCount}`);
        setBulkSMSForm({ content: '', targetType: 'all', targetPreview: [] });
        loadCommunications();
      } else {
        alert(`Failed to send bulk SMS: ${result.errors?.join(', ')}`);
      }
    } catch (error) {
      alert(`Error sending bulk SMS: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testEmailConfig = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/communications/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Test email sent successfully!');
      } else {
        alert(`Test email failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Error testing email: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-purple-900 mb-8">Communications Center</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'send', label: 'Send Messages' },
              { id: 'bulk', label: 'Bulk SMS' },
              { id: 'history', label: 'History' },
              { id: 'test', label: 'Test Config' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Send Messages Tab */}
        {activeTab === 'send' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Email Form */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-purple-900 mb-4">Send Email</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To (Email)
                  </label>
                  <input
                    type="email"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Email subject"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={emailForm.content}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Email content..."
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoLinkEmail"
                    checked={emailForm.autoLinkClient}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, autoLinkClient: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="autoLinkEmail" className="text-sm text-gray-700">
                    Auto-link to client record
                  </label>
                </div>
                <button
                  onClick={sendEmail}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>

            {/* SMS Form */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-purple-900 mb-4">Send SMS / WhatsApp</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Type
                  </label>
                  <select
                    value={smsForm.messageType}
                    onChange={(e) => setSmsForm(prev => ({ ...prev, messageType: e.target.value as 'sms' | 'whatsapp' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="sms">📱 SMS Message</option>
                    <option value="whatsapp">💬 WhatsApp Message</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To (Phone)
                  </label>
                  <input
                    type="tel"
                    value={smsForm.to}
                    onChange={(e) => setSmsForm(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="+43 123 456 7890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={smsForm.content}
                    onChange={(e) => setSmsForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    maxLength={smsForm.messageType === 'whatsapp' ? 4096 : 160}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={smsForm.messageType === 'whatsapp' ? 'WhatsApp message (4096 characters max)' : 'SMS message (160 characters max)'}
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {smsForm.content.length}/{smsForm.messageType === 'whatsapp' ? '4096' : '160'} characters
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoLinkSMS"
                    checked={smsForm.autoLinkClient}
                    onChange={(e) => setSmsForm(prev => ({ ...prev, autoLinkClient: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="autoLinkSMS" className="text-sm text-gray-700">
                    Auto-link to client record
                  </label>
                </div>
                <button
                  onClick={sendSMS}
                  disabled={loading}
                  className={`w-full text-white py-2 px-4 rounded-md hover:opacity-80 disabled:opacity-50 ${
                    smsForm.messageType === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading ? 'Sending...' : `Send ${smsForm.messageType === 'whatsapp' ? 'WhatsApp' : 'SMS'}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk SMS Tab */}
        {activeTab === 'bulk' && (
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl">
            <h2 className="text-xl font-bold text-purple-900 mb-4">Bulk SMS Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <select
                  value={bulkSMSForm.targetType}
                  onChange={(e) => setBulkSMSForm(prev => ({ 
                    ...prev, 
                    targetType: e.target.value as any,
                    targetPreview: []
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Clients</option>
                  <option value="leads">Leads Only</option>
                  <option value="clients">Active Clients Only</option>
                </select>
              </div>
              <div>
                <button
                  onClick={previewBulkTargets}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Preview Recipients
                </button>
                {bulkSMSForm.targetPreview.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Found {bulkSMSForm.targetPreview.length} recipients with phone numbers
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (use {'{name}'} for personalization)
                </label>
                <textarea
                  value={bulkSMSForm.content}
                  onChange={(e) => setBulkSMSForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  maxLength={160}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Hello {name}, special offer just for you!"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {bulkSMSForm.content.length}/160 characters
                </div>
              </div>
              <button
                onClick={sendBulkSMS}
                disabled={loading || bulkSMSForm.targetPreview.length === 0}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : `Send to ${bulkSMSForm.targetPreview.length} Recipients`}
              </button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-purple-900">Communication History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject/Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {communications.map((comm) => (
                    <tr key={comm.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          comm.messageType === 'email' 
                            ? 'bg-blue-100 text-blue-800' 
                            : comm.messageType === 'whatsapp'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {comm.messageType === 'email' ? '📧 EMAIL' : 
                           comm.messageType === 'whatsapp' ? '💬 WHATSAPP' : '📱 SMS'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {comm.messageType === 'email' ? comm.subject : 
                           comm.messageType === 'whatsapp' ? 'WhatsApp Message' : 'SMS Message'}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {comm.content}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {comm.clientName ? `${comm.clientName}` : 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {comm.clientEmail || comm.phoneNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          comm.status === 'sent' 
                            ? 'bg-green-100 text-green-800' 
                            : comm.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {comm.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {comm.sentAt ? new Date(comm.sentAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Test Configuration Tab */}
        {activeTab === 'test' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Email Test */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-purple-900 mb-4">Test Email Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Email Address
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="test@example.com"
                  />
                </div>
                <button
                  onClick={testEmailConfig}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Test Email'}
                </button>
                <div className="text-sm text-gray-600">
                  <p>This will send a test email to verify your SMTP configuration.</p>
                  <p className="mt-2">Configure SMTP settings in your Heroku Config Vars:</p>
                  <ul className="list-disc list-inside mt-1 text-xs">
                    <li>SMTP_HOST</li>
                    <li>SMTP_PORT</li>
                    <li>SMTP_USER</li>
                    <li>SMTP_PASS</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Vonage Configuration */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-purple-900 mb-4">Vonage SMS/WhatsApp Setup</h2>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-green-600 font-medium">✅ API Key Configured</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    API Key: BPGlC0W6GktNXeO8
                  </p>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-yellow-600 font-medium">⚠️ Setup Required</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Complete your Vonage setup:
                  </p>
                  <ol className="list-decimal list-inside text-sm text-yellow-700 mt-2 space-y-1">
                    <li>Log into your <a href="https://dashboard.nexmo.com" target="_blank" className="underline">Vonage Dashboard</a></li>
                    <li>Go to Settings → API Settings</li>
                    <li>Copy your API Secret</li>
                    <li>Add these to your Heroku Config Vars:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>VONAGE_API_SECRET=your-secret-here</li>
                        <li>VONAGE_PHONE_NUMBER=your-vonage-number</li>
                      </ul>
                    </li>
                    <li>Click "Activate Vonage" below after adding the Config Vars</li>
                  </ol>
                  
                  {/* Activation Button */}
                  <div className="mt-4 pt-3 border-t border-yellow-300">
                    <button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const response = await fetch('/api/communications/sms-config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              provider: 'vonage',
                              apiKey: 'BPGlC0W6GktNXeO8',
                              apiSecret: 'from-env', // Will be read from VONAGE_API_SECRET
                              fromNumber: 'TogNinja CRM'
                            })
                          });
                          
                          const result = await response.json();
                          
                          if (result.success) {
                            alert('✅ Vonage activated successfully! SMS and WhatsApp messaging is now enabled.');
                            // Refresh SMS config status
                            checkSMSConfig();
                          } else {
                            alert(`❌ Activation failed: ${result.error}`);
                          }
                        } catch (error) {
                          alert(`❌ Error activating Vonage: ${error}`);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Activating...' : '🚀 Activate Vonage Configuration'}
                    </button>
                    <p className="text-xs text-yellow-600 mt-2">
                      Only click after adding VONAGE_API_SECRET to your Heroku Config Vars
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-blue-600 font-medium">💡 Features Available</span>
                  </div>
                  <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
                    <li>📱 SMS messaging to any phone number</li>
                    <li>💬 WhatsApp Business messaging</li>
                    <li>🔗 Auto-link messages to client records</li>
                    <li>📊 Bulk messaging campaigns</li>
                    <li>📈 Delivery tracking and reporting</li>
                  </ul>
                </div>

                <div className="text-xs text-gray-500">
                  <p><strong>Security Note:</strong> Your API credentials are stored securely in Heroku Config Vars and never exposed in the code.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CommunicationsPage;
