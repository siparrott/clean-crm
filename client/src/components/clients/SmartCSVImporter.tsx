import React, { useState, useRef } from 'react';
import { Upload, X, Check, ArrowRight, AlertCircle, Loader2, FileText } from 'lucide-react';
import { apiRequest } from '../../lib/queryClient';
import * as Papa from 'papaparse';

// Client interface for mapping
interface ClientData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  status?: string;
  clientId?: string;
}

interface ColumnMappingState {
  [key: string]: string; // CSV column name -> Client field name
}

interface CSVPreviewData {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

const SmartCSVImporter: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVPreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingState>({});
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Available client fields for mapping
  const clientFields = [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'name', label: 'Full Name (auto-split)', required: false },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'address', label: 'Address', required: false },
    { key: 'company', label: 'Company', required: false },
    { key: 'notes', label: 'Notes', required: false },
    { key: 'clientId', label: 'Client ID', required: false },
  ];  // Smart column matching - suggests mappings based on column names
  const suggestColumnMapping = (headers: string[]): ColumnMappingState => {
    const suggestions: ColumnMappingState = {};
    let hasFirstName = false;
    let hasLastName = false;
    
    // First pass: check for first/last name patterns
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().trim();
      if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
        hasFirstName = true;
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
        hasLastName = true;
      }
    });
    
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().trim();
      
      // Smart matching patterns
      if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
        suggestions[header] = 'firstName';
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
        suggestions[header] = 'lastName';
      } else if (lowerHeader.includes('name') && !hasFirstName && !hasLastName) {
        // Full name field when no separate first/last name
        suggestions[header] = 'name';
      } else if (lowerHeader.includes('email') || lowerHeader.includes('e-mail')) {
        suggestions[header] = 'email';
      } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('tel')) {
        suggestions[header] = 'phone';
      } else if (lowerHeader.includes('address') || lowerHeader.includes('street') || lowerHeader.includes('location')) {
        suggestions[header] = 'address';
      } else if (lowerHeader.includes('company') || lowerHeader.includes('business') || lowerHeader.includes('organization')) {
        suggestions[header] = 'company';
      } else if (lowerHeader.includes('note') || lowerHeader.includes('comment') || lowerHeader.includes('description')) {
        suggestions[header] = 'notes';
      }
    });
    
    return suggestions;
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    
    // Parse CSV to get preview
    Papa.parse(selectedFile, {
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file: ' + results.errors[0].message);
          return;
        }

        const data = results.data as string[][];
        if (data.length < 2) {
          setError('CSV file must contain at least a header row and one data row');
          return;
        }

        const headers = data[0];
        const rows = data.slice(1, 6); // Show first 5 rows for preview
        
        setCsvData({
          headers,
          rows,
          totalRows: data.length - 1
        });

        // Auto-suggest column mappings
        const suggestions = suggestColumnMapping(headers);
        setColumnMapping(suggestions);
        
        setCurrentStep(2);
      },
      header: false,
      skipEmptyLines: true
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const validateMapping = (): boolean => {
    const requiredFields = clientFields.filter(field => field.required);
    const mappedFields = Object.values(columnMapping);
    
    for (const field of requiredFields) {
      if (!mappedFields.includes(field.key)) {
        setError(`Required field "${field.label}" must be mapped`);
        return false;
      }
    }
    
    return true;
  };

  const processImport = async () => {
    if (!file || !csvData || !validateMapping()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse the full CSV file
      Papa.parse(file, {
        complete: async (results) => {
          const data = results.data as string[][];
          const headers = data[0];
          const rows = data.slice(1);

          let successful = 0;
          let failed = 0;
          const errors: string[] = [];

          // Process each row
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            try {
              // Skip empty rows
              if (row.every(cell => !cell || cell.trim() === '')) {
                continue;
              }              // Map CSV row to client data
              const clientData: any = {};
              let tempFirstName = '';
              let tempLastName = '';
              let fullName = '';
              
              headers.forEach((header, index) => {
                const clientField = columnMapping[header];
                if (clientField && row[index]) {
                  let value = row[index].trim();
                  
                  if (clientField === 'name') {
                    fullName = value;
                  } else if (clientField === 'firstName') {
                    tempFirstName = value;
                    clientData.firstName = value;
                  } else if (clientField === 'lastName') {
                    tempLastName = value;
                    clientData.lastName = value;
                  } else {
                    clientData[clientField] = value;
                  }
                }
              });

              // Handle name splitting if full name is provided
              if (fullName && !tempFirstName && !tempLastName) {
                const nameParts = fullName.trim().split(' ');
                if (nameParts.length >= 2) {
                  clientData.firstName = nameParts[0];
                  clientData.lastName = nameParts.slice(1).join(' ');
                } else {
                  clientData.firstName = fullName;
                  clientData.lastName = '';
                }
              } else if (tempFirstName || tempLastName) {
                clientData.firstName = tempFirstName || '';
                clientData.lastName = tempLastName || '';
              }

              // Validate required fields
              if (!clientData.firstName || !clientData.email) {
                errors.push(`Row ${i + 2}: Missing required fields (firstName or email)`);
                failed++;
                continue;
              }

              // Set default lastName if empty
              if (!clientData.lastName) {
                clientData.lastName = '';
              }

              // Set default status
              clientData.status = 'active';

              // Insert into database using API
              try {
                await apiRequest('POST', '/api/crm/clients', clientData);
                successful++;
              } catch (insertError: any) {
                errors.push(`Row ${i + 2}: ${insertError.message || 'Failed to create client'}`);
                failed++;
              }

            } catch (err: any) {
              errors.push(`Row ${i + 2}: ${err.message}`);
              failed++;
            }
          }

          setImportResults({ successful, failed, errors });
          setCurrentStep(3);
        },
        header: false,
        skipEmptyLines: true
      });

    } catch (err: any) {
      setError('Import failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetImporter = () => {
    setCurrentStep(1);
    setFile(null);
    setCsvData(null);
    setColumnMapping({});
    setImportResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Step 1: File Upload
  const renderFileUpload = () => (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">Upload your CSV file</p>
          <p className="text-gray-500">Drag and drop your file here, or click to browse</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Choose File
        </button>
      </div>

      {file && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">{file.name}</span>
            <button
              onClick={() => setFile(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Step 2: Column Mapping
  const renderColumnMapping = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">CSV Preview</h3>
        <p className="text-blue-700 text-sm mb-3">
          Found {csvData?.totalRows} rows in your CSV file. Preview of first few rows:
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-blue-100">
                {csvData?.headers.map((header, index) => (
                  <th key={index} className="px-2 py-1 text-left font-medium text-blue-900 border-r border-blue-200">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvData?.rows.slice(0, 3).map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-blue-200">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-2 py-1 text-blue-800 border-r border-blue-200 max-w-[100px] truncate">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-900 mb-4">Map CSV Columns to Client Fields</h3>
        <p className="text-gray-600 text-sm mb-4">
          Select which client field each CSV column should map to. Required fields are marked with *.
        </p>
        
        <div className="space-y-3">
          {csvData?.headers.map((header) => (
            <div key={header} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="font-medium text-gray-900">{header}</label>
              </div>
              <div className="flex-1">
                <select
                  value={columnMapping[header] || ''}
                  onChange={(e) => setColumnMapping(prev => ({
                    ...prev,
                    [header]: e.target.value
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Skip this column --</option>
                  {clientFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label} {field.required ? '*' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
          <button
            onClick={processImport}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Importing...
              </>
            ) : (
              <>
                Import Clients
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Step 3: Results
  const renderResults = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{importResults?.successful || 0}</div>
          <div className="text-green-800">Successfully Imported</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{importResults?.failed || 0}</div>
          <div className="text-red-800">Failed</div>
        </div>
      </div>

      {importResults?.errors && importResults.errors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Import Errors</h4>
          <div className="max-h-40 overflow-y-auto">
            {importResults.errors.slice(0, 10).map((error, index) => (
              <div key={index} className="text-yellow-800 text-sm py-1">
                {error}
              </div>
            ))}
            {importResults.errors.length > 10 && (
              <div className="text-yellow-600 text-sm italic">
                ... and {importResults.errors.length - 10} more errors
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={resetImporter}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          Import Another File
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step ? <Check size={16} /> : step}
              </div>
              {step < 3 && (
                <div className={`w-12 h-0.5 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-2">
          <div className="text-sm text-gray-600">
            {currentStep === 1 && 'Upload CSV File'}
            {currentStep === 2 && 'Map Columns'}
            {currentStep === 3 && 'Import Results'}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {currentStep === 1 && renderFileUpload()}
        {currentStep === 2 && renderColumnMapping()}
        {currentStep === 3 && renderResults()}
      </div>
    </div>
  );
};

export default SmartCSVImporter;
