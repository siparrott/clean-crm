import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VoucherSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">NAF</span>
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">NEW AGE FOTOGRAFIE</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-purple-600 hover:text-purple-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zur Startseite
            </Button>
          </div>
        </div>
      </div>

      {/* Success Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Zahlung erfolgreich!
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Vielen Dank für Ihren Kauf! Ihr Gutschein wurde erfolgreich erstellt und wird in Kürze per E-Mail versendet.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Was passiert als nächstes?
            </h3>
            <ul className="text-sm text-green-800 space-y-2 text-left">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                Sie erhalten in wenigen Minuten eine E-Mail mit Ihrem Gutschein
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                Der Gutschein ist ab sofort 12 Monate gültig
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                Für Terminbuchungen kontaktieren Sie uns unter +43 677 933 99210
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => navigate('/vouchers')}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Weitere Gutscheine
              </Button>
              
              <Button 
                onClick={() => window.open('https://newagefotografie.sproutstudio.com/invitation/live-link-shootings-new-age-fotografie', '_blank')}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Termin buchen
              </Button>
            </div>
            
            <div className="pt-6 border-t">
              <p className="text-sm text-gray-500 mb-4">
                Haben Sie Fragen zu Ihrem Gutschein?
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Telefon:</strong> +43 677 933 99210
                </p>
                <p>
                  <strong>E-Mail:</strong> hallo@newagefotografie.com
                </p>
                <p>
                  <strong>Öffnungszeiten:</strong> Fr-So: 09:00 - 17:00
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherSuccessPage;