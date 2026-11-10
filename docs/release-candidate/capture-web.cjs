// Run from Floody/ against the local Expo web server.
// Requires Playwright and an installed browser, with optional module and executable overrides.
const { chromium } = require(process.env.FLOODY_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const url = new URL(process.env.FLOODY_WEB_URL || 'http://localhost:18551').origin;

async function capture() {
 const browser = await chromium.launch({ executablePath: process.env.FLOODY_BROWSER_EXECUTABLE });
 try {
  const fs=require('node:fs'),path=require('node:path');
  const dir=path.resolve(process.env.FLOODY_SCREENSHOT_DIR || '../docs/release-candidate/screenshots');
  fs.mkdirSync(dir,{recursive:true});
  const fixedTime=Date.parse('2026-11-09T21:45:00Z');
  const {execFileSync}=require('node:child_process');
  const liveUrl='https://router.project-osrm.org/route/v1/driving/-34.8813,-8.05428;-34.8711,-8.0631?overview=full&geometries=geojson';
  const livePayload=JSON.parse(execFileSync('curl.exe',['-fsSL','--max-time','18',liveUrl],{encoding:'utf8'}));
  assert.equal(livePayload.code,'Ok');
  console.log('Live OSRM response',livePayload.routes[0].geometry.coordinates.length,'points');
  for(const [platform,width,height,theme] of [['desktop',1440,900,'light'],['mobile',390,844,'dark']]){
    if(process.env.RC_CAPTURE_PLATFORM && process.env.RC_CAPTURE_PLATFORM!==platform)continue;
    const platformDir=path.join(dir,platform+'-web');
    fs.mkdirSync(platformDir,{recursive:true});
    const context=await browser.newContext({viewport:{width,height},permissions:['geolocation'],geolocation:{latitude:-8.05428,longitude:-34.8813}});
    try{
      const page=await context.newPage();await page.clock.setFixedTime(fixedTime+180000);
      page.setDefaultTimeout(15000);
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      let routeCalls=0,weatherCalls=[],satelliteBlocked=false;
      await context.route('**/*', async r=>{
        const u=new URL(r.request().url());
        if(u.origin===url || u.hostname==='tile.openstreetmap.org')return r.continue();
        const json=body=>r.fulfill({json:body,headers:{'access-control-allow-origin':'*'}});
        if(u.hostname==='api.open-meteo.com'){weatherCalls.push([u.searchParams.get('latitude'),u.searchParams.get('longitude')]);return json({current_units:{precipitation:'mm',time:'unixtime',interval:'seconds'},current:{precipitation:1.2,time:fixedTime/1000,interval:900}});}
        if(u.hostname==='radarmeteorologico.com.br')return json({alertas:[]});
        if(u.hostname==='router.project-osrm.org'){routeCalls++;return json(livePayload);}
        if(u.hostname==='server.arcgisonline.com'){satelliteBlocked=true;return r.abort();}
        if(u.hostname==='api.geoapify.com'){
          const q=u.searchParams.get('text');
          const label=u.pathname.endsWith('/reverse')?'Marco Zero (teste)':q==='Marco Zero, Recife'?q:null;
          return json({type:'FeatureCollection',features:label?[{
            type:'Feature',geometry:{type:'Point',coordinates:[-34.8711,-8.0631]},properties:{formatted:label},
          }]:[]});
        }
        if(u.hostname==='parallelum.com.br'){
          if(u.pathname.endsWith('/marcas'))return json([{nome:'Fiat',codigo:'21'},{nome:'Volkswagen',codigo:'59'}]);
          if(u.pathname.includes('/21/'))return json({modelos:[{nome:'Uno Mille Fire 1.0',codigo:1234}]});
          return json({modelos:[{nome:'Gol 1.0',codigo:1235}]});
        }
        return r.abort();
      });
      const button=name=>page.getByRole('button',{name,exact:true});
      const shot=async (screen,{fullPage=false}={})=>{
        assert(await page.evaluate(async()=>{await document.fonts.ready;return [...document.fonts].some(font=>font.family.includes('Google Sans Flex')&&font.status==='loaded');}));
        if(fullPage && platform==='mobile'){
          // Position the real sticky bar at the end of the document for the full-page capture.
          await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
        }
        await page.screenshot({
          path:path.join(platformDir,screen+'-'+theme+'-demo.png'),
          animations:'disabled',fullPage,
          // The fixed skip link is normally outside the viewport unless focused.
          style:fullPage ? '.skip-link:not(:focus) { visibility: hidden; }' : undefined,
        });
      };
      const top=()=>page.evaluate(()=>window.scrollTo(0,0));
      const reach=async target=>{
        await top();
        await page.mouse.move(width-3,Math.floor(height/2));
        const exposed=()=>target.evaluate(e=>{const r=e.getBoundingClientRect();const nav=document.querySelector('.app-nav');const bottom=nav&&getComputedStyle(nav).bottom!=='auto'?nav.getBoundingClientRect().top:innerHeight;return r.top>=0&&r.bottom<=bottom+1;});
        for(let i=0;i<10&&!await exposed();i++){await page.mouse.wheel(0,260);await page.waitForTimeout(110);}
        assert(await exposed(),'Unreachable: '+await target.textContent());
      };
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
      const toggle=button('Ativar tema '+(theme==='light'?'claro':'escuro'));
      if(await toggle.isVisible())await toggle.click();
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
      const guest=button('Continuar no modo local');
      await reach(guest);await shot('01-entrada');await guest.click();
      await page.locator('.weather-reading time').waitFor();
      await reach(page.getByRole('textbox',{name:'Filtrar ocorrências'}));
      const grid=page.getByRole('group',{name:'Selecionar local de Recife'});
      const order=await grid.getByRole('button').allTextContents();
      await grid.getByRole('button',{name:'Boa Viagem'}).press('Enter');
      await page.locator('.weather-reading').getByText('Boa Viagem',{exact:true}).waitFor();
      await page.locator('.weather-reading time').waitFor();
      assert.deepEqual(weatherCalls.at(-1),['-8.1191','-34.8964']);
      assert.deepEqual(await grid.getByRole('button').allTextContents(),order);
      assert.equal(await grid.getByRole('button',{name:'Boa Viagem'}).getAttribute('aria-pressed'),'true');
      await top();await shot('02-painel-avisos-e-precipitacao',{fullPage:true});
      await button('Mapa').click();await top();
      const planner=button('Planejar rota');
      if(await planner.getAttribute('aria-expanded')==='false')await planner.click();
      await reach(button('Calcular rota'));
      const destination=page.getByLabel('Endereço de destino');
      await destination.fill('Marco Zero, Recife');
      await button('Calcular rota').click();
      const line=page.locator('.floody-route-line');
      await line.waitFor();
      assert((await line.boundingBox()).width>20);
      assert.equal(routeCalls,1);
      await page.locator('.leaflet-tile-loaded').first().waitFor();
      await page.waitForFunction(()=>[...document.querySelectorAll('.leaflet-tile')].every(tile=>tile.classList.contains('leaflet-tile-loaded')),{}, {timeout:6500}).catch(()=>{});
      await page.getByRole('heading',{name:'Rota calculada'}).waitFor();
      await top();await shot('03-mapa-e-planejador',{fullPage:true});
      await destination.fill('Endereço inválido');
      await button('Calcular rota').click();
      await page.getByText(/Informe uma origem e um destino válidos/).waitFor();
      assert.equal(await line.count(),0);
      // Test satellite fallback separately without including it in demo screenshots.
      if(platform==='desktop'){
        await button('Satélite').click();
        await page.getByText('Satélite indisponível. Exibindo mapa de ruas.').waitFor();
        await page.waitForFunction(()=>document.querySelector('.leaflet-tile-loaded')?.src.includes('tile.openstreetmap.org'));
        assert(satelliteBlocked);
        assert.equal(await button('Satélite').getAttribute('aria-pressed'),'false');
        assert.equal(await button('Ruas').getAttribute('aria-pressed'),'true');
        console.log('Verified satellite fallback selects Ruas and announces the fallback');
      }
      await button('Relatar').click();
      const save=button('Salvar relato local');
      await reach(save);assert(await save.isDisabled());
      await button('Usar minha localização').click();
      await page.getByText('Posição obtida para este relato.').waitFor();
      await page.getByLabel('Descrição').fill('TESTE DE APRESENTAÇÃO. Registro fictício, sem ocorrência observada.');
      await reach(save);
      await top();await shot('04-formulario-de-relato',{fullPage:true});
      await save.click();
      await page.getByRole('heading',{name:'Relato salvo neste dispositivo'}).waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('floody_reports'))[0].status),'Pendente');
      await button('Voltar ao painel').click();
      const pending=page.locator('.report-row').filter({hasText:'Marco Zero (teste)'});
      await pending.getByText(/Pendente/).waitFor();
      await pending.locator('.report-disclosure').click();
      assert(await pending.getByText(/TESTE DE APRESENTAÇÃO/).isVisible());
      await button('Mapa').click();
      assert.equal(await page.locator('.floody-report-marker').count(),0);
      await button('Garagem').click();
      await reach(button('Salvar veículo'));
      await page.getByLabel('Marca',{exact:true}).selectOption('21');
      await page.getByLabel('Modelo',{exact:true}).selectOption('Uno Mille Fire 1.0');
      await page.getByLabel('Vão livre do solo (cm)').fill('17');
      await button('Salvar veículo').click();
      const vehicle=page.locator('.vehicle-row').filter({hasText:'Fiat - Uno Mille Fire 1.0'});
      await vehicle.waitFor();await reach(vehicle);await top();await shot('05-garagem-veiculo-salvo',{fullPage:true});
      await page.reload({waitUntil:'domcontentloaded'});await guest.click();await button('Garagem').click();await vehicle.waitFor();
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('floody_reports')).length),1);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.deepEqual(errors,[]);
      if(platform==='desktop'){
        const other=await context.newPage();
        try {
          await other.goto(url,{waitUntil:'domcontentloaded'});
          await other.getByRole('button',{name:'Continuar no modo local'}).click();
          async function prepare(target, description){
            await target.getByRole('button',{name:'Relatar',exact:true}).click();
            await target.getByRole('button',{name:'Usar minha localização'}).click();
            await target.getByText('Posição obtida para este relato.').waitFor();
            await target.getByLabel('Descrição').fill(description);
          }
          await Promise.all([prepare(page,'Teste concorrente A'),prepare(other,'Teste concorrente B')]);
          await Promise.all([page,other].map(async target=>{
            await target.getByRole('button',{name:'Salvar relato local'}).click();
            await target.getByRole('heading',{name:'Relato salvo neste dispositivo'}).waitFor();
          }));
          const descriptions=await page.evaluate(()=>JSON.parse(localStorage.getItem('floody_reports')).map(r=>r.description));
          assert.equal(descriptions.length,3);
          assert(descriptions.includes('Teste concorrente A')&&descriptions.includes('Teste concorrente B'));
          console.log('Verified concurrent local report saves across two browser tabs');
        } finally {await other.close();}
      }
      console.log(platform,theme,'guest/nav/scroll/keyboard/weather/route/report/garage/reload verified');
    }finally{await context.close();}
  }
  console.log('Captured application screenshots in',dir);
 } finally {
  await browser.close();
 }
}

capture().catch(error => { console.error(error); process.exitCode = 1; });
