

const App = {
    data: [],
    customMethods: [],
    currentView: 'dashboard',
    theme: 'light',
    ligas: [],
    dicionarioTimes: {},
    excecoesJogos: {},
    escudosTimes: {},
    escudosLigas: {},
    ignoredEntryIds: new Set(),
    ignoredBetIds: new Set(),
    sofascoreEventsCache: {},
    desempenhoMonth: null,
    desempenhoSelectedDay: '',
    appVersion: '',

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadAppInfo();
        await this.loadTheme();
        await this.loadData();
        if (typeof AnalisePro !== 'undefined') await AnalisePro.init();
        this.render();
    },
    
    cacheDOM() {
        this.appContainer = document.getElementById('app-container');
        this.pageTitle = document.getElementById('page-title');
        this.navLinks = document.querySelectorAll('.nav-links a');
        this.csvInput = document.getElementById('csvFileInput');
        this.themeToggle = document.getElementById('theme-toggle');
        this.versionLabel = document.getElementById('app-version');
    },
    
    bindEvents() {
    },

    async loadAppInfo() {
        try {
            const info = await window.traderAppInfo?.get?.();
            this.appVersion = info?.version || '';
        } catch (error) {
            this.appVersion = '';
        }
        if (this.versionLabel) {
            this.versionLabel.textContent = this.appVersion ? `v${this.appVersion}` : 'DEV';
        }
    },

    initialDicionario: {
        "Flamengo": "Brasileirão",
        "Palmeiras": "Brasileirão",
        "Santos": "Brasileirão",
        "São Paulo": "Brasileirão",
        "Corinthians": "Brasileirão",
        "Grêmio": "Brasileirão",
        "Internacional": "Brasileirão",
        "Cruzeiro": "Brasileirão",
        "Atlético Mineiro": "Brasileirão",
        "Botafogo": "Brasileirão",
        "Fluminense": "Brasileirão",
        "Vasco": "Brasileirão",
        "Athletico Paranaense": "Brasileirão",
        "Coritiba": "Brasileirão",
        "São Paulo": "Brasileirão",
        "Bahia": "Brasileirão",
        "Sport": "Brasileirão",
        "Fortaleza": "Brasileirão",
        "Ceará": "Brasileirão",
        "Atlético Goianiense": "Brasileirão",
        "Goiás": "Brasileirão",
        "Red Bull Bragantino": "Brasileirão",
        "Avaí": "Brasileirão",
        "Corinthians": "Brasileirão",
        "Juventude": "Brasileirão",
        "Cuiabá": "Brasileirão",
        "Botafogo": "Brasileirão",
        "Vasco": "Brasileirão",
        "América Mineiro": "Brasileirão",
        "Chapecoense": "Brasileirão",
        "Santos": "Brasileirão",
        "River Plate": "Argentino",
        "Boca Juniors": "Argentino",
        "Racing Club": "Argentino",
        "Independiente": "Argentino",
        "San Lorenzo": "Argentino",
        "Huracán": "Argentino",
        "Velez Sarsfield": "Argentino",
        "Estudiantes": "Argentino",
        "La Plata": "Argentino",
        "Talleres Córdoba": "Argentino",
        "Banfield": "Argentino",
        "Lanus": "Argentino",
        "Newells Old Boys": "Argentino",
        "Rosario Central": "Argentino",
        "Real Madrid": "La Liga",
        "Barcelona": "La Liga",
        "Atlético Madrid": "La Liga",
        "Sevilla": "La Liga",
        "Valencia": "La Liga",
        "Villarreal": "La Liga",
        "Real Betis": "La Liga",
        "Real Sociedad": "La Liga",
        "Athletic Bilbao": "La Liga",
        "Celta Vigo": "La Liga",
        "Getafe": "La Liga",
        "Granada": "La Liga",
        "Alavés": "La Liga",
        "Levante": "La Liga",
        "Osasuna": "La Liga",
        "Mallorca": "La Liga",
        "Manchester City": "Premier League",
        "Liverpool": "Premier League",
        "Chelsea": "Premier League",
        "Arsenal": "Premier League",
        "Manchester United": "Premier League",
        "Tottenham": "Premier League",
        "Leicester": "Premier League",
        "West Ham": "Premier League",
        "Aston Villa": "Premier League",
        "Everton": "Premier League",
        "Newcastle": "Premier League",
        "Wolves": "Premier League",
        "Crystal Palace": "Premier League",
        "Brighton": "Premier League",
        "Burnley": "Premier League",
        "Southampton": "Premier League",
        "Juventus": "Serie A",
        "Inter Milan": "Serie A",
        "Milan": "Serie A",
        "Roma": "Serie A",
        "Napoli": "Serie A",
        "Lazio": "Serie A",
        "Atalanta": "Serie A",
        "Fiorentina": "Serie A",
        "Torino": "Serie A",
        "Sampdoria": "Serie A",
        "Bologna": "Serie A",
        "Udinese": "Serie A",
        "Sassuolo": "Serie A",
        "Verona": "Serie A",
        "Bayern Munique": "Bundesliga",
        "Borussia Dortmund": "Bundesliga",
        "RB Leipzig": "Bundesliga",
        "Leverkusen": "Bundesliga",
        "Eintracht Frankfurt": "Bundesliga",
        "Wolfsburg": "Bundesliga",
        "Union Berlin": "Bundesliga",
        "Freiburg": "Bundesliga",
        "Stuttgart": "Bundesliga",
        "Hertha": "Bundesliga",
        "Mönchengladbach": "Bundesliga",
        "PSG": "Ligue 1",
        "Lyon": "Ligue 1",
        "Monaco": "Ligue 1",
        "Marseille": "Ligue 1",
        "Lille": "Ligue 1",
        "Rennes": "Ligue 1",
        "Nice": "Ligue 1",
        "Strasbourg": "Ligue 1",
        "Bordeaux": "Ligue 1",
        "Montpellier": "Ligue 1",
        "Nantes": "Ligue 1",
        "Brest": "Ligue 1",
        "Angers": "Ligue 1",
        "Porto": "Liga Portugal",
        "Benfica": "Liga Portugal",
        "Sporting": "Liga Portugal",
        "Braga": "Liga Portugal",
        "Ajax": "Eredivisie",
        "PSV Eindhoven": "Eredivisie",
        "Feyenoord": "Eredivisie",
        "Flamengo": "Libertadores",
        "Palmeiras": "Libertadores",
        "River Plate": "Libertadores",
        "Boca Juniors": "Libertadores",
        "Independiente": "Libertadores",
        "Racing Club": "Libertadores",
        "Santos": "Libertadores",
        "São Paulo": "Libertadores",
        "Grêmio": "Libertadores",
        "Cruzeiro": "Libertadores",
        "Atlético Mineiro": "Libertadores",
        "Corinthians": "Libertadores",
        "Nacional": "Libertadores",
        "Peñarol": "Libertadores",
        "Universidad Chile": "Libertadores",
        "Colo Colo": "Libertadores",
        "Emelec": "Libertadores",
        "Liga Quito": "Libertadores",
        "Barcelona SC": "Libertadores",
        "Al Ahly": "Champions League",
        " Zamalek": "Champions League",
        "Wydad": "Champions League",
        "Raja Casablanca": "Champions League",
        "Espérance": "Champions League",
        "Mamelodi Sundowns": "Champions League",
        "Kawasaki Frontale": "Champions League",
        "Urawa Red Diamonds": "Champions League",
        "Jeonbuk": "Champions League",
        "Seongnam": "Champions League",
        "Sydney FC": "Champions League",
        "Auckland City": "Champions League"
    },

    getEscudoTime(nomeTime) {
        if (!nomeTime) return '';
        
        // Primeiro tenta encontrar exatamente
        if (this.escudosTimes[nomeTime]) {
            return this.escudosTimes[nomeTime];
        }

        // Tenta encontrar com algumas variações
        const variacoes = [
            nomeTime,
            nomeTime.trim(),
            nomeTime.toLowerCase(),
            nomeTime.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        ];

        for (const v of variacoes) {
            if (this.escudosTimes[v]) {
                return this.escudosTimes[v];
            }
            // Busca case-insensitive
            for (const [key, url] of Object.entries(this.escudosTimes)) {
                if (key.toLowerCase() === v.toLowerCase()) {
                    return url;
                }
            }
        }

        return '';
    },

    getLogoLiga(nomeLiga) {
        if (!nomeLiga) return '';
        
        if (this.escudosLigas[nomeLiga]) {
            return this.escudosLigas[nomeLiga];
        }

        const variacoes = [
            nomeLiga,
            nomeLiga.trim(),
            nomeLiga.toLowerCase()
        ];

        for (const v of variacoes) {
            if (this.escudosLigas[v]) {
                return this.escudosLigas[v];
            }
            for (const [key, url] of Object.entries(this.escudosLigas)) {
                if (key.toLowerCase() === v.toLowerCase()) {
                    return url;
                }
            }
        }

        return '';
    },

    // Removendo definições duplicadas
    
    bindEvents() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.changeView(view);
                
                // Update active class
                this.navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
        
        this.csvInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Listener para Limpar Histórico
        const btnClear = document.getElementById('btn-clear-data');
        if (btnClear) {
            btnClear.addEventListener('click', async () => {
                if (confirm('Deseja realmente limpar todo o histórico de entradas? Métodos e escudos não serão apagados.')) {
                    this.data = [];
                    await this.saveData();
                    this.render();
                    alert('Histórico apagado com sucesso!');
                }
            });
        }

        // Backup Listeners removidos (agora são vinculados na renderConfiguracoes)
    },
    
    async loadTheme() {
        const savedTheme = await DB.get('theme') || localStorage.getItem('theme');
        if (savedTheme) {
            this.theme = savedTheme;
            document.documentElement.setAttribute('data-theme', this.theme);
        }
        this.updateThemeIcon();
    },
    
    async toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        await DB.set('theme', this.theme);
        this.updateThemeIcon();
        this.render();
    },
    
    updateThemeIcon() {
        const icon = this.themeToggle.querySelector('i');
        if (this.theme === 'dark') {
            icon.className = 'bx bx-sun';
        } else {
            icon.className = 'bx bx-moon';
        }
    },

    async loadData() {
        let savedData = this.normalizeStoredArray(await DB.get('planilhaData'));
        // Migrar localStorage antigo somente quando o IndexedDB ainda nao tem entradas.
        // Depois de restaurar backup, DB.clear() remove migration_done; sem esta protecao,
        // um localStorage antigo/vazio pode sobrescrever o backup restaurado no reload.
        const needsMigration = (!savedData || savedData.length === 0)
            && localStorage.getItem('planilhaData')
            && !(await DB.get('migration_done'));
        if (needsMigration) {
            await this.migrateFromLocalStorage();
            savedData = this.normalizeStoredArray(await DB.get('planilhaData'));
        }
        if ((!savedData || savedData.length === 0) && localStorage.getItem('planilhaData')) {
            try {
                const localData = this.normalizeStoredArray(localStorage.getItem('planilhaData'));
                if (Array.isArray(localData) && localData.length > 0) {
                    savedData = localData;
                    await DB.set('planilhaData', localData);
                    console.warn('Dados de entradas recuperados do localStorage antigo.');
                }
            } catch (error) {
                console.warn('Nao foi possivel recuperar planilhaData do localStorage:', error);
            }
        }
        if (Array.isArray(savedData) && savedData.length > 0) {
            savedData.forEach(d => {
                if (d.layBack === undefined) d.layBack = '';
                if (d.stake === undefined) d.stake = 0;
            });
            this.data = savedData;
            await DB.set('planilhaData', savedData);
        }

        this.customMethods = this.normalizeStoredArray(await DB.get('planilhaMethods')) || [];
        this.ligas = this.normalizeStoredArray(await DB.get('planilhaLigas')) || [];
        
        const savedDicionario = await DB.get('planilhaDicionarioTimes');
        if (savedDicionario) {
            this.dicionarioTimes = savedDicionario;
        } else {
            this.dicionarioTimes = { ...this.initialDicionario };
        }

        this.excecoesJogos = await DB.get('planilhaExcecoesJogos') || {};
        this.escudosTimes = await DB.get('planilhaEscudosTimes') || {};
        this.escudosLigas = await DB.get('planilhaEscudosLigas') || {};
        this.ignoredEntryIds = new Set(await DB.get('planilhaIgnoredEntryIds') || []);
        this.ignoredBetIds = new Set(await DB.get('planilhaIgnoredBetIds') || []);
        this.ciclosConfig = await DB.get('planilhaCiclosConfig') || [
            { stakeInicial: 500, objetivo: 1000, fatorReducao: 0, stopLucro: 100 },
            { stakeInicial: 500, objetivo: 1000, fatorReducao: 0, stopLucro: 100 },
            { stakeInicial: 750, objetivo: 1500, fatorReducao: 0, stopLucro: 100 },
            { stakeInicial: 1450, objetivo: 2900, fatorReducao: 0, stopLucro: 100 },
            { stakeInicial: 2850, objetivo: 5700, fatorReducao: 0, stopLucro: 100 }
        ];
        
        this.ciclosState = await DB.get('planilhaCiclosState') || {
            cicloAtual: 0,
            stakeAtual: 500,
            saldoCiclo: 0,
            entradasCiclo: [],
            lucroTotalGeral: 0,
            bancaInicial: 500,
            historicoCiclos: []
        };
        
        if (this.ligas.length === 0) {
            this.ligas = ['Brasileirão', 'Libertadores', 'Copa do Brasil', 'Champions League', 'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Argentino', 'Copa do Brasil', 'Copa Libertadores', 'Copa America', 'Euro'];
        }
    },

    normalizeStoredArray(value) {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return this.normalizeStoredArray(parsed);
            } catch (error) {
                return [];
            }
        }
        if (value && typeof value === 'object') {
            if (value.planilhaData) return this.normalizeStoredArray(value.planilhaData);
            if (value.data) return this.normalizeStoredArray(value.data);
            const values = Object.values(value);
            if (values.length > 0 && values.every(item => item && typeof item === 'object')) return values;
        }
        return [];
    },

    async migrateFromLocalStorage() {
        console.log("Iniciando migração do localStorage para IndexedDB...");
        const keys = [
            'planilhaData', 'planilhaMethods', 'planilhaLigas', 
            'planilhaDicionarioTimes', 'planilhaExcecoesJogos', 
            'planilhaEscudosTimes', 'planilhaEscudosLigas', 
            'planilhaCiclosConfig', 'planilhaCiclosState', 'theme'
        ];

        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    const parsed = JSON.parse(value);
                    await DB.set(key, parsed);
                } catch (e) {
                    await DB.set(key, value);
                }
                await DB.set('migration_done', true);
            }
        }

        await DB.set('migration_done', true);
        console.log("Migração concluída com sucesso!");
        
        // Opcional: Limpar localStorage após sucesso (comentado por segurança na primeira versão)
        // keys.forEach(k => localStorage.removeItem(k));
    },
    
    async saveData() {
        await DB.set('planilhaData', this.data);
        await DB.set('planilhaMethods', this.customMethods);
        await DB.set('planilhaLigas', this.ligas);
        await DB.set('planilhaDicionarioTimes', this.dicionarioTimes);
        await DB.set('planilhaExcecoesJogos', this.excecoesJogos);
        await DB.set('planilhaEscudosTimes', this.escudosTimes);
        await DB.set('planilhaEscudosLigas', this.escudosLigas);
        await DB.set('planilhaIgnoredEntryIds', Array.from(this.ignoredEntryIds));
        await DB.set('planilhaIgnoredBetIds', Array.from(this.ignoredBetIds));
        await DB.set('planilhaCiclosConfig', this.ciclosConfig);
        await DB.set('planilhaCiclosState', this.ciclosState);
    },

    async deleteEntryPermanently(id) {
        const entry = this.data.find(d => d.id === id);
        if (!entry) return;

        const typeLabel = entry.isDepositOrWithdrawal
            ? (entry.netProfit >= 0 ? 'depósito' : 'saque')
            : 'entrada';

        if (!confirm(`Excluir este ${typeLabel}? Ele continuará fora mesmo se você importar o CSV novamente.`)) {
            return;
        }

        this.ignoredEntryIds.add(id);
        this.data = this.data.filter(d => d.id !== id);
        await this.saveData();
        this.render();
    },

    async deleteEntriesPermanently(ids) {
        const uniqueIds = [...new Set(ids)].filter(id => this.data.some(d => d.id === id));
        if (uniqueIds.length === 0) {
            alert('Selecione pelo menos um item para excluir.');
            return;
        }

        if (!confirm(`Excluir ${uniqueIds.length} item(ns) selecionado(s)? Eles continuarão fora mesmo se você importar o CSV novamente.`)) {
            return;
        }

        uniqueIds.forEach(id => this.ignoredEntryIds.add(id));
        this.data = this.data.filter(d => !this.ignoredEntryIds.has(d.id));
        await this.saveData();
        this.render();
    },

    async deleteBetPermanently(tradeId, betId) {
        const trade = this.data.find(d => d.id === tradeId);
        if (!trade || !trade.bets) return;

        if (!confirm('Excluir esta aposta detalhada? Ela continuará fora mesmo se você importar o CSV de apostas novamente.')) {
            return;
        }

        this.ignoredBetIds.add(betId);
        trade.bets = trade.bets.filter(b => b.idAposta !== betId);
        if (trade.bets.length > 0) {
            trade.layBack = trade.bets[0].side;
            trade.stake = trade.bets[0].stake;
        } else {
            trade.layBack = '';
            trade.stake = 0;
        }
        await this.saveData();
        this.render();
    },

    detectLeague(game, dateStr) {
        const teams = this.parseGameTeams(game);
        if (teams.length < 2) return '';
        
        const teamA = teams[0];
        const teamB = teams[1];
        const gameId = `${game}_${dateStr.split(' ')[0]}`;
        
        if (this.excecoesJogos[gameId]) {
            return this.excecoesJogos[gameId];
        }
        
        const leagueA = this.dicionarioTimes[teamA] || '';
        const leagueB = this.dicionarioTimes[teamB] || '';
        
        if (!leagueA || !leagueB) {
            return '';
        }
        
        if (leagueA === leagueB) {
            return leagueA;
        }
        
        return 'Confronto Misto';
    },

    parseGameTeams(game) {
        return (game || '')
            .split(/\s+(?:x|v|vs\.?|versus)\s+/i)
            .map(t => t.trim())
            .filter(Boolean);
    },

    normalizeMatchName(value) {
        return (value || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\b(fc|sc|ec|ac|cf|afc|club|clube|de|da|do|the)\b/g, ' ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    getBetfairDateKey(dateStr, dayOffset = 0) {
        const date = this.parseBetfairDate(dateStr);
        date.setDate(date.getDate() + dayOffset);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    getGameId(game, dateStr) {
        return `${game}_${dateStr.split(' ')[0]}`;
    },

    namesLookLikeMatch(a, b) {
        const left = this.normalizeMatchName(a);
        const right = this.normalizeMatchName(b);
        if (!left || !right) return false;
        if (left === right) return true;
        return left.includes(right) || right.includes(left);
    },

    eventMatchesTrade(event, teams) {
        const home = event?.homeTeam?.name || event?.homeTeam?.shortName || '';
        const away = event?.awayTeam?.name || event?.awayTeam?.shortName || '';
        if (!home || !away || teams.length < 2) return false;

        const direct = this.namesLookLikeMatch(teams[0], home) && this.namesLookLikeMatch(teams[1], away);
        const inverted = this.namesLookLikeMatch(teams[0], away) && this.namesLookLikeMatch(teams[1], home);
        return direct || inverted;
    },

    canonicalLeagueName(rawName) {
        const normalized = this.normalizeMatchName(rawName);
        const aliases = {
            'conmebol libertadores': 'Libertadores',
            'copa libertadores': 'Libertadores',
            'libertadores': 'Libertadores',
            'conmebol sudamericana': 'Sul-Americana',
            'copa sudamericana': 'Sul-Americana',
            'copa sul americana': 'Sul-Americana',
            'sudamericana': 'Sul-Americana',
            'brasileirao serie a': 'Brasileirão',
            'brasileirao': 'Brasileirão',
            'copa do brasil': 'Copa do Brasil',
            'uefa champions league': 'Champions League',
            'champions league': 'Champions League',
            'uefa europa league': 'Europa League',
            'premier league': 'Premier League',
            'laliga': 'La Liga',
            'la liga': 'La Liga',
            'serie a': 'Serie A',
            'bundesliga': 'Bundesliga',
            'ligue 1': 'Ligue 1',
            'liga portugal': 'Liga Portugal',
            'eredivisie': 'Eredivisie',
            'mls': 'MLS',
            'copa america': 'Copa America',
            'fifa club world cup': 'Mundial de Clubes',
            'club world cup': 'Mundial de Clubes'
        };

        if (aliases[normalized]) return aliases[normalized];

        const existing = this.ligas.find(l => this.normalizeMatchName(l) === normalized);
        return existing || rawName;
    },

    async fetchSofascoreEventsByDate(dateKey) {
        if (this.sofascoreEventsCache[dateKey]) {
            return this.sofascoreEventsCache[dateKey];
        }

        const urls = [
            `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateKey}`,
            `https://www.sofascore.com/api/v1/sport/football/scheduled-events/${dateKey}`
        ];

        for (const url of urls) {
            const response = await this._fetchSofascore(url, 1);
            if (!response) continue;
            try {
                const data = await response.json();
                const events = data?.events || [];
                this.sofascoreEventsCache[dateKey] = events;
                return events;
            } catch(e) {}
        }

        this.sofascoreEventsCache[dateKey] = [];
        return [];
    },

    async findCompetitionForTrade(trade) {
        const teams = this.parseGameTeams(trade.game);
        if (teams.length < 2) return null;

        for (const offset of [0, -1, 1]) {
            const dateKey = this.getBetfairDateKey(trade.dateStr, offset);
            const events = await this.fetchSofascoreEventsByDate(dateKey);
            const event = events.find(item => this.eventMatchesTrade(item, teams));
            if (!event) continue;

            const tournamentName = event?.tournament?.uniqueTournament?.name || event?.tournament?.name;
            if (tournamentName) {
                return this.canonicalLeagueName(tournamentName);
            }
        }

        return null;
    },

    getCompetitionIdentificationCandidates() {
        const candidates = this.data
            .filter(d => !d.isDepositOrWithdrawal)
            .filter(d => {
                const gameId = this.getGameId(d.game, d.dateStr);
                const detected = this.detectLeague(d.game, d.dateStr);
                return !this.excecoesJogos[gameId] && (!detected || detected === 'Confronto Misto');
            });

        const uniqueByGame = new Map();
        candidates.forEach(trade => {
            uniqueByGame.set(this.getGameId(trade.game, trade.dateStr), trade);
        });

        return Array.from(uniqueByGame.entries());
    },

    async autoIdentificarCompeticoes(btnEl = null) {
        const originalHTML = btnEl ? btnEl.innerHTML : '';
        const setProgress = (msg) => { if (btnEl) btnEl.innerHTML = msg; };
        if (btnEl) btnEl.disabled = true;

        const games = this.getCompetitionIdentificationCandidates();
        if (games.length === 0) {
            alert('Nenhum jogo pendente de identificação automática.');
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHTML; }
            return;
        }

        let found = 0;
        let notFound = 0;
        const notFoundNames = [];

        for (let i = 0; i < games.length; i++) {
            const [gameId, trade] = games[i];
            setProgress(`<i class="bx bx-loader-alt bx-spin"></i> ${i + 1}/${games.length}`);

            const league = await this.findCompetitionForTrade(trade);
            if (league) {
                this.excecoesJogos[gameId] = league;
                if (!this.ligas.includes(league)) this.ligas.push(league);
                found++;
            } else {
                notFound++;
                notFoundNames.push(trade.game);
            }

            if (found > 0 && found % 10 === 0) await this.saveData();
            await new Promise(r => setTimeout(r, 350));
        }

        await this.saveData();

        let msg = `${found} jogo(s) identificado(s) automaticamente.`;
        if (notFound > 0) {
            msg += `\n${notFound} não encontrado(s): ${notFoundNames.slice(0, 8).join(', ')}${notFoundNames.length > 8 ? '...' : ''}`;
        }
        alert(msg);

        if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHTML; }
        this.render();
    },
    
    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvText = event.target.result;
            const parsed = parseCSV(csvText);
            const type = detectCSVType(csvText);

            if (type === 'primary') {
                const newData = parsed.filter(d => !this.ignoredEntryIds.has(d.id));
                const existingMap = new Map();
                if (this.data && this.data.length > 0) {
                    this.data.forEach(t => {
                        if (t.userMethod) existingMap.set(t.id, t.userMethod);
                    });
                }
                
                newData.forEach(t => {
                    if (existingMap.has(t.id)) {
                        t.userMethod = existingMap.get(t.id);
                    } else {
                        t.userMethod = '';
                    }
                });

                const existingIds = new Set(this.data.map(d => d.id));
                const uniqueNewData = newData.filter(d => !existingIds.has(d.id));
                
                this.data = [...uniqueNewData, ...this.data];
                this.data.sort((a, b) => {
                    const dateA = this.parseBetfairDate(a.dateStr);
                    const dateB = this.parseBetfairDate(b.dateStr);
                    return dateB - dateA;
                });

                await this.saveData();
                alert(`${uniqueNewData.length} novas entradas importadas com sucesso!`);
                const pendingCompetitions = this.getCompetitionIdentificationCandidates().length;
                if (pendingCompetitions > 0 && confirm(`${pendingCompetitions} jogo(s) estão sem liga ou como Confronto Misto. Deseja identificar as competições automaticamente pelo Sofascore agora?`)) {
                    await this.autoIdentificarCompeticoes();
                }
            } else {
                let matchCount = 0;
                parsed.forEach(bet => {
                    if (this.ignoredBetIds.has(bet.idAposta)) return;

                    // Ordenar por data decrescente no this.data para pegar o trade mais recente correspondente
                    const trade = this.data.find(t => {
                        if (t.isDepositOrWithdrawal) return false;
                        
                        // Normalização simples para comparação de nomes
                        const tGame = t.game.toLowerCase().trim();
                        const bGame = bet.game.toLowerCase().trim();
                        
                        const gameMatch = tGame.includes(bGame) || bGame.includes(tGame);
                        
                        const tMethod = t.method.toLowerCase().trim();
                        const bMethod = bet.method.toLowerCase().trim();
                        const methodMatch = tMethod.includes(bMethod) || bMethod.includes(tMethod);
                        
                        const tDate = this.parseBetfairDate(t.dateStr);
                        const bDate = this.parseBetfairDate(bet.date);
                        
                        // O trade (liquidação) deve ocorrer após ou no mesmo dia que a aposta
                        // E dentro de um intervalo razoável (2 dias)
                        const diff = tDate - bDate;
                        return gameMatch && methodMatch && diff >= -3600000 && diff < 172800000;
                    });

                    if (trade) {
                        if (!trade.bets) trade.bets = [];
                        if (!trade.bets.find(b => b.idAposta === bet.idAposta)) {
                            trade.bets.push(bet);
                            trade.bets.sort((a, b) => this.parseBetfairDate(a.date) - this.parseBetfairDate(b.date));
                            
                            // Atualizar dados principais do trade
                            trade.layBack = trade.bets[0].side;
                            // A stake total de um trade pode ser a soma das stakes de entrada?
                            // O usuário quer "a stake", vamos usar a da primeira aposta (entrada)
                            trade.stake = trade.bets[0].stake;
                            
                            matchCount++;
                        }
                    }
                });
                await this.saveData();
                alert(`Informações de ${matchCount} apostas vinculadas com sucesso!`);
            }
            this.render();
        };
        reader.readAsText(file);
    },

    parseBetfairDate(dateStr) {
        const months = {
            'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
            'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
        };
        const parts = dateStr.split(' ');
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split(':');
        const day = parseInt(dateParts[0]);
        const month = months[dateParts[1].toLowerCase()];
        const year = 2000 + parseInt(dateParts[2]);
        const hour = parseInt(timeParts[0]);
        const min = parseInt(timeParts[1]);
        const sec = timeParts[2] ? parseInt(timeParts[2]) : 0;
        return new Date(year, month, day, hour, min, sec);
    },
    
    changeView(view) {
        if (this.currentView === view) return;
        this.currentView = view;
        
        // Update Title
        const titleMap = {
            'dashboard': 'Dashboard',
            'central-analise': 'Central de Análise',
            'desempenho': 'Desempenho',
            'entradas': 'Todas as Entradas',
            'metodos': 'Análise por Métodos',
            'ligas': 'Análise por Liga',
            'times': 'Análise por Time',
            'financas': 'Saques e Depósitos',
            'ciclos': 'Método de Ciclos',
            'escudos': 'Configurar Escudos',
            'configuracoes': 'Configurações do Sistema',
            'calendario': 'Calendário de Jogos',
            'planejamento': 'Planejamento Diário',
            'copa-mundo': 'Copa do Mundo',
            'competicoes': 'Competições',
            'escada': 'Simulador de Escada'
        };
        
        this.pageTitle.textContent = titleMap[view] || 'Planilha Trader';
        
        // Sincronizar classe active no menu lateral
        if (this.navLinks) {
            this.navLinks.forEach(link => {
                const linkView = link.getAttribute('data-view');
                if (linkView === view) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }

        this.render();
    },
    
    abrirModalTime(teamName) {
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        const teamStats = {};
        const tradesParaModal = [];
        
        trades.forEach(t => {
            const teams = t.game.split(' x ').map(x => x.trim());
            const dateOnly = t.dateStr.split(' ')[0];
            const gameId = `${t.game}_${dateOnly}`;
            
            teams.forEach(team => {
                if(!team) return;
                if (!teamStats[team]) {
                    teamStats[team] = { profit: 0, entriesCount: 0, uniqueGames: new Set(), markets: new Set(), greens: [], reds: [] };
                }
                teamStats[team].profit += t.netProfit;
                teamStats[team].entriesCount += 1;
                teamStats[team].uniqueGames.add(gameId);
                teamStats[team].markets.add(t.method);
                if (t.netProfit > 0) {
                    teamStats[team].greens.push(t.netProfit);
                } else if (t.netProfit < 0) {
                    teamStats[team].reds.push(t.netProfit);
                }
                if (team === teamName) {
                    tradesParaModal.push(t);
                }
            });
        });
        
        const stats = teamStats[teamName];
        if (!stats) return;
        
        const marketsArray = Array.from(stats.markets);
        const entries = tradesParaModal.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));
        const maiorGreen = stats.greens[0] || 0;
        const maiorRed = stats.reds[0] || 0;
        const greenCount = stats.greens.length;
        const redCount = stats.reds.length;
        const winrate = stats.entriesCount > 0 ? ((greenCount / stats.entriesCount) * 100).toFixed(1) : 0;
        
        const escudoUrl = this.getEscudoTime(teamName);
        const escudoImg = escudoUrl ? `<img src="${escudoUrl}" style="width: 80px; height: 80px; object-fit: contain;">` : '';
        
        const modalBody = document.getElementById('modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="text-align: center; margin-bottom: 24px;">
                    ${escudoImg}
                    <h2 style="margin: 12px 0 0 0;">${teamName}</h2>
                </div>
                
                <div class="dashboard-grid" style="grid-template-columns: repeat(4, 1fr);">
                    <div class="stat-card">
                        <div class="title">Entradas</div>
                        <div class="value">${stats.entriesCount}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Jogos</div>
                        <div class="value">${stats.uniqueGames.size}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Taxa de Acerto</div>
                        <div class="value">${winrate}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Lucro Total</div>
                        <div class="value ${stats.profit >= 0 ? 'profit' : 'loss'}">${this.formatCurrency(stats.profit)}</div>
                    </div>
                </div>
                
                <div class="dashboard-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 15px;">
                    <div class="stat-card">
                        <div class="title" style="color: var(--success-color);">Maior Green</div>
                        <div class="value profit">${this.formatCurrency(maiorGreen)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title" style="color: var(--danger-color);">Maior Red</div>
                        <div class="value loss">${this.formatCurrency(maiorRed)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title" style="color: var(--success-color);">Greens</div>
                        <div class="value profit">${greenCount}</div>
                    </div>
                </div>
                
                <div style="margin-top: 24px;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Últimas Entradas</h3>
                    <div class="table-container" style="max-height: 250px; overflow-y: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Jogo</th>
                                    <th>Mercado</th>
                                    <th>P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${entries.slice(0, 15).map(e => `
                                <tr>
                                    <td style="font-size: 12px;">${e.dateStr}</td>
                                    <td style="font-size: 12px;">${e.game}</td>
                                    <td style="font-size: 12px;">${e.method}</td>
                                    <td><span class="badge ${e.netProfit >= 0 ? 'green' : 'red'}" style="font-size: 11px;">${this.formatCurrency(e.netProfit)}</span></td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div style="margin-top: 24px;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Mercados (${marketsArray.length})</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${marketsArray.map(m => `<span class="liga-badge">${m}</span>`).join('')}
                    </div>
                </div>
                
                <div style="margin-top: 24px;">
                    <div style="display: flex; gap: 16px;">
                        <div style="flex: 1;">
                            <h3 style="font-size: 16px; margin-bottom: 10px;">Mercados (${marketsArray.length})</h3>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${marketsArray.map(m => `<span class="liga-badge">${m}</span>`).join('')}
                            </div>
                        </div>
                        <div style="flex: 1;">
                            <h3 style="font-size: 16px; margin-bottom: 10px;">Top Greens/Reds</h3>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; max-height: 120px; overflow-y: auto;">
                                ${stats.greens.slice(0, 5).map(g => `<span class="badge green">${this.formatCurrency(g)}</span>`).join('')}
                                ${stats.reds.slice(0, 5).map(r => `<span class="badge red">${this.formatCurrency(r)}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="charts-area" style="margin-top: 20px;">
                    <div class="chart-card">
                        <h3>Lucro por Mercado</h3>
                        <div style="position: relative; height: 200px; width: 100%;">
                            <canvas id="modalMarketsChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h3>Assertividade</h3>
                        <div style="position: relative; height: 200px; width: 100%; margin: auto;">
                            <canvas id="modalWinLossChart"></canvas>
                        </div>
                    </div>
                </div>
            `;
            const modal = document.getElementById('time-modal');
            if (modal) {
                modal.style.display = 'block';
                
                setTimeout(() => {
                    this.initModalCharts(entries, stats, greenCount, redCount, marketsArray);
                }, 100);
            }
        }
    },
    
    initModalCharts(entries, stats, greenCount, redCount, marketsArray) {
        const colorText = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
        const successColor = getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim();
        const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim();
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        
        const mercadoProfit = {};
        entries.forEach(e => {
            const mercado = e.method || 'Outro';
            if (!mercadoProfit[mercado]) mercadoProfit[mercado] = 0;
            mercadoProfit[mercado] += e.netProfit;
        });
        
        const sortedMarkets = Object.keys(mercadoProfit)
            .map(k => ({ name: k, profit: mercadoProfit[k] }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 6);
        
        const ctxMarkets = document.getElementById('modalMarketsChart');
        if (ctxMarkets) {
            new Chart(ctxMarkets.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedMarkets.map(m => m.name),
                    datasets: [{
                        data: sortedMarkets.map(m => m.profit),
                        backgroundColor: sortedMarkets.map(m => m.profit >= 0 ? successColor : dangerColor),
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            ticks: { color: colorText, font: { size: 10 } },
                            grid: { color: borderColor, borderDash: [5, 5] }
                        },
                        y: {
                            ticks: { color: colorText, font: { size: 10 } },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
        
        const ctxWL = document.getElementById('modalWinLossChart');
        if (ctxWL) {
            new Chart(ctxWL.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Greens', 'Reds'],
                    datasets: [{
                        data: [greenCount, redCount],
                        backgroundColor: [successColor, dangerColor],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: { color: colorText, padding: 10, usePointStyle: true }
                        }
                    }
                }
            });
        }
    },
    
    render() {
        // Permitir que certas views funcionem sem dados de entradas
        const viewsIndependentes = ['calendario', 'planejamento', 'copa-mundo', 'competicoes', 'escudos', 'configuracoes', 'escada'];
        
        if (!viewsIndependentes.includes(this.currentView) && (!this.data || this.data.length === 0)) {
            this.appContainer.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-cloud-upload'></i>
                    <h3>Nenhum dado encontrado</h3>
                    <p>Por favor, importe seu CSV da Betfair para começar.</p>
                </div>
            `;
            return;
        }

        switch(this.currentView) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'central-analise':
                this.renderCentralAnalise();
                break;
            case 'desempenho':
                this.renderDesempenho();
                break;
            case 'entradas':
                this.renderEntradas();
                break;
            case 'metodos':
                this.renderMetodos();
                break;
            case 'ligas':
                this.renderLigas();
                break;
            case 'times':
                this.renderTimes();
                break;
            case 'financas':
                this.renderFinancas();
                break;
            case 'escudos':
                this.renderEscudos();
                break;
            case 'configuracoes':
                this.renderConfiguracoes();
                break;
            case 'ciclos':
                this.renderCiclos();
                break;
            case 'calendario':
                if (typeof AnalisePro !== 'undefined') AnalisePro.render();
                break;
            case 'planejamento':
                if (typeof AnalisePro !== 'undefined') AnalisePro.renderPlanejamento();
                break;
            case 'copa-mundo':
                if (typeof WorldCup !== 'undefined') WorldCup.render();
                break;
            case 'competicoes':
                if (typeof Competitions !== 'undefined') Competitions.render();
                break;
            case 'escada':
                if (typeof Ladder !== 'undefined') Ladder.render();
                break;
        }
    },
    
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },

    formatNumber(value) {
        return new Intl.NumberFormat('pt-BR').format(value);
    },

    // LÓGICA DE CICLOS
    escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    },

    calcularProximoStake(stakeAtual, lucroEntrada, objetivo, stopLucro) {
        const stake5Porcento = stakeAtual * 0.05;
        if (lucroEntrada >= stake5Porcento) {
            return stakeAtual;
        }
        return stakeAtual;
    },

    verificarCicloCompleto(saldoCiclo, objetivo, stakeInicial, stopLucroPorcentagem) {
        const lucroObjetivo = objetivo - stakeInicial;
        const objetivoParcial = lucroObjetivo * (stopLucroPorcentagem / 100);
        return saldoCiclo >= objetivoParcial;
    },

    // BACKUP E RESTAURAÇÃO
    async exportBackup() {
        try {
            const allData = await DB.getAll();
            const dataStr = JSON.stringify(allData, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const date = new Date().toISOString().slice(0, 10);
            const link = document.createElement("a");
            link.href = url;
            link.download = `backup_trader_${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Erro no backup:", error);
            alert("Erro ao gerar backup.");
        }
    },

    async handleBackupRestore(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('Atenção: A restauração de backup irá substituir TODOS os dados atuais do sistema (Entradas, Escudos, Logos, Notas, etc). Deseja continuar?')) {
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backupData = this.normalizeBackupData(JSON.parse(event.target.result));
                if (Object.keys(backupData).length === 0) {
                    throw new Error('Backup sem chaves para restaurar.');
                }
                
                // Limpar DB atual antes de restaurar
                await DB.clear();
                
                // Restaurar cada chave
                for (const [key, value] of Object.entries(backupData)) {
                    await DB.set(key, value);
                }
                
                alert('Backup restaurado com sucesso! O sistema será reiniciado para aplicar os dados.');
                window.location.reload();
            } catch (error) {
                console.error("Erro na restauração:", error);
                alert("Erro ao processar arquivo de backup. Verifique se o arquivo é válido.");
            }
        };
        reader.readAsText(file);
    },

    normalizeBackupData(backupData) {
        if (Array.isArray(backupData)) {
            return { planilhaData: backupData };
        }

        if (!backupData || typeof backupData !== 'object') {
            throw new Error('Backup vazio ou invalido.');
        }

        const source = backupData.traderData && typeof backupData.traderData === 'object'
            ? backupData.traderData
            : backupData;

        const normalized = { ...source };
        const recoveredData = this.normalizeStoredArray(
            normalized.planilhaData || normalized.data || normalized.entries || normalized.historico
        );

        if (recoveredData.length > 0) {
            normalized.planilhaData = recoveredData;
        }

        return normalized;
    },

    getStorageValueType(value) {
        if (Array.isArray(value)) return 'array';
        if (value === null || value === undefined) return String(value);
        return typeof value;
    },

    async diagnoseDataStorage() {
        try {
            const dbRaw = await DB.get('planilhaData');
            const dbData = this.normalizeStoredArray(dbRaw);
            const localRaw = localStorage.getItem('planilhaData');
            const localData = this.normalizeStoredArray(localRaw);
            const allData = await DB.getAll();
            const keys = Object.keys(allData || {});

            if (this.data.length === 0 && dbData.length > 0) {
                this.data = dbData;
                await this.saveData();
                alert(`Dados recuperados do IndexedDB.\n\nEntradas recuperadas: ${dbData.length}\n\nO sistema sera recarregado agora.`);
                window.location.reload();
                return;
            }

            if (this.data.length === 0 && localData.length > 0) {
                this.data = localData;
                await this.saveData();
                await DB.set('planilhaData', localData);
                alert(`Dados recuperados do localStorage antigo.\n\nEntradas recuperadas: ${localData.length}\n\nO sistema sera recarregado agora.`);
                window.location.reload();
                return;
            }

            alert([
                'Diagnostico de dados',
                '',
                `Entradas carregadas na tela: ${this.data.length}`,
                `IndexedDB planilhaData: ${dbData.length} entradas (${this.getStorageValueType(dbRaw)})`,
                `localStorage planilhaData: ${localData.length} entradas (${localRaw ? 'existe' : 'vazio'})`,
                '',
                `Chaves no IndexedDB: ${keys.length ? keys.join(', ') : 'nenhuma'}`
            ].join('\n'));
        } catch (error) {
            console.error('Erro no diagnostico de dados:', error);
            alert('Erro ao diagnosticar os dados. Veja o console para detalhes.');
        }
    },

    getEntradasDisponiveis() {
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        const usedIds = new Set();
        this.ciclosState.historicoCiclos.forEach(ciclo => {
            ciclo.entradas.forEach(e => usedIds.add(e.id));
        });
        this.ciclosState.entradasCiclo.forEach(e => usedIds.add(e.id));
        return trades.filter(t => !usedIds.has(t.id));
    },

    // VIEWS RENDERERS
    getDateKeyFromDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    getMonthKeyFromDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    },

    getMonthLabel(date) {
        const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return label.charAt(0).toUpperCase() + label.slice(1);
    },

    getDesempenhoInitialMonth(trades) {
        const validDates = trades
            .map(t => this.parseBetfairDate(t.dateStr))
            .filter(date => date instanceof Date && !Number.isNaN(date.getTime()))
            .sort((a, b) => b - a);

        const base = validDates[0] || new Date();
        return new Date(base.getFullYear(), base.getMonth(), 1);
    },

    buildDesempenhoStats(trades) {
        const byDay = {};
        const byMonth = {};

        trades.forEach(trade => {
            const date = this.parseBetfairDate(trade.dateStr);
            if (!(date instanceof Date) || Number.isNaN(date.getTime())) return;

            const dayKey = this.getDateKeyFromDate(date);
            const monthKey = this.getMonthKeyFromDate(date);

            if (!byDay[dayKey]) {
                byDay[dayKey] = {
                    key: dayKey,
                    date,
                    profit: 0,
                    entries: [],
                    wins: 0,
                    losses: 0,
                    stake: 0,
                    best: null,
                    worst: null
                };
            }

            if (!byMonth[monthKey]) {
                byMonth[monthKey] = {
                    key: monthKey,
                    date: new Date(date.getFullYear(), date.getMonth(), 1),
                    profit: 0,
                    entries: 0,
                    wins: 0,
                    losses: 0,
                    stake: 0
                };
            }

            const day = byDay[dayKey];
            const month = byMonth[monthKey];
            const profit = trade.netProfit || 0;
            const stake = trade.stake || 0;

            day.profit += profit;
            day.entries.push(trade);
            day.stake += stake;
            if (profit > 0) day.wins += 1;
            if (profit < 0) day.losses += 1;
            if (!day.best || profit > day.best.netProfit) day.best = trade;
            if (!day.worst || profit < day.worst.netProfit) day.worst = trade;

            month.profit += profit;
            month.entries += 1;
            month.stake += stake;
            if (profit > 0) month.wins += 1;
            if (profit < 0) month.losses += 1;
        });

        return { byDay, byMonth };
    },

    changeDesempenhoMonth(offset) {
        const base = this.desempenhoMonth || new Date();
        this.desempenhoMonth = new Date(base.getFullYear(), base.getMonth() + offset, 1);
        this.desempenhoSelectedDay = '';
        this.renderDesempenho();
    },

    selectDesempenhoDay(dayKey) {
        this.desempenhoSelectedDay = dayKey;
        this.renderDesempenho();
    },

    renderDesempenho() {
        const trades = this.data
            .filter(d => !d.isDepositOrWithdrawal)
            .sort((a, b) => this.parseBetfairDate(a.dateStr) - this.parseBetfairDate(b.dateStr));

        if (trades.length === 0) {
            this.appContainer.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-calendar-check'></i>
                    <h3>Nenhuma operação encontrada</h3>
                    <p>Importe seu CSV da Betfair para visualizar o desempenho mensal.</p>
                </div>
            `;
            return;
        }

        if (!this.desempenhoMonth) {
            this.desempenhoMonth = this.getDesempenhoInitialMonth(trades);
        }

        const { byDay, byMonth } = this.buildDesempenhoStats(trades);
        const year = this.desempenhoMonth.getFullYear();
        const month = this.desempenhoMonth.getMonth();
        const monthKey = this.getMonthKeyFromDate(this.desempenhoMonth);
        const monthStats = byMonth[monthKey] || { profit: 0, entries: 0, wins: 0, losses: 0, stake: 0 };
        const monthDayKeys = Object.keys(byDay)
            .filter(key => key.startsWith(monthKey))
            .sort();

        if (!this.desempenhoSelectedDay || !monthDayKeys.includes(this.desempenhoSelectedDay)) {
            this.desempenhoSelectedDay = monthDayKeys[monthDayKeys.length - 1] || '';
        }

        const selectedStats = this.desempenhoSelectedDay ? byDay[this.desempenhoSelectedDay] : null;
        const greenDays = monthDayKeys.filter(key => byDay[key].profit > 0).length;
        const redDays = monthDayKeys.filter(key => byDay[key].profit < 0).length;
        const neutralDays = monthDayKeys.filter(key => byDay[key].profit === 0).length;
        const bestDay = monthDayKeys.map(key => byDay[key]).sort((a, b) => b.profit - a.profit)[0] || null;
        const worstDay = monthDayKeys.map(key => byDay[key]).sort((a, b) => a.profit - b.profit)[0] || null;
        const winrate = monthStats.entries > 0 ? ((monthStats.wins / monthStats.entries) * 100).toFixed(1) : '0.0';
        const roi = monthStats.stake > 0 ? ((monthStats.profit / monthStats.stake) * 100).toFixed(2) : '0.00';

        const firstWeekday = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
        const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

        const calendarCells = Array.from({ length: totalCells }, (_, index) => {
            const dayNumber = index - firstWeekday + 1;
            const cellDate = new Date(year, month, dayNumber);
            const isCurrentMonth = cellDate.getMonth() === month;
            const dayKey = this.getDateKeyFromDate(cellDate);
            const stats = isCurrentMonth ? byDay[dayKey] : null;
            const resultClass = stats ? (stats.profit > 0 ? 'profit' : stats.profit < 0 ? 'loss' : 'neutral') : '';
            const selectedClass = dayKey === this.desempenhoSelectedDay ? 'selected' : '';
            const clickableClass = stats ? 'has-data' : '';
            const mutedClass = isCurrentMonth ? '' : 'muted';
            const action = stats ? `onclick="App.selectDesempenhoDay('${dayKey}')"` : '';

            return `
                <button class="performance-day ${mutedClass} ${clickableClass} ${resultClass} ${selectedClass}" ${action}>
                    <span class="performance-day-number">${cellDate.getDate()}</span>
                    ${stats ? `
                        <span class="performance-day-profit">${this.formatCurrency(stats.profit)}</span>
                        <span class="performance-day-count">${stats.entries.length} op${stats.entries.length > 1 ? 's' : ''}</span>
                    ` : ''}
                </button>
            `;
        }).join('');

        const selectedRows = selectedStats ? selectedStats.entries
            .slice()
            .sort((a, b) => this.parseBetfairDate(b.dateStr) - this.parseBetfairDate(a.dateStr))
            .map(trade => {
                const method = trade.userMethod || trade.method || 'Sem método';
                const league = this.detectLeague(trade.game, trade.dateStr) || '-';
                return `
                    <tr>
                        <td>${this.escapeHtml(trade.dateStr)}</td>
                        <td>${this.escapeHtml(trade.game)}</td>
                        <td>${this.escapeHtml(method)}</td>
                        <td>${this.escapeHtml(league)}</td>
                        <td>${trade.stake ? this.formatCurrency(trade.stake) : '-'}</td>
                        <td><span class="badge ${trade.netProfit >= 0 ? 'green' : 'red'}">${this.formatCurrency(trade.netProfit)}</span></td>
                    </tr>
                `;
            }).join('') : '';

        const monthlyRows = Object.values(byMonth)
            .sort((a, b) => b.date - a.date)
            .slice(0, 12)
            .map(item => {
                const itemWinrate = item.entries > 0 ? ((item.wins / item.entries) * 100).toFixed(1) : '0.0';
                const itemRoi = item.stake > 0 ? ((item.profit / item.stake) * 100).toFixed(2) : '0.00';
                return `
                    <tr>
                        <td>${this.getMonthLabel(item.date)}</td>
                        <td>${item.entries}</td>
                        <td>${itemWinrate}%</td>
                        <td>${itemRoi}%</td>
                        <td><span class="badge ${item.profit >= 0 ? 'green' : 'red'}">${this.formatCurrency(item.profit)}</span></td>
                    </tr>
                `;
            }).join('');

        this.appContainer.innerHTML = `
            <div class="performance-page">
                <div class="dashboard-grid performance-summary-grid">
                    <div class="stat-card">
                        <div class="title">Resultado do Mês</div>
                        <div class="value ${monthStats.profit >= 0 ? 'profit' : 'loss'}">${this.formatCurrency(monthStats.profit)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Operações</div>
                        <div class="value">${monthStats.entries}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Assertividade</div>
                        <div class="value">${winrate}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">ROI</div>
                        <div class="value ${monthStats.profit >= 0 ? 'profit' : 'loss'}">${roi}%</div>
                    </div>
                </div>

                <section class="performance-calendar-card">
                    <div class="performance-calendar-header">
                        <button class="btn-icon performance-nav-btn" onclick="App.changeDesempenhoMonth(-1)" title="Mês anterior">
                            <i class='bx bx-chevron-left'></i>
                        </button>
                        <div>
                            <h3>${this.getMonthLabel(this.desempenhoMonth)}</h3>
                            <p>${greenDays} dias verdes, ${redDays} dias vermelhos${neutralDays ? `, ${neutralDays} neutro${neutralDays > 1 ? 's' : ''}` : ''}</p>
                        </div>
                        <button class="btn-icon performance-nav-btn" onclick="App.changeDesempenhoMonth(1)" title="Próximo mês">
                            <i class='bx bx-chevron-right'></i>
                        </button>
                    </div>

                    <div class="performance-weekdays">
                        ${weekDays.map(day => `<span>${day}</span>`).join('')}
                    </div>
                    <div class="performance-calendar-grid">
                        ${calendarCells}
                    </div>
                </section>

                <div class="performance-insights-grid">
                    <div class="stat-card performance-compact-card">
                        <div class="title">Melhor Dia</div>
                        <div class="value profit">${bestDay ? this.formatCurrency(bestDay.profit) : '-'}</div>
                        <p>${bestDay ? `${bestDay.date.toLocaleDateString('pt-BR')} · ${bestDay.entries.length} op${bestDay.entries.length > 1 ? 's' : ''}` : 'Sem operações no mês'}</p>
                    </div>
                    <div class="stat-card performance-compact-card">
                        <div class="title">Pior Dia</div>
                        <div class="value loss">${worstDay ? this.formatCurrency(worstDay.profit) : '-'}</div>
                        <p>${worstDay ? `${worstDay.date.toLocaleDateString('pt-BR')} · ${worstDay.entries.length} op${worstDay.entries.length > 1 ? 's' : ''}` : 'Sem operações no mês'}</p>
                    </div>
                    <div class="stat-card performance-compact-card">
                        <div class="title">Maior Green do Dia Selecionado</div>
                        <div class="value profit">${selectedStats?.best ? this.formatCurrency(selectedStats.best.netProfit) : '-'}</div>
                        <p>${selectedStats?.best ? this.escapeHtml(selectedStats.best.game) : 'Selecione um dia com operações'}</p>
                    </div>
                    <div class="stat-card performance-compact-card">
                        <div class="title">Maior Red do Dia Selecionado</div>
                        <div class="value loss">${selectedStats?.worst ? this.formatCurrency(selectedStats.worst.netProfit) : '-'}</div>
                        <p>${selectedStats?.worst ? this.escapeHtml(selectedStats.worst.game) : 'Selecione um dia com operações'}</p>
                    </div>
                </div>

                <div class="performance-detail-grid">
                    <section class="table-container performance-day-detail">
                        <div class="performance-section-header">
                            <div>
                                <h3>${selectedStats ? `Detalhes de ${selectedStats.date.toLocaleDateString('pt-BR')}` : 'Detalhes do Dia'}</h3>
                                <p>${selectedStats ? `${selectedStats.entries.length} op${selectedStats.entries.length > 1 ? 's' : ''} · Resultado ${this.formatCurrency(selectedStats.profit)}` : 'Selecione um dia no calendário'}</p>
                            </div>
                            ${selectedStats ? `<span class="badge ${selectedStats.profit >= 0 ? 'green' : 'red'}">${selectedStats.wins}G / ${selectedStats.losses}R</span>` : ''}
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Jogo</th>
                                    <th>Método</th>
                                    <th>Liga</th>
                                    <th>Stake</th>
                                    <th>P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${selectedRows || `<tr><td colspan="6" style="text-align:center; padding: 28px; color: var(--text-secondary);">Nenhuma operação selecionada.</td></tr>`}
                            </tbody>
                        </table>
                    </section>

                    <section class="table-container performance-month-table">
                        <div class="performance-section-header">
                            <div>
                                <h3>Resumo por Mês</h3>
                                <p>Últimos 12 meses com operações importadas</p>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Mês</th>
                                    <th>Ops</th>
                                    <th>Assert.</th>
                                    <th>ROI</th>
                                    <th>P/L</th>
                                </tr>
                            </thead>
                            <tbody>${monthlyRows}</tbody>
                        </table>
                    </section>
                </div>
            </div>
        `;
    },

    renderDashboard() {
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        const financas = this.data.filter(d => d.isDepositOrWithdrawal);
        
        const totalProfit = trades.reduce((acc, curr) => acc + curr.netProfit, 0);
        const wins = trades.filter(t => t.netProfit > 0).length;
        const losses = trades.filter(t => t.netProfit < 0).length;
        const winrate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(2) : 0;
        
        const depositos = financas.filter(f => f.netProfit > 0).reduce((acc, curr) => acc + curr.netProfit, 0);
        const saques = financas.filter(f => f.netProfit < 0).reduce((acc, curr) => acc + Math.abs(curr.netProfit), 0);
        const saldoConta = depositos - saques + totalProfit;
        
        const greenRecords = trades.filter(t => t.netProfit > 0);
        const redRecords = trades.filter(t => t.netProfit < 0);
        const maiorGreen = greenRecords.length > 0 ? Math.max(...greenRecords.map(t => t.netProfit)) : 0;
        const maiorRed = redRecords.length > 0 ? Math.min(...redRecords.map(t => t.netProfit)) : 0;

        // Top 3 Times Lucro / Prejuizo
        const teamStats = {};
        trades.forEach(t => {
            const teams = t.game.split(' x ').map(x => x.trim());
            teams.forEach(team => {
                if (!team) return;
                if (!teamStats[team]) teamStats[team] = { profit: 0 };
                teamStats[team].profit += t.netProfit;
            });
        });
        const sortedTeams = Object.entries(teamStats).sort((a, b) => b[1].profit - a[1].profit);
        const top3Teams = sortedTeams.slice(0, 3);
        const bottom3Teams = sortedTeams.slice(-3).reverse();

        // Top 3 Ligas Lucro / Prejuizo
        const leagueStats = {};
        trades.forEach(t => {
            const detected = this.detectLeague(t.game, t.dateStr);
            if (!detected) return;
            if (!leagueStats[detected]) leagueStats[detected] = { profit: 0 };
            leagueStats[detected].profit += t.netProfit;
        });
        const sortedLeagues = Object.entries(leagueStats).sort((a, b) => b[1].profit - a[1].profit);
        const top3Leagues = sortedLeagues.slice(0, 3);
        const bottom3Leagues = sortedLeagues.slice(-3).reverse();

        const renderTeamRow = ([name, data], isPositive) => {
            const escudo = this.getEscudoTime(name);
            const escudoHtml = escudo
                ? `<img src="${escudo}" class="top3-shield" onerror="this.style.display='none'">`
                : `<div class="top3-shield-placeholder"><i class='bx bx-shield'></i></div>`;
            const profitClass = data.profit >= 0 ? 'profit' : 'loss';
            return `
                <div class="top3-row">
                    ${escudoHtml}
                    <span class="top3-name">${name}</span>
                    <span class="top3-value ${profitClass}">${this.formatCurrency(data.profit)}</span>
                </div>`;
        };

        const renderLeagueRow = ([name, data]) => {
            const logo = this.getLogoLiga(name);
            const logoHtml = logo
                ? `<img src="${logo}" class="top3-shield" onerror="this.style.display='none'">`
                : `<div class="top3-shield-placeholder"><i class='bx bx-trophy'></i></div>`;
            const profitClass = data.profit >= 0 ? 'profit' : 'loss';
            return `
                <div class="top3-row">
                    ${logoHtml}
                    <span class="top3-name">${name}</span>
                    <span class="top3-value ${profitClass}">${this.formatCurrency(data.profit)}</span>
                </div>`;
        };
        
        this.appContainer.innerHTML = `
            <div class="dashboard-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="stat-card">
                    <div class="icon-wrapper" style="background: rgba(67, 24, 255, 0.1); color: var(--primary-color);">
                        <i class='bx bx-wallet'></i>
                    </div>
                    <div class="title">Saldo da Conta</div>
                    <div class="value ${saldoConta >= 0 ? 'profit' : 'loss'}">${this.formatCurrency(saldoConta)}</div>
                </div>
                <div class="stat-card stat-card-dual">
                    <div class="icon-wrapper" style="background: linear-gradient(135deg, var(--success-bg), var(--danger-bg)); color: var(--primary-color);">
                        <i class='bx bx-trending-up'></i>
                    </div>
                    <div class="title">Green / Red</div>
                    <div class="dual-values-row">
                        <div class="dual-col">
                            <div class="dual-label" style="color: var(--success-text);">Maior Green</div>
                            <div class="dual-val profit">${this.formatCurrency(maiorGreen)}</div>
                        </div>
                        <div class="dual-col">
                            <div class="dual-label" style="color: var(--danger-text);">Maior Red</div>
                            <div class="dual-val loss">${this.formatCurrency(maiorRed)}</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="icon-wrapper" style="background: rgba(67, 24, 255, 0.1); color: var(--primary-color);">
                        <i class='bx bx-line-chart'></i>
                    </div>
                    <div class="title">Lucro Total</div>
                    <div class="value ${totalProfit >= 0 ? 'profit' : 'loss'}">${this.formatCurrency(totalProfit)}</div>
                </div>
                <div class="stat-card">
                    <div class="icon-wrapper" style="background: rgba(163, 174, 209, 0.2); color: var(--text-secondary);">
                        <i class='bx bx-bar-chart-alt-2'></i>
                    </div>
                    <div class="title">Total de Entradas</div>
                    <div class="value">${trades.length}</div>
                </div>
            </div>
            
            <div class="dashboard-grid" style="grid-template-columns: 1fr 0.7fr 1.3fr 1.6fr; margin-top: 15px;">
                <div class="stat-card stat-card-dual">
                    <div class="icon-wrapper" style="background: linear-gradient(135deg, var(--success-bg), var(--danger-bg)); color: var(--primary-color);">
                        <i class='bx bx-check-circle'></i>
                    </div>
                    <div class="title">Acertos / Erros</div>
                    <div class="dual-values-row">
                        <div class="dual-col">
                            <div class="dual-label" style="color: var(--success-text);">Acertos (Greens)</div>
                            <div class="dual-val profit">${wins}</div>
                        </div>
                        <div class="dual-col">
                            <div class="dual-label" style="color: var(--danger-text);">Erros (Reds)</div>
                            <div class="dual-val loss">${losses}</div>
                        </div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="icon-wrapper" style="background: rgba(255, 171, 0, 0.1); color: #FFAB00;">
                        <i class='bx bx-target-lock'></i>
                    </div>
                    <div class="title">Taxa de Acerto</div>
                    <div class="value">${winrate}%</div>
                </div>
                <div class="stat-card stat-card-top3">
                    <div class="top3-header">Times</div>
                    <div class="top3-columns">
                        <div class="top3-col top3-col-best">
                            <div class="top3-col-label"><i class='bx bx-happy'></i> Maior Lucro</div>
                            ${top3Teams.length > 0 ? top3Teams.map(t => renderTeamRow(t, true)).join('') : '<div class="top3-empty">Sem dados</div>'}
                        </div>
                        <div class="top3-col top3-col-worst">
                            <div class="top3-col-label"><i class='bx bx-sad'></i> Maior Prejuízo</div>
                            ${bottom3Teams.length > 0 ? bottom3Teams.map(t => renderTeamRow(t, false)).join('') : '<div class="top3-empty">Sem dados</div>'}
                        </div>
                    </div>
                </div>
                <div class="stat-card stat-card-top3">
                    <div class="top3-header">Ligas</div>
                    <div class="top3-columns">
                        <div class="top3-col top3-col-best">
                            <div class="top3-col-label"><i class='bx bx-happy'></i> Maior Lucro</div>
                            ${top3Leagues.length > 0 ? top3Leagues.map(t => renderLeagueRow(t)).join('') : '<div class="top3-empty">Sem dados</div>'}
                        </div>
                        <div class="top3-col top3-col-worst">
                            <div class="top3-col-label"><i class='bx bx-sad'></i> Maior Prejuízo</div>
                            ${bottom3Leagues.length > 0 ? bottom3Leagues.map(t => renderLeagueRow(t)).join('') : '<div class="top3-empty">Sem dados</div>'}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="charts-area">
                <div class="chart-card">
                    <h3>Evolução do Saldo</h3>
                    <div style="position: relative; height: 280px; width: 100%;">
                        <canvas id="pnlChart"></canvas>
                    </div>
                </div>
                <div class="chart-card" style="display: flex; flex-direction: column;">
                    <h3>Assertividade</h3>
                    <div style="position: relative; height: 200px; width: 100%; margin: auto;">
                        <canvas id="winLossChart"></canvas>
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
                            <span style="font-size: 28px; font-weight: 700; color: var(--text-primary); font-family: 'Outfit', sans-serif;">${winrate}%</span>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 10px; font-size: 13px; color: var(--text-secondary);">
                        <span style="color: var(--success-color);">● Greens: ${wins}</span> &nbsp;|&nbsp; 
                        <span style="color: var(--danger-color);">● Reds: ${losses}</span>
                    </div>
                </div>
            </div>
            
            <div class="charts-area" style="margin-top: 24px;">
                <div class="chart-card" style="grid-column: span 2;">
                    <h3>Lucro por Mercado</h3>
                    <div style="position: relative; height: 300px; width: 100%;">
                        <canvas id="marketsChart"></canvas>
                    </div>
                </div>
            </div>
            
            <div class="charts-area" style="margin-top: 24px;">
                <div class="chart-card" style="display: flex; flex-direction: column;">
                    <h3>Por Método Pessoal</h3>
                    <div style="position: relative; height: 250px; width: 100%; margin: auto;">
                        <canvas id="methodsChart"></canvas>
                    </div>
                </div>
                <div class="chart-card" style="display: flex; flex-direction: column;">
                    <h3>Por Liga</h3>
                    <div style="position: relative; height: 250px; width: 100%; margin: auto;">
                        <canvas id="ligasChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        this.initCharts(trades, wins, losses, financas);
    },
    
    initCharts(trades, wins, losses, financas) {
        // Reverse trades to chronological order (oldest first)
        const chronologicalTrades = [...trades].reverse();
        
        let cumulative = 0;
        const labels = [];
        const dataPoints = [];
        
        // Agrupar lucro por dia
        const dailyProfit = new Map();
        
        chronologicalTrades.forEach(t => {
            const day = t.dateStr.split(' ')[0]; // Extrai apenas a data
            if (!dailyProfit.has(day)) {
                dailyProfit.set(day, 0);
            }
            dailyProfit.set(day, dailyProfit.get(day) + t.netProfit);
        });

        for (const [day, profit] of dailyProfit.entries()) {
            cumulative += profit;
            labels.push(day);
            dataPoints.push(cumulative);
        }
        
        const ctxPnl = document.getElementById('pnlChart').getContext('2d');
        const colorPrimary = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        const colorText = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
        const successColor = getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim();
        const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim();
        
        let gradient = ctxPnl.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, colorPrimary + '66'); // 40% opacity
        gradient.addColorStop(1, colorPrimary + '00'); // 0% opacity
        
        new Chart(ctxPnl, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Lucro Acumulado',
                    data: dataPoints,
                    borderColor: colorPrimary,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointBackgroundColor: colorPrimary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 28, 68, 0.9)',
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        display: false 
                    },
                    y: { 
                        ticks: { color: colorText, font: { family: 'Inter' } },
                        grid: { color: borderColor, borderDash: [5, 5] },
                        border: { display: false }
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
            }
        });
        
        const ctxWL = document.getElementById('winLossChart').getContext('2d');
        new Chart(ctxWL, {
            type: 'doughnut',
            data: {
                labels: ['Greens', 'Reds'],
                datasets: [{
                    data: [wins, losses],
                    backgroundColor: [successColor, dangerColor],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                layout: { padding: { top: 10, bottom: 5, left: 10, right: 10 } },
                plugins: {
                    legend: { 
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 28, 68, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        bodyFont: { size: 14, family: 'Inter', weight: 'bold' }
                    }
                }
            }
        });
        
        // Gráfico de Lucro por Mercado
        const mercadoStats = {};
        trades.forEach(t => {
            const mercado = t.method || 'Outro';
            if (!mercadoStats[mercado]) {
                mercadoStats[mercado] = { profit: 0, count: 0 };
            }
            mercadoStats[mercado].profit += t.netProfit;
            mercadoStats[mercado].count += 1;
        });
        
        const sortedMarkets = Object.keys(mercadoStats)
            .map(k => ({ name: k, profit: mercadoStats[k].profit, count: mercadoStats[k].count }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 10);
        
        const marketLabels = sortedMarkets.map(m => m.name);
        const marketData = sortedMarkets.map(m => m.profit);
        const marketColors = marketData.map(p => p >= 0 ? successColor : dangerColor);
        
        const ctxMarkets = document.getElementById('marketsChart').getContext('2d');
        new Chart(ctxMarkets, {
            type: 'bar',
            data: {
                labels: marketLabels,
                datasets: [{
                    label: 'Lucro',
                    data: marketData,
                    backgroundColor: marketColors,
                    borderRadius: 6,
                    barThickness: 30
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(17, 28, 68, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 13, family: 'Inter' },
                        bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
                        callbacks: {
                            label: function(context) {
                                const idx = context.dataIndex;
                                const count = sortedMarkets[idx].count;
                                return [
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.x),
                                    `(${count} entradas)`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: colorText, 
                            font: { family: 'Inter' },
                            callback: function(value) {
                                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
                            }
                        },
                        grid: { color: borderColor, borderDash: [5, 5] },
                        border: { display: false }
                    },
                    y: {
                        ticks: { color: colorText, font: { family: 'Inter', size: 12 } },
                        grid: { display: false },
                        border: { display: false }
                    }
                }
            }
        });
        
        // Gráfico de Métodos Pessoais
        const metodoStats = {};
        trades.forEach(t => {
            const metodo = t.userMethod || 'Sem método';
            if (!metodoStats[metodo]) {
                metodoStats[metodo] = { profit: 0, count: 0 };
            }
            metodoStats[metodo].profit += t.netProfit;
            metodoStats[metodo].count += 1;
        });
        
        const sortedMetodos = Object.keys(metodoStats)
            .map(k => ({ name: k, profit: metodoStats[k].profit, count: metodoStats[k].count }))
            .sort((a, b) => b.profit - a.profit);
        
        if (sortedMetodos.length > 0) {
            const metodoColors = [
                '#0F969C', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444'
            ];
            
            const ctxMethods = document.getElementById('methodsChart').getContext('2d');
            new Chart(ctxMethods, {
                type: 'doughnut',
                data: {
                    labels: sortedMetodos.map(m => m.name),
                    datasets: [{
                        data: sortedMetodos.map(m => m.profit),
                        backgroundColor: sortedMetodos.map((_, i) => metodoColors[i % metodoColors.length]),
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { 
                            position: 'right',
                            labels: { 
                                color: colorText, 
                                padding: 12, 
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { size: 11 }
                            } 
                        },
                        tooltip: {
                            backgroundColor: 'rgba(17, 28, 68, 0.9)',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    const idx = context.dataIndex;
                                    const count = sortedMetodos[idx].count;
                                    const profit = context.parsed;
                                    return [
                                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit),
                                        `(${count} entradas)`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Gráfico de Ligas
        const ligaStats = {};
        trades.forEach(t => {
            const liga = this.detectLeague(t.game, t.dateStr) || 'Não identificado';
            if (!ligaStats[liga]) {
                ligaStats[liga] = { profit: 0, count: 0 };
            }
            ligaStats[liga].profit += t.netProfit;
            ligaStats[liga].count += 1;
        });
        
        const sortedLigas = Object.keys(ligaStats)
            .map(k => ({ name: k, profit: ligaStats[k].profit, count: ligaStats[k].count }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 8);
        
        if (sortedLigas.length > 0) {
            const ligaColors = [
                '#10b981', '#0F969C', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#ef4444'
            ];
            
            const ctxLigas = document.getElementById('ligasChart').getContext('2d');
            new Chart(ctxLigas, {
                type: 'doughnut',
                data: {
                    labels: sortedLigas.map(l => l.name),
                    datasets: [{
                        data: sortedLigas.map(l => l.profit),
                        backgroundColor: sortedLigas.map((_, i) => ligaColors[i % ligaColors.length]),
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { 
                            position: 'right',
                            labels: { 
                                color: colorText, 
                                padding: 12, 
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { size: 11 }
                            } 
                        },
                        tooltip: {
                            backgroundColor: 'rgba(17, 28, 68, 0.9)',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    const idx = context.dataIndex;
                                    const count = sortedLigas[idx].count;
                                    const profit = context.parsed;
                                    return [
                                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit),
                                        `(${count} entradas)`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    renderCentralAnalise() {
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal).sort((a, b) => this.parseBetfairDate(a.dateStr) - this.parseBetfairDate(b.dateStr));
        
        if (trades.length === 0) {
            this.appContainer.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-analyse'></i>
                    <h3>Sem dados para análise</h3>
                    <p>Importe seus extratos da Betfair para ver as estatísticas avançadas.</p>
                </div>`;
            return;
        }

        // Cálculos Gerais e Estatísticos
        let totalStake = 0;
        let totalProfit = 0;
        let peak = 0;
        let maxDD = 0;
        let currentEquity = 0; 
        let streaks = { maxRed: 0, currentRed: 0 };
        
        let greens = [];
        let reds = [];
        let oddsWin = [];
        let oddsLoss = [];
        
        const equityData = [];
        const dayOfWeekStats = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 };
        const monthStats = {};
        const dayMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        trades.forEach(t => {
            const date = this.parseBetfairDate(t.dateStr);
            totalStake += t.stake || 0;
            totalProfit += t.netProfit;
            currentEquity += t.netProfit;
            
            // Equity Curve
            equityData.push({ x: date, y: currentEquity });
            
            // Drawdown
            if (currentEquity > peak) peak = currentEquity;
            const dd = peak - currentEquity;
            if (dd > maxDD) maxDD = dd;
            
            // Streaks & Risk/Reward
            if (t.netProfit < 0) {
                streaks.currentRed++;
                if (streaks.currentRed > streaks.maxRed) streaks.maxRed = streaks.currentRed;
                reds.push(Math.abs(t.netProfit));
                if (t.bets && t.bets.length > 0) oddsLoss.push(t.bets[0].odds);
            } else if (t.netProfit > 0) {
                streaks.currentRed = 0;
                greens.push(t.netProfit);
                if (t.bets && t.bets.length > 0) oddsWin.push(t.bets[0].odds);
            }

            // Dia da Semana
            const dayName = dayMap[date.getDay()];
            dayOfWeekStats[dayName] += t.netProfit;

            // Mensal
            const monthKey = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            monthStats[monthKey] = (monthStats[monthKey] || 0) + t.netProfit;
        });

        const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0;
        const avgGreen = greens.length > 0 ? greens.reduce((a,b) => a+b, 0) / greens.length : 0;
        const avgRed = reds.length > 0 ? reds.reduce((a,b) => a+b, 0) / reds.length : 0;
        const rrRatio = avgRed > 0 ? (avgGreen / avgRed).toFixed(2) : '0';
        const avgOddWin = oddsWin.length > 0 ? (oddsWin.reduce((a,b) => a+b, 0) / oddsWin.length).toFixed(2) : '0.00';
        const avgOddLoss = oddsLoss.length > 0 ? (oddsLoss.reduce((a,b) => a+b, 0) / oddsLoss.length).toFixed(2) : '0.00';

        // Análise por Faixa de Odds
        const oddsRanges = {
            'Sub 1.50': { profit: 0, win: 0, total: 0 },
            '1.50 - 2.00': { profit: 0, win: 0, total: 0 },
            '2.01 - 3.00': { profit: 0, win: 0, total: 0 },
            '3.01 - 5.00': { profit: 0, win: 0, total: 0 },
            '5.00+': { profit: 0, win: 0, total: 0 }
        };

        trades.forEach(t => {
            const odd = (t.bets && t.bets.length > 0) ? t.bets[0].odds : 0;
            if (!odd) return;
            let range = odd < 1.50 ? 'Sub 1.50' : odd <= 2.00 ? '1.50 - 2.00' : odd <= 3.00 ? '2.01 - 3.00' : odd <= 5.00 ? '3.01 - 5.00' : '5.00+';
            oddsRanges[range].profit += t.netProfit;
            oddsRanges[range].total++;
            if (t.netProfit > 0) oddsRanges[range].win++;
        });

        this.appContainer.innerHTML = `
            <div class="central-analise">
                <!-- Row 1: Key Stats -->
                <div class="dashboard-grid" style="grid-template-columns: repeat(5, 1fr);">
                    <div class="stat-card">
                        <div class="title">ROI Total</div>
                        <div class="value ${roi >= 0 ? 'profit' : 'loss'}">${roi.toFixed(2)}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Max Drawdown</div>
                        <div class="value loss">-${this.formatCurrency(maxDD)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Risk/Reward</div>
                        <div class="value" style="font-size: 18px;">1 : ${rrRatio}</div>
                        <div style="font-size: 10px; color: var(--text-secondary);">Avg Green: ${this.formatCurrency(avgGreen)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Odd Média (Win)</div>
                        <div class="value profit" style="font-size: 18px;">@ ${avgOddWin}</div>
                        <div style="font-size: 10px; color: var(--text-secondary);">Loss: @ ${avgOddLoss}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Maior Seq. Red</div>
                        <div class="value">${streaks.maxRed}</div>
                    </div>
                </div>

                <!-- Row 2: Equity Curve -->
                <div class="chart-card" style="margin-bottom: 24px;">
                    <h3>Curva de Lucro Acumulado (Equity Curve)</h3>
                    <div style="height: 350px;"><canvas id="equityChart"></canvas></div>
                </div>

                <!-- Row 3: Two Charts -->
                <div class="charts-area" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <div class="chart-card">
                        <h3>Performance por Dia da Semana</h3>
                        <div style="height: 300px;"><canvas id="dayChart"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <h3>Comparativo Mensal</h3>
                        <div style="height: 300px;"><canvas id="monthlyChart"></canvas></div>
                    </div>
                </div>

                <!-- Row 4: Odds & Alerts -->
                <div class="charts-area" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
                    <div class="chart-card">
                        <h3>Performance por Faixa de Odds</h3>
                        <div style="height: 300px;"><canvas id="oddsChart"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <h3>Alertas de Gestão</h3>
                        <div id="alerts-container" class="alerts-list">
                            ${streaks.currentRed >= 3 ? 
                                `<div class="alert alert-danger">
                                    <i class='bx bxs-error'></i>
                                    <div>
                                        <strong>Bad Run Detectada!</strong><br>
                                        Você está em uma sequência de ${streaks.currentRed} reds. Considere uma pausa ou revise seu método atual.
                                    </div>
                                </div>` : 
                                `<div class="alert alert-success">
                                    <i class='bx bxs-check-circle'></i>
                                    <div><strong>Gestão Saudável</strong><br>Continue seguindo seu plano de trade.</div>
                                </div>`
                            }
                            <div class="alert" style="background: rgba(var(--primary-rgb), 0.05); color: var(--primary-color); border: 1px solid rgba(var(--primary-rgb), 0.1);">
                                <i class='bx bx-info-circle'></i>
                                <div><strong>Insight:</strong> Seu melhor dia é <strong>${Object.entries(dayOfWeekStats).sort((a,b) => b[1]-a[1])[0][0]}</strong>. Aproveite este dia para focar nas suas melhores ligas.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="table-container" style="margin-top: 24px;">
                    <h3>Resumo Detalhado por Faixa de Odds</h3>
                    <table style="margin-top: 15px;">
                        <thead>
                            <tr>
                                <th>Faixa de Odds</th>
                                <th>Entradas</th>
                                <th>Win Rate</th>
                                <th>P/L Bruto</th>
                                <th>ROI Estimado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(oddsRanges).map(([range, data]) => {
                                const wr = data.total > 0 ? (data.win / data.total * 100).toFixed(1) : 0;
                                const totalStakeFaixa = data.total * (totalStake / trades.length || 1);
                                const r = totalStakeFaixa > 0 ? (data.profit / totalStakeFaixa * 100).toFixed(2) : 0;
                                return `
                                    <tr>
                                        <td><strong>${range}</strong></td>
                                        <td>${data.total}</td>
                                        <td>${wr}%</td>
                                        <td class="${data.profit >= 0 ? 'profit' : 'loss'}">${this.formatCurrency(data.profit)}</td>
                                        <td class="${data.profit >= 0 ? 'profit' : 'loss'}">${r}%</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.renderEquityChart(equityData);
        this.renderDayChart(dayOfWeekStats);
        this.renderMonthlyChart(monthStats);
        this.renderOddsChart(oddsRanges);
    },

    renderEquityChart(data) {
        const ctx = document.getElementById('equityChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.x.toLocaleDateString('pt-BR')),
                datasets: [{
                    label: 'Lucro Acumulado',
                    data: data.map(d => d.y),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => `Total: ${this.formatCurrency(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: { grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } }
                }
            }
        });
    },

    renderDayChart(data) {
        const ctx = document.getElementById('dayChart').getContext('2d');
        const labels = Object.keys(data);
        const values = Object.values(data);
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: values.map(v => v >= 0 ? 'rgba(5, 205, 153, 0.7)' : 'rgba(238, 93, 80, 0.7)'),
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderMonthlyChart(data) {
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        const labels = Object.keys(data);
        const values = Object.values(data);
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: values.map(v => v >= 0 ? 'rgba(67, 24, 255, 0.7)' : 'rgba(238, 93, 80, 0.7)'),
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(0,0,0,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderOddsChart(data) {
        const ctx = document.getElementById('oddsChart').getContext('2d');
        const labels = Object.keys(data);
        const winRates = Object.values(data).map(d => d.total > 0 ? (d.win / d.total * 100).toFixed(1) : 0);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Win Rate (%)',
                    data: winRates,
                    backgroundColor: 'rgba(15, 150, 156, 0.7)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(0,0,0,0.05)' }, max: 100 },
                    x: { grid: { display: false } }
                }
            }
        });
    },

    renderEntradas() {
        if (!this.entradasState) {
            this.entradasState = {
                currentPage: 1,
                itemsPerPage: 50,
                filterTeam: '',
                filterDate: '',
                filterMethod: '',
                filterLeague: ''
            };
        }
        
        const state = this.entradasState;
        let trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        
        // Opções únicas para selects
        const uniqueDates = [...new Set(trades.map(t => t.dateStr.split(' ')[0]))];
        const uniqueNativeMarkets = [...new Set(trades.map(t => t.method))];
        const uniqueLeagues = [...new Set(trades.map(t => this.detectLeague(t.game, t.dateStr)).filter(l => l))];
        
        // Aplicar Filtros
        if (state.filterTeam) {
            const term = state.filterTeam.toLowerCase();
            trades = trades.filter(t => t.game.toLowerCase().includes(term));
        }
        if (state.filterDate) {
            trades = trades.filter(t => t.dateStr.startsWith(state.filterDate));
        }
        if (state.filterMethod) {
            trades = trades.filter(t => t.userMethod === state.filterMethod);
        }
        if (state.filterLeague) {
            trades = trades.filter(t => this.detectLeague(t.game, t.dateStr) === state.filterLeague);
        }
        
        // Paginação
        const totalItems = trades.length;
        const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;
        
        if (state.currentPage > totalPages) state.currentPage = totalPages;
        
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const endIndex = startIndex + state.itemsPerPage;
        const currentTrades = trades.slice(startIndex, endIndex);
        
        let rows = currentTrades.map(t => {
            const detectedLeague = this.detectLeague(t.game, t.dateStr);
            const leagueClass = detectedLeague === 'Confronto Misto' ? 'warning' : (detectedLeague ? 'default' : '');
            
            // Extrai os times do jogo e busca os escudos
            const teams = t.game.split(' x ').map(x => x.trim());
            const escudoA = this.getEscudoTime(teams[0]);
            const escudoB = this.getEscudoTime(teams[1]);
            const imgA = escudoA ? `<img src="${escudoA}" style="width: 40px; height: 40px; object-fit: contain; display: block;" onerror="this.style.display='none'">` : '';
            const imgB = escudoB ? `<img src="${escudoB}" style="width: 40px; height: 40px; object-fit: contain; display: block;" onerror="this.style.display='none'">` : '';
            const gameDisplay = teams.length >= 2 ? 
                `<div style="display: flex; align-items: center; justify-content: center; gap: 0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${imgA}
                        <span>${teams[0]}</span>
                    </div>
                    <span style="margin: 0 12px;">x</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>${teams[1]}</span>
                        ${imgB}
                    </div>
                </div>` : t.game;
            
            const layBackClass = t.layBack ? `layback-badge ${t.layBack.toLowerCase()}` : '';
            
            const profitPercentage = t.stake && t.stake > 0 ? ((t.netProfit / t.stake) * 100).toFixed(2) + '%' : '-';
            const percentageClass = t.stake && t.stake > 0 ? (t.netProfit >= 0 ? 'profit' : 'loss') : '';
            
            const hasBets = t.bets && t.bets.length > 0;
            
            let expandableRow = '';
            if (hasBets) {
                expandableRow = `
                    <tr class="bets-detail-row" id="detail-${t.id}" style="display: none; background: rgba(var(--primary-rgb), 0.03);">
                        <td colspan="11" style="padding: 15px 30px;">
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                <div style="font-weight: 600; font-size: 13px; color: var(--text-secondary); margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                                    <i class='bx bx-list-check'></i> Lances Detalhados (Betfair History)
                                </div>
                                <table class="sub-table" style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid var(--border-color); font-size: 11px; text-transform: uppercase; color: var(--text-secondary);">
                                            <th style="text-align: left; padding: 8px;">Data/Hora</th>
                                            <th style="text-align: left; padding: 8px;">Seleção</th>
                                            <th style="text-align: center; padding: 8px;">Tipo</th>
                                            <th style="text-align: center; padding: 8px;">Odds</th>
                                            <th style="text-align: center; padding: 8px;">Stake</th>
                                            <th style="text-align: right; padding: 8px;">P/L Bruto</th>
                                            <th style="width: 56px; text-align: center; padding: 8px;"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${t.bets.map((b, idx) => `
                                            <tr style="border-bottom: 1px dashed var(--border-color); font-size: 12px;">
                                                <td style="padding: 8px;">${b.date}</td>
                                                <td style="padding: 8px;">${b.selecao}</td>
                                                <td style="padding: 8px; text-align: center;">
                                                    <span class="badge ${b.side === 'BACK' ? 'blue' : 'pink'}" style="font-size: 10px; padding: 2px 6px;">${b.side}</span>
                                                </td>
                                                <td style="padding: 8px; text-align: center; font-weight: 600;">${b.odds.toFixed(2)}</td>
                                                <td style="padding: 8px; text-align: center;">${this.formatCurrency(b.stake)}</td>
                                                <td style="padding: 8px; text-align: right;">
                                                    <span style="color: ${b.pnl >= 0 ? 'var(--success-color)' : 'var(--danger-color)'}">
                                                        ${this.formatCurrency(b.pnl)}
                                                    </span>
                                                </td>
                                                <td style="padding: 8px; text-align: center;">
                                                    <button class="btn-icon btn-delete-bet" data-trade-id="${t.id}" data-bet-id="${b.idAposta}" title="Excluir aposta" style="width: 30px; height: 30px; color: var(--danger-color);">
                                                        <i class='bx bx-trash'></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                                    <div class="form-group">
                                        <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; display: block;">DIÁRIO DE TRADE (ANOTAÇÕES)</label>
                                        <textarea class="journal-notes" data-id="${t.id}" style="width: 100%; min-height: 80px; border-radius: 10px; border: 1px solid var(--border-color); padding: 10px; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); resize: vertical;" placeholder="O que você sentiu nessa entrada? Seguiu o método? Algum erro emocional?">${t.notes || ''}</textarea>
                                    </div>
                                    <div class="form-group">
                                        <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; display: block;">SCREENSHOT / PRINT DO JOGO</label>
                                        <div style="display: flex; flex-direction: column; gap: 10px;">
                                            <div class="upload-btn-wrapper" style="width: 100%;">
                                                <button class="btn-primary" style="width: 100%; justify-content: center; background: var(--text-secondary);">
                                                    <i class='bx bx-camera'></i> Anexar Screenshot
                                                </button>
                                                <input type="file" class="journal-image-input" data-id="${t.id}" accept="image/*" />
                                            </div>
                                            <div id="preview-${t.id}" class="journal-preview" style="position: relative;">
                                                ${t.screenshot ? `
                                                    <div style="position: relative; display: inline-block;">
                                                        <img src="${t.screenshot}" style="max-width: 100%; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open(this.src)">
                                                        <button class="btn-delete-img" data-id="${t.id}" style="position: absolute; top: -10px; right: -10px; width: 24px; height: 24px; border-radius: 50%; background: var(--danger-color); color: white; border: 2px solid var(--bg-surface); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: var(--shadow-sm);"><i class='bx bx-x'></i></button>
                                                    </div>` : '<div style="font-size: 11px; color: var(--text-secondary); text-align: center; padding: 10px; border: 1px dashed var(--border-color); border-radius: 8px;">Nenhuma imagem anexada</div>'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }

            return `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="entry-select" data-id="${t.id}" aria-label="Selecionar entrada" style="width: 16px; height: 16px; cursor: pointer;">
                </td>
                <td>
                    <div class="date-container">
                        ${hasBets ? `<button class="btn-expand" data-id="${t.id}"><i class='bx bx-plus'></i></button>` : '<div style="width: 24px;"></div>'}
                        <span style="font-size: 11px; white-space: nowrap;">${t.dateStr.replace(' ', '<br>')}</span>
                    </div>
                </td>
                <td>${gameDisplay}</td>
                <td>${t.method}</td>
                <td style="text-align: center;">
                    <span class="liga-badge ${leagueClass}" style="background: ${leagueClass === 'warning' ? 'rgba(255, 171, 0, 0.15)' : 'rgba(67, 24, 255, 0.1)'} ; color: ${leagueClass === 'warning' ? '#FFAB00' : 'var(--primary-color)'};">
                        ${detectedLeague || '-'}
                    </span>
                </td>
                <td style="text-align: center;">
                    ${t.layBack ? 
                        `<span class="${layBackClass}" data-id="${t.id}">${t.layBack}</span>` :
                        `<select class="filter-control layback-select" data-id="${t.id}" style="padding: 8px; font-size: 13px; width: 100%; border-radius: 8px; text-align: center; cursor: pointer;">
                            <option value="">-</option>
                            <option value="LAY" style="background: #f094ad; color: white;">LAY</option>
                            <option value="BACK" style="background: #00adf1; color: white;">BACK</option>
                        </select>`
                    }
                </td>
                <td>
                    <input type="number" class="filter-control stake-input" data-id="${t.id}" value="${t.stake || ''}" placeholder="R$" step="0.01">
                </td>
                <td>
                    <select class="filter-control method-select" data-id="${t.id}" title="${t.userMethod || 'Nenhum'}">
                        <option value="">Nenhum</option>
                        ${this.customMethods.map(m => `<option value="${m}" ${t.userMethod === m ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <span class="badge ${t.netProfit >= 0 ? 'green' : 'red'}">
                        ${this.formatCurrency(t.netProfit)}
                    </span>
                </td>
                <td style="text-align: center;">
                    <span class="percentage-value ${percentageClass}" style="font-weight: 600;">${profitPercentage}</span>
                </td>
                <td style="text-align: center;">
                    <button class="btn-icon btn-delete-entry" data-id="${t.id}" title="Excluir entrada" style="width: 34px; height: 34px; color: var(--danger-color);">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            </tr>
            ${expandableRow}
        `}).join('');

        if (currentTrades.length === 0) {
            rows = `<tr><td colspan="11" style="text-align:center; padding: 40px; color: var(--text-secondary);">Nenhuma entrada encontrada com os filtros selecionados.</td></tr>`;
        }
        
        this.appContainer.innerHTML = `
            <div class="filters-container">
                <div class="filter-group">
                    <label>Buscar Time/Jogo</label>
                    <input type="text" class="filter-control" id="filter-team" placeholder="Ex: Flamengo..." value="${state.filterTeam}">
                </div>
                <div class="filter-group">
                    <label>Data</label>
                    <select class="filter-control" id="filter-date">
                        <option value="">Todas as datas</option>
                        ${uniqueDates.map(d => `<option value="${d}" ${state.filterDate === d ? 'selected' : ''}>${d}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label>Liga</label>
                    <select class="filter-control" id="filter-league">
                        <option value="">Todas as ligas</option>
                        ${uniqueLeagues.map(l => `<option value="${l}" ${state.filterLeague === l ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div class="filter-group">
                    <label>Seu Método Pessoal</label>
                    <select class="filter-control" id="filter-method">
                        <option value="">Todos os métodos</option>
                        ${this.customMethods.map(m => `<option value="${m}" ${state.filterMethod === m ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </div>
            </div>

            <div class="filters-container" style="justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-weight: 600;">
                    <input type="checkbox" id="select-visible-entries" style="width: 16px; height: 16px; cursor: pointer;">
                    <span id="selected-count">0 selecionadas</span>
                </div>
                <button id="delete-selected-entries" class="btn-primary" style="background: var(--danger-color); padding: 10px 16px;" disabled>
                    <i class='bx bx-trash'></i> Excluir selecionadas
                </button>
            </div>

            <div class="table-container entradas-table-container">
                <table class="entradas-table">
                    <thead>
                        <tr>
                            <th style="width: 44px;"></th>
                            <th>Data</th>
                            <th>Jogo</th>
                            <th>Mercado</th>
                            <th>Liga</th>
                            <th style="width: 110px;">LAY/BACK</th>
                            <th class="entradas-stake-col">STAKE</th>
                            <th class="entradas-method-col">Método Pessoal</th>
                            <th>P/L</th>
                            <th style="width: 100px;">%</th>
                            <th style="width: 70px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                
                <div class="pagination">
                    <div class="pagination-info">
                        Mostrando ${totalItems === 0 ? 0 : startIndex + 1} a ${Math.min(endIndex, totalItems)} de ${totalItems} entradas
                    </div>
                    <div class="pagination-controls">
                        <button class="btn-page" id="btn-prev" ${state.currentPage <= 1 ? 'disabled' : ''}>Anterior</button>
                        <span style="font-weight: 600; color: var(--text-primary); display: flex; align-items: center;">Página ${state.currentPage} de ${totalPages}</span>
                        <button class="btn-page" id="btn-next" ${state.currentPage >= totalPages ? 'disabled' : ''}>Próxima</button>
                    </div>
                </div>
            </div>
        `;

        // Event Listeners para Filtros e Paginação
        const teamInput = document.getElementById('filter-team');
        teamInput.addEventListener('input', (e) => {
            this.entradasState.filterTeam = e.target.value;
            this.entradasState.currentPage = 1;
            this.renderEntradas();
            
            // Restaura o foco e o cursor
            const newInput = document.getElementById('filter-team');
            newInput.focus();
            const val = newInput.value;
            newInput.value = '';
            newInput.value = val;
        });

        document.getElementById('filter-date').addEventListener('change', (e) => {
            this.entradasState.filterDate = e.target.value;
            this.entradasState.currentPage = 1;
            this.renderEntradas();
        });

        document.getElementById('filter-league').addEventListener('change', (e) => {
            this.entradasState.filterLeague = e.target.value;
            this.entradasState.currentPage = 1;
            this.renderEntradas();
        });

        document.getElementById('filter-method').addEventListener('change', (e) => {
            this.entradasState.filterMethod = e.target.value;
            this.entradasState.currentPage = 1;
            this.renderEntradas();
        });

        document.getElementById('btn-prev').addEventListener('click', () => {
            if (this.entradasState.currentPage > 1) {
                this.entradasState.currentPage--;
                this.renderEntradas();
            }
        });

        document.getElementById('btn-next').addEventListener('click', () => {
            if (this.entradasState.currentPage < totalPages) {
                this.entradasState.currentPage++;
                this.renderEntradas();
            }
        });

        // Event Listener para as selects de método na tabela
        const methodSelects = document.querySelectorAll('.method-select');
        methodSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const val = e.target.value;
                const trade = this.data.find(d => d.id === id);
                if(trade) {
                    trade.userMethod = val;
                    this.saveData();
                }
            });
        });
        
        // Event Listener para LAY/BACK
        const self = this;
        
        function setupLaybackChange() {
            const laybackSelects = document.querySelectorAll('.layback-select');
            laybackSelects.forEach(select => {
                select.addEventListener('change', function(e) {
                    const id = this.getAttribute('data-id');
                    const val = this.value;
                    const trade = self.data.find(d => d.id === id);
                    if(trade) {
                        trade.layBack = val;
                        self.saveData();
                        
                        const cell = this.closest('td');
                        if (val) {
                            cell.innerHTML = `<span class="layback-badge ${val.toLowerCase()}" data-id="${id}">${val}</span>`;
                            setupBadgeClick();
                        } else {
                            cell.innerHTML = `<select class="filter-control layback-select" data-id="${id}" style="padding: 8px; font-size: 13px; width: 100%; border-radius: 8px; text-align: center; cursor: pointer;">
                                <option value="">-</option>
                                <option value="LAY" style="background: #f094ad; color: white;">LAY</option>
                                <option value="BACK" style="background: #00adf1; color: white;">BACK</option>
                            </select>`;
                            setupLaybackChange();
                        }
                    }
                });
            });
        }
        
        function setupBadgeClick() {
            const badges = document.querySelectorAll('.layback-badge');
            badges.forEach(badge => {
                badge.addEventListener('click', function() {
                    const rowId = this.getAttribute('data-id');
                    const td = this.closest('td');
                    td.innerHTML = `<select class="filter-control layback-select" data-id="${rowId}" style="padding: 8px; font-size: 13px; width: 100%; border-radius: 8px; text-align: center; cursor: pointer;">
                        <option value="">-</option>
                        <option value="LAY" style="background: #f094ad; color: white;">LAY</option>
                        <option value="BACK" style="background: #00adf1; color: white;">BACK</option>
                    </select>`;
                    setupLaybackChange();
                    td.querySelector('.layback-select').focus();
                });
            });
        }
        
        setupLaybackChange();
        setupBadgeClick();
        
        // Event Listener para STAKE
        const stakeInputs = document.querySelectorAll('.stake-input');
        stakeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const val = parseFloat(e.target.value) || 0;
                const trade = this.data.find(d => d.id === id);
                if(trade) {
                    trade.stake = val;
                    this.saveData();
                    
                    const percentage = val > 0 ? ((trade.netProfit / val) * 100).toFixed(2) + '%' : '-';
                    const row = e.target.closest('tr');
                    const percentageCell = row.querySelector('.percentage-value');
                    if (percentageCell) {
                        percentageCell.textContent = percentage;
                        percentageCell.className = 'percentage-value ' + (val > 0 ? (trade.netProfit >= 0 ? 'profit' : 'loss') : '');
                    }
                }
            });
        });
        this.addExpandListeners();
        this.addJournalListeners();
        this.addDeleteListeners();
    },

    addJournalListeners() {
        // Salvar Notas
        document.querySelectorAll('.journal-notes').forEach(textarea => {
            textarea.addEventListener('blur', async (e) => {
                const id = e.target.getAttribute('data-id');
                const val = e.target.value;
                const trade = this.data.find(d => d.id === id);
                if (trade) {
                    trade.notes = val;
                    await this.saveData();
                }
            });
        });

        // Upload de Imagens
        document.querySelectorAll('.journal-image-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = event.target.result;
                    const trade = this.data.find(d => d.id === id);
                    if (trade) {
                        trade.screenshot = base64;
                        await this.saveData();
                        
                        // Atualizar preview
                        const preview = document.getElementById(`preview-${id}`);
                        preview.innerHTML = `<img src="${base64}" style="max-width: 100%; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer;" onclick="window.open(this.src)">`;
                    }
                };
                reader.readAsDataURL(file);
            });
        });

        // Deletar Imagens
        document.querySelectorAll('.btn-delete-img').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Deseja remover esta imagem?')) return;
                
                const id = btn.getAttribute('data-id');
                const trade = this.data.find(d => d.id === id);
                if (trade) {
                    delete trade.screenshot;
                    await this.saveData();
                    
                    // Atualizar preview
                    const preview = document.getElementById(`preview-${id}`);
                    preview.innerHTML = '<div style="font-size: 11px; color: var(--text-secondary); text-align: center; padding: 10px; border: 1px dashed var(--border-color); border-radius: 8px;">Nenhuma imagem anexada</div>';
                }
            });
        });
    },

    addExpandListeners() {
        document.querySelectorAll('.btn-expand').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const detailRow = document.getElementById(`detail-${id}`);
                const icon = e.currentTarget.querySelector('i');
                
                if (detailRow.style.display === 'none') {
                    detailRow.style.display = 'table-row';
                    icon.className = 'bx bx-minus';
                    e.currentTarget.style.background = 'var(--danger-color)';
                } else {
                    detailRow.style.display = 'none';
                    icon.className = 'bx bx-plus';
                    e.currentTarget.style.background = 'var(--success-color)';
                }
            });
        });
    },

    addDeleteListeners() {
        document.querySelectorAll('.btn-delete-entry').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.deleteEntryPermanently(e.currentTarget.getAttribute('data-id'));
            });
        });

        const selectedCount = document.getElementById('selected-count');
        const selectVisible = document.getElementById('select-visible-entries');
        const deleteSelected = document.getElementById('delete-selected-entries');
        const entryCheckboxes = document.querySelectorAll('.entry-select');

        const updateBulkState = () => {
            const selected = document.querySelectorAll('.entry-select:checked');
            if (selectedCount) {
                selectedCount.textContent = `${selected.length} selecionada${selected.length === 1 ? '' : 's'}`;
            }
            if (deleteSelected) {
                deleteSelected.disabled = selected.length === 0;
            }
            if (selectVisible) {
                selectVisible.checked = entryCheckboxes.length > 0 && selected.length === entryCheckboxes.length;
                selectVisible.indeterminate = selected.length > 0 && selected.length < entryCheckboxes.length;
            }
        };

        entryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateBulkState);
        });

        if (selectVisible) {
            selectVisible.addEventListener('change', () => {
                entryCheckboxes.forEach(checkbox => {
                    checkbox.checked = selectVisible.checked;
                });
                updateBulkState();
            });
        }

        if (deleteSelected) {
            deleteSelected.addEventListener('click', async () => {
                const ids = [...document.querySelectorAll('.entry-select:checked')].map(checkbox => checkbox.getAttribute('data-id'));
                await this.deleteEntriesPermanently(ids);
            });
        }

        updateBulkState();

        document.querySelectorAll('.btn-delete-bet').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.deleteBetPermanently(
                    e.currentTarget.getAttribute('data-trade-id'),
                    e.currentTarget.getAttribute('data-bet-id')
                );
            });
        });
    },

    renderMetodos() {
        let html = `
            <div class="filters-container" style="justify-content: space-between; align-items: center;">
                <div class="filter-group" style="flex: 0 0 400px; max-width: 100%;">
                    <label>Cadastrar Novo Método Pessoal</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="new-method-input" class="filter-control" placeholder="Ex: Back Favorito no 2º Tempo" style="flex: 1;">
                        <button id="add-method-btn" class="btn-primary" style="padding: 8px 16px;">
                            <i class='bx bx-plus'></i> Criar
                        </button>
                    </div>
                </div>
            </div>
        `;

        const trades = this.data.filter(d => !d.isDepositOrWithdrawal && d.userMethod);
        const methodStats = {};
        
        // Inicializar stats para todos os métodos criados, mesmo os sem entradas
        this.customMethods.forEach(m => {
            methodStats[m] = { profit: 0, count: 0, wins: 0 };
        });

        trades.forEach(t => {
            if (methodStats[t.userMethod]) {
                methodStats[t.userMethod].profit += t.netProfit;
                methodStats[t.userMethod].count += 1;
                if (t.netProfit > 0) methodStats[t.userMethod].wins += 1;
            }
        });
        
        const sortedMethods = Object.keys(methodStats).map(k => ({
            name: k,
            ...methodStats[k]
        })).sort((a, b) => b.profit - a.profit);
        
        let rows = sortedMethods.map(m => `
            <tr>
                <td><strong>${m.name}</strong></td>
                <td>${m.count}</td>
                <td>${m.count > 0 ? ((m.wins / m.count) * 100).toFixed(2) : '0.00'}%</td>
                <td>
                    <span class="badge ${m.profit >= 0 ? 'green' : 'red'}">
                        ${this.formatCurrency(m.profit)}
                    </span>
                </td>
                <td style="text-align: right;">
                    <button class="btn-icon delete-method" data-name="${m.name}" style="width: 32px; height: 32px; font-size: 16px; color: var(--danger-color); display: inline-flex; margin-left: auto;">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            </tr>
        `).join('');

        if (this.customMethods.length === 0) {
            rows = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-secondary);">Você ainda não criou nenhum método. Use o campo acima para criar.</td></tr>`;
        }
        
        html += `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Método Pessoal</th>
                            <th>Nº de Entradas</th>
                            <th>Taxa de Acerto</th>
                            <th>Lucro Resultante</th>
                            <th style="text-align: right;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;

        this.appContainer.innerHTML = html;

        // Binds
        const btnAdd = document.getElementById('add-method-btn');
        const inputMethod = document.getElementById('new-method-input');
        
        const addFn = () => {
            const val = inputMethod.value.trim();
            if (val && !this.customMethods.includes(val)) {
                this.customMethods.push(val);
                this.saveData();
                this.renderMetodos();
            } else if (this.customMethods.includes(val)) {
                alert('Este método já existe!');
            }
        };

        btnAdd.addEventListener('click', addFn);
        inputMethod.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addFn();
        });

        document.querySelectorAll('.delete-method').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.getAttribute('data-name');
                if (confirm(`Tem certeza que deseja excluir o método "${name}"? As entradas associadas a ele ficarão sem método.`)) {
                    this.customMethods = this.customMethods.filter(m => m !== name);
                    // Clear from trades
                    this.data.forEach(t => {
                        if(t.userMethod === name) t.userMethod = '';
                    });
                    this.saveData();
                    this.renderMetodos();
                }
            });
        });
    },

    renderLigas() {
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        
        const allTeams = new Set();
        trades.forEach(t => {
            const teams = t.game.split(' x ').map(x => x.trim());
            teams.forEach(team => { if (team) allTeams.add(team); });
        });
        
        const sortedTeams = Array.from(allTeams).sort();
        
        const uniqueGames = new Set();
        trades.forEach(t => {
            const dateOnly = t.dateStr.split(' ')[0];
            uniqueGames.add(`${t.game}_${dateOnly}`);
        });
        
        const gameList = Array.from(uniqueGames).sort((a, b) => {
            const dateA = a.split('_').slice(-1)[0];
            const dateB = b.split('_').slice(-1)[0];
            return dateB.localeCompare(dateA);
        }).slice(0, 200);
        
        if (!this.ligasState) {
            this.ligasState = {
                activeTab: 'estatisticas',
                teamFilter: '',
                gameFilter: ''
            };
        }
        
        const state = this.ligasState;
        
        const leagueStats = {};
        this.ligas.forEach(l => {
            leagueStats[l] = { profit: 0, count: 0, wins: 0 };
        });
        
        trades.forEach(t => {
            const detected = this.detectLeague(t.game, t.dateStr);
            if (detected && leagueStats[detected]) {
                leagueStats[detected].profit += t.netProfit;
                leagueStats[detected].count += 1;
                if (t.netProfit > 0) leagueStats[detected].wins += 1;
            }
        });
        
        const sortedLeagues = Object.keys(leagueStats).map(k => ({
            name: k,
            ...leagueStats[k]
        })).sort((a, b) => b.profit - a.profit);
        
        const tabs = ['estatisticas', 'gerenciar', 'dicionario', 'excecoes'];
        let tabContent = '';
        
        if (state.activeTab === 'estatisticas') {
            let rows = sortedLeagues.map(l => {
                const logoUrl = this.getLogoLiga(l.name);
                const logoImg = logoUrl ? `<img src="${logoUrl}" style="width: 42px; height: 42px; object-fit: contain; border-radius: 6px; margin-right: 12px;" onerror="this.style.display='none'">` : '';
                return `
                <tr class="liga-clickable" data-liga="${l.name}" style="cursor: pointer;">
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            ${logoImg}
                            <strong>${l.name}</strong>
                        </div>
                    </td>
                    <td>${l.count}</td>
                    <td>${l.count > 0 ? ((l.wins / l.count) * 100).toFixed(2) : '0.00'}%</td>
                    <td>
                        <span class="badge ${l.profit >= 0 ? 'green' : 'red'}">
                            ${this.formatCurrency(l.profit)}
                        </span>
                    </td>
                </tr>
            `}).join('');
            
            if (this.ligas.length === 0) {
                rows = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-secondary);">Nenhuma liga cadastrada. Va em "Gerenciar Ligas" para adicionar.</td></tr>`;
            }
            
            tabContent = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Liga</th>
                                <th>Nº de Entradas</th>
                                <th>Taxa de Acerto</th>
                                <th>Lucro Resultante</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (state.activeTab === 'gerenciar') {
            tabContent = `
                <div class="filter-group" style="max-width: 500px; margin-bottom: 20px;">
                    <label>Cadastrar Nova Liga</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="new-liga-input" class="filter-control" placeholder="Ex: Brasileirão, Libertadores..." style="flex: 1;">
                        <button id="add-liga-btn" class="btn-primary" style="padding: 8px 16px;">
                            <i class='bx bx-plus'></i> Criar
                        </button>
                    </div>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Liga</th>
                                <th style="text-align: right;">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.ligas.length === 0 ? `<tr><td colspan="2" style="text-align:center; padding: 40px; color: var(--text-secondary);">Nenhuma liga cadastrada.</td></tr>` : this.ligas.map(l => `
                                <tr>
                                    <td><strong>${l}</strong></td>
                                    <td style="text-align: right;">
                                        <button class="btn-icon delete-liga" data-name="${l}" style="width: 32px; height: 32px; font-size: 16px; color: var(--danger-color);">
                                            <i class='bx bx-trash'></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (state.activeTab === 'dicionario') {
            const filteredTeams = state.teamFilter 
                ? sortedTeams.filter(t => t.toLowerCase().includes(state.teamFilter.toLowerCase()))
                : sortedTeams;
            
            tabContent = `
                <div class="filter-group" style="max-width: 400px; margin-bottom: 20px;">
                    <label>Buscar Time</label>
                    <input type="text" id="team-search-input" class="filter-control" placeholder="Ex: Flamengo..." value="${state.teamFilter}">
                </div>
                <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th style="width: 250px;">Liga Padrão</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredTeams.map(team => `
                                <tr>
                                    <td>${team}</td>
                                    <td>
                                        <select class="liga-select" data-team="${team}" style="padding: 8px; font-size: 13px; width: 100%; border-radius: 8px;">
                                            <option value="">Selecionar...</option>
                                            ${this.ligas.map(l => `<option value="${l}" ${this.dicionarioTimes[team] === l ? 'selected' : ''}>${l}</option>`).join('')}
                                        </select>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (state.activeTab === 'excecoes') {
            const filteredGames = state.gameFilter
                ? gameList.filter(g => g.toLowerCase().includes(state.gameFilter.toLowerCase()))
                : gameList;
            
            tabContent = `
                <div class="filter-group" style="max-width: 400px; margin-bottom: 20px;">
                    <label>Buscar Jogo</label>
                    <input type="text" id="game-search-input" class="filter-control" placeholder="Ex: Flamengo x..." value="${state.gameFilter}">
                </div>
                <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Jogo</th>
                                <th>Data</th>
                                <th style="width: 250px;">Liga Forçada</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredGames.map(g => {
                                const parts = g.split('_');
                                const game = parts.slice(0, -1).join('_');
                                const date = parts[parts.length - 1];
                                const currentLiga = this.excecoesJogos[g] || '';
                                return `
                                <tr>
                                    <td>${game}</td>
                                    <td>${date}</td>
                                    <td>
                                        <select class="excecao-select" data-game-id="${g}" style="padding: 8px; font-size: 13px; width: 100%; border-radius: 8px;">
                                            <option value="">Nenhuma (Auto)</option>
                                            ${this.ligas.map(l => `<option value="${l}" ${currentLiga === l ? 'selected' : ''}>${l}</option>`).join('')}
                                        </select>
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
                <p style="margin-top: 15px; color: var(--text-secondary); font-size: 13px;">
                    <i class='bx bx-info-circle'></i> Selecione "Nenhuma (Auto)" para usar a detecção automática.
                </p>
            `;
        }
        
        this.appContainer.innerHTML = `
            <div class="filters-container" style="justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">Competições dos Jogos</h3>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 13px;">Identifica automaticamente jogos mistos ou sem liga usando o Sofascore e salva como exceção.</p>
                </div>
                <button id="auto-identificar-competicoes-btn" class="btn-primary" style="padding: 10px 16px;">
                    <i class='bx bx-search-alt'></i> Auto identificar
                </button>
            </div>
            <div class="ligas-tabs">
                ${tabs.map(tab => `
                    <button class="liga-tab ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}">
                        ${tab === 'estatisticas' ? '📊 Estatísticas' : tab === 'gerenciar' ? '⚙️ Gerenciar Ligas' : tab === 'dicionario' ? '👥 Dicionário de Times' : '⚠️ Exceções de Jogos'}
                    </button>
                `).join('')}
            </div>
            ${tabContent}
            <div id="liga-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; overflow-y: auto; padding: 20px; box-sizing: border-box;">
                <div class="modal-content" style="background: #ffffff; margin: 1% auto; padding: 24px; border-radius: 12px; max-width: 1400px; width: 98%; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 98vh; overflow-y: auto;">
                    <button class="btn-icon" id="fechar-liga-modal" style="position: absolute; top: 15px; right: 15px; width: 36px; height: 36px;">
                        <i class='bx bx-x'></i>
                    </button>
                    <div id="liga-modal-body"></div>
                </div>
            </div>
        `;
        
        document.querySelectorAll('.liga-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.ligasState.activeTab = e.target.getAttribute('data-tab');
                this.renderLigas();
            });
        });

        const autoIdentificarBtn = document.getElementById('auto-identificar-competicoes-btn');
        if (autoIdentificarBtn) {
            autoIdentificarBtn.addEventListener('click', (e) => {
                if (confirm('Buscar no Sofascore as competições dos jogos mistos ou sem liga? Isso será salvo localmente e não precisará ser refeito para os mesmos jogos.')) {
                    this.autoIdentificarCompeticoes(e.currentTarget);
                }
            });
        }
        
        const addLigaInput = document.getElementById('new-liga-input');
        const addLigaBtn = document.getElementById('add-liga-btn');
        
        const addLigaFn = () => {
            const val = addLigaInput.value.trim();
            if (val && !this.ligas.includes(val)) {
                this.ligas.push(val);
                this.saveData();
                this.renderLigas();
            } else if (this.ligas.includes(val)) {
                alert('Esta liga já existe!');
            }
        };
        
        if (addLigaBtn) {
            addLigaBtn.addEventListener('click', addLigaFn);
            addLigaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') addLigaFn();
            });
        }
        
        document.querySelectorAll('.delete-liga').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.currentTarget.getAttribute('data-name');
                if (confirm(`Tem certeza que deseja excluir a liga "${name}"?`)) {
                    this.ligas = this.ligas.filter(l => l !== name);
                    Object.keys(this.dicionarioTimes).forEach(team => {
                        if (this.dicionarioTimes[team] === name) delete this.dicionarioTimes[team];
                    });
                    Object.keys(this.excecoesJogos).forEach(gameId => {
                        if (this.excecoesJogos[gameId] === name) delete this.excecoesJogos[gameId];
                    });
                    this.saveData();
                    this.renderLigas();
                }
            });
        });
        
        const teamSearchInput = document.getElementById('team-search-input');
        if (teamSearchInput) {
            teamSearchInput.addEventListener('input', (e) => {
                this.ligasState.teamFilter = e.target.value;
                this.renderLigas();
                const newInput = document.getElementById('team-search-input');
                newInput.focus();
                const val = newInput.value;
                newInput.value = '';
                newInput.value = val;
            });
        }
        
        document.querySelectorAll('.liga-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const team = e.target.getAttribute('data-team');
                const val = e.target.value;
                if (val) {
                    this.dicionarioTimes[team] = val;
                } else {
                    delete this.dicionarioTimes[team];
                }
                this.saveData();
            });
        });
        
        const gameSearchInput = document.getElementById('game-search-input');
        if (gameSearchInput) {
            gameSearchInput.addEventListener('input', (e) => {
                this.ligasState.gameFilter = e.target.value;
                this.renderLigas();
                const newInput = document.getElementById('game-search-input');
                newInput.focus();
                const val = newInput.value;
                newInput.value = '';
                newInput.value = val;
            });
        }
        
        document.querySelectorAll('.excecao-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const gameId = e.target.getAttribute('data-game-id');
                const val = e.target.value;
                if (val) {
                    this.excecoesJogos[gameId] = val;
                } else {
                    delete this.excecoesJogos[gameId];
                }
                this.saveData();
            });
        });
        
        document.querySelectorAll('.liga-clickable').forEach(row => {
            row.addEventListener('click', (e) => {
                const ligaName = e.currentTarget.getAttribute('data-liga');
                this.abrirModalLiga(ligaName);
            });
        });
        
        const fecharLigaModal = document.getElementById('fechar-liga-modal');
        const ligaModal = document.getElementById('liga-modal');
        if (fecharLigaModal && ligaModal) {
            fecharLigaModal.addEventListener('click', () => {
                ligaModal.style.display = 'none';
            });
            ligaModal.addEventListener('click', (e) => {
                if (e.target.id === 'liga-modal') {
                    ligaModal.style.display = 'none';
                }
            });
        }
    },

    abrirModalLiga(ligaName) {
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        const tradesLiga = trades.filter(t => this.detectLeague(t.game, t.dateStr) === ligaName);
        
        if (tradesLiga.length === 0) {
            alert('Nenhuma entrada encontrada para esta liga.');
            return;
        }
        
        const totalEntries = tradesLiga.length;
        const greens = tradesLiga.filter(t => t.netProfit > 0);
        const reds = tradesLiga.filter(t => t.netProfit < 0);
        const greenCount = greens.length;
        const redCount = reds.length;
        const winrate = ((greenCount / totalEntries) * 100).toFixed(2);
        const totalProfit = tradesLiga.reduce((acc, t) => acc + t.netProfit, 0);
        const maiorGreen = greens.length > 0 ? Math.max(...greens.map(t => t.netProfit)) : 0;
        const maiorRed = reds.length > 0 ? Math.min(...reds.map(t => t.netProfit)) : 0;
        
        const teamStats = {};
        tradesLiga.forEach(t => {
            const teams = t.game.split(' x ').map(x => x.trim());
            teams.forEach(team => {
                if (!team) return;
                if (!teamStats[team]) {
                    teamStats[team] = { profit: 0, entriesCount: 0, wins: 0, losses: 0 };
                }
                teamStats[team].profit += t.netProfit;
                teamStats[team].entriesCount += 1;
                if (t.netProfit > 0) teamStats[team].wins += 1;
                else teamStats[team].losses += 1;
            });
        });
        
        const sortedTeamsByProfit = Object.keys(teamStats)
            .map(k => ({ name: k, ...teamStats[k] }))
            .sort((a, b) => b.profit - a.profit);
        
        const topTeams = sortedTeamsByProfit.slice(0, 10);
        const worstTeams = sortedTeamsByProfit.slice(-10).reverse();
        
        const mercadoStats = {};
        tradesLiga.forEach(t => {
            const mercado = t.method || 'Outro';
            if (!mercadoStats[mercado]) mercadoStats[mercado] = { profit: 0, count: 0 };
            mercadoStats[mercado].profit += t.netProfit;
            mercadoStats[mercado].count += 1;
        });
        
        const sortedMercados = Object.keys(mercadoStats)
            .map(k => ({ name: k, ...mercadoStats[k] }))
            .sort((a, b) => b.profit - a.profit);
        
        const uniqueGames = new Set(tradesLiga.map(t => {
            const dateOnly = t.dateStr.split(' ')[0];
            return `${t.game}_${dateOnly}`;
        }));
        
        const logoUrl = this.getLogoLiga(ligaName);
        const logoImg = logoUrl ? `<img src="${logoUrl}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 12px;" onerror="this.style.display='none'">` : '';
        
        const modalBody = document.getElementById('liga-modal-body');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="text-align: center; margin-bottom: 24px;">
                    ${logoImg}
                    <h2 style="margin: 12px 0 0 0;">${ligaName}</h2>
                </div>
                
                <div class="dashboard-grid" style="grid-template-columns: repeat(4, 1fr);">
                    <div class="stat-card">
                        <div class="title">Entradas</div>
                        <div class="value">${totalEntries}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Jogos</div>
                        <div class="value">${uniqueGames.size}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Taxa de Acerto</div>
                        <div class="value">${winrate}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="title">Lucro Total</div>
                        <div class="value ${totalProfit >= 0 ? 'profit' : 'loss'}">${this.formatCurrency(totalProfit)}</div>
                    </div>
                </div>
                
                <div class="dashboard-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 15px;">
                    <div class="stat-card">
                        <div class="title" style="color: var(--success-color);">Maior Green</div>
                        <div class="value profit">${this.formatCurrency(maiorGreen)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title" style="color: var(--danger-color);">Maior Red</div>
                        <div class="value loss">${this.formatCurrency(maiorRed)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="title" style="color: var(--success-color);">Greens</div>
                        <div class="value profit">${greenCount}</div>
                    </div>
                </div>
                
                <div class="charts-area" style="margin-top: 20px;">
                    <div class="chart-card">
                        <h3>Lucro por Mercado</h3>
                        <div style="position: relative; height: 200px; width: 100%;">
                            <canvas id="ligaMercadosChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h3>Assertividade</h3>
                        <div style="position: relative; height: 200px; width: 100%; margin: auto;">
                            <canvas id="ligaWinLossChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 24px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                        <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px;">
                            <h3 style="font-size: 16px; margin-bottom: 15px; color: var(--success-color);">
                                <i class='bx bx-trophy'></i> Top 5 Melhores Times
                            </h3>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${topTeams.slice(0, 5).map((t, idx) => {
                                    const taxa = t.entriesCount > 0 ? ((t.wins / t.entriesCount) * 100).toFixed(1) : '0.0';
                                    const escudo = this.getEscudoTime(t.name);
                                    return `
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-weight: bold; color: var(--primary-color); width: 20px;">#${idx + 1}</span>
                                            ${escudo ? `<img src="${escudo}" style="width: 28px; height: 28px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none'">` : ''}
                                            <span style="font-weight: 500;">${t.name}</span>
                                        </div>
                                        <div style="text-align: right;">
                                            <span class="badge ${t.profit >= 0 ? 'green' : 'red'}">${this.formatCurrency(t.profit)}</span>
                                            <span style="font-size: 11px; color: var(--text-secondary); margin-left: 8px;">${t.entriesCount} entr. / ${taxa}%</span>
                                        </div>
                                    </div>
                                    `}).join('')}
                            </div>
                        </div>
                        <div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px;">
                            <h3 style="font-size: 16px; margin-bottom: 15px; color: var(--danger-color);">
                                <i class='bx bx-error'></i> Top 5 Piores Times
                            </h3>
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${worstTeams.slice(0, 5).map((t, idx) => {
                                    const taxa = t.entriesCount > 0 ? ((t.wins / t.entriesCount) * 100).toFixed(1) : '0.0';
                                    const escudo = this.getEscudoTime(t.name);
                                    return `
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-weight: bold; color: var(--danger-color); width: 20px;">#${idx + 1}</span>
                                            ${escudo ? `<img src="${escudo}" style="width: 28px; height: 28px; object-fit: contain; border-radius: 4px;" onerror="this.style.display='none'">` : ''}
                                            <span style="font-weight: 500;">${t.name}</span>
                                        </div>
                                        <div style="text-align: right;">
                                            <span class="badge ${t.profit >= 0 ? 'green' : 'red'}">${this.formatCurrency(t.profit)}</span>
                                            <span style="font-size: 11px; color: var(--text-secondary); margin-left: 8px;">${t.entriesCount} entr. / ${taxa}%</span>
                                        </div>
                                    </div>
                                    `}).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Últimas Entradas</h3>
                    <div class="table-container" style="max-height: 250px; overflow-y: auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Jogo</th>
                                    <th>Mercado</th>
                                    <th>P/L</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tradesLiga.slice(0, 15).map(e => {
                                    const teams = e.game.split(' x ');
                                    const escudoA = this.getEscudoTime(teams[0]?.trim());
                                    const escudoB = this.getEscudoTime(teams[1]?.trim());
                                    return `
                                    <tr>
                                        <td style="font-size: 12px;">${e.dateStr}</td>
                                        <td style="font-size: 12px;">
                                            <div style="display: flex; align-items: center; gap: 4px;">
                                                ${escudoA ? `<img src="${escudoA}" style="width: 20px; height: 20px; object-fit: contain;" onerror="this.style.display='none'">` : ''}
                                                ${teams[0]}
                                                <span>x</span>
                                                ${teams[1]}
                                                ${escudoB ? `<img src="${escudoB}" style="width: 20px; height: 20px; object-fit: contain;" onerror="this.style.display='none'">` : ''}
                                            </div>
                                        </td>
                                        <td style="font-size: 12px;">${e.method}</td>
                                        <td><span class="badge ${e.netProfit >= 0 ? 'green' : 'red'}" style="font-size: 11px;">${this.formatCurrency(e.netProfit)}</span></td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            const modal = document.getElementById('liga-modal');
            if (modal) {
                modal.style.display = 'block';
                
                setTimeout(() => {
                    this.initModalLigaCharts(sortedMercados, greenCount, redCount);
                }, 100);
            }
        }
    },
    
    initModalLigaCharts(sortedMercados, greenCount, redCount) {
        const colorText = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();
        const successColor = getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim();
        const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger-color').trim();
        
        const ctxMercados = document.getElementById('ligaMercadosChart');
        if (ctxMercados) {
            new Chart(ctxMercados.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedMercados.slice(0, 8).map(m => m.name),
                    datasets: [{
                        data: sortedMercados.slice(0, 8).map(m => m.profit),
                        backgroundColor: sortedMercados.slice(0, 8).map(m => m.profit >= 0 ? successColor : dangerColor),
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            ticks: { color: colorText, font: { size: 10 } },
                            grid: { color: borderColor, borderDash: [5, 5] }
                        },
                        y: {
                            ticks: { color: colorText, font: { size: 10 } },
                            grid: { display: false }
                        }
                    }
                }
            });
        }
        
        const ctxWL = document.getElementById('ligaWinLossChart');
        if (ctxWL) {
            new Chart(ctxWL.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Greens', 'Reds'],
                    datasets: [{
                        data: [greenCount, redCount],
                        backgroundColor: [successColor, dangerColor],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { 
                            position: 'bottom',
                            labels: { color: colorText, padding: 10, usePointStyle: true }
                        }
                    }
                }
            });
        }
    },

    renderTimes() {
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        const teamStats = {};
        const teamEntries = {};
        
        trades.forEach(t => {
            const teams = t.game.split(' x ').map(x => x.trim());
            const dateOnly = t.dateStr.split(' ')[0];
            const gameId = `${t.game}_${dateOnly}`;
            
            teams.forEach((team, idx) => {
                if(!team) return;
                if (!teamStats[team]) {
                    teamStats[team] = { profit: 0, entriesCount: 0, uniqueGames: new Set(), markets: new Set(), greens: [], reds: [] };
                    teamEntries[team] = [];
                }
                teamStats[team].profit += t.netProfit;
                teamStats[team].entriesCount += 1;
                teamStats[team].uniqueGames.add(gameId);
                teamStats[team].markets.add(t.method);
                if (t.netProfit > 0) {
                    teamStats[team].greens.push(t.netProfit);
                } else if (t.netProfit < 0) {
                    teamStats[team].reds.push(t.netProfit);
                }
                teamEntries[team].push(t);
            });
        });
        
        const sortedTeams = Object.keys(teamStats).map(k => ({
            name: k,
            profit: teamStats[k].profit,
            entriesCount: teamStats[k].entriesCount,
            gamesCount: teamStats[k].uniqueGames.size,
            markets: Array.from(teamStats[k].markets),
            greens: teamStats[k].greens.sort((a, b) => b - a).slice(0, 5),
            reds: teamStats[k].reds.sort((a, b) => a - b).slice(0, 5)
        })).sort((a, b) => b.profit - a.profit);
        
        let rows = sortedTeams.map(t => {
            const escudoUrl = this.getEscudoTime(t.name);
            const escudoImg = escudoUrl ? `<img src="${escudoUrl}" alt="${t.name}" style="width: 40px; height: 40px; object-fit: contain;" onerror="this.style.display='none'">` : '';
            return `
            <tr class="time-row" data-time="${t.name}" style="cursor: pointer;" onclick="App.abrirModalTime('${t.name.replace(/'/g, "\\'")}')">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${escudoImg}
                        <strong>${t.name}</strong>
                    </div>
                </td>
                <td>${t.gamesCount}</td>
                <td>${t.entriesCount}</td>
                <td>
                    <span class="badge ${t.profit >= 0 ? 'green' : 'red'}">
                        ${this.formatCurrency(t.profit)}
                    </span>
                </td>
            </tr>
        `}).join('');
        
        this.appContainer.innerHTML = `
            <div class="filters-container">
                <input type="text" id="busca-time" class="filter-control" placeholder="Buscar time..." style="max-width: 300px;">
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Jogos</th>
                            <th>Entradas</th>
                            <th>Lucro</th>
                        </tr>
                    </thead>
                    <tbody id="times-tbody">
                        ${rows}
                    </tbody>
                </table>
            </div>
            <div id="time-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; overflow-y: auto; padding: 20px; box-sizing: border-box;">
                <div class="modal-content" style="background: #ffffff; margin: 2% auto; padding: 24px; border-radius: 12px; max-width: 900px; width: 95%; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 95vh; overflow-y: auto;">
                    <button class="btn-icon" id="fechar-modal" style="position: absolute; top: 15px; right: 15px; width: 36px; height: 36px;">
                        <i class='bx bx-x'></i>
                    </button>
                    <div id="modal-body"></div>
                </div>
            </div>
        `;
        
        // Busca
        document.getElementById('busca-time').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.time-row').forEach(row => {
                const name = row.getAttribute('data-time').toLowerCase();
                row.style.display = name.includes(term) ? '' : 'none';
            });
        });
        
        // Clique na linha
        document.querySelectorAll('.time-row').forEach(row => {
            row.addEventListener('click', () => {
                const teamName = row.getAttribute('data-time');
                const stats = teamStats[teamName];
                const entries = teamEntries[teamName];
                const mercadoCounts = {};
                entries.forEach(e => {
                    mercadoCounts[e.method] = (mercadoCounts[e.method] || 0) + 1;
                });
                
                const marketsArray = Array.from(stats.markets);
                const maiorGreen = stats.greens[0] || 0;
                const maiorRed = stats.reds[0] || 0;
                const greenCount = stats.greens.length;
                const redCount = stats.reds.length;
                const winrate = stats.entriesCount > 0 ? ((greenCount / stats.entriesCount) * 100).toFixed(1) : 0;
                
                const entriesSorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
                const lucroPorData = [];
                let acumulado = 0;
                entriesSorted.forEach(e => {
                    acumulado += e.netProfit;
                    lucroPorData.push({ date: e.dateStr, lucro: acumulado });
                });
                
                const mercadoLabels = Object.keys(mercadoCounts);
                const mercadoValues = Object.values(mercadoCounts);
                
                const escudoUrl = this.getEscudoTime(teamName);
                const escudoImg = escudoUrl ? `<img src="${escudoUrl}" style="width: 80px; height: 80px; object-fit: contain;">` : '';
                
                document.getElementById('modal-body').innerHTML = `
                    <div style="text-align: center; margin-bottom: 24px;">
                        ${escudoImg}
                        <h2 style="margin: 12px 0 0 0;">${teamName}</h2>
                    </div>
                    <div class="dashboard-grid" style="grid-template-columns: repeat(4, 1fr);">
                        <div class="stat-card">
                            <div class="title">Entradas</div>
                            <div class="value">${stats.entriesCount}</div>
                        </div>
                        <div class="stat-card">
                            <div class="title">Jogos</div>
                            <div class="value">${stats.uniqueGames.size}</div>
                        </div>
                        <div class="stat-card">
                            <div class="title">Taxa de Acerto</div>
                            <div class="value">${winrate}%</div>
                        </div>
                        <div class="stat-card">
                            <div class="title">Lucro Total</div>
                            <div class="value ${stats.profit >= 0 ? 'profit' : 'loss'}">${this.formatCurrency(stats.profit)}</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 15px;">
                        <div class="stat-card">
                            <div class="title" style="color: var(--success-color);">Maior Green</div>
                            <div class="value profit">${this.formatCurrency(maiorGreen)}</div>
                        </div>
                        <div class="stat-card">
                            <div class="title" style="color: var(--danger-color);">Maior Red</div>
                            <div class="value loss">${this.formatCurrency(maiorRed)}</div>
                        </div>
                        <div class="stat-card">
                            <div class="title" style="color: var(--primary-color);">Greens</div>
                            <div class="value">${greenCount}</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                        <div style="background: var(--bg-surface); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border);">
                            <h3 style="font-size: 14px; margin-bottom: 15px; color: var(--text-secondary);">Lucro Acumulado no Tempo</h3>
                            <canvas id="chart-lucro-time" height="200"></canvas>
                        </div>
                        <div style="background: var(--bg-surface); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border);">
                            <h3 style="font-size: 14px; margin-bottom: 15px; color: var(--text-secondary);">Distribuição por Mercado</h3>
                            <canvas id="chart-mercado" height="200"></canvas>
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <h3 style="font-size: 16px; margin-bottom: 10px;">Mercados (${marketsArray.length})</h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${marketsArray.map(m => `<span class="liga-badge">${m}</span>`).join('')}
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <h3 style="font-size: 16px; margin-bottom: 10px;">Top Greens (${greenCount})</h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${stats.greens.slice(0, 10).map(g => `<span class="badge green">${this.formatCurrency(g)}</span>`).join('')}
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <h3 style="font-size: 16px; margin-bottom: 10px;">Top Reds (${redCount})</h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${stats.reds.slice(0, 10).map(r => `<span class="badge red">${this.formatCurrency(r)}</span>`).join('')}
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <h3 style="font-size: 16px; margin-bottom: 10px;">Últimas Entradas</h3>
                        <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Jogo</th>
                                        <th>Mercado</th>
                                        <th>P/L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${entries.slice(0, 20).map(e => `
                                    <tr>
                                        <td style="font-size: 12px;">${e.dateStr}</td>
                                        <td style="font-size: 12px;">${e.game}</td>
                                        <td style="font-size: 12px;">${e.method}</td>
                                        <td><span class="badge ${e.netProfit >= 0 ? 'green' : 'red'}" style="font-size: 11px;">${this.formatCurrency(e.netProfit)}</span></td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                document.getElementById('time-modal').style.display = 'block';
                
                setTimeout(() => {
                    new Chart(document.getElementById('chart-lucro-time'), {
                        type: 'line',
                        data: {
                            labels: lucroPorData.map(d => d.date),
                            datasets: [{
                                label: 'Lucro Acumulado',
                                data: lucroPorData.map(d => d.lucro),
                                borderColor: '#4CAF50',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                fill: true,
                                tension: 0.3
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: { legend: { display: false } },
                            scales: {
                                x: { display: true, ticks: { maxTicksLimit: 8 } },
                                y: { display: true }
                            }
                        }
                    });
                    
                    new Chart(document.getElementById('chart-mercado'), {
                        type: 'doughnut',
                        data: {
                            labels: mercadoLabels,
                            datasets: [{
                                data: mercadoValues,
                                backgroundColor: ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#795548', '#607D8B']
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: { legend: { position: 'right' } }
                        }
                    });
                }, 100);
            });
        });
        
        // Fechar modal
        document.getElementById('fechar-modal').addEventListener('click', () => {
            document.getElementById('time-modal').style.display = 'none';
        });
        document.getElementById('time-modal').addEventListener('click', (e) => {
            if (e.target.id === 'time-modal') {
                document.getElementById('time-modal').style.display = 'none';
            }
        });
    },

    renderFinancas() {
        const financas = this.data.filter(d => d.isDepositOrWithdrawal);
        
        let rows = financas.map(f => `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="entry-select" data-id="${f.id}" aria-label="Selecionar ${f.netProfit >= 0 ? 'depósito' : 'saque'}" style="width: 16px; height: 16px; cursor: pointer;">
                </td>
                <td>${f.dateStr}</td>
                <td>${f.game}</td>
                <td>
                    <span class="badge ${f.netProfit >= 0 ? 'green' : 'red'}">
                        ${this.formatCurrency(f.netProfit)}
                    </span>
                </td>
                <td>${this.formatCurrency(f.balance)}</td>
                <td style="text-align: center;">
                    <button class="btn-icon btn-delete-entry" data-id="${f.id}" title="Excluir ${f.netProfit >= 0 ? 'depósito' : 'saque'}" style="width: 34px; height: 34px; color: var(--danger-color);">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            </tr>
        `).join('');

        if (financas.length === 0) {
            rows = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-secondary);">Nenhum saque ou depósito encontrado.</td></tr>`;
        }
        
        this.appContainer.innerHTML = `
            <div class="filters-container" style="justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-weight: 600;">
                    <input type="checkbox" id="select-visible-entries" style="width: 16px; height: 16px; cursor: pointer;">
                    <span id="selected-count">0 selecionados</span>
                </div>
                <button id="delete-selected-entries" class="btn-primary" style="background: var(--danger-color); padding: 10px 16px;" disabled>
                    <i class='bx bx-trash'></i> Excluir selecionados
                </button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 44px;"></th>
                            <th>Data</th>
                            <th>Tipo (Ref)</th>
                            <th>Valor</th>
                            <th>Saldo na Época</th>
                            <th style="width: 70px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;

        this.addDeleteListeners();
    },

    // ============================================
    // DOWNLOAD DE ESCUDOS E LOGOS VIA SOFASCORE
    // ============================================
    
    _downloadDelay: 600,

    async _fetchSofascore(url, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                const r = await fetch(url);
                if (r.ok) return r;
                if (r.status === 429) {
                    await new Promise(res => setTimeout(res, 2000 * (i + 1)));
                    continue;
                }
                return null;
            } catch(e) {
                if (i < retries) await new Promise(res => setTimeout(res, 1000));
            }
        }
        return null;
    },

    async _imageToDataURL(imageUrl) {
        try {
            const r = await fetch(imageUrl);
            if (!r.ok) return null;
            const blob = await r.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch(e) {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth || 64;
                        canvas.height = img.naturalHeight || 64;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } catch(e2) {
                        resolve(null);
                    }
                };
                img.onerror = () => resolve(null);
                img.src = imageUrl;
            });
        }
    },

    async _buscarTimeSofascore(teamName) {
        const url = `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(teamName)}&page=0`;
        const r = await this._fetchSofascore(url);
        if (!r) return null;
        try {
            const data = await r.json();
            const results = data?.results || [];
            for (const result of results) {
                if (result.type === 'team' && result.entity?.id) {
                    return { id: result.entity.id, name: result.entity.name || teamName };
                }
            }
        } catch(e) {}
        return null;
    },

    async baixarEscudosSofascore(btnEl = null) {
        const originalHTML = btnEl ? btnEl.innerHTML : '';
        const setProgress = (msg) => { if (btnEl) btnEl.innerHTML = msg; };
        
        if (btnEl) btnEl.disabled = true;
        setProgress('<i class="bx bx-loader-alt bx-spin"></i> Buscando times...');
        
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        const allTeams = new Set();
        trades.forEach(t => {
            const teams = t.game.split(' x ').map(x => x.trim());
            teams.forEach(team => { if (team) allTeams.add(team); });
        });
        
        const missingTeams = [...allTeams].filter(name => !this.escudosTimes[name]);
        
        if (missingTeams.length === 0) {
            alert('Todos os times já possuem escudo!');
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHTML; }
            return;
        }
        
        let baixados = 0;
        let naoEncontrados = 0;
        const errosNomes = [];
        
        for (let i = 0; i < missingTeams.length; i++) {
            const teamName = missingTeams[i];
            setProgress(`<i class="bx bx-loader-alt bx-spin"></i> ${i+1}/${missingTeams.length}: ${teamName}`);
            
            const teamInfo = await this._buscarTimeSofascore(teamName);
            
            if (!teamInfo) {
                naoEncontrados++;
                errosNomes.push(teamName);
                await new Promise(r => setTimeout(r, this._downloadDelay));
                continue;
            }
            
            const imageUrl = `https://api.sofascore.app/api/v1/team/${teamInfo.id}/image`;
            const dataUrl = await this._imageToDataURL(imageUrl);
            
            if (dataUrl) {
                this.escudosTimes[teamName] = dataUrl;
                baixados++;
            } else {
                naoEncontrados++;
                errosNomes.push(teamName);
            }
            
            if (baixados % 5 === 0) await this.saveData();
            await new Promise(r => setTimeout(r, this._downloadDelay));
        }
        
        await this.saveData();
        
        let msg = `${baixados} escudo(s) baixado(s) com sucesso!`;
        if (naoEncontrados > 0) {
            msg += `\n${naoEncontrados} não encontrado(s): ${errosNomes.slice(0, 10).join(', ')}${errosNomes.length > 10 ? '...' : ''}`;
        }
        alert(msg);
        
        if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHTML; }
        this.render();
    },

    async _buscarTorneioSofascore(leagueName) {
        const url = `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(leagueName)}&page=0`;
        const r = await this._fetchSofascore(url);
        if (!r) return null;
        try {
            const data = await r.json();
            const results = data?.results || [];
            for (const result of results) {
                if (result.type === 'tournament' && result.entity?.uniqueTournament?.id) {
                    return { id: result.entity.uniqueTournament.id, name: result.entity.name || leagueName };
                }
            }
        } catch(e) {}
        return null;
    },

    _getTournamentMap() {
        return {
            // ===== BRASIL =====
            'Brasileirão': 325,
            'Brasileirão Série A': 325,
            'Brasileirao': 325,
            'Brasileirão Série B': 390,
            'Brasileirao Serie B': 390,
            'Copa do Brasil': 351,
            'Copa Brasil': 351,
            // ===== BRASIL ESTADUAIS =====
            'Campeonato Paulista': 1386,
            'Paulista': 1386,
            'Paulistão': 1386,
            'Campeonato Carioca': 1387,
            'Carioca': 1387,
            'Cariocão': 1387,
            'Campeonato Mineiro': 3295,
            'Mineiro': 3295,
            'Campeonato Gaúcho': 1391,
            'Gaúcho': 1391,
            'Campeonato Paranaense': 1394,
            'Campeonato Catarinense': 1393,
            'Campeonato Baiano': 1395,
            'Campeonato Pernambucano': 3296,
            'Campeonato Goiano': 3297,
            // ===== LIBERTADORES / SUL-AMERICANA =====
            'Libertadores': 384,
            'Copa Libertadores': 384,
            'Conmebol Libertadores': 384,
            'Taça Libertadores': 384,
            'Sul-Americana': 480,
            'Copa Sul-Americana': 480,
            'Copa Sudamericana': 480,
            'Sudamericana': 480,
            'Recopa Sul-Americana': 481,
            // ===== EUROPA =====
            'Champions League': 7,
            'Liga dos Campeões': 7,
            'UEFA Champions League': 7,
            'Europa League': 679,
            'UEFA Europa League': 679,
            'Conference League': 17015,
            'Europa Conference League': 17015,
            'Euro': 1,
            'Eurocopa': 1,
            'European Championship': 1,
            // ===== INGLATERRA =====
            'Premier League': 17,
            'Premier': 17,
            'Inglês': 17,
            'FA Cup': 122,
            'Copa da Inglaterra': 122,
            'EFL Cup': 121,
            'Championship': 18,
            // ===== ESPANHA =====
            'La Liga': 8,
            'LaLiga': 8,
            'Espanhol': 8,
            'Copa do Rei': 331,
            'Copa del Rey': 331,
            // ===== ITÁLIA =====
            'Serie A': 23,
            'Italiano': 23,
            'Coppa Italia': 153,
            'Copa da Itália': 153,
            // ===== ALEMANHA =====
            'Bundesliga': 35,
            'Alemão': 35,
            'DFB Pokal': 100,
            'Copa da Alemanha': 100,
            // ===== FRANÇA =====
            'Ligue 1': 34,
            'Francês': 34,
            'Ligue 2': 36,
            // ===== PORTUGAL =====
            'Liga Portugal': 238,
            'Primeira Liga': 238,
            'Português': 238,
            'Taça de Portugal': 239,
            // ===== HOLANDA =====
            'Eredivisie': 37,
            'Holandês': 37,
            // ===== ARGENTINA =====
            'Argentino': 142,
            'Campeonato Argentino': 142,
            'Liga Profesional': 142,
            'Liga Profesional Argentina': 142,
            'Copa Argentina': 383,
            // ===== OUTROS PAÍSES =====
            'MLS': 242,
            'Turco': 52,
            'Super Lig': 52,
            'Belga': 38,
            'Jupiler Pro League': 38,
            'Austríaco': 88,
            'Suíço': 215,
            'Grego': 44,
            'Escocês': 45,
            'Russo': 55,
            'Ucraniano': 58,
            'Chinês': 99,
            'Japonês': 101,
            'Coreano': 103,
            'Saudita': 98,
            // ===== AMÉRICA DO SUL =====
            'Copa America': 375,
            'Copa América': 375,
            'Argentino B': 143,
            // ===== MUNDIAL =====
            'Mundial de Clubes': 392,
            'Mundial': 392,
            'Copa do Mundo': 16,
            'World Cup': 16,
            // ===== OUTROS =====
            'Amistoso': 0,
            'Eliminatórias': 0,
            'Amistosos de Clubes': 0,
            'Confronto Misto': 0,
        };
    },

    async baixarLogosCompeticoes(btnEl = null) {
        const tournamentMap = this._getTournamentMap();
        
        const originalHTML = btnEl ? btnEl.innerHTML : '';
        const setProgress = (msg) => { if (btnEl) btnEl.innerHTML = msg; };
        
        if (btnEl) btnEl.disabled = true;
        setProgress('<i class="bx bx-loader-alt bx-spin"></i> Buscando competições...');
        
        // Coleta TODAS as ligas do sistema
        const allLeagues = new Set([...this.ligas]);
        
        // Também coleta ligas detectadas dos jogos
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        trades.forEach(t => {
            const liga = this.detectLeague(t.game, t.dateStr);
            if (liga && liga !== 'Confronto Misto') allLeagues.add(liga);
        });
        
        // Agrupa por ID único para evitar download duplicado de aliases
        // idToAliases: { 325: ['Brasileirão', 'Brasileirao', 'Brasileirão Série A', ...], ... }
        const idToAliases = {};
        const unmappedLeagues = [];
        
        for (const name of allLeagues) {
            if (name === 'Confronto Misto') continue;
            if (this.escudosLigas[name]) continue;
            
            const id = tournamentMap[name];
            if (id !== undefined && id > 0) {
                if (!idToAliases[id]) idToAliases[id] = [];
                if (!idToAliases[id].includes(name)) idToAliases[id].push(name);
            } else if (id === undefined) {
                unmappedLeagues.push(name);
            }
        }
        
        // Resolve as ligas não mapeadas via busca no Sofascore
        for (const name of unmappedLeagues) {
            setProgress(`<i class="bx bx-loader-alt bx-spin"></i> Buscando "${name}"...`);
            const info = await this._buscarTorneioSofascore(name);
            if (info && info.id > 0) {
                if (!idToAliases[info.id]) idToAliases[info.id] = [];
                if (!idToAliases[info.id].includes(name)) idToAliases[info.id].push(name);
            }
            await new Promise(r => setTimeout(r, this._downloadDelay / 2));
        }
        
        const uniqueIds = Object.keys(idToAliases).filter(id => parseInt(id) > 0);
        
        if (uniqueIds.length === 0) {
            alert('Todas as competições já possuem logo!');
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHTML; }
            return;
        }
        
        let baixados = 0;
        let erros = 0;
        const errosNomes = [];
        const downloadedIds = new Set(); // cache de IDs já baixados nesta sessão
        
        for (let i = 0; i < uniqueIds.length; i++) {
            const tid = parseInt(uniqueIds[i]);
            const aliases = idToAliases[tid] || [];
            const label = aliases[0] || `ID ${tid}`;
            
            setProgress(`<i class="bx bx-loader-alt bx-spin"></i> ${i+1}/${uniqueIds.length}: ${label}`);
            
            // Se já baixou esse ID, só replica para os aliases
            if (downloadedIds.has(tid)) {
                for (const alias of aliases) {
                    this.escudosLigas[alias] = this.escudosLigas[label];
                }
                baixados += aliases.length;
                continue;
            }
            
            const imageUrl = `https://api.sofascore.app/api/v1/unique-tournament/${tid}/image`;
            const dataUrl = await this._imageToDataURL(imageUrl);
            
            if (dataUrl) {
                downloadedIds.add(tid);
                // Salva o logo para TODOS os aliases que apontam para este ID
                for (const alias of aliases) {
                    this.escudosLigas[alias] = dataUrl;
                    baixados++;
                }
            } else {
                erros += aliases.length;
                errosNomes.push(...aliases);
            }
            
            if (baixados % 5 === 0) await this.saveData();
            await new Promise(r => setTimeout(r, this._downloadDelay));
        }
        
        await this.saveData();
        
        let msg = `${baixados} logo(s) baixado(s) com sucesso!`;
        if (erros > 0) {
            msg += `\n${erros} não encontrado(s): ${errosNomes.slice(0, 8).join(', ')}${errosNomes.length > 8 ? '...' : ''}`;
        }
        alert(msg);
        
        if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalHTML; }
        this.render();
    },

    renderEscudos() {
        const trades = this.data.filter(d => !d.isDepositOrWithdrawal);
        const allTeams = new Set();
        trades.forEach(t => {
            const teams = t.game.split(' x ').map(x => x.trim());
            teams.forEach(team => { if (team) allTeams.add(team); });
        });
        
        const sortedTeams = Array.from(allTeams).sort();
        
        let rows = sortedTeams.map(teamName => {
            const escudoUrl = this.escudosTimes[teamName] || '';
            const hasEscudo = !!escudoUrl;
            const isDataUrl = escudoUrl && escudoUrl.startsWith('data:');
            return `
            <tr class="escudo-row" data-team="${teamName}">
                <td style="width: 30%;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${hasEscudo ? `<img src="${escudoUrl}" style="width: 40px; height: 40px; object-fit: contain; background: transparent;" onerror="this.style.display='none'">` : '<span style="color: var(--text-secondary); font-size: 12px;">Sem escudo</span>'}
                        <strong>${teamName}</strong>
                    </div>
                </td>
                <td style="width: 50%;">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <label class="btn-icon" style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; background: var(--primary-color); color: white; border-radius: 6px;">
                            <i class='bx bx-upload'></i>
                            <input type="file" accept="image/*" class="escudo-file-input" data-team="${teamName}" style="display: none;">
                        </label>
                        <input type="text" class="filter-control escudo-url-input" data-team="${teamName}" placeholder="Ou cole uma URL..." value="${isDataUrl ? '' : escudoUrl}" style="flex: 1; min-width: 150px;">
                    </div>
                </td>
                <td style="width: 20%; text-align: center;">
                    ${hasEscudo ? '<span class="badge green">OK</span>' : '<span class="badge" style="background: var(--text-secondary); color: white;">Pendente</span>'}
                </td>
            </tr>
        `}).join('');
        
        const availableLeagues = ['Brasileirão', 'Libertadores', 'Copa do Brasil', 'Champions League', 'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Argentino', 'Copa America', 'Euro', 'Liga Portugal', 'Eredivisie', 'MLS', 'Campeonato Paulista', 'Campeonato Carioca', 'Campeonato Mineiro', 'Sul-Americana', 'Copa do Rei', 'FA Cup', 'Coppa Italia', 'DFB Pokal'];
        const allConfiguredLeagues = this.ligas.length > 0 ? this.ligas : availableLeagues;
        const uniqueLeagues = [...new Set(trades.map(t => this.detectLeague(t.game, t.dateStr)).filter(l => l && l !== 'Confronto Misto'))];
        
        const leagueSet = new Set([...allConfiguredLeagues, ...uniqueLeagues]);
        const displayLeagues = Array.from(leagueSet).sort();
        
        let ligaRows = displayLeagues.map(ligaName => {
            const logoUrl = this.escudosLigas[ligaName] || '';
            const hasLogo = !!logoUrl;
            const isDataUrl = logoUrl && logoUrl.startsWith('data:');
            return `
            <tr class="liga-row" data-liga="${ligaName}">
                <td style="width: 30%;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${hasLogo ? `<img src="${logoUrl}" style="width: 40px; height: 40px; object-fit: contain; background: transparent; border-radius: 4px;" onerror="this.style.display='none'">` : '<span style="color: var(--text-secondary); font-size: 12px;">Sem logo</span>'}
                        <strong>${ligaName}</strong>
                    </div>
                </td>
                <td style="width: 50%;">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <label class="btn-icon" style="width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; background: var(--success-color); color: white; border-radius: 6px;">
                            <i class='bx bx-upload'></i>
                            <input type="file" accept="image/*" class="liga-file-input" data-liga="${ligaName}" style="display: none;">
                        </label>
                        <input type="text" class="filter-control liga-url-input" data-liga="${ligaName}" placeholder="Ou cole uma URL..." value="${isDataUrl ? '' : logoUrl}" style="flex: 1; min-width: 150px;">
                    </div>
                </td>
                <td style="width: 20%; text-align: center;">
                    ${hasLogo ? '<span class="badge green">OK</span>' : '<span class="badge" style="background: var(--text-secondary); color: white;">Pendente</span>'}
                </td>
            </tr>
        `}).join('');
        
        this.appContainer.innerHTML = `
            <div style="max-width: 1400px; margin: 0 auto;">
                <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: var(--shadow-sm);">
                    <div>
                        <strong>Backup de Escudos e Logos</strong>
                        <p style="color: var(--text-secondary); font-size: 12px; margin: 5px 0 0 0;">Exporte seus escudos e logos para não perder ao trocar de navegador ou limpar dados</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="export-escudos-btn" class="btn-primary" style="background: var(--primary-color);">
                            <i class='bx bx-download'></i> Exportar
                        </button>
                        <label class="btn-primary" style="background: var(--success-color); cursor: pointer; padding: 8px 16px; border-radius: 8px; color: white; display: flex; align-items: center; gap: 5px;">
                            <i class='bx bx-upload'></i> Importar
                            <input type="file" id="import-escudos-input" accept=".json" style="display: none;">
                        </label>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 24px;">
                    <div>
                        <div class="filters-container" style="flex-direction: column; gap: 15px; margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <div>
                                    <h3 style="margin: 0 0 5px 0;">Escudos dos Times</h3>
                                    <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Use o botão de upload ou cole uma URL</p>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button id="baixar-escudos-btn" class="btn-primary" style="background: #ff6b35;" title="Baixar escudos dos times via Sofascore">
                                        <i class='bx bx-cloud-download'></i> Baixar do Sofascore
                                    </button>
                                    <input type="text" id="pesquisa-escudo" class="filter-control" placeholder="Buscar time..." style="width: 150px;">
                                    <button id="salvar-escudos-btn" class="btn-primary" style="background: var(--primary-color);">
                                        <i class='bx bx-save'></i> Salvar
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="table-container" style="max-height: 70vh; overflow-y: auto;">
                            <table style="width: 100%;">
                                <thead>
                                    <tr>
                                        <th style="width: 30%;">Time</th>
                                        <th style="width: 50%;">Escudo</th>
                                        <th style="width: 20%; text-align: center;">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="escudos-tbody">
                                    ${rows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <div class="filters-container" style="flex-direction: column; gap: 15px; margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <div>
                                    <h3 style="margin: 0 0 5px 0;">Logos das Competições</h3>
                                    <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Adicione logos das ligas/campeonato</p>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <button id="baixar-logos-btn" class="btn-primary" style="background: #ff6b35;" title="Baixar logos das competições via Sofascore">
                                        <i class='bx bx-cloud-download'></i> Baixar do Sofascore
                                    </button>
                                    <input type="text" id="pesquisa-liga" class="filter-control" placeholder="Buscar liga..." style="width: 150px;">
                                    <button id="salvar-ligas-btn" class="btn-primary" style="background: var(--success-color);">
                                        <i class='bx bx-save'></i> Salvar
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="table-container" style="max-height: 70vh; overflow-y: auto;">
                            <table style="width: 100%;">
                                <thead>
                                    <tr>
                                        <th style="width: 30%;">Competição</th>
                                        <th style="width: 50%;">Logo</th>
                                        <th style="width: 20%; text-align: center;">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="ligas-tbody">
                                    ${ligaRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Pesquisa
        document.getElementById('pesquisa-escudo').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.escudo-row').forEach(row => {
                const teamName = row.getAttribute('data-team').toLowerCase();
                row.style.display = teamName.includes(term) ? '' : 'none';
            });
        });
        
        // Botão Baixar Escudos do Sofascore
        document.getElementById('baixar-escudos-btn').addEventListener('click', (e) => {
            if (confirm('Isso irá buscar e baixar os escudos de TODOS os times sem escudo via Sofascore. Deseja continuar?')) {
                this.baixarEscudosSofascore(e.currentTarget);
            }
        });
        
        // Upload de arquivo
        document.querySelectorAll('.escudo-file-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const teamName = e.target.getAttribute('data-team');
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        const dataUrl = event.target.result;
                        this.escudosTimes[teamName] = dataUrl;
                        await this.saveData();
                        this.render();
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
        
        // Salvar URLs de times
        document.getElementById('salvar-escudos-btn').addEventListener('click', async () => {
            const inputs = document.querySelectorAll('.escudo-url-input');
            let count = 0;
            inputs.forEach(input => {
                const teamName = input.getAttribute('data-team');
                const url = input.value.trim();
                if (url) {
                    this.escudosTimes[teamName] = url;
                    count++;
                }
            });
            await this.saveData();
            alert(`${count} escudo(s) de time salvo(s) com sucesso!`);
            this.render();
        });
        
        // Pesquisa de ligas
        document.getElementById('pesquisa-liga').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.liga-row').forEach(row => {
                const ligaName = row.getAttribute('data-liga').toLowerCase();
                row.style.display = ligaName.includes(term) ? '' : 'none';
            });
        });
        
        // Botão Baixar Logos das Competições
        document.getElementById('baixar-logos-btn').addEventListener('click', (e) => {
            if (confirm('Isso irá baixar os logos de TODAS as competições mapeadas via Sofascore. Deseja continuar?')) {
                this.baixarLogosCompeticoes(e.currentTarget);
            }
        });
        
        // Upload de arquivo de logos de ligas
        document.querySelectorAll('.liga-file-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const ligaName = e.target.getAttribute('data-liga');
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        const dataUrl = event.target.result;
                        this.escudosLigas[ligaName] = dataUrl;
                        await this.saveData();
                        this.render();
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
        
        // Salvar URLs de ligas
        document.getElementById('salvar-ligas-btn').addEventListener('click', async () => {
            const inputs = document.querySelectorAll('.liga-url-input');
            let count = 0;
            inputs.forEach(input => {
                const ligaName = input.getAttribute('data-liga');
                const url = input.value.trim();
                if (url) {
                    this.escudosLigas[ligaName] = url;
                    count++;
                }
            });
            await this.saveData();
            alert(`${count} logo(s) de competição salvo(s) com sucesso!`);
            this.render();
        });
        
        // Exportar escudos e logos
        document.getElementById('export-escudos-btn').addEventListener('click', () => {
            const backup = {
                escudosTimes: this.escudosTimes,
                escudosLigas: this.escudosLigas,
                exportedAt: new Date().toISOString()
            };
            const dataStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `planilha-trader-escudos-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('Escudos e logos exportados com sucesso!');
        });
        
        // Importar escudos e logos
        document.getElementById('import-escudos-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const backup = JSON.parse(event.target.result);
                    
                    if (backup.escudosTimes) {
                        this.escudosTimes = { ...this.escudosTimes, ...backup.escudosTimes };
                    }
                    
                    if (backup.escudosLigas) {
                        this.escudosLigas = { ...this.escudosLigas, ...backup.escudosLigas };
                    }
                    
                    await this.saveData();
                    alert('Escudos e logos importados com sucesso!');
                    this.render();
                } catch (err) {
                    alert('Erro ao importar arquivo. Certifique-se de que é um arquivo de backup válido.');
                }
            };
            reader.readAsText(file);
        });
    },

    renderCiclos() {
        const state = this.ciclosState;
        const config = this.ciclosConfig;
        const cicloAtual = config[state.cicloAtual];
        const entradasDisponiveis = this.getEntradasDisponiveis();
        
        const tabs = ['painel', 'historico', 'config'];
        const activeTab = this.ciclosActiveTab || 'painel';
        
        let tabContent = '';
        
        if (activeTab === 'painel') {
            const lucroObjetivo = cicloAtual.objetivo - cicloAtual.stakeInicial;
            const objetivoParcial = lucroObjetivo * (cicloAtual.stopLucro / 100);
            const progresso = lucroObjetivo > 0 ? Math.min((state.saldoCiclo / lucroObjetivo) * 100, 100) : 0;
            const stake5Porcento = state.stakeAtual * 0.05;
            
            const ultimaEntrada = state.entradasCiclo.length > 0 ? state.entradasCiclo[state.entradasCiclo.length - 1] : null;
            const proximaStake = ultimaEntrada ? ultimaEntrada.stake + ultimaEntrada.profit : state.stakeAtual;
            const objetivoEntrada = proximaStake * 0.05;
            
            tabContent = `
                <div class="ciclos-dashboard">
                    <div class="ciclos-stats-row">
                        <div class="ciclos-stat-card">
                            <div class="ciclos-stat-label">Ciclo Atual</div>
                            <div class="ciclos-stat-value">${state.cicloAtual + 1} / ${config.length}</div>
                        </div>
                        <div class="ciclos-stat-card">
                            <div class="ciclos-stat-label">Stake Inicial do Ciclo</div>
                            <div class="ciclos-stat-value">${this.formatCurrency(cicloAtual.stakeInicial)}</div>
                        </div>
                        <div class="ciclos-stat-card highlight-card">
                            <div class="ciclos-stat-label">Próxima Stake (Juros Compostos)</div>
                            <div class="ciclos-stat-value">${this.formatCurrency(proximaStake)}</div>
                        </div>
                        <div class="ciclos-stat-card highlight-card">
                            <div class="ciclos-stat-label">Objetivo por Entrada (5%)</div>
                            <div class="ciclos-stat-value profit">${this.formatCurrency(objetivoEntrada)}</div>
                        </div>
                        <div class="ciclos-stat-card">
                            <div class="ciclos-stat-label">Lucro Objetivo do Ciclo</div>
                            <div class="ciclos-stat-value">${this.formatCurrency(lucroObjetivo)}</div>
                        </div>
                    </div>
                    
                    <div class="ciclos-stats-row" style="margin-top: 15px;">
                        <div class="ciclos-stat-card">
                            <div class="ciclos-stat-label">Lucro Acumulado no Ciclo</div>
                            <div class="ciclos-stat-value ${state.saldoCiclo >= 0 ? 'profit' : 'loss'}">${this.formatCurrency(state.saldoCiclo)}</div>
                        </div>
                        <div class="ciclos-stat-card">
                            <div class="ciclos-stat-label">Lucro Total Geral</div>
                            <div class="ciclos-stat-value ${state.lucroTotalGeral >= 0 ? 'profit' : 'loss'}">${this.formatCurrency(state.lucroTotalGeral)}</div>
                        </div>
                        <div class="ciclos-stat-card" style="flex: 2;">
                            <div class="ciclos-stat-label">Faltam para Objetivo do Ciclo</div>
                            <div class="ciclos-stat-value" style="color: var(--text-secondary);">${this.formatCurrency(Math.max(lucroObjetivo - state.saldoCiclo, 0))}</div>
                        </div>
                    </div>
                    
                    <div class="ciclos-progress-section">
                        <div class="ciclos-progress-header">
                            <span>Progresso do Ciclo ${state.cicloAtual + 1}</span>
                            <span>${this.formatCurrency(state.saldoCiclo)} / ${this.formatCurrency(lucroObjetivo)}</span>
                        </div>
                        <div class="ciclos-progress-bar">
                            <div class="ciclos-progress-fill" style="width: ${progresso}%"></div>
                        </div>
                    </div>
                    
                    <div class="ciclos-actions-section">
                        <h3><i class='bx bx-plus-circle'></i> Adicionar Entrada ao Ciclo</h3>
                        
                        <div class="ciclos-add-entry-form">
                            <div class="form-group">
                                <label>Selecionar entrada do histórico</label>
                                <select id="ciclos-entry-select" class="filter-control">
                                    <option value="">Selecione uma entrada...</option>
                                    ${entradasDisponiveis.map(t => `
                                        <option value="${t.id}">
                                            ${t.dateStr} - ${t.game} - ${t.method} - ${this.formatCurrency(t.netProfit)}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Stake Utilizado (R$)</label>
                                <input type="number" id="ciclos-stake-input" class="filter-control" value="${proximaStake}" step="1">
                            </div>
                            <div class="form-group">
                                <label>Lucro/Prejuízo da Entrada (R$)</label>
                                <input type="number" id="ciclos-profit-input" class="filter-control" placeholder="0.00" step="0.01">
                            </div>
                            <button id="ciclos-add-entry-btn" class="btn-primary">
                                <i class='bx bx-plus'></i> Registrar Entrada
                            </button>
                        </div>
                        
                        <p style="margin-top: 10px; color: var(--text-secondary); font-size: 13px;">
                            <i class='bx bx-info-circle'></i> Objetivo por jogo: ${this.formatCurrency(stake5Porcento)} (5% do stake)
                        </p>
                    </div>
                    
                    ${state.entradasCiclo.length > 0 ? `
                    <div class="ciclos-current-entries">
                        <h3><i class='bx bx-list-ul'></i> Entradas do Ciclo Atual</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Jogo</th>
                                    <th>Mercado</th>
                                    <th>Stake</th>
                                    <th>Lucro/Prejuízo</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${state.entradasCiclo.map(e => `
                                    <tr>
                                        <td>${e.dateStr}</td>
                                        <td>${e.game}</td>
                                        <td>${e.method}</td>
                                        <td>${this.formatCurrency(e.stake)}</td>
                                        <td>
                                            <span class="badge ${e.profit >= 0 ? 'green' : 'red'}">
                                                ${this.formatCurrency(e.profit)}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="btn-icon remove-ciclo-entry" data-id="${e.id}" style="color: var(--danger-color);">
                                                <i class='bx bx-trash'></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : ''}
                </div>
            `;
        } else if (activeTab === 'historico') {
            const ciclosOrdenados = [...state.historicoCiclos].reverse();
            
            if (ciclosOrdenados.length === 0) {
                tabContent = `
                    <div class="empty-state" style="padding: 60px 20px;">
                        <i class='bx bx-history'></i>
                        <h3>Nenhum ciclo concluído ainda</h3>
                        <p>Os ciclos concluídos aparecerão aqui.</p>
                    </div>
                `;
            } else {
                tabContent = `
                    <div class="ciclos-history-list">
                        ${ciclosOrdenados.map((ciclo, idx) => `
                            <div class="ciclos-history-card">
                                <div class="ciclos-history-header">
                                    <h3>Ciclo ${ciclo.numero}</h3>
                                    <span class="badge ${ciclo.lucro >= 0 ? 'green' : 'red'}">
                                        ${this.formatCurrency(ciclo.lucro)}
                                    </span>
                                </div>
                                <div class="ciclos-history-stats">
                                    <div><strong>Stake Inicial:</strong> ${this.formatCurrency(ciclo.stakeInicial)}</div>
                                    <div><strong>Objetivo:</strong> ${this.formatCurrency(ciclo.objetivo)}</div>
                                    <div><strong>Entradas:</strong> ${ciclo.entradas.length}</div>
                                    <div><strong>Data Início:</strong> ${ciclo.dataInicio}</div>
                                    <div><strong>Data Fim:</strong> ${ciclo.dataFim || '-'}</div>
                                </div>
                                <details>
                                    <summary style="cursor: pointer; color: var(--primary-color);">Ver entradas (${ciclo.entradas.length})</summary>
                                    <table style="margin-top: 10px;">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Jogo</th>
                                                <th>Stake</th>
                                                <th>Lucro</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${ciclo.entradas.map(e => `
                                                <tr>
                                                    <td>${e.dateStr}</td>
                                                    <td>${e.game}</td>
                                                    <td>${this.formatCurrency(e.stake)}</td>
                                                    <td><span class="badge ${e.profit >= 0 ? 'green' : 'red'}">${this.formatCurrency(e.profit)}</span></td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </details>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } else if (activeTab === 'config') {
            tabContent = `
                <div class="ciclos-config-section">
                    <div class="form-group" style="max-width: 300px; margin-bottom: 20px;">
                        <label>Banca Inicial (R$)</label>
                        <input type="number" id="ciclos-banca-inicial" class="filter-control" value="${state.bancaInicial}" step="1">
                    </div>
                    
                    <h3>Configuração dos Ciclos</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Ciclo</th>
                                <th>Stake Inicial (R$)</th>
                                <th>Objetivo (R$)</th>
                                <th>Fator Redução (%)</th>
                                <th>Stop Lucro (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${config.map((c, idx) => `
                                <tr>
                                    <td><strong>Ciclo ${idx + 1}</strong></td>
                                    <td><input type="number" class="filter-control config-stake" data-idx="${idx}" value="${c.stakeInicial}" step="1"></td>
                                    <td><input type="number" class="filter-control config-objetivo" data-idx="${idx}" value="${c.objetivo}" step="1"></td>
                                    <td><input type="number" class="filter-control config-fator" data-idx="${idx}" value="${c.fatorReducao}" step="0.1" min="0" max="100"></td>
                                    <td><input type="number" class="filter-control config-stop" data-idx="${idx}" value="${c.stopLucro}" step="1" min="1" max="100"></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <button id="ciclos-save-config" class="btn-primary" style="margin-top: 20px;">
                        <i class='bx bx-save'></i> Salvar Configuração
                    </button>
                    
                    <div style="margin-top: 30px; padding: 20px; background: rgba(67, 24, 255, 0.05); border-radius: 12px;">
                        <h4><i class='bx bx-reset'></i> Resetar Ciclos</h4>
                        <p style="color: var(--text-secondary); margin-bottom: 15px;">Cuidado: Isso irá apagar todo o progresso dos ciclos e histórico.</p>
                        <button id="ciclos-reset-btn" class="btn-danger">
                            <i class='bx bx-trash'></i> Resetar Tudo
                        </button>
                    </div>
                </div>
            `;
        }
        
        this.appContainer.innerHTML = `
            <div class="ciclos-container">
                <div class="ciclos-tabs">
                    ${tabs.map(tab => `
                        <button class="ciclos-tab ${activeTab === tab ? 'active' : ''}" data-tab="${tab}">
                            ${tab === 'painel' ? '📊 Painel' : tab === 'historico' ? '📜 Histórico' : '⚙️ Configuração'}
                        </button>
                    `).join('')}
                </div>
                ${tabContent}
            </div>
        `;
        
        document.querySelectorAll('.ciclos-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.ciclosActiveTab = e.target.getAttribute('data-tab');
                this.renderCiclos();
            });
        });
        
        if (activeTab === 'painel') {
            document.getElementById('ciclos-add-entry-btn').addEventListener('click', async () => {
                const entrySelect = document.getElementById('ciclos-entry-select');
                const stakeInput = document.getElementById('ciclos-stake-input');
                const profitInput = document.getElementById('ciclos-profit-input');
                
                const selectedId = entrySelect.value;
                const stake = parseFloat(stakeInput.value) || 0;
                const profit = parseFloat(profitInput.value) || 0;
                
                if (!selectedId && profit === 0) {
                    alert('Selecione uma entrada ou informe o lucro manualmente.');
                    return;
                }
                
                let entradaData = null;
                if (selectedId) {
                    entradaData = this.data.find(d => d.id === selectedId);
                }
                
                const novaEntrada = {
                    id: entradaData ? entradaData.id : 'manual_' + Date.now(),
                    dateStr: entradaData ? entradaData.dateStr : new Date().toLocaleString('pt-BR'),
                    game: entradaData ? entradaData.game : 'Entrada Manual',
                    method: entradaData ? entradaData.method : 'Manual',
                    stake: stake,
                    profit: profit,
                    netProfit: profit
                };
                
                this.ciclosState.entradasCiclo.push(novaEntrada);
                this.ciclosState.saldoCiclo += profit;
                this.ciclosState.lucroTotalGeral += profit;
                
                const cicloConfig = this.ciclosConfig[this.ciclosState.cicloAtual];
                const atingiuObjetivo = this.verificarCicloCompleto(this.ciclosState.saldoCiclo, cicloConfig.objetivo, cicloConfig.stakeInicial, cicloConfig.stopLucro);
                
                if (atingiuObjetivo) {
                    const lucroCiclo = this.ciclosState.saldoCiclo;
                    const cicloNumero = this.ciclosState.cicloAtual + 1;
                    
                    const novoCiclo = {
                        numero: cicloNumero,
                        stakeInicial: cicloConfig.stakeInicial,
                        objetivo: cicloConfig.objetivo,
                        lucro: lucroCiclo,
                        entradas: [...this.ciclosState.entradasCiclo],
                        dataInicio: this.ciclosState.entradasCiclo[0]?.dateStr || '-',
                        dataFim: new Date().toLocaleString('pt-BR')
                    };
                    
                    this.ciclosState.historicoCiclos.push(novoCiclo);
                    
                    const proximoCiclo = this.ciclosState.cicloAtual + 1;
                    
                    if (proximoCiclo < this.ciclosConfig.length) {
                        const stakeProx = this.ciclosConfig[proximoCiclo].stakeInicial;
                        const saqueMinimo = 50;
                        const novoStake = Math.max(stakeProx - saqueMinimo, 100);
                        
                        this.ciclosState.cicloAtual = proximoCiclo;
                        this.ciclosState.stakeAtual = novoStake;
                        this.ciclosState.entradasCiclo = [];
                        this.ciclosState.saldoCiclo = 0;
                        
                        alert(`🎉 Ciclo ${cicloNumero} completado!\n\nLucro: ${this.formatCurrency(lucroCiclo)}\nStake do próximo ciclo: ${this.formatCurrency(novoStake)}`);
                    } else {
                        alert(`🏆 PARABÉNS! Todos os ciclos completados!\n\nLucro total: ${this.formatCurrency(this.ciclosState.lucroTotalGeral)}`);
                        this.ciclosState.cicloAtual = this.ciclosConfig.length - 1;
                        this.ciclosState.stakeAtual = this.ciclosConfig[this.ciclosState.cicloAtual].stakeInicial;
                        this.ciclosState.entradasCiclo = [];
                    }
                }
                
                await this.saveData();
                this.renderCiclos();
            });
            
            document.querySelectorAll('.remove-ciclo-entry').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const entrada = this.ciclosState.entradasCiclo.find(en => en.id === id);
                    if (entrada) {
                        this.ciclosState.saldoCiclo -= entrada.profit;
                        this.ciclosState.lucroTotalGeral -= entrada.profit;
                        this.ciclosState.entradasCiclo = this.ciclosState.entradasCiclo.filter(en => en.id !== id);
                        await this.saveData();
                        this.renderCiclos();
                    }
                });
            });
            
            if (entradasDisponiveis.length > 0) {
                document.getElementById('ciclos-entry-select').addEventListener('change', (e) => {
                    const selectedId = e.target.value;
                    if (selectedId) {
                        const entrada = this.data.find(d => d.id === selectedId);
                        if (entrada) {
                            document.getElementById('ciclos-profit-input').value = entrada.netProfit;
                        }
                    }
                });
            }
        }
        
        if (activeTab === 'config') {
            document.getElementById('ciclos-save-config').addEventListener('click', async () => {
                const bancaInicial = parseFloat(document.getElementById('ciclos-banca-inicial').value) || 500;
                this.ciclosState.bancaInicial = bancaInicial;
                
                const stakes = document.querySelectorAll('.config-stake');
                const objetivos = document.querySelectorAll('.config-objetivo');
                const fatores = document.querySelectorAll('.config-fator');
                const stops = document.querySelectorAll('.config-stop');
                
                stakes.forEach((el, idx) => {
                    this.ciclosConfig[idx].stakeInicial = parseFloat(el.value) || 500;
                });
                objetivos.forEach((el, idx) => {
                    this.ciclosConfig[idx].objetivo = parseFloat(el.value) || 1000;
                });
                fatores.forEach((el, idx) => {
                    this.ciclosConfig[idx].fatorReducao = parseFloat(el.value) || 0;
                });
                stops.forEach((el, idx) => {
                    this.ciclosConfig[idx].stopLucro = parseFloat(el.value) || 100;
                });
                
                await this.saveData();
                alert('Configuração salva com sucesso!');
            });
            
            document.getElementById('ciclos-reset-btn').addEventListener('click', async () => {
                if (confirm('Tem certeza que deseja resetar todos os ciclos? Esta ação não pode ser desfeita.')) {
                    this.ciclosState = {
                        cicloAtual: 0,
                        stakeAtual: this.ciclosConfig[0].stakeInicial,
                        saldoCiclo: 0,
                        entradasCiclo: [],
                        lucroTotalGeral: 0,
                        bancaInicial: this.ciclosState.bancaInicial,
                        historicoCiclos: []
                    };
                    await this.saveData();
                    this.renderCiclos();
                }
            });
        }
    },

    renderConfiguracoes() {
        this.appContainer.innerHTML = `
            <div class="config-container">
                <div class="config-card animate-up">
                    <div class="config-header">
                        <i class='bx bx-data'></i>
                        <h3>Banco de Dados e Backup</h3>
                    </div>
                    <p>Gerencie seus dados. Recomendamos fazer um backup regularmente para evitar perda de informações em caso de problemas no navegador.</p>
                    
                    <div class="config-actions">
                        <button id="btn-export-backup" class="btn-primary" style="background-color: #6c5ce7; box-shadow: 0 10px 20px -10px #6c5ce7;">
                            <i class='bx bx-download'></i> Exportar Backup Completo
                        </button>
                        <button id="btn-diagnose-data" class="btn-primary" style="background-color: #0984e3; box-shadow: 0 10px 20px -10px #0984e3;">
                            <i class='bx bx-search-alt'></i> Diagnosticar Dados
                        </button>
                        
                        <div class="upload-btn-wrapper">
                            <button class="btn-primary" style="background-color: #00b894; box-shadow: 0 10px 20px -10px #00b894;">
                                <i class='bx bx-cloud-upload'></i> Restaurar Backup (.json)
                            </button>
                            <input type="file" id="backupFileInput" accept=".json" />
                        </div>
                    </div>
                </div>

                <div class="config-card animate-up" style="animation-delay: 0.1s;">
                    <div class="config-header">
                        <i class='bx bx-info-circle'></i>
                        <h3>Estatísticas de Armazenamento</h3>
                    </div>
                    <div class="system-info">
                        <div class="info-item">
                            <span>Total de Entradas</span>
                            <strong>${this.data.length}</strong>
                        </div>
                        <div class="info-item">
                            <span>Escudos de Times</span>
                            <strong>${Object.keys(this.escudosTimes).length}</strong>
                        </div>
                        <div class="info-item">
                            <span>Escudos de Ligas</span>
                            <strong>${Object.keys(this.escudosLigas).length}</strong>
                        </div>
                        <div class="info-item">
                            <span>Dicionário de Times</span>
                            <strong>${Object.keys(this.dicionarioTimes).length}</strong>
                        </div>
                    </div>
                </div>

                <div class="config-card danger animate-up" style="animation-delay: 0.2s;">
                    <div class="config-header">
                        <i class='bx bx-trash-alt'></i>
                        <h3>Zona de Perigo</h3>
                    </div>
                    <p>Ações permanentes que não podem ser desfeitas sem um backup prévio. Use com cautela.</p>
                    
                    <div class="config-actions">
                        <button id="btn-clear-history-config" class="btn-danger">
                            <i class='bx bx-eraser'></i> Limpar Histórico de Entradas
                        </button>
                        <button id="btn-factory-reset" class="btn-danger" style="background: #ff7675; box-shadow: 0 10px 20px -10px #ff7675;">
                            <i class='bx bx-refresh'></i> Reset de Fábrica (Limpar Tudo)
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind events for this view
        document.getElementById('btn-export-backup').addEventListener('click', () => this.exportBackup());
        document.getElementById('btn-diagnose-data').addEventListener('click', () => this.diagnoseDataStorage());
        document.getElementById('backupFileInput').addEventListener('change', (e) => this.handleBackupRestore(e));
        
        document.getElementById('btn-clear-history-config').addEventListener('click', async () => {
            if (confirm('Deseja realmente limpar todo o histórico de entradas? Métodos e escudos não serão apagados.')) {
                this.data = [];
                await this.saveData();
                alert('Histórico apagado com sucesso!');
                this.renderConfiguracoes();
            }
        });

        document.getElementById('btn-factory-reset').addEventListener('click', async () => {
            if (confirm('ATENÇÃO: Isso apagará ABSOLUTAMENTE TUDO (Entradas, Métodos, Escudos, Logos, Configurações). Esta ação é irreversível. Tem certeza?')) {
                await DB.clear();
                alert('Sistema resetado com sucesso.');
                window.location.reload();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
