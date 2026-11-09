import React from 'react';
import RiskMap from '../map/components/RiskMap.web';
import { precipitationDetails } from '../dashboard/services/weatherService';
import Icons from '../../components/icons/Icons';

const EMPTY_ROUTE = [];

export default function MapScreen({ activeTab, defaultCenter, destinoCoords, destinoQuery, destinoSuggestions, handleBuscarRota, handleCancelRoute, invalidateRoute, handleUseGPS, isMounted, isNavigating, loadingGPS, loadingRoute, mapTilesUnavailable, mapView, origemCoords, origemQuery, origemSuggestions, preferredMapTileUrl, reportes, routeInfo, routePanelCollapsed, setDestinoCoords, setDestinoQuery, setDestinoSuggestions, setMapTilesUnavailable, setMapView, setOrigemCoords, setOrigemQuery, setOrigemSuggestions, setRoutePanelCollapsed, theme }) {
  const busy = loadingRoute || loadingGPS;
  const currentRoute = !loadingRoute && routeInfo?.positions.length > 1 && routeInfo.origem === origemQuery && routeInfo.destino === destinoQuery;
  const rain = currentRoute ? routeInfo.chuvaDestino : null;
  const rainDetails = rain && precipitationDetails(rain);
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
            {isMounted ? <RiskMap center={defaultCenter} origin={origemCoords} destination={destinoCoords} originLabel={origemQuery} destinationLabel={destinoQuery} route={currentRoute ? routeInfo.positions : EMPTY_ROUTE} reports={reportes} mapView={mapView} tileUrl={preferredMapTileUrl} tilesUnavailable={mapTilesUnavailable} onTileError={() => setMapTilesUnavailable(true)} activeTab={activeTab} /> : <p role="status">Carregando mapa…</p>}
          </div>
          <p className="map-caption">Exibe registros locais aprovados. Áreas sem marcações também podem apresentar risco.</p>
        </section>
        <section className="surface route-panel" aria-label="Planejamento de rota">
          <button className="planner-toggle" aria-expanded={!routePanelCollapsed} aria-controls="route-planner" onClick={() => setRoutePanelCollapsed(!routePanelCollapsed)}><Icons.Navigation /> Planejar rota {routePanelCollapsed ? <Icons.ChevronDown /> : <Icons.ChevronUp />}</button>
          {(routeInfo || isNavigating) && <button className="btn-action-secondary" disabled={busy} onClick={handleCancelRoute}>Limpar rota</button>}
          {!routePanelCollapsed && <div id="route-planner" className="stack">
            <p className="route-caution">A rota não considera alagamentos nem garante passagem segura.</p>
            <form onSubmit={handleBuscarRota} className="stack">
              <label className="input-group">Origem<input aria-label="Endereço de origem" value={origemQuery} readOnly={busy} onChange={e => { invalidateRoute(); setOrigemQuery(e.target.value); setOrigemCoords(null); }} placeholder="Rua, bairro e cidade" /></label>
              <button className="btn-action-secondary" type="button" disabled={busy} onClick={handleUseGPS}><Icons.Gps /> {loadingGPS ? 'Obtendo localização…' : 'Usar minha localização'}</button>
              {origemCoords && origemQuery === 'Minha Localização Atual' && <p className="caption">Posição obtida para a origem.</p>}
              {origemSuggestions.length > 0 && <div className="suggestions-dropdown">{origemSuggestions.map((s, index) => <button className="suggestion-item" type="button" key={index} disabled={busy} onClick={() => { invalidateRoute(); setOrigemQuery(s.display_name); setOrigemCoords([Number(s.lat), Number(s.lon)]); setOrigemSuggestions([]); }}>{s.display_name}</button>)}</div>}
              <label className="input-group">Destino<input aria-label="Endereço de destino" value={destinoQuery} readOnly={busy} onChange={e => { invalidateRoute(); setDestinoQuery(e.target.value); setDestinoCoords(null); }} placeholder="Para onde você vai?" /></label>
              {destinoSuggestions.length > 0 && <div className="suggestions-dropdown">{destinoSuggestions.map((s, index) => <button className="suggestion-item" type="button" key={index} disabled={busy} onClick={() => { invalidateRoute(); setDestinoQuery(s.display_name); setDestinoCoords([Number(s.lat), Number(s.lon)]); setDestinoSuggestions([]); }}>{s.display_name}</button>)}</div>}
              <button className="btn-primary" disabled={busy}>{loadingRoute ? 'Calculando…' : 'Calcular rota'}</button>
            </form>
            <div aria-live="polite">
              {currentRoute && <section className="route-result"><h2>Rota calculada</h2><dl><div><dt>Distância</dt><dd>{routeInfo.distancia}</dd></div><div><dt>Tempo estimado</dt><dd>{routeInfo.duracao}</dd></div></dl><p className="caption">Precipitação modelada no destino (Open-Meteo) · {rain ? rain.amountMm.toLocaleString('pt-BR') + ' mm' : rain === undefined ? 'Consultando…' : 'Indisponível'}</p>{rainDetails && <p className="caption">Acumulado em {rainDetails.period} · <time dateTime={new Date(rain.validAt).toISOString()}>{rainDetails.time}</time> (Recife){rainDetails.stale ? ' · estimativa desatualizada' : ''}</p>}<p className="caption">Traçado do OSRM. Sem orientação curva a curva.</p></section>}
            </div>
          </div>}
        </section>
      </div>
    </div>
  );
}
