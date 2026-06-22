const Competitions = {
    activeCompetitionId: null,
    activeTab: 'dashboard',
    leadersTab: 'scorers',
    comparison: { home: '', away: '' },
    filters: { search: '', date: 'all' },
    syncState: { started: false, loading: false, lastSync: null, message: 'Escolha uma competição', timer: null },
    cacheKey: 'competitions_cache_v4',
    syncToken: 0,
    details: {},
    compareDetails: {},
    activeCompareMatchId: null,
    expandedMatchId: null,
    data: {},

    competitions: [
        {
            id: 'premier-league',
            name: 'Premier League',
            country: 'Inglaterra',
            uniqueTournamentId: 17,
            logo: 'https://api.sofascore.app/api/v1/unique-tournament/17/image',
            seasons: [
                { id: 96668, label: '2026/27' },
                { id: 76986, label: '2025/26' }
            ],
            seasonId: 96668,
            color: '#3c1c5a',
            accent: '#f80158'
        },
        {
            id: 'bundesliga',
            name: 'Bundesliga',
            country: 'Alemanha',
            uniqueTournamentId: 35,
            logo: 'https://api.sofascore.app/api/v1/unique-tournament/35/image',
            seasons: [
                { id: 77333, label: '2025/26' },
                { id: 63516, label: '2024/25' }
            ],
            seasonId: 77333,
            color: '#dc2626',
            accent: '#111827'
        },
        {
            id: 'la-liga',
            name: 'La Liga',
            country: 'Espanha',
            uniqueTournamentId: 8,
            logo: 'https://api.sofascore.app/api/v1/unique-tournament/8/image',
            seasons: [
                { id: 77559, label: '2025/26' },
                { id: 61643, label: '2024/25' }
            ],
            seasonId: 77559,
            color: '#e11d48',
            accent: '#f59e0b'
        },
        {
            id: 'brasileirao-serie-a',
            name: 'Brasileirao Serie A',
            country: 'Brasil',
            uniqueTournamentId: 325,
            logo: 'https://api.sofascore.app/api/v1/unique-tournament/325/image',
            seasons: [
                { id: 87678, label: '2026' },
                { id: 72034, label: '2025' }
            ],
            seasonId: 87678,
            color: '#16a34a',
            accent: '#facc15'
        },
        {
            id: 'ligue-1',
            name: 'Ligue 1',
            country: 'Franca',
            uniqueTournamentId: 34,
            logo: 'https://api.sofascore.app/api/v1/unique-tournament/34/image',
            seasons: [
                { id: 96127, label: '2026/27' },
                { id: 77356, label: '2025/26' }
            ],
            seasonId: 96127,
            color: '#1d4ed8',
            accent: '#ef4444'
        }
    ],

    render() {
        this.ensureCacheLoaded();
        const container = document.getElementById('app-container');
        if (!container) return;
        const competition = this.getActiveCompetition();
        if (!competition) {
            container.innerHTML = this.renderCatalog();
            return;
        }
        const data = this.getCompetitionData();
        container.innerHTML = `
            <div class="competitions-page wc-cup">
                <section class="comp-header">
                    <div class="comp-title-wrap">
                        ${this.renderCompetitionLogo(data.competition?.logoData || competition.logoData || competition.logo)}
                        <div>
                        <span class="comp-kicker"><i class='bx bx-trophy'></i> Central de Competições</span>
                        <h2>${competition.name} <strong>${this.getActiveSeason().label}</strong></h2>
                        <p>${competition.country} - Sofascore ${this.syncState.message}</p>
                        </div>
                    </div>
                    <div class="comp-header-actions">
                        <button onclick="Competitions.backToCatalog()"><i class='bx bx-grid-alt'></i> Competições</button>
                        <label class="wc-select comp-season-select"><select onchange="Competitions.setSeason(this.value)">
                            ${competition.seasons.map(season => `<option value="${season.id}" ${String(season.id) === String(competition.seasonId) ? 'selected' : ''}>${season.label}</option>`).join('')}
                        </select></label>
                    </div>
                </section>
                ${this.renderTabs()}
                ${this.renderContent(data)}
            </div>
        `;
    },

    renderCatalog() {
        return `
            <div class="competitions-page wc-cup">
                <section class="comp-header">
                    <div>
                        <span class="comp-kicker"><i class='bx bx-trophy'></i> Central de Competições</span>
                        <h2>Competições <strong>Sofascore</strong></h2>
                        <p>Escolha uma liga para carregar jogos, classificação, times e detalhes. Nada pesado é carregado antes do clique.</p>
                    </div>
                </section>
                <section class="comp-catalog-grid">
                    ${this.competitions.map(item => `
                        <button class="comp-catalog-card" onclick="Competitions.openCompetition('${item.id}')">
                            ${this.renderCompetitionLogo(this.getCatalogLogo(item))}
                            <strong>${item.name}</strong>
                            <span>${item.country}</span>
                            <em>${item.seasons.map(season => season.label).join(' / ')}</em>
                        </button>
                    `).join('')}
                </section>
            </div>
        `;
    },

    renderTabs() {
        const tabs = [
            ['dashboard', 'bx-grid-alt', 'Dashboard'],
            ['jogos', 'bx-calendar', 'Jogos'],
            ['classificacao', 'bx-table', 'Classificação'],
            ['ao-vivo', 'bx-pulse', 'Ao Vivo'],
            ['artilheiros', 'bx-football', 'Artilheiros'],
            ['comparador', 'bx-git-compare', 'Comparador'],
            ['times', 'bx-shield-quarter', 'Times']
        ];
        return `<nav class="wc-tabs">${tabs.map(([id, icon, label]) => `<button class="${this.activeTab === id ? 'active' : ''}" onclick="Competitions.setTab('${id}')"><i class='bx ${icon}'></i>${label}</button>`).join('')}</nav>`;
    },

    renderContent(data) {
        if (this.syncState.loading && !data.matches.length) {
            return `<section class="wc-live-empty"><i class='bx bx-loader-alt bx-spin'></i><strong>Carregando competição...</strong><span>Buscando dados no Sofascore.</span></section>`;
        }
        if (this.activeTab === 'jogos') return this.renderGames(data);
        if (this.activeTab === 'classificacao') return this.renderStandings(data);
        if (this.activeTab === 'ao-vivo') return this.renderLive(data);
        if (this.activeTab === 'artilheiros') return this.renderLeaders(data);
        if (this.activeTab === 'comparador') return this.renderCompare(data);
        if (this.activeTab === 'times') return this.renderTeams(data);
        return this.renderDashboard(data);
    },

    renderDashboard(data) {
        const live = data.matches.filter(match => match.status === 'Ao vivo');
        const next = data.matches.filter(match => match.status !== 'Encerrado').slice(0, 6);
        return `
            <section class="wc-summary-row">
                ${this.metric('Jogos', data.matches.length, 'bx-calendar-event')}
                ${this.metric('Times', data.standings.length || this.getTeams(data).length, 'bx-shield-quarter')}
                ${this.metric('Ao vivo', live.length, 'bx-pulse')}
                ${this.metric('Temporada', this.getActiveSeason().label, 'bx-time-five')}
            </section>
            <section class="wc-panel">
                <div class="wc-panel-head"><h3>Próximos jogos</h3><button onclick="Competitions.setTab('jogos')">Ver todos</button></div>
                <div class="comp-next-grid">${next.map(match => this.renderCompactMatch(match)).join('') || this.empty('Sem jogos', 'Nenhum jogo encontrado na base.')}</div>
            </section>
        `;
    },

    renderGames(data) {
        const matches = this.getFilteredMatches(data);
        const byDate = this.groupBy(matches, 'date');
        return `
            <section class="wc-search-row comp-search-row">
                <div class="wc-search"><i class='bx bx-search'></i><input value="${this.filters.search}" oninput="Competitions.setSearch(this.value)" placeholder="Buscar time, estadio ou cidade..."></div>
                <label class="wc-select"><select onchange="Competitions.setFilter('date', this.value)">
                    <option value="all">Todas as datas</option>
                    ${this.getDates(data).map(date => `<option value="${date}" ${this.filters.date === date ? 'selected' : ''}>${this.formatDate(date)}</option>`).join('')}
                </select></label>
            </section>
            <div class="wc-count">${matches.length} jogos</div>
            <section class="wc-games">
                ${Object.keys(byDate).sort().map(date => `<div class="wc-date-block"><h3><i class='bx bx-calendar'></i>${this.formatLongDate(date)} <span>${byDate[date].length} jogos</span></h3>${byDate[date].map(match => this.renderGameRow(match)).join('')}</div>`).join('') || this.empty('Nenhum jogo', 'Ajuste os filtros.')}
            </section>
        `;
    },

    renderLive(data) {
        const live = data.matches.filter(match => match.status === 'Ao vivo');
        return `
            <section class="wc-live-toolbar"><span><i class='bx bx-wifi'></i>${live.length} jogos ao vivo</span><button><i class='bx bx-refresh'></i> Auto ON</button></section>
            <section class="wc-games">${live.map(match => this.renderGameRow(match)).join('') || this.empty('Nenhum jogo ao vivo', 'Os jogos aparecerao aqui em tempo real.')}</section>
        `;
    },

    renderStandings(data) {
        return `
            <section class="wc-table-panel comp-standings">
                <table class="wc-table">
                    <thead><tr><th>#</th><th>Time</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th></tr></thead>
                    <tbody>${data.standings.map(row => `<tr>
                        <td><span class="wc-pos p${Math.min(4, row.position || 4)}">${row.position || '-'}</span></td>
                        <td>${this.renderTeamLogo(row.logoData || row.logo, row.team)} ${row.team}</td>
                        <td>${row.played ?? 0}</td><td>${row.wins ?? 0}</td><td>${row.draws ?? 0}</td><td>${row.losses ?? 0}</td>
                        <td>${row.scoresFor ?? 0}</td><td>${row.scoresAgainst ?? 0}</td><td>${row.goalDiff ?? 0}</td><td>${row.points ?? 0}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </section>
        `;
    },

    renderTeams(data) {
        const teams = data.standings.length
            ? data.standings.map(row => ({
                name: row.team,
                logo: row.logoData || row.logo,
                meta: `${row.points ?? 0} pts - ${row.played ?? 0} jogos`,
                form: (row.form && row.form.length) ? row.form : this.formFromMatches(data, row.team)
            }))
            : this.getTeams(data).map(name => ({ name, logo: this.findTeamLogo(data, name), meta: '', form: this.formFromMatches(data, name) }));
        return `<section class="comp-team-grid">${teams.map(team => `
            <article class="comp-team-card">
                ${this.renderTeamLogo(team.logo, team.name, 'large')}
                <strong>${team.name}</strong>
                <span>${team.meta}</span>
                ${this.formHtml(team.form)}
            </article>`).join('')}</section>`;
    },

    renderLeaders(data) {
        const tabs = [
            ['scorers', 'bx-football', 'Gols'],
            ['assists', 'bx-target-lock', 'Assistencias'],
            ['cards', 'bx-card', 'Cartoes']
        ];
        const items = data[this.leadersTab] || [];
        const columns = this.leadersTab === 'cards'
            ? ['#', 'Jogador', 'Time', 'CA', 'CV']
            : this.leadersTab === 'assists'
                ? ['#', 'Jogador', 'Time', 'Assist.']
                : ['#', 'Jogador', 'Time', 'Gols'];
        return `
            <section class="wc-subtabs comp-leader-tabs">
                ${tabs.map(([id, icon, label]) => `<button class="${this.leadersTab === id ? 'active' : ''}" onclick="Competitions.setLeadersTab('${id}')"><i class='bx ${icon}'></i>${label}</button>`).join('')}
            </section>
            <section class="wc-table-panel comp-leaders">
                <table class="wc-table">
                    <thead><tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr></thead>
                    <tbody>${items.slice(0, 50).map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.player || '-'}</td>
                            <td>${this.renderTeamLogo(this.findTeamLogo(data, item.team), item.team)} ${item.team || '-'}</td>
                            ${this.leadersTab === 'cards'
                                ? `<td>${item.yellowCards || 0}</td><td>${item.redCards || 0}</td>`
                                : `<td>${this.leadersTab === 'assists' ? item.assists || 0 : item.goals || 0}</td>`}
                        </tr>`).join('') || `<tr><td colspan="${columns.length}">Sem dados disponiveis ainda.</td></tr>`}</tbody>
                </table>
            </section>
        `;
    },

    renderCompare(data) {
        const teams = this.getTeams(data);
        if (!teams.length) return this.empty('Sem times', 'Sincronize a competição para comparar os times.');
        const next = data.matches.find(match => match.status !== 'Encerrado');
        const home = teams.includes(this.comparison.home) ? this.comparison.home : (next?.home || teams[0]);
        const away = teams.includes(this.comparison.away) && this.comparison.away !== home
            ? this.comparison.away
            : (next?.away && next.away !== home ? next.away : teams.find(team => team !== home) || teams[0]);
        if (this.comparison.home !== home || this.comparison.away !== away) {
            this.comparison = { home, away };
        }
        const combinedData = this.getCombinedCompetitionData();
        const analysis = this.compareTeams(combinedData, home, away);
        const richState = this.activeCompareMatchId ? this.compareDetails[this.activeCompareMatchId] : null;
        return `
            <section class="comp-compare-toolbar">
                <label class="wc-select"><select onchange="Competitions.setCompareTeam('home', this.value)">
                    ${teams.map(team => `<option value="${this.escapeAttr(team)}" ${team === home ? 'selected' : ''}>${team}</option>`).join('')}
                </select></label>
                <span>vs</span>
                <label class="wc-select"><select onchange="Competitions.setCompareTeam('away', this.value)">
                    ${teams.map(team => `<option value="${this.escapeAttr(team)}" ${team === away ? 'selected' : ''}>${team}</option>`).join('')}
                </select></label>
            </section>
            ${this.compareSummaryHtml(data, analysis)}
            <section class="comp-compare-grid">
                ${this.compareTeamCard(data, analysis.home, 'Casa')}
                ${this.compareTeamCard(data, analysis.away, 'Visitante')}
            </section>
            <section class="comp-compare-grid">
                ${this.compareMetricsHtml(analysis)}
                ${this.h2hHtml(analysis.h2h, richState)}
            </section>
            ${this.richCompareHtml(richState)}
        `;
    },

    compareSummaryHtml(data, analysis) {
        const favorite = analysis.favorite;
        return `
            <section class="comp-favorite-card">
                <div>
                    ${this.renderTeamLogo(this.findTeamLogo(data, favorite.name), favorite.name, 'large')}
                    <span>Favorito calculado</span>
                    <strong>${favorite.name}</strong>
                    <em>${favorite.confidence}% de confianca</em>
                </div>
                <p>${favorite.reason}</p>
            </section>
        `;
    },

    compareTeamCard(data, profile, label) {
        return `
            <article class="comp-compare-card">
                <header>
                    ${this.renderTeamLogo(this.findTeamLogo(data, profile.name), profile.name, 'large')}
                    <div><span>${label}</span><strong>${profile.name}</strong></div>
                    <b>${profile.score}</b>
                </header>
                ${this.formHtml(profile.form)}
                <div class="comp-stat-row"><span>Posicao</span><strong>${profile.position || '-'}</strong></div>
                <div class="comp-stat-row"><span>Pontos / Jogo</span><strong>${profile.ppg.toFixed(2)}</strong></div>
                <div class="comp-stat-row"><span>Gols feitos / Jogo</span><strong>${profile.goalsForAvg.toFixed(2)}</strong></div>
                <div class="comp-stat-row"><span>Gols sofridos / Jogo</span><strong>${profile.goalsAgainstAvg.toFixed(2)}</strong></div>
                <div class="comp-stat-row"><span>Aproveitamento recente</span><strong>${profile.formPoints}/15</strong></div>
                <div class="comp-stat-row"><span>Over 2.5</span><strong>${profile.over25}%</strong></div>
                <div class="comp-stat-row"><span>Ambos marcam</span><strong>${profile.btts}%</strong></div>
                <div class="comp-stat-row"><span>Clean sheets</span><strong>${profile.cleanSheets}</strong></div>
            </article>
        `;
    },

    compareMetricsHtml(analysis) {
        const rows = [
            ['Forca geral', analysis.home.score, analysis.away.score],
            ['Forma recente', analysis.home.formScore, analysis.away.formScore],
            ['Ataque', analysis.home.attackScore, analysis.away.attackScore],
            ['Defesa', analysis.home.defenseScore, analysis.away.defenseScore],
            ['Tabela', analysis.home.tableScore, analysis.away.tableScore],
            ['Casa x Fora', analysis.home.homeAwayScore, analysis.away.homeAwayScore],
            ['Tendencia Over', analysis.home.overScore, analysis.away.overScore]
        ];
        return `<article class="comp-compare-card wide"><h3>Comparacao direta</h3>${rows.map(([label, home, away]) => this.compareBar(label, home, away)).join('')}</article>`;
    },

    compareBar(label, home, away) {
        const total = Math.max(1, Number(home) + Number(away));
        const homeWidth = Math.max(4, Math.round((Number(home) / total) * 100));
        const awayWidth = Math.max(4, 100 - homeWidth);
        return `
            <div class="comp-compare-bar">
                <div><strong>${Math.round(home)}</strong><span>${label}</span><strong>${Math.round(away)}</strong></div>
                <b><i style="width:${homeWidth}%"></i><em style="width:${awayWidth}%"></em></b>
            </div>
        `;
    },

    h2hHtml(h2h, richState = null) {
        const richMatches = this.extractRichH2hMatches(richState?.data);
        const matches = richMatches.length ? richMatches : h2h.matches;
        const summary = richMatches.length ? this.h2hSummaryFromMatches(richMatches, h2h.homeName, h2h.awayName) : h2h;
        return `
            <article class="comp-compare-card wide">
                <h3>Historico entre eles ${richMatches.length ? '<span>Sofascore</span>' : '<span>Local</span>'}</h3>
                <div class="comp-h2h-summary">
                    <span>${summary.homeWins} vitorias casa</span>
                    <span>${summary.draws} empates</span>
                    <span>${summary.awayWins} vitorias visitante</span>
                </div>
                <div class="comp-h2h-list">
                    ${matches.slice(-6).reverse().map(match => `<div><span>${this.formatDate(match.date)}</span><strong>${match.home} ${match.homeScore ?? '-'} x ${match.awayScore ?? '-'} ${match.away}</strong><em>${match.status || ''}</em></div>`).join('') || '<p>Sem confrontos diretos na base carregada.</p>'}
                </div>
            </article>
        `;
    },

    richCompareHtml(state) {
        if (!this.activeCompareMatchId) return '';
        if (!state) return '';
        if (state.loading) return `<section class="comp-rich-compare"><i class='bx bx-loader-alt bx-spin'></i><strong>Buscando H2H e pre-jogo no Sofascore...</strong></section>`;
        if (state.error) return `<section class="comp-rich-compare error">${state.error}</section>`;
        const data = state.data || {};
        const statRows = this.richStatsSummary(data.statistics || []);
        const lastGames = this.extractPregameForm(data.pregame);
        const topPlayers = this.extractTopPlayers(data);
        return `
            <section class="comp-rich-compare">
                <header><h3>Previa Sofascore</h3><span>carregada sob demanda</span></header>
                <div class="comp-rich-grid">
                    <article>
                        <h4>Indicadores do jogo</h4>
                        ${statRows.map(row => `<div class="comp-stat-row"><span>${row.label}</span><strong>${row.home} x ${row.away}</strong></div>`).join('') || '<p>Sem estatisticas pre-jogo disponiveis.</p>'}
                    </article>
                    <article>
                        <h4>Forma recente externa</h4>
                        ${lastGames.length ? lastGames.map(item => `<div class="comp-rich-line"><span>${item.team}</span>${this.formHtml(item.form)}</div>`).join('') : '<p>Sem forma externa disponivel.</p>'}
                    </article>
                    <article>
                        <h4>Destaques</h4>
                        ${topPlayers.length ? topPlayers.map(item => `<div class="comp-rich-line"><span>${item.team}</span><strong>${item.name}</strong><em>${item.rating}</em></div>`).join('') : '<p>Sem ratings ou destaques disponiveis.</p>'}
                    </article>
                </div>
            </section>
        `;
    },

    renderGameRow(match) {
        const score = match.homeScore === null ? match.time : `${match.homeScore} x ${match.awayScore}`;
        const status = this.displayStatus(match);
        return `
            <article class="wc-game-row comp-game-row">
                <span class="wc-stage">Rodada ${match.round || '-'}</span>
                <strong class="home">${this.renderTeamLogo(this.matchTeamLogo(match, 'home'), match.home)} ${match.home}</strong>
                <span class="wc-score">${score}</span>
                <strong class="away">${this.renderTeamLogo(this.matchTeamLogo(match, 'away'), match.away)} ${match.away}</strong>
                <span class="wc-city"><i class='bx bx-map'></i>${this.place(match)}</span>
                <span class="wc-status ${this.statusClass(match.status)}">${status}</span>
                <div class="wc-radar-actions">
                    <button class="compare" onclick="Competitions.openCompare('${this.escapeAttr(match.home)}','${this.escapeAttr(match.away)}','${this.escapeAttr(match.id)}')"><i class='bx bx-git-compare'></i>Comparar</button>
                    <button class="details" onclick="Competitions.toggleDetails('${this.escapeAttr(match.id)}')"><i class='bx bx-list-plus'></i>Detalhes</button>
                </div>
            </article>
            ${this.expandedMatchId === match.id ? this.renderDetails(match) : ''}
        `;
    },

    renderCompactMatch(match) {
        return `<article class="wc-compact-match comp-compact-match">
            <span>Rodada ${match.round || '-'}</span>
            <div><strong>${this.renderTeamLogo(this.matchTeamLogo(match, 'home'), match.home)} ${match.home}</strong><b>vs</b><strong>${this.renderTeamLogo(this.matchTeamLogo(match, 'away'), match.away)} ${match.away}</strong></div>
            <small>${this.formatDate(match.date)} - ${match.time} - ${this.place(match)}</small>
        </article>`;
    },

    renderDetails(match) {
        const state = this.details[match.id] || {};
        if (state.loading) return `<section class="wc-match-details"><div class="wc-details-loading"><i class='bx bx-loader-alt bx-spin'></i> Carregando detalhes...</div></section>`;
        if (state.error) return `<section class="wc-match-details"><div class="wc-details-error">${state.error}</div></section>`;
        if (!state.data) return '';
        const data = state.data;
        return `
            <section class="wc-match-details">
                <div class="wc-details-head"><div><strong>${match.home} <em>${data.match?.homeScore ?? match.homeScore ?? '-'}</em> x <em>${data.match?.awayScore ?? match.awayScore ?? '-'}</em> ${match.away}</strong><span>${this.place(data.match || match)}${data.match?.referee ? ` - Arbitro: ${data.match.referee}` : ''}</span></div><button onclick="Competitions.closeDetails()"><i class='bx bx-x'></i></button></div>
                <div class="wc-details-grid">
                    ${this.detailsBlock('Eventos', this.incidentsHtml(data.incidents || []), 'events')}
                    ${this.detailsBlock('Estatisticas', this.statsHtml(data.statistics || []), 'stats')}
                    ${this.detailsBlock('Pressao', this.momentumHtml(data.momentum || []), 'momentum')}
                    ${this.detailsBlock('Finalizacoes', this.shotsHtml(data.shots || []), 'shots')}
                </div>
            </section>
        `;
    },

    detailsBlock(title, body, type) {
        return `<article class="wc-details-card type-${type}"><h4>${title}</h4>${body || '<p>Sem dados disponiveis.</p>'}</article>`;
    },

    incidentsHtml(items) {
        return `<div class="wc-incident-list">${items.slice(0, 12).map(item => `<div><b>${item.minute || '--'}'</b><span>${item.text || item.player || item.type}</span><em>${item.team || ''}</em></div>`).join('')}</div>`;
    },

    statsHtml(items) {
        return `<div class="wc-stat-list">${items.slice(0, 12).map(item => `<div><strong>${item.home ?? '-'}</strong><span>${item.name}</span><strong>${item.away ?? '-'}</strong></div>`).join('')}</div>`;
    },

    momentumHtml(points) {
        if (!points.length) return '';
        const visible = points.slice(-90);
        const bars = visible.map((point, index) => {
            const value = Math.max(-100, Math.min(100, Number(point.value) || 0));
            const height = Math.max(4, Math.abs(value) / 2);
            const left = visible.length <= 1 ? 0 : (index / (visible.length - 1)) * 100;
            const top = value >= 0 ? 50 - height : 50;
            return `<i title="${point.minute}' ${value}" class="${value >= 0 ? 'home' : 'away'}" style="left:${left}%;top:${top}%;height:${height}%"></i>`;
        }).join('');
        return `<div class="wc-momentum"><span>Casa</span><div class="wc-momentum-chart">${bars}<em></em></div><span>Visitante</span></div>`;
    },

    shotsHtml(shots) {
        const xg = shots.reduce((sum, item) => sum + (Number(item.xg) || 0), 0);
        return `<div class="wc-shot-summary"><strong>${shots.length}</strong><span>chutes</span><strong>${xg.toFixed(2)}</strong><span>xG</span></div><div class="wc-shot-list">${shots.slice(-8).reverse().map(item => `<div><b>${item.minute || '--'}'</b><span>${item.player || '-'}</span><em>${item.xg ? `xG ${Number(item.xg).toFixed(2)}` : item.result}</em></div>`).join('')}</div>`;
    },

    metric(label, value, icon) {
        return `<article class="wc-metric"><i class='bx ${icon}'></i><strong>${value}</strong><span>${label}</span></article>`;
    },

    empty(title, text) {
        return `<section class="wc-live-empty"><i class='bx bx-search'></i><strong>${title}</strong><span>${text}</span></section>`;
    },

    ensureCacheLoaded() {
        if (this.syncState.started) return;
        this.syncState.started = true;
        this.loadCache();
        this.syncState.timer = setInterval(() => {
            if (this.activeCompetitionId) this.sync({ silent: true });
        }, 5 * 60 * 1000);
    },

    async sync({ silent = false } = {}) {
        const competition = this.getActiveCompetition();
        if (!competition || !window.traderCompetitionData?.sync) return;
        const requestKey = this.getDataKey();
        const requestSeasonId = Number(competition.seasonId);
        const requestSeasonLabel = this.getActiveSeason().label;
        const requestToken = ++this.syncToken;
        if (!silent) this.syncState.loading = true;
        this.syncState.message = 'Atualizando...';
        try {
            const result = await window.traderCompetitionData.sync({
                ...competition,
                seasonId: requestSeasonId,
                season: requestSeasonLabel
            });
            if (result?.ok) {
                this.data[requestKey] = this.normalizeCompetitionPayload(result);
                this.saveCache();
                if (requestKey === this.getDataKey() && requestToken === this.syncToken) {
                    this.syncState.lastSync = result.generatedAt;
                    this.syncState.message = `${result.matches?.length || 0} jogos`;
                    this.ensureComparisonTeams(result);
                }
            }
        } catch (error) {
            if (requestKey === this.getDataKey()) this.syncState.message = 'Falha ao sincronizar';
        } finally {
            if (requestKey === this.getDataKey() && requestToken === this.syncToken) {
                this.syncState.loading = false;
                this.render();
            }
        }
    },

    async toggleDetails(matchId) {
        const match = this.getCompetitionData().matches.find(item => item.id === matchId);
        if (!match) return;
        if (this.expandedMatchId === matchId) {
            this.expandedMatchId = null;
            this.render();
            return;
        }
        this.expandedMatchId = matchId;
        if (!this.details[matchId]) {
            this.details[matchId] = { loading: true };
            this.render();
            try {
                const result = await window.traderCompetitionData.matchDetails({ sofascoreId: match.sofascoreId });
                if (!result?.ok) throw new Error(result?.error || 'Sem detalhes.');
                this.details[matchId] = { data: result };
            } catch (error) {
                this.details[matchId] = { error: error.message || String(error) };
            }
        }
        this.render();
    },

    closeDetails() {
        this.expandedMatchId = null;
        this.render();
    },

    openCompetition(id) {
        this.activeCompetitionId = id;
        this.activeTab = 'dashboard';
        this.leadersTab = 'scorers';
        this.details = {};
        this.compareDetails = {};
        this.activeCompareMatchId = null;
        this.comparison = { home: '', away: '' };
        this.expandedMatchId = null;
        this.filters = { search: '', date: 'all' };
        this.updateSyncMessage();
        this.render();
        if (!this.getCompetitionData().matches.length) this.sync({ silent: true });
    },

    backToCatalog() {
        this.activeCompetitionId = null;
        this.expandedMatchId = null;
        this.syncState.message = 'Escolha uma competição';
        this.render();
    },

    setSeason(seasonId) {
        const competition = this.getActiveCompetition();
        if (!competition) return;
        const previousSeasonId = competition.seasonId;
        competition.seasonId = Number(seasonId);
        if (Number(previousSeasonId) === Number(competition.seasonId)) return;
        this.syncToken += 1;
        this.syncState.loading = false;
        this.details = {};
        this.compareDetails = {};
        this.activeCompareMatchId = null;
        this.comparison = { home: '', away: '' };
        this.expandedMatchId = null;
        this.leadersTab = 'scorers';
        this.filters = { search: '', date: 'all' };
        this.updateSyncMessage();
        this.render();
        if (!this.getCompetitionData().matches.length) this.sync({ silent: true });
    },

    setTab(tab) { this.activeTab = tab; this.render(); },
    setLeadersTab(tab) { this.leadersTab = tab; this.render(); },
    setCompareTeam(side, team) {
        this.comparison[side] = team;
        if (this.comparison.home === this.comparison.away) {
            const teams = this.getTeams(this.getCompetitionData());
            const replacement = teams.find(item => item !== team) || team;
            this.comparison[side === 'home' ? 'away' : 'home'] = replacement;
        }
        this.render();
    },
    openCompare(home, away, matchId = '') {
        this.comparison = { home, away };
        this.activeTab = 'comparador';
        this.expandedMatchId = null;
        this.activeCompareMatchId = matchId || null;
        this.render();
        if (matchId) this.loadCompareDetails(matchId);
    },
    async loadCompareDetails(matchId) {
        const match = this.getCompetitionData().matches.find(item => item.id === matchId);
        if (!match || !window.traderCompetitionData?.matchDetails) return;
        if (this.compareDetails[matchId]?.data || this.compareDetails[matchId]?.loading) return;
        this.compareDetails[matchId] = { loading: true };
        this.render();
        try {
            const result = await window.traderCompetitionData.matchDetails({ sofascoreId: match.sofascoreId });
            if (!result?.ok) throw new Error(result?.error || 'Sem dados adicionais.');
            this.compareDetails[matchId] = { data: result };
        } catch (error) {
            this.compareDetails[matchId] = { error: error.message || String(error) };
        }
        if (this.activeCompareMatchId === matchId) this.render();
    },
    setFilter(key, value) { this.filters[key] = value; this.render(); },
    setSearch(value) { this.filters.search = value; this.render(); },

    loadCache() {
        try {
            const parsed = JSON.parse(localStorage.getItem(this.cacheKey) || '{}');
            this.data = parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            this.data = {};
        }
    },

    saveCache() {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(this.data));
        } catch (_) {
            const currentKey = this.getDataKey();
            this.data = currentKey && this.data[currentKey] ? { [currentKey]: this.data[currentKey] } : {};
            localStorage.setItem(this.cacheKey, JSON.stringify(this.data));
        }
    },

    updateSyncMessage() {
        const data = this.getCompetitionData();
        this.syncState.message = data.matches?.length ? `${data.matches.length} jogos` : 'Nao sincronizado';
        this.syncState.lastSync = data.generatedAt || null;
    },

    getActiveCompetition() {
        return this.competitions.find(item => item.id === this.activeCompetitionId) || null;
    },

    getCatalogLogo(competition) {
        if (!competition) return '';
        for (const season of competition.seasons || []) {
            const cached = this.data[`${competition.id}:${season.id}`];
            const logo = cached?.competition?.logoData || cached?.competition?.logo;
            if (logo) return logo;
        }
        return competition.logoData || competition.logo || '';
    },

    getActiveSeason() {
        const competition = this.getActiveCompetition();
        if (!competition) return { id: '', label: '-' };
        return competition.seasons.find(season => Number(season.id) === Number(competition.seasonId)) || competition.seasons[0];
    },

    getDataKey() {
        const competition = this.getActiveCompetition();
        if (!competition) return '';
        return `${competition.id}:${competition.seasonId}`;
    },

    getCompetitionData() {
        const data = this.data[this.getDataKey()];
        const activeSeasonId = Number(this.getActiveCompetition()?.seasonId || 0);
        const dataSeasonId = Number(data?.competition?.seasonId || 0);
        if (!data || (dataSeasonId && activeSeasonId && dataSeasonId !== activeSeasonId)) {
            return { matches: [], standings: [], scorers: [], assists: [], cards: [] };
        }
        return {
            matches: Array.isArray(data.matches) ? data.matches : [],
            standings: Array.isArray(data.standings) ? data.standings : [],
            scorers: Array.isArray(data.scorers) ? data.scorers : [],
            assists: Array.isArray(data.assists) ? data.assists : [],
            cards: Array.isArray(data.cards) ? data.cards : [],
            competition: data.competition || null,
            generatedAt: data.generatedAt || null,
        };
    },

    getCombinedCompetitionData() {
        const active = this.getActiveCompetition();
        const current = this.getCompetitionData();
        if (!active) return current;
        const keys = (active.seasons || []).map(season => `${active.id}:${season.id}`);
        const all = keys.map(key => this.data[key]).filter(Boolean);
        if (!all.length) return current;
        const matchesById = {};
        const standingsByTeam = {};
        const scorers = [];
        const assists = [];
        const cards = [];
        for (const item of all) {
            for (const match of item.matches || []) {
                matchesById[match.id || `${match.date}-${match.home}-${match.away}`] = match;
            }
            for (const row of item.standings || []) {
                standingsByTeam[row.team] = standingsByTeam[row.team] || row;
            }
            scorers.push(...(item.scorers || []));
            assists.push(...(item.assists || []));
            cards.push(...(item.cards || []));
        }
        return {
            ...current,
            matches: Object.values(matchesById).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
            standings: current.standings?.length ? current.standings : Object.values(standingsByTeam),
            scorers: current.scorers?.length ? current.scorers : scorers,
            assists: current.assists?.length ? current.assists : assists,
            cards: current.cards?.length ? current.cards : cards,
        };
    },

    getFilteredMatches(data) {
        const search = this.normalize(this.filters.search);
        return data.matches.filter(match => {
            if (this.filters.date !== 'all' && match.date !== this.filters.date) return false;
            if (!search) return true;
            return this.normalize(`${match.home} ${match.away} ${match.venue} ${match.city}`).includes(search);
        });
    },

    getTeams(data) {
        const fromMatches = (data.matches || []).flatMap(match => [match.home, match.away]);
        const fromStandings = (data.standings || []).map(row => row.team);
        return [...new Set([...fromStandings, ...fromMatches].filter(Boolean))].sort();
    },

    ensureComparisonTeams(data = this.getCompetitionData()) {
        const teams = this.getTeams(data);
        if (!teams.length) {
            this.comparison = { home: '', away: '' };
            return;
        }
        if (!teams.includes(this.comparison.home) || !teams.includes(this.comparison.away) || this.comparison.home === this.comparison.away) {
            const next = data.matches.find(match => match.status !== 'Encerrado');
            const home = next?.home || teams[0];
            const away = next?.away && next.away !== home ? next.away : teams.find(team => team !== home) || teams[0];
            this.comparison = { home, away };
        }
    },

    getDates(data) {
        return [...new Set(data.matches.map(match => match.date))].sort();
    },

    displayStatus(match) {
        if (match.status !== 'Ao vivo') return match.status;
        const start = Number(match.livePeriodStartTimestamp || 0);
        if (start > 0) return `${Math.min(130, Number(match.livePeriodBaseMinute || 0) + Math.max(0, Math.floor((Date.now() / 1000 - start) / 60)))}'`;
        return match.clock || match.statusDetail || 'Ao vivo';
    },

    statusClass(status) {
        return this.normalize(status).replace(/\s+/g, '-');
    },

    place(match) {
        const venue = String(match?.venue || '').trim();
        const city = String(match?.city || '').trim();
        if (venue && city && !venue.toLowerCase().includes(city.toLowerCase())) return `${venue}, ${city}`;
        return venue || city || 'Local a confirmar';
    },

    logoProxy(url) {
        const value = String(url || '');
        if (value.startsWith('data:')) return value;
        return value.replace('https://www.sofascore.com/api/v1/team/', 'https://api.sofascore.app/api/v1/team/');
    },

    renderTeamLogo(url, name, size = '') {
        const src = this.logoProxy(url);
        const fallback = this.initials(name);
        if (!src) return `<span class="comp-logo-fallback ${size}">${fallback}</span>`;
        return `<img class="comp-logo ${size}" src="${src}" alt="${this.escapeAttr(name || '')}" onerror="this.replaceWith(Object.assign(document.createElement('span'), {className:'comp-logo-fallback ${size}', textContent:'${fallback}'}))">`;
    },

    renderCompetitionLogo(url) {
        const src = this.logoProxy(url);
        if (!src) return `<span class="comp-competition-logo"><i class='bx bx-trophy'></i></span>`;
        return `<img class="comp-competition-logo" src="${src}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'), {className:'comp-competition-logo', innerHTML:'<i class=\\'bx bx-trophy\\'></i>'}))">`;
    },

    findTeamLogo(data, teamName) {
        const row = (data.standings || []).find(item => item.team === teamName);
        if (row) return row.logoData || row.logo || '';
        const match = (data.matches || []).find(item => item.home === teamName || item.away === teamName);
        if (!match) return '';
        return match.home === teamName ? (match.homeLogoData || match.homeLogo || '') : (match.awayLogoData || match.awayLogo || '');
    },

    matchTeamLogo(match, side) {
        const data = this.getCompetitionData();
        const teamName = side === 'home' ? match.home : match.away;
        const embedded = side === 'home' ? match.homeLogoData : match.awayLogoData;
        const url = side === 'home' ? match.homeLogo : match.awayLogo;
        return this.findTeamLogo(data, teamName) || embedded || url || '';
    },

    normalizeCompetitionPayload(result) {
        return {
            ...result,
            matches: (result.matches || []).map(match => {
                const { homeLogoData, awayLogoData, ...rest } = match;
                return rest;
            }),
        };
    },

    formFromMatches(data, teamName) {
        return (data.matches || [])
            .filter(match => match.status === 'Encerrado' && (match.home === teamName || match.away === teamName))
            .slice(-5)
            .map(match => {
                const home = match.home === teamName;
                const own = home ? match.homeScore : match.awayScore;
                const other = home ? match.awayScore : match.homeScore;
                if (own > other) return 'W';
                if (own < other) return 'L';
                return 'D';
            });
    },

    compareTeams(data, homeName, awayName) {
        const home = this.teamProfile(data, homeName, true);
        const away = this.teamProfile(data, awayName, false);
        const h2h = this.localH2h(data, homeName, awayName);
        const homeAdvantage = 4;
        const homeTotal = home.score + homeAdvantage + (h2h.homeBias * 2);
        const awayTotal = away.score + (h2h.awayBias * 2);
        const diff = Math.abs(homeTotal - awayTotal);
        const favorite = homeTotal >= awayTotal ? home : away;
        const confidence = Math.max(51, Math.min(86, Math.round(52 + diff * 0.55)));
        const reasons = [];
        if (home.position && away.position && home.position !== away.position) {
            reasons.push(`${home.position < away.position ? home.name : away.name} esta melhor na tabela`);
        }
        if (Math.abs(home.formScore - away.formScore) >= 6) {
            reasons.push(`${home.formScore > away.formScore ? home.name : away.name} chega em melhor forma`);
        }
        if (Math.abs(home.attackScore - away.attackScore) >= 5) {
            reasons.push(`${home.attackScore > away.attackScore ? home.name : away.name} tem ataque mais forte`);
        }
        if (Math.abs(home.homeAwayScore - away.homeAwayScore) >= 8) {
            reasons.push(`${home.homeAwayScore > away.homeAwayScore ? home.name : away.name} tem melhor recorte casa/fora`);
        }
        if (h2h.matches.length) reasons.push('historico direto da base foi considerado');
        if (favorite.name === home.name) reasons.push('mando de campo pesa a favor');
        return {
            home,
            away,
            h2h,
            favorite: {
                name: favorite.name,
                confidence,
                reason: reasons.slice(0, 3).join(', ') || 'equilibrio alto pelos dados atuais da liga',
            },
        };
    },

    teamProfile(data, teamName, isHomeSide = false) {
        const row = (data.standings || []).find(item => item.team === teamName) || {};
        const matches = (data.matches || []).filter(match => match.status === 'Encerrado' && (match.home === teamName || match.away === teamName));
        const homeMatches = matches.filter(match => match.home === teamName);
        const awayMatches = matches.filter(match => match.away === teamName);
        const sideMatches = isHomeSide ? homeMatches : awayMatches;
        const played = Number(row.played ?? matches.length ?? 0);
        const wins = Number(row.wins ?? 0);
        const draws = Number(row.draws ?? 0);
        const points = Number(row.points ?? wins * 3 + draws);
        const goalsFor = Number(row.scoresFor ?? matches.reduce((sum, match) => sum + (match.home === teamName ? Number(match.homeScore || 0) : Number(match.awayScore || 0)), 0));
        const goalsAgainst = Number(row.scoresAgainst ?? matches.reduce((sum, match) => sum + (match.home === teamName ? Number(match.awayScore || 0) : Number(match.homeScore || 0)), 0));
        const form = ((row.form && row.form.length) ? row.form : this.formFromMatches(data, teamName)).slice(-5);
        const formPoints = form.reduce((sum, value) => {
            const normalized = String(value || '').toUpperCase();
            if (['W', 'V'].includes(normalized)) return sum + 3;
            if (['D', 'E'].includes(normalized)) return sum + 1;
            return sum;
        }, 0);
        const ppg = played ? points / played : 0;
        const goalsForAvg = played ? goalsFor / played : 0;
        const goalsAgainstAvg = played ? goalsAgainst / played : 0;
        const totalTeams = Math.max(2, (data.standings || []).length || this.getTeams(data).length);
        const tableScore = row.position ? ((totalTeams - Number(row.position) + 1) / totalTeams) * 100 : 50;
        const formScore = (formPoints / Math.max(1, form.length * 3)) * 100;
        const attackScore = Math.min(100, goalsForAvg * 35);
        const defenseScore = Math.max(0, 100 - goalsAgainstAvg * 35);
        const over15 = this.percent(matches, match => Number(match.homeScore || 0) + Number(match.awayScore || 0) >= 2);
        const over25 = this.percent(matches, match => Number(match.homeScore || 0) + Number(match.awayScore || 0) >= 3);
        const btts = this.percent(matches, match => Number(match.homeScore || 0) > 0 && Number(match.awayScore || 0) > 0);
        const cleanSheets = matches.filter(match => (match.home === teamName ? Number(match.awayScore || 0) : Number(match.homeScore || 0)) === 0).length;
        const blanks = matches.filter(match => (match.home === teamName ? Number(match.homeScore || 0) : Number(match.awayScore || 0)) === 0).length;
        const sidePoints = sideMatches.reduce((sum, match) => {
            const own = match.home === teamName ? Number(match.homeScore || 0) : Number(match.awayScore || 0);
            const other = match.home === teamName ? Number(match.awayScore || 0) : Number(match.homeScore || 0);
            if (own > other) return sum + 3;
            if (own === other) return sum + 1;
            return sum;
        }, 0);
        const homeAwayScore = sideMatches.length ? Math.min(100, (sidePoints / (sideMatches.length * 3)) * 100) : 50;
        const overScore = Math.round((over15 * 0.4) + (over25 * 0.4) + (btts * 0.2));
        const score = Math.round(
            (tableScore * 0.28) +
            (Math.min(100, ppg * 33.3) * 0.24) +
            (formScore * 0.17) +
            (attackScore * 0.16) +
            (defenseScore * 0.10) +
            (homeAwayScore * 0.05) +
            (isHomeSide ? 4 : 0)
        );
        return {
            name: teamName,
            position: row.position || '',
            played,
            points,
            ppg,
            goalsForAvg,
            goalsAgainstAvg,
            form,
            formPoints,
            tableScore,
            formScore,
            attackScore,
            defenseScore,
            homeAwayScore,
            overScore,
            over15,
            over25,
            btts,
            cleanSheets,
            blanks,
            score,
        };
    },

    localH2h(data, homeName, awayName) {
        const matches = (data.matches || []).filter(match => {
            const teams = [match.home, match.away];
            return match.status === 'Encerrado' && teams.includes(homeName) && teams.includes(awayName);
        });
        let homeWins = 0;
        let awayWins = 0;
        let draws = 0;
        for (const match of matches) {
            const homeGoals = Number(match.homeScore || 0);
            const awayGoals = Number(match.awayScore || 0);
            if (homeGoals === awayGoals) {
                draws += 1;
            } else {
                const winner = homeGoals > awayGoals ? match.home : match.away;
                if (winner === homeName) homeWins += 1;
                if (winner === awayName) awayWins += 1;
            }
        }
        return {
            matches,
            homeName,
            awayName,
            homeWins,
            awayWins,
            draws,
            homeBias: matches.length ? (homeWins - awayWins) / matches.length : 0,
            awayBias: matches.length ? (awayWins - homeWins) / matches.length : 0,
        };
    },

    percent(items, predicate) {
        const list = items || [];
        if (!list.length) return 0;
        return Math.round((list.filter(predicate).length / list.length) * 100);
    },

    extractRichH2hMatches(data) {
        if (!data?.h2h) return [];
        const candidates = [
            data.h2h.events,
            data.h2h.matches,
            data.h2h?.h2h?.events,
            data.h2h?.h2h?.matches,
        ].find(Array.isArray) || [];
        return candidates.map(event => {
            const home = event.homeTeam || event.home || {};
            const away = event.awayTeam || event.away || {};
            const homeScore = event.homeScore || {};
            const awayScore = event.awayScore || {};
            const dateParts = event.startTimestamp ? this.dateHourFromTimestamp(event.startTimestamp) : { date: event.date || '', time: event.time || '' };
            return {
                id: event.id || event.sofascoreId || '',
                date: dateParts.date,
                time: dateParts.time,
                home: this.teamLabel(home),
                away: this.teamLabel(away),
                homeScore: homeScore.current ?? homeScore.display ?? event.homeScore ?? null,
                awayScore: awayScore.current ?? awayScore.display ?? event.awayScore ?? null,
                status: event.status?.description || event.status || '',
            };
        }).filter(match => match.home && match.away);
    },

    h2hSummaryFromMatches(matches, homeName, awayName) {
        let homeWins = 0;
        let awayWins = 0;
        let draws = 0;
        for (const match of matches || []) {
            const homeScore = Number(match.homeScore);
            const awayScore = Number(match.awayScore);
            if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue;
            if (homeScore === awayScore) draws += 1;
            const winner = homeScore > awayScore ? match.home : match.away;
            if (winner === homeName) homeWins += 1;
            if (winner === awayName) awayWins += 1;
        }
        return { homeWins, awayWins, draws };
    },

    richStatsSummary(items) {
        const wanted = [
            ['ballPossession', 'Posse'],
            ['expectedGoals', 'xG'],
            ['totalShotsOnGoal', 'Chutes'],
            ['shotsOnGoal', 'Chutes no gol'],
            ['cornerKicks', 'Escanteios'],
            ['yellowCards', 'Cartoes amarelos'],
        ];
        return wanted.map(([key, label]) => {
            const row = (items || []).find(item => item.key === key);
            return row ? { label, home: row.home ?? '-', away: row.away ?? '-' } : null;
        }).filter(Boolean);
    },

    extractPregameForm(pregame) {
        const result = [];
        const candidates = [
            ['Casa', pregame?.homeTeamForm || pregame?.homeForm || pregame?.home],
            ['Visitante', pregame?.awayTeamForm || pregame?.awayForm || pregame?.away],
        ];
        for (const [team, value] of candidates) {
            const form = Array.isArray(value)
                ? value.map(item => item.result || item.outcome || item).filter(Boolean)
                : String(value?.form || value || '').split('').filter(Boolean);
            if (form.length) result.push({ team, form: form.slice(-5) });
        }
        return result;
    },

    extractTopPlayers(data) {
        const home = data?.lineups?.home?.best || [];
        const away = data?.lineups?.away?.best || [];
        return [
            ...home.slice(0, 3).map(item => ({ team: data.match?.home || 'Casa', name: item.name, rating: item.rating })),
            ...away.slice(0, 3).map(item => ({ team: data.match?.away || 'Visitante', name: item.name, rating: item.rating })),
        ].filter(item => item.name);
    },

    dateHourFromTimestamp(timestamp) {
        const date = new Date(Number(timestamp) * 1000);
        return {
            date: date.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
            time: date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
        };
    },

    teamLabel(team) {
        if (typeof team === 'string') return team;
        return team?.name || team?.shortName || team?.displayName || '';
    },

    formHtml(form) {
        const values = (form || []).slice(-5);
        if (!values.length) return `<div class="comp-form"><span class="empty">Sem forma</span></div>`;
        return `<div class="comp-form">${values.map(value => `<span class="${this.formClass(value)}">${this.formLabel(value)}</span>`).join('')}</div>`;
    },

    formClass(value) {
        const normalized = String(value || '').toUpperCase();
        if (['W', 'V'].includes(normalized)) return 'win';
        if (['D', 'E'].includes(normalized)) return 'draw';
        return 'loss';
    },

    formLabel(value) {
        const normalized = String(value || '').toUpperCase();
        if (normalized === 'W') return 'V';
        if (normalized === 'D') return 'E';
        if (normalized === 'L') return 'D';
        return normalized.slice(0, 1) || '-';
    },

    initials(value) {
        return String(value || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    },

    formatDate(value) {
        const date = new Date(`${value}T12:00:00-03:00`);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },

    formatLongDate(value) {
        const date = new Date(`${value}T12:00:00-03:00`);
        return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    },

    groupBy(items, key) {
        return items.reduce((acc, item) => {
            acc[item[key]] = acc[item[key]] || [];
            acc[item[key]].push(item);
            return acc;
        }, {});
    },

    normalize(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    },

    escapeAttr(value) {
        return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }
};

window.Competitions = Competitions;
