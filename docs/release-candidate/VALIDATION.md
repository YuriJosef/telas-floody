# Release-candidate validation

November 9, 2026. Commands below ran from `Floody/` unless noted. Test data was confined to isolated Playwright browser contexts. External probes used only public Recife coordinates or public catalog/feed endpoints.

## Current hardening batch

| Check | Observed result |
| --- | --- |
| `npm.cmd test` | **27/27 passed.** Includes shared OSRM geometry and bounds validation, Geoapify admission and cooldown, modeled precipitation metadata and Recife time, corrupt local storage, alert link validation, FIPE response validation and bundled native icons. |
| `npm.cmd run check`, `git diff --check` | Passed. Git reported line-ending normalization warnings. |
| `npm.cmd audit --omit=dev` | 0 known production dependency vulnerabilities reported. |
| `node scripts/web-regression.cjs` | Passed in Edge on local Expo. Verified address selection and failures, 429 cooldown and no Nominatim traffic, stable Recife button order and geometry at 320, 390 and 1366 px, foreground polling, stale weather, a visible fitted route before delayed weather, geometry updates and clearing, and explicit GPS watch start and teardown on leaving the map or hiding the page. |
| `node scripts/web-regression.cjs --live` | Passed. A real OSRM response rendered as a 63-position route. This run used fixture geocoding and weather. |
| `node ../docs/release-candidate/capture-web.cjs` | Passed in Edge at 1440 × 900 light and 390 × 844 dark. Guest entry, dashboard, navigation, keyboard selection, map and route, report save, garage save and reload all passed. Satellite failure selected `Ruas` and kept the fallback notice. Pending reports stayed off the map and two concurrent tab saves survived. Ten new PNGs went to ignored `Floody/.expo/hardening-screenshots/`. The desktop and mobile map images were inspected for route visibility, layout and attribution. |
| `node node_modules/expo/bin/cli export --platform all --max-workers 2 --output-dir .expo/hardening-validation` | Passed for web and Android/iOS Hermes, with Google Sans Flex and all 13 native Material Symbol assets. Metro reported unused Leaflet CSS icon URL warnings. The app uses SVG circle markers and its own layer controls. |
| Native map HTML harness in Edge | Passed. The embedded Leaflet document sent ready and tile-failure messages, displayed Esri credits, and drew, fitted and cleared a route with a simulated WebView bridge. Tile requests were blocked for this harness. No device runtime was exercised. |
| Credential and branch check | Compared the configured Geoapify value in memory against tracked and proposed new paths. No matches for that value or the checked private-key, GitHub-token or AWS-key signatures. The real key remains in ignored `Floody/.env.local`. No files are staged. Local and remote feature heads were both `dd2010dc471bf74d69f27878364b1f75a9c68b11` before hardening. |

The browser fixture and export runs used `EXPO_NO_DOTENV=1` with a dummy Geoapify key. The screenshot smoke replays one live OSRM route and loads street tiles. It uses fixtures for geocoding, alerts, precipitation and FIPE, and fictional report and garage inputs. The GPS fixture needed its clock advanced between journeys to account for the client’s rolling geocoding window. The browser regression also checks application console errors. It exposed the malformed garage SVG, which was corrected. Expected failed resource requests from deliberately unavailable providers are excluded from that assertion. One sandboxed Edge launch closed before navigation, and sandboxed Hermes exited with code 6. The local reruns with permission to launch the binaries succeeded.

### Live checks during hardening

| Provider | Observed result |
| --- | --- |
| Geoapify | Six HTTP 200 responses in Edge with the configured local key. Verified autocomplete for Avenida Boa Viagem, Recife Antigo and Avenida Agamenon Magalhães, an explicit forward lookup for Rua da Aurora, 225, and GPS reverse lookup for a public Recife location. Underlying sources were OpenStreetMap and OpenAddresses. A selected Marco Zero suggestion rendered a live OSRM route. No credentials or authenticated URLs were logged. |
| OSRM | Live routing drew a 63-position LineString in Edge. Deterministic browser tests covered malformed geometry, provider errors and slow destination weather. |
| Open-Meteo | The app adapter accepted 0 mm for a 900-second modeled interval ending at 21:00 on November 9 in Recife and classified it as fresh at probe time. |
| RadarMeteorológico / INMET | App adapter accepted six alerts before regional filtering. This is a feed availability check. |
| Parallelum FIPE | App adapter returned 108 car makes and three models for the first make. Local vehicle save and reload used the browser fixture. |

No Android device, iPhone or simulator was available. Native keyboard, gestures, permission prompts, accessibility and tile HTTP identity/cache remain open. These results support the controlled web demo. Provider permissions and capacity for public use remain in [the provider review](PROVIDERS.md).

### Final demo rehearsal

The [demo guide](../../DEMO_GUIDE.md) was verified with a clean `npm.cmd ci` and the Leaflet postinstall in an isolated directory. The desktop walkthrough started with `npm.cmd run web -- --localhost` on port 18572 and used the existing ignored Geoapify configuration. It verified both Recife shortcuts, the named public route, a pending fictional report at a simulated public GPS position, and a saved garage entry. Open-Meteo, RadarMeteorológico, OpenStreetMap tiles, Geoapify forward and reverse lookup, OSRM, and FIPE returned HTTP 200 during that walkthrough. The final rerun also passed all 27 tests, static checks, web and native exports, Playwright fixture and live routing tests, and the desktop light and mobile dark smoke tests.

## Earlier release-candidate evidence

| Command or run | Result |
| --- | --- |
| `npm.cmd test` | Pass, 18 tests. Covered local persistence, validation, moderation denial, external error/cancellation, official alert normalization and caching, geographic bounds, web route geometry, model precipitation units/time, and bundled native icons. |
| `npm.cmd run check` | Pass, source bindings and platform imports. |
| `git diff --check` | Pass. Git reported line-ending normalization warnings on existing files. |
| `node node_modules/expo/bin/cli start --web --localhost --port 18551` with `CI=1`, `EXPO_OFFLINE=1` | Local Metro server for screenshots and smoke test. |
| `node ../docs/release-candidate/capture-web.cjs` | Playwright/Edge. Pass at 1440 × 900 (light) and 390 × 844 (dark). Guest entry, tabs, wheel reachability, keyboard selection, weather, route fit and invalidation, local pending report, garage save and reload. Satellite fallback label issue reproduced separately. Five PNGs each under `screenshots/desktop-web/` and `screenshots/mobile-web/`. Full-page PNGs keep below-fold content visible. |
| `node scripts/web-regression.cjs` | Pass with deterministic fixtures. Stable Recife shortcut order and geometry at 320, 390 and 1366 px, keyboard activation and refresh, invalid lookup, stale/unavailable weather, Recife timestamp, visible/fitted route before destination weather, destination updates and failure clearing. |
| `node scripts/web-regression.cjs --live` | Pass. Browser drew the live OSRM response with 63 route points. Address resolution and the other app providers remained fixtures in this run. |
| `node node_modules/expo/bin/cli export --platform ios --platform android --max-workers 2 --output-dir .expo/release-candidate-native` with `CI=1`, `EXPO_OFFLINE=1` | Pass for iOS and Android Hermes bytecode. Export contained the Google Sans Flex TTF and all 13 native Material Symbol assets. Output stayed in ignored local storage. |

For Playwright, `FLOODY_WEB_URL` was set to the relevant localhost port, `FLOODY_PLAYWRIGHT_MODULE` to the installed Playwright module, and `FLOODY_BROWSER_EXECUTABLE` to installed Microsoft Edge. The capture script fetches a public OSRM route once and replays it in both screenshot contexts, with live OpenStreetMap tiles. Precipitation, the empty alert feed, address results, geolocation, and FIPE options are fixtures in the gallery. The saved incident is explicitly fictional and the vehicle clearance is example input.

### Independent live probes

Executed with `curl.exe -fsSL --max-time 16` and the quoted URL (18-second timeout for the standalone OSRM probe):

| URL | Observed |
| --- | --- |
| `https://api.open-meteo.com/v1/forecast?latitude=-8.05428&longitude=-34.8813&current=precipitation&precipitation_unit=mm&timezone=America%2FRecife&timeformat=unixtime` | Recife timezone, 0.0 mm for a 900-second modeled interval ending at 20:00 Recife time on November 9. |
| `https://radarmeteorologico.com.br/api/v1/alertas` | Feed returned an `alertas` array with six entries before regional filtering. |
| `https://parallelum.com.br/fipe/api/v1/carros/marcas` | 108 makes returned. This did not exercise the live model selector or vehicle save. |
| `https://router.project-osrm.org/route/v1/driving/-34.8813,-8.05428;-34.8711,-8.0631?overview=full&geometries=geojson` | Successful 63-point LineString. Separately verified in the live Playwright route run. |

Live probes establish only a point-in-time response. The earlier release candidate intercepted the former public geocoder. The Geoapify migration below removed it from the running app.

### Native and release limitations

No local Android SDK/ADB, connected device, or iOS simulator was available. Native screenshots, phone runtime, permission dialogs, map gestures, keyboard behavior and accessibility remain unverified in this run. Browser screenshots in the gallery are labeled as web. Local bundle exports are not device builds.

Application checks completed without a test failure. The confirmed satellite-label mismatch is an audit finding, preserved in this documentation-only release task. The gallery uses a tile-settle wait and full-page captures for long screens. The capture script hides the normally off-screen, unfocused skip link during full-page screenshots so it cannot overlay the scrollable content.

## Geoapify migration validation

| Run | Result |
| --- | --- |
| `npm.cmd test` | 21/21 passed. Geoapify request parameters, Brazil-wide results, valid and invalid GeoJSON, forward/reverse lookup, empty results, absent key, 401/403/429/500, network failures and cancellation. |
| `npm.cmd run check` and `git diff --check` | Passed. No old geocoder endpoint remains in application source. The browser suite retains a sentinel for the retired hostname and asserts zero requests. |
| `node node_modules/expo/bin/cli start --web --localhost --port 18553`, then `node scripts/web-regression.cjs` | Passed in Edge. Dashboard keyboard selection and dismissal, origin and destination selection, Enter submission, no duplicate forward lookup for selected coordinates, route longitude/latitude order, minimum query length, stale suggestion prevention, 429 feedback, and the existing weather and map regressions. Exercised 320, 390 and 1366 px across both themes. |
| `node scripts/web-regression.cjs --live` | Passed with real OSRM and fixture Geoapify. The rendered route had 63 positions. |
| `node ../docs/release-candidate/capture-web.cjs` | Passed at 1440 × 900 light and 390 × 844 dark. Refreshed the ten web captures with fixture autocomplete/forward/reverse data and provider credits. The smoke test also covered alert and precipitation display, GPS report storage, garage and reload. |
| Live Geoapify in Edge on `http://localhost:18554` | The existing local key returned HTTP 200 for six calls. Avenida Boa Viagem, Recife Antigo and Avenida Agamenon Magalhães returned 5, 3 and 2 suggestions. An explicit query for Rua da Aurora, 225 returned coordinates for weather. A selected Marco Zero result rendered a live OSRM route. GPS reverse lookup at a public Recife coordinate populated the report location. The observed data sources were OpenStreetMap and OpenAddresses. |
| `node node_modules/expo/bin/cli export --platform ios --platform android --max-workers 2 --output-dir .expo/geoapify-native-validation` | Both Hermes bundles passed, with the font and 13 icons. Device runtime remains unverified. Native address lookup runs on submit and has no autocomplete list. |

Fixture and native export runs set `EXPO_NO_DOTENV=1` and a dummy `EXPO_PUBLIC_GEOAPIFY_API_KEY`. The live browser run used the existing ignored `.env.local`, logged operation names and status codes only, and captured no screenshots or authenticated URLs. Port 8081 was occupied, so the live run used 18554. A preliminary browser run exposed a form-button click race when an inline suggestion list closed on blur. The final capture and regression runs passed after preserving the layout through the click.
