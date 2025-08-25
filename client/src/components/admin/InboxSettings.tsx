import React, { useState } from 'react';
import { Settings, Mail, Lock, Server, TestTube2, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailSettings {
  provider: 'gmail' | 'outlook' | 'smtp';
  smtpHost: string;
  smtpPort: string;
  username: string;
  password: string;
  useTLS: boolean;
  syncEnabled: boolean;
  syncInterval: number;
}

interface InboxSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: EmailSettings) => void;
  currentSettings?: EmailSettings;
}

const InboxSettings: React.FC<InboxSettingsProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings
}) => {
  const [settings, setSettings] = useState<EmailSettings>(
    currentSettings || {
      provider: 'smtp',
      smtpHost: 'smtp.easyname.com',
      smtpPort: '465',
      username: '30840mail10',
      password: 'HoveBN41!',
      useTLS: true,
      syncEnabled: true,
      syncInterval: 5
    }
  );
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleProviderChange = (provider: 'gmail' | 'outlook' | 'smtp') => {
    const providerDefaults = {
      gmail: { smtpHost: 'smtp.gmail.com', smtpPort: '587' },
      outlook: { smtpHost: 'smtp-mail.outlook.com', smtpPort: '587' },
      smtp: { smtpHost: '', smtpPort: '587' }
    };

    setSettings(prev => ({
      ...prev,
      provider,
      ...providerDefaults[provider]
    }));
  };

  const handleInputChange = (field: keyof EmailSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Test with real email configuration
      const response = await fetch('/api/email/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          provider: settings.provider,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          username: settings.username,
          password: settings.password,
          useTLS: settings.useTLS
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setTestResult({
          success: true,
          message: 'Connection successful! Email settings are working correctly.'
        });
      } else {
        setTestResult({
          success: false,
          message: result.message || 'Connection failed. Please check your credentials and settings.'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please try again.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSave(settings);
      onClose();
    } catch (error) {
      // console.error removed
    } finally {
      setSaving(false);
    }
  };

  const importEmails = async () => {
    setImporting(true);
    try {
      const response = await fetch('/api/email/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();
      
      if (result.success) {
        setTestResult({ 
          success: true, 
          message: `Successfully imported ${result.count} emails` 
        });
      } else {
        setTestResult({ 
          success: false, 
          message: result.message || 'Failed to import emails' 
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: 'Failed to import emails: Connection error' 
      });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Inbox Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Email Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Email Provider
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'gmail', label: 'Gmail', icon: '📧' },
                { value: 'outlook', label: 'Outlook', icon: '📮' },
                { value: 'smtp', label: 'Custom SMTP', icon: '⚙️' }
              ].map(provider => (
                <button
                  key={provider.value}
                  onClick={() => handleProviderChange(provider.value as any)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    settings.provider === provider.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{provider.icon}</div>
                  <div className="text-sm font-medium">{provider.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* SMTP Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Server className="inline h-4 w-4 mr-1" />
                SMTP Host
              </label>
              <input
                type="text"
                value={settings.smtpHost}
                onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="text"
                value={settings.smtpPort}
                onChange={(e) => handleInputChange('smtpPort', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="587"
              />
            </div>
          </div>

          {/* Authentication */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Authentication
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your.email@domain.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password/App Password
                </label>
                <input
                  type="password"
                  value={settings.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Security & Sync Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Security & Sync</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Use TLS Encryption</label>
                <p className="text-xs text-gray-500">Recommended for secure connections</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.useTLS}
                  onChange={(e) => handleInputChange('useTLS', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Email Sync</label>
                <p className="text-xs text-gray-500">Automatically sync emails from your inbox</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.syncEnabled}
                  onChange={(e) => handleInputChange('syncEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.syncEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sync Interval (minutes)
                </label>
                <select
                  value={settings.syncInterval}
                  onChange={(e) => handleInputChange('syncInterval', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Every 1 minute</option>
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every hour</option>
                </select>
              </div>
            )}
          </div>

          {/* Setup Guide */}
          <div className="border-t border-gray-200 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-blue-900 mb-2">Quick Setup Guide</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Business Email (EasyName):</strong> Username: 30840mail10, IMAP: imap.easyname.com:993</p>
                <p><strong>For Gmail:</strong> Use your email + App Password (not regular password)</p>
                <p><strong>For Outlook:</strong> Use your Microsoft account email + password</p>
              </div>
            </div>
          </div>

          {/* Test Connection & Import */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex space-x-3">
              <button
                onClick={testConnection}
                disabled={testing || !settings.username || !settings.smtpHost}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube2 className={`h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
              
              <button
                onClick={importEmails}
                disabled={importing || !settings.username || !settings.smtpHost}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className={`h-4 w-4 ${importing ? 'animate-spin' : ''}`} />
                <span>{importing ? 'Importing...' : 'Import Emails'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`mt-3 p-3 rounded-lg flex items-start space-x-2 ${
                testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Gmail Setup Instructions */}
          {settings.provider === 'gmail' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Gmail Setup Instructions</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>1. Enable 2-factor authentication on your Google account</p>
                <p>2. Generate an App Password for this application</p>
                <p>3. Use your email address and the App Password above</p>
                <p>4. Keep TLS encryption enabled</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !settings.username || !settings.smtpHost}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InboxSettings;
