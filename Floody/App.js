import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, LayersControl, Polyline, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css';

// Correção dos ícones padrão do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
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
  )
};

// Auxiliar para ajustar câmera do mapa na rota
function RouteBoundsAdjuster({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      map.fitBounds(coords, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
}

// Tela de Login / Registro
function AuthScreen({ onLogin, theme, onToggleTheme }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ nome: '', email: '', senha: '' });
  const [erro, setErro] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro('');
    const savedUsers = JSON.parse(localStorage.getItem('floody_users')) || [
      { nome: 'Admin Floody', email: 'admin@floody.com', senha: '123', tipo: 'admin' }
    ];

    if (isLogin) {
      const user = savedUsers.find(
        (u) => u.email.trim().toLowerCase() === formData.email.trim().toLowerCase() && u.senha === formData.senha
      );
      if (user) {
        localStorage.setItem('floody_active_session', JSON.stringify(user));
        onLogin(user);
      } else {
        setErro('E-mail ou senha incorretos.');
      }
    } else {
      if (!formData.nome || !formData.email || !formData.senha) {
        setErro('Preencha todos os campos.');
        return;
      }
      const userExists = savedUsers.some(
        (u) => u.email.trim().toLowerCase() === formData.email.trim().toLowerCase()
      );
      if (userExists) {
        setErro('E-mail já cadastrado.');
        return;
      }
      const newUser = { id: Date.now(), nome: formData.nome, email: formData.email, senha: formData.senha, tipo: 'usuario' };
      savedUsers.push(newUser);
      localStorage.setItem('floody_users', JSON.stringify(savedUsers));
      localStorage.setItem('floody_active_session', JSON.stringify(newUser));
      onLogin(newUser);
    }
  };

  return (
    <div className="auth-wrapper">
      <button className="theme-toggle-floating" onClick={onToggleTheme}>
        {theme === 'dark' ? <><Icons.Sun /> Modo Claro</> : <><Icons.Moon /> Modo Escuro</>}
      </button>
      <div className="auth-card">
        <div className="auth-logo"><div className="logo-mark"></div><h2>Floody</h2></div>
        <p className="auth-subtitle">
          {isLogin ? 'Faça login para acessar o sistema' : 'Crie sua conta no Floody'}
        </p>
        {erro && <div className="auth-erro">{erro}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label>Nome Completo</label>
              <input
                type="text"
                required
                placeholder="Seu nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
          )}
          <div className="input-group">
            <label>E-mail</label>
            <input
              type="email"
              required
              placeholder="seuemail@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input
              type="password"
              required
              placeholder="........"
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary auth-btn">
            {isLogin ? 'Entrar no Sistema' : 'Cadastrar e Entrar'}
          </button>
        </form>
        <div className="auth-switch">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setErro(''); }}>
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já possui conta? Fazer Login'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente Principal do App
function MainApp({ user, onLogout, theme, onToggleTheme }) {
  const [activeTab, setActiveTab] = useState(user.tipo === 'admin' ? 'admin_reportes' : 'dashboard');
  const [veiculos, setVeiculos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [formReporte, setFormReporte] = useState({ tipo: 'Alagamento Intransitável', descricao: '', local: 'Av. Agamenon Magalhães, Recife' });
  
  // Meteorologia Real
  const [realRain, setRealRain] = useState(0);
  const [waterLevel, setWaterLevel] = useState(0.4);
  const [loadingApi, setLoadingApi] = useState(true);
  
  // Mapa de Calor (Heatmap Toggle)
  const [showHeatmap, setShowHeatmap] = useState(true);
  
  // Estados de Pesquisa Estilo Google Maps / Waze
  const [origemQuery, setOrigemQuery] = useState('Recife, PE');
  const [origemCoords, setOrigemCoords] = useState([-8.05428, -34.8813]);
  const [origemSuggestions, setOrigemSuggestions] = useState([]);
  
  const [destinoQuery, setDestinoQuery] = useState('');
  const [destinoCoords, setDestinoCoords] = useState(null);
  const [destinoSuggestions, setDestinoSuggestions] = useState([]);
  
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingGPS, setLoadingGPS] = useState(false);

  // FIPE States
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [marcaSelecionada, setMarcaSelecionada] = useState({ codigo: '', nome: '' });
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [alturaCarro, setAlturaCarro] = useState('');

  const recifeCenter = [-8.05428, -34.8813];
  
  const zones = [
    { id: 'z1', nome: "Av. Agamenon Magalhães", coords: [-8.0470, -34.8770], raio: 650, severidade: 0.9 },
    { id: 'z2', nome: "Av. Domingos Ferreira (Boa Viagem)", coords: [-8.1130, -34.8940], raio: 550, severidade: 0.7 },
    { id: 'z3', nome: "Av. Recife (Areias/Iputinga)", coords: [-8.0820, -34.9250], raio: 750, severidade: 0.95 },
    { id: 'z4', nome: "Largo da Paz (Afogados)", coords: [-8.0775, -34.9030], raio: 500, severidade: 0.85 },
    { id: 'z5', nome: "Av. Mascarenhas de Moraes (Imbiribeira)", coords: [-8.1050, -34.9120], raio: 700, severidade: 0.88 },
    { id: 'z6', nome: "Pan Nordestina (Olinda)", coords: [-8.0120, -34.8620], raio: 600, severidade: 0.75 }
  ];

  useEffect(() => {
    const fetchRealData = () => {
      fetch('https://api.open-meteo.com/v1/forecast?latitude=-8.05428&longitude=-34.8813&current=precipitation,rain,showers')
        .then(res => res.json())
        .then(data => {
          if (data && data.current) {
            const currentPrecip = data.current.precipitation || data.current.rain || 0;
            setRealRain(currentPrecip);
            setWaterLevel((0.2 + (currentPrecip * 0.15)).toFixed(2));
          }
          setLoadingApi(false);
        })
        .catch(() => setLoadingApi(false));
    };
    fetchRealData();
    const interval = setInterval(fetchRealData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setVeiculos(JSON.parse(localStorage.getItem('floody_veiculos')) || []);
    setReportes(JSON.parse(localStorage.getItem('floody_reportes')) || []);
    fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas')
      .then(res => res.json())
      .then(data => setMarcas(data))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (marcaSelecionada.codigo) {
      fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${marcaSelecionada.codigo}/modelos`)
        .then(res => res.json())
        .then(data => setModelos(data.modelos || []))
        .catch(err => console.error(err));
    } else {
      setModelos([]);
    }
  }, [marcaSelecionada]);

  // Geocodificação Ampla (Estilo Google Maps / Waze para qualquer rua, número ou lugar)
  const searchAddress = async (query, setSuggestions) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      // Prioriza Pernambuco/Brasil para encontrar ruas, bairros e estabelecimentos exatos
      const termoBusca = encodeURIComponent(`${query}, Pernambuco, Brasil`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${termoBusca}&limit=6&addressdetails=1`);
      const data = await res.json();
      setSuggestions(data || []);
    } catch (e) {
      setSuggestions([]);
    }
  };

  // Buscar localização dinâmica no formulário se o usuário apertar Enter ou não clicar na lista
  const geocodeEnderecoDireto = async (enderecoTexto) => {
    try {
      const termo = encodeURIComponent(`${enderecoTexto}, Pernambuco, Brasil`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${termo}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  // Pegar Localização Atual do Usuário (GPS com cache inteligente)
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('Seu navegador não suporta geolocalização.');
      return;
    }

    const gpsSalvo = localStorage.getItem('floody_last_gps');
    if (gpsSalvo) {
      const coordsSalvas = JSON.parse(gpsSalvo);
      setOrigemCoords(coordsSalvas);
      setOrigemQuery('Minha Localização Atual');
      setOrigemSuggestions([]);
      return;
    }

    setLoadingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setOrigemCoords(coords);
        setOrigemQuery('Minha Localização Atual');
        setOrigemSuggestions([]);
        localStorage.setItem('floody_last_gps', JSON.stringify(coords));
        setLoadingGPS(false);
      },
      () => {
        alert('Não foi possível obter sua localização. Permita o acesso ao GPS no seu navegador.');
        setLoadingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Busca de Rota Exata via API OSRM
  const handleBuscarRota = async (e) => {
    e.preventDefault();
    setLoadingRoute(true);

    let pOrigem = origemCoords;
    let pDestino = destinoCoords;

    // Se o usuário digitou o endereço de origem mas não selecionou na sugestão, resolve o endereço exato
    if (!pOrigem && origemQuery) {
      pOrigem = await geocodeEnderecoDireto(origemQuery);
      if (pOrigem) setOrigemCoords(pOrigem);
    }

    // Se o usuário digitou o endereço de destino mas não selecionou na sugestão, resolve o endereço exato
    if (!pDestino && destinoQuery) {
      pDestino = await geocodeEnderecoDireto(destinoQuery);
      if (pDestino) setDestinoCoords(pDestino);
    }

    if (!pOrigem || !pDestino) {
      alert('Localização não encontrada. Digite o endereço completo (Rua, Número, Bairro).');
      setLoadingRoute(false);
      return;
    }

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pOrigem[1]},${pOrigem[0]};${pDestino[1]},${pDestino[0]}?overview=full&geometries=geojson`;
      const res = await fetch(osrmUrl);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leafCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        setRouteCoords(leafCoords);
        const distKm = (route.distance / 1000).toFixed(1);
        const duracaoMin = Math.round(route.duration / 60);

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pDestino[0]}&longitude=${pDestino[1]}&current=precipitation,rain`);
        const weatherData = await weatherRes.json();
        const chuvaDestino = weatherData?.current?.precipitation || weatherData?.current?.rain || 0;

        let statusRisco = 'BAIXO (Estrada Lenta)';
        let bgRisco = 'var(--success)';
        if (chuvaDestino > 4.0 || realRain > 5.0) {
          statusRisco = 'ALTO (Risco de Alagamento na Pista)';
          bgRisco = 'var(--danger)';
        } else if (chuvaDestino > 1.0 || realRain > 1.0) {
          statusRisco = 'MÉDIO (Atenção em Pontos Baixos)';
          bgRisco = 'var(--warning)';
        }
        setRouteInfo({
          distancia: `${distKm} km`,
          duracao: `${duracaoMin} min`,
          chuvaDestino: `${chuvaDestino} mm/h`,
          statusRisco,
          bgRisco,
          origem: origemQuery,
          destino: destinoQuery
        });
      } else {
        alert('Não foi possível traçar uma rota terrestre entre estes dois pontos.');
      }
    } catch (err) {
      console.error('Erro ao calcular rota:', err);
      alert('Erro ao conectar com o serviço de rotas.');
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleSaveVeiculo = (e) => {
    e.preventDefault();
    if (!marcaSelecionada.nome || !modeloSelecionado || !alturaCarro) return;
    const novaLista = [...veiculos, { marca: marcaSelecionada.nome, modelo: modeloSelecionado, altura: alturaCarro, id: Date.now(), userId: user.email }];
    setVeiculos(novaLista);
    localStorage.setItem('floody_veiculos', JSON.stringify(novaLista));
    setMarcaSelecionada({ codigo: '', nome: '' });
    setModeloSelecionado('');
    setAlturaCarro('');
  };

  const handleSaveReporte = (e) => {
    e.preventDefault();
    const novaLista = [...reportes, { ...formReporte, id: Date.now(), autor: user.nome, status: 'Pendente', data: new Date().toLocaleDateString('pt-BR') }];
    setReportes(novaLista);
    localStorage.setItem('floody_reportes', JSON.stringify(novaLista));
    setFormReporte({ tipo: 'Alagamento Intransitável', descricao: '', local: 'Av. Agamenon Magalhães, Recife' });
    setActiveTab('sucesso_reporte');
  };

  // Provedores de Mapa Sem Limites e Sem Erros de Zoom / API Key
  const mapTileUrl = theme === 'dark'
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

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
        {activeTab === 'dashboard' && (
          <div className="fade-in scrollable-tab">
            <header className="content-title-header">
              <h1>Central de Monitoramento Recife</h1>
              <p>Dados obtidos da API pública meteorológica em tempo real.</p>
            </header>
            <div className="live-stats-grid">
              <div className="stat-card">
                <div className="stat-header"><span>Precipitação Real (Open-Meteo)</span><span className="live-tag">RECIFE AO VIVO</span></div>
                <h2>{loadingApi ? 'Carregando...' : `${realRain} mm/h`}</h2>
                <div className="stat-footer">Taxa de chuva instantânea na região</div>
              </div>
              <div className="stat-card">
                <div className="stat-header"><span>Lâmina d'Água Estimada</span><span className="live-tag blue">ONLINE</span></div>
                <h2>{loadingApi ? 'Carregando...' : `${waterLevel} m`}</h2>
                <div className="stat-footer">Nível estimado em corredores viários</div>
              </div>
            </div>
            <div className="chart-card-box" style={{ marginTop: '20px' }}>
              <h3>Status dos Pontos Críticos em Recife</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {zones.map(z => {
                  const nivelCalculado = (parseFloat(waterLevel) + (z.severidade * 0.3)).toFixed(2);
                  const isCritico = nivelCalculado > 0.75;
                  return (
                    <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <strong>{z.nome}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Acúmulo: {nivelCalculado}m</div>
                      </div>
                      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: isCritico ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: isCritico ? 'var(--danger)' : 'var(--warning)' }}>
                        {isCritico ? 'Risco Alto' : 'Atenção'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MAPA COM BUSCA LIVRE ESTILO GOOGLE MAPS / WAZE */}
        {activeTab === 'mapa' && (
          <div className="fade-in fullscreen-tab">
            {/* PAINEL FLUTUANTE DE ROTA */}
            <div className="route-floating-panel">
              <div className="route-panel-title">
                <Icons.Navigation /> Planejar Trajeto Seguro
              </div>
              <form onSubmit={handleBuscarRota} className="route-inputs">
                {/* CAMPO DE ORIGEM COM GPS */}
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
                      placeholder="Digite rua, bairro ou cidade de partida..."
                      value={origemQuery}
                      onChange={(e) => {
                        setOrigemQuery(e.target.value);
                        setOrigemCoords(null);
                        searchAddress(e.target.value, setOrigemSuggestions);
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

                {/* CAMPO DE DESTINO */}
                <div className="search-box-group">
                  <span className="search-label">Destino (Rua, Número, Bairro):</span>
                  <div className="route-input-field">
                    <Icons.Search />
                    <input
                      type="text"
                      placeholder="Ex: Naziazeno Barreto, Jardim Jordão, 128"
                      value={destinoQuery}
                      onChange={(e) => {
                        setDestinoQuery(e.target.value);
                        setDestinoCoords(null);
                        searchAddress(e.target.value, setDestinoSuggestions);
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
                  {loadingRoute ? 'Calculando Trajeto...' : 'Traçar Rota Segura'}
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
                    <span>Risco na Pista:</span>
                    <span className="route-info-tag" style={{ background: routeInfo.bgRisco }}>
                      {routeInfo.statusRisco}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CONTROLE SUPERIOR DIREITO MAPA DE CALOR */}
            <div className="heatmap-controls-overlay">
              <button
                className="heatmap-toggle-btn"
                onClick={() => setShowHeatmap(!showHeatmap)}
                style={{ borderColor: showHeatmap ? 'var(--primary)' : 'var(--border-color)' }}
              >
                <Icons.Flame /> {showHeatmap ? 'Modo Calor: LIGADO' : 'Modo Calor: DESLIGADO'}
              </button>
            </div>

            <div className="map-container-box">
              <MapContainer center={recifeCenter} zoom={13} maxZoom={19} style={{ height: '100%', width: '100%' }}>
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Visão Automática (Tema)">
                    <TileLayer url={mapTileUrl} maxZoom={19} />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Visão de Satélite Real">
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {origemCoords && <Marker position={origemCoords}><Popup>Origem: {origemQuery}</Popup></Marker>}
                {destinoCoords && <Marker position={destinoCoords}><Popup>Destino: {destinoQuery}</Popup></Marker>}

                {zones.map(z => {
                  const valorCalculado = parseFloat(waterLevel) + (z.severidade * 0.3);
                  const isCritico = valorCalculado > 0.75;
                  if (showHeatmap) {
                    const coreColor = isCritico ? '#a855f7' : '#ef4444';
                    const midColor = isCritico ? '#ef4444' : '#f59e0b';
                    const outerColor = isCritico ? '#f59e0b' : '#10b981';
                    return (
                      <React.Fragment key={`heat-${z.id}`}>
                        <Circle center={z.coords} radius={z.raio * 1.4} pathOptions={{ color: 'transparent', fillColor: outerColor, fillOpacity: 0.15 }} />
                        <Circle center={z.coords} radius={z.raio * 0.9} pathOptions={{ color: 'transparent', fillColor: midColor, fillOpacity: 0.28 }} />
                        <Circle center={z.coords} radius={z.raio * 0.4} pathOptions={{ color: coreColor, fillColor: coreColor, fillOpacity: 0.55, weight: 1 }}>
                          <Popup>
                            <div style={{ color: '#000' }}>
                              <strong>Núcleo Térmico: {z.nome}</strong><br />
                              Intensidade do Risco: {(valorCalculado * 100).toFixed(0)}%<br />
                              Lâmina d'água estim.: {valorCalculado.toFixed(2)} m
                            </div>
                          </Popup>
                        </Circle>
                      </React.Fragment>
                    );
                  }
                  return null;
                })}

                {routeCoords.length > 0 && (
                  <Polyline positions={routeCoords} pathOptions={{ color: '#38bdf8', weight: 6, opacity: 0.8 }} />
                )}
                <RouteBoundsAdjuster coords={routeCoords} />
              </MapContainer>
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
              {veiculos.filter(v => v.userId === user.email).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Nenhum veículo cadastrado ainda.</p>
              ) : (
                <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                  {veiculos.filter(v => v.userId === user.email).map(v => (
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
          <div className="fade-in scrollable-tab">
            <header className="content-title-header"><h1>Reportar Foco de Alagamento</h1><p>Alerte a comunidade sobre trechos críticos.</p></header>
            <div className="form-card">
              <form onSubmit={handleSaveReporte} className="grid-form">
                <div className="input-group full-width">
                  <label>Tipo de Perigo</label>
                  <select value={formReporte.tipo} onChange={(e) => setFormReporte({ ...formReporte, tipo: e.target.value })}>
                    <option>Alagamento Intransitável</option>
                    <option>Acúmulo Crítico / Atenção</option>
                    <option>Buraco Oculto sob a Água</option>
                  </select>
                </div>
                <div className="input-group full-width">
                  <label>Localização / Referência em Recife</label>
                  <input required value={formReporte.local} onChange={(e) => setFormReporte({ ...formReporte, local: e.target.value })} />
                </div>
                <div className="input-group full-width">
                  <label>Detalhes</label>
                  <textarea required rows="3" value={formReporte.descricao} onChange={(e) => setFormReporte({ ...formReporte, descricao: e.target.value })} placeholder="Escreva sobre o estado da pista..."></textarea>
                </div>
                <button type="submit" className="btn-danger">Enviar Alerta</button>
              </form>
            </div>
          </div>
        )}

        {/* SUCESSO */}
        {activeTab === 'sucesso_reporte' && (
          <div className="fade-in scrollable-tab" style={{ textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}>
            <div className="form-card" style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
              <div style={{ color: 'var(--success)', marginBottom: '10px' }}>
                <Icons.Check />
              </div>
              <h2>Alerta Registrado com Sucesso!</h2>
              <p style={{ margin: '12px 0 24px 0', color: 'var(--text-muted)' }}>Sua contribuição ajuda a salvar rotas em tempo real.</p>
              <button className="btn-primary" onClick={() => setActiveTab('dashboard')}>Voltar à Central</button>
            </div>
          </div>
        )}

        {/* ADMIN */}
        {activeTab === 'admin_reportes' && (
          <div className="fade-in scrollable-tab">
            <header className="content-title-header"><h1>Painel de Moderação</h1><p>Validação de alertas enviados por motoristas.</p></header>
            <div className="list-card">
              {reportes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Nenhuma ocorrência pendente.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px' }}>Autor</th>
                      <th style={{ padding: '12px' }}>Local</th>
                      <th style={{ padding: '12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportes.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px' }}>{r.autor}</td>
                        <td style={{ padding: '12px' }}>{r.local}</td>
                        <td style={{ padding: '12px', color: 'var(--warning)' }}>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {/* NAV BOTTOM MOBILE */}
      <div className="mobile-bottom-nav">
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
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('floody_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('floody_theme', theme);
  }, [theme]);

  useEffect(() => {
    const session = localStorage.getItem('floody_active_session');
    if (session) {
      setUser(JSON.parse(session));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('floody_active_session');
    setUser(null);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      {!user ? (
        <AuthScreen onLogin={setUser} theme={theme} onToggleTheme={toggleTheme} />
      ) : (
        <MainApp user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />
      )}
    </>
  );
}