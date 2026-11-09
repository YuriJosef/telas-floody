# Floody

Aplicação Expo SDK 58 para web, Android e iOS. A versão web utiliza React/Leaflet; Android e iOS utilizam componentes React Native, Leaflet/OpenStreetMap em WebView, localização em primeiro plano e AsyncStorage.

## Executar

Requer Node.js 22.13+ na linha 22 ou 24.3+ na linha 24 (Node 24.18 utilizado na validação).

```sh
npm ci
cp .env.example .env
npm run web
# Ou, para testar no Expo Go em um dispositivo:
npm start
```

O dispositivo precisa de uma versão do Expo Go compatível com o SDK 58. `npm run android` e `npm run ios` iniciam o ambiente Expo; não geram APK/IPA. A validação desta refatoração exporta bundles JavaScript/Hermes, sem compilar binários nativos.

## Organização

- `App.js`: entrada que deixa o Metro selecionar `src/App.web.js` ou `src/App.native.js`.
- `src/components`: navegação web, ícones, feedback e elementos nativos reutilizáveis.
- `src/features/app`: orquestração e telas web separadas (painel, mapa e garagem).
- `src/features/{dashboard,map,profile,reports}`: telas nativas, regras e serviços de cada funcionalidade.
- `src/hooks`: localização com permissão e debounce.
- `src/services`: cliente HTTP HTTPS com timeout/cancelamento e persistência por plataforma.
- `src/config/env.js`: configuração pública centralizada.

A pasta `src` não estava presente no projeto recebido, embora fosse importada por `App.js`. Os serviços ausentes foram reconstruídos com armazenamento local explícito; não foi presumida a existência de backend.

## Dados e limitações

O modo local não exige senha. Relatos, favoritos e veículos ficam no navegador ou no dispositivo, sem sincronização entre plataformas ou usuários. Sair encerra a sessão de visitante, mas preserva os registros locais do dispositivo. O armazenamento não é criptografado; não é destinado a senhas, tokens ou outros segredos. Relatos incluem coordenadas: use apenas as informações necessárias.

Relatos novos permanecem pendentes e não aparecem como ocorrências aprovadas. Não há publicação comunitária, autenticação real ou administração. A função de aprovação bloqueia alterações no cliente; um backend com autenticação e autorização será necessário para essas funções.

Os indicadores aleatórios e as camadas demonstrativas foram removidos. Os painéis web e nativo mostram precipitação consultada e avisos reais do INMET distribuídos pelo RadarMeteorológico. As telas nativas oferecem planejamento de rota, cadastro manual de veículos e relatos locais; o catálogo FIPE está disponível somente na web. Rotas OSRM não consideram alagamentos e não oferecem orientação curva a curva. Quando o cálculo falha, nenhuma linha reta é apresentada como rota viária.

Os serviços externos configurados são Open-Meteo (chuva), Nominatim (endereços), OSRM (rotas), Parallelum (catálogo veicular web) e provedores de mapas. Buscas e coordenadas necessárias às consultas são enviadas a esses provedores. Os endpoints públicos de demonstração têm políticas e limites próprios; configure provedores apropriados antes de disponibilizar o app em escala.

## Ambiente e chaves

`.env` e variantes estão no `.gitignore`; `.env.example` contém apenas configuração de exemplo. Não foram identificadas credenciais nos arquivos de origem analisados.

**`EXPO_PUBLIC_*` é incorporado no bundle e pode ser lido pelo usuário.** Use somente URLs e configurações públicas. Senhas, chaves privadas e credenciais privilegiadas devem permanecer no backend, nunca no app ou em variáveis públicas.

Os mapas de Android e iOS usam Leaflet em uma WebView com tiles OpenStreetMap, sem Google Maps e sem chave de API. A biblioteca Leaflet e seu CSS são empacotados localmente por `npm run map:assets` (também executado após instalar dependências). A licença acompanha o código gerado. Os tiles exigem internet e respeitam cache HTTP; não há download em lote ou mapa offline. O app se identifica como `Floody/1.0`, mostra a atribuição ao OpenStreetMap e permite trocar o endpoint HTTPS por `EXPO_PUBLIC_MAP_TILES_LIGHT`. O serviço público de tiles é gratuito para uso conforme sua política, tem capacidade limitada e não oferece SLA: https://operations.osmfoundation.org/policies/tiles/ . A WebView suporta pan, zoom, origem, destino e traçado OSRM; a localização é obtida pelo Expo e passada ao mapa, sem pedir acesso GPS à página. Não foi gerado APK nesta tarefa.

## Verificação

```sh
npm test
npm run check
npx expo install --check
npx expo-doctor
npm audit
npx expo export --platform all --output-dir /tmp/floody-export
```

Os testes verificam gravações concorrentes, validação de relatos e veículos, bloqueio da aprovação local, favoritos, HTTPS e cancelamento de requisições. `check` verifica referências e resolução das importações por plataforma. A exportação valida empacotamento, mas não substitui testes em aparelhos de GPS, permissões, teclado, mapas e rotação.

As dependências receberam patches compatíveis com o SDK 58. `overrides` mantém glob e minimatch em versões corrigidas; essa decisão deve ser revista nas próximas atualizações do Expo. Não se utiliza `npm audit fix --force`, que sugeria downgrade incompatível para Expo 53.

Resultado da validação: treze testes passaram; referências e importações verificadas; bundles web, Android e iOS exportados sem gerar APK/IPA. A auditoria npm terminou com zero vulnerabilidades conhecidas na data da refatoração. A verificação de versões Expo utilizou o mapa local do SDK porque a consulta online estava indisponível. O fingerprint do Expo também foi gerado com os overrides para verificar essa integração.


## Avisos meteorológicos reais e gratuitos

Coleta: `https://radarmeteorologico.com.br/api/v1/alertas`. O INMET é o emissor dos avisos; RadarMeteorológico é o distribuidor, não um órgão oficial. A API declara acesso gratuito, inclusive comercial, sem cadastro ou chave, com CORS liberado e cache de 10 minutos. A atribuição e os links de ambas as fontes são exibidos no app. Condições: https://radarmeteorologico.com.br/api-publica . Fonte oficial: https://avisos.inmet.gov.br/ .

`EXPO_PUBLIC_ALERTS_URL` configura o endpoint público, cujo contrato deve ser compatível com essa API. Não exige segredos nem nova dependência. A API direta do INMET não foi escolhida para o cliente web porque a resposta verificada não incluía permissão CORS; nenhum proxy público é usado.

- Regiões: Recife/PE por padrão, Olinda, Jaboatão, cada estado ou Brasil. Municípios são filtrados pelo código IBGE nos `geocodes`, não por proximidade aproximada. O filtro dos avisos é independente da busca meteorológica e do mapa e deve ser selecionado pelo usuário. Outros municípios podem ser adicionados em `src/features/alerts/scopes.js` com seu código IBGE.
- Coleta inicial e nova consulta ao provedor após 10 minutos. A tela verifica o cache/validade a cada minuto e ao retornar ao primeiro plano. A ação de verificar atualização respeita o cache de 10 minutos; não força requisições repetidas ao serviço.
- Requisições simultâneas compartilham uma coleta. Falhas têm intervalo mínimo de um minuto para nova tentativa. O timeout HTTP é de 12 segundos.
- Avisos expirados são removidos do resultado; avisos futuros aparecem como previstos. Datas sem fuso do feed são interpretadas no horário de Brasília (UTC−03:00), e exibidas no fuso do dispositivo.
- O app guarda uma cópia local por até 24 horas para consulta em falhas. Essa cópia é marcada como sem confirmação atual, pois o aviso pode ter sido alterado ou cancelado. Sem coleta disponível, a interface informa indisponibilidade e nunca interpreta erro como ausência de risco. Não há notificações push ou coleta garantida em segundo plano.
- Nenhuma coordenada ou identificação pessoal é enviada à API de alertas: a coleta é nacional e o filtro é local. Chuva, rotas e geocodificação continuam sendo consultas separadas.
- Os avisos são previsões meteorológicas regionais; não constituem confirmação de alagamento em ruas, autorização de passagem, trânsito ou interdições viárias. Relatos dos usuários continuam locais e separados dos avisos.

Validação adicional: resposta real coletada e normalizada; filtro de Pernambuco exibiu avisos reais no navegador, distinguindo vigente e previsto. Treze testes cobrem serviços locais, fuso, deduplicação, abrangência, validade, formato inválido, cache e indisponibilidade. Bundles das três plataformas exportados sem APK. A disponibilidade futura do serviço gratuito não é garantida.


A mudança do mapa remove `react-native-maps`, o plugin Google Maps e a variável `GOOGLE_MAPS_ANDROID_API_KEY`. `react-native-webview` é instalado na versão compatível com Expo 58. Validação adicional verifica HTML local sem CDN de scripts/chave Google, transporte de coordenadas e rejeição de dados inválidos. A interface Leaflet foi conferida no navegador; o comportamento da WebView precisa ser validado em aparelhos Android/iOS.


## Migração para SDK 58

Dependências alinhadas pelo Expo: `expo` 58.0.23, React/React DOM 19.3.0, React Native 0.88.1, WebView 14.0.1, `expo-location` 58.0.20 e `expo-status-bar` 58.0.4. O lockfile registra as versões exatas. A orientação em `AGENTS.md` também aponta para a documentação versionada do SDK 58.

Após atualizar o projeto, inicie com `npx expo start --clear` para limpar o cache do Metro. Use Expo Go compatível com SDK 58; um development build de SDK anterior precisa ser reconstruído antes de testar os novos módulos nativos. A migração não gera APK/IPA.

Validação da migração: 13 testes de serviços passaram, importações verificadas, dependências compatíveis e Expo Doctor com 20/20 verificações aprovadas. A instalação reportou zero vulnerabilidades conhecidas. A exportação dos bundles não substitui testes em aparelhos físicos. O Metro pode avisar sobre imagens PNG no CSS original do Leaflet; o app usa marcadores vetoriais e controles próprios, sem depender dessas imagens.
