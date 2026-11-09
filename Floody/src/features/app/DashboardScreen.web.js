import OfficialAlertsPanel from '../alerts/components/OfficialAlertsPanel.web';
import { formatDateTime } from '../../utils/formatters';

import Icons from '../../components/icons/Icons';
import { normalizeText } from '../dashboard/indicators';

export default function DashboardScreen({ buscaCentralQuery, buscaCentralSuggestions, cidadeAtualNome, expandedZoneId, favoritos, fetchWeatherForCoords, filtroApenasFavoritos, filtroTextoZona, handleCentralInputChange, handleCentralSearch, loadingApi, nearbyAreas, realRain, reportLoading, reportesExibidos, selectedCentralAddressRef, setBuscaCentralQuery, setBuscaCentralSuggestions, setExpandedZoneId, setFiltroApenasFavoritos, setFiltroTextoZona, toggleFavorito }) {
 return (<div className="fade-in scrollable-tab">
            <header className="content-title-header">
              <h1>Floody · Central de monitoramento</h1>
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
                    aria-label="Buscar endereço"
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
                <p>Selecione um ponto próximo para consultar a precipitação local.</p>
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

            <section className="stat-card" aria-label="Chuva consultada"><h2>Precipitação atual</h2><p>{loadingApi ? 'Consultando…' : realRain == null ? 'Precipitação indisponível.' : `${realRain} mm · ${cidadeAtualNome}`}</p><p className="alerts-caption">Fonte: Open-Meteo. A precipitação não é um aviso oficial nem uma medição de alagamento.</p></section>
            <OfficialAlertsPanel />
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
                      aria-label="Filtrar ocorrências"
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
          </div>);
}
