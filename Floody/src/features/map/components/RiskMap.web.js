import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, ZoomControl } from 'react-leaflet';
import { env } from '../../../config/env';
import { classifyHazard } from '../../dashboard/indicators';
import { formatDateTime } from '../../../utils/formatters';
import { MapViewSizeUpdater, RouteBoundsAdjuster } from './MapEffects';
import { OPEN_MAP_TILES, tileSource } from '../services/tileSource';

export default function RiskMap({ center, origin, destination, originLabel, destinationLabel, route, reports, mapView, tileUrl, tilesUnavailable, onTileError, activeTab }) {
  const [tileFailure, setTileFailure] = useState(false);
  const preferred = tileSource(tileUrl);
  const fallback = tileSource(env.mapTilesLight) || tileSource(OPEN_MAP_TILES);
  const source = tilesUnavailable || !preferred ? fallback : preferred;
  const visibleReports = reports.filter(report => report.status === 'Aprovado'
    && Number.isFinite(report.latitude) && Number.isFinite(report.longitude)
    && Math.abs(report.latitude) <= 90 && Math.abs(report.longitude) <= 180
    && (mapView !== 'flood' || classifyHazard(report) === 'flood'));
  return <><MapContainer zoomAnimation={false} fadeAnimation={false} center={center} zoom={13} minZoom={2} maxZoom={19} zoomControl={false} className="risk-leaflet-map" aria-label="Mapa de risco e rota">
    <TileLayer key={source.url} url={source.url} attribution={source.attribution}
      eventHandlers={{ tileerror: () => {
        setTileFailure(true);
        if (!tilesUnavailable && (mapView === 'satellite' || source.url !== fallback.url)) onTileError();
      }, tileload: () => setTileFailure(false) }} />
    <ZoomControl position="bottomright" />
    <MapViewSizeUpdater activeTab={activeTab} mapView={mapView} />
    <RouteBoundsAdjuster coords={route} centerCoords={origin} />
    {origin && <CircleMarker center={origin} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}><Popup>Origem: {originLabel}</Popup></CircleMarker>}
    {destination && <CircleMarker center={destination} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#dc2626', fillOpacity: 1 }}><Popup>Destino: {destinationLabel}</Popup></CircleMarker>}
    {route.length > 1 && <Polyline positions={route} className="floody-route-line" pathOptions={{ color: '#2563eb', weight: 6, opacity: 0.9 }} />}
    {visibleReports.map(report => <CircleMarker key={report.id} className="floody-report-marker" center={[report.latitude, report.longitude]} radius={10} pathOptions={{ color: '#fff', weight: 2, fillColor: classifyHazard(report) === 'flood' ? '#dc2626' : '#d97706', fillOpacity: 0.9 }}><Popup><strong>{report.location_label}</strong><br />{report.hazard_type}<br />{report.description}<br />{formatDateTime(report.occurred_at)}</Popup></CircleMarker>)}
  </MapContainer>{tileFailure && <p className="map-error" role="status">Mapa parcialmente ou totalmente indisponível. Verifique sua conexão.</p>}</>;
}
