# Floody 2.0 demo guide

Wednesday, November 11, 2026. Present from desktop web using **Ruas** for the basemap. Rehearse once in the same browser profile and on the same network you will use for the demo.

## Local setup

Use Node.js 24.3 or later in the 24.x line, npm, and an internet connection. Open PowerShell at the repository root on `feature/floody-2.0-m3-expressive`. Check that your copy includes the local hardening commit before rehearsing.

```powershell
Set-Location Floody
npm.cmd ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Open `Floody/.env.local` in your editor and set `EXPO_PUBLIC_GEOAPIFY_API_KEY` to your team's demo key. Keep the other sample endpoints unless the team has an approved configuration. The file is ignored by Git, but Expo embeds `EXPO_PUBLIC_*` values in client bundles. Use a dedicated key with an allowed web origin or referrer for the actual demo URL. Keep the key out of screenshots, shared logs, and Git. [Geoapify key configuration](https://myprojects.geoapify.com/help/api-keys/)

```powershell
npm.cmd run web -- --localhost
```

Open the URL Metro prints, normally `http://localhost:8081`. Stop and restart Expo after changing `.env.local`. If a phone is part of the presentation, rehearse on a device running an Expo Go version compatible with SDK 58. Run `npm.cmd start` from `Floody/` and scan the QR code on the same network. The web key's origin restrictions may require a separate native demo key. [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)

## Demo flow

1. **Entry.** Select **Continuar no modo local**. Explain that the demo stores records in this browser profile.
2. **Painel.** Show **Avisos do INMET**, **Precipitação**, and **Relatos locais** as separate sources. Switch between **Recife Antigo** and **Boa Viagem** under **Locais de Recife**. Point out the modeled accumulation in mm, the interval, and Recife validity time. An empty feed does not establish that conditions are safe.
3. **Mapa.** Select **Ruas**. If the planner is collapsed, open **Planejar rota**. Enter `Rua da Aurora, 225, Recife` in **Origem** and `Marco Zero, Recife` in **Destino**. Select the matching suggestions if offered, then choose **Calcular rota**. Show the fitted route, distance and estimated duration. The route does not account for flooding or give turn-by-turn guidance.
4. **Relatar.** Choose **Usar minha localização** and allow browser location for a public demo location. Select **Obra** and enter `Demonstração — registro fictício` as the description. Choose **Salvar relato local**, then **Voltar ao painel**. Show the entry as **Pendente** under **Relatos locais**. It stays on this device and does not appear on the approved-report map.
5. **Garagem.** Choose a **Marca** and **Modelo** from the FIPE catalog, enter an example **Vão livre do solo (cm)** such as `17`, and choose **Salvar veículo**. Show the record under **Veículos neste dispositivo**. The example clearance does not imply a safe water depth.

## Troubleshooting and limits

| Symptom | What to do |
| --- | --- |
| Missing suggestions, 401 or 403 | Confirm the key is in `.env.local` inside `Floody/`. Check that the provider allows the exact browser origin or referrer, including the port. Restart Expo. |
| Geoapify rate-limit message | Pause for at least 30 seconds and check project quota if it persists. The Recife precipitation shortcuts remain available without geocoding. |
| Route, tiles, weather, alerts, or catalog unavailable | Confirm internet access. Use **Ruas** and retry once. If the provider stays unavailable, show the error state or use the labeled [desktop web reference screenshots](docs/release-candidate/screenshots/desktop-web) from the earlier validation. |
| Browser location denied or inaccurate | Allow location for the localhost site and verify the reported position before saving. Use typed endpoints for routing. If GPS remains unavailable or would expose a private location, show the report form without saving. |
| Phone cannot open the QR session | Check SDK compatibility and the local network. Use the verified desktop web flow if the device has not been rehearsed. |

Open-Meteo provides model estimates, and RadarMeteorológico relays official INMET alerts. Internet-dependent services can be delayed or unavailable. Reports and vehicles are local, with no public submission or moderation workflow. Native bundles were exported, while permissions and interaction on a physical device still need rehearsal. [Validation](docs/release-candidate/VALIDATION.md) · [Provider review](docs/release-candidate/PROVIDERS.md)
