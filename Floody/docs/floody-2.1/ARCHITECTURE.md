# Floody 2.1 — Arquitetura Supabase, segurança e estado da implementação

Documento técnico da equipe Floody. Atualizado em 2026-11-12 (auditoria do PR #3).

Este arquivo descreve **o que já existe no código**, **o que foi implementado mas ainda não foi verificado em aparelhos físicos** e **o que continua planejado ou adiado**. O código do repositório é a fonte de verdade: em caso de divergência, confira os arquivos citados.

## Legenda de status

| Marcador | Significado |
|---|---|
| **[OK]** | Implementado e coberto por testes automatizados e/ou validado no ambiente local ou no projeto remoto |
| **[APARELHO]** | Implementado e testado no build (bundles web, iOS e Android), mas ainda **sem confirmação em aparelho físico** para o comportamento indicado |
| **[ADIADO]** | Previsto na arquitetura do Floody 2.1, **não implementado**. Não apresente como funcionalidade existente |
| **[DECISÃO]** | Escolha de produto ou de segurança ainda aberta e que exige aprovação |

## 1. Resumo

- **Backend:** Supabase (PostgreSQL 17 + PostGIS 3.3.7 + Supabase Auth), projeto **Floody-Supabase** (`gssztjlcefjayzgvqsck`).
- **Fronteira de segurança:** todas as tabelas ficam no schema privado `app`, com RLS ativado, sem policies e sem nenhum grant para `anon` ou `authenticated`. Os clientes só chamam funções `SECURITY DEFINER` em `public`, com `SET search_path = ''`.
- **Visibilidade derivada:** um relato é público apenas se `status = 'published' AND now() < expires_at`. Um job de manutenção atrasado (ou inexistente) não expõe nada.
- **Autoridade lida do banco a cada chamada:** a verificação de e-mail vem de `auth.users.email_confirmed_at`; papéis vêm de `app.user_roles`. Claims do JWT e `user_metadata` nunca são considerados.
- **Sem Edge Functions e sem Realtime** nesta versão. Os clientes atualizam por polling (30 s, só com o app ativo) e por notificação local.
- **Migrations aplicadas no projeto remoto:** `20261110190000`, `20261110190100`, `20261110190200` (2026-11-10) e `20261112120000_submit_report_text_and_duplicates.sql` (2026-11-12; regras versão 2, ver §4.4).

## 2. Estado da implementação

### 2.1 Backend (Supabase)

| Item | Status | Onde |
|---|---|---|
| Schema `app`, tabelas, constraints, índices, RLS sem policies | **[OK]** | `supabase/migrations/20261110190000_app_schema.sql` |
| Trigger `app.reports_guard` (transições legais, campos imutáveis) | **[OK]** | mesma migration |
| Trigger `app.append_only_guard` em `app.moderation_actions` | **[OK]** | mesma migration |
| `list_published_reports`, `my_access`, `submit_report`, `my_reports`, `withdraw_report` | **[OK]** | `supabase/migrations/20261110190100_report_functions.sql` |
| Limite da Região Metropolitana do Recife (IBGE 2025, 14 municípios) | **[OK]** | `supabase/migrations/20261110190200_rmr_boundary_ibge_2025.sql` |
| Testes pgTAP (62 asserções) | **[OK]** local | `supabase/tests/database/reports.test.sql` |
| Verificação somente leitura no projeto remoto (migrations, grants, RLS, limite) | **[OK]** remoto | executada em 2026-11-10 |
| `app.report_flags`, `app.role_events`, `app.moderation_terms`, `app.maintenance_runs` | **[ADIADO]** | — |
| `flag_report`, `review_queue`, `review_report`, `list_reviewers`, `set_reviewer`, `delete_my_account` | **[ADIADO]** | — |
| `app.run_lifecycle_maintenance()` com `pg_cron` (expiração materializada, purge de 7 dias). **Hoje nada é apagado**: ver seção 5.1 | **[ADIADO]** | — |
| Teste de concorrência com duas conexões (Node) | **[ADIADO]** | — |

### 2.2 Aplicativo (web e nativo)

| Item | Web | iOS | Android |
|---|---|---|---|
| Navegação como visitante e lista pública de relatos | **[OK]** | **[OK]** | **[APARELHO]** |
| Criação de conta, confirmação por e-mail, login | **[OK]** | **[APARELHO]** ¹ | **[APARELHO]** |
| Mostrar/ocultar senha no formulário nativo | — ² | **[APARELHO]** | **[APARELHO]** |
| Indicador de conta sem e-mail ("Minha conta" / "Visitante") | **[OK]** | **[OK]** | **[APARELHO]** |
| Envio de relato (GPS, `observed_at`, idempotência) | **[OK]** | **[OK]** | **[APARELHO]** |
| "Meus relatos" e retirada com confirmação | **[OK]** | **[OK]** | **[APARELHO]** |
| Atualização imediata após retirada no mesmo aparelho | **[OK]** | **[OK]** | **[APARELHO]** |
| Atualização entre abas do mesmo navegador (evento `storage`) | **[OK]** | — | — |
| Polling de 30 s só com o app ativo; atualização ao voltar ao primeiro plano | **[OK]** ³ | **[OK]** | **[APARELHO]** |
| Marcadores no mapa com rótulo "Relato não verificado" | **[OK]** | **[OK]** | **[APARELHO]** |
| Autocomplete de endereço (rotas e painel de chuva) | **[OK]** | **[OK]** | **[APARELHO]** |
| Relatos antigos do Floody 2.0 exibidos só para leitura | **[OK]** | **[APARELHO]** | **[APARELHO]** |
| Rascunhos offline com estados e reenvio explícito | **[ADIADO]** | **[ADIADO]** | **[ADIADO]** |
| Seleção manual do local no mapa (`location_source = 'manual'`) | **[ADIADO]** | **[ADIADO]** | **[ADIADO]** |
| Sinalização de relatos, tela de revisão, gestão de revisores | **[ADIADO]** | **[ADIADO]** | **[ADIADO]** |
| Exclusão de conta com anonimização | **[ADIADO]** | **[ADIADO]** | **[ADIADO]** |
| Deep links nativos (confirmação e redefinição de senha no app) | — | **[ADIADO]** | **[ADIADO]** |

¹ O login no iOS falhou numa rodada de testes porque o iPhone carregou um bundle de um servidor de desenvolvimento apontado para o Supabase local (`http://127.0.0.1:54321`). O servidor foi encerrado e o app agora mostra um aviso, só em desenvolvimento, quando o bundle aponta para um endereço local. É preciso confirmar o login de novo no iPhone com o bundle correto.
² Na web o formulário usa `<input type="password">` padrão; o controle de exibição, quando aparece, é do próprio navegador.
³ A pausa do polling em aba oculta foi coberta por teste unitário do intervalo; a troca de visibilidade não foi exercida num navegador real.

### 2.3 Testes existentes

| Comando (em `Floody/`) | O que cobre | Requisitos |
|---|---|---|
| `npm.cmd run check` | Bindings e imports por plataforma (`scripts/check.cjs`) | Node |
| `npm.cmd test` | 37 testes de serviços (`scripts/services.test.cjs`), com cliente Supabase simulado | Node |
| `node scripts/supabase-local.e2e.mjs` | Fluxos reais contra o Supabase **local**: cadastro e confirmação, logout (normal, sem rede, falha de armazenamento), restauração de sessão, troca de conta, envio concorrente idempotente, isolamento entre contas e retirada (`scripts/supabase-local.e2e.mjs`) | Docker + `npx.cmd supabase start` |
| `npx.cmd supabase test db` | 62 asserções pgTAP contra o banco local | Docker + Supabase CLI |
| `npx.cmd expo export --platform web\|ios\|android` | Validação de bundle | Node |

Os testes de serviço usam um cliente Supabase **simulado**: provam o comportamento do app, não o do servidor. O comportamento do servidor é provado pelo pgTAP local e pela verificação remota somente leitura.

## 3. Modelo de dados (schema `app`)

### 3.1 `app.reports` [OK]

| Coluna | Tipo | Observações |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `author_id` | uuid null, FK `auth.users` ON DELETE SET NULL | Nulo significa conta excluída |
| `client_submission_id` | uuid not null | UNIQUE `(author_id, client_submission_id)` |
| `payload_hash` | bytea (32 bytes) | `sha256` do payload normalizado, calculado no servidor |
| `hazard_type` | text | `flood_impassable`, `pothole`, `roadworks`, `traffic` (rótulos pt-BR ficam no cliente) |
| `description` | text | 1–2000 caracteres |
| `location_label` | text null | até 200 caracteres; declarado pelo usuário, nunca verificado |
| `location` | geometry(Point, 4326) | arredondado a 5 casas decimais na ingestão |
| `location_source` | text | `gps` ou `manual` (procedência declarada, não prova) |
| `gps_accuracy_m` | real null | declarado pelo aparelho (web e nativo enviam a precisão informada pelo GPS; procedência, não prova) |
| `boundary_id` | int FK `app.rmr_boundaries` | versão do limite que validou o ponto |
| `observed_at` | timestamptz | declarado pelo cliente |
| `received_at` | timestamptz | horário do servidor |
| `status` | text | `held`, `published`, `hidden`, `rejected`, `withdrawn`, `expired` |
| `hold_reasons` | text[] | códigos das regras; nunca expostos ao público |
| `rules_version` | smallint | versão das regras de moderação |
| `review_deadline_at` | timestamptz | `received_at + 24 h` |
| `first_published_at`, `expires_at` | timestamptz null | definidos uma vez; `expires_at = first_published_at + 48 h` |
| `auto_hide_exempt` | boolean | reservado para a sinalização [ADIADO] |
| `closed_at`, `purge_after` | timestamptz null | estado terminal; `purge_after = closed_at + 7 dias` |
| `author_deleted_at`, `updated_at` | timestamptz | — |

### 3.2 Outras tabelas

| Tabela | Status | Uso |
|---|---|---|
| `app.rmr_boundaries` | **[OK]** | Limite versionado (MultiPolygon 4326, `ST_IsValid`), com fonte, edição, licença, `source_sha256`, `municipality_codes`. Índice único parcial: só uma linha `is_active` |
| `app.rmr_boundary_parts` | **[OK]** | `ST_Subdivide(geom, 256)` com índice GiST, para a consulta de ponto |
| `app.moderation_actions` | **[OK]** | Auditoria só de inserção, sem conteúdo do relato. Única atualização permitida: zerar `actor_id` quando a conta é excluída |
| `app.user_roles` | **[OK]** (vazia) | Papéis `reviewer` e `admin`; nenhuma função a preenche ainda |
| `app.app_config` | **[OK]** | `submit_limit_per_hour = 5`, `submit_limit_per_day = 20`, `public_list_limit = 500`, `review_window_hours = 24`, `rules_version = 2` |
| `app.report_flags`, `app.role_events`, `app.moderation_terms`, `app.maintenance_runs` | **[ADIADO]** | Serão adicionadas por migrations novas, sem alterar as existentes |

### 3.3 Onde cada invariante é garantida [OK]

| Invariante | Mecanismo |
|---|---|
| `expires_at = first_published_at + 48 h`; ambos nulos ou ambos definidos | CHECK |
| `observed_at` entre `received_at − 6 h` e `received_at + 2 min` | CHECK (reforço da função) |
| Estado terminal ⇔ `closed_at` e `purge_after` definidos | CHECK |
| Idempotência por autor | UNIQUE + advisory lock por usuário |
| Transições legais; imutabilidade de conteúdo, local, horários e `expires_at` | trigger `app.reports_guard` |
| Autorização, e-mail verificado, limite geográfico, limites de envio, regras de moderação | corpo de `public.submit_report`, numa transação |
| Auditoria só de inserção | trigger `app.append_only_guard` |

## 4. Fronteira de segurança

### 4.1 API pública (`public`, todas `SECURITY DEFINER`, `SET search_path = ''`)

| Função | `anon` | `authenticated` | Status |
|---|---|---|---|
| `list_published_reports()` | sim | sim | **[OK]** |
| `my_access()` | não | sim | **[OK]** |
| `submit_report(...)` | não | sim (e-mail verificado exigido dentro da função) | **[OK]** |
| `my_reports()` | não | sim (só as próprias linhas) | **[OK]** |
| `withdraw_report(p_report_id uuid)` | não | sim (só o autor) | **[OK]** |
| demais funções da seção 2.1 | — | — | **[ADIADO]** |

Funções auxiliares internas (`app.config_int`, `app.is_public`, `app.effective_status`, `app.result`) não são executáveis por clientes.

### 4.2 Regras para quem implementa

- **Grants:** o Supabase concede EXECUTE em funções novas de `public` a `anon` e `authenticated` por padrão. Toda função nova precisa de `REVOKE ALL ... FROM PUBLIC, anon, authenticated` seguido de grants explícitos. Os testes verificam isso com `has_function_privilege`.
- **RLS:** `ENABLE`, nunca `FORCE`. Com `FORCE` e sem policies, as próprias funções do dono seriam bloqueadas.
- **Schemas expostos:** só `public` (`supabase/config.toml`). `app` não tem USAGE para clientes.
- **Higiene das funções definer:** parâmetros tipados, sem SQL dinâmico, nomes totalmente qualificados (`extensions.st_*`, `app.*`).
- **Saída pública:** `list_published_reports()` não retorna autor, `hold_reasons`, `payload_hash` nem `client_submission_id`; as coordenadas saem com 4 casas decimais (cerca de 11 m) e cada linha traz `verification = 'unverified_user_report'`.
- **Existência de relatos alheios:** `withdraw_report` responde `NOT_FOUND` tanto para relato inexistente quanto para relato de outro usuário.
- **Chaves no app:** apenas a chave publicável (`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). `createSupabase.js` recusa chaves `sb_secret_` e JWTs com `role` diferente de `anon`.

### 4.3 Contrato de `submit_report` [OK]

Parâmetros: `p_client_submission_id` (uuid), `p_hazard_type`, `p_description`, `p_location_label`, `p_latitude`, `p_longitude`, `p_location_source`, `p_gps_accuracy_m`, `p_observed_at` (texto ISO 8601 **com fuso**; sem fuso é rejeitado).

Ordem das verificações (faz parte do contrato):

1. Sessão (`AUTH_REQUIRED`).
2. Advisory lock por usuário.
3. Consulta de idempotência por `(auth.uid(), client_submission_id)`: mesmo hash → `OK` com `replayed: true`; hash diferente → `IDEMPOTENCY_CONFLICT`. Vem antes da janela de tempo de propósito.
4. E-mail verificado em `auth.users` (`EMAIL_NOT_VERIFIED`; conta anônima também é rejeitada; conta banida → `FORBIDDEN`).
5. Validação de campos (`VALIDATION_FAILED` com `details.fields`). Descrição e local são aparados de todo espaço em branco nas pontas (quebras de linha e tabulações incluídas); a descrição precisa ter ao menos uma letra ou um dígito. O hash de idempotência continua calculado como na versão 1, para que reenvios antigos ainda sejam reconhecidos.
6. Janela de tempo pelo relógio do servidor (`OBSERVED_AT_IN_FUTURE` acima de 2 min; `OBSERVATION_TOO_OLD` acima de 6 h).
7. Limite geográfico (`OUTSIDE_SERVICE_AREA`; sem limite ativo → `SERVICE_UNAVAILABLE`, falha fechada).
8. Limites de envio (`RATE_LIMITED` com `retry_after_s`).
9. Regras de moderação e inserção.

Resposta: `{ ok, code, retryable, replayed, report: { id, status, expires_at }, details }`.

### 4.4 Regras de moderação, versão 2 [OK]

O relato fica `held` (não público) se:

- a descrição ou o local contém URL ou e-mail (versão 2: `http(s)://` e `www.` em qualquer caixa; domínio solto só em minúsculas e sem `.me`, para que "alagada.Com" ou "Jesus.Me" sem espaço após o ponto não contem como link);
- contém um telefone brasileiro (DDD + 8 ou 9 dígitos; um CEP não conta; versão 2: dígitos logo após ponto ou vírgula decimal, como em coordenadas, também não contam);
- o mesmo autor enviou o mesmo tipo a até 100 m nos últimos 30 minutos (versão 2: relatos que o próprio autor retirou não contam, para permitir retirar e corrigir; continuam contando no limite de envios);
- o autor tem 2 ou mais relatos rejeitados em 30 dias.

**Limitação desta versão:** não existe revisão manual **[ADIADO]**. Um relato retido nunca é publicado; pelo status efetivo ele passa a `expired` 24 h depois do recebimento. Nenhum timeout publica um relato. O app informa isso ao autor ("Relato recebido, mas não publicado… a verificação manual ainda não está disponível nesta versão") e não deve sugerir que alguém vai revisar o relato. As regras de retenção também retêm envios legítimos (por exemplo, um segundo relato do mesmo tipo no mesmo lugar em 30 minutos) **[DECISÃO]**. A lista de termos bloqueados (`app.moderation_terms`) está **[ADIADO]**.

## 5. Ciclo de vida do relato

"Status efetivo" (`app.effective_status`): `published` ou `hidden` depois de `expires_at` conta como `expired`; `held` depois de `review_deadline_at` também.

| De | Ação | Para | Status |
|---|---|---|---|
| — | `submit_report` sem regra acionada | `published` (define `first_published_at` e `expires_at`) | **[OK]** |
| — | `submit_report` com regra acionada | `held` | **[OK]** |
| `held`, `published`, `hidden` | `withdraw_report` pelo autor | `withdrawn` (sai da visão pública na hora) | **[OK]** |
| `published`, `hidden` | passa `expires_at` | invisível imediatamente pelo predicado; `expired` materializado pelo job | visibilidade **[OK]**, job **[ADIADO]** |
| `held` | passa `review_deadline_at` | `expired` | predicado **[OK]**, job **[ADIADO]** |
| `held` | aprovar ou rejeitar (revisor, nunca o autor) | `published` ou `rejected` | **[ADIADO]** |
| `published` | sinalizações atingem o limite, ou ocultação manual | `hidden` (sem alterar `expires_at`) | **[ADIADO]** |
| `hidden` | restaurar (antes de `expires_at`) ou manter a ocultação | `published` ou `rejected` | **[ADIADO]** |
| `withdrawn`, `expired`, `rejected` | `purge_after` | linha excluída; auditoria mantida | **[ADIADO]** |

O trigger `app.reports_guard` já recusa qualquer transição fora desta tabela, inclusive para as funções futuras.

### 5.1 O que o banco garante hoje sobre retenção

Sem o job de manutenção **[ADIADO]**, nenhuma linha de `app.reports` é apagada. Na prática:

| Situação | Visível ao público | `closed_at` / `purge_after` | Apagado? |
|---|---|---|---|
| `published` dentro de 48 h | sim | nulos | não |
| `published` depois de `expires_at` | **não** (predicado em toda leitura) | **nulos** (o status continua `published` no banco) | **não** |
| `held` | não | nulos; depois de 24 h o status efetivo é `expired` | **não** |
| `withdrawn` | não, na hora | definidos (`purge_after = closed_at + 7 dias`) | **não**; `purge_after` é só uma marcação |

Consequências: os requisitos de "7 dias de retenção antes do purge" e de anonimização na exclusão de conta **ainda não são cumpridos**. Relatos expirados, retidos e retirados ficam no banco por tempo indeterminado, com coordenadas de 5 casas decimais, descrição, rótulo de local e `author_id`. O autor continua vendo esses relatos em `my_reports()` (até 200). Ao excluir uma conta em `auth.users`, `author_id` vira nulo, mas o conteúdo permanece.

**Proposta para implementar (não implementada, exige aprovação):**

1. Nova migration com `app.run_lifecycle_maintenance()` (sem grants para clientes), em lotes:
   - materializar `published`/`hidden` vencidos como `expired` com `closed_at = expires_at` (horário lógico, não o da execução);
   - materializar `held` vencidos como `expired` com `closed_at = review_deadline_at`;
   - apagar linhas com `purge_after <= now()` (incluindo os vencidos já materializados) e registrar contagens em `app.maintenance_runs`.
2. Agendamento com `pg_cron` a cada 5 minutos no projeto remoto.
3. Testes pgTAP com dados retroativos para cada transição e para o purge.

Consequências a aprovar: é uma **exclusão definitiva em produção**; relatos antigos com mais de 7 dias desde o fechamento seriam apagados na primeira execução; `my_reports()` deixaria de mostrar o histórico apagado; a auditoria (`app.moderation_actions`) não tem conteúdo e continua. Também é preciso confirmar se `pg_cron` está habilitado no plano e se o projeto pode ser pausado por inatividade (o que interrompe o job).

## 6. Limite geográfico e privacidade

- **Fonte [OK]:** lista de municípios da tabela IBGE "Composição das Regiões Metropolitanas" 2025 (RM de Recife, código 03001: 14 municípios) e geometria da Malha Municipal Digital 2025 do IBGE (`PE_Municipios_2025.zip`, SIRGAS 2000, sha256 `534bc4d7…0d2cb8`), convertida para EPSG:4326 pelo PostGIS. Área total de 2.761,9 km², igual à soma oficial do IBGE. Sem buffer.
- **Verificação [OK]:** pontos de referência dentro (Marco Zero, Olinda, Boa Viagem, Cabo, Igarassu) e fora (Goiana, oceano, Caruaru), local e remoto.
- **Pendências [DECISÃO]:** termos de licença da Nota Metodológica do IBGE; conferência da composição legal com a legislação estadual vigente; comportamento em praias, píeres e pontes.
- **Procedência:** o servidor só verifica que o ponto declarado está dentro do limite, nunca que o usuário esteve lá. Todo relato público é rotulado "Relato não verificado".
- **Geocodificação:** a busca de endereço (Geoapify) é feita pelo cliente e envia o texto ou as coordenadas ao provedor. O servidor nunca chama um geocodificador.

## 7. Integração no cliente

### 7.1 Arquivos

| Arquivo | Papel |
|---|---|
| `src/services/supabase/createSupabase.js` | Cria o cliente; valida URL e chave publicável; `isLoopbackUrl` |
| `src/services/supabase/client.web.js` | Sessão em `localStorage`, `detectSessionInUrl: true` |
| `src/services/supabase/client.native.js` | Sessão em AsyncStorage (sem criptografia), `detectSessionInUrl: false`, auto-refresh ligado ao `AppState` |
| `src/store/AuthContext.js` | Estados visitante e conta; `signIn`, `signUp`, `resendConfirmation`, `logout` (escopo `local`, nunca lança exceção). O objeto `user` não contém e-mail |
| `src/store/authSession.js` | `accountFromSession` e `signOutThisDevice` (resultado do logout pela sessão gravada), testáveis sem React |
| `src/store/authMessages.js` | Mensagens pt-BR para erros de autenticação; falha de rede e códigos desconhecidos aparecem explicitamente |
| `src/features/reports/services/reportService.js` | `listPublishedReports`, `listReports`, `createReport`, `listMyReports`, `withdrawReport`, `subscribeToReports` |
| `src/features/reports/constants.js` | Códigos de perigo e rótulos pt-BR; rótulos de status; `submissionOutcome` (texto da confirmação de envio, compartilhado entre web e nativo) |
| `src/features/reports/hooks/useMyReports.js` | Fluxo "Meus relatos" compartilhado: confirmar → pendente → sucesso ou erro |
| `src/features/reports/components/MyReportsPanel.{web,native}.js` | Interface de "Meus relatos" |
| `src/features/map/components/AddressAutocomplete.native.js` | Autocomplete nativo (mesmas regras da web), usado no mapa e no painel de chuva |
| `src/services/appActivity.{web,native}.js` | Visibilidade da aba ou estado do app, para pausar o polling |

### 7.2 Fluxo de dados dos relatos [OK]

1. A tela registra a posição do GPS e o horário da observação; gera um `client_submission_id` com `expo-crypto` (`randomUUID`). Qualquer edição do conteúdo gera um ID novo; reenviar o mesmo conteúdo reutiliza o ID.
2. `createReport` chama `submit_report` e converte cada código de resposta em mensagem pt-BR. Falha de rede nunca é mostrada como sucesso.
3. Depois de envio ou retirada, `reportService` invalida as leituras em andamento, notifica todas as telas inscritas e grava `floody_reports_changed` no armazenamento local (outras abas do navegador recarregam pelo evento `storage`).
4. Relatos retirados neste aparelho somem da lista pública na hora, antes da resposta do servidor.
5. Mudanças vindas de outros aparelhos chegam pelo polling de 30 s, que só roda com pelo menos uma tela inscrita e com o app visível ou ativo; ao voltar ao primeiro plano há uma atualização imediata.
6. Leituras simultâneas do mesmo conjunto compartilham uma única requisição; cada tela aplica apenas o resultado mais recente.

Custo estimado do polling: 2 chamadas por minuto por tela ativa, a uma função limitada a 500 linhas. Se o número de usuários crescer, reavalie o intervalo ou Realtime (que exigiria expor tabelas e precisa de aprovação).

### 7.3 Relatos antigos (`floody_reports`) [OK]

A chave local do Floody 2.0 não é mais gravada. O conteúdo aparece só para leitura como "Salvo só neste dispositivo · não publicado" e **nunca** é enviado ao servidor. Esses relatos continuam visíveis mesmo sem backend configurado ou com falha de rede: `listReports()` rejeita (o erro é exibido), mas o erro traz os relatos locais em `partial`. Quando uma atualização falha, a tela mantém a última lista, mas remove os relatos cujo `expires_at` já passou pelo relógio do aparelho (`withoutExpired`); relatos retirados por outras pessoas só somem na próxima atualização bem-sucedida.

### 7.4 Sessões

- **Web [OK]:** o link de confirmação abre o app web e entra na conta (`detectSessionInUrl`).
- **Nativo [OK]:** sem deep links; o usuário confirma o e-mail pelo link e depois entra no app com e-mail e senha.
- **Logout [OK]:** escopo `local`, encerra apenas a sessão deste aparelho. O resultado é decidido pela sessão que ficou gravada (`src/store/authSession.js`), não só pelo erro: com `supabase-js` 2.119 a sessão local é apagada antes da chamada ao servidor, então sair sem internet funciona neste aparelho (o refresh token só não é revogado no servidor). Se o armazenamento falhar e a sessão continuar gravada, o app mantém a conta e mostra "Não foi possível sair desta conta neste aparelho".
- **Armazenamento nativo [DECISÃO]:** tokens em AsyncStorage sem criptografia; a alternativa é `expo-secure-store`.

## 8. Configuração

| Configuração | Onde | Estado |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `Floody/.env.local` (fora do Git); nomes em `.env.example` | Configurado para o projeto remoto |
| `EXPO_PUBLIC_GEOAPIFY_API_KEY` | `Floody/.env.local` | Chave sem restrição de origem (funciona no nativo) |
| Confirmação de e-mail ligada, login anônimo desligado | Projeto remoto | Verificado pelo endpoint público `/auth/v1/settings` |
| Site URL, URLs de redirecionamento, tamanho mínimo de senha, schemas expostos | Painel do Supabase | **Não verificado** por este repositório; `supabase/config.toml` vale só para o ambiente local |
| SMTP próprio | Painel do Supabase | Não configurado; o mailer padrão tem limite baixo de e-mails por hora |

Arquivos que nunca entram no Git: `Floody/.env.local`, `Floody/supabase/.temp/` (inclui o vínculo do projeto), `Floody/supabase/.branches/`, `Floody/.expo/`.

## 9. Diferenças em relação ao projeto original de arquitetura

- **Login antes da confirmação:** com a confirmação de e-mail ligada, uma conta não confirmada **não consegue entrar**. Isso conflita com o requisito futuro de "qualquer usuário autenticado pode sinalizar, mesmo sem e-mail verificado". Resolver antes de implementar a sinalização. **[DECISÃO]**
- **Polling:** 30 s em vez dos 90 s propostos, com pausa em segundo plano.
- **Rascunhos:** não há a fila `floody_report_drafts_v1`; só o formulário atual guarda o `client_submission_id` para reenvio.
- **Telefone:** a regra de moderação usa um padrão de telefone brasileiro, para não reter endereços com CEP.
- **`p_observed_at` como texto:** o fuso é obrigatório; um `timestamptz` aceitaria horários sem fuso silenciosamente.

## 10. Decisões pendentes [DECISÃO]

1. **Decidido (2026-11-12):** 3 sinalizações de contas distintas com e-mail verificado ocultam o relato até a revisão. A sinalização em si continua **[ADIADO]**.
2. **Decidido (2026-11-12):** 24 h para relatos retidos ou ocultos; depois `expired`. Nenhum prazo republica um relato.
3. Relato aprovado após retenção: 48 h a partir da aprovação ou limitado a `received_at + 48 h`.
4. Política de retenção e purge de relatos encerrados. Hoje o CHECK só calcula `purge_after = closed_at + 7 dias` para estados terminais; **nada é apagado** (ver seção 5.1).
5. Exclusão de conta: detalhes de anonimização e retenção.
6. Retenção do log de auditoria.
7. Regras de moderação: **decidido (2026-11-12)** restringir as regras de telefone e link para reduzir falsos positivos (regras versão 2, `app.text_hold_reasons`). Ainda pendente: responsável pela lista de termos.
8. Limites de envio e CAPTCHA no cadastro.
9. **Decidido (2026-11-12):** coordenadas públicas com 4 casas decimais (~11 m); o autor vê a precisão completa.
10. **Decidido (2026-11-12):** a confirmação de e-mail continua obrigatória para entrar; portanto só contas verificadas podem sinalizar. Isso substitui o requisito anterior de permitir sinalização por contas não verificadas (no Supabase, desligar a confirmação marca todos como confirmados e quebraria a regra de envio).
11. Geocodificação reversa no fluxo de relato.
12. Armazenamento criptografado dos tokens no nativo.
13. Licença e definição legal do limite da RMR. Pesquisa (2026-11-12): dados do IBGE costumam ser tratados como de uso livre com citação obrigatória da fonte ("Fonte: IBGE"); as condições exatas estão na nota "Malha Municipal Digital e Áreas Territoriais 2025: Informações Técnicas e Legais", ainda não lida na íntegra. A malha é representação cartográfica, não demarcação legal. **Decidido (2026-11-12):** usar os dados do IBGE com o crédito "Fonte: IBGE" e o aviso "representação cartográfica, não demarcação legal" nas telas de relato (web e nativo). A leitura integral da nota técnica e legal de 2025 continua recomendada.
14. SMTP próprio para produção.

## 11. Orientações para agentes de IA e desenvolvedores

- Leia `CLAUDE.md`, `Agents.md` e `Floody/AGENTS.md`. Para APIs do Expo, consulte a documentação do SDK 58.
- **Nunca** aplique migrations, altere dados, configurações de Auth ou segredos do projeto remoto sem aprovação explícita. Valide tudo antes no Supabase local (`npx.cmd supabase start`, `npx.cmd supabase test db`).
- Funcionalidade nova no banco: **nova migration**, nunca edição das já aplicadas. Toda função nova em `public` precisa de revoke e grants explícitos, `SECURITY DEFINER`, `SET search_path = ''` e testes de privilégio.
- Não coloque chave secreta ou de service role em variáveis `EXPO_PUBLIC_*`.
- Não apresente itens **[ADIADO]** como existentes, nem relatos de usuários como verificados.
- Um servidor de desenvolvimento apontado para o Supabase local (`127.0.0.1`) não funciona num celular físico; use o servidor configurado pelo `.env.local`.
- Depois de qualquer mudança: `npm.cmd run check`, `npm.cmd test` e os bundles web, iOS e Android. Funcionalidade nativa só está verificada depois de testada em aparelho.
