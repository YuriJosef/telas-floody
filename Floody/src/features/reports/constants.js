// Server codes and their pt-BR labels. The server accepts only these codes.
export const HAZARDS = [
  { code: 'flood_impassable', label: 'Alagamento Intransitável' },
  { code: 'pothole', label: 'Buraco na via' },
  { code: 'roadworks', label: 'Obra' },
  { code: 'traffic', label: 'Trânsito' },
];
export const DEFAULT_HAZARD = HAZARDS[0].code;
export const hazardLabel = code => HAZARDS.find(item => item.code === code)?.label ?? 'Ocorrência';

export const REPORT_STATUS = { published: 'published', legacyLocal: 'legacy_local' };
export const UNVERIFIED_LABEL = 'Relato não verificado';
export const LEGACY_LABEL = 'Salvo só neste dispositivo · não publicado';

// Status of the author's own reports, as returned by my_reports.
const OWN_STATUS_LABELS = {
  published: 'Publicado · não verificado',
  held: 'Em revisão · não público',
  hidden: 'Oculto para revisão',
  withdrawn: 'Retirado por você',
  expired: 'Expirado',
  rejected: 'Não publicado',
};
export const ownStatusLabel = status => OWN_STATUS_LABELS[status] ?? 'Status indisponível';
