import { import { 

  Survey,   Survey, 

  SurveyQuestion,   SurveyQuestion, 

  SurveyResponse,   SurveyResponse, 

  SurveyTemplate,   SurveyTemplate, 

  SurveyAnalytics,  SurveyAnalytics,

  SurveyListResponse,  SurveyListResponse,

  SurveyAnalyticsResponse,  SurveyAnalyticsResponse,

  QuestionType,  QuestionType,

  QuestionTypeDefinition,  QuestionTypeDefinition,

  SurveyExportOptions  SurveyExportOptions

} from '../types/survey';} from '../types/survey';



// Survey Management - API-based implementation// Survey Management - API-based implementation

export const surveyApi = {export const surveyApi = {

  // Get all surveys  // Get all surveys

  async getSurveys(): Promise<Survey[]> {  async getSurveys(): Promise<Survey[]> {

    try {    try {

      const response = await fetch('/api/surveys');      const response = await fetch('/api/surveys');

      if (!response.ok) {      if (!response.ok) {

        throw new Error(`Failed to fetch surveys: ${response.status}`);        throw new Error(`Failed to fetch surveys: ${response.status}`);

      }      }

      const data = await response.json();      const data = await response.json();

      return data;      return data;

    } catch (error) {    } catch (error) {

      console.error('Error fetching surveys:', error);      console.error('Error fetching surveys:', error);

      throw error;      throw error;

    }    }

  },  },



  // Get survey by ID  // Get survey by ID

  async getSurvey(id: string): Promise<Survey> {  async getSurvey(id: string): Promise<Survey> {

    try {    try {

      const response = await fetch(`/api/surveys/${id}`);      const response = await fetch(`/api/surveys/${id}`);

      if (!response.ok) {      if (!response.ok) {

        throw new Error(`Failed to fetch survey: ${response.status}`);        throw new Error(`Failed to fetch survey: ${response.status}`);

      }      }

      const data = await response.json();      const data = await response.json();

      return data.survey;      return data.survey;

    } catch (error) {    } catch (error) {

      console.error('Error fetching survey:', error);      console.error('Error fetching survey:', error);

      throw error;      throw error;

    }    }

  },  },



  // Create a new survey  // Create a new survey

  async createSurvey(survey: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>): Promise<Survey> {  async createSurvey(survey: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>): Promise<Survey> {

    try {    try {

      const response = await fetch('/api/surveys', {      const response = await fetch('/api/surveys', {

        method: 'POST',        method: 'POST',

        headers: {        headers: {

          'Content-Type': 'application/json',          'Content-Type': 'application/json',

        },        },

        body: JSON.stringify(survey),        body: JSON.stringify(survey),

      });      });

            

      if (!response.ok) {      if (!response.ok) {

        throw new Error(`Failed to create survey: ${response.status}`);        throw new Error(`Failed to create survey: ${response.status}`);

      }      }

            

      const result = await response.json();      const result = await response.json();

      return result.survey;      return result.survey;

    } catch (error) {    } catch (error) {

      console.error('Error creating survey:', error);      console.error('Error creating survey:', error);

      throw error;      throw error;

    }    }

  },  },



  // Update an existing survey  // Update an existing survey

  async updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey> {  async updateSurvey(id: string, updates: Partial<Survey>): Promise<Survey> {

    try {    try {

      const response = await fetch(`/api/surveys/${id}`, {      const response = await fetch(`/api/surveys/${id}`, {

        method: 'PUT',        method: 'PUT',

        headers: {        headers: {

          'Content-Type': 'application/json',          'Content-Type': 'application/json',

        },        },

        body: JSON.stringify(updates),        body: JSON.stringify(updates),

      });      });

            

      if (!response.ok) {      if (!response.ok) {

        throw new Error(`Failed to update survey: ${response.status}`);        throw new Error(`Failed to update survey: ${response.status}`);

      }      }

            

      const result = await response.json();      const result = await response.json();

      return result.survey;      return result.survey;

    } catch (error) {    } catch (error) {

      console.error('Error updating survey:', error);      console.error('Error updating survey:', error);

      throw error;      throw error;

    }    }

  },  },



  // Delete a survey  // Delete a survey

  async deleteSurvey(id: string): Promise<void> {  async deleteSurvey(id: string): Promise<void> {

    try {    try {

      const response = await fetch(`/api/surveys/${id}`, {      const response = await fetch(`/api/surveys/${id}`, {

        method: 'DELETE',        method: 'DELETE',

      });      });

            

      if (!response.ok) {      if (!response.ok) {

        throw new Error(`Failed to delete survey: ${response.status}`);        throw new Error(`Failed to delete survey: ${response.status}`);

      }      }

    } catch (error) {    } catch (error) {

      console.error('Error deleting survey:', error);      console.error('Error deleting survey:', error);

      throw error;      throw error;

    }    }

  },  },



  // Duplicate a survey  // Duplicate a survey

  async duplicateSurvey(id: string): Promise<Survey> {  async duplicateSurvey(id: string): Promise<Survey> {

    try {    try {

      const response = await fetch(`/api/surveys/${id}/duplicate`, {      const response = await fetch(`/api/surveys/${id}/duplicate`, {

        method: 'POST',        method: 'POST',

      });      });

            

      if (!response.ok) {      if (!response.ok) {

        throw new Error(`Failed to duplicate survey: ${response.status}`);        throw new Error(`Failed to duplicate survey: ${response.status}`);

      }      }

            

      const result = await response.json();      const result = await response.json();

      return result.survey;      return result.survey;

    } catch (error) {    } catch (error) {

      console.error('Error duplicating survey:', error);      console.error('Error duplicating survey:', error);

      throw error;      throw error;

    }    }

  },  },



  // Publish survey  // Publish survey

  async publishSurvey(id: string): Promise<Survey> {  async publishSurvey(id: string): Promise<Survey> {

    return this.updateSurvey(id, { status: 'active' });    return this.updateSurvey(id, { status: 'active' });

  },  },



  // Pause survey  // Pause survey

  async pauseSurvey(id: string): Promise<Survey> {  async pauseSurvey(id: string): Promise<Survey> {

    return this.updateSurvey(id, { status: 'paused' });    return this.updateSurvey(id, { status: 'paused' });

  },  },



  // Archive survey  // Archive survey

  async archiveSurvey(id: string): Promise<Survey> {  async archiveSurvey(id: string): Promise<Survey> {

    return this.updateSurvey(id, { status: 'archived' });    return this.updateSurvey(id, { status: 'archived' });

  },  },



  // Get survey responses  // Get survey responses

  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {

    try {    try {

      const response = await fetch(`/api/surveys/${surveyId}/responses`);      const response = await fetch(`/api/surveys/${surveyId}/responses`);

      if (!response.ok) {      if (!response.ok) {

        throw new Error(`Failed to fetch responses: ${response.status}`);        throw new Error(`Failed to fetch responses: ${response.status}`);

      }      }

      const data = await response.json();      const data = await response.json();

      return data;      return data;

    } catch (error) {    } catch (error) {

      console.error('Error fetching survey responses:', error);      console.error('Error fetching survey responses:', error);

      throw error;      throw error;

    }    }

  },  },



  // Get survey analytics  // Get survey analytics

  async getSurveyAnalytics(surveyId: string): Promise<SurveyAnalytics> {  async getSurveyAnalytics(surveyId: string): Promise<SurveyAnalytics> {

    try {    try {

      const response = await fetch(`/api/surveys/${surveyId}/analytics`);      const response = await fetch(`/api/surveys/${surveyId}/analytics`);

      if (!response.ok) {      if (!response.ok) {

        throw new Error(`Failed to fetch analytics: ${response.status}`);        throw new Error(`Failed to fetch analytics: ${response.status}`);

      }      }

      const data = await response.json();      const data = await response.json();

      return data;      return data;

    } catch (error) {    } catch (error) {

      console.error('Error fetching survey analytics:', error);      console.error('Error fetching survey analytics:', error);

      throw error;      throw error;

    }    }

  }  }

};};
      delete (duplicate as any).createdAt;
      delete (duplicate as any).updatedAt;
      delete (duplicate as any).publishedAt;
      delete (duplicate as any).closedAt;

      return await this.createSurvey(duplicate);
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  // Publish survey
  async publishSurvey(id: string): Promise<Survey> {
    return this.updateSurvey(id, {
      status: 'active',
      publishedAt: new Date().toISOString()
    });
  },

  // Pause survey
  async pauseSurvey(id: string): Promise<Survey> {
    return this.updateSurvey(id, { status: 'paused' });
  },

  // Close survey
  async closeSurvey(id: string): Promise<Survey> {
    return this.updateSurvey(id, {
      status: 'closed',
      closedAt: new Date().toISOString()
    });
  }
};

// Question Management
export const questionApi = {
  // Get question types
  getQuestionTypes(): QuestionTypeDefinition[] {
    return [
      {
        type: 'multiple_choice',
        name: 'Multiple Choice',
        description: 'Choose one option from a list',
        icon: 'circle-dot',
        category: 'choice',
        hasOptions: true,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'checkboxes',
        name: 'Checkboxes',
        description: 'Choose multiple options from a list',
        icon: 'check-square',
        category: 'choice',
        hasOptions: true,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'dropdown',
        name: 'Dropdown',
        description: 'Choose one option from a dropdown list',
        icon: 'chevron-down',
        category: 'choice',
        hasOptions: true,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'text',
        name: 'Text',
        description: 'Single line text input',
        icon: 'type',
        category: 'text',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'email',
        name: 'Email',
        description: 'Email address input with validation',
        icon: 'mail',
        category: 'text',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'number',
        name: 'Number',
        description: 'Numeric input',
        icon: 'hash',
        category: 'text',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'date',
        name: 'Date',
        description: 'Date picker',
        icon: 'calendar',
        category: 'date',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      },
      {
        type: 'rating',
        name: 'Rating',
        description: 'Star rating or numeric scale',
        icon: 'star',
        category: 'scale',
        hasOptions: false,
        hasValidation: true,
        hasLogic: true
      }
    ];
  }
};

// Response Management
export const responseApi = {
  // Get survey responses
  async getResponses(surveyId: string, page = 1, limit = 50): Promise<{ responses: SurveyResponse[], total: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('survey_responses')
      .select('*', { count: 'exact' })
      .eq('survey_id', surveyId)
      .order('started_at', { ascending: false })
      .range(from, to);

    if (error) {
      // console.error removed
      throw error;
    }

    return {
      responses: (data || []).map(toCamelCase),
      total: count || 0
    };
  },

  // Submit response
  async submitResponse(response: Omit<SurveyResponse, 'id' | 'startedAt'>): Promise<SurveyResponse> {
    const responseData = toSnakeCase(response);
    responseData.started_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('survey_responses')
      .insert([responseData])
      .select()
      .single();

    if (error) {
      // console.error removed
      throw error;
    }

    return toCamelCase(data);
  }
};

// Analytics API
export const analyticsApi = {
  // Get survey analytics
  async getSurveyAnalytics(surveyId: string): Promise<SurveyAnalytics> {
    // Get basic stats from responses
    const { data: responses, error: responsesError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('survey_id', surveyId);

    if (responsesError) {
      // console.error removed
      throw responsesError;
    }

    const totalStarts = responses?.length || 0;
    const totalCompletes = responses?.filter(r => r.is_complete).length || 0;
    const completionRate = totalStarts > 0 ? (totalCompletes / totalStarts) * 100 : 0;

    // Get analytics events
    const { data: analytics, error: analyticsError } = await supabase
      .from('survey_analytics')
      .select('*')
      .eq('survey_id', surveyId);

    if (analyticsError) {
      // console.error removed
    }

    const totalViews = analytics?.filter(a => a.event_type === 'view').length || 0;

    return {
      totalViews,
      totalStarts,
      totalCompletes,
      completionRate,
      averageTime: 0, // Calculate from response data if needed
      dropOffPoints: [],
      responsesByDate: [],
      deviceBreakdown: { desktop: 0, tablet: 0, mobile: 0 },
      locationBreakdown: []
    };
  }
};

export default surveyApi;
