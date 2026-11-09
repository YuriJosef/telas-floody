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
import { getCurrentPrecipitation } from '../../features/dashboard/services/weatherService';
import { resolveAddress, reverseGeocode, searchAddresses } from '../../features/map/services/geocodingService';
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
import { LOCAL_AREA_PROFILES, normalizeText, findAreaProfile } from '../dashboard/indicators';

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
  const [realRain, setRealRain] = useState(null);
  const [loadingApi, setLoadingApi] = useState(true);
  const [cidadeAtualNome, setCidadeAtualNome] = useState('Recife, PE');
  const [currentCoords, setCurrentCoords] = useState([-8.05428, -34.8813]);
  
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
  const [routePanelCollapsed, setRoutePanelCollapsed] = useState(false);
  
  // Rota e Navegação Ao Vivo
  const [origemQuery, setOrigemQuery] = useState('Recife, PE');
  const [origemCoords, setOrigemCoords] = useState([-8.05428, -34.8813]);
  const [origemSuggestions, setOrigemSuggestions] = useState([]);
  const debouncedOrigemQuery = useDebouncedValue(origemQuery, 700);
  
  const [destinoQuery, setDestinoQuery] = useState('');
  const [destinoCoords, setDestinoCoords] = useState(null);
  const [destinoSuggestions, setDestinoSuggestions] = useState([]);
  const debouncedDestinoQuery = useDebouncedValue(destinoQuery, 700);
  
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);
  
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // FIPE States
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [marcaSelecionada, setMarcaSelecionada] = useState({ codigo: '', nome: '' });
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

  const fetchWeatherForCoords = async (lat, lng, nomeLocal) => {
    const requestId = ++weatherRequestRef.current;
    const locationName = nomeLocal || weatherLocationRef.current.name;
    weatherLocationRef.current = { coords: [lat, lng], name: locationName };
    setLoadingApi(true);
    setCidadeAtualNome(locationName);
    setCurrentCoords([lat, lng]);
    setRealRain(null);
    try {
      const precipitation = await getCurrentPrecipitation(lat, lng);
      if (requestId !== weatherRequestRef.current) return;
      setRealRain(precipitation);
    } catch {
      if (requestId === weatherRequestRef.current) setRealRain(null);
    } finally {
      if (requestId === weatherRequestRef.current) setLoadingApi(false);
    }
  };

  useEffect(() => {
    fetchWeatherForCoords(-8.05428, -34.8813, 'Recife, PE');

    const liveTimer = setInterval(() => {
      const { coords, name } = weatherLocationRef.current;
      fetchWeatherForCoords(coords[0], coords[1], name);
    }, 60000);

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
    const coords = await geocodeEnderecoDireto(query);
    const profile = findAreaProfile(query, currentCoords);
    fetchWeatherForCoords(
      ...(coords || profile.coords),
      query
    );
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
        .catch((error) => setReportError(error.message));
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
      .then(data => setMarcas(data))
      .catch(err => { if (active) setReportError(err.message); });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user.id]);

  useEffect(() => {
    if (marcaSelecionada.codigo) {
      listVehicleModels(marcaSelecionada.codigo)
        .then(setModelos)
        .catch(err => setReportError(err.message));
    } else {
      setModelos([]);
    }
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
      const leafCoords = route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]);
      setRouteCoords(leafCoords);
      const distKm = (route.distance / 1000).toFixed(1);
      const duracaoMin = Math.round(route.duration / 60);
      const chuvaDestino = await getCurrentPrecipitation(pDestino[0], pDestino[1]).catch(() => null);
      setRouteInfo({
        distancia: `${distKm} km`,
        duracao: `${duracaoMin} min`,
        chuvaDestino: chuvaDestino == null ? 'Indisponível' : `${chuvaDestino} mm`,
        statusRisco: 'Consulte as ocorrências aprovadas no mapa',
        bgRisco: 'var(--primary)',
        origem: origemQuery,
        destino: destinoQuery
      });
      setIsNavigating(true);
    } catch {
      setRouteCoords([]);
      setRouteInfo(null);
      setIsNavigating(false);
      setReportError('Não foi possível obter uma rota viária. Tente novamente mais tarde.');
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleCancelRoute = () => {
    setRouteCoords([]);
    setRouteInfo(null);
    setDestinoQuery('');
    setDestinoCoords(null);
    setIsNavigating(false);
  };

  const handleSaveVeiculo = (e) => {
    e.preventDefault();
    if (!marcaSelecionada.nome || !modeloSelecionado || !alturaCarro) return;
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
    getExactPosition(getCurrentLocation)
      .then(async (coords) => {
        setReportCoords(coords);
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
        setReportError('');
      })
      .catch((error) => setReportError(error.message))
      .finally(() => setLoadingReportGPS(false));
  };

  const mapTileUrl = theme === 'dark'
    ? env.mapTilesDark
    : env.mapTilesLight;
  const preferredMapTileUrl = mapView === 'satellite' ? env.mapTilesSatellite : mapTileUrl;
  const nearbyAreas = [...LOCAL_AREA_PROFILES].sort((first, second) =>
    Math.hypot(first.coords[0] - currentCoords[0], first.coords[1] - currentCoords[1])
    - Math.hypot(second.coords[0] - currentCoords[0], second.coords[1] - currentCoords[1])
  );
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
        <p className="local-notice">Modo local: relatos e veículos ficam neste dispositivo. Avisos meteorológicos são consultados no painel junto ao provedor.</p>
        {showReportError && <InlineAlert onDismiss={() => setReportError('')}>{reportError}</InlineAlert>}
        {activeTab === 'dashboard' && (
          <DashboardScreen buscaCentralQuery={buscaCentralQuery} buscaCentralSuggestions={buscaCentralSuggestions} cidadeAtualNome={cidadeAtualNome} expandedZoneId={expandedZoneId} favoritos={favoritos} fetchWeatherForCoords={fetchWeatherForCoords} filtroApenasFavoritos={filtroApenasFavoritos} filtroTextoZona={filtroTextoZona} handleCentralInputChange={handleCentralInputChange} handleCentralSearch={handleCentralSearch} loadingApi={loadingApi} nearbyAreas={nearbyAreas} realRain={realRain} reportLoading={reportLoading} reportesExibidos={reportesExibidos} selectedCentralAddressRef={selectedCentralAddressRef} setBuscaCentralQuery={setBuscaCentralQuery} setBuscaCentralSuggestions={setBuscaCentralSuggestions} setExpandedZoneId={setExpandedZoneId} setFiltroApenasFavoritos={setFiltroApenasFavoritos} setFiltroTextoZona={setFiltroTextoZona} toggleFavorito={toggleFavorito} />
        )}

        {/* MAPA COM NAVEGAÇÃO AO VIVO E MANCHAS ORGÂNICAS */}
        {activeTab === 'mapa' && (
          <MapScreen activeTab={activeTab} defaultCenter={defaultCenter} destinoCoords={destinoCoords} destinoQuery={destinoQuery} destinoSuggestions={destinoSuggestions} handleBuscarRota={handleBuscarRota} handleCancelRoute={handleCancelRoute} handleUseGPS={handleUseGPS} isMounted={isMounted} isNavigating={isNavigating} loadingGPS={loadingGPS} loadingRoute={loadingRoute} mapTilesUnavailable={mapTilesUnavailable} mapView={mapView} origemCoords={origemCoords} origemQuery={origemQuery} origemSuggestions={origemSuggestions} preferredMapTileUrl={preferredMapTileUrl} reportes={reportes} routeCoords={routeCoords} routeInfo={routeInfo} routePanelCollapsed={routePanelCollapsed} setDestinoCoords={setDestinoCoords} setDestinoQuery={setDestinoQuery} setDestinoSuggestions={setDestinoSuggestions} setMapTilesUnavailable={setMapTilesUnavailable} setMapView={setMapView} setOrigemCoords={setOrigemCoords} setOrigemQuery={setOrigemQuery} setOrigemSuggestions={setOrigemSuggestions} setRoutePanelCollapsed={setRoutePanelCollapsed} theme={theme} />
        )}

        {/* GARAGEM FIPE */}
        {activeTab === 'veiculos' && (
          <VehiclesScreen alturaCarro={alturaCarro} handleSaveVeiculo={handleSaveVeiculo} marcaSelecionada={marcaSelecionada} marcas={marcas} modeloSelecionado={modeloSelecionado} modelos={modelos} setAlturaCarro={setAlturaCarro} setMarcaSelecionada={setMarcaSelecionada} setModeloSelecionado={setModeloSelecionado} user={user} veiculos={veiculos} />
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
          <div className="fade-in scrollable-tab" style={{ textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
            <div className="form-card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
              <div style={{ color: 'var(--success)', marginBottom: '10px' }}>
                <Icons.Check />
              </div>
              <h2>Ocorrência registrada com sucesso!</h2>
              <p style={{ margin: '12px 0 24px 0', color: 'var(--text-muted)' }}>Relato salvo somente neste dispositivo, pendente de moderação.</p>
              <button className="btn-primary" onClick={() => setActiveTab('dashboard')}>Voltar à Central</button>
            </div>
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

