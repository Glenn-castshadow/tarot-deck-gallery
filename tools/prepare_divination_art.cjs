const fs=require('fs');
const D=require('../divination-data.js');
const base='Use case: stylized-concept. Asset: finished flat full-bleed portrait divination card illustration for Ishtar Insights. Create an exceptionally beautiful, interesting, collectible-quality image, lovingly hand-painted detail, refined composition and rich luminous color. This is the complete card artwork viewed perfectly straight on, not a photograph of a physical card, not a product mockup. No text, no letters, no numbers, no labels, no watermark, no outside margin. No additional cards in the image. Keep a quiet narrow band at the very bottom for a label added by the website. '; 
const styles={
lenormand:'Art direction: jewel-toned botanical storybook realism, luminous gouache and fine engraved gold details, verdigris teal, deep lapis, cream, wine-purple and warm amber highlights. A delicate coherent frame of curling leaves and slender antique gold lines at the extreme edges, with a captivating central scene. Strong recognizability of the named traditional Lenormand subject at thumbnail size. Intricate but purposeful details; avoid clutter and generic mandalas. ',
oracle:'Art direction: poetic dreamlike fine-art illustration, luminous layered oil and gouache, iridescent dusk blues, rose gold, muted lavender, glowing apricot light. Exquisite subtle lotus-petal filigree only at the extreme edges. A beautifully composed meaningful scene with atmospheric depth, tactile surfaces and a gentle sense of wonder. Keep the main symbol unmistakable rather than abstract ornament. ',
runes:'Art direction: mythic Nordic woodland still life, museum-quality carved charcoal basalt and jade-green slate, luminous moss, frosted silver, amber firelight, tiny roots and natural mineral veins. A SINGLE large flat oval rune stone fills most of the portrait frame, nestled in a beautiful symbolic environment. The front face of the stone is an uninterrupted dark smooth central area; the exact rune will be overlaid there by the website. DO NOT put any runic glyph, carving, writing, letters, crosses, sigils or symbols on the central stone face. Details and storytelling surround the stone and along its outer rim. The central 40% of the image must remain dark, uncluttered stone, beautifully lit. ',
geomancy:'Art direction: sumptuous ancient celestial instrument, antique brass, dark blue enamel, tiny garnets and fine desert sand, warm low light and lapis sky. A SINGLE upright dark polished rectangular plaque with softly rounded corners fills most of the frame, surrounded by a beautiful symbolic environment. The central 40% must be quiet uninterrupted dark enamel, with NO dots or symbols; exact geomantic points will be added by the website. Elaborate refined arabesque engraving only around the outer rim. No invented writing. '
};
const scenes={
lenormand:[
'A graceful messenger on a richly harnessed chestnut horse approaching along a flower-lined road at dawn, wind in a blue cloak. The rider and horse are the unmistakable subject.',
'A dewy four-leaf clover, four clear heart-shaped leaflets on one stem, rendered like a precious botanical discovery amid tiny white wildflowers and morning light.',
'A magnificent three-masted sailing ship with billowing ivory sails traveling on luminous teal water, distant islands and golden clouds.',
'A welcoming ivy-covered stone country house with a blue door, glowing windows, a garden gate and late afternoon roses.',
'A magnificent ancient tree, visible strong roots and a generous living canopy, sunlit leaves and a deep woodland atmosphere.',
'Layers of dramatic silver and violet clouds, one side stormy and one side opening to warm sunlight, sky as the primary subject.',
'A single elegant emerald snake winding around a flowering branch, detailed scales, alert graceful head, lush plum-colored background.',
'A closed ornate dark wooden coffin surrounded by pale lilies in a quiet moonlit garden. Symbolic dignified ending, beautiful gothic still life, no corpse and no horror.',
'An abundant hand-tied bouquet of roses, peonies, cornflowers and foliage in a vintage glass vase, exquisite petals and a silk ribbon.',
'A single antique curved steel scythe with wooden handle, gleaming blade over a golden wheat field and tiny blue flowers, no person and no violence.',
'An antique coiled leather riding whip and a bound bundle of slender birch twigs resting on deep burgundy velvet, evocative still life, no person or violence.',
'Two small songbirds perched close together on a flowering branch, one with open beak, intricate feathers and warm morning mist.',
'A fully clothed curious child in a blue coat discovering a tiny seedling in a sunlit garden, gentle wonder, child is the central subject.',
'A beautiful alert red fox among ferns and autumn berries at the edge of a twilight forest, expressive face and luxuriant fur.',
'A powerful calm brown bear beside a woodland stream, copper-lit fur, mossy stones and dark green forest, protective and majestic.',
'A breathtaking luminous constellation-filled night sky above a quiet mountain lake, many clearly visible stars and a brilliant guiding star reflected in the water.',
'A graceful white stork standing in a lush waterside meadow, long red beak, elegant long legs and luminous wings, spring atmosphere.',
'A friendly faithful golden-brown dog sitting by a garden gate, warm intelligent eyes, detailed fur and late afternoon light.',
'A tall solitary pale stone tower rising above cypress trees, elegant architecture, distant mountains and a contemplative blue sky.',
'A beautiful formal public garden with a fountain, curved paths, trellised roses and distant small fully clothed visitors, abundant cultivated beauty.',
'A dramatic high mountain with pale snow summit and immense dark rocky slopes above misty evergreen forest, clearly a mountain landscape.',
'A clear fork in a woodland path, two distinct inviting routes diverging around a flowering tree, visible choice, no signposts or text.',
'Two tiny field mice among scattered grain and a loosely woven basket, charming detailed fur and whiskers, quiet amber still life.',
'A single unmistakable sculpted heart of deep ruby glass resting in a nest of roses and ivy, luminous reflections, elegant symbolic centerpiece.',
'A single exquisite gold ring with a luminous gemstone resting on ivory silk with a loop of myrtle, commitment as a precious still life.',
'A mysterious old bound book partly open on a velvet-covered table, beautiful embossed cover and gilded page edges, no readable writing on cover or pages.',
'A folded ivory letter in an open elegant envelope with a red wax seal, quill and a few petals on a dark polished desk, no readable writing.',
'A dignified adult man with warm thoughtful expression in elegant timeless fully clothed attire, half-length portrait in a botanical garden, richly detailed painterly realism.',
'A dignified adult woman with warm thoughtful expression in elegant timeless fully clothed attire, half-length portrait in a botanical garden, richly detailed painterly realism.',
'Three exquisite white lilies with visible gold stamens, elegant long green stems in soft ivory light, graceful botanical still life.',
'A glorious radiant golden sun above a flowering landscape, rays through dawn mist, warmth and vitality, clearly solar imagery.',
'A luminous pearl crescent moon above dark blue water, silver reflected light and deep midnight flowers, quiet magical atmosphere.',
'A single large ornate antique brass skeleton key lying diagonally across deep teal velvet with flowering ivy and a pool of warm light.',
'Two beautiful shimmering fish swimming through clear turquoise water with aquatic plants, sunlight and flowing movement.',
'A substantial antique iron anchor resting on smooth shore stones with coiled rope, blue sea and soft distant sails, clear stable central silhouette.',
'A single ornate gold Latin cross, one vertical beam and one horizontal crossbar, resting amid purple irises on deep violet velvet. Respectful contemplative religious still life.'
],
oracle:[
'A beautiful antique lantern glowing amber on a mossy path through a blue twilight garden, fireflies and soft lotus blossoms.',
'An open arched stone doorway between a quiet garden and a luminous landscape, threshold full of possibility, beautiful climbing flowers.',
'A deep old stone well with clear luminous water reflecting stars, ferns and silver vines, a sense of restoration.',
'A single luminous silk thread winding through flowers and linking two delicate spools, intimate symbolic still life with magical depth.',
'A tiny seed opening into a tender green shoot, rich dark soil, dewdrops and radiant morning light, beautiful close-up.',
'An elegant antique oval mirror framed by moonflowers, reflecting a tranquil sky and a soft dawn rather than a person.',
'A breathtaking meeting of soft foaming sea and smooth pale sand with shells, a clear curving boundary, dusk rose and blue.',
'A single glowing ember within a small carefully tended hearth, warm orange light illuminating intricate dark wood grain and tiny sparks.',
'A secret lush garden with a winding stone path, flowering herbs and luminous butterflies, cultivation and possibility.',
'A beautifully handmade ceramic vessel with iridescent glaze holding clear water, petals and reflected stars, grounded generous form.',
'An open window in an old stone wall, sheer fabric moving gently, a wide luminous landscape outside, fresh perspective.',
'A delicate arched footbridge over a calm stream, flowering vines linking two verdant banks, warm mist and a sense of repair.',
'A delicately woven empty bird nest sheltered in a flowering branch, soft moss and warm reflected light, no eggs necessary.',
'An exquisite antique compass with a clearly directional needle on a quiet velvet surface, no letters or numbers, soft paths visible in reflection.',
'Fine luminous rain falling through an evening garden, ripples in a shallow pool, silver blue and soft pink light, release and renewal.',
'A narrow inviting mountain footpath winding upward through flowers and soft cloud, distance and patient effort in a beautiful landscape.',
'An intricate wooden loom weaving glowing rose, lavender and gold threads into a beautiful textile, no person, rich tactile detail.',
'A single small bronze bell suspended from a flowering branch, a delicate silk cord and a suggestion of sound in the light.',
'A welcoming stone hearth with a gently glowing fire, folded blanket, handmade cup and amber evening light, no person.',
'An elegant adult open hand gently holding a fallen pale flower, fully natural anatomy, no extra fingers, soft luminous garden setting.',
'A sunlit orchard heavy with ripe golden fruit, beautiful branching trees and dappled light, calm abundance.',
'A perfectly still mountain lake reflecting a luminous violet dawn, reeds, mist and a quiet shore, no people.',
'A graceful small bird returning toward a flowering archway with a thread of sunlight on its wings, homecoming and renewal.',
'A richly textured blue wooden door standing open into a radiant morning garden, fresh flowers at the threshold and golden light.'
]};
const jobs=[];
for(const kind of ['lenormand','oracle','runes','geomancy']) {
  const list=kind==='geomancy'?D.figures:D[kind];
  list.forEach(item=>{
    const subject=(scenes[kind]||[])[item.id] || (kind==='runes'?`Surrounding environment expresses ${item.keyword.toLowerCase()}: ${item.meaning} Use tangible natural details to convey this theme while preserving the central BLANK stone.`:`Surrounding environment evokes ${item.keyword.toLowerCase()}: ${item.meaning} The plaque center remains BLANK for exact dots.`);
    jobs.push({model:'gpt-image-2',quality:'medium',size:['runes','geomancy'].includes(kind)?'768x960':'960x1536',output_format:'webp',output_compression:92,out:`${kind}-${String(item.id).padStart(2,'0')}.webp`,prompt:base+styles[kind]+' Subject: '+subject});
  });
}
const backs={
lenormand:'A breathtaking reversible Lenormand card back with exact 180-degree rotational symmetry: two mirrored flowering branches, tiny songbirds, golden keys, clover leaves and intertwining vines around a central intricate eight-point star rosette. Dark lapis and peacock teal ground, ruby berries, cream petals, exquisite antique gold engraving. Rich tactile painted enamel, elegant botanical border. Symmetric top and bottom; no upright-only objects, no text.',
oracle:'A breathtaking reversible oracle card back with exact 180-degree rotational symmetry: a luminous lotus mandala framed by mirrored crescent moons, flowing rose-gold ribbons, tiny stars and delicate night-blooming flowers. Midnight plum, iridescent lavender, coral-pink and soft gold. Exquisite layered painterly texture, magical depth, refined coherent border. No text.',
runes:'A breathtaking ornamental rune stone reverse: a single large oval charcoal basalt stone fills most of the portrait image, with exquisite carved interlacing roots and silver-gold Nordic knotwork that is rotationally balanced around a central polished jade cabochon. Beautiful moss and tiny amber crystals along the outer edge. Magical woodland light, photoreal painterly detail, tactile depth. No runic characters, no letters, no text.'
};
for(const [kind,prompt] of Object.entries(backs)) jobs.push({model:'gpt-image-2',quality:'medium',size:kind==='runes'?'768x960':'960x1536',output_format:'webp',output_compression:92,out:`${kind}-back.webp`,prompt:base+prompt});
fs.writeFileSync('output/imagegen/divination-v2/prompts.json',JSON.stringify({model:'gpt-image-2',version:2,jobs},null,2));
const pilots=new Set(['lenormand-00.webp','oracle-00.webp','runes-00.webp','geomancy-00.webp','lenormand-back.webp','oracle-back.webp','runes-back.webp']);
fs.writeFileSync('tmp/imagegen/divination-pilot.jsonl',jobs.filter(j=>pilots.has(j.out)).map(j=>JSON.stringify(j)).join('\n')+'\n');
fs.writeFileSync('tmp/imagegen/divination-remaining.jsonl',jobs.filter(j=>!pilots.has(j.out)).map(j=>JSON.stringify(j)).join('\n')+'\n');
console.log(`${jobs.length} unique prompts; ${pilots.size} pilot assets.`);
