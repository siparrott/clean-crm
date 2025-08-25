import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdvancedPhotographyCalendar from '../../components/calendar/AdvancedPhotographyCalendar';
import GoogleCalendarIntegration from '../../components/calendar/GoogleCalendarIntegration';
import { Calendar, Camera, Clock, DollarSign, MapPin, TrendingUp, AlertTriangle, CheckCircle, Plus, Sun, Cloud, Star, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isAfter } from 'date-fns';

interface PhotographySession {
  id: string;
  title: string;
  description?: string;
  sessionType: string;
  status: string;
  startTime: string;
  endTime: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  attendees?: any[];
  locationName?: string;
  locationAddress?: string;
  locationCoordinates?: string;
  basePrice?: number;
  depositAmount?: number;
  depositPaid: boolean;
  finalPayment?: number;
  finalPaymentPaid: boolean;
  paymentStatus: string;
  equipmentList?: string[];
  crewMembers?: string[];
  conflictDetected: boolean;
  weatherDependent: boolean;
  goldenHourOptimized: boolean;
  backupPlan?: string;
  notes?: string;
  portfolioWorthy: boolean;
  editingStatus: string;
  deliveryStatus: string;
  deliveryDate?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  parentEventId?: string;
  googleCalendarEventId?: string;
  icalUid?: string;
  externalCalendarSync: boolean;
  reminderSettings?: any;
  reminderSent: boolean;
  confirmationSent: boolean;
  followUpSent: boolean;
  isOnlineBookable: boolean;
  bookingRequirements?: any;
  availabilityStatus: string;
  color?: string;
  priority: string;
  isPublic: boolean;
  category?: string;
  galleryId?: string;
  photographerId?: string;
  tags?: string[];
  customFields?: any;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalSessions: number;
  upcomingSessions: number;
  completedSessions: number;
  totalRevenue: number;
  pendingDeposits: number;
  equipmentConflicts: number;
}

const PhotographyCalendarPage: React.FC = () => {
  const [sessions, setSessions] = useState<PhotographySession[]>([]);
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<PhotographySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [newLeadsCount, setNewLeadsCount] = useState(8);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeView, setActiveView] = useState('calendar');
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sessionType: 'portrait',
    status: 'scheduled',
    startTime: '',
    endTime: '',
    clientName: '',
    clientEmail: '',
    locationName: '',
    basePrice: '',
    depositAmount: '',
    equipmentList: [] as string[],
    weatherDependent: false,
    goldenHourOptimized: false,
    portfolioWorthy: false
  });

  // Mock stats - will be replaced with real data
  const stats: DashboardStats = {
    totalSessions: 45,
    upcomingSessions: 12,
    completedSessions: 33,
    totalRevenue: 18750,
    pendingDeposits: 3,
    equipmentConflicts: 1
  };

  useEffect(() => {
    fetchSessions();
    fetchLeadsCount();
  }, []);

  const fetchLeadsCount = async () => {
    try {
      const response = await fetch('/api/crm/leads');
      if (response.ok) {
        const data = await response.json();
        setNewLeadsCount(data.length);
      }
    } catch (error) {
      // console.log removed
    }
  };

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/photography/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        // console.log removed
        setSessions([]);
      }
    } catch (error) {
      // console.log removed
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => 
      isSameDay(parseISO(session.startTime), date)
    );
  };

  const getSessionTypeColor = (sessionType: string) => {
    const colors = {
      'wedding': 'bg-pink-100 border-pink-300 text-pink-800',
      'portrait': 'bg-blue-100 border-blue-300 text-blue-800',
      'commercial': 'bg-green-100 border-green-300 text-green-800',
      'event': 'bg-purple-100 border-purple-300 text-purple-800',
      'family': 'bg-orange-100 border-orange-300 text-orange-800',
      'fashion': 'bg-indigo-100 border-indigo-300 text-indigo-800',
    };
    return colors[sessionType as keyof typeof colors] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'in-progress': return <Camera className="w-3 h-3 text-blue-600" />;
      case 'scheduled': return <Clock className="w-3 h-3 text-orange-600" />;
      case 'cancelled': return <AlertTriangle className="w-3 h-3 text-red-600" />;
      default: return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  const handleCreateSession = () => {
    setShowSessionForm(true);
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const sessionData = {
        ...formData,
        basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
        depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : undefined,
        equipmentList: formData.equipmentList.filter(item => item.trim() !== ''),
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : undefined,
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : undefined
      };

      const response = await fetch('/api/photography/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (response.ok) {
        setShowSessionForm(false);
        setFormData({
          title: '',
          description: '',
          sessionType: 'portrait',
          status: 'scheduled',
          startTime: '',
          endTime: '',
          clientName: '',
          clientEmail: '',
          locationName: '',
          basePrice: '',
          depositAmount: '',
          equipmentList: [],
          weatherDependent: false,
          goldenHourOptimized: false,
          portfolioWorthy: false
        });
        fetchSessions(); // Refresh the sessions list
      } else {
        alert('Failed to create session. Please try again.');
      }
    } catch (error) {
      // console.error removed
      alert('Error creating session. Please try again.');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addEquipmentItem = () => {
    const equipment = prompt('Enter equipment item:');
    if (equipment) {
      setFormData(prev => ({
        ...prev,
        equipmentList: [...prev.equipmentList, equipment]
      }));
    }
  };

  const removeEquipmentItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipmentList: prev.equipmentList.filter((_, i) => i !== index)
    }));
  };

  const handleSessionClick = (session: PhotographySession) => {
    setSelectedSession(session);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Photography Calendar</h1>
            <p className="text-gray-600 mt-1">
              Advanced photography session management system with equipment tracking and client workflow tools
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowGoogleCalendarModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              <Settings size={18} />
              <span>Calendar Sync</span>
            </button>
            <button 
              onClick={handleCreateSession}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              <Camera className="w-4 h-4" />
              <span>New Session</span>
            </button>
          </div>
        </div>

        {/* Key Business Metrics - Highlighted Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Business Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-purple-600">€{stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-gray-500 flex items-center mt-1">
                <span className="text-green-600 mr-1">↗ 8.2%</span>
                vs last month
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">New Leads</span>
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{newLeadsCount}</div>
              <p className="text-xs text-gray-500 flex items-center mt-1">
                <span className="text-green-600 mr-1">↗ 12.5%</span>
                this week
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Upcoming Bookings</span>
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.upcomingSessions}</div>
              <p className="text-xs text-gray-500 flex items-center mt-1">
                <span className="text-blue-600 mr-1">→ 0</span>
                next 30 days
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Conversion Rate</span>
                <CheckCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-orange-600">87.5%</div>
              <p className="text-xs text-gray-500 flex items-center mt-1">
                <span className="text-green-600 mr-1">↗ 3.2%</span>
                vs last month
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Sessions</span>
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-gray-500">All time</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Upcoming</span>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.upcomingSessions}</div>
            <p className="text-xs text-gray-500">Next 30 days</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completed</span>
              <CheckCircle className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.completedSessions}</div>
            <p className="text-xs text-gray-500">This month</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Revenue</span>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-gray-500">This month</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Pending Deposits</span>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.pendingDeposits}</div>
            <p className="text-xs text-gray-500">
              {stats.pendingDeposits > 0 ? 'Need attention' : 'All current'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Equipment Conflicts</span>
              <AlertTriangle className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.equipmentConflicts}</div>
            <p className="text-xs text-gray-500">
              {stats.equipmentConflicts > 0 ? 'Needs resolution' : 'All clear'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={handleCreateSession}
              className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50"
            >
              <Camera className="w-6 h-6" />
              <span className="text-sm">Schedule Session</span>
            </button>
            <button className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50">
              <MapPin className="w-6 h-6" />
              <span className="text-sm">Location Scouting</span>
            </button>
            <button className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50">
              <CheckCircle className="w-6 h-6" />
              <span className="text-sm">Equipment Check</span>
            </button>
            <button className="flex flex-col items-center space-y-2 p-4 border rounded-lg hover:bg-gray-50">
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm">Revenue Report</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">New Photography Calendar Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <Sun className="w-5 h-5 text-yellow-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Golden Hour Optimization</h4>
                <p className="text-sm text-gray-600">Automatically suggests optimal shooting times based on location and season</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Cloud className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Weather Integration</h4>
                <p className="text-sm text-gray-600">Real-time weather monitoring with automatic backup planning</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Camera className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Equipment Management</h4>
                <p className="text-sm text-gray-600">Smart conflict detection and rental coordination</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Star className="w-5 h-5 text-orange-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Portfolio Tracking</h4>
                <p className="text-sm text-gray-600">Identify portfolio gaps and high-value sessions</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">AI-Powered Analytics</h4>
                <p className="text-sm text-gray-600">Booking patterns and revenue forecasting insights</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">Workflow Automation</h4>
                <p className="text-sm text-gray-600">Post-shoot pipeline with editing and delivery tracking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Photography Calendar */}
        <AdvancedPhotographyCalendar 
          sessions={sessions}
          clients={[]} // CRM clients will be loaded from API
          onSessionClick={handleSessionClick}
          onCreateSession={handleCreateSession}
          onUpdateSession={() => {}} // Will be implemented
          onDeleteSession={() => {}} // Will be implemented
          onDuplicateSession={() => {}} // Will be implemented
          onExportCalendar={() => {}} // Will be implemented
          onImportCalendar={() => {}} // Will be implemented
          onSyncExternalCalendar={() => {}} // Will be implemented
        />

        {/* Session Legend */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Session Types & Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-pink-200 rounded border border-pink-300"></div>
              <span>Wedding</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-200 rounded border border-blue-300"></div>
              <span>Portrait</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-200 rounded border border-green-300"></div>
              <span>Commercial</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-200 rounded border border-purple-300"></div>
              <span>Event</span>
            </div>
            <div className="flex items-center space-x-2">
              <Sun className="w-3 h-3 text-yellow-600" />
              <span>Golden Hour</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cloud className="w-3 h-3 text-blue-600" />
              <span>Weather Dependent</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-3 h-3 text-purple-600" />
              <span>Portfolio Worthy</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>Completed</span>
            </div>
          </div>
        </div>

        {/* Session Form Modal */}
        {showSessionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-medium mb-4">Create New Photography Session</h3>
              
              <form onSubmit={handleSubmitSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Session Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Session Type</label>
                  <select
                    value={formData.sessionType}
                    onChange={(e) => handleInputChange('sessionType', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="wedding">Wedding</option>
                    <option value="commercial">Commercial</option>
                    <option value="event">Event</option>
                    <option value="family">Family</option>
                    <option value="fashion">Fashion</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Client Name</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.locationName}
                    onChange={(e) => handleInputChange('locationName', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Base Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => handleInputChange('basePrice', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deposit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.depositAmount}
                      onChange={(e) => handleInputChange('depositAmount', e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium">Equipment List</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.equipmentList.map((item, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeEquipmentItem(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addEquipmentItem}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Equipment
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.weatherDependent}
                      onChange={(e) => handleInputChange('weatherDependent', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Weather Dependent</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.goldenHourOptimized}
                      onChange={(e) => handleInputChange('goldenHourOptimized', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Golden Hour Optimized</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.portfolioWorthy}
                      onChange={(e) => handleInputChange('portfolioWorthy', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Portfolio Worthy</span>
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                  >
                    Create Session
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSessionForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Session Detail Modal */}
        {selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">{selectedSession.title}</h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Session Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className={`px-2 py-1 rounded text-xs ${getSessionTypeColor(selectedSession.sessionType)}`}>
                          {selectedSession.sessionType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(selectedSession.status)}
                          <span>{selectedSession.status}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start:</span>
                        <span>{format(parseISO(selectedSession.startTime), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">End:</span>
                        <span>{format(parseISO(selectedSession.endTime), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {selectedSession.clientName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Client:</span>
                          <span>{selectedSession.clientName}</span>
                        </div>
                      )}
                      {selectedSession.clientEmail && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span>{selectedSession.clientEmail}</span>
                        </div>
                      )}
                      {selectedSession.locationName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Location:</span>
                          <span>{selectedSession.locationName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedSession.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{selectedSession.description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(selectedSession.basePrice || selectedSession.depositAmount) && (
                    <div>
                      <h4 className="font-medium mb-2">Pricing</h4>
                      <div className="space-y-2 text-sm">
                        {selectedSession.basePrice && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Base Price:</span>
                            <span>${selectedSession.basePrice}</span>
                          </div>
                        )}
                        {selectedSession.depositAmount && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Deposit:</span>
                            <span>${selectedSession.depositAmount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedSession.equipmentList && selectedSession.equipmentList.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Equipment List</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedSession.equipmentList.map((equipment, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {equipment}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Special Features</h4>
                    <div className="space-y-1 text-sm">
                      {selectedSession.goldenHourOptimized && (
                        <div className="flex items-center space-x-2">
                          <Sun className="w-4 h-4 text-yellow-600" />
                          <span>Golden Hour Optimized</span>
                        </div>
                      )}
                      {selectedSession.weatherDependent && (
                        <div className="flex items-center space-x-2">
                          <Cloud className="w-4 h-4 text-blue-600" />
                          <span>Weather Dependent</span>
                        </div>
                      )}
                      {selectedSession.portfolioWorthy && (
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-purple-600" />
                          <span>Portfolio Worthy</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Edit functionality can be added later
                    // console.log removed
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Google Calendar Integration Modal */}
        <GoogleCalendarIntegration
          isOpen={showGoogleCalendarModal}
          onClose={() => setShowGoogleCalendarModal(false)}
          onConnectionSuccess={() => {
            // console.log removed
            // Refresh sessions to show synced events
            fetchSessions();
          }}
        />
      </div>
    </AdminLayout>
  );
};

export default PhotographyCalendarPage;