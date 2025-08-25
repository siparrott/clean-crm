import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import InboxSettings from '../../components/admin/InboxSettings';
import SimpleEmailComposer from '../../components/inbox/SimpleEmailComposer';
import { 
  Plus, 
  Search, 
  Filter,
  Mail,
  MailOpen,
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  MoreHorizontal,
  Paperclip,
  Flag,
  Clock,
  User,
  CheckSquare,
  RefreshCw,
  Settings,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Folder,
  Tag,
  Download
} from 'lucide-react';

interface EmailMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
  labels: string[];
  folder: 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';
  threadId: string;
}

interface EmailFolder {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
}

const AdminInboxPage: React.FC = () => {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<EmailMessage | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [searchTerm, setSearchTerm] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'forward' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshEmails = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/email/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        // console.log removed
        await fetchMessages(); // Reload messages
        alert(`Email refresh completed: ${result.newEmails} new emails imported`);
      } else {
        throw new Error('Failed to refresh emails');
      }
    } catch (error) {
      // console.error removed
      alert('Failed to refresh emails. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load messages from API
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/inbox/emails?' + Date.now(), {
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
      
      // Convert API data to EmailMessage format with proper folder separation
      const emailMessages: EmailMessage[] = data.map((msg: any) => ({
        id: msg.id,
        from: msg.senderEmail,
        fromName: msg.senderName,
        to: 'hallo@newagefotografie.com',
        subject: msg.subject,
        body: msg.content,
        timestamp: msg.createdAt,
        isRead: msg.status === 'read' || msg.status === 'archived',
        isStarred: false,
        isImportant: msg.status === 'unread',
        hasAttachments: false,
        labels: [],
        folder: 'inbox' as const, // Show all messages in inbox for unified view
        threadId: msg.id
      }));
      
      setMessages(emailMessages);
    } catch (err) {
      // console.error removed
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Email folders with proper counts
  const folders: EmailFolder[] = [
    { id: 'inbox', name: 'Inbox', count: messages.filter(m => !m.subject.startsWith('[SENT]')).length, icon: <Mail size={16} /> },
    { id: 'sent', name: 'Sent', count: messages.filter(m => m.subject.startsWith('[SENT]')).length, icon: <Send size={16} /> },
    { id: 'archive', name: 'Archive', count: 0, icon: <Archive size={16} /> },
    { id: 'trash', name: 'Trash', count: 0, icon: <Trash2 size={16} /> }
  ];

  // Filter messages based on selected folder
  const filteredMessages = messages.filter(message => {
    let matchesFolder = false;
    
    switch (selectedFolder) {
      case 'inbox':
        matchesFolder = !message.subject.startsWith('[SENT]'); // Show only received emails
        break;
      case 'sent':
        matchesFolder = message.subject.startsWith('[SENT]'); // Show only sent emails
        break;
      default:
        matchesFolder = message.folder === selectedFolder;
    }
    
    const matchesSearch = searchTerm === '' || 
      message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.fromName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.body.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFolder && matchesSearch;
  });

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === filteredMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(filteredMessages.map(m => m.id));
    }
  };

  const handleMarkAsRead = (messageIds: string[], isRead: boolean) => {
    setMessages(prev => 
      prev.map(message => 
        messageIds.includes(message.id) 
          ? { ...message, isRead }
          : message
      )
    );
  };

  const handleStar = (messageIds: string[], isStarred: boolean) => {
    setMessages(prev => 
      prev.map(message => 
        messageIds.includes(message.id) 
          ? { ...message, isStarred }
          : message
      )
    );
  };

  const handleArchive = (messageIds: string[]) => {
    setMessages(prev => 
      prev.map(message => 
        messageIds.includes(message.id) 
          ? { ...message, folder: 'archive' }
          : message
      )
    );
    setSelectedMessages([]);
  };

  const handleDelete = (messageIds: string[]) => {
    setMessages(prev => 
      prev.map(message => 
        messageIds.includes(message.id) 
          ? { ...message, folder: 'trash' }
          : message
      )
    );
    setSelectedMessages([]);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const renderEmailList = () => (
    <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
      {/* Email List Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={selectedMessages.length === filteredMessages.length && filteredMessages.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {selectedFolder} ({filteredMessages.length})
            </h2>
          </div>
          
          {selectedMessages.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleMarkAsRead(selectedMessages, true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Mark as read"
              >
                <MailOpen size={16} />
              </button>
              <button
                onClick={() => handleStar(selectedMessages, true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Star"
              >
                <Star size={16} />
              </button>
              <button
                onClick={() => handleArchive(selectedMessages)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Archive"
              >
                <Archive size={16} />
              </button>
              <button
                onClick={() => handleDelete(selectedMessages)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-md"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Email List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No messages match your search.' : 'Your inbox is empty.'}
            </p>
          </div>
        ) : (
          filteredMessages.map(message => (
            <div 
              key={message.id}
              className={`p-4 hover:bg-gray-50 cursor-pointer ${
                selectedMessages.includes(message.id) ? 'bg-blue-50' : ''
              } ${!message.isRead ? 'bg-blue-25' : ''}`}
              onClick={() => setCurrentMessage(message)}
            >
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedMessages.includes(message.id)}
                  onChange={() => handleMessageSelect(message.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStar([message.id], !message.isStarred);
                  }}
                  className={`${
                    message.isStarred ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'
                  }`}
                >
                  <Star size={16} fill={message.isStarred ? 'currentColor' : 'none'} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {message.fromName}
                      </span>
                      {message.isImportant && (
                        <Flag size={12} className="text-red-500" />
                      )}
                      {message.hasAttachments && (
                        <Paperclip size={12} className="text-gray-400" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  
                  <div className={`text-sm ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-600'} truncate`}>
                    {message.subject}
                  </div>
                  
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2 max-w-lg">
                    {message.body}
                  </div>

                  {message.labels.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      {message.labels.map(label => (
                        <span 
                          key={label}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderEmailDetail = () => {
    if (!currentMessage) return null;

    return (
      <div className="w-1/2 bg-white rounded-lg shadow ml-6">
        {/* Email Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentMessage(null)}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setReplyMode('reply');
                  setShowComposer(true);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Reply"
              >
                <Reply size={16} />
              </button>
              <button
                onClick={() => {
                  setReplyMode('forward');
                  setShowComposer(true);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Forward"
              >
                <Forward size={16} />
              </button>
              <button
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="More actions"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {currentMessage.subject}
            </h2>
            
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
              <div>
                <div className="font-medium">{currentMessage.fromName}</div>
                <div>{currentMessage.from}</div>
              </div>
              <div className="text-right">
                <div>{new Date(currentMessage.timestamp).toLocaleDateString()}</div>
                <div>{new Date(currentMessage.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          </div>

          <div className="prose max-w-full overflow-hidden">
            <p className="text-gray-700 whitespace-pre-wrap break-words max-w-full overflow-x-auto">
              {currentMessage.body}
            </p>
          </div>

          {currentMessage.hasAttachments && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Attachments</h4>
              <div className="flex items-center space-x-2">
                <Paperclip size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">attachment.pdf</span>
                <button className="text-blue-600 hover:text-blue-800">
                  <Download size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
              <RefreshCw size={16} />
              <span>Sync</span>
            </button>            <button 
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setShowComposer(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus size={16} />
              <span>Compose</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Main Content */}
        <div className="flex space-x-6">
          {/* Sidebar */}
          <div className="w-64 bg-white rounded-lg shadow p-4">
            <nav className="space-y-2">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md ${
                    selectedFolder === folder.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {folder.icon}
                    <span>{folder.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{folder.count}</span>
                </button>
              ))}
            </nav>



            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Unread</span>
                  <span className="font-medium">
                    {messages.filter(m => !m.isRead && m.folder === 'inbox').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Starred</span>
                  <span className="font-medium">
                    {messages.filter(m => m.isStarred).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Important</span>
                  <span className="font-medium">
                    {messages.filter(m => m.isImportant).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Email List and Detail */}
          <div className="flex-1 flex">
            {renderEmailList()}
            {currentMessage && renderEmailDetail()}
          </div>        </div>
      </div>

      {/* Inbox Settings Modal */}
      <InboxSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(settings) => {
          // console.log removed
          // Here you would save the settings to your backend
        }}
      />

      {/* Email Composer Modal */}
      {showComposer && (
        <SimpleEmailComposer
          isOpen={showComposer}
          onClose={() => {
            setShowComposer(false);
            setReplyMode(null);
          }}
          onSent={(data) => {
            // console.log removed
            setShowComposer(false);
            setReplyMode(null);
            // Refresh messages after sending
            fetchMessages();
          }}
        />
      )}
    </AdminLayout>
  );
};

export default AdminInboxPage;
