import { useCallback, useEffect, useRef, useState } from 'react';
import { listMyReports, subscribeToReports, withdrawReport } from '../services/reportService';

// The signed-in author's reports and the withdraw flow (confirm → pending → success/error).
// Shared by web and native. Disabled for guests, who have no reports of their own.
export function useMyReports(user) {
  const enabled = Boolean(user && !user.guest);
  const userId = enabled ? user.id : null;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const pendingRef = useRef(null);

  useEffect(() => {
    setReports([]); setError(''); setNotice(''); setConfirmingId(null);
    if (!userId) { setLoading(false); return undefined; }
    let active = true;
    setLoading(true);
    let latest = 0; // Only the newest load may update the list.
    const load = () => {
      const request = ++latest;
      return listMyReports(userId)
        .then(data => { if (active && request === latest) { setReports(data); setError(''); } })
        .catch(err => { if (active && request === latest) setError(err.message); })
        .finally(() => { if (active && request === latest) setLoading(false); });
    };
    load();
    const unsubscribe = subscribeToReports(load);
    return () => { active = false; unsubscribe(); };
  }, [userId]);

  const requestWithdraw = useCallback(id => {
    if (pendingRef.current) return;
    setConfirmingId(id); setError(''); setNotice('');
  }, []);
  const cancelWithdraw = useCallback(() => { if (!pendingRef.current) setConfirmingId(null); }, []);

  const confirmWithdraw = useCallback(async id => {
    if (pendingRef.current) return; // One withdrawal at a time; repeated taps are ignored.
    pendingRef.current = id;
    setPendingId(id); setError(''); setNotice('');
    try {
      await withdrawReport(id);
      setReports(list => list.map(report => report.id === id ? { ...report, status: 'withdrawn', withdrawable: false } : report));
      setNotice('Relato retirado. Ele não aparece mais para outros usuários.');
      setConfirmingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      pendingRef.current = null;
      setPendingId(null);
    }
  }, []);

  return { enabled, reports, loading, error, notice, confirmingId, pendingId, requestWithdraw, cancelWithdraw, confirmWithdraw,
    dismissError: () => setError(''), dismissNotice: () => setNotice('') };
}
