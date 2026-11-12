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
 new Function('require','module','exports',code)(id=>id.startsWith('.')?load(path.resolve(path.dirname(file),id)):cache.has(id)?cache.get(id).exports:require(id),module,module.exports);
 return module.exports;
}
const data = new Map();
globalThis.localStorage = { getItem:key=>data.get(key)??null, setItem:(key,value)=>data.set(key,value), removeItem:key=>data.delete(key) };
// Report service runs against a fake Supabase client: these tests prove client behaviour only, not the server.
const rpcCalls=[];let rpcHandler=async()=>({data:null,error:null});
const fakeSupabase={rpc:async(name,args)=>{rpcCalls.push([name,args]);return rpcHandler(name,args);}};
cache.set(path.resolve('src/services/supabase/client.web.js'),{exports:{supabase:fakeSupabase}});
cache.set('expo-crypto',{exports:{randomUUID:()=>require('node:crypto').randomUUID()}});
const reports=load('src/features/reports/services/reportService.js');
const users=load('src/features/profile/services/userDataService.js');
const { buildUrl, requestJson }=load('src/services/api/externalClient.js');
const report={ latitude:-8.0631,longitude:-34.8711,hazardCode:'flood_impassable',description:' Rua alagada ',location_label:'Recife',submissionId:'5b0c1f0e-8a8d-4c7e-9a43-2f7d2d1f1a10',observedAt:'2026-11-10T21:00:00.000Z',locationSource:'gps' };
beforeEach(()=>{data.clear();rpcCalls.length=0;rpcHandler=async()=>({data:null,error:null});});
test('reports are sent only through submit_report with the submission id and no client-owned fields',async()=>{
 rpcHandler=async()=>({data:{ok:true,code:'OK',replayed:false,report:{id:'r1',status:'published'}},error:null});
 const result=await reports.createReport({...report,author_id:'attacker',status:'published'});
 assert.deepEqual(result,{id:'r1',status:'published',replayed:false});
 const [[name,args]]=rpcCalls;assert.equal(name,'submit_report');
 assert.equal(args.p_client_submission_id,report.submissionId);assert.equal(args.p_description,'Rua alagada');assert.equal(args.p_location_source,'gps');
 assert.ok(Object.keys(args).every(key=>key.startsWith('p_'))&&!('p_author_id' in args)&&!('p_status' in args));
 assert.equal(data.get('floody_reports'),undefined,'nothing is written to the legacy local list');
});
test('server rejections, network failures and expired sessions are never reported as success',async()=>{
 rpcHandler=async()=>({data:{ok:false,code:'OUTSIDE_SERVICE_AREA'},error:null});
 await assert.rejects(reports.createReport(report),err=>err.code==='OUTSIDE_SERVICE_AREA'&&/Região Metropolitana/.test(err.message));
 rpcHandler=async()=>({data:{ok:false,code:'EMAIL_NOT_VERIFIED'},error:null});
 await assert.rejects(reports.createReport(report),/Confirme seu e-mail/);
 rpcHandler=async()=>{throw new TypeError('Failed to fetch');};
 await assert.rejects(reports.createReport(report),err=>err.code==='UNKNOWN'&&err.retryable&&/não será duplicado/.test(err.message));
 rpcHandler=async()=>({data:null,error:{code:'PGRST301',message:'JWT expired'}});
 await assert.rejects(reports.createReport(report),err=>err.code==='AUTH_REQUIRED');
 await assert.rejects(reports.createReport({...report,latitude:91}),/localização/);
 await assert.rejects(reports.createReport({...report,submissionId:''}),/localização/);
});
test('published reports come from the server and legacy local reports stay read-only and unpublished',async()=>{
 rpcHandler=async name=>({data:name==='list_published_reports'?[
  {id:'p1',hazard_type:'flood_impassable',description:'Alagado',location_label:null,latitude:-8.0631,longitude:-34.8711,location_source:'gps',verification:'unverified_user_report',observed_at:'2026-11-10T20:00:00Z',expires_at:'2026-11-12T20:00:00Z'},
  {id:'bad',hazard_type:'traffic',description:'x',latitude:'NaN',longitude:0}]:null,error:null});
 data.set('floody_reports',JSON.stringify([{id:'old',latitude:-8,longitude:-34,description:'Antigo',location_label:'Recife',hazard_type:'Obra',status:'Pendente',occurred_at:'2026-11-01T00:00:00Z'}]));
 const items=await reports.listReports();
 assert.deepEqual(items.map(i=>[i.id,i.status]),[['p1','published'],['old','legacy_local']]);
 assert.equal(items[0].hazard_type,'Alagamento Intransitável');assert.equal(items[0].status_label,'Relato não verificado');
 assert.equal(items[1].status_label,'Salvo só neste dispositivo · não publicado');
 rpcHandler=async()=>({data:null,error:{message:'offline'}});
 await assert.rejects(reports.listReports(),/relatos publicados/);
 data.set('floody_reports','[null]');rpcHandler=async()=>({data:[],error:null});
 assert.deepEqual(await reports.listReports(),[]);assert.equal(data.get('floody_reports'),'[null]','corrupt legacy data is not overwritten');
});
test('withdrawal goes through withdraw_report, removes the report at once and notifies listeners',async()=>{
 const row=id=>({id,hazard_type:'traffic',description:'Trânsito',location_label:'Recife',latitude:-8.06,longitude:-34.87,location_source:'gps',observed_at:'2026-11-10T20:00:00Z',expires_at:'2026-11-12T20:00:00Z'});
 rpcHandler=async name=>name==='list_published_reports'?{data:[row('w1'),row('w2')],error:null}:{data:{ok:true,code:'OK',report:{id:'w1',status:'withdrawn'}},error:null};
 let notified=0;const unsubscribe=reports.subscribeToReports(()=>{notified++;});
 assert.deepEqual((await reports.listPublishedReports()).map(r=>r.id),['w1','w2']);
 assert.deepEqual(await reports.withdrawReport('w1'),{id:'w1',status:'withdrawn'});
 assert.deepEqual(rpcCalls.at(-1),['withdraw_report',{p_report_id:'w1'}]);
 assert.equal(notified,1,'listeners (public list, map, my reports) are told to reload');
 assert.deepEqual((await reports.listPublishedReports()).map(r=>r.id),['w2'],'withdrawn report is hidden even if the server list is stale');
 unsubscribe();
});
test('withdrawal errors are explicit, duplicates are refused and a lost-response retry counts as success',async()=>{
 rpcHandler=async()=>({data:{ok:false,code:'NOT_FOUND'},error:null});
 await assert.rejects(reports.withdrawReport('other-user-report'),err=>err.code==='NOT_FOUND');
 rpcHandler=async()=>({data:{ok:false,code:'CONFLICT_STATE',details:{status:'expired'}},error:null});
 await assert.rejects(reports.withdrawReport('old'),err=>err.code==='CONFLICT_STATE');
 rpcHandler=async()=>({data:{ok:false,code:'CONFLICT_STATE',details:{status:'withdrawn'}},error:null});
 assert.equal((await reports.withdrawReport('again')).status,'withdrawn');
 rpcHandler=async()=>{throw new TypeError('Failed to fetch');};
 await assert.rejects(reports.withdrawReport('net'),err=>err.code==='UNKNOWN'&&err.retryable);
 rpcHandler=async()=>({data:null,error:{code:'PGRST301',message:'JWT expired'}});
 await assert.rejects(reports.withdrawReport('jwt'),err=>err.code==='AUTH_REQUIRED');
 let release;rpcHandler=()=>new Promise(resolve=>{release=()=>resolve({data:{ok:true,code:'OK'},error:null});});
 const first=reports.withdrawReport('slow');
 await assert.rejects(reports.withdrawReport('slow'),err=>err.code==='IN_PROGRESS');
 release();await first;
 assert.equal(rpcCalls.filter(([name,args])=>name==='withdraw_report'&&args.p_report_id==='slow').length,1,'only one request was sent');
});
test('my reports come from my_reports and only open reports are withdrawable',async()=>{
 rpcHandler=async()=>({data:[{id:'a',hazard_type:'pothole',description:'x',location_label:null,status:'published',observed_at:'2026-11-10T20:00:00Z'},
  {id:'b',hazard_type:'traffic',description:'y',location_label:'Recife',status:'withdrawn'},{id:'c',hazard_type:'traffic',description:'z',location_label:'Recife',status:'held'}],error:null});
 const mine=await reports.listMyReports();
 assert.deepEqual(rpcCalls.at(-1),['my_reports',undefined]);
 assert.deepEqual(mine.map(r=>[r.id,r.withdrawable]),[['a',true],['b',false],['c',true]]);
 assert.equal(mine[0].hazard_type,'Buraco na via');
 rpcHandler=async()=>({data:null,error:{message:'offline'}});
 await assert.rejects(reports.listMyReports(),/seus relatos/);
});
test('overlapping reads share one request, but a change forces a fresh one',async()=>{
 let release;const gate=new Promise(r=>{release=r;});
 rpcHandler=async name=>{await gate;return {data:name==='list_published_reports'?[]:[],error:null};};
 const a=reports.listPublishedReports(),b=reports.listPublishedReports();
 release();await Promise.all([a,b]);
 assert.equal(rpcCalls.filter(([n])=>n==='list_published_reports').length,1,'concurrent readers share the in-flight request');
 rpcCalls.length=0;
 const holds=[];rpcHandler=name=>name==='submit_report'?Promise.resolve({data:{ok:true,code:'OK',report:{id:'n1',status:'published'}},error:null}):new Promise(r=>{holds.push(()=>r({data:[],error:null}));});
 const stale=reports.listPublishedReports();
 await reports.createReport(report);
 const fresh=reports.listPublishedReports();
 assert.equal(rpcCalls.filter(([n])=>n==='list_published_reports').length,2,'a read started before the change is not reused after it');
 holds.forEach(release=>release());await Promise.all([stale,fresh]);
 assert.ok(data.get('floody_reports_changed'),'the change is announced to other tabs through storage');
 rpcCalls.length=0;rpcHandler=async()=>({data:[],error:null});
 await Promise.all([reports.listMyReports('user-a'),reports.listMyReports('user-b')]);
 assert.equal(rpcCalls.filter(([n])=>n==='my_reports').length,2,'my_reports reads are never shared across accounts');
});
test('views are refreshed by a 30 s poll that stops when the last view unsubscribes',()=>{
 const { mock }=require('node:test');
 mock.timers.enable({apis:['setInterval']});
 try{
  let calls=0;const unsubscribe=reports.subscribeToReports(()=>{calls++;});
  mock.timers.tick(29999);assert.equal(calls,0);
  mock.timers.tick(1);assert.equal(calls,1,'refreshed after 30 s');
  unsubscribe();mock.timers.tick(60000);assert.equal(calls,1,'no polling without subscribers');
 } finally { mock.timers.reset(); }
});
test('auth errors are specific: network, known codes and unknown codes are never a silent generic',()=>{
 const { authMessage }=load('src/store/authMessages.js');
 assert.match(authMessage({name:'AuthRetryableFetchError',message:'Network request failed',status:0}),/conectar ao serviço de contas/);
 assert.match(authMessage(new TypeError('Network request failed')),/conectar ao serviço de contas/);
 assert.match(authMessage({code:'invalid_credentials',message:'Invalid login credentials',status:400}),/E-mail ou senha incorretos/);
 assert.match(authMessage({code:'email_not_confirmed',message:'Email not confirmed',status:400}),/Confirme seu e-mail/);
 assert.match(authMessage({code:'over_request_rate_limit',status:429}),/Muitas tentativas/);
 assert.equal(authMessage({code:'unexpected_failure',message:'boom',status:500}),'Não foi possível concluir (unexpected_failure). Tente novamente.');
 assert.equal(authMessage({message:'x',status:503}),'Não foi possível concluir (HTTP 503). Tente novamente.');
 assert.ok(!authMessage({code:'eyJhbGciOiJIUzI1NiJ9.secret.token',status:400}).includes('eyJ'),'a token-like code is never echoed');
});
test('a loopback Supabase URL is detected so a phone build can warn in development',()=>{
 const { isLoopbackUrl }=load('src/services/supabase/createSupabase.js');
 assert.equal(isLoopbackUrl('http://127.0.0.1:54321'),true);assert.equal(isLoopbackUrl('http://localhost:54321'),true);
 assert.equal(isLoopbackUrl('https://gssztjlcefjayzgvqsck.supabase.co'),false);assert.equal(isLoopbackUrl(''),false);
});
test('legacy device reports stay readable when the published list is unavailable, without hiding the failure',async()=>{
 const legacy=[{id:'old',latitude:-8,longitude:-34,description:'Antigo',location_label:'Recife',hazard_type:'Obra',status:'Pendente',occurred_at:'2026-11-01T00:00:00Z'}];
 data.set('floody_reports',JSON.stringify(legacy));
 const clientModule=cache.get(path.resolve('src/services/supabase/client.web.js'));
 clientModule.exports.supabase=null;
 try {
  await assert.rejects(reports.listReports(),err=>err.code==='NOT_CONFIGURED'&&/não configurado/.test(err.message)
   &&Array.isArray(err.partial)&&err.partial.map(r=>[r.id,r.status]).join()==='old,legacy_local');
 } finally { clientModule.exports.supabase=fakeSupabase; }
 rpcHandler=async()=>({data:null,error:{message:'offline'}});
 await assert.rejects(reports.listReports(),err=>/relatos publicados/.test(err.message)&&err.partial.map(r=>r.id).join()==='old');
 rpcHandler=async()=>{throw new TypeError('Failed to fetch');};
 await assert.rejects(reports.listReports(),err=>err.partial.map(r=>r.id).join()==='old','an ambiguous network failure still exposes the device-only reports');
 assert.ok(!rpcCalls.some(([name])=>name==='submit_report'),'legacy reports are never uploaded');
 assert.equal(data.get('floody_reports'),JSON.stringify(legacy),'legacy storage is left untouched');
});
test('a list kept after a failed refresh drops reports whose 48 h lifetime ended, but keeps legacy ones',()=>{
 const now=Date.parse('2026-11-12T12:00:00Z');
 const list=[{id:'live',expires_at:'2026-11-12T12:00:01Z'},{id:'ended',expires_at:'2026-11-12T12:00:00Z'},{id:'legacy',status:'legacy_local'}];
 assert.deepEqual(reports.withoutExpired(list,now).map(r=>r.id),['live','legacy']);
 assert.deepEqual(reports.withoutExpired(undefined,now),[],'a missing partial list is empty, not an error');
});
test('GPS accuracy is sent as provenance only when the server would accept it',async()=>{
 rpcHandler=async()=>({data:{ok:true,code:'OK',report:{id:'r1',status:'published'}},error:null});
 await reports.createReport({...report,accuracy:12.5});
 await reports.createReport({...report,accuracy:250000});
 await reports.createReport({...report,accuracy:Number.NaN});
 assert.deepEqual(rpcCalls.map(([,args])=>args.p_gps_accuracy_m),[12.5,null,null]);
});
test('a description without any letter or digit is refused before reaching the server',async()=>{
 await assert.rejects(reports.createReport({...report,description:'​​ ...'}),err=>err.code==='VALIDATION_FAILED');
 assert.equal(rpcCalls.length,0);
 rpcHandler=async()=>({data:{ok:true,code:'OK',report:{id:'r1',status:'published'}},error:null});
 await reports.createReport({...report,description:'Água na pista'});
 assert.equal(rpcCalls.length,1,'accented Portuguese text is accepted');
});
test('held reports are never described as under an available review',()=>{
 const { submissionOutcome, ownStatusLabel }=load('src/features/reports/constants.js');
 const held=submissionOutcome('held');
 assert.doesNotMatch(`${held.title} ${held.body}`,/para revisão|em revisão/i);
 assert.match(held.body,/não foi publicado/);assert.match(held.body,/não está disponível/);assert.match(held.body,/24 horas/);
 assert.doesNotMatch(ownStatusLabel('held'),/revisão/i);assert.doesNotMatch(ownStatusLabel('hidden'),/revisão/i);
 const published=submissionOutcome('published');
 assert.match(published.body,/48 horas/);assert.match(published.body,/não verificado/);
});
test('sign-out is judged by the session actually left on the device',async()=>{
 const { signOutThisDevice, accountFromSession }=load('src/store/authSession.js');
 const fakeAuth=({ signOut, session })=>({ signOut, getSession:async()=>({data:{session:typeof session==='function'?session():session},error:null}) });
 const user={id:'u1',email:'pessoa@floody.test',email_confirmed_at:'2026-11-10T00:00:00Z'};
 let stored={user};
 const ok=await signOutThisDevice(fakeAuth({signOut:async()=>{stored=null;return{error:null};},session:()=>stored}));
 assert.deepEqual(ok,{signedOut:true});
 stored={user};
 const offline=await signOutThisDevice(fakeAuth({signOut:async()=>{stored=null;return{error:{name:'AuthRetryableFetchError',message:'Network request failed'}};},session:()=>stored}));
 assert.deepEqual(offline,{signedOut:true},'server revocation failed but this device no longer holds a session');
 stored={user};
 const storageFailure=await signOutThisDevice(fakeAuth({signOut:async()=>{throw new Error('storage unavailable');},session:()=>stored}));
 assert.equal(storageFailure.signedOut,false);assert.match(storageFailure.error,/Não foi possível sair/);
 const keptByLibrary=await signOutThisDevice(fakeAuth({signOut:async()=>({error:{message:'boom'}}),session:{user}}));
 assert.equal(keptByLibrary.signedOut,false,'an error is never assumed to mean signed out');
 const unknown=await signOutThisDevice({signOut:async()=>({error:null}),getSession:async()=>{throw new Error('storage unavailable');}});
 assert.equal(unknown.signedOut,false,'an unreadable session is treated as still present');
 assert.equal(accountFromSession(null),null);
 const account=accountFromSession({user});
 assert.deepEqual(account,{id:'u1',nome:'Minha conta',tipo:'condutor',guest:false,emailVerified:true});
 assert.ok(!JSON.stringify(account).includes('@'),'the app user object never carries the e-mail');
});
test('local clients cannot approve reports',async()=>{
 await assert.rejects(reports.updateReportStatus('p1','published'),/backend/);
});
test('only a publishable Supabase key is accepted in the app',()=>{
 const { isPublishableKey }=load('src/services/supabase/createSupabase.js');
 const jwt=role=>['x',Buffer.from(JSON.stringify({role})).toString('base64url'),'y'].join('.');
 assert.equal(isPublishableKey('sb_publishable_abc'),true);assert.equal(isPublishableKey(jwt('anon')),true);
 assert.equal(isPublishableKey('sb_secret_abc'),false);assert.equal(isPublishableKey(jwt('service_role')),false);assert.equal(isPublishableKey(''),false);
});
test('external client requires HTTPS and preserves encoded queries',()=>{
 assert.throws(()=>buildUrl('http://example.com'),/HTTPS/);
 assert.throws(()=>buildUrl('https://demo:password@example.com'),/credenciais/);
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

const geoModule = 'src/features/map/services/geocodingService.js';
let geo;
const geoEnv = load('src/config/env.js').env;
const point = (coordinates, properties) => ({ type: 'Feature', geometry: { type: 'Point', coordinates }, properties });
const collection = (...features) => ({ type: 'FeatureCollection', features });

async function withGeoapify(fetch, run, key = 'fixture-key') {
 const originalFetch = globalThis.fetch;
 const originalKey = geoEnv.geoapifyApiKey;
 globalThis.fetch = fetch;
 geoEnv.geoapifyApiKey = key;
 cache.delete(path.resolve(geoModule));
 geo = load(geoModule);
 try { await run(); }
 finally { globalThis.fetch = originalFetch; geoEnv.geoapifyApiKey = originalKey; }
}

test('Geoapify autocomplete filters Brazil, biases Recife, caps results and normalizes addresses', async () => {
 let calls = 0;
 await withGeoapify(async url => {
  calls++;
  const request = new URL(url);
  assert.equal(request.origin + request.pathname, 'https://api.geoapify.com/v1/geocode/autocomplete');
  for (const [key, value] of Object.entries({ apiKey: 'fixture-key', lang: 'pt', filter: 'countrycode:br',
   bias: 'proximity:-34.8813,-8.05428', limit: '5', text: 'Rua São Paulo', format: 'geojson' })) {
   assert.equal(request.searchParams.get(key), value);
  }
  const good = point([-46.63, -23.55], { formatted: 'Rua São Paulo, 42', street: 'Rua São Paulo', housenumber: '42',
   suburb: 'Centro', city: 'São Paulo', state: 'São Paulo', country: 'Brasil', place_id: 'fixture-place' });
  return Response.json(collection(point([null, 0], { formatted: 'Inválido' }), point([0, 91], { formatted: 'Inválido' }),
   good, ...Array.from({ length: 6 }, () => point([-46.6, -23.5], { address_line1: 'Outra rua', address_line2: 'São Paulo' }))));
 }, async () => {
  assert.deepEqual(await geo.searchAddresses(' A. 1 '), []);
  assert.equal(calls, 0);
  const result = await geo.searchAddresses('  Rua  São Paulo ');
  assert.equal(result.length, 5);
  assert.deepEqual(result[0], { display_name: 'Rua São Paulo, 42', lat: -23.55, lon: -46.63,
   street: 'Rua São Paulo', houseNumber: '42', neighborhood: 'Centro', city: 'São Paulo', state: 'São Paulo', country: 'Brasil', id: 'fixture-place' });
  assert.equal(result[1].display_name, 'Outra rua, São Paulo');
 });
});

test('Geoapify separates forward and reverse requests and accepts an empty result', async () => {
 const requests = [];
 await withGeoapify(async url => {
  const request = new URL(url);
  requests.push(request);
  return Response.json(request.searchParams.get('text') === 'Local inexistente' ? collection() :
   collection(point([-34.9, -8.1], { formatted: 'Recife, PE' })));
 }, async () => {
  assert.deepEqual(await geo.resolveAddress('Recife'), [-8.1, -34.9]);
  assert.equal(await geo.resolveAddress('Local inexistente'), null);
  assert.equal(await geo.reverseGeocode(-8.1, -34.9), 'Recife, PE');
  assert.equal(requests[0].pathname, '/v1/geocode/search');
  assert.equal(requests[0].searchParams.get('limit'), '1');
  assert.equal(requests[2].pathname, '/v1/geocode/reverse');
  assert.equal(requests[2].searchParams.get('lat'), '-8.1');
  assert.equal(requests[2].searchParams.get('lon'), '-34.9');
  await assert.rejects(geo.reverseGeocode(91, -34.9), /Coordenadas inválidas/);
  assert.equal(requests.length, 3);
 });
});

test('Geoapify errors distinguish key, quota, and invalid provider data without leaking a URL', async () => {
 await withGeoapify(() => assert.fail('Missing key must not fetch'), async () => {
  await assert.rejects(geo.searchAddresses('Recife'), /não configurada/);
 }, '');
 for (const [status, message] of [[401, /recusou/], [403, /recusou/], [429, /Limite/], [500, /indisponível/]]) {
  await withGeoapify(async () => new Response(null, { status }), async () => {
   await assert.rejects(geo.searchAddresses('Recife'), message);
  });
 }
 await withGeoapify(async url => { throw new Error(url); }, async () => {
  await assert.rejects(geo.searchAddresses('Recife'), error => /indisponível/.test(error.message) && !error.message.includes('fixture-key'));
 });
 for (const data of [{ features: [] }, collection(point([-34, 91], { formatted: 'Inválido' }))]) {
  await withGeoapify(async () => Response.json(data), async () => {
   await assert.rejects(geo.searchAddresses('Recife'), /Resposta de endereços inválida/);
  });
 }
});

test('Geoapify autocomplete forwards cancellation to fetch', async () => {
 const controller = new AbortController();
 await withGeoapify(async (_url, { signal }) => new Promise((_resolve, reject) => {
  signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
 }), async () => {
  const pending = geo.searchAddresses('Recife', controller.signal);
  controller.abort();
  await assert.rejects(pending, /cancelada/);
 });
});

test('shared route geometry converts GeoJSON to Leaflet order and rejects invisible routes', () => {
 const { routeGeometry } = load('src/features/map/services/routeGeometry.js');
 const route = { distance: 2000, duration: 500, geometry: { type: 'LineString', coordinates: [[-34.88, -8.05], [-34.87, -8.06]] } };
 assert.deepEqual(routeGeometry(route), [[-8.05, -34.88], [-8.06, -34.87]]);
 for (const coordinates of [[], [[-34.88, -8.05]], [[-34.88, -8.05], [-34.88, -8.05]], [[-34.88, -8.05], [0, 91]]]) {
  assert.throws(() => routeGeometry({ ...route, geometry: { ...route.geometry, coordinates } }));
 }
});

test('precipitation uses metric model accumulation, UTC epochs and Recife display time', async () => {
 const { getCurrentPrecipitation, precipitationDetails } = load('src/features/dashboard/services/weatherService.js');
 const originalFetch = globalThis.fetch;
 const originalNow = Date.now;
 const validAt = Date.parse('2026-11-10T01:45:00Z');
 Date.now = () => validAt + 60000;
 const data = { current_units: { precipitation: 'mm', time: 'unixtime', interval: 'seconds' }, current: { time: validAt / 1000, interval: 900, precipitation: 0 } };
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
  data.current.time = validAt / 1000 + 3600;
  await assert.rejects(getCurrentPrecipitation(-8.05428, -34.8813, { withDetails: true }), /indisponível/);
  data.current.time = validAt / 1000;
  data.current_units.time = 'iso8601';
  await assert.rejects(getCurrentPrecipitation(-8.05428, -34.8813, { withDetails: true }), /indisponível/);
  data.current_units.time = 'unixtime';
  data.current.time = undefined;
  await assert.rejects(getCurrentPrecipitation(-8.05428, -34.8813, { withDetails: true }), /indisponível/);
 } finally {
  globalThis.fetch = originalFetch;
  Date.now = originalNow;
 }
});

test('Geoapify shares an admission limit and honors a provider cooldown', () => {
 const { createGeocodingRateGate } = load('src/features/map/services/geocodingRateGate.js');
 let now = Date.parse('2026-11-09T12:00:00Z');
 const gate = createGeocodingRateGate(() => now);
 for (let i = 0; i < 5; i++) assert.equal(gate.claim(), true);
 assert.equal(gate.claim(), false);
 now += 1000;
 assert.equal(gate.claim(), true);
 gate.coolDown('10');
 now += 9999;
 assert.equal(gate.claim(), false);
 now += 1;
 assert.equal(gate.claim(), true);
 gate.coolDown(new Date(now + 15000).toUTCString());
 now += 14999;
 assert.equal(gate.claim(), false);
 now += 1;
 assert.equal(gate.claim(), true);
});

test('OSRM validates input and decoded GeoJSON before returning a route on either platform', async () => {
 const { getDrivingRoute } = load('src/features/map/services/routingService.js');
 const originalFetch = globalThis.fetch;
 let calls = 0;
 let coordinates = [[-34.88, -8.05], [-34.87, -8.06]];
 globalThis.fetch = async url => {
  calls++;
  const request = new URL(url);
  assert.equal(request.pathname.split('/').at(-1), '-34.88,-8.05;-34.87,-8.06');
  return Response.json({ code: 'Ok', routes: [{ distance: 1234, duration: 500, geometry: { type: 'LineString', coordinates } }] });
 };
 try {
  await assert.rejects(getDrivingRoute([91, 0], [-8.06, -34.87]), /inválidas/);
  assert.equal(calls, 0);
  assert.deepEqual((await getDrivingRoute([-8.05, -34.88], [-8.06, -34.87])).positions, [[-8.05, -34.88], [-8.06, -34.87]]);
  coordinates = [[-34.88, -8.05], [-34.87, 91]];
  await assert.rejects(getDrivingRoute([-8.05, -34.88], [-8.06, -34.87]), /inválidas/);
 } finally { globalThis.fetch = originalFetch; }
});

test('map tile URL validation and credits follow the effective provider', () => {
 const { tileSource } = load('src/features/map/services/tileSource.js');
 for (const url of ['http://host/{z}/{x}/{y}', 'https://user:pass@host/{z}/{x}/{y}', 'https://host/no-template']) {
  assert.equal(tileSource(url), null);
 }
 assert.match(tileSource('https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png').attribution, /CARTO/);
 assert.match(tileSource('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').attribution, /Vantor/);
 assert.doesNotMatch(tileSource('https://custom.example/{z}/{x}/{y}.png').attribution, /CARTO|Esri/);
});

test('invalid catalog and stored vehicle shapes fail safely', async () => {
 const { listVehicleMakes, listVehicleModels } = load('src/features/profile/services/vehicleCatalogService.js');
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async url => Response.json(url.endsWith('/marcas') ? [{ codigo: 21, nome: 'Fiat' }] : { modelos: null });
 try {
  assert.deepEqual(await listVehicleMakes(), [{ codigo: '21', nome: 'Fiat' }]);
  await assert.rejects(listVehicleModels('21'), /catálogo de veículos inválida/);
  data.set('floody_vehicles', '[null]');
  await assert.rejects(users.listVehicles(), /Dados de veículos locais inválidos/);
  await assert.rejects(users.createVehicle({ make: 'Fiat', model: 'Uno', ground_clearance_cm: 17 }), /Dados de veículos locais inválidos/);
  assert.equal(data.get('floody_vehicles'), '[null]');
 } finally { globalThis.fetch = originalFetch; }
});

test('an unsafe cached official-alert URL is rejected during a provider outage', async () => {
 const modulePath = 'src/features/alerts/services/alertService.js';
 cache.delete(path.resolve(modulePath));
 const fresh = load(modulePath);
 const snapshot = fresh.normalizeAlertFeed(feedFixture(), Date.now());
 snapshot.alerts[0].url = 'https://user:password@radarmeteorologico.com.br/alertas/pe/123';
 data.set('floody_official_alerts_v1', JSON.stringify(snapshot));
 const originalFetch = globalThis.fetch;
 globalThis.fetch = async () => new Response(null, { status: 503 });
 try {
  const result = await fresh.getAlertFeed();
  assert.equal(result.snapshot, null);
  assert.match(result.error, /indisponível/);
 } finally { globalThis.fetch = originalFetch; }
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
