import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  Play, 
  Pause, 
  BarChart3
} from 'lucide-react';

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  questionCount: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

const QuestionnairesPage: React.FC = () => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [filteredQuestionnaires, setFilteredQuestionnaires] = useState<Questionnaire[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  useEffect(() => {
    filterQuestionnaires();
  }, [questionnaires, searchTerm, statusFilter]);

  const fetchQuestionnaires = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Sample questionnaires data
      const sampleData: Questionnaire[] = [
        {
          id: '1',
          title: 'Customer Satisfaction Survey',
          description: 'Measure customer satisfaction with our photography services',
          status: 'active',
          questionCount: 8,
          responseCount: 23,
          createdAt: '2025-06-01',
          updatedAt: '2025-06-01'
        },
        {
          id: '2',
          title: 'Wedding Photography Feedback',
          description: 'Feedback form for wedding photography clients',
          status: 'inactive',
          questionCount: 12,
          responseCount: 8,
          createdAt: '2025-06-05',
          updatedAt: '2025-06-05'
        },
        {
          id: '3',
          title: 'Event Photography Review',
          description: 'Review form for corporate event photography',
          status: 'active',
          questionCount: 6,
          responseCount: 15,
          createdAt: '2025-06-10',
          updatedAt: '2025-06-10'
        }
      ];
      
      setQuestionnaires(sampleData);
      setFilteredQuestionnaires(sampleData);
      
    } catch (err) {
      // console.error removed
      setError('Failed to load questionnaires. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterQuestionnaires = () => {
    let filtered = [...questionnaires];
    
    if (searchTerm) {
      filtered = filtered.filter(questionnaire => 
        questionnaire.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        questionnaire.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(questionnaire => questionnaire.status === statusFilter);
    }
    
    setFilteredQuestionnaires(filtered);
  };

  const handleDeleteQuestionnaire = async (id: string) => {
    try {
      setLoading(true);
      
      setQuestionnaires(prev => prev.filter(q => q.id !== id));
      setFilteredQuestionnaires(prev => prev.filter(q => q.id !== id));
      setDeleteConfirmation(null);
    } catch (err) {
      // console.error removed
      setError('Failed to delete questionnaire. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateQuestionnaire = async (id: string) => {
    try {
      setLoading(true);
      
      const questionnaireToDuplicate = questionnaires.find(q => q.id === id);
      
      if (!questionnaireToDuplicate) {
        throw new Error('Questionnaire not found');
      }
      
      const newQuestionnaire: Questionnaire = {
        ...questionnaireToDuplicate,
        id: Date.now().toString(),
        title: `${questionnaireToDuplicate.title} (Copy)`,
        status: 'inactive',
        responseCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      };

      setQuestionnaires(prev => [newQuestionnaire, ...prev]);
      setFilteredQuestionnaires(prev => [newQuestionnaire, ...prev]);
      
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
      archived: { bg: 'bg-red-100', text: 'text-red-800', label: 'Archived' }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handleToggleStatus = (id: string) => {
    setQuestionnaires(prev => prev.map(q => 
      q.id === id 
        ? { ...q, status: q.status === 'active' ? 'inactive' : 'active' as Questionnaire['status'] }
        : q
    ));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Questionnaires</h1>
            <p className="text-gray-600">Create and manage customer surveys and feedback forms</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <Plus size={16} />
              <span>Create Survey</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Surveys</p>
                <p className="text-2xl font-semibold text-gray-900">{questionnaires.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Surveys</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {questionnaires.filter(q => q.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Responses</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {questionnaires.reduce((sum, q) => sum + q.responseCount, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Pause className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Response Rate</p>
                <p className="text-2xl font-semibold text-gray-900">73%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search questionnaires..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-64"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Questionnaires Grid */}
        <div className="bg-white shadow rounded-lg">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading questionnaires...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <div className="text-red-600 text-sm">{error}</div>
              <button 
                onClick={fetchQuestionnaires}
                className="mt-2 text-purple-600 hover:text-purple-800 text-sm"
              >
                Try again
              </button>
            </div>
          ) : filteredQuestionnaires.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Survey
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
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredQuestionnaires.map((questionnaire) => (
                    <tr key={questionnaire.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {questionnaire.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {questionnaire.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(questionnaire.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {questionnaire.questionCount} questions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {questionnaire.responseCount} responses
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(questionnaire.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleToggleStatus(questionnaire.id)}
                            className={`p-2 rounded-md ${
                              questionnaire.status === 'active' 
                                ? 'text-orange-600 hover:bg-orange-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={questionnaire.status === 'active' ? 'Pause' : 'Activate'}
                          >
                            {questionnaire.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          
                          <button
                            onClick={() => alert('Survey preview feature coming soon!')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                            title="Preview"
                          >
                            <Eye size={16} />
                          </button>
                          
                          <button
                            onClick={() => alert('Survey editing feature coming soon!')}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          
                          <button
                            onClick={() => handleDuplicateQuestionnaire(questionnaire.id)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-md"
                            title="Duplicate"
                          >
                            <Copy size={16} />
                          </button>
                          
                          <button
                            onClick={() => alert('Analytics feature coming soon!')}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                            title="Analytics"
                          >
                            <BarChart3 size={16} />
                          </button>
                          
                          <button
                            onClick={() => setDeleteConfirmation(questionnaire.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            title="Delete"
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
          ) : (
            <div className="p-6 text-center">
              <div className="text-gray-500">No questionnaires found.</div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="mt-2 text-purple-600 hover:text-purple-800 text-sm"
              >
                Create your first survey
              </button>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Survey</h3>
                <p className="text-gray-600 mb-6">
                  The advanced survey builder is being prepared. For now, you can duplicate existing surveys to test the functionality.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      alert('Survey builder coming soon! Try duplicating an existing survey for now.');
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Survey</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this survey? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeleteConfirmation(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteQuestionnaire(deleteConfirmation)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default QuestionnairesPage;
