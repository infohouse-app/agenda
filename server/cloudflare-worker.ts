/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  GOOGLE_CALENDAR_ACCESS_TOKEN?: string;
  EVOLUTION_API_URL?: string;
  EVOLUTION_API_KEY?: string;
  EVOLUTION_INSTANCE?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (url.pathname === '/api/health') {
        return handleHealth();
      }
      
      if (url.pathname.startsWith('/api/availability/')) {
        return handleAvailability(request, env);
      }
      
      if (url.pathname === '/api/appointments' && request.method === 'POST') {
        return handleCreateAppointment(request, env);
      }
      
      if (url.pathname === '/api/config') {
        if (request.method === 'GET') {
          return handleGetConfig(env);
        }
        if (request.method === 'POST') {
          return handleUpdateConfig(request, env);
        }
      }
      
      // 404 for unmatched routes
      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};

// Health check handler
function handleHealth(): Response {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Availability handler
async function handleAvailability(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const date = url.pathname.split('/').pop();
  
  if (!date) {
    return new Response(JSON.stringify({ error: 'Date required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get existing appointments for the date
    const stmt = env.DB.prepare(
      'SELECT time FROM appointments WHERE date = ?'
    );
    const results = await stmt.bind(date).all();
    
    // Generate available slots (9:00 to 17:00, 30-minute intervals)
    const allSlots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 17 && minute > 0) break; // Stop at 17:00
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allSlots.push(timeSlot);
      }
    }
    
    // Filter out booked slots
    const bookedTimes = results.results?.map((row: any) => row.time) || [];
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
    
    return new Response(JSON.stringify({ availableSlots }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch availability' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Create appointment handler
async function handleCreateAppointment(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as any;
    
    // Validate required fields
    if (!body.name || !body.phone || !body.date || !body.time) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Create appointment in database
    const stmt = env.DB.prepare(`
      INSERT INTO appointments (name, phone, email, service, notes, date, time, status, googleCalendarEventId, whatsappSent)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', '', false)
    `);
    
    const result = await stmt.bind(
      body.name,
      body.phone,
      body.email || '',
      body.service || '',
      body.notes || '',
      body.date,
      body.time
    ).run();
    
    const appointment = {
      id: result.meta.last_row_id,
      name: body.name,
      phone: body.phone,
      email: body.email || '',
      service: body.service || '',
      notes: body.notes || '',
      date: body.date,
      time: body.time,
      status: 'scheduled',
      googleCalendarEventId: '',
      whatsappSent: false,
    };
    
    // Google Calendar integration
    if (env.GOOGLE_CALENDAR_ACCESS_TOKEN) {
      try {
        await createGoogleCalendarEvent(appointment, env.GOOGLE_CALENDAR_ACCESS_TOKEN);
      } catch (error) {
        console.error('Google Calendar error:', error);
      }
    }
    
    // WhatsApp notification
    if (env.EVOLUTION_API_URL && env.EVOLUTION_API_KEY) {
      try {
        await sendWhatsAppConfirmation(appointment, env);
      } catch (error) {
        console.error('WhatsApp error:', error);
      }
    }
    
    return new Response(JSON.stringify(appointment), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return new Response(JSON.stringify({ error: 'Failed to create appointment' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Get config handler
async function handleGetConfig(env: Env): Promise<Response> {
  try {
    const stmt = env.DB.prepare('SELECT value FROM configurations WHERE key = ?');
    const result = await stmt.bind('app_config').first();
    
    let config = {
      googleCalendar: { enabled: false, calendarId: '', accessToken: '' },
      whatsapp: { enabled: false, apiUrl: '', apiKey: '', instance: '', webhookUrl: '' }
    };
    
    if (result) {
      config = JSON.parse(result.value as string);
    }
    
    return new Response(JSON.stringify(config), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Update config handler
async function handleUpdateConfig(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    
    // Check if config exists
    const checkStmt = env.DB.prepare('SELECT id FROM configurations WHERE key = ?');
    const existingConfig = await checkStmt.bind('app_config').first();
    
    if (existingConfig) {
      const updateStmt = env.DB.prepare(
        'UPDATE configurations SET value = ? WHERE key = ?'
      );
      await updateStmt.bind(JSON.stringify(body), 'app_config').run();
    } else {
      const insertStmt = env.DB.prepare(
        'INSERT INTO configurations (key, value) VALUES (?, ?)'
      );
      await insertStmt.bind('app_config', JSON.stringify(body)).run();
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return new Response(JSON.stringify({ error: 'Failed to update configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Google Calendar helper
async function createGoogleCalendarEvent(appointment: any, accessToken: string) {
  const startDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1);
  
  const event = {
    summary: `Agendamento - ${appointment.name}`,
    description: `
Serviço: ${appointment.service}
Cliente: ${appointment.name}
Telefone: ${appointment.phone}
Email: ${appointment.email}
Observações: ${appointment.notes}
    `.trim(),
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    attendees: appointment.email ? [{ email: appointment.email }] : [],
  };
  
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  
  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.status}`);
  }
  
  return await response.json();
}

// WhatsApp helper
async function sendWhatsAppConfirmation(appointment: any, env: Env) {
  const message = `
✅ *Agendamento Confirmado*

📅 *Data:* ${new Date(appointment.date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${appointment.time}
👤 *Cliente:* ${appointment.name}
📞 *Telefone:* ${appointment.phone}
📧 *Email:* ${appointment.email || 'Não informado'}
🔧 *Serviço:* ${appointment.service || 'Não especificado'}

📝 *Observações:* ${appointment.notes || 'Nenhuma observação'}

Obrigado por agendar conosco! 🙂
  `.trim();
  
  const evolutionUrl = `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE}`;
  
  const response = await fetch(evolutionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.EVOLUTION_API_KEY!,
    },
    body: JSON.stringify({
      number: appointment.phone.replace(/\D/g, ''),
      text: message,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Evolution API error: ${response.status}`);
  }
  
  return await response.json();
}