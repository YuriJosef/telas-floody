import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { env } from '../../../config/env';
import { buildMapDocument, serializeMapState } from '../services/mapDocument';

export default function OpenStreetMap({ center, origin, destination, route = [] }) {
  const webview = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const source = useMemo(() => ({ html: buildMapDocument(center, env.mapTilesLight) }), [center]);
  const state = serializeMapState({ center, origin, destination, route });
  useEffect(() => {
    if (ready) webview.current?.injectJavaScript(`window.updateFloodyMap(${state});true;`);
  }, [ready, state, revision]);
  function onNavigation(request) {
    if (request.url === 'about:blank') return true;
    if (request.url === 'https://www.openstreetmap.org/copyright') Linking.openURL(request.url).catch(() => setError('Não foi possível abrir os créditos do mapa.'));
    return false;
  }
  return <View style={styles.fill}><WebView ref={webview} source={source} originWhitelist={['*']} onShouldStartLoadWithRequest={onNavigation} applicationNameForUserAgent="Floody/1.0" javaScriptEnabled domStorageEnabled={false} mixedContentMode="never" allowFileAccess={false} setSupportMultipleWindows={false} onLoadStart={() => setReady(false)} onError={() => setError('Não foi possível carregar o mapa.')} onMessage={event => {
    if (event.nativeEvent.data === '{"type":"ready"}') { setReady(true); setError(''); setRevision(value => value + 1); }
  }} style={styles.fill} />{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}</View>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, error: { color: '#fff', backgroundColor: '#991b1b', padding: 10 } });
