import express, { type Express } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import fetch from "node-fetch";
import { insertProxyConfigSchema, insertSelectorSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'SELECT_ELEMENT':
            // Broadcast element selection to all clients
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'ELEMENT_SELECTED',
                  selector: data.selector,
                  attributes: data.attributes
                }));
              }
            });
            break;

          case 'HIGHLIGHT_ELEMENT':
            // Broadcast highlight state
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'ELEMENT_HIGHLIGHTED',
                  selector: data.selector
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
  });

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
      console.log(`Fetching content for URL: ${url}`);
      const response = await fetch(url);
      const content = await response.text();

      console.log(`Successfully fetched content for URL: ${url}`);
      res.json({ content });
    } catch (error) {
      console.error("Error fetching page content:", error);
      res.status(500).json({ 
        error: "Failed to fetch page content",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/download-media", async (req, res) => {
    const { url, handler } = req.body;
    if (!url || !handler) {
      return res.status(400).json({ error: "URL and handler are required" });
    }

    // In a real implementation, this would handle different download methods
    res.json({ status: 'success', message: 'Download started' });
  });

  return server;
}