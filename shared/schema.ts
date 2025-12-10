import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const proxyConfigs = pgTable("proxy_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  proxies: text("proxies").array().notNull(),
  rotationStrategy: text("rotation_strategy").notNull()
});

export const selectors = pgTable("selectors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  selector: text("selector").notNull(),
  attributes: text("attributes").array().notNull(),
  parentSelector: text("parent_selector"),
  url: text("url").notNull()
});

// Users table for OAuth2 authentication (future implementation)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // 'mailcow' or 'authentik'
  providerId: text("provider_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login")
});

export const insertProxyConfigSchema = createInsertSchema(proxyConfigs).pick({
  name: true,
  proxies: true,
  rotationStrategy: true
});

export const insertSelectorSchema = createInsertSchema(selectors).pick({
  name: true,
  selector: true,
  attributes: true,
  parentSelector: true,
  url: true
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  provider: true,
  providerId: true
});

export type InsertProxyConfig = z.infer<typeof insertProxyConfigSchema>;
export type ProxyConfig = typeof proxyConfigs.$inferSelect;
export type InsertSelector = z.infer<typeof insertSelectorSchema>;
export type Selector = typeof selectors.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
