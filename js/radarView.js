const RadarView = {
    eventId: null,
    refreshRate: 10000,
    intervalId: null,
    endpoints: [
        'https://api.sofascore.com/api/v1',
        'https://www.sofascore.com/api/v1',
        'https://api.sofascore.app/api/v1'
    ],

    init() {
        const params = new URLSearchParams(window.location.search);
        this.eventId = params.get('id') || params.get('eventId');

        if (!this.eventId) {
            document.body.innerHTML = '<div style="color:white;text-align:center;padding:50px;">Aguardando selecao de jogo...</div>';
            return;
        }

        this.loadPressureGraph();
        this.intervalId = setInterval(() => this.loadPressureGraph(), this.refreshRate);
    },

    async loadPressureGraph() {
        try {
            const eventData = await this.fetchSofascoreJson(`/event/${this.eventId}`);
            const graphData = await this.fetchSofascoreJson(`/event/${this.eventId}/graph`);
            const incidentsData = await this.fetchSofascoreJson(`/event/${this.eventId}/incidents`).catch(() => ({ incidents: [] }));
            const event = eventData?.event;
            const graphPoints = Array.isArray(graphData?.graphPoints) ? graphData.graphPoints : [];
            const incidents = Array.isArray(incidentsData?.incidents) ? incidentsData.incidents : [];

            if (!event) throw new Error('Dados do jogo nao encontrados no Sofascore.');

            if (!graphPoints.length) {
                this.renderEmpty(event, 'O Sofascore ainda nao disponibilizou dados de pressao para este jogo.');
                return;
            }

            this.renderOverlay(event, graphPoints, incidents);
        } catch (error) {
            console.error('Erro ao buscar dados de pressao:', error);
            this.renderError(error);
        }
    },

    async fetchSofascoreJson(path) {
        const urls = this.endpoints.map(base => `${base}${path}`);
        const attempts = [
            ...urls,
            ...urls.map(url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`),
            ...urls.map(url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`)
        ];

        let lastError = null;
        for (const url of attempts) {
            try {
                const data = await this.fetchJson(url);
                if (data && typeof data === 'object') return data;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('Nao foi possivel conectar ao Sofascore.');
    },

    async fetchJson(url) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9000);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                cache: 'no-store',
                headers: {
                    accept: 'application/json,text/plain,*/*'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = JSON.parse(await response.text());
            if (typeof data?.contents === 'string') return JSON.parse(data.contents);
            return data;
        } finally {
            clearTimeout(timer);
        }
    },

    renderOverlay(event, graphPoints, incidents) {
        const container = document.getElementById('momentum-container');
        if (!container) return;

        const homeColor = '#4182f9';
        const awayColor = '#e84f35';
        const homeTeamName = this.escapeHtml(event.homeTeam?.name || 'Casa');
        const awayTeamName = this.escapeHtml(event.awayTeam?.name || 'Fora');
        const homeName = this.escapeHtml((event.homeTeam?.shortName || event.homeTeam?.name || 'CASA').substring(0, 3).toUpperCase());
        const awayName = this.escapeHtml((event.awayTeam?.shortName || event.awayTeam?.name || 'FORA').substring(0, 3).toUpperCase());

        const svgW = 600;
        const svgH = 180;
        const pad = { top: 25, bottom: 25, left: 45, right: 15 };
        const chartW = svgW - pad.left - pad.right;
        const chartH = svgH - pad.top - pad.bottom;
        const midY = pad.top + chartH / 2;
        const barMaxH = chartH / 2 - 10;
        const maxMinute = Math.max(...graphPoints.map(p => Number(p.minute || 0)), 45);
        const expectedN = maxMinute > 90 ? 120 : (maxMinute > 45 ? 90 : 45);
        const toX = min => pad.left + (min / expectedN) * chartW;
        const barW = Math.max(2, (chartW / expectedN) * 0.7);

        let bars = '';
        graphPoints.forEach((p, i) => {
            const min = Number(p.minute || i);
            if (!Number.isFinite(min) || min > expectedN) return;
            const x = toX(min);
            const val = Math.max(-100, Math.min(100, Number(p.value || 0)));
            const absH = Math.max(1, (Math.abs(val) / 100) * barMaxH);

            if (val >= 0) {
                bars += `<rect x="${(x - barW / 2).toFixed(1)}" y="${(midY - absH).toFixed(1)}" width="${barW.toFixed(1)}" height="${absH.toFixed(1)}" fill="${homeColor}" opacity="0.92" rx="1"/>`;
            } else {
                bars += `<rect x="${(x - barW / 2).toFixed(1)}" y="${midY.toFixed(1)}" width="${barW.toFixed(1)}" height="${absH.toFixed(1)}" fill="${awayColor}" opacity="0.92" rx="1"/>`;
            }
        });

        let gridLines = '';
        const minuteTicks = expectedN === 45
            ? [0, 15, 30, 45]
            : expectedN === 90
                ? [0, 15, 30, 45, 60, 75, 90]
                : [0, 15, 30, 45, 60, 75, 90, 105, 120];

        minuteTicks.forEach(min => {
            const tx = toX(min);
            const label = min === 45 && expectedN === 90 ? 'INT' : `${min}'`;
            gridLines += `<line x1="${tx.toFixed(1)}" y1="${pad.top}" x2="${tx.toFixed(1)}" y2="${pad.top + chartH}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
            gridLines += `<text x="${tx.toFixed(1)}" y="${pad.top + chartH + 14}" text-anchor="middle" font-size="8" font-weight="800" fill="rgba(255,255,255,0.3)">${label}</text>`;
        });

        const incidentSvg = this.renderIncidents(incidents, { pad, chartH, midY, expectedN, toX, homeColor, awayColor });

        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #1a1a1f;padding-bottom:10px;gap:12px;">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                    <span style="display:inline-block;width:10px;height:10px;background:${homeColor};border-radius:3px;flex:0 0 auto;"></span>
                    <span style="font-size:13px;font-weight:900;color:${homeColor};font-family:'Outfit',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${homeTeamName}</span>
                </div>
                <div style="color:white;font-weight:900;font-size:20px;font-family:'Outfit',sans-serif;letter-spacing:1px;flex:0 0 auto;">${Number(event.homeScore?.current || 0)} - ${Number(event.awayScore?.current || 0)}</div>
                <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                    <span style="font-size:13px;font-weight:900;color:${awayColor};font-family:'Outfit',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${awayTeamName}</span>
                    <span style="display:inline-block;width:10px;height:10px;background:${awayColor};border-radius:3px;flex:0 0 auto;"></span>
                </div>
            </div>
            <div style="position:relative;width:100%;height:${svgH}px;background:#060608;border-radius:12px;overflow:hidden;">
                <div style="position:absolute;left:6px;top:${pad.top - 6}px;font-size:10px;font-weight:900;color:${homeColor};opacity:.8;z-index:10;">${homeName}</div>
                <div style="position:absolute;left:6px;bottom:${pad.bottom - 6}px;font-size:10px;font-weight:900;color:${awayColor};opacity:.8;z-index:10;">${awayName}</div>
                <svg width="100%" height="100%" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none">
                    ${gridLines}
                    <line x1="${pad.left}" y1="${midY.toFixed(1)}" x2="${(pad.left + chartW).toFixed(1)}" y2="${midY.toFixed(1)}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
                    ${incidentSvg.calls}
                    ${bars}
                    ${incidentSvg.icons}
                </svg>
            </div>
        `;
    },

    renderIncidents(incidents, ctx) {
        let calls = '';
        let icons = '';

        incidents.forEach(ev => {
            const min = Number(ev.time || ev.minute || 0);
            if (!Number.isFinite(min) || min <= 0 || min > ctx.expectedN) return;

            const x = ctx.toX(min);
            const isHome = Boolean(ev.isHome);
            calls += `<line x1="${x.toFixed(1)}" y1="${ctx.pad.top}" x2="${x.toFixed(1)}" y2="${ctx.pad.top + ctx.chartH}" stroke="rgba(255,255,255,0.25)" stroke-width="0.75" stroke-dasharray="2,2"/>`;

            if (ev.incidentType === 'goal') {
                icons += `
                    <g cursor="pointer">
                        <circle cx="${x.toFixed(1)}" cy="${ctx.midY.toFixed(1)}" r="7" fill="#0a0a0c" stroke="#ffffff" stroke-width="1"/>
                        <circle cx="${x.toFixed(1)}" cy="${ctx.midY.toFixed(1)}" r="5.5" fill="${isHome ? ctx.homeColor : ctx.awayColor}"/>
                        <text x="${x.toFixed(1)}" y="${(ctx.midY + 2.5).toFixed(1)}" font-size="7" text-anchor="middle">G</text>
                        <title>${min}' Gol - ${this.escapeHtml(ev.player?.name || '')}</title>
                    </g>
                `;
                return;
            }

            if (ev.incidentType === 'card') {
                const color = ev.incidentClass === 'yellow' ? '#f1c40f' : '#ef4444';
                const y = isHome ? ctx.pad.top - 8 : ctx.pad.top + ctx.chartH + 8;
                icons += `<rect x="${(x - 2.5).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="5" height="8" fill="${color}" rx="0.5" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"><title>${min}' Cartao</title></rect>`;
            }
        });

        return { calls, icons };
    },

    renderEmpty(event, message) {
        const container = document.getElementById('momentum-container');
        if (!container) return;

        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #1a1a1f;padding-bottom:10px;gap:12px;">
                <span style="font-size:13px;font-weight:900;color:#4182f9;font-family:'Outfit',sans-serif;">${this.escapeHtml(event?.homeTeam?.name || 'Casa')}</span>
                <span style="color:white;font-weight:900;font-size:20px;font-family:'Outfit',sans-serif;letter-spacing:1px;">${Number(event?.homeScore?.current || 0)} - ${Number(event?.awayScore?.current || 0)}</span>
                <span style="font-size:13px;font-weight:900;color:#e84f35;font-family:'Outfit',sans-serif;">${this.escapeHtml(event?.awayTeam?.name || 'Fora')}</span>
            </div>
            <div style="min-height:150px;display:flex;align-items:center;justify-content:center;text-align:center;color:rgba(255,255,255,.65);font-weight:800;padding:20px;">
                ${this.escapeHtml(message)}
            </div>
        `;
    },

    renderError(error) {
        const container = document.getElementById('momentum-container');
        if (!container) return;

        container.innerHTML = `
            <div style="min-height:170px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:20px;">
                <i class='bx bx-error-circle' style="font-size:42px;color:#e84f35;"></i>
                <div style="font-weight:900;color:#fff;">Nao foi possivel abrir o grafico de pressao</div>
                <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.55);max-width:520px;">${this.escapeHtml(error?.message || 'Falha ao buscar dados no Sofascore.')}</div>
            </div>
        `;
    },

    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    }
};

window.onload = () => RadarView.init();
