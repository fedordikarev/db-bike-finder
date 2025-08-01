
import { db } from '../db';
import { stationsTable, trainsTable, journeysTable } from '../db/schema';
import { type RoundTripSearchInput, type RoundTripResult, type JourneyWithDetails } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function searchRoundTrip(input: RoundTripSearchInput): Promise<RoundTripResult> {
  try {
    // Parse the departure date
    const departureDate = new Date(input.departure_date);
    
    // Set up date ranges for searching
    const dayStart = new Date(departureDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(departureDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Find stations for origin and destination cities
    const originStations = await db.select()
      .from(stationsTable)
      .where(eq(stationsTable.city, input.origin_city))
      .execute();

    const destinationStations = await db.select()
      .from(stationsTable)
      .where(eq(stationsTable.city, input.destination_city))
      .execute();

    if (originStations.length === 0 || destinationStations.length === 0) {
      return {
        outbound_journeys: [],
        return_journeys: [],
        search_date: input.departure_date,
        origin_city: input.origin_city,
        destination_city: input.destination_city
      };
    }

    const originStationIds = originStations.map(s => s.id);
    const destinationStationIds = destinationStations.map(s => s.id);

    // Search for outbound journeys (origin to destination)
    const outboundResults = await db.select({
      id: journeysTable.id,
      train_number: trainsTable.train_number,
      train_type: trainsTable.train_type,
      origin_station_name: stationsTable.name,
      destination_station_name: stationsTable.name,
      departure_time: journeysTable.departure_time,
      arrival_time: journeysTable.arrival_time,
      duration_minutes: journeysTable.duration_minutes,
      price_cents: journeysTable.price_cents,
      has_bicycle_space: trainsTable.has_bicycle_space,
      bicycle_spaces_available: trainsTable.bicycle_spaces_available,
      bicycle_reservation_required: journeysTable.bicycle_reservation_required,
      bicycle_price_cents: journeysTable.bicycle_price_cents
    })
    .from(journeysTable)
    .innerJoin(trainsTable, eq(journeysTable.train_id, trainsTable.id))
    .innerJoin(stationsTable, eq(journeysTable.origin_station_id, stationsTable.id))
    .where(and(
      eq(journeysTable.origin_station_id, originStationIds[0]),
      eq(journeysTable.destination_station_id, destinationStationIds[0]),
      gte(journeysTable.departure_time, dayStart),
      lte(journeysTable.departure_time, dayEnd)
    ))
    .execute();

    // For return journeys, we need to join with destination station for the name
    // Calculate return search time based on outbound arrivals
    const returnSearchStart = new Date(dayStart);
    returnSearchStart.setHours(returnSearchStart.getHours() + input.return_delay_hours);

    const returnResults = await db.select({
      id: journeysTable.id,
      train_number: trainsTable.train_number,
      train_type: trainsTable.train_type,
      origin_station_name: stationsTable.name,
      destination_station_name: stationsTable.name,
      departure_time: journeysTable.departure_time,
      arrival_time: journeysTable.arrival_time,
      duration_minutes: journeysTable.duration_minutes,
      price_cents: journeysTable.price_cents,
      has_bicycle_space: trainsTable.has_bicycle_space,
      bicycle_spaces_available: trainsTable.bicycle_spaces_available,
      bicycle_reservation_required: journeysTable.bicycle_reservation_required,
      bicycle_price_cents: journeysTable.bicycle_price_cents
    })
    .from(journeysTable)
    .innerJoin(trainsTable, eq(journeysTable.train_id, trainsTable.id))
    .innerJoin(stationsTable, eq(journeysTable.origin_station_id, stationsTable.id))
    .where(and(
      eq(journeysTable.origin_station_id, destinationStationIds[0]),
      eq(journeysTable.destination_station_id, originStationIds[0]),
      gte(journeysTable.departure_time, returnSearchStart),
      lte(journeysTable.departure_time, dayEnd)
    ))
    .execute();

    // We need to get destination station names for the results
    // Since we joined with origin station, we need to fetch destination names separately
    const outboundJourneys: JourneyWithDetails[] = [];
    const returnJourneys: JourneyWithDetails[] = [];

    // Process outbound journeys and get destination station names
    for (const journey of outboundResults) {
      const destStation = await db.select()
        .from(stationsTable)
        .where(eq(stationsTable.id, destinationStationIds[0]))
        .execute();

      outboundJourneys.push({
        ...journey,
        destination_station_name: destStation[0]?.name || 'Unknown'
      });
    }

    // Process return journeys and get destination station names
    for (const journey of returnResults) {
      const destStation = await db.select()
        .from(stationsTable)
        .where(eq(stationsTable.id, originStationIds[0]))
        .execute();

      returnJourneys.push({
        ...journey,
        destination_station_name: destStation[0]?.name || 'Unknown'
      });
    }

    return {
      outbound_journeys: outboundJourneys,
      return_journeys: returnJourneys,
      search_date: input.departure_date,
      origin_city: input.origin_city,
      destination_city: input.destination_city
    };

  } catch (error) {
    console.error('Round trip search failed:', error);
    throw error;
  }
}
