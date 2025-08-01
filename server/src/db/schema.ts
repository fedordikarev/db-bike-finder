
import { serial, text, pgTable, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const stationsTable = pgTable('stations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(), // DB station code like "EF" for Erfurt
  city: text('city').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const trainsTable = pgTable('trains', {
  id: serial('id').primaryKey(),
  train_number: text('train_number').notNull().unique(), // e.g., "ICE 1001"
  train_type: text('train_type').notNull(), // ICE, IC, RE, etc.
  has_bicycle_space: boolean('has_bicycle_space').notNull().default(false),
  bicycle_spaces_available: integer('bicycle_spaces_available').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const journeysTable = pgTable('journeys', {
  id: serial('id').primaryKey(),
  train_id: integer('train_id').notNull().references(() => trainsTable.id),
  origin_station_id: integer('origin_station_id').notNull().references(() => stationsTable.id),
  destination_station_id: integer('destination_station_id').notNull().references(() => stationsTable.id),
  departure_time: timestamp('departure_time').notNull(),
  arrival_time: timestamp('arrival_time').notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  price_cents: integer('price_cents').notNull(), // Price in cents
  bicycle_reservation_required: boolean('bicycle_reservation_required').notNull().default(false),
  bicycle_price_cents: integer('bicycle_price_cents').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const journeysRelations = relations(journeysTable, ({ one }) => ({
  train: one(trainsTable, {
    fields: [journeysTable.train_id],
    references: [trainsTable.id],
  }),
  originStation: one(stationsTable, {
    fields: [journeysTable.origin_station_id],
    references: [stationsTable.id],
  }),
  destinationStation: one(stationsTable, {
    fields: [journeysTable.destination_station_id],
    references: [stationsTable.id],
  }),
}));

export const trainsRelations = relations(trainsTable, ({ many }) => ({
  journeys: many(journeysTable),
}));

export const stationsRelations = relations(stationsTable, ({ many }) => ({
  originJourneys: many(journeysTable, { relationName: 'origin' }),
  destinationJourneys: many(journeysTable, { relationName: 'destination' }),
}));

// TypeScript types for the table schemas
export type Station = typeof stationsTable.$inferSelect;
export type NewStation = typeof stationsTable.$inferInsert;
export type Train = typeof trainsTable.$inferSelect;
export type NewTrain = typeof trainsTable.$inferInsert;
export type Journey = typeof journeysTable.$inferSelect;
export type NewJourney = typeof journeysTable.$inferInsert;

// Export all tables for proper query building
export const tables = { 
  stations: stationsTable, 
  trains: trainsTable, 
  journeys: journeysTable 
};
