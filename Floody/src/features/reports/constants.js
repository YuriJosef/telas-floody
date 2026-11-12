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

// What the author sees after a successful submit_report. Manual review is not available in this
// release: a held report is never published and closes (expires) 24 h after it was received.
const SUBMISSION_OUTCOMES = {
  published: {
    title: 'Relato publicado como não verificado',
    body: 'Outros usuários podem vê-lo no mapa por até 48 horas, marcado como relato não verificado. Ele não foi enviado a serviços de emergência.',
  },
  held: {
    title: 'Relato recebido, mas não publicado',
    body: 'O relato foi armazenado, mas não foi publicado automaticamente. A verificação manual ainda não está disponível nesta versão, então ele não ficará público e será encerrado em 24 horas. Você pode retirá-lo em "Meus relatos". Ele não foi enviado a serviços de emergência.',
  },
};
export const submissionOutcome = status => SUBMISSION_OUTCOMES[status] ?? SUBMISSION_OUTCOMES.held;

// Status of the author's own reports, as returned by my_reports.
const OWN_STATUS_LABELS = {
  published: 'Publicado · não verificado',
  held: 'Retido · não publicado',
  hidden: 'Oculto · não público',
  withdrawn: 'Retirado por você',
  expired: 'Expirado',
  rejected: 'Não publicado',
};
export const ownStatusLabel = status => OWN_STATUS_LABELS[status] ?? 'Status indisponível';
