const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
// Load shared ES modules without Metro; browser storage is backed by an in-memory fixture.
const cache = new Map();
function load(name) {
 let file = path.resolve(name);
 if (!fs.existsSync(file)) file = fs.existsSync(file+'.web.js') ? file+'.web.js' : file+'.js';
 if(cache.has(file)) return cache.get(file).exports;
 const module = { exports: {} }; cache.set(file,module);
 const code=babel.transformSync(fs.readFileSync(file,'utf8'), { configFile: false, babelrc:false, plugins:['@babel/plugin-transform-modules-commonjs'] }).code;
 new Function('require','module','exports',code)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id),module,module.exports);
 return module.exports;
}
const data = new Map();
globalThis.localStorage = { getItem:key=>data.get(key)??null, setItem:(key,value)=>data.set(key,value), removeItem:key=>data.delete(key) };
const reports=load('src/features/reports/services/reportService.js');
const users=load('src/features/profile/services/userDataService.js');
const { buildUrl, requestJson }=load('src/services/api/externalClient.js');
const report={ latitude:-8,longitude:-34,hazard_type:'Alagamento',description:'Rua alagada',location_label:'Recife' };
beforeEach(()=>data.clear());
test('concurrent reports survive storage updates and remain pending',async()=>{
 await Promise.all(Array.from({length:10},()=>reports.createReport(report)));
 const items=await reports.listReports();assert.equal(items.length,10);assert.equal(new Set(items.map(i=>i.id)).size,10);assert.ok(items.every(i=>i.status==='Pendente'));
});
test('invalid reports cannot be persisted',async()=>{
 await assert.rejects(reports.createReport({...report,latitude:91}),/Localização/);
 await assert.rejects(reports.createReport({...report,description:' '}),/Preencha/);
 assert.deepEqual(await reports.listReports(),[]);
});
test('local clients cannot approve reports',async()=>{
 await reports.createReport(report);const [saved]=await reports.listReports();
 await assert.rejects(reports.updateReportStatus(saved.id,'Aprovado'),/backend/);
 assert.equal((await reports.listReports())[0].status,'Pendente');
});
test('vehicle validation and favorites are persistent and deduplicated',async()=>{
 assert.throws(()=>users.createVehicle({make:'A',model:'B',ground_clearance_cm:-1}),/altura/);
 await users.createVehicle({make:'A',model:'B',ground_clearance_cm:17});assert.equal((await users.listVehicles()).length,1);
 await Promise.all([users.setFavoriteReport('one',true),users.setFavoriteReport('one',true)]);assert.deepEqual(await users.listFavoriteReportIds(),['one']);
 await users.setFavoriteReport('one',false);assert.deepEqual(await users.listFavoriteReportIds(),[]);
});
test('external client requires HTTPS and preserves encoded queries',()=>{
 assert.throws(()=>buildUrl('http://example.com'),/HTTPS/);
 assert.equal(new URL(buildUrl('https://example.com',{q:'Rua A & B'})).searchParams.get('q'),'Rua A & B');
});
test('external errors and cancellation are propagated',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async()=>({ok:false,status:503});await assert.rejects(requestJson('https://example.com'),/503/);
  globalThis.fetch=async(_,options)=>{assert.equal(options.signal.aborted,true);throw new DOMException('Aborted','AbortError');};
  const controller=new AbortController();controller.abort();await assert.rejects(requestJson('https://example.com',controller.signal),{name:'AbortError'});
 } finally {globalThis.fetch=original;}
});

const { parseAlertDate, normalizeAlertFeed, selectAlerts, getAlertFeed, ALERT_REFRESH_MS } = load('src/features/alerts/services/alertService.js');
const alertNow = Date.parse('2026-11-09T15:00:00Z');
function alertFixture(overrides = {}) {
 return { id: 123, evento: 'Chuvas intensas', severidade: 'Perigo', nivel: 2, inicio: '2026-11-09 09:00', fim: '2026-11-10 12:00', estados: ['PE'], geocodes: [2611606], riscos: ['Possibilidade de alagamento.'], instrucoes: ['Acompanhe os avisos oficiais.'], url: 'https://radarmeteorologico.com.br/alertas/pe/123', ...overrides };
}
function feedFixture(alertas = [alertFixture()]) { return { atualizado_em: '2026-11-09T15:00:00Z', alertas }; }
test('INMET dates use Brasilia offset independently of device timezone', () => {
 assert.equal(parseAlertDate('2026-11-09 09:00'), '2026-11-09T12:00:00.000Z');
 assert.equal(parseAlertDate('2026-11-09T09:00:00-03:00'), '2026-11-09T12:00:00.000Z');
 assert.equal(parseAlertDate('invalid'), null);
});
test('official alerts are deduplicated and preserve issuer, safety text and links', () => {
 const result = normalizeAlertFeed(feedFixture([alertFixture(), alertFixture({ severidade: 'Grande Perigo', nivel: 3 })]), alertNow);
 assert.equal(result.alerts.length, 1); assert.equal(result.alerts[0].level,3);
 assert.equal(result.alerts[0].issuer,'INMET'); assert.equal(result.alerts[0].provider,'RadarMeteorológico');
 assert.deepEqual(result.alerts[0].instructions,['Acompanhe os avisos oficiais.']);
 assert.equal(normalizeAlertFeed(feedFixture([alertFixture({ url:'javascript:alert(1)' })])).alerts[0].url,'https://avisos.inmet.gov.br/');
});
test('malformed feeds fail instead of reporting no alerts; valid empty feeds are accepted', () => {
 assert.throws(()=>normalizeAlertFeed({error:'offline'}),/Formato/);
 assert.throws(()=>normalizeAlertFeed(feedFixture([alertFixture({fim:'invalid'})])),/validade/);
 assert.throws(()=>normalizeAlertFeed(feedFixture([alertFixture({geocodes:[]})])),/abrangência/);
 assert.deepEqual(normalizeAlertFeed(feedFixture([])).alerts,[]);
});
test('region filtering excludes expired and unrelated alerts and distinguishes scheduled events', () => {
 const result=normalizeAlertFeed(feedFixture([
  alertFixture({id:'expired',fim:'2026-11-09 10:00'}),
  alertFixture({id:'other-state',estados:['SP'],geocodes:[3550308]}),
  alertFixture({id:'other-city',geocodes:[2609600]}),
  alertFixture({id:'scheduled',inicio:'2026-11-10 09:00',fim:'2026-11-11 12:00',nivel:3}),
  alertFixture(),
 ]),alertNow);
 assert.deepEqual(selectAlerts(result.alerts,{uf:'PE',municipalityCode:'2611606'},alertNow).map(a=>a.id),['123','scheduled']);
 assert.equal(selectAlerts(result.alerts,{uf:'PE'},alertNow).length,3);
 assert.equal(selectAlerts(result.alerts,{},alertNow).length,4);
});
test('collection shares requests, respects the free feed cache and handles outages honestly', async () => {
 const originalFetch=globalThis.fetch, originalNow=Date.now;
 let clock=alertNow, calls=0;
 Date.now=()=>clock;
 globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>feedFixture()};};
 try {
  const [first,second]=await Promise.all([getAlertFeed(),getAlertFeed()]);
  assert.equal(calls,1); assert.equal(first.snapshot,second.snapshot);
  await getAlertFeed(); assert.equal(calls,1);
  clock+=ALERT_REFRESH_MS+1;
  globalThis.fetch=async()=>{calls++;throw new Error('offline');};
  const stale=await getAlertFeed(); assert.ok(stale.error);assert.equal(stale.snapshot.alerts.length,1);assert.equal(calls,2);
  await getAlertFeed();assert.equal(calls,2);
  clock+=25*60*60*1000;
  const unavailable=await getAlertFeed();assert.equal(unavailable.snapshot,null);assert.ok(unavailable.error);
 } finally {globalThis.fetch=originalFetch;Date.now=originalNow;}
});

const { buildMapDocument, serializeMapState } = load('src/features/map/services/mapDocument.js');
test('native map bundles Leaflet locally and uses HTTPS OpenStreetMap without Google keys', () => {
 const html=buildMapDocument([-8.05428,-34.8813]);
 assert.ok(html.includes('https://tile.openstreetmap.org/{z}/{x}/{y}.png'));
 assert.ok(html.includes('OpenStreetMap</a> contributors'));
 assert.ok(html.includes('window.updateFloodyMap'));
 assert.ok(!/<script[^>]+src=/.test(html));
 assert.ok(!/maps.googleapis|googleMapsApiKey|api_key=/i.test(html));
 assert.throws(()=>buildMapDocument([-8,-34],'http://example.com/{z}/{x}/{y}.png'),/HTTPS/);
});
test('native map bridge accepts only geographic coordinates and preserves route state', () => {
 const state={center:[-8,-34],origin:[-8.1,-34.2],destination:[-8.2,-34.3],route:[[-8.1,-34.2],[-8.2,-34.3]]};
 assert.deepEqual(JSON.parse(serializeMapState(state)),state);
 assert.throws(()=>serializeMapState({center:['</script>',-34]}),/Coordenadas/);
 assert.throws(()=>serializeMapState({center:[91,0]}),/Coordenadas/);
 assert.throws(()=>serializeMapState({center:[0,0],route:[[0,181]]}),/Coordenadas/);
});

test('native map bridge keeps local report labels inert', () => {
 const marker = { coords: [-8, -34], label: '</script><img src=x>', kind: 'Alagamento', flood: true };
 const serialized = serializeMapState({ center: [-8, -34], markers: [marker] });
 assert.ok(!serialized.includes('<'));
 assert.deepEqual(JSON.parse(serialized).markers, [marker]);
 assert.match(buildMapDocument([-8, -34]), /label\.textContent=marker\.label/);
});

test('geocoding rejects missing and out-of-range coordinates', async () => {
 const { resolveAddress } = load('src/features/map/services/geocodingService.js');
 const originalFetch = globalThis.fetch;
 let matches = [
  { display_name: 'Missing latitude', lat: null, lon: '-34' },
  { display_name: 'Blank longitude', lat: '-8', lon: ' ' },
  { display_name: 'Out of range', lat: '91', lon: '-34' },
 ];
 globalThis.fetch = async () => new Response(JSON.stringify(matches));
 try {
  assert.equal(await resolveAddress('Local inválido'), null);
  matches = [{ display_name: 'Recife', lat: '-8', lon: '-34' }];
  assert.deepEqual(await resolveAddress('Recife'), [-8, -34]);
 } finally {
  globalThis.fetch = originalFetch;
 }
});

test('web route geometry converts GeoJSON to Leaflet order and rejects invisible routes', () => {
 const { webRouteGeometry } = load('src/features/map/services/webRouteGeometry.js');
 const route = { distance: 2000, duration: 500, geometry: { type: 'LineString', coordinates: [[-34.88, -8.05], [-34.87, -8.06]] } };
 assert.deepEqual(webRouteGeometry(route), [[-8.05, -34.88], [-8.06, -34.87]]);
 for (const coordinates of [[], [[-34.88, -8.05]], [[-34.88, -8.05], [-34.88, -8.05]], [[-34.88, -8.05], [0, 91]]]) {
  assert.throws(() => webRouteGeometry({ ...route, geometry: { ...route.geometry, coordinates } }));
 }
});

test('precipitation uses metric model accumulation, UTC epochs and Recife display time', async () => {
 const { getCurrentPrecipitation, precipitationDetails } = load('src/features/dashboard/services/weatherService.js');
 const originalFetch = globalThis.fetch;
 const validAt = Date.parse('2026-11-10T01:45:00Z');
 const data = { current_units: { precipitation: 'mm' }, current: { time: validAt / 1000, interval: 900, precipitation: 0 } };
 globalThis.fetch = async (url, options) => {
  const params = new URL(url).searchParams;
  for (const [key, value] of Object.entries({
   latitude: '-8.05428', longitude: '-34.8813', current: 'precipitation',
   precipitation_unit: 'mm', timezone: 'America/Recife', timeformat: 'unixtime',
  })) assert.equal(params.get(key), value);
  assert.equal(options.cache, 'no-store');
  return new Response(JSON.stringify(data));
 };
 try {
  const reading = await getCurrentPrecipitation(-8.05428, -34.8813, { withDetails: true });
  assert.deepEqual(reading, { amountMm: 0, validAt, intervalSeconds: 900 });
  assert.deepEqual(precipitationDetails(reading, validAt + 1000), { period: '15 min', time: '09/11/2026, 22:45', stale: false });
  assert.equal(precipitationDetails(reading, validAt + 1800000).stale, true);
  data.current.time = undefined;
  await assert.rejects(getCurrentPrecipitation(-8.05428, -34.8813, { withDetails: true }), /indisponível/);
 } finally {
  globalThis.fetch = originalFetch;
 }
});

test('native navigation and feature icon names have bundled Material Symbol images', () => {
 const component = fs.readFileSync('src/components/native/MaterialIcon.native.js', 'utf8');
 const assets = [...component.matchAll(/import (\w+) from '.*assets\/material-symbols\/(\w+)\.png'/g)];
 const names = assets.map(([, binding, file]) => {
  assert.equal(binding, file);
  const png = fs.readFileSync(`assets/material-symbols/${file}.png`);
  assert.equal(png.readUInt32BE(0), 0x89504e47);
  assert.equal(png.readUInt32BE(16), 96);
  assert.equal(png.readUInt32BE(20), 96);
  assert.equal(png[25], 6); // Truecolor with alpha, used for theme tinting.
  return binding;
 });
 for (const screen of ['App.native.js', 'features/dashboard/DashboardScreen.native.js', 'features/map/MapScreen.native.js', 'features/reports/screens/ReportScreen.native.js', 'features/profile/VehiclesScreen.native.js']) {
  const source = fs.readFileSync(`src/${screen}`, 'utf8');
  const references = [...source.matchAll(/(?:icon: '|icon="|<MaterialIcon name=")(\w+)|icon=\{theme === 'dark' \? '(\w+)' : '(\w+)'\}/g)]
   .flatMap(match => match.slice(1).filter(Boolean));
  assert.ok(references.length > 0, screen);
  references.forEach(name => assert.ok(names.includes(name), `${screen}: missing ${name}`));
 }
});
