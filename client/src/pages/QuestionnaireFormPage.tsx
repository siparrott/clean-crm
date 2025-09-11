import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  type: string;
  title: string;
  required: boolean;
  options?: { id: string; text: string }[];
}

interface QuestionnaireData {
  token: string;
  clientName: string;
  clientEmail: string;
  isUsed: boolean;
  survey: {
    title: string;
    description: string;
    pages: Array<{
      id: string;
      title: string;
      questions: Question[];
    }>;
    settings: {
      thankYouMessage?: string;
    };
  };
}

const QuestionnaireFormPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    answers: {} as Record<string, string>
  });

  useEffect(() => {
    if (token) {
      fetchQuestionnaire();
    }
  }, [token]);

  const fetchQuestionnaire = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/questionnaire/${token}`);
      
      if (!response.ok) {
        throw new Error('Questionnaire not found or expired');
      }
      
      const data = await response.json();
      setQuestionnaire(data);
      
      // Pre-fill client info if available
      setFormData(prev => ({
        ...prev,
        clientName: data.clientName || '',
        clientEmail: data.clientEmail || ''
      }));
      
      if (data.isUsed) {
        setError('This questionnaire has already been completed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (questionId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!questionnaire) return;
    
    // Validate required fields
    const allQuestions = questionnaire.survey.pages.flatMap(page => page.questions);
    const requiredQuestions = allQuestions.filter(q => q.required);
    
    for (const question of requiredQuestions) {
      if (!formData.answers[question.id]) {
        setError(`Please answer: ${question.title}`);
        return;
      }
    }
    
    if (!formData.clientName.trim() || !formData.clientEmail.trim()) {
      setError('Please provide your name and email address.');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/email-questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          clientName: formData.clientName.trim(),
          clientEmail: formData.clientEmail.trim(),
          answers: formData.answers
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit questionnaire');
      }
      
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit questionnaire');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const value = formData.answers[question.id] || '';
    
    switch (question.type) {
      case 'single_choice':
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={value === option.id}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{option.text}</span>
              </label>
            ))}
          </div>
        );
      
      case 'long_text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your answer..."
          />
        );
      
      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your answer..."
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Vielen Dank!</h2>
          <p className="text-gray-600 mb-6">
            {questionnaire?.survey.settings.thankYouMessage || 
             'Your questionnaire has been submitted successfully. We will be in touch soon!'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (error || !questionnaire) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">
            {error || 'Questionnaire not found'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <meta name="robots" content="noindex, nofollow" />
      
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {questionnaire.survey.title}
            </h1>
            {questionnaire.survey.description && (
              <p className="text-gray-600">
                {questionnaire.survey.description}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>

            {/* Questions */}
            {questionnaire.survey.pages.map(page => (
              <div key={page.id} className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 border-b pb-2">
                  {page.title}
                </h3>
                
                {page.questions.map(question => (
                  <div key={question.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {question.title}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderQuestion(question)}
                  </div>
                ))}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  'Submit Questionnaire'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireFormPage;
