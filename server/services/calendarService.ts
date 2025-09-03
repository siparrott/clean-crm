/**
 * Studio Calendar Service
 * Handles appointment scheduling and Google Calendar integration
 */

import { db } from '../db';
import { studioAppointments, googleCalendarConfig, crmClients } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { google } from 'googleapis';

interface CreateAppointmentOptions {
  clientId: string;
  title: string;
  description?: string;
  appointmentType: 'consultation' | 'photoshoot' | 'delivery' | 'meeting';
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  notes?: string;
  reminderDateTime?: Date;
  syncToGoogle?: boolean;
}

interface UpdateAppointmentOptions {
  id: string;
  title?: string;
  description?: string;
  appointmentType?: 'consultation' | 'photoshoot' | 'delivery' | 'meeting';
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  startDateTime?: Date;
  endDateTime?: Date;
  location?: string;
  notes?: string;
  reminderDateTime?: Date;
  syncToGoogle?: boolean;
}

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

class StudioCalendarService {
  private static googleAuth: any = null;
  private static calendar: any = null;

  /**
   * Initialize Google Calendar integration
   */
  static async initializeGoogleCalendar(): Promise<boolean> {
    try {
      // Get Google Calendar configuration from database
      const configs = await db
        .select()
        .from(googleCalendarConfig)
        .where(eq(googleCalendarConfig.isActive, true))
        .limit(1);

      if (configs.length === 0) {
        console.log('📅 No Google Calendar configuration found');
        return false;
      }

      const config = configs[0];

      // Initialize Google Auth
      this.googleAuth = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        'urn:ietf:wg:oauth:2.0:oob' // For installed applications
      );

      if (config.accessToken && config.refreshToken) {
        this.googleAuth.setCredentials({
          access_token: config.accessToken,
          refresh_token: config.refreshToken,
        });

        this.calendar = google.calendar({ version: 'v3', auth: this.googleAuth });
        console.log('✅ Google Calendar integration initialized');
        return true;
      }

      console.log('⚠️ Google Calendar credentials incomplete');
      return false;

    } catch (error) {
      console.error('❌ Google Calendar initialization failed:', error);
      return false;
    }
  }

  /**
   * Create a new appointment
   */
  static async createAppointment(options: CreateAppointmentOptions): Promise<{
    success: boolean;
    appointmentId?: string;
    googleEventId?: string;
    error?: string;
  }> {
    try {
      // Get client information
      const client = await db
        .select()
        .from(crmClients)
        .where(eq(crmClients.id, options.clientId))
        .limit(1);

      if (client.length === 0) {
        throw new Error('Client not found');
      }

      const clientInfo = client[0];

      // Create appointment in database
      const newAppointment = await db
        .insert(studioAppointments)
        .values({
          clientId: options.clientId,
          title: options.title,
          description: options.description,
          appointmentType: options.appointmentType,
          startDateTime: options.startDateTime,
          endDateTime: options.endDateTime,
          location: options.location || 'Studio',
          notes: options.notes,
          reminderDateTime: options.reminderDateTime,
        })
        .returning();

      const appointment = newAppointment[0];
      let googleEventId: string | undefined;

      // Sync to Google Calendar if enabled
      if (options.syncToGoogle && this.calendar) {
        try {
          const googleEvent = await this.createGoogleCalendarEvent({
            summary: `${options.title} - ${clientInfo.firstName} ${clientInfo.lastName}`,
            description: options.description || `${options.appointmentType} with ${clientInfo.firstName} ${clientInfo.lastName}`,
            start: {
              dateTime: options.startDateTime.toISOString(),
              timeZone: 'Europe/Vienna',
            },
            end: {
              dateTime: options.endDateTime.toISOString(),
              timeZone: 'Europe/Vienna',
            },
            location: options.location || 'Studio',
            attendees: clientInfo.email ? [{
              email: clientInfo.email,
              displayName: `${clientInfo.firstName} ${clientInfo.lastName}`
            }] : undefined,
            reminders: {
              useDefault: false,
              overrides: options.reminderDateTime ? [{
                method: 'email',
                minutes: Math.round((options.startDateTime.getTime() - options.reminderDateTime.getTime()) / (1000 * 60))
              }] : undefined,
            },
          });

          if (googleEvent.id) {
            googleEventId = googleEvent.id;
            
            // Update appointment with Google Calendar event ID
            await db
              .update(studioAppointments)
              .set({ googleCalendarEventId: googleEventId })
              .where(eq(studioAppointments.id, appointment.id));
          }

        } catch (googleError) {
          console.error('⚠️ Failed to sync to Google Calendar:', googleError);
          // Don't fail the entire appointment creation if Google sync fails
        }
      }

      console.log(`✅ Appointment created: ${options.title} for ${clientInfo.firstName} ${clientInfo.lastName}`);

      return {
        success: true,
        appointmentId: appointment.id,
        googleEventId,
      };

    } catch (error) {
      console.error('❌ Failed to create appointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing appointment
   */
  static async updateAppointment(options: UpdateAppointmentOptions): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get existing appointment
      const existing = await db
        .select()
        .from(studioAppointments)
        .where(eq(studioAppointments.id, options.id))
        .limit(1);

      if (existing.length === 0) {
        throw new Error('Appointment not found');
      }

      const appointment = existing[0];

      // Update appointment in database
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (options.title !== undefined) updateData.title = options.title;
      if (options.description !== undefined) updateData.description = options.description;
      if (options.appointmentType !== undefined) updateData.appointmentType = options.appointmentType;
      if (options.status !== undefined) updateData.status = options.status;
      if (options.startDateTime !== undefined) updateData.startDateTime = options.startDateTime;
      if (options.endDateTime !== undefined) updateData.endDateTime = options.endDateTime;
      if (options.location !== undefined) updateData.location = options.location;
      if (options.notes !== undefined) updateData.notes = options.notes;
      if (options.reminderDateTime !== undefined) updateData.reminderDateTime = options.reminderDateTime;

      await db
        .update(studioAppointments)
        .set(updateData)
        .where(eq(studioAppointments.id, options.id));

      // Update Google Calendar event if it exists and sync is enabled
      if (options.syncToGoogle && appointment.googleCalendarEventId && this.calendar) {
        try {
          // Get client information for updated event
          const client = await db
            .select()
            .from(crmClients)
            .where(eq(crmClients.id, appointment.clientId))
            .limit(1);

          if (client.length > 0) {
            const clientInfo = client[0];

            await this.updateGoogleCalendarEvent(appointment.googleCalendarEventId, {
              summary: `${options.title || appointment.title} - ${clientInfo.firstName} ${clientInfo.lastName}`,
              description: options.description || appointment.description || `${options.appointmentType || appointment.appointmentType} with ${clientInfo.firstName} ${clientInfo.lastName}`,
              start: {
                dateTime: (options.startDateTime || appointment.startDateTime).toISOString(),
                timeZone: 'Europe/Vienna',
              },
              end: {
                dateTime: (options.endDateTime || appointment.endDateTime).toISOString(),
                timeZone: 'Europe/Vienna',
              },
              location: options.location || appointment.location,
            });
          }

        } catch (googleError) {
          console.error('⚠️ Failed to update Google Calendar event:', googleError);
        }
      }

      console.log(`✅ Appointment updated: ${options.id}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to update appointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get appointments for a date range
   */
  static async getAppointments(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const appointments = await db
        .select({
          id: studioAppointments.id,
          clientId: studioAppointments.clientId,
          title: studioAppointments.title,
          description: studioAppointments.description,
          appointmentType: studioAppointments.appointmentType,
          status: studioAppointments.status,
          startDateTime: studioAppointments.startDateTime,
          endDateTime: studioAppointments.endDateTime,
          location: studioAppointments.location,
          notes: studioAppointments.notes,
          reminderSent: studioAppointments.reminderSent,
          reminderDateTime: studioAppointments.reminderDateTime,
          googleCalendarEventId: studioAppointments.googleCalendarEventId,
          createdAt: studioAppointments.createdAt,
          // Client information
          clientName: crmClients.firstName,
          clientLastName: crmClients.lastName,
          clientEmail: crmClients.email,
          clientPhone: crmClients.phone,
        })
        .from(studioAppointments)
        .leftJoin(crmClients, eq(studioAppointments.clientId, crmClients.id))
        .where(
          and(
            gte(studioAppointments.startDateTime, startDate),
            lte(studioAppointments.startDateTime, endDate)
          )
        )
        .orderBy(studioAppointments.startDateTime);

      return appointments;

    } catch (error) {
      console.error('❌ Failed to get appointments:', error);
      return [];
    }
  }

  /**
   * Get appointments for a specific client
   */
  static async getClientAppointments(clientId: string): Promise<any[]> {
    try {
      const appointments = await db
        .select()
        .from(studioAppointments)
        .where(eq(studioAppointments.clientId, clientId))
        .orderBy(desc(studioAppointments.startDateTime));

      return appointments;

    } catch (error) {
      console.error('❌ Failed to get client appointments:', error);
      return [];
    }
  }

  /**
   * Delete an appointment
   */
  static async deleteAppointment(appointmentId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get appointment to check for Google Calendar event
      const appointment = await db
        .select()
        .from(studioAppointments)
        .where(eq(studioAppointments.id, appointmentId))
        .limit(1);

      if (appointment.length === 0) {
        throw new Error('Appointment not found');
      }

      // Delete from Google Calendar if event exists
      if (appointment[0].googleCalendarEventId && this.calendar) {
        try {
          await this.deleteGoogleCalendarEvent(appointment[0].googleCalendarEventId);
        } catch (googleError) {
          console.error('⚠️ Failed to delete Google Calendar event:', googleError);
        }
      }

      // Delete from database
      await db
        .delete(studioAppointments)
        .where(eq(studioAppointments.id, appointmentId));

      console.log(`✅ Appointment deleted: ${appointmentId}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to delete appointment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create Google Calendar event
   */
  private static async createGoogleCalendarEvent(event: GoogleCalendarEvent): Promise<any> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    return response.data;
  }

  /**
   * Update Google Calendar event
   */
  private static async updateGoogleCalendarEvent(eventId: string, event: Partial<GoogleCalendarEvent>): Promise<any> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    const response = await this.calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
    });

    return response.data;
  }

  /**
   * Delete Google Calendar event
   */
  private static async deleteGoogleCalendarEvent(eventId: string): Promise<void> {
    if (!this.calendar) {
      throw new Error('Google Calendar not initialized');
    }

    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  }
}

export default StudioCalendarService;
