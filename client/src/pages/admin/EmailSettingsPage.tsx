import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Mail, Save, AlertCircle, CheckCircle, Settings, Bell } from 'lucide-react';

interface EmailSettings {
  notificationEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  emailSignature: string;
}

const EmailSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<EmailSettings>({
    notificationEmail: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    emailSignature: 'Best regards,\nNew Age Fotografie Team'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchEmailSettings();
  }, []);

  const fetchEmailSettings = async () => {
    try {
      const response = await fetch('/api/admin/email-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to fetch email settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email settings saved successfully!' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save email settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: settings.notificationEmail,
          subject: 'Test Email - New Age Fotografie CRM',
          message: 'This is a test email to verify your email settings are working correctly.'
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Test email sent to ${settings.notificationEmail}!` });
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test email. Please check your settings.' });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Email Settings</h1>
            <p className="text-gray-600">Configure email notifications and SMTP settings</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleTestEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Mail size={16} className="mr-2" />
              Send Test Email
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
            >
              <Save size={16} className="mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`rounded-lg p-4 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <CheckCircle size={20} className="text-green-600 mr-2" />
              ) : (
                <AlertCircle size={20} className="text-red-600 mr-2" />
              )}
              <span className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Bell size={20} className="text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Email Address
                </label>
                <input
                  type="email"
                  value={settings.notificationEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="admin@yourcompany.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This email will receive notifications for new leads, contact forms, and waitlist submissions.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Signature
                </label>
                <textarea
                  value={settings.emailSignature}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailSignature: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Best regards,\nYour Company Name"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This signature will be added to all automated emails.
                </p>
              </div>
            </div>
          </div>

          {/* SMTP Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Settings size={20} className="text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">SMTP Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtpHost}
                  onChange={(e) => setSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.smtpPort}
                  onChange={(e) => setSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="587"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={settings.smtpUser}
                  onChange={(e) => setSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="your-email@domain.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={settings.smtpPassword}
                    onChange={(e) => setSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to keep current password unchanged.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Configuration Info */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Notifications sent to:</span>
              <span className="ml-2 text-gray-900">{settings.notificationEmail}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">SMTP Server:</span>
              <span className="ml-2 text-gray-900">{settings.smtpHost}:{settings.smtpPort}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">SMTP User:</span>
              <span className="ml-2 text-gray-900">{settings.smtpUser}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className="ml-2 text-green-600">Active</span>
            </div>
          </div>
        </div>

        {/* Usage Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle size={20} className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-2">Important Information</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Changes to the notification email will affect all new lead notifications</li>
                <li>• SMTP settings are used for sending all automated emails from the system</li>
                <li>• Use the "Send Test Email" button to verify your configuration</li>
                <li>• Make sure to save your settings before testing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default EmailSettingsPage;