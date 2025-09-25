import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';
import {
  BookOpen,
  Settings,
  Database,
  Mail,
  Globe,
  Shield,
  Palette,
  Bell,
  Users,
  Key,
  DollarSign
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const settingsCategories = [
    {
      title: 'Knowledge & Documentation',
      description: 'Manage your knowledge base and documentation',
      items: [
        {
          icon: BookOpen,
          title: t('nav.knowledgeBase'),
          description: 'Access and manage your knowledge base articles',
          path: '/admin/knowledge-base',
          color: 'bg-blue-500'
        }
      ]
    },
    {
      title: 'System Configuration',
      description: 'Configure core system settings',
      items: [
        {
          icon: DollarSign,
          title: 'Price List Management',
          description: 'Manage price list items and import CSV files',
          path: '/admin/settings/price-list',
          color: 'bg-emerald-500'
        },
        {
          icon: Database,
          title: 'Database Settings',
          description: 'Manage database connections and migrations',
          path: '/admin/settings/database',
          color: 'bg-green-500'
        },
        {
          icon: Mail,
          title: 'Email & Lead Notifications',
          description: 'Configure SMTP settings and the lead notification email address',
          path: '/admin/settings/email',
          color: 'bg-red-500'
        },
        {
          icon: Globe,
          title: 'Website Settings',
          description: 'Manage website configuration and SEO',
          path: '/admin/settings/website',
          color: 'bg-purple-500'
        }
      ]
    },
    {
      title: 'Security & Access',
      description: 'Manage security settings and user access',
      items: [
        {
          icon: Shield,
          title: 'Security Settings',
          description: 'Configure authentication and security policies',
          path: '/admin/settings/security',
          color: 'bg-orange-500'
        },
        {
          icon: Users,
          title: 'User Management',
          description: 'Manage user accounts and permissions',
          path: '/admin/settings/users',
          color: 'bg-indigo-500'
        },
        {
          icon: Key,
          title: 'API Keys',
          description: 'Manage API keys and integrations',
          path: '/admin/settings/api-keys',
          color: 'bg-yellow-500'
        }
      ]
    },
    {
      title: 'Appearance & Notifications',
      description: 'Customize appearance and notification preferences',
      items: [
        {
          icon: Palette,
          title: 'Theme Settings',
          description: 'Customize colors, fonts, and layouts',
          path: '/admin/settings/theme',
          color: 'bg-pink-500'
        },
        {
          icon: Bell,
          title: 'Notifications',
          description: 'Configure notification preferences',
          path: '/admin/settings/notifications',
          color: 'bg-teal-500'
        }
      ]
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">
                Configure your CRM system settings and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Settings Categories */}
        <div className="space-y-8">
          {settingsCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {category.title}
                </h2>
                <p className="text-gray-600">
                  {category.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={itemIndex}
                      to={item.path}
                      className={`group p-4 rounded-lg border-2 transition-all duration-200 ${
                        isActive
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`${item.color} p-2 rounded-lg`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
              <Database className="h-6 w-6 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-blue-900">Test Database</p>
            </button>
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors">
              <Mail className="h-6 w-6 text-green-600 mb-2" />
              <p className="text-sm font-medium text-green-900">Test Email</p>
            </button>
            <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors">
              <Shield className="h-6 w-6 text-purple-600 mb-2" />
              <p className="text-sm font-medium text-purple-900">Security Check</p>
            </button>
            <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors">
              <Globe className="h-6 w-6 text-orange-600 mb-2" />
              <p className="text-sm font-medium text-orange-900">Clear Cache</p>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
