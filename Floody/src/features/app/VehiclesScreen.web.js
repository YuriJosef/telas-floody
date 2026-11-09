export default function VehiclesScreen({ alturaCarro, handleSaveVeiculo, marcaSelecionada, marcas, modeloSelecionado, modelos, setAlturaCarro, setMarcaSelecionada, setModeloSelecionado, user, veiculos }) {
 return (<div className="fade-in scrollable-tab">
            <header className="content-title-header"><h1>Sua Garagem Inteligente</h1><p>Consulta ao catálogo de veículos. Cadastro salvo neste dispositivo.</p></header>
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
                  <input required type="number" min="0.1" max="150" step="0.1" placeholder="Ex: 17" value={alturaCarro} onChange={e => setAlturaCarro(e.target.value)} />
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
          </div>);
}
