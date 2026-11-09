import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

export function RouteBoundsAdjuster({ coords, centerCoords }) {
  const map = useMap();
  const lastRoute = useRef(null);
  useEffect(() => {
    // Fit a new route first. Later GPS updates may follow the moving origin.
    if (coords?.length > 1 && coords !== lastRoute.current) {
      map.fitBounds(coords, { padding: [32, 32], maxZoom: 16 });
    } else if (centerCoords) {
      map.setView(centerCoords, coords?.length ? 16 : 14, { animate: true });
    }
    lastRoute.current = coords;
  }, [coords, centerCoords, map]);
  return null;
}

export function MapViewSizeUpdater({ activeTab, mapView }) {
  const map = useMap();
  useEffect(() => {
    const resize = () => map.invalidateSize({ pan: false, debounceMoveend: true });
    const timer = setTimeout(resize, 0);
    const observer = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(resize) : null;
    observer?.observe(map.getContainer());
    window.addEventListener('resize', resize);
    return () => { clearTimeout(timer); observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [map, activeTab, mapView]);
  return null;
}
