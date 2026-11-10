import { useForeground } from '../../../hooks/useForeground';
import { useCallback, useEffect, useState } from 'react';
import { ALERT_REFRESH_MS, getAlertFeed, selectAlerts } from '../services/alertService';

export function useOfficialAlerts(scope) {
  const [feed, setFeed] = useState({ snapshot: null, error: null, loading: true });
  const [clock, setClock] = useState(Date.now());
  const [revision, setRevision] = useState(0);
  const foreground = useForeground();
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!foreground) return;
    let active = true;
    let running = false;
    async function update() {
      if (running) return;
      running = true;
      setFeed(current => ({ ...current, loading: true }));
      const result = await getAlertFeed();
      if (active) { setClock(Date.now()); setFeed({ ...result, loading: false }); }
      running = false;
    }
    update();
    // Recheck expiry every minute; the service limits network collection to once per 10 minutes.
    const timer = setInterval(update, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [revision, foreground]);
  const stale = Boolean(feed.snapshot && (feed.error || clock - feed.snapshot.fetchedAt >= ALERT_REFRESH_MS));
  return { ...feed, now: clock, stale, refresh, alerts: selectAlerts(feed.snapshot?.alerts || [], scope, clock) };
}
