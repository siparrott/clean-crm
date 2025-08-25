import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { ArrowLeft, Mail, Phone, MapPin, Building, Edit, Trash2, Calendar, Euro } from 'lucide-react';

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 flex items-center justify-center">
            <Calendar size={20} className="mr-2 text-purple-600" />
            <span>Schedule Session</span>
          </button>
          <button className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 flex items-center justify-center">
            <Euro size={20} className="mr-2 text-green-600" />
            <span>Create Invoice</span>
          </button>
          <button className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 flex items-center justify-center">
            <Mail size={20} className="mr-2 text-blue-600" />
            <span>Send Email</span>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ClientDetailPage;