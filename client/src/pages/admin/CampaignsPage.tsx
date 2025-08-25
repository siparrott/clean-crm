import React, { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { 
  Plus, 
  BarChart3, 
  Zap, 
  Mail, 
  Users, 
  TrendingUp,
  Settings,
  Brain,
  Sparkles,
  Target,
  Eye
} from 'lucide-react';
import AdvancedCampaignBuilder from '../../components/admin/AdvancedCampaignBuilder';
import EmailSequenceBuilder from '../../components/admin/EmailSequenceBuilder';
import EmailAnalyticsDashboard from '../../components/admin/EmailAnalyticsDashboard';
import { EmailCampaign } from '../../types/email-marketing';

type TabType = 'overview' | 'campaigns' | 'sequences' | 'analytics' | 'templates' | 'subscribers';

const AdvancedEmailMarketingHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setShowCampaignBuilder(true);
  };

  const handleSaveCampaign = (campaign: EmailCampaign) => {
    // Handle campaign save
    // console.log removed
    setShowCampaignBuilder(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'campaigns', label: 'Campaigns', icon: Mail },
    { id: 'sequences', label: 'Sequences', icon: Zap },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'templates', label: 'Templates', icon: Sparkles },
    { id: 'subscribers', label: 'Subscribers', icon: Users }
  ];

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white">
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold mb-4">
            Advanced Email Marketing Suite
          </h1>
          <p className="text-xl mb-6 text-purple-100">
            Create, automate, and optimize email campaigns with AI-powered insights that exceed Mailchimp's capabilities.
          </p>
          <div className="flex space-x-4">
            <button
              onClick={handleCreateCampaign}
              className="flex items-center px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 font-medium"
            >
              <Plus size={20} className="mr-2" />
              Create Campaign
            </button>
            <button
              onClick={() => setActiveTab('sequences')}
              className="flex items-center px-6 py-3 border border-white/20 text-white rounded-lg hover:bg-white/10 font-medium"
            >
              <Zap size={20} className="mr-2" />
              Build Sequence
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain size={24} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 ml-4">AI-Powered Optimization</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Advanced AI analyzes your campaigns and provides actionable insights to improve performance.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Smart subject line generation</li>
            <li>• Send time optimization</li>
            <li>• Engagement predictions</li>
            <li>• Content recommendations</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target size={24} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 ml-4">Advanced Segmentation</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Create sophisticated audience segments with behavioral triggers and custom conditions.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Dynamic segment creation</li>
            <li>• Behavioral targeting</li>
            <li>• Custom field filtering</li>
            <li>• Real-time updates</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Zap size={24} className="text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 ml-4">Automation Workflows</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Build complex email sequences with conditional logic and multi-path journeys.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Multi-step sequences</li>
            <li>• Conditional branching</li>
            <li>• Trigger-based automation</li>
            <li>• Performance tracking</li>
          </ul>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">24</div>
              <div className="text-sm text-gray-500">Active Campaigns</div>
            </div>
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp size={16} className="mr-1" />
            <span>+12% from last month</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">8.7K</div>
              <div className="text-sm text-gray-500">Subscribers</div>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp size={16} className="mr-1" />
            <span>+8% from last month</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">32.4%</div>
              <div className="text-sm text-gray-500">Avg. Open Rate</div>
            </div>
            <Eye className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp size={16} className="mr-1" />
            <span>+15% from last month</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">€12.3K</div>
              <div className="text-sm text-gray-500">Revenue Generated</div>
            </div>
            <TrendingUp className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <TrendingUp size={16} className="mr-1" />
            <span>+23% from last month</span>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Recent Campaigns</h3>
          <button
            onClick={() => setActiveTab('campaigns')}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            View all campaigns →
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Click Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { name: 'Summer Photography Special', status: 'sent', recipients: 2847, openRate: 32.4, clickRate: 5.8 },
                { name: 'Wedding Season Newsletter', status: 'sending', recipients: 1923, openRate: 0, clickRate: 0 },
                { name: 'Family Portrait Promotion', status: 'draft', recipients: 0, openRate: 0, clickRate: 0 }
              ].map((campaign, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'sending' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.recipients > 0 ? campaign.recipients.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.openRate > 0 ? `${campaign.openRate}%` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.clickRate > 0 ? `${campaign.clickRate}%` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Eye size={16} />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800">
                        <Settings size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const CampaignsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Campaigns</h2>
          <p className="text-gray-600">Create and manage your email marketing campaigns</p>
        </div>
        <button
          onClick={handleCreateCampaign}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus size={16} className="mr-2" />
          Create Campaign
        </button>
      </div>

      {/* Campaign management interface would go here */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Campaign management interface</h3>
        <p className="text-gray-600 mb-6">Advanced campaign list with filtering, sorting, and bulk actions.</p>
        <button
          onClick={handleCreateCampaign}
          className="flex items-center mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus size={16} className="mr-2" />
          Create Your First Campaign
        </button>
      </div>
    </div>
  );

  const TemplatesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Templates</h2>
          <p className="text-gray-600">Professional templates for all your email marketing needs</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          <Plus size={16} className="mr-2" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[
          { name: 'Welcome Series', category: 'welcome', preview: '/api/placeholder/300/200' },
          { name: 'Newsletter', category: 'newsletter', preview: '/api/placeholder/300/200' },
          { name: 'Promotional', category: 'promotional', preview: '/api/placeholder/300/200' },
          { name: 'Event Invitation', category: 'event', preview: '/api/placeholder/300/200' },
          { name: 'Follow-up', category: 'follow_up', preview: '/api/placeholder/300/200' },
          { name: 'Abandoned Cart', category: 'cart', preview: '/api/placeholder/300/200' }
        ].map((template, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="aspect-video bg-gray-100 rounded mb-3 flex items-center justify-center">
              <Sparkles size={24} className="text-gray-400" />
            </div>
            <h4 className="font-medium text-gray-900">{template.name}</h4>
            <p className="text-sm text-gray-500 capitalize">{template.category}</p>
            <div className="mt-3 flex space-x-2">
              <button className="flex-1 text-xs py-2 px-3 bg-purple-600 text-white rounded hover:bg-purple-700">
                Use Template
              </button>
              <button className="text-xs py-2 px-3 border border-gray-300 rounded hover:bg-gray-50">
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SubscribersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscribers</h2>
          <p className="text-gray-600">Manage your email subscribers and segments</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Import Subscribers
          </button>
          <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Plus size={16} className="mr-2" />
            Add Subscriber
          </button>
        </div>
      </div>

      {/* Subscriber management interface would go here */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Subscriber management interface</h3>
        <p className="text-gray-600">Advanced subscriber list with segmentation, tagging, and bulk operations.</p>
      </div>
    </div>
  );

  if (showCampaignBuilder) {
    return (
      <AdminLayout>
        <AdvancedCampaignBuilder
          campaign={editingCampaign || undefined}
          onSave={handleSaveCampaign}
          onCancel={() => setShowCampaignBuilder(false)}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} className="mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'campaigns' && <CampaignsTab />}
        {activeTab === 'sequences' && <EmailSequenceBuilder />}
        {activeTab === 'analytics' && <EmailAnalyticsDashboard />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'subscribers' && <SubscribersTab />}      </div>
    </AdminLayout>
  );
};

export default AdvancedEmailMarketingHub;