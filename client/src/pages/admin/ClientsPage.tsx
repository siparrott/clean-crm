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
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  clientId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  total_sales: number;
  outstanding_balance: number;
  createdAt: string;
  updatedAt: string;
}

const ClientsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<'name' | 'created'>('name');

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterAndSortClients();
  }, [clients, searchTerm, sortOrder, sortBy]);

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
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        clientId: client.clientId || client.id,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        zip: client.zip || '',
        country: client.country || '',
        total_sales: client.total_sales || 0,
        outstanding_balance: client.outstanding_balance || 0,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      }));
      
      setClients(mappedClients || []);
    } catch (err) {
      // console.error removed
      setError('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortClients = () => {
    let filtered = clients;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = clients.filter(client => 
        client.firstName.toLowerCase().includes(lowerSearchTerm) ||
        client.lastName.toLowerCase().includes(lowerSearchTerm) ||
        client.email.toLowerCase().includes(lowerSearchTerm) ||
        client.phone.toLowerCase().includes(lowerSearchTerm) ||
        client.clientId.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        // Sort by last name, then first name
        const aLastName = a.lastName || '';
        const aFirstName = a.firstName || '';
        const bLastName = b.lastName || '';
        const bFirstName = b.firstName || '';
        
        const aName = `${aLastName} ${aFirstName}`.trim().toLowerCase();
        const bName = `${bLastName} ${bFirstName}`.trim().toLowerCase();
        
        // If both have names, sort by name
        if (aName && bName) {
          comparison = aName.localeCompare(bName);
        }
        // If only one has a name, put that one first
        else if (aName && !bName) {
          comparison = -1;
        }
        else if (!aName && bName) {
          comparison = 1;
        }
        // If neither has a name, sort by email
        else {
          comparison = (a.email || '').toLowerCase().localeCompare((b.email || '').toLowerCase());
        }
      } else if (sortBy === 'created') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredClients(filtered);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleViewClient = (clientId: string) => {
    navigate(`/admin/clients/${clientId}`);
  };

  const handleEditClient = (clientId: string) => {
    navigate(`/admin/clients/${clientId}/edit`);
  };

  const handleDeleteClient = async (client: Client) => {
    if (!window.confirm(t('message.confirmDelete'))) {
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
      
      alert(t('message.success'));
    } catch (err: any) {
      // console.error removed
      alert(t('message.error'));
    }
  };

  const handleExportCSV = () => {
    try {
      // Create CSV content
      const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP', 'Country', 'Total Sales', 'Outstanding Balance', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...filteredClients.map(client => [
          client.clientId,
          `"${client.firstName || ''}"`,
          `"${client.lastName || ''}"`,
          `"${client.email || ''}"`,
          `"${client.phone || ''}"`,
          `"${client.address || ''}"`,
          `"${client.city || ''}"`,
          `"${client.state || ''}"`,
          `"${client.zip || ''}"`,
          `"${client.country || ''}"`,
          client.total_sales || 0,
          client.outstanding_balance || 0,
          client.createdAt
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert(t('message.error'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t('page.clients')}</h1>
            <p className="text-gray-600">{t('clients.manage_database')}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleExportCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Download size={20} className="mr-2" />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('clients.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'created')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="name">{t('clients.sort_by_name')}</option>
                <option value="created">{t('clients.sort_by_date')}</option>
              </select>
              
              <button
                onClick={toggleSortOrder}
                className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={`${t('action.sort')} ${sortOrder === 'asc' ? t('clients.descending') : t('clients.ascending')}`}
              >
                {sortOrder === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
              </button>
            </div>
            
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter size={20} className="mr-2" />
              {t('clients.more_filters')}
            </button>
            
            <div className="text-sm text-gray-600 flex items-center">
              {t('pagination.showing')} {filteredClients.length} {t('common.of')} {clients.length} {t('clients.clients')}
            </div>
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
                      <h3 className="text-lg font-bold text-gray-900">
                        {client.lastName || client.firstName 
                          ? `${client.lastName || ''}, ${client.firstName || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
                          : t('clients.unnamed_client')
                        }
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {client.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {client.clientId}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600 flex items-center">
                      <Phone size={14} className="mr-2" />
                      {client.phone || t('clients.no_phone')}
                    </p>
                    {client.address && (
                      <p className="text-sm text-gray-600 flex items-start">
                        <MapPin size={14} className="mr-2 mt-0.5" />
                        {client.address}
                        {client.city && `, ${client.city}`}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      {t('clients.since')} {new Date(client.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleViewClient(client.id)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title={t('action.view')}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleEditClient(client.id)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                        title={t('action.edit')}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClient(client)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title={t('action.delete')}
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
            <p className="text-gray-500">{t('clients.no_clients_found')}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClientsPage;