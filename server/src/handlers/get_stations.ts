
import { db } from '../db';
import { stationsTable } from '../db/schema';
import { type Station } from '../schema';

export async function getStations(): Promise<Station[]> {
  try {
    const results = await db.select()
      .from(stationsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch stations:', error);
    throw error;
  }
}
