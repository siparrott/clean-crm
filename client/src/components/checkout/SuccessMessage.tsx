import React from 'react';
import { CheckCircle } from 'lucide-react';

interface SuccessMessageProps {
  email: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ email }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Vielen Dank für Ihren Einkauf!
      </h2>
      <p className="text-gray-600 mb-4">
        Eine Bestätigungs-E-Mail wurde an {email} gesendet.
      </p>
      <p className="text-gray-600">
        Ihr Gutschein wird innerhalb der nächsten Minuten per E-Mail zugestellt.
      </p>
    </div>
  );
};

export default SuccessMessage;