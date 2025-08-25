import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import EmbeddedCRMChat from '../../components/chat/EmbeddedCRMChat';
import { 
  Palette, 
  Layout, 
  Type, 
  Image, 
  Mail, 
  Save, 
  RefreshCw,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react';

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl: string;
  headerStyle: 'light' | 'dark' | 'transparent';
  footerStyle: 'light' | 'dark';
}

interface EmailSettings {
  senderName: string;
  senderEmail: string;
  emailSignature: string;
  emailLogo: string;
}

const CustomizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'theme' | 'email' | 'assistant'>('theme');
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    primaryColor: '#8b5cf6',
    secondaryColor: '#4f46e5',
    accentColor: '#ec4899',
    fontFamily: 'Poppins',
    logoUrl: '/frontend-logo.jpg', // Updated to use new frontend logo
    headerStyle: 'light',
    footerStyle: 'dark'
  });
  
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    senderName: 'TogNinja',
    senderEmail: 'info@togninja.com',
    emailSignature: '<p>Best regards,<br>The TogNinja Team</p>',
    emailLogo: '/frontend-logo.jpg' // Updated to use new frontend logo
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OpenAI Assistant configuration
  const CUSTOMIZATION_ASSISTANT_ID = 'asst_customization_helper_v1'; // Replace with your actual assistant ID

  const handleCustomizationChange = (changes: any) => {
    // console.log removed
    
    // Apply theme changes
    if (changes.theme) {
      setThemeSettings(prev => ({
        ...prev,
        ...changes.theme
      }));
    }
    
    // Apply email changes
    if (changes.email) {
      setEmailSettings(prev => ({
        ...prev,
        ...changes.email
      }));
    }
    
    // Switch to appropriate tab if specified
    if (changes.activeTab && ['theme', 'email'].includes(changes.activeTab)) {
      setActiveTab(changes.activeTab);
    }
    
    // Show success message
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setThemeSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmailSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveTheme = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      // console.error removed
      setError('Failed to save theme settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      // console.error removed
      setError('Failed to save email settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleResetTheme = () => {
    setThemeSettings({
      primaryColor: '#8b5cf6',
      secondaryColor: '#4f46e5',
      accentColor: '#ec4899',
      fontFamily: 'Poppins',
      logoUrl: '/frontend-logo.jpg',
      headerStyle: 'light',
      footerStyle: 'dark'
    });
  };

  return (
    <AdminLayout>
      {/* DEBUG: AI Chat moved to bottom - June 26, 2025 */}
      <div className="space-y-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Customization</h1>
            <p className="text-gray-600">Personalize your website and client communications with AI assistance</p>
          </div>

          {/* Customization Assistant - Moved to top */}
          <div className="mt-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                Customization Assistant
              </h3>
              <EmbeddedCRMChat
                assistantId={CUSTOMIZATION_ASSISTANT_ID}
                onCRMAction={handleCustomizationChange}
                height="600px"
                title="Customization Assistant"
                className="w-full"
              />
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-start">
              <Check className="h-5 w-5 text-green-400 mt-0.5 mr-2" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('theme')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'theme'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Palette className="inline-block mr-2 h-5 w-5" />
                Theme Settings
              </button>
              <button
                onClick={() => setActiveTab('email')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'email'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Mail className="inline-block mr-2 h-5 w-5" />
                Email Settings
              </button>
            </nav>
          </div>

        {/* Theme Settings */}
        {activeTab === 'theme' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Color Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Palette className="mr-2 h-5 w-5 text-purple-600" />
                  Color Scheme
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        id="primaryColor"
                        name="primaryColor"
                        value={themeSettings.primaryColor}
                        onChange={handleThemeChange}
                        className="h-10 w-10 border-0 p-0 mr-2"
                      />
                      <input
                        type="text"
                        value={themeSettings.primaryColor}
                        onChange={handleThemeChange}
                        name="primaryColor"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        id="secondaryColor"
                        name="secondaryColor"
                        value={themeSettings.secondaryColor}
                        onChange={handleThemeChange}
                        className="h-10 w-10 border-0 p-0 mr-2"
                      />
                      <input
                        type="text"
                        value={themeSettings.secondaryColor}
                        onChange={handleThemeChange}
                        name="secondaryColor"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="accentColor" className="block text-sm font-medium text-gray-700 mb-1">
                      Accent Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        id="accentColor"
                        name="accentColor"
                        value={themeSettings.accentColor}
                        onChange={handleThemeChange}
                        className="h-10 w-10 border-0 p-0 mr-2"
                      />
                      <input
                        type="text"
                        value={themeSettings.accentColor}
                        onChange={handleThemeChange}
                        name="accentColor"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography & Logo */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Type className="mr-2 h-5 w-5 text-purple-600" />
                  Typography & Branding
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-700 mb-1">
                      Font Family
                    </label>
                    <select
                      id="fontFamily"
                      name="fontFamily"
                      value={themeSettings.fontFamily}
                      onChange={handleThemeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="Poppins">Poppins</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Open Sans">Open Sans</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Lato">Lato</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Logo URL
                    </label>
                    <input
                      type="text"
                      id="logoUrl"
                      name="logoUrl"
                      value={themeSettings.logoUrl}
                      onChange={handleThemeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {themeSettings.logoUrl && (
                      <div className="mt-2">
                        <img 
                          src={themeSettings.logoUrl} 
                          alt="Logo Preview" 
                          className="h-12 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Layout Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Layout className="mr-2 h-5 w-5 text-purple-600" />
                  Layout Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="headerStyle" className="block text-sm font-medium text-gray-700 mb-1">
                      Header Style
                    </label>
                    <select
                      id="headerStyle"
                      name="headerStyle"
                      value={themeSettings.headerStyle}
                      onChange={handleThemeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="transparent">Transparent</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="footerStyle" className="block text-sm font-medium text-gray-700 mb-1">
                      Footer Style
                    </label>
                    <select
                      id="footerStyle"
                      name="footerStyle"
                      value={themeSettings.footerStyle}
                      onChange={handleThemeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Image className="mr-2 h-5 w-5 text-purple-600" />
                  Preview
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className={`p-4 ${
                      themeSettings.headerStyle === 'light' ? 'bg-white text-gray-900' : 
                      themeSettings.headerStyle === 'dark' ? 'bg-gray-800 text-white' : 
                      'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
                    }`}
                    style={{ fontFamily: themeSettings.fontFamily }}
                  >
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center mr-2">
                        <span style={{ color: themeSettings.primaryColor }}>NA</span>
                      </div>
                      <span className="font-bold">New Age Fotografie</span>
                    </div>
                  </div>
                  <div className="p-4 bg-white" style={{ fontFamily: themeSettings.fontFamily }}>
                    <div 
                      className="p-2 rounded-lg text-white text-center font-medium"
                      style={{ backgroundColor: themeSettings.primaryColor }}
                    >
                      Primary Button
                    </div>
                    <div className="mt-2 text-sm" style={{ color: themeSettings.secondaryColor }}>
                      Secondary Text Color
                    </div>
                    <div className="mt-2 text-xs" style={{ color: themeSettings.accentColor }}>
                      Accent Text Color
                    </div>
                  </div>
                  <div 
                    className={`p-4 text-center text-sm ${
                      themeSettings.footerStyle === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-gray-800 text-white'
                    }`}
                    style={{ fontFamily: themeSettings.fontFamily }}
                  >
                    © 2025 New Age Fotografie
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleResetTheme}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <RefreshCw className="inline-block mr-2 h-4 w-4" />
                Reset to Default
              </button>
              <button
                onClick={handleSaveTheme}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="-ml-1 mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Email Settings */}
        {activeTab === 'email' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sender Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Mail className="mr-2 h-5 w-5 text-purple-600" />
                  Sender Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="senderName" className="block text-sm font-medium text-gray-700 mb-1">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      id="senderName"
                      name="senderName"
                      value={emailSettings.senderName}
                      onChange={handleEmailChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="senderEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Sender Email
                    </label>
                    <input
                      type="email"
                      id="senderEmail"
                      name="senderEmail"
                      value={emailSettings.senderEmail}
                      onChange={handleEmailChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Email Branding */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Image className="mr-2 h-5 w-5 text-purple-600" />
                  Email Branding
                </h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="emailLogo" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Logo URL
                    </label>
                    <input
                      type="text"
                      id="emailLogo"
                      name="emailLogo"
                      value={emailSettings.emailLogo}
                      onChange={handleEmailChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {emailSettings.emailLogo && (
                      <div className="mt-2">
                        <img 
                          src={emailSettings.emailLogo} 
                          alt="Email Logo Preview" 
                          className="h-12 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Signature */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Email Signature</h3>
                <div>
                  <label htmlFor="emailSignature" className="block text-sm font-medium text-gray-700 mb-1">
                    HTML Signature
                  </label>
                  <textarea
                    id="emailSignature"
                    name="emailSignature"
                    value={emailSettings.emailSignature}
                    onChange={handleEmailChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Email Preview */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Signature Preview</h3>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">From: {emailSettings.senderName} &lt;{emailSettings.senderEmail}&gt;</div>
                    <div className="text-sm text-gray-500">To: client@example.com</div>
                    <div className="text-sm text-gray-500">Subject: Thank you for your inquiry</div>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-gray-700 mb-4">Dear Client,</p>
                    <p className="text-gray-700 mb-4">Thank you for your message. This is how your email signature will appear.</p>
                    <div 
                      className="border-t border-gray-200 pt-4 text-gray-700"
                      dangerouslySetInnerHTML={{ __html: emailSettings.emailSignature }}
                    />
                    {emailSettings.emailLogo && (
                      <div className="mt-2">
                        <img 
                          src={emailSettings.emailLogo} 
                          alt="Email Logo" 
                          className="h-12 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveEmail}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="-ml-1 mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default CustomizationPage;