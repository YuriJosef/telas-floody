const states = { AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins' };
export const ALERT_SCOPES = [
  { id: 'recife', label: 'Recife/PE', uf: 'PE', municipalityCode: '2611606' },
  { id: 'olinda', label: 'Olinda/PE', uf: 'PE', municipalityCode: '2609600' },
  { id: 'jaboatao', label: 'Jaboatão dos Guararapes/PE', uf: 'PE', municipalityCode: '2607901' },
  { id: 'brasil', label: 'Brasil (todos os estados)' },
  ...Object.entries(states).map(([uf, name]) => ({ id: uf, uf, label: `${name} (estado inteiro)` })),
];
export function formatAlertDate(value) { return new Date(value).toLocaleString('pt-BR'); }
