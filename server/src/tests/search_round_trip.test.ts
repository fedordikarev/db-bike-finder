
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stationsTable, trainsTable, journeysTable } from '../db/schema';
import { type RoundTripSearchInput } from '../schema';
import { searchRoundTrip } from '../handlers/search_round_trip';

const testInput: RoundTripSearchInput = {
  departure_date: '2024-01-15',
  origin_city: 'Erfurt',
  destination_city: 'Leipzig',
  return_delay_hours: 4
};

describe('searchRoundTrip', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty results when no stations exist', async () => {
    const result = await searchRoundTrip(testInput);

    expect(result.outbound_journeys).toHaveLength(0);
    expect(result.return_journeys).toHaveLength(0);
    expect(result.search_date).toEqual('2024-01-15');
    expect(result.origin_city).toEqual('Erfurt');
    expect(result.destination_city).toEqual('Leipzig');
  });

  it('should find outbound and return journeys', async () => {
    // Create test stations
    const erfurtStation = await db.insert(stationsTable)
      .values({
        name: 'Erfurt Hauptbahnhof',
        code: 'EF',
        city: 'Erfurt'
      })
      .returning()
      .execute();

    const leipzigStation = await db.insert(stationsTable)
      .values({
        name: 'Leipzig Hauptbahnhof',
        code: 'LE',
        city: 'Leipzig'
      })
      .returning()
      .execute();

    // Create test train
    const train = await db.insert(trainsTable)
      .values({
        train_number: 'ICE 1001',
        train_type: 'ICE',
        has_bicycle_space: true,
        bicycle_spaces_available: 8
      })
      .returning()
      .execute();

    // Create outbound journey (Erfurt to Leipzig) on the search date
    const outboundDeparture = new Date('2024-01-15T09:00:00.000Z');
    const outboundArrival = new Date('2024-01-15T10:30:00.000Z');

    await db.insert(journeysTable)
      .values({
        train_id: train[0].id,
        origin_station_id: erfurtStation[0].id,
        destination_station_id: leipzigStation[0].id,
        departure_time: outboundDeparture,
        arrival_time: outboundArrival,
        duration_minutes: 90,
        price_cents: 2990,
        bicycle_reservation_required: true,
        bicycle_price_cents: 900
      })
      .execute();

    // Create return journey (Leipzig to Erfurt) - after return delay hours
    const returnDeparture = new Date('2024-01-15T15:00:00.000Z'); // 15:00 is after 10:30 + 4 hours
    const returnArrival = new Date('2024-01-15T16:30:00.000Z');

    await db.insert(journeysTable)
      .values({
        train_id: train[0].id,
        origin_station_id: leipzigStation[0].id,
        destination_station_id: erfurtStation[0].id,
        departure_time: returnDeparture,
        arrival_time: returnArrival,
        duration_minutes: 90,
        price_cents: 2990,
        bicycle_reservation_required: true,
        bicycle_price_cents: 900
      })
      .execute();

    const result = await searchRoundTrip(testInput);

    // Verify outbound journey
    expect(result.outbound_journeys).toHaveLength(1);
    const outbound = result.outbound_journeys[0];
    expect(outbound.train_number).toEqual('ICE 1001');
    expect(outbound.train_type).toEqual('ICE');
    expect(outbound.origin_station_name).toEqual('Erfurt Hauptbahnhof');
    expect(outbound.destination_station_name).toEqual('Leipzig Hauptbahnhof');
    expect(outbound.departure_time).toEqual(outboundDeparture);
    expect(outbound.arrival_time).toEqual(outboundArrival);
    expect(outbound.duration_minutes).toEqual(90);
    expect(outbound.price_cents).toEqual(2990);
    expect(outbound.has_bicycle_space).toEqual(true);
    expect(outbound.bicycle_spaces_available).toEqual(8);
    expect(outbound.bicycle_reservation_required).toEqual(true);
    expect(outbound.bicycle_price_cents).toEqual(900);

    // Verify return journey
    expect(result.return_journeys).toHaveLength(1);
    const returnJourney = result.return_journeys[0];
    expect(returnJourney.train_number).toEqual('ICE 1001');
    expect(returnJourney.origin_station_name).toEqual('Leipzig Hauptbahnhof');
    expect(returnJourney.destination_station_name).toEqual('Erfurt Hauptbahnhof');
    expect(returnJourney.departure_time).toEqual(returnDeparture);

    // Verify search metadata
    expect(result.search_date).toEqual('2024-01-15');
    expect(result.origin_city).toEqual('Erfurt');
    expect(result.destination_city).toEqual('Leipzig');
  });

  it('should filter return journeys by delay hours', async () => {
    // Create test stations
    const erfurtStation = await db.insert(stationsTable)
      .values({
        name: 'Erfurt Hauptbahnhof',
        code: 'EF',
        city: 'Erfurt'
      })
      .returning()
      .execute();

    const leipzigStation = await db.insert(stationsTable)
      .values({
        name: 'Leipzig Hauptbahnhof',
        code: 'LE',
        city: 'Leipzig'
      })
      .returning()
      .execute();

    // Create test train
    const train = await db.insert(trainsTable)
      .values({
        train_number: 'RE 1001',
        train_type: 'RE',
        has_bicycle_space: false,
        bicycle_spaces_available: 0
      })
      .returning()
      .execute();

    // Create return journey too early (before delay hours)
    const earlyReturnDeparture = new Date('2024-01-15T02:00:00.000Z'); // Too early

    await db.insert(journeysTable)
      .values({
        train_id: train[0].id,
        origin_station_id: leipzigStation[0].id,
        destination_station_id: erfurtStation[0].id,
        departure_time: earlyReturnDeparture,
        arrival_time: new Date('2024-01-15T03:30:00.000Z'),
        duration_minutes: 90,
        price_cents: 1990,
        bicycle_reservation_required: false,
        bicycle_price_cents: 0
      })
      .execute();

    // Create return journey at correct time (after delay hours)
    const validReturnDeparture = new Date('2024-01-15T05:00:00.000Z'); // After 4 hours delay

    await db.insert(journeysTable)
      .values({
        train_id: train[0].id,
        origin_station_id: leipzigStation[0].id,
        destination_station_id: erfurtStation[0].id,
        departure_time: validReturnDeparture,
        arrival_time: new Date('2024-01-15T06:30:00.000Z'),
        duration_minutes: 90,
        price_cents: 1990,
        bicycle_reservation_required: false,
        bicycle_price_cents: 0
      })
      .execute();

    const result = await searchRoundTrip(testInput);

    // Should find the valid return journey but not the early one
    expect(result.return_journeys).toHaveLength(1);
    expect(result.return_journeys[0].departure_time).toEqual(validReturnDeparture);
    expect(result.return_journeys[0].has_bicycle_space).toEqual(false);
    expect(result.return_journeys[0].bicycle_spaces_available).toEqual(0);
  });

  it('should handle journeys without bicycle space', async () => {
    // Create test stations
    const erfurtStation = await db.insert(stationsTable)
      .values({
        name: 'Erfurt Hauptbahnhof',
        code: 'EF',
        city: 'Erfurt'
      })
      .returning()
      .execute();

    const leipzigStation = await db.insert(stationsTable)
      .values({
        name: 'Leipzig Hauptbahnhof',
        code: 'LE',
        city: 'Leipzig'
      })
      .returning()
      .execute();

    // Create train without bicycle space
    const train = await db.insert(trainsTable)
      .values({
        train_number: 'S1',
        train_type: 'S-Bahn',
        has_bicycle_space: false,
        bicycle_spaces_available: 0
      })
      .returning()
      .execute();

    // Create outbound journey
    await db.insert(journeysTable)
      .values({
        train_id: train[0].id,
        origin_station_id: erfurtStation[0].id,
        destination_station_id: leipzigStation[0].id,
        departure_time: new Date('2024-01-15T12:00:00.000Z'),
        arrival_time: new Date('2024-01-15T13:00:00.000Z'),
        duration_minutes: 60,
        price_cents: 890,
        bicycle_reservation_required: false,
        bicycle_price_cents: 0
      })
      .execute();

    const result = await searchRoundTrip(testInput);

    expect(result.outbound_journeys).toHaveLength(1);
    const journey = result.outbound_journeys[0];
    expect(journey.has_bicycle_space).toEqual(false);
    expect(journey.bicycle_spaces_available).toEqual(0);
    expect(journey.bicycle_reservation_required).toEqual(false);
    expect(journey.bicycle_price_cents).toEqual(0);
  });
});
