import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import playwright from "playwright";
import { insertProxyConfigSchema, insertSelectorSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  app.post("/api/proxy-configs", async (req, res) => {
    const result = insertProxyConfigSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const config = await storage.createProxyConfig(result.data);
    res.json(config);
  });

  app.get("/api/proxy-configs", async (_req, res) => {
    const configs = await storage.getProxyConfigs();
    res.json(configs);
  });

  app.post("/api/selectors", async (req, res) => {
    const result = insertSelectorSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const selector = await storage.createSelector(result.data);
    res.json(selector);
  });

  app.get("/api/selectors", async (_req, res) => {
    const selectors = await storage.getSelectors();
    res.json(selectors);
  });

  app.post("/api/fetch-dom", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    let browser = null;
    try {
      console.log(`Fetching content for URL: ${url}`);
      browser = await playwright.chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      const content = await page.content();
      await context.close();
      console.log(`Successfully fetched content for URL: ${url}`);
      res.json({ content });
    } catch (error) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ 
        error: "Failed to fetch page content",
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  });

  return createServer(app);
}