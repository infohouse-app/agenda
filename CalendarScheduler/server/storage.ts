import { users, appointments, configurations, type User, type InsertUser, type Appointment, type InsertAppointment } from "@shared/schema";
import { db } from "./db";
import { eq, sql, gte, lte, and } from "drizzle-orm";
import { encrypt, decrypt } from "./crypto";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Appointment methods
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentsByDate(date: string): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]>;
  updateAppointment(id: number, updates: Partial<Appointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  
  // Configuration methods
  getConfig(): Promise<any>;
  updateConfig(config: any): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private appointments: Map<number, Appointment>;
  private currentUserId: number;
  private currentAppointmentId: number;
  private config: any;

  constructor() {
    this.users = new Map();
    this.appointments = new Map();
    this.currentUserId = 1;
    this.currentAppointmentId = 1;
    this.config = {
      googleCalendar: {
        enabled: true,
        apiKey: "",
        calendarId: "primary",
        accessToken: "",
      },
      whatsapp: {
        enabled: true,
        apiKey: "",
        phoneId: "",
        webhookUrl: "",
      },
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = this.currentAppointmentId++;
    const appointment: Appointment = {
      id,
      name: insertAppointment.name,
      phone: insertAppointment.phone,
      email: insertAppointment.email || null,
      service: insertAppointment.service || null,
      notes: insertAppointment.notes || null,
      date: insertAppointment.date,
      time: insertAppointment.time,
      status: "confirmed",
      googleEventId: null,
      whatsappSent: false,
      createdAt: new Date(),
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => appointment.date === date && appointment.status === "confirmed"
    );
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (appointment) => 
        appointment.date >= startDate && 
        appointment.date <= endDate && 
        appointment.status === "confirmed"
    );
  }

  async updateAppointment(id: number, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    if (!appointment) return undefined;
    
    const updatedAppointment = { ...appointment, ...updates };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointments.delete(id);
  }

  async getConfig(): Promise<any> {
    return this.config;
  }

  async updateConfig(config: any): Promise<any> {
    this.config = { ...this.config, ...config };
    return this.config;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db
      .insert(appointments)
      .values({
        name: insertAppointment.name,
        phone: insertAppointment.phone,
        email: insertAppointment.email || null,
        service: insertAppointment.service || null,
        notes: insertAppointment.notes || null,
        date: insertAppointment.date,
        time: insertAppointment.time,
        status: "confirmed",
        googleEventId: null,
        whatsappSent: false,
      })
      .returning();
    return appointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.date, date));
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.date, startDate),
          lte(appointments.date, endDate)
        )
      );
  }

  async updateAppointment(id: number, updates: Partial<Appointment>): Promise<Appointment | undefined> {
    const [appointment] = await db
      .update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    try {
      await db.delete(appointments).where(eq(appointments.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      return false;
    }
  }

  async getConfig(): Promise<any> {
    const defaultConfig = {
      googleCalendar: {
        enabled: true,
        apiKey: "",
        calendarId: "primary",
        accessToken: "",
      },
      whatsapp: {
        enabled: true,
        apiKey: "",
        phoneId: "",
        webhookUrl: "",
      },
    };

    try {
      const [config] = await db
        .select()
        .from(configurations)
        .where(eq(configurations.key, 'app_config'));
      
      if (!config) {
        console.log('No config found, returning default');
        return defaultConfig;
      }
      
      const decryptedValue = decrypt(config.value);
      
      // Try to parse the decrypted value
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(decryptedValue);
      } catch (parseError) {
        console.error('Error parsing config JSON:', parseError);
        return defaultConfig;
      }
      
      // Merge with default to ensure all fields exist
      return {
        googleCalendar: {
          ...defaultConfig.googleCalendar,
          ...parsedConfig.googleCalendar,
        },
        whatsapp: {
          ...defaultConfig.whatsapp,
          ...parsedConfig.whatsapp,
        },
      };
    } catch (error) {
      console.error('Error getting config:', error);
      return defaultConfig;
    }
  }

  async updateConfig(config: any): Promise<any> {
    try {
      const encryptedValue = encrypt(JSON.stringify(config));
      
      // Check if config exists
      const [existingConfig] = await db
        .select()
        .from(configurations)
        .where(eq(configurations.key, 'app_config'));
      
      if (existingConfig) {
        // Update existing config
        await db
          .update(configurations)
          .set({ 
            value: encryptedValue,
            updatedAt: new Date()
          })
          .where(eq(configurations.key, 'app_config'));
      } else {
        // Insert new config
        await db
          .insert(configurations)
          .values({
            key: 'app_config',
            value: encryptedValue,
          });
      }
      
      return config;
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
