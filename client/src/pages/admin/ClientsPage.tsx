import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Building,
  Upload,
  Download,
  FileText
} from 'lucide-react';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  client_id: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  total_sales: number;
  outstanding_balance: number;
  created_at: string;
  updated_at: string;
}

const ClientsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Use the API endpoint instead of direct Supabase access
      const response = await fetch('/api/crm/clients');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Map database fields to our client interface
      const mappedClients = data?.map((client: any) => ({
        id: client.id,
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        client_id: client.client_id || client.id,
        email: client.email || '',
        phone: client.phone || '',
        address1: client.address || '',
        address2: client.address2 || '',
        city: client.city || '',
        state: client.state || '',
        zip: client.zip || '',
        country: client.country || '',
        total_sales: client.total_sales || 0,
        outstanding_balance: client.outstanding_balance || 0,
        created_at: client.created_at,
        updated_at: client.updated_at
      }));
      
      setClients(mappedClients || []);
    } catch (err) {
      // console.error removed
      setError('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = clients.filter(client => 
      client.first_name.toLowerCase().includes(lowerSearchTerm) ||
      client.last_name.toLowerCase().includes(lowerSearchTerm) ||
      client.email.toLowerCase().includes(lowerSearchTerm) ||
      client.phone.toLowerCase().includes(lowerSearchTerm) ||
      client.client_id.toLowerCase().includes(lowerSearchTerm)
    );
    
    setFilteredClients(filtered);
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/admin/clients/${clientId}`);
  };

  const handleEditClient = (clientId: string) => {
    navigate(`/admin/clients/${clientId}/edit`);
  };

  const handleDeleteClient = async (client: Client) => {
    if (!window.confirm(`Are you sure you want to delete ${client.first_name} ${client.last_name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/crm/clients/${client.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      
      // Remove from local state
      setClients(prev => prev.filter(c => c.id !== client.id));
      setFilteredClients(prev => prev.filter(c => c.id !== client.id));
      
      alert('Client deleted successfully');
    } catch (err: any) {
      // console.error removed
      alert('Failed to delete client. Please try again.');
    }
  };

  const handleExportCSV = () => {
    // This would be implemented to export clients to CSV
    alert('Export functionality would be implemented here');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
            <p className="text-gray-600">Manage your client database</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
            >              <Download size={20} className="mr-2" />
              {t('action.export')} CSV
            </button>
            <Link
              to="/admin/clients/import"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Upload size={20} className="mr-2" />
              {t('action.import')} CSV
            </Link>
            <Link
              to="/admin/clients/import-logs"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <FileText size={20} className="mr-2" />
              {t('clients.import_logs')}
            </Link>
            <button
              onClick={() => navigate('/admin/clients/new')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Plus size={20} className="mr-2" />
              {t('clients.add')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />              <input
                type="text"
                placeholder={t('clients.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter size={20} className="mr-2" />
              {t('clients.more_filters')}
            </button>
          </div>
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <div key={client.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{client.first_name} {client.last_name}</h3>
                      {client.company && (
                        <p className="text-sm text-gray-600 flex items-center mt-1">
                          <Building size={14} className="mr-1" />
                          {client.company}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 flex items-center">
                      <Mail size={14} className="mr-2" />
                      {client.email}
                    </p>                    <p className="text-sm text-gray-600 flex items-center">
                      <Phone size={14} className="mr-2" />
                      {client.phone || t('clients.no_phone')}
                    </p>
                    {client.address1 && (
                      <p className="text-sm text-gray-600 flex items-start">
                        <MapPin size={14} className="mr-2 mt-0.5" />
                        {client.address1}
                        {client.city && `, ${client.city}`}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      {t('clients.since')} {new Date(client.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewClient(client.id)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="View Client Profile"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleEditClient(client.id)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                        title="Edit Client"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClient(client)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete Client"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No clients found matching your criteria.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClientsPage;