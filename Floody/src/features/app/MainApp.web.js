import AppShell from '../../components/layout/AppShell.web';
import DashboardScreen from './DashboardScreen.web';
import MapScreen from './MapScreen.web';
import VehiclesScreen from './VehiclesScreen.web';
import { useState, useEffect, useRef } from 'react';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../../../App.css';
import { env } from '../../config/env';
import { createReport, listReports, subscribeToReports, updateReportStatus } from '../../features/reports/services/reportService';
import ReportFormScreen from '../../features/reports/screens/ReportFormScreen';
import ModerationScreen from '../../features/reports/screens/ModerationScreen';
import { createVehicle, listFavoriteReportIds, listVehicles, setFavoriteReport } from '../../features/profile/services/userDataService';
import { getCurrentPrecipitation, WEATHER_REFRESH_MS } from '../../features/dashboard/services/weatherService';
import { resolveAddress, reverseGeocode, searchAddresses } from '../../features/map/services/geocodingService';
import { webRouteGeometry } from '../map/services/webRouteGeometry';
import { getDrivingRoute } from '../../features/map/services/routingService';
import { listVehicleMakes, listVehicleModels } from '../../features/profile/services/vehicleCatalogService';

import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocation } from '../../hooks/useLocation';

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
import { LOCAL_AREA_PROFILES, normalizeText } from '../dashboard/indicators';

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
export default function MainApp({ user, onLogout, theme, onToggleTheme }) {
  const [activeTab, setActiveTab] = useState(user.tipo === 'admin' ? 'admin_reportes' : 'dashboard');
  const [isMounted, setIsMounted] = useState(false);
  const [veiculos, setVeiculos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportCoords, setReportCoords] = useState(null);
  const [loadingReportGPS, setLoadingReportGPS] = useState(false);
  const [formReporte, setFormReporte] = useState({ tipo: 'Alagamento Intransitável', descricao: '', local: '' });
  
  // Meteorologia Real e Monitoramento Global
  const [weatherReading, setWeatherReading] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [loadingApi, setLoadingApi] = useState(true);
  const [cidadeAtualNome, setCidadeAtualNome] = useState('Recife, PE');
  
  const [buscaCentralQuery, setBuscaCentralQuery] = useState('');
  const [buscaCentralSuggestions, setBuscaCentralSuggestions] = useState([]);
  const debouncedCentralQuery = useDebouncedValue(buscaCentralQuery, 700);
  const selectedCentralAddressRef = useRef('');

  // Estados de Interação e Pesquisa Dinâmica de Qualquer Rua/Região
  const [expandedZoneId, setExpandedZoneId] = useState(null);
  const [filtroApenasFavoritos, setFiltroApenasFavoritos] = useState(false);
  const [filtroTextoZona, setFiltroTextoZona] = useState('');
  
  const [favoritos, setFavoritos] = useState([]);
  
  // Mapa de Calor Toggle
  const [mapView, setMapView] = useState('flood');
  const [mapTilesUnavailable, setMapTilesUnavailable] = useState(false);
  const [routePanelCollapsed, setRoutePanelCollapsed] = useState(() => typeof window === 'undefined' || window.innerWidth < 960);
  
  // Rota e Navegação Ao Vivo
  const [origemQuery, setOrigemQuery] = useState('Recife, PE');
  const [origemCoords, setOrigemCoords] = useState([-8.05428, -34.8813]);
  const [origemSuggestions, setOrigemSuggestions] = useState([]);
  const debouncedOrigemQuery = useDebouncedValue(origemQuery, 700);
  
  const [destinoQuery, setDestinoQuery] = useState('');
  const [destinoCoords, setDestinoCoords] = useState(null);
  const [destinoSuggestions, setDestinoSuggestions] = useState([]);
  const debouncedDestinoQuery = useDebouncedValue(destinoQuery, 700);
  
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);
  
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // FIPE States
  const [marcas, setMarcas] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [catalogModels, setCatalogModels] = useState(null);
  const [marcaSelecionada, setMarcaSelecionada] = useState({ codigo: '', nome: '' });
  const currentModels = catalogModels?.make === marcaSelecionada ? catalogModels : null;
  const modelos = currentModels?.items ?? [];
  const loadingModels = Boolean(marcaSelecionada.codigo && !currentModels);
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [alturaCarro, setAlturaCarro] = useState('');

  const defaultCenter = [-8.05428, -34.8813];
  const { getCurrentLocation, watchLocation } = useLocation();

  useEffect(() => {
    if (user.tipo === 'admin' && activeTab !== 'admin_reportes') setActiveTab('admin_reportes');
    if (user.tipo !== 'admin' && activeTab === 'admin_reportes') setActiveTab('dashboard');
  }, [activeTab, user.tipo]);
  
  const weatherLocationRef = useRef({ coords: [-8.05428, -34.8813], name: 'Recife, PE' });
  const weatherRequestRef = useRef(0);

  const fetchWeatherForCoords = async (lat, lng, nomeLocal, refresh = false) => {
    const requestId = ++weatherRequestRef.current;
    const locationName = nomeLocal || weatherLocationRef.current?.name;
    weatherLocationRef.current = { coords: [lat, lng], name: locationName };
    if (!refresh) {
      setLoadingApi(true);
      setWeatherError('');
      setCidadeAtualNome(locationName);
      setWeatherReading(null);
    }
    try {
      const precipitation = await getCurrentPrecipitation(lat, lng, { withDetails: true });
      if (requestId !== weatherRequestRef.current) return;
      setWeatherReading(precipitation);
      setWeatherError('');
    } catch {
      if (requestId === weatherRequestRef.current) {
        setWeatherReading(null);
        setWeatherError('Precipitação indisponível. Tente consultar novamente.');
      }
    } finally {
      if (requestId === weatherRequestRef.current) setLoadingApi(false);
    }
  };

  useEffect(() => {
    fetchWeatherForCoords(-8.05428, -34.8813, 'Recife, PE');

    const liveTimer = setInterval(() => {
      if (!weatherLocationRef.current) return;
      const { coords, name } = weatherLocationRef.current;
      fetchWeatherForCoords(coords[0], coords[1], name, true);
    }, WEATHER_REFRESH_MS);

    return () => {
      clearInterval(liveTimer);
    };
  }, []);

  const toggleFavorito = (id, e) => {
    e.stopPropagation();
    const alreadyFavorite = favoritos.includes(id);
    setFavoriteReport(id, !alreadyFavorite)
      .then(() => setFavoritos((current) => alreadyFavorite
        ? current.filter((favoriteId) => favoriteId !== id)
        : [...current, id]))
      .catch((error) => setReportError(error.message));
  };

  const handleCentralSearch = async (e) => {
    e.preventDefault();
    if (!buscaCentralQuery || buscaCentralQuery.trim().length < 2) return;
    const query = buscaCentralQuery.trim();
    const requestId = ++weatherRequestRef.current;
    weatherLocationRef.current = null;
    setLoadingApi(true);
    setWeatherReading(null);
    setWeatherError('');
    setCidadeAtualNome(query);
    const coords = await geocodeEnderecoDireto(query);
    if (requestId !== weatherRequestRef.current) return;
    if (!coords) {
      setWeatherError('Local não encontrado ou consulta indisponível. Confira o endereço ou escolha um dos locais de Recife.');
      setLoadingApi(false);
    } else {
      fetchWeatherForCoords(...coords, query);
    }
    setBuscaCentralSuggestions([]);
  };

  const handleCentralInputChange = (texto) => {
    selectedCentralAddressRef.current = '';
    setBuscaCentralQuery(texto);
    if (texto.length < 3) setBuscaCentralSuggestions([]);
  };

  useEffect(() => {
    let active = true;
    let subscription = null;
    if (isNavigating) {
      watchLocation(setOrigemCoords)
        .then((nextSubscription) => {
          if (active) subscription = nextSubscription;
          else nextSubscription.remove();
        })
        .catch((error) => { if (active) { setIsNavigating(false); setReportError(error.message); } });
    }
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [isNavigating]);

  useEffect(() => {
    let active = true;
    const loadReports = async () => {
      try {
        const data = await listReports();
        if (active) setReportes(data);
      } catch (error) {
        if (active) setReportError(error.message);
      } finally {
        if (active) setReportLoading(false);
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
    listVehicleMakes()
      .then(data => { if (active) setMarcas(data); })
      .catch(() => { if (active) setCatalogError('Catálogo de veículos indisponível. Tente novamente mais tarde.'); });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user.id]);

  useEffect(() => {
    if (!marcaSelecionada.codigo) return;
    let active = true;
    listVehicleModels(marcaSelecionada.codigo)
      .then(items => { if (active) setCatalogModels({ make: marcaSelecionada, items }); })
      .catch(() => { if (active) setCatalogModels({ make: marcaSelecionada, error: 'Modelos indisponíveis. Selecione a marca novamente para tentar outra vez.' }); });
    return () => { active = false; };
  }, [marcaSelecionada]);

  const searchAddress = async (query, setSuggestions, signal) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const data = await searchAddresses(query, signal);
      if (!signal?.aborted) setSuggestions(data || []);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setSuggestions([]);
      }
    }
  };

  useEffect(() => {
    if (debouncedCentralQuery === selectedCentralAddressRef.current) {
      setBuscaCentralSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    searchAddress(debouncedCentralQuery, setBuscaCentralSuggestions, controller.signal);
    return () => controller.abort();
  }, [debouncedCentralQuery]);

  useEffect(() => {
    if (origemCoords) {
      setOrigemSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    searchAddress(debouncedOrigemQuery, setOrigemSuggestions, controller.signal);
    return () => controller.abort();
  }, [debouncedOrigemQuery, origemCoords]);

  useEffect(() => {
    if (destinoCoords) {
      setDestinoSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    searchAddress(debouncedDestinoQuery, setDestinoSuggestions, controller.signal);
    return () => controller.abort();
  }, [debouncedDestinoQuery, destinoCoords]);

  const geocodeEnderecoDireto = async (enderecoTexto) => {
    try {
      return await resolveAddress(enderecoTexto);
    } catch {
      return null;
    }
  };

  const handleUseGPS = () => {
    invalidateRoute();
    setReportError('');
    if (origemQuery === 'Minha Localização Atual') {
      setOrigemCoords(null);
      setOrigemQuery('');
    }
    setLoadingGPS(true);
    getCurrentLocation()
      .then((coords) => {
        setOrigemCoords(coords);
        setOrigemQuery('Minha Localização Atual');
        setOrigemSuggestions([]);
      })
      .catch((error) => setReportError(error.message))
      .finally(() => setLoadingGPS(false));
  };

  const handleBuscarRota = async (e) => {
    e.preventDefault();
    if (loadingRoute || loadingGPS) return;
    invalidateRoute();
    setReportError('');
    setLoadingRoute(true);

    let pOrigem = origemCoords;
    let pDestino = destinoCoords;

    if (!pOrigem && origemQuery) {
      pOrigem = await geocodeEnderecoDireto(origemQuery);
      if (pOrigem) setOrigemCoords(pOrigem);
    }

    if (!pDestino && destinoQuery) {
      pDestino = await geocodeEnderecoDireto(destinoQuery);
      if (pDestino) setDestinoCoords(pDestino);
    }

    if (!pOrigem || !pDestino) {
      setReportError('Informe uma origem e um destino válidos para calcular a rota.');
      setLoadingRoute(false);
      return;
    }

    try {
      const route = await getDrivingRoute(pOrigem, pDestino);
      const result = {
        positions: webRouteGeometry(route),
        distancia: `${(route.distance / 1000).toFixed(1)} km`,
        duracao: `${Math.round(route.duration / 60)} min`,
        origem: origemQuery,
        destino: destinoQuery,
      };
      setRouteInfo(result);
      setIsNavigating(origemQuery === 'Minha Localização Atual');
      // The route is ready before the optional destination estimate arrives.
      getCurrentPrecipitation(...pDestino, { withDetails: true }).catch(() => null).then(chuvaDestino => {
        setRouteInfo(current => current === result ? { ...current, chuvaDestino } : current);
      });
    } catch {
      setRouteInfo(null);
      setIsNavigating(false);
      setReportError('Não foi possível obter uma rota viária. Tente novamente mais tarde.');
    } finally {
      setLoadingRoute(false);
    }
  };

  const invalidateRoute = () => {
    setRouteInfo(null);
    setIsNavigating(false);
  };

  const handleCancelRoute = () => {
    invalidateRoute();
    setReportError('');
    setDestinoQuery('');
    setDestinoCoords(null);
  };

  const handleSaveVeiculo = (e) => {
    e.preventDefault();
    if (!marcaSelecionada.nome || !modelos.some(model => model.nome === modeloSelecionado) || !alturaCarro) return;
    createVehicle({ make: marcaSelecionada.nome, model: modeloSelecionado, ground_clearance_cm: Number(alturaCarro) })
      .then(() => listVehicles())
      .then((data) => setVeiculos(data.map((vehicle) => ({
        id: vehicle.id,
        marca: vehicle.make,
        modelo: vehicle.model,
        altura: vehicle.ground_clearance_cm,
        userId: user.id,
      }))))
      .then(() => {
        setMarcaSelecionada({ codigo: '', nome: '' });
        setModeloSelecionado('');
        setAlturaCarro('');
      })
      .catch((error) => setReportError(error.message));
  };

  const handleSaveReporte = async (e) => {
    e.preventDefault();
    setReportError('');
    if (!reportCoords) {
      setReportError('Obtenha sua localização por GPS antes de enviar o relato.');
      return;
    }
    try {
      await createReport({
        latitude: reportCoords[0],
        longitude: reportCoords[1],
        hazard_type: formReporte.tipo,
        description: formReporte.descricao.trim(),
        location_label: formReporte.local.trim(),
      });
      setReportCoords(null);
      setFormReporte({ tipo: 'Alagamento Intransitável', descricao: '', local: '' });
      setActiveTab('sucesso_reporte');
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Não foi possível registrar a ocorrência localmente.');
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
    setLoadingReportGPS(true);
    setReportCoords(null);
    setReportError('');
    getExactPosition(getCurrentLocation)
      .then(async (coords) => {
        let address = null;
        try {
          address = await reverseGeocode(coords[0], coords[1]);
        } catch {
          address = null;
        }
        setFormReporte((current) => ({
          ...current,
          local: address || `Coordenadas ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`,
        }));
        setReportCoords(coords);
        setReportError('');
      })
      .catch((error) => setReportError(error.message))
      .finally(() => setLoadingReportGPS(false));
  };

  const mapTileUrl = theme === 'dark'
    ? env.mapTilesDark
    : env.mapTilesLight;
  const preferredMapTileUrl = mapView === 'satellite' ? env.mapTilesSatellite : mapTileUrl;
  const normalizedReportError = normalizeText(reportError);
  const showReportError = reportError
    && !normalizedReportError.startsWith('servico externo indisponivel')
    && !normalizedReportError.startsWith('servico externo respondeu com erro');

  useEffect(() => {
    setMapTilesUnavailable(false);
  }, [mapView, theme]);

  const termoPesquisado = filtroTextoZona.trim().toLocaleLowerCase();
  const reportesExibidos = reportes
    .filter((report) => report.status === 'Aprovado')
    .filter((report) => !filtroApenasFavoritos || favoritos.includes(report.id))
    .filter((report) => !termoPesquisado || `${report.location_label} ${report.hazard_type} ${report.description}`.toLocaleLowerCase().includes(termoPesquisado));

  return (
    <AppShell user={user} activeTab={activeTab} onTabChange={setActiveTab} theme={theme} onToggleTheme={onToggleTheme} onLogout={onLogout}>
        <p className="local-notice">Modo local · Relatos e veículos ficam neste dispositivo.</p>
        {showReportError && <InlineAlert onDismiss={() => setReportError('')}>{reportError}</InlineAlert>}
        {activeTab === 'dashboard' && (
          <DashboardScreen weatherError={weatherError} buscaCentralQuery={buscaCentralQuery} buscaCentralSuggestions={buscaCentralSuggestions} cidadeAtualNome={cidadeAtualNome} expandedZoneId={expandedZoneId} favoritos={favoritos} fetchWeatherForCoords={fetchWeatherForCoords} filtroApenasFavoritos={filtroApenasFavoritos} filtroTextoZona={filtroTextoZona} handleCentralInputChange={handleCentralInputChange} handleCentralSearch={handleCentralSearch} loadingApi={loadingApi} nearbyAreas={LOCAL_AREA_PROFILES} weatherReading={weatherReading} reportLoading={reportLoading} reportesExibidos={reportesExibidos} selectedCentralAddressRef={selectedCentralAddressRef} setBuscaCentralQuery={setBuscaCentralQuery} setBuscaCentralSuggestions={setBuscaCentralSuggestions} setExpandedZoneId={setExpandedZoneId} setFiltroApenasFavoritos={setFiltroApenasFavoritos} setFiltroTextoZona={setFiltroTextoZona} toggleFavorito={toggleFavorito} />
        )}

        {/* MAPA COM NAVEGAÇÃO AO VIVO E MANCHAS ORGÂNICAS */}
        {activeTab === 'mapa' && (
          <MapScreen activeTab={activeTab} defaultCenter={defaultCenter} destinoCoords={destinoCoords} destinoQuery={destinoQuery} destinoSuggestions={destinoSuggestions} handleBuscarRota={handleBuscarRota} handleCancelRoute={handleCancelRoute} invalidateRoute={invalidateRoute} handleUseGPS={handleUseGPS} isMounted={isMounted} isNavigating={isNavigating} loadingGPS={loadingGPS} loadingRoute={loadingRoute} mapTilesUnavailable={mapTilesUnavailable} mapView={mapView} origemCoords={origemCoords} origemQuery={origemQuery} origemSuggestions={origemSuggestions} preferredMapTileUrl={preferredMapTileUrl} reportes={reportes} routeInfo={routeInfo} routePanelCollapsed={routePanelCollapsed} setDestinoCoords={setDestinoCoords} setDestinoQuery={setDestinoQuery} setDestinoSuggestions={setDestinoSuggestions} setMapTilesUnavailable={setMapTilesUnavailable} setMapView={setMapView} setOrigemCoords={setOrigemCoords} setOrigemQuery={setOrigemQuery} setOrigemSuggestions={setOrigemSuggestions} setRoutePanelCollapsed={setRoutePanelCollapsed} theme={theme} />
        )}

        {/* GARAGEM FIPE */}
        {activeTab === 'veiculos' && (
          <VehiclesScreen catalogError={currentModels?.error || catalogError} loadingModels={loadingModels} alturaCarro={alturaCarro} handleSaveVeiculo={handleSaveVeiculo} marcaSelecionada={marcaSelecionada} marcas={marcas} modeloSelecionado={modeloSelecionado} modelos={modelos} setAlturaCarro={setAlturaCarro} setMarcaSelecionada={setMarcaSelecionada} setModeloSelecionado={setModeloSelecionado} user={user} veiculos={veiculos} />
        )}

        {/* REPORTAR */}
        {activeTab === 'reportar' && (
          <ReportFormScreen
            form={formReporte}
            onChange={(nextForm, field) => {
              if (field === 'local') setReportCoords(null);
              setFormReporte(nextForm);
            }}
            coords={reportCoords}
            loadingGPS={loadingReportGPS}
            onGPS={handleReportGPS}
            onSubmit={handleSaveReporte}
            icons={Icons}
          />
        )}

        {/* SUCESSO */}
        {activeTab === 'sucesso_reporte' && (
          <div className="scrollable-tab confirmation-page">
            <section className="confirmation-card" aria-labelledby="report-saved-title">
              <div className="confirmation-icon" aria-hidden="true">
                <Icons.Check />
              </div>
              <h1 id="report-saved-title">Relato salvo neste dispositivo</h1>
              <p>Seu registro está com status pendente. Ele não foi publicado nem enviado a serviços de emergência.</p>
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

