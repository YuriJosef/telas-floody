import React from 'react';
import AddressAutocomplete, { GeoapifyAttribution } from '../map/components/AddressAutocomplete.web';
import RiskMap from '../map/components/RiskMap.web';
import { usePrecipitationDetails } from '../dashboard/hooks/usePrecipitationDetails';
import { MAP_CREDITS_URL, MAP_CORRECTION_URL } from '../map/services/tileSource';
import Icons from '../../components/icons/Icons';

const EMPTY_ROUTE = [];

export default function MapScreen({ activeTab, defaultCenter, destinoCoords, destinoQuery, handleBuscarRota, handleCancelRoute, invalidateRoute, handleUseGPS, isMounted, isNavigating, trackingActive, onToggleTracking, satelliteFallback, loadingGPS, loadingRoute, mapTilesUnavailable, mapView, origemCoords, origemQuery, preferredMapTileUrl, reportes, routeInfo, routePanelCollapsed, setDestinoCoords, setDestinoQuery, onTileFailure, setMapView, setOrigemCoords, setOrigemQuery, setRoutePanelCollapsed, theme }) {
  const busy = loadingRoute || loadingGPS;
  const currentRoute = !loadingRoute && routeInfo?.positions.length > 1 && routeInfo.origem === origemQuery && routeInfo.destino === destinoQuery;
  const rain = currentRoute ? routeInfo.chuvaDestino : null;
  const rainDetails = usePrecipitationDetails(rain);
  return (
    <div className="scrollable-tab map-page">
      <header className="page-heading compact"><h1>Mapa e rotas</h1><p>Explore o mapa e planeje seu deslocamento.</p></header>
      <div className="map-layout">
        <section className="map-stage" aria-label="Mapa e camadas">
          <div className="map-layers" role="group" aria-label="Camadas do mapa">
            {[['flood', 'Relatos locais'], ['streets', 'Ruas'], ['satellite', 'Satélite']].map(([id, label]) =>
              <button key={id} aria-pressed={mapView === id} onClick={() => setMapView(id)}>{label}</button>)}
          </div>
          <div className="map-container-box">
            {isMounted ? <RiskMap center={defaultCenter} origin={origemCoords} destination={destinoCoords} originLabel={origemQuery} destinationLabel={destinoQuery} route={currentRoute ? routeInfo.positions : EMPTY_ROUTE} reports={reportes} mapView={mapView} tileUrl={preferredMapTileUrl} tilesUnavailable={mapTilesUnavailable} onTileError={onTileFailure} activeTab={activeTab} /> : <p role="status">Carregando mapa…</p>}
          </div>
          {satelliteFallback && <p className="map-caption" role="status">Satélite indisponível. Exibindo mapa de ruas.</p>}
          <p className="map-caption">Exibe registros locais aprovados. Áreas sem marcações também podem apresentar risco.</p>
        </section>
        <section className="surface route-panel" aria-label="Planejamento de rota">
          <button className="planner-toggle" aria-expanded={!routePanelCollapsed} aria-controls="route-planner" onClick={() => setRoutePanelCollapsed(!routePanelCollapsed)}><Icons.Navigation /> Planejar rota {routePanelCollapsed ? <Icons.ChevronDown /> : <Icons.ChevronUp />}</button>
          {(routeInfo || isNavigating) && <button className="btn-action-secondary" disabled={busy} onClick={handleCancelRoute}>Limpar rota</button>}
          {!routePanelCollapsed && <div id="route-planner" className="stack">
            <p className="route-caution">A rota não considera alagamentos nem garante passagem segura.</p>
            <form onSubmit={handleBuscarRota} className="stack">
              <AddressAutocomplete label="Origem" inputLabel="Endereço de origem" placeholder="Rua, bairro e cidade"
                value={origemQuery} readOnly={busy} selected={Boolean(origemCoords)}
                onChange={value => { invalidateRoute(); setOrigemQuery(value); setOrigemCoords(null); }}
                onSelect={address => { invalidateRoute(); setOrigemQuery(address.display_name); setOrigemCoords([address.lat, address.lon]); }} />
              <button className="btn-action-secondary" type="button" disabled={busy} onClick={handleUseGPS}><Icons.Gps /> {loadingGPS ? 'Obtendo localização…' : 'Usar minha localização'}</button>
              {origemCoords && origemQuery === 'Minha Localização Atual' && <p className="caption">Posição obtida para a origem.</p>}
              <AddressAutocomplete label="Destino" inputLabel="Endereço de destino" placeholder="Para onde você vai?"
                value={destinoQuery} readOnly={busy} selected={Boolean(destinoCoords)}
                onChange={value => { invalidateRoute(); setDestinoQuery(value); setDestinoCoords(null); }}
                onSelect={address => { invalidateRoute(); setDestinoQuery(address.display_name); setDestinoCoords([address.lat, address.lon]); }} />
              <button className="btn-primary" disabled={busy}>{loadingRoute ? 'Calculando…' : 'Calcular rota'}</button>
              <GeoapifyAttribution />
              <p className="caption">Origem e destino são enviados ao serviço de rotas para calcular o traçado.</p>
            </form>
            {currentRoute && routeInfo.usesGPS && <div className="stack">
              <button type="button" className="btn-action-secondary" aria-pressed={isNavigating} onClick={onToggleTracking}>
                {isNavigating ? 'Parar acompanhamento' : 'Acompanhar posição'}
              </button>
              <p className="caption" role="status">{trackingActive ? 'Acompanhando sua posição neste mapa. O traçado não é recalculado.' : isNavigating ? 'Iniciando acompanhamento…' : 'Acompanhamento de posição desativado.'}</p>
            </div>}
            <div aria-live="polite">
              {currentRoute && <section className="route-result"><h2>Rota calculada</h2><dl><div><dt>Distância</dt><dd>{routeInfo.distancia}</dd></div><div><dt>Tempo estimado</dt><dd>{routeInfo.duracao}</dd></div></dl><p className="caption">Precipitação modelada no destino (<a href="https://open-meteo.com/">Open-Meteo</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>) · {rain ? rain.amountMm.toLocaleString('pt-BR') + ' mm' : rain === undefined ? 'Consultando…' : 'Indisponível'}</p>{rainDetails && <p className="caption">Acumulado em {rainDetails.period} · <time dateTime={new Date(rain.validAt).toISOString()}>{rainDetails.time}</time> (Recife){rainDetails.stale ? ' · estimativa desatualizada' : ''}</p>}<p className="caption">Traçado do <a href="https://project-osrm.org/">OSRM</a> · <a href={MAP_CREDITS_URL}>© OpenStreetMap</a> · <a href={MAP_CORRECTION_URL}>Corrigir mapa</a>. Sem orientação curva a curva.</p></section>}
            </div>
          </div>}
        </section>
      </div>
    </div>
  );
}
