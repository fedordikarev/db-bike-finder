
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Bike, Clock, Euro, Train } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useState, useCallback } from 'react';
import type { RoundTripResult, RoundTripSearchInput, JourneyWithDetails } from '../../server/src/schema';

function App() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchResults, setSearchResults] = useState<RoundTripResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    setSearchPerformed(true);
    try {
      const searchInput: RoundTripSearchInput = {
        departure_date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD format
        origin_city: 'Erfurt',
        destination_city: 'Leipzig',
        return_delay_hours: 4
      };

      const result = await trpc.searchRoundTrip.query(searchInput);
      setSearchResults(result);
    } catch (error) {
      console.error('Failed to search trains:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  const formatPrice = (priceInCents: number) => {
    return `€${(priceInCents / 100).toFixed(2)}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const JourneyCard = ({ journey }: { journey: JourneyWithDetails }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Train className="h-5 w-5" />
              {journey.train_type} {journey.train_number}
            </CardTitle>
            <CardDescription>
              {journey.origin_station_name} → {journey.destination_station_name}
            </CardDescription>
          </div>
          <Badge variant={journey.has_bicycle_space ? "default" : "secondary"}>
            <Bike className="h-3 w-3 mr-1" />
            {journey.has_bicycle_space ? 'Bike Space' : 'No Bike Space'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {formatTime(journey.departure_time)} - {formatTime(journey.arrival_time)}
              </div>
              <div className="text-muted-foreground">
                {formatDuration(journey.duration_minutes)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{formatPrice(journey.price_cents)}</div>
              <div className="text-muted-foreground">Standard</div>
            </div>
          </div>

          {journey.has_bicycle_space && (
            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-green-600" />
              <div>
                <div className="font-medium text-green-600">
                  {formatPrice(journey.bicycle_price_cents)}
                </div>
                <div className="text-muted-foreground">
                  {journey.bicycle_spaces_available} spaces
                </div>
              </div>
            </div>
          )}

          {journey.bicycle_reservation_required && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <div className="text-sm text-orange-600">
                Reservation Required
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚆 Deutsche Bahn Round Trip Finder
          </h1>
          <p className="text-lg text-gray-600">
            Find trains with bicycle space between Erfurt and Leipzig
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Search Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="h-5 w-5" />
                Select Your Travel Date
              </CardTitle>
              <CardDescription>
                Choose your departure date for the round trip from Erfurt to Leipzig
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    <p><strong>Route:</strong> Erfurt ↔ Leipzig</p>
                    <p><strong>Return delay:</strong> 4 hours after arrival</p>
                    <p><strong>Focus:</strong> Trains with bicycle space</p>
                  </div>
                  <Button 
                    onClick={handleSearch}
                    disabled={!selectedDate || isLoading}
                    size="lg"
                    className="w-full md:w-auto"
                  >
                    {isLoading ? 'Searching...' : '🔍 Search Trains'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {searchPerformed && (
            <div className="space-y-6">
              {searchResults && searchResults.outbound_journeys.length > 0 ? (
                <>
                  {/* Outbound Journeys */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">
                        🚀 Outbound: Erfurt → Leipzig
                      </CardTitle>
                      <CardDescription>
                        Departure on {new Date(searchResults.search_date).toLocaleDateString('en-GB')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {searchResults.outbound_journeys.map((journey: JourneyWithDetails) => (
                        <JourneyCard 
                          key={journey.id} 
                          journey={journey} 
                        />
                      ))}
                    </CardContent>
                  </Card>

                  <Separator />

                  {/* Return Journeys */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">
                        🏠 Return: Leipzig → Erfurt
                      </CardTitle>
                      <CardDescription>
                        Departure approximately 4 hours after arrival in Leipzig
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {searchResults.return_journeys.length > 0 ? (
                        searchResults.return_journeys.map((journey: JourneyWithDetails) => (
                          <JourneyCard 
                            key={journey.id} 
                            journey={journey} 
                          />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p>No return journeys found for the selected criteria.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🚧</div>
                      <h3 className="text-lg font-semibold mb-2">
                        Search functionality is currently under development
                      </h3>
                      <p className="text-gray-600 mb-4">
                        The backend search handler is not yet implemented. This demo shows the UI design 
                        for displaying Deutsche Bahn train search results with bicycle space information.
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left max-w-md mx-auto">
                        <h4 className="font-medium text-amber-800 mb-2">Expected Features:</h4>
                        <ul className="text-sm text-amber-700 space-y-1">
                          <li>• Outbound trains from Erfurt to Leipzig</li>
                          <li>• Return trains with 4-hour delay</li>
                          <li>• Bicycle space availability</li>
                          <li>• Price information for tickets and bikes</li>
                          <li>• Train types (ICE, IC, RE)</li>
                          <li>• Reservation requirements</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
