
const AnalisePro = {
    games: [],
    currentPlanningDate: '',
    calendarSource: '',
    calendarSourceMeta: null,
    activeCalendarLeagueId: 'all',
    calendarShowAllCompetitions: false,
    calendarStatusFilter: localStorage.getItem('pro_calendar_status_filter') || 'all',
    calendarLayoutMode: localStorage.getItem('pro_calendar_layout_mode') || 'cards',
    theoBorgesMatchesCache: {},
    theoBorgesDetailsCache: {},
    theoInfoActiveTab: 'resumo',
    theoInfoCurrentData: null,
    theoInfoPendingGame: null,
    calendarTournamentLogoCache: null,
    calendarLoadToken: 0,
    theoBorgesDefaultSourceUrl: 'https://clube.theoborges.com/matches?dia=hoje&t=3cb1d16fe7',
    calendarCacheVersion: '2026-06-25-calendar-radar-restore-v1',
    calendarCompetitionsStorageKey: 'pro_calendar_sofascore_competitions_v1',
    calendarGamesCacheStorageKey: 'pro_calendar_sofascore_games_cache_v1',
    
    async init() {
        if (!this.currentPlanningDate) this.currentPlanningDate = this.getTodayKey();
        console.log("Calendario inicializado");
    },

    getBrazilDateParts(date = new Date()) {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(date);
        return Object.fromEntries(parts.map(part => [part.type, part.value]));
    },

    getTodayKey() {
        const parts = this.getBrazilDateParts();
        return `${parts.year}-${parts.month}-${parts.day}`;
    },

    getBrazilDateKey(timestamp) {
        const date = new Date(Number(timestamp) * 1000);
        if (!Number.isFinite(date.getTime())) return '';
        const parts = this.getBrazilDateParts(date);
        return `${parts.year}-${parts.month}-${parts.day}`;
    },

    async fetchSuper(url) {
        const cleanUrl = url.split('?')[0]; 
        const domains = ['api.sofascore.com', 'api.sofascore.app'];
        
        // EstratÃ©gia 1: Direto (Alternando domÃ­nios)
        for (const domain of domains) {
            try {
                const targetUrl = cleanUrl.replace('api.sofascore.com', domain).replace('api.sofascore.app', domain);
                const resp = await fetch(targetUrl);
                if (resp.status === 404) return null;
                if (resp.ok) return await resp.json();
            } catch (e) { }
        }

        // EstratÃ©gia 2: Proxy AllOrigins
        try {
            const proxy1 = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
            const resp = await fetch(proxy1);
            if (resp.ok) return await resp.json();
        } catch (e) { }

        // EstratÃ©gia 3: Proxy CodeTabs
        try {
            const proxy2 = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`;
            const resp = await fetch(proxy2);
            if (resp.ok) return await resp.json();
        } catch (e) { }

        return null;
    },

    async fetchUpcomingGames() {
        try {
            const today = this.getTodayKey();
            const url = `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${today}`;
            const data = await this.fetchSuper(url);
            return data?.events || [];
        } catch (error) {
            console.error("Erro ao buscar calendário:", error);
            return [];
        }
    },

    async render() {
        const today = this.getTodayKey();
        this.ensureCalendarCacheVersion();
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="analise-pro-container">
                <div class="pro-header-card calendar-header-card">
                    <div class="pro-header-info">
                        <h2><i class='bx bx-calendar-event'></i> Calendario de Jogos</h2>
                        <p id="calendar-source-status" class="calendar-source-status" data-status="loading">Preparando calendario...</p>
                    </div>
                    <div class="pro-header-actions calendar-header-actions">
                        <div class="calendar-search-wrapper">
                            <i class='bx bx-search'></i>
                            <input type="text" id="calendar-search" placeholder="Buscar time ou campeonato..." class="filter-control" oninput="AnalisePro.filterGames()">
                        </div>
                        <input type="date" id="calendar-date-filter" class="filter-control" value="${today}" onchange="AnalisePro.refreshGames()">
                    </div>
                </div>

                <div id="pro-loading" class="empty-state" style="display: none;">
                    <i class='bx bx-loader-alt bx-spin'></i>
                    <h3>Sincronizando dados...</h3>
                </div>

                <div id="calendar-league-filters" class="calendar-league-filters"></div>
                <div id="calendar-view-controls" class="calendar-view-controls"></div>
                <div id="pro-calendar-list" class="pro-calendar-list"></div>
            </div>
        `;

        this.refreshGames();
    },

    async refreshGames(force = false) {
        const dateInput = document.getElementById('calendar-date-filter');
        const selectedDate = dateInput ? dateInput.value : this.getTodayKey();
        const listContainer = document.getElementById('pro-calendar-list');
        const filtersContainer = document.getElementById('calendar-league-filters');
        const loader = document.getElementById('pro-loading');
        
        if (!localStorage.getItem('pro_fav_leagues')) localStorage.setItem('pro_fav_leagues', JSON.stringify([]));

        if (!force && this.gamesCacheDate === selectedDate && this.gamesCacheAt && Date.now() - this.gamesCacheAt < 2 * 60 * 1000) {
            this.renderList(this.games);
            return;
        }
        
        this.activeCalendarLeagueId = 'all';
        if (filtersContainer) {
            filtersContainer.innerHTML = '';
            filtersContainer.style.display = 'none';
        }
        listContainer.innerHTML = '';
        loader.style.display = 'flex';

        const loadToken = ++this.calendarLoadToken;
        const persistentCache = !force ? this.getCachedCalendarGames(selectedDate) : null;

        if (persistentCache?.games?.length) {
            this.games = persistentCache.games;
            this.gamesCacheDate = selectedDate;
            this.gamesCacheAt = Number(persistentCache.savedAt) || Date.now();
            this.calendarSource = persistentCache.source || 'Sofascore (cache)';
            this.calendarSourceMeta = {
                ...(persistentCache.sourceMeta || {}),
                status: 'cache',
                refreshing: true,
                savedAt: persistentCache.savedAt,
                stale: persistentCache.stale
            };
            this.renderList(this.games);
            loader.style.display = 'none';
        }

        try {
            if (force) this.teamLogoMisses = {};
            const gamesInMemory = this.gamesCacheDate === selectedDate ? this.games : [];
            const fetchedGames = await this.fetchCalendarGamesByDate(selectedDate, force);
            if (loadToken !== this.calendarLoadToken || App.currentView !== 'calendario') return;

            // Salva cache por data para o Planejamento DiÃ¡rio
            let cacheHistory = JSON.parse(localStorage.getItem('pro_games_cache_history')) || {};
            const cachedGames = Array.isArray(cacheHistory[selectedDate]) ? cacheHistory[selectedDate] : [];
            let networkGames = fetchedGames.length ? fetchedGames : (persistentCache?.games || []);
            if (persistentCache?.games?.length && this.calendarSource === 'Radar Futebol') {
                const cachedSofascoreGames = persistentCache.games.filter(game => game?.source === 'sofascore');
                if (cachedSofascoreGames.length) {
                    networkGames = this.enrichSofascoreGamesWithRadar(cachedSofascoreGames, fetchedGames);
                    this.calendarSource = 'Sofascore (cache) + Radar Futebol';
                    this.calendarSourceMeta = {
                        ...(this.calendarSourceMeta || {}),
                        status: 'fallback-cache',
                        source: this.calendarSource,
                        count: networkGames.length,
                        savedAt: persistentCache.savedAt
                    };
                }
            }
            const mergedGames = this.mergeRadarDailyGames(networkGames, [...cachedGames, ...gamesInMemory]);
            this.games = mergedGames;
            if (this.calendarSourceMeta) this.calendarSourceMeta.refreshing = false;
            this.renderList(this.games);
            this.gamesCacheDate = selectedDate;
            this.gamesCacheAt = Date.now();
            this.setCachedCalendarGames(selectedDate, this.games, {
                source: this.calendarSource,
                sourceMeta: this.calendarSourceMeta
            });
            loader.style.display = 'none';
            
            // Cleanup cacheHistory para evitar QuotaExceededError
            const dates = Object.keys(cacheHistory).sort();
            if (dates.length > 2) {
                const datesToRemove = dates.slice(0, dates.length - 2);
                datesToRemove.forEach(d => delete cacheHistory[d]);
            }
            
            cacheHistory[selectedDate] = this.games;
            try {
                localStorage.setItem('pro_games_cache_history', JSON.stringify(cacheHistory));
            } catch (e) {
                console.warn("Limpeza forçada do cacheHistory devido à quota");
                cacheHistory = {};
                cacheHistory[selectedDate] = this.games;
                localStorage.setItem('pro_games_cache_history', JSON.stringify(cacheHistory));
            }

            this.enrichCalendarAfterInitialRender(selectedDate, loadToken, cacheHistory);

        } catch (err) {
            console.error("Erro no Calendário:", err);
            listContainer.innerHTML = `<div class="empty-state"><p>Erro ao conectar com o servidor.</p></div>`;
        } finally {
            if (loadToken === this.calendarLoadToken) loader.style.display = 'none';
        }
    },

    async enrichCalendarAfterInitialRender(selectedDate, loadToken, cacheHistory = null) {
        try {
            let baseGames = this.games;
            if (this.calendarSource === 'Sofascore') {
                const radarGames = await this.withTimeout(this.fetchRadarFutebolGamesByDate(selectedDate, false), 5000, []);
                if (Array.isArray(radarGames) && radarGames.length) {
                    baseGames = this.enrichSofascoreGamesWithRadar(baseGames, radarGames);
                    this.calendarSource = 'Sofascore + Radar Futebol';
                    this.calendarSourceMeta = {
                        ...(this.calendarSourceMeta || {}),
                        source: this.calendarSource,
                        count: baseGames.length
                    };
                }
            }

            const gamesWithLogos = await this.enrichCalendarTournamentLogos(baseGames);
            if (loadToken !== this.calendarLoadToken || App.currentView !== 'calendario') return;

            this.games = gamesWithLogos;
            this.renderList(this.games);
            this.setCachedCalendarGames(selectedDate, this.games, {
                source: this.calendarSource,
                sourceMeta: this.calendarSourceMeta
            });

            const history = cacheHistory || JSON.parse(localStorage.getItem('pro_games_cache_history')) || {};
            history[selectedDate] = this.games;
            try {
                localStorage.setItem('pro_games_cache_history', JSON.stringify(history));
            } catch (_) {}
        } catch (error) {
            console.warn('Nao foi possivel enriquecer calendario em segundo plano:', error);
        }
    },

    mergeRadarDailyGames(currentGames, previousGames) {
        const merged = new Map();
        const now = Math.floor(Date.now() / 1000);

        (currentGames || []).forEach(game => {
            if (game?.id !== undefined && game?.id !== null) {
                merged.set(String(game.id), game);
            }
        });

        (previousGames || []).forEach(game => {
            if (!game || game.id === undefined || game.id === null) return;
            if (game.source !== 'radarfutebol' && !game.radarFutebolUrl) return;

            const key = String(game.id);
            if (merged.has(key)) return;

            const wasLive = game.status?.type === 'inprogress';
            const expectedToBeFinished = Number(game.startTimestamp) > 0 &&
                now >= Number(game.startTimestamp) + (2 * 60 * 60);
            const preserved = {
                ...game,
                source: 'radarfutebol',
                sourceLabel: 'Radar Futebol',
                archivedFromRadar: true
            };

            if (wasLive || expectedToBeFinished) {
                preserved.status = {
                    ...(game.status || {}),
                    type: 'finished',
                    description: 'Finalizado'
                };
            }

            merged.set(key, preserved);
        });

        return Array.from(merged.values())
            .sort((a, b) => Number(a.startTimestamp || 0) - Number(b.startTimestamp || 0));
    },

    scheduleWRadarPrefetch() {
        if (this.wradarCache || this.wradarFetchPromise || this.wradarPrefetchTimer) return;
        this.wradarPrefetchTimer = setTimeout(() => {
            this.wradarPrefetchTimer = null;
            this.fetchWRadarEvents().catch(() => {});
        }, 1500);
    },

    filterGames() {
        const query = document.getElementById('calendar-search').value.toLowerCase();
        if (!query) {
            this.renderList(this.games);
            return;
        }

        const filtered = this.games.filter(g => {
            const tourName = `${g.tournament.category.name} ${g.tournament.name}`.toLowerCase();
            const homeName = g.homeTeam.name.toLowerCase();
            const awayName = g.awayTeam.name.toLowerCase();
            return tourName.includes(query) || homeName.includes(query) || awayName.includes(query);
        });

        this.renderList(filtered);
    },

    getCalendarLeagueId(game) {
        return String(game?.tournament?.id || game?.tournament?.name || 'sem-liga');
    },

    getCalendarLeagueName(game) {
        const category = this.localizeRegionName(
            game?.tournament?.category?.countryCode,
            game?.tournament?.category?.name || ''
        );
        const name = game?.tournament?.name || 'Competição';
        return category ? `${category}: ${name}` : name;
    },

    localizeRegionName(countryCode, fallback = '') {
        const code = String(countryCode || '').trim().toUpperCase();
        if (code && typeof Intl?.DisplayNames === 'function') {
            try {
                return new Intl.DisplayNames(['pt-BR'], { type: 'region' }).of(code) || fallback;
            } catch (_) {}
        }
        return fallback;
    },

    localizeSofascoreTeam(team = {}) {
        if (!team?.national || !team?.countryCode) return team;
        const originalName = String(team.name || '').trim();
        const suffixMatch = originalName.match(/\b(U-?\d{2,3}|Women|W|Olympic)\b.*$/i);
        const suffix = suffixMatch
            ? suffixMatch[0].replace(/^Women\b/i, 'Feminino').replace(/^Olympic\b/i, 'Olímpico')
            : '';
        const localizedCountry = this.localizeRegionName(team.countryCode, originalName);
        return {
            ...team,
            name: `${localizedCountry}${suffix ? ` ${suffix}` : ''}`.trim()
        };
    },

    getCalendarLeaguePriority(game) {
        const priority = Number(game?.tournament?.priority) || 0;
        const popularity = Number(game?.tournament?.userCount) || 0;
        return (priority * 1000000000) + popularity;
    },

    sortCalendarLeagues(leagues, favorites = []) {
        return [...leagues].sort((a, b) => {
            const aFav = favorites.some(item => String(item) === String(a.id));
            const bFav = favorites.some(item => String(item) === String(b.id));
            if (aFav !== bFav) return aFav ? -1 : 1;
            if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
            if (Boolean(a.hasLive) !== Boolean(b.hasLive)) return a.hasLive ? -1 : 1;
            return (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name, 'pt-BR');
        });
    },

    toggleCalendarCompetitionVisibility() {
        this.calendarShowAllCompetitions = !this.calendarShowAllCompetitions;
        this.renderList(this.games);
    },

    getCalendarTournamentLogoCache() {
        if (this.calendarTournamentLogoCache) return this.calendarTournamentLogoCache;
        try {
            this.calendarTournamentLogoCache = JSON.parse(localStorage.getItem('pro_calendar_tournament_logos_v1')) || {};
        } catch (_) {
            this.calendarTournamentLogoCache = {};
        }
        return this.calendarTournamentLogoCache;
    },

    saveCalendarTournamentLogoCache() {
        try {
            localStorage.setItem('pro_calendar_tournament_logos_v1', JSON.stringify(this.getCalendarTournamentLogoCache()));
        } catch (error) {
            console.warn('Nao foi possivel salvar cache de logos das competicoes:', error);
        }
    },

    getCalendarTournamentLogoKey(game) {
        const category = this.normalizeMatchText(game?.tournament?.category?.name || '');
        const name = this.normalizeMatchText(game?.tournament?.name || '');
        return `${category}|${name}`;
    },

    getCalendarTournamentSearchName(game) {
        const name = String(game?.tournament?.name || '').trim();
        if (!name) return '';
        return name
            .replace(/\bGroup\s+[A-Z0-9]+\b/gi, '')
            .replace(/\bGrupo\s+[A-Z0-9]+\b/gi, '')
            .replace(/[,;-]\s*$/g, '')
            .trim();
    },

    getDefaultCalendarCompetitions() {
        return [
            { id: 16, name: 'FIFA World Cup', enabled: true },
            { id: 325, name: 'Brasileirao Betano', enabled: false },
            { id: 390, name: 'Brasileiro Serie B', enabled: false },
            { id: 384, name: 'Copa Libertadores', enabled: false },
            { id: 480, name: 'Copa Sudamericana', enabled: false },
            { id: 17, name: 'Premier League', enabled: false },
            { id: 8, name: 'LaLiga', enabled: false },
            { id: 23, name: 'Serie A', enabled: false },
            { id: 35, name: 'Bundesliga', enabled: false },
            { id: 34, name: 'Ligue 1', enabled: false },
            { id: 37, name: 'Eredivisie', enabled: false },
            { id: 238, name: 'Liga Portugal Betclic', enabled: false },
            { id: 52, name: 'Super Lig', enabled: false },
            { id: 955, name: 'Saudi Pro League', enabled: false }
        ];
    },

    getCalendarCompetitions() {
        let saved = [];
        try {
            saved = JSON.parse(localStorage.getItem(this.calendarCompetitionsStorageKey)) || [];
        } catch (_) {
            saved = [];
        }

        const byKey = new Map();
        this.getDefaultCalendarCompetitions().forEach(item => {
            byKey.set(String(item.id || item.name).toLowerCase(), { ...item });
        });

        saved.forEach(item => {
            const id = Number(item?.id || item?.uniqueTournamentId || 0) || null;
            const name = String(item?.name || item?.query || '').trim();
            if (!id && !name) return;
            const key = String(id || name).toLowerCase();
            byKey.set(key, {
                id,
                name: name || `Competição ${id}`,
                enabled: item.enabled !== false
            });
        });

        return Array.from(byKey.values());
    },

    saveCalendarCompetitions(competitions) {
        const clean = (competitions || [])
            .map(item => ({
                id: Number(item?.id || 0) || null,
                name: String(item?.name || '').trim(),
                enabled: item?.enabled !== false
            }))
            .filter(item => item.id || item.name);
        localStorage.setItem(this.calendarCompetitionsStorageKey, JSON.stringify(clean));
        this.clearCalendarGamesCache();
    },

    getEnabledCalendarCompetitions() {
        const enabled = this.getCalendarCompetitions().filter(item => item.enabled !== false);
        return enabled.length ? enabled : [{ id: 16, name: 'FIFA World Cup', enabled: true }];
    },

    getCalendarCompetitionsSignature() {
        return this.getEnabledCalendarCompetitions()
            .map(item => String(item.id || item.name).toLowerCase())
            .sort()
            .join('|');
    },

    readCalendarGamesCache() {
        try {
            return JSON.parse(localStorage.getItem(this.calendarGamesCacheStorageKey)) || {};
        } catch (_) {
            return {};
        }
    },

    writeCalendarGamesCache(cache) {
        try {
            localStorage.setItem(this.calendarGamesCacheStorageKey, JSON.stringify(cache));
        } catch (error) {
            const keys = Object.keys(cache || {}).sort((a, b) => (cache[b]?.savedAt || 0) - (cache[a]?.savedAt || 0));
            const trimmed = {};
            keys.slice(0, 8).forEach(key => { trimmed[key] = cache[key]; });
            try {
                localStorage.setItem(this.calendarGamesCacheStorageKey, JSON.stringify(trimmed));
            } catch (_) {}
        }
    },

    getCalendarGamesCacheKey(dateKey) {
        return `${dateKey}::${this.getCalendarCompetitionsSignature()}`;
    },

    getCachedCalendarGames(dateKey) {
        const cache = this.readCalendarGamesCache();
        const item = cache[this.getCalendarGamesCacheKey(dateKey)];
        if (!item || !Array.isArray(item.games)) return null;

        const age = Date.now() - Number(item.savedAt || 0);
        const isToday = dateKey === this.getTodayKey();
        const freshMs = isToday ? 5 * 60 * 1000 : 12 * 60 * 60 * 1000;
        const maxMs = isToday ? 60 * 60 * 1000 : 3 * 24 * 60 * 60 * 1000;
        if (age > maxMs) return null;
        return {
            games: item.games,
            stale: age > freshMs,
            savedAt: item.savedAt,
            source: item.source || '',
            sourceMeta: item.sourceMeta || null
        };
    },

    setCachedCalendarGames(dateKey, games, metadata = {}) {
        if (!dateKey || !Array.isArray(games)) return;
        const cache = this.readCalendarGamesCache();
        cache[this.getCalendarGamesCacheKey(dateKey)] = {
            savedAt: Date.now(),
            games,
            source: String(metadata.source || this.calendarSource || ''),
            sourceMeta: metadata.sourceMeta || this.calendarSourceMeta || null
        };

        const keys = Object.keys(cache).sort((a, b) => (cache[b]?.savedAt || 0) - (cache[a]?.savedAt || 0));
        keys.slice(12).forEach(key => delete cache[key]);
        this.writeCalendarGamesCache(cache);
    },

    clearCalendarGamesCache() {
        localStorage.removeItem(this.calendarGamesCacheStorageKey);
        this.gamesCacheDate = '';
        this.gamesCacheAt = 0;
    },

    getKnownCalendarTournamentQueries() {
        const seen = new Set();
        return this.getEnabledCalendarCompetitions().filter(item => {
            const key = typeof item === 'object'
                ? String(item.id || item.name || '').toLowerCase()
                : String(item || '').toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 10);
    },

    getSofascoreCalendarFallbackQueries(dateKey) {
        const base = [
            { id: 16, name: 'FIFA World Cup' }
        ];

        if (dateKey === this.getTodayKey()) return base;

        return [
            ...base,
            { id: 390, name: 'Brasileiro Serie B' },
            { id: 325, name: 'Brasileirao Betano' },
            { id: 384, name: 'Copa Libertadores' },
            { id: 480, name: 'Copa Sudamericana' }
        ];
    },

    withTimeout(promise, timeoutMs, fallbackValue = null) {
        return Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve(fallbackValue), timeoutMs))
        ]);
    },

    applyCalendarTournamentLogo(game, cachedLogo) {
        if (!game || !cachedLogo?.logoData) return game;
        game.tournament = {
            ...(game.tournament || {}),
            id: game.tournament?.id || cachedLogo.id,
            logo: cachedLogo.logoData,
            logoData: cachedLogo.logoData,
            uniqueTournament: {
                ...(game.tournament?.uniqueTournament || {}),
                id: cachedLogo.id,
                name: cachedLogo.name || game.tournament?.uniqueTournament?.name || game.tournament?.name || ''
            }
        };
        return game;
    },

    async enrichCalendarTournamentLogos(games) {
        if (!Array.isArray(games) || !games.length) return games || [];

        const cache = this.getCalendarTournamentLogoCache();
        const missing = new Map();

        for (const game of games) {
            const key = this.getCalendarTournamentLogoKey(game);
            if (cache[key]?.logoData) {
                this.applyCalendarTournamentLogo(game, cache[key]);
                continue;
            }

            const existingLogo = this.resolveTournamentLogo(game?.tournament || {});
            if (String(existingLogo || '').startsWith('data:')) continue;

            const query = this.getCalendarTournamentSearchName(game);
            if (query) missing.set(key, query);
        }

        if (!missing.size || !window.traderSofascoreData?.tournamentLogo) return games;

        try {
            const response = await window.traderSofascoreData.tournamentLogo({
                queries: [...new Set(missing.values())]
            });
            const results = response?.results || {};

            for (const [key, query] of missing.entries()) {
                const item = results[query];
                const tournament = item?.tournament || {};
                if (!item?.ok || !tournament.logoData) continue;

                cache[key] = {
                    id: tournament.id,
                    name: tournament.name || query,
                    category: tournament.category || '',
                    logoData: tournament.logoData
                };
            }
            this.saveCalendarTournamentLogoCache();

            for (const game of games) {
                const key = this.getCalendarTournamentLogoKey(game);
                if (cache[key]?.logoData) this.applyCalendarTournamentLogo(game, cache[key]);
            }
        } catch (error) {
            console.warn('Nao foi possivel enriquecer logos das competicoes:', error);
        }

        return games;
    },

    normalizeSofascoreImageUrl(url) {
        const value = String(url || '');
        if (!value || value.startsWith('data:')) return value;
        return value
            .replace('https://www.sofascore.com/api/v1/team/', 'https://api.sofascore.app/api/v1/team/')
            .replace('https://www.sofascore.com/api/v1/unique-tournament/', 'https://api.sofascore.app/api/v1/unique-tournament/');
    },

    resolveTournamentLogo(tournament = {}) {
        const uniqueTournamentId = tournament?.uniqueTournament?.id || tournament?.id;
        const name = tournament?.name || '';
        const localLogo = typeof App !== 'undefined' && App.getLogoLiga ? App.getLogoLiga(name) : '';
        const directLogo = tournament?.logoData || tournament?.logo || tournament?.imageUrl || tournament?.uniqueTournament?.logo || '';

        if (String(directLogo).startsWith('data:')) return directLogo;
        if (String(localLogo).startsWith('data:') || localLogo) return this.normalizeSofascoreImageUrl(localLogo);

        const logoUrl = directLogo || (uniqueTournamentId ? `https://api.sofascore.app/api/v1/unique-tournament/${uniqueTournamentId}/image` : '');
        return this.normalizeSofascoreImageUrl(logoUrl);
    },

    renderTournamentLogo(game, size = 26) {
        const tournament = game?.tournament || {};
        const name = game?.tournament?.name || '';
        const logo = this.resolveTournamentLogo(tournament);
        const dimension = Number(size) || 26;
        if (logo) {
            return `<img class="calendar-league-logo" src="${this.escapeHtml(logo)}" alt="${this.escapeHtml(name)}" style="width:${dimension}px;height:${dimension}px;" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"><span class="calendar-league-logo-fallback" style="display:none;width:${dimension}px;height:${dimension}px;">${this.escapeHtml(this.getTeamInitials(name))}</span>`;
        }
        return `<span class="calendar-league-logo-fallback" style="width:${dimension}px;height:${dimension}px;">${this.escapeHtml(this.getTeamInitials(name))}</span>`;
    },

    renderCalendarLeagueFilters(gamesList) {
        const container = document.getElementById('calendar-league-filters');
        if (!container) return;
        const favorites = JSON.parse(localStorage.getItem('pro_fav_leagues')) || [];

        const leagues = new Map();
        (this.games || []).forEach(game => {
            const id = this.getCalendarLeagueId(game);
            if (!leagues.has(id)) {
                leagues.set(id, {
                    id,
                    name: this.getCalendarLeagueName(game),
                    logoHtml: this.renderTournamentLogo(game, 22),
                    count: 0,
                    priority: this.getCalendarLeaguePriority(game),
                    hasLive: false
                });
            }
            const league = leagues.get(id);
            league.count += 1;
            league.priority = Math.max(league.priority, this.getCalendarLeaguePriority(game));
            league.hasLive = league.hasLive || this.getCalendarGameStatus(game) === 'live';
        });

        if (leagues.size <= 1) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = '';
        const activeId = this.activeCalendarLeagueId || 'all';
        const total = this.games.length;
        const filteredCount = gamesList.length;
        const sortedLeagues = this.sortCalendarLeagues(Array.from(leagues.values()), favorites);
        const primaryLimit = 12;
        const visibleLeagues = this.calendarShowAllCompetitions
            ? sortedLeagues
            : sortedLeagues.filter((league, index) =>
                index < primaryLimit ||
                favorites.some(item => String(item) === String(league.id)) ||
                String(activeId) === String(league.id)
            );
        const hiddenLeagueCount = Math.max(0, sortedLeagues.length - visibleLeagues.length);
        const chips = visibleLeagues
            .map(league => `
                <button type="button" class="calendar-league-chip ${String(activeId) === String(league.id) ? 'active' : ''} ${favorites.some(item => String(item) === String(league.id)) ? 'is-favorite' : ''}" onclick="AnalisePro.setCalendarLeagueFilter(decodeURIComponent('${this.escapeAttr(encodeURIComponent(league.id))}'))" title="${this.escapeHtml(league.name)}">
                    ${league.logoHtml}
                    <span>${this.escapeHtml(league.name)}</span>
                    <em>${league.count}</em>
                </button>
            `).join('');

        container.innerHTML = `
            <button type="button" class="calendar-league-chip calendar-league-all ${activeId === 'all' ? 'active' : ''}" onclick="AnalisePro.setCalendarLeagueFilter('all')">
                <i class='bx bx-grid-alt'></i>
                <span>Todos</span>
                <em>${total}</em>
            </button>
            ${chips}
            ${sortedLeagues.length > primaryLimit ? `
                <button type="button" class="calendar-competitions-toggle" onclick="AnalisePro.toggleCalendarCompetitionVisibility()">
                    <i class='bx ${this.calendarShowAllCompetitions ? 'bx-chevron-up' : 'bx-plus'}'></i>
                    <span>${this.calendarShowAllCompetitions ? 'Mostrar principais' : `Mostrar todas (${hiddenLeagueCount})`}</span>
                </button>
            ` : ''}
            ${activeId !== 'all' ? `<span class="calendar-league-filter-meta">${filteredCount} jogos filtrados</span>` : ''}
        `;
    },

    setCalendarLeagueFilter(id) {
        this.activeCalendarLeagueId = String(id || 'all');
        this.filterGames();
    },

    setCalendarStatusFilter(status) {
        const next = ['all', 'live', 'upcoming', 'finished'].includes(status) ? status : 'all';
        this.calendarStatusFilter = next;
        localStorage.setItem('pro_calendar_status_filter', next);
        this.filterGames();
    },

    setCalendarLayoutMode(mode) {
        const next = mode === 'list' ? 'list' : 'cards';
        this.calendarLayoutMode = next;
        localStorage.setItem('pro_calendar_layout_mode', next);
        this.filterGames();
    },

    openCalendarCompetitionsModal() {
        const existing = document.getElementById('calendar-competitions-modal');
        if (existing) existing.remove();

        const competitions = this.getCalendarCompetitions();
        const enabledCount = competitions.filter(item => item.enabled !== false).length;
        const modal = document.createElement('div');
        modal.id = 'calendar-competitions-modal';
        modal.className = 'calendar-config-modal-overlay';
        modal.innerHTML = `
            <div class="calendar-config-modal">
                <header>
                    <div>
                        <span>SOFASCORE</span>
                        <h3>Competições do calendário</h3>
                        <p>${enabledCount} competição(ões) ativas. Quanto mais competições, maior o tempo de atualização.</p>
                    </div>
                    <button type="button" onclick="AnalisePro.closeCalendarCompetitionsModal()" title="Fechar">
                        <i class='bx bx-x'></i>
                    </button>
                </header>

                <section class="calendar-config-add">
                    <input id="calendar-competition-id" type="number" min="1" placeholder="ID SofaScore">
                    <input id="calendar-competition-name" type="text" placeholder="Nome da competição">
                    <button type="button" onclick="AnalisePro.addCalendarCompetitionFromModal()">
                        <i class='bx bx-plus'></i> Adicionar
                    </button>
                </section>

                <section class="calendar-config-list">
                    ${competitions.map(item => this.renderCalendarCompetitionOption(item)).join('')}
                </section>

                <footer>
                    <button type="button" class="ghost" onclick="AnalisePro.resetCalendarCompetitions()">
                        Restaurar padrão
                    </button>
                    <button type="button" class="ghost" onclick="AnalisePro.clearCalendarGamesCache(); AnalisePro.refreshGames(true); AnalisePro.closeCalendarCompetitionsModal();">
                        Limpar cache
                    </button>
                    <button type="button" class="primary" onclick="AnalisePro.saveCalendarCompetitionsFromModal()">
                        Salvar e atualizar
                    </button>
                </footer>
            </div>
        `;
        modal.addEventListener('click', event => {
            if (event.target === modal) this.closeCalendarCompetitionsModal();
        });
        document.body.appendChild(modal);
    },

    renderCalendarCompetitionOption(item) {
        const id = Number(item?.id || 0) || '';
        const name = String(item?.name || '').trim();
        const key = this.escapeAttr(String(id || name));
        return `
            <label class="calendar-config-item" data-id="${this.escapeAttr(id)}" data-name="${this.escapeAttr(name)}">
                <input type="checkbox" ${item.enabled !== false ? 'checked' : ''}>
                <span>
                    <strong>${this.escapeHtml(name || `Competição ${id}`)}</strong>
                    <em>${id ? `ID ${id}` : 'Busca por nome'}</em>
                </span>
                ${id === 16 ? `<b>Copa</b>` : `<button type="button" onclick="AnalisePro.removeCalendarCompetitionFromModal('${key}')"><i class='bx bx-trash'></i></button>`}
            </label>
        `;
    },

    closeCalendarCompetitionsModal() {
        document.getElementById('calendar-competitions-modal')?.remove();
    },

    addCalendarCompetitionFromModal() {
        const idInput = document.getElementById('calendar-competition-id');
        const nameInput = document.getElementById('calendar-competition-name');
        const id = Number(idInput?.value || 0) || null;
        const name = String(nameInput?.value || '').trim();
        if (!id && !name) {
            alert('Informe o ID do SofaScore ou o nome da competição.');
            return;
        }

        const list = this.getCalendarCompetitions();
        const key = String(id || name).toLowerCase();
        const exists = list.some(item => String(item.id || item.name).toLowerCase() === key);
        if (!exists) list.push({ id, name: name || `Competição ${id}`, enabled: true });
        this.saveCalendarCompetitions(list);
        this.openCalendarCompetitionsModal();
    },

    removeCalendarCompetitionFromModal(key) {
        const cleanKey = String(key || '').toLowerCase();
        const list = this.getCalendarCompetitions().filter(item => {
            if (Number(item.id) === 16) return true;
            return String(item.id || item.name).toLowerCase() !== cleanKey;
        });
        this.saveCalendarCompetitions(list);
        this.openCalendarCompetitionsModal();
    },

    saveCalendarCompetitionsFromModal() {
        const items = Array.from(document.querySelectorAll('#calendar-competitions-modal .calendar-config-item'));
        const competitions = items.map(item => ({
            id: Number(item.dataset.id || 0) || null,
            name: String(item.dataset.name || '').trim(),
            enabled: Boolean(item.querySelector('input[type="checkbox"]')?.checked)
        }));
        if (!competitions.some(item => item.enabled)) {
            alert('Deixe pelo menos uma competição ativa.');
            return;
        }
        this.saveCalendarCompetitions(competitions);
        this.closeCalendarCompetitionsModal();
        this.refreshGames(true);
    },

    resetCalendarCompetitions() {
        localStorage.removeItem(this.calendarCompetitionsStorageKey);
        this.clearCalendarGamesCache();
        this.openCalendarCompetitionsModal();
    },

    getCalendarGameStatus(game) {
        const type = game?.status?.type || '';
        if (type === 'inprogress') return 'live';
        if (type === 'finished') return 'finished';
        return 'upcoming';
    },

    renderCalendarViewControls(gamesList) {
        const container = document.getElementById('calendar-view-controls');
        if (!container) return;

        const counts = (gamesList || []).reduce((acc, game) => {
            acc.all += 1;
            acc[this.getCalendarGameStatus(game)] += 1;
            return acc;
        }, { all: 0, live: 0, upcoming: 0, finished: 0 });

        const activeStatus = this.calendarStatusFilter || 'all';
        const activeLayout = this.calendarLayoutMode || 'cards';
        const statusButtons = [
            ['all', 'Todos', counts.all],
            ['live', 'Ao vivo', counts.live],
            ['upcoming', 'Próximos', counts.upcoming],
            ['finished', 'Encerrados', counts.finished]
        ].map(([status, label, count]) => `
            <button type="button" class="${activeStatus === status ? 'active' : ''}" onclick="AnalisePro.setCalendarStatusFilter('${status}')">
                ${label}
                <span>${count}</span>
            </button>
        `).join('');

        container.innerHTML = `
            <div class="calendar-status-tabs">${statusButtons}</div>
            <div class="calendar-layout-toggle">
                <button type="button" class="${activeLayout === 'cards' ? 'active' : ''}" onclick="AnalisePro.setCalendarLayoutMode('cards')" title="Ver em cards">
                    <i class='bx bx-grid-alt'></i><span>Cards</span>
                </button>
                <button type="button" class="${activeLayout === 'list' ? 'active' : ''}" onclick="AnalisePro.setCalendarLayoutMode('list')" title="Ver em lista">
                    <i class='bx bx-list-ul'></i><span>Lista</span>
                </button>
            </div>
        `;
    },

    renderList(gamesList) {
        const listContainer = document.getElementById('pro-calendar-list');
        const favorites = JSON.parse(localStorage.getItem('pro_fav_leagues')) || [];
        const sourceText = document.getElementById('calendar-source-status');
        if (sourceText) {
            const counts = (gamesList || []).reduce((result, game) => {
                const source = String(game?.source || '').toLowerCase();
                if (source === 'sofascore') result.sofascore += 1;
                else if (source === 'radarfutebol') result.radar += 1;
                else result.other += 1;
                return result;
            }, { sofascore: 0, radar: 0, other: 0 });
            const parts = [];
            if (counts.sofascore) parts.push(`Sofascore: ${counts.sofascore}`);
            if (counts.radar) parts.push(`Radar Futebol: ${counts.radar}`);
            if (counts.other) parts.push(`Outras fontes: ${counts.other}`);
            const meta = this.calendarSourceMeta || {};
            const suffix = meta.refreshing
                ? ' - atualizando...'
                : meta.status === 'cache'
                    ? ' - cache local'
                    : meta.elapsedMs ? ` - ${Math.round(meta.elapsedMs / 100) / 10}s` : '';
            sourceText.textContent = `${parts.join(' + ') || this.calendarSource || 'Sem jogos'}${suffix}`;
            sourceText.dataset.status = meta.error ? 'error' : (meta.refreshing ? 'loading' : (meta.status || 'live'));
            sourceText.title = [
                `Fonte: ${this.calendarSource || 'indisponivel'}`,
                meta.transport === 'categories' ? `Coleta: indice diario por categorias (${meta.categoriesFetched || 0})` : '',
                meta.savedAt ? `Cache salvo em: ${new Date(meta.savedAt).toLocaleString('pt-BR')}` : '',
                meta.error ? `Falha: ${meta.error}` : '',
                meta.warning ? `Aviso: ${meta.warning}` : '',
                meta.generatedAt ? `Gerado em: ${meta.generatedAt}` : ''
            ].filter(Boolean).join('\n');
        }
        
        // Estrutura de favoritos por data
        const favData = JSON.parse(localStorage.getItem('pro_fav_games_v2')) || {};
        const selectedDate = document.getElementById('calendar-date-filter')?.value || this.getTodayKey();
        const favGamesIds = favData[selectedDate] || [];
        const statusFilteredGames = (gamesList || []).filter(game => {
            const activeStatus = this.calendarStatusFilter || 'all';
            return activeStatus === 'all' || this.getCalendarGameStatus(game) === activeStatus;
        });
        
        const activeLeagueId = this.activeCalendarLeagueId || 'all';
        const leagueFilteredGames = activeLeagueId === 'all'
            ? statusFilteredGames
            : statusFilteredGames.filter(game => this.getCalendarLeagueId(game) === String(activeLeagueId));

        this.renderCalendarLeagueFilters(leagueFilteredGames);
        this.renderCalendarViewControls(gamesList || []);
        listContainer.innerHTML = '';

        if (leagueFilteredGames.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><i class='bx bx-search-alt'></i><p>Nenhum jogo encontrado.</p></div>`;
            return;
        }

        const favGamesList = leagueFilteredGames.filter(g => favGamesIds.includes(g.id));
        const listMode = this.calendarLayoutMode === 'list';

        if (favGamesList.length > 0) {
            const favSection = document.createElement('div');
            favSection.className = `tournament-section is-favorite-games ${listMode ? 'calendar-list-section' : ''}`;
            favSection.style.border = '2px solid #ffca28';
            favSection.style.background = 'rgba(255, 202, 40, 0.03)';
            favSection.style.marginBottom = '30px';
            favSection.innerHTML = `
                <div class="tournament-header" style="background: rgba(255, 202, 40, 0.1); border-bottom: 1px solid rgba(255, 202, 40, 0.2);">
                    <div style="display: flex; align-items: center; gap: 10px; color: #ffca28; font-weight: 800;">
                        <i class='bx bxs-star'></i>
                        MEUS JOGOS FAVORITOS
                    </div>
                </div>
                <div class="${listMode ? 'calendar-compact-list' : 'tournament-games-grid'}">
                    ${favGamesList.map(game => listMode ? this.renderGameListRow(game, favGamesIds) : this.renderGameCard(game, favGamesIds)).join('')}
                </div>
            `;
            listContainer.appendChild(favSection);
        }

        const grouped = leagueFilteredGames.reduce((acc, game) => {
            const tourId = this.getCalendarLeagueId(game);
            if (!acc[tourId]) {
                acc[tourId] = {
                    id: tourId,
                    name: this.getCalendarLeagueName(game),
                    logoHtml: this.renderTournamentLogo(game, 26),
                    priority: this.getCalendarLeaguePriority(game),
                    hasLive: false,
                    games: []
                };
            }
            acc[tourId].games.push(game);
            acc[tourId].priority = Math.max(acc[tourId].priority, this.getCalendarLeaguePriority(game));
            acc[tourId].hasLive = acc[tourId].hasLive || this.getCalendarGameStatus(game) === 'live';
            return acc;
        }, {});

        const sortedGroups = this.sortCalendarLeagues(Object.values(grouped), favorites);
        const primaryLimit = 12;
        const visibleGroups = this.calendarShowAllCompetitions || activeLeagueId !== 'all'
            ? sortedGroups
            : sortedGroups.filter((tour, index) =>
                index < primaryLimit || favorites.some(item => String(item) === String(tour.id))
            );

        visibleGroups.forEach(tour => {
            const id = tour.id;
            const isFav = favorites.includes(Number(id)) || favorites.includes(String(id));
            const section = document.createElement('div');
            section.className = `tournament-section ${listMode ? 'calendar-list-section' : ''} ${isFav ? 'is-favorite' : ''}`;
            section.innerHTML = `
                <div class="tournament-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${isFav ? `<i class='bx bxs-star' style="color:#ffca28"></i>` : tour.logoHtml}
                        ${tour.name}
                    </div>
                    <button class="btn-fav" onclick="AnalisePro.toggleFavorite(decodeURIComponent('${this.escapeAttr(encodeURIComponent(id))}'))" style="cursor: pointer; background: var(--bg-body); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 5px 10px; border-radius: 8px; font-size: 10px;">
                        <i class='bx ${isFav ? 'bxs-star' : 'bx-star'}' style="color: ${isFav ? '#ffca28' : ''}"></i>
                        ${isFav ? 'Remover' : 'Favoritar'}
                    </button>
                </div>
                <div class="${listMode ? 'calendar-compact-list' : 'tournament-games-grid'}">
                    ${tour.games.map(game => listMode ? this.renderGameListRow(game, favGamesIds) : this.renderGameCard(game, favGamesIds)).join('')}
                </div>
            `;
            listContainer.appendChild(section);
        });

        if (activeLeagueId === 'all' && sortedGroups.length > primaryLimit) {
            const remaining = Math.max(0, sortedGroups.length - visibleGroups.length);
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'calendar-show-all-button';
            toggle.onclick = () => this.toggleCalendarCompetitionVisibility();
            toggle.innerHTML = this.calendarShowAllCompetitions
                ? `<i class='bx bx-chevron-up'></i> Mostrar apenas competições principais`
                : `<i class='bx bx-plus'></i> Mostrar todas as competições (${remaining})`;
            listContainer.appendChild(toggle);
        }
    },

    toggleFavorite(id) {
        let favorites = JSON.parse(localStorage.getItem('pro_fav_leagues')) || [];
        const numericId = Number(id);
        const favId = Number.isFinite(numericId) && String(id).trim() !== '' ? numericId : String(id);
        const index = favorites.findIndex(item => String(item) === String(favId));
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(favId);
        }
        localStorage.setItem('pro_fav_leagues', JSON.stringify(favorites));
        this.renderList(this.games);
    },

    toggleFavoriteGame(gameId) {
        const selectedDate = (App.currentView === 'calendario') 
            ? document.getElementById('calendar-date-filter').value 
            : this.currentPlanningDate;

        let favData = JSON.parse(localStorage.getItem('pro_fav_games_v2')) || {};
        if (!favData[selectedDate]) favData[selectedDate] = [];

        if (favData[selectedDate].includes(gameId)) {
            favData[selectedDate] = favData[selectedDate].filter(id => id !== gameId);
        } else {
            favData[selectedDate].push(gameId);
        }
        
        localStorage.setItem('pro_fav_games_v2', JSON.stringify(favData));
        
        if (App.currentView === 'calendario') {
            this.renderList(this.games);
        } else if (App.currentView === 'planejamento') {
            this.renderPlanejamento();
        }
    },

    openPopup(url, name = 'WRadarPopup', width = 1180, height = 820) {
        const left = Math.max(0, Math.round((window.screen.width - width) / 2));
        const top = Math.max(0, Math.round((window.screen.height - height) / 2));
        window.open(url, name, `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`);
    },

    normalizeMatchText(value) {
        return String(value || '')
            .replace(/[øö]/gi, 'o')
            .replace(/æ/gi, 'ae')
            .replace(/œ/gi, 'oe')
            .replace(/ł/gi, 'l')
            .replace(/[đð]/gi, 'd')
            .replace(/þ/gi, 'th')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\bsaint\b/g, 'st')
            .replace(/\bst[.\s-]+/g, 'st ')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    },

    flattenWRadarGroups(groups) {
        return Object.values(groups || {}).flatMap(items => Array.isArray(items) ? items : []);
    },

    hashText(value) {
        let hash = 0;
        const text = String(value || '');
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
        }
        return Math.abs(hash) || 1;
    },

    getLocalDateKey(timestamp) {
        return this.getBrazilDateKey(timestamp);
    },

    splitWRadarTeams(event) {
        if (event.i?.b && event.j?.b) {
            return { home: event.i.b, away: event.j.b };
        }

        const parts = String(event.name || '').split(/\s+v(?:s\.?)?\s+/i);
        return {
            home: parts[0]?.trim() || 'Mandante',
            away: parts.slice(1).join(' v ').trim() || 'Visitante'
        };
    },

    normalizeWRadarScore(event) {
        const explicitHome = event.homeTeamScore ?? event.homeScore;
        const explicitAway = event.awayTeamScore ?? event.awayScore;
        if (explicitHome !== null && explicitHome !== undefined &&
            explicitAway !== null && explicitAway !== undefined) {
            return { home: explicitHome, away: explicitAway };
        }

        const match = String(event.score || '').match(/(\d+)\s*[-:x]\s*(\d+)/i);
        return match ? { home: Number(match[1]), away: Number(match[2]) } : null;
    },

    normalizeWRadarStatus(event, startTimestamp, groupType = '') {
        const statusText = this.normalizeMatchText(`${event.period || ''} ${event.whStatus || ''}`);
        const score = this.normalizeWRadarScore(event);
        if (statusText.includes('finished') || statusText.includes('encerrado') || statusText === 'ft') {
            return 'finished';
        }
        if (groupType === 'live' || event.minute || event.timeElapsed ||
            (event.period && !statusText.includes('not started')) ||
            (score && startTimestamp * 1000 <= Date.now())) {
            return 'inprogress';
        }
        if (startTimestamp * 1000 < Date.now() - 4 * 60 * 60 * 1000) return 'finished';
        return 'notstarted';
    },

    normalizeWRadarGroups(groups, groupType = '') {
        return Object.entries(groups || {}).flatMap(([competition, events]) => {
            if (!Array.isArray(events)) return [];
            const tournamentId = this.hashText(`wradar:${competition}`);

            return events.map(event => {
                const startTimestamp = Math.floor(new Date(event.startDateTime).getTime() / 1000);
                if (!Number.isFinite(startTimestamp)) return null;

                const teams = this.splitWRadarTeams(event);
                const score = this.normalizeWRadarScore(event);
                const sofaId = Number(event.sofascoreId) || null;
                const eventId = Number(sofaId || event.id || event.matchId || this.hashText(`${event.name}:${event.startDateTime}`));
                const odds = event.odds || {};
                const realOdds = [odds.home, odds.draw, odds.away]
                    .filter(Boolean)
                    .map(item => ({ value: item.value }));

                return {
                    id: eventId,
                    sofascoreId: sofaId,
                    wradarId: String(event.id || ''),
                    source: 'wradar',
                    sourceLabel: 'WRadar',
                    startTimestamp,
                    status: { type: this.normalizeWRadarStatus(event, startTimestamp, groupType) },
                    tournament: {
                        id: tournamentId,
                        name: competition || 'Outros jogos',
                        category: { name: 'WRadar' }
                    },
                    homeTeam: {
                        id: Number(event.i?.a) || this.hashText(`home:${teams.home}`),
                        name: teams.home,
                        imageUrl: event.i?.a ? this.get365TeamLogoUrl(event.i.a) : null
                    },
                    awayTeam: {
                        id: Number(event.j?.a) || this.hashText(`away:${teams.away}`),
                        name: teams.away,
                        imageUrl: event.j?.a ? this.get365TeamLogoUrl(event.j.a) : null
                    },
                    homeScore: score ? { current: score.home, display: score.home } : null,
                    awayScore: score ? { current: score.away, display: score.away } : null,
                    realOdds: realOdds.length === 3 ? realOdds : null,
                    wradarEvent: event,
                    wradarGroupType: groupType
                };
            }).filter(Boolean);
        });
    },

    async fetchWRadarGamesByDate(dateKey, force = false) {
        const now = Date.now();
        if (!force && this.wradarCalendarCache &&
            now - this.wradarCalendarCache.timestamp < 5 * 60 * 1000) {
            return this.wradarCalendarCache.games.filter(game => this.getLocalDateKey(game.startTimestamp) === dateKey);
        }

        const data = await this.fetchWRadarJSON('/api/events/today-snapshot?offset=0&limit=50');
        const games = [
            ...this.normalizeWRadarGroups(data.todayEvents, 'today'),
            ...this.normalizeWRadarGroups(data.liveEvents, 'live'),
            ...this.normalizeWRadarGroups(data.upcomingEvents, 'upcoming')
        ];
        const unique = Array.from(new Map(games.map(game => [String(game.id), game])).values());
        this.wradarCalendarCache = { timestamp: now, games: unique };
        return unique.filter(game => this.getLocalDateKey(game.startTimestamp) === dateKey);
    },

    async fetchSofascoreGamesByDate(dateKey) {
        if (window.traderCalendarData?.byDate) {
            const result = await this.withTimeout(
                window.traderCalendarData.byDate({ date: dateKey }),
                30000,
                null
            );
            if (!result) throw new Error('Sofascore demorou para responder.');
            if (!result?.ok) throw new Error(result?.error || 'Sofascore nao retornou jogos.');
            this.lastSofascoreResponseMeta = {
                elapsedMs: Number(result.elapsedMs) || 0,
                generatedAt: result.generatedAt || '',
                count: Number(result.count) || 0,
                transport: result.transport || '',
                categoriesFetched: Number(result.categoriesFetched) || 0,
                partial: Boolean(result.partial),
                errors: Array.isArray(result.errors) ? result.errors : []
            };
            let matches = (result.matches || []).filter(game =>
                this.getLocalDateKey(game.startTimestamp) === dateKey
            ).map(game => this.normalizeSofascoreCalendarGame(game));

            if (!matches.length && window.traderSofascoreData?.tournamentCalendar) {
                const tournamentResult = await this.withTimeout(
                    window.traderSofascoreData.tournamentCalendar({
                        date: dateKey,
                        queries: this.getSofascoreCalendarFallbackQueries(dateKey)
                    }),
                    dateKey === this.getTodayKey() ? 8000 : 18000,
                    null
                );
                if (tournamentResult?.ok && Array.isArray(tournamentResult.matches)) {
                    matches = tournamentResult.matches
                        .filter(game => this.getLocalDateKey(game.startTimestamp) === dateKey)
                        .map(game => this.normalizeSofascoreCalendarGame(game));
                }
            }

            return matches.sort((a, b) => Number(a.startTimestamp || 0) - Number(b.startTimestamp || 0));
        }

        const ts = Date.now();
        const eventsUrl = `https://api.sofascore.app/api/v1/sport/football/scheduled-events/${dateKey}?_ts=${ts}`;
        const oddsUrl = `https://api.sofascore.app/api/v1/sport/football/odds/1x2/${dateKey}?_ts=${ts}`;
        const [eventsData, oddsData] = await Promise.all([
            this.fetchSuper(eventsUrl),
            this.fetchSuper(oddsUrl).catch(() => null)
        ]);
        const allOdds = oddsData?.odds || {};

        return (eventsData?.events || []).filter(game =>
            this.getLocalDateKey(game.startTimestamp) === dateKey
        ).map(game => {
            const normalized = this.normalizeSofascoreCalendarGame(game);
            if (allOdds[game.id]) normalized.realOdds = allOdds[game.id].choices;
            return normalized;
        });
    },

    normalizeSofascoreCalendarGame(game) {
        const logo = this.resolveTournamentLogo(game?.tournament || {});
        return {
            ...game,
            source: 'sofascore',
            sourceLabel: 'Sofascore',
            sofascoreId: Number(game.sofascoreId || game.id) || null,
            homeTeam: this.localizeSofascoreTeam(game.homeTeam || {}),
            awayTeam: this.localizeSofascoreTeam(game.awayTeam || {}),
            tournament: {
                ...(game.tournament || {}),
                logo,
                category: {
                    ...(game.tournament?.category || {}),
                    name: this.localizeRegionName(
                        game.tournament?.category?.countryCode,
                        game.tournament?.category?.name || ''
                    )
                },
                logoData: game.tournament?.logoData || (String(logo).startsWith('data:') ? logo : ''),
                uniqueTournament: game.tournament?.uniqueTournament
                    ? {
                        ...game.tournament.uniqueTournament,
                        logo: game.tournament.uniqueTournament.logo || logo
                    }
                    : game.tournament?.uniqueTournament
            }
        };
    },

    decodeHtmlEntities(value) {
        const text = String(value || '');
        if (typeof document !== 'undefined') {
            const textarea = document.createElement('textarea');
            textarea.innerHTML = text;
            return textarea.value;
        }
        return text
            .replace(/&quot;/g, '"')
            .replace(/&#039;|&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    },

    async fetchRadarFutebolPage(force = false) {
        const now = Date.now();
        if (!force && this.radarFutebolCache &&
            now - this.radarFutebolCache.timestamp < 90 * 1000) {
            return this.radarFutebolCache.competitions;
        }

        const targetUrl = `https://www.radarfutebol.com/?_ts=${now}`;
        const urls = [
            targetUrl,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
        ];
        let lastError = null;

        for (const url of urls) {
            try {
                const response = await fetch(url, { cache: 'no-store' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const html = await response.text();
                const match = html.match(/<div\s+id="app"\s+data-page="([\s\S]*?)"><\/div>/i);
                if (!match) throw new Error('JSON de eventos não encontrado');

                const page = JSON.parse(this.decodeHtmlEntities(match[1]));
                const competitions = page?.props?.campeonatosIniciais;
                if (!Array.isArray(competitions)) throw new Error('Lista de campeonatos inválida');

                this.radarFutebolCache = { timestamp: now, competitions };
                return competitions;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('Radar Futebol indisponível');
    },

    normalizeRadarFutebolGames(competitions) {
        const parseTimestamp = value => {
            if (!value) return 0;
            const normalized = String(value).trim().replace(' ', 'T');
            const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
            const timestamp = Date.parse(hasTimezone ? normalized : `${normalized}-03:00`);
            return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : 0;
        };
        const normalizeOdd = value => {
            if (value === null || value === undefined || value === '' || value === '-') return null;
            const numeric = Number(String(value).replace(',', '.'));
            return Number.isFinite(numeric) && numeric > 1 ? { value: numeric } : null;
        };

        return (competitions || []).flatMap(competition => {
            const rawEvents = competition?.eventos || competition?.jogos || competition?.events || [];
            const events = Array.isArray(rawEvents) ? rawEvents : Object.values(rawEvents);
            return events.map(event => {
                const rawStatus = String(event.status || '').toLowerCase();
                const statusType = rawStatus === 'finished'
                    ? 'finished'
                    : rawStatus === 'inprogress'
                        ? 'inprogress'
                        : 'notstarted';
                const homeId = event.idTimeCasa;
                const awayId = event.idTimeFora;
                const realOdds = [
                    normalizeOdd(event.oddTimeCasa),
                    normalizeOdd(event.oddEmpate),
                    normalizeOdd(event.oddTimeFora)
                ];

                return {
                    id: Number(event.idEvento) || String(event.idEvento || `${homeId}-${awayId}-${event.inicio}`),
                    sofascoreId: Number(event.idEvento) || null,
                    startTimestamp: parseTimestamp(event.inicio),
                    status: { type: statusType, description: event.status || '' },
                    homeTeam: {
                        id: homeId,
                        name: event.nomeTimeCasa || event.timeCasa || 'Mandante',
                        imageUrl: homeId ? `https://www.radarfutebol.com/images/times/${homeId}.webp` : ''
                    },
                    awayTeam: {
                        id: awayId,
                        name: event.nomeTimeFora || event.timeFora || 'Visitante',
                        imageUrl: awayId ? `https://www.radarfutebol.com/images/times/${awayId}.webp` : ''
                    },
                    homeScore: event.golTimeCasaFt === null || event.golTimeCasaFt === undefined
                        ? null
                        : { current: Number(event.golTimeCasaFt) },
                    awayScore: event.golTimeForaFt === null || event.golTimeForaFt === undefined
                        ? null
                        : { current: Number(event.golTimeForaFt) },
                    tournament: {
                        id: competition.id,
                        name: competition.nomeCampeonato || competition.nome || competition.name || 'Competição',
                        category: { name: competition.nomeCategoria || competition.pais || competition.categoria || '' }
                    },
                    realOdds: realOdds.every(Boolean) ? realOdds : null,
                    source: 'radarfutebol',
                    sourceLabel: 'Radar Futebol',
                    radarFutebolUrl: event.slugEvento && event.idEvento
                        ? `https://www.radarfutebol.com/radar/${event.slugEvento}/${event.idEvento}`
                        : 'https://www.radarfutebol.com/'
                };
            });
        });
    },

    async fetchRadarFutebolGamesByDate(dateKey, force = false) {
        const competitions = await this.fetchRadarFutebolPage(force);
        return this.normalizeRadarFutebolGames(competitions)
            .filter(game => this.getLocalDateKey(game.startTimestamp) === dateKey)
            .sort((a, b) => a.startTimestamp - b.startTimestamp);
    },

    getCalendarMatchKey(game) {
        const home = this.normalizeMatchText(game?.homeTeam?.name || '');
        const away = this.normalizeMatchText(game?.awayTeam?.name || '');
        return `${home}|${away}`;
    },

    enrichSofascoreGamesWithRadar(sofascoreGames, radarGames) {
        if (!Array.isArray(radarGames) || radarGames.length === 0) return sofascoreGames;

        const radarBySofaId = new Map();
        const radarByTeams = new Map();

        radarGames.forEach(game => {
            const sofaId = String(game.sofascoreId || game.id || '');
            if (sofaId) radarBySofaId.set(sofaId, game);

            const teamKey = this.getCalendarMatchKey(game);
            if (teamKey !== '|') radarByTeams.set(teamKey, game);
        });

        const enriched = (sofascoreGames || []).map(game => {
            const sofaId = String(game.sofascoreId || game.id || '');
            const teamKey = this.getCalendarMatchKey(game);
            const radarGame = radarBySofaId.get(sofaId) || radarByTeams.get(teamKey);
            if (!radarGame) return game;

            return {
                ...game,
                radarFutebolUrl: radarGame.radarFutebolUrl || game.radarFutebolUrl,
                displayOdds: game.displayOdds || radarGame.displayOdds,
                realOdds: game.realOdds || radarGame.realOdds,
                radarFutebolId: radarGame.id,
                radarMatched: true
            };
        });

        const sofaKeys = new Set((sofascoreGames || []).map(game => this.getCalendarMatchKey(game)));
        const sofaIds = new Set((sofascoreGames || []).map(game => String(game.sofascoreId || game.id || '')).filter(Boolean));
        const extras = (radarGames || []).filter(game => {
            const radarId = String(game.sofascoreId || game.id || '');
            const teamKey = this.getCalendarMatchKey(game);
            return (!radarId || !sofaIds.has(radarId)) && !sofaKeys.has(teamKey);
        });

        return [...enriched, ...extras]
            .sort((a, b) => Number(a.startTimestamp || 0) - Number(b.startTimestamp || 0));
    },

    async fetchCalendarGamesByDate(dateKey, force = false) {
        let sofascoreError = null;
        const startedAt = Date.now();
        try {
            const sofascoreGames = await this.fetchSofascoreGamesByDate(dateKey);
            if (sofascoreGames.length > 0) {
                this.calendarSource = 'Sofascore';
                this.calendarSourceMeta = {
                    status: 'live',
                    source: 'Sofascore',
                    count: sofascoreGames.length,
                    elapsedMs: this.lastSofascoreResponseMeta?.elapsedMs || (Date.now() - startedAt),
                    generatedAt: this.lastSofascoreResponseMeta?.generatedAt || '',
                    transport: this.lastSofascoreResponseMeta?.transport || '',
                    categoriesFetched: this.lastSofascoreResponseMeta?.categoriesFetched || 0,
                    partial: Boolean(this.lastSofascoreResponseMeta?.partial),
                    warning: this.lastSofascoreResponseMeta?.errors?.join(' | ') || '',
                    error: ''
                };
                return sofascoreGames;
            }
            sofascoreError = new Error('Sofascore respondeu sem jogos para esta data.');
        } catch (error) {
            sofascoreError = error;
            console.warn('Sofascore indisponível:', error);
        }

        try {
            const games = await this.fetchRadarFutebolGamesByDate(dateKey, force);
            this.calendarSource = games.length > 0 ? 'Radar Futebol' : '';
            this.calendarSourceMeta = {
                status: games.length ? 'fallback' : 'error',
                source: this.calendarSource,
                count: games.length,
                elapsedMs: Date.now() - startedAt,
                error: sofascoreError?.message || ''
            };
            return games;
        } catch (error) {
            this.calendarSource = '';
            this.calendarSourceMeta = {
                status: 'error',
                source: '',
                count: 0,
                elapsedMs: Date.now() - startedAt,
                error: [sofascoreError?.message, error?.message].filter(Boolean).join(' | ')
            };
            if (sofascoreError) console.warn('Fallback Radar Futebol também indisponível após falha do Sofascore:', sofascoreError);
            console.warn('Radar Futebol indisponível:', error);
            return [];
        }
    },

    renderTeamLogo(team, size = 22, source = 'sofascore') {
        const dimension = Number(size) || 22;
        const localShield = typeof App !== 'undefined' && App.getEscudoTime
            ? App.getEscudoTime(team?.name || '')
            : '';
        const imageUrl = source === 'radarfutebol'
            ? team?.imageUrl
            : source === 'sofascore'
                ? team?.imageUrl
                : source === 'wradar'
                    ? ''
                    : localShield;
        const fallbackUrl = '';
        if (imageUrl) {
            return `<img src="${this.escapeHtml(imageUrl)}" data-fallback="${this.escapeHtml(fallbackUrl)}" alt="${this.escapeHtml(team?.name || '')}" style="width:${dimension}px;height:${dimension}px;object-fit:contain;flex-shrink:0;" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback='';return;}this.style.display='none';this.nextElementSibling.style.display='inline-flex'"><span style="display:none;width:${dimension}px;height:${dimension}px;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;background:rgba(15,150,156,.12);color:var(--primary-color);font-size:${Math.max(8, dimension * 0.36)}px;font-weight:900;">${this.escapeHtml(this.getTeamInitials(team?.name))}</span>`;
        }
        if (source === 'sofascore' && team?.id) {
            return `<img src="https://api.sofascore.app/api/v1/team/${team.id}/image" style="width:${dimension}px;height:${dimension}px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'">`;
        }
        const initials = this.getTeamInitials(team?.name);
        return `<span style="width:${dimension}px;height:${dimension}px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;background:rgba(15,150,156,.12);color:var(--primary-color);font-size:${Math.max(8, dimension * 0.36)}px;font-weight:900;">${this.escapeHtml(initials)}</span>`;
    },

    getTeamInitials(name) {
        return String(name || '?')
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0] || '')
            .join('')
            .toUpperCase();
    },

    get365TeamLogoUrl(teamId) {
        const id = Number(teamId);
        if (!id) return '';
        return `https://imagecache.365scores.com/image/upload/f_png,w_100,h_100,c_limit,q_auto:eco,dpr_2/v1/Competitors/${id}`;
    },

    getNationalTeamFlag(teamName) {
        const normalized = this.normalizeMatchText(teamName);
        const countryCodes = {
            'albania': 'al', 'algeria': 'dz', 'angola': 'ao', 'argentina': 'ar',
            'armenia': 'am', 'australia': 'au', 'austria': 'at', 'belgium': 'be',
            'bolivia': 'bo', 'bosnia herzegovina': 'ba', 'brazil': 'br', 'bulgaria': 'bg',
            'cameroon': 'cm', 'canada': 'ca', 'cape verde': 'cv', 'cape verde islands': 'cv',
            'chile': 'cl', 'china': 'cn', 'colombia': 'co', 'costa rica': 'cr',
            'croatia': 'hr', 'curacao': 'cw', 'cyprus': 'cy', 'czech republic': 'cz',
            'czechia': 'cz', 'denmark': 'dk', 'ecuador': 'ec', 'egypt': 'eg',
            'england': 'gb-eng', 'estonia': 'ee', 'finland': 'fi', 'france': 'fr',
            'georgia': 'ge', 'germany': 'de', 'ghana': 'gh', 'greece': 'gr',
            'hungary': 'hu', 'iceland': 'is', 'india': 'in', 'indonesia': 'id',
            'iran': 'ir', 'iraq': 'iq', 'ireland': 'ie', 'israel': 'il',
            'italy': 'it', 'ivory coast': 'ci', 'cote d ivoire': 'ci', 'jamaica': 'jm',
            'japan': 'jp', 'jordan': 'jo', 'kazakhstan': 'kz', 'kenya': 'ke',
            'kosovo': 'xk', 'mexico': 'mx', 'morocco': 'ma', 'netherlands': 'nl',
            'new zealand': 'nz', 'nigeria': 'ng', 'north macedonia': 'mk',
            'northern ireland': 'gb-nir', 'norway': 'no', 'panama': 'pa',
            'paraguay': 'py', 'peru': 'pe', 'poland': 'pl', 'portugal': 'pt',
            'qatar': 'qa', 'romania': 'ro', 'saudi arabia': 'sa', 'scotland': 'gb-sct',
            'senegal': 'sn', 'serbia': 'rs', 'slovakia': 'sk', 'slovenia': 'si',
            'south africa': 'za', 'south korea': 'kr', 'korea republic': 'kr',
            'spain': 'es', 'sweden': 'se', 'switzerland': 'ch', 'tunisia': 'tn',
            'turkey': 'tr', 'turkiye': 'tr', 'ukraine': 'ua', 'united arab emirates': 'ae',
            'uruguay': 'uy', 'usa': 'us', 'united states': 'us', 'uzbekistan': 'uz',
            'venezuela': 've', 'wales': 'gb-wls'
        };
        const code = countryCodes[normalized];
        return code ? `https://flagcdn.com/w80/${code}.png` : '';
    },

    scheduleMissingTeamLogos(games) {
        if (this.teamLogoFetchPromise || typeof App === 'undefined') return;

        const targets = new Map();
        (games || []).forEach(game => {
            [game.homeTeam, game.awayTeam].filter(team => team?.name).forEach(team => {
                const name = team.name;
                const currentLogo = App.getEscudoTime(name);
                const missAt = this.teamLogoMisses?.[this.normalizeMatchText(name)] || 0;
                const missExpired = Date.now() - missAt > 30 * 60 * 1000;
                if ((!currentLogo || this.shouldRefreshTeamLogo(name, currentLogo)) &&
                    !this.getNationalTeamFlag(name) && (!missAt || missExpired)) {
                    targets.set(name, {
                        name,
                        teamId: game.source === 'wradar' ? team.id : null,
                        competition: game.tournament?.name || '',
                        category: game.tournament?.category?.name || ''
                    });
                }
            });
        });
        const missingNames = Array.from(targets.values()).slice(0, 20);

        if (missingNames.length === 0) return;
        clearTimeout(this.teamLogoTimer);
        this.teamLogoTimer = setTimeout(() => {
            this.teamLogoFetchPromise = this.loadMissingTeamLogos(missingNames)
                .finally(() => {
                    this.teamLogoFetchPromise = null;
                    setTimeout(() => this.scheduleMissingTeamLogos(this.games), 800);
                });
        }, 500);
    },

    shouldRefreshTeamLogo(teamName, imageUrl) {
        const isOldAutomaticSource = /thesportsdb\.com|r2\.thesportsdb\.com/i.test(String(imageUrl || ''));
        const hasAmbiguousSuffix = /\b(PB|SP|MG|PR|RS|SC|PE|BA|RJ|CE|GO|II|B|U\d{2})\b/i.test(String(teamName || ''));
        return isOldAutomaticSource && hasAmbiguousSuffix;
    },

    getTeamSearchVariants(teamName) {
        const raw = String(teamName || '').trim();
        const variants = new Set([raw]);
        const suffixes = {
            ' PB': '-PB', ' SP': '-SP', ' MG': '-MG', ' PR': '-PR',
            ' RS': '-RS', ' SC': '-SC', ' PE': '-PE', ' BA': '-BA',
            ' RJ': '-RJ', ' CE': '-CE', ' GO': '-GO', ' II': ' II'
        };
        Object.entries(suffixes).forEach(([suffix, replacement]) => {
            if (raw.toUpperCase().endsWith(suffix)) {
                variants.add(`${raw.slice(0, -suffix.length)}${replacement}`);
            }
        });
        const expansions = {
            'CA ': 'Club Atletico ',
            'FC ': 'Football Club ',
            'Univ. ': 'Universidad ',
            'Inter ': 'Internacional '
        };
        Object.entries(expansions).forEach(([prefix, replacement]) => {
            if (raw.startsWith(prefix)) variants.add(raw.replace(prefix, replacement));
        });
        if (/\bPB$/i.test(raw)) variants.add(`${raw.replace(/\s+PB$/i, '')} Futebol Clube Paraiba`);
        if (/\bSP$/i.test(raw)) variants.add(`${raw.replace(/\s+SP$/i, '')} Futebol Clube Ribeirao Preto`);
        if (/\bAM$/i.test(raw)) variants.add(`${raw.replace(/\s+AM$/i, '')} Amazonas futebol`);
        if (/\bRR$/i.test(raw)) variants.add(`${raw.replace(/\s+RR$/i, '')} Roraima futebol`);
        if (/\bPR$/i.test(raw)) variants.add(`${raw.replace(/\s+PR$/i, '')} Parana futebol`);
        if (/\bII$/i.test(raw)) {
            variants.add(raw.replace(/\s+II$/i, ' 2'));
            variants.add(raw.replace(/\s+II$/i, ' reserve'));
        }
        variants.add(raw.replace(/\bFC\b/gi, '').replace(/\bCF\b/gi, '').replace(/\s+/g, ' ').trim());
        return Array.from(variants).filter(Boolean);
    },

    async fetchLogoJSON(url, source = 'logos') {
        const now = Date.now();
        const cooldownUntil = this.logoSourceCooldown?.[source] || 0;
        if (cooldownUntil > now) {
            const error = new Error(`Fonte ${source} temporariamente limitada`);
            error.temporary = true;
            error.retryAfter = cooldownUntil - now;
            throw error;
        }

        const waitMs = Math.max(0, (this.lastLogoRequestAt || 0) + 900 - now);
        if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
        this.lastLogoRequestAt = Date.now();

        const response = await fetch(url, { cache: 'force-cache' });
        if (response.status === 429) {
            const retryHeader = Number(response.headers.get('retry-after'));
            const retryMs = Math.min(15 * 60 * 1000, Math.max(30000, (retryHeader || 60) * 1000));
            this.logoSourceCooldown = this.logoSourceCooldown || {};
            this.logoSourceCooldown[source] = Date.now() + retryMs;
            const error = new Error(`Limite temporário em ${source}`);
            error.temporary = true;
            error.retryAfter = retryMs;
            throw error;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    },

    async fetch365TeamLogo(teamId) {
        const url = this.get365TeamLogoUrl(teamId);
        if (!url) return '';
        const now = Date.now();
        const waitMs = Math.max(0, (this.lastLogoRequestAt || 0) + 350 - now);
        if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
        this.lastLogoRequestAt = Date.now();

        try {
            const response = await fetch(url, { method: 'HEAD', cache: 'force-cache' });
            if (response.status === 429) {
                const error = new Error('Limite temporário no CDN do 365Scores');
                error.temporary = true;
                error.retryAfter = 60000;
                throw error;
            }
            return response.ok ? url : '';
        } catch (error) {
            if (error.temporary) throw error;
            return '';
        }
    },

    scoreTeamCandidate(teamName, candidateName, description = '', aliases = []) {
        const target = this.normalizeMatchText(teamName);
        const candidate = this.normalizeMatchText(candidateName);
        const aliasList = (aliases || []).map(alias => this.normalizeMatchText(alias));
        const footballText = this.normalizeMatchText(description);
        let score = 0;

        if (candidate === target || aliasList.includes(target)) score += 100;
        if (candidate.includes(target) || target.includes(candidate)) score += 35;

        const targetTokens = target.split(' ').filter(token => token.length > 1);
        const candidateTokens = new Set([candidate, ...aliasList].join(' ').split(' '));
        const matchedTokens = targetTokens.filter(token => candidateTokens.has(token)).length;
        score += targetTokens.length ? (matchedTokens / targetTokens.length) * 45 : 0;

        if (/(association football|football club|football team|soccer club|clube.*futebol|equipo.*futbol)/.test(footballText)) {
            score += 25;
        }
        if (/(footballer|futebolista|player|jogador|season|campeonato|league)/.test(footballText)) {
            score -= 35;
        }
        return score;
    },

    async fetchTheSportsDBTeam(teamName) {
        for (const variant of this.getTeamSearchVariants(teamName)) {
            const directUrl = `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(variant)}`;
            const urls = [
                directUrl,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directUrl)}`
            ];

            for (const url of urls) {
                try {
                    const data = await this.fetchLogoJSON(url, 'thesportsdb');
                    const teams = (Array.isArray(data?.teams) ? data.teams : []).filter(item =>
                        !item.strSport || this.normalizeMatchText(item.strSport) === 'soccer'
                    );
                    const ranked = teams.map(item => ({
                        item,
                        score: this.scoreTeamCandidate(
                            teamName,
                            item.strTeam,
                            `${item.strDescriptionEN || ''} ${item.strLeague || ''}`,
                            String(item.strAlternate || '').split(',')
                        )
                    })).sort((a, b) => b.score - a.score);
                    if (ranked[0]?.score >= 85 && ranked[0].item?.strBadge) {
                        return ranked[0].item.strBadge;
                    }
                } catch (error) {
                    if (error.temporary) throw error;
                }
            }
        }

        return '';
    },

    async fetchWikidataTeamLogo(teamName, context = {}) {
        const languages = ['pt', 'en'];
        let candidates = [];

        for (const language of languages) {
            const variants = this.getTeamSearchVariants(teamName).slice(0, 4);
            for (const variant of variants) {
                try {
                    const contextText = `${context.competition || ''} ${context.category || ''}`.trim();
                    const query = candidates.length === 0 || !contextText ? variant : `${variant} ${contextText}`;
                    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=${language}&type=item&limit=8&format=json&origin=*`;
                    const data = await this.fetchLogoJSON(url, 'wikimedia');
                    candidates.push(...(data.search || []).map(item => ({
                        id: item.id,
                        label: item.label,
                        description: item.description || '',
                        aliases: item.aliases || [],
                        score: this.scoreTeamCandidate(teamName, item.label, item.description, item.aliases)
                    })));
                    if (candidates.some(item => item.score >= 100)) break;
                } catch (error) {
                    if (error.temporary) throw error;
                }
            }
            if (candidates.some(item => item.score >= 100)) break;
        }

        candidates = Array.from(new Map(candidates.map(item => [item.id, item])).values())
            .sort((a, b) => b.score - a.score);
        const selected = candidates.find(item => item.score >= 80);
        if (!selected) return '';

        try {
            const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(selected.id)}&props=claims&format=json&origin=*`;
            const data = await this.fetchLogoJSON(entityUrl, 'wikimedia');
            const claims = data.entities?.[selected.id]?.claims || {};
            const fileName = claims.P154?.[0]?.mainsnak?.datavalue?.value;
            return fileName
                ? `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=160`
                : '';
        } catch (error) {
            if (error.temporary) throw error;
            return '';
        }
    },

    async fetchWikipediaTeamLogo(teamName, context = {}) {
        const sites = [
            { host: 'pt.wikipedia.org', term: 'futebol' },
            { host: 'en.wikipedia.org', term: 'football club' },
            { host: 'es.wikipedia.org', term: 'club de futbol' }
        ];

        for (const site of sites) {
            try {
                const query = `${teamName} ${context.competition || ''} ${site.term}`.trim();
                const url = `https://${site.host}/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=pageimages%7Cdescription&piprop=thumbnail%7Coriginal&pithumbsize=160&format=json&origin=*`;
                const data = await this.fetchLogoJSON(url, 'wikimedia');
                const pages = Object.values(data.query?.pages || {});
                const ranked = pages.map(page => ({
                    page,
                    score: this.scoreTeamCandidate(teamName, page.title, page.description || '')
                })).filter(item => item.page.thumbnail?.source || item.page.original?.source)
                    .sort((a, b) => b.score - a.score);
                if (ranked[0]?.score >= 80) {
                    return ranked[0].page.thumbnail?.source || ranked[0].page.original?.source || '';
                }
            } catch (error) {
                if (error.temporary) throw error;
            }
        }
        return '';
    },

    async fetchTeamLogo(teamName, context = {}) {
        return await this.fetch365TeamLogo(context.teamId) ||
            await this.fetchTheSportsDBTeam(teamName) ||
            await this.fetchWikidataTeamLogo(teamName, context) ||
            await this.fetchWikipediaTeamLogo(teamName, context);
    },

    async loadMissingTeamLogos(teamTargets) {
        this.teamLogoMisses = this.teamLogoMisses || {};
        let cursor = 0;
        let downloaded = 0;
        let temporaryFailure = false;

        const worker = async () => {
            while (cursor < teamTargets.length) {
                const target = teamTargets[cursor++];
                const teamName = target.name;
                const normalized = this.normalizeMatchText(teamName);
                try {
                    const imageUrl = await this.fetchTeamLogo(teamName, target);
                    if (imageUrl) {
                        App.escudosTimes[teamName] = imageUrl;
                        downloaded++;
                    } else {
                        this.teamLogoMisses[normalized] = Date.now();
                    }
                } catch (error) {
                    if (error.temporary) {
                        temporaryFailure = true;
                        break;
                    }
                    this.teamLogoMisses[normalized] = Date.now();
                }
            }
        };

        await worker();
        if (downloaded > 0) {
            if (typeof DB !== 'undefined') await DB.set('planilhaEscudosTimes', App.escudosTimes);
            if (App.currentView === 'calendario') this.renderList(this.games);
            if (App.currentView === 'planejamento') this.renderPlanejamento();
        }
        if (temporaryFailure) {
            clearTimeout(this.teamLogoRetryTimer);
            this.teamLogoRetryTimer = setTimeout(() => {
                this.logoSourceCooldown = {};
                this.scheduleMissingTeamLogos(this.games);
            }, 60000);
        }
    },

    async fetchWRadarJSON(path) {
        const directUrl = `https://wradar.com.br${path}`;
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directUrl)}`;
        const urls = [directUrl, proxyUrl];

        let lastError = null;
        for (const url of urls) {
            try {
                const response = await fetch(url, { cache: 'no-store' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError || new Error('Falha ao buscar dados do WRadar.');
    },

    async fetchWRadarHomeEvents() {
        const directUrl = 'https://wradar.com.br/';
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directUrl)}`;
        const urls = [directUrl, proxyUrl];

        for (const url of urls) {
            try {
                const response = await fetch(url, { cache: 'no-store' });
                if (!response.ok) continue;
                const html = await response.text();
                const match = html.match(/<script type="application\/json" id="app-data">([\s\S]*?)<\/script>/);
                if (!match) continue;
                const data = JSON.parse(match[1]);
                return [
                    ...this.flattenWRadarGroups(data.todayEvents),
                    ...this.flattenWRadarGroups(data.liveEvents),
                    ...this.flattenWRadarGroups(data.upcomingEvents)
                ];
            } catch (error) {
                console.warn('Falha ao ler app-data do WRadar:', error);
            }
        }

        return [];
    },

    async fetchWRadarEvents() {
        const now = Date.now();
        if (this.wradarCache && now - this.wradarCache.timestamp < 10 * 60 * 1000) {
            return this.wradarCache.events;
        }
        if (this.wradarFetchPromise) return this.wradarFetchPromise;

        this.wradarFetchPromise = this.loadWRadarEvents();
        try {
            return await this.wradarFetchPromise;
        } finally {
            this.wradarFetchPromise = null;
        }
    },

    async loadWRadarEvents() {
        const events = [];
        let offset = 0;
        let hasMore = true;
        let guard = 0;
        let loadedAnyPage = false;

        while (hasMore && guard < 20) {
            try {
                const data = await this.fetchWRadarJSON(`/api/events/today-snapshot?offset=${offset}&limit=50`);
                loadedAnyPage = true;

                events.push(
                    ...this.flattenWRadarGroups(data.todayEvents),
                    ...this.flattenWRadarGroups(data.liveEvents),
                    ...this.flattenWRadarGroups(data.upcomingEvents)
                );

                hasMore = !!data.hasMore;
                offset = Number(data.nextOffset || 0);
                guard++;
            } catch (error) {
                console.warn('Falha ao carregar pagina do WRadar:', offset, error);
                break;
            }
        }

        events.push(...await this.fetchWRadarHomeEvents());

        if (!loadedAnyPage && events.length === 0) {
            throw new Error('Não foi possível carregar a lista de jogos do WRadar.');
        }

        const unique = Array.from(new Map(events.filter(Boolean).map(event => [String(event.id), event])).values());
        this.wradarCache = { timestamp: Date.now(), events: unique };
        return unique;
    },

    findWRadarEvent(events, gameInfo) {
        const wradarId = String(gameInfo.wradarId || '');
        if (wradarId) {
            const directMatch = events.find(event => String(event.id || '') === wradarId);
            if (directMatch) return directMatch;
        }

        const sofaId = String(gameInfo.sofascoreId || '');
        if (sofaId) {
            const bySofa = events.find(event => String(event.sofascoreId || '') === sofaId);
            if (bySofa) return bySofa;
        }

        const home = this.normalizeMatchText(gameInfo.home);
        const away = this.normalizeMatchText(gameInfo.away);
        const targetName = this.normalizeMatchText(`${gameInfo.home} v ${gameInfo.away}`);
        const reverseName = this.normalizeMatchText(`${gameInfo.away} v ${gameInfo.home}`);
        const exact = events.find(event => {
            const name = this.normalizeMatchText(event.name);
            return name === targetName || name === reverseName;
        });
        if (exact) return exact;

        const candidates = events
            .map(event => ({ event, name: this.normalizeMatchText(event.name) }))
            .filter(item => item.name.includes(home) && item.name.includes(away));

        if (candidates.length === 1) return candidates[0].event;

        if (gameInfo.startTimestamp && candidates.length > 1) {
            const targetTime = Number(gameInfo.startTimestamp) * 1000;
            return candidates
                .map(item => ({
                    event: item.event,
                    diff: Math.abs(new Date(item.event.startDateTime).getTime() - targetTime)
                }))
                .sort((a, b) => a.diff - b.diff)[0]?.event || null;
        }

        return candidates[0]?.event || null;
    },

    buildWRadarUrl(event, type) {
        const title = encodeURIComponent(event.name || '');
        if (type === 'mod') return `https://wradar.com.br/radar?eventId=${event.id}&title=${title}&mod=true`;
        if (type === 'pack') return `https://wradar.com.br/radar-wh-pack?eventId=${event.id}&title=${title}`;
        if (type === 'sport') {
            const idBolsa = event.odds?.idBolsa;
            return idBolsa ? `https://bolsadeaposta.bet.br/widget/mradar?id=${idBolsa}` : null;
        }
        if (type === 'packball') return event.packLink || null;
        return `https://wradar.com.br/radar?eventId=${event.id}&title=${title}`;
    },

    getCustomRadarSettings() {
        try {
            const heatmapMode = localStorage.getItem('custom_wradar_mod_heatmap_mode')
                || (localStorage.getItem('custom_wradar_mod_show_heatmap') === '1' ? 'match' : 'off');
            return {
                theme: localStorage.getItem('custom_wradar_mod_theme') || document.documentElement.getAttribute('data-theme') || 'dark',
                showOdds: localStorage.getItem('custom_wradar_mod_show_odds') !== '0',
                showMeta: localStorage.getItem('custom_wradar_mod_show_meta') !== '0',
                showHeatmap: heatmapMode !== 'off',
                heatmapMode
            };
        } catch (_) {
            return { theme: 'dark', showOdds: true, showMeta: true, showHeatmap: false, heatmapMode: 'off' };
        }
    },

    async openCustomWRadarMod(gameInfo) {
        try {
            const events = await this.fetchWRadarEvents();
            const event = this.findWRadarEvent(events, gameInfo);
            if (!event) throw new Error('Jogo nao encontrado no WRadar para este Sofascore ID.');

            if (window.traderWRadarRealMod?.openWindow) {
                await window.traderWRadarRealMod.openWindow({ event, gameInfo, settings: this.getCustomRadarSettings() });
                return;
            }

            this.renderCustomWRadarShell();
            this.setCustomWRadarLoading('Abrindo Radar MOD proprio...');

            this.customWRadarGameInfo = gameInfo;
            this.customWRadarEvent = event;
            this.customWRadarRealData = null;
            this.renderCustomWRadarMod(event);
            this.startCustomWRadarRealFeed(event);
        } catch (error) {
            this.renderCustomWRadarShell();
            this.setCustomWRadarError(error);
        }
    },

    ensureCustomWRadarRealFeedListener() {
        if (this.customWRadarFeedUnsubscribe || !window.traderWRadarRealMod?.onUpdate) return;
        this.customWRadarFeedUnsubscribe = window.traderWRadarRealMod.onUpdate((payload) => {
            if (!payload || payload.feedId !== this.customWRadarFeedId) return;
            if (payload.error) {
                this.customWRadarFeedError = payload.error;
                if (this.customWRadarEvent) this.renderCustomWRadarMod(this.customWRadarEvent);
                return;
            }
            this.customWRadarFeedError = '';
            this.customWRadarRealData = payload.data || null;
            if (this.customWRadarEvent) {
                if (this.shouldDeferCustomRadarRender()) {
                    this.scheduleCustomRadarDeferredRender();
                } else {
                    this.renderCustomWRadarMod(this.customWRadarEvent);
                }
            }
        });
    },

    async startCustomWRadarRealFeed(event) {
        this.ensureCustomWRadarRealFeedListener();
        if (!window.traderWRadarRealMod?.startFeed) {
            this.customWRadarFeedError = 'Feed real disponivel apenas no app desktop Electron.';
            this.renderCustomWRadarMod(event);
            return;
        }

        if (this.customWRadarFeedId && window.traderWRadarRealMod.stopFeed) {
            window.traderWRadarRealMod.stopFeed(this.customWRadarFeedId).catch(() => {});
        }

        try {
            const result = await window.traderWRadarRealMod.startFeed({
                eventId: event.id,
                title: event.name || '',
                locale: 'pt-pt'
            });
            this.customWRadarFeedId = result.feedId;
        } catch (error) {
            this.customWRadarFeedError = error?.message || 'Nao foi possivel iniciar o feed real.';
            this.renderCustomWRadarMod(event);
        }
    },

    renderCustomWRadarShell() {
        let modal = document.getElementById('custom-wradar-mod');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-wradar-mod';
            document.body.appendChild(modal);
        }

        const settings = this.getCustomRadarSettings();
        modal.className = 'custom-wradar-modal is-open';
        modal.setAttribute('data-radar-theme', settings.theme === 'light' ? 'light' : 'dark');
        modal.innerHTML = `
            <div class="custom-wradar-backdrop" onclick="AnalisePro.closeCustomWRadarMod()"></div>
            <section class="custom-wradar-panel" role="dialog" aria-modal="true" aria-label="Radar MOD proprio">
                <div class="custom-wradar-content" id="custom-wradar-content"></div>
            </section>
        `;
    },

    setCustomWRadarLoading(message) {
        const content = document.getElementById('custom-wradar-content');
        if (!content) return;
        content.innerHTML = `
            <div class="custom-wradar-state">
                <i class='bx bx-loader-alt bx-spin'></i>
                <strong>${this.escapeHtml(message)}</strong>
            </div>
        `;
    },

    setCustomWRadarError(error) {
        const content = document.getElementById('custom-wradar-content');
        if (!content) return;
        content.innerHTML = `
            <div class="custom-wradar-state">
                <i class='bx bx-error-circle'></i>
                <strong>Nao foi possivel abrir o MOD proprio</strong>
                <span>${this.escapeHtml(error?.message || 'Falha ao carregar dados do WRadar.')}</span>
                <button type="button" class="custom-radar-btn primary" onclick="AnalisePro.closeCustomWRadarMod()">Fechar</button>
            </div>
        `;
    },

    renderCustomWRadarMod(event) {
        const content = document.getElementById('custom-wradar-content');
        const modal = document.getElementById('custom-wradar-mod');
        if (!content || !modal) return;
        const previousList = content.querySelector('.custom-radar-comment-list');
        const previousScroll = previousList ? {
            top: previousList.scrollTop,
            height: previousList.scrollHeight,
            keepPosition: previousList.scrollTop > 4
        } : null;

        const settings = this.getCustomRadarSettings();
        modal.setAttribute('data-radar-theme', settings.theme === 'light' ? 'light' : 'dark');

        const realData = this.customWRadarRealData || null;
        const teams = this.splitWRadarTeams(event);
        const fallbackScore = this.normalizeWRadarScore(event) || {
            home: Number(event.homeTeamScore ?? event.score?.home?.score ?? 0),
            away: Number(event.awayTeamScore ?? event.score?.away?.score ?? 0)
        };
        const score = {
            home: Number.isFinite(realData?.score?.home) ? realData.score.home : fallbackScore.home,
            away: Number.isFinite(realData?.score?.away) ? realData.score.away : fallbackScore.away
        };
        const displayTeams = {
            home: realData?.homeName || teams.home,
            away: realData?.awayName || teams.away
        };
        const state = this.getCustomRadarState(event, score);
        if (realData?.clock) state.periodLabel = realData.clock;
        const odds = this.normalizeCustomRadarOdds(event.odds);
        const whUrl = this.buildWRadarUrl(event, 'mod');
        const idBolsa = event.odds?.idBolsa || event.idBolsa || '';
        const sportUrl = idBolsa ? `https://bolsadeaposta.bet.br/widget/mradar?id=${encodeURIComponent(idBolsa)}` : '';
        const packUrl = event.packLink || '';
        const lastComment = this.getCustomRadarFocusedComment(realData) || this.getCustomRadarLastComment(realData);
        const isPinnedComment = (!!this.customWRadarPinnedCommentKey || Number.isInteger(this.customWRadarPinnedCommentIndex)) && !!lastComment;
        const currentCommentText = this.normalizeCustomRadarCommentText(lastComment?.comment || (realData ? 'Aguardando lance...' : 'Conectando feed real...'));
        const currentTime = lastComment?.time || state.periodLabel || '--';
        const currentType = this.getCustomRadarEventType(lastComment);
        const compactHome = this.getCustomRadarTeamAbbr(displayTeams.home);
        const compactAway = this.getCustomRadarTeamAbbr(displayTeams.away);

        content.innerHTML = `
            <header class="custom-radar-header">
                <div class="custom-radar-title">
                    <span class="custom-radar-kicker">MOD proprio ${realData ? 'ao vivo' : 'conectando'}</span>
                    <h2>${this.escapeHtml(displayTeams.home)} <span>vs</span> ${this.escapeHtml(displayTeams.away)}</h2>
                    <p>${this.escapeHtml(this.customWRadarFeedError || event.name || '')}</p>
                </div>
                <div class="custom-radar-actions">
                    <button type="button" class="custom-radar-icon-btn" onclick="AnalisePro.toggleCustomWRadarTheme()" title="Alternar tema">
                        <i class='bx ${settings.theme === 'light' ? 'bx-moon' : 'bx-sun'}'></i>
                    </button>
                    <button type="button" class="custom-radar-icon-btn" onclick="AnalisePro.refreshCustomWRadarMod()" title="Atualizar dados">
                        <i class='bx bx-refresh'></i>
                    </button>
                    <button type="button" class="custom-radar-icon-btn" onclick="AnalisePro.openCustomRadarDesktopHighlight()" title="Destacar area">
                        <i class='bx bx-crop'></i>
                    </button>
                    <button type="button" class="custom-radar-icon-btn" onclick="AnalisePro.closeCustomWRadarMod()" title="Fechar">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
            </header>

            <div class="custom-radar-scorebar">
                <div class="custom-radar-team home">
                    ${this.renderCustomRadarTeamLogo(event.i, displayTeams.home)}
                    <strong>${this.escapeHtml(displayTeams.home)}</strong>
                </div>
                <div class="custom-radar-score">
                    <span>${Number.isFinite(score.home) ? score.home : 0}</span>
                    <small>${this.escapeHtml(state.periodLabel)}</small>
                    <span>${Number.isFinite(score.away) ? score.away : 0}</span>
                </div>
                <div class="custom-radar-team away">
                    <strong>${this.escapeHtml(displayTeams.away)}</strong>
                    ${this.renderCustomRadarTeamLogo(event.j, displayTeams.away)}
                </div>
            </div>

            <div class="custom-radar-layout custom-radar-event-layout">
                <div class="custom-radar-main">
                    <div class="custom-radar-live-feed">
                        <div class="custom-radar-mini-info">
                            <div class="custom-radar-mini-score">
                                <span class="home">${this.escapeHtml(compactHome)}</span>
                                <strong>${Number.isFinite(score.home) ? score.home : 0}x${Number.isFinite(score.away) ? score.away : 0}</strong>
                                <span class="away">${this.escapeHtml(compactAway)}</span>
                            </div>
                            <div class="custom-radar-mini-time">${this.escapeHtml(state.periodLabel || '--')}</div>
                        </div>
                        <div class="custom-radar-current-event ${lastComment?.side || ''} ${this.escapeHtml(currentType)} ${isPinnedComment ? 'is-highlighted' : ''}">
                            <span>${this.escapeHtml(currentTime)}</span>
                            ${this.renderCustomRadarEventIcon(lastComment)}
                            <strong>${this.escapeHtml(currentCommentText)}</strong>
                            <button type="button" class="custom-radar-pin-btn ${isPinnedComment ? 'active' : ''}" onclick="AnalisePro.clearCustomRadarPinnedEvent()" title="${isPinnedComment ? 'Limpar destaque' : 'Destaque automatico do ultimo lance'}">
                                <i class='bx ${isPinnedComment ? 'bxs-pin' : 'bx-pulse'}'></i>
                            </button>
                        </div>
                        ${this.renderCustomRadarCommentaries(realData)}
                    </div>

                    <div class="custom-radar-footer-stats">
                        <div class="custom-radar-footer-title">
                            <i class='bx bx-bar-chart-alt-2'></i>
                            <strong>Estatisticas ao vivo</strong>
                        </div>
                        ${this.renderCustomRadarStats(realData)}
                    </div>
                </div>

                <aside class="custom-radar-side custom-radar-tools">
                    <div class="custom-radar-controls">
                        <button type="button" class="${settings.showOdds ? 'active' : ''}" onclick="AnalisePro.toggleCustomRadarOption('showOdds')">
                            <i class='bx bx-money'></i> Odds
                        </button>
                        <button type="button" class="${settings.showMeta ? 'active' : ''}" onclick="AnalisePro.toggleCustomRadarOption('showMeta')">
                            <i class='bx bx-data'></i> IDs
                        </button>
                        <button type="button" class="${settings.showHeatmap ? 'active' : ''}" onclick="AnalisePro.toggleCustomRadarOption('showHeatmap')">
                            <i class='bx bxs-flame'></i> Calor
                        </button>
                        <button type="button" class="custom-radar-highlight-action" onclick="AnalisePro.openCustomRadarDesktopHighlight()">
                            <i class='bx bx-crop'></i> Destacar
                        </button>
                    </div>

                    ${settings.showOdds ? `
                        <div class="custom-radar-card">
                            <h3><i class='bx bx-line-chart'></i> William Hill</h3>
                            <div class="custom-radar-odds-grid">
                                ${odds.map(item => `
                                    <div class="custom-radar-odd">
                                        <span>${this.escapeHtml(item.label)}</span>
                                        <strong>${this.escapeHtml(item.value)}</strong>
                                    </div>
                                `).join('') || '<p class="custom-radar-muted">Odds indisponiveis para este evento.</p>'}
                            </div>
                        </div>
                    ` : ''}

                    ${settings.showMeta ? `
                        <div class="custom-radar-card">
                            <h3><i class='bx bx-fingerprint'></i> Fontes</h3>
                            <dl class="custom-radar-meta">
                                <dt>Event ID</dt><dd>${this.escapeHtml(event.id || '-')}</dd>
                                <dt>WH Entity</dt><dd>${this.escapeHtml(event.rawEntityId || '-')}</dd>
                                <dt>ID Bolsa</dt><dd>${this.escapeHtml(idBolsa || '-')}</dd>
                                <dt>Sofascore</dt><dd>${this.escapeHtml(event.sofascoreId || '-')}</dd>
                                <dt>365Scores</dt><dd>${this.escapeHtml(event.scores365PartnerId || event.matchId || '-')}</dd>
                            </dl>
                        </div>
                    ` : ''}

                    <div class="custom-radar-links">
                        ${sportUrl ? `<a href="${this.escapeHtml(sportUrl)}" target="_blank"><i class='bx bx-world'></i> Widget mRadar</a>` : ''}
                        <a href="${this.escapeHtml(whUrl)}" target="_blank"><i class='bx bx-crosshair'></i> WRadar original</a>
                        ${packUrl ? `<a href="${this.escapeHtml(packUrl)}" target="_blank"><i class='bx bx-football'></i> Packball</a>` : ''}
                    </div>
                </aside>
            </div>
        `;
        this.restoreCustomRadarCommentScroll(previousScroll);
    },

    renderCustomRadarPitch(event, state, lastComment = null) {
        const hash = this.hashText(`${event.id}:${event.name}:${state.minute}:${state.homeScore}:${state.awayScore}:${lastComment?.comment || ''}`);
        const homePressure = Math.max(8, Math.min(92, state.homePressure));
        const awayPressure = 100 - homePressure;
        const commentText = this.normalizeMatchText(lastComment?.comment || '');
        const isAway = lastComment?.side === 'away';
        const isHome = lastComment?.side === 'home';
        const isAttack = commentText.includes('ataque') || commentText.includes('attack');
        const isDefense = commentText.includes('defesa') || commentText.includes('defence');
        const isGoalKick = commentText.includes('tiro de meta') || commentText.includes('goal kick');
        let ballX = 12 + (homePressure * 0.76);
        if (isAttack && isHome) ballX = 74;
        if (isAttack && isAway) ballX = 26;
        if (isDefense && isHome) ballX = 24;
        if (isDefense && isAway) ballX = 76;
        if (isGoalKick && isHome) ballX = 14;
        if (isGoalKick && isAway) ballX = 86;
        const ballY = 22 + ((hash % 57));
        const homePulse = homePressure >= 52 ? 'is-strong' : '';
        const awayPulse = awayPressure >= 52 ? 'is-strong' : '';

        return `
            <div class="custom-radar-pitch">
                <div class="custom-radar-sweep"></div>
                <div class="custom-radar-half home ${homePulse}" style="--pressure:${homePressure}%"></div>
                <div class="custom-radar-half away ${awayPulse}" style="--pressure:${awayPressure}%"></div>
                <div class="custom-radar-midline"></div>
                <div class="custom-radar-box left"></div>
                <div class="custom-radar-box right"></div>
                <div class="custom-radar-center"></div>
                <div class="custom-radar-ball" style="left:${ballX.toFixed(1)}%;top:${ballY.toFixed(1)}%;"></div>
                <div class="custom-radar-pressure home">
                    <span>Casa</span>
                    <strong>${Math.round(homePressure)}%</strong>
                </div>
                <div class="custom-radar-pressure away">
                    <span>Fora</span>
                    <strong>${Math.round(awayPressure)}%</strong>
                </div>
            </div>
        `;
    },

    getCustomRadarLastComment(realData) {
        const item = realData?.commentaries?.[0];
        if (!item) return null;
        const time = item.minute || item.seconds
            ? `${item.minute || ''}${item.seconds || ''}`
            : '';
        return {
            ...item,
            time: time || item.all?.match(/\d{1,3}'\d{0,2}/)?.[0] || ''
        };
    },

    getCustomRadarFocusedComment(realData) {
        const items = Array.isArray(realData?.commentaries) ? realData.commentaries : [];
        if (!this.customWRadarPinnedCommentKey && !Number.isInteger(this.customWRadarPinnedCommentIndex)) return null;
        const item = items.find(entry => this.getCustomRadarCommentKey(entry) === this.customWRadarPinnedCommentKey)
            || items.find(entry => Number(entry.index) === this.customWRadarPinnedCommentIndex);
        if (!item) return null;
        const time = item.minute || item.seconds
            ? `${item.minute || ''}${item.seconds || ''}`
            : '';
        return {
            ...item,
            time: time || item.all?.match(/\d{1,3}'\d{0,2}/)?.[0] || ''
        };
    },

    pinCustomRadarEvent(index, key = '') {
        const nextIndex = Number(index);
        if (!Number.isFinite(nextIndex)) return;
        this.customWRadarPinnedCommentIndex = nextIndex;
        this.customWRadarPinnedCommentKey = String(key || '');
        if (this.customWRadarEvent) this.renderCustomWRadarMod(this.customWRadarEvent);
    },

    clearCustomRadarPinnedEvent() {
        this.customWRadarPinnedCommentIndex = null;
        this.customWRadarPinnedCommentKey = '';
        if (this.customWRadarEvent) this.renderCustomWRadarMod(this.customWRadarEvent);
    },

    getCustomRadarCommentKey(item) {
        if (!item) return '';
        return [
            item.minute || '',
            item.seconds || '',
            this.normalizeCustomRadarCommentText(item.comment || item.all || '')
        ].join('|');
    },

    getCustomRadarTeamAbbr(name) {
        const cleanName = String(name || '').replace(/\s+/g, ' ').trim();
        if (!cleanName) return '---';
        const tokens = cleanName
            .replace(/\b(fc|cf|sc|ac|ec|afc|club|de|do|da|the)\b/gi, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        const source = tokens.length ? tokens.join(' ') : cleanName;
        if (tokens.length >= 2) {
            return tokens.slice(0, 3).map(token => token[0]).join('').toUpperCase().slice(0, 3);
        }
        return source.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || '---';
    },

    restoreCustomRadarCommentScroll(previousScroll) {
        if (!previousScroll?.keepPosition) return;
        const list = document.querySelector('#custom-wradar-content .custom-radar-comment-list');
        if (!list) return;
        const heightDelta = Math.max(0, list.scrollHeight - previousScroll.height);
        list.scrollTop = previousScroll.top + heightDelta;
    },

    markCustomRadarListInteraction() {
        this.customRadarListInteractingUntil = Date.now() + 900;
    },

    shouldDeferCustomRadarRender() {
        const list = document.querySelector('#custom-wradar-content .custom-radar-comment-list');
        if (!list) return false;
        return Date.now() < Number(this.customRadarListInteractingUntil || 0);
    },

    scheduleCustomRadarDeferredRender() {
        clearTimeout(this.customWRadarDeferredRenderTimer);
        this.customWRadarDeferredRenderTimer = setTimeout(() => {
            if (!this.customWRadarEvent) return;
            if (this.shouldDeferCustomRadarRender()) {
                this.scheduleCustomRadarDeferredRender();
                return;
            }
            this.renderCustomWRadarMod(this.customWRadarEvent);
        }, 950);
    },

    openCustomRadarDesktopHighlight() {
        if (window.traderDesktopHighlight?.startSelection) {
            window.traderDesktopHighlight.startSelection();
            return;
        }
        this.showToast?.('Destaque disponivel apenas no app desktop.', 'warning');
    },

    normalizeCustomRadarCommentText(text) {
        const value = String(text || '').replace(/\s+/g, ' ').trim();
        if (!value) return '';
        return value
            .replace(/(Intervalo)(?:\s*Intervalo)+/gi, '$1')
            .replace(/(Half Time)(?:\s*Half Time)+/gi, '$1');
    },

    getCustomRadarEventType(item) {
        const text = this.normalizeMatchText(`${item?.comment || ''} ${item?.all || ''} ${item?.className || ''}`);
        if (!text) return 'neutral';
        if (text.includes('tiro de meta') || text.includes('goal kick')) return 'goal-kick';
        if (text.includes('gol') || text.includes('goal')) return 'goal';
        if (text.includes('ataque perigoso') || text.includes('dangerous attack')) return 'dangerous';
        if (text.includes('escanteio') || text.includes('corner')) return 'corner';
        if (text.includes('cartao amarelo') || text.includes('yellow card')) return 'yellow-card';
        if ((text.includes('possivel') || text.includes('possible')) && (text.includes('cartao vermelho') || text.includes('red card'))) return 'possible-red-card';
        if (text.includes('cartao vermelho') || text.includes('red card')) return 'red-card';
        if (text.includes('cartao') || text.includes('card')) return 'yellow-card';
        if (text.includes('remate certeiro') || text.includes('chute gol') || text.includes('chutes gol') || text.includes('shot on target') || text.includes('on target')) return 'shot-on-target';
        if (text.includes('remate') || text.includes('chute') || text.includes('shot')) return 'shot';
        if (text.includes('defesa') || text.includes('defence') || text.includes('defense')) return 'defense';
        if (text.includes('ataque') || text.includes('attack')) return 'attack';
        if (text.includes('posse') || text.includes('controle de meio campo') || text.includes('control')) return 'control';
        if (text.includes('falta') || text.includes('free kick')) return 'foul';
        return 'neutral';
    },

    renderCustomRadarEventIcon(item) {
        const type = this.getCustomRadarEventType(item);
        const side = item?.side === 'away' ? 'away' : (item?.side === 'home' ? 'home' : '');
        const iconMap = {
            goal: 'bx-football',
            dangerous: 'bxs-bolt-circle',
            attack: side === 'away' ? 'bx-left-arrow-alt' : 'bx-right-arrow-alt',
            defense: 'bx-shield-quarter',
            'shot-on-target': 'bx-target-lock',
            shot: 'bx-target-lock',
            'goal-kick': 'bx-log-out',
            corner: 'bxs-flag-alt',
            'yellow-card': 'bx-square',
            'possible-red-card': 'bx-error',
            'red-card': 'bx-square',
            control: 'bx-transfer-alt',
            foul: 'bx-square',
            neutral: 'bx-radio-circle'
        };
        return `<i class='custom-radar-event-icon ${this.escapeHtml(type)} ${this.escapeHtml(side)} bx ${iconMap[type] || iconMap.neutral}'></i>`;
    },

    renderCustomRadarCommentaries(realData) {
        const items = Array.isArray(realData?.commentaries) ? realData.commentaries : [];
        const focusedKey = this.getCustomRadarCommentKey(this.getCustomRadarFocusedComment(realData) || this.getCustomRadarLastComment(realData));
        const visibleItems = focusedKey ? items.filter(item => this.getCustomRadarCommentKey(item) !== focusedKey) : items;
        if (!visibleItems.length) {
            return `
                <div class="custom-radar-comment-list is-empty">
                    <div><i class='bx bx-loader-alt bx-spin'></i> Aguardando comentarios do scoreboard...</div>
                </div>
            `;
        }

        return `
            <div class="custom-radar-comment-list" onscroll="AnalisePro.markCustomRadarListInteraction()" onwheel="AnalisePro.markCustomRadarListInteraction()" onpointerdown="AnalisePro.markCustomRadarListInteraction()" onpointermove="AnalisePro.markCustomRadarListInteraction()">
                ${visibleItems.map(item => {
                    const time = item.minute || item.seconds ? `${item.minute || ''}${item.seconds || ''}` : '';
                    const sideClass = item.side || '';
                    const text = this.normalizeCustomRadarCommentText(item.comment || item.all || '-');
                    const type = this.getCustomRadarEventType(item);
                    const key = this.getCustomRadarCommentKey(item);
                    const encodedKey = encodeURIComponent(key);
                    const isPinned = key === this.customWRadarPinnedCommentKey || Number(item.index) === Number(this.customWRadarPinnedCommentIndex);
                    return `
                        <button type="button" class="custom-radar-comment ${sideClass} ${this.escapeHtml(type)} ${isPinned ? 'is-pinned' : ''}" onclick="AnalisePro.pinCustomRadarEvent(${Number(item.index)}, decodeURIComponent('${encodedKey}'))" title="Destacar este lance">
                            <span>${this.escapeHtml(time || '--')}</span>
                            ${this.renderCustomRadarEventIcon(item)}
                            <strong>${this.escapeHtml(text || '-')}</strong>
                            <i class='bx ${isPinned ? 'bxs-pin' : 'bx-pin'}'></i>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderCustomRadarStats(realData) {
        const stats = realData?.stats || {};
        const rows = [
            ['corners', 'Escanteios', 'bxs-flag-alt'],
            ['cards', 'Cartoes', 'bxs-card'],
            ['freeKicks', 'Faltas', 'bx-group'],
            ['goalKicks', 'Tiros meta', 'bx-log-out'],
            ['dangerousAttacks', 'Ataques perigosos', 'bxs-bolt-circle'],
            ['shotsOnTarget', 'Chutes gol', 'bx-target-lock'],
            ['shotsOffTarget', 'Chutes fora', 'bx-crosshair'],
            ['possession', 'Posse', 'bx-pie-chart-alt-2']
        ].map(([key, label, icon]) => ({
            key,
            label,
            icon,
            home: stats[key]?.home || '--',
            away: stats[key]?.away || '--'
        }));

        return `
            <div class="custom-radar-stats-grid">
                ${rows.map(row => `
                    <div class="custom-radar-stat" title="${this.escapeHtml(row.label)}">
                        <span>${this.escapeHtml(row.home)}</span>
                        <strong><i class='bx ${this.escapeHtml(row.icon)}'></i></strong>
                        <span>${this.escapeHtml(row.away)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderCustomRadarTeamLogo(team, fallbackName) {
        const teamId = team?.a;
        const label = this.escapeHtml(this.getTeamInitials(team?.b || fallbackName || ''));
        if (!teamId) return `<span class="custom-radar-logo-fallback">${label}</span>`;
        return `<img class="custom-radar-logo" src="${this.escapeHtml(this.get365TeamLogoUrl(teamId))}" alt="${this.escapeHtml(team?.b || fallbackName || '')}" onerror="this.outerHTML='<span class=&quot;custom-radar-logo-fallback&quot;>${label}</span>'">`;
    },

    getCustomRadarState(event, score) {
        const odds = event.odds || {};
        const homeOdd = Number(odds.home?.value || odds[0] || 0);
        const awayOdd = Number(odds.away?.value || odds[2] || 0);
        const homeScore = Number(score?.home || 0);
        const awayScore = Number(score?.away || 0);
        const minute = Number(event.timeElapsed || event.minute || 0);
        const favoriteTilt = homeOdd && awayOdd ? (awayOdd - homeOdd) * 5 : 0;
        const scoreTilt = (homeScore - awayScore) * 8;
        const liveTilt = event.whInPlay ? 4 : 0;
        const homePressure = 50 + favoriteTilt + scoreTilt + liveTilt;
        const periodMap = {
            IP: 'Ao vivo',
            FIRST_HALF: '1T',
            SECOND_HALF: '2T',
            HT: 'Intervalo',
            FT: 'Encerrado'
        };

        return {
            minute,
            homeScore,
            awayScore,
            homePressure,
            periodLabel: minute ? `${minute}'` : (periodMap[event.period] || event.period || (event.whInPlay ? 'Ao vivo' : 'Pre-live'))
        };
    },

    normalizeCustomRadarOdds(odds) {
        if (!odds) return [];
        if (Array.isArray(odds)) {
            return [
                { label: 'Casa', value: odds[0] || '-' },
                { label: 'Empate', value: odds[1] || '-' },
                { label: 'Fora', value: odds[2] || '-' }
            ].filter(item => item.value !== '-');
        }

        const map = [
            ['Casa', odds.home],
            ['Empate', odds.draw],
            ['Fora', odds.away],
            ['Over 2.5', odds.over25],
            ['Under 2.5', odds.under25],
            ['Ambas Sim', odds.bothTeamsToScoreYes],
            ['Ambas Nao', odds.bothTeamsToScoreNo],
            ['CS 0-1', odds.cs_0_1],
            ['CS 1-0', odds.cs_1_0]
        ];

        return map
            .map(([label, item]) => ({ label, value: item?.value ?? item ?? '' }))
            .filter(item => item.value !== '' && item.value !== null && item.value !== undefined);
    },

    async refreshCustomWRadarMod() {
        if (!this.customWRadarGameInfo) return;
        this.wradarCache = null;
        await this.openCustomWRadarMod(this.customWRadarGameInfo);
    },

    toggleCustomWRadarTheme() {
        const settings = this.getCustomRadarSettings();
        const next = settings.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('custom_wradar_mod_theme', next);
        if (this.customWRadarEvent) this.renderCustomWRadarMod(this.customWRadarEvent);
    },

    toggleCustomRadarOption(option) {
        const settings = this.getCustomRadarSettings();
        const keys = {
            showMeta: 'custom_wradar_mod_show_meta',
            showOdds: 'custom_wradar_mod_show_odds',
            showHeatmap: 'custom_wradar_mod_heatmap_mode'
        };
        const key = keys[option] || keys.showOdds;
        if (option === 'showHeatmap') {
            const nextMode = settings.showHeatmap ? 'off' : 'match';
            localStorage.setItem(key, nextMode);
            localStorage.setItem('custom_wradar_mod_show_heatmap', nextMode === 'off' ? '0' : '1');
        } else {
            localStorage.setItem(key, settings[option] ? '0' : '1');
        }
        if (this.customWRadarEvent) this.renderCustomWRadarMod(this.customWRadarEvent);
    },

    closeCustomWRadarMod() {
        if (this.customWRadarFeedId && window.traderWRadarRealMod?.stopFeed) {
            window.traderWRadarRealMod.stopFeed(this.customWRadarFeedId).catch(() => {});
        }
        clearTimeout(this.customWRadarDeferredRenderTimer);
        this.customWRadarFeedId = '';
        this.customWRadarRealData = null;
        const modal = document.getElementById('custom-wradar-mod');
        if (modal) modal.classList.remove('is-open');
    },

    async resolveWRadarUrl(gameInfo, type = 'radar') {
        const events = await this.fetchWRadarEvents();
        const event = this.findWRadarEvent(events, gameInfo);
        if (!event) throw new Error('Jogo não encontrado no WRadar para este Sofascore ID.');

        const url = this.buildWRadarUrl(event, type);
        if (!url) throw new Error('Este jogo não possui o link solicitado no WRadar.');
        return url;
    },

    async openWRadarForGame(gameInfo, type = 'radar') {
        const popup = window.open('', `WRadar_${type}_${gameInfo.sofascoreId}`, 'width=1180,height=820,scrollbars=yes,resizable=yes');
        if (popup) {
            popup.document.write('<html><head><title>Localizando WRadar...</title></head><body style="font-family:Arial,sans-serif;background:#0b1220;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Localizando jogo no WRadar...</h2><p>Aguarde alguns segundos.</p></div></body></html>');
        }

        try {
            const url = await this.resolveWRadarUrl(gameInfo, type);
            if (popup) popup.location.href = url;
            else window.open(url, '_blank');
        } catch (error) {
            const fallbackSearch = `https://wradar.com.br/?q=${encodeURIComponent(`${gameInfo.home} ${gameInfo.away}`)}`;
            if (popup) {
                popup.document.body.innerHTML = `<div style="font-family:Arial,sans-serif;background:#0b1220;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center;"><div><h2>Não consegui localizar automaticamente</h2><p>${error.message}</p><a href="${fallbackSearch}" style="color:#10b981;font-weight:700;">Abrir WRadar para buscar manualmente</a></div></div>`;
            } else {
                alert(error.message);
            }
        }
    },

    async resolve365ScoresMatchUrl(gameInfo) {
        const baseUrl = 'https://www.365scores.com/pt-br';
        const urls = [
            baseUrl,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(baseUrl)}`
        ];
        const home = this.normalizeMatchText(gameInfo.home);
        const away = this.normalizeMatchText(gameInfo.away);

        for (const url of urls) {
            try {
                const response = await fetch(url, { cache: 'no-store' });
                if (!response.ok) continue;
                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const links = Array.from(doc.querySelectorAll('a[href*="/football/match/"]'));
                const found = links.find(link => {
                    const text = this.normalizeMatchText(`${link.textContent || ''} ${link.getAttribute('href') || ''}`);
                    return text.includes(home) && text.includes(away);
                });

                if (found) {
                    const href = found.getAttribute('href');
                    return href.startsWith('http') ? href : `https://www.365scores.com${href}`;
                }
            } catch (error) {
                console.warn('Falha ao localizar jogo no 365Scores:', error);
            }
        }

        return null;
    },

    async open365ScoresForGame(gameInfo) {
        const searchText = `${gameInfo.home || ''} ${gameInfo.away || ''}`.trim();
        const popup = window.open('', `Scores365_${gameInfo.sofascoreId}`, 'width=1180,height=820,scrollbars=yes,resizable=yes');

        if (popup) {
            popup.document.write('<html><head><title>Localizando 365Scores...</title></head><body style="font-family:Arial,sans-serif;background:#0b1220;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Localizando jogo no 365Scores...</h2><p>Abrindo a página onde fica o radar ao vivo.</p></div></body></html>');
        }

        try {
            await navigator.clipboard.writeText(searchText);
        } catch (_) {}

        const matchUrl = await this.resolve365ScoresMatchUrl(gameInfo);
        const url = matchUrl || `https://www.365scores.com/pt-br/search?q=${encodeURIComponent(searchText)}`;
        if (popup) popup.location.href = url;
        else window.open(url, '_blank');
    },

    normalizeText(value) {
        if (typeof App !== 'undefined' && App.normalizeMatchName) {
            return App.normalizeMatchName(value);
        }
        return (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    },

    escapeHtml(value) {
        if (typeof App !== 'undefined' && App.escapeHtml) return App.escapeHtml(value);
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    },

    escapeAttr(value) {
        return this.escapeHtml(String(value ?? '')).replace(/`/g, '&#096;');
    },

    getTheoBorgesSourceUrl() {
        return localStorage.getItem('theo_borges_source_url') || this.theoBorgesDefaultSourceUrl || '';
    },

    setTheoBorgesSourceUrl(url) {
        const cleanUrl = String(url || '').trim();
        if (cleanUrl) localStorage.setItem('theo_borges_source_url', cleanUrl);
        return cleanUrl;
    },

    ensureCalendarCacheVersion() {
        const current = localStorage.getItem('pro_calendar_cache_version');
        if (current === this.calendarCacheVersion) return;
        localStorage.removeItem('pro_games_cache_history');
        localStorage.removeItem(this.calendarGamesCacheStorageKey);
        localStorage.removeItem('pro_calendar_sofascore_games_cache_v1');
        localStorage.setItem('pro_calendar_cache_version', this.calendarCacheVersion);
        this.gamesCacheDate = '';
        this.gamesCacheAt = 0;
    },

    dateKeyToTheoDay(dateKey) {
        const today = this.getTodayKey();
        const base = new Date(`${today}T12:00:00`);
        const target = new Date(`${dateKey}T12:00:00`);
        const diff = Math.round((target - base) / 86400000);
        const map = {
            [-1]: 'ontem',
            0: 'hoje',
            1: 'amanha',
            2: 'depois',
            3: 'tresdias',
            4: 'quatrodias'
        };
        return map[diff] || 'hoje';
    },

    async getTheoBorgesMatchesForDate(dateKey) {
        if (!window.traderTheoBorgesData?.matches) {
            throw new Error('Integração Theo Borges indisponível nesta versão.');
        }

        let sourceUrl = this.getTheoBorgesSourceUrl();
        if (!sourceUrl) {
            const error = new Error('THEO_CONFIG_REQUIRED');
            error.code = 'THEO_CONFIG_REQUIRED';
            throw error;
        }

        const day = this.dateKeyToTheoDay(dateKey);
        const cacheKey = `${day}|${sourceUrl}`;
        const cached = this.theoBorgesMatchesCache[cacheKey];
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) return cached.data;

        const data = await window.traderTheoBorgesData.matches({ url: sourceUrl, day });
        this.theoBorgesMatchesCache[cacheKey] = { timestamp: Date.now(), data };
        return data;
    },

    async enrichTheoInfoAvailability(games) {
        if (!Array.isArray(games) || !games.length || !window.traderTheoBorgesData?.matches) return games || [];

        const dates = [...new Set(games.map(game => this.getLocalDateKey(game.startTimestamp)).filter(Boolean))];
        const matchesByDate = {};

        for (const dateKey of dates) {
            try {
                const list = await this.withTimeout(this.getTheoBorgesMatchesForDate(dateKey), 7000, null);
                matchesByDate[dateKey] = Array.isArray(list?.matches) ? list.matches : [];
            } catch (_) {
                matchesByDate[dateKey] = [];
            }
        }

        return games.map(game => {
            const dateKey = this.getLocalDateKey(game.startTimestamp);
            const match = this.findTheoMatchForGame(game, matchesByDate[dateKey] || []);
            return {
                ...game,
                theoInfoAvailable: Boolean(match?.detailUrl),
                theoInfoDetailUrl: match?.detailUrl || ''
            };
        });
    },

    getTheoGameCacheKey(game) {
        const dateKey = this.getLocalDateKey(game.startTimestamp);
        return `${dateKey}|${this.normalizeMatchText(game.homeTeam?.name)}|${this.normalizeMatchText(game.awayTeam?.name)}`;
    },

    scoreTheoMatch(calendarGame, theoMatch) {
        const home = this.normalizeMatchText(calendarGame.homeTeam?.name);
        const away = this.normalizeMatchText(calendarGame.awayTeam?.name);
        const theoHome = this.normalizeMatchText(theoMatch.home?.name);
        const theoAway = this.normalizeMatchText(theoMatch.away?.name);
        if (!home || !away || !theoHome || !theoAway) return 0;
        let score = 0;
        if (home === theoHome) score += 5;
        if (away === theoAway) score += 5;
        if (home === theoAway) score += 2;
        if (away === theoHome) score += 2;
        if (theoHome.includes(home) || home.includes(theoHome)) score += 2;
        if (theoAway.includes(away) || away.includes(theoAway)) score += 2;
        const gameLeague = this.normalizeMatchText(calendarGame.tournament?.name || '');
        const theoLeague = this.normalizeMatchText(theoMatch.league || '');
        if (gameLeague && theoLeague && (gameLeague.includes(theoLeague) || theoLeague.includes(gameLeague))) score += 1;
        return score;
    },

    findTheoMatchForGame(calendarGame, theoMatches) {
        const ranked = (theoMatches || [])
            .map(match => ({ match, score: this.scoreTheoMatch(calendarGame, match) }))
            .sort((a, b) => b.score - a.score);
        return ranked[0]?.score >= 8 ? ranked[0].match : null;
    },

    async loadTheoInfoForGame(game) {
        const cacheKey = this.getTheoGameCacheKey(game);
        const cached = this.theoBorgesDetailsCache[cacheKey];
        if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) return cached.data;

        let detailUrl = game?.theoInfoDetailUrl || '';
        if (!detailUrl) {
            const dateKey = this.getLocalDateKey(game.startTimestamp);
            const list = await this.getTheoBorgesMatchesForDate(dateKey);
            const match = this.findTheoMatchForGame(game, list.matches);
            detailUrl = match?.detailUrl || '';
        }

        if (!detailUrl) {
            throw new Error('Não encontrei este jogo no Theo Borges para a data selecionada.');
        }

        const detail = await window.traderTheoBorgesData.game({ url: detailUrl });
        const data = { ...detail, listMatch: { detailUrl } };
        this.theoBorgesDetailsCache[cacheKey] = { timestamp: Date.now(), data };
        return data;
    },

    ensureTheoInfoModal() {
        let modal = document.getElementById('theo-info-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'theo-info-modal';
            document.body.appendChild(modal);
        }
        return modal;
    },

    async openTheoInfo(gamePayload) {
        const game = typeof gamePayload === 'string' ? JSON.parse(decodeURIComponent(gamePayload)) : gamePayload;
        this.theoInfoPendingGame = game;
        this.theoInfoActiveTab = 'resumo';
        const modal = this.ensureTheoInfoModal();
        modal.className = 'theo-info-modal is-open';
        modal.innerHTML = this.renderTheoInfoShell({ loading: true, game });

        try {
            const data = await this.loadTheoInfoForGame(game);
            this.theoInfoCurrentData = data;
            modal.innerHTML = this.renderTheoInfoShell({ data, game });
        } catch (error) {
            this.theoInfoCurrentData = null;
            modal.innerHTML = this.renderTheoInfoShell({ error: error?.code || error?.message || String(error), game });
        }
    },

    saveTheoBorgesSourceFromModal() {
        const input = document.getElementById('theo-info-source-url');
        const url = this.setTheoBorgesSourceUrl(input?.value || '');
        if (!url) return;
        this.theoBorgesMatchesCache = {};
        this.theoBorgesDetailsCache = {};
        if (this.theoInfoPendingGame) {
            this.openTheoInfo(this.theoInfoPendingGame);
        }
    },

    closeTheoInfo() {
        const modal = document.getElementById('theo-info-modal');
        if (modal) modal.classList.remove('is-open');
        this.theoInfoCurrentData = null;
    },

    setTheoInfoTab(tab) {
        this.theoInfoActiveTab = tab || 'resumo';
        const modal = document.getElementById('theo-info-modal');
        if (modal && this.theoInfoCurrentData) modal.innerHTML = this.renderTheoInfoShell({ data: this.theoInfoCurrentData });
    },

    renderTheoInfoShell({ loading = false, error = '', data = null, game = null } = {}) {
        const match = data?.match || {};
        const displayGame = game || {
            homeTeam: { name: match.home?.name || 'Mandante' },
            awayTeam: { name: match.away?.name || 'Visitante' }
        };
        const homeName = match.home?.name || displayGame.homeTeam?.name || 'Mandante';
        const awayName = match.away?.name || displayGame.awayTeam?.name || 'Visitante';
        const cacheKey = game ? this.getTheoGameCacheKey(game) : '';
        const tabs = [
            ['resumo', 'Resumo', 'bx-pulse'],
            ['forma', 'Forma', 'bx-history'],
            ['estatisticas', 'Estatísticas', 'bx-table'],
            ['jogadores', 'Jogadores', 'bx-user']
        ];

        const body = loading
            ? `<div class="theo-info-loading"><i class='bx bx-loader-alt bx-spin'></i><strong>Buscando informações...</strong></div>`
            : error
                ? this.renderTheoInfoError(error)
                : this.renderTheoInfoTab(data);

        return `
            <div class="theo-info-backdrop" onclick="AnalisePro.closeTheoInfo()"></div>
            <section class="theo-info-panel" role="dialog" aria-modal="true" data-cache-key="${this.escapeAttr(cacheKey)}">
                <header class="theo-info-head">
                    <div class="theo-info-title">
                        <span>INFO</span>
                        <strong>${this.escapeHtml(homeName)} <em>x</em> ${this.escapeHtml(awayName)}</strong>
                        <small>${this.escapeHtml(match.competition || displayGame.tournament?.name || '')}${match.time ? ` · ${this.escapeHtml(match.time)}` : ''}${match.date ? ` · ${this.escapeHtml(match.date)}` : ''}</small>
                    </div>
                    <button type="button" onclick="AnalisePro.closeTheoInfo()" title="Fechar"><i class='bx bx-x'></i></button>
                </header>
                ${!loading && !error ? `<nav class="theo-info-tabs">${tabs.map(([id, label, icon]) => `
                    <button type="button" class="${this.theoInfoActiveTab === id ? 'active' : ''}" onclick="AnalisePro.setTheoInfoTab('${id}')"><i class='bx ${icon}'></i>${label}</button>
                `).join('')}</nav>` : ''}
                <div class="theo-info-body">${body}</div>
            </section>
        `;
    },

    renderTheoInfoError(error) {
        const needsConfig = error === 'THEO_CONFIG_REQUIRED';
        const message = needsConfig
            ? 'Cole o link do Theo Borges com o token t=... para ativar o INFO.'
            : error;
        return `
            <div class="theo-info-error">
                <i class='bx bx-error-circle'></i>
                <strong>${this.escapeHtml(message)}</strong>
                <div class="theo-info-config">
                    <input id="theo-info-source-url" type="text" value="${this.escapeAttr(this.getTheoBorgesSourceUrl())}" placeholder="https://clube.theoborges.com/matches?dia=hoje&t=...">
                    <button onclick="AnalisePro.saveTheoBorgesSourceFromModal()">Salvar e buscar</button>
                </div>
                ${!needsConfig ? `<button onclick="localStorage.removeItem('theo_borges_source_url'); AnalisePro.theoInfoPendingGame && AnalisePro.openTheoInfo(AnalisePro.theoInfoPendingGame)">Reconfigurar link</button>` : ''}
            </div>
        `;
    },

    renderTheoInfoTab(data) {
        if (!data) return '';
        const tab = this.theoInfoActiveTab || 'resumo';
        if (tab === 'forma') return this.renderTheoForm(data);
        if (tab === 'estatisticas') return this.renderTheoStats(data);
        if (tab === 'jogadores') return this.renderTheoPlayers(data);
        return this.renderTheoSummary(data);
    },

    renderTheoSummary(data) {
        const table = data.tables?.find(item => item.title === 'Aproveitamento Geral') || data.tables?.[0];
        return `
            <div class="theo-info-grid">
                ${this.renderTheoTrends(data.trends)}
                ${this.renderTheoTable(table, 'theo-info-card wide')}
                ${this.renderTheoLeaderboard(data.leaderboards?.[0], 'theo-info-card')}
            </div>
        `;
    },

    renderTheoTrends(trends = []) {
        if (!trends.length) return `<article class="theo-info-card"><h3>Tendências</h3><p>Sem tendências disponíveis.</p></article>`;
        return `<article class="theo-info-card"><h3><i class='bx bx-trending-up'></i>Tendências</h3>${trends.map(team => `
            <div class="theo-trend-team">
                <strong>${team.logo ? `<img src="${this.escapeHtml(team.logo)}" alt="">` : ''}${this.escapeHtml(team.team)}</strong>
                ${team.items.map(item => `<div><span>${this.escapeHtml(item.label)}</span><b>${this.escapeHtml(item.value)}</b></div>`).join('')}
            </div>
        `).join('')}</article>`;
    },

    renderTheoTable(table, className = 'theo-info-card') {
        if (!table) return `<article class="${className}"><h3>Estatísticas</h3><p>Sem dados disponíveis.</p></article>`;
        return `<article class="${className}"><h3>${this.escapeHtml(table.title)}</h3><div class="theo-stat-table">
            ${table.rows.map(row => `<div><b>${this.escapeHtml(row.home)}</b><span>${this.escapeHtml(row.label)}</span><b>${this.escapeHtml(row.away)}</b></div>`).join('')}
        </div></article>`;
    },

    renderTheoStats(data) {
        return `<div class="theo-info-grid stats-grid">${(data.tables || []).map(table => this.renderTheoTable(table)).join('')}</div>`;
    },

    renderTheoForm(data) {
        const renderTeam = (side, items = []) => `<article class="theo-info-card wide"><h3>${this.escapeHtml(side)}</h3><div class="theo-form-row">
            ${items.slice(0, 10).map(item => `<div class="theo-form-game ${this.escapeHtml(item.class || item.result || '')}">
                <img src="${this.escapeHtml(item.opponent_image || '')}" alt="" onerror="this.style.display='none'">
                <span>${this.escapeHtml(item.abbr || item.opponent_name || '')}</span>
                <strong>${this.escapeHtml(item.score || '-')}</strong>
                <em>${this.escapeHtml(({ win: 'V', draw: 'E', loss: 'D' }[item.result] || item.result || '-'))}</em>
            </div>`).join('')}
        </div></article>`;
        return `<div class="theo-info-grid">${renderTeam(data.match?.home?.name || 'Mandante', data.recentForm?.home)}${renderTeam(data.match?.away?.name || 'Visitante', data.recentForm?.away)}</div>`;
    },

    renderTheoLeaderboard(board, className = 'theo-info-card') {
        if (!board) return `<article class="${className}"><h3>Jogadores</h3><p>Sem dados disponíveis.</p></article>`;
        const metricHeaders = (board.headers || []).slice(1);
        return `<article class="${className}"><h3>${this.escapeHtml(board.title)}</h3><div class="theo-player-list">
            ${(board.rows || []).map(player => `<div class="theo-player-row">
                <img src="${this.escapeHtml(player.avatar || '')}" alt="" onerror="this.style.display='none'">
                <div><strong>${this.escapeHtml(player.name)}</strong><span>${this.escapeHtml(player.team || '')}</span></div>
                ${metricHeaders.map(header => `<b title="${this.escapeHtml(header)}">${this.escapeHtml(player.metrics?.[header] || '-')}</b>`).join('')}
            </div>`).join('')}
        </div></article>`;
    },

    renderTheoPlayers(data) {
        return `<div class="theo-info-grid players-grid">${(data.leaderboards || []).map(board => this.renderTheoLeaderboard(board)).join('')}</div>`;
    },

    summarizeTrades(trades) {
        const profit = trades.reduce((sum, trade) => sum + (trade.netProfit || 0), 0);
        const wins = trades.filter(trade => (trade.netProfit || 0) > 0).length;
        const losses = trades.filter(trade => (trade.netProfit || 0) < 0).length;
        const winrate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
        return { count: trades.length, profit, wins, losses, winrate };
    },

    getGameHistorySignals(game, selectedMethod = '') {
        if (typeof App === 'undefined' || !Array.isArray(App.data)) return [];

        const history = App.data.filter(item => !item.isDepositOrWithdrawal);
        if (history.length === 0) return [];

        const currentTeams = [
            game.homeTeam?.name || '',
            game.awayTeam?.name || ''
        ].map(name => this.normalizeText(name)).filter(Boolean);

        const tournamentName = game.tournament?.name || '';
        const normalizedTournament = this.normalizeText(
            App.canonicalLeagueName ? App.canonicalLeagueName(tournamentName) : tournamentName
        );

        const teamTrades = history.filter(trade => {
            const teams = App.parseGameTeams ? App.parseGameTeams(trade.game) : (trade.game || '').split(' x ');
            return teams.some(team => currentTeams.includes(this.normalizeText(team)));
        });

        const leagueTrades = history.filter(trade => {
            const league = App.detectLeague ? App.detectLeague(trade.game, trade.dateStr) : '';
            return league && this.normalizeText(league) === normalizedTournament;
        });

        const methodTrades = selectedMethod
            ? history.filter(trade => this.normalizeText(trade.userMethod || trade.method) === this.normalizeText(selectedMethod))
            : [];

        const profileMethodTrades = leagueTrades.length > 0
            ? leagueTrades.filter(trade => trade.userMethod)
            : teamTrades.filter(trade => trade.userMethod);

        const methodGroups = {};
        profileMethodTrades.forEach(trade => {
            const method = trade.userMethod;
            if (!methodGroups[method]) methodGroups[method] = [];
            methodGroups[method].push(trade);
        });

        const bestProfileMethod = Object.entries(methodGroups)
            .map(([method, trades]) => ({ method, ...this.summarizeTrades(trades) }))
            .filter(item => item.count >= 3 && item.profit > 0)
            .sort((a, b) => b.profit - a.profit)[0];

        const signals = [];
        const teamStats = this.summarizeTrades(teamTrades);
        const leagueStats = this.summarizeTrades(leagueTrades);
        const methodStats = this.summarizeTrades(methodTrades);

        if (teamStats.count >= 3) {
            if (teamStats.profit > 0 && teamStats.winrate >= 50) {
                signals.push({ type: 'positive', icon: 'bx-trending-up', label: 'Time positivo', detail: `${teamStats.count} ops · ${App.formatCurrency(teamStats.profit)}` });
            } else if (teamStats.profit < 0) {
                signals.push({ type: 'danger', icon: 'bx-error-circle', label: 'Time perigoso', detail: `${teamStats.count} ops · ${App.formatCurrency(teamStats.profit)}` });
            }
        } else if (teamStats.count > 0) {
            signals.push({ type: 'sample', icon: 'bx-info-circle', label: 'Pouca amostra em time', detail: `${teamStats.count} op${teamStats.count > 1 ? 's' : ''}` });
        }

        if (leagueStats.count >= 3) {
            if (leagueStats.profit > 0 && leagueStats.winrate >= 50) {
                signals.push({ type: 'positive', icon: 'bx-trophy', label: 'Liga forte', detail: `${leagueStats.count} ops · ${App.formatCurrency(leagueStats.profit)}` });
            } else if (leagueStats.profit < 0) {
                signals.push({ type: 'danger', icon: 'bx-shield-x', label: 'Liga ruim', detail: `${leagueStats.count} ops · ${App.formatCurrency(leagueStats.profit)}` });
            }
        } else if (leagueStats.count > 0) {
            signals.push({ type: 'sample', icon: 'bx-info-circle', label: 'Pouca amostra em liga', detail: `${leagueStats.count} op${leagueStats.count > 1 ? 's' : ''}` });
        }

        if (selectedMethod && methodStats.count >= 3) {
            if (methodStats.profit > 0 && methodStats.winrate >= 50) {
                signals.push({ type: 'method', icon: 'bx-target-lock', label: 'Método forte', detail: `${selectedMethod} · ${App.formatCurrency(methodStats.profit)}` });
            } else if (methodStats.profit < 0) {
                signals.push({ type: 'danger', icon: 'bx-block', label: 'Método em alerta', detail: `${selectedMethod} · ${App.formatCurrency(methodStats.profit)}` });
            }
        } else if (!selectedMethod && bestProfileMethod) {
            signals.push({ type: 'method', icon: 'bx-target-lock', label: 'Método combina', detail: `${bestProfileMethod.method} · ${App.formatCurrency(bestProfileMethod.profit)}` });
        }

        const hasTeamDanger = signals.some(signal => signal.label === 'Time perigoso');
        const hasLeagueDanger = signals.some(signal => signal.label === 'Liga ruim');
        if (hasTeamDanger && hasLeagueDanger) {
            signals.unshift({ type: 'avoid', icon: 'bx-x-circle', label: 'Evitar', detail: 'Time e liga negativos no seu histórico' });
        }

        const priority = { avoid: 0, danger: 1, method: 2, positive: 3, sample: 4 };
        return signals
            .sort((a, b) => priority[a.type] - priority[b.type])
            .slice(0, 4);
    },

    renderHistorySignals(game, selectedMethod = '') {
        const signals = this.getGameHistorySignals(game, selectedMethod);
        if (signals.length === 0) return '';

        return `
            <div class="history-signal-row">
                ${signals.map(signal => `
                    <span class="history-signal-badge ${signal.type}" title="${this.escapeHtml(signal.detail)}">
                        <i class='bx ${signal.icon}'></i>
                        <span>${this.escapeHtml(signal.label)}</span>
                    </span>
                `).join('')}
            </div>
        `;
    },

    getCalendarGameActionData(game) {
        const sofaId = Number(game.sofascoreId || (game.source !== 'wradar' ? game.id : 0)) || null;
        const sofaUrl = sofaId ? `https://www.sofascore.com/event/${sofaId}` : null;
        const radarFutebolUrl = game.radarFutebolUrl || 'https://www.radarfutebol.com/';
        const wradarGame = JSON.stringify({
            sofascoreId: sofaId,
            wradarId: game.wradarId || null,
            home: game.homeTeam?.name || '',
            away: game.awayTeam?.name || '',
            startTimestamp: game.startTimestamp || null
        }).replace(/"/g, '&quot;');
        return { sofaUrl, radarFutebolUrl, wradarGame };
    },

    renderCalendarActions(game, extraClass = '') {
        const { sofaUrl, radarFutebolUrl, wradarGame } = this.getCalendarGameActionData(game);
        return `
            <div class="calendar-action-grid ${extraClass}">
                <a class="mod" href="#" onclick="AnalisePro.openCustomWRadarMod(${wradarGame}); return false;" title="1 - Radar MOD proprio">
                    <i class='bx bx-crosshair'></i><span>MOD</span>
                </a>
                <a class="radar" href="${this.escapeHtml(radarFutebolUrl)}" target="_blank" title="2 - Radar Futebol">
                    <i class='bx bx-radar'></i>
                </a>
                <a class="pack" href="#" onclick="AnalisePro.openWRadarForGame(${wradarGame}, 'pack'); return false;" title="3 - Radar WH + Pack">
                    <i class='bx bx-layout'></i>
                </a>
                <a class="sport" href="#" onclick="AnalisePro.openWRadarForGame(${wradarGame}, 'sport'); return false;" title="4 - Sportradar">
                    <i class='bx bx-world'></i>
                </a>
                <a class="scores" href="#" onclick="AnalisePro.open365ScoresForGame(${wradarGame}); return false;" title="5 - 365 Score">
                    365
                </a>
                <a class="sofa" href="${sofaUrl || '#'}" ${sofaUrl ? 'target="_blank"' : 'onclick="return false;"'} title="6 - Sofascore detalhes">
                    <i class='bx bx-plus-circle'></i>
                </a>
            </div>
        `;
    },

    renderGameListRow(game, favGamesIds) {
        const time = new Date(game.startTimestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const status = this.getCalendarGameStatus(game);
        const isFinished = status === 'finished';
        const isLive = status === 'live';
        const isFav = favGamesIds.includes(game.id);
        const homeScore = game.homeScore?.display ?? game.homeScore?.current ?? '';
        const awayScore = game.awayScore?.display ?? game.awayScore?.current ?? '';
        const statusLabel = isLive ? (game.status?.description || 'Ao vivo') : isFinished ? 'Encerrado' : time;
        const homePos = game.homeTeam.position || game.homeTeam.ranking || '';
        const awayPos = game.awayTeam.position || game.awayTeam.ranking || '';
        const rankLabel = (homePos && awayPos) ? `<span class="calendar-list-rank">RANK ${homePos}º x ${awayPos}º</span>` : '';

        let oddsDisplay = '';
        if (game.realOdds && game.realOdds.length >= 3) {
            oddsDisplay = `
                <div class="calendar-odds-row calendar-list-odds">
                    <span>${game.realOdds[0].value}</span>
                    <span>${game.realOdds[1].value}</span>
                    <span>${game.realOdds[2].value}</span>
                </div>
            `;
        } else if (game.displayOdds) {
            oddsDisplay = `
                <div class="calendar-odds-row calendar-list-odds">
                    <span>${game.displayOdds.home || '-'}</span>
                    <span>${game.displayOdds.draw || '-'}</span>
                    <span>${game.displayOdds.away || '-'}</span>
                </div>
            `;
        }

        return `
            <div class="calendar-list-game ${isFav ? 'is-fav-game' : ''} ${isLive ? 'is-live' : ''} ${isFinished ? 'is-finished' : ''}">
                <button class="calendar-star-btn ${isFav ? 'active' : ''}" onclick="AnalisePro.toggleFavoriteGame(${game.id})" title="Favoritar jogo">
                    <i class='bx ${isFav ? 'bxs-star' : 'bx-star'}'></i>
                </button>
                <div class="calendar-list-time">${this.escapeHtml(statusLabel)}</div>
                <div class="calendar-list-match">
                    <div class="calendar-list-team">
                        ${this.renderTeamLogo(game.homeTeam, 22, game.source)}
                        <strong>${this.escapeHtml(game.homeTeam.name)}</strong>
                        <em class="${isLive ? 'live' : ''}">${homeScore !== '' ? homeScore : '-'}</em>
                    </div>
                    <div class="calendar-list-team">
                        ${this.renderTeamLogo(game.awayTeam, 22, game.source)}
                        <strong>${this.escapeHtml(game.awayTeam.name)}</strong>
                        <em class="${isLive ? 'live' : ''}">${awayScore !== '' ? awayScore : '-'}</em>
                    </div>
                </div>
                <div class="calendar-list-meta">
                    ${oddsDisplay}
                    ${rankLabel}
                </div>
                ${this.renderCalendarActions(game, 'calendar-list-actions')}
            </div>
        `;
    },

    renderGameCard(game, favGamesIds) {
        const time = new Date(game.startTimestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const isFinished = game.status.type === 'finished';
        const isLive = game.status.type === 'inprogress';
        const isFav = favGamesIds.includes(game.id);
        
        const homeScore = game.homeScore?.display ?? game.homeScore?.current ?? '';
        const awayScore = game.awayScore?.display ?? game.awayScore?.current ?? '';

        const homePos = game.homeTeam.position || game.homeTeam.ranking || '';
        const awayPos = game.awayTeam.position || game.awayTeam.ranking || '';
        const rankLabel = (homePos && awayPos) ? `<span style="background: rgba(15, 150, 156, 0.1); color: var(--primary-color); padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; margin-left: 8px;">RANK: ${homePos}º vs ${awayPos}º</span>` : '';

        let oddsDisplay = '';
        if (game.realOdds && game.realOdds.length >= 3) {
            oddsDisplay = `
                <div class="calendar-odds-row">
                    <span>${game.realOdds[0].value}</span>
                    <span>${game.realOdds[1].value}</span>
                    <span>${game.realOdds[2].value}</span>
                </div>
            `;
        } else if (game.displayOdds) {
             oddsDisplay = `
                <div class="calendar-odds-row">
                    <span>${game.displayOdds.home || '-'}</span>
                    <span>${game.displayOdds.draw || '-'}</span>
                    <span>${game.displayOdds.away || '-'}</span>
                </div>
            `;
        }

        return `
            <div class="calendar-game-card ${isFav ? 'is-fav-game' : ''}" style="${isFav ? 'border-left: 4px solid #ffca28;' : ''}">
                <div class="calendar-card-top">
                    <div class="calendar-time-pill ${isLive ? 'live' : ''}">
                        <strong>${time}</strong>
                        <span>
                                ${isLive ? 'AO VIVO' : isFinished ? 'ENCERRADO' : 'AGENDADO'}
                        </span>
                    </div>
                    <button class="calendar-star-btn ${isFav ? 'active' : ''}" onclick="AnalisePro.toggleFavoriteGame(${game.id})" title="Favoritar jogo">
                        <i class='bx ${isFav ? 'bxs-star' : 'bx-star'}'></i>
                    </button>
                </div>

                <div class="calendar-match-body">
                    <div class="calendar-team-row">
                        ${this.renderTeamLogo(game.homeTeam, 28, game.source)}
                        <strong>${this.escapeHtml(game.homeTeam.name)}</strong>
                        <em class="${isLive ? 'live' : ''}">${homeScore !== '' ? homeScore : '-'}</em>
                    </div>
                    <div class="calendar-team-row">
                        ${this.renderTeamLogo(game.awayTeam, 28, game.source)}
                        <strong>${this.escapeHtml(game.awayTeam.name)}</strong>
                        <em class="${isLive ? 'live' : ''}">${awayScore !== '' ? awayScore : '-'}</em>
                    </div>
                    ${oddsDisplay || rankLabel ? `<div class="calendar-card-meta">${oddsDisplay}${rankLabel}</div>` : ''}
                </div>
                ${this.renderHistorySignals(game)}
                ${this.renderCalendarActions(game)}
            </div>
        `;
    },
    renderPlanejamento() {
        const container = document.getElementById('app-container');
        const selectedDate = this.currentPlanningDate;
        
        const favData = JSON.parse(localStorage.getItem('pro_fav_games_v2')) || {};
        const favGamesIds = favData[selectedDate] || [];
        
        const planningDataAll = JSON.parse(localStorage.getItem('pro_planning_data_v2')) || {};
        const planningData = planningDataAll[selectedDate] || {};
        
        // Busca jogos do cache para a data selecionada
        let gamesForDate = [];
        const cache = JSON.parse(localStorage.getItem('pro_games_cache_history')) || {};
        if (cache[selectedDate]) {
            gamesForDate = cache[selectedDate];
        } else if (selectedDate === this.getTodayKey() && this.games.length > 0) {
            gamesForDate = this.games;
        }

        const favGames = gamesForDate.filter(g => favGamesIds.includes(g.id))
            .sort((a, b) => a.startTimestamp - b.startTimestamp);

        container.innerHTML = `
            <div class="planejamento-container" style="max-width: 100%; margin: 0 auto; padding-bottom: 50px;">
                <div class="pro-header-card calendar-header-card planning-header-card">
                    <div class="pro-header-info">
                        <h2>
                            <i class='bx bx-task'></i> 
                            Planejamento Diário
                        </h2>
                    </div>
                    <div class="pro-header-actions calendar-header-actions planning-header-actions">
                        <label class="planning-date-field">
                            <span><i class='bx bx-calendar'></i> Ver outro dia</span>
                        <input type="date" id="planning-date-filter" value="${selectedDate}" 
                               class="filter-control">
                        </label>
                    </div>
                </div>

                <div id="planejamento-list" class="planejamento-grid">
                    <div id="planning-loading" style="display: none; grid-column: 1 / -1; text-align: center; padding: 50px;">
                        <i class='bx bx-loader-alt bx-spin' style="font-size: 40px; color: var(--primary-color);"></i>
                        <p style="margin-top: 15px; font-weight: 700;">Buscando jogos para esta data...</p>
                    </div>
                    ${favGames.length === 0 ? `
                        <div class="empty-state" style="grid-column: 1 / -1; padding: 80px; background: var(--bg-surface); border-radius: 20px; border: 2px dashed var(--border-color); text-align: center;">
                            <i class='bx bx-calendar-x' style="font-size: 60px; color: var(--text-secondary); margin-bottom: 20px; opacity: 0.5;"></i>
                            <h3 style="font-size: 22px; font-weight: 800;">Nenhum planejamento para este dia</h3>
                            <p style="color: var(--text-secondary); max-width: 400px; margin: 10px auto;">Selecione outra data ou favorite jogos no <b>Calendário</b> para planejar.</p>
                        </div>
                    ` : favGames.map(game => {
                        const data = planningData[game.id] || { method: '', info: '', notes: '', status: 'pendente' };
                        const time = new Date(game.startTimestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        
                        const isFinished = game.status.type === 'finished';
                        const isLive = game.status.type === 'inprogress';
                        const homeScore = game.homeScore?.display ?? game.homeScore?.current ?? '';
                        const awayScore = game.awayScore?.display ?? game.awayScore?.current ?? '';
                        const wradarGame = JSON.stringify({
                            sofascoreId: game.sofascoreId || (game.source !== 'wradar' ? game.id : null),
                            wradarId: game.wradarId || null,
                            home: game.homeTeam?.name || '',
                            away: game.awayTeam?.name || '',
                            startTimestamp: game.startTimestamp || null
                        }).replace(/"/g, '&quot;');
                        const radarFutebolUrl = game.radarFutebolUrl || 'https://www.radarfutebol.com/';
                        const sofaId = Number(game.sofascoreId || (game.source !== 'wradar' ? game.id : 0)) || null;
                        const sofaUrl = sofaId ? `https://www.sofascore.com/event/${sofaId}` : null;

                        const sofascoreFinalizado = isFinished;
                        const statusFinal = sofascoreFinalizado ? 'finalizado' : (data.status === 'finalizado' ? 'finalizado' : 'pendente');

                        const statusColors = {
                            'pendente': '#ffca28',
                            'finalizado': '#00b894'
                        };
                        const statusBorder = statusColors[statusFinal] || 'var(--border-color)';

                        return `
                            <div class="planning-card animate-up" style="background: var(--bg-surface); border-radius: 20px; padding: 0; border: 1px solid var(--border-color); display: flex; flex-direction: column; box-shadow: var(--shadow-sm); overflow: hidden; transition: all 0.3s; ${statusFinal === 'finalizado' ? 'opacity: 0.75;' : ''}">
                                <div style="height: 5px; background: ${statusBorder}; width: 100%;"></div>
                                
                                <div style="padding: 22px;">
                                    ${statusFinal === 'finalizado' ? `
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px; background: rgba(0,180,148,0.1); color: #00b894; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; margin-bottom: 16px; border: 1px solid rgba(0,180,148,0.3);">
                                        <i class='bx bx-check-circle' style="font-size: 16px;"></i> FINALIZADO
                                    </div>
                                    ` : ''}
                                    ${isLive ? `
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px; background: rgba(255,77,77,0.1); color: #ff4d4d; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; margin-bottom: 16px; border: 1px solid rgba(255,77,77,0.3); animation: pulse-live 1.5s infinite;">
                                        <i class='bx bx-broadcast' style="font-size: 16px;"></i> AO VIVO
                                    </div>
                                    ` : ''}
                                    
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            <div style="background: var(--bg-body); padding: 8px 12px; border-radius: 10px; text-align: center; border: 1px solid var(--border-color);">
                                                <div style="font-weight: 900; color: var(--primary-color); font-size: 16px; font-family: 'Outfit', sans-serif;">${time}</div>
                                            </div>
                                            <div style="font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                                ${game.tournament.name}
                                            </div>
                                        </div>
                                        <button onclick="AnalisePro.toggleFavoriteGame(${game.id})" class="btn-icon" style="color: #ffca28; font-size: 24px; padding: 0;">
                                            <i class='bx bxs-star'></i>
                                        </button>
                                    </div>

                                    <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
                                        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-body); padding: 10px; border-radius: 10px; border: 1px solid rgba(15, 150, 156, 0.05);">
                                            <div style="display: flex; align-items: center; gap: 12px;">
                                                ${this.renderTeamLogo(game.homeTeam, 28, game.source)}
                                                <span style="font-weight: 800; font-size: 14px; color: var(--text-primary);">${game.homeTeam.name}</span>
                                            </div>
                                            <span style="font-weight: 900; font-size: 18px; color: ${isLive ? '#ff4d4d' : 'var(--text-primary)'};">${homeScore}</span>
                                        </div>
                                        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-body); padding: 10px; border-radius: 10px; border: 1px solid rgba(15, 150, 156, 0.05);">
                                            <div style="display: flex; align-items: center; gap: 12px;">
                                                ${this.renderTeamLogo(game.awayTeam, 28, game.source)}
                                                <span style="font-weight: 800; font-size: 14px; color: var(--text-primary);">${game.awayTeam.name}</span>
                                            </div>
                                            <span style="font-weight: 900; font-size: 18px; color: ${isLive ? '#ff4d4d' : 'var(--text-primary)'};">${awayScore}</span>
                                        </div>
                                    </div>
                                    ${this.renderHistorySignals(game, data.method)}

                                    <div class="planning-links">
                                        <a href="#" onclick="AnalisePro.openCustomWRadarMod(${wradarGame}); return false;" class="planning-link planning-link-mod" title="1 - Radar MOD proprio">
                                            <i class='bx bx-crosshair'></i> MOD
                                        </a>
                                        <a href="${this.escapeHtml(radarFutebolUrl)}" target="_blank" class="planning-link planning-link-wradar" title="2 - Radar Futebol">
                                            <i class='bx bx-radar'></i>
                                        </a>
                                        <a href="#" onclick="AnalisePro.openWRadarForGame(${wradarGame}, 'pack'); return false;" class="planning-link planning-link-pack" title="3 - Radar WH + Pack">
                                            <i class='bx bx-layout'></i>
                                        </a>
                                        <a href="#" onclick="AnalisePro.openWRadarForGame(${wradarGame}, 'sport'); return false;" class="planning-link planning-link-sport" title="4 - Sportradar">
                                            <i class='bx bx-world'></i>
                                        </a>
                                        <a href="#" onclick="AnalisePro.open365ScoresForGame(${wradarGame}); return false;" class="planning-link planning-link-365" title="5 - 365 Score">
                                            365
                                        </a>
                                        <a href="${sofaUrl || '#'}" ${sofaUrl ? 'target="_blank"' : 'onclick="return false;"'} class="planning-link planning-link-sofa" title="6 - Sofascore detalhes">
                                            <i class='bx bx-plus-circle'></i>
                                        </a>
                                    </div>

                                    <div style="margin-bottom: 18px;">
                                        <label class="planning-field-label"><i class='bx bx-target-lock'></i> Método</label>
                                        <select class="filter-control planning-input" data-game-id="${game.id}" data-field="method" style="width: 100%; height: 50px; border-radius: 12px; font-weight: 700; font-size: 15px; padding: 0 15px; cursor: pointer;">
                                            <option value="">Escolher...</option>
                                            ${this.getAvailableMethods().map(m => `<option value="${m}" ${data.method === m ? 'selected' : ''}>${m}</option>`).join('')}
                                        </select>
                                    </div>

                                    <div style="margin-bottom: 18px;">
                                        <label class="planning-field-label"><i class='bx bx-notepad'></i> Pré-Live Info</label>
                                        <input type="text" class="filter-control planning-input" data-game-id="${game.id}" data-field="info" value="${data.info}" placeholder="Must win, desfalques..." style="width: 100%; height: 45px; border-radius: 10px; padding: 0 15px; font-size: 14px;">
                                    </div>

                                    <div>
                                        <label class="planning-field-label"><i class='bx bx-bulb'></i> Obs / Live</label>
                                        <textarea class="filter-control planning-input" data-game-id="${game.id}" data-field="notes" style="width: 100%; height: 100px; resize: none; padding: 15px; border-radius: 12px; font-size: 14px; line-height: 1.5;" placeholder="O que aconteceu no jogo?">${data.notes}</textarea>
                                    </div>
                                    ${isFinished ? `
                                    <div style="margin-top: 12px;">
                                        <button class="postgame-load-btn" onclick="AnalisePro.loadPostGameSummary(${game.id}, 'postgame-${game.id}')">
                                            <i class='bx bx-message-square-dots'></i> Carregar Resumo do Jogo
                                        </button>
                                        <div id="postgame-${game.id}"></div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        this.bindPlanningEvents();
    },

    getAvailableMethods() {
        if (typeof App !== 'undefined' && App.customMethods && App.customMethods.length > 0) {
            return App.customMethods.sort();
        }
        return ['Match Odds', 'Over 2.5', 'Under 2.5', 'Ambas Marcam', 'Correct Score'];
    },

    bindPlanningEvents() {
        document.querySelectorAll('.planning-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const gameId = e.target.getAttribute('data-game-id');
                const field = e.target.getAttribute('data-field');
                const value = e.target.value;
                this.savePlanning(gameId, field, value);
            });
            
            if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                input.addEventListener('blur', (e) => {
                    const gameId = e.target.getAttribute('data-game-id');
                    const field = e.target.getAttribute('data-field');
                    const value = e.target.value;
                    this.savePlanning(gameId, field, value);
                });
            }
        });

        // Listener para o filtro de data (usando referÃªncia direta ao objeto)
        const dateFilter = document.getElementById('planning-date-filter');
        if (dateFilter) {
            dateFilter.onchange = (e) => {
                AnalisePro.changePlanningDate(e.target.value);
            };
        }
    },

    savePlanning(gameId, field, value) {
        const selectedDate = this.currentPlanningDate;
        let planningDataAll = JSON.parse(localStorage.getItem('pro_planning_data_v2')) || {};
        
        if (!planningDataAll[selectedDate]) planningDataAll[selectedDate] = {};
        if (!planningDataAll[selectedDate][gameId]) {
            planningDataAll[selectedDate][gameId] = { method: '', info: '', notes: '', status: 'pendente' };
        }
        
        planningDataAll[selectedDate][gameId][field] = value;
        localStorage.setItem('pro_planning_data_v2', JSON.stringify(planningDataAll));
        
        console.log(`Salvo [${selectedDate}]: Game ${gameId}, ${field} = ${value}`);
    },

    async changePlanningDate(newDate) {
        this.currentPlanningDate = newDate;
        
        // Feedback visual
        const list = document.getElementById('planejamento-list');
        const loader = document.getElementById('planning-loading');
        if (loader) loader.style.display = 'block';
        
        console.log(`Alterando data para: ${newDate}`);
        
        // Se nÃ£o houver jogos no cache para esta data, tenta buscar
        const cache = JSON.parse(localStorage.getItem('pro_games_cache_history')) || {};
        if (!cache[newDate]) {
            try {
                const games = await this.fetchCalendarGamesByDate(newDate);
                if (games.length > 0) {
                    cache[newDate] = games;
                    localStorage.setItem('pro_games_cache_history', JSON.stringify(cache));
                }
            } catch (err) {
                console.error("Erro ao buscar jogos da nova data:", err);
            }
        }
        
        this.renderPlanejamento();
    },

    async fetchPostGameSummary(eventId) {
        try {
            // Busca comentários para montar o resumo pós-jogo.
            const data = await this.fetchSuper(`https://api.sofascore.com/api/v1/event/${eventId}/comments`);
            if (!data) return [];
            let comments = data.comments || data.data || [];
            // Retorna highlights ou Ãºltimos 10 comentÃ¡rios
            const highlights = comments.filter(c => c.highlight || c.isHighlight);
            return highlights.length > 0 ? highlights.slice(0, 15) : comments.slice(0, 10);
        } catch(e) {
            console.warn('Erro ao buscar resumo:', e);
            return [];
        }
    },

    async loadPostGameSummary(eventId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `<div style="text-align:center;padding:15px;"><i class='bx bx-loader-alt bx-spin' style="font-size:24px;color:var(--primary-color);"></i><p style="font-size:11px;margin-top:8px;font-weight:700;">Carregando resumo...</p></div>`;
        
        const comments = await this.fetchPostGameSummary(eventId);
        
        if (comments.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:15px;font-size:11px;color:var(--text-secondary);"><i class='bx bx-info-circle' style="font-size:20px;display:block;margin-bottom:6px;"></i>Sem dados de narração disponíveis para este jogo.</div>`;
            return;
        }
        
        const getCommentIcon = (text) => {
            const t = (text || '').toLowerCase();
            if (t.includes('goal') || t.includes('gol')) return "<i class='bx bx-football'></i>";
            if (t.includes('card') || t.includes('cartão') || t.includes('yellow') || t.includes('red')) return "<i class='bx bx-card'></i>";
            if (t.includes('var') || t.includes('review')) return "<i class='bx bx-tv'></i>";
            if (t.includes('substitution') || t.includes('sub')) return "<i class='bx bx-transfer-alt'></i>";
            if (t.includes('penalty') || t.includes('penalti') || t.includes('pênalti')) return "<i class='bx bx-target-lock'></i>";
            if (t.includes('half') || t.includes('intervalo')) return "<i class='bx bx-time-five'></i>";
            return "<i class='bx bx-message-rounded-dots'></i>";
        };
        
        container.innerHTML = `
            <div class="postgame-summary">
                <div class="postgame-summary-header">
                    <span class="postgame-summary-title"><i class='bx bx-message-dots'></i> Resumo da Narração</span>
                    <button onclick="navigator.clipboard.writeText(document.getElementById('${containerId}').innerText).then(()=>{this.textContent='Copiado!';setTimeout(()=>{this.innerHTML='<i class=\'bx bx-copy\'></i> Copiar'},1500)})" style="background:none;border:1px solid var(--border-color);color:var(--text-secondary);padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:3px;"><i class='bx bx-copy'></i> Copiar</button>
                </div>
                ${comments.map(c => {
                    const time = c.time || c.minute || c.relativeTime || '';
                    const text = c.text || c.comment || c.body || '';
                    const icon = getCommentIcon(text);
                    return `<div class="postgame-item"><strong>${time ? time + "' " : ''}${icon}</strong> ${text}</div>`;
                }).join('')}
            </div>
        `;
    }
};

