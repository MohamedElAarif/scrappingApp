import { 
  scrapingConfigurations, 
  scrapingSessions,
  type ScrapingConfiguration, 
  type InsertScrapingConfiguration,
  type ScrapingSession,
  type InsertScrapingSession,
  type ScrapingProgress,
  type ScrapedData
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Configuration management
  createConfiguration(config: InsertScrapingConfiguration): Promise<ScrapingConfiguration>;
  getConfiguration(id: number): Promise<ScrapingConfiguration | undefined>;
  getAllConfigurations(): Promise<ScrapingConfiguration[]>;
  updateConfiguration(id: number, updates: Partial<InsertScrapingConfiguration>): Promise<ScrapingConfiguration | undefined>;
  deleteConfiguration(id: number): Promise<boolean>;

  // Session management
  createSession(session: InsertScrapingSession): Promise<ScrapingSession>;
  getSession(id: number): Promise<ScrapingSession | undefined>;
  updateSessionProgress(id: number, progress: ScrapingProgress): Promise<void>;
  updateSessionResults(id: number, results: ScrapedData[]): Promise<void>;
  updateSessionStatus(id: number, status: string, completedAt?: Date): Promise<void>;
  addSessionError(id: number, error: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private configurations: Map<number, ScrapingConfiguration>;
  private sessions: Map<number, ScrapingSession>;
  private currentConfigId: number;
  private currentSessionId: number;

  constructor() {
    this.configurations = new Map();
    this.sessions = new Map();
    this.currentConfigId = 1;
    this.currentSessionId = 1;
  }

  async createConfiguration(config: InsertScrapingConfiguration): Promise<ScrapingConfiguration> {
    const id = this.currentConfigId++;
    const configuration: ScrapingConfiguration = {
      ...config,
      id,
      createdAt: new Date(),
    };
    this.configurations.set(id, configuration);
    return configuration;
  }

  async getConfiguration(id: number): Promise<ScrapingConfiguration | undefined> {
    return this.configurations.get(id);
  }

  async getAllConfigurations(): Promise<ScrapingConfiguration[]> {
    return Array.from(this.configurations.values());
  }

  async updateConfiguration(id: number, updates: Partial<InsertScrapingConfiguration>): Promise<ScrapingConfiguration | undefined> {
    const existing = this.configurations.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.configurations.set(id, updated);
    return updated;
  }

  async deleteConfiguration(id: number): Promise<boolean> {
    return this.configurations.delete(id);
  }

  async createSession(session: InsertScrapingSession): Promise<ScrapingSession> {
    const id = this.currentSessionId++;
    const scrapingSession: ScrapingSession = {
      ...session,
      id,
      createdAt: new Date(),
      completedAt: null,
    };
    this.sessions.set(id, scrapingSession);
    return scrapingSession;
  }

  async getSession(id: number): Promise<ScrapingSession | undefined> {
    return this.sessions.get(id);
  }

  async updateSessionProgress(id: number, progress: ScrapingProgress): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.progress = progress;
      this.sessions.set(id, session);
    }
  }

  async updateSessionResults(id: number, results: ScrapedData[]): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.results = results;
      this.sessions.set(id, session);
    }
  }

  async updateSessionStatus(id: number, status: string, completedAt?: Date): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      if (completedAt) {
        session.completedAt = completedAt;
      }
      this.sessions.set(id, session);
    }
  }

  async addSessionError(id: number, error: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      if (!session.errorLog) {
        session.errorLog = [];
      }
      session.errorLog.push(error);
      this.sessions.set(id, session);
    }
  }
}

export class DatabaseStorage implements IStorage {
  async createConfiguration(config: InsertScrapingConfiguration): Promise<ScrapingConfiguration> {
    const [configuration] = await db
      .insert(scrapingConfigurations)
      .values(config)
      .returning();
    return configuration;
  }

  async getConfiguration(id: number): Promise<ScrapingConfiguration | undefined> {
    const [configuration] = await db
      .select()
      .from(scrapingConfigurations)
      .where(eq(scrapingConfigurations.id, id));
    return configuration || undefined;
  }

  async getAllConfigurations(): Promise<ScrapingConfiguration[]> {
    return await db.select().from(scrapingConfigurations);
  }

  async updateConfiguration(id: number, updates: Partial<InsertScrapingConfiguration>): Promise<ScrapingConfiguration | undefined> {
    const [configuration] = await db
      .update(scrapingConfigurations)
      .set(updates)
      .where(eq(scrapingConfigurations.id, id))
      .returning();
    return configuration || undefined;
  }

  async deleteConfiguration(id: number): Promise<boolean> {
    const result = await db
      .delete(scrapingConfigurations)
      .where(eq(scrapingConfigurations.id, id));
    return result.rowCount > 0;
  }

  async createSession(session: InsertScrapingSession): Promise<ScrapingSession> {
    const [scrapingSession] = await db
      .insert(scrapingSessions)
      .values(session)
      .returning();
    return scrapingSession;
  }

  async getSession(id: number): Promise<ScrapingSession | undefined> {
    const [session] = await db
      .select()
      .from(scrapingSessions)
      .where(eq(scrapingSessions.id, id));
    return session || undefined;
  }

  async updateSessionProgress(id: number, progress: ScrapingProgress): Promise<void> {
    await db
      .update(scrapingSessions)
      .set({ progress })
      .where(eq(scrapingSessions.id, id));
  }

  async updateSessionResults(id: number, results: ScrapedData[]): Promise<void> {
    await db
      .update(scrapingSessions)
      .set({ results })
      .where(eq(scrapingSessions.id, id));
  }

  async updateSessionStatus(id: number, status: string, completedAt?: Date): Promise<void> {
    const updateData: any = { status };
    if (completedAt) {
      updateData.completedAt = completedAt;
    }
    
    await db
      .update(scrapingSessions)
      .set(updateData)
      .where(eq(scrapingSessions.id, id));
  }

  async addSessionError(id: number, error: string): Promise<void> {
    const session = await this.getSession(id);
    if (session) {
      const errorLog = session.errorLog || [];
      errorLog.push(error);
      
      await db
        .update(scrapingSessions)
        .set({ errorLog })
        .where(eq(scrapingSessions.id, id));
    }
  }
}

export const storage = new DatabaseStorage();
