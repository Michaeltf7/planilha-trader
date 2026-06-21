function parseCSV(csvText) {
    const type = detectCSVType(csvText);
    if (type === 'secondary') {
        return parseSecondaryCSV(csvText);
    }
    return parsePrimaryCSV(csvText);
}

function detectCSVType(csvText) {
    const lines = csvText.split('\n');
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('mercado') && firstLine.includes('seleção') && firstLine.includes('tipo de lance')) {
        return 'secondary';
    }
    return 'primary';
}

function parseValue(val) {
    if (!val || val === '--' || val.trim() === '') return 0;
    let clean = val.replace(/"/g, '').trim();
    
    let isNegative = false;
    if (clean.includes('(')) {
        isNegative = true;
        clean = clean.replace(/[()]/g, '');
    } else if (clean.startsWith('-')) {
        isNegative = true;
        clean = clean.substring(1);
    }

    const hasComma = clean.includes(',');
    const hasDot = clean.includes('.');
    
    if (hasComma && hasDot) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            clean = clean.replace(/,/g, '');
        }
    } else if (hasComma) {
        clean = clean.replace(',', '.');
    }
    
    let num = parseFloat(clean);
    return isNegative ? -num : num;
}

function parsePrimaryCSV(csvText) {
    const lines = splitCSVLines(csvText);
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length < 7) continue;
        
        const dateStr = row[0];
        const description = row[1];
        
        const profit = parseValue(row[2]);
        const loss = parseValue(row[4]);
        const balance = parseValue(row[6]);
        
        const netProfit = profit !== 0 ? profit : loss;
        
        let game = 'Desconhecido';
        let method = 'Desconhecido';
        const isDepositOrWithdrawal = description.toLowerCase().includes('deposit') || description.toLowerCase().includes('withdrawal');
        
        if (isDepositOrWithdrawal) {
            game = description.trim();
            method = 'Transferência';
        } else {
            const parts = description.split(' / ');
            if (parts.length >= 2) {
                game = parts[0].trim();
                const methodParts = parts[1].split(' Ref:');
                method = methodParts[0].trim();
            } else {
                game = description.trim();
            }
        }
        
        const id = btoa(unescape(encodeURIComponent(`${dateStr}|${game}|${method}|${netProfit}|${balance}`)));
        
        result.push({
            id,
            dateStr,
            description,
            game,
            method,
            netProfit,
            balance,
            isDepositOrWithdrawal,
            layBack: '',
            stake: 0,
            percentage: 0,
            bets: []
        });
    }
    return result;
}

function parseSecondaryCSV(csvText) {
    const lines = splitCSVLines(csvText);
    const bets = [];
    
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length < 12) continue;
        
        const mercadoFull = row[0];
        const selecao = row[1];
        const tipoLance = row[2];
        const idAposta = row[3];
        const dataAposta = row[4];
        const odds = parseValue(row[10]);
        const stake = parseValue(row[8]);
        const pnl = parseValue(row[11]);
        
        const parts = mercadoFull.split(' / ');
        let game = '';
        let method = '';
        if (parts.length >= 3) {
            game = parts[1].trim();
            method = parts[2].trim();
        }

        bets.push({
            idAposta,
            game,
            method,
            selecao,
            side: tipoLance === 'Contra' ? 'LAY' : 'BACK',
            date: dataAposta,
            odds,
            stake,
            pnl
        });
    }
    return bets;
}

function splitCSVLines(csvText) {
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentLine.push(currentField);
            currentField = '';
        } else if (char === '\n' && !inQuotes) {
            currentLine.push(currentField);
            if (currentLine.join('').trim() !== '') {
                lines.push(currentLine);
            }
            currentLine = [];
            currentField = '';
        } else if (char !== '\r') {
            currentField += char;
        }
    }
    if (currentField !== '' || currentLine.length > 0) {
        currentLine.push(currentField);
        lines.push(currentLine);
    }
    return lines;
}
