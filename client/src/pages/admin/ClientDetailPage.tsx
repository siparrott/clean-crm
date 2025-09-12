import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { ArrowLeft, Mail, Phone, MapPin, Building, Edit, Trash2, Calendar, Euro, MessageSquare, Plus, FileText, Inbox, ClipboardList, Eye } from 'lucide-react';
import { googleCalendarService } from '../../services/googleCalendarService';
import SendQuestionnaireModal from '../../components/admin/SendQuestionnaireModal';
import ViewEmailsModal from '../../components/admin/ViewEmailsModal';
import ViewQuestionnairesModal from '../../components/admin/ViewQuestionnairesModal';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  clientId?: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  company?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
}

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [showEmailsModal, setShowEmailsModal] = useState(false);
  const [showSurveysModal, setShowSurveysModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchClient(id);
    }
  }, [id]);

  const fetchClient = async (clientId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm/clients/${clientId}`);
      
      if (!response.ok) {
        throw new Error('Client not found');
      }
      
      const clientData = await response.json();
      setClient(clientData);
    } catch (err) {
      setError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/admin/clients/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!client) return;
    
    if (!window.confirm(`Are you sure you want to delete ${client.firstName} ${client.lastName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/crm/clients/${client.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      
      alert('Client deleted successfully');
      navigate('/admin/clients');
    } catch (err) {
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleScheduleSession = async () => {
    if (!client) return;
    
    try {
      // Create a default session event
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow
      
      const endTime = new Date(tomorrow);
      endTime.setHours(16, 0, 0, 0); // 4 PM (2 hour session)
      
      const event = {
        title: `Fotoshooting - ${client.firstName} ${client.lastName}`,
        description: `Fotoshooting-Termin mit ${client.firstName} ${client.lastName}\n\nKontakt:\nE-Mail: ${client.email}\nTelefon: ${client.phone || 'Nicht angegeben'}\n\nAdresse: ${client.address || 'Nicht angegeben'}`,
        startTime: tomorrow,
        endTime: endTime,
        location: 'New Age Fotografie Studio, Wehrgasse 11A/2+5, 1050 Wien',
        attendees: [client.email],
        clientId: client.id
      };
      
      // Create internally without forcing Google prompt
      await googleCalendarService.createEvent(event, { promptGoogle: false });
      // Navigate to internal calendar with new event context
      navigate(`/admin/calendar?clientId=${client.id}`);
    } catch (error) {
      console.error('Failed to schedule session:', error);
      alert('Failed to schedule session. Please try again.');
    }
  };

  const handleAddAppointment = async () => {
    if (!client) return;
    // Open a lightweight appointment creation (reuse schedule logic but no default times)
    const start = new Date();
    start.setHours(start.getHours() + 2, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    const event = {
      title: `Appointment - ${client.firstName} ${client.lastName}`,
      description: `Linked to client ${client.firstName} ${client.lastName} (${client.email})`,
      startTime: start,
      endTime: end,
      clientId: client.id
    };
    await googleCalendarService.createEvent(event, { promptGoogle: false });
    navigate(`/admin/calendar?clientId=${client.id}`);
  };

  const handleCreateInvoice = () => {
    // Navigate to invoices with pre-filled client data
    navigate(`/admin/invoices?clientId=${client?.id}&action=new`);
  };

  const handleSendEmail = async () => {
    if (!client) return;
    navigate(`/admin/inbox?compose=1&to=${encodeURIComponent(client.email)}&name=${encodeURIComponent(client.firstName + ' ' + client.lastName)}`);
  };

  const handleSendSMS = async () => {
    if (!client) return;
    
    if (!client.phone) {
      alert('No phone number available for this client');
      return;
    }
    
    try {
      const message = `Hallo ${client.firstName}, vielen Dank für Ihr Interesse an New Age Fotografie. Bei Fragen stehen wir gerne zur Verfügung!`;
      
      // Navigate to SMS composition
      navigate(`/admin/communications?action=sms&clientId=${client.id}&phone=${encodeURIComponent(client.phone)}&message=${encodeURIComponent(message)}`);
    } catch (error) {
      console.error('Failed to compose SMS:', error);
      alert('Failed to open SMS composer');
    }
  };

  const handleViewEmails = () => {
    setShowEmailsModal(true);
  };

  const handleViewQuestionnaires = () => {
    setShowSurveysModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
      inactive: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Inactive' },
      archived: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Archived' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !client) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Client not found'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/clients')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {client.firstName} {client.lastName}
              </h1>
              <p className="text-gray-600">Client Details</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Edit size={16} className="mr-2" />
              Edit
            </button>
            <button
              onClick={() => setShowQuestionnaireModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <FileText size={16} className="mr-2" />
              Send Questionnaire
            </button>
            <button
              onClick={handleViewEmails}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Inbox size={16} className="mr-2" />
              View Emails
            </button>
            <button
              onClick={handleViewQuestionnaires}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <ClipboardList size={16} className="mr-2" />
              View Questionnaires
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </button>
          </div>
        </div>

        {/* Client Information Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {client.firstName} {client.lastName}
              </h2>
              {client.company && (
                <p className="text-gray-600 flex items-center mt-1">
                  <Building size={16} className="mr-2" />
                  {client.company}
                </p>
              )}
            </div>
            {getStatusBadge(client.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Mail size={16} className="text-gray-400 mr-3" />
                  <a href={`mailto:${client.email}`} className="text-purple-600 hover:text-purple-700">
                    {client.email}
                  </a>
                </div>
                {client.phone && (
                  <div className="flex items-center">
                    <Phone size={16} className="text-gray-400 mr-3" />
                    <a href={`tel:${client.phone}`} className="text-purple-600 hover:text-purple-700">
                      {client.phone}
                    </a>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start">
                    <MapPin size={16} className="text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-gray-900">{client.address}</p>
                      {client.city && (
                        <p className="text-gray-600">
                          {client.zip && `${client.zip} `}{client.city}
                          {client.state && `, ${client.state}`}
                          {client.country && `, ${client.country}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>
              <div className="space-y-3">
                {client.clientId && (
                  <div>
                    <p className="text-sm text-gray-500">Client ID</p>
                    <p className="text-gray-900">{client.clientId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="text-gray-900">{new Date(client.createdAt).toLocaleDateString()}</p>
                </div>
                {client.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-gray-900">{client.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <button 
            onClick={handleScheduleSession}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-purple-300 transition-colors flex items-center justify-center"
          >
            <Calendar size={20} className="mr-2 text-purple-600" />
            <span>Schedule Session</span>
          </button>
          <button
            onClick={handleAddAppointment}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-purple-300 transition-colors flex items-center justify-center"
          >
            <Plus size={20} className="mr-2 text-purple-600" />
            <span>Add Appointment</span>
          </button>
          <button 
            onClick={handleCreateInvoice}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-green-300 transition-colors flex items-center justify-center"
          >
            <Euro size={20} className="mr-2 text-green-600" />
            <span>Create Invoice</span>
          </button>
          <button 
            onClick={handleSendEmail}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-blue-300 transition-colors flex items-center justify-center"
          >
            <Mail size={20} className="mr-2 text-blue-600" />
            <span>Send Email</span>
          </button>
          <button 
            onClick={handleSendSMS}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-orange-300 transition-colors flex items-center justify-center"
            disabled={!client?.phone}
          >
            <MessageSquare size={20} className="mr-2 text-orange-600" />
            <span>Send SMS</span>
          </button>
        </div>
      </div>

      {/* Send Questionnaire Modal */}
      {client && (
        <SendQuestionnaireModal
          isOpen={showQuestionnaireModal}
          onClose={() => setShowQuestionnaireModal(false)}
          client={client}
        />
      )}

      {/* View Emails Modal */}
      {client && (
        <ViewEmailsModal
          isOpen={showEmailsModal}
          onClose={() => setShowEmailsModal(false)}
          clientId={client.id}
          clientName={`${client.firstName} ${client.lastName}`}
        />
      )}

      {/* View Questionnaires Modal */}
      {client && (
        <ViewQuestionnairesModal
          isOpen={showSurveysModal}
          onClose={() => setShowSurveysModal(false)}
          clientId={client.id}
          clientName={`${client.firstName} ${client.lastName}`}
        />
      )}
    </AdminLayout>
  );
};

export default ClientDetailPage;