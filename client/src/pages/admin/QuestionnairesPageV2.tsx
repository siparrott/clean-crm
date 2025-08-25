import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import SurveyBuilder from '../../components/admin/SurveyBuilderV3';
import { surveyApi } from '../../lib/survey-api';
import { Survey } from '../../types/survey';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Copy, 
  Trash2, 
  ClipboardList, 
  Users,
  Link,
  Calendar,
  Loader2,
  AlertCircle,
  BarChart3
} from 'lucide-react';

const QuestionnairesPage: React.FC = () => {
  const { t } = useLanguage();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSurveyBuilder, setShowSurveyBuilder] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | undefined>(undefined);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [builderLoading, setBuilderLoading] = useState(false);

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    filterSurveys();
  }, [surveys, searchTerm, statusFilter]);

  const fetchSurveys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await surveyApi.getSurveys(1, 50, statusFilter === 'all' ? undefined : statusFilter, searchTerm);
      setSurveys(response.surveys);
    } catch (err) {
      // console.error removed
      setError('Failed to load surveys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterSurveys = () => {
    let filtered = [...surveys];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(survey => 
        survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (survey.description && survey.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(survey => survey.status === statusFilter);
    }
    
    setFilteredSurveys(filtered);
  };

  const handleDeleteSurvey = async (id: string) => {
    try {
      setLoading(true);
      await surveyApi.deleteSurvey(id);
      setSurveys(prevSurveys => prevSurveys.filter(s => s.id !== id));
      setDeleteConfirmation(null);
    } catch (err) {
      // console.error removed
      setError('Failed to delete survey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateSurvey = async (survey: Survey) => {
    try {
      setLoading(true);
      const duplicatedSurvey = await surveyApi.duplicateSurvey(survey.id);
      setSurveys(prevSurveys => [duplicatedSurvey, ...prevSurveys]);
    } catch (err) {
      // console.error removed
      setError('Failed to duplicate survey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSurvey = () => {
    setEditingSurvey(undefined);
    setShowSurveyBuilder(true);
  };

  const handleEditSurvey = (survey: Survey) => {
    setEditingSurvey(survey);
    setShowSurveyBuilder(true);
  };

  const handleSaveSurvey = async (surveyData: Partial<Survey>) => {
    try {
      setBuilderLoading(true);
      
      if (editingSurvey) {
        // Update existing survey
        const updatedSurvey = await surveyApi.updateSurvey(editingSurvey.id, surveyData);
        setSurveys(prevSurveys => 
          prevSurveys.map(s => s.id === editingSurvey.id ? updatedSurvey : s)
        );
      } else {        // Create new survey
        const surveyToCreate = {
          ...surveyData,
          status: surveyData.status || 'draft' as const,
          title: surveyData.title || 'Untitled Survey',
          pages: surveyData.pages || [],
          settings: surveyData.settings || {
            allowAnonymous: true,
            progressBar: true
          },
          createdBy: 'current-user-id' // TODO: Get from auth context
        };
        const newSurvey = await surveyApi.createSurvey(surveyToCreate);
        setSurveys(prevSurveys => [newSurvey, ...prevSurveys]);
      }
      
      setShowSurveyBuilder(false);
      setEditingSurvey(undefined);
    } catch (err) {
      // console.error removed
      setError('Failed to save survey. Please try again.');
    } finally {
      setBuilderLoading(false);
    }
  };

  const handleCancelBuilder = () => {
    setShowSurveyBuilder(false);
    setEditingSurvey(undefined);
  };

  const getStatusBadge = (status: Survey['status']) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Paused' },
      closed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Closed' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Archived' }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const copyShareLink = (id: string) => {
    const shareUrl = `${window.location.origin}/survey/${id}`;
    navigator.clipboard.writeText(shareUrl);
    // You might want to show a toast notification here
    alert('Share link copied to clipboard!');
  };

  const getTotalQuestions = (survey: Survey): number => {
    return survey.pages.reduce((total, page) => total + page.questions.length, 0);
  };
  const getResponseCount = (survey: Survey): number => {
    return survey.analytics?.totalCompletes || 0;
  };

  if (showSurveyBuilder) {
    return (
      <AdminLayout>
        <div className="h-full">
          <SurveyBuilder
            survey={editingSurvey}
            onSave={handleSaveSurvey}
            onCancel={handleCancelBuilder}
            isLoading={builderLoading}
          />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('admin.surveys')}</h1>
            <p className="text-gray-600">{t('survey.create')} and manage surveys and questionnaires</p>
          </div>
          <button
            onClick={handleCreateSurvey}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={20} />
            <span>{t('survey.create')}</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />            <input
              type="text"
              placeholder={t('action.search') + ' surveys...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading surveys...</span>
          </div>
        )}

        {/* Survey List */}
        {!loading && (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {filteredSurveys.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No surveys match your current filters.' 
                    : 'Get started by creating your first survey.'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <div className="mt-6">
                    <button
                      onClick={handleCreateSurvey}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      Create Survey
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Survey Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Questions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSurveys.map((survey) => (
                      <tr key={survey.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {survey.title}
                              </div>
                              {survey.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {survey.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(survey.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <ClipboardList size={16} className="mr-1" />
                            {getTotalQuestions(survey)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Users size={16} className="mr-1" />
                            {getResponseCount(survey)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar size={16} className="mr-1" />
                            {new Date(survey.updatedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {survey.status === 'active' && (
                              <button
                                onClick={() => copyShareLink(survey.id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Copy share link"
                              >
                                <Link size={16} />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleEditSurvey(survey)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit survey"
                            >
                              <Edit size={16} />
                            </button>
                            
                            <button
                              onClick={() => handleDuplicateSurvey(survey)}
                              className="text-green-600 hover:text-green-900"
                              title="Duplicate survey"
                            >
                              <Copy size={16} />
                            </button>
                            
                            {getResponseCount(survey) > 0 && (
                              <button
                                className="text-purple-600 hover:text-purple-900"
                                title="View analytics"
                              >
                                <BarChart3 size={16} />
                              </button>
                            )}
                            
                            <button
                              onClick={() => setDeleteConfirmation(survey.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete survey"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this survey? This action cannot be undone and will also delete all associated responses.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmation && handleDeleteSurvey(deleteConfirmation)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default QuestionnairesPage;
