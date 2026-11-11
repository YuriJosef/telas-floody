import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Field, useNativeTheme } from '../../../components/native/ui';
import { hasAddressQuery, normalizeAddressQuery, searchAddresses } from '../services/geocodingService';

// Native counterpart of AddressAutocomplete.web.js: same service, debounce (600 ms), 30 s cache and
// cancellation of superseded requests. Suggestions render inline below the field.
export default function AddressAutocomplete({ label, value, onChangeText, onSelect, selected, editable = true, ...fieldProps }) {
  const { colors, styles } = useNativeTheme();
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState(null);
  const revision = useRef(0);
  const recent = useRef(null);
  const query = normalizeAddressQuery(value ?? '');
  const enabled = focused && editable && !selected && hasAddressQuery(query);
  const current = enabled && result?.query === query ? result : null;

  useEffect(() => {
    if (!enabled) return undefined;
    const request = ++revision.current;
    const controller = new AbortController();
    const cache = recent.current;
    if (cache?.query === query && Date.now() - cache.receivedAt < 30000) { setResult(cache); return undefined; }
    setResult(null);
    const timer = setTimeout(async () => {
      try {
        const matches = await searchAddresses(query, controller.signal);
        if (controller.signal.aborted || revision.current !== request) return;
        const next = { query, matches, receivedAt: Date.now() };
        recent.current = next;
        setResult(next);
      } catch (error) {
        if (!controller.signal.aborted && revision.current === request) setResult({ query, matches: [], error: error.message });
      }
    }, 600);
    return () => { revision.current++; clearTimeout(timer); controller.abort(); };
  }, [enabled, query]);

  function choose(match) {
    setFocused(false);
    onSelect?.(match);
  }

  return <View>
    <Field label={label} value={value} editable={editable} onChangeText={onChangeText}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoCorrect={false} {...fieldProps} />
    {enabled && <View accessibilityLiveRegion="polite" style={{ gap: 2, marginTop: 4 }}>
      {!current ? <Text style={styles.muted}>Buscando endereços…</Text>
        : current.error ? <Text accessibilityRole="alert" style={styles.muted}>{current.error}</Text>
        : !current.matches.length ? <Text style={styles.muted}>Nenhum endereço encontrado. Informe rua e cidade.</Text>
        : current.matches.map((match, index) => <Pressable key={match.id || `${match.lat},${match.lon},${index}`}
          accessibilityRole="button" accessibilityLabel={`Usar endereço: ${match.display_name}`} onPress={() => choose(match)}
          style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
            backgroundColor: pressed ? colors.rain : colors.surface })}>
          <Text style={styles.text} numberOfLines={2}>{match.display_name}</Text>
        </Pressable>)}
    </View>}
  </View>;
}
