
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stationsTable, trainsTable, journeysTable } from '../db/schema';
import { getJourneysByRoute } from '../handlers/get_journeys_by_route';

describe('getJourneysByRoute', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find journeys between two cities on a specific date', async () => {
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
        bicycle_spaces_available: 10
      })
      .returning()
      .execute();

    // Create test journey for target date
    const targetDate = '2024-01-15';
    const departureTime = new Date('2024-01-15T10:30:00.000Z');
    const arrivalTime = new Date('2024-01-15T12:15:00.000Z');

    await db.insert(journeysTable)
      .values({
        train_id: train[0].id,
        origin_station_id: erfurtStation[0].id,
        destination_station_id: leipzigStation[0].id,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        duration_minutes: 105,
        price_cents: 4599, // €45.99
        bicycle_reservation_required: true,
        bicycle_price_cents: 599 // €5.99
      })
      .execute();

    // Search for journeys
    const results = await getJourneysByRoute('Erfurt', 'Leipzig', targetDate);

    expect(results).toHaveLength(1);
    
    const journey = results[0];
    expect(journey.id).toBeDefined();
    expect(journey.train_number).toEqual('ICE 1001');
    expect(journey.train_type).toEqual('ICE');
    expect(journey.origin_station_name).toEqual('Erfurt Hauptbahnhof');
    expect(journey.destination_station_name).toEqual('Leipzig Hauptbahnhof');
    expect(journey.departure_time).toEqual(departureTime);
    expect(journey.arrival_time).toEqual(arrivalTime);
    expect(journey.duration_minutes).toEqual(105);
    expect(journey.price_cents).toEqual(4599);
    expect(journey.has_bicycle_space).toEqual(true);
    expect(journey.bicycle_spaces_available).toEqual(10);
    expect(journey.bicycle_reservation_required).toEqual(true);
    expect(journey.bicycle_price_cents).toEqual(599);
  });

  it('should return empty array when no journeys exist for the route', async () => {
    // Create stations but no journeys
    await db.insert(stationsTable)
      .values([
        { name: 'Erfurt Hauptbahnhof', code: 'EF', city: 'Erfurt' },
        { name: 'Leipzig Hauptbahnhof', code: 'LE', city: 'Leipzig' }
      ])
      .execute();

    const results = await getJourneysByRoute('Erfurt', 'Leipzig', '2024-01-15');

    expect(results).toHaveLength(0);
  });

  it('should return empty array when no journeys exist for the specific date', async () => {
    // Create test data
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

    const train = await db.insert(trainsTable)
      .values({
        train_number: 'ICE 1001',
        train_type: 'ICE',
        has_bicycle_space: false,
        bicycle_spaces_available: 0
      })
      .returning()
      .execute();

    // Create journey for different date
    await db.insert(journeysTable)
      .values({
        train_id: train[0].id,
        origin_station_id: erfurtStation[0].id,
        destination_station_id: leipzigStation[0].id,
        departure_time: new Date('2024-01-14T10:30:00.000Z'), // Different date
        arrival_time: new Date('2024-01-14T12:15:00.000Z'),
        duration_minutes: 105,
        price_cents: 4599,
        bicycle_reservation_required: false,
        bicycle_price_cents: 0
      })
      .execute();

    // Search for journeys on target date
    const results = await getJourneysByRoute('Erfurt', 'Leipzig', '2024-01-15');

    expect(results).toHaveLength(0);
  });

  it('should find multiple journeys on the same date', async () => {
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

    // Create test trains
    const trains = await db.insert(trainsTable)
      .values([
        {
          train_number: 'ICE 1001',
          train_type: 'ICE',
          has_bicycle_space: true,
          bicycle_spaces_available: 10
        },
        {
          train_number: 'IC 2001',
          train_type: 'IC',
          has_bicycle_space: false,
          bicycle_spaces_available: 0
        }
      ])
      .returning()
      .execute();

    const targetDate = '2024-01-15';

    // Create multiple journeys on the same date
    await db.insert(journeysTable)
      .values([
        {
          train_id: trains[0].id,
          origin_station_id: erfurtStation[0].id,
          destination_station_id: leipzigStation[0].id,
          departure_time: new Date('2024-01-15T08:30:00.000Z'),
          arrival_time: new Date('2024-01-15T10:15:00.000Z'),
          duration_minutes: 105,
          price_cents: 4599,
          bicycle_reservation_required: true,
          bicycle_price_cents: 599
        },
        {
          train_id: trains[1].id,
          origin_station_id: erfurtStation[0].id,
          destination_station_id: leipzigStation[0].id,
          departure_time: new Date('2024-01-15T14:30:00.000Z'),
          arrival_time: new Date('2024-01-15T16:15:00.000Z'),
          duration_minutes: 105,
          price_cents: 3599,
          bicycle_reservation_required: false,
          bicycle_price_cents: 0
        }
      ])
      .execute();

    // Search for journeys
    const results = await getJourneysByRoute('Erfurt', 'Leipzig', targetDate);

    expect(results).toHaveLength(2);
    
    // Verify both journeys are returned
    const trainNumbers = results.map(j => j.train_number).sort();
    expect(trainNumbers).toEqual(['IC 2001', 'ICE 1001']);
    
    // Verify all results are for the correct route and date
    results.forEach(journey => {
      expect(journey.origin_station_name).toEqual('Erfurt Hauptbahnhof');
      expect(journey.destination_station_name).toEqual('Leipzig Hauptbahnhof');
      expect(journey.departure_time.toISOString().startsWith('2024-01-15')).toBe(true);
    });
  });

  it('should filter journeys within the specified date range correctly', async () => {
    // Create test data
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

    const train = await db.insert(trainsTable)
      .values({
        train_number: 'ICE 1001',
        train_type: 'ICE',
        has_bicycle_space: true,
        bicycle_spaces_available: 5
      })
      .returning()
      .execute();

    // Create journeys: one just before midnight, one just after midnight, one in the middle of target day
    await db.insert(journeysTable)
      .values([
        {
          // Journey on previous day - should NOT be included
          train_id: train[0].id,
          origin_station_id: erfurtStation[0].id,
          destination_station_id: leipzigStation[0].id,
          departure_time: new Date('2024-01-14T23:59:00.000Z'),
          arrival_time: new Date('2024-01-15T01:45:00.000Z'),
          duration_minutes: 106,
          price_cents: 4599,
          bicycle_reservation_required: false,
          bicycle_price_cents: 0
        },
        {
          // Journey early on target day - should be included
          train_id: train[0].id,
          origin_station_id: erfurtStation[0].id,
          destination_station_id: leipzigStation[0].id,
          departure_time: new Date('2024-01-15T00:30:00.000Z'),
          arrival_time: new Date('2024-01-15T02:15:00.000Z'),
          duration_minutes: 105,
          price_cents: 4599,
          bicycle_reservation_required: true,
          bicycle_price_cents: 599
        },
        {
          // Journey late on target day - should be included
          train_id: train[0].id,
          origin_station_id: erfurtStation[0].id,
          destination_station_id: leipzigStation[0].id,
          departure_time: new Date('2024-01-15T23:30:00.000Z'),
          arrival_time: new Date('2024-01-16T01:15:00.000Z'),
          duration_minutes: 105,
          price_cents: 4599,
          bicycle_reservation_required: false,
          bicycle_price_cents: 0
        }
      ])
      .execute();

    // Search for journeys on 2024-01-15
    const results = await getJourneysByRoute('Erfurt', 'Leipzig', '2024-01-15');

    expect(results).toHaveLength(2);
    
    // Verify all returned journeys depart on the target date
    results.forEach(journey => {
      expect(journey.departure_time.toISOString().startsWith('2024-01-15')).toBe(true);
    });
  });
});
