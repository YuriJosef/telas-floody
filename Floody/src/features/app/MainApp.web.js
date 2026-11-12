import AppShell from '../../components/layout/AppShell.web';
import DashboardScreen from './DashboardScreen.web';
import MapScreen from './MapScreen.web';
import VehiclesScreen from './VehiclesScreen.web';
import { useState, useEffect, useRef } from 'react';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../../../App.css';
import { env } from '../../config/env';
import { createReport, listReports, newSubmissionId, subscribeToReports, updateReportStatus } from '../../features/reports/services/reportService';
import { DEFAULT_HAZARD, REPORT_STATUS, submissionOutcome } from '../../features/reports/constants';
import ReportFormScreen from '../../features/reports/screens/ReportFormScreen';
import ModerationScreen from '../../features/reports/screens/ModerationScreen';
import MyReportsPanel from '../../features/reports/components/MyReportsPanel.web';
import { createVehicle, listFavoriteReportIds, listVehicles, setFavoriteReport } from '../../features/profile/services/userDataService';
import { getCurrentPrecipitation, WEATHER_REFRESH_MS } from '../../features/dashboard/services/weatherService';
import { GeocodingError, hasAddressQuery, resolveAddress, reverseGeocode } from '../../features/map/services/geocodingService';
import { tileSource } from '../map/services/tileSource';
import { getDrivingRoute } from '../../features/map/services/routingService';
import { listVehicleMakes, listVehicleModels } from '../../features/profile/services/vehicleCatalogService';

import { useLocation } from '../../hooks/useLocation';
import { useForeground } from '../../hooks/useForeground';
import { useLatestRequest } from '../../hooks/useLatestRequest';

import InlineAlert from '../../components/feedback/InlineAlert';

// Correção dos ícones padrão do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: env.mapMarkerIconRetina,
  iconUrl: env.mapMarkerIcon,
  shadowUrl: env.mapMarkerShadow,
});

// Ícones Vetoriais (SVG)

import Icons from '../../components/icons/Icons';
import { LOCAL_AREA_PROFILES } from '../dashboard/indicators';

function getExactPosition(getCurrentLocation) {
  if (typeof navigator !== 'undefined' && navigator.geolocation?.getCurrentPosition) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve([coords.latitude, coords.longitude]),
        reject,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }
  return getCurrentLocation();
}

// Componente Principal do App
export default function MainApp({ user, onLogout, theme, onToggleTheme, sessionNotice, onDismissSessionNotice }) {
  const [activeTab, setActiveTab] = useState(user.tipo === 'admin' ? 'admin_reportes' : 'dashboard');
  const [isMounted, setIsMounted] = useState(false);
  const [veiculos, setVeiculos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [reportLoading, setReportLoading] = useState(true);
  const [publishedUnavailable, setPublishedUnavailable] = useState(false);
  const [reportError, setReportError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportCoords, setReportCoords] = useState(null);
  const [loadingReportGPS, setLoadingReportGPS] = useState(false);
  const [reportLocationNotice, setReportLocationNotice] = useState('');
  const [formReporte, setFormReporte] = useState({ tipo: DEFAULT_HAZARD, descricao: '', local: '' });
  // Observation time and idempotency key of the current report; a new key whenever the content changes.
  const [reportMeta, setReportMeta] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);
  
  // Meteorologia Real e Monitoramento Global
  const [weatherReading, setWeatherReading] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [loadingApi, setLoadingApi] = useState(true);
  const [cidadeAtualNome, setCidadeAtualNome] = useState('Recife, PE');
  
  const [buscaCentralQuery, setBuscaCentralQuery] = useState('');
  const selectedCentralAddressRef = useRef(null);

  // Estados de Interação e Pesquisa Dinâmica de Qualquer Rua/Região
  const [expandedZoneId, setExpandedZoneId] = useState(null);
  const [filtroApenasFavoritos, setFiltroApenasFavoritos] = useState(false);
  const [filtroTextoZona, setFiltroTextoZona] = useState('');
  
  const [favoritos, setFavoritos] = useState([]);
  
  // Mapa de Calor Toggle
  const [mapView, setMapView] = useState('flood');
  const [mapTilesUnavailable, setMapTilesUnavailable] = useState(false);
  const [satelliteFallback, setSatelliteFallback] = useState(false);
  const [routePanelCollapsed, setRoutePanelCollapsed] = useState(() => typeof window === 'undefined' || window.innerWidth < 960);
  
  // Rota e Navegação Ao Vivo
  const [origemQuery, setOrigemQuery] = useState('Recife, PE');
  const [origemCoords, setOrigemCoords] = useState([-8.05428, -34.8813]);
  
  const [destinoQuery, setDestinoQuery] = useState('');
  const [destinoCoords, setDestinoCoords] = useState(null);
  
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // FIPE States
  const [marcas, setMarcas] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [loadingMakes, setLoadingMakes] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [catalogModels, setCatalogModels] = useState(null);
  const [marcaSelecionada, setMarcaSelecionada] = useState({ codigo: '', nome: '' });
  const currentModels = catalogModels?.make === marcaSelecionada ? catalogModels : null;
  const modelos = currentModels?.items ?? [];
  const loadingModels = Boolean(marcaSelecionada.codigo && !currentModels);
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [alturaCarro, setAlturaCarro] = useState('');

  const defaultCenter = [-8.05428, -34.8813];
  const { getCurrentLocation } = useLocation();
  const foreground = useForeground();
  const { start: startRouteRequest, cancel: cancelRouteRequest } = useLatestRequest();
  const { start: startWeatherRequest, cancel: cancelWeatherRequest } = useLatestRequest();
  const { start: startReportLocation, cancel: cancelReportLocation } = useLatestRequest();

  useEffect(() => {
    if (user.tipo === 'admin' && activeTab !== 'admin_reportes') setActiveTab('admin_reportes');
    if (user.tipo !== 'admin' && activeTab === 'admin_reportes') setActiveTab('dashboard');
  }, [activeTab, user.tipo]);
  
  const weatherLocationRef = useRef({ coords: [-8.05428, -34.8813], name: 'Recife, PE' });
  const pendingWeatherRef = useRef(null);

  const fetchWeatherForCoords = async (lat, lng, nomeLocal, refresh = false) => {
    if (refresh && pendingWeatherRef.current && !pendingWeatherRef.current.aborted) return;
    const signal = startWeatherRequest();
    pendingWeatherRef.current = signal;
    const locationName = nomeLocal || weatherLocationRef.current?.name;
    weatherLocationRef.current = { coords: [lat, lng], name: locationName };
    if (!refresh) {
      setLoadingApi(true);
      setWeatherError('');
      setCidadeAtualNome(locationName);
      setWeatherReading(null);
    }
    try {
      const precipitation = await getCurrentPrecipitation(lat, lng, { withDetails: true, signal });
      if (signal.aborted) return;
      setWeatherReading(precipitation);
      setWeatherError('');
    } catch {
      if (!signal.aborted) {
        setWeatherReading(null);
        setWeatherError('Precipitação indisponível. Tente consultar novamente.');
      }
    } finally {
      if (pendingWeatherRef.current === signal) pendingWeatherRef.current = null;
      if (!signal.aborted) setLoadingApi(false);
    }
  };

  useEffect(() => {
    if (!foreground || activeTab !== 'dashboard') return;
    const refresh = () => {
      const location = weatherLocationRef.current;
      if (location) fetchWeatherForCoords(...location.coords, location.name, true);
      else setLoadingApi(false);
    };
    refresh();
    const timer = setInterval(refresh, WEATHER_REFRESH_MS);
    return () => { clearInterval(timer); cancelWeatherRequest(); };
  }, [foreground, activeTab, cancelWeatherRequest]);

  const toggleFavorito = (id, e) => {
    e.stopPropagation();
    const alreadyFavorite = favoritos.includes(id);
    setFavoriteReport(id, !alreadyFavorite)
      .then(() => setFavoritos((current) => alreadyFavorite
        ? current.filter((favoriteId) => favoriteId !== id)
        : [...current, id]))
      .catch((error) => setReportError(error.message));
  };

  const selectCentralAddress = ({ display_name: name, lat, lon }) => {
    selectedCentralAddressRef.current = { name, coords: [lat, lon] };
    setBuscaCentralQuery(name);
    fetchWeatherForCoords(lat, lon, name);
  };

  const handleCentralSearch = async (event) => {
    event.preventDefault();
    if (loadingApi || !hasAddressQuery(buscaCentralQuery)) return;
    const query = buscaCentralQuery.trim();
    const selected = selectedCentralAddressRef.current;
    if (selected?.name === query) {
      fetchWeatherForCoords(...selected.coords, query);
      return;
    }
    const signal = startWeatherRequest();
    weatherLocationRef.current = null;
    setLoadingApi(true);
    setWeatherReading(null);
    setWeatherError('');
    setCidadeAtualNome(query);
    try {
      const coords = await resolveAddress(query, signal);
      if (signal.aborted) return;
      if (!coords) {
        setWeatherError('Local não encontrado. Confira o endereço ou escolha um dos locais de Recife.');
        setLoadingApi(false);
        return;
      }
      selectedCentralAddressRef.current = { name: query, coords };
      fetchWeatherForCoords(...coords, query);
    } catch (error) {
      if (signal.aborted) return;
      setWeatherError(error.message);
      setLoadingApi(false);
    }
  };

  const handleCentralInputChange = (text) => {
    selectedCentralAddressRef.current = null;
    setBuscaCentralQuery(text);
  };

  useEffect(() => {
    if (!foreground || activeTab !== 'mapa') {
      setIsNavigating(false);
      setTrackingActive(false);
      return;
    }
    if (!isNavigating) {
      setTrackingActive(false);
      return;
    }
    let active = true;
    const gps = navigator.geolocation;
    function stopWithError() {
      if (!active) return;
      setIsNavigating(false);
      setTrackingActive(false);
      setReportError('Não foi possível acompanhar a posição. Confira a permissão de localização.');
    }
    if (!gps) {
      stopWithError();
      return;
    }
    let id;
    try {
      id = gps.watchPosition(({ coords }) => {
        if (!active) return;
        setOrigemCoords([coords.latitude, coords.longitude]);
        setTrackingActive(true);
      }, stopWithError, { enableHighAccuracy: false, maximumAge: 15000, timeout: 15000 });
    } catch {
      stopWithError();
    }
    return () => {
      active = false;
      if (id !== undefined) gps.clearWatch(id);
    };
  }, [foreground, activeTab, isNavigating]);

  useEffect(() => {
    let active = true;
    let latest = 0; // Only the newest load may update the list; an older, slower response is dropped.
    const loadReports = async () => {
      const request = ++latest;
      try {
        const data = await listReports();
        if (active && request === latest) { setReportes(data); setPublishedUnavailable(false); }
      } catch (error) {
        if (active && request === latest) {
          setReportError(error.message);
          setPublishedUnavailable(true);
          // Nothing loaded yet: still show this device's legacy reports. A failed refresh keeps the last list.
          if (error.partial) setReportes(current => current.length ? current : error.partial);
        }
      } finally {
        if (active && request === latest) setReportLoading(false);
      }
    };

    loadReports();
    const unsubscribe = subscribeToReports(loadReports);
    listVehicles()
      .then((data) => {
        if (active) setVeiculos(data.map((vehicle) => ({
          id: vehicle.id,
          marca: vehicle.make,
          modelo: vehicle.model,
          altura: vehicle.ground_clearance_cm,
          userId: user.id,
        })));
      })
      .catch((error) => { if (active) setReportError(error.message); });
    listFavoriteReportIds()
      .then((ids) => { if (active) setFavoritos(ids); })
      .catch((error) => { if (active) setReportError(error.message); });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user.id]);

  useEffect(() => {
    if (activeTab !== 'veiculos' || marcas.length) return;
    const controller = new AbortController();
    const { signal } = controller;
    setLoadingMakes(true);
    setCatalogError('');
    listVehicleMakes(signal)
      .then(data => { if (!signal.aborted) { setMarcas(data); setLoadingMakes(false); } })
      .catch(() => { if (!signal.aborted) setCatalogError('Catálogo de veículos indisponível. Tente novamente mais tarde.'); })
      .finally(() => { if (!signal.aborted) setLoadingMakes(false); });
    return () => controller.abort();
  }, [activeTab, marcas.length]);

  useEffect(() => {
    if (activeTab !== 'veiculos' || !marcaSelecionada.codigo || currentModels?.items) return;
    const controller = new AbortController();
    const { signal } = controller;
    listVehicleModels(marcaSelecionada.codigo, signal)
      .then(items => { if (!signal.aborted) setCatalogModels({ make: marcaSelecionada, items }); })
      .catch(() => { if (!signal.aborted) setCatalogModels({ make: marcaSelecionada, error: 'Modelos indisponíveis. Selecione a marca novamente para tentar outra vez.' }); });
    return () => controller.abort();
  }, [activeTab, marcaSelecionada, currentModels?.items]);

  const handleUseGPS = () => {
    invalidateRoute();
    setReportError('');
    if (origemQuery === 'Minha Localização Atual') {
      setOrigemCoords(null);
      setOrigemQuery('');
    }
    const signal = startRouteRequest();
    setLoadingGPS(true);
    getCurrentLocation()
      .then((coords) => {
        if (signal.aborted) return;
        setOrigemCoords(coords);
        setOrigemQuery('Minha Localização Atual');
      })
      .catch(() => { if (!signal.aborted) setReportError('Não foi possível obter a posição. Confira a permissão de localização.'); })
      .finally(() => { if (!signal.aborted) setLoadingGPS(false); });
  };

  const handleBuscarRota = async (e) => {
    e.preventDefault();
    if (loadingRoute || loadingGPS) return;
    invalidateRoute();
    setReportError('');
    setLoadingRoute(true);
    const signal = startRouteRequest();

    try {
      const pOrigem = origemCoords || await resolveAddress(origemQuery, signal);
      const pDestino = destinoCoords || (pOrigem && await resolveAddress(destinoQuery, signal));
      if (signal.aborted) return;
      if (!pOrigem || !pDestino) {
        setReportError('Informe uma origem e um destino válidos para calcular a rota.');
        return;
      }
      setOrigemCoords(pOrigem);
      setDestinoCoords(pDestino);
      const route = await getDrivingRoute(pOrigem, pDestino, signal);
      if (signal.aborted) return;
      const result = {
        positions: route.positions,
        usesGPS: origemQuery === 'Minha Localização Atual',
        distancia: `${(route.distance / 1000).toFixed(1)} km`,
        duracao: `${Math.round(route.duration / 60)} min`,
        origem: origemQuery,
        destino: destinoQuery,
      };
      setRouteInfo(result);
      // The route is ready before the optional destination estimate arrives.
      getCurrentPrecipitation(...pDestino, { withDetails: true, signal }).catch(() => null).then(chuvaDestino => {
        if (!signal.aborted) setRouteInfo(current => current === result ? { ...current, chuvaDestino } : current);
      });
    } catch (error) {
      if (signal.aborted) return;
      setRouteInfo(null);
      setIsNavigating(false);
      setReportError(error instanceof GeocodingError ? error.message : 'Não foi possível obter uma rota viária. Tente novamente mais tarde.');
    } finally {
      if (!signal.aborted) setLoadingRoute(false);
    }
  };

  const invalidateRoute = () => {
    cancelRouteRequest();
    setRouteInfo(null);
    setIsNavigating(false);
  };

  const handleCancelRoute = () => {
    invalidateRoute();
    setReportError('');
    setDestinoQuery('');
    setDestinoCoords(null);
  };

  const handleTabChange = next => {
    if (activeTab === 'mapa' && next !== 'mapa') {
      cancelRouteRequest();
      setLoadingGPS(false);
      setLoadingRoute(false);
      setIsNavigating(false);
      setRouteInfo(current => current && current.chuvaDestino === undefined ? { ...current, chuvaDestino: null } : current);
    }
    if (activeTab === 'reportar' && next !== 'reportar') {
      cancelReportLocation();
      setLoadingReportGPS(false);
    }
    setActiveTab(next);
  };

  const changeMapLayer = view => {
    if (view === 'satellite' && !tileSource(env.mapTilesSatellite)) {
      setMapView('streets');
      setSatelliteFallback(true);
      setMapTilesUnavailable(false);
      return;
    }
    setMapView(view);
    setMapTilesUnavailable(false);
    setSatelliteFallback(false);
  };

  const handleTileFailure = () => {
    if (mapView === 'satellite') {
      setSatelliteFallback(true);
      setMapView('streets');
    }
    setMapTilesUnavailable(true);
  };

  const handleSaveVeiculo = async (event) => {
    event.preventDefault();
    if (savingVehicle || !marcaSelecionada.nome || !modelos.some(model => model.nome === modeloSelecionado) || !alturaCarro) return;
    setSavingVehicle(true);
    setReportError('');
    try {
      const data = await createVehicle({ make: marcaSelecionada.nome, model: modeloSelecionado, ground_clearance_cm: Number(alturaCarro) });
      setVeiculos(data.map(vehicle => ({
        id: vehicle.id, marca: vehicle.make, modelo: vehicle.model, altura: vehicle.ground_clearance_cm, userId: user.id,
      })));
      setMarcaSelecionada({ codigo: '', nome: '' });
      setModeloSelecionado('');
      setAlturaCarro('');
    } catch (error) {
      setReportError(error.message);
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleSaveReporte = async (e) => {
    e.preventDefault();
    setReportError('');
    if (user.guest) {
      setReportError('Entre com uma conta de e-mail confirmado para enviar relatos.');
      return;
    }
    if (!reportCoords || !reportMeta) {
      setReportError('Obtenha sua localização por GPS antes de enviar o relato.');
      return;
    }
    try {
      const result = await createReport({
        latitude: reportCoords[0],
        longitude: reportCoords[1],
        hazardCode: formReporte.tipo,
        description: formReporte.descricao.trim(),
        location_label: formReporte.local.trim(),
        locationSource: 'gps',
        submissionId: reportMeta.submissionId,
        observedAt: reportMeta.observedAt,
      });
      setLastSubmission(result);
      setReportCoords(null);
      setReportMeta(null);
      setFormReporte({ tipo: DEFAULT_HAZARD, descricao: '', local: '' });
      setActiveTab('sucesso_reporte');
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Não foi possível enviar o relato.');
    }
  };

  const handleReportStatus = async (reportId, status) => {
    setReportError('');
    try {
      await updateReportStatus(reportId, status);
      const updatedReports = await listReports();
      setReportes(updatedReports);
      setSelectedReport((current) => current?.id === reportId
        ? updatedReports.find((report) => report.id === reportId) ?? current
        : current);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Não foi possível atualizar a ocorrência.');
    }
  };

  const handleReportGPS = () => {
    const signal = startReportLocation();
    setLoadingReportGPS(true);
    setReportLocationNotice('');
    setReportCoords(null);
    setReportMeta(null);
    setReportError('');
    getExactPosition(getCurrentLocation)
      .then(async (coords) => {
        if (signal.aborted) return;
        let address = null;
        try {
          address = await reverseGeocode(coords[0], coords[1], signal);
        } catch (error) {
          if (!signal.aborted) setReportLocationNotice(error.message + ' As coordenadas continuam disponíveis para o relato.');
        }
        if (signal.aborted) return;
        setFormReporte((current) => ({
          ...current,
          local: address || `Coordenadas ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`,
        }));
        setReportCoords(coords);
        setReportMeta({ submissionId: newSubmissionId(), observedAt: new Date().toISOString() });
        setReportError('');
      })
      .catch(() => { if (!signal.aborted) setReportError('Não foi possível obter a posição. Confira a permissão de localização.'); })
      .finally(() => { if (!signal.aborted) setLoadingReportGPS(false); });
  };

  const mapTileUrl = theme === 'dark'
    ? env.mapTilesDark
    : env.mapTilesLight;
  const preferredMapTileUrl = mapView === 'satellite' ? env.mapTilesSatellite : mapTileUrl;
  useEffect(() => {
    setMapTilesUnavailable(false);
  }, [theme]);

  const termoPesquisado = filtroTextoZona.trim().toLocaleLowerCase();
  const reportesExibidos = reportes
    .filter((report) => report.status === REPORT_STATUS.published || report.status === REPORT_STATUS.legacyLocal)
    .filter((report) => !filtroApenasFavoritos || favoritos.includes(report.id))
    .filter((report) => !termoPesquisado || `${report.location_label} ${report.hazard_type} ${report.description}`.toLocaleLowerCase().includes(termoPesquisado));

  return (
    <AppShell user={user} activeTab={activeTab} onTabChange={handleTabChange} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout}>
        <p className="local-notice">Relatos de usuários não são verificados · Veículos e favoritos ficam neste dispositivo.</p>
        {sessionNotice && <InlineAlert onDismiss={onDismissSessionNotice}>{sessionNotice}</InlineAlert>}
        {reportError && <InlineAlert onDismiss={() => setReportError('')}>{reportError}</InlineAlert>}
        {activeTab === 'dashboard' && (
          <DashboardScreen weatherError={weatherError} publishedUnavailable={publishedUnavailable} buscaCentralQuery={buscaCentralQuery} cidadeAtualNome={cidadeAtualNome} expandedZoneId={expandedZoneId} favoritos={favoritos} filtroApenasFavoritos={filtroApenasFavoritos} filtroTextoZona={filtroTextoZona} handleCentralInputChange={handleCentralInputChange} handleCentralSearch={handleCentralSearch} loadingApi={loadingApi} nearbyAreas={LOCAL_AREA_PROFILES} weatherReading={weatherReading} reportLoading={reportLoading} reportesExibidos={reportesExibidos} centralAddressSelected={selectedCentralAddressRef.current?.name === buscaCentralQuery} onSelectAddress={selectCentralAddress} setExpandedZoneId={setExpandedZoneId} setFiltroApenasFavoritos={setFiltroApenasFavoritos} setFiltroTextoZona={setFiltroTextoZona} toggleFavorito={toggleFavorito} />
        )}

        {/* MAPA COM NAVEGAÇÃO AO VIVO E MANCHAS ORGÂNICAS */}
        {activeTab === 'mapa' && (
          <MapScreen activeTab={activeTab} defaultCenter={defaultCenter} destinoCoords={destinoCoords} destinoQuery={destinoQuery} handleBuscarRota={handleBuscarRota} handleCancelRoute={handleCancelRoute} invalidateRoute={invalidateRoute} handleUseGPS={handleUseGPS} isMounted={isMounted} isNavigating={isNavigating} trackingActive={trackingActive} onToggleTracking={() => setIsNavigating(value => !value)} satelliteFallback={satelliteFallback} loadingGPS={loadingGPS} loadingRoute={loadingRoute} mapTilesUnavailable={mapTilesUnavailable} mapView={mapView} origemCoords={origemCoords} origemQuery={origemQuery} preferredMapTileUrl={preferredMapTileUrl} reportes={reportes} routeInfo={routeInfo} routePanelCollapsed={routePanelCollapsed} setDestinoCoords={setDestinoCoords} setDestinoQuery={setDestinoQuery} onTileFailure={handleTileFailure} setMapView={changeMapLayer} setOrigemCoords={setOrigemCoords} setOrigemQuery={setOrigemQuery} setRoutePanelCollapsed={setRoutePanelCollapsed} theme={theme} />
        )}

        {/* GARAGEM FIPE */}
        {activeTab === 'veiculos' && (
          <VehiclesScreen catalogError={currentModels?.error || catalogError} loadingModels={loadingModels} loadingMakes={loadingMakes} savingVehicle={savingVehicle} alturaCarro={alturaCarro} handleSaveVeiculo={handleSaveVeiculo} marcaSelecionada={marcaSelecionada} marcas={marcas} modeloSelecionado={modeloSelecionado} modelos={modelos} setAlturaCarro={setAlturaCarro} setMarcaSelecionada={setMarcaSelecionada} setModeloSelecionado={setModeloSelecionado} user={user} veiculos={veiculos} />
        )}

        {/* REPORTAR */}
        {activeTab === 'reportar' && (
          <ReportFormScreen
            form={formReporte}
            onChange={(nextForm, field) => {
              if (field === 'local') { setReportCoords(null); setReportMeta(null); }
              else setReportMeta(meta => meta && { ...meta, submissionId: newSubmissionId() });
              setFormReporte(nextForm);
            }}
            canSubmit={!user.guest}
            onSignIn={onLogout}
            coords={reportCoords}
            loadingGPS={loadingReportGPS}
            locationNotice={reportLocationNotice}
            onGPS={handleReportGPS}
            onSubmit={handleSaveReporte}
            icons={Icons}
          ><MyReportsPanel user={user} /></ReportFormScreen>
        )}

        {/* SUCESSO */}
        {activeTab === 'sucesso_reporte' && (
          <div className="scrollable-tab confirmation-page">
            <section className="confirmation-card" aria-labelledby="report-saved-title">
              <div className="confirmation-icon" aria-hidden="true">
                <Icons.Check />
              </div>
              <h1 id="report-saved-title">{submissionOutcome(lastSubmission?.status).title}</h1>
              <p>{submissionOutcome(lastSubmission?.status).body}</p>
              <button className="btn-primary" onClick={() => setActiveTab('dashboard')}>Voltar ao painel</button>
            </section>
          </div>
        )}

        {/* ADMIN */}
        {activeTab === 'admin_reportes' && (
          <ModerationScreen
            reports={reportes}
            loading={reportLoading}
            selectedReport={selectedReport}
            onSelect={setSelectedReport}
            onClose={() => setSelectedReport(null)}
            onStatusChange={handleReportStatus}
          />
        )}
    </AppShell>
  );
}

