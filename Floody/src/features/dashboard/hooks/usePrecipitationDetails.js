import { useEffect, useState } from 'react';
import { precipitationDetails } from '../services/weatherService';

export function usePrecipitationDetails(reading) {
  const [, setRevision] = useState(0);
  useEffect(() => {
    if (!reading) return;
    const untilStale = reading.validAt + reading.intervalSeconds * 2000 - Date.now();
    if (untilStale <= 0) return;
    const timer = setTimeout(() => setRevision(value => value + 1), untilStale + 1);
    return () => clearTimeout(timer);
  }, [reading]);
  return reading ? precipitationDetails(reading) : null;
}
