import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scrapingConfigurations = pgTable("scraping_configurations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetUrl: text("target_url").notNull(),
  userAgent: text("user_agent").default("Chrome (Desktop)"),
  requestDelay: integer("request_delay").default(1000),
  selectors: jsonb("selectors").$type<ScrapingSelector[]>().notNull(),
  filters: jsonb("filters").$type<ScrapingFilters>().default({}),
  options: jsonb("options").$type<ScrapingOptions>().default({}),
  pagination: jsonb("pagination").$type<PaginationSettings>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scrapingSessions = pgTable("scraping_sessions", {
  id: serial("id").primaryKey(),
  configurationId: integer("configuration_id").references(() => scrapingConfigurations.id),
  status: text("status").notNull().default("idle"), // idle, running, completed, failed
  progress: jsonb("progress").$type<ScrapingProgress>().default({ current: 0, total: 0, extracted: 0, errors: 0 }),
  results: jsonb("results").$type<ScrapedData[]>().default([]),
  errorLog: jsonb("error_log").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Type definitions
export interface ScrapingSelector {
  id: string;
  name: string;
  cssSelector?: string;
  xpath?: string;
  regex?: string;
  attribute: string;
  required: boolean;
}

export interface ScrapingFilters {
  include?: string;
  exclude?: string;
}

export interface ScrapingOptions {
  handlePagination: boolean;
  waitForDynamic: boolean;
  removeDuplicates: boolean;
  respectRobots: boolean;
  multiWebsite: boolean;
  extractUrlsFromResults: boolean;
  maxWebsites?: number;
}

export interface PaginationSettings {
  nextSelector?: string;
  maxPages?: number;
}

export interface ScrapingProgress {
  current: number;
  total: number;
  extracted: number;
  errors: number;
}

export interface ScrapedData {
  [key: string]: string | null;
}

// Insert schemas
export const insertScrapingConfigurationSchema = createInsertSchema(scrapingConfigurations).omit({
  id: true,
  createdAt: true,
});

export const insertScrapingSessionSchema = createInsertSchema(scrapingSessions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// Types
export type InsertScrapingConfiguration = z.infer<typeof insertScrapingConfigurationSchema>;
export type ScrapingConfiguration = typeof scrapingConfigurations.$inferSelect;
export type InsertScrapingSession = z.infer<typeof insertScrapingSessionSchema>;
export type ScrapingSession = typeof scrapingSessions.$inferSelect;

// Export format schema
export const exportRequestSchema = z.object({
  sessionId: z.number(),
  format: z.enum(["csv", "json", "xlsx", "xml"]),
  fileName: z.string().optional(),
  includeTimestamp: z.boolean().default(true),
  includeMetadata: z.boolean().default(false),
});

export type ExportRequest = z.infer<typeof exportRequestSchema>;
