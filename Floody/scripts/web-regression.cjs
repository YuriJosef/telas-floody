// Run against a local Expo web server with Playwright installed or supplied via
// FLOODY_PLAYWRIGHT_MODULE. Pass --live to repeat the route check against OSRM.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.FLOODY_PLAYWRIGHT_MODULE || 'playwright');

const base = new URL(process.env.FLOODY_WEB_URL || 'http://localhost:8081');
const live = process.argv.includes('--live');
const now = Date.parse('2026-11-10T01:48:00Z');
const validAt = Date.parse('2026-11-10T01:45:00Z');
const shortcuts = [
 ['Recife Antigo', '-8.0631', '-34.8711'],
 ['Av. Agamenon Magalhães', '-8.0475', '-34.8969'],
 ['Boa Viagem', '-8.1191', '-34.8964'],
 ['Centro', '-8.0607', '-34.8811'],
];
const endpoints = {
 'Origem de teste': [-34.8813, -8.05428],
 'Destino de teste A': [-34.8711, -8.0631],
 'Destino de teste B': [-34.8964, -8.1191],
 'Endereço antigo': [-34.92, -8.10],
};

async function run() {
 const browser = await chromium.launch({ executablePath: process.env.FLOODY_BROWSER_EXECUTABLE });
 try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 },
   permissions: ['geolocation'], geolocation: { latitude: -8.05428, longitude: -34.8813 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
   if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
    errors.push(message.text());
   }
  });
  if (!live) {
   await page.clock.install({ time: now });
   await page.addInitScript(() => {
    window.auditGPS = { starts: 0, stops: 0 };
    Object.defineProperties(navigator.geolocation, {
     watchPosition: { configurable: true, value: success => {
      const id = ++window.auditGPS.starts;
      queueMicrotask(() => success({ coords: { latitude: -8.055, longitude: -34.882 } }));
      return id;
     } },
     clearWatch: { configurable: true, value: () => { window.auditGPS.stops++; } },
    });
   });
  }
  let routeMode = 'valid';
  let weatherMode = 'valid';
  let delayDestinationWeather = false;
  const weatherCalls = [];
  const geocodeCalls = [];
  const routeCalls = [];
  let legacyCalls = 0;
  let liveRouteResponse;
  if (live) page.on('response', response => {
   if (new URL(response.url()).hostname === 'router.project-osrm.org') liveRouteResponse = response;
  });
  await page.route('**/*', async route => {
   const url = new URL(route.request().url());
   if (url.origin === base.origin) return route.continue();
   const json = body => route.fulfill({ json: body, headers: { 'access-control-allow-origin': '*' } });
   if (url.hostname === 'api.open-meteo.com') {
    const { searchParams: params } = url;
    weatherCalls.push([params.get('latitude'), params.get('longitude')]);
    assert.equal(params.get('current'), 'precipitation');
    assert.equal(params.get('timezone'), 'America/Recife');
    assert.equal(params.get('precipitation_unit'), 'mm');
    assert.equal(params.get('timeformat'), 'unixtime');
    if (delayDestinationWeather) await new Promise(resolve => setTimeout(resolve, 2200));
    if (weatherMode === 'failed') return route.fulfill({ status: 503 });
    return json({ current_units: { precipitation: 'mm', time: 'unixtime', interval: 'seconds' }, current: {
     precipitation: 3.5, interval: 900, time: (validAt - (weatherMode === 'stale' ? 3600000 : 0)) / 1000,
    } });
   }
   if (url.hostname === 'nominatim.openstreetmap.org') {
    legacyCalls++;
    return route.abort();
   }
   if (url.hostname === 'api.geoapify.com') {
    const name = url.searchParams.get('text');
    const operation = url.pathname.split('/').at(-1);
    geocodeCalls.push({ operation, name });
    assert.equal(url.searchParams.get('filter'), 'countrycode:br');
    assert.equal(url.searchParams.get('bias'), 'proximity:-34.8813,-8.05428');
    assert.equal(url.searchParams.get('lang'), 'pt');
    assert.equal(url.searchParams.get('limit'), operation === 'autocomplete' ? '5' : '1');
    if (name === 'Cota esgotada') return route.fulfill({ status: 429 });
    if (name === 'Endereço antigo') await new Promise(resolve => setTimeout(resolve, 1100));
    const coords = endpoints[name];
    return json({ type: 'FeatureCollection', features: coords ? [{
     type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: { formatted: name },
    }] : [] });
   }
   if (url.hostname === 'router.project-osrm.org') {
    routeCalls.push(url.pathname.split('/').at(-1));
    if (live) return route.continue();
    if (routeMode === 'failed') return route.fulfill({ status: 503 });
    const [start, end] = url.pathname.split('/').at(-1).split(';').map(point => point.split(',').map(Number));
    return json({ code: 'Ok', routes: [{ distance: 2279.7, duration: 420, geometry: {
     type: 'LineString', coordinates: routeMode === 'malformed' ? [start, [0, 91]] : [start, end],
    } }] });
   }
   if (url.hostname === 'radarmeteorologico.com.br') return json({ alertas: [] });
   if (url.hostname === 'parallelum.com.br') return json([]);
   return route.abort();
  });

  await page.goto(base.href);
  const button = name => page.getByRole('button', { name, exact: true });
  await button('Continuar no modo local').click();
  const reading = page.locator('.weather-reading');
  if (!live) {
   await reading.getByText('Acumulado modelado em 15 min').waitFor();
   assert.equal(await reading.locator('time').textContent(), '09/11/2026, 22:45');
   assert.equal(await reading.locator('time').getAttribute('datetime'), new Date(validAt).toISOString());
   assert.match(await reading.textContent(), /3,5 mm/);
   await page.evaluate(() => document.fonts.ready.then(() => true));
   const grid = page.getByRole('group', { name: 'Selecionar local de Recife' });
   const layout = () => grid.getByRole('button').evaluateAll(items => items.map(item => {
    const { x, y, width, height } = item.getBoundingClientRect();
    return { name: item.textContent, x: x + scrollX, y: y + scrollY, width, height, font: getComputedStyle(item).fontSize };
   }));
   for (const width of [320, 390, 1366]) {
    await page.setViewportSize({ width, height: 850 });
    const initial = await layout();
    assert.deepEqual(initial.map(item => item.name), shortcuts.map(([name]) => name));
    for (const key of ['width', 'height', 'font']) assert.equal(new Set(initial.map(item => item[key])).size, 1);
    assert.equal(initial[0].y, initial[1].y);
    assert.equal(initial[2].y, initial[3].y);
    assert.equal(initial[0].x, initial[2].x);
    assert.equal(initial[1].x, initial[3].x);
    assert(initial[2].y > initial[0].y && initial[1].x > initial[0].x);
    for (const index of [2, 0, 3, 1, 2]) {
     const [name, lat, lon] = shortcuts[index];
     const option = grid.getByRole('button', { name, exact: true });
     if (index === 0) await option.press('Enter');
     else await option.click();
     await reading.getByText(name, { exact: true }).waitFor();
     await reading.locator('time').waitFor();
     assert.equal(await option.getAttribute('aria-pressed'), 'true');
     assert.deepEqual(weatherCalls.at(-1), [lat, lon]);
     assert.deepEqual(await layout(), initial);
    }
   }
   const previous = weatherCalls.length;
   const beforeRefresh = await layout();
   await page.clock.fastForward(60000);
   await page.waitForTimeout(150);
   assert(weatherCalls.length > previous);
   assert.deepEqual(weatherCalls.at(-1), shortcuts[2].slice(1));
   assert.deepEqual(await layout(), beforeRefresh);
   weatherMode = 'stale';
   await button('Centro').click();
   await reading.getByText('Estimativa desatualizada').waitFor();
   weatherMode = 'failed';
   await button('Recife Antigo').click();
   await reading.getByRole('alert').waitFor();
   assert.equal(await reading.locator('.rain-value').count(), 0);
   weatherMode = 'valid';
   const beforeInvalid = weatherCalls.length;
   const search = page.getByRole('combobox', { name: 'Buscar endereço' });
   await search.fill('Local inexistente de teste');
   await search.press('Enter');
   await reading.getByText(/Local não encontrado/).waitFor();
   assert.equal(weatherCalls.length, beforeInvalid);
   for (const [width, theme, name] of [[320, 'claro', 'Destino de teste A'], [390, 'escuro', 'Destino de teste B'], [1366, 'claro', 'Destino de teste A']]) {
    await page.setViewportSize({ width, height: 850 });
    const toggle = button('Ativar tema ' + theme);
    if (await toggle.isVisible()) await toggle.click();
    const count = geocodeCalls.length;
    await search.fill('  R. ');
    await page.waitForTimeout(710);
    assert.equal(geocodeCalls.length, count);
    await search.fill(name);
    await page.getByRole('option', { name }).waitFor();
    await search.press('Escape');
    assert.equal(await search.getAttribute('aria-expanded'), 'false');
    await search.press('ArrowDown');
    await page.getByRole('option', { name }).waitFor();
    await search.press('ArrowDown');
    assert(await search.getAttribute('aria-activedescendant'));
    await search.press('Enter');
    await reading.getByText(name, { exact: true }).waitFor();
    await reading.locator('time').waitFor();
    assert.equal(await search.getAttribute('aria-expanded'), 'false');
    assert.equal(await search.evaluate(e => e === document.activeElement), true);
    assert.deepEqual(geocodeCalls.slice(count), [{ operation: 'autocomplete', name }]);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
   }
   await search.fill('Endereço antigo');
   await page.waitForRequest(request => new URL(request.url()).searchParams.get('text') === 'Endereço antigo');
   await search.fill('Destino de teste B');
   await page.getByRole('option', { name: 'Destino de teste B' }).waitFor();
   await page.waitForTimeout(1200);
   assert.equal(await page.getByRole('option', { name: 'Endereço antigo' }).count(), 0);
   await search.fill('Cota esgotada');
   await page.getByText(/Limite de consultas de endereço atingido/).waitFor();
   const beforeCooldown = geocodeCalls.length;
   await search.press('Enter');
   await reading.getByRole('alert').filter({ hasText: /Limite de consultas/ }).waitFor();
   assert.equal(geocodeCalls.length, beforeCooldown, '429 cooldown also covers explicit search');
   await page.clock.fastForward(31000);
  }

  await button('Mapa').click();
  if (!live) {
   const weatherBefore = weatherCalls.length;
   await page.clock.fastForward(61000);
   assert.equal(weatherCalls.length, weatherBefore, 'Dashboard must not poll while viewing the map');
  }
  const planner = button('Planejar rota');
  if (await planner.getAttribute('aria-expanded') === 'false') await planner.click();
  const destination = page.getByRole('combobox', { name: 'Endereço de destino' });
  const line = page.locator('.floody-route-line');
  async function plan(name) {
   await destination.fill(name);
   await button('Calcular rota').click();
  }
  async function visibleRoute() {
   await line.waitFor();
   const shape = await line.evaluate(path => {
    const map = path.closest('.leaflet-container').getBoundingClientRect();
    const svg = path.ownerSVGElement.getBoundingClientRect();
    const bounds = path.getBoundingClientRect();
    return {
     d: path.getAttribute('d'),
     visible: svg.width >= map.width && bounds.width > 20 && bounds.height > 20
      && bounds.left >= map.left && bounds.right <= map.right && bounds.top >= map.top && bounds.bottom <= map.bottom,
    };
   });
   assert(shape.visible, 'Route must have a map-sized overlay and fit inside the map');
   await page.getByRole('heading', { name: 'Rota calculada' }).waitFor();
   return shape.d;
  }
  delayDestinationWeather = !live;
  if (live) {
   await plan('Destino de teste A');
  } else {
   const origin = page.getByRole('combobox', { name: 'Endereço de origem' });
   const count = geocodeCalls.length;
   await origin.fill('Origem de teste');
   await page.getByRole('option', { name: 'Origem de teste' }).click();
   await destination.fill('Destino de teste A');
   await page.getByRole('option', { name: 'Destino de teste A' }).waitFor();
   await destination.press('ArrowDown');
   await destination.press('Enter');
   assert.equal(await page.getByRole('listbox').count(), 0);
   await destination.press('Enter');
   await page.getByRole('heading', { name: 'Rota calculada' }).waitFor();
   assert.deepEqual(geocodeCalls.slice(count), [
    { operation: 'autocomplete', name: 'Origem de teste' },
    { operation: 'autocomplete', name: 'Destino de teste A' },
   ]);
   assert.equal(routeCalls.at(-1), '-34.8813,-8.05428;-34.8711,-8.0631');
  }
  const first = await visibleRoute();
  if (live) {
   assert(liveRouteResponse?.ok(), 'Live OSRM response must succeed');
   const data = await liveRouteResponse.json();
   console.log('Live OSRM route rendered:', data.routes[0].geometry.coordinates.length, 'positions');
  } else {
   await page.getByText(/Open-Meteo.*Consultando/).waitFor();
   delayDestinationWeather = false;
   await plan('Destino de teste B');
   assert.notEqual(await visibleRoute(), first);
   for (const mode of ['malformed', 'failed']) {
    routeMode = mode;
    await plan('Destino de teste A');
    await page.getByText(/Não foi possível obter uma rota viária/).waitFor();
    assert.equal(await line.count(), 0);
    assert.equal(await page.getByRole('heading', { name: 'Rota calculada' }).count(), 0);
   }
   routeMode = 'valid';
   await plan('Destino de teste B');
   await visibleRoute();
   await plan('Destino inválido de teste');
   await page.getByText(/Informe uma origem e um destino válidos/).waitFor();
   assert.equal(await line.count(), 0);
   // Start a separate GPS journey outside the previous address-admission window.
   await page.clock.fastForward(1100);
   await button('Usar minha localização').click();
   await page.getByText('Posição obtida para a origem.').waitFor();
   await plan('Destino de teste A');
   await visibleRoute();
   await page.locator('.route-result time').waitFor();
   assert.deepEqual(await page.evaluate(() => window.auditGPS), { starts: 0, stops: 0 });
   await button('Acompanhar posição').click();
   await page.getByText(/Acompanhando sua posição neste mapa/).waitFor();
   await button('Garagem').click();
   await page.waitForFunction(() => window.auditGPS.stops === 1);
   await button('Mapa').click();
   assert(await button('Acompanhar posição').isVisible());
   assert.equal(await page.evaluate(() => window.auditGPS.starts), 1);
   await button('Acompanhar posição').click();
   await page.getByText(/Acompanhando sua posição neste mapa/).waitFor();
   await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
   });
   await page.waitForFunction(() => window.auditGPS.stops === 2);
   await page.evaluate(() => {
    delete document.visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
   });
   assert(await button('Acompanhar posição').isVisible());
   await page.clock.fastForward(1800000);
   await page.locator('.route-result').getByText(/estimativa desatualizada/).waitFor();
   console.log('Deterministic route, weather polling and freshness, Recife layout, and GPS start/stop checks passed.');
  }
  assert.deepEqual(errors, []);
  assert.equal(legacyCalls, 0, 'No requests to the retired public geocoder');
 } finally {
  await browser.close();
 }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
