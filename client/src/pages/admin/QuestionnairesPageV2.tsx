import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';

const QuestionnairesPageV2: React.FC = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  // Builder-specific state
  const [logoUrl, setLogoUrl] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  // Responses UI state
  const [responses, setResponses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [filterClientId, setFilterClientId] = useState('');
  const [filterQuestionnaireId, setFilterQuestionnaireId] = useState('');
  const [attachInputs, setAttachInputs] = useState<Record<string, string>>({});
  const [clientOptions, setClientOptions] = useState<Record<string, any[]>>({});
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [openSearchId, setOpenSearchId] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState<Record<string, number>>({});
  const searchTimeoutsRef = useRef<Record<string, any>>({});
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [searchLoading, setSearchLoading] = useState<Record<string, boolean>>({});

  const handleCreateQuestionnaireLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const template = selectedSurveyId || 'default-questionnaire';
      const response = await fetch('/api/admin/create-questionnaire-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: 'demo-client', questionnaire_id: template }),
      });

      if (!response.ok) throw new Error('Failed to create questionnaire link');

      const data = await response.json();
      navigator.clipboard.writeText(data.link);
      alert(`✅ Questionnaire link created and copied to clipboard!\n\nLink: ${data.link}\n\nYou can now send this to your client via WhatsApp or email.`);
    } catch (err) {
      console.error('Error creating questionnaire link:', err);
      setError('Failed to create questionnaire link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
      if (filterClientId.trim()) params.set('client_id', filterClientId.trim());
      if (filterQuestionnaireId.trim()) params.set('questionnaire_id', filterQuestionnaireId.trim());
      const res = await fetch(`/api/admin/questionnaire-responses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch responses');
      const data = await res.json();
      setResponses(data.responses || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching responses:', err);
      setError('Failed to fetch questionnaire responses.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async (responseId: string, explicitClientId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const clientId = (explicitClientId ?? attachInputs[responseId] ?? '').toString().trim();
      if (!clientId) { alert('Please enter a client identifier'); return; }
      const res = await fetch('/api/admin/attach-response-to-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_id: responseId, client_id: clientId })
      });
      if (!res.ok) throw new Error('Attach failed');
      await handleViewResponses();
    } catch (err) {
      console.error('Attach failed:', err);
      setError('Failed to attach response to client.');
    } finally {
      setLoading(false);
    }
  };

  const searchClients = async (responseId: string, q: string) => {
    try {
      if (!q || q.length < 2) { setClientOptions(prev => ({ ...prev, [responseId]: [] })); setSearchLoading(prev => ({ ...prev, [responseId]: false })); return; }
      const u = `/api/admin/clients/search?q=${encodeURIComponent(q)}&limit=8`;
      const res = await fetch(u);
      if (!res.ok) return;
      const data = await res.json();
      setClientOptions(prev => ({ ...prev, [responseId]: data.clients || [] }));
      setHighlightIdx(prev => ({ ...prev, [responseId]: (data.clients && data.clients.length > 0) ? 0 : -1 }));
    } catch {}
    finally {
      setSearchLoading(prev => ({ ...prev, [responseId]: false }));
    }
  };

  const debouncedSearch = (responseId: string, q: string, delay = 250) => {
    if (searchTimeoutsRef.current[responseId]) clearTimeout(searchTimeoutsRef.current[responseId]);
    setSearchLoading(prev => ({ ...prev, [responseId]: true }));
    searchTimeoutsRef.current[responseId] = setTimeout(() => {
      searchClients(responseId, q);
    }, delay);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const openId = openSearchId;
      if (!openId) return;
      const container = containerRefs.current[openId];
      if (container && e.target instanceof Node && !container.contains(e.target)) {
        setClientOptions(prev => ({ ...prev, [openId]: [] }));
        setOpenSearchId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openSearchId]);

  // Load available questionnaires (surveys)
  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/surveys');
      if (!res.ok) throw new Error('Failed to load surveys');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.surveys || []);
      setSurveys(list);
      if (list.length > 0 && !selectedSurveyId) setSelectedSurveyId(list[0].id);
    } catch (err) {
      console.error('Error loading surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  // Auto-load latest responses on initial mount
  useEffect(() => {
    handleViewResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddClick = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormTitle('New Questionnaire');
    setFormDescription('');
    setLogoUrl('');
    setQuestions(['']);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormTitle('');
    setFormDescription('');
    setLogoUrl('');
    setQuestions([]);
  };

  const handleSaveNew = async () => {
    try {
      setLoading(true);
      // Build survey payload with pages and settings
      const pages = [
        {
          id: 'page-1',
          title: formTitle,
          questions: questions.map((q, idx) => ({ id: `q${idx+1}`, type: 'text', title: q }))
        }
      ];

      const settings = { logo: logoUrl };
      const body = { title: formTitle, description: formDescription, pages, settings };
      const res = await fetch('/api/surveys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to create survey');
      const result = await res.json();
      const newSurvey = result.survey || result;
      setSurveys(prev => [newSurvey, ...prev]);
      handleCancel();
    } catch (err) {
      console.error('Error creating survey:', err);
      alert('Failed to create questionnaire.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (survey: any) => {
    setEditingId(survey.id);
    setIsAdding(false);
    setFormTitle(survey.title || '');
    setFormDescription(survey.description || '');
    // Load existing builder state if available
    try {
      const pages = survey.pages || (survey.survey && survey.survey.pages) || [];
      const first = pages[0] || { questions: [] };
      setQuestions((first.questions || []).map((qq: any) => qq.title || qq.text || ''));
    } catch (e) {
      setQuestions([]);
    }
    setLogoUrl((survey.settings && survey.settings.logo) || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      setLoading(true);
      const pages = [
        {
          id: 'page-1',
          title: formTitle,
          questions: questions.map((q, idx) => ({ id: `q${idx+1}`, type: 'text', title: q }))
        }
      ];
      const settings = { logo: logoUrl };
      const body = { title: formTitle, description: formDescription, pages, settings };
      const res = await fetch(`/api/surveys/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to update survey');
      const result = await res.json();
      const updated = result.survey || result;
      setSurveys(prev => prev.map(s => s.id === editingId ? { ...s, ...updated } : s));
      handleCancel();
    } catch (err) {
      console.error('Error updating survey:', err);
      alert('Failed to save questionnaire changes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm('Are you sure you want to delete this questionnaire?')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete survey');
      setSurveys(prev => prev.filter(s => s.id !== surveyId));
    } catch (err) {
      console.error('Error deleting survey:', err);
      alert('Failed to delete questionnaire.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Questionnaires</h1>
          <p className="mt-2 text-gray-600">Create and manage client surveys and questionnaires</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
              <div className="text-blue-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Create Questionnaire Link</h3>
              <p className="text-gray-500 mb-2">Select a questionnaire and generate a shareable link for clients</p>
              <div className="mb-3">
                <select value={selectedSurveyId || ''} onChange={e => setSelectedSurveyId(e.target.value)} className="border rounded px-2 py-1">
                  {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <button onClick={handleCreateQuestionnaireLink} disabled={loading || !selectedSurveyId} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Link'}
              </button>
            </div>

            <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors">
              <div className="text-purple-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">View Responses</h3>
              <p className="text-gray-500 mb-4">Check submitted questionnaire responses from clients</p>
              <button onClick={handleViewResponses} disabled={loading} className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                {loading ? 'Loading...' : 'View Responses'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">How to use questionnaires:</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Create Link:</strong> Click "Create Link" to generate a shareable questionnaire link</p>
            <p><strong>2. Share:</strong> Send the copied link to your client via WhatsApp, email, or SMS</p>
            <p><strong>3. Client Completes:</strong> Client clicks the link and fills out the questionnaire</p>
            <p><strong>4. View Responses:</strong> Click "View Responses" to see all submitted questionnaires</p>
            <p><strong>5. Email Notifications:</strong> You'll receive an email when a client submits a questionnaire</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Available Questionnaires:</h3>
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={handleAddClick} className="mr-2 inline-flex items-center px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Add Questionnaire</button>
              {(isAdding || editingId) && (
                <>
                  <button onClick={() => { if (editingId) { handleSaveEdit(); } else { handleSaveNew(); } }} disabled={loading} className="mr-2 inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700">{editingId ? 'Save' : 'Save'}</button>
                  <button onClick={handleCancel} className="inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
                </>
              )}
            </div>

            {(isAdding || editingId) && (
              <div className="p-4 bg-white border rounded">
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
                <label className="block text-sm font-medium text-gray-700 mt-3">Description</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" rows={3} />
                <label className="block text-sm font-medium text-gray-700 mt-3">Company Logo URL</label>
                <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="mt-1 block w-full border rounded px-2 py-1" />

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Questions</label>
                    <button onClick={() => setQuestions(prev => [...prev, ''])} className="inline-flex items-center px-2 py-1 bg-blue-500 text-white rounded text-sm">Add Question</button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {questions.map((q, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <textarea value={q} onChange={e => setQuestions(prev => prev.map((x,i) => i===idx?e.target.value:x))} className="flex-1 border rounded px-2 py-1" rows={2} />
                        <div className="flex flex-col space-y-2">
                          <button onClick={() => setQuestions(prev => prev.filter((_,i)=>i!==idx))} className="inline-flex items-center px-2 py-1 bg-red-500 text-white rounded text-sm">Remove</button>
                          <button onClick={() => setQuestions(prev => { const arr=[...prev]; arr.splice(idx,1,prev[idx]+' '); return arr; })} className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm">Duplicate</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {surveys.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-gray-500">{s.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleEditClick(s)} className="inline-flex items-center px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="inline-flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600">Delete</button>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{s.status || 'Active'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Responses filters */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Client Filter</label>
              <input value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)} placeholder="client_id or CRM id" className="mt-1 w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Questionnaire</label>
              <select value={filterQuestionnaireId} onChange={(e) => setFilterQuestionnaireId(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                <option value="">All</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>{s.title || s.id}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPage(1); handleViewResponses(); }} className="px-4 py-2 bg-indigo-600 text-white rounded">Apply</button>
              <button onClick={() => { setFilterClientId(''); setFilterQuestionnaireId(''); setPage(1); handleViewResponses(); }} className="px-4 py-2 bg-gray-200 rounded">Reset</button>
            </div>
          </div>
        </div>

        {/* Responses list */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Responses</h3>
            <div className="space-x-2">
              <button onClick={() => { if (page > 1) { setPage(page - 1); handleViewResponses(); } }} disabled={page === 1 || loading} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>
              <button onClick={() => { setPage(page + 1); handleViewResponses(); }} disabled={(page * pageSize) >= total || loading} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
            </div>
          </div>
          {responses.length === 0 ? (
            <p className="text-gray-500">No responses yet.</p>
          ) : (
            <div className="divide-y">
              {responses.map((r) => (
                <div key={r.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{r.client_name || 'Unknown Client'}</p>
                      <p className="text-sm text-gray-500">{new Date(r.submitted_at).toLocaleString()}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{r.questionnaire_title || 'Questionnaire'}</span>
                  </div>
                  {r.answers && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600">View answers</summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(r.answers, null, 2)}</pre>
                    </details>
                  )}
                  <div className="mt-3 flex gap-2 items-end">
                    <div className="flex-1 relative" ref={(el) => { containerRefs.current[r.id] = el; }}>
                      <label className="block text-xs text-gray-600">Attach to Client</label>
                      <input
                        className="mt-1 w-full border rounded px-3 py-1"
                        placeholder="Search name or email (Client will be linked by ID)"
                        value={attachInputs[r.id] ?? ''}
                        onChange={(e) => { const v = e.target.value; setAttachInputs(prev => ({ ...prev, [r.id]: v })); setOpenSearchId(r.id); debouncedSearch(r.id, v); }}
                        onFocus={() => { setOpenSearchId(r.id); const v = attachInputs[r.id] ?? (r.client_id || ''); if (v && v.length >= 2) debouncedSearch(r.id, v, 0); }}
                        onKeyDown={(e) => {
                          const opts = clientOptions[r.id] || [];
                          const idx = highlightIdx[r.id] ?? -1;
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (opts.length > 0) setHighlightIdx(prev => ({ ...prev, [r.id]: Math.min((idx < 0 ? 0 : idx + 1), opts.length - 1) }));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (opts.length > 0) setHighlightIdx(prev => ({ ...prev, [r.id]: Math.max((idx < 0 ? 0 : idx - 1), 0) }));
                          } else if (e.key === 'Enter') {
                            if (opts.length > 0 && idx >= 0) {
                              e.preventDefault();
                              const c = opts[idx];
                              setAttachInputs(prev => ({ ...prev, [r.id]: (c.client_id || c.id) }));
                              setClientOptions(prev => ({ ...prev, [r.id]: [] }));
                              setOpenSearchId(null);
                              // Auto-attach on Enter selection
                              handleAttach(r.id, (c.client_id || c.id));
                            }
                          } else if (e.key === 'Escape') {
                            setClientOptions(prev => ({ ...prev, [r.id]: [] }));
                            setOpenSearchId(null);
                          }
                        }}
                      />
                      {searchLoading[r.id] && (
                        <div className="absolute right-2 top-2.5 h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" aria-label="loading"></div>
                      )}
                      {(clientOptions[r.id]?.length ?? 0) > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-64 overflow-auto">
                          {clientOptions[r.id]!.map((c, i) => {
                            const active = (highlightIdx[r.id] ?? -1) === i;
                            return (
                              <button key={c.id}
                                type="button"
                                className={`w-full text-left px-3 py-2 ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                onMouseEnter={() => setHighlightIdx(prev => ({ ...prev, [r.id]: i }))}
                                onClick={() => { setAttachInputs(prev => ({ ...prev, [r.id]: ([c.first_name, c.last_name].filter(Boolean).join(' ') || c.client_id || c.id) })); setClientOptions(prev => ({ ...prev, [r.id]: [] })); setOpenSearchId(null); handleAttach(r.id, (c.client_id || c.id)); }}
                              >
                                <div className="text-sm font-medium">{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.client_id || c.id}</div>
                                <div className="text-xs text-gray-500">{c.email}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleAttach(r.id)} className="px-3 py-2 bg-green-600 text-white rounded" disabled={loading}>Attach</button>
                    <button onClick={() => setOpenDetailId(openDetailId === r.id ? null : r.id)} className="px-3 py-2 bg-gray-200 rounded">Details</button>
                  </div>
                  {openDetailId === r.id && (
                    <div className="mt-3 p-3 border rounded bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">Response ID:</span> {r.id}</div>
                        <div><span className="text-gray-500">Token:</span> {r.token}</div>
                        <div><span className="text-gray-500">Client ID:</span> {r.client_id || '-'}</div>
                        <div><span className="text-gray-500">Client Email:</span> {r.client_email || '-'}</div>
                        <div><span className="text-gray-500">Questionnaire:</span> {r.questionnaire_title || '-'}</div>
                        <div><span className="text-gray-500">Submitted:</span> {new Date(r.submitted_at).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                  {/* duplicate attach input removed; typeahead above handles attach */}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-sm text-gray-600">Page {page} • Total {total}</div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default QuestionnairesPageV2;
