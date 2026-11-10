export function createGeocodingRateGate(now = Date.now) {
  let recent = [];
  let blockedUntil = 0;
  return {
    claim() {
      const time = now();
      recent = recent.filter(start => time - start < 1000);
      if (time < blockedUntil || recent.length >= 5) return false;
      recent.push(time);
      return true;
    },
    coolDown(retryAfter) {
      const time = now();
      const parsed = /^\d+$/.test(retryAfter ?? '') ? time + Number(retryAfter) * 1000 : Date.parse(retryAfter);
      blockedUntil = Math.max(blockedUntil, Number.isFinite(parsed) && parsed > time ? parsed : time + 30000);
    },
  };
}
