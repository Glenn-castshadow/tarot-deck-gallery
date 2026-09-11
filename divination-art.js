/* Original line emblems. No third-party card artwork or runtime image requests. */
window.DivinationArt = (() => {
  const paths = {
    rider:'M18 64h58l-8-23-19-7-15 10-8-5-9 7 5 9M32 63l-8 18m34-18 8 18M47 35l7-17 13 5-9 14m-5-17-10-6',
    clover:'M50 50C12 30 25 8 43 25L50 36C55 1 86 17 69 38L58 48C91 48 87 81 62 68L51 58C45 88 15 74 33 56ZM50 56v30',
    ship:'M15 65h70L72 81H31ZM49 16v49M45 23 23 57h22ZM54 29l23 28H54M15 89q10-7 20 0t20 0t20 0',
    house:'M14 47 50 16l36 31M24 42v43h52V42M42 85V60h16v25M31 52h7m24 0h7',
    tree:'M50 85V47M35 85h30M50 59 34 47m16 7 16-13M30 62C2 47 22 24 33 32 29 6 65 5 65 29c25-10 40 24 16 34Z',
    clouds:'M24 64C1 60 7 31 29 36 28 7 69 7 72 35c25-1 27 31 6 32H24m8 14h35m-23 9h17',
    snake:'M69 17c-40-12-57 21-17 30 40 9 21 44-20 30M63 14l13 3-11 7m12-7 11-6',
    coffin:'M37 14h26l15 24-10 48H32L22 38ZM50 33v31M39 44h22',
    bouquet:'M25 44 50 87 77 44M50 78l-3-44M35 66l19-29M58 68l-1-19M20 28q0-15 14-8 13-7 13 8 8 13-7 17-15 7-20-5ZM48 24q0-16 15-9 16-5 15 11 8 13-9 18-16 1-16-10',
    scythe:'M36 86 61 16M61 19C40 12 15 20 9 44c20-16 37-15 49-13M42 69l14 5',
    whip:'M24 82 50 44M38 82 58 50M50 44C13 23 76-3 75 27S28 63 22 26M58 50q38 5 27-27',
    birds:'M10 49q20-25 39 0 20-25 40 0M29 28q10-13 20 0 10-13 20 0M29 70q10-13 20 0 10-13 20 0',
    child:'M39 21a11 11 0 1 0 22 0 11 11 0 1 0-22 0M50 33v29M26 44l24 5 24-5M50 62 34 85m16-23 16 23',
    fox:'M18 19 27 60 50 83 75 60 83 19 58 38H42ZM27 60l17-5m31 5-17-5M44 72h12l-6 9Z',
    bear:'M27 33C8 20 18 8 32 20M70 22C83 7 97 28 78 36M25 30Q50 6 76 30L81 64Q76 87 50 88 23 86 19 66ZM34 46h1m29 0h1M39 67q11-16 22 0L50 77Z',
    stars:'M50 12 59 39 88 40 65 57 73 85 50 68 27 85 35 57 12 40 41 39ZM15 13v12m-6-6h12m61 56v14m-7-7h14',
    stork:'M64 19 47 39 57 57 29 66 18 58 35 43 47 39M64 19l23 5-26 2M42 65l5 22m6-25 16 22M38 87h17',
    dog:'M30 27 14 43 25 62 32 45M68 27l18 16-11 19-7-17M30 29Q50 15 69 29L67 70Q50 87 32 70ZM39 47h1m20 0h1M42 63h16l-8 8Zm8 8v9',
    tower:'M28 84V31H23V15h13v10h10V15h10v10h10V15h12v16h-7v53ZM44 84V66h12v18M44 43h12v12H44Z',
    garden:'M18 86V38Q50-4 82 38v48M27 85V39Q50 9 73 39v46M27 61h46M39 62v23m22-23v23M11 85h78',
    mountain:'M8 83 37 25 51 49 65 16 94 83ZM25 49l12 6 8-12m12-8 8 10 8-11',
    crossroads:'M42 87V56L14 28m44 59V56l28-28M5 29V14h15M80 14h15v15M50 49V12m-9 9 9-9 9 9',
    mice:'M24 51C11 21 38 15 44 39 60 17 83 32 67 48 84 61 80 80 54 81 30 81 15 71 24 51ZM44 59h1m18 1h1M49 72h10M22 64C-3 86 8 96 27 91',
    heart:'M50 83C-5 50 11 10 35 24L50 37 65 24C89 10 105 50 50 83Z',
    ring:'M24 61a26 26 0 1 0 52 0 26 26 0 1 0-52 0M34 31 28 19 40 9h20l12 10-6 12ZM28 19h44M40 9l10 22L60 9',
    book:'M50 26Q29 9 12 20v62q19-10 38 5 19-15 38-5V20Q70 9 50 26v61M21 32l19 5m-19 9 19 5m20-14 18-5m-18 19 18-5',
    letter:'M13 27h74v49H13ZM13 27l37 29 37-29M13 76l27-27m47 27L60 49',
    man:'M35 27a15 15 0 1 0 30 0 15 15 0 1 0-30 0M20 84V68q0-23 30-23t30 23v16ZM35 51l15 21 15-21',
    woman:'M32 29q0-20 18-20t18 20l7 22H25ZM37 29q13 12 26 0M19 86q0-31 31-31t31 31ZM39 55l11 13 11-13',
    lily:'M50 83V51M50 55C13 54 17 24 18 18 40 22 47 37 50 55 48 27 58 15 69 12 85 42 63 54 50 55ZM50 71q22-18 30-4-11 16-30 11M50 78Q24 60 21 72q10 14 29 6',
    sun:'M29 50a21 21 0 1 0 42 0 21 21 0 1 0-42 0M50 6v12m0 64v12M6 50h12m64 0h12M19 19l9 9m44 44 9 9M19 81l9-9m44-44 9-9',
    moon:'M67 12C23-1 4 65 49 85 65 92 80 85 88 75 47 80 28 30 67 12ZM76 28v14m-7-7h14',
    key:'M18 31a17 17 0 1 0 34 0 17 17 0 1 0-34 0M47 44l37 37M67 64l11-11m-1 21 11-11',
    fish:'M14 47Q43 13 73 48L91 28v41L73 52Q43 85 14 47ZM30 44h1M48 29l8-10 11 17M48 66l8 11 11-16',
    anchor:'M43 19a7 7 0 1 0 14 0 7 7 0 1 0-14 0M50 27v58M30 40h40M16 62q0 19 34 23 34-4 34-23M11 70l5-12 10 9m48 0 10-9 5 12',
    cross:'M40 13h20v24h23v20H60v31H40V57H17V37h23Z'
  };
  const runePaths=['M35 85V15M35 40l35-25M35 65l35-25','M28 85V15l44 22v48','M35 85V15m0 15 35 20-35 20','M35 85V15l32 24M35 45l32 24','M30 85V15h24l17 22-41 17 42 31','M69 17 31 50l38 33','M24 17l52 66M76 17 24 83','M32 85V15l40 23-40 22','M27 15v70m46-70v70M27 30l46 40','M50 15v70M22 30l56 40','M50 15v70','M47 15 24 35l23 17m6-4 23 17-23 20','M42 85V15l22 22M42 85 20 63','M75 15 51 37 27 15v70l24-22 24 22','M50 85V15M24 22l26 30 26-30','M69 15 30 43h40L31 85','M50 85V15M22 43l28-28 28 28','M30 85V15l39 17-39 18 39 17Z','M25 85V15l25 29 25-29v70','M25 85V15l50 39M75 85V15L25 54','M36 85V15l36 28','M50 19 25 50l25 31 25-31Z','M25 15v70l50-70v70Z','M24 84 50 60l26 24M50 60 26 37l24-23 24 23Z'];
  function svg(body, cls='') { return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`; }
  function hexagramSvg(bits, marks=[]) {
    // bits: six '1'/'0' bottom-up; marks: indices of changing lines with their kind ('o' old yang circle, 'x' old yin cross).
    const rows=bits.map((b,i)=>{const y=88-i*14;return b==='1'?`<rect x="18" y="${y-4}" width="64" height="8" rx="1" fill="currentColor" stroke="none"/>`:`<rect x="18" y="${y-4}" width="26" height="8" rx="1" fill="currentColor" stroke="none"/><rect x="56" y="${y-4}" width="26" height="8" rx="1" fill="currentColor" stroke="none"/>`;}).join('');
    const marked=marks.map(({index,kind})=>{const y=88-index*14;return kind==='o'?`<circle cx="91" cy="${y}" r="4"/>`:`<path d="M87 ${y-4}l8 8m0-8l-8 8"/>`;}).join('');
    return svg(rows+marked,'dv-hexagram');
  }
  function hexagram(values) { return hexagramSvg(values.map(v=>v%2?'1':'0'), values.flatMap((v,i)=>v===9?[{index:i,kind:'o'}]:v===6?[{index:i,kind:'x'}]:[])); }
  function hexagramFromSymbol(symbol) { return hexagramSvg(symbol.split('')); }
  function emblem(kind, item) {
    if(kind==='lenormand') return svg(`<path d="${paths[item.symbol]}"/>`);
    if(kind==='runes') return svg(`<path d="${runePaths[item.id]}" stroke-width="4"/>`);
    if(kind==='geomancy') return svg(item.symbol.split('').map((n,i)=> n==='1'?`<circle cx="50" cy="${20+i*20}" r="4" fill="currentColor"/>`:`<circle cx="35" cy="${20+i*20}" r="4" fill="currentColor"/><circle cx="65" cy="${20+i*20}" r="4" fill="currentColor"/>`).join(''));
    if(kind==='iching') return hexagramFromSymbol(item.symbol);
    const count=3+item.id%6;
    return svg(`<circle cx="50" cy="50" r="34" opacity=".5"/>${Array.from({length:count},(_,i)=>`<ellipse cx="50" cy="34" rx="12" ry="23" transform="rotate(${i*360/count} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="6" fill="currentColor"/>`);
  }
  return {emblem, hexagram, hexagramFromSymbol};
})();
