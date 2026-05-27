import React, { useState } from 'react';
import './App.css';

// Componente de Malha Urbana Dinâmica (Estilo Blueprint Tech)
const BlueprintMap = ({ mode }) => {
  return (
    <svg className="vector-map" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      {/* Fundo do Mapa de Acordo com o Modo */}
      <rect width="800" height="600" fill={mode === 'rain' ? '#0b111e' : '#140e0a'} />
      
      {/* Grade Tecnológica de Fundo */}
      <g stroke={mode === 'rain' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(249, 115, 22, 0.08)'} strokeWidth="1" strokeDasharray="4,4">
        {[...Array(12)].map((_, i) => <line key={`h-${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} />)}
        {[...Array(16)].map((_, i) => <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="600" />)}
      </g>

      {/* Malha Urbana de Ruas e Avenidas (Estilo o Print Fornecido) */}
      <g stroke={mode === 'rain' ? '#1e3a8a' : '#7c2d12'} strokeWidth="2.5" fill="none" opacity="0.65">
        {/* Avenidas Principais */}
        <path d="M 0,180 Q 250,220 450,170 T 800,220" stroke={mode === 'rain' ? '#2563eb' : '#ea580c'} strokeWidth="5" />
        <path d="M 190,0 Q 220,320 260,600" stroke={mode === 'rain' ? '#2563eb' : '#ea580c'} strokeWidth="4" />
        <path d="M 0,420 C 320,380 480,520 800,400" stroke={mode === 'rain' ? '#1d4ed8' : '#c2410c'} strokeWidth="4" />
        <path d="M 620,0 C 580,220 680,380 600,600" stroke={mode === 'rain' ? '#2563eb' : '#ea580c'} strokeWidth="4" />

        {/* Linhas de Conexão e Blocos de Bairro */}
        <path d="M 60,0 L 120,600 M 340,0 L 290,600 M 490,0 L 540,600 M 740,0 L 780,600" />
        <path d="M 0,90 L 800,110 M 0,290 L 800,270 M 0,390 L 800,410 M 0,540 L 800,520" />
        
        {/* Curvas Secundárias */}
        <path d="M 120,110 C 140,160 70,220 90,320" />
        <path d="M 370,220 C 420,270 340,370 400,470" />
        <path d="M 670,170 C 740,240 700,320 730,400" />
      </g>

      {/* Manchas de Telemetria Climática Suave (Camadas de Risco) */}
      <g fill={mode === 'rain' ? '#00A2FF' : '#FA6400'} opacity="0.18" filter="blur(14px)">
        <circle cx="280" cy="200" r="75" />
        <circle cx="560" cy="380" r="65" />
      </g>
      <g fill={mode === 'rain' ? '#a855f7' : '#ef4444'} opacity="0.15" filter="blur(16px)">
        <circle cx="460" cy="240" r="90" />
      </g>

      {/* PIN DE LOCALIZAÇÃO DO USUÁRIO CENTRALIZADO (Estilo Radar GPS) */}
      <g transform="translate(400, 300)">
        {/* Ondas Dinâmicas de Radar */}
        <circle cx="0" cy="0" r="35" fill={mode === 'rain' ? '#3b82f6' : '#f97316'} opacity="0.25" className="radar-pulse-ring" />
        <circle cx="0" cy="0" r="16" fill={mode === 'rain' ? '#2563eb' : '#ea580c'} opacity="0.4" />
        
        {/* Ícone de Pin Profissional */}
        <g transform="translate(-14, -34)">
          <path 
            d="M14,2 C7.48,2 2,7.48 2,14 C2,22.17 14,34 14,34 C14,34 26,22.17 26,14 C26,7.48 20.52,2 14,2 Z" 
            fill="#ffffff" 
            filter="drop-shadow(0px 4px 6px rgba(0,0,0,0.3))"
          />
          <circle cx="14" cy="14" r="5" fill={mode === 'rain' ? '#2563eb' : '#ea580c'} />
        </g>
      </g>
    </svg>
  );
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState('rain'); // 'rain' ou 'heat'
  const [currentTab, setCurrentTab] = useState('map'); 
  const [showReportModal, setShowReportModal] = useState(false);

  // Formulário de Cadastro
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Lista de pontos críticos reais do mockup
  const [locations, setLocations] = useState([
    { id: 1, name: 'Imbiribeira', temp: '42°C', risk: 'High', status: 'critical' },
    { id: 2, name: 'Boa Viagem', temp: '38°C', risk: 'Moderate', status: 'warning' },
    { id: 3, name: 'Casa Amarela', temp: '40°C', risk: 'High', status: 'critical' }
  ]);

  const handleSignUp = (e) => {
    e.preventDefault();
    if (name && email && password) {
      setIsLoggedIn(true);
    } else {
      alert('Por favor, preencha todos os campos!');
    }
  };

  const handleSendReport = () => {
    const newLocation = {
      id: Date.now(),
      name: 'Zona Norte (Report)',
      temp: mode === 'rain' ? '1.5m' : '44°C',
      risk: 'Extreme',
      status: 'critical'
    };
    setLocations([newLocation, ...locations]);
    setShowReportModal(false);
    alert('Alerta enviado com sucesso para a central!');
  };

  return (
    <div className="container">
      <div className="phone-screen">
        
        {/* TELA DE CADASTRO */}
        {!isLoggedIn ? (
          <div className="auth-screen">
            <div className="auth-header">
              <div className="auth-logo">F</div>
              <h2>Create Account</h2>
              <p>Sign up to monitor Recife's climate alerts</p>
            </div>

            <form onSubmit={handleSignUp} className="auth-form">
              <div className="input-group">
                <label>Full Name</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-user"></i>
                  <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label>Email Address</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-envelope"></i>
                  <input type="email" placeholder="yourname@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="input-group">
                <label>Password</label>
                <div className="input-wrapper">
                  <i className="fa-solid fa-lock"></i>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="auth-btn">Sign Up</button>
            </form>
          </div>
        ) : (
          
          /* VIEW PRINCIPAL DO APLICATIVO */
          <>
            {/* CABEÇALHO SUPERIOR */}
            <header className="app-header">
              <div className="logo-area">
                <div className={`logo-box ${mode}`}>F</div>
                <span className="logo-text">Floody</span>
              </div>
              
              <div className="toggle-mode">
                <button className={mode === 'rain' ? 'active-rain' : ''} onClick={() => setMode('rain')}>
                  <i className="fa-solid fa-droplet"></i>
                </button>
                <button className={mode === 'heat' ? 'active-heat' : ''} onClick={() => setMode('heat')}>
                  <i className="fa-solid fa-sun"></i>
                </button>
              </div>
            </header>

            {/* ABA DO MAPA */}
            {currentTab === 'map' && (
              <>
                <div className="map-container">
                  {/* Nosso novo mapa vetorial de alta definição estilo blueprint */}
                  <BlueprintMap mode={mode} />
                  
                  {/* Texto de Fundo Estilizado "RECIFE" */}
                  <div className="map-city-watermark">RECIFE</div>

                  {/* Cabeçalho Interno do Mapa */}
                  <div className="map-inner-header">
                    <div>
                      <h4>{mode === 'rain' ? 'Rain Mode' : 'Heat Mode'}</h4>
                      <p>{mode === 'rain' ? 'Live conditions · Recife, PE' : 'Real-time road temperature'}</p>
                    </div>
                    <div className="map-weather-badge">
                      <i className={mode === 'rain' ? "fa-solid fa-cloud-showers-heavy" : "fa-solid fa-temperature-high"}></i>
                      <span>{mode === 'rain' ? '24°C' : '39°C'}</span>
                    </div>
                  </div>

                  {/* Indicador Flutuante Lateral */}
                  <div className="side-indicator">
                    <i className={mode === 'rain' ? "fa-solid fa-water" : "fa-solid fa-gauge-high"}></i>
                    <span>{mode === 'rain' ? "1.2m" : "42°C"}</span>
                  </div>

                  {/* Legenda de Níveis de Risco */}
                  <div className="map-legend">
                    <div className="legend-header-labels">
                      <span>{mode === 'rain' ? 'Risco de Alagamento' : 'Danger Index'}</span>
                      <span className="updated-text">Live updates</span>
                    </div>
                    <div className="legend-bar">
                      <span className="bar-gradient" style={{
                        background: mode === 'rain' 
                          ? 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' 
                          : 'linear-gradient(90deg, #f97316, #ef4444, #7f1d1d)'
                      }}></span>
                    </div>
                    <div className="legend-labels">
                      <span>Baixo</span>
                      <span>Médio</span>
                      <span>Alto</span>
                    </div>
                  </div>
                </div>

                {/* CARD INLINE PREMIUM DE ATUALIZAÇÃO DA ZONA ATUAL */}
                <div className="zone-status-bar">
                  <div className="zone-status-icon">
                    <i className={mode === 'rain' ? "fa-solid fa-shield-heart" : "fa-solid fa-circle-check"}></i>
                  </div>
                  <div className="zone-status-info">
                    <h6>Rota Segura</h6>
                    <p>{mode === 'rain' ? 'Caminho livre de alagamentos' : 'Asphalt temperatures stable near you'}</p>
                  </div>
                  <div className="zone-status-time">18 min</div>
                </div>

                {/* LISTA DE PONTOS CRÍTICOS */}
                <div className="info-section">
                  <div className="section-title-wrapper">
                    <h5>{mode === 'rain' ? 'Asphalt Flood Analysis' : 'Asphalt Temperature Alerts'}</h5>
                    <span>View All</span>
                  </div>
                  
                  <div className="scroll-cards-container">
                    {locations.map((loc) => (
                      <div key={loc.id} className="mock-list-item">
                        <div className="item-left">
                          <span className={`status-dot ${loc.status}`}></span>
                          <div>
                            <h6>{loc.name}</h6>
                            <p>{loc.risk} Risk Zone</p>
                          </div>
                        </div>
                        <div className="item-right">
                          <span className={`badge-temp ${loc.status}`}>{loc.temp}</span>
                          <i className="fa-solid fa-chevron-right"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ABAS ADICIONAIS */}
            {currentTab === 'alerts' && (
              <div className="tab-content-view">
                <h3><i className="fa-solid fa-bell"></i> Center Notifications</h3>
                <div className="alert-item"><strong>Imbiribeira:</strong> Alerta emitido para o painel de controle.</div>
                <div className="alert-item"><strong>Boa Viagem:</strong> Monitoramento de poças térmicas ativo.</div>
              </div>
            )}

            {currentTab === 'stats' && (
              <div className="tab-content-view">
                <h3><i className="fa-solid fa-chart-simple"></i> Analytics Telemetry</h3>
                <div className="stats-box-placeholder">
                  <div className="chart-bar" style={{height: '60%'}}></div>
                  <div className="chart-bar" style={{height: '85%'}}></div>
                  <div className="chart-bar" style={{height: '40%'}}></div>
                  <div className="chart-bar" style={{height: '95%'}}></div>
                </div>
                <p style={{fontSize: '12px', color: '#6b7280', textAlign: 'center'}}>Níveis acumulados em Recife nas últimas 24h.</p>
              </div>
            )}

            {currentTab === 'profile' && (
              <div className="tab-content-view">
                <h3><i className="fa-solid fa-user"></i> Operator Dashboard</h3>
                <div className="profile-card">
                  <div className="avatar-placeholder">{name ? name[0] : 'U'}</div>
                  <p><strong>Name:</strong> {name || 'Operador Civil'}</p>
                  <p><strong>Role:</strong> Master Monitor</p>
                  <button className="logout-btn" onClick={() => setIsLoggedIn(false)}>Log Out</button>
                </div>
              </div>
            )}

            {/* MODAL DO BOTÃO + */}
            {showReportModal && (
              <div className="modal-overlay">
                <div className="modal-body">
                  <h5>Report Hazard Event</h5>
                  <p>Do you want to send your location telemetry to the defense central database?</p>
                  <div className="modal-buttons">
                    <button className="btn-cancel" onClick={() => setShowReportModal(false)}>Cancel</button>
                    <button className={`btn-confirm ${mode}`} onClick={handleSendReport}>Send Alert</button>
                  </div>
                </div>
              </div>
            )}

            {/* BARRA DE NAVEGAÇÃO INFERIOR */}
            <nav className="bottom-nav">
              <button className={currentTab === 'map' ? 'nav-active' : ''} onClick={() => setCurrentTab('map')}>
                <i className="fa-solid fa-map-location-dot"></i>
                <span>Map</span>
              </button>
              
              <button className={currentTab === 'alerts' ? 'nav-active' : ''} onClick={() => setCurrentTab('alerts')}>
                <i className="fa-solid fa-bell"></i>
                <span>Alerts</span>
              </button>

              <div className={`add-button ${mode}`} onClick={() => setShowReportModal(true)}>
                <i className="fa-solid fa-plus"></i>
              </div>

              <button className={currentTab === 'stats' ? 'nav-active' : ''} onClick={() => setCurrentTab('stats')}>
                <i className="fa-solid fa-chart-simple"></i>
                <span>Stats</span>
              </button>

              <button className={currentTab === 'profile' ? 'nav-active' : ''} onClick={() => setCurrentTab('profile')}>
                <i className="fa-solid fa-user"></i>
                <span>Profile</span>
              </button>
            </nav>
          </>
        )}

      </div>
    </div>
  );
}

export default App;