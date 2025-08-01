
import { z } from 'zod';

// Station schema
export const stationSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  city: z.string(),
  created_at: z.coerce.date()
});

export type Station = z.infer<typeof stationSchema>;

// Train schema
export const trainSchema = z.object({
  id: z.number(),
  train_number: z.string(),
  train_type: z.string(), // ICE, IC, RE, etc.
  has_bicycle_space: z.boolean(),
  bicycle_spaces_available: z.number().int().nonnegative(),
  created_at: z.coerce.date()
});

export type Train = z.infer<typeof trainSchema>;

// Journey schema
export const journeySchema = z.object({
  id: z.number(),
  train_id: z.number(),
  origin_station_id: z.number(),
  destination_station_id: z.number(),
  departure_time: z.coerce.date(),
  arrival_time: z.coerce.date(),
  duration_minutes: z.number().int().positive(),
  price_cents: z.number().int().nonnegative(), // Price in cents to avoid floating point issues
  bicycle_reservation_required: z.boolean(),
  bicycle_price_cents: z.number().int().nonnegative(),
  created_at: z.coerce.date()
});

export type Journey = z.infer<typeof journeySchema>;

// Round trip search input schema
export const roundTripSearchInputSchema = z.object({
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  origin_city: z.string().default("Erfurt"),
  destination_city: z.string().default("Leipzig"),
  return_delay_hours: z.number().int().positive().default(4) // Hours to add for return trip
});

export type RoundTripSearchInput = z.infer<typeof roundTripSearchInputSchema>;

// Journey with details schema (includes train and station info)
export const journeyWithDetailsSchema = z.object({
  id: z.number(),
  train_number: z.string(),
  train_type: z.string(),
  origin_station_name: z.string(),
  destination_station_name: z.string(),
  departure_time: z.coerce.date(),
  arrival_time: z.coerce.date(),
  duration_minutes: z.number().int(),
  price_cents: z.number().int(),
  has_bicycle_space: z.boolean(),
  bicycle_spaces_available: z.number().int(),
  bicycle_reservation_required: z.boolean(),
  bicycle_price_cents: z.number().int()
});

export type JourneyWithDetails = z.infer<typeof journeyWithDetailsSchema>;

// Round trip result schema
export const roundTripResultSchema = z.object({
  outbound_journeys: z.array(journeyWithDetailsSchema),
  return_journeys: z.array(journeyWithDetailsSchema),
  search_date: z.string(),
  origin_city: z.string(),
  destination_city: z.string()
});

export type RoundTripResult = z.infer<typeof roundTripResultSchema>;
