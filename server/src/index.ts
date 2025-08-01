
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

import { roundTripSearchInputSchema } from './schema';
import { searchRoundTrip } from './handlers/search_round_trip';
import { getStations } from './handlers/get_stations';
import { getJourneysByRoute } from './handlers/get_journeys_by_route';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Main round trip search functionality
  searchRoundTrip: publicProcedure
    .input(roundTripSearchInputSchema)
    .query(({ input }) => searchRoundTrip(input)),
  
  // Get all available stations
  getStations: publicProcedure
    .query(() => getStations()),
  
  // Get journeys for a specific route and date
  getJourneysByRoute: publicProcedure
    .input(roundTripSearchInputSchema)
    .query(({ input }) => getJourneysByRoute(
      input.origin_city, 
      input.destination_city, 
      input.departure_date
    )),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Deutsche Bahn Train Finder TRPC server listening at port: ${port}`);
}

start();
