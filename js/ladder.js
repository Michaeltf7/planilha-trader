const Ladder = {
    entries: [],
    mode: 'stake',
    value: 100,
    centerOdd: 2.00,
    showPercent: false,
    closedAtOdd: null,
    commission: 6.5, // % comissão da casa (ex: Betfair = 6.5%)

    getOddsRange() {
        const odds = [];
        for (let o = 1.01; o < 2.00; o = +(o + 0.01).toFixed(2)) odds.push(+o.toFixed(2));
        for (let o = 2.00; o < 3.00; o = +(o + 0.02).toFixed(2)) odds.push(+o.toFixed(2));
        for (let o = 3.00; o < 4.00; o = +(o + 0.05).toFixed(2)) odds.push(+o.toFixed(2));
        for (let o = 4.00; o < 6.00; o = +(o + 0.10).toFixed(2)) odds.push(+o.toFixed(2));
        for (let o = 6.00; o < 10.00; o = +(o + 0.20).toFixed(2)) odds.push(+o.toFixed(2));
        for (let o = 10.00; o <= 20.00; o = +(o + 0.50).toFixed(2)) odds.push(+o.toFixed(2));
        for (let o = 20.50; o <= 30.00; o = +(o + 1.00).toFixed(2)) odds.push(+o.toFixed(2));
        for (let o = 32.00; o <= 50.00; o = +(o + 2.00).toFixed(2)) odds.push(+o.toFixed(2));
        for (let o = 55.00; o <= 100.00; o = +(o + 5.00).toFixed(2)) odds.push(+o.toFixed(2));
        for (let o = 110.00; o <= 1000.00; o = +(o + 10.00).toFixed(2)) odds.push(+o.toFixed(2));
        return odds;
    },

    getStakeForEntry(odd) {
        if (this.mode === 'stake') return this.value;
        return +(this.value / (odd - 1)).toFixed(2);
    },

    getTotalStaked() {
        return this.entries.reduce((s, e) => s + e.stake, 0);
    },

    addEntry(type, odd) {
        this.closedAtOdd = null; // resetar fechamento
        const stake = this.getStakeForEntry(odd);
        this.entries.push({ type, odd, stake });
        this.updateDisplay();
    },

    removeEntry(idx) {
        this.entries.splice(idx, 1);
        this.closedAtOdd = null;
        this.updateDisplay();
    },

    clearAll() {
        this.entries = [];
        this.closedAtOdd = null;
        this.updateDisplay();
    },

    calcNetPosition() {
        let ifWin = 0, ifLose = 0;
        this.entries.forEach(e => {
            if (e.type === 'back') {
                ifWin += e.stake * (e.odd - 1);
                ifLose -= e.stake;
            } else {
                ifWin -= e.stake * (e.odd - 1);
                ifLose += e.stake;
            }
        });
        return { ifWin: +ifWin.toFixed(2), ifLose: +ifLose.toFixed(2) };
    },

    applyCommission(v) {
        // Comissão só se aplica sobre lucro (valor positivo)
        if (v <= 0) return v;
        return +(v * (1 - this.commission / 100)).toFixed(2);
    },

    calcPLAtOdd(X) {
        if (this.entries.length === 0) return 0;
        const { ifWin, ifLose } = this.calcNetPosition();
        const raw = +(ifLose + (ifWin - ifLose) / X).toFixed(2);
        return this.applyCommission(raw);
    },

    // Fechar posição na odd clicada
    closeAtOdd(odd) {
        if (this.entries.length === 0) return;
        this.closedAtOdd = odd;
        const lockedPL = this.calcPLAtOdd(odd); // já com comissão

        // Atualizar todas as linhas com o valor travado
        const rows = document.querySelectorAll('.ladder-row');
        rows.forEach(row => {
            const plCell = row.querySelector('.ladder-pl');
            const rowOdd = parseFloat(row.dataset.odd);
            if (plCell) {
                plCell.textContent = this.formatValue(lockedPL);
                plCell.className = 'ladder-pl lad-closed' + (lockedPL > 0 ? ' lad-profit' : lockedPL < 0 ? ' lad-loss' : '');
            }
            // Destacar a linha onde fechou
            if (rowOdd === odd) {
                row.classList.add('ladder-row-closed');
            } else {
                row.classList.remove('ladder-row-closed');
            }
        });

        // Atualizar resultados
        const backRes = document.getElementById('lad-result-back');
        const layRes = document.getElementById('lad-result-lay');
        const comLabel = document.getElementById('lad-commission-label');
        if (backRes) {
            backRes.textContent = this.formatValue(lockedPL);
            backRes.className = lockedPL > 0 ? 'lad-profit' : lockedPL < 0 ? 'lad-loss' : '';
        }
        if (layRes) {
            layRes.textContent = this.formatValue(lockedPL);
            layRes.className = lockedPL > 0 ? 'lad-profit' : lockedPL < 0 ? 'lad-loss' : '';
        }
        if (comLabel) comLabel.textContent = `(com ${this.commission}% comissão)`;

        // Atualizar label de resultado
        const title = document.querySelector('.lad-results-title');
        if (title) title.textContent = `Posição fechada na odd ${odd.toFixed(2)}`;
    },

    // Toggle R$ / %
    togglePLMode() {
        this.showPercent = !this.showPercent;
        const header = document.getElementById('lad-pl-header');
        if (header) {
            header.innerHTML = this.showPercent 
                ? '<i class="bx bx-percent"></i> P/L %' 
                : '<i class="bx bx-dollar"></i> P/L';
        }
        if (this.closedAtOdd) {
            this.closeAtOdd(this.closedAtOdd);
        } else {
            this.updateDisplay();
        }
    },

    formatValue(v) {
        if (this.showPercent) {
            const totalStaked = this.getTotalStaked();
            if (totalStaked === 0) return '0,00%';
            const pct = (v / totalStaked) * 100;
            return pct.toFixed(2).replace('.', ',') + '%';
        }
        return 'R$ ' + v.toFixed(2).replace('.', ',');
    },

    formatBRL(v) {
        return 'R$ ' + v.toFixed(2).replace('.', ',');
    },

    updateDisplay() {
        const { ifWin, ifLose } = this.calcNetPosition();
        const ifWinNet = this.applyCommission(ifWin);
        const ifLoseNet = this.applyCommission(ifLose);

        const rows = document.querySelectorAll('.ladder-row');
        rows.forEach(row => {
            const odd = parseFloat(row.dataset.odd);
            const pl = this.calcPLAtOdd(odd);
            const plCell = row.querySelector('.ladder-pl');
            if (plCell) {
                plCell.textContent = this.formatValue(pl);
                plCell.className = 'ladder-pl' + (pl > 0 ? ' lad-profit' : pl < 0 ? ' lad-loss' : '');
            }
            row.classList.remove('ladder-row-closed');
        });

        const backRes = document.getElementById('lad-result-back');
        const layRes = document.getElementById('lad-result-lay');
        const comLabel = document.getElementById('lad-commission-label');
        if (backRes) {
            backRes.textContent = this.formatValue(ifWinNet);
            backRes.className = ifWinNet > 0 ? 'lad-profit' : ifWinNet < 0 ? 'lad-loss' : '';
        }
        if (layRes) {
            layRes.textContent = this.formatValue(ifLoseNet);
            layRes.className = ifLoseNet > 0 ? 'lad-profit' : ifLoseNet < 0 ? 'lad-loss' : '';
        }
        if (comLabel) comLabel.textContent = `(com ${this.commission}% comissão)`;

        const title = document.querySelector('.lad-results-title');
        if (title) title.textContent = 'Se o resultado for...';

        const list = document.getElementById('lad-entries-list');
        if (list) {
            if (this.entries.length === 0) {
                list.innerHTML = '<div style="color:var(--text-secondary);font-size:12px;text-align:center;padding:12px;">Faça uma simulação clicando na ladder</div>';
            } else {
                list.innerHTML = this.entries.map((e, i) => `
                    <div class="lad-entry-item ${e.type}">
                        <span class="lad-entry-type">${e.type.toUpperCase()}</span>
                        <span class="lad-entry-odd">${e.odd.toFixed(2)}</span>
                        <span class="lad-entry-stake">${this.formatBRL(e.stake)}</span>
                        <button onclick="Ladder.removeEntry(${i})" class="lad-entry-remove" title="Remover">×</button>
                    </div>
                `).join('');
            }
        }
    },

    scrollToCenter() {
        const container = document.getElementById('ladder-scroll');
        if (!container) return;
        const target = container.querySelector(`[data-odd="${this.centerOdd.toFixed(2)}"]`);
        if (target) {
            target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    },

    render() {
        const container = document.getElementById('app-container');
        const odds = this.getOddsRange();

        // ORDEM: P/L | LAY (esquerda) | ODD (centro) | BACK (direita)
        container.innerHTML = `
            <div class="ladder-container">
                <div class="ladder-left">
                    <div class="ladder-header-row">
                        <div class="lad-h lad-h-pl" id="lad-pl-header" onclick="Ladder.togglePLMode()" style="cursor:pointer;" title="Clique para alternar R$ / %">
                            ${this.showPercent ? '<i class="bx bx-percent"></i> P/L %' : '<i class="bx bx-dollar"></i> P/L'}
                        </div>
                        <div class="lad-h lad-h-lay">Lay</div>
                        <div class="lad-h lad-h-odd"><i class='bx bx-transfer'></i></div>
                        <div class="lad-h lad-h-back">Back</div>
                    </div>
                    <div class="ladder-scroll" id="ladder-scroll">
                        ${odds.reverse().map(o => `
                            <div class="ladder-row" data-odd="${o.toFixed(2)}">
                                <div class="ladder-pl" onclick="Ladder.closeAtOdd(${o})" title="Fechar posição na odd ${o.toFixed(2)}">${this.formatValue(0)}</div>
                                <div class="ladder-lay" onclick="Ladder.addEntry('lay', ${o})"></div>
                                <div class="ladder-odd">${o.toFixed(2)}</div>
                                <div class="ladder-back" onclick="Ladder.addEntry('back', ${o})"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="ladder-right">
                    <h3 style="font-family:'Outfit',sans-serif;font-size:18px;font-weight:800;margin-bottom:20px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                        <i class='bx bx-calculator' style="color:var(--primary-color);"></i> Simulador
                    </h3>

                    <div class="lad-section">
                        <label class="lad-label">Tipo</label>
                        <div class="lad-toggle">
                            <button class="lad-toggle-btn ${this.mode === 'stake' ? 'active' : ''}" onclick="Ladder.setMode('stake')">Stake</button>
                            <button class="lad-toggle-btn ${this.mode === 'responsabilidade' ? 'active' : ''}" onclick="Ladder.setMode('responsabilidade')">Responsabilidade</button>
                        </div>
                    </div>

                    <div class="lad-section">
                        <label class="lad-label">Valor</label>
                        <input type="text" id="lad-value-input" class="lad-input" value="${this.formatBRL(this.value)}" 
                            onfocus="this.select()"
                            oninput="Ladder.onValueInput(this)"
                            onblur="Ladder.onValueBlur(this)">
                    </div>

                    <div class="lad-section">
                        <label class="lad-label">Comissão (%)</label>
                        <input type="number" id="lad-commission-input" class="lad-input" value="${this.commission}" step="0.1" min="0" max="100"
                            oninput="Ladder.onCommissionInput(this)">
                    </div>

                    <div class="lad-section">
                        <label class="lad-label">Ir para Odd</label>
                        <div style="display:flex;gap:6px;">
                            <input type="number" id="lad-goto-odd" class="lad-input" value="${this.centerOdd}" step="0.01" min="1.01" max="50" style="flex:1;">
                            <button class="lad-goto-btn" onclick="Ladder.goToOdd()"><i class='bx bx-target-lock'></i></button>
                        </div>
                    </div>

                    <div class="lad-entries-box">
                        <div class="lad-entries-header">
                            <span>Odd</span>
                            <span>Stake</span>
                            <span></span>
                        </div>
                        <div id="lad-entries-list">
                            <div style="color:var(--text-secondary);font-size:12px;text-align:center;padding:12px;">Faça uma simulação clicando na ladder</div>
                        </div>
                    </div>

                    <div class="lad-results-box">
                        <div class="lad-results-title">Se o resultado for...</div>
                        <div style="text-align:center;padding:4px 0 0;font-size:10px;color:var(--text-secondary);font-weight:700;" id="lad-commission-label">(com ${this.commission}% comissão)</div>
                        <div class="lad-results-grid">
                            <div class="lad-result-card back-card">
                                <div class="lad-result-label">Back</div>
                                <div id="lad-result-back" class="">${this.formatValue(0)}</div>
                            </div>
                            <div class="lad-result-card lay-card">
                                <div class="lad-result-label">Lay</div>
                                <div id="lad-result-lay" class="">${this.formatValue(0)}</div>
                            </div>
                        </div>
                    </div>

                    <button class="lad-clear-btn" onclick="Ladder.clearAll()">
                        <i class='bx bx-trash'></i> Limpar tudo
                    </button>
                </div>
            </div>
        `;

        this.scrollToCenter();
        if (this.entries.length > 0) {
            if (this.closedAtOdd) {
                this.closeAtOdd(this.closedAtOdd);
            } else {
                this.updateDisplay();
            }
        }
    },

    setMode(mode) {
        this.mode = mode;
        document.querySelectorAll('.lad-toggle-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
    },

    onValueInput(el) {
        const raw = el.value.replace(/[^\d,\.]/g, '').replace(',', '.');
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 0) this.value = num;
    },

    onValueBlur(el) {
        el.value = this.formatBRL(this.value);
    },

    onCommissionInput(el) {
        const v = parseFloat(el.value);
        if (!isNaN(v) && v >= 0 && v <= 100) {
            this.commission = v;
            if (this.closedAtOdd) {
                this.closeAtOdd(this.closedAtOdd);
            } else {
                this.updateDisplay();
            }
        }
    },

    goToOdd() {
        const input = document.getElementById('lad-goto-odd');
        const odd = parseFloat(input.value);
        if (isNaN(odd) || odd < 1.01) return;
        this.centerOdd = odd;
        const container = document.getElementById('ladder-scroll');
        const rows = container.querySelectorAll('.ladder-row');
        let closest = null, minDiff = Infinity;
        rows.forEach(r => {
            const diff = Math.abs(parseFloat(r.dataset.odd) - odd);
            if (diff < minDiff) { minDiff = diff; closest = r; }
        });
        if (closest) closest.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
};
