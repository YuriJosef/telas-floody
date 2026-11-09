import OfficialAlertsPanel from '../alerts/components/OfficialAlertsPanel.web';
import { formatDateTime } from '../../utils/formatters';
import { precipitationDetails } from '../dashboard/services/weatherService';
import Icons from '../../components/icons/Icons';

export default function DashboardScreen({ weatherError, buscaCentralQuery, buscaCentralSuggestions, cidadeAtualNome, expandedZoneId, favoritos, fetchWeatherForCoords, filtroApenasFavoritos, filtroTextoZona, handleCentralInputChange, handleCentralSearch, loadingApi, nearbyAreas, weatherReading, reportLoading, reportesExibidos, selectedCentralAddressRef, setBuscaCentralQuery, setBuscaCentralSuggestions, setExpandedZoneId, setFiltroApenasFavoritos, setFiltroTextoZona, toggleFavorito }) {
  const details = weatherReading && precipitationDetails(weatherReading);
  return (
    <div className="scrollable-tab dashboard">
      <header className="page-heading">
        <div><h1>Condições da região</h1><p>Avisos, chuva e relatos. Cada informação com sua fonte.</p></div>
      </header>
      <div className="dashboard-grid">
        <OfficialAlertsPanel />
        <section className="weather-panel" aria-labelledby="weather-title">
          <header className="weather-heading"><div><p className="source-label">Modelo Open-Meteo</p><h2 id="weather-title">Precipitação</h2></div><span className="weather-emblem" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M8 18a6 6 0 0 1 0-12 8 8 0 0 1 14 2 5 5 0 0 1 1 10Z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m10 23-2 4m9-4-2 4m9-4-2 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></span></header>
          <div className="weather-reading" aria-live="polite" aria-busy={loadingApi}>
            <p>{cidadeAtualNome}</p>
            <div className="weather-value">
              {loadingApi ? <strong className="weather-status">Consultando…</strong> : weatherError
                ? <p className="alerts-error" role="alert">{weatherError}</p>
                : !weatherReading ? <p className="alerts-error">Precipitação indisponível. Tente consultar novamente.</p>
                : <p className="rain-value">{weatherReading.amountMm.toLocaleString('pt-BR')} <span>mm</span></p>}
            </div>
            <div className="weather-meta">
              {details && <>
                <p>Acumulado modelado em {details.period}</p>
                <p>Validade: <time dateTime={new Date(weatherReading.validAt).toISOString()}>{details.time}</time> · Recife</p>
                {details.stale && <strong>Estimativa desatualizada</strong>}
              </>}
            </div>
          </div>
          <p className="caption">Estimativa do Open-Meteo. Não mede alagamentos nem indica passagem segura.</p>
          <form className="stack" onSubmit={handleCentralSearch}>
            <label className="input-group">Consultar outro local
              <input aria-label="Buscar endereço" placeholder="Rua, bairro e cidade" value={buscaCentralQuery} onChange={e => handleCentralInputChange(e.target.value)} />
            </label>
            {buscaCentralSuggestions.length > 0 && <div className="suggestions-dropdown" aria-label="Endereços encontrados">
              {buscaCentralSuggestions.map((s, index) => <button type="button" className="suggestion-item" key={index} onClick={() => {
                selectedCentralAddressRef.current = s.display_name;
                setBuscaCentralQuery(s.display_name);
                fetchWeatherForCoords(Number(s.lat), Number(s.lon), s.display_name);
                setBuscaCentralSuggestions([]);
              }}>{s.display_name}</button>)}
            </div>}
            <button className="btn-primary" disabled={loadingApi}><Icons.Search /> Consultar chuva</button>
          </form>
          <div><h3>Locais de Recife</h3><div className="regional-area-list" role="group" aria-label="Selecionar local de Recife">
            {nearbyAreas.map(area => <button key={area.name} className="regional-area-button" aria-pressed={cidadeAtualNome === area.name} onClick={() => {
              selectedCentralAddressRef.current = area.name;
              setBuscaCentralQuery(area.name);
              fetchWeatherForCoords(...area.coords, area.name);
              setBuscaCentralSuggestions([]);
            }}>{area.name}</button>)}
          </div></div>
        </section>
      </div>
      <section className="reports-panel" aria-labelledby="reports-title">
        <header className="section-heading"><div><p className="source-label">Neste dispositivo</p><h2 id="reports-title">Relatos locais</h2><p className="caption">Registros locais com status aprovado. Este aplicativo não publica relatos.</p></div>
          <button className="btn-action-secondary" aria-pressed={filtroApenasFavoritos} onClick={() => setFiltroApenasFavoritos(!filtroApenasFavoritos)}><Icons.Star filled={filtroApenasFavoritos} /> Favoritos</button>
        </header>
        <label className="input-group">Filtrar registros<input aria-label="Filtrar ocorrências" placeholder="Local ou tipo de ocorrência" value={filtroTextoZona} onChange={e => setFiltroTextoZona(e.target.value)} /></label>
        {reportLoading ? <p role="status">Carregando relatos…</p> : reportesExibidos.length === 0
          ? <div className="empty-state"><Icons.Map /><div><h3>Nenhum registro para exibir</h3><p>Os novos relatos ficam salvos neste dispositivo, com status pendente. A ausência de registros não confirma ausência de risco.</p></div></div>
          : reportesExibidos.map(report => <article className="report-row" key={report.id}>
            <button className="report-disclosure" aria-expanded={expandedZoneId === report.id} onClick={() => setExpandedZoneId(expandedZoneId === report.id ? null : report.id)}>
              <strong>{report.location_label}</strong><span>{report.hazard_type} · {formatDateTime(report.occurred_at)}</span>
            </button>
            <button className="icon-button" aria-label="Favoritar relato" aria-pressed={favoritos.includes(report.id)} onClick={e => toggleFavorito(report.id, e)}><Icons.Star filled={favoritos.includes(report.id)} /></button>
            {expandedZoneId === report.id && <div className="report-details"><p>{report.description}</p><p className="caption">Posição {report.latitude}, {report.longitude} · Autor {report.author_id}</p></div>}
          </article>)}
      </section>
    </div>
  );
}
