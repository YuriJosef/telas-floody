import React from 'react';
import RiskMap from '../map/components/RiskMap.web';
import Icons from '../../components/icons/Icons';
import '../../../App.css';

export default function MapScreen({ activeTab, defaultCenter, destinoCoords, destinoQuery, destinoSuggestions, handleBuscarRota, handleCancelRoute, handleUseGPS, isMounted, isNavigating, loadingGPS, loadingRoute, mapTilesUnavailable, mapView, origemCoords, origemQuery, origemSuggestions, preferredMapTileUrl, reportes, routeCoords, routeInfo, routePanelCollapsed, setDestinoCoords, setDestinoQuery, setDestinoSuggestions, setMapTilesUnavailable, setMapView, setOrigemCoords, setOrigemQuery, setOrigemSuggestions, setRoutePanelCollapsed, theme }) {
 return (<div className="fade-in fullscreen-tab risk-map-screen">
            <div className={`route-floating-panel ${routePanelCollapsed ? 'collapsed' : ''}`}>
              <div className="route-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><Icons.Navigation /> {routePanelCollapsed ? 'Navegação' : 'Planejar rota'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {routeInfo && !routePanelCollapsed && (
                    <button
                      type="button"
                      onClick={handleCancelRoute}
                      className="route-panel-action"
                      title="Cancelar rota atual"
                    >
                      <Icons.Close /> Cancelar
                    </button>
                  )}
                  <button
                    type="button"
                    className="route-panel-collapse"
                    onClick={() => setRoutePanelCollapsed((collapsed) => !collapsed)}
                    aria-expanded={!routePanelCollapsed}
                    aria-label={routePanelCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
                    title={routePanelCollapsed ? 'Expandir navegação' : 'Recolher navegação'}
                  >
                    {routePanelCollapsed ? <Icons.ChevronDown /> : <Icons.ChevronUp />}
                  </button>
                </div>
              </div>
              {!routePanelCollapsed && (
                <>
              <p className="local-notice">A rota não considera alagamentos nem garante passagem segura.</p>
              <form onSubmit={handleBuscarRota} className="route-inputs">
                <div className="search-box-group">
                  <div className="search-box-header">
                    <span className="search-label">Ponto de Partida:</span>
                    <button type="button" onClick={handleUseGPS} className="btn-gps-inline" disabled={loadingGPS}>
                      <Icons.Gps /> {loadingGPS ? 'Obtendo...' : 'Usar GPS'}
                    </button>
                  </div>
                  <div className="route-input-field">
                    <Icons.Search />
                    <input
                      type="text"
                      aria-label="Endereço de origem" placeholder="Digite rua, beco ou cidade..."
                      value={origemQuery}
                      onChange={(e) => {
                        setOrigemQuery(e.target.value);
                        setOrigemCoords(null);
                      }}
                    />
                  </div>
                  {origemSuggestions.length > 0 && (
                    <div className="suggestions-dropdown">
                      {origemSuggestions.map((s, idx) => (
                        <div key={idx} className="suggestion-item" onClick={() => {
                          setOrigemQuery(s.display_name);
                          setOrigemCoords([parseFloat(s.lat), parseFloat(s.lon)]);
                          setOrigemSuggestions([]);
                        }}>
                          {s.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="search-box-group">
                  <span className="search-label">Destino:</span>
                  <div className="route-input-field">
                    <Icons.Search />
                    <input
                      type="text"
                      aria-label="Endereço de destino" placeholder="Informe rua, bairro e cidade"
                      value={destinoQuery}
                      onChange={(e) => {
                        setDestinoQuery(e.target.value);
                        setDestinoCoords(null);
                      }}
                    />
                  </div>
                  {destinoSuggestions.length > 0 && (
                    <div className="suggestions-dropdown">
                      {destinoSuggestions.map((s, idx) => (
                        <div key={idx} className="suggestion-item" onClick={() => {
                          setDestinoQuery(s.display_name);
                          setDestinoCoords([parseFloat(s.lat), parseFloat(s.lon)]);
                          setDestinoSuggestions([]);
                        }}>
                          {s.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loadingRoute} className="btn-primary btn-route-search">
                  {loadingRoute ? 'Calculando Trajeto...' : 'Calcular rota'}
                </button>
              </form>

              {routeInfo && (
                <div className="route-info-box">
                  <div className="route-info-row">
                    <span>Distância Total:</span>
                    <strong>{routeInfo.distancia}</strong>
                  </div>
                  <div className="route-info-row">
                    <span>Tempo Estimado:</span>
                    <strong>{routeInfo.duracao}</strong>
                  </div>
                  <div className="route-info-row">
                    <span>Chuva no Destino:</span>
                    <strong>{routeInfo.chuvaDestino}</strong>
                  </div>
                  <div className="route-info-row" style={{ marginTop: '14px' }}>
                    <span>Status na Pista:</span>
                    <span className="route-info-tag" style={{ background: routeInfo.bgRisco }}>
                      {routeInfo.statusRisco}
                    </span>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.75rem', color: 'var(--success)', textAlign: 'center', fontWeight: 'bold' }}>
                    🟢 Navegação em tempo real ativa (Acompanhando deslocamento)
                  </div>
                </div>
              )}
                </>
              )}
            </div>

            <div className="heatmap-controls-overlay" role="group" aria-label="Camadas do mapa">
              <button type="button" aria-pressed={mapView === 'flood'} className={mapView === 'flood' ? 'active' : ''} onClick={() => setMapView('flood')}>
                <Icons.Flame /> Relatos de alagamento
              </button>
              <button type="button" aria-pressed={mapView === 'streets'} className={mapView === 'streets' ? 'active' : ''} onClick={() => setMapView('streets')}>
                Visão Ruas
              </button>
              <button type="button" aria-pressed={mapView === 'satellite'} className={mapView === 'satellite' ? 'active' : ''} onClick={() => setMapView('satellite')}>
                Visão Satélite
              </button>
            </div>

            <div className="map-container-box">
              {isMounted ? <RiskMap center={defaultCenter} origin={origemCoords} destination={destinoCoords} originLabel={origemQuery} destinationLabel={destinoQuery} route={routeCoords} reports={reportes} mapView={mapView} tileUrl={preferredMapTileUrl} tilesUnavailable={mapTilesUnavailable} onTileError={() => setMapTilesUnavailable(true)} activeTab={activeTab} /> : <div className="map-loading-placeholder" role="status">Carregando mapa…</div>}

            </div>
          </div>);
}
