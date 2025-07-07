var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  appointments: () => appointments,
  configurations: () => configurations,
  insertAppointmentSchema: () => insertAppointmentSchema,
  insertUserSchema: () => insertUserSchema,
  oauthTokens: () => oauthTokens,
  users: () => users
});
import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, appointments, configurations, oauthTokens, insertUserSchema, insertAppointmentSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      username: text("username").notNull().unique(),
      password: text("password").notNull()
    });
    appointments = pgTable("appointments", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      phone: text("phone").notNull(),
      email: text("email"),
      service: text("service"),
      notes: text("notes"),
      date: text("date").notNull(),
      // Format: YYYY-MM-DD
      time: text("time").notNull(),
      // Format: HH:MM
      status: text("status").notNull().default("confirmed"),
      // confirmed, cancelled
      googleEventId: text("google_event_id"),
      whatsappSent: boolean("whatsapp_sent").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    configurations = pgTable("configurations", {
      id: serial("id").primaryKey(),
      key: text("key").notNull().unique(),
      value: text("value").notNull(),
      // Encrypted JSON
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    oauthTokens = pgTable("oauth_tokens", {
      id: serial("id").primaryKey(),
      provider: text("provider").notNull(),
      // 'google_calendar'
      accessToken: text("access_token").notNull(),
      refreshToken: text("refresh_token").notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      scope: text("scope"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertUserSchema = createInsertSchema(users).pick({
      username: true,
      password: true
    });
    insertAppointmentSchema = createInsertSchema(appointments).pick({
      name: true,
      phone: true,
      email: true,
      service: true,
      notes: true,
      date: true,
      time: true
    }).extend({
      name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
      phone: z.string().min(10, "Telefone deve ter pelo menos 10 d\xEDgitos"),
      email: z.string().email("Email inv\xE1lido").optional().or(z.literal("")),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
      time: z.string().regex(/^\d{2}:\d{2}$/, "Hor\xE1rio deve estar no formato HH:MM")
    });
  }
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/oauth-service.ts
var oauth_service_exports = {};
__export(oauth_service_exports, {
  GoogleOAuthService: () => GoogleOAuthService
});
import { eq as eq2 } from "drizzle-orm";
var GoogleOAuthService;
var init_oauth_service = __esm({
  "server/oauth-service.ts"() {
    "use strict";
    init_db();
    init_schema();
    GoogleOAuthService = class {
      config;
      constructor(config) {
        this.config = config;
      }
      // Gerar URL de autorização
      getAuthorizationUrl() {
        const params = new URLSearchParams({
          client_id: this.config.clientId,
          redirect_uri: this.config.redirectUri,
          scope: "https://www.googleapis.com/auth/calendar",
          response_type: "code",
          access_type: "offline",
          // Para obter refresh_token
          prompt: "consent"
          // Força consentimento para garantir refresh_token
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      }
      // Trocar código de autorização por tokens
      async exchangeCodeForTokens(code) {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            redirect_uri: this.config.redirectUri,
            grant_type: "authorization_code",
            code
          })
        });
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`OAuth token exchange failed: ${error}`);
        }
        return await response.json();
      }
      // Atualizar token usando refresh_token
      async refreshAccessToken(refreshToken) {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token"
          })
        });
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Token refresh failed: ${error}`);
        }
        return await response.json();
      }
      // Salvar tokens no banco
      async saveTokens(tokens) {
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1e3);
        const [existingToken] = await db.select().from(oauthTokens).where(eq2(oauthTokens.provider, "google_calendar")).limit(1);
        if (existingToken) {
          await db.update(oauthTokens).set({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || existingToken.refreshToken,
            expiresAt,
            scope: tokens.scope,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq2(oauthTokens.id, existingToken.id));
        } else {
          await db.insert(oauthTokens).values({
            provider: "google_calendar",
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt,
            scope: tokens.scope
          });
        }
      }
      // Obter token válido (atualiza automaticamente se expirado)
      async getValidAccessToken() {
        try {
          const [tokenRecord] = await db.select().from(oauthTokens).where(eq2(oauthTokens.provider, "google_calendar")).limit(1);
          if (!tokenRecord) {
            return null;
          }
          const now = /* @__PURE__ */ new Date();
          const marginTime = new Date(tokenRecord.expiresAt.getTime() - 5 * 60 * 1e3);
          if (now < marginTime) {
            return tokenRecord.accessToken;
          }
          console.log("Token expirado, renovando...");
          const refreshedTokens = await this.refreshAccessToken(tokenRecord.refreshToken);
          await this.saveTokens(refreshedTokens);
          return refreshedTokens.access_token;
        } catch (error) {
          console.error("Erro ao obter token v\xE1lido:", error);
          return null;
        }
      }
      // Verificar se há token salvo
      async hasValidToken() {
        const token = await this.getValidAccessToken();
        return token !== null;
      }
      // Revogar token (logout)
      async revokeToken() {
        try {
          const [tokenRecord] = await db.select().from(oauthTokens).where(eq2(oauthTokens.provider, "google_calendar")).limit(1);
          if (tokenRecord) {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRecord.refreshToken}`, {
              method: "POST"
            });
            await db.delete(oauthTokens).where(eq2(oauthTokens.id, tokenRecord.id));
          }
        } catch (error) {
          console.error("Erro ao revogar token:", error);
        }
      }
      // Testar conexão com Google Calendar
      async testConnection() {
        try {
          const accessToken = await this.getValidAccessToken();
          if (!accessToken) {
            return {
              success: false,
              message: "Nenhum token de acesso dispon\xEDvel. Fa\xE7a a autoriza\xE7\xE3o primeiro."
            };
          }
          const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
            headers: {
              "Authorization": `Bearer ${accessToken}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            return {
              success: true,
              message: `Conex\xE3o bem-sucedida! ${data.items?.length || 0} calend\xE1rios encontrados.`
            };
          } else {
            const error = await response.text();
            return {
              success: false,
              message: `Erro na conex\xE3o: ${response.status} - ${error}`
            };
          }
        } catch (error) {
          return {
            success: false,
            message: `Erro inesperado: ${error}`
          };
        }
      }
    };
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
init_schema();
init_db();
import { eq, gte, lte, and } from "drizzle-orm";

// server/crypto.ts
import crypto from "crypto";
var ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-32-chars-long-please!";
var ALGORITHM = "aes-256-cbc";
function getKey() {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}
function encrypt(text2) {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text2, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    return text2;
  }
}
function decrypt(encryptedText) {
  try {
    if (!encryptedText.includes(":")) {
      return encryptedText;
    }
    const [ivHex, encrypted] = encryptedText.split(":");
    if (!ivHex || !encrypted || ivHex.length !== 32) {
      console.log("Invalid encrypted format, returning original text");
      return encryptedText;
    }
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return JSON.stringify({
      googleCalendar: {
        enabled: true,
        apiKey: "",
        calendarId: "primary",
        accessToken: ""
      },
      whatsapp: {
        enabled: true,
        apiKey: "",
        phoneId: "",
        webhookUrl: ""
      }
    });
  }
}

// server/storage.ts
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async createAppointment(insertAppointment) {
    const [appointment] = await db.insert(appointments).values({
      name: insertAppointment.name,
      phone: insertAppointment.phone,
      email: insertAppointment.email || null,
      service: insertAppointment.service || null,
      notes: insertAppointment.notes || null,
      date: insertAppointment.date,
      time: insertAppointment.time,
      status: "confirmed",
      googleEventId: null,
      whatsappSent: false
    }).returning();
    return appointment;
  }
  async getAppointment(id) {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || void 0;
  }
  async getAppointmentsByDate(date) {
    return await db.select().from(appointments).where(eq(appointments.date, date));
  }
  async getAppointmentsByDateRange(startDate, endDate) {
    return await db.select().from(appointments).where(
      and(
        gte(appointments.date, startDate),
        lte(appointments.date, endDate)
      )
    );
  }
  async updateAppointment(id, updates) {
    const [appointment] = await db.update(appointments).set(updates).where(eq(appointments.id, id)).returning();
    return appointment || void 0;
  }
  async deleteAppointment(id) {
    try {
      await db.delete(appointments).where(eq(appointments.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting appointment:", error);
      return false;
    }
  }
  async getConfig() {
    const defaultConfig = {
      googleCalendar: {
        enabled: true,
        apiKey: "",
        calendarId: "primary",
        accessToken: ""
      },
      whatsapp: {
        enabled: true,
        apiKey: "",
        phoneId: "",
        webhookUrl: ""
      }
    };
    try {
      const [config] = await db.select().from(configurations).where(eq(configurations.key, "app_config"));
      if (!config) {
        console.log("No config found, returning default");
        return defaultConfig;
      }
      const decryptedValue = decrypt(config.value);
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(decryptedValue);
      } catch (parseError) {
        console.error("Error parsing config JSON:", parseError);
        return defaultConfig;
      }
      return {
        googleCalendar: {
          ...defaultConfig.googleCalendar,
          ...parsedConfig.googleCalendar
        },
        whatsapp: {
          ...defaultConfig.whatsapp,
          ...parsedConfig.whatsapp
        }
      };
    } catch (error) {
      console.error("Error getting config:", error);
      return defaultConfig;
    }
  }
  async updateConfig(config) {
    try {
      const encryptedValue = encrypt(JSON.stringify(config));
      const [existingConfig] = await db.select().from(configurations).where(eq(configurations.key, "app_config"));
      if (existingConfig) {
        await db.update(configurations).set({
          value: encryptedValue,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(configurations.key, "app_config"));
      } else {
        await db.insert(configurations).values({
          key: "app_config",
          value: encryptedValue
        });
      }
      return config;
    } catch (error) {
      console.error("Error updating config:", error);
      throw error;
    }
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
init_schema();
import { ZodError } from "zod";
async function createGoogleCalendarEvent(appointment) {
  const config = await storage.getConfig();
  const googleConfig = config.googleCalendar;
  if (!googleConfig.enabled) {
    throw new Error("Google Calendar not configured");
  }
  const CALENDAR_ID = googleConfig.calendarId || "primary";
  let ACCESS_TOKEN = null;
  if (googleConfig?.useOAuth && googleConfig?.clientId && googleConfig?.clientSecret) {
    try {
      const { GoogleOAuthService: GoogleOAuthService2 } = await Promise.resolve().then(() => (init_oauth_service(), oauth_service_exports));
      const oauthService = new GoogleOAuthService2({
        clientId: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        redirectUri: "http://localhost:5000/api/oauth/google/callback"
      });
      ACCESS_TOKEN = await oauthService.getValidAccessToken();
      console.log("Using OAuth token for Google Calendar (auto-renewable)");
    } catch (error) {
      console.error("OAuth token failed, falling back to manual token:", error);
    }
  }
  if (!ACCESS_TOKEN && googleConfig?.accessToken) {
    ACCESS_TOKEN = googleConfig.accessToken;
    console.log("Using manual token for Google Calendar (expires in 1h)");
  }
  if (!ACCESS_TOKEN) {
    throw new Error("Google Calendar access token not available. Configure OAuth2 or manual token.");
  }
  const startDateTime = /* @__PURE__ */ new Date(`${appointment.date}T${appointment.time}:00-03:00`);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1e3);
  console.log("Creating Google Calendar event:", {
    originalTime: `${appointment.date}T${appointment.time}:00`,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    timezone: "America/Sao_Paulo"
  });
  const event = {
    summary: `Agendamento - ${appointment.name}`,
    description: `
Paciente: ${appointment.name}
Telefone: ${appointment.phone}
${appointment.email ? `Email: ${appointment.email}` : ""}
${appointment.service ? `Servi\xE7o: ${appointment.service}` : ""}
${appointment.notes ? `Observa\xE7\xF5es: ${appointment.notes}` : ""}
    `.trim(),
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: "America/Sao_Paulo"
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: "America/Sao_Paulo"
    },
    attendees: appointment.email ? [{ email: appointment.email }] : []
  };
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify(event)
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API error: ${error}`);
  }
  const createdEvent = await response.json();
  return createdEvent.id;
}
async function sendWhatsAppConfirmation(appointment) {
  const config = await storage.getConfig();
  const whatsappConfig = config.whatsapp;
  if (!whatsappConfig.enabled || !whatsappConfig.apiKey || !whatsappConfig.phoneId || !whatsappConfig.webhookUrl) {
    throw new Error("Evolution API not configured or disabled");
  }
  const EVOLUTION_API_URL = whatsappConfig.apiKey;
  const INSTANCE_NAME = whatsappConfig.phoneId;
  const API_KEY = whatsappConfig.webhookUrl;
  const cleanPhone = appointment.phone.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const message = `
\u{1F5D3}\uFE0F *Agendamento Confirmado!*

\u{1F4C5} Data: ${new Date(appointment.date).toLocaleDateString("pt-BR")}
\u{1F550} Hor\xE1rio: ${appointment.time}
\u{1F464} Nome: ${appointment.name}
${appointment.service ? `\u{1F3E5} Servi\xE7o: ${appointment.service}` : ""}

Seu agendamento foi confirmado com sucesso!

${appointment.notes ? `\u{1F4DD} Observa\xE7\xF5es: ${appointment.notes}` : ""}

Para cancelar ou reagendar, entre em contato conosco.
  `.trim();
  const response = await fetch(
    `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message
      })
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }
  return await response.json();
}
async function registerRoutes(app2) {
  app2.get("/api/availability/:date", async (req, res) => {
    try {
      const { date } = req.params;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }
      const appointments2 = await storage.getAppointmentsByDate(date);
      const bookedTimes = appointments2.map((apt) => apt.time);
      const allSlots = [];
      for (let hour = 9; hour < 18; hour++) {
        allSlots.push(`${hour.toString().padStart(2, "0")}:00`);
        allSlots.push(`${hour.toString().padStart(2, "0")}:30`);
      }
      const availableSlots = allSlots.filter((slot) => !bookedTimes.includes(slot));
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const isToday = date === today;
      const currentTime = (/* @__PURE__ */ new Date()).getHours() * 100 + (/* @__PURE__ */ new Date()).getMinutes();
      const filteredSlots = isToday ? availableSlots.filter((slot) => {
        const [hours, minutes] = slot.split(":").map(Number);
        const slotTime = hours * 100 + minutes;
        return slotTime > currentTime + 100;
      }) : availableSlots;
      res.json({ availableSlots: filteredSlots });
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/appointments", async (req, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      const existingAppointments = await storage.getAppointmentsByDate(validatedData.date);
      const isTimeBooked = existingAppointments.some((apt) => apt.time === validatedData.time);
      if (isTimeBooked) {
        return res.status(409).json({ message: "Este hor\xE1rio j\xE1 foi reservado" });
      }
      const appointment = await storage.createAppointment(validatedData);
      let googleEventId = null;
      try {
        googleEventId = await createGoogleCalendarEvent(appointment);
        await storage.updateAppointment(appointment.id, { googleEventId });
      } catch (error) {
        console.error("Google Calendar error:", error);
      }
      let whatsappSent = false;
      try {
        await sendWhatsAppConfirmation(appointment);
        whatsappSent = true;
        await storage.updateAppointment(appointment.id, { whatsappSent: true });
      } catch (error) {
        console.error("WhatsApp error:", error);
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
          message: "Dados inv\xE1lidos",
          errors: error.errors
        });
      }
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.get("/api/appointments", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      const appointments2 = await storage.getAppointmentsByDateRange(
        startDate,
        endDate
      );
      res.json({ appointments: appointments2 });
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/config", async (req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/config", async (req, res) => {
    try {
      const config = await storage.updateConfig(req.body);
      res.json(config);
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/test-google", async (req, res) => {
    try {
      const { calendarId, accessToken } = req.body;
      console.log("Testing Google Calendar with:", {
        hasAccessToken: !!accessToken,
        calendarId: calendarId || "primary"
      });
      if (!accessToken || !accessToken.trim()) {
        console.log("No access token provided");
        return res.status(400).json({
          success: false,
          message: "Access Token \xE9 obrigat\xF3rio para Google Calendar"
        });
      }
      const testUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId || "primary"}`;
      const response = await fetch(testUrl, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.log("Google API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        let errorMsg = "Erro de autentica\xE7\xE3o";
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            if (errorJson.error.code === 401) {
              if (errorJson.error.message.includes("Invalid Credentials")) {
                errorMsg = "Access Token inv\xE1lido ou expirado. Gere um novo token no Google OAuth Playground e cole aqui.";
              } else {
                errorMsg = "Credenciais inv\xE1lidas. Verifique se o Access Token est\xE1 correto e n\xE3o expirou.";
              }
            } else if (errorJson.error.code === 403) {
              errorMsg = "Acesso negado. Verifique se a API do Google Calendar est\xE1 habilitada no seu projeto.";
            } else if (errorJson.error.code === 404) {
              errorMsg = "Calendar n\xE3o encontrado. Verifique o ID do calendar ou use 'primary'.";
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
        message: "Conex\xE3o com Google Calendar bem-sucedida",
        data: accessToken ? result.summary || result.id : `${result.items?.length || 0} calendars encontrados`,
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
  app2.post("/api/test-whatsapp", async (req, res) => {
    try {
      const { apiKey, phoneId, webhookUrl } = req.body;
      if (!apiKey || !phoneId || !webhookUrl) {
        return res.status(400).json({ message: "URL da API, nome da inst\xE2ncia e API key s\xE3o obrigat\xF3rios" });
      }
      const EVOLUTION_API_URL = apiKey;
      const INSTANCE_NAME = phoneId;
      const API_KEY = webhookUrl;
      const response = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`,
        {
          headers: {
            "Content-Type": "application/json",
            "apikey": API_KEY
          }
        }
      );
      if (!response.ok) {
        const error = await response.text();
        let errorMsg = "Erro ao conectar com Evolution API";
        if (response.status === 401) {
          errorMsg = "API Key inv\xE1lida. Verifique suas credenciais.";
        } else if (response.status === 404) {
          errorMsg = "Inst\xE2ncia n\xE3o encontrada. Verifique o nome da inst\xE2ncia.";
        } else if (response.status >= 500) {
          errorMsg = "Servidor Evolution API indispon\xEDvel. Verifique se est\xE1 online.";
        }
        throw new Error(errorMsg);
      }
      const instanceInfo = await response.json();
      res.json({
        success: true,
        message: "Conex\xE3o com Evolution API bem-sucedida",
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
  app2.post("/api/oauth/google/start", async (req, res) => {
    try {
      const { clientId, clientSecret } = req.body;
      if (!clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          message: "Client ID e Client Secret s\xE3o obrigat\xF3rios"
        });
      }
      const { GoogleOAuthService: GoogleOAuthService2 } = await Promise.resolve().then(() => (init_oauth_service(), oauth_service_exports));
      const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/google/callback`;
      const oauthService = new GoogleOAuthService2({
        clientId,
        clientSecret,
        redirectUri
      });
      const authUrl = oauthService.getAuthorizationUrl();
      res.json({ success: true, authUrl });
    } catch (error) {
      console.error("Erro ao iniciar OAuth:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno do servidor"
      });
    }
  });
  app2.get("/api/oauth/google/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      if (error) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2 style="color: red;">Erro na Autoriza\xE7\xE3o</h2>
              <p>Erro: ${error}</p>
              <p>Voc\xEA pode fechar esta aba e tentar novamente.</p>
            </body>
          </html>
        `);
      }
      if (!code) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2 style="color: red;">C\xF3digo de Autoriza\xE7\xE3o Ausente</h2>
              <p>Voc\xEA pode fechar esta aba e tentar novamente.</p>
            </body>
          </html>
        `);
      }
      const config = await storage.getConfig();
      const googleConfig = config?.googleCalendar;
      if (!googleConfig?.clientId || !googleConfig?.clientSecret) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2 style="color: red;">Configura\xE7\xE3o Incompleta</h2>
              <p>Client ID ou Client Secret n\xE3o configurados.</p>
            </body>
          </html>
        `);
      }
      const { GoogleOAuthService: GoogleOAuthService2 } = await Promise.resolve().then(() => (init_oauth_service(), oauth_service_exports));
      const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/google/callback`;
      const oauthService = new GoogleOAuthService2({
        clientId: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        redirectUri
      });
      const tokens = await oauthService.exchangeCodeForTokens(code);
      await oauthService.saveTokens(tokens);
      res.send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: green;">\u2705 Autoriza\xE7\xE3o Conclu\xEDda!</h2>
            <p>Google Calendar foi autorizado com sucesso.</p>
            <p>Os tokens ser\xE3o renovados automaticamente.</p>
            <p><strong>Voc\xEA pode fechar esta aba e retornar \xE0 aplica\xE7\xE3o.</strong></p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Erro no callback OAuth:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2 style="color: red;">Erro no Servidor</h2>
            <p>Erro ao processar autoriza\xE7\xE3o: ${error}</p>
          </body>
        </html>
      `);
    }
  });
  app2.get("/api/oauth/google/status", async (req, res) => {
    try {
      const { GoogleOAuthService: GoogleOAuthService2 } = await Promise.resolve().then(() => (init_oauth_service(), oauth_service_exports));
      const oauthService = new GoogleOAuthService2({
        clientId: "temp",
        clientSecret: "temp",
        redirectUri: "temp"
      });
      const hasToken = await oauthService.hasValidToken();
      const testResult = hasToken ? await oauthService.testConnection() : { success: false, message: "Nenhum token encontrado" };
      res.json({
        authorized: hasToken,
        connection: testResult
      });
    } catch (error) {
      console.error("Erro ao verificar status OAuth:", error);
      res.status(500).json({
        authorized: false,
        connection: { success: false, message: "Erro ao verificar status" }
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
