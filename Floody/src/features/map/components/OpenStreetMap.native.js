import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { env } from '../../../config/env';
import { buildMapDocument, serializeMapState } from '../services/mapDocument';
import { CARTO_CREDITS_URL, IMAGERY_CREDITS_URL, MAP_CREDITS_URL, OPEN_MAP_TILES, tileSource } from '../services/tileSource';

export default function OpenStreetMap({ center, origin, destination, route = [], markers, satellite = false, onTileError }) {
  const webview = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const tileUrl = tileSource(satellite ? env.mapTilesSatellite : env.mapTilesLight)?.url || OPEN_MAP_TILES;
  const source = useMemo(() => ({ html: buildMapDocument(center, tileUrl) }), [center, tileUrl]);
  const state = serializeMapState({ center, origin, destination, route, markers });
  useEffect(() => {
    if (ready) webview.current?.injectJavaScript(`window.updateFloodyMap(${state});true;`);
  }, [ready, state, revision]);
  function onNavigation(request) {
    if (request.url === 'about:blank') return true;
    if ([MAP_CREDITS_URL, IMAGERY_CREDITS_URL, CARTO_CREDITS_URL].includes(request.url)) {
      Linking.openURL(request.url).catch(() => setError('Não foi possível abrir os créditos do mapa.'));
    }
    return false;
  }
  return <View style={styles.fill}><WebView ref={webview} source={source} originWhitelist={['*']} onShouldStartLoadWithRequest={onNavigation} applicationNameForUserAgent="Floody/1.0" javaScriptEnabled domStorageEnabled={false} mixedContentMode="never" allowFileAccess={false} setSupportMultipleWindows={false} onLoadStart={() => setReady(false)} onError={() => setError('Não foi possível carregar o mapa.')} onMessage={event => {
    if (event.nativeEvent.data === '{"type":"ready"}') { setReady(true); setError(''); setRevision(value => value + 1); }
    if (event.nativeEvent.data === '{"type":"tile-error"}') onTileError?.();
  }} style={styles.fill} />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, error: { color: '#fff', backgroundColor: '#991b1b', padding: 10 } });
