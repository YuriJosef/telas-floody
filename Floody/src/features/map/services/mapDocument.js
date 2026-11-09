import { leafletJavaScript, leafletCss } from '../vendor/leafletBundle';

export const OPEN_MAP_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export function mapCoordinates(value) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite) || Math.abs(value[0]) > 90 || Math.abs(value[1]) > 180) throw new Error('Coordenadas inválidas para o mapa.');
  return value;
}
export function serializeMapState({ center, origin = null, destination = null, route = [] }) {
  if (!Array.isArray(route) || route.length > 50000) throw new Error('Traçado inválido para o mapa.');
  return JSON.stringify({ center: mapCoordinates(center), origin: origin ? mapCoordinates(origin) : null, destination: destination ? mapCoordinates(destination) : null, route: route.map(mapCoordinates) }).replace(/</g, '\\u003c');
}
export function buildMapDocument(center, tileUrl = OPEN_MAP_TILES) {
  const url = new URL(tileUrl.replace('{s}', 'a').replace('{z}', '0').replace('{x}', '0').replace('{y}', '0'));
  if (url.protocol !== 'https:') throw new Error('O mapa exige um provedor HTTPS.');
  const initial = serializeMapState({ center });
  const tiles = JSON.stringify(tileUrl).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https: data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><style>${leafletCss}\nhtml,body,#map{margin:0;width:100%;height:100%;background:#e2e8f0}#status{position:absolute;top:8px;left:50px;right:8px;z-index:1000;padding:8px;background:#fff;color:#0f172a;font:14px sans-serif;border-radius:6px}#status:empty{display:none}.leaflet-control-attribution{font-size:10px}</style></head><body><div id="map" role="application" aria-label="Mapa OpenStreetMap"></div><div id="status" role="status"></div><script>${leafletJavaScript.replace(/<\/script/gi, '<\\/script')}</script><script>
(function(){
  var map=L.map('map',{zoomControl:true}).setView(${JSON.stringify(mapCoordinates(center))},13);
  var group=L.layerGroup().addTo(map), cameraKey='';
  var tiles=L.tileLayer(${tiles},{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  tiles.on('tileerror',function(){document.getElementById('status').textContent='Mapa indisponível. Verifique sua conexão.';});
  tiles.on('tileload',function(){document.getElementById('status').textContent='';});
  window.updateFloodyMap=function(data){
    group.clearLayers();
    if(data.origin)L.circleMarker(data.origin,{radius:9,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1}).bindPopup('Origem').addTo(group);
    if(data.destination)L.circleMarker(data.destination,{radius:9,color:'#fff',weight:3,fillColor:'#dc2626',fillOpacity:1}).bindPopup('Destino').addTo(group);
    if(data.route.length)L.polyline(data.route,{color:'#2563eb',weight:5}).addTo(group);
    var key=JSON.stringify(data);
    if(key!==cameraKey){
      if(data.route.length)map.fitBounds(L.latLngBounds(data.route),{padding:[28,28],maxZoom:16});
      else map.setView(data.origin||data.center,data.origin?16:13);
      cameraKey=key;
    }
    map.invalidateSize();
  };
  window.addEventListener('resize',function(){map.invalidateSize();});
  window.updateFloodyMap(${initial});
  if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
})();
</script></body></html>`;
}
