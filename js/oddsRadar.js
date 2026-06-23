const OddsRadar = {
    lastResult: null,
    loading: false,

    render() {
        const container = document.getElementById('app-container');
        if (!container) return;

        container.innerHTML = `
            <div class="odds-radar-container">
                <section class="pro-header-card calendar-header-card odds-radar-header">
                    <div class="pro-header-info">
                        <h2><i class='bx bx-pulse'></i>Radar de Odds</h2>
                    </div>
                    <div class="odds-radar-actions">
                        <select id="odds-source" class="filter-control">
                            <option value="betfair">Betfair</option>
                            <option value="bet365">Bet365</option>
                        </select>
                        <div class="calendar-search-wrapper odds-url-wrapper">
                            <i class='bx bx-link'></i>
                            <input id="odds-url" class="filter-control" type="url" placeholder="Cole aqui a URL do jogo ou mercado..." spellcheck="false">
                        </div>
                        <button id="odds-test-btn" class="btn-primary">
                            <i class='bx bx-search-alt'></i>
                            Testar leitura
                        </button>
                    </div>
                </section>

                <div id="odds-status" class="odds-status">
                    <i class='bx bx-info-circle'></i>
                    <span>Recurso experimental. Primeiro vamos descobrir se as odds aparecem na pagina carregada.</span>
                </div>

                <section class="odds-radar-grid">
                    <div class="odds-market-panel">
                        <div class="odds-panel-title">
                            <i class='bx bx-football'></i>
                            <strong>Match Odds</strong>
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
                    <pre id="odds-debug">Aguardando teste.</pre>
                </section>
            </div>
        `;

        this.bindEvents();
        if (this.lastResult) this.renderResult(this.lastResult);
    },

    bindEvents() {
        const btn = document.getElementById('odds-test-btn');
        const input = document.getElementById('odds-url');
        if (btn) btn.addEventListener('click', () => this.testRead());
        if (input) {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') this.testRead();
            });
        }
    },

    setStatus(message, type = 'info') {
        const status = document.getElementById('odds-status');
        if (!status) return;
        const icon = type === 'error' ? 'bx-error-circle' : (type === 'success' ? 'bx-check-circle' : 'bx-info-circle');
        status.className = `odds-status ${type}`;
        status.innerHTML = `<i class='bx ${icon}'></i><span>${this.escapeHtml(message)}</span>`;
    },

    async testRead() {
        if (this.loading) return;

        const urlInput = document.getElementById('odds-url');
        const sourceInput = document.getElementById('odds-source');
        const url = String(urlInput?.value || '').trim();
        const source = String(sourceInput?.value || 'betfair');

        if (!url) {
            this.setStatus('Cole a URL da pagina que voce quer testar.', 'error');
            return;
        }

        this.loading = true;
        this.setStatus('Abrindo pagina escondida e procurando mercados...', 'info');
        this.setButtonLoading(true);

        try {
            const result = await window.traderOddsRadar?.read?.({ url, source });
            this.lastResult = result;
            this.renderResult(result);
            const total = (result?.matchOdds?.length || 0) + (result?.goalLines?.length || 0);
            this.setStatus(total ? `Leitura concluida. ${total} possiveis odds encontradas.` : 'Leitura concluida, mas nenhuma odd dos mercados alvo foi encontrada.', total ? 'success' : 'info');
        } catch (error) {
            this.setStatus(error?.message || 'Falha ao ler odds.', 'error');
            this.renderDebug({ error: error?.message || String(error) });
        } finally {
            this.loading = false;
            this.setButtonLoading(false);
        }
    },

    setButtonLoading(isLoading) {
        const btn = document.getElementById('odds-test-btn');
        if (!btn) return;
        btn.disabled = isLoading;
        btn.innerHTML = isLoading
            ? `<i class='bx bx-loader-alt bx-spin'></i> Lendo`
            : `<i class='bx bx-search-alt'></i> Testar leitura`;
    },

    renderResult(result) {
        this.renderMarketList('odds-match-list', result?.matchOdds || []);
        this.renderMarketList('odds-goals-list', result?.goalLines || []);
        this.renderDebug(result);
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
                <em>${this.escapeHtml(item.price || '-')}</em>
            </div>
        `).join('');
    },

    renderDebug(result) {
        const debug = document.getElementById('odds-debug');
        if (!debug) return;
        const payload = {
            source: result?.source,
            url: result?.url,
            title: result?.title,
            capturedAt: result?.capturedAt,
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
