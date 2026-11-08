import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Popup, Polyline, Marker, Circle, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';
import { env } from './src/config/env';
import { createReport, listLocalReports, listReports, subscribeToReports, updateReportStatus } from './src/features/reports/services/reportService';
import ReportFormScreen from './src/features/reports/screens/ReportFormScreen';
import ModerationScreen from './src/features/reports/screens/ModerationScreen';
import { createVehicle, listFavoriteReportIds, listVehicles, setFavoriteReport } from './src/features/profile/services/userDataService';
import { getCurrentPrecipitation } from './src/features/dashboard/services/weatherService';
import { resolveAddress, reverseGeocode, searchAddresses } from './src/features/map/services/geocodingService';
import { getDrivingRoute } from './src/features/map/services/routingService';
import { listVehicleMakes, listVehicleModels } from './src/features/profile/services/vehicleCatalogService';
import { buildUrl } from './src/services/api/externalClient';
import { useDebouncedValue } from './src/hooks/useDebouncedValue';
import { useLocation } from './src/hooks/useLocation';
import { storage } from './src/services/storage/storage';
import { AuthProvider, useAuth } from './src/store/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import InlineAlert from './src/components/feedback/InlineAlert';
import { formatDateTime } from './src/utils/formatters';

// Correção dos ícones padrão do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: env.mapMarkerIconRetina,
  iconUrl: env.mapMarkerIcon,
  shadowUrl: env.mapMarkerShadow,
});

// Ícones Vetoriais (SVG)
const Icons = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9"></rect>
      <rect x="14" y="3" width="7" height="5"></rect>
      <rect x="14" y="12" width="7" height="9"></rect>
      <rect x="3" y="16" width="7" height="5"></rect>
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
  ),
  Car: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.91-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
      <circle cx="7" cy="17" r="2"></circle>
      <circle cx="17" cy="17" r="2"></circle>
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  ),
  Navigation: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
    </svg>
  ),
  Flame: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6.5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
    </svg>
  ),
  Gps: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="12 8 8 12 12 16 12 8"></polygon>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  Star: ({ filled }) => (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke={filled ? "#f59e0b" : "var(--text-main)"} fill={filled ? "#f59e0b" : "none"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  ),
  ChevronUp: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  )
};

const LOCAL_AREA_PROFILES = [
  { name: 'Recife Antigo', coords: [-8.0631, -34.8711], floodRisk: 72, rain: 14.2, traffic: 68, works: 1, hazards: 2, floodAlerts: 3, trafficAlerts: 2 },
  { name: 'Av. Agamenon Magalhães', coords: [-8.0475, -34.8969], floodRisk: 56, rain: 13.6, traffic: 82, works: 2, hazards: 3, floodAlerts: 2, trafficAlerts: 4 },
  { name: 'Boa Viagem', coords: [-8.1191, -34.8964], floodRisk: 41, rain: 10.8, traffic: 55, works: 1, hazards: 1, floodAlerts: 1, trafficAlerts: 2 },
  { name: 'Centro', coords: [-8.0607, -34.8811], floodRisk: 64, rain: 12.4, traffic: 71, works: 0, hazards: 4, floodAlerts: 2, trafficAlerts: 3 },
];

const DEMO_HEAT_SPOTS = [
  { name: 'Recife Antigo', coords: [-8.0631, -34.8711], risk: 'high' },
  { name: 'Centro', coords: [-8.0607, -34.8811], risk: 'medium' },
  { name: 'Av. Agamenon Magalhães', coords: [-8.0475, -34.8969], risk: 'medium' },
  { name: 'Boa Viagem', coords: [-8.1191, -34.8964], risk: 'low' },
  { name: 'Imbiribeira', coords: [-8.116, -34.909], risk: 'medium' },
  { name: 'Olinda', coords: [-8.0089, -34.8553], risk: 'low' },
  { name: 'Jaboatão dos Guararapes', coords: [-8.112, -34.937], risk: 'medium' },
];

const DEMO_STREET_INCIDENTS = [
  { name: 'Trânsito intenso · Av. Agamenon Magalhães', kind: 'traffic', road: 'Av. Agamenon Magalhães', coords: [-8.05235, -34.8978], detail: 'Retenção simulada no corredor da Agamenon Magalhães.' },
  { name: 'Obra ativa · Av. Caxangá', kind: 'works', road: 'Av. Caxangá', coords: [-8.027, -34.9425], detail: 'Obra demonstrativa com possível impacto na circulação.' },
  { name: 'Buraco reportado · Av. Boa Viagem', kind: 'hazard', road: 'Av. Boa Viagem', coords: [-8.1265, -34.9004], detail: 'Perigo viário demonstrativo próximo à orla.' },
  { name: 'Trânsito lento · Av. Recife', kind: 'traffic', road: 'Av. Recife', coords: [-8.1052, -34.924], detail: 'Retenção simulada na Av. Recife.' },
  { name: 'Interdição parcial · Centro', kind: 'works', road: 'Centro', coords: [-8.0607, -34.8811], detail: 'Interdição demonstrativa no Centro do Recife.' },
];

const DEMO_STREET_ROADS = [
  {
    name: 'Av. Agamenon Magalhães',
    positions: [
      [-8.0215, -34.8972], [-8.029, -34.8977], [-8.037, -34.898], [-8.045, -34.898],
      [-8.05235, -34.8978], [-8.06, -34.897], [-8.068, -34.8955], [-8.076, -34.893],
    ],
  },
  {
    name: 'Av. Caxangá',
    positions: [
      [-8.027, -34.9425], [-8.035, -34.936], [-8.041, -34.928], [-8.046, -34.919],
      [-8.05, -34.91], [-8.053, -34.901], [-8.056, -34.892],
    ],
  },
  {
    name: 'Av. Boa Viagem',
    positions: [
      [-8.092, -34.884], [-8.1, -34.887], [-8.108, -34.89], [-8.116, -34.894],
      [-8.1265, -34.9004], [-8.136, -34.904], [-8.146, -34.907],
    ],
  },
  {
    name: 'Av. Recife',
    positions: [
      [-8.083, -34.925], [-8.091, -34.9245], [-8.099, -34.924], [-8.1052, -34.924],
      [-8.113, -34.923], [-8.121, -34.921],
    ],
  },
];

function normalizeText(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

function classifyHazard(report) {
  const text = normalizeText(`${report.hazard_type} ${report.description}`);
  if (/alag|enchent|intransitavel|acumulo/.test(text)) return 'flood';
  if (/transito|congestion|retencao/.test(text)) return 'traffic';
  if (/obra|interdicao/.test(text)) return 'works';
  return 'hazard';
}

function findAreaProfile(name, coords) {
  const normalizedName = normalizeText(name);
  const matchedProfile = LOCAL_AREA_PROFILES.find((profile) =>
    normalizedName.includes(normalizeText(profile.name))
    || normalizeText(profile.name).includes(normalizedName)
  );
  if (matchedProfile) return matchedProfile;

  return LOCAL_AREA_PROFILES.reduce((closest, profile) => {
    const distance = Math.hypot(profile.coords[0] - coords[0], profile.coords[1] - coords[1]);
    const closestDistance = Math.hypot(closest.coords[0] - coords[0], closest.coords[1] - coords[1]);
    return distance < closestDistance ? profile : closest;
  }, LOCAL_AREA_PROFILES[0]);
}

function getAreaIndicators(name, coords, reports, demoRain, realRain) {
  const profile = findAreaProfile(name, coords);
  const nearbyReports = reports.filter((report) =>
    report.status === 'Aprovado'
    && Math.abs(report.latitude - coords[0]) <= 0.025
    && Math.abs(report.longitude - coords[1]) <= 0.03
  );
  const counts = nearbyReports.reduce((totals, report) => {
    totals[classifyHazard(report)] += 1;
    return totals;
  }, { flood: 0, traffic: 0, works: 0, hazard: 0 });
  const floodRisk = Math.min(99, profile.floodRisk + counts.flood * 8);
  const traffic = Math.min(99, profile.traffic + counts.traffic * 6);
  const activeWorks = profile.works + counts.works;
  const hazards = profile.hazards + counts.hazard;
  const riskLevel = (value) => value >= 70 ? 'Alto' : value >= 45 ? 'Moderado' : 'Baixo';

  return {
    profile,
    rain: realRain ?? demoRain,
    floodRisk,
    traffic,
    activeWorks,
    hazards,
    alerts: [
      { label: 'Alagamentos', value: `${riskLevel(floodRisk)} · ${floodRisk}% de risco`, count: profile.floodAlerts + counts.flood },
      { label: 'Trânsito lento', value: `${riskLevel(traffic)} · ${traffic}% de retenção`, count: profile.trafficAlerts + counts.traffic },
      { label: 'Obras na pista', value: `${activeWorks} ${activeWorks === 1 ? 'ponto ativo' : 'pontos ativos'}`, count: activeWorks },
      { label: 'Buracos / perigos na via', value: `${hazards} ${hazards === 1 ? 'ponto reportado' : 'pontos reportados'}`, count: hazards },
    ],
  };
}

function getDistanceKm(start, end) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const [startLat, startLng] = start.map(radians);
  const [endLat, endLng] = end.map(radians);
  const latitudeDelta = endLat - startLat;
  const longitudeDelta = endLng - startLng;
  const arc = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

// Ajustador de câmera do mapa
function RouteBoundsAdjuster({ coords, centerCoords }) {
  const map = useMap();
  useEffect(() => {
    if (centerCoords) {
      map.setView(centerCoords, 16, { animate: true });
    } else if (coords && coords.length > 0) {
      map.fitBounds(coords, { padding: [50, 50] });
    }
  }, [coords, centerCoords, map]);
  return null;
}

function MapViewSizeUpdater({ activeTab, mapView }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize({ pan: false }), 120);
    return () => clearTimeout(timer);
  }, [map, activeTab, mapView]);

  return null;
}

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
function MainApp({ user, onLogout, theme, onToggleTheme }) {
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
  const [demoRain, setDemoRain] = useState(14);
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

  useEffect(() => {
    const telemetryTimer = setInterval(() => {
      setDemoRain((currentValue) => {
        const nextValue = currentValue + (Math.random() - 0.5) * 0.4;
        return Math.max(12, Math.min(16, Number(nextValue.toFixed(1))));
      });
    }, 3500);
    return () => clearInterval(telemetryTimer);
  }, []);

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
    let active = true;
    getCurrentLocation()
      .then((coords) => {
        if (!active) return;
        setOrigemCoords(coords);
        fetchWeatherForCoords(coords[0], coords[1], 'Sua Posição Atual');
      })
      .catch(() => {
        if (active) fetchWeatherForCoords(-8.05428, -34.8813, 'Recife, PE (Padrão)');
      });

    const liveTimer = setInterval(() => {
      const { coords, name } = weatherLocationRef.current;
      fetchWeatherForCoords(coords[0], coords[1], name);
    }, 60000);

    return () => {
      active = false;
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

    if (user.id.startsWith('local-')) {
      listLocalReports().then((data) => {
        if (active) setReportes(data);
      }).catch((error) => {
        if (active) setReportError(error.message);
      }).finally(() => {
        if (active) setReportLoading(false);
      });
      return () => { active = false; };
    }

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
        chuvaDestino: chuvaDestino == null ? `${demoRain.toFixed(1)} mm/h (estimativa)` : `${chuvaDestino} mm/h`,
        statusRisco: 'Consulte as ocorrências aprovadas no mapa',
        bgRisco: 'var(--primary)',
        origem: origemQuery,
        destino: destinoQuery
      });
      setIsNavigating(true);
    } catch {
      const distance = getDistanceKm(pOrigem, pDestino);
      setRouteCoords([pOrigem, pDestino]);
      setRouteInfo({
        distancia: `${distance.toFixed(1)} km (estimativa)`,
        duracao: `${Math.max(1, Math.round((distance / 25) * 60))} min (estimativa)`,
        chuvaDestino: `${demoRain.toFixed(1)} mm/h (simulada)`,
        statusRisco: 'Rota direta · consulte os alertas locais',
        bgRisco: 'var(--warning)',
        origem: origemQuery,
        destino: destinoQuery,
      });
      setIsNavigating(true);
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
  const areaIndicators = getAreaIndicators(cidadeAtualNome, currentCoords, reportes, demoRain, realRain);
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
    <div className="floody-pro-layout">
      {/* MOBILE HEADER */}
      <div className="mobile-header">
        <div className="mobile-logo"><div className="logo-mark-small"></div><h3>Floody</h3></div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onToggleTheme} className="mobile-logout-btn">
            {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
          </button>
          <button onClick={onLogout} className="mobile-logout-btn" title="Sair"><Icons.Logout /></button>
        </div>
      </div>

      {/* SIDEBAR DESKTOP */}
      <aside className="pro-sidebar">
        <div className="logo-container"><div className="logo-mark"></div><h2>Floody</h2></div>
        <nav className="pro-nav">
          {user.tipo !== 'admin' && (
            <>
              <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                <Icons.Dashboard /> Central Ao Vivo
              </button>
              <button className={`nav-item ${activeTab === 'mapa' ? 'active' : ''}`} onClick={() => setActiveTab('mapa')}>
                <Icons.Map /> Mapa de Risco & Rota
              </button>
              <button className={`nav-item ${activeTab === 'veiculos' ? 'active' : ''}`} onClick={() => setActiveTab('veiculos')}>
                <Icons.Car /> Meus Veículos
              </button>
              <button className={`nav-item ${activeTab === 'reportar' || activeTab === 'sucesso_reporte' ? 'active' : ''}`} onClick={() => setActiveTab('reportar')}>
                <Icons.Alert /> Reportar Perigo
              </button>
            </>
          )}
          {user.tipo === 'admin' && (
            <button className={`nav-item ${activeTab === 'admin_reportes' ? 'active' : ''}`} onClick={() => setActiveTab('admin_reportes')}>
              <Icons.Check /> Validar Ocorrências
            </button>
          )}
        </nav>
        <div>
          <button className="theme-toggle-btn" onClick={onToggleTheme}>
            <span>Aparência</span>
            {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
          </button>
          <div className="user-profile">
            <div className="user-info"><strong>{user.nome}</strong><span>{user.tipo === 'admin' ? 'Administrador' : 'Condutor'}</span></div>
            <button onClick={onLogout} className="logout-btn" title="Sair"><Icons.Logout /></button>
          </div>
        </div>
      </aside>

      {/* WORKSPACE PRINCIPAL */}
      <main className="pro-workspace">
        {showReportError && <InlineAlert onDismiss={() => setReportError('')}>{reportError}</InlineAlert>}
        {activeTab === 'dashboard' && (
          <div className="fade-in scrollable-tab">
            <header className="content-title-header">
              <h1>Floody · Central ao Vivo</h1>
              <p>Condições de chuva e ocorrências na Região Metropolitana do Recife.</p>
            </header>

            {/* Busca local limitada a Pernambuco */}
            <form onSubmit={handleCentralSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', width: '100%' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <div className="route-input-field" style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px' }}>
                  <Icons.Search />
                  <input
                    type="text"
                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none' }}
                    placeholder="Buscar rua, bairro ou cidade em Pernambuco..."
                    value={buscaCentralQuery}
                    onChange={(e) => handleCentralInputChange(e.target.value)}
                  />
                </div>
                {buscaCentralSuggestions.length > 0 && (
                  <div className="suggestions-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                    {buscaCentralSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        className="suggestion-item"
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                        onClick={() => {
                          selectedCentralAddressRef.current = s.display_name;
                          setBuscaCentralQuery(s.display_name);
                          fetchWeatherForCoords(parseFloat(s.lat), parseFloat(s.lon), s.display_name);
                          setBuscaCentralSuggestions([]);
                        }}
                      >
                        {s.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <Icons.Search /> Consultar Monitoramento da Cidade
              </button>
            </form>

            <section className="regional-areas" aria-label="Pontos relevantes da região">
              <div>
                <h3>Locais importantes da região</h3>
                <p>Selecione um ponto próximo para consultar os indicadores locais.</p>
              </div>
              <div className="regional-area-list">
                {nearbyAreas.map((area) => (
                  <button
                    type="button"
                    key={area.name}
                    className={`regional-area-button ${normalizeText(cidadeAtualNome).includes(normalizeText(area.name)) ? 'selected' : ''}`}
                    onClick={() => {
                      selectedCentralAddressRef.current = area.name;
                      setBuscaCentralQuery(area.name);
                      fetchWeatherForCoords(area.coords[0], area.coords[1], area.name);
                      setBuscaCentralSuggestions([]);
                    }}
                  >
                    {area.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="area-status-card" aria-label={`Condições em ${cidadeAtualNome}`}>
              <div className="area-status-heading">
                <div>
                  <h3>Status completo da área</h3>
                  <p>{cidadeAtualNome} · indicadores locais demonstrativos e relatos aprovados próximos</p>
                </div>
                <span className="simulation-tag">{realRain == null || loadingApi ? 'ESTIMATIVA LOCAL' : 'CHUVA ATUALIZADA'}</span>
              </div>
              <div className="area-alert-grid">
                {areaIndicators.alerts.map((alert) => (
                  <div className="area-alert-item" key={alert.label}>
                    <span>{alert.label}</span>
                    <strong>{alert.value}</strong>
                    <small>{alert.count} {alert.count === 1 ? 'sinal na região' : 'sinais na região'}</small>
                  </div>
                ))}
              </div>
            </section>

            <div className="live-stats-grid">
              <div className="stat-card">
                <div className="stat-header"><span>Risco de alagamento</span><span className="live-tag">AO VIVO</span></div>
                <h2>{areaIndicators.floodRisk}%</h2>
                <div className="stat-footer" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {areaIndicators.rain.toFixed(1)} mm/h de chuva · {cidadeAtualNome}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span>Retenção no trânsito</span><span className="live-tag blue">VIAS</span></div>
                <h2>{areaIndicators.traffic}%</h2>
                <div className="stat-footer">{areaIndicators.alerts[1].count} trechos com trânsito lento</div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span>Obras / interdições</span><span className="live-tag blue">ATIVAS</span></div>
                <h2>{areaIndicators.activeWorks}</h2>
                <div className="stat-footer">Pontos ativos na região monitorada</div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span>Buracos / perigos</span><span className="live-tag">VIAS</span></div>
                <h2>{areaIndicators.hazards}</h2>
                <div className="stat-footer">Pontos reportados na região monitorada</div>
              </div>
            </div>
            {/* SEÇÃO DE PONTOS CRÍTICOS COM DESIGN TOTALMENTE PADRONIZADO */}
            <div className="chart-card-box" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <h3>Ocorrências aprovadas pela comunidade</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setFiltroApenasFavoritos(!filtroApenasFavoritos)}
                    style={{
                      background: filtroApenasFavoritos ? 'var(--primary)' : 'var(--bg-main)',
                      color: filtroApenasFavoritos ? '#fff' : 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem'
                    }}
                  >
                    <Icons.Star filled={filtroApenasFavoritos} />
                    {filtroApenasFavoritos ? 'Mostrando Favoritos' : 'Favoritos ⭐'}
                  </button>
                </div>
              </div>

              {/* BUSCA PADRONIZADA IGUAL À SUPERIOR (CAMPO + BOTÃO 100% LARGURA) */}
              <form onSubmit={(event) => event.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', width: '100%' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div className="route-input-field" style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px' }}>
                    <Icons.Search />
                    <input
                      type="text"
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.95rem', outline: 'none' }}
                      placeholder="Pesquisar qualquer rua, travessa, bairro ou ponto (Ex: Rua do Hospício, Boa Viagem, Av. Paulista)..."
                      value={filtroTextoZona}
                      onChange={(e) => {
                        setFiltroTextoZona(e.target.value);
                      }}
                    />
                    {filtroTextoZona && (
                      <button 
                        type="button" 
                        onClick={() => setFiltroTextoZona('')} 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <Icons.Close />
                      </button>
                    )}
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                  <Icons.Search /> Filtrar ocorrências confirmadas
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reportesExibidos.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>{reportLoading ? 'Carregando ocorrências...' : 'Nenhuma ocorrência aprovada corresponde à busca.'}</p>
                ) : (
                  reportesExibidos.map(report => {
                    const isExpanded = expandedZoneId === report.id;
                    const isFav = favoritos.includes(report.id);

                    return (
                      <div 
                        key={report.id} 
                        style={{
                          background: 'var(--bg-main)',
                          borderRadius: '12px',
                          border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          overflow: 'hidden',
                          transition: 'all 0.25s ease-in-out',
                          boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                        }}
                      >
                        {/* HEADER DO CARD INTERATIVO */}
                        <div 
                          onClick={() => setExpandedZoneId(isExpanded ? null : report.id)}
                          style={{
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                            padding: '14px 18px',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                              type="button"
                              onClick={(e) => toggleFavorito(report.id, e)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                              title={isFav ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                            >
                              <Icons.Star filled={isFav} />
                            </button>
                            <div>
                              <strong>{report.location_label}</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{report.hazard_type} · {formatDateTime(report.occurred_at)}</div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>
                              Confirmado
                            </span>
                            {isExpanded ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                          </div>
                        </div>

                        {/* GAVETA DE INFORMAÇÕES EXPANDÍVEL */}
                        {isExpanded && (
                          <div style={{
                            padding: '16px 18px',
                            borderTop: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            fontSize: '0.85rem',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '12px',
                            animation: 'fadeIn 0.2s ease-in-out'
                          }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Via / Endereço Consultado:</span>
                              <strong>{report.location_label}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Descrição do relato:</span>
                              <strong>{report.description}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Coordenadas:</span>
                              <strong>{report.latitude}, {report.longitude}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', display: 'block' }}>Autor do relato:</span>
                              <strong>{report.author_id}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* MAPA COM NAVEGAÇÃO AO VIVO E MANCHAS ORGÂNICAS */}
        {activeTab === 'mapa' && (
          <div className="fade-in fullscreen-tab">
            <div className={`route-floating-panel ${routePanelCollapsed ? 'collapsed' : ''}`}>
              <div className="route-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><Icons.Navigation /> {routePanelCollapsed ? 'Navegação' : 'Navegação Segura Ao Vivo'}</span>
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
                      placeholder="Digite rua, beco ou cidade..."
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
                  <span className="search-label">Destino Global (Qualquer lugar do mundo):</span>
                  <div className="route-input-field">
                    <Icons.Search />
                    <input
                      type="text"
                      placeholder="Ex: Av. Paulista, São Paulo / Rua X, Bairro Y"
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
                  {loadingRoute ? 'Calculando Trajeto...' : 'Iniciar Navegação Ao Vivo'}
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
              <button type="button" className={mapView === 'flood' ? 'active' : ''} onClick={() => setMapView('flood')}>
                <Icons.Flame /> Visão Alagamento
              </button>
              <button type="button" className={mapView === 'streets' ? 'active' : ''} onClick={() => setMapView('streets')}>
                Visão Ruas
              </button>
              <button type="button" className={mapView === 'satellite' ? 'active' : ''} onClick={() => setMapView('satellite')}>
                Visão Satélite
              </button>
            </div>

            <div className="map-container-box">
              {!isMounted && <div className="map-loading-placeholder" aria-label="Carregando mapa" />}
              {isMounted && (
              <MapContainer center={defaultCenter} zoom={13} minZoom={10} maxZoom={18} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  minZoom={10}
                  maxZoom={18}
                  attribution="&copy; OpenStreetMap contributors"
                />
                {!mapTilesUnavailable && preferredMapTileUrl && (
                  <TileLayer
                    url={preferredMapTileUrl}
                    minZoom={10}
                    maxZoom={18}
                    eventHandlers={{ tileerror: () => setMapTilesUnavailable(true) }}
                  />
                )}
                <MapViewSizeUpdater activeTab={activeTab} mapView={mapView} />

                {origemCoords && <Marker position={origemCoords}><Popup>Sua Posição Atual: {origemQuery}</Popup></Marker>}
                {destinoCoords && <Marker position={destinoCoords}><Popup>Destino: {destinoQuery}</Popup></Marker>}

                {mapView === 'streets' && theme === 'light' && DEMO_STREET_ROADS.map((road) => {
                  const roadIncident = DEMO_STREET_INCIDENTS.find((incident) => incident.road === road.name);
                  const lineColor = roadIncident?.kind === 'traffic'
                    ? '#dc2626'
                    : roadIncident ? '#ea580c' : '#2563eb';

                  return (
                    <Polyline
                      key={`street-road-${road.name}`}
                      positions={road.positions}
                      pathOptions={{ color: lineColor, weight: 7, opacity: 0.82, lineCap: 'round', lineJoin: 'round' }}
                    >
                      <Popup>
                        <strong>{road.name}, Recife/PE</strong><br />
                        {roadIncident ? roadIncident.detail : 'Via principal monitorada.'}<br />
                        Traçado viário ilustrativo; alertas identificados são marcados sobre a via.
                      </Popup>
                    </Polyline>
                  );
                })}

                {mapView === 'flood' && DEMO_HEAT_SPOTS.map((spot) => {
                  const riskScale = spot.risk === 'high' ? 1 : spot.risk === 'medium' ? 0.8 : 0.6;
                  const area = findAreaProfile(spot.name, spot.coords);
                  const heatRings = [
                    { radius: 1100, color: '#22c55e', fillOpacity: 0.2 },
                    { radius: 850, color: '#06b6d4', fillOpacity: 0.3 },
                    { radius: 620, color: '#facc15', fillOpacity: 0.4 },
                    { radius: 400, color: '#f97316', fillOpacity: 0.5 },
                    { radius: 220, color: '#ef4444', fillOpacity: 0.6 },
                  ];
                  return (
                    <React.Fragment key={`heat-${spot.name}`}>
                      {heatRings.map((ring) => (
                        <Circle
                          key={`${spot.name}-${ring.color}`}
                          center={spot.coords}
                          radius={ring.radius * riskScale}
                          pathOptions={{
                            color: ring.color,
                            fillColor: ring.color,
                            fillOpacity: ring.fillOpacity,
                            opacity: 0,
                            weight: 0,
                          }}
                        >
                          <Popup>
                            <strong>{spot.name}, Recife/PE</strong><br />
                            Risco estimado de alagamento: {area.floodRisk}% ({spot.risk === 'high' ? 'alto' : spot.risk === 'medium' ? 'moderado' : 'baixo'}).<br />
                            Chuva informada para a região: {area.rain.toFixed(1)} mm/h.<br />
                            Manchas de calor demonstrativas; confirme as condições no local.
                          </Popup>
                        </Circle>
                      ))}
                    </React.Fragment>
                  );
                })}

                {mapView === 'flood' && reportes
                  .filter((report) => report.status === 'Aprovado' && classifyHazard(report) === 'flood')
                  .map((report) => {
                    const reportRings = [
                      { radius: 700, color: '#06b6d4', fillOpacity: 0.2 },
                      { radius: 500, color: '#facc15', fillOpacity: 0.35 },
                      { radius: 320, color: '#f97316', fillOpacity: 0.5 },
                      { radius: 160, color: '#ef4444', fillOpacity: 0.6 },
                    ];
                    return (
                      <React.Fragment key={`report-heat-${report.id}`}>
                        {reportRings.map((ring) => (
                          <Circle
                            key={`${report.id}-${ring.color}`}
                            center={[report.latitude, report.longitude]}
                            radius={ring.radius}
                            pathOptions={{ color: ring.color, fillColor: ring.color, fillOpacity: ring.fillOpacity, opacity: 0, weight: 0 }}
                          >
                            <Popup>
                              <strong>{report.location_label}, Recife/PE</strong><br />
                              Relato confirmado de alagamento.<br />
                              {report.description}<br />
                              Atualizado em {formatDateTime(report.occurred_at)}.
                            </Popup>
                          </Circle>
                        ))}
                      </React.Fragment>
                    );
                  })}

                {mapView === 'streets' && DEMO_STREET_INCIDENTS.map((incident) => {
                  const incidentType = incident.kind === 'traffic'
                    ? 'Trânsito lento'
                    : incident.kind === 'works' ? 'Obra / interdição' : 'Buraco / perigo viário';
                  const incidentColor = incident.kind === 'traffic' ? '#ef4444' : '#f97316';
                  return (
                    <CircleMarker
                      key={incident.name}
                      center={incident.coords}
                      radius={9}
                      pathOptions={{
                        color: '#ffffff',
                        weight: 2,
                        fillColor: incidentColor,
                        fillOpacity: 0.95,
                      }}
                    >
                      <Popup>
                        <strong>{incident.name}</strong><br />
                        {incident.detail}<br />
                        Categoria: {incidentType}<br />
                        Coordenadas: {incident.coords[0].toFixed(5)}, {incident.coords[1].toFixed(5)}<br />
                        Localização demonstrativa em Recife/PE; não representa telemetria viária ao vivo.
                      </Popup>
                    </CircleMarker>
                  );
                })}

                {mapView === 'streets' && reportes
                  .filter((report) => report.status === 'Aprovado')
                  .map((report) => {
                    const hazardKind = classifyHazard(report);
                    const category = hazardKind === 'traffic'
                      ? 'Trânsito'
                      : hazardKind === 'works' ? 'Obra / interdição' : 'Perigo viário';
                    return (
                      <CircleMarker
                        key={`street-report-${report.id}`}
                        center={[report.latitude, report.longitude]}
                        radius={9}
                        pathOptions={{
                          color: '#ffffff',
                          weight: 2,
                          fillColor: hazardKind === 'traffic' ? '#ef4444' : '#f97316',
                          fillOpacity: 1,
                        }}
                      >
                        <Popup>
                          <strong>{report.location_label}, Recife/PE</strong><br />
                          Categoria: {category}<br />
                          Relato: {report.hazard_type}<br />
                          {report.description}<br />
                          Atualizado em {formatDateTime(report.occurred_at)}.
                        </Popup>
                      </CircleMarker>
                    );
                  })}

                {routeCoords.length > 0 && (
                  <Polyline positions={routeCoords} pathOptions={{ color: '#38bdf8', weight: 6, opacity: 0.8 }} />
                )}
                
                <RouteBoundsAdjuster coords={routeCoords} centerCoords={isNavigating ? origemCoords : null} />
              </MapContainer>
              )}
            </div>
          </div>
        )}

        {/* GARAGEM FIPE */}
        {activeTab === 'veiculos' && (
          <div className="fade-in scrollable-tab">
            <header className="content-title-header"><h1>Sua Garagem Inteligente</h1><p>Integração oficial com a API da FIPE.</p></header>
            <div className="form-card">
              <form onSubmit={handleSaveVeiculo} className="grid-form">
                <div className="input-group">
                  <label>Marca</label>
                  <select required value={marcaSelecionada.codigo} onChange={(e) => {
                    const chosen = marcas.find(m => m.codigo === e.target.value);
                    setMarcaSelecionada({ codigo: chosen?.codigo || '', nome: chosen?.nome || '' });
                    setModeloSelecionado('');
                  }}>
                    <option value="">Selecione a fabricante...</option>
                    {marcas.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Modelo</label>
                  <select required disabled={!marcaSelecionada.codigo} value={modeloSelecionado} onChange={(e) => setModeloSelecionado(e.target.value)}>
                    <option value="">{marcaSelecionada.codigo ? 'Selecione o modelo...' : 'Selecione a marca primeiro'}</option>
                    {modelos.map(m => <option key={m.codigo} value={m.nome}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="input-group full-width">
                  <label>Vão Livre / Altura do Solo (cm)</label>
                  <input required type="number" placeholder="Ex: 17" value={alturaCarro} onChange={e => setAlturaCarro(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary">Salvar Veículo</button>
              </form>
            </div>

            <div className="list-card" style={{ marginTop: '20px' }}>
              <h3>Meus Veículos Cadastrados</h3>
              {veiculos.filter(v => v.userId === user.id).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Nenhum veículo cadastrado ainda.</p>
              ) : (
                <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                  {veiculos.filter(v => v.userId === user.id).map(v => (
                    <div key={v.id} style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <div><strong>{v.marca} - {v.modelo}</strong></div>
                      <div><span>Vão Livre: <strong>{v.altura} cm</strong></span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
              <p style={{ margin: '12px 0 24px 0', color: 'var(--text-muted)' }}>Sua contribuição ajuda a salvar rotas em tempo real.</p>
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
      </main>

      {/* NAV BOTTOM MOBILE */}
      <div className="mobile-bottom-nav">
        {user.tipo === 'admin' ? (
          <button className={`bottom-nav-item ${activeTab === 'admin_reportes' ? 'active' : ''}`} onClick={() => setActiveTab('admin_reportes')}>
            <Icons.Check /><span>Moderação</span>
          </button>
        ) : (
          <>
            <button className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <Icons.Dashboard /><span>Painel</span>
            </button>
            <button className={`bottom-nav-item ${activeTab === 'mapa' ? 'active' : ''}`} onClick={() => setActiveTab('mapa')}>
              <Icons.Map /><span>Mapa</span>
            </button>
            <button className={`bottom-nav-item ${activeTab === 'veiculos' ? 'active' : ''}`} onClick={() => setActiveTab('veiculos')}>
              <Icons.Car /><span>Garagem</span>
            </button>
            <button className={`bottom-nav-item ${activeTab === 'reportar' || activeTab === 'sucesso_reporte' ? 'active' : ''}`} onClick={() => setActiveTab('reportar')}>
              <Icons.Alert /><span>Alertar</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'Floody - Sistema Global de Monitoramento e Navegação';
  }, []);

  useEffect(() => {
    let active = true;
    storage.getItem('floody_theme')
      .then((savedTheme) => {
        if (active && (savedTheme === 'light' || savedTheme === 'dark')) setTheme(savedTheme);
      })
      .finally(() => { if (active) setThemeLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
    storage.setItem('floody_theme', theme);
  }, [theme, themeLoaded]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <AppNavigator
        loading={authLoading}
        authenticated={Boolean(user)}
        auth={<AuthNavigator onLogin={login} theme={theme} onToggleTheme={toggleTheme} icons={Icons} />}
        app={user && <MainApp user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
