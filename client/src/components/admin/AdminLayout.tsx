import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  UserPlus,
  ShoppingCart,
  Users,
  Crown,
  Image,
  FileText,
  Calendar,
  FolderOpen,
  PenTool,
  Mail,
  Inbox,
  ClipboardList,
  BarChart3,
  Settings,
  Palette,
  Wand2,
  LogOut,
  Menu,
  X,
  Globe,
  User,
  ExternalLink,
  Bell,
  BookOpen,
  Bot,
  TestTube,
  Sparkles,
  Search
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [language, setLanguage] = useState('en');
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [unreadEmailsCount, setUnreadEmailsCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Fetch new leads count and unread emails count
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch new leads count (database uses lowercase status values)
        const leadsResponse = await fetch('/api/crm/leads?status=new');
        if (leadsResponse.ok) {
          const leads = await leadsResponse.json();
          setNewLeadsCount(leads.length);
        }

        // Fetch unread emails count
        const emailsResponse = await fetch('/api/inbox/emails?unread=true');
        if (emailsResponse.ok) {
          const emails = await emailsResponse.json();
          setUnreadEmailsCount(emails.length);
        }
      } catch (error) {
        // console.error removed
      }
    };

    fetchCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: UserPlus, label: 'New Leads', path: '/admin/leads', badge: newLeadsCount },
    { icon: ShoppingCart, label: 'Online Voucher Sales', path: '/admin/voucher-sales' },
    { icon: Users, label: 'Clients', path: '/admin/clients' },
    { icon: Crown, label: 'Top Clients', path: '/admin/high-value-clients' },
    { icon: Image, label: 'Galleries', path: '/admin/galleries' },
    { icon: FileText, label: 'Invoices', path: '/admin/invoices' },
    { icon: Calendar, label: 'Calendar', path: '/admin/calendar' },
    { icon: FolderOpen, label: 'Digital Files', path: '/admin/pro-files' },
    { icon: PenTool, label: 'Blog', path: '/admin/blog' },
    { icon: Wand2, label: 'AI AutoBlog', path: '/admin/autoblog' },
    { icon: Mail, label: 'Email Campaigns', path: '/admin/campaigns' },
    { icon: Inbox, label: 'Inbox', path: '/admin/inbox', badge: unreadEmailsCount },
    { icon: ClipboardList, label: 'Questionnaires', path: '/admin/questionnaires' },
    { icon: BarChart3, label: 'Reports', path: '/admin/reports' },
    { icon: Bot, label: 'CRM Operations Assistant', path: '/admin/crm-assistant' },
    { icon: BookOpen, label: 'Knowledge Base', path: '/admin/knowledge-base' },
    { icon: TestTube, label: 'Test Chat', path: '/admin/test' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
    { icon: Palette, label: 'Customization', path: '/admin/customization' },
    { icon: Palette, label: 'Studio Templates', path: '/admin/studio-templates' },
    { icon: Wand2, label: 'Website Wizard', path: '/admin/website-wizard' },
    { icon: Search, label: 'Website Analyzer', path: '/admin/website-analyzer' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'de' : 'en');
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-gray-900 text-white transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } flex flex-col max-h-screen`}>        {/* Logo */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center">
            {!sidebarCollapsed ? (
              <div className="flex items-center">
                <img 
                  src="/crm-logo.png"
                  alt="TogNinja CRM"
                  className="h-16 w-auto mr-2"
                />
              </div>
            ) : (
              <img 
                src="/crm-logo.png"
                alt="TogNinja CRM"
                className="h-16 w-auto mx-auto"
              />
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="ml-auto p-1 rounded hover:bg-gray-700"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* New Leads Notification Section */}
        {newLeadsCount > 0 && (
          <div className="mx-4 mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-sm">
              <Bell size={16} className="text-blue-600 mr-2 flex-shrink-0" />
              {!sidebarCollapsed && (
                <div>
                  <p className="text-blue-900 font-medium">
                    {newLeadsCount} unread leads waiting for your attention
                  </p>
                  <button
                    onClick={() => navigate('/admin/leads')}
                    className="text-blue-600 hover:text-blue-800 text-xs underline mt-1"
                  >
                    View all leads →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Emails Notification Section */}
        {unreadEmailsCount > 0 && (
          <div className="mx-4 mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-sm">
              <Mail size={16} className="text-green-600 mr-2 flex-shrink-0" />
              {!sidebarCollapsed && (
                <div>
                  <p className="text-green-900 font-medium">
                    {unreadEmailsCount} new emails received
                  </p>
                  <button
                    onClick={() => navigate('/admin/inbox')}
                    className="text-green-600 hover:text-green-800 text-xs underline mt-1"
                  >
                    View inbox →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation - Fixed scrolling */}
        <nav className="flex-1 py-4 overflow-y-auto max-h-full sidebar-scrollbar">
          <div className="space-y-1 pb-4">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                              (item.path === '/admin/blog' && location.pathname.startsWith('/admin/blog/'));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm transition-colors relative ${
                    isActive
                      ? 'bg-purple-600 text-white border-r-2 border-purple-400'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="ml-3">{item.label}</span>
                  )}
                  {item.badge && item.badge > 0 && (
                    <div className={`absolute ${sidebarCollapsed ? 'top-2 right-2' : 'top-3 right-4'} flex items-center justify-center`}>
                      {!sidebarCollapsed && <Bell size={14} className="mr-1 text-red-400" />}
                      <span className={`bg-red-500 text-white text-xs font-bold rounded-full ${
                        sidebarCollapsed ? 'h-4 w-4 text-xs' : 'h-5 w-5 text-xs'
                      } flex items-center justify-center`}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          
          {/* Frontend Link */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <ExternalLink size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="ml-3">View Website</span>
            )}
          </a>
        </nav>

        {/* Sign Out */}
        <div className="border-t border-gray-700 p-4">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded transition-colors"
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
              {sidebarItems.find(item => 
                item.path === location.pathname || 
                (item.path === '/admin/blog' && location.pathname.startsWith('/admin/blog/'))
              )?.label || 'Admin'}
            </h1>
            
            <div className="flex items-center space-x-4">
              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <Globe size={16} className="mr-1" />
                <span className="uppercase">{language}</span>
              </button>

              {/* View Website Button */}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <ExternalLink size={16} className="mr-1" />
                <span>View Website</span>
              </a>

              {/* User Avatar */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <span className="ml-2 text-sm text-gray-700">{user?.email}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;