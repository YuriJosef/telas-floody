export default function VehiclesScreen({ catalogError, loadingModels, loadingMakes, savingVehicle, alturaCarro, handleSaveVeiculo, marcaSelecionada, marcas, modeloSelecionado, modelos, setAlturaCarro, setMarcaSelecionada, setModeloSelecionado, user, veiculos }) {
 return (<div className="scrollable-tab garage-page">
            <header className="page-heading compact"><h1>Sua garagem</h1><p>Consulta ao catálogo de veículos. Cadastro salvo neste dispositivo.</p></header>
            {catalogError && <p role="alert" className="alerts-error">{catalogError}</p>}
            <section className="form-card"><h2 className="form-section-title">Adicionar veículo</h2>
              <form onSubmit={handleSaveVeiculo} className="grid-form">
                <div className="input-group">
                  <label htmlFor="vehicle-make">Marca</label>
                  <select id="vehicle-make" required disabled={loadingMakes} value={marcaSelecionada.codigo} onChange={(e) => {
                    const chosen = marcas.find(m => m.codigo === e.target.value);
                    setMarcaSelecionada({ codigo: chosen?.codigo || '', nome: chosen?.nome || '' });
                    setModeloSelecionado('');
                  }}>
                    <option value="">{loadingMakes ? 'Consultando fabricantes…' : 'Selecione a fabricante...'}</option>
                    {marcas.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="vehicle-model">Modelo</label>
                  <select id="vehicle-model" required disabled={!marcaSelecionada.codigo || loadingModels} value={modeloSelecionado} onChange={(e) => setModeloSelecionado(e.target.value)}>
                    <option value="">{loadingModels ? 'Consultando modelos…' : marcaSelecionada.codigo ? 'Selecione o modelo...' : 'Selecione a marca primeiro'}</option>
                    {modelos.map(m => <option key={m.codigo} value={m.nome}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="input-group full-width">
                  <label htmlFor="vehicle-clearance">Vão livre do solo (cm)</label>
                  <input id="vehicle-clearance" aria-describedby="clearance-help" required type="number" min="0.1" max="150" step="0.1" placeholder="Ex: 17" value={alturaCarro} onChange={e => setAlturaCarro(e.target.value)} />
                </div>
                <p id="clearance-help" className="caption full-width">Consulte a especificação do veículo. Esta medida não indica uma profundidade segura para atravessar água.</p>
                <button type="submit" className="btn-primary" disabled={savingVehicle}>{savingVehicle ? 'Salvando…' : 'Salvar veículo'}</button>
              </form>
            </section>

            <section className="vehicle-list" aria-live="polite">
              <h2>Veículos neste dispositivo</h2>
              {veiculos.filter(v => v.userId === user.id).length === 0 ? (
                <p className="empty-state caption">Nenhum veículo cadastrado ainda.</p>
              ) : (
                <div className="vehicle-rows">
                  {veiculos.filter(v => v.userId === user.id).map(v => (
                    <article key={v.id} className="vehicle-row">
                      <div><strong>{v.marca} - {v.modelo}</strong></div>
                      <div><span>Vão livre: <strong>{v.altura} cm</strong></span></div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>);
}
