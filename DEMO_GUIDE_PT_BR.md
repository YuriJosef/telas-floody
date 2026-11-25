# Guia de demonstração do Floody 2.0

Quarta-feira, 11 de novembro de 2026. Faça a apresentação pela versão web em um computador, utilizando **Ruas** como mapa-base. Realize pelo menos um ensaio no mesmo perfil de navegador e na mesma rede que serão usados na apresentação.

## Configuração local

Utilize Node.js 24.3 ou superior, dentro da série 24.x, npm e uma conexão com a internet. Abra o PowerShell na raiz do repositório, na branch `feature/floody-2.0-m3-expressive`. Antes de ensaiar, confirme que sua cópia contém o commit local com as correções de estabilização.

```powershell
Set-Location Floody
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Abra `Floody/.env.local` no editor e defina `EXPO_PUBLIC_GEOAPIFY_API_KEY` com a chave de demonstração da equipe. Mantenha os demais endpoints de exemplo, a menos que a equipe tenha aprovado outra configuração. O arquivo é ignorado pelo Git, mas o Expo incorpora os valores `EXPO_PUBLIC_*` aos pacotes do aplicativo. Utilize uma chave específica para a demonstração, com a origem web ou o referenciador autorizado para a URL efetivamente utilizada. Não exponha a chave em capturas de tela, logs compartilhados ou no Git. [Configuração da chave Geoapify](https://myprojects.geoapify.com/help/api-keys/)

```powershell
npm.cmd run web -- --localhost
```

Abra a URL exibida pelo Metro, normalmente `http://localhost:8081`. Depois de alterar `.env.local`, interrompa e reinicie o Expo. Caso um celular faça parte da apresentação, ensaie em um dispositivo com uma versão do Expo Go compatível com o SDK 58. Execute `npm.cmd start` dentro de `Floody/` e leia o código QR na mesma rede. As restrições de origem da chave web podem exigir outra chave para a demonstração nativa. [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)

## Roteiro da demonstração

1. **Entrada.** Selecione **Continuar no modo local**. Explique que a demonstração armazena os registros neste perfil do navegador.
2. **Painel.** Apresente **Avisos do INMET**, **Precipitação** e **Relatos locais** como fontes distintas. Alterne entre **Recife Antigo** e **Boa Viagem**, na seção **Locais de Recife**. Destaque o acumulado estimado em milímetros (mm), o intervalo considerado e o horário de validade em Recife. A ausência de avisos não significa que as condições sejam seguras.
3. **Mapa.** Selecione **Ruas**. Caso o planejador esteja recolhido, abra **Planejar rota**. Digite `Rua da Aurora, 225, Recife` em **Origem** e `Marco Zero, Recife` em **Destino**. Se aparecerem sugestões correspondentes, selecione-as e clique em **Calcular rota**. Mostre o trajeto enquadrado no mapa, a distância e a duração estimada. A rota não considera alagamentos nem oferece instruções de navegação curva a curva.
4. **Relatar.** Selecione **Usar minha localização** e permita o acesso do navegador à localização para uma demonstração em local público. Escolha **Obra** e digite `Demonstração — registro fictício` na descrição. Selecione **Salvar relato local** e depois **Voltar ao painel**. Mostre o registro com o status **Pendente**, em **Relatos locais**. Ele permanece neste dispositivo e não aparece no mapa de relatos aprovados.
5. **Garagem.** Selecione uma **Marca** e um **Modelo** no catálogo FIPE, informe um valor ilustrativo de **Vão livre do solo (cm)**, como `17`, e selecione **Salvar veículo**. Mostre o registro em **Veículos neste dispositivo**. O valor ilustrativo da altura livre não representa uma profundidade segura de água.

## Solução de problemas e limitações

| Sintoma | O que fazer |
| --- | --- |
| Sugestões ausentes; erro 401 ou 403 | Confirme que a chave está em `.env.local`, dentro de `Floody/`. Verifique se o provedor permite a origem ou o referenciador exato do navegador, incluindo a porta. Reinicie o Expo. |
| Mensagem de limite de requisições do Geoapify | Aguarde pelo menos 30 segundos e, se o problema continuar, consulte a cota do projeto. Os atalhos de precipitação de Recife continuam disponíveis sem geocodificação. |
| Rota, mapas, previsão do tempo, avisos ou catálogo indisponíveis | Confirme a conexão com a internet. Utilize **Ruas** e tente novamente uma vez. Se o provedor continuar indisponível, mostre o estado de erro ou utilize as [capturas de referência da versão web para computador](docs/release-candidate/screenshots/desktop-web), identificadas como tal, da validação anterior. |
| Localização negada ou imprecisa no navegador | Permita o acesso à localização para o site em localhost e confira a posição informada antes de salvar. Para o planejamento de rotas, digite os endereços. Se o GPS continuar indisponível ou puder revelar um local privado, mostre o formulário de relato sem salvar. |
| O celular não consegue abrir a sessão pelo QR code | Confira a compatibilidade do SDK e a rede local. Utilize o fluxo web em computador, já validado, se o dispositivo não tiver sido ensaiado. |

O Open-Meteo fornece estimativas de modelos meteorológicos, enquanto o RadarMeteorológico retransmite avisos oficiais do INMET. Serviços dependentes da internet podem apresentar atrasos ou ficar indisponíveis. Relatos e veículos são armazenados localmente, sem envio público nem fluxo de moderação. Os pacotes nativos foram exportados, mas as permissões e interações em dispositivos físicos ainda precisam ser ensaiadas. [Validação](docs/release-candidate/VALIDATION.md) · [Análise dos provedores](docs/release-candidate/PROVIDERS.md)
