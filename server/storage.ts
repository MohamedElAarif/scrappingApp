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

export const storage = new MemStorage();
