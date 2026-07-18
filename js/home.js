const HomePage = {
    games: [],
    statusFilter: 'all',
    loading: false,
    source: '',
    loadToken: 0,
    standingsLoading: new Set(),
    startupViews: [
        ['inicio', 'Início'],
        ['calendario', 'Calendário'],
        ['competicoes', 'Competições'],
        ['dashboard', 'Dashboard de apostas']
    ],

    render() {
        const container = document.getElementById('app-container');
        if (!container) return;
        container.innerHTML = `
            <div class="home-page">
                <section class="home-toolbar">
                    <div>
                        <span class="home-date-label">${this.formatLongDate(new Date())}</span>
                        <h2>Visão geral</h2>
                    </div>
                    <div class="home-toolbar-actions">
                        <button type="button" class="home-icon-button" onclick="HomePage.refresh(true)" title="Atualizar dados"><i class='bx bx-refresh'></i></button>
                        <button type="button" class="home-icon-button" onclick="HomePage.openSettings()" title="Personalizar página inicial"><i class='bx bx-slider-alt'></i></button>
                    </div>
                </section>

                <section id="home-metrics" class="home-metrics"></section>

                <div class="home-primary-grid">
                    <section class="home-panel home-games-panel">
                        <header class="home-panel-head">
                            <div><h3>Jogos em destaque</h3><span id="home-games-source">Carregando calendário...</span></div>
                            <button type="button" onclick="App.changeView('calendario')">Abrir calendário <i class='bx bx-right-arrow-alt'></i></button>
                        </header>
                        <div class="home-status-tabs" id="home-status-tabs">
                            ${this.renderStatusButton('all', 'Todos')}
                            ${this.renderStatusButton('live', 'Ao vivo')}
                            ${this.renderStatusButton('upcoming', 'Próximos')}
                            ${this.renderStatusButton('finished', 'Encerrados')}
                        </div>
                        <div id="home-games-list" class="home-games-list"></div>
                    </section>

                    <aside class="home-side-column">
                        ${this.renderQuickActions()}
                        <section class="home-panel home-continue-panel">${this.renderContinue()}</section>
                        <section id="home-betting-summary" class="home-panel home-betting-panel"></section>
                    </aside>
                </div>

                <div class="home-secondary-grid">
                    <section class="home-panel">
                        <header class="home-panel-head"><div><h3>Competições favoritas</h3><span>Atalhos das ligas acompanhadas</span></div><button onclick="HomePage.openSettings()">Editar</button></header>
                        <div id="home-favorite-competitions" class="home-favorite-competitions"></div>
                    </section>
                    <section class="home-panel">
                        <header class="home-panel-head"><div><h3>Classificações</h3><span>Tabelas selecionadas</span></div><button onclick="App.changeView('competicoes')">Ver competições</button></header>
                        <div id="home-standings" class="home-standings"></div>
                    </section>
                </div>
            </div>
            ${this.renderSettingsModal()}
        `;
        this.renderDynamic();
        this.refresh(false);
        this.loadSelectedStandings();
    },

    renderStatusButton(id, label) {
        return `<button type="button" class="${this.statusFilter === id ? 'active' : ''}" onclick="HomePage.setStatus('${id}')">${label}</button>`;
    },

    setStatus(status) {
        this.statusFilter = status;
        document.querySelectorAll('#home-status-tabs button').forEach(button => {
            button.classList.toggle('active', button.getAttribute('onclick')?.includes(`'${status}'`));
        });
        this.renderGames();
    },

    async refresh(force = false) {
        if (typeof AnalisePro === 'undefined') return;
        const token = ++this.loadToken;
        const dateKey = AnalisePro.getTodayKey();
        const cached = !force ? AnalisePro.getCachedCalendarGames(dateKey) : null;
        if (cached?.games?.length) {
            this.games = this.normalizeGamesForDate(cached.games, dateKey);
            this.source = cached.source || 'Cache do calendário';
            this.renderDynamic();
        }
        this.loading = true;
        this.renderMetrics();
        try {
            const games = await AnalisePro.fetchCalendarGamesByDate(dateKey, force);
            if (token !== this.loadToken || App.currentView !== 'inicio') return;
            this.games = this.normalizeGamesForDate(games || [], dateKey);
            this.source = AnalisePro.calendarSource || 'Calendário';
            AnalisePro.setCachedCalendarGames(dateKey, games || [], {
                source: AnalisePro.calendarSource,
                sourceMeta: AnalisePro.calendarSourceMeta
            });
        } catch (error) {
            if (!this.games.length) this.source = 'Calendário indisponível';
        } finally {
            if (token === this.loadToken) {
                this.loading = false;
                this.renderDynamic();
            }
        }
    },

    excludeTemporaryTournament(games) {
        return (games || []).filter(game => {
            const text = AnalisePro.normalizeMatchText(`${game?.tournament?.name || ''} ${game?.tournament?.uniqueTournament?.name || ''}`);
            return !text.includes('world cup') && !text.includes('copa do mundo');
        });
    },

    normalizeGamesForDate(games, dateKey) {
        return this.excludeTemporaryTournament(games).filter(game =>
            AnalisePro.getLocalDateKey(game?.startTimestamp) === dateKey
        );
    },

    gameStatus(game) {
        return AnalisePro.getCalendarGameStatus(game);
    },

    getPrioritizedGames() {
        const favorites = this.readJson('pro_fav_leagues', []);
        const favoriteGames = this.readJson('pro_fav_games_v2', {})[AnalisePro.getTodayKey()] || [];
        return [...this.games].sort((a, b) => {
            const aStatus = this.gameStatus(a);
            const bStatus = this.gameStatus(b);
            const score = game => {
                const tournamentId = game?.tournament?.uniqueTournament?.id || game?.tournament?.id;
                const isFavorite = favorites.some(id => String(id) === String(tournamentId));
                const isFavoriteGame = favoriteGames.some(id => String(id) === String(game.id));
                const live = this.gameStatus(game) === 'live';
                return (isFavoriteGame ? 1e18 : 0) + (isFavorite ? 1e17 : 0) + AnalisePro.getCalendarLeaguePriority(game) + (live ? 1e10 : 0);
            };
            const diff = score(b) - score(a);
            if (diff) return diff;
            if (aStatus !== bStatus) return aStatus === 'live' ? -1 : bStatus === 'live' ? 1 : 0;
            return Number(a.startTimestamp || 0) - Number(b.startTimestamp || 0);
        });
    },

    renderDynamic() {
        if (App.currentView !== 'inicio') return;
        this.renderMetrics();
        this.renderGames();
        this.renderFavoriteCompetitions();
        this.renderBettingSummary();
    },

    renderMetrics() {
        const target = document.getElementById('home-metrics');
        if (!target) return;
        const prioritized = this.getPrioritizedGames().slice(0, 50);
        const counts = { live: 0, upcoming: 0, finished: 0 };
        prioritized.forEach(game => { const status = this.gameStatus(game); if (counts[status] !== undefined) counts[status] += 1; });
        target.innerHTML = `
            ${this.metric('Jogos em destaque', Math.min(8, this.games.length), 'bx-calendar-event', 'neutral')}
            ${this.metric('Ao vivo em destaque', counts.live, 'bx-pulse', 'live')}
            ${this.metric('Próximos em destaque', counts.upcoming, 'bx-time-five', 'upcoming')}
            ${this.metric('Tabelas na página', this.selectedCompetitionIds().slice(0, 2).length, 'bx-table', 'competition')}
        `;
    },

    metric(label, value, icon, tone) {
        return `<article class="home-metric ${tone}"><i class='bx ${icon}'></i><div><strong>${this.loading && !this.games.length ? '...' : value}</strong><span>${label}</span></div></article>`;
    },

    renderGames() {
        const target = document.getElementById('home-games-list');
        const source = document.getElementById('home-games-source');
        if (!target) return;
        if (source) source.textContent = this.source ? `Fonte: ${this.source}` : 'Dados do calendário';
        const games = this.getPrioritizedGames().filter(game => this.statusFilter === 'all' || this.gameStatus(game) === this.statusFilter).slice(0, 8);
        if (!games.length) {
            target.innerHTML = `<div class="home-empty"><i class='bx bx-calendar-x'></i><strong>${this.loading ? 'Atualizando jogos...' : 'Nenhum jogo neste filtro'}</strong><span>${this.loading ? 'Os dados em cache aparecem primeiro.' : 'Consulte o calendário para ver outras datas.'}</span></div>`;
            return;
        }
        target.innerHTML = games.map(game => this.renderGame(game)).join('');
    },

    renderGame(game) {
        const status = this.gameStatus(game);
        const isLive = status === 'live';
        const scoreHome = game.homeScore?.display ?? game.homeScore?.current;
        const scoreAway = game.awayScore?.display ?? game.awayScore?.current;
        const time = new Date(Number(game.startTimestamp || 0) * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const label = isLive ? this.liveStatusLabel(game.status?.description) : status === 'finished' ? 'Encerrado' : time;
        const action = AnalisePro.getCalendarGameActionData(game);
        return `<article class="home-game ${isLive ? 'is-live' : ''}">
            <div class="home-game-time"><strong>${this.escape(label)}</strong><span>${this.escape(game.tournament?.name || '')}</span></div>
            <div class="home-game-teams">
                <div>${AnalisePro.renderTeamLogo(game.homeTeam, 24, game.source)}<strong>${this.escape(game.homeTeam?.name || '')}</strong><b>${scoreHome ?? '-'}</b></div>
                <div>${AnalisePro.renderTeamLogo(game.awayTeam, 24, game.source)}<strong>${this.escape(game.awayTeam?.name || '')}</strong><b>${scoreAway ?? '-'}</b></div>
            </div>
            <div class="home-game-actions">
                <button type="button" onclick="AnalisePro.openCustomWRadarMod(${action.wradarGame})" title="Abrir Radar MOD"><i class='bx bx-crosshair'></i></button>
                ${action.sofaUrl ? `<button type="button" onclick="AnalisePro.openSofaAnalysis(decodeURIComponent('${this.escapeAttr(action.analysisGame)}'))" title="Análise SofaScore"><i class='bx bx-line-chart'></i></button>` : ''}
            </div>
        </article>`;
    },

    liveStatusLabel(value) {
        const normalized = String(value || '').trim().toLowerCase();
        const labels = {
            '1st half': '1º tempo',
            'first half': '1º tempo',
            '2nd half': '2º tempo',
            'second half': '2º tempo',
            'halftime': 'Intervalo',
            'half time': 'Intervalo',
            'started': 'Ao vivo',
            'in progress': 'Ao vivo'
        };
        return labels[normalized] || value || 'Ao vivo';
    },

    renderQuickActions() {
        const items = [
            ['calendario', 'bx-calendar', 'Calendário', 'Jogos de hoje e outras datas'],
            ['competicoes', 'bx-trophy', 'Competições', 'Tabelas, times e rodadas'],
            ['planejamento', 'bx-task', 'Planejamento', 'Organização diária'],
            ['escada', 'bx-bar-chart-alt-2', 'Simulador', 'Simulador de escada']
        ];
        return `<section class="home-panel home-quick-panel"><header class="home-panel-head"><div><h3>Acessos rápidos</h3><span>Ferramentas principais</span></div></header><div class="home-quick-grid">${items.map(([view, icon, title, text]) => `<button onclick="App.changeView('${view}')"><i class='bx ${icon}'></i><span><strong>${title}</strong><small>${text}</small></span><i class='bx bx-chevron-right'></i></button>`).join('')}</div></section>`;
    },

    renderContinue() {
        const last = localStorage.getItem('planilha-trader-last-view');
        const labels = Object.fromEntries(this.startupViews);
        if (!last || last === 'inicio') return `<header class="home-panel-head"><div><h3>Continue de onde parou</h3><span>Seu último acesso aparecerá aqui</span></div></header>`;
        return `<header class="home-panel-head"><div><h3>Continue de onde parou</h3><span>${this.escape(labels[last] || 'Última área utilizada')}</span></div><button onclick="App.changeView('${this.escapeAttr(last)}')">Continuar <i class='bx bx-right-arrow-alt'></i></button></header>`;
    },

    renderBettingSummary() {
        const target = document.getElementById('home-betting-summary');
        if (!target) return;
        const entries = (App.data || []).filter(item => !item.isDepositOrWithdrawal);
        if (!entries.length) {
            target.style.display = 'none';
            return;
        }
        target.style.display = '';
        const profit = entries.reduce((sum, item) => sum + (Number(item.netProfit) || 0), 0);
        const wins = entries.filter(item => Number(item.netProfit) > 0).length;
        target.innerHTML = `<header class="home-panel-head"><div><h3>Resumo das apostas</h3><span>${entries.length} entradas importadas</span></div><button onclick="App.changeView('dashboard')">Dashboard</button></header><div class="home-betting-values"><div><span>Resultado</span><strong class="${profit >= 0 ? 'positive' : 'negative'}">${App.formatCurrency(profit)}</strong></div><div><span>Greens</span><strong>${wins}</strong></div><div><span>Assertividade</span><strong>${entries.length ? ((wins / entries.length) * 100).toFixed(1) : 0}%</strong></div></div>`;
    },

    renderFavoriteCompetitions() {
        const target = document.getElementById('home-favorite-competitions');
        if (!target) return;
        const favorites = this.readJson('pro_fav_leagues', []);
        const map = new Map();
        this.games.forEach(game => {
            const id = game?.tournament?.uniqueTournament?.id || game?.tournament?.id;
            if (!favorites.some(item => String(item) === String(id))) return;
            if (!map.has(String(id))) map.set(String(id), { id, name: game.tournament?.name || 'Competição', game });
        });
        const items = [...map.values()];
        if (!items.length) {
            target.innerHTML = `<div class="home-empty compact"><i class='bx bx-star'></i><strong>Nenhuma favorita com jogos hoje</strong><span>Favorite ligas no calendário para trazê-las para esta página.</span></div>`;
            return;
        }
        target.innerHTML = items.map(item => `<button onclick="App.changeView('calendario')">${AnalisePro.renderTournamentLogo(item.game, 28)}<span><strong>${this.escape(item.name)}</strong><small>${this.games.filter(game => String(game?.tournament?.uniqueTournament?.id || game?.tournament?.id) === String(item.id)).length} jogos hoje</small></span><i class='bx bx-chevron-right'></i></button>`).join('');
    },

    selectedCompetitionIds() {
        return this.readJson('home-selected-competitions-v1', ['brasileirao-serie-a']);
    },

    async loadSelectedStandings() {
        if (typeof Competitions === 'undefined') return;
        Competitions.ensureCacheLoaded();
        this.renderStandings();
        for (const id of this.selectedCompetitionIds().slice(0, 2)) {
            const competition = Competitions.competitions.find(item => item.id === id);
            if (!competition) continue;
            const key = `${competition.id}:${competition.seasonId}`;
            if (Competitions.data[key]?.standings?.length || this.standingsLoading.has(key)) continue;
            this.standingsLoading.add(key);
            try {
                const result = await window.traderCompetitionData?.sync?.({ ...competition, seasonId: competition.seasonId, season: competition.seasons.find(item => Number(item.id) === Number(competition.seasonId))?.label });
                if (result?.ok) {
                    Competitions.data[key] = Competitions.normalizeCompetitionPayload(result);
                    Competitions.saveCache();
                }
            } catch (_) {
            } finally {
                this.standingsLoading.delete(key);
                if (App.currentView === 'inicio') this.renderStandings();
            }
        }
    },

    renderStandings() {
        const target = document.getElementById('home-standings');
        if (!target || typeof Competitions === 'undefined') return;
        const blocks = this.selectedCompetitionIds().slice(0, 2).map(id => {
            const competition = Competitions.competitions.find(item => item.id === id);
            if (!competition) return '';
            const data = Competitions.data[`${competition.id}:${competition.seasonId}`];
            const rows = (data?.standings || []).slice(0, 6);
            if (!rows.length) return `<article class="home-standing-block"><header>${Competitions.renderCompetitionLogo(competition.logo)}<strong>${this.escape(competition.name)}</strong></header><div class="home-standing-loading"><i class='bx bx-loader-alt bx-spin'></i> Carregando tabela...</div></article>`;
            return `<article class="home-standing-block"><header>${Competitions.renderCompetitionLogo(data?.competition?.logoData || competition.logo)}<strong>${this.escape(competition.name)}</strong><button onclick="HomePage.openCompetition('${competition.id}')">Abrir</button></header><div class="home-standing-rows">${rows.map(row => `<div><span class="home-standing-position">${row.position || '-'}</span>${Competitions.renderTeamLogo(row.logoData || row.logo, row.team)}<strong>${this.escape(row.team)}</strong><b>${row.points ?? 0} pts</b></div>`).join('')}</div></article>`;
        }).filter(Boolean);
        target.innerHTML = blocks.join('') || `<div class="home-empty compact"><i class='bx bx-table'></i><strong>Escolha uma classificação</strong><span>Use a personalização da página inicial.</span></div>`;
    },

    openCompetition(id) {
        App.changeView('competicoes');
        requestAnimationFrame(() => Competitions.openCompetition(id));
    },

    renderSettingsModal() {
        const selected = this.selectedCompetitionIds();
        const startup = localStorage.getItem('planilha-trader-startup-view') || 'inicio';
        return `<div id="home-settings-modal" class="home-settings-modal" hidden><div class="home-settings-dialog"><header><div><span>PERSONALIZAÇÃO</span><h3>Página inicial</h3></div><button onclick="HomePage.closeSettings()"><i class='bx bx-x'></i></button></header><section><label>Tela ao abrir o programa<select id="home-startup-view">${this.startupViews.map(([id, label]) => `<option value="${id}" ${startup === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label></section><section><strong>Classificações exibidas</strong><p>Escolha até duas competições.</p><div class="home-settings-options">${Competitions.competitions.map(item => `<label><input type="checkbox" name="home-standing-competition" value="${item.id}" ${selected.includes(item.id) ? 'checked' : ''}><span>${this.escape(item.name)}</span></label>`).join('')}</div></section><footer><button class="secondary" onclick="HomePage.closeSettings()">Cancelar</button><button class="primary" onclick="HomePage.saveSettings()">Salvar</button></footer></div></div>`;
    },

    openSettings() { const modal = document.getElementById('home-settings-modal'); if (modal) modal.hidden = false; },
    closeSettings() { const modal = document.getElementById('home-settings-modal'); if (modal) modal.hidden = true; },
    saveSettings() {
        const checked = [...document.querySelectorAll('input[name="home-standing-competition"]:checked')].slice(0, 2).map(input => input.value);
        localStorage.setItem('home-selected-competitions-v1', JSON.stringify(checked));
        localStorage.setItem('planilha-trader-startup-view', document.getElementById('home-startup-view')?.value || 'inicio');
        this.closeSettings();
        this.renderStandings();
        this.loadSelectedStandings();
    },

    readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; } },
    formatLongDate(date) { return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(date); },
    escape(value) { return App.escapeHtml(value); },
    escapeAttr(value) { return this.escape(value).replace(/`/g, '&#096;'); }
};
