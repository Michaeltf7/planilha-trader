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
  const container = document.getElementById('positions');
  const choose = slot => window.traderWRadarRealMod?.selectWidgetLayout?.({ slot });
  for (const item of payload.slots || []) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'position';
    button.innerHTML = `<span class="position-number">${Number(item.slot) || ''}</span><span><strong>Posicao ${Number(item.slot) || ''}</strong><small>Monitor ${Number(item.monitor) || 1} · ${Number(item.widgetCount) || 0} widgets</small></span>`;
    button.addEventListener('click', () => choose(String(item.slot || '')));
    container.appendChild(button);
  }
  const free = document.createElement('button');
  free.type = 'button';
  free.className = 'position free';
  free.innerHTML = '<span class="position-number"><i class="bx bx-move"></i></span><span><strong>Abrir livremente</strong><small>Comecar somente com a central</small></span>';
  free.addEventListener('click', () => choose(''));
  container.appendChild(free);
  document.getElementById('close')?.addEventListener('click', () => window.traderWRadarRealMod?.selectWidgetLayout?.({ cancelled: true }));
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') window.traderWRadarRealMod?.selectWidgetLayout?.({ cancelled: true });
  });
})();
