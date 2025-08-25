import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import SurveyBuilder from '../../components/admin/SurveyBuilderV3';
import { supabase } from '../../lib/supabase';
import { surveyApi } from '../../lib/survey-api';
import { Survey, SurveyQuestion, SurveyPage } from '../../types/survey';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  ClipboardList, 
  Users,
  Link,
  Calendar,
  Loader2,
  AlertCircle,
  BarChart3,
  Settings,
  ExternalLink,
  Download
} from 'lucide-react';

// Legacy interface for backward compatibility
interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  questions: any[];
  status: 'active' | 'inactive' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  response_count?: number;
}

const QuestionnairesPage: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Survey[]>([]);
  const [filteredQuestionnaires, setFilteredQuestionnaires] = useState<Survey[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSurveyBuilder, setShowSurveyBuilder] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | undefined>(undefined);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [builderLoading, setBuilderLoading] = useState(false);
  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    filterSurveys();
    filterQuestionnaires();
  }, [surveys, questionnaires, searchTerm, statusFilter]);

  const filterSurveys = () => {
    let filtered = [...surveys];
    
    if (searchTerm) {
      filtered = filtered.filter(survey => 
        survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(survey => survey.status === statusFilter);
    }

    setFilteredSurveys(filtered);
  };
  const fetchSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create sample surveys/questionnaires with response counts
      const sampleSurveys: any[] = [
        {
          id: '1',
          title: 'Customer Satisfaction Survey',
          description: 'Measure customer satisfaction with our photography services',
          status: 'active',
          created_at: new Date('2025-06-01'),
          updated_at: new Date('2025-06-01'),
          questions: [],
          response_count: 23
        },
        {
          id: '2',
          title: 'Wedding Photography Feedback',
          description: 'Feedback form for wedding photography clients',
          status: 'inactive',
          created_at: new Date('2025-06-05'),
          updated_at: new Date('2025-06-05'),
          questions: [],
          response_count: 8
        },
        {
          id: '3',
          title: 'Event Photography Review',
          description: 'Review form for corporate event photography',
          status: 'active',
          created_at: new Date('2025-06-10'),
          updated_at: new Date('2025-06-10'),
          questions: [],
          response_count: 15
        }
      ];
      
      setQuestionnaires(sampleSurveys);
      setFilteredQuestionnaires(sampleSurveys);
      
      // Also set surveys for the survey builder
      const surveyData: Survey[] = sampleSurveys.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        status: q.status === 'active' ? 'published' : 'draft',
        createdAt: new Date(q.created_at),
        updatedAt: new Date(q.updated_at),
        pages: [],
        settings: {
          allowMultipleResponses: false,
          requireLogin: false,
          isAnonymous: true,
          welcomeMessage: 'Welcome to our survey',
          thankYouMessage: 'Thank you for your feedback'
        },
        branding: {
          logo: '',
          primaryColor: '#3B82F6',
          backgroundColor: '#FFFFFF'
        }
      }));
      
      setSurveys(surveyData);
      setFilteredSurveys(surveyData);
      
    } catch (err) {
      // console.error removed
      setError('Failed to load questionnaires. Using sample data.');
      
      // Fallback to empty arrays
      setQuestionnaires([]);
      setFilteredQuestionnaires([]);
      setSurveys([]);
      setFilteredSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const filterQuestionnaires = () => {
    let filtered = [...questionnaires];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(questionnaire => 
        questionnaire.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (questionnaire.description && questionnaire.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(questionnaire => questionnaire.status === statusFilter);
    }
    
    setFilteredQuestionnaires(filtered);
  };
  const handleSaveSurvey = async (survey: Survey) => {
    try {
      setBuilderLoading(true);

      // Save to database
      const { data, error } = await supabase
        .from('surveys')
        .upsert({
          id: survey.id !== 'new' ? survey.id : undefined,
          title: survey.title,
          description: survey.description,
          status: survey.status,
          questions: survey.questions || [],
          settings: survey.settings || {},
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        // console.error removed
        throw new Error(`Database error: ${error.message}. Please ensure the 'surveys' table exists.`);
      }

      // Update local state
      if (survey.id === 'new') {
        // Adding new survey
        setSurveys(prev => [...prev, data]);
      } else {
        // Updating existing survey
        setSurveys(prev => prev.map(s => s.id === survey.id ? data : s));
      }

      setShowSurveyBuilder(false);
      setEditingSurvey(undefined);
    } catch (err: any) {
      // console.error removed
      setError(err.message || 'Failed to save survey. Please try again.');
    } finally {
      setBuilderLoading(false);
    }
  };

  const handleCancelSurvey = () => {
    setShowSurveyBuilder(false);
    setEditingSurvey(undefined);
  };

  const handleCreateSurvey = () => {
    const newSurvey: Survey = {
      id: 'new',
      title: '',
      description: '',
      status: 'draft',
      questions: [],
      settings: {},
      created_at: new Date(),
      updated_at: new Date()
    };
    setEditingSurvey(newSurvey);
    setShowSurveyBuilder(true);
  };

  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setShowSurveyBuilder(true);
  };

  const handleDuplicateQuestionnaire = async (id: string) => {
    try {
      setLoading(true);
      
      // Find the questionnaire to duplicate
      const questionnaireToDuplicate = questionnaires.find((q: any) => q.id === id);
      
      if (!questionnaireToDuplicate) {
        throw new Error('Questionnaire not found');
      }
      
      // Create a new questionnaire based on the existing one
      const newQuestionnaire = {
        ...questionnaireToDuplicate,
        id: Date.now().toString(),
        title: `${questionnaireToDuplicate.title} (Copy)`,
        status: 'inactive',
        response_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Add to local state
      setQuestionnaires(prevQuestionnaires => [newQuestionnaire, ...prevQuestionnaires]);
      setFilteredQuestionnaires(prev => [newQuestionnaire, ...prev]);
      
      const { data: newQuestionnaireData, error: insertError } = await supabase
        .from('crm_questionnaires')
        .insert([newQuestionnaire])
        .select();
      
      if (insertError) throw insertError;
      
      // Add to local state
      setQuestionnaires(prevQuestionnaires => [
        { ...newQuestionnaireData[0], response_count: 0 },
        ...prevQuestionnaires
      ]);
    } catch (err) {
      // console.error removed
      setError('Failed to duplicate questionnaire. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Questionnaire['status']) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
      archived: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Archived' }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const copyShareLink = (id: string) => {
    const shareUrl = `${window.location.origin}/questionnaire/${id}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  return (
    <AdminLayout>
      {showSurveyBuilder ? (
        <SurveyBuilder
          survey={editingSurvey}
          onSave={handleSaveSurvey}
          onCancel={handleCancelSurvey}
          isLoading={builderLoading}
        />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Questionnaires</h1>
              <p className="text-gray-600">Create and manage customer surveys and questionnaires</p>
            </div>
            <button
              onClick={handleCreateSurvey}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={20} className="mr-2" />
              Create Survey
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search surveys..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>

              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter size={20} className="mr-2" />
                More Filters
              </button>
            </div>
          </div>

          {/* Surveys List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
              <span className="ml-2 text-gray-600">Loading surveys...</span>
            </div>
          ) : filteredSurveys.length > 0 ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="divide-y divide-gray-200">
                {filteredSurveys.map((survey) => (
                  <div key={survey.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{survey.title}</h3>
                        {survey.description && (
                          <p className="text-gray-600 mt-1">{survey.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            survey.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : survey.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : survey.status === 'paused'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {survey.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {survey.questions?.length || 0} questions
                          </span>
                          <span className="text-sm text-gray-500">
                            {survey.response_count || 0} responses
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditSurvey(survey)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="Edit Survey"
                        >
                          <Edit size={16} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Preview">
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmation(survey.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete Survey"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <ClipboardList className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first survey.'}
              </p>
              <div className="mt-6">
                <button
                  onClick={handleCreateSurvey}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Create Survey
                </button>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to delete this survey? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setDeleteConfirmation(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirmation) {
                        setSurveys(prev => prev.filter(s => s.id !== deleteConfirmation));
                        setDeleteConfirmation(null);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default QuestionnairesPage;