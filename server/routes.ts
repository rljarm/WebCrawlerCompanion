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

    try {
      const browser = await playwright.chromium.launch();
      const page = await browser.newPage();
      await page.goto(url);
      const content = await page.content();
      await browser.close();
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch page content" });
    }
  });

  return createServer(app);
}
