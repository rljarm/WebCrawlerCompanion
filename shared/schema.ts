import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
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

export type InsertProxyConfig = z.infer<typeof insertProxyConfigSchema>;
export type ProxyConfig = typeof proxyConfigs.$inferSelect;
export type InsertSelector = z.infer<typeof insertSelectorSchema>;
export type Selector = typeof selectors.$inferSelect;
