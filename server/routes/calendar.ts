import { Router } from 'express';
import { db } from '../db';
import { photography_sessions } from '../../shared/schema';
import { eq, desc, asc, and, gte, lte, like } from 'drizzle-orm';

const router = Router();

// GET /api/calendar/sessions - Retrieve calendar sessions with filters
router.get('/sessions', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      client_id, 
      session_type, 
      status,
      limit = '20'
    } = req.query;

    let query = db.select({
      id: photography_sessions.id,
      client_id: photography_sessions.client_id,
      session_type: photography_sessions.session_type,
      session_date: photography_sessions.session_date,
      duration_minutes: photography_sessions.duration_minutes,
      location: photography_sessions.location,
      notes: photography_sessions.notes,
      price: photography_sessions.price,
      deposit_required: photography_sessions.deposit_required,
      equipment_needed: photography_sessions.equipment_needed,
      status: photography_sessions.status,
      created_at: photography_sessions.created_at,
      updated_at: photography_sessions.updated_at
    }).from(photography_sessions);

    // Apply filters
    const conditions = [];
    
    if (start_date) {
      conditions.push(gte(photography_sessions.session_date, new Date(start_date as string)));
    }
    
    if (end_date) {
      conditions.push(lte(photography_sessions.session_date, new Date(end_date as string)));
    }
    
    if (client_id) {
      conditions.push(eq(photography_sessions.client_id, client_id as string));
    }
    
    if (session_type) {
      conditions.push(eq(photography_sessions.session_type, session_type as any));
    }
    
    if (status) {
      conditions.push(eq(photography_sessions.status, status as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const sessions = await query
      .orderBy(asc(photography_sessions.session_date))
      .limit(parseInt(limit as string));

    res.json(sessions);
  } catch (error) {
    console.error('Failed to fetch calendar sessions:', error);
    res.status(500).json({ error: 'Failed to fetch calendar sessions' });
  }
});

// POST /api/calendar/sessions - Create new photography session
router.post('/sessions', async (req, res) => {
  try {
    const {
      client_id,
      session_type,
      session_date,
      duration_minutes = 120,
      location,
      notes = '',
      price = 0,
      deposit_required = 0,
      equipment_needed = []
    } = req.body;

    // Validate required fields
    if (!client_id || !session_type || !session_date || !location) {
      return res.status(400).json({ 
        error: 'Missing required fields: client_id, session_type, session_date, location' 
      });
    }

    const sessionId = crypto.randomUUID();
    
    const [newSession] = await db.insert(photography_sessions).values({
      id: sessionId,
      client_id,
      session_type,
      session_date: new Date(session_date),
      duration_minutes,
      location,
      notes,
      price,
      deposit_required,
      equipment_needed: JSON.stringify(equipment_needed),
      status: 'CONFIRMED',
      created_at: new Date(),
      updated_at: new Date()
    }).returning();

    res.status(201).json(newSession);
  } catch (error) {
    console.error('Failed to create photography session:', error);
    res.status(500).json({ error: 'Failed to create photography session' });
  }
});

// PUT /api/calendar/sessions/:id - Update photography session
router.put('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Remove ID from update data
    delete updateData.id;
    
    // Convert session_date if provided
    if (updateData.session_date) {
      updateData.session_date = new Date(updateData.session_date);
    }
    
    // Convert equipment_needed to JSON string if provided
    if (updateData.equipment_needed && Array.isArray(updateData.equipment_needed)) {
      updateData.equipment_needed = JSON.stringify(updateData.equipment_needed);
    }
    
    // Set updated timestamp
    updateData.updated_at = new Date();

    const [updatedSession] = await db
      .update(photography_sessions)
      .set(updateData)
      .where(eq(photography_sessions.id, id))
      .returning();

    if (!updatedSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(updatedSession);
  } catch (error) {
    console.error('Failed to update photography session:', error);
    res.status(500).json({ error: 'Failed to update photography session' });
  }
});

// DELETE /api/calendar/sessions/:id - Cancel/Delete photography session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason, refund_amount = 0 } = req.body;

    const [cancelledSession] = await db
      .update(photography_sessions)
      .set({
        status: 'CANCELLED',
        cancellation_reason,
        refund_amount,
        updated_at: new Date()
      })
      .where(eq(photography_sessions.id, id))
      .returning();

    if (!cancelledSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ 
      message: 'Session cancelled successfully', 
      session: cancelledSession 
    });
  } catch (error) {
    console.error('Failed to cancel photography session:', error);
    res.status(500).json({ error: 'Failed to cancel photography session' });
  }
});

// GET /api/calendar/availability - Check calendar availability
router.get('/availability', async (req, res) => {
  try {
    const { date, duration_minutes = '120' } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Get existing sessions for the date
    const existingSessions = await db
      .select({
        session_date: photography_sessions.session_date,
        duration_minutes: photography_sessions.duration_minutes
      })
      .from(photography_sessions)
      .where(
        and(
          gte(photography_sessions.session_date, new Date(date as string)),
          lte(photography_sessions.session_date, new Date(`${date} 23:59:59`)),
          eq(photography_sessions.status, 'CONFIRMED')
        )
      )
      .orderBy(asc(photography_sessions.session_date));

    // Define working hours (9 AM to 6 PM)
    const workingHours = { start: 9, end: 18 };
    const requestedDuration = parseInt(duration_minutes as string);

    const availableSlots = [];
    const bookedSlots = existingSessions.map(session => {
      const sessionDate = new Date(session.session_date);
      return {
        start: sessionDate.getHours() + (sessionDate.getMinutes() / 60),
        end: sessionDate.getHours() + (sessionDate.getMinutes() / 60) + (session.duration_minutes / 60)
      };
    });

    // Check each hour slot
    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      const slotEnd = hour + (requestedDuration / 60);
      
      if (slotEnd <= workingHours.end) {
        const isAvailable = !bookedSlots.some(booked => 
          (hour < booked.end && slotEnd > booked.start)
        );

        if (isAvailable) {
          availableSlots.push({
            time: `${hour.toString().padStart(2, '0')}:00`,
            duration: `${requestedDuration} minutes`
          });
        }
      }
    }

    res.json({
      date,
      total_available_slots: availableSlots.length,
      available_slots: availableSlots,
      booked_sessions: existingSessions.length
    });
  } catch (error) {
    console.error('Failed to check calendar availability:', error);
    res.status(500).json({ error: 'Failed to check calendar availability' });
  }
});

export default router;