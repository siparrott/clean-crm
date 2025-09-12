import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Cloud, CreditCard, HardDrive, Users, Zap } from 'lucide-react';

const ProDigitalFilesPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Digital Files Storage</h1>
            <p className="text-gray-600">Cloud storage for photographers - subscription based service</p>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-gray-200">
            <div className="text-center">
              <HardDrive size={48} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Starter</h3>
              <p className="text-3xl font-bold text-gray-900 mb-2">€9.99<span className="text-sm font-normal">/month</span></p>
              <p className="text-gray-600 mb-4">Perfect for small studios</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />50 GB Storage</li>
              <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Up to 100 clients</li>
              <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Secure backup</li>
            </ul>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Get Started
            </button>
          </div>

          {/* Professional Plan */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Most Popular</span>
            </div>
            <div className="text-center">
              <HardDrive size={48} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Professional</h3>
              <p className="text-3xl font-bold text-gray-900 mb-2">€19.99<span className="text-sm font-normal">/month</span></p>
              <p className="text-gray-600 mb-4">For growing businesses</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />200 GB Storage</li>
              <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Up to 500 clients</li>
              <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Secure backup</li>
              <li className="flex items-center"><CreditCard size={16} className="text-green-500 mr-2" />Client galleries</li>
            </ul>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Get Started
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-lg shadow p-6 border-2 border-gray-200">
            <div className="text-center">
              <HardDrive size={48} className="mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <p className="text-3xl font-bold text-gray-900 mb-2">€39.99<span className="text-sm font-normal">/month</span></p>
              <p className="text-gray-600 mb-4">For large studios</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center"><Zap size={16} className="text-green-500 mr-2" />1 TB Storage</li>
              <li className="flex items-center"><Users size={16} className="text-green-500 mr-2" />Unlimited clients</li>
              <li className="flex items-center"><Cloud size={16} className="text-green-500 mr-2" />Priority backup</li>
              <li className="flex items-center"><CreditCard size={16} className="text-green-500 mr-2" />Advanced features</li>
            </ul>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              Get Started
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <Cloud size={32} className="mx-auto text-blue-500 mb-2" />
              <h3 className="font-semibold">Secure Storage</h3>
              <p className="text-sm text-gray-600">Your images stored safely in Neon cloud</p>
            </div>
            <div className="text-center p-4">
              <Users size={32} className="mx-auto text-green-500 mb-2" />
              <h3 className="font-semibold">Client Access</h3>
              <p className="text-sm text-gray-600">Clients can view and download their photos</p>
            </div>
            <div className="text-center p-4">
              <HardDrive size={32} className="mx-auto text-purple-500 mb-2" />
              <h3 className="font-semibold">Automatic Backup</h3>
              <p className="text-sm text-gray-600">Never lose your precious work</p>
            </div>
            <div className="text-center p-4">
              <CreditCard size={32} className="mx-auto text-orange-500 mb-2" />
              <h3 className="font-semibold">Pay per GB</h3>
              <p className="text-sm text-gray-600">Only pay for what you use</p>
            </div>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Coming Soon!</h3>
          <p className="text-blue-800">
            This subscription-based digital storage service is currently in development. 
            Your photography business will soon have access to secure, scalable cloud storage 
            with client gallery features, all powered by Neon database technology.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProDigitalFilesPage;