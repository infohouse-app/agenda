import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAppointmentSchema } from "@shared/schema";
import { ZodError } from "zod";

// Google Calendar API helpers
async function createGoogleCalendarEvent(appointment: any) {
  const config = await storage.getConfig();
  const googleConfig = config.googleCalendar;
  
  if (!googleConfig.enabled) {
    throw new Error("Google Calendar not configured");
  }
  
  const CALENDAR_ID = googleConfig.calendarId || "primary";
  let ACCESS_TOKEN = null;

  // Try OAuth first (preferred for production)
  if (googleConfig?.useOAuth && googleConfig?.clientId && googleConfig?.clientSecret) {
    try {
      const { GoogleOAuthService } = await import('./oauth-service');
      const oauthService = new GoogleOAuthService({
        clientId: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        redirectUri: 'http://localhost:5000/api/oauth/google/callback'
      });
      
      ACCESS_TOKEN = await oauthService.getValidAccessToken();
      console.log('Using OAuth token for Google Calendar (auto-renewable)');
    } catch (error) {
      console.error('OAuth token failed, falling back to manual token:', error);
    }
  }

  // Fallback to manual token
  if (!ACCESS_TOKEN && googleConfig?.accessToken) {
    ACCESS_TOKEN = googleConfig.accessToken;
    console.log('Using manual token for Google Calendar (expires in 1h)');
  }

  if (!ACCESS_TOKEN) {
    throw new Error("Google Calendar access token not available. Configure OAuth2 or manual token.");
  }

  // Create date in Brazil timezone (UTC-3)
  const startDateTime = new Date(`${appointment.date}T${appointment.time}:00-03:00`);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour appointment
  
  console.log("Creating Google Calendar event:", {
    originalTime: `${appointment.date}T${appointment.time}:00`,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    timezone: 'America/Sao_Paulo'
  });

  const event = {
    summary: `Agendamento - ${appointment.name}`,
    description: `
Paciente: ${appointment.name}
Telefone: ${appointment.phone}
${appointment.email ? `Email: ${appointment.email}` : ''}
${appointment.service ? `Serviço: ${appointment.service}` : ''}
${appointment.notes ? `Observações: ${appointment.notes}` : ''}
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

  // Create event using OAuth Access Token (only supported method)
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API error: ${error}`);
  }

  const createdEvent = await response.json() as { id: string };
  return createdEvent.id;
}

// Evolution API WhatsApp helpers
async function sendWhatsAppConfirmation(appointment: any) {
  const config = await storage.getConfig();
  const whatsappConfig = config.whatsapp;
  
  if (!whatsappConfig.enabled || !whatsappConfig.apiKey || !whatsappConfig.phoneId || !whatsappConfig.webhookUrl) {
    throw new Error("Evolution API not configured or disabled");
  }
  
  const EVOLUTION_API_URL = whatsappConfig.apiKey; // URL da Evolution API
  const INSTANCE_NAME = whatsappConfig.phoneId; // Nome da instância
  const API_KEY = whatsappConfig.webhookUrl; // API Key da Evolution

  const cleanPhone = appointment.phone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const message = `
🗓️ *Agendamento Confirmado!*

📅 Data: ${new Date(appointment.date).toLocaleDateString('pt-BR')}
🕐 Horário: ${appointment.time}
👤 Nome: ${appointment.name}
${appointment.service ? `🏥 Serviço: ${appointment.service}` : ''}

Seu agendamento foi confirmado com sucesso!

${appointment.notes ? `📝 Observações: ${appointment.notes}` : ''}

Para cancelar ou reagendar, entre em contato conosco.
  `.trim();

  const response = await fetch(
    `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }

  return await response.json();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get available time slots for a date
  app.get("/api/availability/:date", async (req, res) => {
    try {
      const { date } = req.params;
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      const appointments = await storage.getAppointmentsByDate(date);
      const bookedTimes = appointments.map(apt => apt.time);
      
      // Define available time slots (9:00 AM to 6:00 PM, 30-minute intervals)
      const allSlots = [];
      for (let hour = 9; hour < 18; hour++) {
        allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      
      // Filter out booked times
      const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
      
      // Check if the date is in the past
      const today = new Date().toISOString().split('T')[0];
      const isToday = date === today;
      const currentTime = new Date().getHours() * 100 + new Date().getMinutes();
      
      const filteredSlots = isToday 
        ? availableSlots.filter(slot => {
            const [hours, minutes] = slot.split(':').map(Number);
            const slotTime = hours * 100 + minutes;
            return slotTime > currentTime + 100; // At least 1 hour in advance
          })
        : availableSlots;

      res.json({ availableSlots: filteredSlots });
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new appointment
  app.post("/api/appointments", async (req, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      
      // Check if the time slot is still available
      const existingAppointments = await storage.getAppointmentsByDate(validatedData.date);
      const isTimeBooked = existingAppointments.some(apt => apt.time === validatedData.time);
      
      if (isTimeBooked) {
        return res.status(409).json({ message: "Este horário já foi reservado" });
      }

      // Create the appointment
      const appointment = await storage.createAppointment(validatedData);
      
      // Try to create Google Calendar event
      let googleEventId = null;
      try {
        googleEventId = await createGoogleCalendarEvent(appointment);
        await storage.updateAppointment(appointment.id, { googleEventId });
      } catch (error) {
        console.error("Google Calendar error:", error);
        // Continue without failing the appointment creation
      }

      // Try to send WhatsApp confirmation
      let whatsappSent = false;
      try {
        await sendWhatsAppConfirmation(appointment);
        whatsappSent = true;
        await storage.updateAppointment(appointment.id, { whatsappSent: true });
      } catch (error) {
        console.error("WhatsApp error:", error);
        // Continue without failing the appointment creation
      }

      res.status(201).json({
        ...appointment,
        googleEventId,
        whatsappSent,
        message: "Agendamento criado com sucesso!"
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: error.errors 
        });
      }
      
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get appointments for a date range (for calendar display)
  app.get("/api/appointments", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const appointments = await storage.getAppointmentsByDateRange(
        startDate as string, 
        endDate as string
      );
      
      res.json({ appointments });
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Configuration routes
  app.get("/api/config", async (req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/config", async (req, res) => {
    try {
      const config = await storage.updateConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Test Google Calendar connection
  app.post("/api/test-google", async (req, res) => {
    try {
      const { calendarId, accessToken } = req.body;
      
      console.log("Testing Google Calendar with:", {
        hasAccessToken: !!accessToken,
        calendarId: calendarId || 'primary'
      });
      
      if (!accessToken || !accessToken.trim()) {
        console.log("No access token provided");
        return res.status(400).json({ 
          success: false,
          message: "Access Token é obrigatório para Google Calendar" 
        });
      }

      // Test with calendar access using OAuth token
      const testUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId || 'primary'}`;
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Google API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        
        let errorMsg = "Erro de autenticação";
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            if (errorJson.error.code === 401) {
              if (errorJson.error.message.includes("Invalid Credentials")) {
                errorMsg = "Access Token inválido ou expirado. Gere um novo token no Google OAuth Playground e cole aqui.";
              } else {
                errorMsg = "Credenciais inválidas. Verifique se o Access Token está correto e não expirou.";
              }
            } else if (errorJson.error.code === 403) {
              errorMsg = "Acesso negado. Verifique se a API do Google Calendar está habilitada no seu projeto.";
            } else if (errorJson.error.code === 404) {
              errorMsg = "Calendar não encontrado. Verifique o ID do calendar ou use 'primary'.";
            } else {
              errorMsg = errorJson.error.message || `Erro ${errorJson.error.code}: ${errorJson.error.status}`;
            }
          }
        } catch (e) {
          errorMsg = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        
        return res.status(400).json({ 
          success: false, 
          message: errorMsg 
        });
      }

      const result = await response.json();
      res.json({ 
        success: true, 
        message: "Conexão com Google Calendar bem-sucedida",
        data: accessToken ? (result.summary || result.id) : `${result.items?.length || 0} calendars encontrados`,
        method: accessToken ? "OAuth Access Token" : "API Key"
      });
    } catch (error) {
      console.error("Google Calendar test error:", error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Erro ao conectar com Google Calendar" 
      });
    }
  });

  // Test Evolution API connection
  app.post("/api/test-whatsapp", async (req, res) => {
    try {
      const { apiKey, phoneId, webhookUrl } = req.body;
      
      if (!apiKey || !phoneId || !webhookUrl) {
        return res.status(400).json({ message: "URL da API, nome da instância e API key são obrigatórios" });
      }

      const EVOLUTION_API_URL = apiKey; // URL da Evolution API
      const INSTANCE_NAME = phoneId; // Nome da instância
      const API_KEY = webhookUrl; // API Key da Evolution

      // Test Evolution API by getting instance info
      const response = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': API_KEY,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        let errorMsg = "Erro ao conectar com Evolution API";
        
        if (response.status === 401) {
          errorMsg = "API Key inválida. Verifique suas credenciais.";
        } else if (response.status === 404) {
          errorMsg = "Instância não encontrada. Verifique o nome da instância.";
        } else if (response.status >= 500) {
          errorMsg = "Servidor Evolution API indisponível. Verifique se está online.";
        }
        
        throw new Error(errorMsg);
      }

      const instanceInfo = await response.json();
      res.json({ 
        success: true, 
        message: "Conexão com Evolution API bem-sucedida",
        instance: instanceInfo.instance?.instanceName || INSTANCE_NAME,
        status: instanceInfo.instance?.connectionStatus || "connected"
      });
    } catch (error) {
      console.error("Evolution API test error:", error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Erro ao conectar com Evolution API" 
      });
    }
  });

  // OAuth Google Calendar Routes
  app.post('/api/oauth/google/start', async (req: Request, res: Response) => {
    try {
      const { clientId, clientSecret } = req.body;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ 
          success: false, 
          message: 'Client ID e Client Secret são obrigatórios' 
        });
      }

      // Importar dinamicamente o OAuth service
      const { GoogleOAuthService } = await import('./oauth-service');
      
      const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/google/callback`;
      const oauthService = new GoogleOAuthService({
        clientId,
        clientSecret,
        redirectUri,
      });

      const authUrl = oauthService.getAuthorizationUrl();
      
      res.json({ success: true, authUrl });
    } catch (error) {
      console.error('Erro ao iniciar OAuth:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  });

  app.get('/api/oauth/google/callback', async (req: Request, res: Response) => {
    try {
      const { code, error } = req.query;
      
      if (error) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2 style="color: red;">Erro na Autorização</h2>
              <p>Erro: ${error}</p>
              <p>Você pode fechar esta aba e tentar novamente.</p>
            </body>
          </html>
        `);
      }

      if (!code) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2 style="color: red;">Código de Autorização Ausente</h2>
              <p>Você pode fechar esta aba e tentar novamente.</p>
            </body>
          </html>
        `);
      }

      // Obter configuração atual para pegar Client ID e Secret
      const config = await storage.getConfig();
      const googleConfig = config?.googleCalendar;
      
      if (!googleConfig?.clientId || !googleConfig?.clientSecret) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2 style="color: red;">Configuração Incompleta</h2>
              <p>Client ID ou Client Secret não configurados.</p>
            </body>
          </html>
        `);
      }

      const { GoogleOAuthService } = await import('./oauth-service');
      const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/google/callback`;
      const oauthService = new GoogleOAuthService({
        clientId: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        redirectUri,
      });

      // Trocar código por tokens
      const tokens = await oauthService.exchangeCodeForTokens(code as string);
      
      // Salvar tokens no banco
      await oauthService.saveTokens(tokens);

      res.send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: green;">✅ Autorização Concluída!</h2>
            <p>Google Calendar foi autorizado com sucesso.</p>
            <p>Os tokens serão renovados automaticamente.</p>
            <p><strong>Você pode fechar esta aba e retornar à aplicação.</strong></p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Erro no callback OAuth:', error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: red;">Erro no Servidor</h2>
            <p>Erro ao processar autorização: ${error}</p>
          </body>
        </html>
      `);
    }
  });

  app.get('/api/oauth/google/status', async (req: Request, res: Response) => {
    try {
      const { GoogleOAuthService } = await import('./oauth-service');
      
      // Criar instância temporária só para verificar status
      const oauthService = new GoogleOAuthService({
        clientId: 'temp',
        clientSecret: 'temp', 
        redirectUri: 'temp'
      });

      const hasToken = await oauthService.hasValidToken();
      const testResult = hasToken ? await oauthService.testConnection() : { success: false, message: 'Nenhum token encontrado' };

      res.json({
        authorized: hasToken,
        connection: testResult
      });
    } catch (error) {
      console.error('Erro ao verificar status OAuth:', error);
      res.status(500).json({ 
        authorized: false,
        connection: { success: false, message: 'Erro ao verificar status' }
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
