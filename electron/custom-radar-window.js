(() => {
  const state = {
    payload: {},
    event: null,
    feedId: '',
    realData: null,
    error: '',
    theme: localStorage.getItem('custom_wradar_mod_theme') || 'dark',
    density: localStorage.getItem('custom_wradar_mod_density') || 'wide',
    radarLayout: localStorage.getItem('custom_wradar_mod_layout') === 'ticker' ? 'ticker' : 'standard',
    cleanOverlay: true,
    overlayReplica: false,
    showOdds: localStorage.getItem('custom_wradar_mod_show_odds') !== '0',
    showMeta: localStorage.getItem('custom_wradar_mod_show_meta') !== '0',
    showIconGallery: localStorage.getItem('custom_wradar_mod_show_icon_gallery') === '1',
    personalizationTab: localStorage.getItem('custom_wradar_mod_personalization_tab') || 'profiles',
    visualProfile: localStorage.getItem('custom_wradar_mod_visual_profile') || 'custom',
    radarIconScale: Number(localStorage.getItem('custom_wradar_mod_radar_icon_scale') || localStorage.getItem('custom_wradar_mod_icon_scale')) || 1,
    pressureIconScale: Number(localStorage.getItem('custom_wradar_mod_pressure_icon_scale') || localStorage.getItem('custom_wradar_mod_icon_scale')) || 1,
    componentSettings: (() => {
      try {
        return JSON.parse(localStorage.getItem('custom_wradar_mod_component_settings') || '{}') || {};
      } catch (_) {
        return {};
      }
    })(),
    colorSettings: (() => {
      try {
        return JSON.parse(localStorage.getItem('custom_wradar_mod_color_settings') || '{}') || {};
      } catch (_) {
        return {};
      }
    })(),
    alertSettings: (() => {
      try {
        return JSON.parse(localStorage.getItem('custom_wradar_mod_alert_settings') || '{}') || {};
      } catch (_) {
        return {};
      }
    })(),
    alertRuntime: { signature: '', firedAt: {}, visualUntil: 0, message: '' },
    colorPickerActive: false,
    showAutoSummary: localStorage.getItem('custom_wradar_mod_show_auto_summary') !== '0',
    showLiveIntelligence: localStorage.getItem('custom_wradar_mod_show_live_intelligence') !== '0',
    intelligenceSettings: (() => {
      try {
        return JSON.parse(localStorage.getItem('custom_wradar_mod_intelligence_settings') || '{}') || {};
      } catch (_) {
        return {};
      }
    })(),
    customIconMap: (() => {
      try {
        return JSON.parse(localStorage.getItem('custom_wradar_mod_icon_map') || '{}') || {};
      } catch (_) {
        return {};
      }
    })(),
    showPressureChart: localStorage.getItem('custom_wradar_mod_show_pressure_chart') === '1',
    showRadarPressureChart: localStorage.getItem('custom_wradar_mod_show_radar_pressure_chart') === '1',
    sofascoreGraphPoints: [],
    sofascoreGraphFetchedAt: 0,
    sofascoreGraphError: '',
    sofascoreGraphFetchPromise: null,
    sofascoreGraphTimer: null,
    sofascorePlayerEvents: [],
    sofascorePlayerEventsFetchedAt: 0,
    sofascorePlayerEventsFetchPromise: null,
    sofascorePlayerEventsTimer: null,
    heatmapMode: localStorage.getItem('custom_wradar_mod_heatmap_mode') || (localStorage.getItem('custom_wradar_mod_show_heatmap') === '1' ? 'match' : 'off'),
    heatmapStyle: localStorage.getItem('custom_wradar_mod_heatmap_style') || 'candles',
    heatmapMenuOpen: false,
    oddsMenuOpen: false,
    oddsMenuAnchor: '',
    toolbarCollapsed: localStorage.getItem('custom_wradar_mod_toolbar_collapsed') === '1',
    fontScale: Number(localStorage.getItem('custom_wradar_mod_font_scale')) || 1,
    fontMenuOpen: false,
    fontMenuX: 0,
    fontMenuY: 0,
    activeFontSubmenu: 'font',
    overlayDim: 0,
    overlayOpacity: Number(localStorage.getItem('custom_wradar_mod_overlay_opacity')) || 1,
    overlayContentMode: localStorage.getItem('custom_wradar_mod_overlay_content_mode') || 'full',
    overlayAlwaysOnTop: true,
    layoutEditMode: false,
    cardLayout: (() => {
      try {
        return JSON.parse(localStorage.getItem('custom_wradar_mod_card_layout') || '{}') || {};
      } catch (_) {
        return {};
      }
    })(),
    fontMenuOpensLeft: false,
    pinnedKey: '',
    pinnedIndex: null,
    lastSignature: '',
    interactingUntil: 0,
    deferredTimer: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
  const radarIconSrc = fileName => encodeURI(`../icones radar mod/${fileName}`);
  const defaultRadarIconMap = {
    attack: { name: 'attack.png', src: radarIconSrc('attack.png') },
    'blocked-shot': { name: 'blocked-shot.png', src: radarIconSrc('blocked-shot.png') },
    corner: { name: 'corner.png', src: radarIconSrc('corner.png') },
    dangerous: { name: 'dangerous.png', src: radarIconSrc('dangerous.png') },
    defense: { name: 'defense.png', src: radarIconSrc('defense.png') },
    foul: { name: 'foul.png', src: radarIconSrc('foul.png') },
    'full-time': { name: 'full-time.png', src: radarIconSrc('full-time.png') },
    'goal-kick': { name: 'goal-kick.png', src: radarIconSrc('goal-kick.png') },
    goal: { name: 'goal.png', src: radarIconSrc('goal.png') },
    'kick-off': { name: 'kick-off.png', src: radarIconSrc('kick-off.png') },
    'shot-on-target': { name: 'shot-on-target.png', src: radarIconSrc('shot-on-target.png') },
    shot: { name: 'shot.png', src: radarIconSrc('shot.png') },
    substitution: { name: 'substitution.png', src: radarIconSrc('substitution.png') },
    'throw-in': { name: 'throw-in.png', src: radarIconSrc('throw-in.png') },
    woodwork: { name: 'woodwork.png', src: radarIconSrc('woodwork.png') }
  };
  const radarIconForType = type => state.customIconMap?.[type]?.src
    ? state.customIconMap[type]
    : defaultRadarIconMap[type];
  const saveCustomIconMap = () => {
    localStorage.setItem('custom_wradar_mod_icon_map', JSON.stringify(state.customIconMap || {}));
  };
  const defaultComponentSettings = {
    score: { scale: 1, opacity: 1 },
    events: { scale: 1, opacity: 1 },
    stats: { scale: 1, opacity: 1 },
    charts: { scale: 1, opacity: 1 },
    heatmap: { scale: 1, opacity: 1 }
  };
  const defaultColorSettings = {
    home: '#38bdf8', away: '#a78bfa', cold: '#22c55e', warm: '#facc15', hot: '#f97316', danger: '#ef4444'
  };
  const defaultAlertSettings = {
    enabled: false, sound: true, visual: true, notification: false,
    pressure: true, sequence: true, shots: true, redCard: true, goalChance: true
  };
  const defaultIntelligenceSettings = {
    balance: true, sequence: true, danger: true, dominance: true, comparison: true, sustained: true
  };
  const componentSetting = key => ({
    ...(defaultComponentSettings[key] || { scale: 1, opacity: 1 }),
    ...(state.componentSettings?.[key] || {})
  });
  const colorSetting = key => state.colorSettings?.[key] || defaultColorSettings[key];
  const alertSetting = key => state.alertSettings?.[key] ?? defaultAlertSettings[key];
  const intelligenceSetting = key => state.intelligenceSettings?.[key] ?? defaultIntelligenceSettings[key];
  const saveComponentSettings = () => localStorage.setItem('custom_wradar_mod_component_settings', JSON.stringify(state.componentSettings || {}));
  const saveColorSettings = () => localStorage.setItem('custom_wradar_mod_color_settings', JSON.stringify(state.colorSettings || {}));
  const saveAlertSettings = () => localStorage.setItem('custom_wradar_mod_alert_settings', JSON.stringify(state.alertSettings || {}));
  const saveIntelligenceSettings = () => localStorage.setItem('custom_wradar_mod_intelligence_settings', JSON.stringify(state.intelligenceSettings || {}));
  const clampComponentScale = value => Math.max(0.6, Math.min(1.5, Math.round((Number(value) || 1) * 20) / 20));
  const clampComponentOpacity = value => Math.max(0.2, Math.min(1, Math.round((Number(value) || 1) * 10) / 10));
  const clampIconScale = value => Math.max(0.7, Math.min(1.6, Math.round((Number(value) || 1) * 20) / 20));
  const setRadarIconScale = value => {
    state.radarIconScale = clampIconScale(value);
    localStorage.setItem('custom_wradar_mod_radar_icon_scale', String(state.radarIconScale));
  };
  const setPressureIconScale = value => {
    state.pressureIconScale = clampIconScale(value);
    localStorage.setItem('custom_wradar_mod_pressure_icon_scale', String(state.pressureIconScale));
  };
  const normalizeMatchText = value => String(value || '')
    .replace(/[øö]/gi, 'o').replace(/æ/gi, 'ae').replace(/œ/gi, 'oe').replace(/ł/gi, 'l')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const get365TeamLogoUrl = teamId => Number(teamId) ? `https://imagecache.365scores.com/image/upload/f_png,w_100,h_100,c_limit,q_auto:eco,dpr_2/v1/Competitors/${Number(teamId)}` : '';
  const getTeamInitials = name => String(name || '?').split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  const splitTeams = event => event?.i?.b && event?.j?.b
    ? { home: event.i.b, away: event.j.b }
    : (() => {
        const parts = String(event?.name || '').split(/\s+v(?:s\.?)?\s+/i);
        return { home: parts[0]?.trim() || 'Mandante', away: parts.slice(1).join(' v ').trim() || 'Visitante' };
      })();
  const normalizeScore = event => {
    const explicitHome = event?.homeTeamScore ?? event?.homeScore;
    const explicitAway = event?.awayTeamScore ?? event?.awayScore;
    if (explicitHome !== null && explicitHome !== undefined && explicitAway !== null && explicitAway !== undefined) {
      return { home: explicitHome, away: explicitAway };
    }
    const match = String(event?.score || '').match(/(\d+)\s*[-:x]\s*(\d+)/i);
    return match ? { home: Number(match[1]), away: Number(match[2]) } : { home: 0, away: 0 };
  };
  const teamAbbr = name => {
    const clean = String(name || '').replace(/\s+/g, ' ').trim();
    const tokens = clean.replace(/\b(fc|cf|sc|ac|ec|afc|club|de|do|da|the)\b/gi, ' ').trim().split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) return tokens.slice(0, 3).map(token => token[0]).join('').toUpperCase().slice(0, 3);
    return clean.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '---';
  };
  const clampFontScale = value => Math.max(0.35, Math.min(1.35, Math.round((Number(value) || 1) * 100) / 100));
  const setFontScale = value => {
    state.fontScale = clampFontScale(value);
    localStorage.setItem('custom_wradar_mod_font_scale', String(state.fontScale));
  };
  const clampOverlayDim = value => Math.max(0, Math.min(0.75, Math.round((Number(value) || 0) * 100) / 100));
  const setOverlayDim = value => {
    state.overlayDim = clampOverlayDim(value);
    localStorage.setItem('custom_wradar_mod_overlay_dim', String(state.overlayDim));
  };
  const clampOverlayOpacity = value => Math.max(0.2, Math.min(1, Math.round((Number(value) || 1) * 100) / 100));
  const setOverlayOpacity = value => {
    state.overlayOpacity = clampOverlayOpacity(value);
    localStorage.setItem('custom_wradar_mod_overlay_opacity', String(state.overlayOpacity));
  };
  const currentVisualProfile = () => ({
    fontScale: state.fontScale, overlayOpacity: state.overlayOpacity, content: state.overlayContentMode,
    pressure: state.showPressureChart, radarPressure: state.showRadarPressureChart,
    heatmapMode: state.heatmapMode, heatmapStyle: state.heatmapStyle,
    liveIntelligence: state.showLiveIntelligence,
    componentSettings: state.componentSettings
  });
  const applyVisualProfile = profile => {
    let config = visualProfilePresets[profile];
    if (profile === 'custom') {
      try { config = JSON.parse(localStorage.getItem('custom_wradar_mod_custom_profile') || '{}'); } catch (_) { config = {}; }
    }
    if (!config || !Object.keys(config).length) return;
    setFontScale(config.fontScale ?? state.fontScale);
    setOverlayOpacity(config.overlayOpacity ?? state.overlayOpacity);
    state.overlayContentMode = config.content || state.overlayContentMode;
    state.showPressureChart = config.pressure ?? state.showPressureChart;
    state.showRadarPressureChart = config.radarPressure ?? state.showRadarPressureChart;
    state.heatmapMode = config.heatmapMode || state.heatmapMode;
    state.heatmapStyle = config.heatmapStyle || state.heatmapStyle;
    state.showLiveIntelligence = config.liveIntelligence ?? state.showLiveIntelligence;
    if (config.componentSettings) state.componentSettings = config.componentSettings;
    localStorage.setItem('custom_wradar_mod_overlay_content_mode', state.overlayContentMode);
    localStorage.setItem('custom_wradar_mod_show_pressure_chart', state.showPressureChart ? '1' : '0');
    localStorage.setItem('custom_wradar_mod_show_radar_pressure_chart', state.showRadarPressureChart ? '1' : '0');
    localStorage.setItem('custom_wradar_mod_heatmap_mode', state.heatmapMode);
    localStorage.setItem('custom_wradar_mod_heatmap_style', state.heatmapStyle);
    localStorage.setItem('custom_wradar_mod_show_live_intelligence', state.showLiveIntelligence ? '1' : '0');
    saveComponentSettings();
    state.visualProfile = profile;
    localStorage.setItem('custom_wradar_mod_visual_profile', profile);
    if (state.showPressureChart) scheduleSofascorePressureGraph(true);
    if (state.showRadarPressureChart) scheduleSofascorePlayerEvents(true);
  };
  const defaultCardLayout = {
    radar: { order: 0, span: 12, height: 0 },
    stats: { order: 1, span: 12, height: 0 },
    summary: { order: 2, span: 5, height: 0 },
    sofascore: { order: 3, span: 12, height: 0 },
    'radar-pressure': { order: 4, span: 12, height: 0 },
    intelligence: { order: 5, span: 12, height: 0 },
    heatmap: { order: 6, span: 12, height: 0 },
    alerts: { order: 7, span: 12, height: 0 }
  };
  const cardLayoutFor = id => {
    const fallback = defaultCardLayout[id] || { order: 99, span: 12, height: 0 };
    const saved = state.cardLayout?.[id] || {};
    return {
      order: Number.isFinite(Number(saved.order)) ? Math.max(0, Math.round(Number(saved.order))) : fallback.order,
      span: Math.max(3, Math.min(12, Math.round(Number(saved.span) || fallback.span))),
      height: Math.max(0, Math.min(600, Math.round(Number(saved.height) || fallback.height)))
    };
  };
  const saveCardLayout = () => {
    localStorage.setItem('custom_wradar_mod_card_layout', JSON.stringify(state.cardLayout || {}));
  };
  const updateCardLayout = (id, patch) => {
    state.cardLayout = {
      ...(state.cardLayout || {}),
      [id]: { ...cardLayoutFor(id), ...(patch || {}) }
    };
    saveCardLayout();
  };
  const resetCardLayout = () => {
    state.cardLayout = {};
    localStorage.removeItem('custom_wradar_mod_card_layout');
  };
  if (state.cardLayout?.alerts && !state.cardLayout?.summary) {
    state.cardLayout = {
      ...state.cardLayout,
      summary: { ...state.cardLayout.alerts },
      alerts: { ...defaultCardLayout.alerts }
    };
    localStorage.setItem('custom_wradar_mod_card_layout', JSON.stringify(state.cardLayout));
  }
  const commentText = text => String(text || '').replace(/\s+/g, ' ').trim()
    .replace(/(Intervalo)(?:\s*Intervalo)+/gi, '$1')
    .replace(/(Half Time)(?:\s*Half Time)+/gi, '$1');
  const commentKey = item => item ? [item.minute || '', item.seconds || '', commentText(item.comment || item.all || '')].join('|') : '';
  const commentTime = item => {
    if (!item) return '';
    return item.minute || item.seconds ? `${item.minute || ''}${item.seconds || ''}` : (item.all?.match(/\d{1,3}'\d{0,2}/)?.[0] || '');
  };
  const parseGameSeconds = value => {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    const added = raw.match(/(\d{1,3})'\s*\+\s*(?:(\d{1,2})')?\s*(\d{1,2})?/);
    if (added) return ((Number(added[1]) || 0) * 60) + ((Number(added[2] || added[3]) || 0));
    const minuteSecond = raw.match(/(\d{1,3})'\s*(\d{1,2})/);
    if (minuteSecond) return ((Number(minuteSecond[1]) || 0) * 60) + (Number(minuteSecond[2]) || 0);
    const clock = raw.match(/(\d{1,3})\s*:\s*(\d{1,2})/);
    if (clock) return ((Number(clock[1]) || 0) * 60) + (Number(clock[2]) || 0);
    const minute = raw.match(/(\d{1,3})'/);
    return minute ? (Number(minute[1]) || 0) * 60 : null;
  };
  const formatClockFromSeconds = seconds => {
    const total = Math.max(0, Number(seconds) || 0);
    const minute = Math.floor(total / 60);
    const second = Math.floor(total % 60);
    return `${minute}'${String(second).padStart(2, '0')}''`;
  };
  const clockPeriodInfo = value => {
    const normalized = normalizeMatchText(value);
    if (normalized.includes('intervalo') || normalized.includes('half time')) return { paused: true, period: 'interval' };
    if (normalized.includes('2 t') || normalized.includes('2o t') || normalized.includes('2nd') || normalized.includes('second half')) return { paused: false, period: 'second' };
    return { paused: false, period: 'first' };
  };
  const getSofascoreEventId = () => Number(state.event?.sofascoreId || state.event?.sofaId || state.event?.sofascoreEventId || 0) || null;
  const fetchJson = async url => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: { accept: 'application/json,text/plain,*/*' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = JSON.parse(await response.text());
      if (typeof data?.contents === 'string') return JSON.parse(data.contents);
      return data;
    } finally {
      clearTimeout(timer);
    }
  };
  const fetchSofascoreJson = async path => {
    const endpoints = [
      'https://api.sofascore.com/api/v1',
      'https://www.sofascore.com/api/v1',
      'https://api.sofascore.app/api/v1'
    ];
    const urls = endpoints.map(base => `${base}${path}`);
    const attempts = [
      ...urls,
      ...urls.map(url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`),
      ...urls.map(url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`)
    ];
    let lastError = null;
    for (const url of attempts) {
      try {
        const data = await fetchJson(url);
        if (data && typeof data === 'object') return data;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Sofascore sem resposta.');
  };
  const fetchSofascorePressureGraph = async (force = false) => {
    const eventId = getSofascoreEventId();
    if (!eventId || !state.showPressureChart) return;
    if (!force && Date.now() - state.sofascoreGraphFetchedAt < 12000) return;
    if (state.sofascoreGraphFetchPromise) return state.sofascoreGraphFetchPromise;

    state.sofascoreGraphFetchPromise = (async () => {
      let points = [];
      if (window.traderSofascoreData?.momentum) {
        const result = await window.traderSofascoreData.momentum({ sofascoreId: eventId });
        if (result?.ok && Array.isArray(result.momentum)) {
          points = result.momentum;
        } else if (result?.error) {
          throw new Error(result.error);
        }
      } else {
        const data = await fetchSofascoreJson(`/event/${eventId}/graph`);
        points = Array.isArray(data?.graphPoints) ? data.graphPoints : [];
      }
      return points;
    })()
      .then(points => {
        state.sofascoreGraphPoints = points
          .map((point, index) => ({
            minute: Number(point.minute ?? index),
            value: Number(point.value ?? 0)
          }))
          .filter(point => Number.isFinite(point.minute) && Number.isFinite(point.value));
        state.sofascoreGraphFetchedAt = Date.now();
        state.sofascoreGraphError = '';
        scheduleRender();
      })
      .catch(error => {
        state.sofascoreGraphError = error?.message || 'Sofascore indisponivel.';
        state.sofascoreGraphFetchedAt = Date.now();
      })
      .finally(() => {
        state.sofascoreGraphFetchPromise = null;
      });
    return state.sofascoreGraphFetchPromise;
  };
  const scheduleSofascorePressureGraph = (immediate = false) => {
    clearTimeout(state.sofascoreGraphTimer);
    if (!state.showPressureChart || !getSofascoreEventId()) return;
    state.sofascoreGraphTimer = setTimeout(() => {
      fetchSofascorePressureGraph(true).finally(() => scheduleSofascorePressureGraph(false));
    }, immediate ? 0 : 15000);
  };
  const fetchSofascorePlayerEvents = async (force = false) => {
    const eventId = getSofascoreEventId();
    if (!eventId || !state.showRadarPressureChart) return;
    if (!force && Date.now() - state.sofascorePlayerEventsFetchedAt < 15000) return;
    if (state.sofascorePlayerEventsFetchPromise) return state.sofascorePlayerEventsFetchPromise;

    state.sofascorePlayerEventsFetchPromise = (async () => {
      if (window.traderSofascoreData?.eventDetails) {
        const result = await window.traderSofascoreData.eventDetails({ sofascoreId: eventId });
        if (result && (Array.isArray(result.incidents) || Array.isArray(result.shotmap))) {
          return [{ incidents: result.incidents || [] }, { shotmap: result.shotmap || [] }];
        }
      }
      return Promise.all([
        fetchSofascoreJson(`/event/${eventId}/incidents`).catch(() => null),
        fetchSofascoreJson(`/event/${eventId}/shotmap`).catch(() => null)
      ]);
    })()
      .then(([incidentData, shotData]) => {
        const normalized = [];
        const pushEvent = event => {
          if (!event?.type || !Number.isFinite(event.minute) || !event.side) return;
          normalized.push(event);
        };
        (Array.isArray(incidentData?.incidents) ? incidentData.incidents : []).forEach(incident => {
          const incidentType = String(incident?.incidentType || '').toLowerCase();
          const incidentClass = String(incident?.incidentClass || incident?.cardType || '').toLowerCase();
          const minute = Number(incident?.time || 0) + Number(incident?.addedTime || 0);
          const side = incident?.isHome === true ? 'home' : incident?.isHome === false ? 'away' : '';
          if (incidentType.includes('card') || incidentClass.includes('yellow') || incidentClass.includes('red')) {
            const type = incidentClass.includes('red') ? 'red-card' : 'yellow-card';
            pushEvent({
              type, minute, side,
              player: incident?.player?.name || incident?.player?.shortName || incident?.playerName || incident?.athlete?.name || ''
            });
          }
          if (incidentType === 'goal') {
            pushEvent({
              type: 'goal', minute, side,
              player: incident?.player?.name || incident?.player?.shortName || incident?.scorer?.name || ''
            });
          }
          if (incidentType === 'substitution') {
            pushEvent({
              type: 'substitution', minute, side,
              playerIn: incident?.playerIn?.name || incident?.playerIn?.shortName || '',
              playerOut: incident?.playerOut?.name || incident?.playerOut?.shortName || ''
            });
          }
        });
        (Array.isArray(shotData?.shotmap) ? shotData.shotmap : []).forEach(shot => {
          const shotType = String(shot?.shotType || '').toLowerCase();
          const type = shotType === 'goal' ? 'goal'
            : shotType === 'save' ? 'shot-on-target'
              : shotType === 'block' ? 'blocked-shot'
                : shotType === 'post' ? 'woodwork'
                  : shotType === 'miss' ? 'shot' : '';
          if (!type) return;
          pushEvent({
            type,
            minute: Number(shot?.time || 0) + Number(shot?.addedTime || 0),
            side: shot?.isHome === true ? 'home' : shot?.isHome === false ? 'away' : '',
            player: shot?.player?.name || shot?.player?.shortName || ''
          });
        });
        const unique = new Map();
        normalized.forEach(event => {
          const key = [event.type, event.minute, event.side, event.player || '', event.playerIn || '', event.playerOut || ''].join('|');
          unique.set(key, event);
        });
        state.sofascorePlayerEvents = Array.from(unique.values());
        state.sofascorePlayerEventsFetchedAt = Date.now();
        scheduleRender();
      })
      .finally(() => {
        state.sofascorePlayerEventsFetchPromise = null;
      });
    return state.sofascorePlayerEventsFetchPromise;
  };
  const scheduleSofascorePlayerEvents = (immediate = false) => {
    clearTimeout(state.sofascorePlayerEventsTimer);
    if (!state.showRadarPressureChart || !getSofascoreEventId()) return;
    state.sofascorePlayerEventsTimer = setTimeout(() => {
      fetchSofascorePlayerEvents(true).finally(() => scheduleSofascorePlayerEvents(false));
    }, immediate ? 0 : 20000);
  };
  const parseAddedTimeCommentSeconds = value => {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    if (!raw) return null;

    if (/^\d+'\s*\+\s*\d+/.test(raw)) return null;

    let match = raw.match(/^(\d+)'\s*(\d{1,2})''/);
    if (match) return (Number(match[1]) * 60) + Number(match[2]);

    match = raw.match(/^(\d+)'\s*(\d{1,2})/);
    if (match) return (Number(match[1]) * 60) + Number(match[2]);

    match = raw.match(/^(\d+)\s*:\s*(\d{1,2})$/);
    if (match) return (Number(match[1]) * 60) + Number(match[2]);

    match = raw.match(/^(\d+)'$/);
    if (match) return Number(match[1]) * 60;

    return null;
  };

  const shouldIgnoreAddedTimeComment = item => {
    const text = normalizeMatchText(`${item?.comment || ''} ${item?.all || ''} ${item?.className || ''}`);
    return text.includes('substituicao') || text.includes('substitution');
  };

  const calculateAddedTimeForHalfFromItems = items => {
    const events = [];

    for (const item of items) {
      if (shouldIgnoreAddedTimeComment(item)) continue;

      const rawTime = commentTime(item);
      const totalSeconds = parseAddedTimeCommentSeconds(rawTime);
      if (totalSeconds === null) continue;

      events.push({
        rawTime,
        totalSeconds,
        item
      });
    }

    events.sort((a, b) => b.totalSeconds - a.totalSeconds);

    let totalAddedSeconds = 0;
    const moments = [];

    for (let i = 0; i < events.length - 1; i += 1) {
      const current = events[i];
      const next = events[i + 1];
      const diff = current.totalSeconds - next.totalSeconds;

      if (diff >= 70) {
        const minutesToAdd = Math.floor(diff / 60);
        const secondsToAdd = minutesToAdd * 60;

        totalAddedSeconds += secondsToAdd;
        moments.push({
          secondsToAdd,
          from: current.rawTime,
          to: next.rawTime,
          diff,
          currentComment: commentText(current.item?.comment || current.item?.all || ''),
          nextComment: commentText(next.item?.comment || next.item?.all || '')
        });
      }
    }

    return {
      minutes: Math.floor(totalAddedSeconds / 60),
      seconds: totalAddedSeconds % 60,
      totalAddedSeconds,
      moments,
      eventCount: events.length
    };
  };

  const splitCommentariesForAddedTime = items => {
    const firstHalf = [];
    const secondHalf = [];

    for (const item of items) {
      if (shouldIgnoreAddedTimeComment(item)) continue;

      const rawTime = commentTime(item);
      const totalSeconds = parseAddedTimeCommentSeconds(rawTime);
      if (totalSeconds === null) continue;

      if (totalSeconds < 45 * 60) {
        firstHalf.push(item);
      } else {
        secondHalf.push(item);
      }
    }

    return { firstHalf, secondHalf };
  };

  const calculateAddedTimeFromCommentaries = data => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    const { firstHalf, secondHalf } = splitCommentariesForAddedTime(items);

    return {
      firstHalf: calculateAddedTimeForHalfFromItems(firstHalf),
      secondHalf: calculateAddedTimeForHalfFromItems(secondHalf)
    };
  };

  const addedTimeHtml = (data, clock) => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    if (!items.length) return '';

    const period = clockPeriodInfo(clock);
    if (period.paused) return '';

    const results = calculateAddedTimeFromCommentaries(data);
    const active = period.period === 'second' ? results.secondHalf : results.firstHalf;
    const minutes = Math.max(0, active.minutes || 0);

    const debugTitle = active.moments.length
      ? active.moments
          .map(entry => `${entry.from} -> ${entry.to} (${entry.diff}s, +${Math.floor(entry.secondsToAdd / 60)}')`)
          .join(' | ')
      : 'Sem gaps >= 60s encontrados nos comentarios';

    return `<span class="custom-radar-added-time" title="${escapeHtml(debugTitle)}">+${minutes}' prev</span>`;
  };
  const getLastComment = data => data?.commentaries?.[0] ? { ...data.commentaries[0], time: commentTime(data.commentaries[0]) } : null;
  const getFocusedComment = data => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    if (!state.pinnedKey && !Number.isInteger(state.pinnedIndex)) return null;
    const item = items.find(entry => commentKey(entry) === state.pinnedKey) || items.find(entry => Number(entry.index) === state.pinnedIndex);
    return item ? { ...item, time: commentTime(item) } : null;
  };
  const eventType = item => {
    const text = normalizeMatchText(`${item?.comment || ''} ${item?.all || ''} ${item?.className || ''}`);
    if (!text) return 'neutral';
    if (text.includes('final da partida') || text.includes('fim da partida') || text.includes('full time') || text.includes('match ended')) return 'full-time';
    if (text.includes('intervalo') || text.includes('half time')) return 'half-time';
    if (text.includes('pontape de saida') || text.includes('pontape inicial') || text.includes('inicio da partida') || text.includes('kick off') || text.includes('kickoff')) return 'kick-off';
    if (text.includes('inicio do segundo tempo') || text.includes('second half started') || text.includes('start second half')) return 'second-half-start';
    if (text.includes('tiro de meta') || text.includes('goal kick')) return 'goal-kick';
    if (text.includes('lateral') || text.includes('throw in') || text.includes('throw-in')) return 'throw-in';
    if (text.includes('gol') || text.includes('goal')) return 'goal';
    if (text.includes('ataque perigoso') || text.includes('dangerous attack')) return 'dangerous';
    if (text.includes('trave') || text.includes('poste') || text.includes('travesao') || text.includes('woodwork') || text.includes('crossbar') || text.includes('upright')) return 'woodwork';
    if (text.includes('remate certeiro') || text.includes('chute gol') || text.includes('shot on target') || text.includes('on target')) return 'shot-on-target';
    if (text.includes('remate bloqueado') || text.includes('chute bloqueado') || text.includes('blocked shot') || text.includes('shot blocked')) return 'blocked-shot';
    if (text.includes('remate') || text.includes('chute') || text.includes('shot')) return 'shot';
    if (text.includes('escanteio') || text.includes('corner')) return 'corner';
    if (text.includes('cartao amarelo') || text.includes('yellow card')) return 'yellow-card';
    if ((text.includes('possivel') || text.includes('possible')) && (text.includes('cartao vermelho') || text.includes('red card'))) return 'possible-red-card';
    if (text.includes('cartao vermelho') || text.includes('red card')) return 'red-card';
    if (text.includes('cartao') || text.includes('card')) return 'yellow-card';
    if (text.includes('substituicao') || text.includes('substitution')) return 'substitution';
    if (text.includes('defesa') || text.includes('defence') || text.includes('defense')) return 'defense';
    if (text.includes('ataque') || text.includes('attack')) return 'attack';
    if (text.includes('posse') || text.includes('controle de meio campo') || text.includes('control')) return 'control';
    if (text.includes('falta') || text.includes('free kick')) return 'foul';
    return 'neutral';
  };
  const eventIcon = item => {
    const type = eventType(item);
    const side = item?.side === 'away' ? 'away' : (item?.side === 'home' ? 'home' : '');
    const directionalArrow = side === 'away' ? 'bx-left-arrow-alt' : 'bx-right-arrow-alt';
    const customIcon = radarIconForType(type);
    if (customIcon?.src) {
      const mirrorClass = ['dangerous', 'attack', 'defense'].includes(type) && side === 'away' ? 'is-mirrored' : '';
      return `<img class="custom-radar-event-icon custom-radar-event-img custom ${escapeHtml(type)} ${escapeHtml(side)} ${mirrorClass}" src="${escapeHtml(customIcon.src)}" alt="${escapeHtml(customIcon.name || type)}">`;
    }
    if (type === 'goal') {
      return `<img class="custom-radar-event-icon custom-radar-event-img goal ${escapeHtml(side)}" src="${radarIconSrc('Gol.svg')}" alt="Gol">`;
    }
    if (type === 'woodwork') {
      return `<img class="custom-radar-event-icon custom-radar-event-img woodwork ${escapeHtml(side)}" src="${radarIconSrc('trave.svg')}" alt="Remate na trave">`;
    }
    if (type === 'substitution') {
      return `<span class="custom-radar-event-icon substitution ${escapeHtml(side)}" aria-label="Substituicao"><i class='bx bx-left-arrow-alt'></i><i class='bx bx-right-arrow-alt'></i></span>`;
    }
    const map = {
      goal: 'bx-football', dangerous: directionalArrow,
      attack: directionalArrow,
      defense: directionalArrow, 'shot-on-target': 'bx-target-lock', 'blocked-shot': 'bx-block', shot: 'bx-radio-circle',
      'goal-kick': 'bx-radio-circle', 'throw-in': 'bx-radio-circle',
      corner: 'bxs-flag-alt', 'yellow-card': 'bx-square', 'possible-red-card': 'bx-error', 'red-card': 'bx-square',
      control: 'bx-transfer-alt', foul: 'bx-square', 'half-time': 'bx-time-five', 'full-time': 'bx-stop-circle',
      'kick-off': 'bx-play-circle', 'second-half-start': 'bx-play-circle', neutral: 'bx-radio-circle'
    };
    return `<i class='custom-radar-event-icon ${escapeHtml(type)} ${escapeHtml(side)} bx ${map[type] || map.neutral}'></i>`;
  };
  const visualProfilePresets = {
    compact: { fontScale: 0.72, overlayOpacity: 0.8, content: 'events', pressure: false, radarPressure: false, heatmapMode: 'match', heatmapStyle: 'bar', liveIntelligence: false },
    full: { fontScale: 1, overlayOpacity: 1, content: 'full', pressure: true, radarPressure: true, heatmapMode: 'teams', heatmapStyle: 'candles', liveIntelligence: true },
    streaming: { fontScale: 0.82, overlayOpacity: 0.8, content: 'full', pressure: true, radarPressure: false, heatmapMode: 'match', heatmapStyle: 'wave', liveIntelligence: true }
  };
  const personalizationTabs = [
    ['profiles', 'Perfis', 'bx-bookmark'], ['alerts', 'Alertas', 'bx-bell'], ['colors', 'Cores', 'bx-palette'],
    ['components', 'Componentes', 'bx-layout'], ['icons', 'Icones', 'bx-image']
  ];
  const componentLabels = { score: 'Placar', events: 'Eventos', stats: 'Estatisticas', charts: 'Graficos', heatmap: 'Mapa de calor' };
  const toggleControl = (action, key, label, checked) => `<label class="custom-radar-toggle-row"><span>${escapeHtml(label)}</span><input type="checkbox" data-action="${action}" data-setting="${key}" ${checked ? 'checked' : ''}><i></i></label>`;
  const radarIconGalleryHtml = () => {
    const samples = [
      { type: 'goal', label: 'Gol', text: 'Goal for Casa', source: 'Gol.svg' },
      { type: 'woodwork', label: 'Remate na trave', text: 'Remate na trave Casa', source: 'trave.svg' },
      { type: 'shot-on-target', label: 'Remate certeiro', text: 'Shot On Target Casa', source: 'Boxicons bx-target-lock' },
      { type: 'shot', label: 'Remate para fora', text: 'Remate Casa', source: 'CSS custom' },
      { type: 'blocked-shot', label: 'Remate bloqueado', text: 'Blocked Shot Casa', source: 'Boxicons bx-block' },
      { type: 'corner', label: 'Escanteio', text: 'Corner for Casa', source: 'Boxicons bxs-flag-alt' },
      { type: 'dangerous', label: 'Ataque perigoso', text: 'Dangerous Attack by Casa', source: 'Seta direcional' },
      { type: 'attack', label: 'Ataque', text: 'Attack by Casa', source: 'Seta direcional' },
      { type: 'defense', label: 'Defesa', text: 'Defesa Casa', source: 'Seta direcional' },
      { type: 'goal-kick', label: 'Tiro de meta', text: 'Goal Kick for Casa', source: 'CSS custom' },
      { type: 'throw-in', label: 'Lateral', text: 'Throw in for Casa', source: 'CSS custom' },
      { type: 'foul', label: 'Falta', text: 'Free Kick for Casa', source: 'CSS custom' },
      { type: 'yellow-card', label: 'Cartao amarelo', text: 'Yellow Card Casa', source: 'CSS custom' },
      { type: 'red-card', label: 'Cartao vermelho', text: 'Red Card Casa', source: 'CSS custom' },
      { type: 'possible-red-card', label: 'Possivel vermelho', text: 'Possible Red Card Casa', source: 'Boxicons bx-error' },
      { type: 'substitution', label: 'Substituicao', text: 'Substitution Casa', source: 'Setas custom' },
      { type: 'control', label: 'Controle/posse', text: 'Controle de meio campo Casa', source: 'Boxicons bx-transfer-alt' },
      { type: 'kick-off', label: 'Pontape de saida', text: 'Pontape de saida', source: 'Boxicons bx-play-circle' },
      { type: 'half-time', label: 'Intervalo', text: 'Intervalo', source: 'Boxicons bx-time-five' },
      { type: 'second-half-start', label: 'Inicio 2 tempo', text: 'Inicio do segundo tempo', source: 'Boxicons bx-play-circle' },
      { type: 'full-time', label: 'Final da partida', text: 'Final da Partida', source: 'Boxicons bx-stop-circle' },
      { type: 'neutral', label: 'Neutro', text: 'Evento neutro', source: 'Boxicons bx-radio-circle' }
    ];
    const tab = personalizationTabs.some(item => item[0] === state.personalizationTab) ? state.personalizationTab : 'profiles';
    const profilePanel = `<div class="custom-radar-personalization-panel custom-radar-profile-panel">
      <div class="custom-radar-profile-grid">${[
        ['compact', 'Compacto', 'Informacao essencial em pouco espaco', 'bx-collapse'],
        ['full', 'Completo', 'Todos os componentes ativos', 'bx-grid-alt'],
        ['streaming', 'Streaming', 'Transparencia e leitura sobre video', 'bx-broadcast'],
        ['custom', 'Personalizado', 'Seus ajustes salvos', 'bx-slider-alt']
      ].map(([key, label, description, icon]) => `<button class="custom-radar-profile-card ${state.visualProfile === key ? 'active' : ''}" data-action="profile-apply" data-profile="${key}"><i class='bx ${icon}'></i><strong>${label}</strong><small>${description}</small></button>`).join('')}</div>
      <div class="custom-radar-profile-actions"><button data-action="profile-save-custom"><i class='bx bx-save'></i> Salvar como Personalizado</button><small>Fonte, opacidade e componentes ficam neste perfil. Posicao e tamanho seguem as memorias 1, 2 e 3 da janela destacada.</small></div>
    </div>`;
    const alertsPanel = `<div class="custom-radar-personalization-panel custom-radar-settings-grid">
      <section><h4>Funcionamento</h4>${toggleControl('alert-setting', 'enabled', 'Ativar alertas', alertSetting('enabled'))}${toggleControl('alert-setting', 'sound', 'Som curto', alertSetting('sound'))}${toggleControl('alert-setting', 'visual', 'Destaque visual', alertSetting('visual'))}${toggleControl('alert-setting', 'notification', 'Notificacao do sistema', alertSetting('notification'))}</section>
      <section><h4>Regras</h4>${toggleControl('alert-setting', 'pressure', 'Pressao crescente', alertSetting('pressure'))}${toggleControl('alert-setting', 'sequence', 'Sequencia de ataques perigosos', alertSetting('sequence'))}${toggleControl('alert-setting', 'shots', 'Muitos remates', alertSetting('shots'))}${toggleControl('alert-setting', 'redCard', 'Cartao vermelho', alertSetting('redCard'))}${toggleControl('alert-setting', 'goalChance', 'Possivel momento de gol', alertSetting('goalChance'))}</section>
      <section><h4>Inteligencia ao vivo</h4>${toggleControl('summary-toggle', 'summary', 'Exibir resumo automatico', state.showAutoSummary)}${toggleControl('intelligence-toggle', 'intelligence', 'Exibir analise avancada', state.showLiveIntelligence)}<p>Descreve ritmo, perigo, dominio e pressao sem indicar mercado.</p></section>
    </div>`;
    const colorLabels = { home: 'Time da casa', away: 'Time visitante', cold: 'Frio', warm: 'Atencao', hot: 'Quente', danger: 'Muito perigoso' };
    const colorsPanel = `<div class="custom-radar-personalization-panel custom-radar-color-grid">${Object.entries(colorLabels).map(([key, label]) => `<label><span>${label}</span><input type="color" value="${escapeHtml(colorSetting(key))}" data-action="color-change" data-color-key="${key}"><b>${escapeHtml(colorSetting(key))}</b></label>`).join('')}<button data-action="colors-reset"><i class='bx bx-reset'></i> Restaurar cores</button></div>`;
    const componentsPanel = `<div class="custom-radar-personalization-panel"><div class="custom-radar-component-grid">${Object.entries(componentLabels).map(([key, label]) => {
      const setting = componentSetting(key);
      return `<div class="custom-radar-component-row"><strong>${label}</strong><span>Escala</span><button data-action="component-scale-down" data-component="${key}"><i class='bx bx-minus'></i></button><b>${Math.round(setting.scale * 100)}%</b><button data-action="component-scale-up" data-component="${key}"><i class='bx bx-plus'></i></button><span>Opacidade</span><button data-action="component-opacity-down" data-component="${key}"><i class='bx bx-minus'></i></button><b>${Math.round(setting.opacity * 100)}%</b><button data-action="component-opacity-up" data-component="${key}"><i class='bx bx-plus'></i></button></div>`;
    }).join('')}</div><button data-action="components-reset"><i class='bx bx-reset'></i> Restaurar componentes</button></div>`;
    const previewHtml = `<section class="custom-radar-personalization-preview" aria-label="Visualizacao previa">
      <header><span>Visualizacao previa</span><small>Atualizacao imediata</small></header>
      <div class="custom-radar-preview-score"><b data-preview-color="home" style="color:${colorSetting('home')}">CASA</b><strong>1 x 0</strong><b data-preview-color="away" style="color:${colorSetting('away')}">FORA</b></div>
      <div class="custom-radar-preview-event"><i class='bx bx-target-lock'></i><span>62'18''</span><strong>Remate certeiro</strong></div>
      <div class="custom-radar-preview-stats"><span>AP 18-11</span><span>CG 5-2</span><span>ESC 6-3</span></div>
      <div class="custom-radar-preview-chart"><i data-preview-color="away" style="height:35%;background:${colorSetting('away')}"></i><i data-preview-color="home" style="height:55%;background:${colorSetting('home')}"></i><i data-preview-color="home" style="height:80%;background:${colorSetting('home')}"></i><i data-preview-color="away" style="height:42%;background:${colorSetting('away')}"></i><i data-preview-color="home" style="height:68%;background:${colorSetting('home')}"></i></div>
      <div class="custom-radar-preview-heat"><i data-preview-color="cold" style="background:${colorSetting('cold')}"></i><i data-preview-color="warm" style="background:${colorSetting('warm')}"></i><i data-preview-color="hot" style="background:${colorSetting('hot')}"></i><i data-preview-color="danger" style="background:${colorSetting('danger')}"></i></div>
    </section>`;
    return `
      <div class="custom-radar-personalization-modal" role="dialog" aria-modal="true" aria-label="Central de personalizacao">
        <button type="button" class="custom-radar-personalization-backdrop" data-action="icon-gallery" aria-label="Fechar central"></button>
        <div class="custom-radar-card custom-radar-icon-gallery-card" data-personalization-tab="${tab}">
          <div class="custom-radar-personalization-title">
            <span><i class='bx bx-slider-alt'></i><span><strong>Central de personalizacao</strong><small>Ajuste os eventos sem alterar os dados do Radar MOD.</small></span></span>
            <button type="button" data-action="icon-gallery" title="Fechar central"><i class='bx bx-x'></i></button>
          </div>
          <nav class="custom-radar-personalization-tabs">${personalizationTabs.map(([key, label, icon]) => `<button class="${tab === key ? 'active' : ''}" data-action="personalization-tab" data-tab="${key}"><i class='bx ${icon}'></i><span>${label}</span></button>`).join('')}</nav>
          ${tab === 'colors' || tab === 'components' || tab === 'profiles' ? previewHtml : ''}
          ${tab === 'profiles' ? profilePanel : tab === 'alerts' ? alertsPanel : tab === 'colors' ? colorsPanel : tab === 'components' ? componentsPanel : ''}
          <div class="custom-radar-personalization-controls">
            <div class="custom-radar-personalization-scale">
              <span><i class='bx bx-list-ul'></i> Icones no Radar</span>
              <button type="button" data-action="radar-icon-scale-down" title="Diminuir no Radar"><i class='bx bx-minus'></i></button>
              <strong>${Math.round(clampIconScale(state.radarIconScale) * 100)}%</strong>
              <button type="button" data-action="radar-icon-scale-up" title="Aumentar no Radar"><i class='bx bx-plus'></i></button>
              <button type="button" data-action="radar-icon-scale-reset" title="Tamanho padrao no Radar"><i class='bx bx-reset'></i> Padrao</button>
            </div>
            <div class="custom-radar-personalization-scale">
              <span><i class='bx bx-bar-chart-square'></i> Icones no grafico</span>
              <button type="button" data-action="pressure-icon-scale-down" title="Diminuir no grafico"><i class='bx bx-minus'></i></button>
              <strong>${Math.round(clampIconScale(state.pressureIconScale) * 100)}%</strong>
              <button type="button" data-action="pressure-icon-scale-up" title="Aumentar no grafico"><i class='bx bx-plus'></i></button>
              <button type="button" data-action="pressure-icon-scale-reset" title="Tamanho padrao no grafico"><i class='bx bx-reset'></i> Padrao</button>
            </div>
            <button type="button" class="reset-all" data-action="icon-reset-all"><i class='bx bx-refresh'></i> Restaurar todos</button>
          </div>
          <div class="custom-radar-icon-gallery">
            ${samples.map(sample => {
              const custom = state.customIconMap?.[sample.type];
              const defaultIcon = defaultRadarIconMap[sample.type];
              const icon = eventIcon({ comment: sample.text, side: 'home' });
              return `
                <div class="custom-radar-icon-sample ${escapeHtml(sample.type)}">
                  <span class="custom-radar-icon-preview">${icon}</span>
                  <strong>${escapeHtml(sample.label)}</strong>
                  <small>${escapeHtml(custom?.name ? `Custom: ${custom.name}` : (defaultIcon?.name ? `Padrao: ${defaultIcon.name}` : sample.source))}</small>
                  <span class="custom-radar-icon-actions">
                    <button type="button" data-action="icon-change" data-icon-type="${escapeHtml(sample.type)}"><i class='bx bx-upload'></i> Trocar</button>
                    <button type="button" ${custom?.src ? '' : 'disabled'} data-action="icon-reset" data-icon-type="${escapeHtml(sample.type)}"><i class='bx bx-reset'></i></button>
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  };
  const refreshPersonalizationModal = () => {
    const current = $('.custom-radar-personalization-modal');
    if (current) current.outerHTML = radarIconGalleryHtml();
    else render();
  };
  const renderLogo = (team, fallbackName) => {
    const id = team?.a;
    const label = escapeHtml(getTeamInitials(team?.b || fallbackName || ''));
    if (!id) return `<span class="custom-radar-logo-fallback">${label}</span>`;
    return `<img class="custom-radar-logo" src="${escapeHtml(get365TeamLogoUrl(id))}" alt="${escapeHtml(team?.b || fallbackName || '')}" onerror="this.outerHTML='<span class=&quot;custom-radar-logo-fallback&quot;>${label}</span>'">`;
  };
  const odds = event => {
    const raw = event?.odds;
    if (!raw) return [];
    const map = [['Casa', raw.home], ['Empate', raw.draw], ['Fora', raw.away], ['Over 2.5', raw.over25], ['Under 2.5', raw.under25]];
    return map.map(([label, item]) => ({ label, value: item?.value ?? item ?? '' })).filter(item => item.value !== '');
  };
  const statsHtml = data => {
    const stats = data?.stats || {};
    const countedTypes = new Set(['substitution', 'woodwork', 'yellow-card', 'red-card']);
    const eventCounts = {
      substitutions: { home: 0, away: 0 },
      woodwork: { home: 0, away: 0 },
      yellowCards: { home: 0, away: 0 },
      redCards: { home: 0, away: 0 }
    };
    const countKeyByType = { substitution: 'substitutions', woodwork: 'woodwork', 'yellow-card': 'yellowCards', 'red-card': 'redCards' };
    const timelineKeyByType = {
      'shot-on-target': 'shotsOnTarget', shot: 'shotsOffTarget', woodwork: 'woodwork', corner: 'corners',
      substitution: 'substitutions', dangerous: 'dangerousAttacks', 'yellow-card': 'yellowCards', 'red-card': 'redCards'
    };
    const eventMoments = Object.fromEntries(Object.values(timelineKeyByType).map(key => [key, { home: [], away: [] }]));
    const seenEvents = new Set();
    (Array.isArray(data?.commentaries) ? data.commentaries : []).forEach(item => {
      const type = eventType(item);
      const timelineKey = timelineKeyByType[type];
      if (!timelineKey) return;
      const side = item?.side === 'away' ? 'away' : 'home';
      const description = normalizeMatchText(commentText(item?.comment || item?.all || ''));
      const uniqueKey = `${side}|${type}|${commentTime(item) || ''}|${description}`;
      if (seenEvents.has(uniqueKey)) return;
      seenEvents.add(uniqueKey);
      const moment = commentTime(item);
      if (moment) eventMoments[timelineKey][side].push(moment);
      if (countedTypes.has(type)) eventCounts[countKeyByType[type]][side] += 1;
    });
    const rows = [
      ['shotsOnTarget', 'Chutes gol', 'Shot On Target', 'bx-target-lock'],
      ['shotsOffTarget', 'Chutes fora', 'Shot Off Target', 'bx-crosshair'],
      ['woodwork', 'Bola na trave', 'Shot hits the woodwork', 'bx-radio-circle-marked'],
      ['corners', 'Escanteios', 'Corner for', 'bxs-flag-alt'],
      ['possession', 'Posse', '', 'bx-pie-chart-alt-2'],
      ['substitutions', 'Substituicoes', 'Substitution', 'bx-transfer-alt'],
      ['dangerousAttacks', 'Ataques perigosos', 'Dangerous Attack by', 'bxs-bolt-circle'],
      ['yellowCards', 'Cartoes amarelos', 'Yellow Card', 'bx-square'],
      ['redCards', 'Cartoes vermelhos', 'Red Card', 'bx-square']
    ];
    const value = (key, side) => {
      if (eventCounts[key]) {
        const eventValue = Number(eventCounts[key][side]) || 0;
        const directValue = Number(stats[key]?.[side]);
        return Math.max(eventValue, Number.isFinite(directValue) ? directValue : 0);
      }
      return stats[key]?.[side] ?? '--';
    };
    const statIcon = (sample, fallback) => sample
      ? eventIcon({ comment: sample, all: sample })
      : `<i class='bx ${fallback}'></i>`;
    const tooltip = (key, label) => {
      const moments = eventMoments[key];
      if (!moments) return `${label}: ${value(key, 'home')} - ${value(key, 'away')}`;
      const home = moments.home.length ? moments.home.join(', ') : 'nenhum';
      const away = moments.away.length ? moments.away.join(', ') : 'nenhum';
      return `${label} | Casa: ${home} | Visitante: ${away}`;
    };
    return `<div class="custom-radar-stats-grid">${rows.map(([key, label, sample, fallback]) => `<div class="custom-radar-stat ${escapeHtml(key)}" title="${escapeHtml(tooltip(key, label))}"><strong class="custom-radar-stat-icon">${statIcon(sample, fallback)}</strong><span>${escapeHtml(value(key, 'home'))} - ${escapeHtml(value(key, 'away'))}</span></div>`).join('')}</div>`;
  };
  const pressureHtml = (data, clock) => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    const period = clockPeriodInfo(clock);
    const recent = {
      dangerous: { home: 0, away: 0 },
      onTarget: { home: 0, away: 0 }
    };
    const pressureIcon = sample => eventIcon({ comment: sample, all: sample });
    const row = (className, sample, label, stat) => `<span class="custom-radar-pressure-item ${className}">${pressureIcon(sample)}<strong>${label}</strong><b>${stat.home}-${stat.away}</b></span>`;
    if (!items.length || period.paused) {
      return `<div class="custom-radar-pressure" title="Eventos dos ultimos 5 minutos"><small>5m</small>${row('dangerous', 'Dangerous Attack by', 'AP', recent.dangerous)}${row('on-target', 'Shot On Target', 'CG', recent.onTarget)}</div>`;
    }
    let latest = parseGameSeconds(clock) ?? Math.max(...items.map(item => parseGameSeconds(commentTime(item)) ?? 0), 0);
    if (period.period === 'second' && latest < 45 * 60) latest += 45 * 60;
    items.forEach(item => {
      const type = eventType(item);
      const side = item.side === 'away' ? 'away' : (item.side === 'home' ? 'home' : '');
      if (!side) return;
      const seconds = parseGameSeconds(commentTime(item));
      if (seconds === null) return;
      if (period.period === 'second' && seconds < 45 * 60) return;
      if (seconds > latest || latest - seconds > 300) return;
      if (type === 'dangerous') recent.dangerous[side] += 1;
      if (type === 'shot-on-target') recent.onTarget[side] += 1;
    });
    const totalHome = recent.dangerous.home + recent.onTarget.home;
    const totalAway = recent.dangerous.away + recent.onTarget.away;
    const leader = totalHome === totalAway ? 'eq' : (totalHome > totalAway ? 'home' : 'away');
    return `<div class="custom-radar-pressure ${leader}" title="Eventos dos ultimos 5 minutos"><small>5m</small>${row('dangerous', 'Dangerous Attack by', 'AP', recent.dangerous)}${row('on-target', 'Shot On Target', 'CG', recent.onTarget)}</div>`;
  };
  const heatEventScore = item => {
    const text = normalizeMatchText(`${item?.comment || ''} ${item?.all || ''} ${item?.className || ''}`);
    const type = eventType(item);
    if (type === 'dangerous') return { type, label: 'Ataques perigosos', score: 5, offensive: true };
    if (type === 'shot-on-target') return { type, label: 'Remates certeiros', score: 10, offensive: true };
    if (type === 'woodwork') return { type, label: 'Remates na trave', score: 10, offensive: true };
    if (type === 'blocked-shot') return { type, label: 'Remates bloqueados', score: 3, offensive: true };
    if (type === 'shot') return { type, label: 'Remates', score: 6, offensive: true };
    if (type === 'corner') return { type, label: 'Escanteios', score: 4, offensive: true };
    if (type === 'attack') return { type, label: 'Ataques', score: 1 };
    if (type === 'goal-kick') return { type, label: 'Tiros de meta', score: -1 };
    if (type === 'foul' || text.includes('falta') || text.includes('free kick')) return { type: 'foul', label: 'Faltas', score: -0.5 };
    return null;
  };
  const recentMatchPulse = (data, clock, windowSeconds = 600) => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    const latest = parseGameSeconds(clock) ?? Math.max(0, ...items.map(item => parseGameSeconds(commentTime(item)) || 0));
    const result = {
      home: 0, away: 0, dangerous: 0, shots: 0, onTarget: 0, redCards: 0, sequence: 0, latest,
      lastDangerousAt: -1, lastShotAt: -1, lastOnTargetAt: -1, lastRedCardAt: -1, lastPressureAt: -1
    };
    let consecutiveSide = '';
    let consecutiveCount = 0;
    items
      .map(item => ({ item, seconds: parseGameSeconds(commentTime(item)) }))
      .filter(entry => entry.seconds !== null && entry.seconds <= latest && latest - entry.seconds <= windowSeconds)
      .sort((a, b) => a.seconds - b.seconds)
      .forEach(({ item, seconds }) => {
        const side = item?.side === 'away' ? 'away' : (item?.side === 'home' ? 'home' : '');
        const type = eventType(item);
        const heat = heatEventScore(item);
        if (side && heat) {
          result[side] += Math.max(0, heat.score || 0);
          if ((heat.score || 0) > 0) result.lastPressureAt = Math.max(result.lastPressureAt, seconds);
        }
        if (type === 'dangerous') {
          result.dangerous += 1;
          result.lastDangerousAt = Math.max(result.lastDangerousAt, seconds);
        }
        if (['shot', 'shot-on-target', 'blocked-shot', 'woodwork'].includes(type)) {
          result.shots += 1;
          result.lastShotAt = Math.max(result.lastShotAt, seconds);
        }
        if (['shot-on-target', 'woodwork'].includes(type)) {
          result.onTarget += 1;
          result.lastOnTargetAt = Math.max(result.lastOnTargetAt, seconds);
        }
        if (type === 'red-card') {
          result.redCards += 1;
          result.lastRedCardAt = Math.max(result.lastRedCardAt, seconds);
        }
        if (side && type === 'dangerous') {
          consecutiveCount = consecutiveSide === side ? consecutiveCount + 1 : 1;
          consecutiveSide = side;
          result.sequence = Math.max(result.sequence, consecutiveCount);
        }
      });
    return result;
  };
  const autoSummary = (data, clock, names) => {
    const pulse = recentMatchPulse(data, clock, 600);
    const total = pulse.home + pulse.away;
    const difference = Math.abs(pulse.home - pulse.away);
    if (!total) return { tone: 'calm', text: 'Jogo sem pressao relevante nos ultimos minutos.' };
    if (pulse.onTarget >= 3 || total >= 48) return { tone: 'danger', text: 'Ritmo muito alto e chegadas perigosas recentes.' };
    if (difference >= 12) {
      const leader = pulse.home > pulse.away ? (names.home || 'Mandante') : (names.away || 'Visitante');
      return { tone: 'hot', text: `${leader} pressiona com mais intensidade.` };
    }
    if (pulse.sequence >= 4) return { tone: 'watch', text: 'Sequencia ofensiva em andamento.' };
    if (total >= 20) return { tone: 'watch', text: 'Jogo ativo, com pressao alternada.' };
    return { tone: 'calm', text: 'Ritmo controlado neste momento.' };
  };
  const liveIntelligenceData = (data, clock, names) => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    const latest = parseGameSeconds(clock) ?? Math.max(0, ...items.map(item => parseGameSeconds(commentTime(item)) || 0));
    const entries = items.map(item => {
      const seconds = parseGameSeconds(commentTime(item));
      const heat = heatEventScore(item);
      const side = item?.side === 'away' ? 'away' : (item?.side === 'home' ? 'home' : '');
      return { item, seconds, heat, side };
    }).filter(entry => entry.seconds !== null && entry.seconds <= latest && entry.side && entry.heat && entry.heat.score > 0);
    const recent = entries.filter(entry => latest - entry.seconds <= 300);
    const weighted = side => recent.filter(entry => entry.side === side).reduce((total, entry) => {
      const age = Math.max(0, latest - entry.seconds);
      const recency = 0.3 + (0.7 * Math.max(0, 1 - (age / 300)));
      return total + (entry.heat.score * recency);
    }, 0);
    const sequenceBonus = side => {
      const dangerous = recent.filter(entry => entry.side === side && entry.heat.type === 'dangerous').sort((a, b) => a.seconds - b.seconds);
      let streak = 0;
      let best = 0;
      let previous = null;
      dangerous.forEach(entry => {
        streak = previous !== null && entry.seconds - previous <= 45 ? streak + 1 : 1;
        best = Math.max(best, streak);
        previous = entry.seconds;
      });
      return Math.max(0, best - 1) * 3;
    };
    const rawHome = weighted('home') + sequenceBonus('home');
    const rawAway = weighted('away') + sequenceBonus('away');
    const dangerIndex = value => Math.min(100, Math.round(100 * (1 - Math.exp(-Math.max(0, value) / 30))));

    const binSeconds = 15;
    const binCount = 20;
    const bins = Array.from({ length: binCount }, (_, index) => ({ index, home: 0, away: 0 }));
    recent.forEach(entry => {
      const age = latest - entry.seconds;
      const index = Math.max(0, Math.min(binCount - 1, binCount - 1 - Math.floor(age / binSeconds)));
      bins[index][entry.side] += entry.heat.score;
    });
    const dominanceBins = Array.from({ length: 10 }, (_, index) => {
      const segment = bins.slice(index * 2, (index * 2) + 2);
      const home = segment.reduce((sum, bin) => sum + bin.home, 0);
      const away = segment.reduce((sum, bin) => sum + bin.away, 0);
      return { home, away, leader: Math.abs(home - away) >= 3 ? (home > away ? 'home' : 'away') : '' };
    });
    const currentLeader = Math.abs(rawHome - rawAway) >= 6 ? (rawHome > rawAway ? 'home' : 'away') : '';
    let sustainedBins = 0;
    for (let index = dominanceBins.length - 1; index >= 0; index -= 1) {
      if (!currentLeader || dominanceBins[index].leader !== currentLeader) break;
      sustainedBins += 1;
    }
    const dominanceSeconds = sustainedBins * 30;
    const dominantName = currentLeader ? (names[currentLeader] || (currentLeader === 'home' ? 'Mandante' : 'Visitante')) : '';
    const dominanceText = currentLeader && dominanceSeconds >= 60
      ? `${dominantName} assumiu o dominio ha ${Math.max(1, Math.round(dominanceSeconds / 60))} min`
      : 'Dominio ainda equilibrado';

    const currentTotal = recent.reduce((sum, entry) => sum + entry.heat.score, 0);
    const elapsedWindows = Math.max(1, latest / 300);
    const matchAverage = entries.reduce((sum, entry) => sum + entry.heat.score, 0) / elapsedWindows;
    const paceRatio = matchAverage > 0 ? currentTotal / matchAverage : 0;
    const paceText = paceRatio >= 1.35 ? 'Acelerando' : paceRatio <= 0.7 ? 'Desacelerando' : 'Ritmo medio';
    const pacePercent = matchAverage > 0 ? Math.round((paceRatio - 1) * 100) : 0;

    const pressureCandidate = ['home', 'away'].map(side => {
      const sideEntries = entries.filter(entry => entry.side === side && latest - entry.seconds <= 180).sort((a, b) => b.seconds - a.seconds);
      if (!sideEntries.length) return { side, score: 0, duration: 0, count: 0, peak: 0 };
      const chain = [sideEntries[0]];
      for (let index = 1; index < sideEntries.length; index += 1) {
        if (chain[chain.length - 1].seconds - sideEntries[index].seconds > 45) break;
        chain.push(sideEntries[index]);
      }
      const score = chain.reduce((sum, entry) => sum + entry.heat.score, 0);
      let peak = 0;
      chain.forEach(anchor => {
        const minuteScore = chain.filter(entry => anchor.seconds - entry.seconds >= 0 && anchor.seconds - entry.seconds <= 60).reduce((sum, entry) => sum + entry.heat.score, 0);
        peak = Math.max(peak, minuteScore);
      });
      return { side, score, count: chain.length, duration: chain.length > 1 ? chain[0].seconds - chain[chain.length - 1].seconds : 0, peak };
    }).sort((a, b) => b.score - a.score)[0];
    const sustained = pressureCandidate.count >= 3 && pressureCandidate.score >= 14;
    const pressureName = names[pressureCandidate.side] || (pressureCandidate.side === 'home' ? 'Mandante' : 'Visitante');
    const pressureText = sustained
      ? `${pressureName}: ${pressureCandidate.count} acoes em ${Math.max(1, Math.round(pressureCandidate.duration / 60))} min`
      : 'Sem pressao sustentada agora';
    const dominanceTotal = rawHome + rawAway;
    const homeShare = dominanceTotal > 0 ? Math.round((rawHome / dominanceTotal) * 100) : 50;
    const sequenceLabels = {
      dangerous: ['AP', 'Ataque perigoso'], 'shot-on-target': ['CG', 'Remate certeiro'], woodwork: ['TRV', 'Remate na trave'],
      shot: ['REM', 'Remate'], 'blocked-shot': ['BLQ', 'Remate bloqueado'], corner: ['ESC', 'Escanteio'], attack: ['ATQ', 'Ataque']
    };
    const offensiveSequence = recent
      .filter(entry => sequenceLabels[entry.heat.type])
      .sort((a, b) => a.seconds - b.seconds)
      .slice(-5)
      .map(entry => ({
        side: entry.side,
        short: sequenceLabels[entry.heat.type][0],
        label: sequenceLabels[entry.heat.type][1],
        minute: Math.max(0, Math.floor(entry.seconds / 60))
      }));

    return {
      latest, bins, homeIndex: dangerIndex(rawHome), awayIndex: dangerIndex(rawAway),
      homeShare, awayShare: 100 - homeShare, offensiveSequence, dominanceText,
      paceText, pacePercent, sustained, pressureText, pressurePeak: Math.round(pressureCandidate.peak)
    };
  };
  const liveIntelligenceHtml = (data, clock, names) => {
    const insight = liveIntelligenceData(data, clock, names);
    const hasActivity = insight.homeIndex > 0 || insight.awayIndex > 0;
    const showBalance = intelligenceSetting('balance');
    const showSequence = intelligenceSetting('sequence');
    const showCards = intelligenceSetting('dominance') || intelligenceSetting('comparison') || intelligenceSetting('sustained');
    if (!showBalance && !showSequence && !intelligenceSetting('danger') && !showCards) {
      return `<div class="custom-radar-intelligence-placeholder"><i class='bx bx-brain'></i><span>Selecione ao menos um indicador no menu Inteligencia ao vivo.</span></div>`;
    }
    return `<div class="custom-radar-intelligence ${hasActivity ? '' : 'is-empty'}">
      ${showBalance || showSequence ? `<div class="custom-radar-dominance-balance">
        <div class="custom-radar-intelligence-head"><strong><i class='bx bx-transfer-alt'></i> Balanca de dominio</strong><span>ultimos 5 min</span></div>
        ${showBalance ? `<div class="custom-radar-dominance-labels"><b>${escapeHtml(teamAbbr(names.home))} ${insight.homeShare}%</b><b>${insight.awayShare}% ${escapeHtml(teamAbbr(names.away))}</b></div>
        <div class="custom-radar-dominance-track"><i class="home" style="width:${insight.homeShare}%"></i><i class="away" style="width:${insight.awayShare}%"></i><span style="left:${insight.homeShare}%"></span></div>` : ''}
        ${showSequence ? `<div class="custom-radar-offensive-sequence">
          ${insight.offensiveSequence.length ? insight.offensiveSequence.map(event => `<span class="${event.side}" title="${escapeHtml(`${event.minute}' · ${event.label}`)}"><b>${escapeHtml(event.short)}</b><small>${event.minute}'</small></span>`).join('<i class="bx bx-chevron-right"></i>') : '<em>Sem sequencia ofensiva recente</em>'}
        </div>` : ''}
      </div>` : ''}
      ${intelligenceSetting('danger') ? `<div class="custom-radar-danger-index">
        <div><span>${escapeHtml(teamAbbr(names.home))}</span><strong>${insight.homeIndex}</strong><i><b style="width:${insight.homeIndex}%"></b></i></div>
        <div><span>${escapeHtml(teamAbbr(names.away))}</span><strong>${insight.awayIndex}</strong><i><b style="width:${insight.awayIndex}%"></b></i></div>
        <small>Indice de perigo</small>
      </div>` : ''}
      ${showCards ? `<div class="custom-radar-intelligence-cards">
        ${intelligenceSetting('dominance') ? `<div><i class='bx bx-transfer'></i><span>Mudanca de dominio</span><strong>${escapeHtml(insight.dominanceText)}</strong></div>` : ''}
        ${intelligenceSetting('comparison') ? `<div class="pace-${insight.paceText === 'Acelerando' ? 'up' : insight.paceText === 'Desacelerando' ? 'down' : 'stable'}"><i class='bx bx-trending-up'></i><span>Comparador</span><strong>${escapeHtml(insight.paceText)} ${insight.pacePercent ? `(${insight.pacePercent > 0 ? '+' : ''}${insight.pacePercent}%)` : ''}</strong></div>` : ''}
        ${intelligenceSetting('sustained') ? `<div class="${insight.sustained ? 'active' : ''}"><i class='bx bxs-flame'></i><span>Pressao sustentada</span><strong>${escapeHtml(insight.pressureText)}${insight.sustained ? ` · pico ${insight.pressurePeak}` : ''}</strong></div>` : ''}
      </div>` : ''}
    </div>`;
  };
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = 740;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
      oscillator.onended = () => ctx.close().catch(() => {});
    } catch (_) {}
  };
  const evaluateAlerts = (data, clock, names) => {
    if (!alertSetting('enabled')) return;
    const pulseTwoMinutes = recentMatchPulse(data, clock, 120);
    const pulse = recentMatchPulse(data, clock, 180);
    const sixMinutes = recentMatchPulse(data, clock, 360);
    const previousHome = Math.max(0, sixMinutes.home - pulse.home);
    const previousAway = Math.max(0, sixMinutes.away - pulse.away);
    const isFresh = seconds => seconds >= 0 && pulse.latest - seconds <= 30;
    const candidates = [];
    if (alertSetting('redCard') && pulse.redCards && isFresh(pulse.lastRedCardAt)) candidates.push(['red-card', 'Cartao vermelho registrado']);
    if (alertSetting('goalChance') && pulseTwoMinutes.onTarget >= 3 && isFresh(pulseTwoMinutes.lastOnTargetAt)) candidates.push(['goal-chance', 'Muitas finalizacoes perigosas']);
    const leadingPressure = Math.max(pulse.home, pulse.away);
    const previousPressure = pulse.home > pulse.away ? previousHome : previousAway;
    if (alertSetting('pressure') && leadingPressure >= 18 && leadingPressure >= Math.max(6, previousPressure * 1.4) && isFresh(pulse.lastPressureAt)) {
      const leader = pulse.home > pulse.away ? (names.home || 'Mandante') : (names.away || 'Visitante');
      candidates.push(['pressure', `Pressao crescente: ${leader}`]);
    }
    if (alertSetting('sequence') && pulse.sequence >= 4 && isFresh(pulse.lastDangerousAt)) candidates.push(['sequence', 'Sequencia de ataques perigosos detectada']);
    if (alertSetting('shots') && pulse.shots >= 5 && isFresh(pulse.lastShotAt)) candidates.push(['shots', 'Muitos remates nos ultimos 3 minutos']);
    const selected = candidates[0];
    if (!selected) return;
    const [kind, message] = selected;
    const signature = `${kind}|${Math.floor((pulse.latest || 0) / 60)}`;
    const now = Date.now();
    let sharedAlert = {};
    try { sharedAlert = JSON.parse(localStorage.getItem('custom_wradar_mod_last_alert') || '{}'); } catch (_) {}
    if (state.alertRuntime.signature === signature || now - (state.alertRuntime.firedAt[kind] || 0) < 35000 || now - (Number(sharedAlert.at) || 0) < 35000) return;
    state.alertRuntime.signature = signature;
    state.alertRuntime.firedAt[kind] = now;
    state.alertRuntime.message = message;
    state.alertRuntime.visualUntil = alertSetting('visual') ? now + 5000 : 0;
    localStorage.setItem('custom_wradar_mod_last_alert', JSON.stringify({ signature, at: now }));
    if (alertSetting('sound')) playAlertSound();
    if (alertSetting('notification') && 'Notification' in window) {
      const show = () => new Notification('Radar MOD', { body: message });
      if (Notification.permission === 'granted') show();
      else if (Notification.permission !== 'denied') Notification.requestPermission().then(permission => permission === 'granted' && show());
    }
  };
  const heatTimeMultiplier = seconds => {
    const minute = Math.max(0, Math.floor((Number(seconds) || 0) / 60));
    if (minute >= 80) return 1.3;
    if (minute >= 70) return 1.15;
    return 1;
  };
  const heatLevel = value => {
    const score = Math.max(0, Number(value) || 0);
    if (score >= 46) return { key: 'very-hot', label: 'Muito perigoso', icon: 'bx-burst' };
    if (score >= 26) return { key: 'hot', label: 'Quente', icon: 'bxs-flame' };
    if (score >= 11) return { key: 'watch', label: 'Atencao', icon: 'bx-error-circle' };
    return { key: 'cold', label: 'Frio', icon: 'bx-check-circle' };
  };
  const heatWindowLabel = index => {
    const start = index * 5;
    return `${String(start).padStart(2, '0')}-${String(start + 5).padStart(2, '0')}`;
  };
  const heatBucketForSeconds = (seconds, rawTime = '') => {
    const normalizedTime = String(rawTime || '').replace(/\s+/g, ' ').trim();
    if (/^45'\s*\+/.test(normalizedTime)) {
      return { key: '45plus', label: '45+', startSeconds: 45 * 60, endSeconds: 46 * 60, order: 8.5 };
    }
    if (/^90'\s*\+/.test(normalizedTime)) {
      return { key: '90plus', label: '90+', startSeconds: 90 * 60, endSeconds: 91 * 60, order: 17.5 };
    }
    const minute = Math.max(0, Number(seconds) / 60);
    if (minute > 45 && minute < 46) {
      return { key: '45plus', label: '45+', startSeconds: 45 * 60, endSeconds: 46 * 60, order: 8.5 };
    }
    if (minute > 90 && minute < 91) {
      return { key: '90plus', label: '90+', startSeconds: 90 * 60, endSeconds: 91 * 60, order: 17.5 };
    }
    const adjustedMinute = minute >= 46 && minute <= 90 ? minute - 1 : minute > 91 ? 89 : minute;
    const index = Math.max(0, Math.floor(adjustedMinute / 5));
    return {
      key: `w${index}`,
      label: heatWindowLabel(index),
      startSeconds: index * 300,
      endSeconds: (index + 1) * 300,
      order: index
    };
  };
  const summarizeHeatRange = (windows, latestSeconds, minutes) => {
    if (!windows.length || !Number.isFinite(latestSeconds)) return { score: 0, level: heatLevel(0) };
    const startSeconds = Math.max(0, latestSeconds - (minutes * 60));
    const relevant = windows.filter(item => item.endSeconds > startSeconds && item.startSeconds <= latestSeconds);
    const total = relevant.reduce((sum, item) => sum + item.score, 0);
    const normalized = total / Math.max(1, minutes / 5);
    return { score: normalized, level: heatLevel(normalized) };
  };
  const heatTrend = windows => {
    const recent = windows.filter(item => item.events > 0).slice(-4);
    if (recent.length < 2) return { key: 'stable', label: 'Estavel' };
    const last = recent[recent.length - 1].score;
    const prev = recent.slice(0, -1).reduce((sum, item) => sum + item.score, 0) / (recent.length - 1);
    if (last >= prev + 8) return { key: 'up', label: 'Subindo' };
    if (last <= prev - 8) return { key: 'down', label: 'Caindo' };
    return { key: 'stable', label: 'Estavel' };
  };
  const heatmapPanelHtml = (items, clock, title, extraClass = '') => {
    if (!items.length) {
      return `<div class="custom-radar-heatmap ${extraClass} is-empty"><div class="custom-radar-heatmap-head"><strong><i class='bx bxs-flame'></i> ${escapeHtml(title)}</strong><span>Aguardando eventos</span></div></div>`;
    }

    const parsedItems = items
      .map(item => {
        const rawTime = commentTime(item);
        const seconds = parseGameSeconds(rawTime);
        const heat = heatEventScore(item);
        const multiplier = heatTimeMultiplier(seconds);
        return { item, rawTime, seconds, heat, multiplier };
      })
      .filter(entry => entry.seconds !== null && entry.heat);
    if (!parsedItems.length) {
      return `<div class="custom-radar-heatmap ${extraClass} is-empty"><div class="custom-radar-heatmap-head"><strong><i class='bx bxs-flame'></i> ${escapeHtml(title)}</strong><span>Sem eventos de pressao ainda</span></div></div>`;
    }

    const period = clockPeriodInfo(clock);
    let latest = parseGameSeconds(clock);
    if (latest === null) latest = Math.max(...parsedItems.map(entry => entry.seconds), 0);
    if (period.period === 'second' && latest < 45 * 60) latest += 45 * 60;
    const windows = Array.from({ length: 18 }, (_, index) => ({
      key: `w${index}`,
      index,
      label: heatWindowLabel(index),
      startSeconds: index * 300,
      endSeconds: (index + 1) * 300,
      order: index,
      score: 0,
      events: 0,
      details: {}
    }));
    windows.push({
      key: '45plus',
      index: 9.5,
      label: '45+',
      startSeconds: 45 * 60,
      endSeconds: 46 * 60,
      order: 8.5,
      score: 0,
      events: 0,
      details: {}
    });
    windows.push({
      key: '90plus',
      index: 18.5,
      label: '90+',
      startSeconds: 90 * 60,
      endSeconds: 91 * 60,
      order: 17.5,
      score: 0,
      events: 0,
      details: {}
    });
    windows.sort((a, b) => a.order - b.order);
    const windowMap = new Map(windows.map(item => [item.key, item]));

    parsedItems.forEach(({ rawTime, seconds, heat, multiplier }) => {
      const bucket = heatBucketForSeconds(seconds, rawTime);
      const windowItem = windowMap.get(bucket.key);
      if (!windowItem) return;
      windowItem.score += heat.score * multiplier;
      windowItem.events += 1;
      windowItem.details[heat.label] = (windowItem.details[heat.label] || 0) + 1;
      if (multiplier > 1) windowItem.details[`Peso ${multiplier.toFixed(2)}x`] = (windowItem.details[`Peso ${multiplier.toFixed(2)}x`] || 0) + 1;
    });

    parsedItems
      .filter(entry => entry.heat.offensive)
      .sort((a, b) => a.seconds - b.seconds)
      .forEach((entry, index, offensiveEvents) => {
        const pressureCount = offensiveEvents
          .slice(0, index + 1)
          .filter(previous => entry.seconds - previous.seconds <= 120).length;
        if (pressureCount < 3) return;

        const bucket = heatBucketForSeconds(entry.seconds, entry.rawTime);
        const windowItem = windowMap.get(bucket.key);
        if (!windowItem) return;
        if (windowItem.sequenceBonus) return;

        const multiplier = heatTimeMultiplier(entry.seconds);
        windowItem.sequenceBonus = true;
        windowItem.score += 5 * multiplier;
        windowItem.details['Bonus pressao continua'] = 1;
    });

    let previousHeat = 0;
    windows.forEach(item => {
      item.rawScore = Math.max(0, item.score);
      const belongsToSecondHalf = item.key === '90plus'
        || (Number.isInteger(item.index) && item.index >= 9);
      item.future = period.period !== 'second' && belongsToSecondHalf
        ? true
        : item.startSeconds > latest;
      if (!item.future) {
        // Carry only a short, capped residue into the next five-minute window.
        // Using the full accumulated score here makes hot windows feed themselves.
        const inheritedHeat = Math.min(10, previousHeat * 0.25);
        item.inheritedHeat = inheritedHeat;
        item.score = Math.min(80, Math.max(0, item.rawScore + inheritedHeat));
        previousHeat = item.score;
      }
    });

    windows.forEach(item => {
      item.rawScore = Math.round((item.rawScore || 0) * 10) / 10;
      item.inheritedHeat = Math.round((item.inheritedHeat || 0) * 10) / 10;
      item.score = item.future ? 0 : Math.max(0, Math.round(item.score * 10) / 10);
      item.level = heatLevel(item.score);
      item.current = latest >= item.startSeconds && latest < item.endSeconds;
      item.major = item.current || item.key.endsWith('plus') || item.index % 3 === 0;
    });

    const visible = windows;
    const style = ['dots', 'wave', 'bar'].includes(state.heatmapStyle) ? state.heatmapStyle : 'candles';
    const range5 = summarizeHeatRange(windows, latest, 5);
    const range10 = summarizeHeatRange(windows, latest, 10);
    const range15 = summarizeHeatRange(windows, latest, 15);
    const trend = heatTrend(windows);
    const summary = (label, range) => `<span class="custom-radar-heat-summary ${range.level.key}"><small>${label}</small><strong><i class='bx ${range.level.icon}'></i>${range.level.label}</strong></span>`;
    const block = item => {
      const title = [
        `${item.label} min`,
        item.future ? 'Ainda nao aconteceu' : `Intensidade: ${item.score}`,
        !item.future && item.inheritedHeat > 0 ? `Memoria anterior: ${item.inheritedHeat}` : '',
        !item.future ? `Eventos da janela: ${item.rawScore}` : '',
        item.level.label,
        ...Object.entries(item.details).map(([name, count]) => `${name}: ${count}`)
      ].filter(Boolean).join(' | ');
      const itemClass = [
        item.future ? 'is-future' : '',
        item.current ? 'is-current' : '',
        item.major ? 'is-major' : ''
      ].filter(Boolean).join(' ');
      const candleHeight = Math.max(8, Math.min(38, Math.round(8 + (Math.min(60, item.score) / 60) * 30)));
      if (style === 'candles') {
        return `<span class="custom-radar-heat-candle-wrap ${itemClass}" title="${escapeHtml(title)}"><b>${escapeHtml(item.label)}</b>${item.future ? '<i class="custom-radar-heat-placeholder"></i>' : `<i class="custom-radar-heat-candle ${item.level.key}" style="--heat-height:${candleHeight}px"></i>`}</span>`;
      }
      return `<span class="custom-radar-heat-point-wrap ${itemClass}" title="${escapeHtml(title)}"><b>${escapeHtml(item.label)}</b>${item.future ? '<i class="custom-radar-heat-placeholder"></i>' : `<i class="custom-radar-heat-point ${item.level.key}"></i>`}</span>`;
    };
    const wave = () => {
      const width = 1000;
      const height = 72;
      const baseline = 52;
      const top = 7;
      const occurred = visible.filter(item => !item.future);
      if (!occurred.length) return '';

      const xFor = index => ((index + 0.5) / Math.max(1, visible.length)) * width;
      const yFor = score => baseline - (Math.min(60, Math.max(0, score)) / 60) * (baseline - top);
      const points = occurred.map(item => {
        const visibleIndex = visible.indexOf(item);
        return { item, x: xFor(visibleIndex), y: yFor(item.score) };
      });
      const smoothPathFor = (segment, startX) => [{ x: startX, y: baseline }, ...segment].reduce((path, point, index, all) => {
        if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        const before = all[index - 2] || all[index - 1];
        const previous = all[index - 1];
        const next = all[index + 1] || point;
        const control1X = previous.x + (point.x - before.x) / 6;
        const control1Y = previous.y + (point.y - before.y) / 6;
        const control2X = point.x - (next.x - previous.x) / 6;
        const control2Y = point.y - (next.y - previous.y) / 6;
        return `${path} C ${control1X.toFixed(1)} ${control1Y.toFixed(1)}, ${control2X.toFixed(1)} ${control2Y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      }, '');
      const halfTimeX = width / 2;
      const firstHalfEndIndex = visible.findIndex(item => item.key === '45plus');
      const firstHalfPoints = points.filter(point => visible.indexOf(point.item) <= firstHalfEndIndex);
      const secondHalfPoints = points.filter(point => visible.indexOf(point.item) > firstHalfEndIndex);
      const intervalAnchor = { x: halfTimeX, y: baseline };
      const firstHalfRenderPoints = secondHalfPoints.length
        ? [...firstHalfPoints, intervalAnchor]
        : firstHalfPoints;
      const firstHalfPath = smoothPathFor(firstHalfRenderPoints, 0);
      const secondHalfPath = secondHalfPoints.length ? smoothPathFor(secondHalfPoints, halfTimeX) : '';
      const areaFor = (path, segment, startX) => segment.length
        ? `${path} L ${segment[segment.length - 1].x.toFixed(1)} ${baseline} L ${startX.toFixed(1)} ${baseline} Z`
        : '';
      const firstHalfArea = areaFor(firstHalfPath, firstHalfRenderPoints, 0);
      const secondHalfArea = areaFor(secondHalfPath, secondHalfPoints, halfTimeX);
      const markers = points.map(point => {
        const item = point.item;
        const detail = [
          `${item.label} min`,
          `Intensidade: ${item.score}`,
          item.inheritedHeat > 0 ? `Memoria anterior: ${item.inheritedHeat}` : '',
          `Eventos da janela: ${item.rawScore}`,
          item.level.label,
          ...Object.entries(item.details).map(([name, count]) => `${name}: ${count}`)
        ].filter(Boolean).join(' | ');
        return `<circle class="custom-radar-heat-wave-point ${item.level.key}" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5.5"><title>${escapeHtml(detail)}</title></circle>`;
      }).join('');
      const labelKeys = new Set(['w0', 'w3', 'w6', '45plus', 'w12', 'w15', '90plus']);
      const labels = visible.map((item, index) => {
        if (!labelKeys.has(item.key)) return '';
        return `<text x="${xFor(index).toFixed(1)}" y="67" text-anchor="middle">${escapeHtml(item.label)}</text>`;
      }).join('');
      const gradientId = `heat-wave-${Math.random().toString(36).slice(2, 9)}`;

      return `
        <div class="custom-radar-heat-wave-wrap">
          <svg class="custom-radar-heat-wave" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Onda de intensidade">
            <defs>
              <linearGradient id="${gradientId}-stroke" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="${colorSetting('cold')}" />
                <stop offset="35%" stop-color="${colorSetting('warm')}" />
                <stop offset="65%" stop-color="${colorSetting('hot')}" />
                <stop offset="100%" stop-color="${colorSetting('danger')}" />
              </linearGradient>
              <linearGradient id="${gradientId}-fill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stop-color="${colorSetting('cold')}" stop-opacity="0.12" />
                <stop offset="45%" stop-color="${colorSetting('warm')}" stop-opacity="0.22" />
                <stop offset="75%" stop-color="${colorSetting('hot')}" stop-opacity="0.32" />
                <stop offset="100%" stop-color="${colorSetting('danger')}" stop-opacity="0.42" />
              </linearGradient>
            </defs>
            <g class="custom-radar-heat-wave-grid">
              <line x1="0" y1="16" x2="${width}" y2="16" />
              <line x1="0" y1="34" x2="${width}" y2="34" />
              <line x1="0" y1="${baseline}" x2="${width}" y2="${baseline}" />
              <line class="half-time" x1="${halfTimeX.toFixed(1)}" y1="5" x2="${halfTimeX.toFixed(1)}" y2="${baseline}" />
            </g>
            <line class="custom-radar-heat-wave-baseline" x1="0" y1="${baseline}" x2="${width}" y2="${baseline}" />
            <path class="custom-radar-heat-wave-area" d="${firstHalfArea}" fill="url(#${gradientId}-fill)" />
            ${secondHalfArea ? `<path class="custom-radar-heat-wave-area" d="${secondHalfArea}" fill="url(#${gradientId}-fill)" />` : ''}
            <path class="custom-radar-heat-wave-line" d="${firstHalfPath}" stroke="url(#${gradientId}-stroke)" />
            ${secondHalfPath ? `<path class="custom-radar-heat-wave-line" d="${secondHalfPath}" stroke="url(#${gradientId}-stroke)" />` : ''}
            ${markers}
            ${labels}
          </svg>
        </div>
      `;
    };
    const liveBar = () => {
      const decayFactor = ageSeconds => {
        const age = Math.max(0, Number(ageSeconds) || 0) / 60;
        const curve = [[0, 1], [1, 0.7], [2, 0.45], [3, 0.25], [4, 0.1], [5, 0]];
        if (age >= 5) return 0;
        const nextIndex = curve.findIndex(([minute]) => minute >= age);
        if (nextIndex <= 0) return curve[0][1];
        const [startMinute, startValue] = curve[nextIndex - 1];
        const [endMinute, endValue] = curve[nextIndex];
        const progress = (age - startMinute) / Math.max(0.01, endMinute - startMinute);
        return startValue + ((endValue - startValue) * progress);
      };
      const scoreAt = referenceSeconds => {
        const recent = parsedItems.filter(entry => entry.seconds <= referenceSeconds && referenceSeconds - entry.seconds <= 300);
        let score = recent.reduce((sum, entry) => {
          return sum + (entry.heat.score * entry.multiplier * decayFactor(referenceSeconds - entry.seconds));
        }, 0);
        const offensiveLastTwoMinutes = recent.filter(entry => entry.heat.offensive && referenceSeconds - entry.seconds <= 120).length;
        if (offensiveLastTwoMinutes >= 3) score += 5;
        return Math.max(0, Math.min(80, score));
      };
      const score = Math.round(scoreAt(latest) * 10) / 10;
      const previousScore = scoreAt(Math.max(0, latest - 30));
      const liveTrend = score >= previousScore + 1.5
        ? { key: 'up', label: 'Subindo', icon: 'bx-up-arrow-alt' }
        : score <= previousScore - 1.5
          ? { key: 'down', label: 'Caindo', icon: 'bx-down-arrow-alt' }
          : { key: 'stable', label: 'Estavel', icon: 'bx-right-arrow-alt' };
      const level = heatLevel(score);
      const percent = Math.max(0, Math.min(100, (score / 60) * 100));
      const details = {};
      parsedItems
        .filter(entry => entry.seconds <= latest && latest - entry.seconds <= 300)
        .forEach(entry => {
          details[entry.heat.label] = (details[entry.heat.label] || 0) + 1;
        });
      const tooltip = [
        `Intensidade atual: ${score}`,
        level.label,
        `Tendencia: ${liveTrend.label}`,
        ...Object.entries(details).map(([name, count]) => `${name}: ${count}`)
      ].join(' | ');
      return `
        <div class="custom-radar-heat-livebar ${level.key}" title="${escapeHtml(tooltip)}">
          <div class="custom-radar-heat-livebar-scale"><span>Frio</span><span>Atencao</span><span>Quente</span><span>Perigoso</span></div>
          <div class="custom-radar-heat-livebar-track">
            <i style="--live-heat:${percent.toFixed(1)}%"></i>
            <b style="--live-heat:${percent.toFixed(1)}%"></b>
          </div>
          <div class="custom-radar-heat-livebar-meta"><strong>${escapeHtml(level.label)}</strong><span class="${liveTrend.key}"><i class='bx ${liveTrend.icon}'></i>${escapeHtml(liveTrend.label)}</span></div>
        </div>`;
    };

    return `
      <div class="custom-radar-heatmap ${extraClass} is-${style}">
        <div class="custom-radar-heatmap-head">
          <strong><i class='bx bxs-flame'></i> ${escapeHtml(title)}</strong>
          <span class="custom-radar-heat-trend ${trend.key}">Tendencia: ${escapeHtml(trend.label)}</span>
        </div>
        <div class="custom-radar-heat-summary-row">
          ${summary('5m', range5)}
          ${summary('10m', range10)}
          ${summary('15m', range15)}
        </div>
        ${style === 'wave'
          ? wave()
          : style === 'bar'
            ? liveBar()
            : `<div class="custom-radar-heat-track" style="--heat-count:${visible.length || 1}">${visible.map(block).join('')}</div>`}
      </div>
    `;
  };
  const heatmapHtml = (data, clock, mode, names) => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    if (mode === 'home') {
      return heatmapPanelHtml(items.filter(item => item?.side === 'home'), clock, `Calor ${names.home || 'Casa'}`, 'is-team');
    }
    if (mode === 'away') {
      return heatmapPanelHtml(items.filter(item => item?.side === 'away'), clock, `Calor ${names.away || 'Visitante'}`, 'is-team');
    }
    if (mode === 'teams') {
      return `
        <div class="custom-radar-heatmap-split">
          ${heatmapPanelHtml(items.filter(item => item?.side === 'home'), clock, names.home || 'Casa', 'is-team')}
          ${heatmapPanelHtml(items.filter(item => item?.side === 'away'), clock, names.away || 'Visitante', 'is-team')}
        </div>
      `;
    }
    return heatmapPanelHtml(items, clock, 'Temperatura do jogo');
  };
  const sofascorePressureChartHtml = (points, names) => {
    const validPoints = (points || [])
      .map((point, index) => ({
        minute: Number(point.minute ?? index),
        value: Number(point.value ?? 0)
      }))
      .filter(point => Number.isFinite(point.minute) && Number.isFinite(point.value))
      .sort((a, b) => a.minute - b.minute);
    if (!validPoints.length) return '';

    const latestMinute = Math.max(...validPoints.map(point => point.minute), 0);
    const timelineMinutes = Math.max(90, Math.ceil(latestMinute / 5) * 5);
    const chartWidth = Math.max(720, timelineMinutes * 10);
    const chartHeight = 92;
    const midY = 46;
    const maxBarHeight = 40;
    const barWidth = Math.max(5, Math.min(9, Math.floor(chartWidth / Math.max(90, timelineMinutes)) - 1));
    const absValues = validPoints.map(point => Math.abs(point.value)).filter(value => value > 0).sort((a, b) => a - b);
    const percentileIndex = absValues.length ? Math.min(absValues.length - 1, Math.floor(absValues.length * 0.88)) : 0;
    const visualMax = Math.max(12, absValues[percentileIndex] || 0);
    const dividerX = Math.round((45 / timelineMinutes) * chartWidth);
    const leftStartX = 4;
    const leftEndX = Math.max(leftStartX, dividerX - barWidth - 3);
    const rightStartX = Math.min(chartWidth - barWidth - 4, dividerX + 3);
    const rightEndX = chartWidth - barWidth - 4;
    const xInRange = (value, min, max, start, end) => {
      if (max <= min) return start;
      const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return Math.round(start + (ratio * (end - start)));
    };
    const xForMinute = minute => {
      const safeMinute = Math.max(0, Math.min(timelineMinutes, minute));
      if (safeMinute < 46) {
        const firstHalfMinute = safeMinute > 45
          ? Math.min(45, 44.72 + ((safeMinute - 45) * 0.52))
          : safeMinute;
        return xInRange(firstHalfMinute, 1, 45, leftStartX, leftEndX);
      }
      return xInRange(safeMinute, 46, timelineMinutes, rightStartX, rightEndX);
    };
    const bars = validPoints.map(point => {
      const x = xForMinute(point.minute);
      const value = Math.max(-100, Math.min(100, point.value));
      const ratio = Math.min(1, Math.abs(value) / visualMax);
      const height = Math.max(2, Math.round(Math.pow(ratio, 0.82) * maxBarHeight));
      const isHome = value >= 0;
      const y = isHome ? midY - height : midY;
      const fill = isHome ? colorSetting('home') : colorSetting('away');
      const side = isHome ? names.home : names.away;
      const title = `${Math.round(point.minute)}' | ${side}: ${Math.abs(Math.round(value))}`;
      return `
        <g>
          <title>${escapeHtml(title)}</title>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="1.5" fill="${fill}" opacity="0.96"></rect>
        </g>
      `;
    }).join('');

    return `
      <div class="custom-radar-pressure-chart is-sofascore" title="Grafico de pressao Sofascore">
        <div class="custom-radar-pressure-chart-head">
          <strong><i class='bx bx-bar-chart-alt-2'></i> Pressao <small>Sofascore</small></strong>
          <span><b>${escapeHtml(teamAbbr(names.home))}</b><em></em><b>${escapeHtml(teamAbbr(names.away))}</b></span>
        </div>
        <div class="custom-radar-pressure-chart-body">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" role="img" aria-label="Grafico de pressao Sofascore">
            <line x1="0" y1="${midY}" x2="${chartWidth}" y2="${midY}" stroke="rgba(248,250,252,.34)" stroke-width="1"></line>
            <line x1="${dividerX}" y1="0" x2="${dividerX}" y2="${chartHeight}" stroke="rgba(248,250,252,.20)" stroke-width="1"></line>
            ${bars}
          </svg>
        </div>
      </div>
    `;
  };
  const pressureChartHtml = (data, clock, names) => {
    const sofaChart = sofascorePressureChartHtml(state.sofascoreGraphPoints, names);
    if (sofaChart) return sofaChart;
    const eventId = getSofascoreEventId();
    const message = eventId ? 'Carregando pressao Sofascore...' : 'Sofascore indisponivel para este jogo';
    return `
      <div class="custom-radar-pressure-chart is-sofascore is-empty" title="Grafico de pressao Sofascore">
        <div class="custom-radar-pressure-chart-head">
          <strong><i class='bx bx-bar-chart-alt-2'></i> Pressao <small>Sofascore</small></strong>
          <span><b>${escapeHtml(teamAbbr(names.home))}</b><em></em><b>${escapeHtml(teamAbbr(names.away))}</b></span>
        </div>
        <div class="custom-radar-pressure-chart-empty">${escapeHtml(message)}</div>
      </div>
    `;
  };

  const radarModPressureWeight = type => ({
    dangerous: 1,
    attack: 0.5,
    'shot-on-target': 4,
    woodwork: 4,
    shot: 2,
    'blocked-shot': 2,
    goal: 6,
    corner: 3,
    'yellow-card': 0.5,
    'red-card': 1.5,
    substitution: 0,
    foul: 0.25
  })[type] ?? null;
  const radarModPressureMarker = type => ({
    goal: { label: 'G', name: 'Gol', lane: 0, color: '#22c55e' },
    'shot-on-target': { label: 'CG', name: 'Remate certeiro', lane: 1, color: '#38bdf8' },
    woodwork: { label: 'T', name: 'Remate na trave', lane: 1, color: '#fb7185' },
    shot: { label: 'F', name: 'Remate para fora', lane: 1, color: '#facc15' },
    'blocked-shot': { label: 'B', name: 'Remate bloqueado', lane: 1, color: '#a78bfa' },
    corner: { label: 'C', name: 'Escanteio', lane: 2, color: '#60a5fa' },
    'yellow-card': { label: 'CA', name: 'Cartao amarelo', lane: 0, color: '#facc15' },
    'red-card': { label: 'CV', name: 'Cartao vermelho', lane: 0, color: '#ef4444' },
    substitution: { label: 'S', name: 'Substituicao', lane: 2, color: '#94a3b8' }
  })[type] || null;
  const radarModPressureIconHref = type => radarIconForType(type)?.src || '';
  const radarModPressureChartHtml = (data, clock, names) => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    if (!items.length) return '';

    const parsedItems = items
      .map(item => {
        const rawTime = commentTime(item);
        const seconds = parseGameSeconds(rawTime);
        const type = eventType(item);
        const weight = type === 'possible-red-card' ? null : radarModPressureWeight(type);
        const side = item?.side === 'away' ? 'away' : item?.side === 'home' ? 'home' : '';
        return { item, rawTime, seconds, type, weight, side };
      })
      .filter(entry => entry.seconds !== null && entry.weight !== null && entry.side);
    if (!parsedItems.length) return '';

    const period = clockPeriodInfo(clock);
    let latest = parseGameSeconds(clock);
    if (latest === null) latest = Math.max(...parsedItems.map(entry => entry.seconds), 0);
    if (period.period === 'second' && latest < 45 * 60) latest += 45 * 60;

    const maxMinute = 95;
    const minutes = Array.from({ length: maxMinute + 1 }, (_, minute) => ({
      minute,
      chosen: null,
      markers: []
    }));
    const minuteMap = new Map(minutes.map(item => [item.minute, item]));

    parsedItems.forEach(({ item, rawTime, seconds, type, weight, side }) => {
      const minute = Math.max(0, Math.min(maxMinute, Math.floor(seconds / 60)));
      const bucket = minuteMap.get(minute);
      if (!bucket) return;
      const marker = radarModPressureMarker(type);
      if (marker) bucket.markers.push({ side, type, rawTime, seconds, item, ...marker });
      const second = seconds % 60;
      if (!bucket.chosen || weight > bucket.chosen.weight || (weight === bucket.chosen.weight && second >= bucket.chosen.second)) {
        bucket.chosen = { item, rawTime, seconds, type, side, weight, second };
      }
    });

    const maxValue = Math.max(6, ...minutes.map(item => item.chosen?.weight || 0));
    const chartWidth = 980;
    const chartHeight = 176;
    const midY = 88;
    const topPad = 4;
    const bottomPad = 4;
    const gap = 3;
    const barWidth = 7;
    const markerSize = Math.round(21 * clampIconScale(state.pressureIconScale));
    const dividerX = Math.round(chartWidth / 2);
    const leftStart = 16;
    const leftEnd = dividerX - 9;
    const rightStart = dividerX + 9;
    const rightEnd = chartWidth - 16;
    const isFirstHalfAddedTime = rawTime => /^\s*45'\s*\+/.test(String(rawTime || ''));
    const isSecondHalfAddedTime = rawTime => /^\s*90'\s*\+/.test(String(rawTime || ''));
    const xForSeconds = (seconds, rawTime = '') => {
      const minute = Math.max(0, Number(seconds) || 0) / 60;
      if (isFirstHalfAddedTime(rawTime)) {
        const added = Math.max(0, minute - 45);
        return Math.round(leftEnd - 10 + Math.min(10, added * 2));
      }
      if (minute < 45) {
        return Math.round(leftStart + (Math.min(45, minute) / 45) * (leftEnd - leftStart));
      }
      if (isSecondHalfAddedTime(rawTime) || minute >= 90) {
        const added = Math.max(0, minute - 90);
        return Math.round(rightEnd - 10 + Math.min(10, added * 2));
      }
      return Math.round(rightStart + (Math.min(45, Math.max(0, minute - 45)) / 45) * (rightEnd - rightStart));
    };
    const markerPlayerDetail = marker => {
      const markerMinute = Math.max(0, Number(marker.seconds) || 0) / 60;
      const matchesType = event => event.type === marker.type
        || (marker.type === 'shot' && event.type === 'shot')
        || (marker.type === 'shot-on-target' && event.type === 'shot-on-target');
      const match = (state.sofascorePlayerEvents || [])
        .filter(event => event.side === marker.side && matchesType(event) && Math.abs(event.minute - markerMinute) <= 1.1)
        .sort((a, b) => Math.abs(a.minute - markerMinute) - Math.abs(b.minute - markerMinute))[0];
      if (!match) return '';
      if (marker.type === 'substitution') {
        const parts = [];
        if (match.playerOut) parts.push(`Sai: ${match.playerOut}`);
        if (match.playerIn) parts.push(`Entra: ${match.playerIn}`);
        return parts.join(' | ');
      }
      return match.player ? `Jogador: ${match.player}` : '';
    };
    const markerTitle = marker => {
      const sideName = marker.side === 'home' ? names.home : names.away;
      return [formatClockFromSeconds(marker.seconds), sideName, marker.name, markerPlayerDetail(marker)].filter(Boolean).join(' | ');
    };
    const markerSvg = (marker, position) => {
      const { x, y } = position;
      const bg = marker.side === 'home' ? 'rgba(15,23,42,.92)' : 'rgba(15,23,42,.92)';
      const stroke = marker.color || (marker.side === 'home' ? '#22c55e' : '#6366f1');
      const href = radarModPressureIconHref(marker.type);
      const fontSize = marker.label.length > 1 ? 6.2 : 8.2;
      if (href) {
        return `
          <g class="custom-radar-pressure-event-marker">
            <title>${escapeHtml(markerTitle(marker))}</title>
            <image href="${escapeHtml(href)}" x="${x}" y="${y}" width="${markerSize}" height="${markerSize}" preserveAspectRatio="xMidYMid meet"></image>
          </g>
        `;
      }
      if (marker.type === 'yellow-card' || marker.type === 'red-card') {
        const centerX = x + markerSize / 2;
        const centerY = y + markerSize / 2;
        const cardColor = marker.type === 'yellow-card' ? '#facc15' : '#ef4444';
        const cardWidth = markerSize * 0.52;
        const cardHeight = markerSize * 0.78;
        return `
          <g class="custom-radar-pressure-event-marker">
            <title>${escapeHtml(markerTitle(marker))}</title>
            <rect x="${centerX - cardWidth / 2}" y="${centerY - cardHeight / 2}" width="${cardWidth}" height="${cardHeight}" rx="1.4" fill="${cardColor}" stroke="rgba(255,255,255,.88)" stroke-width="0.9" transform="rotate(-8 ${centerX} ${centerY})"></rect>
          </g>
        `;
      }
      return `
        <g class="custom-radar-pressure-event-marker">
          <title>${escapeHtml(markerTitle(marker))}</title>
          <circle cx="${x + markerSize / 2}" cy="${y + markerSize / 2}" r="${markerSize / 2 + 1.8}" fill="${bg}" stroke="${stroke}" stroke-width="2" opacity="0.98"></circle>
          <text x="${x + markerSize / 2}" y="${y + markerSize - 4.2}" text-anchor="middle" fill="${stroke}" font-size="${fontSize}" font-weight="1000">${escapeHtml(marker.label)}</text>
        </g>
      `;
    };
    const orderedMarkers = markers => markers
      .slice()
      .sort((a, b) => {
        if (a.lane !== b.lane) return b.lane - a.lane;
        if (a.seconds !== b.seconds) return a.seconds - b.seconds;
        return a.type.localeCompare(b.type);
      });
    const occupiedMarkers = { home: [], away: [] };
    const markerBarHeight = marker => {
      const minute = Math.max(0, Math.min(maxMinute, Math.floor(marker.seconds / 60)));
      const chosen = minuteMap.get(minute)?.chosen;
      const weight = chosen?.side === marker.side ? chosen.weight : radarModPressureWeight(marker.type);
      return Math.max(5, Math.round(((Number(weight) || 0) / maxValue) * 46));
    };
    const markerPosition = marker => {
      const baseX = xForSeconds(marker.seconds, marker.rawTime) + (barWidth / 2) - (markerSize / 2);
      const barHeight = markerBarHeight(marker);
      const baseY = marker.side === 'home'
        ? midY - barHeight - markerSize - gap
        : midY + barHeight + gap;
      const minDistance = markerSize + 4;
      const verticalOffsets = [0, markerSize + 3, (markerSize + 3) * 2, (markerSize + 3) * 3];
      for (const verticalOffset of verticalOffsets) {
        const rawY = marker.side === 'home' ? baseY - verticalOffset : baseY + verticalOffset;
        const y = Math.max(1, Math.min(chartHeight - markerSize - 1, Math.round(rawY)));
        const x = Math.max(1, Math.min(chartWidth - markerSize - 1, Math.round(baseX)));
        const centerX = x + (markerSize / 2);
        const centerY = y + (markerSize / 2);
        const available = occupiedMarkers[marker.side].every(previous => (
          Math.abs(previous.x - centerX) >= minDistance || Math.abs(previous.y - centerY) >= minDistance
        ));
        if (!available) continue;
        occupiedMarkers[marker.side].push({ x: centerX, y: centerY });
        return { x, y };
      }
      const fallbackX = Math.max(1, Math.min(chartWidth - markerSize - 1, Math.round(baseX)));
      const fallbackY = Math.max(1, Math.min(chartHeight - markerSize - 1, Math.round(baseY)));
      occupiedMarkers[marker.side].push({ x: fallbackX + (markerSize / 2), y: fallbackY + (markerSize / 2) });
      return { x: fallbackX, y: fallbackY };
    };
    const titleFor = item => {
      if (!item.chosen) return `${item.minute}' | Sem evento de pressao`;
      const sideName = item.chosen.side === 'home' ? names.home : names.away;
      return `${item.minute}' | ${sideName}: ${commentText(item.chosen.item?.comment || item.chosen.item?.all || item.chosen.type)} | peso ${item.chosen.weight}`;
    };
    const bars = minutes.map(item => {
      const chosen = item.chosen;
      const isHome = chosen?.side === 'home';
      const isAway = chosen?.side === 'away';
      const x = chosen ? xForSeconds(chosen.seconds, chosen.rawTime) : xForSeconds(item.minute * 60, '');
      const height = chosen ? Math.max(5, Math.round((chosen.weight / maxValue) * 46)) : 2;
      return `
        <g>
          <title>${escapeHtml(titleFor(item))}</title>
          <rect x="${x}" y="${isHome ? midY - height : midY - 1}" width="${barWidth}" height="${isHome ? height : 1}" rx="2.5" fill="${colorSetting('home')}" opacity="${isHome ? 0.98 : 0.14}"></rect>
          <rect x="${x}" y="${midY}" width="${barWidth}" height="${isAway ? height : 1}" rx="2.5" fill="${colorSetting('away')}" opacity="${isAway ? 0.98 : 0.14}"></rect>
        </g>
      `;
    }).join('');
    const allMarkers = orderedMarkers(minutes.flatMap(item => item.markers));
    const markerLayer = allMarkers.map(marker => markerSvg(marker, markerPosition(marker))).join('');

    return `
      <div class="custom-radar-pressure-chart is-radar-mod" title="Grafico secundario de pressao Radar MOD">
        <div class="custom-radar-pressure-chart-head">
          <strong><i class='bx bx-bar-chart-alt-2'></i> Pressao <small>Radar MOD</small></strong>
          <span><b>${escapeHtml(teamAbbr(names.home))}</b><em></em><b>${escapeHtml(teamAbbr(names.away))}</b></span>
        </div>
        <div class="custom-radar-pressure-chart-body">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="xMinYMid meet" role="img" aria-label="Grafico secundario de pressao Radar MOD">
            <line x1="0" y1="${midY}" x2="${chartWidth}" y2="${midY}" stroke="rgba(248,250,252,.34)" stroke-width="1"></line>
            <line x1="${dividerX}" y1="8" x2="${dividerX}" y2="${chartHeight - 8}" stroke="rgba(248,250,252,.26)" stroke-width="1"></line>
            <line x1="0" y1="${topPad + 40}" x2="${chartWidth}" y2="${topPad + 40}" stroke="rgba(34,197,94,.14)" stroke-width="1"></line>
            <line x1="0" y1="${chartHeight - bottomPad - 40}" x2="${chartWidth}" y2="${chartHeight - bottomPad - 40}" stroke="rgba(99,102,241,.14)" stroke-width="1"></line>
            ${bars}
            ${markerLayer}
          </svg>
        </div>
      </div>
    `;
  };

  const legacyPressureChartHtml = (data, clock, names) => {

    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    if (!items.length) return '';

    const parsedItems = items
      .map(item => {
        const seconds = parseGameSeconds(commentTime(item));
        const heat = heatEventScore(item);
        const side = item?.side === 'away' ? 'away' : item?.side === 'home' ? 'home' : '';
        return { item, seconds, heat, side };
      })
      .filter(entry => entry.seconds !== null && entry.heat && entry.side);
    if (!parsedItems.length) return '';

    const period = clockPeriodInfo(clock);
    let latest = parseGameSeconds(clock);
    if (latest === null) latest = Math.max(...parsedItems.map(entry => entry.seconds), 0);
    if (period.period === 'second' && latest < 45 * 60) latest += 45 * 60;

    const maxMinute = Math.max(0, Math.floor(latest / 60));
    const startMinute = Math.max(0, maxMinute - 45);
    const minutes = Array.from({ length: maxMinute - startMinute + 1 }, (_, offset) => ({
      minute: startMinute + offset,
      home: 0,
      away: 0,
      homeEvents: {},
      awayEvents: {},
      markers: []
    }));
    const minuteMap = new Map(minutes.map(item => [item.minute, item]));

    parsedItems.forEach(({ item, seconds, heat, side }) => {
      const minute = Math.max(0, Math.floor(seconds / 60));
      if (minute < startMinute || minute > maxMinute) return;
      const bucket = minuteMap.get(minute);
      const score = Math.max(0, heat.score) * heatTimeMultiplier(seconds);
      bucket[side] += score;
      const detailsKey = side === 'away' ? 'awayEvents' : 'homeEvents';
      bucket[detailsKey][heat.label] = (bucket[detailsKey][heat.label] || 0) + 1;
      const type = eventType(item);
      if (['goal', 'red-card', 'possible-red-card', 'corner', 'shot-on-target', 'woodwork'].includes(type)) {
        bucket.markers.push({ side, type });
      }
    });

    const maxValue = Math.max(10, ...minutes.flatMap(item => [item.home, item.away]));
    const chartWidth = Math.max(520, minutes.length * 13);
    const chartHeight = 78;
    const midY = 39;
    const gap = 2;
    const barWidth = Math.max(5, Math.min(10, Math.floor((chartWidth / Math.max(1, minutes.length)) - gap)));
    const xFor = index => Math.round(index * (barWidth + gap) + 8);
    const markerIcon = marker => {
      if (marker.type === 'goal') return '●';
      if (marker.type === 'woodwork') return 'T';
      if (marker.type === 'red-card' || marker.type === 'possible-red-card') return '◆';
      if (marker.type === 'corner') return '⚑';
      return '•';
    };
    const titleFor = item => {
      const homeDetails = Object.entries(item.homeEvents).map(([name, count]) => `${names.home}: ${name} ${count}`).join(', ');
      const awayDetails = Object.entries(item.awayEvents).map(([name, count]) => `${names.away}: ${name} ${count}`).join(', ');
      return [`${item.minute}'`, homeDetails, awayDetails].filter(Boolean).join(' | ');
    };
    const bars = minutes.map((item, index) => {
      const x = xFor(index);
      const homeHeight = Math.max(1, Math.round((item.home / maxValue) * 31));
      const awayHeight = Math.max(1, Math.round((item.away / maxValue) * 31));
      const homeOpacity = item.home > 0 ? 0.96 : 0.18;
      const awayOpacity = item.away > 0 ? 0.96 : 0.18;
      const markers = item.markers.slice(0, 3).map((marker, markerIndex) => {
        const y = marker.side === 'home' ? 10 + (markerIndex * 9) : 62 - (markerIndex * 9);
        const color = marker.side === 'home' ? colorSetting('home') : colorSetting('away');
        return `<text x="${x + (barWidth / 2)}" y="${y}" text-anchor="middle" fill="${color}" font-size="8" font-weight="900">${markerIcon(marker)}</text>`;
      }).join('');
      return `
        <g>
          <title>${escapeHtml(titleFor(item))}</title>
          <rect x="${x}" y="${midY - homeHeight}" width="${barWidth}" height="${homeHeight}" rx="1.5" fill="${colorSetting('home')}" opacity="${homeOpacity}"></rect>
          <rect x="${x}" y="${midY}" width="${barWidth}" height="${awayHeight}" rx="1.5" fill="${colorSetting('away')}" opacity="${awayOpacity}"></rect>
          ${markers}
        </g>
      `;
    }).join('');

    return `
      <div class="custom-radar-pressure-chart" title="Grafico de pressao por minuto">
        <div class="custom-radar-pressure-chart-head">
          <strong><i class='bx bx-bar-chart-alt-2'></i> Pressao</strong>
          <span><b>${escapeHtml(teamAbbr(names.home))}</b><em></em><b>${escapeHtml(teamAbbr(names.away))}</b></span>
        </div>
        <div class="custom-radar-pressure-chart-body">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none" role="img" aria-label="Grafico de pressao">
            <line x1="0" y1="${midY}" x2="${chartWidth}" y2="${midY}" stroke="rgba(248,250,252,.34)" stroke-width="1"></line>
            ${bars}
          </svg>
        </div>
      </div>
    `;
  };
  const listHtml = data => {
    const items = Array.isArray(data?.commentaries) ? data.commentaries : [];
    const focusedKey = commentKey(getFocusedComment(data) || getLastComment(data));
    const visibleItems = focusedKey ? items.filter(item => commentKey(item) !== focusedKey) : items;
    if (!visibleItems.length) return `<div class="custom-radar-comment-list is-empty"><div><i class='bx bx-loader-alt bx-spin'></i> Aguardando comentarios do scoreboard...</div></div>`;
    return `<div class="custom-radar-comment-list">${visibleItems.map(item => {
      const time = commentTime(item);
      const type = eventType(item);
      const key = commentKey(item);
      const encoded = encodeURIComponent(key);
      const pinned = key === state.pinnedKey || Number(item.index) === Number(state.pinnedIndex);
      return `<button type="button" class="custom-radar-comment ${escapeHtml(item.side || '')} ${escapeHtml(type)} ${pinned ? 'is-pinned' : ''}" data-index="${Number(item.index)}" data-key="${encoded}" title="Lance do jogo"><span>${escapeHtml(time || '--')}</span>${eventIcon(item)}<strong>${escapeHtml(commentText(item.comment || item.all || '-'))}</strong></button>`;
    }).join('')}</div>`;
  };
  const signature = data => JSON.stringify({
    score: data?.score,
    clock: data?.clock,
    first: data?.commentaries?.[0],
    len: data?.commentaries?.length,
    stats: data?.stats
  });

  function render() {
    const modal = $('#custom-wradar-mod');
    const content = $('#custom-wradar-content');
    if (!content || !modal) return;
    const previousList = $('.custom-radar-comment-list', content);
    const previousScroll = previousList ? {
      top: previousList.scrollTop,
      height: previousList.scrollHeight,
      keep: previousList.scrollTop > 4
    } : null;
    modal.setAttribute('data-radar-theme', state.theme === 'light' ? 'light' : 'dark');
    modal.setAttribute('data-radar-density', state.density === 'compact' ? 'compact' : 'wide');
    modal.setAttribute('data-radar-layout', state.radarLayout);
    modal.setAttribute('data-radar-overlay', state.cleanOverlay ? 'clean' : 'panel');
    modal.setAttribute('data-overlay-content-mode', state.overlayContentMode);
    modal.style.setProperty('--custom-radar-font-scale', String(clampFontScale(state.fontScale)));
    modal.style.setProperty('--custom-radar-icon-scale', String(clampIconScale(state.radarIconScale)));
    modal.style.setProperty('--custom-radar-overlay-dim', '0');
    modal.style.setProperty('--custom-radar-overlay-opacity', String(clampOverlayOpacity(state.overlayOpacity)));
    Object.keys(defaultColorSettings).forEach(key => modal.style.setProperty(`--custom-radar-color-${key}`, colorSetting(key)));
    Object.keys(defaultComponentSettings).forEach(key => {
      const setting = componentSetting(key);
      modal.style.setProperty(`--custom-radar-${key}-scale`, String(clampComponentScale(setting.scale)));
      modal.style.setProperty(`--custom-radar-${key}-opacity`, String(clampComponentOpacity(setting.opacity)));
    });
    const event = state.event || {};
    const data = state.realData;
    const teams = splitTeams(event);
    const fallback = normalizeScore(event);
    const score = {
      home: Number.isFinite(data?.score?.home) ? data.score.home : Number(fallback.home || 0),
      away: Number.isFinite(data?.score?.away) ? data.score.away : Number(fallback.away || 0)
    };
    const names = { home: data?.homeName || teams.home, away: data?.awayName || teams.away };
    const clock = data?.clock || event.minute || (event.whInPlay ? 'Ao vivo' : 'Pre-live');
    evaluateAlerts(data, clock, names);
    modal.classList.toggle('has-active-alert', state.alertRuntime.visualUntil > Date.now());
    const added = addedTimeHtml(data, clock);
    const current = getFocusedComment(data) || getLastComment(data);
    const pinned = (!!state.pinnedKey || Number.isInteger(state.pinnedIndex)) && !!current;
    const type = eventType(current);
    const currentText = commentText(current?.comment || (data ? 'Aguardando lance...' : 'Conectando feed real...'));
    const idBolsa = event?.odds?.idBolsa || event?.idBolsa || '';
    const whUrl = event?.id ? `https://wradar.com.br/radar?eventId=${encodeURIComponent(event.id)}&title=${encodeURIComponent(event.name || '')}&mod=true` : '#';
    const sportUrl = idBolsa ? `https://bolsadeaposta.bet.br/widget/mradar?id=${encodeURIComponent(idBolsa)}` : '';
    const heatmapMode = ['off', 'match', 'home', 'away', 'teams'].includes(state.heatmapMode) ? state.heatmapMode : 'off';
    const heatmapStyle = ['dots', 'wave', 'bar'].includes(state.heatmapStyle) ? state.heatmapStyle : 'candles';
    const heatmapActive = heatmapMode !== 'off';
    const heatmapLabels = { off: 'Desligado', match: 'Partida', home: 'Casa', away: 'Visitante', teams: 'Times separados' };
    const pressureChartActive = !!state.showPressureChart;
    const oddsMenuItems = [
      ['mo', 'MO', 'Match Odds'],
      ['lht', 'LHT', 'Limite do primeiro tempo'],
      ['lft', 'LFT', 'Limite da partida'],
      ['laft', 'LAFT', 'Limite a frente FT']
    ];
    const oddsMenuHtml = anchor => `<span class="custom-radar-odds-menu-wrap ${state.oddsMenuOpen && state.oddsMenuAnchor === anchor ? 'is-open' : ''}">
      <button type="button" class="custom-radar-icon-btn custom-radar-odds-trigger ${state.oddsMenuOpen && state.oddsMenuAnchor === anchor ? 'active' : ''}" data-action="public-odds-menu" data-odds-anchor="${anchor}" title="Mercados Bet365" aria-label="Mercados Bet365" aria-expanded="${state.oddsMenuOpen && state.oddsMenuAnchor === anchor ? 'true' : 'false'}"><span class="custom-radar-bet365-mark"><em>bet</em><b>365</b></span></button>
      <span class="custom-radar-odds-menu">${oddsMenuItems.map(([mode, label, description]) => `<button type="button" data-action="public-odds-mode" data-odds-mode="${mode}"><b>${label}</b><small>${description}</small></button>`).join('')}</span>
    </span>`;
    const summary = autoSummary(data, clock, names);
    const summaryHtml = state.showAutoSummary ? `<div class="custom-radar-auto-summary is-${summary.tone}"><i class='bx bx-pulse'></i><strong>${escapeHtml(summary.text)}</strong></div>` : '';
    const alertBannerHtml = state.alertRuntime.visualUntil > Date.now() && state.alertRuntime.message
      ? `<div class="custom-radar-alert-banner"><i class='bx bx-bell'></i><strong>${escapeHtml(state.alertRuntime.message)}</strong></div>` : '';
    const alertModuleHtml = alertBannerHtml || (state.layoutEditMode
      ? `<div class="custom-radar-alert-placeholder"><i class='bx bx-bell'></i><span>O alerta aparecera aqui quando uma regra for disparada.</span></div>`
      : '');
    const heatmapMenu = `
      <div class="custom-radar-heat-menu ${state.heatmapMenuOpen ? 'is-open' : ''}">
        ${[
          ['match', 'Partida', 'bx-football'],
          ['home', names.home || 'Casa', 'bx-home-alt'],
          ['away', names.away || 'Visitante', 'bx-plane'],
          ['teams', 'Times separados', 'bx-columns'],
          ['off', 'Desligado', 'bx-hide']
        ].map(([mode, label, icon]) => `<button type="button" class="${heatmapMode === mode ? 'active' : ''}" data-action="heatmap-mode" data-mode="${mode}"><i class='bx ${icon}'></i><span>${escapeHtml(label)}</span></button>`).join('')}
        <div class="custom-radar-heat-menu-label">Visual</div>
        ${[
          ['candles', 'Velas', 'bx-bar-chart-alt-2'],
          ['dots', 'Bolinhas', 'bx-dots-horizontal-rounded'],
          ['wave', 'Onda', 'bx-line-chart'],
          ['bar', 'Barra ao vivo', 'bx-slider-alt']
        ].map(([style, label, icon]) => `<button type="button" class="${heatmapStyle === style ? 'active' : ''}" data-action="heatmap-style" data-style="${style}"><i class='bx ${icon}'></i><span>${escapeHtml(label)}</span></button>`).join('')}
      </div>
    `;
    const activeSubmenu = ['font', 'background', 'content', 'heatmap', 'window'].includes(state.activeFontSubmenu) ? state.activeFontSubmenu : 'font';
    const fontMenu = state.overlayReplica && state.fontMenuOpen ? `
      <div class="custom-radar-font-menu has-fixed-submenus ${state.fontMenuOpensLeft ? 'opens-left' : ''}" style="left:${Math.round(state.fontMenuX)}px;top:${Math.round(state.fontMenuY)}px">
        <div class="custom-radar-font-menu-group ${activeSubmenu === 'font' ? 'is-open' : ''}">
          <button type="button" class="custom-radar-submenu-trigger" data-action="font-submenu" data-submenu="font"><i class='bx bx-font'></i><span>Fonte</span><b>${Math.round(clampFontScale(state.fontScale) * 100)}%</b></button>
          <div class="custom-radar-font-submenu">
            <button type="button" data-action="font-scale-down"><i class='bx bx-minus'></i><span>Menor</span></button>
            <button type="button" data-action="font-scale-reset"><i class='bx bx-reset'></i><span>Padrao</span><b>${Math.round(clampFontScale(state.fontScale) * 100)}%</b></button>
            <button type="button" data-action="font-scale-up"><i class='bx bx-plus'></i><span>Maior</span></button>
          </div>
        </div>
        <div class="custom-radar-font-menu-group ${activeSubmenu === 'background' ? 'is-open' : ''}">
          <button type="button" class="custom-radar-submenu-trigger" data-action="font-submenu" data-submenu="background"><i class='bx bx-adjust'></i><span>Opacidade</span><b>${Math.round(clampOverlayOpacity(state.overlayOpacity) * 100)}%</b></button>
          <div class="custom-radar-font-submenu">
            ${[100, 80, 60, 40, 20].map(value => `<button type="button" class="${Math.round(clampOverlayOpacity(state.overlayOpacity) * 100) === value ? 'active' : ''}" data-action="overlay-opacity" data-opacity="${value}"><i class='bx bx-adjust'></i><span>${value}%</span></button>`).join('')}
          </div>
        </div>
        <div class="custom-radar-font-menu-group ${activeSubmenu === 'content' ? 'is-open' : ''}">
          <button type="button" class="custom-radar-submenu-trigger" data-action="font-submenu" data-submenu="content"><i class='bx bx-layout'></i><span>Conteudo</span><b>${state.overlayContentMode === 'current' ? 'Atual' : state.overlayContentMode === 'events' ? 'Eventos' : 'Completo'}</b></button>
          <div class="custom-radar-font-submenu">
            <button type="button" data-action="overlay-content-current"><i class='bx bx-focus'></i><span>So lance atual</span></button>
            <button type="button" data-action="overlay-content-events"><i class='bx bx-list-ul'></i><span>Lance + eventos</span></button>
            <button type="button" data-action="overlay-content-full"><i class='bx bx-grid-alt'></i><span>Completo</span></button>
            <button type="button" data-action="toggle-pressure-chart"><i class='bx bx-bar-chart-alt-2'></i><span>${state.showPressureChart ? 'Ocultar Sofascore' : 'Mostrar Sofascore'}</span></button>
            <button type="button" data-action="toggle-radar-pressure-chart"><i class='bx bx-bar-chart-square'></i><span>${state.showRadarPressureChart ? 'Ocultar Radar MOD' : 'Mostrar Radar MOD'}</span></button>
          </div>
        </div>
        <div class="custom-radar-font-menu-group heatmap-menu-group ${activeSubmenu === 'heatmap' ? 'is-open' : ''}">
          <button type="button" class="custom-radar-submenu-trigger" data-action="font-submenu" data-submenu="heatmap"><i class='bx bxs-flame'></i><span>Mapa de calor</span><b>${heatmapLabels[heatmapMode] || 'Desligado'}</b></button>
          <div class="custom-radar-font-submenu is-heatmap">
            <button type="button" data-action="toggle-heatmap"><i class='bx ${state.heatmapMode === 'off' ? 'bx-show' : 'bx-hide'}'></i><span>${state.heatmapMode === 'off' ? 'Ativar mapa de calor' : 'Desativar mapa de calor'}</span></button>
            <div class="custom-radar-submenu-section">Tipo</div>
            ${[
              ['match', 'Partida', 'bx-football'],
              ['home', names.home || 'Casa', 'bx-home-alt'],
              ['away', names.away || 'Visitante', 'bx-plane'],
              ['teams', 'Times separados', 'bx-columns'],
              ['off', 'Desligado', 'bx-hide']
            ].map(([mode, label, icon]) => `<button type="button" class="${heatmapMode === mode ? 'active' : ''}" data-action="heatmap-mode" data-mode="${mode}"><i class='bx ${icon}'></i><span>${escapeHtml(label)}</span></button>`).join('')}
            <div class="custom-radar-submenu-section">Visual</div>
            ${[
              ['candles', 'Velas', 'bx-bar-chart-alt-2'],
              ['dots', 'Bolinhas', 'bx-dots-horizontal-rounded'],
              ['wave', 'Onda', 'bx-line-chart'],
              ['bar', 'Barra ao vivo', 'bx-slider-alt']
            ].map(([style, label, icon]) => `<button type="button" class="${heatmapStyle === style ? 'active' : ''}" data-action="heatmap-style" data-style="${style}"><i class='bx ${icon}'></i><span>${escapeHtml(label)}</span></button>`).join('')}
          </div>
        </div>
        <div class="custom-radar-font-menu-group ${activeSubmenu === 'window' ? 'is-open' : ''}">
          <button type="button" class="custom-radar-submenu-trigger" data-action="font-submenu" data-submenu="window"><i class='bx bx-window'></i><span>Janela</span><b>${state.overlayAlwaysOnTop ? 'Topo' : 'Normal'}</b></button>
          <div class="custom-radar-font-submenu">
            <button type="button" data-action="toggle-always-on-top"><i class='bx bx-pin'></i><span>${state.overlayAlwaysOnTop ? 'Desligar sempre acima' : 'Ligar sempre acima'}</span></button>
            <button type="button" data-action="reset-overlay-window"><i class='bx bx-window'></i><span>Resetar posicao/tamanho</span></button>
          </div>
        </div>
        <button type="button" class="danger" data-action="close"><i class='bx bx-x'></i><span>Fechar janela</span></button>
      </div>
    ` : '';
    const heatmapTopButton = `
      <span class="custom-radar-heat-menu-wrap">
        <button type="button" class="custom-radar-icon-btn ${heatmapActive ? 'active' : ''}" data-action="heatmap-menu" title="Mapa de calor: ${escapeHtml(heatmapLabels[heatmapMode] || 'Desligado')}"><i class='bx bxs-flame'></i></button>
        ${heatmapMenu}
      </span>
    `;
    const liveFeedHtml = `
      <div class="custom-radar-live-feed">
        <div class="custom-radar-mini-info"><div class="custom-radar-mini-stack"><div class="custom-radar-mini-score"><span class="home">${escapeHtml(teamAbbr(names.home))}</span><strong>${score.home}x${score.away}</strong><span class="away">${escapeHtml(teamAbbr(names.away))}</span></div><div class="custom-radar-mini-time"><span>${escapeHtml(clock || '--')}</span>${added}</div></div></div>
        <div class="custom-radar-current-event ${escapeHtml(current?.side || '')} ${escapeHtml(type)} ${pinned ? 'is-highlighted' : ''}"><span>${escapeHtml(current?.time || clock || '--')}</span>${eventIcon(current)}<strong>${escapeHtml(currentText)}</strong></div>
        ${listHtml(data)}
      </div>`;
    const periodInfo = clockPeriodInfo(clock);
    const normalizedTickerClock = normalizeMatchText(clock);
    const tickerFinished = normalizedTickerClock.includes('final da partida') || normalizedTickerClock.includes('fim da partida') || normalizedTickerClock.includes('full time') || normalizedTickerClock.includes('match ended');
    const tickerInterval = periodInfo.period === 'interval';
    const periodLabel = tickerFinished || tickerInterval ? '' : periodInfo.period === 'second' ? '2T' : '1T';
    const tickerClock = tickerFinished
      ? 'Final da Partida'
      : tickerInterval
        ? 'Intervalo'
        : String(clock || '--').replace(/^\s*(?:1|2)\s*[º°oª]?\s*t(?:empo)?\s*[-:|–—]\s*/i, '').trim() || '--';
    const tickerAdded = tickerFinished || tickerInterval ? '' : added;
    const tickerInfoHtml = `<div class="custom-radar-ticker-info">
      <span class="custom-radar-ticker-match">${periodLabel ? `<b>${periodLabel}</b>` : ''}<em>${escapeHtml(tickerClock)}</em>${tickerAdded}<strong>${escapeHtml(teamAbbr(names.home))} ${score.home}-${score.away} ${escapeHtml(teamAbbr(names.away))}</strong></span>
      ${statsHtml(data)}
      ${pressureHtml(data, clock)}
    </div>`;
    const tickerLiveFeedHtml = `<div class="custom-radar-live-feed custom-radar-ticker-feed">
      <div class="custom-radar-current-event ${escapeHtml(current?.side || '')} ${escapeHtml(type)} ${pinned ? 'is-highlighted' : ''}"><span>${escapeHtml(current?.time || clock || '--')}</span>${eventIcon(current)}<strong>${escapeHtml(currentText)}</strong></div>
      ${listHtml(data)}
      ${tickerInfoHtml}
    </div>`;
    const statsPanelHtml = `<div class="custom-radar-footer-stats"><div class="custom-radar-footer-title"><i class='bx bx-bar-chart-alt-2'></i><strong>Estatisticas ao vivo</strong></div>${statsHtml(data)}${pressureHtml(data, clock)}</div>`;
    const sofascorePanelHtml = pressureChartActive ? pressureChartHtml(data, clock, names) : '';
    const radarPressurePanelHtml = state.showRadarPressureChart ? radarModPressureChartHtml(data, clock, names) : '';
    const intelligencePanelHtml = state.showLiveIntelligence
      ? liveIntelligenceHtml(data, clock, names)
      : (state.layoutEditMode ? `<div class="custom-radar-intelligence-placeholder"><i class='bx bx-brain'></i><span>Ative a analise avancada na Central de Personalizacao.</span></div>` : '');
    const heatPanelHtml = heatmapActive ? heatmapHtml(data, clock, heatmapMode, names) : '';
    const editModuleHtml = (id, label, html) => {
      if (!html) return '';
      const layout = cardLayoutFor(id);
      const heightStyle = layout.height ? `--radar-module-height:${layout.height}px;` : '--radar-module-height:auto;';
      return `
        <section class="custom-radar-edit-module" data-layout-module="${escapeHtml(id)}" style="--radar-module-order:${layout.order};--radar-module-span:${layout.span};${heightStyle}">
          <div class="custom-radar-edit-module-head" draggable="true" data-layout-drag="${escapeHtml(id)}"><i class='bx bx-grid-vertical'></i><strong>${escapeHtml(label)}</strong><span>${layout.span}/12</span></div>
          <div class="custom-radar-edit-module-body">${html}</div>
          <button type="button" class="custom-radar-module-resize" data-layout-resize="${escapeHtml(id)}" title="Redimensionar card"></button>
        </section>`;
    };
    const overlayMainHtml = `
      <div class="custom-radar-module-grid ${state.layoutEditMode ? 'is-editing' : ''}">
        ${editModuleHtml('radar', 'Radar e eventos', liveFeedHtml)}
        ${editModuleHtml('stats', 'Estatisticas', statsPanelHtml)}
        ${editModuleHtml('sofascore', 'Pressao SofaScore', sofascorePanelHtml)}
        ${editModuleHtml('radar-pressure', 'Pressao Radar MOD', radarPressurePanelHtml)}
        ${editModuleHtml('intelligence', 'Inteligencia ao vivo', intelligencePanelHtml)}
        ${editModuleHtml('heatmap', 'Mapa de calor', heatPanelHtml)}
        ${editModuleHtml('summary', 'Resumo automatico', summaryHtml)}
        ${editModuleHtml('alerts', 'Alertas', alertModuleHtml)}
      </div>`;
    const regularMainHtml = `${liveFeedHtml}<div class="custom-radar-footer-stats"><div class="custom-radar-footer-title"><i class='bx bx-bar-chart-alt-2'></i><strong>Estatisticas ao vivo</strong></div>${statsHtml(data)}${pressureHtml(data, clock)}${sofascorePanelHtml}${radarPressurePanelHtml}${intelligencePanelHtml}${heatPanelHtml}</div>${alertBannerHtml}${summaryHtml}`;
    const tickerMainHtml = `${tickerLiveFeedHtml}${sofascorePanelHtml}${radarPressurePanelHtml}${intelligencePanelHtml}${heatPanelHtml}${alertBannerHtml}${summaryHtml}`;
    modal.setAttribute('data-layout-edit', state.layoutEditMode ? '1' : '0');
    content.innerHTML = `
      <div class="custom-radar-window-toolbar ${state.toolbarCollapsed ? 'is-collapsed' : ''}">
        <button type="button" class="custom-radar-icon-btn custom-radar-toolbar-toggle" data-action="toolbar-toggle" title="${state.toolbarCollapsed ? 'Expandir controles' : 'Recolher controles'}" aria-label="${state.toolbarCollapsed ? 'Expandir controles' : 'Recolher controles'}"><i class='bx ${state.toolbarCollapsed ? 'bx-chevron-left' : 'bx-chevron-right'}'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="theme" title="Alternar tema"><i class='bx ${state.theme === 'light' ? 'bx-moon' : 'bx-sun'}'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="overlay" title="Alternar fundo limpo/painel"><i class='bx bx-layer'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="density" title="Alternar formato largo/achatado"><i class='bx bx-expand-horizontal'></i></button>
        <button type="button" class="custom-radar-icon-btn ${state.radarLayout === 'ticker' ? 'active' : ''}" data-action="radar-layout" title="Alternar layout atual/faixa compacta"><i class='bx bx-list-ul'></i></button>
        <button type="button" class="custom-radar-icon-btn ${pressureChartActive ? 'active pressure-active' : ''}" data-action="pressure-chart" title="${pressureChartActive ? 'Ocultar grafico de pressao' : 'Mostrar grafico de pressao'}"><i class='bx bx-bar-chart-alt-2'></i></button>
        <button type="button" class="custom-radar-icon-btn ${state.showRadarPressureChart ? 'active radar-pressure-active' : ''}" data-action="radar-pressure-chart" title="${state.showRadarPressureChart ? 'Ocultar grafico Radar MOD' : 'Mostrar grafico Radar MOD'}"><i class='bx bx-bar-chart-square'></i></button>
        ${oddsMenuHtml('toolbar')}
        <button type="button" class="custom-radar-icon-btn ${state.showIconGallery ? 'active' : ''}" data-action="icon-gallery" title="Central de personalizacao"><i class='bx bx-slider-alt'></i></button>
        ${heatmapTopButton}
        <button type="button" class="custom-radar-icon-btn" data-action="highlight" title="Destacar area"><i class='bx bx-crop'></i></button>
        <button type="button" class="custom-radar-icon-btn" data-action="close" title="Fechar"><i class='bx bx-x'></i></button>
      </div>
      <header class="custom-radar-header">
        <div class="custom-radar-title"><span class="custom-radar-kicker">MOD proprio ${data ? 'ao vivo' : 'conectando'}</span><h2>${escapeHtml(names.home)} <span>vs</span> ${escapeHtml(names.away)}</h2><p>${escapeHtml(state.error || event.name || '')}</p></div>
        <div class="custom-radar-actions">
          <button type="button" class="custom-radar-icon-btn" data-action="theme" title="Alternar tema"><i class='bx ${state.theme === 'light' ? 'bx-moon' : 'bx-sun'}'></i></button>
          <button type="button" class="custom-radar-icon-btn" data-action="overlay" title="Alternar fundo limpo/painel"><i class='bx bx-layer'></i></button>
          <button type="button" class="custom-radar-icon-btn" data-action="density" title="Alternar formato largo/achatado"><i class='bx bx-expand-horizontal'></i></button>
          <button type="button" class="custom-radar-icon-btn ${state.radarLayout === 'ticker' ? 'active' : ''}" data-action="radar-layout" title="Alternar layout atual/faixa compacta"><i class='bx bx-list-ul'></i></button>
          <button type="button" class="custom-radar-icon-btn ${pressureChartActive ? 'active pressure-active' : ''}" data-action="pressure-chart" title="${pressureChartActive ? 'Ocultar grafico de pressao' : 'Mostrar grafico de pressao'}"><i class='bx bx-bar-chart-alt-2'></i></button>
          <button type="button" class="custom-radar-icon-btn ${state.showRadarPressureChart ? 'active radar-pressure-active' : ''}" data-action="radar-pressure-chart" title="${state.showRadarPressureChart ? 'Ocultar grafico Radar MOD' : 'Mostrar grafico Radar MOD'}"><i class='bx bx-bar-chart-square'></i></button>
          ${oddsMenuHtml('header')}
          <button type="button" class="custom-radar-icon-btn ${state.showIconGallery ? 'active' : ''}" data-action="icon-gallery" title="Central de personalizacao"><i class='bx bx-slider-alt'></i></button>
          ${heatmapTopButton}
          <button type="button" class="custom-radar-icon-btn" data-action="highlight" title="Destacar area"><i class='bx bx-crop'></i></button>
          <button type="button" class="custom-radar-icon-btn" data-action="close" title="Fechar"><i class='bx bx-x'></i></button>
        </div>
      </header>
      <div class="custom-radar-scorebar">
        <div class="custom-radar-team home">${renderLogo(event.i, names.home)}<strong>${escapeHtml(names.home)}</strong></div>
        <div class="custom-radar-score"><span>${score.home}</span><small>${escapeHtml(clock || '--')} ${added}</small><span>${score.away}</span></div>
        <div class="custom-radar-team away"><strong>${escapeHtml(names.away)}</strong>${renderLogo(event.j, names.away)}</div>
      </div>
      ${state.showIconGallery && !state.overlayReplica ? radarIconGalleryHtml() : ''}
      <div class="custom-radar-layout custom-radar-event-layout">
        <div class="custom-radar-main">
          ${state.radarLayout === 'ticker' ? tickerMainHtml : state.overlayReplica ? overlayMainHtml : regularMainHtml}
        </div>
        <aside class="custom-radar-side custom-radar-tools">
          <div class="custom-radar-controls"><button type="button" class="${state.showOdds ? 'active' : ''}" data-action="odds"><i class='bx bx-money'></i> Odds</button><button type="button" class="${state.showMeta ? 'active' : ''}" data-action="meta"><i class='bx bx-data'></i> IDs</button><button type="button" class="${state.showIconGallery ? 'active' : ''}" data-action="icon-gallery"><i class='bx bx-slider-alt'></i> Personalizar</button><button type="button" class="${pressureChartActive ? 'active' : ''}" data-action="pressure-chart"><i class='bx bx-bar-chart-alt-2'></i> Pressao</button><button type="button" class="${state.showRadarPressureChart ? 'active' : ''}" data-action="radar-pressure-chart"><i class='bx bx-bar-chart-square'></i> Radar MOD</button><button type="button" class="${heatmapActive ? 'active' : ''}" data-action="heatmap-menu"><i class='bx bxs-flame'></i> ${escapeHtml(heatmapLabels[heatmapMode] || 'Calor')}</button><button type="button" class="custom-radar-highlight-action" data-action="highlight"><i class='bx bx-crop'></i> Destacar</button></div>
          ${state.showOdds ? `<div class="custom-radar-card"><h3><i class='bx bx-line-chart'></i> William Hill</h3><div class="custom-radar-odds-grid">${odds(event).map(item => `<div class="custom-radar-odd"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join('') || '<p class="custom-radar-muted">Odds indisponiveis para este evento.</p>'}</div></div>` : ''}
          ${state.showMeta ? `<div class="custom-radar-card"><h3><i class='bx bx-fingerprint'></i> Fontes</h3><dl class="custom-radar-meta"><dt>Event ID</dt><dd>${escapeHtml(event.id || '-')}</dd><dt>WH Entity</dt><dd>${escapeHtml(event.rawEntityId || '-')}</dd><dt>ID Bolsa</dt><dd>${escapeHtml(idBolsa || '-')}</dd><dt>Sofascore</dt><dd>${escapeHtml(event.sofascoreId || '-')}</dd><dt>365Scores</dt><dd>${escapeHtml(event.scores365PartnerId || event.matchId || '-')}</dd></dl></div>` : ''}
          <div class="custom-radar-links">${sportUrl ? `<a href="${escapeHtml(sportUrl)}" target="_blank"><i class='bx bx-world'></i> Widget mRadar</a>` : ''}<a href="${escapeHtml(whUrl)}" target="_blank"><i class='bx bx-crosshair'></i> WRadar original</a>${event.packLink ? `<a href="${escapeHtml(event.packLink)}" target="_blank"><i class='bx bx-football'></i> Packball</a>` : ''}</div>
        </aside>
      </div>
      ${fontMenu}`;
    if (state.overlayReplica) {
      content.insertAdjacentHTML('beforeend', '<button type="button" class="custom-radar-resize-handle" title="Redimensionar"></button>');
    }
    restoreScroll(previousScroll);
  }

  function restoreScroll(previousScroll) {
    if (!previousScroll?.keep) return;
    const list = $('.custom-radar-comment-list');
    if (!list) return;
    const delta = Math.max(0, list.scrollHeight - previousScroll.height);
    list.scrollTop = previousScroll.top + delta;
  }

  function scheduleRender() {
    clearTimeout(state.deferredTimer);
    if (state.colorPickerActive || Date.now() < state.interactingUntil) {
      state.deferredTimer = setTimeout(scheduleRender, 260);
      return;
    }
    requestAnimationFrame(render);
  }

  function setupOverlayDrag() {
    if (!state.overlayReplica || !window.traderWRadarRealMod?.dragOverlayWindow) return;
    const drag = {
      active: false,
      moved: false,
      pointerId: null,
      startX: 0,
      startY: 0
    };
    const pointFromEvent = event => ({
      x: Number(event.screenX) || 0,
      y: Number(event.screenY) || 0
    });

    document.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      if (event.target.closest('.custom-radar-resize-handle')) return;
      if (state.layoutEditMode && event.target.closest('.custom-radar-edit-module')) return;
      drag.active = true;
      drag.moved = false;
      drag.pointerId = event.pointerId;
      drag.startX = event.screenX;
      drag.startY = event.screenY;
      window.traderWRadarRealMod.dragOverlayWindow({ phase: 'start', ...pointFromEvent(event) });
      event.target.setPointerCapture?.(event.pointerId);
    }, true);

    document.addEventListener('pointermove', event => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      if (Math.abs(event.screenX - drag.startX) > 3 || Math.abs(event.screenY - drag.startY) > 3) {
        drag.moved = true;
      }
      window.traderWRadarRealMod.dragOverlayWindow({ phase: 'move', ...pointFromEvent(event) });
      if (drag.moved) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    const endDrag = event => {
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      window.traderWRadarRealMod.dragOverlayWindow({ phase: 'end' });
      drag.active = false;
      drag.pointerId = null;
    };

    document.addEventListener('pointerup', endDrag, true);
    document.addEventListener('pointercancel', endDrag, true);
    document.addEventListener('click', event => {
      if (!drag.moved) return;
      drag.moved = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  async function startFeed() {
    if (!window.traderWRadarRealMod?.startFeed) {
      state.error = 'Feed real disponivel apenas no app desktop Electron.';
      render();
      return;
    }
    const result = await window.traderWRadarRealMod.startFeed({
      eventId: state.event.id,
      title: state.event.name || '',
      locale: 'pt-pt'
    });
    state.feedId = result.feedId;
  }

  function init() {
    const params = new URLSearchParams(location.search);
    const encoded = params.get('payload') || '';
    try {
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0)));
      state.payload = JSON.parse(json || '{}');
    } catch (_) {
      state.payload = {};
    }
    state.event = state.payload.event || {};
    if (state.payload.settings?.heatmapMode) {
      state.heatmapMode = state.payload.settings.heatmapMode;
    } else if (state.payload.settings && typeof state.payload.settings.showHeatmap === 'boolean') {
      state.heatmapMode = state.payload.settings.showHeatmap ? 'match' : 'off';
    }
    state.overlayReplica = !!state.payload.overlayReplica;
    if (state.overlayReplica) {
      state.density = 'compact';
      state.cleanOverlay = true;
      document.body.classList.add('custom-radar-overlay-replica');
      setupOverlayDrag();
      window.traderWRadarRealMod?.overlayState?.()
        .then(result => {
          if (result?.ok) {
            state.overlayAlwaysOnTop = !!result.alwaysOnTop;
            render();
          }
        })
        .catch(() => {});
    }
    document.title = `Radar MOD - ${state.event.name || ''}`;
    render();
    window.traderWRadarRealMod?.onUpdate?.(payload => {
      if (!payload || payload.feedId !== state.feedId) return;
      if (payload.error) {
        state.error = payload.error;
        scheduleRender();
        return;
      }
      const nextSignature = signature(payload.data);
      if (nextSignature === state.lastSignature) return;
      state.lastSignature = nextSignature;
      state.error = '';
      state.realData = payload.data || null;
      if (state.showPressureChart && getSofascoreEventId()) fetchSofascorePressureGraph(false).catch(() => {});
      if (state.showRadarPressureChart && getSofascoreEventId()) fetchSofascorePlayerEvents(false).catch(() => {});
      scheduleRender();
    });
    scheduleSofascorePressureGraph(true);
    scheduleSofascorePlayerEvents(true);
    startFeed().catch(error => {
      state.error = error?.message || 'Nao foi possivel iniciar o feed real.';
      render();
    });
  }

  window.__customRadarOverlaySnapshot = () => ({
    event: state.event,
    density: state.density,
    cleanOverlay: true
  });
  window.__customRadarNativeMenuState = () => ({
    fontScale: clampFontScale(state.fontScale),
    overlayOpacity: clampOverlayOpacity(state.overlayOpacity),
    overlayContentMode: state.overlayContentMode,
    showPressureChart: !!state.showPressureChart,
    showRadarPressureChart: !!state.showRadarPressureChart,
    heatmapMode: state.heatmapMode,
    heatmapStyle: state.heatmapStyle,
    showLiveIntelligence: !!state.showLiveIntelligence,
    intelligenceSettings: Object.fromEntries(Object.keys(defaultIntelligenceSettings).map(key => [key, intelligenceSetting(key)])),
    alertSettings: Object.fromEntries(Object.keys(defaultAlertSettings).map(key => [key, alertSetting(key)])),
    showAutoSummary: !!state.showAutoSummary,
    radarLayout: state.radarLayout,
    layoutEditMode: !!state.layoutEditMode
  });
  window.__customRadarNativeMenuAction = payload => {
    const action = String(payload?.action || '');
    const value = payload?.value;
    if (action === 'font-scale-down') setFontScale(state.fontScale - 0.08);
    else if (action === 'font-scale-reset') setFontScale(1);
    else if (action === 'font-scale-up') setFontScale(state.fontScale + 0.08);
    else if (action === 'font-scale') setFontScale(Number(value) || 1);
    else if (action === 'radar-layout' && ['standard', 'ticker'].includes(value)) {
      state.radarLayout = value;
      localStorage.setItem('custom_wradar_mod_layout', value);
    }
    else if (action === 'overlay-opacity') setOverlayOpacity((Number(value) || 100) / 100);
    else if (action === 'overlay-content' && ['current', 'events', 'full'].includes(value)) {
      state.overlayContentMode = value;
      localStorage.setItem('custom_wradar_mod_overlay_content_mode', state.overlayContentMode);
    } else if (action === 'toggle-pressure-chart') {
      state.showPressureChart = !state.showPressureChart;
      localStorage.setItem('custom_wradar_mod_show_pressure_chart', state.showPressureChart ? '1' : '0');
      if (state.showPressureChart) scheduleSofascorePressureGraph(true);
      else clearTimeout(state.sofascoreGraphTimer);
    } else if (action === 'toggle-radar-pressure-chart') {
      state.showRadarPressureChart = !state.showRadarPressureChart;
      localStorage.setItem('custom_wradar_mod_show_radar_pressure_chart', state.showRadarPressureChart ? '1' : '0');
      if (state.showRadarPressureChart) scheduleSofascorePlayerEvents(true);
      else clearTimeout(state.sofascorePlayerEventsTimer);
    } else if (action === 'heatmap-mode' && ['off', 'match', 'home', 'away', 'teams'].includes(value)) {
      state.heatmapMode = value;
      localStorage.setItem('custom_wradar_mod_heatmap_mode', state.heatmapMode);
      localStorage.setItem('custom_wradar_mod_show_heatmap', state.heatmapMode === 'off' ? '0' : '1');
    } else if (action === 'heatmap-style' && ['candles', 'dots', 'wave', 'bar'].includes(value)) {
      state.heatmapStyle = value;
      localStorage.setItem('custom_wradar_mod_heatmap_style', state.heatmapStyle);
    } else if (action === 'toggle-live-intelligence') {
      state.showLiveIntelligence = !state.showLiveIntelligence;
      localStorage.setItem('custom_wradar_mod_show_live_intelligence', state.showLiveIntelligence ? '1' : '0');
    } else if (action === 'intelligence-setting' && Object.prototype.hasOwnProperty.call(defaultIntelligenceSettings, value)) {
      state.intelligenceSettings = { ...(state.intelligenceSettings || {}), [value]: !intelligenceSetting(value) };
      saveIntelligenceSettings();
    } else if (action === 'toggle-alerts') {
      state.alertSettings = { ...(state.alertSettings || {}), enabled: !alertSetting('enabled') };
      saveAlertSettings();
    } else if (action === 'alert-setting' && Object.prototype.hasOwnProperty.call(defaultAlertSettings, value) && value !== 'enabled') {
      state.alertSettings = { ...(state.alertSettings || {}), [value]: !alertSetting(value) };
      saveAlertSettings();
    } else if (action === 'toggle-auto-summary') {
      state.showAutoSummary = !state.showAutoSummary;
      localStorage.setItem('custom_wradar_mod_show_auto_summary', state.showAutoSummary ? '1' : '0');
    } else if (action === 'toggle-layout-editor') {
      state.layoutEditMode = !state.layoutEditMode;
      state.interactingUntil = Date.now() + 500;
    } else if (action === 'reset-card-layout') {
      resetCardLayout();
    }
    state.fontMenuOpen = false;
    state.heatmapMenuOpen = false;
    render();
    return window.__customRadarNativeMenuState();
  };

  document.addEventListener('click', event => {
    const target = event.target;
    const action = target.closest('[data-action]')?.getAttribute('data-action');
    const insideFontMenu = !!target.closest('.custom-radar-font-menu');
    const insideOddsMenu = !!target.closest('.custom-radar-odds-menu-wrap');
    if (action === 'color-change') {
      state.colorPickerActive = true;
      state.interactingUntil = Date.now() + 120000;
      return;
    }
    if (state.fontMenuOpen && !insideFontMenu) {
      state.fontMenuOpen = false;
      render();
      return;
    }
    if (state.oddsMenuOpen && !insideOddsMenu) {
      state.oddsMenuOpen = false;
      state.oddsMenuAnchor = '';
      render();
      return;
    }
    if (action === 'font-submenu') {
      const submenu = target.closest('[data-submenu]')?.dataset?.submenu || 'font';
      state.activeFontSubmenu = ['font', 'background', 'content', 'heatmap', 'window'].includes(submenu) ? submenu : 'font';
      render();
      return;
    }
    if (action === 'toolbar-toggle') {
      state.toolbarCollapsed = !state.toolbarCollapsed;
      state.heatmapMenuOpen = false;
      localStorage.setItem('custom_wradar_mod_toolbar_collapsed', state.toolbarCollapsed ? '1' : '0');
      render();
      return;
    }
    if (action === 'theme') {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('custom_wradar_mod_theme', state.theme);
      render();
      return;
    }
    if (action === 'overlay') {
      state.cleanOverlay = !state.cleanOverlay;
      render();
      return;
    }
    if (action === 'density') {
      state.density = state.density === 'compact' ? 'wide' : 'compact';
      localStorage.setItem('custom_wradar_mod_density', state.density);
      render();
      return;
    }
    if (action === 'radar-layout') {
      state.radarLayout = state.radarLayout === 'ticker' ? 'standard' : 'ticker';
      localStorage.setItem('custom_wradar_mod_layout', state.radarLayout);
      render();
      return;
    }
    if (action === 'font-scale-down') {
      setFontScale(state.fontScale - 0.08);
      render();
      return;
    }
    if (action === 'font-scale-reset') {
      setFontScale(1);
      render();
      return;
    }
    if (action === 'font-scale-up') {
      setFontScale(state.fontScale + 0.08);
      render();
      return;
    }
    if (action === 'overlay-dim-down') {
      setOverlayDim(state.overlayDim - 0.12);
      render();
      return;
    }
    if (action === 'overlay-dim-toggle') {
      setOverlayDim(state.overlayDim > 0 ? 0 : 0.24);
      render();
      return;
    }
    if (action === 'overlay-dim-reset') {
      setOverlayDim(0);
      render();
      return;
    }
    if (action === 'overlay-dim-up') {
      setOverlayDim(state.overlayDim + 0.12);
      render();
      return;
    }
    if (action === 'overlay-opacity') {
      const opacity = Number(target.closest('[data-opacity]')?.dataset?.opacity) || 100;
      setOverlayOpacity(opacity / 100);
      render();
      return;
    }
    if (action === 'overlay-content-current' || action === 'overlay-content-events' || action === 'overlay-content-full') {
      state.overlayContentMode = action.replace('overlay-content-', '');
      localStorage.setItem('custom_wradar_mod_overlay_content_mode', state.overlayContentMode);
      if (!insideFontMenu) state.fontMenuOpen = false;
      render();
      return;
    }
    if (action === 'toggle-pressure-chart') {
      state.showPressureChart = !state.showPressureChart;
      localStorage.setItem('custom_wradar_mod_show_pressure_chart', state.showPressureChart ? '1' : '0');
      if (state.showPressureChart) scheduleSofascorePressureGraph(true);
      else clearTimeout(state.sofascoreGraphTimer);
      if (!insideFontMenu) state.fontMenuOpen = false;
      render();
      return;
    }
    if (action === 'toggle-radar-pressure-chart') {
      state.showRadarPressureChart = !state.showRadarPressureChart;
      localStorage.setItem('custom_wradar_mod_show_radar_pressure_chart', state.showRadarPressureChart ? '1' : '0');
      if (state.showRadarPressureChart) scheduleSofascorePlayerEvents(true);
      else clearTimeout(state.sofascorePlayerEventsTimer);
      if (!insideFontMenu) state.fontMenuOpen = false;
      render();
      return;
    }
    if (action === 'toggle-heatmap') {
      state.heatmapMode = state.heatmapMode === 'off' ? 'match' : 'off';
      localStorage.setItem('custom_wradar_mod_heatmap_mode', state.heatmapMode);
      localStorage.setItem('custom_wradar_mod_show_heatmap', state.heatmapMode === 'off' ? '0' : '1');
      if (!insideFontMenu) state.fontMenuOpen = false;
      render();
      return;
    }
    if (action === 'toggle-always-on-top') {
      window.traderWRadarRealMod?.toggleOverlayAlwaysOnTop?.()
        .then(result => {
          if (result?.ok) state.overlayAlwaysOnTop = !!result.alwaysOnTop;
          render();
        })
        .catch(() => render());
      if (!insideFontMenu) state.fontMenuOpen = false;
      return;
    }
    if (action === 'reset-overlay-window') {
      window.traderWRadarRealMod?.resetOverlayWindow?.().catch(() => {});
      if (!insideFontMenu) state.fontMenuOpen = false;
      render();
      return;
    }
    if (action === 'highlight') {
      window.traderDesktopHighlight?.startSelection?.();
      return;
    }
    if (action === 'close') {
      window.close();
      return;
    }
    if (action === 'clear-pin') {
      state.pinnedKey = '';
      state.pinnedIndex = null;
      render();
      return;
    }
    if (action === 'odds') {
      state.showOdds = !state.showOdds;
      localStorage.setItem('custom_wradar_mod_show_odds', state.showOdds ? '1' : '0');
      render();
      return;
    }
    if (action === 'public-odds') {
      const teams = splitTeams(state.event || {});
      window.traderPublicOdds?.openWindow?.({ home: teams.home, away: teams.away, title: state.event?.name || '' });
      return;
    }
    if (action === 'public-odds-menu') {
      const anchor = target.closest('[data-odds-anchor]')?.dataset?.oddsAnchor || 'toolbar';
      const closeCurrent = state.oddsMenuOpen && state.oddsMenuAnchor === anchor;
      state.oddsMenuOpen = !closeCurrent;
      state.oddsMenuAnchor = closeCurrent ? '' : anchor;
      render();
      return;
    }
    if (action === 'public-odds-mode') {
      const teams = splitTeams(state.event || {});
      const clock = state.realData?.clock || state.event?.minute || '';
      const period = clockPeriodInfo(clock).period;
      const fallback = normalizeScore(state.event || {});
      const score = {
        home: Number.isFinite(state.realData?.score?.home) ? state.realData.score.home : Number(fallback.home || 0),
        away: Number.isFinite(state.realData?.score?.away) ? state.realData.score.away : Number(fallback.away || 0)
      };
      const viewMode = target.closest('[data-odds-mode]')?.dataset?.oddsMode || 'mo';
      state.oddsMenuOpen = false;
      state.oddsMenuAnchor = '';
      window.traderPublicOdds?.openOverlay?.({ home: teams.home, away: teams.away, title: state.event?.name || '', viewMode, period, clock, score });
      render();
      return;
    }
    if (action === 'meta') {
      state.showMeta = !state.showMeta;
      localStorage.setItem('custom_wradar_mod_show_meta', state.showMeta ? '1' : '0');
      render();
      return;
    }
    if (action === 'personalization-tab') {
      const tab = target.closest('[data-tab]')?.dataset?.tab || 'profiles';
      state.personalizationTab = personalizationTabs.some(item => item[0] === tab) ? tab : 'profiles';
      localStorage.setItem('custom_wradar_mod_personalization_tab', state.personalizationTab);
      refreshPersonalizationModal();
      return;
    }
    if (action === 'profile-apply') {
      applyVisualProfile(target.closest('[data-profile]')?.dataset?.profile || 'custom');
      render();
      return;
    }
    if (action === 'profile-save-custom') {
      localStorage.setItem('custom_wradar_mod_custom_profile', JSON.stringify(currentVisualProfile()));
      state.visualProfile = 'custom';
      localStorage.setItem('custom_wradar_mod_visual_profile', 'custom');
      render();
      return;
    }
    if (action === 'alert-setting') {
      const input = target.closest('input[data-setting]');
      if (!input) return;
      state.alertSettings = { ...(state.alertSettings || {}), [input.dataset.setting]: !!input.checked };
      saveAlertSettings();
      return;
    }
    if (action === 'summary-toggle') {
      const input = target.closest('input');
      state.showAutoSummary = !!input?.checked;
      localStorage.setItem('custom_wradar_mod_show_auto_summary', state.showAutoSummary ? '1' : '0');
      render();
      return;
    }
    if (action === 'intelligence-toggle') {
      const input = target.closest('input');
      state.showLiveIntelligence = !!input?.checked;
      localStorage.setItem('custom_wradar_mod_show_live_intelligence', state.showLiveIntelligence ? '1' : '0');
      render();
      return;
    }
    if (action === 'components-reset') {
      state.componentSettings = {};
      saveComponentSettings();
      render();
      return;
    }
    if (action?.startsWith('component-')) {
      const button = target.closest('[data-component]');
      const key = button?.dataset?.component;
      if (!componentLabels[key]) return;
      const current = componentSetting(key);
      if (action === 'component-scale-down') current.scale = clampComponentScale(current.scale - 0.1);
      if (action === 'component-scale-up') current.scale = clampComponentScale(current.scale + 0.1);
      if (action === 'component-opacity-down') current.opacity = clampComponentOpacity(current.opacity - 0.1);
      if (action === 'component-opacity-up') current.opacity = clampComponentOpacity(current.opacity + 0.1);
      state.componentSettings = { ...(state.componentSettings || {}), [key]: current };
      saveComponentSettings();
      state.visualProfile = 'custom';
      localStorage.setItem('custom_wradar_mod_visual_profile', 'custom');
      const modalElement = $('.custom-wradar-modal');
      modalElement?.style.setProperty(`--custom-radar-${key}-scale`, String(current.scale));
      modalElement?.style.setProperty(`--custom-radar-${key}-opacity`, String(current.opacity));
      const values = button.closest('.custom-radar-component-row')?.querySelectorAll('b') || [];
      if (values[0]) values[0].textContent = `${Math.round(current.scale * 100)}%`;
      if (values[1]) values[1].textContent = `${Math.round(current.opacity * 100)}%`;
      return;
    }
    if (action === 'colors-reset') {
      state.colorSettings = {};
      saveColorSettings();
      render();
      return;
    }
    if (action === 'icon-gallery') {
      state.showIconGallery = !state.showIconGallery;
      localStorage.setItem('custom_wradar_mod_show_icon_gallery', state.showIconGallery ? '1' : '0');
      render();
      return;
    }
    if (action === 'radar-icon-scale-down') {
      setRadarIconScale(state.radarIconScale - 0.1);
      render();
      return;
    }
    if (action === 'radar-icon-scale-up') {
      setRadarIconScale(state.radarIconScale + 0.1);
      render();
      return;
    }
    if (action === 'radar-icon-scale-reset') {
      setRadarIconScale(1);
      render();
      return;
    }
    if (action === 'pressure-icon-scale-down') {
      setPressureIconScale(state.pressureIconScale - 0.1);
      render();
      return;
    }
    if (action === 'pressure-icon-scale-up') {
      setPressureIconScale(state.pressureIconScale + 0.1);
      render();
      return;
    }
    if (action === 'pressure-icon-scale-reset') {
      setPressureIconScale(1);
      render();
      return;
    }
    if (action === 'icon-reset-all') {
      state.customIconMap = {};
      saveCustomIconMap();
      setRadarIconScale(1);
      setPressureIconScale(1);
      render();
      return;
    }
    if (action === 'icon-change') {
      const type = target.closest('[data-icon-type]')?.dataset?.iconType || '';
      if (!type || !window.traderWRadarRealMod?.chooseRadarIcon) return;
      window.traderWRadarRealMod.chooseRadarIcon({ type })
        .then(result => {
          if (!result?.ok || !result.icon?.src) return;
          state.customIconMap = { ...(state.customIconMap || {}), [type]: result.icon };
          saveCustomIconMap();
          render();
        })
        .catch(() => {});
      return;
    }
    if (action === 'icon-reset') {
      const type = target.closest('[data-icon-type]')?.dataset?.iconType || '';
      if (!type) return;
      const next = { ...(state.customIconMap || {}) };
      delete next[type];
      state.customIconMap = next;
      saveCustomIconMap();
      render();
      return;
    }
    if (action === 'pressure-chart') {
      state.showPressureChart = !state.showPressureChart;
      localStorage.setItem('custom_wradar_mod_show_pressure_chart', state.showPressureChart ? '1' : '0');
      if (state.showPressureChart) {
        scheduleSofascorePressureGraph(true);
      } else {
        clearTimeout(state.sofascoreGraphTimer);
      }
      render();
      return;
    }
    if (action === 'radar-pressure-chart') {
      state.showRadarPressureChart = !state.showRadarPressureChart;
      localStorage.setItem('custom_wradar_mod_show_radar_pressure_chart', state.showRadarPressureChart ? '1' : '0');
      if (state.showRadarPressureChart) scheduleSofascorePlayerEvents(true);
      else clearTimeout(state.sofascorePlayerEventsTimer);
      render();
      return;
    }
    if (action === 'heatmap-menu') {
      state.heatmapMenuOpen = !state.heatmapMenuOpen;
      render();
      return;
    }
    if (action === 'heatmap-mode') {
      const mode = target.closest('[data-mode]')?.dataset?.mode || 'off';
      state.heatmapMode = ['off', 'match', 'home', 'away', 'teams'].includes(mode) ? mode : 'off';
      state.heatmapMenuOpen = false;
      localStorage.setItem('custom_wradar_mod_heatmap_mode', state.heatmapMode);
      localStorage.setItem('custom_wradar_mod_show_heatmap', state.heatmapMode === 'off' ? '0' : '1');
      render();
      return;
    }
    if (action === 'heatmap-style') {
      const style = target.closest('[data-style]')?.dataset?.style || 'candles';
      state.heatmapStyle = ['dots', 'wave', 'bar'].includes(style) ? style : 'candles';
      localStorage.setItem('custom_wradar_mod_heatmap_style', state.heatmapStyle);
      state.heatmapMenuOpen = false;
      render();
      return;
    }
  });

  document.addEventListener('input', event => {
    const input = event.target.closest('input[data-action="color-change"]');
    if (!input) return;
    const key = input.dataset.colorKey;
    if (!(key in defaultColorSettings) || !/^#[0-9a-f]{6}$/i.test(input.value)) return;
    const previousColor = colorSetting(key);
    state.colorSettings = { ...(state.colorSettings || {}), [key]: input.value };
    saveColorSettings();
    const modal = $('.custom-wradar-modal');
    modal?.style.setProperty(`--custom-radar-color-${key}`, input.value);
    const label = input.parentElement?.querySelector('b');
    if (label) label.textContent = input.value;
    document.querySelectorAll(`[data-preview-color="${key}"]`).forEach(element => {
      if (element.closest('.custom-radar-preview-score')) element.style.color = input.value;
      else element.style.background = input.value;
    });
    document.querySelectorAll('svg [fill], svg [stroke], svg stop[stop-color]').forEach(element => {
      ['fill', 'stroke', 'stop-color'].forEach(attribute => {
        if (String(element.getAttribute(attribute) || '').toLowerCase() === String(previousColor).toLowerCase()) {
          element.setAttribute(attribute, input.value);
        }
      });
    });
  });
  const finishColorPickerInteraction = () => {
    if (!state.colorPickerActive) return;
    state.colorPickerActive = false;
    state.interactingUntil = 0;
    scheduleRender();
  };
  document.addEventListener('change', event => {
    if (!event.target.matches('input[data-action="color-change"]')) return;
    setTimeout(finishColorPickerInteraction, 120);
  });
  window.addEventListener('focus', () => {
    if (state.colorPickerActive) setTimeout(finishColorPickerInteraction, 220);
  });

  document.addEventListener('wheel', event => {
    const list = event.target.closest('.custom-radar-comment-list');
    if (!list) return;
    event.preventDefault();
    const row = list.querySelector('.custom-radar-comment');
    const step = Math.max(24, Math.round(row?.getBoundingClientRect?.().height || 34));
    list.scrollTop += Math.sign(event.deltaY || 1) * step;
    state.interactingUntil = Date.now() + 700;
  }, { passive: false });
  let draggedLayoutModuleId = '';
  document.addEventListener('dragstart', event => {
    const handle = event.target.closest('[data-layout-drag]');
    if (!handle || !state.overlayReplica || !state.layoutEditMode) {
      if (handle) event.preventDefault();
      return;
    }
    draggedLayoutModuleId = handle.dataset.layoutDrag || '';
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedLayoutModuleId);
    handle.closest('.custom-radar-edit-module')?.classList.add('is-dragging');
    state.interactingUntil = Date.now() + 10000;
  });
  document.addEventListener('dragover', event => {
    if (!draggedLayoutModuleId || !state.layoutEditMode || !event.target.closest('[data-layout-module]')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });
  document.addEventListener('drop', event => {
    const targetModule = event.target.closest('[data-layout-module]');
    if (!targetModule || !draggedLayoutModuleId || !state.layoutEditMode) return;
    event.preventDefault();
    const targetId = targetModule.dataset.layoutModule || '';
    if (targetId && targetId !== draggedLayoutModuleId) {
      const sourceLayout = cardLayoutFor(draggedLayoutModuleId);
      const targetLayout = cardLayoutFor(targetId);
      state.cardLayout = {
        ...(state.cardLayout || {}),
        [draggedLayoutModuleId]: { ...sourceLayout, order: targetLayout.order },
        [targetId]: { ...targetLayout, order: sourceLayout.order }
      };
      saveCardLayout();
    }
    draggedLayoutModuleId = '';
    state.interactingUntil = Date.now() + 250;
    render();
  });
  document.addEventListener('dragend', event => {
    event.target.closest('.custom-radar-edit-module')?.classList.remove('is-dragging');
    draggedLayoutModuleId = '';
    state.interactingUntil = Date.now() + 250;
  });
  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-layout-resize]');
    if (!handle || !state.overlayReplica || !state.layoutEditMode || event.button !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const moduleId = handle.dataset.layoutResize || '';
    const module = handle.closest('[data-layout-module]');
    const grid = module?.closest('.custom-radar-module-grid');
    if (!moduleId || !module || !grid) return;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const startLayout = cardLayoutFor(moduleId);
    const startHeight = module.getBoundingClientRect().height;
    const gridWidth = Math.max(120, grid.getBoundingClientRect().width);
    handle.setPointerCapture?.(pointerId);
    state.interactingUntil = Date.now() + 10000;

    const onMove = moveEvent => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      moveEvent.stopImmediatePropagation();
      const span = Math.max(3, Math.min(12, startLayout.span + Math.round(((moveEvent.clientX - startX) / gridWidth) * 12)));
      const height = Math.max(56, Math.min(600, Math.round(startHeight + (moveEvent.clientY - startY))));
      state.cardLayout = { ...(state.cardLayout || {}), [moduleId]: { ...startLayout, span, height } };
      module.style.setProperty('--radar-module-span', String(span));
      module.style.setProperty('--radar-module-height', `${height}px`);
      const sizeLabel = module.querySelector('.custom-radar-edit-module-head span');
      if (sizeLabel) sizeLabel.textContent = `${span}/12`;
    };
    const onEnd = endEvent => {
      if (endEvent.pointerId !== pointerId) return;
      saveCardLayout();
      state.interactingUntil = Date.now() + 250;
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onEnd, true);
      document.removeEventListener('pointercancel', onEnd, true);
      render();
    };
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onEnd, true);
    document.addEventListener('pointercancel', onEnd, true);
  }, true);
  document.addEventListener('contextmenu', event => {
    if (!state.overlayReplica) return;
    event.preventDefault();
    state.fontMenuOpen = false;
    window.traderWRadarRealMod?.showOverlayMenu?.();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (state.showIconGallery) {
      state.showIconGallery = false;
      localStorage.setItem('custom_wradar_mod_show_icon_gallery', '0');
      render();
      return;
    }
    if (state.fontMenuOpen) {
      state.fontMenuOpen = false;
      render();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (event.target.closest('.custom-radar-comment-list')) state.interactingUntil = Date.now() + 700;
  });
  document.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.custom-radar-resize-handle');
    if (!handle || !state.overlayReplica || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const pointerId = event.pointerId;
    window.traderWRadarRealMod?.resizeOverlayWindow?.({
      phase: 'start',
      x: Number(event.screenX) || 0,
      y: Number(event.screenY) || 0
    });
    handle.setPointerCapture?.(pointerId);
    const onMove = moveEvent => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      window.traderWRadarRealMod?.resizeOverlayWindow?.({
        phase: 'move',
        x: Number(moveEvent.screenX) || 0,
        y: Number(moveEvent.screenY) || 0
      });
    };
    const onEnd = endEvent => {
      if (endEvent.pointerId !== pointerId) return;
      window.traderWRadarRealMod?.resizeOverlayWindow?.({ phase: 'end' });
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onEnd, true);
      document.removeEventListener('pointercancel', onEnd, true);
    };
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onEnd, true);
    document.addEventListener('pointercancel', onEnd, true);
  }, true);
  window.addEventListener('storage', event => {
    if (!String(event.key || '').startsWith('custom_wradar_mod_')) return;
    if (event.key === 'custom_wradar_mod_component_settings') {
      try { state.componentSettings = JSON.parse(event.newValue || '{}') || {}; } catch (_) {}
    } else if (event.key === 'custom_wradar_mod_color_settings') {
      try { state.colorSettings = JSON.parse(event.newValue || '{}') || {}; } catch (_) {}
    } else if (event.key === 'custom_wradar_mod_alert_settings') {
      try { state.alertSettings = JSON.parse(event.newValue || '{}') || {}; } catch (_) {}
    } else if (event.key === 'custom_wradar_mod_intelligence_settings') {
      try { state.intelligenceSettings = JSON.parse(event.newValue || '{}') || {}; } catch (_) {}
    } else if (event.key === 'custom_wradar_mod_show_auto_summary') {
      state.showAutoSummary = event.newValue !== '0';
    } else if (event.key === 'custom_wradar_mod_show_live_intelligence') {
      state.showLiveIntelligence = event.newValue !== '0';
    } else if (event.key === 'custom_wradar_mod_radar_icon_scale') {
      state.radarIconScale = Number(event.newValue) || 1;
    } else if (event.key === 'custom_wradar_mod_pressure_icon_scale') {
      state.pressureIconScale = Number(event.newValue) || 1;
    } else if (event.key === 'custom_wradar_mod_icon_map') {
      try { state.customIconMap = JSON.parse(event.newValue || '{}') || {}; } catch (_) {}
    } else if (event.key === 'custom_wradar_mod_font_scale') {
      state.fontScale = Number(event.newValue) || 1;
    } else if (event.key === 'custom_wradar_mod_overlay_opacity') {
      state.overlayOpacity = Number(event.newValue) || 1;
    } else if (event.key === 'custom_wradar_mod_overlay_content_mode') {
      state.overlayContentMode = event.newValue || 'full';
    } else if (event.key === 'custom_wradar_mod_show_pressure_chart') {
      state.showPressureChart = event.newValue === '1';
      if (state.showPressureChart) scheduleSofascorePressureGraph(true);
    } else if (event.key === 'custom_wradar_mod_show_radar_pressure_chart') {
      state.showRadarPressureChart = event.newValue === '1';
      if (state.showRadarPressureChart) scheduleSofascorePlayerEvents(true);
    } else if (event.key === 'custom_wradar_mod_heatmap_mode') {
      state.heatmapMode = event.newValue || 'off';
    } else if (event.key === 'custom_wradar_mod_heatmap_style') {
      state.heatmapStyle = event.newValue || 'candles';
    } else {
      return;
    }
    render();
  });
  window.addEventListener('beforeunload', () => {
    if (state.feedId) window.traderWRadarRealMod?.stopFeed?.(state.feedId);
    clearTimeout(state.sofascoreGraphTimer);
    clearTimeout(state.sofascorePlayerEventsTimer);
  });

  init();
})();
