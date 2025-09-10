import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';
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
  ArrowDown,
  Merge
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
  const [showMerge, setShowMerge] = useState(false);

  // Merge wizard state
  interface MergeSuggestionRow {
    key: string;
    primary: any;
    duplicates: any[];
    selected: boolean; // user choose to merge this group
  }
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestionRow[]>([]);
  const [mergeMode, setMergeMode] = useState<'email' | 'phone'>('email');
  const [mergeStrategy, setMergeStrategy] = useState<'keep-oldest' | 'keep-newest'>('keep-oldest');
  const [executingMerge, setExecutingMerge] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

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

  // Fetch merge suggestions
  const loadMergeSuggestions = async () => {
    setMergeLoading(true);
    setMergeMessage(null);
    try {
      const resp = await fetch(`/api/crm/clients/merge-suggestions?by=${mergeMode}&strategy=${mergeStrategy}&limit=100`);
      if (!resp.ok) throw new Error('Failed to fetch merge suggestions');
      const data = await resp.json();
      const suggestions: MergeSuggestionRow[] = (data?.suggestions || []).map((s: any) => ({ ...s, selected: true }));
      setMergeSuggestions(suggestions);
    } catch (e: any) {
      setMergeMessage(e.message || 'Error loading suggestions');
    } finally {
      setMergeLoading(false);
    }
  };

  const openMergeWizard = () => {
    setShowMerge(true);
    // lazy load on open
    loadMergeSuggestions();
  };

  const executeSelectedMerges = async () => {
    const selected = mergeSuggestions.filter(s => s.selected);
    if (selected.length === 0) {
      setMergeMessage('No groups selected to merge.');
      return;
    }
    if (!window.confirm(`Merge ${selected.length} duplicate group(s)? This cannot be undone.`)) return;
    setExecutingMerge(true);
    setMergeMessage(null);
    let successCount = 0;
    try {
      const mergesPayload = selected.map(group => ({ primaryId: group.primary.id, duplicateIds: group.duplicates.map(d => d.id) }));
      const resp = await fetch('/api/crm/clients/merge-execute-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merges: mergesPayload })
      });
      if (resp.ok) {
        const data = await resp.json();
        successCount = data?.results?.filter((r: any) => r.merged > 0).length || 0;
      }
      setMergeMessage(`Merged ${successCount} group(s). Refreshing client list...`);
      await fetchClients();
      // Refresh suggestions after merges
      await loadMergeSuggestions();
    } catch (e: any) {
      setMergeMessage(e.message || 'Failed executing merges');
    } finally {
      setExecutingMerge(false);
    }
  };

  const toggleGroupSelected = (key: string) => {
    setMergeSuggestions(prev => prev.map(s => s.key === key ? { ...s, selected: !s.selected } : s));
  };

  const selectAllGroups = (val: boolean) => {
    setMergeSuggestions(prev => prev.map(s => ({ ...s, selected: val })));
  };

  const summaryCounts = () => {
    const totalGroups = mergeSuggestions.length;
    const totalClientsImpacted = mergeSuggestions.reduce((acc, g) => acc + 1 + g.duplicates.length, 0);
    return { totalGroups, totalClientsImpacted };
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
              onClick={openMergeWizard}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Merge size={20} className="mr-2" />
              Merge Wizard
            </button>
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
            
            <button onClick={() => setShowFilterModal(true)} className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
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

        {showMerge && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 overflow-auto p-6">
            <div className="bg-white w-full max-w-6xl rounded-lg shadow-lg p-6 relative">
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={() => setShowMerge(false)}
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold mb-4 flex items-center"><Merge className="mr-2" size={22}/>Merge Wizard</h2>
              <div className="flex flex-wrap gap-4 mb-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mode</label>
                  <select
                    value={mergeMode}
                    onChange={(e) => { setMergeMode(e.target.value as any); loadMergeSuggestions(); }}
                    className="border rounded px-2 py-1"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Strategy</label>
                  <select
                    value={mergeStrategy}
                    onChange={(e) => { setMergeStrategy(e.target.value as any); loadMergeSuggestions(); }}
                    className="border rounded px-2 py-1"
                  >
                    <option value="keep-oldest">Keep Oldest</option>
                    <option value="keep-newest">Keep Newest</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  {mergeLoading ? 'Loading suggestions...' : `${mergeSuggestions.length} group(s) found`}
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    className="px-3 py-2 text-xs rounded bg-gray-200 hover:bg-gray-300"
                    onClick={() => selectAllGroups(true)}
                  >Select All</button>
                  <button
                    className="px-3 py-2 text-xs rounded bg-gray-200 hover:bg-gray-300"
                    onClick={() => selectAllGroups(false)}
                  >Deselect All</button>
                  <button
                    disabled={executingMerge || mergeLoading}
                    onClick={executeSelectedMerges}
                    className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-60"
                  >
                    {executingMerge ? 'Merging...' : 'Execute Merges'}
                  </button>
                </div>
              </div>
              {mergeMessage && (
                <div className="mb-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
                  {mergeMessage}
                </div>
              )}
              <div className="overflow-auto max-h-[60vh] border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="p-2">Select</th>
                      <th className="p-2">Key</th>
                      <th className="p-2">Primary</th>
                      <th className="p-2">Duplicates</th>
                      <th className="p-2">Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergeSuggestions.map(group => (
                      <tr key={group.key} className={group.selected ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-2 align-top">
                          <input
                            type="checkbox"
                            checked={group.selected}
                            onChange={() => toggleGroupSelected(group.key)}
                          />
                        </td>
                        <td className="p-2 align-top font-mono text-xs">{group.key}</td>
                        <td className="p-2 align-top w-48">
                          <div className="font-semibold">{group.primary.last_name || group.primary.lastName || ''} {group.primary.first_name || group.primary.firstName || ''}</div>
                          <div className="text-xs text-gray-500 break-all">{group.primary.email || group.primary.phone}</div>
                          <div className="text-[10px] text-gray-400">id: {group.primary.id}</div>
                        </td>
                        <td className="p-2 align-top w-64">
                          {group.duplicates.map(d => (
                            <div key={d.id} className="mb-2 border-b last:border-b-0 pb-1">
                              <div className="font-medium">{d.last_name || d.lastName || ''} {d.first_name || d.firstName || ''}</div>
                              <div className="text-xs text-gray-500 break-all">{d.email || d.phone}</div>
                              <div className="text-[10px] text-gray-400">id: {d.id}</div>
                            </div>
                          ))}
                        </td>
                        <td className="p-2 align-top text-xs w-72">
                          <div className="space-y-1">
                            {['phone','address','city','state','zip','country','company','notes'].map(f => {
                              const pVal = group.primary[f] || '';
                              const anyDupVal = group.duplicates.find(d => d[f])?.[f];
                              if (!anyDupVal) return null;
                              if (pVal) return null; // only show fields that would be enriched
                              return (
                                <div key={f} className="flex justify-between gap-2">
                                  <span className="text-gray-500">{f}:</span>
                                  <span className="font-medium text-gray-800 truncate max-w-[160px]" title={anyDupVal}>{String(anyDupVal).slice(0,60)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!mergeLoading && mergeSuggestions.length === 0) && (
                      <tr><td colSpan={5} className="p-4 text-center text-gray-500">No duplicate groups found.</td></tr>
                    )}
                    {mergeLoading && (
                      <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                {(() => { const s = summaryCounts(); return `Groups: ${s.totalGroups} | Total Clients Impacted: ${s.totalClientsImpacted}`; })()}
              </div>
            </div>
          </div>
        )}

        {showFilterModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
              <button onClick={() => setShowFilterModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">✕</button>
              <h3 className="text-lg font-semibold mb-4 flex items-center"><Filter className="mr-2" size={18}/>Advanced Filters</h3>
              <p className="text-sm text-gray-600 mb-4">(Placeholder) Add additional filtering options here (status, date range, has email, has phone, etc.).</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowFilterModal(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm">{t('action.close')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClientsPage;