(() => {
  const decodePayload = () => {
    const encoded = new URLSearchParams(location.search).get('payload') || '';
    try {
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0))) || '{}');
    } catch (_) {
      return {};
    }
  };
  const payload = decodePayload();
  const event = payload.event || {};
  const groupId = payload.groupId || '';
  const live = { data: null, feedId: '' };
  const name = document.getElementById('match-name');
  if (name) name.textContent = event.name || 'Partida atual';

  document.querySelectorAll('[data-widget]').forEach(button => {
    button.addEventListener('click', async () => {
      const type = button.dataset.widget;
      const result = await window.traderWRadarRealMod?.openWidget?.({ groupId, type, event });
      if (result?.ok) button.classList.add('active');
    });
  });

  const splitTeams = () => {
    const parts = String(event.name || '').split(/\s+v(?:s\.?)?\s+|\s+x\s+/i);
    return {
      home: event?.i?.b || event?.homeTeam?.name || parts[0] || 'Mandante',
      away: event?.j?.b || event?.awayTeam?.name || parts.slice(1).join(' x ') || 'Visitante'
    };
  };
  const scoreFrom = source => ({
    home: Number.isFinite(source?.score?.home) ? source.score.home : Number(event?.homeScore?.current ?? event?.homeScore ?? 0) || 0,
    away: Number.isFinite(source?.score?.away) ? source.score.away : Number(event?.awayScore?.current ?? event?.awayScore ?? 0) || 0
  });
  const periodFromClock = value => {
    const text = String(value || '').toLowerCase();
    if (/interval|half\s*time/.test(text)) return 'interval';
    if (/2\s*[º°oª]?\s*t|second/.test(text)) return 'second';
    const minute = Number((text.match(/\d+/) || [0])[0]);
    return minute > 45 ? 'second' : 'first';
  };
  const openOddsMarket = async mode => {
    const teams = splitTeams();
    const clock = live.data?.clock || event.minute || '';
    await window.traderPublicOdds?.openOverlay?.({
      home: teams.home,
      away: teams.away,
      title: event.name || '',
      viewMode: mode || 'mo',
      period: periodFromClock(clock),
      clock,
      score: scoreFrom(live.data)
    });
  };
  document.getElementById('bet365')?.addEventListener('click', () => {
    window.traderWRadarRealMod?.showWidgetOddsMenu?.();
  });
  document.getElementById('group-menu')?.addEventListener('click', () => {
    window.traderWRadarRealMod?.showWidgetManagerMenu?.();
  });
  window.traderWRadarRealMod?.onWidgetOddsAction?.(({ mode }) => openOddsMarket(mode));

  window.traderWRadarRealMod?.onUpdate?.(update => {
    if (update?.feedId === live.feedId && update.data) live.data = update.data;
  });
  window.traderWRadarRealMod?.startFeed?.({ eventId: event.id, title: event.name || '', locale: 'pt-pt' })
    .then(result => { live.feedId = result?.feedId || ''; })
    .catch(() => {});

  document.getElementById('close-all')?.addEventListener('click', () => {
    window.traderWRadarRealMod?.closeWidgets?.({ groupId });
  });

  window.traderWRadarRealMod?.onWidgetsChanged?.(({ type, open }) => {
    const button = document.querySelector(`[data-widget="${String(type || '')}"]`);
    if (button) button.classList.toggle('active', !!open);
  });
})();
