const WorldCup = {
    activeTab: 'jogos',
    knockoutView: 'cards',
    activeGroup: 'A',
    leaderTab: 'goals',
    simulatedScores: {},
    favoriteMatchIds: [],
    favoritesLoaded: false,
    compareTeams: {
        home: 'Brazil',
        away: 'Argentina'
    },
    expandedMatchId: null,
    matchDetails: {},
    selectedTeam: 'Spain',
    filters: {
        group: 'all',
        date: 'all',
        team: 'all',
        search: ''
    },
    syncState: {
        status: 'idle',
        message: 'Base local',
        lastSync: null,
        timer: null,
        started: false
    },
    syncCacheKey: 'worldcup_sync_cache_v5',

    groups: {
        A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
        B: ['Canada', 'Bosnia & Herzegovina', 'Qatar', 'Switzerland'],
        C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
        D: ['USA', 'Paraguay', 'Australia', 'Turkey'],
        E: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'],
        F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
        G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
        H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
        I: ['France', 'Senegal', 'Iraq', 'Norway'],
        J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
        K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
        L: ['England', 'Croatia', 'Ghana', 'Panama']
    },

    teamRatings: {
        Spain: 89.1, England: 88.0, France: 86.0, Netherlands: 85.7, Croatia: 83.3, Germany: 83.0,
        Belgium: 82.0, Argentina: 81.7, Austria: 79.0, Portugal: 77.1, Switzerland: 76.0, Sweden: 70.5,
        Colombia: 63.8, Brazil: 63.8, Ghana: 63.6, Scotland: 63.3, USA: 51.2, 'South Korea': 53.7,
        Mexico: 53.0, Curacao: 52.6, Ecuador: 50.6, 'Saudi Arabia': 50.0, 'South Africa': 49.7,
        Canada: 47.0, Qatar: 47.9, Paraguay: 46.9, Haiti: 45.6, Jordan: 44.5, Uzbekistan: 43.5,
        Australia: 60.0, Algeria: 68.9, Morocco: 86.0, Egypt: 57.8, Iran: 57.8, Norway: 74.0,
        Senegal: 71.0, Japan: 65.9, 'New Zealand': 44.0, Tunisia: 70.5, 'Ivory Coast': 71.1,
        Turkey: 68.8, Iraq: 46.0, 'DR Congo': 54.1, Panama: 58.4, 'Bosnia & Herzegovina': 57.1,
        'Cape Verde': 55.0, 'Czech Republic': 62.6
    },

    flags: {
        Mexico: 'mx',
        'South Africa': 'za',
        'South Korea': 'kr',
        'Czech Republic': 'cz',
        Canada: 'ca',
        'Bosnia & Herzegovina': 'ba',
        Qatar: 'qa',
        Switzerland: 'ch',
        Brazil: 'br',
        Morocco: 'ma',
        Haiti: 'ht',
        Scotland: 'gb-sct',
        USA: 'us',
        Paraguay: 'py',
        Australia: 'au',
        Turkey: 'tr',
        Germany: 'de',
        Curacao: 'cw',
        'Ivory Coast': 'ci',
        Ecuador: 'ec',
        Netherlands: 'nl',
        Japan: 'jp',
        Sweden: 'se',
        Tunisia: 'tn',
        Belgium: 'be',
        Egypt: 'eg',
        Iran: 'ir',
        'New Zealand': 'nz',
        Spain: 'es',
        'Cape Verde': 'cv',
        'Saudi Arabia': 'sa',
        Uruguay: 'uy',
        France: 'fr',
        Senegal: 'sn',
        Iraq: 'iq',
        Norway: 'no',
        Argentina: 'ar',
        Algeria: 'dz',
        Austria: 'at',
        Jordan: 'jo',
        Portugal: 'pt',
        'DR Congo': 'cd',
        Uzbekistan: 'uz',
        Colombia: 'co',
        England: 'gb-eng',
        Croatia: 'hr',
        Ghana: 'gh',
        Panama: 'pa'
    },

    matches: [
        { id: 'wc26-g01', group: 'A', date: '2026-06-11', time: '16:00', home: 'Mexico', away: 'South Africa', venue: 'Estadio Azteca', city: 'Mexico City', status: 'Encerrado', homeScore: 2, awayScore: 0 },
        { id: 'wc26-g02', group: 'A', date: '2026-06-11', time: '23:00', home: 'South Korea', away: 'Czech Republic', venue: 'Estadio Akron', city: 'Guadalajara', status: 'Encerrado', homeScore: 2, awayScore: 1 },
        { id: 'wc26-g03', group: 'B', date: '2026-06-12', time: '16:00', home: 'Canada', away: 'Bosnia & Herzegovina', venue: 'BMO Field', city: 'Toronto', status: 'Encerrado', homeScore: 1, awayScore: 1 },
        { id: 'wc26-g04', group: 'D', date: '2026-06-12', time: '22:00', home: 'USA', away: 'Paraguay', venue: 'SoFi Stadium', city: 'Los Angeles', status: 'Encerrado', homeScore: 4, awayScore: 1 },
        { id: 'wc26-g05', group: 'B', date: '2026-06-13', time: '16:00', home: 'Qatar', away: 'Switzerland', venue: "Levi's Stadium", city: 'San Francisco Bay Area', status: 'Encerrado', homeScore: 1, awayScore: 1 },
        { id: 'wc26-g06', group: 'C', date: '2026-06-13', time: '19:00', home: 'Brazil', away: 'Morocco', venue: 'MetLife Stadium', city: 'New York/New Jersey', status: 'Encerrado', homeScore: 1, awayScore: 1 },
        { id: 'wc26-g07', group: 'C', date: '2026-06-13', time: '22:00', home: 'Haiti', away: 'Scotland', venue: 'Gillette Stadium', city: 'Boston', status: 'Encerrado', homeScore: 0, awayScore: 1 },
        { id: 'wc26-g08', group: 'D', date: '2026-06-14', time: '01:00', home: 'Australia', away: 'Turkey', venue: 'BC Place', city: 'Vancouver', status: 'Encerrado', homeScore: 2, awayScore: 0 },
        { id: 'wc26-g09', group: 'E', date: '2026-06-14', time: '14:00', home: 'Germany', away: 'Curacao', venue: 'NRG Stadium', city: 'Houston', status: 'Encerrado', homeScore: 7, awayScore: 1 },
        { id: 'wc26-g10', group: 'F', date: '2026-06-14', time: '17:00', home: 'Netherlands', away: 'Japan', venue: 'AT&T Stadium', city: 'Dallas', status: 'Encerrado', homeScore: 2, awayScore: 2 },
        { id: 'wc26-g11', group: 'G', date: '2026-06-15', time: '16:00', home: 'Belgium', away: 'Egypt', venue: 'Lumen Field', city: 'Seattle', status: 'Encerrado', homeScore: 1, awayScore: 1 },
        { id: 'wc26-g12', group: 'H', date: '2026-06-15', time: '13:00', home: 'Spain', away: 'Cape Verde', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'Encerrado', homeScore: 0, awayScore: 0 },
        { id: 'wc26-g13', group: 'I', date: '2026-06-16', time: '16:00', home: 'France', away: 'Senegal', venue: 'MetLife Stadium', city: 'New York/New Jersey', status: 'Encerrado', homeScore: 3, awayScore: 1 },
        { id: 'wc26-g14', group: 'J', date: '2026-06-16', time: '22:00', home: 'Argentina', away: 'Algeria', venue: 'Arrowhead Stadium', city: 'Kansas City', status: 'Encerrado', homeScore: 3, awayScore: 0 },
        { id: 'wc26-g15', group: 'K', date: '2026-06-17', time: '14:00', home: 'Portugal', away: 'DR Congo', venue: 'NRG Stadium', city: 'Houston', status: 'Encerrado', homeScore: 1, awayScore: 1 },
        { id: 'wc26-g16', group: 'L', date: '2026-06-17', time: '17:00', home: 'England', away: 'Croatia', venue: 'AT&T Stadium', city: 'Dallas', status: 'Encerrado', homeScore: 4, awayScore: 2 },
        { id: 'wc26-g17', group: 'A', date: '2026-06-18', time: '13:00', home: 'Czech Republic', away: 'South Africa', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'Encerrado', homeScore: 1, awayScore: 1 },
        { id: 'wc26-g18', group: 'B', date: '2026-06-18', time: '19:00', home: 'Canada', away: 'Qatar', venue: 'BC Place', city: 'Vancouver', status: 'Encerrado', homeScore: 6, awayScore: 0 },
        { id: 'wc26-g19', group: 'E', date: '2026-06-20', time: '17:00', home: 'Germany', away: 'Ivory Coast', venue: 'BMO Field', city: 'Toronto', status: 'Agendado', homeScore: null, awayScore: null }
    ],

    scorers: [
        { player: 'Lionel Messi', team: 'Argentina', goals: 3, assists: 0, games: 1, min: 90 },
        { player: 'Jonathan David', team: 'Canada', goals: 2, assists: 0, games: 2, min: 180 },
        { player: 'Kylian Mbappe', team: 'France', goals: 2, assists: 0, games: 1, min: 90 },
        { player: 'Folarin Balogun', team: 'USA', goals: 2, assists: 0, games: 1, min: 90 }
    ],
    assists: [],
    cards: [],
    baseGroups: null,

    tabs: [
        ['dashboard', 'bx-grid-alt', 'Dashboard'],
        ['jogos', 'bx-calendar', 'Jogos'],
        ['classificacao', 'bx-table', 'Classificacao'],
        ['mata-mata', 'bx-git-branch', 'Mata-Mata'],
        ['ao-vivo', 'bx-pulse', 'Ao Vivo'],
        ['artilheiros', 'bx-medal', 'Artilheiros'],
        ['selecoes', 'bx-flag', 'Selecoes'],
        ['estatisticas', 'bx-bar-chart', 'Estatisticas'],
        ['pre-analise', 'bx-brain', 'Pre-Analise'],
        ['simulador', 'bx-git-branch', 'Simulador'],
        ['power-ranking', 'bx-star', 'Power Ranking'],
        ['comparador', 'bx-transfer-alt', 'Comparador'],
        ['meus-jogos', 'bx-heart', 'Meus Jogos']
    ],

    render() {
        const container = document.getElementById('app-container');
        if (!container) return;
        this.loadFavorites();
        this.ensureAutoSync();

        container.innerHTML = `
            <div class="worldcup-page wc-cup">
                ${this.renderHeader()}
                ${this.renderTabs()}
                ${this.renderTabContent()}
            </div>
        `;
    },

    renderHeader() {
        return `
            <section class="wc-header">
                <div>
                    <h2><i class='bx bx-trophy'></i> Copa do Mundo <strong>2026</strong></h2>
                    <p>EUA - Mexico - Canada ${this.renderSyncStatus()}</p>
                </div>
            </section>
        `;
    },

    renderSyncStatus() {
        const cls = this.syncState.status;
        return `<span class="wc-auto-sync ${cls}">${this.syncState.message}</span>`;
    },

    renderTabs() {
        return `
            <nav class="wc-tabs">
                ${this.tabs.map(([id, icon, label]) => `
                    <button class="${this.activeTab === id ? 'active' : ''}" onclick="WorldCup.setTab('${id}')">
                        <i class='bx ${icon}'></i>${label}
                    </button>
                `).join('')}
            </nav>
        `;
    },

    renderTabContent() {
        switch (this.activeTab) {
            case 'dashboard': return this.renderDashboard();
            case 'classificacao': return this.renderStandings();
            case 'mata-mata': return this.renderKnockout();
            case 'ao-vivo': return this.renderLive();
            case 'artilheiros': return this.renderScorers();
            case 'selecoes': return this.renderTeams();
            case 'pre-analise': return this.renderPreAnalysis();
            case 'simulador': return this.renderSimulator();
            case 'power-ranking': return this.renderPowerRanking();
            case 'comparador': return this.renderComparator();
            case 'estatisticas': return this.renderStats();
            case 'meus-jogos': return this.renderFavoriteMatches();
            default: return this.renderGames();
        }
    },

    renderDashboard() {
        const next = this.matches.filter(match => match.status !== 'Encerrado').slice(0, 4);
        return `
            <section class="wc-summary-row">
                ${this.renderMetric('Jogos', this.matches.length, 'bx-calendar-event')}
                ${this.renderMetric('Selecoes', this.getTeams().length, 'bx-shield-quarter')}
                ${this.renderMetric('Grupos', Object.keys(this.groups).length, 'bx-table')}
                ${this.renderMetric('Ao vivo', this.getLiveMatches().length, 'bx-pulse')}
            </section>
            <section class="wc-panel">
                <div class="wc-panel-head"><h3>Proximos jogos</h3><button onclick="WorldCup.setTab('jogos')">Ver todos</button></div>
                <div class="wc-next-grid">${next.map(match => this.renderCompactMatch(match)).join('')}</div>
            </section>
        `;
    },

    renderGames() {
        const matches = this.getFilteredMatches();
        const byDate = this.groupBy(matches, 'date');
        return `
            <section class="wc-search-row">
                <div class="wc-search"><i class='bx bx-search'></i><input value="${this.filters.search}" oninput="WorldCup.setSearch(this.value)" placeholder="Buscar selecao, estadio ou cidade..."></div>
                ${this.renderSelect('group', 'Grupo', this.getGroups().map(group => ({ value: group, label: `Grupo ${group}` })))}
                ${this.renderSelect('date', 'Data', this.getDates().map(date => ({ value: date, label: this.formatDate(date) })))}
                ${this.renderSelect('team', 'Selecao', this.getTeams().map(team => ({ value: team, label: team })))}
            </section>
            <div class="wc-count">${matches.length} jogos</div>
            <section class="wc-games">
                ${Object.keys(byDate).sort().map(date => `
                    <div class="wc-date-block">
                        <h3><i class='bx bx-calendar'></i>${this.formatLongDate(date)} <span>${byDate[date].length} jogos</span></h3>
                        ${byDate[date].map(match => this.renderGameRow(match)).join('')}
                    </div>
                `).join('') || this.renderEmpty()}
            </section>
        `;
    },

    renderStandings() {
        const standings = this.getAllStandings();
        return `
            <section class="wc-legend">
                <span><b class="ok"></b>Classificado</span>
                <span><b class="warn"></b>Possivel 3 melhor</span>
                <span><b class="bad"></b>Eliminado</span>
            </section>
            <section class="wc-groups-grid">
                ${Object.keys(this.groups).map(group => this.renderGroupTable(group, standings[group])).join('')}
            </section>
            ${this.renderThirdPlaceRanking(standings)}
        `;
    },

    renderKnockout() {
        const standings = this.getAllStandings();
        const qualified = this.getQualifiedSnapshot(standings);
        const rounds = this.getKnockoutRounds(qualified);
        return `
            <section class="wc-knockout-hero">
                <div>
                    <h3><i class='bx bx-git-branch'></i> Mata-Mata Projetado</h3>
                    <p>Confrontos montados pela classificacao atual. Vagas de melhores terceiros exibem os grupos possiveis e os terceiros atualmente elegiveis.</p>
                </div>
                <span>${qualified.thirds.length}/8 melhores terceiros</span>
            </section>
            <div class="wc-knockout-viewbar">
                <button class="${this.knockoutView === 'cards' ? 'active' : ''}" onclick="WorldCup.setKnockoutView('cards')"><i class='bx bx-grid-alt'></i> Cards</button>
                <button class="${this.knockoutView === 'bracket' ? 'active' : ''}" onclick="WorldCup.setKnockoutView('bracket')"><i class='bx bx-git-branch'></i> Chaveamento</button>
            </div>
            ${this.knockoutView === 'bracket' ? this.renderKnockoutBracket(rounds) : this.renderKnockoutCards(rounds)}
        `;
    },

    renderKnockoutCards(rounds) {
        const matchesByDate = rounds.flatMap(round => round.matches.map(match => ({ ...match, stage: round.name })))
            .reduce((acc, match) => {
                const meta = this.getKnockoutMatchMeta(match.number);
                acc[meta.date] = acc[meta.date] || [];
                acc[meta.date].push(match);
                return acc;
            }, {});
        return `
            <section class="wc-knockout-days">
                ${Object.keys(matchesByDate).sort((a, b) => this.knockoutDateSortValue(a) - this.knockoutDateSortValue(b)).map(date => `
                    <article class="wc-knockout-day">
                        <h3><i class='bx bx-calendar'></i>${date}<span>${matchesByDate[date].length} jogos</span></h3>
                        <div class="wc-knockout-grid">${matchesByDate[date]
                            .sort((a, b) => this.knockoutMatchSortValue(a) - this.knockoutMatchSortValue(b))
                            .map(match => this.renderKnockoutMatch(match)).join('')}</div>
                    </article>
                `).join('')}
            </section>
        `;
    },

    knockoutDateSortValue(value) {
        const [day, month] = String(value || '').split('/').map(Number);
        return (month || 0) * 100 + (day || 0);
    },

    knockoutMatchSortValue(match) {
        const meta = this.getKnockoutMatchMeta(match.number);
        const [hour, minute] = String(meta.time || '00:00').split(':').map(Number);
        return this.knockoutDateSortValue(meta.date) * 1440 + (hour || 0) * 60 + (minute || 0);
    },

    renderKnockoutBracket(rounds) {
        const finalRound = rounds.find(round => round.name === 'Final');
        const thirdRound = rounds.find(round => round.name === '3o Lugar');
        const bracketRounds = rounds.filter(round => !['Final', '3o Lugar'].includes(round.name));
        if (finalRound || thirdRound) {
            bracketRounds.push({
                name: 'Final',
                finalColumn: true,
                matches: [
                    ...(finalRound?.matches || []).map(match => ({ ...match, bracketLabel: 'Final' })),
                    ...(thirdRound?.matches || []).map(match => ({ ...match, bracketLabel: '3o Lugar' }))
                ]
            });
        }
        return `
            <section class="wc-bracket-shell">
                <div class="wc-bracket">
                    ${bracketRounds.map(round => `
                        <div class="wc-bracket-round ${round.finalColumn ? 'is-final-round' : ''}">
                            <h3>${round.name}</h3>
                            <div class="wc-bracket-stack">
                                ${this.sortKnockoutBracketMatches(round.name, round.matches)
                                    .map(match => this.renderBracketMatch({ ...match, stage: round.name })).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    },

    sortKnockoutBracketMatches(roundName, matches) {
        const orders = {
            '16 avos de final': [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
            'Oitavas': [90, 89, 93, 94, 91, 92, 95, 96],
            'Quartas': [97, 98, 99, 100],
            'Semifinais': [101, 102],
            'Final + 3o Lugar': [104, 103]
        };
        const order = orders[roundName];
        if (!order) return matches || [];
        return [...(matches || [])].sort((a, b) => {
            const left = order.indexOf(Number(a.number));
            const right = order.indexOf(Number(b.number));
            return (left === -1 ? 999 : left) - (right === -1 ? 999 : right);
        });
    },

    renderBracketMatch(match) {
        const meta = this.getKnockoutMatchMeta(match.number);
        const home = typeof match.home === 'string' ? { label: match.home, pending: true } : match.home;
        const away = typeof match.away === 'string' ? { label: match.away, pending: true } : match.away;
        const place = [meta.venue, meta.city].filter(Boolean).join(' - ');
        return `
            <article class="wc-bracket-match" ${place ? `title="${place}"` : ''}>
                ${match.bracketLabel ? `<span class="wc-bracket-match-label">${match.bracketLabel}</span>` : ''}
                <div class="wc-bracket-card">
                    <div class="wc-bracket-card-teams">
                        ${this.bracketCardTeamHtml(home)}
                        ${this.bracketCardTeamHtml(away)}
                    </div>
                    <time class="wc-bracket-card-time">
                        <small>Jogo ${match.number}</small>
                        <span>${this.knockoutWeekdayLabel(meta.date)}</span>
                        <strong>${meta.time || '-'}</strong>
                        <em>${this.knockoutShortDate(meta.date)}</em>
                    </time>
                </div>
            </article>
        `;
    },

    bracketCardTeamHtml(slot) {
        if (!slot) {
            return `<div class="wc-bracket-card-team pending"><i class='bx bx-shield-quarter'></i><strong>A definir</strong></div>`;
        }
        if (slot.team) {
            return `
                <div class="wc-bracket-card-team">
                    <span>${this.getFlag(slot.team, 40)}</span>
                    <strong>${slot.team}</strong>
                    ${slot.seed ? `<em>${slot.seed}</em>` : ''}
                </div>
            `;
        }
        const label = slot.label || 'A definir';
        return `
            <div class="wc-bracket-card-team pending">
                <i class='bx bx-shield-quarter'></i>
                <strong>${label}</strong>
                ${slot.candidates?.length ? `<em>${slot.candidates.map(item => `${this.getFlag(item.team)} ${item.team}`).join(' / ')}</em>` : ''}
            </div>
        `;
    },

    knockoutWeekdayLabel(value) {
        const [day, month] = String(value || '').split('/').map(Number);
        if (!day || !month) return '';
        const date = new Date(2026, month - 1, day, 12);
        const labels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
        return labels[date.getDay()] || '';
    },

    knockoutShortDate(value) {
        const [day, month] = String(value || '').split('/').map(Number);
        const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        return `${String(day || '').padStart(2, '0')} ${months[(month || 1) - 1] || ''}`.trim();
    },

    renderKnockoutMatch(match) {
        const home = typeof match.home === 'string' ? { label: match.home, pending: true } : match.home;
        const away = typeof match.away === 'string' ? { label: match.away, pending: true } : match.away;
        const meta = this.getKnockoutMatchMeta(match.number);
        const place = [meta.venue, meta.city].filter(Boolean).join(' - ');
        return `
            <div class="wc-knockout-match">
                <header>
                    <span><strong>${match.stage || 'Mata-Mata'}</strong><small>Jogo ${match.number}</small></span>
                    <em><i class='bx bx-calendar-event'></i>${meta.date}${meta.time ? ` - ${meta.time} BRT` : ''}</em>
                </header>
                <div class="wc-ko-team ${home.pending ? 'pending' : ''}">${this.knockoutTeamHtml(home)}</div>
                <b>vs</b>
                <div class="wc-ko-team ${away.pending ? 'pending' : ''}">${this.knockoutTeamHtml(away)}</div>
                ${place ? `<p><i class='bx bx-map'></i>${place}</p>` : ''}
                ${match.note ? `<small>${match.note}</small>` : ''}
            </div>
        `;
    },

    knockoutTeamHtml(slot) {
        if (!slot) return '<strong>A definir</strong>';
        const label = slot.label || slot.team || 'A definir';
        if (slot.team) {
            return `<span class="wc-ko-flag">${this.getFlag(slot.team, 80)}</span><span class="wc-ko-info"><strong>${slot.team}</strong><em>${slot.seed || ''}</em></span>`;
        }
        return `<span class="wc-ko-flag pending"><i class='bx bx-shield-quarter'></i></span><span class="wc-ko-info"><strong>${label}</strong>${slot.candidates?.length ? `<em>${slot.candidates.map(item => `${this.getFlag(item.team)} ${item.team}`).join(' / ')}</em>` : ''}</span>`;
    },

    renderLive() {
        const live = this.getLiveMatches();
        return `
            <section class="wc-live-toolbar">
                <span><i class='bx bx-wifi'></i>${live.length} jogos ao vivo</span>
                <button><i class='bx bx-refresh'></i> Auto ON</button>
            </section>
            ${live.length ? `
                <section class="wc-games wc-live-games">
                    ${live.map(match => this.renderGameRow(match)).join('')}
                </section>
            ` : `
                <section class="wc-live-empty">
                    <i class='bx bx-time-five'></i>
                    <strong>Nenhum jogo ao vivo no momento</strong>
                    <span>Os jogos aparecerao aqui em tempo real durante a Copa.</span>
                </section>
            `}
            <section class="wc-panel">
                <div class="wc-panel-head"><h3>Proximos jogos</h3></div>
                <div class="wc-next-grid">${this.matches.filter(match => match.status !== 'Encerrado').slice(0, 4).map(match => this.renderCompactMatch(match)).join('')}</div>
            </section>
        `;
    },

    renderScorers() {
        const tabs = [
            ['goals', 'Artilheiros'],
            ['assists', 'Assistencias'],
            ['yellowCards', 'Cartoes Amarelos'],
            ['redCards', 'Cartoes Vermelhos']
        ];
        return `
            <section class="wc-subtabs">
                ${tabs.map(([key, label]) => `<button class="${this.leaderTab === key ? 'active' : ''}" onclick="WorldCup.setLeaderTab('${key}')">${label}</button>`).join('')}
            </section>
            ${this.renderLeaderTable()}
        `;
    },

    renderLeaderTable() {
        const config = {
            goals: { title: 'Gols', items: this.scorers, field: 'goals' },
            assists: { title: 'Assist.', items: this.assists, field: 'assists' },
            yellowCards: { title: 'Amarelos', items: this.cards.filter(item => item.yellowCards > 0), field: 'yellowCards' },
            redCards: { title: 'Vermelhos', items: this.cards.filter(item => item.redCards > 0), field: 'redCards' }
        }[this.leaderTab] || { title: 'Gols', items: this.scorers, field: 'goals' };
        const items = [...(config.items || [])].sort((a, b) => (b[config.field] || 0) - (a[config.field] || 0) || a.player.localeCompare(b.player));

        if (!items.length) return this.renderPlaceholder('Sem dados ainda', 'Os rankings serao preenchidos automaticamente quando o Sofascore liberar eventos dos jogos.');

        return `
            <section class="wc-table-panel">
                <table class="wc-table">
                    <thead><tr><th>#</th><th>Jogador</th><th>Selecao</th><th>${config.title}</th></tr></thead>
                    <tbody>${items.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.player}</td>
                            <td>${this.getFlag(item.team)} ${item.team}</td>
                            <td><strong>${item[config.field] || 0}</strong></td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </section>
        `;
    },

    renderTeams() {
        const teams = this.getTeams().sort((a, b) => this.getRating(b) - this.getRating(a));
        return `
            <section class="wc-search-row">
                <div class="wc-search"><i class='bx bx-search'></i><input value="${this.filters.search}" oninput="WorldCup.setSearch(this.value)" placeholder="Buscar selecao..."></div>
                <button class="wc-rank-btn">Por Ranking</button>
            </section>
            <section class="wc-teams-layout">
                <div class="wc-teams-grid">
                    ${teams.filter(team => this.matchesSearch(team)).slice(0, 24).map((team, index) => this.renderTeamCard(team, index + 1)).join('')}
                </div>
                ${this.renderTeamDrawer(this.selectedTeam)}
            </section>
        `;
    },

    renderPreAnalysis() {
        const team = this.selectedTeam || 'Brazil';
        const rating = this.getRating(team);
        return `
            <section class="wc-analysis-hero">
                <h3><i class='bx bx-brain'></i> Pre-Analise Copa 2026</h3>
                <p>Selecione uma selecao para ver a analise composta por ranking, eliminatorias, forma recente, elenco e fator casa.</p>
            </section>
            <section class="wc-analysis-select">
                <label>Selecione uma Selecao ${this.renderTeamSelect(team)}</label>
                <div><strong>${rating.toFixed(1)}</strong><span>Power</span></div>
                <div><strong>#${this.getPowerPosition(team)}</strong><span>Posicao</span></div>
            </section>
            <section class="wc-analysis-grid">
                <article class="wc-power-big"><i class='bx bx-star'></i><strong>${rating.toFixed(1)}</strong><span>Power Ranking Get Up</span><small>#${this.getPowerPosition(team)} de ${this.getTeams().length} selecoes</small></article>
                <article class="wc-bars">
                    <h3>Composicao do Rating</h3>
                    ${this.renderBar('Ranking FIFA', Math.min(98, rating + 8), '#4b8cff')}
                    ${this.renderBar('Eliminatorias', Math.max(35, rating - 15), '#2fd36b')}
                    ${this.renderBar('Qualidade Elenco', Math.min(99, rating + 2), '#ff8b3d')}
                    ${this.renderBar('Forma Recente', Math.max(38, rating - 20), '#ffd23f')}
                    ${this.renderBar('Fator Casa', team === 'USA' || team === 'Mexico' || team === 'Canada' ? 82 : 50, '#a855f7')}
                </article>
            </section>
        `;
    },

    renderSimulator() {
        const group = this.activeGroup;
        const teams = this.groups[group] || [];
        const table = this.getSimulatedStandings(group);
        const thirdRanking = this.renderThirdPlaceRanking(Object.fromEntries(Object.keys(this.groups).map(item => [item, this.getSimulatedStandings(item)])));
        return `
            <section class="wc-subtabs">
                <button class="active">Fase de Grupos</button><button>Mata-Mata</button><button onclick="WorldCup.resetSimulator()">Resetar</button>
            </section>
            <section class="wc-group-tabs">
                ${Object.keys(this.groups).map(item => `<button class="${group === item ? 'active' : ''}" onclick="WorldCup.setGroup('${item}')">Grupo ${item}</button>`).join('')}
            </section>
            <section class="wc-sim-grid">
                <article class="wc-panel">
                    <div class="wc-panel-head"><h3>Jogos - Grupo ${group}</h3></div>
                    <div class="wc-sim-games">${this.buildGroupPairings(teams).map(match => this.renderSimGame(match)).join('')}</div>
                </article>
                <article class="wc-panel">
                    <div class="wc-panel-head"><h3>Classificacao - Grupo ${group}</h3></div>
                    ${this.renderGroupTable(group, table, true)}
                </article>
            </section>
            ${thirdRanking}
        `;
    },

    renderPowerRanking() {
        const teams = this.getTeams().sort((a, b) => this.getRating(b) - this.getRating(a));
        return `<section class="wc-ranking-list">${teams.map((team, index) => this.renderRankingRow(team, index + 1)).join('')}</section>`;
    },

    renderComparator() {
        const teams = this.getTeams();
        const left = this.compareTeams.home || teams[0];
        const right = this.compareTeams.away || teams[1];
        return `
            <section class="wc-comparator">
                <div>${this.renderTeamSelect(left, 'compareA')}</div>
                <span>VS</span>
                <div>${this.renderTeamSelect(right, 'compareB')}</div>
            </section>
            <section class="wc-compare-grid">
                ${this.renderCompareTeam(left)}
                ${this.renderCompareCenter(left, right)}
                ${this.renderCompareTeam(right)}
            </section>
        `;
    },

    renderCompareTeam(team) {
        const group = this.getTeamGroup(team);
        const row = this.getStandings(group).find(item => item.team === team) || {};
        const matches = this.getTeamMatches(team);
        const goalsFor = matches.reduce((sum, match) => sum + this.getTeamScore(match, team, 'for'), 0);
        const goalsAgainst = matches.reduce((sum, match) => sum + this.getTeamScore(match, team, 'against'), 0);
        return `
            <article class="wc-compare-card">
                <h3>${this.getFlag(team)} ${team}</h3>
                <span>Grupo ${group} - #${this.getPowerPosition(team)} Power</span>
                <div class="wc-compare-stats">
                    <div><strong>${this.getRating(team).toFixed(1)}</strong><small>Power</small></div>
                    <div><strong>${row.pts || 0}</strong><small>Pontos</small></div>
                    <div><strong>${row.j || 0}</strong><small>Jogos</small></div>
                    <div><strong>${row.sg || 0}</strong><small>Saldo</small></div>
                    <div><strong>${goalsFor}</strong><small>Gols Pro</small></div>
                    <div><strong>${goalsAgainst}</strong><small>Gols Contra</small></div>
                </div>
            </article>
        `;
    },

    renderCompareCenter(left, right) {
        const direct = this.getDirectMatch(left, right);
        const label = direct
            ? `${this.formatDate(direct.date)} - ${direct.homeScore ?? '-'} x ${direct.awayScore ?? '-'}`
            : 'Sem confronto direto na base';
        const favorite = this.getRating(left) === this.getRating(right) ? 'Equilibrado' : (this.getRating(left) > this.getRating(right) ? left : right);
        return `
            <article class="wc-compare-center">
                <strong>${favorite}</strong>
                <span>vantagem pelo Power Ranking</span>
                <small>${label}</small>
            </article>
        `;
    },

    renderFavoriteMatches() {
        const matches = this.matches.filter(match => this.isFavoriteMatch(match));
        return `
            <section class="wc-panel">
                <div class="wc-panel-head"><h3>Meus Jogos</h3><button onclick="WorldCup.setTab('jogos')">Adicionar jogos</button></div>
                <div class="wc-games">
                    ${matches.map(match => this.renderGameRow(match)).join('') || this.renderPlaceholder('Nenhum jogo favoritado', 'Marque a estrela nos cards dos jogos para acompanhar aqui.')}
                </div>
            </section>
        `;
    },

    renderStats() {
        return `
            <section class="wc-summary-row">
                ${this.renderMetric('Gols', this.matches.reduce((sum, match) => sum + (match.homeScore || 0) + (match.awayScore || 0), 0), 'bx-football')}
                ${this.renderMetric('Empates', this.matches.filter(match => match.homeScore !== null && match.homeScore === match.awayScore).length, 'bx-equalizer')}
                ${this.renderMetric('Jogos encerrados', this.matches.filter(match => match.status === 'Encerrado').length, 'bx-check-circle')}
                ${this.renderMetric('Pendentes', this.matches.filter(match => match.status !== 'Encerrado').length, 'bx-time')}
            </section>
        `;
    },

    renderMetric(label, value, icon) {
        return `<article class="wc-metric"><i class='bx ${icon}'></i><strong>${value}</strong><span>${label}</span></article>`;
    },

    renderGameRow(match) {
        const score = match.homeScore === null ? match.time.replace(/ UTC.*$/, '') : `${match.homeScore} x ${match.awayScore}`;
        const status = this.getMatchDisplayStatus(match);
        const isFavorite = this.isFavoriteMatch(match);
        const place = this.getMatchPlace(match);
        return `
            <article class="wc-game-row ${isFavorite ? 'favorite' : ''}">
                <button class="wc-star ${isFavorite ? 'active' : ''}" onclick="WorldCup.toggleFavoriteMatch('${this.escapeAttr(match.id)}')" title="Favoritar jogo"><i class='bx ${isFavorite ? 'bxs-star' : 'bx-star'}'></i></button>
                <span class="wc-stage">${this.getMatchStageLabel(match)}</span>
                <strong class="home">${match.home} ${this.getFlag(match.home)}</strong>
                <span class="wc-score">${score}</span>
                <strong class="away">${this.getFlag(match.away)} ${match.away}</strong>
                <span class="wc-city"><i class='bx bx-map'></i>${place}</span>
                <span class="wc-status ${this.getStatusClass(match.status)}">${status}</span>
                ${this.renderMatchRadarActions(match, true)}
            </article>
            ${this.expandedMatchId === match.id ? this.renderMatchDetails(match) : ''}
        `;
    },

    renderCompactMatch(match) {
        const broadcasts = Array.isArray(match.broadcasts) && match.broadcasts.length ? ` - ${match.broadcasts.slice(0, 2).join(', ')}` : '';
        const place = this.getMatchPlace(match);
        return `
            <article class="wc-compact-match">
                <span>${this.getMatchStageLabel(match)}</span>
                <div><strong>${this.getFlag(match.home)} ${match.home}</strong><b>vs</b><strong>${this.getFlag(match.away)} ${match.away}</strong></div>
                <small>${this.formatDate(match.date)} - ${match.time.replace(/ UTC.*$/, '')}${place ? ` - ${place}` : ''}${broadcasts}</small>
                ${this.renderMatchRadarActions(match, false)}
            </article>
        `;
    },

    getMatchPlace(match) {
        const venue = String(match.venue || '').trim();
        const city = String(match.city || '').trim();
        if (venue && city && !venue.toLowerCase().includes(city.toLowerCase())) return `${venue}, ${city}`;
        return venue || city || 'Local a confirmar';
    },

    renderMatchRadarActions(match, includeDetails = true) {
        return `
            <div class="wc-radar-actions">
                ${includeDetails ? `<button class="details" onclick="WorldCup.toggleMatchDetails('${this.escapeAttr(match.id)}')" title="Detalhes Sofascore"><i class='bx bx-list-plus'></i>Detalhes</button>` : ''}
                <button class="mod" onclick="WorldCup.openRadarMod('${this.escapeAttr(match.id)}')" title="Radar MOD"><i class='bx bx-crosshair'></i>MOD</button>
                <button class="football" onclick="WorldCup.openRadarFutebol('${this.escapeAttr(match.id)}')" title="Radar Futebol"><i class='bx bx-radar'></i></button>
            </div>
        `;
    },

    renderMatchDetails(match) {
        const state = this.matchDetails[match.id] || {};
        if (state.loading) {
            return `<section class="wc-match-details"><div class="wc-details-loading"><i class='bx bx-loader-alt bx-spin'></i> Carregando dados do Sofascore...</div></section>`;
        }
        if (state.error) {
            return `<section class="wc-match-details"><div class="wc-details-error">${state.error}</div></section>`;
        }
        if (!state.data) {
            return `<section class="wc-match-details"><div class="wc-details-loading">Abrindo detalhes...</div></section>`;
        }

        const data = state.data;
        const home = data.match?.home || match.home;
        const away = data.match?.away || match.away;
        const stats = data.statistics || [];
        const incidents = data.incidents || [];
        const shots = data.shots || [];
        const momentum = data.momentum || [];
        const pregame = data.pregame || {};
        const homeLineup = data.lineups?.home || {};
        const awayLineup = data.lineups?.away || {};
        const bestPlayers = [...(homeLineup.best || []).map(item => ({ ...item, team: home })), ...(awayLineup.best || []).map(item => ({ ...item, team: away }))]
            .filter(item => item.rating)
            .sort((a, b) => Number(b.rating) - Number(a.rating))
            .slice(0, 6);
        const keyStats = this.getKeyStats(stats);

        return `
            <section class="wc-match-details">
                <div class="wc-details-head">
                    <div>
                        <strong>${this.getFlag(home)} ${home} <em>${data.match?.homeScore ?? match.homeScore ?? '-'}</em> x <em>${data.match?.awayScore ?? match.awayScore ?? '-'}</em> ${away} ${this.getFlag(away)}</strong>
                        <span>${this.getMatchPlace({ venue: data.match?.venue || match.venue, city: data.match?.city || match.city })}${data.match?.referee ? ` - Arbitro: ${data.match.referee}` : ''}</span>
                    </div>
                    <button onclick="WorldCup.closeMatchDetails()"><i class='bx bx-x'></i></button>
                </div>
                <div class="wc-details-summary">
                    ${keyStats.map(item => `<div><span>${item.label}</span><strong>${item.home}</strong><b>${item.away}</b></div>`).join('')}
                </div>
                <div class="wc-details-grid">
                    ${this.renderDetailsBlock('Eventos importantes', this.renderIncidentList(incidents), 'events')}
                    ${this.renderDetailsBlock('Estatisticas completas', this.renderStatsList(stats), 'stats')}
                    ${this.renderDetailsBlock('Escalacoes', this.renderLineups(home, away, homeLineup, awayLineup, data.lineups?.confirmed), 'lineups')}
                    ${this.renderDetailsBlock('Pressao do jogo', this.renderMomentum(momentum, home, away), 'momentum')}
                    ${this.renderDetailsBlock('Finalizacoes', this.renderShots(shots), 'shots')}
                    ${this.renderDetailsBlock('Pre-jogo e ratings', this.renderPregame(pregame, home, away, bestPlayers), 'pregame')}
                </div>
            </section>
        `;
    },

    renderDetailsBlock(title, body, type = '') {
        return `<article class="wc-details-card ${type ? `type-${type}` : ''}"><h4>${title}</h4>${body || '<p>Sem dados disponiveis.</p>'}</article>`;
    },

    getKeyStats(items) {
        const wanted = [
            ['ballPossession', 'Posse'],
            ['expectedGoals', 'xG'],
            ['totalShotsOnGoal', 'Chutes'],
            ['shotsOnGoal', 'No gol'],
            ['cornerKicks', 'Escanteios'],
            ['fouls', 'Faltas']
        ];
        return wanted.map(([key, label]) => {
            const item = items.find(stat => stat.key === key);
            return { label, home: item?.home ?? '-', away: item?.away ?? '-' };
        });
    },

    renderIncidentList(items) {
        if (!items.length) return '';
        return `<div class="wc-incident-list">${items.slice(0, 12).map(item => {
            const minute = item.minute ? `${item.minute}${item.addedTime ? `+${item.addedTime}` : ''}'` : '--';
            const label = this.describeIncident(item);
            return `<div><b>${minute}</b><span>${label}</span><em>${item.team || ''}</em></div>`;
        }).join('')}</div>`;
    },

    describeIncident(item) {
        if (item.type === 'goal') return `Gol ${item.player || ''}${item.assist1 ? `, assist. ${item.assist1}` : ''}`;
        if (item.type === 'card') return `${String(item.class || '').includes('red') ? 'Cartao vermelho' : 'Cartao amarelo'} ${item.player || ''}`;
        if (item.type === 'substitution') return `Substituicao ${item.playerIn || ''} por ${item.playerOut || ''}`;
        if (item.type === 'var') return `VAR ${item.text || ''}`;
        return `${item.text || item.type || 'Evento'} ${item.player || ''}`;
    },

    renderStatsList(items) {
        if (!items.length) return '';
        const preferred = ['Ball possession', 'Expected goals', 'Total shots', 'Shots on target', 'Corner kicks', 'Fouls', 'Goalkeeper saves', 'Big chances', 'Shots off target', 'Blocked shots'];
        const weight = name => preferred.includes(name) ? preferred.indexOf(name) : 999;
        const ordered = [...items].sort((a, b) => weight(a.name) - weight(b.name));
        return `<div class="wc-stat-list">${ordered.slice(0, 12).map(item => `
            <div><strong>${item.home ?? '-'}</strong><span>${this.translateStat(item.name)}</span><strong>${item.away ?? '-'}</strong></div>
        `).join('')}</div>`;
    },

    translateStat(name) {
        const map = {
            'Ball possession': 'Posse',
            'Expected goals': 'xG',
            'Big chances': 'Grandes chances',
            'Total shots': 'Chutes',
            'Shots on target': 'Chutes no gol',
            'Goalkeeper saves': 'Defesas',
            'Corner kicks': 'Escanteios',
            Fouls: 'Faltas',
            'Shots off target': 'Chutes fora',
            'Blocked shots': 'Chutes bloqueados',
            'Free kicks': 'Faltas cobradas',
            Offsides: 'Impedimentos'
        };
        return map[name] || name;
    },

    renderLineups(home, away, homeLineup, awayLineup, confirmed) {
        return `
            <div class="wc-lineup-meta">${confirmed ? 'Confirmadas' : 'Provaveis'} - ${homeLineup.formation || '-'} x ${awayLineup.formation || '-'}</div>
            <div class="wc-lineups">
                ${this.renderLineupSide(home, homeLineup)}
                ${this.renderLineupSide(away, awayLineup)}
            </div>
        `;
    },

    renderLineupSide(team, lineup) {
        const starters = lineup.starters || [];
        return `<div><b>${team}</b><small>Tec: ${lineup.manager || '-'}</small>${starters.slice(0, 11).map(item => `<span>${item.number ? `${item.number}. ` : ''}${item.shortName || item.name}${item.rating ? ` <em>${Number(item.rating).toFixed(1)}</em>` : ''}</span>`).join('') || '<span>Sem escalacao</span>'}</div>`;
    },

    renderMomentum(points, home, away) {
        if (!points.length) return '';
        const visible = points.slice(-90);
        const bars = visible.map((point, index) => {
            const value = Math.max(-100, Math.min(100, Number(point.value) || 0));
            const height = Math.max(4, Math.abs(value) / 2);
            const left = visible.length <= 1 ? 0 : (index / (visible.length - 1)) * 100;
            const top = value >= 0 ? 50 - height : 50;
            return `<i title="${point.minute}' ${value}" class="${value >= 0 ? 'home' : 'away'}" style="left:${left}%;top:${top}%;height:${height}%"></i>`;
        }).join('');
        return `<div class="wc-momentum"><span>${home}</span><div class="wc-momentum-chart">${bars}<em></em></div><span>${away}</span></div>`;
    },

    renderShots(shots) {
        if (!shots.length) return '';
        const goals = shots.filter(item => item.goal).length;
        const xg = shots.reduce((sum, item) => sum + (Number(item.xg) || 0), 0);
        return `
            <div class="wc-shot-summary"><strong>${shots.length}</strong><span>chutes</span><strong>${goals}</strong><span>gols</span><strong>${xg.toFixed(2)}</strong><span>xG</span></div>
            <div class="wc-shot-list">${shots.slice(-8).reverse().map(item => `<div><b>${item.minute || '--'}'</b><span>${item.player || '-'}</span><em>${item.xg ? `xG ${Number(item.xg).toFixed(2)}` : item.result}</em></div>`).join('')}</div>
        `;
    },

    renderPregame(pregame, home, away, bestPlayers) {
        const homeForm = Array.isArray(pregame.homeTeam?.form) ? pregame.homeTeam.form.join(' ') : '-';
        const awayForm = Array.isArray(pregame.awayTeam?.form) ? pregame.awayTeam.form.join(' ') : '-';
        return `
            <div class="wc-pregame">
                <div><b>${home}</b><span>Forma ${homeForm}</span><em>Rating ${pregame.homeTeam?.avgRating || '-'}</em></div>
                <div><b>${away}</b><span>Forma ${awayForm}</span><em>Rating ${pregame.awayTeam?.avgRating || '-'}</em></div>
            </div>
            <div class="wc-best-players">${bestPlayers.map(item => `<span>${item.shortName || item.name} <b>${Number(item.rating).toFixed(1)}</b></span>`).join('') || '<span>Sem ratings</span>'}</div>
        `;
    },

    renderGroupTable(group, rows, compact = false) {
        return `
            <article class="wc-group-card ${compact ? 'compact' : ''}">
                <h3>Grupo ${group}</h3>
                <table>
                    <thead><tr><th>#</th><th>Selecao</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>PTS</th></tr></thead>
                    <tbody>${rows.map((row, index) => `
                        <tr>
                            <td><span class="wc-pos p${index + 1}">${index + 1}</span></td>
                            <td>${this.getFlag(row.team)} ${row.team}<em>${this.getRating(row.team).toFixed(1)}</em></td>
                            <td>${row.j}</td><td>${row.v}</td><td>${row.e}</td><td>${row.d}</td><td>${row.sg}</td><td>${row.pts}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </article>
        `;
    },

    renderThirdPlaceRanking(standings = this.getAllStandings()) {
        const rows = Object.keys(standings)
            .map(group => ({ ...standings[group][2], group }))
            .filter(row => row?.team)
            .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp || this.getRating(b.team) - this.getRating(a.team));

        return `
            <article class="wc-group-card wc-third-ranking">
                <h3>Ranking dos 3 colocados</h3>
                <table>
                    <thead><tr><th>#</th><th>Selecao</th><th>Grupo</th><th>J</th><th>SG</th><th>PTS</th><th>Status</th></tr></thead>
                    <tbody>${rows.map((row, index) => `
                        <tr class="${index < 8 ? 'qualified' : 'out'}">
                            <td><span class="wc-pos p${index < 8 ? 2 : 4}">${index + 1}</span></td>
                            <td>${this.getFlag(row.team)} ${row.team}</td>
                            <td>${row.group}</td>
                            <td>${row.j}</td>
                            <td>${row.sg}</td>
                            <td>${row.pts}</td>
                            <td>${index < 8 ? 'Classifica' : 'Fora'}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </article>
        `;
    },

    getQualifiedSnapshot(standings = this.getAllStandings()) {
        const winners = {};
        const runners = {};
        Object.keys(this.groups).forEach(group => {
            const rows = standings[group] || [];
            winners[group] = rows[0] ? { ...rows[0], group, seed: `1o Grupo ${group}` } : null;
            runners[group] = rows[1] ? { ...rows[1], group, seed: `2o Grupo ${group}` } : null;
        });
        const thirds = Object.keys(standings)
            .map(group => ({ ...(standings[group]?.[2] || {}), group, seed: `3o Grupo ${group}` }))
            .filter(row => row?.team)
            .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp || this.getRating(b.team) - this.getRating(a.team))
            .slice(0, 8);
        return { winners, runners, thirds };
    },

    getKnockoutRounds(qualified) {
        const thirdAssignments = this.resolveThirdPlaceAssignments(qualified);
        const r32 = [
            [73, this.runnerSlot(qualified, 'A'), this.runnerSlot(qualified, 'B')],
            [74, this.winnerSlot(qualified, 'E'), this.thirdSlot(qualified, ['A', 'B', 'C', 'D', 'F'], thirdAssignments, 74)],
            [75, this.winnerSlot(qualified, 'F'), this.runnerSlot(qualified, 'C')],
            [76, this.winnerSlot(qualified, 'C'), this.runnerSlot(qualified, 'F')],
            [77, this.winnerSlot(qualified, 'I'), this.thirdSlot(qualified, ['C', 'D', 'F', 'G', 'H'], thirdAssignments, 77)],
            [78, this.runnerSlot(qualified, 'E'), this.runnerSlot(qualified, 'I')],
            [79, this.winnerSlot(qualified, 'A'), this.thirdSlot(qualified, ['C', 'E', 'F', 'H', 'I'], thirdAssignments, 79)],
            [80, this.winnerSlot(qualified, 'L'), this.thirdSlot(qualified, ['E', 'H', 'I', 'J', 'K'], thirdAssignments, 80)],
            [81, this.winnerSlot(qualified, 'D'), this.thirdSlot(qualified, ['B', 'E', 'F', 'I', 'J'], thirdAssignments, 81)],
            [82, this.winnerSlot(qualified, 'G'), this.thirdSlot(qualified, ['A', 'E', 'H', 'I', 'J'], thirdAssignments, 82)],
            [83, this.runnerSlot(qualified, 'K'), this.runnerSlot(qualified, 'L')],
            [84, this.winnerSlot(qualified, 'H'), this.runnerSlot(qualified, 'J')],
            [85, this.winnerSlot(qualified, 'B'), this.thirdSlot(qualified, ['E', 'F', 'G', 'I', 'J'], thirdAssignments, 85)],
            [86, this.winnerSlot(qualified, 'J'), this.runnerSlot(qualified, 'H')],
            [87, this.winnerSlot(qualified, 'K'), this.thirdSlot(qualified, ['D', 'E', 'I', 'J', 'L'], thirdAssignments, 87)],
            [88, this.runnerSlot(qualified, 'D'), this.runnerSlot(qualified, 'G')]
        ].map(([number, home, away]) => ({ number, home, away }));

        return [
            { name: '16 avos de final', matches: r32 },
            { name: 'Oitavas', matches: [
                this.futureMatch(89, 73, 75),
                this.futureMatch(90, 74, 77),
                this.futureMatch(91, 76, 78),
                this.futureMatch(92, 79, 80),
                this.futureMatch(93, 83, 84),
                this.futureMatch(94, 81, 82),
                this.futureMatch(95, 86, 88),
                this.futureMatch(96, 85, 87)
            ] },
            { name: 'Quartas', matches: [
                this.futureMatch(97, 89, 90),
                this.futureMatch(98, 93, 94),
                this.futureMatch(99, 91, 92),
                this.futureMatch(100, 95, 96)
            ] },
            { name: 'Semifinais', matches: [
                this.futureMatch(101, 97, 98),
                this.futureMatch(102, 99, 100)
            ] },
            { name: '3o Lugar', matches: [
                { number: 103, home: 'Perdedor Jogo 101', away: 'Perdedor Jogo 102' }
            ] },
            { name: 'Final', matches: [
                { number: 104, home: 'Vencedor Jogo 101', away: 'Vencedor Jogo 102' }
            ] }
        ];
    },

    winnerSlot(qualified, group) {
        return this.groupSlot(qualified.winners[group], `1o Grupo ${group}`);
    },

    runnerSlot(qualified, group) {
        return this.groupSlot(qualified.runners[group], `2o Grupo ${group}`);
    },

    resolveThirdPlaceAssignments(qualified) {
        const groupsKey = (qualified.thirds || [])
            .filter(row => row?.team)
            .map(row => row.group)
            .sort()
            .join('');
        const row = this.getThirdPlaceCombinationMap()[groupsKey];
        if (!row) return {};

        const thirdsByGroup = Object.fromEntries((qualified.thirds || []).map(item => [item.group, item]));
        const matchesByColumn = [79, 85, 81, 74, 82, 77, 87, 80];
        return Object.fromEntries(row.map((group, index) => [matchesByColumn[index], thirdsByGroup[group]]).filter(([, team]) => team?.team));
    },

    getThirdPlaceCombinationMap() {
        if (this.thirdPlaceCombinationMap) return this.thirdPlaceCombinationMap;
        const raw = `EFGHIJKL:EJIFHGLK\nDFGHIJKL:HGIDJFLK\nDEGHIJKL:EJIDHGLK\nDEFHIJKL:EJIDHFLK\nDEFGIJKL:EGIDJFLK\nDEFGHJKL:EGJDHFLK\nDEFGHIKL:EGIDHFLK\nDEFGHIJL:EGJDHFLI\nDEFGHIJK:EGJDHFIK\nCFGHIJKL:HGICJFLK\nCEGHIJKL:EJICHGLK\nCEFHIJKL:EJICHFLK\nCEFGIJKL:EGICJFLK\nCEFGHJKL:EGJCHFLK\nCEFGHIKL:EGICHFLK\nCEFGHIJL:EGJCHFLI\nCEFGHIJK:EGJCHFIK\nCDGHIJKL:HGICJDLK\nCDFHIJKL:CJIDHFLK\nCDFGIJKL:CGIDJFLK\nCDFGHJKL:CGJDHFLK\nCDFGHIKL:CGIDHFLK\nCDFGHIJL:CGJDHFLI\nCDFGHIJK:CGJDHFIK\nCDEHIJKL:EJICHDLK\nCDEGIJKL:EGICJDLK\nCDEGHJKL:EGJCHDLK\nCDEGHIKL:EGICHDLK\nCDEGHIJL:EGJCHDLI\nCDEGHIJK:EGJCHDIK\nCDEFIJKL:CJEDIFLK\nCDEFHJKL:CJEDHFLK\nCDEFHIKL:CEIDHFLK\nCDEFHIJL:CJEDHFLI\nCDEFHIJK:CJEDHFIK\nCDEFGJKL:CGEDJFLK\nCDEFGIKL:CGEDIFLK\nCDEFGIJL:CGEDJFLI\nCDEFGIJK:CGEDJFIK\nCDEFGHKL:CGEDHFLK\nCDEFGHJL:CGJDHFLE\nCDEFGHJK:CGJDHFEK\nCDEFGHIL:CGEDHFLI\nCDEFGHIK:CGEDHFIK\nCDEFGHIJ:CGJDHFEI\nBFGHIJKL:HJBFIGLK\nBEGHIJKL:EJIBHGLK\nBEFHIJKL:EJBFIHLK\nBEFGIJKL:EJBFIGLK\nBEFGHJKL:EJBFHGLK\nBEFGHIKL:EGBFIHLK\nBEFGHIJL:EJBFHGLI\nBEFGHIJK:EJBFHGIK\nBDGHIJKL:HJBDIGLK\nBDFHIJKL:HJBDIFLK\nBDFGIJKL:IGBDJFLK\nBDFGHJKL:HGBDJFLK\nBDFGHIKL:HGBDIFLK\nBDFGHIJL:HGBDJFLI\nBDFGHIJK:HGBDJFIK\nBDEHIJKL:EJBDIHLK\nBDEGIJKL:EJBDIGLK\nBDEGHJKL:EJBDHGLK\nBDEGHIKL:EGBDIHLK\nBDEGHIJL:EJBDHGLI\nBDEGHIJK:EJBDHGIK\nBDEFIJKL:EJBDIFLK\nBDEFHJKL:EJBDHFLK\nBDEFHIKL:EIBDHFLK\nBDEFHIJL:EJBDHFLI\nBDEFHIJK:EJBDHFIK\nBDEFGJKL:EGBDJFLK\nBDEFGIKL:EGBDIFLK\nBDEFGIJL:EGBDJFLI\nBDEFGIJK:EGBDJFIK\nBDEFGHKL:EGBDHFLK\nBDEFGHJL:HGBDJFLE\nBDEFGHJK:HGBDJFEK\nBDEFGHIL:EGBDHFLI\nBDEFGHIK:EGBDHFIK\nBDEFGHIJ:HGBDJFEI\nBCGHIJKL:HJBCIGLK\nBCFHIJKL:HJBCIFLK\nBCFGIJKL:IGBCJFLK\nBCFGHJKL:HGBCJFLK\nBCFGHIKL:HGBCIFLK\nBCFGHIJL:HGBCJFLI\nBCFGHIJK:HGBCJFIK\nBCEHIJKL:EJBCIHLK\nBCEGIJKL:EJBCIGLK\nBCEGHJKL:EJBCHGLK\nBCEGHIKL:EGBCIHLK\nBCEGHIJL:EJBCHGLI\nBCEGHIJK:EJBCHGIK\nBCEFIJKL:EJBCIFLK\nBCEFHJKL:EJBCHFLK\nBCEFHIKL:EIBCHFLK\nBCEFHIJL:EJBCHFLI\nBCEFHIJK:EJBCHFIK\nBCEFGJKL:EGBCJFLK\nBCEFGIKL:EGBCIFLK\nBCEFGIJL:EGBCJFLI\nBCEFGIJK:EGBCJFIK\nBCEFGHKL:EGBCHFLK\nBCEFGHJL:HGBCJFLE\nBCEFGHJK:HGBCJFEK\nBCEFGHIL:EGBCHFLI\nBCEFGHIK:EGBCHFIK\nBCEFGHIJ:HGBCJFEI\nBCDHIJKL:HJBCIDLK\nBCDGIJKL:IGBCJDLK\nBCDGHJKL:HGBCJDLK\nBCDGHIKL:HGBCIDLK\nBCDGHIJL:HGBCJDLI\nBCDGHIJK:HGBCJDIK\nBCDFIJKL:CJBDIFLK\nBCDFHJKL:CJBDHFLK\nBCDFHIKL:CIBDHFLK\nBCDFHIJL:CJBDHFLI\nBCDFHIJK:CJBDHFIK\nBCDFGJKL:CGBDJFLK\nBCDFGIKL:CGBDIFLK\nBCDFGIJL:CGBDJFLI\nBCDFGIJK:CGBDJFIK\nBCDFGHKL:CGBDHFLK\nBCDFGHJL:CGBDHFLJ\nBCDFGHJK:HGBCJFDK\nBCDFGHIL:CGBDHFLI\nBCDFGHIK:CGBDHFIK\nBCDFGHIJ:HGBCJFDI\nBCDEIJKL:EJBCIDLK\nBCDEHJKL:EJBCHDLK\nBCDEHIKL:EIBCHDLK\nBCDEHIJL:EJBCHDLI\nBCDEHIJK:EJBCHDIK\nBCDEGJKL:EGBCJDLK\nBCDEGIKL:EGBCIDLK\nBCDEGIJL:EGBCJDLI\nBCDEGIJK:EGBCJDIK\nBCDEGHKL:EGBCHDLK\nBCDEGHJL:HGBCJDLE\nBCDEGHJK:HGBCJDEK\nBCDEGHIL:EGBCHDLI\nBCDEGHIK:EGBCHDIK\nBCDEGHIJ:HGBCJDEI\nBCDEFJKL:CJBDEFLK\nBCDEFIKL:CEBDIFLK\nBCDEFIJL:CJBDEFLI\nBCDEFIJK:CJBDEFIK\nBCDEFHKL:CEBDHFLK\nBCDEFHJL:CJBDHFLE\nBCDEFHJK:CJBDHFEK\nBCDEFHIL:CEBDHFLI\nBCDEFHIK:CEBDHFIK\nBCDEFHIJ:CJBDHFEI\nBCDEFGKL:CGBDEFLK\nBCDEFGJL:CGBDJFLE\nBCDEFGJK:CGBDJFEK\nBCDEFGIL:CGBDEFLI\nBCDEFGIK:CGBDEFIK\nBCDEFGIJ:CGBDJFEI\nBCDEFGHL:CGBDHFLE\nBCDEFGHK:CGBDHFEK\nBCDEFGHJ:HGBCJFDE\nBCDEFGHI:CGBDHFEI\nAFGHIJKL:HJIFAGLK\nAEGHIJKL:EJIAHGLK\nAEFHIJKL:EJIFAHLK\nAEFGIJKL:EJIFAGLK\nAEFGHJKL:EGJFAHLK\nAEFGHIKL:EGIFAHLK\nAEFGHIJL:EGJFAHLI\nAEFGHIJK:EGJFAHIK\nADGHIJKL:HJIDAGLK\nADFHIJKL:HJIDAFLK\nADFGIJKL:IGJDAFLK\nADFGHJKL:HGJDAFLK\nADFGHIKL:HGIDAFLK\nADFGHIJL:HGJDAFLI\nADFGHIJK:HGJDAFIK\nADEHIJKL:EJIDAHLK\nADEGIJKL:EJIDAGLK\nADEGHJKL:EGJDAHLK\nADEGHIKL:EGIDAHLK\nADEGHIJL:EGJDAHLI\nADEGHIJK:EGJDAHIK\nADEFIJKL:EJIDAFLK\nADEFHJKL:HJEDAFLK\nADEFHIKL:HEIDAFLK\nADEFHIJL:HJEDAFLI\nADEFHIJK:HJEDAFIK\nADEFGJKL:EGJDAFLK\nADEFGIKL:EGIDAFLK\nADEFGIJL:EGJDAFLI\nADEFGIJK:EGJDAFIK\nADEFGHKL:HGEDAFLK\nADEFGHJL:HGJDAFLE\nADEFGHJK:HGJDAFEK\nADEFGHIL:HGEDAFLI\nADEFGHIK:HGEDAFIK\nADEFGHIJ:HGJDAFEI\nACGHIJKL:HJICAGLK\nACFHIJKL:HJICAFLK\nACFGIJKL:IGJCAFLK\nACFGHJKL:HGJCAFLK\nACFGHIKL:HGICAFLK\nACFGHIJL:HGJCAFLI\nACFGHIJK:HGJCAFIK\nACEHIJKL:EJICAHLK\nACEGIJKL:EJICAGLK\nACEGHJKL:EGJCAHLK\nACEGHIKL:EGICAHLK\nACEGHIJL:EGJCAHLI\nACEGHIJK:EGJCAHIK\nACEFIJKL:EJICAFLK\nACEFHJKL:HJECAFLK\nACEFHIKL:HEICAFLK\nACEFHIJL:HJECAFLI\nACEFHIJK:HJECAFIK\nACEFGJKL:EGJCAFLK\nACEFGIKL:EGICAFLK\nACEFGIJL:EGJCAFLI\nACEFGIJK:EGJCAFIK\nACEFGHKL:HGECAFLK\nACEFGHJL:HGJCAFLE\nACEFGHJK:HGJCAFEK\nACEFGHIL:HGECAFLI\nACEFGHIK:HGECAFIK\nACEFGHIJ:HGJCAFEI\nACDHIJKL:HJICADLK\nACDGIJKL:IGJCADLK\nACDGHJKL:HGJCADLK\nACDGHIKL:HGICADLK\nACDGHIJL:HGJCADLI\nACDGHIJK:HGJCADIK\nACDFIJKL:CJIDAFLK\nACDFHJKL:HJFCADLK\nACDFHIKL:HFICADLK\nACDFHIJL:HJFCADLI\nACDFHIJK:HJFCADIK\nACDFGJKL:CGJDAFLK\nACDFGIKL:CGIDAFLK\nACDFGIJL:CGJDAFLI\nACDFGIJK:CGJDAFIK\nACDFGHKL:HGFCADLK\nACDFGHJL:CGJDAFLH\nACDFGHJK:HGJCAFDK\nACDFGHIL:HGFCADLI\nACDFGHIK:HGFCADIK\nACDFGHIJ:HGJCAFDI\nACDEIJKL:EJICADLK\nACDEHJKL:HJECADLK\nACDEHIKL:HEICADLK\nACDEHIJL:HJECADLI\nACDEHIJK:HJECADIK\nACDEGJKL:EGJCADLK\nACDEGIKL:EGICADLK\nACDEGIJL:EGJCADLI\nACDEGIJK:EGJCADIK\nACDEGHKL:HGECADLK\nACDEGHJL:HGJCADLE\nACDEGHJK:HGJCADEK\nACDEGHIL:HGECADLI\nACDEGHIK:HGECADIK\nACDEGHIJ:HGJCADEI\nACDEFJKL:CJEDAFLK\nACDEFIKL:CEIDAFLK\nACDEFIJL:CJEDAFLI\nACDEFIJK:CJEDAFIK\nACDEFHKL:HEFCADLK\nACDEFHJL:HJFCADLE\nACDEFHJK:HJECAFDK\nACDEFHIL:HEFCADLI\nACDEFHIK:HEFCADIK\nACDEFHIJ:HJECAFDI\nACDEFGKL:CGEDAFLK\nACDEFGJL:CGJDAFLE\nACDEFGJK:CGJDAFEK\nACDEFGIL:CGEDAFLI\nACDEFGIK:CGEDAFIK\nACDEFGIJ:CGJDAFEI\nACDEFGHL:HGFCADLE\nACDEFGHK:HGECAFDK\nACDEFGHJ:HGJCAFDE\nACDEFGHI:HGECAFDI\nABGHIJKL:HJBAIGLK\nABFHIJKL:HJBAIFLK\nABFGIJKL:IJBFAGLK\nABFGHJKL:HJBFAGLK\nABFGHIKL:HGBAIFLK\nABFGHIJL:HJBFAGLI\nABFGHIJK:HJBFAGIK\nABEHIJKL:EJBAIHLK\nABEGIJKL:EJBAIGLK\nABEGHJKL:EJBAHGLK\nABEGHIKL:EGBAIHLK\nABEGHIJL:EJBAHGLI\nABEGHIJK:EJBAHGIK\nABEFIJKL:EJBAIFLK\nABEFHJKL:EJBFAHLK\nABEFHIKL:EIBFAHLK\nABEFHIJL:EJBFAHLI\nABEFHIJK:EJBFAHIK\nABEFGJKL:EJBFAGLK\nABEFGIKL:EGBAIFLK\nABEFGIJL:EJBFAGLI\nABEFGIJK:EJBFAGIK\nABEFGHKL:EGBFAHLK\nABEFGHJL:HJBFAGLE\nABEFGHJK:HJBFAGEK\nABEFGHIL:EGBFAHLI\nABEFGHIK:EGBFAHIK\nABEFGHIJ:HJBFAGEI\nABDHIJKL:IJBDAHLK\nABDGIJKL:IJBDAGLK\nABDGHJKL:HJBDAGLK\nABDGHIKL:IGBDAHLK\nABDGHIJL:HJBDAGLI\nABDGHIJK:HJBDAGIK\nABDFIJKL:IJBDAFLK\nABDFHJKL:HJBDAFLK\nABDFHIKL:HIBDAFLK\nABDFHIJL:HJBDAFLI\nABDFHIJK:HJBDAFIK\nABDFGJKL:FJBDAGLK\nABDFGIKL:IGBDAFLK\nABDFGIJL:FJBDAGLI\nABDFGIJK:FJBDAGIK\nABDFGHKL:HGBDAFLK\nABDFGHJL:HGBDAFLJ\nABDFGHJK:HGBDAFJK\nABDFGHIL:HGBDAFLI\nABDFGHIK:HGBDAFIK\nABDFGHIJ:HGBDAFIJ\nABDEIJKL:EJBAIDLK\nABDEHJKL:EJBDAHLK\nABDEHIKL:EIBDAHLK\nABDEHIJL:EJBDAHLI\nABDEHIJK:EJBDAHIK\nABDEGJKL:EJBDAGLK\nABDEGIKL:EGBAIDLK\nABDEGIJL:EJBDAGLI\nABDEGIJK:EJBDAGIK\nABDEGHKL:EGBDAHLK\nABDEGHJL:HJBDAGLE\nABDEGHJK:HJBDAGEK\nABDEGHIL:EGBDAHLI\nABDEGHIK:EGBDAHIK\nABDEGHIJ:HJBDAGEI\nABDEFJKL:EJBDAFLK\nABDEFIKL:EIBDAFLK\nABDEFIJL:EJBDAFLI\nABDEFIJK:EJBDAFIK\nABDEFHKL:HEBDAFLK\nABDEFHJL:HJBDAFLE\nABDEFHJK:HJBDAFEK\nABDEFHIL:HEBDAFLI\nABDEFHIK:HEBDAFIK\nABDEFHIJ:HJBDAFEI\nABDEFGKL:EGBDAFLK\nABDEFGJL:EGBDAFLJ\nABDEFGJK:EGBDAFJK\nABDEFGIL:EGBDAFLI\nABDEFGIK:EGBDAFIK\nABDEFGIJ:EGBDAFIJ\nABDEFGHL:HGBDAFLE\nABDEFGHK:HGBDAFEK\nABDEFGHJ:HGBDAFEJ\nABDEFGHI:HGBDAFEI\nABCHIJKL:IJBCAHLK\nABCGIJKL:IJBCAGLK\nABCGHJKL:HJBCAGLK\nABCGHIKL:IGBCAHLK\nABCGHIJL:HJBCAGLI\nABCGHIJK:HJBCAGIK\nABCFIJKL:IJBCAFLK\nABCFHJKL:HJBCAFLK\nABCFHIKL:HIBCAFLK\nABCFHIJL:HJBCAFLI\nABCFHIJK:HJBCAFIK\nABCFGJKL:CJBFAGLK\nABCFGIKL:IGBCAFLK\nABCFGIJL:CJBFAGLI\nABCFGIJK:CJBFAGIK\nABCFGHKL:HGBCAFLK\nABCFGHJL:HGBCAFLJ\nABCFGHJK:HGBCAFJK\nABCFGHIL:HGBCAFLI\nABCFGHIK:HGBCAFIK\nABCFGHIJ:HGBCAFIJ\nABCEIJKL:EJBAICLK\nABCEHJKL:EJBCAHLK\nABCEHIKL:EIBCAHLK\nABCEHIJL:EJBCAHLI\nABCEHIJK:EJBCAHIK\nABCEGJKL:EJBCAGLK\nABCEGIKL:EGBAICLK\nABCEGIJL:EJBCAGLI\nABCEGIJK:EJBCAGIK\nABCEGHKL:EGBCAHLK\nABCEGHJL:HJBCAGLE\nABCEGHJK:HJBCAGEK\nABCEGHIL:EGBCAHLI\nABCEGHIK:EGBCAHIK\nABCEGHIJ:HJBCAGEI\nABCEFJKL:EJBCAFLK\nABCEFIKL:EIBCAFLK\nABCEFIJL:EJBCAFLI\nABCEFIJK:EJBCAFIK\nABCEFHKL:HEBCAFLK\nABCEFHJL:HJBCAFLE\nABCEFHJK:HJBCAFEK\nABCEFHIL:HEBCAFLI\nABCEFHIK:HEBCAFIK\nABCEFHIJ:HJBCAFEI\nABCEFGKL:EGBCAFLK\nABCEFGJL:EGBCAFLJ\nABCEFGJK:EGBCAFJK\nABCEFGIL:EGBCAFLI\nABCEFGIK:EGBCAFIK\nABCEFGIJ:EGBCAFIJ\nABCEFGHL:HGBCAFLE\nABCEFGHK:HGBCAFEK\nABCEFGHJ:HGBCAFEJ\nABCEFGHI:HGBCAFEI\nABCDIJKL:IJBCADLK\nABCDHJKL:HJBCADLK\nABCDHIKL:HIBCADLK\nABCDHIJL:HJBCADLI\nABCDHIJK:HJBCADIK\nABCDGJKL:CJBDAGLK\nABCDGIKL:IGBCADLK\nABCDGIJL:CJBDAGLI\nABCDGIJK:CJBDAGIK\nABCDGHKL:HGBCADLK\nABCDGHJL:HGBCADLJ\nABCDGHJK:HGBCADJK\nABCDGHIL:HGBCADLI\nABCDGHIK:HGBCADIK\nABCDGHIJ:HGBCADIJ\nABCDFJKL:CJBDAFLK\nABCDFIKL:CIBDAFLK\nABCDFIJL:CJBDAFLI\nABCDFIJK:CJBDAFIK\nABCDFHKL:HFBCADLK\nABCDFHJL:CJBDAFLH\nABCDFHJK:HJBCAFDK\nABCDFHIL:HFBCADLI\nABCDFHIK:HFBCADIK\nABCDFHIJ:HJBCAFDI\nABCDFGKL:CGBDAFLK\nABCDFGJL:CGBDAFLJ\nABCDFGJK:CGBDAFJK\nABCDFGIL:CGBDAFLI\nABCDFGIK:CGBDAFIK\nABCDFGIJ:CGBDAFIJ\nABCDFGHL:CGBDAFLH\nABCDFGHK:HGBCAFDK\nABCDFGHJ:HGBCAFDJ\nABCDFGHI:HGBCAFDI\nABCDEJKL:EJBCADLK\nABCDEIKL:EIBCADLK\nABCDEIJL:EJBCADLI\nABCDEIJK:EJBCADIK\nABCDEHKL:HEBCADLK\nABCDEHJL:HJBCADLE\nABCDEHJK:HJBCADEK\nABCDEHIL:HEBCADLI\nABCDEHIK:HEBCADIK\nABCDEHIJ:HJBCADEI\nABCDEGKL:EGBCADLK\nABCDEGJL:EGBCADLJ\nABCDEGJK:EGBCADJK\nABCDEGIL:EGBCADLI\nABCDEGIK:EGBCADIK\nABCDEGIJ:EGBCADIJ\nABCDEGHL:HGBCADLE\nABCDEGHK:HGBCADEK\nABCDEGHJ:HGBCADEJ\nABCDEGHI:HGBCADEI\nABCDEFKL:CEBDAFLK\nABCDEFJL:CJBDAFLE\nABCDEFJK:CJBDAFEK\nABCDEFIL:CEBDAFLI\nABCDEFIK:CEBDAFIK\nABCDEFIJ:CJBDAFEI\nABCDEFHL:HFBCADLE\nABCDEFHK:HEBCAFDK\nABCDEFHJ:HJBCAFDE\nABCDEFHI:HEBCAFDI\nABCDEFGL:CGBDAFLE\nABCDEFGK:CGBDAFEK\nABCDEFGJ:CGBDAFEJ\nABCDEFGI:CGBDAFEI\nABCDEFGH:HGBCAFDE`;
        this.thirdPlaceCombinationMap = Object.fromEntries(raw.split('\n').map(line => {
            const [key, value] = line.split(':');
            return [key, value.split('')];
        }));
        return this.thirdPlaceCombinationMap;
    },

    groupSlot(row, label) {
        return row?.team ? { team: row.team, seed: label } : { label, pending: true };
    },

    thirdSlot(qualified, groups, assignments = {}, matchNumber = null) {
        if (matchNumber && assignments[matchNumber]) {
            const assigned = assignments[matchNumber];
            return this.groupSlot(assigned, `3o Grupo ${assigned.group}`);
        }
        const candidates = qualified.thirds.filter(row => groups.includes(row.group));
        if (candidates.length === 1) return { team: candidates[0].team, seed: `3o Grupo ${candidates[0].group}` };
        return { label: `3o Grupo ${groups.join('/')}`, pending: true, candidates };
    },

    futureMatch(number, left, right) {
        return { number, home: `Vencedor Jogo ${left}`, away: `Vencedor Jogo ${right}` };
    },

    getKnockoutMatchMeta(number) {
        const schedule = {
            73: { date: '28/06', time: '16:00', venue: 'SoFi Stadium', city: 'Inglewood' },
            74: { date: '29/06', time: '17:30', venue: 'Gillette Stadium', city: 'Foxborough' },
            75: { date: '29/06', time: '22:00', venue: 'Estadio BBVA', city: 'Guadalupe' },
            76: { date: '29/06', time: '14:00', venue: 'NRG Stadium', city: 'Houston' },
            77: { date: '30/06', time: '18:00', venue: 'MetLife Stadium', city: 'East Rutherford' },
            78: { date: '30/06', time: '14:00', venue: 'AT&T Stadium', city: 'Arlington' },
            79: { date: '30/06', time: '22:00', venue: 'Estadio Azteca', city: 'Mexico City' },
            80: { date: '01/07', time: '13:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
            81: { date: '01/07', time: '21:00', venue: "Levi's Stadium", city: 'Santa Clara' },
            82: { date: '01/07', time: '17:00', venue: 'Lumen Field', city: 'Seattle' },
            83: { date: '02/07', time: '20:00', venue: 'BMO Field', city: 'Toronto' },
            84: { date: '02/07', time: '16:00', venue: 'SoFi Stadium', city: 'Inglewood' },
            85: { date: '03/07', time: '00:00', venue: 'BC Place', city: 'Vancouver' },
            86: { date: '03/07', time: '19:00', venue: 'Hard Rock Stadium', city: 'Miami Gardens' },
            87: { date: '03/07', time: '22:30', venue: 'Arrowhead Stadium', city: 'Kansas City' },
            88: { date: '03/07', time: '15:00', venue: 'AT&T Stadium', city: 'Arlington' },
            89: { date: '04/07', time: '18:00', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
            90: { date: '04/07', time: '14:00', venue: 'NRG Stadium', city: 'Houston' },
            91: { date: '05/07', time: '17:00', venue: 'MetLife Stadium', city: 'East Rutherford' },
            92: { date: '05/07', time: '21:00', venue: 'Estadio Azteca', city: 'Mexico City' },
            93: { date: '06/07', time: '16:00', venue: 'AT&T Stadium', city: 'Arlington' },
            94: { date: '06/07', time: '21:00', venue: 'Lumen Field', city: 'Seattle' },
            95: { date: '07/07', time: '13:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
            96: { date: '07/07', time: '17:00', venue: 'BC Place', city: 'Vancouver' },
            97: { date: '09/07', time: '17:00', venue: 'Gillette Stadium', city: 'Foxborough' },
            98: { date: '10/07', time: '16:00', venue: 'SoFi Stadium', city: 'Inglewood' },
            99: { date: '11/07', time: '18:00', venue: 'Hard Rock Stadium', city: 'Miami Gardens' },
            100: { date: '11/07', time: '22:00', venue: 'Arrowhead Stadium', city: 'Kansas City' },
            101: { date: '14/07', time: '16:00', venue: 'AT&T Stadium', city: 'Arlington' },
            102: { date: '15/07', time: '16:00', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
            103: { date: '18/07', time: '18:00', venue: 'Hard Rock Stadium', city: 'Miami Gardens' },
            104: { date: '19/07', time: '16:00', venue: 'MetLife Stadium', city: 'East Rutherford' }
        };
        if (schedule[number]) return schedule[number];
        return { date: 'Data a confirmar' };
    },

    renderTeamCard(team, position) {
        return `
            <button class="wc-team-card ${this.selectedTeam === team ? 'active' : ''}" onclick="WorldCup.selectTeam('${team.replace(/'/g, "\\'")}')">
                <span class="wc-team-rank">#${position}</span>
                <strong>${this.getFlag(team)} ${team}</strong>
                <small>Grupo ${this.getTeamGroup(team)}</small>
                <div><b style="width:${Math.min(100, this.getRating(team))}%"></b></div>
                <em>${this.getRating(team).toFixed(1)} pts</em>
            </button>
        `;
    },

    renderTeamDrawer(team) {
        return `
            <aside class="wc-team-drawer">
                <button onclick="WorldCup.selectedTeam='';WorldCup.render()">x</button>
                <h3>${this.getFlag(team)} ${team}</h3>
                <span>Grupo ${this.getTeamGroup(team)} - #${this.getPowerPosition(team)} Power Ranking</span>
                <div class="wc-drawer-stats">
                    <div><strong>${this.getTeamMatches(team).length}</strong><span>Jogos</span></div>
                    <div><strong>${this.getStandings(this.getTeamGroup(team)).find(row => row.team === team)?.pts || 0}</strong><span>Pontos</span></div>
                    <div><strong>${this.getRating(team).toFixed(1)}</strong><span>Power</span></div>
                </div>
                ${this.renderBar('Aproveitamento', Math.min(100, this.getRating(team)), '#d7aa23')}
                ${this.renderBar('Saldo de Gols', 50, '#2fd36b')}
                ${this.renderBar('Clean Sheets', 35, '#4b8cff')}
            </aside>
        `;
    },

    renderRankingRow(team, position) {
        return `<article class="wc-ranking-row"><span>#${position}</span><strong>${this.getFlag(team)} ${team}</strong><small>Grupo ${this.getTeamGroup(team)}</small><b>${this.getRating(team).toFixed(1)}</b></article>`;
    },

    renderBar(label, value, color) {
        return `<div class="wc-bar"><span>${label}<b>${value.toFixed ? value.toFixed(1) : value}</b></span><i><em style="width:${Math.min(100, value)}%;background:${color}"></em></i></div>`;
    },

    renderTeamSelect(selected, action = 'selectTeam') {
        return `<select onchange="WorldCup.${action}(this.value)">${this.getTeams().map(team => `<option value="${team}"${team === selected ? ' selected' : ''}>${team}</option>`).join('')}</select>`;
    },

    renderSimGame(match) {
        const saved = this.getSimulatedScore(match[0], match[1]);
        const homeValue = saved.homeScore ?? '';
        const awayValue = saved.awayScore ?? '';
        return `
            <div class="wc-sim-game">
                <span>${this.getFlag(match[0])} ${match[0]}</span>
                <input type="number" min="0" value="${homeValue}" onchange="WorldCup.setSimScore('${this.escapeAttr(match[0])}', '${this.escapeAttr(match[1])}', this.value, null)">
                <input type="number" min="0" value="${awayValue}" onchange="WorldCup.setSimScore('${this.escapeAttr(match[0])}', '${this.escapeAttr(match[1])}', null, this.value)">
                <span>${this.getFlag(match[1])} ${match[1]}</span>
            </div>
        `;
    },

    renderSelect(key, label, options) {
        return `
            <label class="wc-select"><span>${label}</span><select onchange="WorldCup.setFilter('${key}', this.value)">
                <option value="all"${this.filters[key] === 'all' ? ' selected' : ''}>Todos</option>
                ${options.map(option => `<option value="${option.value}"${this.filters[key] === option.value ? ' selected' : ''}>${option.label}</option>`).join('')}
            </select></label>
        `;
    },

    renderPlaceholder(title, text) {
        return `<section class="wc-live-empty"><i class='bx bx-buildings'></i><strong>${title}</strong><span>${text}</span></section>`;
    },

    renderEmpty() {
        return `<section class="wc-live-empty"><i class='bx bx-search'></i><strong>Nenhum jogo encontrado</strong><span>Ajuste os filtros para ver a base.</span></section>`;
    },

    getFilteredMatches() {
        return this.matches.filter(match => {
            const groupOk = this.filters.group === 'all' || match.group === this.filters.group;
            const dateOk = this.filters.date === 'all' || match.date === this.filters.date;
            const teamOk = this.filters.team === 'all' || match.home === this.filters.team || match.away === this.filters.team;
            const haystack = `${match.home} ${match.away} ${match.venue} ${match.city}`.toLowerCase();
            const searchOk = !this.filters.search || haystack.includes(this.filters.search.toLowerCase());
            return groupOk && dateOk && teamOk && searchOk;
        });
    },

    getStandings(group) {
        const rows = (this.groups[group] || []).map(team => ({ team, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 }));
        const byTeam = Object.fromEntries(rows.map(row => [row.team, row]));
        this.matches.filter(match => match.group === group && match.homeScore !== null && match.awayScore !== null).forEach(match => {
            const home = byTeam[match.home];
            const away = byTeam[match.away];
            if (!home || !away) return;
            home.j += 1; away.j += 1;
            home.gp += match.homeScore; home.gc += match.awayScore;
            away.gp += match.awayScore; away.gc += match.homeScore;
            if (match.homeScore > match.awayScore) { home.v += 1; away.d += 1; home.pts += 3; }
            else if (match.homeScore < match.awayScore) { away.v += 1; home.d += 1; away.pts += 3; }
            else { home.e += 1; away.e += 1; home.pts += 1; away.pts += 1; }
            home.sg = home.gp - home.gc;
            away.sg = away.gp - away.gc;
        });
        return rows.sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp || this.getRating(b.team) - this.getRating(a.team));
    },

    getSimulatedStandings(group) {
        const rows = (this.groups[group] || []).map(team => ({ team, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 }));
        const byTeam = Object.fromEntries(rows.map(row => [row.team, row]));
        this.buildGroupPairings(this.groups[group] || []).forEach(([homeTeam, awayTeam]) => {
            const score = this.getSimulatedScore(homeTeam, awayTeam);
            if (!Number.isFinite(score.homeScore) || !Number.isFinite(score.awayScore)) return;
            const home = byTeam[homeTeam];
            const away = byTeam[awayTeam];
            if (!home || !away) return;
            home.j += 1; away.j += 1;
            home.gp += score.homeScore; home.gc += score.awayScore;
            away.gp += score.awayScore; away.gc += score.homeScore;
            if (score.homeScore > score.awayScore) { home.v += 1; away.d += 1; home.pts += 3; }
            else if (score.homeScore < score.awayScore) { away.v += 1; home.d += 1; away.pts += 3; }
            else { home.e += 1; away.e += 1; home.pts += 1; away.pts += 1; }
            home.sg = home.gp - home.gc;
            away.sg = away.gp - away.gc;
        });
        return rows.sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp || this.getRating(b.team) - this.getRating(a.team));
    },

    getAllStandings() {
        return Object.fromEntries(Object.keys(this.groups).map(group => [group, this.getStandings(group)]));
    },

    getLiveMatches() {
        return this.matches.filter(match => match.status === 'Ao vivo');
    },

    ensureAutoSync() {
        if (this.syncState.started) return;
        this.syncState.started = true;
        this.ensureBaseGroups();
        this.loadSyncCache();
        this.syncWorldCupData({ silent: true });
        this.syncState.timer = setInterval(() => this.syncWorldCupData({ silent: true }), 60 * 1000);
    },

    loadSyncCache() {
        try {
            const raw = localStorage.getItem(this.syncCacheKey);
            if (!raw) return;
            const cache = JSON.parse(raw);
            if (!Array.isArray(cache.matches) || cache.matches.length === 0) return;
            this.applyExternalMatches(cache.matches);
            this.applyExternalLeaders(cache);
            this.syncState.status = 'ok';
            const missingPlaces = cache.matches.some(match => !String(match.venue || '').trim() && !String(match.city || '').trim());
            this.syncState.lastSync = missingPlaces ? null : (cache.generatedAt || null);
            this.syncState.message = `${cache.source || 'Cache'} ${cache.matches.length} jogos`;
        } catch (error) {
            console.warn('Nao foi possivel carregar cache da Copa:', error);
        }
    },

    async syncWorldCupData({ silent = false } = {}) {
        const syncProvider = window.traderWorldCupData?.sync;
        if (!syncProvider) {
            this.syncState.status = 'local';
            this.syncState.message = 'Base local';
            return;
        }
        if (this.isSyncCacheFresh()) return;

        if (!silent) {
            this.syncState.status = 'loading';
            this.syncState.message = 'Atualizando...';
            this.render();
        }

        try {
            const result = await syncProvider();
            if (result?.ok && Array.isArray(result.matches) && result.matches.length > 0) {
                this.applyExternalMatches(result.matches);
                this.applyExternalLeaders(result);
                this.syncState.status = 'ok';
                this.syncState.lastSync = result.generatedAt;
                this.syncState.message = `${result.source || 'Fonte'} ${result.matches.length} jogos`;
                localStorage.setItem(this.syncCacheKey, JSON.stringify({
                    generatedAt: result.generatedAt,
                    source: result.source || 'Fonte',
                    matches: result.matches,
                    scorers: result.scorers || [],
                    assists: result.assists || [],
                    cards: result.cards || []
                }));
                this.render();
                return;
            }

            this.syncState.status = 'local';
            this.syncState.message = result?.error ? `Falha Sofascore: ${result.error}` : 'Base local';
        } catch (error) {
            console.warn('Falha na sincronizacao automatica da Copa:', error);
            this.syncState.status = 'local';
            this.syncState.message = `Falha Sofascore: ${error.message || String(error)}`;
        }
    },

    isSyncCacheFresh() {
        if (!this.syncState.lastSync) return false;
        const last = new Date(this.syncState.lastSync).getTime();
        if (!Number.isFinite(last)) return false;
        const hasLiveMatch = this.getLiveMatches().length > 0;
        return Date.now() - last < (hasLiveMatch ? 45 * 1000 : 5 * 60 * 1000);
    },

    applyExternalMatches(matches) {
        this.ensureBaseGroups();
        const byKey = new Map(this.matches.map(match => [this.getMatchKey(match), match]));
        matches.forEach(match => {
            const normalized = this.normalizeExternalMatch(match);
            if (!normalized.home || !normalized.away || !normalized.date) return;
            const current = byKey.get(this.getMatchKey(normalized)) || {};
            if (!String(normalized.venue || '').trim() && current.venue) normalized.venue = current.venue;
            if (!String(normalized.city || '').trim() && current.city) normalized.city = current.city;
            byKey.set(this.getMatchKey(normalized), {
                ...current,
                ...normalized
            });
        });
        this.matches = Array.from(byKey.values()).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        this.rebuildGroupsFromMatches();
    },

    applyExternalLeaders(data) {
        if (Array.isArray(data.scorers) && data.scorers.length) this.scorers = data.scorers;
        if (Array.isArray(data.assists)) this.assists = data.assists;
        if (Array.isArray(data.cards)) this.cards = data.cards;
    },

    normalizeExternalMatch(match) {
        const isKnockout = this.isKnockoutStage(match.stage);
        return {
            ...match,
            group: !isKnockout && match.group && match.group !== '-'
                ? match.group
                : (isKnockout ? '-' : this.inferGroupByTeams(match.home, match.away)),
            status: this.normalizeStatus(match.status),
            homeScore: Number.isFinite(match.homeScore) ? match.homeScore : null,
            awayScore: Number.isFinite(match.awayScore) ? match.awayScore : null
        };
    },

    isKnockoutStage(stage) {
        return /round of|final|quarter|semi|third place|3rd place|play-?off/i.test(String(stage || ''));
    },

    getMatchStageLabel(match) {
        const stage = String(match.stage || '').trim();
        const labels = {
            'Round of 32': '16 avos de final',
            'Round of 16': 'Oitavas de final',
            'Quarterfinals': 'Quartas de final',
            'Quarter-finals': 'Quartas de final',
            'Semifinals': 'Semifinais',
            'Semi-finals': 'Semifinais',
            'Third place': '3o lugar',
            'Match for 3rd place': '3o lugar',
            'Final': 'Final'
        };
        if (stage) return labels[stage] || stage;
        const round = String(match.round || '').trim();
        return `Grupo ${match.group}${round ? ` - Rodada ${round}` : ''}`;
    },

    getMatchDisplayStatus(match) {
        if (match.status !== 'Ao vivo') return match.status;
        const start = Number(match.livePeriodStartTimestamp || 0);
        if (start > 0) {
            const base = Number(match.livePeriodBaseMinute || 0);
            const elapsed = Math.max(0, Math.floor((Date.now() / 1000 - start) / 60));
            return `${Math.min(130, base + elapsed)}'`;
        }
        return match.clock || match.statusDetail || 'Ao vivo';
    },

    async toggleMatchDetails(matchId) {
        const match = this.getMatchById(matchId);
        if (!match) return;
        if (this.expandedMatchId === matchId) {
            this.expandedMatchId = null;
            this.render();
            return;
        }
        this.expandedMatchId = matchId;
        if (!this.matchDetails[matchId]) {
            this.matchDetails[matchId] = { loading: true };
            this.render();
            try {
                if (!window.traderWorldCupData?.matchDetails) throw new Error('API de detalhes indisponivel.');
                const result = await window.traderWorldCupData.matchDetails({ sofascoreId: match.sofascoreId });
                if (!result?.ok) throw new Error(result?.error || 'Sofascore nao retornou detalhes.');
                this.matchDetails[matchId] = { data: result };
            } catch (error) {
                this.matchDetails[matchId] = { error: error.message || String(error) };
            }
        }
        this.render();
    },

    closeMatchDetails() {
        this.expandedMatchId = null;
        this.render();
    },

    getMatchKey(match) {
        const home = this.normalizeName(match.home);
        const away = this.normalizeName(match.away);
        return `${match.date}|${home}|${away}`;
    },

    normalizeName(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    },

    normalizeStatus(value) {
        const status = String(value || '').toLowerCase();
        if (status.includes('encerr') || status.includes('final')) return 'Encerrado';
        if (status.includes('vivo') || status.includes('live') || status.includes('half') || status.includes('progress')) return 'Ao vivo';
        return 'Agendado';
    },

    getStatusClass(value) {
        return this.normalizeName(value).replace(/\s+/g, '-');
    },

    inferGroupByTeams(home, away) {
        const groups = this.baseGroups || this.groups;
        return Object.keys(groups).find(group => {
            const teams = groups[group] || [];
            return teams.includes(home) || teams.includes(away);
        }) || '-';
    },

    ensureBaseGroups() {
        if (!this.baseGroups) {
            this.baseGroups = JSON.parse(JSON.stringify(this.groups));
        }
    },

    rebuildGroupsFromMatches() {
        this.ensureBaseGroups();
        this.groups = JSON.parse(JSON.stringify(this.baseGroups));
    },

    getTeams() {
        return [...new Set(Object.values(this.groups).flat())];
    },

    getGroups() {
        return Object.keys(this.groups);
    },

    getDates() {
        return [...new Set(this.matches.map(match => match.date))].sort();
    },

    getRating(team) {
        return this.teamRatings[team] || 50;
    },

    getFlag(team, size = 20) {
        const code = this.flags[team];
        if (!code) return `<span class="wc-flag wc-flag-empty"></span>`;
        const height = Math.max(10, Math.round(Number(size) * 0.75));
        return `<span class="wc-flag"><img src="https://flagcdn.com/w${size}/${code}.png" alt="${team}" width="${size}" height="${height}" loading="lazy" decoding="async"></span>`;
    },

    getPowerPosition(team) {
        return this.getTeams().sort((a, b) => this.getRating(b) - this.getRating(a)).indexOf(team) + 1;
    },

    getTeamGroup(team) {
        return Object.keys(this.groups).find(group => this.groups[group].includes(team)) || '-';
    },

    getTeamMatches(team) {
        return this.matches.filter(match => match.home === team || match.away === team);
    },

    getTeamScore(match, team, side) {
        if (!Number.isFinite(match.homeScore) || !Number.isFinite(match.awayScore)) return 0;
        const isHome = match.home === team;
        if (side === 'for') return isHome ? match.homeScore : match.awayScore;
        return isHome ? match.awayScore : match.homeScore;
    },

    getDirectMatch(left, right) {
        return this.matches.find(match => (match.home === left && match.away === right) || (match.home === right && match.away === left));
    },

    getMatchById(id) {
        return this.matches.find(match => String(match.id) === String(id));
    },

    getMatchFavoriteId(match) {
        return this.getMatchKey(match);
    },

    isFavoriteMatch(match) {
        return this.favoriteMatchIds.includes(this.getMatchFavoriteId(match));
    },

    loadFavorites() {
        if (this.favoritesLoaded) return;
        this.favoritesLoaded = true;
        try {
            const raw = localStorage.getItem('worldcup_favorite_matches_v1');
            const parsed = JSON.parse(raw || '[]');
            this.favoriteMatchIds = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (_) {
            this.favoriteMatchIds = [];
        }
    },

    saveFavorites() {
        localStorage.setItem('worldcup_favorite_matches_v1', JSON.stringify(this.favoriteMatchIds));
    },

    toggleFavoriteMatch(matchId) {
        const match = this.getMatchById(matchId);
        if (!match) return;
        const id = this.getMatchFavoriteId(match);
        if (this.favoriteMatchIds.includes(id)) {
            this.favoriteMatchIds = this.favoriteMatchIds.filter(item => item !== id);
        } else {
            this.favoriteMatchIds = [...this.favoriteMatchIds, id];
        }
        this.saveFavorites();
        this.render();
    },

    getRadarGameInfo(match) {
        const startTimestamp = match.date && match.time
            ? Math.floor(new Date(`${match.date}T${match.time}:00-03:00`).getTime() / 1000)
            : null;
        return {
            sofascoreId: Number(match.sofascoreId || 0) || null,
            wradarId: match.wradarId || null,
            home: match.home,
            away: match.away,
            startTimestamp
        };
    },

    openRadarMod(matchId) {
        const match = this.getMatchById(matchId);
        if (!match) return;
        if (typeof AnalisePro !== 'undefined' && AnalisePro.openCustomWRadarMod) {
            AnalisePro.openCustomWRadarMod(this.getRadarGameInfo(match));
            return;
        }
        alert('Radar MOD disponivel quando o modulo AnalisePro estiver carregado.');
    },

    openRadarFutebol(matchId) {
        const match = this.getMatchById(matchId);
        if (!match) return;
        if (match.radarFutebolUrl) {
            window.open(match.radarFutebolUrl, '_blank');
            return;
        }
        window.open(`https://www.radarfutebol.com/search?q=${encodeURIComponent(`${match.home} ${match.away}`)}`, '_blank');
    },

    getPairKey(home, away) {
        return [home, away].map(team => this.normalizeName(team)).sort().join('|');
    },

    getActualGroupMatch(home, away) {
        const key = this.getPairKey(home, away);
        return this.matches.find(match => this.getPairKey(match.home, match.away) === key && Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore));
    },

    getSimulatedScore(home, away) {
        const key = this.getPairKey(home, away);
        if (this.simulatedScores[key]) return this.simulatedScores[key];
        const actual = this.getActualGroupMatch(home, away);
        if (!actual) return { homeScore: null, awayScore: null };
        if (actual.home === home && actual.away === away) {
            return { homeScore: actual.homeScore, awayScore: actual.awayScore };
        }
        return { homeScore: actual.awayScore, awayScore: actual.homeScore };
    },

    setSimScore(home, away, homeScore, awayScore) {
        const key = this.getPairKey(home, away);
        const current = this.getSimulatedScore(home, away);
        const next = {
            homeScore: homeScore === null ? current.homeScore : this.parseScoreValue(homeScore),
            awayScore: awayScore === null ? current.awayScore : this.parseScoreValue(awayScore)
        };
        this.simulatedScores[key] = next;
        this.render();
    },

    parseScoreValue(value) {
        if (value === '' || value === null || value === undefined) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
    },

    escapeAttr(value) {
        return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    },

    buildGroupPairings(teams) {
        const pairings = [];
        for (let i = 0; i < teams.length; i += 1) {
            for (let j = i + 1; j < teams.length; j += 1) pairings.push([teams[i], teams[j]]);
        }
        return pairings;
    },

    groupBy(items, key) {
        return items.reduce((acc, item) => {
            acc[item[key]] = acc[item[key]] || [];
            acc[item[key]].push(item);
            return acc;
        }, {});
    },

    matchesSearch(team) {
        return !this.filters.search || team.toLowerCase().includes(this.filters.search.toLowerCase());
    },

    setTab(tab) {
        this.activeTab = tab;
        this.render();
    },

    setKnockoutView(view) {
        this.knockoutView = view;
        this.render();
    },

    setFilter(key, value) {
        this.filters[key] = value;
        this.render();
    },

    setSearch(value) {
        this.filters.search = value;
        this.render();
    },

    setGroup(group) {
        this.activeGroup = group;
        this.render();
    },

    setLeaderTab(tab) {
        this.leaderTab = tab;
        this.render();
    },

    selectTeam(team) {
        this.selectedTeam = team;
        this.render();
    },

    compareA(team) {
        this.compareTeams.home = team;
        this.render();
    },
    compareB(team) {
        this.compareTeams.away = team;
        this.render();
    },
    resetSimulator() {
        this.simulatedScores = {};
        this.render();
    },

    formatDate(value) {
        const [year, month, day] = value.split('-');
        return `${day}/${month}/${year}`;
    },

    formatLongDate(value) {
        const date = new Date(`${value}T12:00:00`);
        return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    },

};

window.WorldCup = WorldCup;
