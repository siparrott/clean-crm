import React, { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isAfter, isBefore, startOfWeek, endOfWeek, eachHourOfInterval, startOfDay, addDays, startOfYear, endOfYear } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Plus, MapPin, Camera, Clock, DollarSign, AlertTriangle, CheckCircle, Star, Sun, Cloud, Users, Filter, Search, Download, Upload, RefreshCw, Settings, Eye, Edit, Trash2, Copy, ExternalLink } from 'lucide-react';

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

interface CrmClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  tags?: string[];
  notes?: string;
  source?: string;
  lifetime_value?: number;
}

interface CalendarProps {
  sessions: PhotographySession[];
  clients: CrmClient[];
  onSessionClick: (session: PhotographySession) => void;
  onCreateSession: (date?: Date) => void;
  onUpdateSession: (session: PhotographySession) => void;
  onDeleteSession: (sessionId: string) => void;
  onDuplicateSession: (session: PhotographySession) => void;
  onExportCalendar: () => void;
  onImportCalendar: (file: File) => void;
  onSyncExternalCalendar: () => void;
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda' | 'list';
type FilterType = 'all' | 'sessionType' | 'status' | 'client' | 'paymentStatus' | 'priority';

const AdvancedPhotographyCalendar: React.FC<CalendarProps> = ({
  sessions,
  clients,
  onSessionClick,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onDuplicateSession,
  onExportCalendar,
  onImportCalendar,
  onSyncExternalCalendar
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<CalendarView>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [draggedSession, setDraggedSession] = useState<PhotographySession | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search sessions
  const filteredSessions = sessions.filter(session => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = session.title.toLowerCase().includes(query) ||
                           session.clientName?.toLowerCase().includes(query) ||
                           session.locationName?.toLowerCase().includes(query) ||
                           session.sessionType.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType !== 'all' && filterValue) {
      switch (filterType) {
        case 'sessionType':
          if (session.sessionType !== filterValue) return false;
          break;
        case 'status':
          if (session.status !== filterValue) return false;
          break;
        case 'client':
          if (session.clientName !== filterValue) return false;
          break;
        case 'paymentStatus':
          if (session.paymentStatus !== filterValue) return false;
          break;
        case 'priority':
          if (session.priority !== filterValue) return false;
          break;
      }
    }

    return true;
  });

  // Get unique values for filters
  const sessionTypes = Array.from(new Set(sessions.map(s => s.sessionType)));
  const statuses = Array.from(new Set(sessions.map(s => s.status)));
  const clientNames = Array.from(new Set(sessions.map(s => s.clientName).filter(Boolean)));
  const paymentStatuses = Array.from(new Set(sessions.map(s => s.paymentStatus)));
  const priorities = Array.from(new Set(sessions.map(s => s.priority)));

  // Color coding for different session types
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

  // Status icons
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'in-progress': return <Camera className="w-3 h-3 text-blue-600" />;
      case 'scheduled': return <Clock className="w-3 h-3 text-orange-600" />;
      case 'cancelled': return <AlertTriangle className="w-3 h-3 text-red-600" />;
      default: return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  // Priority indicators
  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'urgent': return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      case 'high': return <div className="w-2 h-2 bg-orange-500 rounded-full"></div>;
      case 'medium': return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      case 'low': return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, session: PhotographySession) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (draggedSession) {
      const updatedSession = {
        ...draggedSession,
        startTime: format(targetDate, "yyyy-MM-dd'T'HH:mm:ss"),
        endTime: format(addDays(targetDate, 0), "yyyy-MM-dd'T'HH:mm:ss")
      };
      onUpdateSession(updatedSession);
      setDraggedSession(null);
    }
  };

  // Calendar view renderers
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center font-medium text-gray-700 bg-gray-50">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarDays.map(day => {
          const daysSessions = filteredSessions.filter(session => 
            isSameDay(parseISO(session.startTime), day)
          );
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] p-1 border border-gray-200 cursor-pointer transition-colors ${
                !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
              } ${isToday ? 'bg-blue-50' : ''} ${isSelected ? 'bg-blue-100' : ''} hover:bg-gray-50`}
              onClick={() => setSelectedDate(day)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
              onDoubleClick={() => onCreateSession(day)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm ${isToday ? 'font-bold text-blue-600' : ''}`}>
                  {format(day, 'd')}
                </span>
                {daysSessions.length > 3 && (
                  <span className="text-xs text-gray-500">+{daysSessions.length - 3}</span>
                )}
              </div>
              
              <div className="space-y-1">
                {daysSessions.slice(0, 3).map(session => (
                  <div
                    key={session.id}
                    className={`text-xs p-1 rounded border cursor-pointer ${getSessionTypeColor(session.sessionType)}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, session)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSessionClick(session);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1">{session.title}</span>
                      <div className="flex items-center space-x-1">
                        {getPriorityIndicator(session.priority)}
                        {getStatusIcon(session.status)}
                      </div>
                    </div>
                    {session.clientName && (
                      <div className="text-xs opacity-75 truncate">{session.clientName}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-8 gap-1 min-w-[800px]">
          {/* Time column */}
          <div className="col-span-1">
            <div className="h-12 border-b border-gray-200"></div>
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-100 p-1 text-xs text-gray-500">
                {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(day => {
            const daysSessions = filteredSessions.filter(session => 
              isSameDay(parseISO(session.startTime), day)
            );
            const isToday = isSameDay(day, new Date());

            return (
              <div key={day.toISOString()} className="col-span-1">
                <div className={`h-12 border-b border-gray-200 p-2 text-center ${isToday ? 'bg-blue-50' : ''}`}>
                  <div className="font-medium">{format(day, 'EEE')}</div>
                  <div className={`text-sm ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                <div className="relative">
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="h-16 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                      onDoubleClick={() => {
                        const sessionDate = new Date(day);
                        sessionDate.setHours(hour, 0, 0, 0);
                        onCreateSession(sessionDate);
                      }}
                    ></div>
                  ))}
                  
                  {/* Sessions overlay */}
                  {daysSessions.map(session => {
                    const startTime = parseISO(session.startTime);
                    const endTime = parseISO(session.endTime);
                    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                    
                    return (
                      <div
                        key={session.id}
                        className={`absolute left-1 right-1 rounded p-1 text-xs border cursor-pointer ${getSessionTypeColor(session.sessionType)}`}
                        style={{
                          top: `${startHour * 64}px`,
                          height: `${Math.max(duration * 64, 32)}px`,
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, session)}
                        onClick={() => onSessionClick(session)}
                      >
                        <div className="font-medium truncate">{session.title}</div>
                        <div className="opacity-75 truncate">{session.clientName}</div>
                        <div className="flex items-center space-x-1 mt-1">
                          {getPriorityIndicator(session.priority)}
                          {getStatusIcon(session.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const daysSessions = filteredSessions.filter(session => 
      isSameDay(parseISO(session.startTime), currentDate)
    );

    return (
      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-2 gap-4 min-w-[600px]">
          {/* Time slots */}
          <div>
            <div className="h-12 border-b border-gray-200 p-2 text-center bg-gray-50">
              <div className="font-medium">{format(currentDate, 'EEEE, MMMM d, yyyy')}</div>
            </div>
            
            <div className="relative">
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="h-16 border-b border-gray-100 p-2 cursor-pointer hover:bg-gray-50"
                  onDoubleClick={() => {
                    const sessionDate = new Date(currentDate);
                    sessionDate.setHours(hour, 0, 0, 0);
                    onCreateSession(sessionDate);
                  }}
                >
                  <div className="text-sm text-gray-500">
                    {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                  </div>
                </div>
              ))}
              
              {/* Sessions overlay */}
              {daysSessions.map(session => {
                const startTime = parseISO(session.startTime);
                const endTime = parseISO(session.endTime);
                const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                
                return (
                  <div
                    key={session.id}
                    className={`absolute left-2 right-2 rounded p-2 border cursor-pointer ${getSessionTypeColor(session.sessionType)}`}
                    style={{
                      top: `${startHour * 64}px`,
                      height: `${Math.max(duration * 64, 48)}px`,
                    }}
                    onClick={() => onSessionClick(session)}
                  >
                    <div className="font-medium">{session.title}</div>
                    <div className="text-sm opacity-75">{session.clientName}</div>
                    <div className="text-sm">{format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {getPriorityIndicator(session.priority)}
                      {getStatusIcon(session.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session details sidebar */}
          <div className="bg-gray-50 p-4">
            <h3 className="font-medium mb-4">Sessions Today</h3>
            <div className="space-y-3">
              {daysSessions.map(session => (
                <div key={session.id} className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{session.title}</span>
                    <div className="flex items-center space-x-2">
                      {getPriorityIndicator(session.priority)}
                      {getStatusIcon(session.status)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{session.clientName}</div>
                    <div>{format(parseISO(session.startTime), 'HH:mm')} - {format(parseISO(session.endTime), 'HH:mm')}</div>
                    {session.locationName && <div>📍 {session.locationName}</div>}
                    {session.paymentStatus !== 'fully_paid' && (
                      <div className="text-orange-600">💰 Payment: {session.paymentStatus}</div>
                    )}
                  </div>
                  <div className="flex space-x-2 mt-2">
                    <button 
                      onClick={() => onSessionClick(session)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => onUpdateSession(session)}
                      className="text-xs text-green-600 hover:text-green-800"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => onDuplicateSession(session)}
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const upcomingSessions = filteredSessions
      .filter(session => isAfter(parseISO(session.startTime), new Date()))
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
      .slice(0, 50);

    return (
      <div className="space-y-4">
        {upcomingSessions.map(session => {
          const startTime = parseISO(session.startTime);
          const endTime = parseISO(session.endTime);

          return (
            <div key={session.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getSessionTypeColor(session.sessionType)}`}>
                    {session.sessionType}
                  </div>
                  <h3 className="font-medium">{session.title}</h3>
                  <div className="flex items-center space-x-2">
                    {getPriorityIndicator(session.priority)}
                    {getStatusIcon(session.status)}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => onSessionClick(session)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onUpdateSession(session)}
                    className="p-1 text-green-600 hover:text-green-800"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDuplicateSession(session)}
                    className="p-1 text-purple-600 hover:text-purple-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDeleteSession(session.id)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className="w-4 h-4" />
                    <span>{format(startTime, 'MMM d, yyyy')}</span>
                  </div>
                  <div className="ml-6">
                    {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                  </div>
                </div>

                <div>
                  {session.clientName && (
                    <div className="flex items-center space-x-2 mb-1">
                      <Users className="w-4 h-4" />
                      <span>{session.clientName}</span>
                    </div>
                  )}
                  {session.locationName && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{session.locationName}</span>
                    </div>
                  )}
                </div>

                <div>
                  {session.basePrice && (
                    <div className="flex items-center space-x-2 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span>${session.basePrice} ({session.paymentStatus})</span>
                    </div>
                  )}
                  {session.equipmentList && session.equipmentList.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4" />
                      <span>{session.equipmentList.length} items</span>
                    </div>
                  )}
                </div>
              </div>

              {session.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                  {session.notes}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {session.weatherDependent && (
                    <div className="flex items-center space-x-1">
                      <Cloud className="w-3 h-3" />
                      <span>Weather dependent</span>
                    </div>
                  )}
                  {session.goldenHourOptimized && (
                    <div className="flex items-center space-x-1">
                      <Sun className="w-3 h-3" />
                      <span>Golden hour</span>
                    </div>
                  )}
                  {session.portfolioWorthy && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>Portfolio worthy</span>
                    </div>
                  )}
                  {session.externalCalendarSync && (
                    <div className="flex items-center space-x-1">
                      <ExternalLink className="w-3 h-3" />
                      <span>Synced</span>
                    </div>
                  )}
                </div>
                
                {session.conflictDetected && (
                  <div className="flex items-center space-x-1 text-red-600 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Conflict detected</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {upcomingSessions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No upcoming sessions found</p>
          </div>
        )}
      </div>
    );
  };

  const renderListView = () => {
    const groupedSessions = filteredSessions.reduce((groups, session) => {
      const date = format(parseISO(session.startTime), 'yyyy-MM-dd');
      if (!groups[date]) groups[date] = [];
      groups[date].push(session);
      return groups;
    }, {} as Record<string, PhotographySession[]>);

    const sortedDates = Object.keys(groupedSessions).sort();

    return (
      <div className="space-y-6">
        {sortedDates.map(date => (
          <div key={date} className="bg-white border rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium">{format(parseISO(date), 'EEEE, MMMM d, yyyy')}</h3>
            </div>
            <div className="divide-y">
              {groupedSessions[date].map(session => (
                <div key={session.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getSessionTypeColor(session.sessionType)}`}>
                        {session.sessionType}
                      </div>
                      <div>
                        <div className="font-medium">{session.title}</div>
                        <div className="text-sm text-gray-600">{session.clientName}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(parseISO(session.startTime), 'HH:mm')} - {format(parseISO(session.endTime), 'HH:mm')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getPriorityIndicator(session.priority)}
                        {getStatusIcon(session.status)}
                      </div>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => onSessionClick(session)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onUpdateSession(session)}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onDuplicateSession(session)}
                          className="p-1 text-purple-600 hover:text-purple-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header with controls */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-900">Photography Calendar</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 text-sm hover:bg-gray-100 rounded font-medium"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="text-lg font-medium">
              {format(currentDate, 'MMMM yyyy')}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Calendar sync */}
            <button
              onClick={onSyncExternalCalendar}
              className="flex items-center space-x-2 px-3 py-2 border rounded hover:bg-gray-50"
              title="Sync with external calendars"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Sync</span>
            </button>

            {/* Import/Export */}
            <button
              onClick={onExportCalendar}
              className="flex items-center space-x-2 px-3 py-2 border rounded hover:bg-gray-50"
              title="Export calendar"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
            
            <label className="flex items-center space-x-2 px-3 py-2 border rounded hover:bg-gray-50 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Import</span>
              <input
                type="file"
                accept=".ics,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onImportCalendar(e.target.files[0])}
              />
            </label>

            {/* Create session */}
            <button
              onClick={() => onCreateSession()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>New Session</span>
            </button>
          </div>
        </div>

        {/* View selector and filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* View selector */}
            <div className="flex border rounded">
              {(['month', 'week', 'day', 'agenda', 'list'] as CalendarView[]).map(viewType => (
                <button
                  key={viewType}
                  onClick={() => setView(viewType)}
                  className={`px-3 py-1 text-sm capitalize ${
                    view === viewType 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {viewType}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded-md w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 border rounded ${
                showFilters ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
            </button>
          </div>

          {/* Session count */}
          <div className="text-sm text-gray-600">
            {filteredSessions.length} of {sessions.length} sessions
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded border">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by</label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value as FilterType);
                    setFilterValue('');
                  }}
                  className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="sessionType">Session Type</option>
                  <option value="status">Status</option>
                  <option value="client">Client</option>
                  <option value="paymentStatus">Payment Status</option>
                  <option value="priority">Priority</option>
                </select>
              </div>

              {filterType !== 'all' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    {filterType === 'sessionType' && sessionTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    {filterType === 'status' && statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                    {filterType === 'client' && clientNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    {filterType === 'paymentStatus' && paymentStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                    {filterType === 'priority' && priorities.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterType('all');
                    setFilterValue('');
                    setSearchQuery('');
                  }}
                  className="px-3 py-2 border rounded text-sm hover:bg-gray-100"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar content */}
      <div className="p-4">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
        {view === 'agenda' && renderAgendaView()}
        {view === 'list' && renderListView()}
      </div>
    </div>
  );
};

export default AdvancedPhotographyCalendar;