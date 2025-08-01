
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stationsTable } from '../db/schema';
import { getStations } from '../handlers/get_stations';

describe('getStations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no stations exist', async () => {
    const result = await getStations();
    expect(result).toEqual([]);
  });

  it('should return all stations', async () => {
    // Create test stations
    await db.insert(stationsTable)
      .values([
        {
          name: 'Erfurt Hauptbahnhof',
          code: 'EF',
          city: 'Erfurt'
        },
        {
          name: 'Leipzig Hauptbahnhof',
          code: 'LE',
          city: 'Leipzig'
        },
        {
          name: 'Berlin Hauptbahnhof',
          code: 'BER',
          city: 'Berlin'
        }
      ])
      .execute();

    const result = await getStations();

    expect(result).toHaveLength(3);
    
    // Check first station
    expect(result[0].name).toEqual('Erfurt Hauptbahnhof');
    expect(result[0].code).toEqual('EF');
    expect(result[0].city).toEqual('Erfurt');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Check that all stations are returned
    const cities = result.map(station => station.city);
    expect(cities).toContain('Erfurt');
    expect(cities).toContain('Leipzig');
    expect(cities).toContain('Berlin');
  });

  it('should return stations with correct data types', async () => {
    await db.insert(stationsTable)
      .values({
        name: 'Test Station',
        code: 'TS',
        city: 'Test City'
      })
      .execute();

    const result = await getStations();

    expect(result).toHaveLength(1);
    const station = result[0];
    
    expect(typeof station.id).toBe('number');
    expect(typeof station.name).toBe('string');
    expect(typeof station.code).toBe('string');
    expect(typeof station.city).toBe('string');
    expect(station.created_at).toBeInstanceOf(Date);
  });
});
