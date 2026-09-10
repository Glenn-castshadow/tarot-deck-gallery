/* Two-ring comparison chart, shared by the extra-charts and chart-in-time sections. */
const BiWheel = (() => {
  const natal = typeof NatalEngine !== 'undefined' ? NatalEngine : require('./natal-engine.js');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function render({inner, outer, contact, labels, centerSymbol = '✧', centerLabel = 'TWO SKIES'}) {
    const at = (longitude,radius) => {const a=(180-longitude)*Math.PI/180;return [300+radius*Math.cos(a),300-radius*Math.sin(a)];};
    const point = (longitude,radius) => at(longitude,radius).map(n=>n.toFixed(2)).join(',');
    const rays = Array.from({length:12},(_,i)=>`<line x1="${at(i*30,205)[0]}" y1="${at(i*30,205)[1]}" x2="${at(i*30,276)[0]}" y2="${at(i*30,276)[1]}" stroke="#99b5b044"/><text x="${at(i*30+15,260)[0]}" y="${at(i*30+15,260)[1]+5}" text-anchor="middle" fill="#cbb681" font-size="20">${natal.signGlyphs[i]}︎</text>`).join('');
    function marks(points,radius,tint) {
      // Separate labels around their ring while keeping a leader to the exact longitude.
      const ordered = points.map(p=>({...p,labelLongitude:p.longitude})).sort((a,b)=>a.longitude-b.longitude);
      for(let round=0;round<12;round++) for(let i=0;i<ordered.length;i++) {
        const a=ordered[i],b=ordered[(i+1)%ordered.length];
        const gap=natal.mod(b.labelLongitude-a.labelLongitude);
        if(gap<12) b.labelLongitude=natal.mod(b.labelLongitude+(12-gap));
      }
      return ordered.map(p=>{const exact=at(p.longitude,radius),label=at(p.labelLongitude,radius+14);return `<g><title>${p.name}: ${p.sign} ${p.degrees}</title><line x1="${exact[0]}" y1="${exact[1]}" x2="${label[0]}" y2="${label[1]}" stroke="${tint}" stroke-opacity=".4"/><circle cx="${exact[0]}" cy="${exact[1]}" r="2" fill="${tint}"/><text x="${label[0]}" y="${label[1]+6}" text-anchor="middle" font-size="19" fill="${tint}">${p.symbol}︎</text></g>`;}).join('');
    }
    return `<svg class="cx-wheel" viewBox="0 0 600 600" role="img" aria-label="Two-ring astrology chart: ${esc(labels[0])} inside, ${esc(labels[1])} outside. Exact placements are listed below."><circle cx="300" cy="300" r="282" fill="#0a202c" stroke="#bba47777"/>${[276,240,205,170,144].map(r=>`<circle cx="300" cy="300" r="${r}" fill="none" stroke="#a0bfb733"/>`).join('')}${rays}${marks(inner,158,'#e8cd93')}${marks(outer,214,'#97d3d6')}${contact?`<line x1="${at(contact.aLongitude,158)[0]}" y1="${at(contact.aLongitude,158)[1]}" x2="${at(contact.bLongitude,214)[0]}" y2="${at(contact.bLongitude,214)[1]}" stroke="${['Square','Opposition'].includes(contact.type)?'#e6a6a1':'#b8d7b2'}" stroke-width="2"/><circle cx="${at(contact.aLongitude,158)[0]}" cy="${at(contact.aLongitude,158)[1]}" r="5" fill="#e8cd93"/><circle cx="${at(contact.bLongitude,214)[0]}" cy="${at(contact.bLongitude,214)[1]}" r="5" fill="#97d3d6"/>`:''}<circle cx="300" cy="300" r="58" fill="#0b202be8" stroke="#bba47755"/><text x="300" y="308" text-anchor="middle" fill="#ddc694" font-size="28">${contact?.symbol || centerSymbol}</text><text x="300" y="335" text-anchor="middle" fill="#a0b5b9" font-size="9" letter-spacing="2">${contact?.type.toUpperCase() || centerLabel}</text></svg>`;
  }
  return {render};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BiWheel;
