
import { db } from '../db';
import { journeysTable, stationsTable, trainsTable } from '../db/schema';
import { type JourneyWithDetails } from '../schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function getJourneysByRoute(
    originCity: string, 
    destinationCity: string, 
    departureDate: string
): Promise<JourneyWithDetails[]> {
  try {
    // Parse the departure date and create date range for the entire day
    const startDate = new Date(departureDate + 'T00:00:00.000Z');
    const endDate = new Date(departureDate + 'T23:59:59.999Z');

    // Create aliases for stations table since we need to join it twice
    const originStations = alias(stationsTable, 'origin_stations');
    const destinationStations = alias(stationsTable, 'destination_stations');

    // Query journeys with joins to get all required details
    const results = await db.select({
      // Journey fields
      id: journeysTable.id,
      departure_time: journeysTable.departure_time,
      arrival_time: journeysTable.arrival_time,
      duration_minutes: journeysTable.duration_minutes,
      price_cents: journeysTable.price_cents,
      bicycle_reservation_required: journeysTable.bicycle_reservation_required,
      bicycle_price_cents: journeysTable.bicycle_price_cents,
      // Train fields
      train_number: trainsTable.train_number,
      train_type: trainsTable.train_type,
      has_bicycle_space: trainsTable.has_bicycle_space,
      bicycle_spaces_available: trainsTable.bicycle_spaces_available,
      // Station fields
      origin_station_name: originStations.name,
      destination_station_name: destinationStations.name
    })
    .from(journeysTable)
    .innerJoin(trainsTable, eq(journeysTable.train_id, trainsTable.id))
    .innerJoin(originStations, eq(journeysTable.origin_station_id, originStations.id))
    .innerJoin(destinationStations, eq(journeysTable.destination_station_id, destinationStations.id))
    .where(
      and(
        eq(originStations.city, originCity),
        eq(destinationStations.city, destinationCity),
        gte(journeysTable.departure_time, startDate),
        lt(journeysTable.departure_time, endDate)
      )
    )
    .execute();

    // Return the results - they should already match JourneyWithDetails structure
    return results;

  } catch (error) {
    console.error('Failed to fetch journeys by route:', error);
    throw error;
  }
}
