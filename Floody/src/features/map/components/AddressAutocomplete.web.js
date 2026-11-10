import { useEffect, useId, useRef, useState } from 'react';
import { hasAddressQuery, normalizeAddressQuery, searchAddresses } from '../services/geocodingService';

export function GeoapifyAttribution() {
  return <p className="caption">Endereços por <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a> · <a href="https://openaddresses.io/" target="_blank" rel="noreferrer">OpenAddresses</a></p>;
}

export default function AddressAutocomplete({ label, inputLabel, value, onChange, onSelect, placeholder, selected, readOnly }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const revision = useRef(0);
  const recent = useRef(null);
  const blurTimer = useRef(null);
  const query = normalizeAddressQuery(value);
  const enabled = open && !selected && !readOnly && hasAddressQuery(query);
  const current = enabled && result?.query === query ? result : null;
  const matches = current?.matches ?? [];
  const activeOption = matches[activeIndex] ? `${listId}-${activeIndex}` : undefined;

  useEffect(() => {
    if (!enabled) return;
    const request = ++revision.current;
    const controller = new AbortController();
    const cache = recent.current;
    if (cache?.query === query && Date.now() - cache.receivedAt < 30000) {
      setResult(cache);
      return;
    }
    setResult(null);
    const timer = setTimeout(async () => {
      try {
        const matches = await searchAddresses(query, controller.signal);
        if (controller.signal.aborted || revision.current !== request) return;
        const next = { query, matches, receivedAt: Date.now() };
        recent.current = next;
        setResult(next);
      } catch (error) {
        if (!controller.signal.aborted && revision.current === request) {
          setResult({ query, error: error.message });
        }
      }
    }, 600);
    return () => {
      revision.current++;
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, query]);

  useEffect(() => {
    if (activeOption) document.getElementById(activeOption)?.scrollIntoView({ block: 'nearest' });
  }, [activeOption]);

  useEffect(() => () => clearTimeout(blurTimer.current), []);

  function close() {
    clearTimeout(blurTimer.current);
    setOpen(false);
    setActiveIndex(-1);
  }

  function select(address) {
    close();
    onSelect(address);
  }

  function onKeyDown(event) {
    if (event.nativeEvent.isComposing || readOnly) return;
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      close();
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length) {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex(index => index < 0 ? (step > 0 ? 0 : matches.length - 1) : (index + step + matches.length) % matches.length);
    } else if (event.key === 'ArrowDown' && !open) {
      setOpen(true);
    } else if (event.key === 'Enter') {
      if (matches[activeIndex]) {
        event.preventDefault();
        select(matches[activeIndex]);
      } else {
        close();
      }
    }
  }

  return <div className="stack address-field">
    <label className="input-group">{label}
      <input role="combobox" aria-label={inputLabel} aria-autocomplete="list"
        aria-expanded={matches.length > 0} aria-controls={matches.length ? listId : undefined}
        aria-activedescendant={activeOption} autoComplete="off" placeholder={placeholder} value={value} readOnly={readOnly}
        onFocus={() => { clearTimeout(blurTimer.current); setOpen(true); }}
        onBlur={event => {
          // Keep an inline list from moving a form button between pointer-down and click.
          if (event.relatedTarget?.tagName === 'BUTTON') blurTimer.current = setTimeout(close, 200);
          else close();
        }}
        onKeyDown={onKeyDown}
        onChange={event => { setActiveIndex(-1); setOpen(true); onChange(event.target.value); }} />
    </label>
    {matches.length > 0 && <div className="suggestions-dropdown" id={listId} role="listbox" aria-label={`Sugestões: ${inputLabel}`}>
      {matches.map((address, index) => <button type="button" role="option" tabIndex={-1}
        className="suggestion-item" id={`${listId}-${index}`} aria-selected={activeIndex === index}
        key={`${address.id || address.display_name}-${index}`}
        onMouseDown={event => event.preventDefault()} onClick={() => select(address)}>{address.display_name}</button>)}
    </div>}
    {current?.error && <p className="caption" role="status">{current.error}</p>}
    {current?.matches?.length === 0 && <p className="caption" role="status">Nenhum endereço encontrado. Inclua o bairro ou a cidade.</p>}
  </div>;
}
