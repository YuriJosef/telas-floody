# Release-candidate validation

November 9, 2026. Commands below ran from `Floody/` unless noted. Test data was confined to isolated Playwright browser contexts. External probes used only public Recife coordinates or public catalog/feed endpoints.

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
