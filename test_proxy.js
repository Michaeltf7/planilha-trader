fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.radarfutebol.com/radar/bolivar-fluminense/15832811'))
  .then(r => r.json())
  .then(d => {
    if(!d.contents) {
        console.log("No contents returned");
        return;
    }
    const match = d.contents.match(/"idWilliamhill"\s*:\s*"(\d+)"/);
    console.log('Match found:', match ? match[1] : 'No match');
  })
  .catch(console.log);
