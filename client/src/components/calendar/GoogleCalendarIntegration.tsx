import React, { useState, useEffect } from 'react';
import { Calendar, Settings, RotateCcw, Check, AlertCircle, ExternalLink, RefreshCw, Copy, Download, Upload } from 'lucide-react';
import ImportCalendarEvents from './ImportCalendarEvents';

interface GoogleCalendarIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess?: () => void;
}

const GoogleCalendarIntegration: React.FC<GoogleCalendarIntegrationProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'ical' | 'oauth' | 'import'>('ical');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const downloadIcal = () => {
    window.open(`${window.location.origin}/api/calendar/photography-sessions.ics`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Google Calendar Integration</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('ical')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'ical'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              iCal Subscription
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Import Existing Events
            </button>
            <button
              onClick={() => setActiveTab('oauth')}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'oauth'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              OAuth Integration
            </button>
          </div>

          {/* iCal Tab */}
          {activeTab === 'ical' && (
            <div className="space-y-6">
              {/* iCal Subscription - Simple Alternative */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-3">✨ Simple Google Calendar Integration</h4>
                <div className="space-y-3">
                  <p className="text-sm text-green-800">
                    Subscribe to your photography sessions calendar directly in Google Calendar using iCal feed.
                  </p>
                  
                  <div className="bg-white p-3 rounded border">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Photography Calendar iCal URL:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/api/calendar/photography-sessions.ics`}
                        readOnly
                        className="flex-1 p-2 border border-gray-300 rounded bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/api/calendar/photography-sessions.ics`)}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
                      >
                        <Copy size={14} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-green-800">
                    <p><strong>How to add to Google Calendar:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-4 mt-2">
                      <li>Open Google Calendar on your computer</li>
                      <li>On the left side, click "+" next to "Other calendars"</li>
                      <li>Select "From URL"</li>
                      <li>Paste the iCal URL above</li>
                      <li>Click "Add calendar"</li>
                    </ol>
                    <p className="mt-2 text-green-700">
                      <strong>✓ Your photography sessions will automatically appear in Google Calendar</strong><br/>
                      <strong>✓ Updates sync every few hours</strong><br/>
                      <strong>✓ No complex OAuth setup required</strong>
                    </p>
                  </div>
                  
                  <div className="flex space-x-3 pt-3">
                    <button
                      onClick={downloadIcal}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Download size={16} />
                      <span>Download .ics File</span>
                    </button>
                    <button
                      onClick={() => window.open('https://calendar.google.com', '_blank')}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <ExternalLink size={16} />
                      <span>Open Google Calendar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Features */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What's Included in Your Calendar Feed</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Photography session titles and descriptions</li>
                  <li>• Client names and session types</li>
                  <li>• Location details for each session</li>
                  <li>• Session status (confirmed, tentative, cancelled)</li>
                  <li>• Priority levels for important sessions</li>
                  <li>• Automatic updates when you modify sessions</li>
                </ul>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <ImportCalendarEvents onImportComplete={(count) => {
                alert(`Successfully imported ${count} events!`);
              }} />
            </div>
          )}

          {/* OAuth Tab */}
          {activeTab === 'oauth' && (
            <div className="space-y-6">
              {/* OAuth Alternative */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Advanced Integration (OAuth 2.0)</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>For two-way sync and advanced features, OAuth integration is available:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Two-way synchronization (Google Calendar ↔ Photography CRM)</li>
                    <li>Real-time updates</li>
                    <li>Create sessions directly from Google Calendar</li>
                    <li>Automatic conflict detection</li>
                    <li>Multiple calendar support</li>
                  </ul>
                  <p className="mt-2">
                    <strong>Requires:</strong> Google Cloud Console setup with OAuth credentials
                  </p>
                  <p className="mt-2">
                    See <code>docs/google-calendar-setup.md</code> for OAuth setup instructions.
                  </p>
                </div>
              </div>

              {/* OAuth Setup Steps */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h4 className="font-medium text-amber-900 mb-2">OAuth Setup Required</h4>
                <div className="text-sm text-amber-800 space-y-2">
                  <p>To enable OAuth integration, you need to:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Create a Google Cloud Console project</li>
                    <li>Enable the Google Calendar API</li>
                    <li>Create OAuth 2.0 credentials</li>
                    <li>Configure redirect URIs for your domain</li>
                    <li>Add credentials to environment variables</li>
                  </ol>
                  <p className="mt-2">
                    <strong>Environment variables needed:</strong><br/>
                    <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code><br/>
                    <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code><br/>
                    <code className="bg-amber-100 px-1 rounded">GOOGLE_REDIRECT_URI</code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarIntegration;