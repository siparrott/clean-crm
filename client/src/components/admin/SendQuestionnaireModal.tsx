import React, { useState } from 'react';
import { X, Mail, MessageCircle, Copy, Check } from 'lucide-react';

interface SendQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

const SendQuestionnaireModal: React.FC<SendQuestionnaireModalProps> = ({
  isOpen,
  onClose,
  client
}) => {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateLink = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/create-questionnaire-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: client.id,
          template_id: 'default-questionnaire'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate questionnaire link');
      }
      
      const data = await response.json();
      setLink(data.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const generateWhatsAppLink = () => {
    if (!link) return '';
    
    const message = `Hallo! Bitte füllen Sie unseren Fragebogen hier aus: ${link}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const generateEmailLink = () => {
    if (!link) return '';
    
    const subject = 'Ihr Fragebogen - New Age Fotografie';
    const body = `Hallo ${client.firstName},

bitte füllen Sie unseren Fragebogen über den folgenden Link aus:

${link}

Vielen Dank!

Mit freundlichen Grüßen,
New Age Fotografie Team`;
    
    return `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  React.useEffect(() => {
    if (isOpen && !link) {
      generateLink();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Send Questionnaire
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Send questionnaire link to:
            </p>
            <p className="font-medium text-gray-900">
              {client.firstName} {client.lastName}
            </p>
            <p className="text-sm text-gray-600">{client.email}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-4">
              <p className="text-gray-600">Generating questionnaire link...</p>
            </div>
          )}

          {link && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Questionnaire Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={link}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyLink}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    title="Copy link"
                  >
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={generateEmailLink()}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Mail size={16} />
                  <span>Email</span>
                </a>
                
                <a
                  href={generateWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp</span>
                </a>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                <p>• Email: Opens your default email client with pre-filled message</p>
                <p>• WhatsApp: Opens WhatsApp with ready-to-send message</p>
                <p>• Link expires in 30 days</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendQuestionnaireModal;
