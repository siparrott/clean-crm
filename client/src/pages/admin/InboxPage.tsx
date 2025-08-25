import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { 
  Search, 
  Filter, 
  Mail, 
  Calendar, 
  User, 
  MessageSquare, 
  Trash2, 
  Reply, 
  Star,
  Archive,
  Loader2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';

interface Message {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  content: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  clientId?: string;
  clientName?: string;
  assignedTo?: string;
  repliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const InboxPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, searchTerm, statusFilter]);

  // Auto-refresh emails every 30 seconds
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      fetchMessages(true); // Silent refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  const fetchMessages = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      
      // Clear cache and force fresh request
      const response = await fetch('/api/crm/messages?' + Date.now(), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      // console.log removed
      
      // Check if we got new messages
      const newMessageCount = data.length - messages.length;
      if (newMessageCount > 0 && messages.length > 0) {
        // console.log removed
        // Show notification for new messages
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50';
        notification.textContent = `${newMessageCount} new email${newMessageCount > 1 ? 's' : ''} received`;
        document.body.appendChild(notification);
        setTimeout(() => document.body.removeChild(notification), 3000);
      }
      
      if (!silent) {
        alert(`Fetched ${data.length} messages from API`);
      }
      
      setMessages(data || []);
      setLastRefreshTime(new Date());
    } catch (err) {
      // console.error removed
      setError('Failed to load messages. Please try again.');
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = [...messages];
    // console.log removed
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(message => 
        message.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.senderEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(message => message.status === statusFilter);
    }
    
    // console.log removed
    setFilteredMessages(filtered);
  };

  const handleStatusChange = async (id: string, newStatus: 'unread' | 'read' | 'replied' | 'archived') => {
    try {
      setLoading(true);
      
      const updateData: any = {
        status: newStatus,
      };
      
      // If marking as replied, set the repliedAt date
      if (newStatus === 'replied') {
        updateData.repliedAt = new Date().toISOString();
      }
      
      const response = await fetch(`/api/crm/messages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update message status');
      }
      
      // Update local state
      setMessages(prevMessages => 
        prevMessages.map(message => 
          message.id === id 
            ? { 
                ...message, 
                status: newStatus, 
                repliedAt: newStatus === 'replied' ? new Date().toISOString() : message.repliedAt 
              } 
            : message
        )
      );
      
      // If the selected message is the one being updated, update it too
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage({
          ...selectedMessage,
          status: newStatus,
          repliedAt: newStatus === 'replied' ? new Date().toISOString() : selectedMessage.repliedAt
        });
      }
    } catch (err) {
      // console.error removed
      setError('Failed to update message status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/crm/messages/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      
      // Remove from local state
      setMessages(prevMessages => prevMessages.filter(message => message.id !== id));
      
      // If the selected message is the one being deleted, clear it
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(null);
      }
      
      setDeleteConfirmation(null);
    } catch (err) {
      // console.error removed
      setError('Failed to delete message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Message['status']) => {
    const statusConfig = {
      unread: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Unread' },
      read: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Read' },
      replied: { bg: 'bg-green-100', text: 'text-green-800', label: 'Replied' },
      archived: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Archived' }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If it's today, show the time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If it's this year, show the month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise, show the full date
    return date.toLocaleDateString();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
            <p className="text-gray-600">Manage client messages and inquiries</p>
          </div>
          <div className="flex space-x-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span>Auto-refresh: {autoRefreshEnabled ? 'On' : 'Off'}</span>
              {lastRefreshTime && (
                <span className="text-xs text-gray-500">
                  Last: {lastRefreshTime.toLocaleTimeString()}
                </span>
              )}
            </div>
            <button 
              className={`px-3 py-1 rounded text-sm ${autoRefreshEnabled ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            >
              {autoRefreshEnabled ? 'Disable' : 'Enable'} Auto-refresh
            </button>
            <button 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center"
              onClick={() => {
                fetchMessages();
              }}
            >
              <Loader2 className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
              onClick={() => {
                // Add compose functionality here
                alert('Compose feature coming soon!');
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Compose
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search messages..."
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
              <option value="all">All Messages</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="archived">Archived</option>
            </select>

            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter size={20} className="mr-2" />
              More Filters
            </button>
          </div>
        </div>





        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Inbox Layout */}
        {loading && !selectedMessage ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading messages...</span>
          </div>
        ) : filteredMessages.length > 0 || selectedMessage ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 h-[600px]">
              {/* Message List */}
              <div className={`border-r border-gray-200 overflow-y-auto ${selectedMessage ? 'hidden md:block' : ''}`}>
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-medium text-gray-700">
                    {statusFilter === 'all' ? 'All Messages' : 
                     statusFilter === 'unread' ? 'Unread Messages' : 
                     statusFilter === 'read' ? 'Read Messages' : 
                     statusFilter === 'replied' ? 'Replied Messages' : 
                     'Archived Messages'}
                  </h3>
                  <div className="text-sm text-gray-500">
                    {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'}
                  </div>
                </div>
                <ul className="divide-y divide-gray-200">
                  {filteredMessages.map((message) => (
                    <li 
                      key={message.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedMessage?.id === message.id ? 'bg-purple-50' : ''
                      } ${message.status === 'unread' ? 'font-semibold' : ''}`}
                      onClick={() => {
                        setSelectedMessage(message);
                        if (message.status === 'unread') {
                          handleStatusChange(message.id, 'read');
                        }
                      }}
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                            {message.senderName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(message.createdAt)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-900 font-medium truncate mb-1">
                          {message.subject}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {message.content.substring(0, 100)}...
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          {getStatusBadge(message.status)}
                          {message.clientName && (
                            <span className="text-xs text-gray-500">
                              Client: {message.clientName}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Message Detail */}
              {selectedMessage ? (
                <div className="md:col-span-2 flex flex-col h-full">
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center">
                      <button 
                        className="md:hidden mr-2 text-gray-500 hover:text-gray-700"
                        onClick={() => setSelectedMessage(null)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <h3 className="font-medium text-gray-700">Message Details</h3>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleStatusChange(selectedMessage.id, 'archived')}
                        className="text-gray-500 hover:text-gray-700"
                        title="Archive"
                      >
                        <Archive size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmation(selectedMessage.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 overflow-y-auto flex-grow">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">{selectedMessage.subject}</h2>
                      <div className="flex items-start mb-4">
                        <div className="bg-gray-200 rounded-full h-10 w-10 flex items-center justify-center mr-3 flex-shrink-0">
                          <User size={20} className="text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{selectedMessage.senderName}</div>
                          <div className="text-sm text-gray-500">{selectedMessage.senderEmail}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(selectedMessage.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-gray-700 whitespace-pre-line">
                          {selectedMessage.content}
                        </div>
                      </div>
                    </div>
                    
                    {/* Client Information */}
                    {selectedMessage.clientName && (
                      <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Client Information</h3>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <User size={16} className="text-blue-500 mr-2" />
                            <span className="text-sm text-gray-700">{selectedMessage.clientName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Reply Form */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Reply</h3>
                      <div className="border border-gray-300 rounded-lg">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-300 flex items-center">
                          <button className="p-1 text-gray-500 hover:text-gray-700 mr-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button className="p-1 text-gray-500 hover:text-gray-700 mr-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button className="p-1 text-gray-500 hover:text-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4a.5.5 0 01-.5-.5v-6.5a.5.5 0 01.5-.5h12a.5.5 0 01.5.5V15a.5.5 0 01-.5.5zM4 4.5V6h12V4.5a.5.5 0 00-.5-.5H4.5a.5.5 0 00-.5.5z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        <textarea 
                          className="w-full p-3 focus:outline-none focus:ring-0 border-0 resize-none"
                          placeholder="Type your reply here..."
                          rows={6}
                        ></textarea>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button 
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center"
                          onClick={() => handleStatusChange(selectedMessage.id, 'replied')}
                        >
                          <Reply size={18} className="mr-2" />
                          Send Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="md:col-span-2 flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No message selected</h3>
                    <p className="text-gray-500">
                      Select a message from the list to view its details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Mail className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Your inbox is empty.'}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmation && handleDeleteMessage(deleteConfirmation)}
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

export default InboxPage;