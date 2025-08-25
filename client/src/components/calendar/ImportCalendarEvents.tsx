import React, { useState, useRef } from 'react';
import { Upload, Download, Calendar, AlertCircle, Check, ExternalLink } from 'lucide-react';

interface ImportCalendarEventsProps {
  onImportComplete: (count: number) => void;
}

const ImportCalendarEvents: React.FC<ImportCalendarEventsProps> = ({ onImportComplete }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
  const [icsUrl, setIcsUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGoogleCalendarImport = async () => {
    setIsImporting(true);
    setImportResult(null);

    try {
      // First, try to export from Google Calendar
      const response = await fetch('/api/calendar/import/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'import_existing',
          // In a real implementation, this would use OAuth tokens
          // For now, we'll provide instructions for manual import
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult({ success: true, count: result.imported });
      onImportComplete(result.imported);
    } catch (error) {
      setImportResult({ success: false, error: 'Import failed. Please try manual import.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.ics')) {
      setImportResult({ success: false, error: 'Please select a valid .ics calendar file' });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const fileContent = await file.text();
      
      const response = await fetch('/api/calendar/import/ics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          icsContent: fileContent,
          fileName: file.name
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult({ success: true, count: result.imported });
      onImportComplete(result.imported);
    } catch (error) {
      setImportResult({ success: false, error: 'Failed to import calendar file. Please check the file format.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleIcsUrlImport = async () => {
    if (!icsUrl.trim()) {
      setImportResult({ success: false, error: 'Please enter a valid .ics URL' });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const response = await fetch('/api/calendar/import/ics-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          icsUrl: icsUrl.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      setImportResult({ success: true, count: result.imported });
      onImportComplete(result.imported);
    } catch (error) {
      setImportResult({ success: false, error: 'Failed to import from URL. Please check the URL is accessible.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Import Existing Calendar Events</h4>
        <p className="text-sm text-blue-800 mb-3">
          Import your existing Google Calendar bookings into the photography CRM system.
        </p>
        
        {/* Import from URL */}
        <div className="bg-white p-4 rounded border">
          <h5 className="font-medium text-gray-900 mb-2">Import from .ics URL</h5>
          <p className="text-sm text-gray-600 mb-3">Paste your Google Calendar .ics URL:</p>
          <div className="flex space-x-2">
            <input
              type="url"
              placeholder="https://calendar.google.com/calendar/ical/..."
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handleIcsUrlImport}
              disabled={isImporting || !icsUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white p-4 rounded border">
          <h5 className="font-medium text-gray-900 mb-2">Upload .ics File</h5>
          <p className="text-sm text-gray-600 mb-3">Or upload a downloaded .ics calendar file:</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleFileSelect}
            disabled={isImporting}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            <Upload size={16} />
            <span>Choose .ics File</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 p-3 rounded">
          <h5 className="font-medium text-gray-900 mb-2">How to get your .ics URL from Google Calendar:</h5>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Open Google Calendar</li>
            <li>Click the gear icon → Settings</li>
            <li>Select your calendar from the left sidebar</li>
            <li>Scroll to "Integrate calendar"</li>
            <li>Copy the "Secret address in iCal format" URL</li>
            <li>Paste it above and click Import</li>
          </ol>
        </div>
      </div>

      {importResult && (
        <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center space-x-2">
            {importResult.success ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${importResult.success ? 'text-green-900' : 'text-red-900'}`}>
              {importResult.success 
                ? `Successfully imported ${importResult.count} events!` 
                : 'Import failed'
              }
            </span>
          </div>
          {importResult.error && (
            <p className="text-sm text-red-800 mt-2">{importResult.error}</p>
          )}
        </div>
      )}

      <div className="bg-amber-50 p-4 rounded-lg">
        <h4 className="font-medium text-amber-900 mb-2">Alternative: Manual Entry</h4>
        <p className="text-sm text-amber-800">
          You can also manually create photography sessions in the CRM for your existing bookings. 
          This gives you full control over client details, pricing, and session information.
        </p>
      </div>
    </div>
  );
};

export default ImportCalendarEvents;