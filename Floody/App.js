import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// ==========================================
// ÍCONES PROFISSIONAIS VETORIAIS (SVG)
// ==========================================
const Icons = {
  Dashboard: () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>,
  Map: () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>,
  Car: () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>,
  Alert: () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Check: () => <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  LogOut: () => <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
};

// ==========================================
// TELA DE LOGIN / CADASTRO COM PERSISTÊNCIA
// ==========================================
function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ nome: '', email: '', senha: '' });
  const [erro, setErro] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErro('');

    // Busca usuários armazenados no navegador ou inicializa com conta Padrão
    const savedUsers = JSON.parse(localStorage.getItem('floody_users')) || [
      { nome: 'Admin Floody', email: 'admin@floody.com', senha: '123', tipo: 'admin' }
    ];

    if (isLogin) {
      const user = savedUsers.find(
        u => u.email.trim().toLowerCase() === formData.email.trim().toLowerCase() && u.senha === formData.senha
      );

      if (user) {
        localStorage.setItem('floody_active_session', JSON.stringify(user));
        onLogin(user);
      } else {
        setErro('E-mail ou senha incorretos.');
      }
    } else {
      if (!formData.nome || !formData.email || !formData.senha) {
        setErro('Preencha todos os campos para se cadastrar.');
        return;
      }

      const userExists = savedUsers.some(
        u => u.email.trim().toLowerCase() === formData.email.trim().toLowerCase()
      );

      if (userExists) {
        setErro('Este e-mail já está cadastrado.');
        return;
      }

      const newUser = {
        id: Date.now(),
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha,
        tipo: 'usuario'
      };

      savedUsers.push(newUser);
      localStorage.setItem('floody_users', JSON.stringify(savedUsers));
      localStorage.setItem('floody_active_session', JSON.stringify(newUser));
      onLogin(newUser);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark">💧</div>
          <h2>Floody</h2>
        </div>
        <p className="auth-subtitle">{isLogin ? 'Faça login para continuar' : 'Cadastre-se na plataforma'}</p>
        
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
                onChange={e => setFormData({...formData, nome: e.target.value})} 
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
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>
          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={formData.senha} 
              onChange={e => setFormData({...formData, senha: e.target.value})} 
            />
          </div>
          <button type="submit" className="btn-primary auth-btn">
            {isLogin ? 'Entrar' : 'Cadastrar e Entrar'}
          </button>
        </form>
        
        <div className="auth-switch">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setErro(''); }}>
            {isLogin ? 'Não tem conta? Criar agora' : 'Já possui conta? Fazer login'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState(user.tipo === 'admin' ? 'admin_reportes' : 'dashboard');
  
  const [veiculos, setVeiculos] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [formReporte, setFormReporte] = useState({ tipo: 'Alagamento Intransitável', descricao: '', local: 'Av. Agamenon Magalhães, Recife' });
  
  // Dados de Chuva Reais vindos da API
  const [realRain, setRealRain] = useState(0);
  const [waterLevel, setWaterLevel] = useState(0.4);
  const [loadingApi, setLoadingApi] = useState(true);

  // FIPE States
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [marcaSelecionada, setMarcaSelecionada] = useState({ codigo: '', nome: '' });
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [alturaCarro, setAlturaCarro] = useState('');

  const recifeCenter = [-8.05428, -34.8813];

  // PONTOS DE MONITORAMENTO EM RECIFE
  const zones = [
    { id: 'z1', nome: "Av. Agamenon Magalhães", coords: [-8.0470, -34.8770], raio: 600 },
    { id: 'z2', nome: "Av. Domingos Ferreira (Boa Viagem)", coords: [-8.1130, -34.8940], raio: 500 },
    { id: 'z3', nome: "Av. Recife (Iputinga/Areias)", coords: [-8.0820, -34.9250], raio: 700 }
  ];

  // API REAL DE METEOROLOGIA (RECIFE - Open-Meteo API)
  useEffect(() => {
    const fetchRealData = () => {
      fetch('https://api.open-meteo.com/v1/forecast?latitude=-8.05428&longitude=-34.8813&current=precipitation,rain,showers')
        .then(res => res.json())
        .then(data => {
          if (data && data.current) {
            const currentPrecip = data.current.precipitation || data.current.rain || 0;
            setRealRain(currentPrecip);
            // Lâmina d'água estimada com base no acumulado da precipitação real
            setWaterLevel((0.2 + (currentPrecip * 0.15)).toFixed(2));
          }
          setLoadingApi(false);
        })
        .catch(err => {
          console.error("Erro ao carregar dados reais de Recife:", err);
          setLoadingApi(false);
        });
    };

    fetchRealData();
    const interval = setInterval(fetchRealData, 60000); // Atualiza a cada 1 minuto
    return () => clearInterval(interval);
  }, []);

  // CARREGAR DADOS FIPE E LOCALSTORAGE
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
    } else { setModelos([]); }
  }, [marcaSelecionada]);

  const handleSaveVeiculo = (e) => {
    e.preventDefault();
    if (!marcaSelecionada.nome || !modeloSelecionado || !alturaCarro) return;
    const novaLista = [...veiculos, { marca: marcaSelecionada.nome, modelo: modeloSelecionado, altura: alturaCarro, id: Date.now(), userId: user.email }];
    setVeiculos(novaLista);
    localStorage.setItem('floody_veiculos', JSON.stringify(novaLista));
    setMarcaSelecionada({ codigo: '', nome: '' }); setModeloSelecionado(''); setAlturaCarro('');
  };

  const handleSaveReporte = (e) => {
    e.preventDefault();
    const novaLista = [...reportes, { ...formReporte, id: Date.now(), autor: user.nome, status: 'Pendente', data: new Date().toLocaleDateString('pt-BR') }];
    setReportes(novaLista);
    localStorage.setItem('floody_reportes', JSON.stringify(novaLista));
    setFormReporte({ tipo: 'Alagamento Intransitável', descricao: '', local: 'Av. Agamenon Magalhães, Recife' });
    setActiveTab('sucesso_reporte');
  };

  return (
    <div className="floody-pro-layout">
      
      {/* HEADER MOBILE */}
      <div className="mobile-header">
        <div className="mobile-logo"><div className="logo-mark-small">💧</div><h3>Floody</h3></div>
        <button onClick={onLogout} className="mobile-logout-btn" title="Sair da Conta"><Icons.LogOut /></button>
      </div>

      {/* SIDEBAR DESKTOP */}
      <aside className="pro-sidebar">
        <div className="logo-container"><div className="logo-mark">💧</div><h2>Floody</h2></div>
        <nav className="pro-nav">
          {user.tipo !== 'admin' && (
            <>
              <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><Icons.Dashboard /> Central Ao Vivo</button>
              <button className={`nav-item ${activeTab === 'mapa' ? 'active' : ''}`} onClick={() => setActiveTab('mapa')}><Icons.Map /> Mapa de Risco</button>
              <button className={`nav-item ${activeTab === 'veiculos' ? 'active' : ''}`} onClick={() => setActiveTab('veiculos')}><Icons.Car /> Meus Veículos</button>
              <button className={`nav-item ${activeTab === 'reportar' || activeTab === 'sucesso_reporte' ? 'active' : ''}`} onClick={() => setActiveTab('reportar')}><Icons.Alert /> Reportar Perigo</button>
            </>
          )}
          {user.tipo === 'admin' && (
            <>
              <div className="admin-badge">Painel Admin</div>
              <button className={`nav-item ${activeTab === 'admin_reportes' ? 'active' : ''}`} onClick={() => setActiveTab('admin_reportes')}><Icons.Check /> Validar Ocorrências</button>
            </>
          )}
        </nav>
        <div className="user-profile">
          <div className="user-info"><strong>{user.nome}</strong><span>{user.tipo === 'admin' ? 'Administrador' : 'Condutor'}</span></div>
          <button onClick={onLogout} className="logout-btn" title="Sair"><Icons.LogOut /></button>
        </div>
      </aside>

      {/* ÁREA DE TRABALHO PRINCIPAL */}
      <main className="pro-workspace">
        
        {activeTab === 'dashboard' && (
          <div className="fade-in scrollable-tab">
            <header className="content-title-header">
              <h1>Central de Monitoramento Recife</h1>
              <p>Dados oficiais de satélite e radares meteorológicos obtidos via API pública em tempo real.</p>
            </header>
            
            <div className="live-stats-grid">
              <div className="stat-card live-pulse-border">
                <div className="stat-header"><span>Precipitação Real (Open-Meteo API)</span><span className="live-tag">RECIFE AO VIVO</span></div>
                <h2>{loadingApi ? 'Carregando...' : `${realRain} mm/h`}</h2>
                <div className="stat-footer">Taxa de chuva registrada nas estações de Recife</div>
              </div>
              <div className="stat-card live-pulse-border-blue">
                <div className="stat-header"><span>Lâmina d'Água Estimada</span><span className="live-tag blue">ONLINE</span></div>
                <h2>{loadingApi ? 'Carregando...' : `${waterLevel} m`}</h2>
                <div className="stat-footer">Calculado para os principais corredores urbanos</div>
              </div>
            </div>

            <div className="chart-card-box">
              <h3>Status dos Pontos Críticos em Recife</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {zones.map(z => {
                  const nivelCalculado = (parseFloat(waterLevel) + (z.raio === 600 ? 0.3 : 0.1)).toFixed(2);
                  const isCritico = nivelCalculado > 0.8;
                  return (
                    <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <strong>{z.nome}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lâmina d'água: {nivelCalculado}m</div>
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

        {/* MAPA COM MODO ESCURO E SATÉLITE */}
        {activeTab === 'mapa' && (
          <div className="fade-in fullscreen-tab">
            <div className="map-container-box">
              <MapContainer center={recifeCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Modo Escuro (Ruas)">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Modo Satélite (Real)">
                    <TileLayer 
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                      attribution="Tiles &copy; Esri"
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>
                
                {zones.map(z => {
                  const nivelCalculado = (parseFloat(waterLevel) + (z.raio === 600 ? 0.3 : 0.1)).toFixed(2);
                  const cor = nivelCalculado > 0.8 ? '#ef4444' : '#f59e0b';
                  return (
                    <Circle key={z.id} center={z.coords} radius={z.raio} pathOptions={{ color: cor, fillColor: cor, fillOpacity: 0.4 }}>
                      <Popup>
                        <div style={{ color: '#000' }}>
                          <strong>{z.nome}</strong><br/>
                          Chuva Atual: {realRain} mm/h<br/>
                          Nível estimado: {nivelCalculado}m
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        )}

        {/* VEÍCULOS FIPE */}
        {activeTab === 'veiculos' && (
          <div className="fade-in scrollable-tab">
            <header className="content-title-header"><h1>Sua Garagem Inteligente</h1><p>Veículos validados pela API oficial da FIPE.</p></header>
            <div className="form-card">
              <form onSubmit={handleSaveVeiculo} className="grid-form">
                <div className="input-group">
                  <label>Escolha a Marca</label>
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
                  <label>Escolha o Modelo</label>
                  <select required disabled={!marcaSelecionada.codigo} value={modeloSelecionado} onChange={(e) => setModeloSelecionado(e.target.value)}>
                    <option value="">{marcaSelecionada.codigo ? "Selecione o modelo..." : "Selecione a marca"}</option>
                    {modelos.map(m => <option key={m.codigo} value={m.nome}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="input-group full-width"><label>Vão Livre / Altura do Solo (cm)</label><input required type="number" placeholder="Ex: 17" value={alturaCarro} onChange={e => setAlturaCarro(e.target.value)} /></div>
                <button type="submit" className="btn-primary">Registrar Veículo</button>
              </form>
            </div>
            <div className="list-card">
              <h3>Veículos Registrados</h3>
              <div className="veiculos-grid">
                {veiculos.filter(v => v.userId === user.email).map(v => (
                  <div key={v.id} className="veiculo-card"><Icons.Car /><div className="v-info"><strong>{v.marca} - {v.modelo}</strong><span>Altura de Segurança: {v.altura}cm</span></div></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* REPORTAR */}
        {activeTab === 'reportar' && (
          <div className="fade-in scrollable-tab">
            <header className="content-title-header"><h1>Reportar Foco de Alagamento</h1><p>Alerte a comunidade sobre pontos intransitáveis.</p></header>
            <div className="form-card">
              <form onSubmit={handleSaveReporte} className="grid-form">
                <div className="input-group full-width">
                  <label>Classificação do Risco</label>
                  <select value={formReporte.tipo} onChange={e => setFormReporte({...formReporte, tipo: e.target.value})}>
                    <option>Alagamento Intransitável</option>
                    <option>Acúmulo Crítico / Atenção</option>
                    <option>Buraco Oculto sob a Água</option>
                  </select>
                </div>
                <div className="input-group full-width"><label>Localização / Referência em Recife</label><input required value={formReporte.local} onChange={e => setFormReporte({...formReporte, local: e.target.value})} /></div>
                <div className="input-group full-width"><label>Relato / Detalhes</label><textarea required rows="3" value={formReporte.descricao} onChange={e => setFormReporte({...formReporte, descricao: e.target.value})} placeholder="Situação no local..."></textarea></div>
                <button type="submit" className="btn-danger">Enviar Alerta Comunitário</button>
              </form>
            </div>
          </div>
        )}

        {/* SUCESSO */}
        {activeTab === 'sucesso_reporte' && (
          <div className="fade-in scrollable-tab success-screen-layout">
            <div className="success-report-card">
              <div className="success-icon-badge">
                <svg viewBox="0 0 24 24" width="36" height="36" stroke="#10b981" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2>Alerta Registrado!</h2>
              <p>Obrigado por ajudar a mapear os riscos em Recife.</p>
              <div className="success-card-buttons">
                <button className="btn-primary" onClick={() => setActiveTab('dashboard')}>Voltar à Central</button>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN */}
        {activeTab === 'admin_reportes' && (
          <div className="fade-in scrollable-tab">
            <header className="content-title-header"><h1>Painel de Moderação</h1><p>Gerencie ocorrências enviadas pelos usuários.</p></header>
            <div className="list-card">
              {reportes.length === 0 ? <p style={{color: '#94a3b8'}}>Nenhuma ocorrência aguardando validação.</p> : (
                <table style={{width: '100%', borderCollapse: 'collapse', color: 'white', textAlign: 'left'}}>
                  <thead><tr style={{borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)'}}><th style={{padding: '12px'}}>Autor</th><th style={{padding: '12px'}}>Local</th><th style={{padding: '12px'}}>Status</th></tr></thead>
                  <tbody>{reportes.map(r => (<tr key={r.id} style={{borderBottom: '1px solid var(--border-color)'}}><td style={{padding: '12px'}}>{r.autor}</td><td style={{padding: '12px'}}>{r.local}</td><td style={{padding: '12px', color: 'var(--warning)'}}>{r.status}</td></tr>))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </main>

      {/* BOTTOM NAV MOBILE */}
      {user.tipo !== 'admin' && (
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
      )}

      {user.tipo === 'admin' && (
        <div className="mobile-bottom-nav">
          <button className={`bottom-nav-item ${activeTab === 'admin_reportes' ? 'active' : ''}`} onClick={() => setActiveTab('admin_reportes')}>
            <Icons.Check /><span>Validar</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Recupera a sessão ativa ao recarregar a página
    const session = localStorage.getItem('floody_active_session');
    if (session) {
      setUser(JSON.parse(session));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('floody_active_session');
    setUser(null);
  };

  return (
    <>
      {!user ? (
        <AuthScreen onLogin={setUser} />
      ) : (
        <MainApp user={user} onLogout={handleLogout} />
      )}
    </>
  );
}