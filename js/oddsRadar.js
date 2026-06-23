const OddsRadar = {
    currentGame: null,
    lastResult: null,
    loading: false,
    liveFeedId: null,
    unsubscribeFeed: null,

    open(gameInfo = {}) {
        this.currentGame = gameInfo || {};
        this.lastResult = null;
        this.renderShell();
    },

    close() {
        this.stopLiveFeed();
        if (this.unsubscribeFeed) {
            this.unsubscribeFeed();
            this.unsubscribeFeed = null;
        }
        const modal = document.getElementById('odds-radar-modal');
        if (modal) modal.remove();
        this.loading = false;
    },

    renderShell() {
        let modal = document.getElementById('odds-radar-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'odds-radar-modal';
            document.body.appendChild(modal);
        }

        const title = `${this.currentGame?.home || 'Mandante'} x ${this.currentGame?.away || 'Visitante'}`;
        modal.className = 'custom-wradar-modal odds-radar-modal is-open';
        modal.setAttribute('data-radar-theme', document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
        modal.innerHTML = `
            <div class="custom-wradar-backdrop" onclick="OddsRadar.close()"></div>
            <section class="custom-wradar-panel odds-radar-panel" role="dialog" aria-modal="true" aria-label="Radar de Odds">
                <div class="custom-wradar-content odds-radar-content">
                    <div class="custom-radar-header">
                        <div>
                            <span class="custom-radar-kicker">Betfair Exchange</span>
                            <div class="custom-radar-title">
                                <h2>Radar de Odds <span>${this.escapeHtml(title)}</span></h2>
                                <p>Match Odds e Limite de Gols</p>
                            </div>
                        </div>
                        <div class="custom-radar-actions">
                            <button type="button" class="custom-radar-icon-btn" onclick="OddsRadar.close()" title="Fechar">
                                <i class='bx bx-x'></i>
                            </button>
                        </div>
                    </div>

                    <div class="odds-radar-actions modal-actions">
                        <div class="calendar-search-wrapper odds-url-wrapper">
                            <i class='bx bx-link'></i>
                            <input id="odds-url" class="filter-control" type="url" placeholder="Cole a URL da Betfair Exchange..." spellcheck="false" value="${this.escapeHtml(this.currentGame?.betfairUrl || '')}">
                        </div>
                        <button id="odds-find-btn" class="btn-secondary odds-find-btn">
                            <i class='bx bx-search'></i>
                            Buscar
                        </button>
                        <button id="odds-test-btn" class="btn-primary">
                            <i class='bx bx-broadcast'></i>
                            Conectar
                        </button>
                    </div>

                    <div id="odds-status" class="odds-status">
                        <i class='bx bx-info-circle'></i>
                        <span>Cole a URL do mercado na Betfair Exchange para testar a leitura.</span>
                    </div>

                    <section class="odds-score-strip">
                        <div class="odds-score-item home">
                            <span>${this.escapeHtml(this.currentGame?.home || 'Casa')}</span>
                            <strong id="odds-home-price">-</strong>
                        </div>
                        <div class="odds-score-item draw">
                            <span>Empate</span>
                            <strong id="odds-draw-price">-</strong>
                        </div>
                        <div class="odds-score-item away">
                            <span>${this.escapeHtml(this.currentGame?.away || 'Fora')}</span>
                            <strong id="odds-away-price">-</strong>
                        </div>
                    </section>

                    <section class="odds-radar-grid">
                        <div class="odds-market-panel">
                            <div class="odds-panel-title">
                                <i class='bx bx-football'></i>
                                <strong>Match Odds detalhado</strong>
                            </div>
                            <div id="odds-match-list" class="odds-empty">Nenhuma leitura feita ainda.</div>
                        </div>

                        <div class="odds-market-panel">
                            <div class="odds-panel-title">
                                <i class='bx bx-sort-alt-2'></i>
                                <strong>Limite de Gols</strong>
                            </div>
                            <div id="odds-goals-list" class="odds-empty">Nenhuma leitura feita ainda.</div>
                        </div>
                    </section>

                    <section class="odds-diagnostics">
                        <div class="odds-panel-title">
                            <i class='bx bx-code-curly'></i>
                            <strong>Diagnostico da pagina</strong>
                        </div>
                        <pre id="odds-debug">Aguardando leitura.</pre>
                    </section>
                </div>
            </section>
        `;

        this.bindEvents();
    },

    bindEvents() {
        const btn = document.getElementById('odds-test-btn');
        const findBtn = document.getElementById('odds-find-btn');
        const input = document.getElementById('odds-url');
        if (btn) btn.addEventListener('click', () => this.toggleLiveFeed());
        if (findBtn) findBtn.addEventListener('click', () => this.findMatchUrl());
        if (input) {
            input.focus();
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') this.toggleLiveFeed();
                if (event.key === 'Escape') this.close();
            });
        }
    },

    async findMatchUrl() {
        if (this.loading) return;
        this.loading = true;
        this.setStatus('Buscando partida na Betfair Exchange...', 'info');
        this.setButtonLoading(true, 'find');

        try {
            const result = await window.traderOddsRadar?.find?.({ game: this.currentGame });
            const input = document.getElementById('odds-url');
            if (result?.url) {
                if (input) input.value = result.url;
                this.setStatus('Partida encontrada. Agora vou ler as odds.', 'success');
                this.loading = false;
                this.setButtonLoading(false, 'find');
                await this.startLiveFeed();
                return;
            }
            this.renderDebug({ source: 'betfair-search', samples: result?.matches || [], error: 'Nenhum link exato encontrado.' });
            this.setStatus('Nao encontrei automaticamente. Cole a URL da partida para este jogo.', 'error');
        } catch (error) {
            this.setStatus(error?.message || 'Falha ao buscar partida.', 'error');
            this.renderDebug({ error: error?.message || String(error) });
        } finally {
            this.loading = false;
            this.setButtonLoading(false, 'find');
        }
    },

    setStatus(message, type = 'info') {
        const status = document.getElementById('odds-status');
        if (!status) return;
        const icon = type === 'error' ? 'bx-error-circle' : (type === 'success' ? 'bx-check-circle' : 'bx-info-circle');
        status.className = `odds-status ${type}`;
        status.innerHTML = `<i class='bx ${icon}'></i><span>${this.escapeHtml(message)}</span>`;
    },

    ensureFeedListener() {
        if (this.unsubscribeFeed || !window.traderOddsRadar?.onUpdate) return;
        this.unsubscribeFeed = window.traderOddsRadar.onUpdate((payload) => {
            if (!payload || payload.feedId !== this.liveFeedId) return;
            if (payload.error) {
                this.setStatus(payload.error, 'error');
                return;
            }
            this.lastResult = payload.data || null;
            this.renderResult(this.lastResult);
            this.setStatus(`Odds ao vivo atualizadas ${this.formatClock(new Date())}.`, 'success');
        });
    },

    async toggleLiveFeed() {
        if (this.liveFeedId) {
            await this.stopLiveFeed();
            this.setStatus('Leitura ao vivo parada.', 'info');
            return;
        }
        await this.startLiveFeed();
    },

    async startLiveFeed() {
        if (this.loading) return;

        const urlInput = document.getElementById('odds-url');
        const url = String(urlInput?.value || '').trim();

        if (!url) {
            this.setStatus('Cole a URL da Betfair Exchange para este jogo.', 'error');
            return;
        }

        this.loading = true;
        this.setStatus('Abrindo Betfair Exchange escondida e conectando leitura ao vivo...', 'info');
        this.setButtonLoading(true, 'read');

        try {
            this.ensureFeedListener();
            const result = await window.traderOddsRadar?.startFeed?.({
                url,
                source: 'betfair-exchange',
                game: this.currentGame
            });
            this.liveFeedId = result?.feedId || null;
            this.setStatus('Conectado. A página da Betfair fica aberta escondida e atualizando.', 'success');
            this.setLiveButtonState(true);
        } catch (error) {
            this.setStatus(error?.message || 'Falha ao ler odds.', 'error');
            this.renderDebug({ error: error?.message || String(error) });
        } finally {
            this.loading = false;
            this.setButtonLoading(false, 'read');
        }
    },

    async stopLiveFeed() {
        const feedId = this.liveFeedId;
        this.liveFeedId = null;
        this.setLiveButtonState(false);
        if (feedId && window.traderOddsRadar?.stopFeed) {
            await window.traderOddsRadar.stopFeed(feedId).catch(() => {});
        }
    },

    setButtonLoading(isLoading, mode = 'read') {
        const btn = document.getElementById(mode === 'find' ? 'odds-find-btn' : 'odds-test-btn');
        if (!btn) return;
        btn.disabled = isLoading;
        if (mode === 'find') {
            btn.innerHTML = isLoading
                ? `<i class='bx bx-loader-alt bx-spin'></i> Buscando`
                : `<i class='bx bx-search'></i> Buscar`;
            return;
        }
        btn.innerHTML = isLoading
            ? `<i class='bx bx-loader-alt bx-spin'></i> Conectando`
            : `<i class='bx bx-broadcast'></i> Conectar`;
    },

    setLiveButtonState(isLive) {
        const btn = document.getElementById('odds-test-btn');
        if (!btn) return;
        btn.disabled = false;
        btn.classList.toggle('danger', Boolean(isLive));
        btn.innerHTML = isLive
            ? `<i class='bx bx-stop-circle'></i> Parar`
            : `<i class='bx bx-broadcast'></i> Conectar`;
    },

    renderResult(result) {
        const summary = result?.summary || {};
        this.renderSummary(summary);
        this.renderMarketList('odds-match-list', result?.matchOdds || []);
        if (!Array.isArray(summary?.goalLines) || !summary.goalLines.length) {
            this.renderMarketList('odds-goals-list', result?.goalLines || []);
        }
        this.renderDebug(result);
    },

    renderSummary(summary) {
        const match = summary?.matchOdds || {};
        const setPrice = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value || '-';
        };
        setPrice('odds-home-price', this.formatPair(match.home));
        setPrice('odds-draw-price', this.formatPair(match.draw));
        setPrice('odds-away-price', this.formatPair(match.away));

        const goals = Array.isArray(summary?.goalLines) ? summary.goalLines : [];
        const list = document.getElementById('odds-goals-list');
        if (!list || !goals.length) return;

        list.className = 'odds-lines-grid';
        list.innerHTML = goals.map(line => `
            <div class="odds-line-card">
                <strong>${this.escapeHtml(line.line)}</strong>
                <div>
                    <span>Mais</span>
                    <em>${this.escapeHtml(this.formatPair(line.over))}</em>
                </div>
                <div>
                    <span>Menos</span>
                    <em>${this.escapeHtml(this.formatPair(line.under))}</em>
                </div>
            </div>
        `).join('');
    },

    renderMarketList(targetId, items) {
        const target = document.getElementById(targetId);
        if (!target) return;
        if (!items.length) {
            target.className = 'odds-empty';
            target.textContent = 'Nenhuma odd encontrada para este mercado.';
            return;
        }

        target.className = 'odds-market-list';
        target.innerHTML = items.map(item => `
            <div class="odds-row">
                <div>
                    <strong>${this.escapeHtml(item.label || item.market || 'Mercado')}</strong>
                    <span>${this.escapeHtml(item.context || item.market || '')}</span>
                </div>
                <em>${this.escapeHtml(this.formatPair(item))}</em>
            </div>
        `).join('');
    },

    formatPair(value) {
        if (!value) return '-';
        if (typeof value === 'string') return value;
        const back = value.back || value.price || '-';
        const lay = value.lay || '-';
        return lay && lay !== '-' ? `${back} / ${lay}` : back;
    },

    formatClock(date) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },

    renderDebug(result) {
        const debug = document.getElementById('odds-debug');
        if (!debug) return;
        const payload = {
            source: result?.source,
            url: result?.url,
            title: result?.title,
            capturedAt: result?.capturedAt,
            textLength: result?.sourceTextLength,
            summary: result?.summary || null,
            matchOdds: result?.matchOdds?.length || 0,
            goalLines: result?.goalLines?.length || 0,
            samples: result?.samples || [],
            error: result?.error
        };
        debug.textContent = JSON.stringify(payload, null, 2);
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
