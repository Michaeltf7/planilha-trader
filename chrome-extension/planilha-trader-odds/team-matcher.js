(() => {
  const normalize = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

  const ignored = new Set(['fc', 'sc', 'ac', 'cf', 'afc', 'ec', 'club', 'clube', 'the', 'de', 'do', 'da', 'islands', 'ilhas']);
  const tokenAliases = new Map([
    ['utd', 'united'], ['uniao', 'united'], ['feminino', 'women'], ['feminina', 'women'], ['fem', 'women'],
    ['reserva', 'b'], ['reservas', 'b'], ['reserves', 'b'], ['sub20', 'u20'], ['sub21', 'u21'], ['sub23', 'u23']
  ]);
  const groups = [
    ['algeria', 'argelia'], ['australia'], ['austria'], ['belgium', 'belgica'], ['bosnia and herzegovina', 'bosnia e herzegovina'],
    ['brazil', 'brasil'], ['canada'], ['cape verde', 'cape verde islands', 'cabo verde', 'ilhas de cabo verde'],
    ['colombia'], ['croatia', 'croacia'], ['czech republic', 'czechia', 'republica tcheca'],
    ['dr congo', 'congo dr', 'congo democratic republic', 'rd congo', 'republica democratica do congo'],
    ['ecuador', 'equador'], ['egypt', 'egito'], ['england', 'inglaterra'], ['france', 'franca'],
    ['germany', 'alemanha'], ['ghana', 'gana'], ['haiti'], ['iran', 'ira'], ['iraq', 'iraque'],
    ['ivory coast', 'cote d ivoire', 'costa do marfim'], ['japan', 'japao'], ['jordan', 'jordania'],
    ['mexico'], ['morocco', 'marrocos'], ['netherlands', 'holland', 'holanda', 'paises baixos'],
    ['new zealand', 'nova zelandia'], ['norway', 'noruega'], ['panama'], ['paraguay'], ['portugal'],
    ['qatar', 'catar'], ['saudi arabia', 'arabia saudita'], ['scotland', 'escocia'], ['senegal'],
    ['south africa', 'africa do sul'], ['south korea', 'korea republic', 'coreia do sul'],
    ['spain', 'espanha'], ['sweden', 'suecia'], ['switzerland', 'suica'], ['tunisia'],
    ['uruguay', 'uruguai'], ['usa', 'united states', 'united states of america', 'estados unidos', 'eua'],
    ['uzbekistan', 'uzbequistao']
  ].map(group => group.map(normalize));

  const variants = value => {
    const key = normalize(value);
    return groups.find(group => group.includes(key)) || [key];
  };
  const tokens = value => normalize(value).split(' ')
    .map(token => tokenAliases.get(token) || token)
    .filter(token => token.length > 0 && !ignored.has(token));
  const editDistance = (left, right) => {
    const a = String(left || '');
    const b = String(right || '');
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const current = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = current;
      }
    }
    return row[b.length];
  };
  const equivalentToken = (left, right) => left === right
    || (left.length >= 5 && right.length >= 5 && Math.abs(left.length - right.length) <= 1 && editDistance(left, right) <= 1);
  const tokenMatch = (left, right) => {
    const a = tokens(left);
    const b = tokens(right);
    if (!a.length || !b.length) return false;
    const common = a.filter(token => b.includes(token)).length;
    return common === Math.min(a.length, b.length) && common / Math.max(a.length, b.length) >= 0.6;
  };
  const score = (text, team) => {
    const haystack = normalize(text);
    const haystackTokens = tokens(haystack);
    return Math.max(0, ...variants(team).map(variant => {
      const required = tokens(variant);
      if (!required.length) return 0;
      if (haystack.includes(variant)) return 1;
      const matched = required.filter(token => haystackTokens.some(candidate => equivalentToken(token, candidate))).length;
      const coverage = matched / required.length;
      const acronym = required.length >= 2 ? required.map(token => token[0]).join('') : '';
      if (acronym.length >= 2 && haystackTokens.includes(acronym)) return 0.9;
      if (required.length === 1) return coverage === 1 ? 0.9 : 0;
      return coverage === 1 ? 0.95 : coverage >= 0.67 ? 0.76 : coverage;
    }));
  };
  const matches = (text, team) => score(text, team) >= 0.72;

  globalThis.PlanilhaTeamMatcher = { normalize, variants, matches, score, tokens };
})();
