import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapingService } from "./services/scraper";
import { exportService } from "./services/exporter";
import { 
  insertScrapingConfigurationSchema, 
  insertScrapingSessionSchema,
  exportRequestSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Configuration routes
  app.get("/api/configurations", async (req, res) => {
    try {
      const configurations = await storage.getAllConfigurations();
      res.json(configurations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configurations" });
    }
  });

  app.post("/api/configurations", async (req, res) => {
    try {
      const validatedData = insertScrapingConfigurationSchema.parse(req.body);
      const configuration = await storage.createConfiguration(validatedData);
      res.status(201).json(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create configuration" });
      }
    }
  });

  app.get("/api/configurations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const configuration = await storage.getConfiguration(id);
      if (configuration) {
        res.json(configuration);
      } else {
        res.status(404).json({ message: "Configuration not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch configuration" });
    }
  });

  app.put("/api/configurations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertScrapingConfigurationSchema.partial().parse(req.body);
      const configuration = await storage.updateConfiguration(id, validatedData);
      if (configuration) {
        res.json(configuration);
      } else {
        res.status(404).json({ message: "Configuration not found" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update configuration" });
      }
    }
  });

  app.delete("/api/configurations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteConfiguration(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Configuration not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete configuration" });
    }
  });

  // Session routes
  app.post("/api/sessions", async (req, res) => {
    try {
      const validatedData = insertScrapingSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid session data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create session" });
      }
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const session = await storage.getSession(id);
      if (session) {
        res.json(session);
      } else {
        res.status(404).json({ message: "Session not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  // Scraping control routes
  app.post("/api/scraping/start", async (req, res) => {
    try {
      const { configurationId } = req.body;
      
      if (!configurationId) {
        return res.status(400).json({ message: "Configuration ID is required" });
      }

      const configuration = await storage.getConfiguration(configurationId);
      if (!configuration) {
        return res.status(404).json({ message: "Configuration not found" });
      }

      // Create a new session
      const session = await storage.createSession({
        configurationId,
        status: "idle",
        progress: { current: 0, total: 0, extracted: 0, errors: 0 },
        results: [],
        errorLog: []
      });

      // Start scraping asynchronously
      scrapingService.startScraping(configurationId, session.id).catch(error => {
        console.error("Scraping error:", error);
      });

      res.json({ sessionId: session.id, message: "Scraping started" });
    } catch (error) {
      res.status(500).json({ message: "Failed to start scraping" });
    }
  });

  app.post("/api/scraping/stop", async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      await scrapingService.stopScraping(sessionId);
      res.json({ message: "Scraping stopped" });
    } catch (error) {
      res.status(500).json({ message: "Failed to stop scraping" });
    }
  });

  // URL validation route
  app.post("/api/validate-url", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      // Try to access the URL
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.ok) {
        res.json({ isValid: true, message: "URL is accessible" });
      } else {
        res.status(400).json({ isValid: false, message: `URL returned status ${response.status}` });
      }
    } catch (error) {
      res.status(400).json({ isValid: false, message: "URL is not accessible" });
    }
  });

  // Selector testing route
  app.post("/api/test-selector", async (req, res) => {
    try {
      const { url, selector } = req.body;
      
      if (!url || !selector) {
        return res.status(400).json({ message: "URL and selector are required" });
      }

      const result = await scrapingService.testSelector(url, selector);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to test selector" });
    }
  });

  // Export route
  app.post("/api/export", async (req, res) => {
    try {
      const validatedRequest = exportRequestSchema.parse(req.body);
      
      const session = await storage.getSession(validatedRequest.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (!session.results || session.results.length === 0) {
        return res.status(400).json({ message: "No data available for export" });
      }

      const exportResult = await exportService.exportData(session.results, validatedRequest);
      
      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.content);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid export request", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to export data" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
