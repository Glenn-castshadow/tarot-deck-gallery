/* Prepare prompts only. Artwork is generated with the built-in image tool. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ref = require('../tarot-reference.js');
const root = path.resolve(__dirname, '..');
const roman = ['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
const majors = [
  'A young woman traveler steps toward the edge of a high garden terrace, looking trustingly toward sunrise, a small white dog at her heel, small bundle over her shoulder and a white rose in her hand. Beginnings and faith; cliff edge visible, no fall.',
  'A skilled woman stands at an altar, right hand raising a slender wand, left pointing toward earth. Four separate tools on altar: one wand, one cup, one sword, one pentacle. Infinity emblem above her head, roses and lilies. Focused will.',
  'A serene veiled woman sits between one pale pillar and one dark pillar, holding a closed book. Pomegranate-patterned veil behind her, crescent moon at her feet, quiet water. Hidden knowledge. No lettering on pillars or book.',
  'A serene woman with flowing auburn hair and a floral crown wears ivory and sage drapery, seated amid wheat, ripe pomegranates and roses, a bright stream behind her and patterned circular halo. Abundance and nurture.',
  'A dignified mature sovereign woman sits upright on a strong stone throne with ram-head armrests, orb and scepter in her hands, austere mountains behind. Red mantle, commanding posture. Protection and structure.',
  'A wise elder woman teacher sits between two pillars, blessing two attentive younger women. Two crossed keys rest on the step. Sacred tradition and generous teaching, no text on any surface.',
  'Two adult women face each other beneath a great winged feminine figure of light, one beside a flowering tree and one beside a fruiting tree. Their hands meet over a stream. Love and meaningful choice.',
  'A woman charioteer stands in a small decorated chariot under a starry canopy. Two sphinx-like creatures, one pale and one dark, rest in front of it. Clear wheel shapes. Resolve and balanced opposing forces.',
  'A calm woman gently cups a lion\'s muzzle with both hands. The lion rests peacefully beside her; infinity emblem above her head, flowers below. Gentle courage and compassion, no struggle.',
  'An older woman in a hooded cloak stands alone on a high mountain path, holding a lantern containing a single star and leaning on a staff. Vast quiet distance. Inner guidance.',
  'A great golden eight-spoked wheel dominates the circular composition. A serpent descends at one side, a jackal-like creature rises at the other, a sphinx sits above. Four small winged beings around it: woman, eagle, lion, bull. Cycles and change. No writing.',
  'A solemn woman seated between pillars holds perfectly balanced scales in her left hand and an upright straight sword in her right. Symmetrical composition, clear unobscured objects. Fairness and consequence.',
  'A serene adult woman hangs upside down by one ankle from a T-shaped living tree, her other knee bent across the straight leg, hands behind her back, a gold halo around her head. Peaceful suspension, no injury. Surrender and changed perspective.',
  'A quiet cloaked woman with a bone-white mask rides a pale horse through a field of harvested grain. Dark banner bearing a white rose, fresh green shoot in foreground, sunrise between distant towers. Endings and renewal, no violence or gore.',
  'A winged woman stands with one foot on land and one in a stream, carefully pouring one continuous stream between exactly two cups, one in each hand. Irises and distant sunrise. Patience, blending and balance.',
  'A horned winged allegorical woman sits on a low pedestal above two fully clothed adults whose loose chains could easily be lifted off. Small key lies within reach. Warm ember tones. Attachment and freedom of choice, no horror or nudity.',
  'A tall stone tower struck by a single fork of lightning loses its crown into storm clouds. Two small fully clothed figures tumble beside it without injury detail. Jagged diagonal energy, revelation and disruption, no gore.',
  'A woman in flowing pale-blue and ivory drapery kneels by a pool, holding exactly TWO vessels, one pouring onto earth, one into water. One large eight-point star and seven small stars overhead, irises nearby. Hope and renewal.',
  'A large moon with a serene face above a path between two towers. A dog and a wolf stand on opposite sides of the path. One crayfish emerges from the foreground pool. Dreamlike uncertainty. No human figures.',
  'A joyful woman with flowing dark hair in ivory and terracotta drapery opens her arms beneath a great radiant sun, surrounded by sunflowers and a low garden wall. Open clear daylight. Joy, vitality and truth.',
  'A great winged woman in the clouds sounds a long trumpet. Exactly three clothed women below rise from dark alcoves toward dawn with arms lifted. Mountains beyond. Awakening, forgiveness and answering a call.',
  'A graceful woman in flowing fabric dances inside a circular wreath, holding one short wand in each hand. Four small distinct emblems at diagonal positions: woman\'s face, eagle, lion, bull. Wholeness and completion.'
];
const suitScenes = {
  Wands: [
    'One hand extends from a luminous cloud holding exactly ONE flowering wand upright, hills below. Creative beginnings.',
    'A woman on a terrace holds a small globe and looks to distant sea. Exactly TWO upright wands, one each side. Planning and choice.',
    'A woman seen from behind watches three small ships on the sea. Exactly THREE upright wands on the terrace around her. Foresight.',
    'Exactly FOUR tall upright wands support a flower garland, two on each side, with two celebrating women and a welcoming home beyond. Joy and belonging.',
    'Exactly FIVE women each hold exactly ONE wand in a playful contest, five wands total, separate visible ends. Friendly conflict, no injury.',
    'A woman wearing a laurel wreath rides a pale horse, holding ONE wand with a wreath. FIVE more wands stand separately behind her, six total. Recognition.',
    'A woman on a ledge defends her position with ONE horizontal wand. Exactly SIX wands rise from below, three left and three right, seven total. Courage.',
    'Exactly EIGHT parallel wands fly diagonally above a broad river landscape, separated by clear gaps, no people and no other rods. Swift movement.',
    'A watchful woman holds ONE upright wand in foreground. Exactly EIGHT wands form a fence behind her, four left and four right, nine total. Resilience.',
    'A woman walks toward a village carrying exactly TEN wands, visibly arranged as two groups of five, with separate clear ends. Heavy responsibility.',
    'A young adult woman studies ONE flowering wand held upright in both hands, standing in a bright open landscape. Curiosity and enthusiasm.',
    'An energetic woman on a rearing chestnut horse raises ONE flowering wand, cloak streaming. Adventure and bold action.',
    'A warm confident queen on a sunflower throne holds ONE wand in one hand and a sunflower in the other; a black cat at her feet. Charisma.',
    'A commanding sovereign woman sits on a throne with lion and salamander ornament, holding ONE flowering wand. Leadership and vision.'
  ],
  Cups: [
    'A hand from a luminous cloud offers exactly ONE large cup overflowing into a pool in five fine streams, a white dove above and water lilies below. New love.',
    'Two adult women face each other, each raising ONE cup, exactly TWO total, a winged lion emblem above their joined hands. Mutual affection.',
    'Exactly THREE women celebrate together, each lifting exactly ONE cup, three total, flowers and fruit below. Friendship and celebration.',
    'A contemplative woman beneath a tree ignores ONE cup offered from a cloud. Exactly THREE cups sit in a row before her, four total. Reconsideration.',
    'A grieving cloaked woman looks at exactly THREE fallen cups in foreground; TWO cups remain upright behind her, five total. A bridge leads home.',
    'Two figures exchange ONE flower-filled cup in an old courtyard. Exactly FIVE more flower-filled cups sit separately on the low wall, six total. Kindness and memory.',
    'Exactly SEVEN cups float in clouds, in two clear rows of four and three. Contents individually: jewels, laurel, a castle, a serpent, a dragon, a veiled figure, a face. A woman considers them below. Choices.',
    'Exactly EIGHT cups arranged four below four in foreground, all separately visible. A cloaked woman walks away toward hills beneath a crescent moon. Seeking deeper meaning.',
    'A contented woman sits before exactly NINE cups on a single curved shelf, all separately visible. Contentment and wishes fulfilled.',
    'Exactly TEN cups arranged as two groups of five in a rainbow overhead. Two adults embrace beneath it while two children play near a home. Shared happiness.',
    'A young adult woman looks with surprise at a small fish emerging from ONE cup she holds, sea behind. Imagination and a tender message.',
    'A woman on a calm white horse carries ONE cup forward at walking pace beside a river. Romantic invitation and idealism.',
    'A compassionate queen sits on a shell-decorated throne by the sea, contemplating ONE ornate lidded cup in both hands. Emotional wisdom.',
    'A calm sovereign woman on a throne amid moving sea holds ONE cup and a short scepter, a ship in the distance. Steady emotional leadership.'
  ],
  Swords: [
    'A hand from a cloud holds exactly ONE upright sword through a small crown, olive and palm branches nearby, distant mountains. Clarity and truth.',
    'A blindfolded woman seated beside moonlit water holds exactly TWO swords crossed at her chest, one per hand. Difficult balanced choice.',
    'A symbolic red heart pierced by exactly THREE swords against rain clouds. No human body and no gore. Sorrow and honest understanding.',
    'A clothed woman rests peacefully on a stone bench. THREE swords hang separately above her and ONE lies below the bench, four total. Rest and recovery.',
    'A woman gathers THREE swords while TWO lie on the ground; two distant figures walk away. Exactly FIVE swords total. Costly conflict, no wounds.',
    'A small boat carries a cloaked adult and child across calm water. Exactly SIX swords stand along the bow, three on each side. A rower guides them. Transition.',
    'A woman quietly carries FIVE swords away from a camp while exactly TWO remain planted behind her, seven total. Strategy and secrecy; all blades clearly separated.',
    'A blindfolded woman with loosely wrapped cloth around her arms stands among exactly EIGHT upright swords, four on each side, with open path ahead. Self-limiting beliefs, no injury.',
    'A woman sits awake on a bed with face in hands; exactly NINE swords hang horizontally in nine separate rows above and behind her. Anxiety, no threat or injury.',
    'An empty dark cloak on a dawn shore, with exactly TEN swords planted around it in two clear groups of five. No body, no injury. An ending and new dawn.',
    'A watchful young adult woman holds ONE sword upright in a windswept landscape, birds overhead. Alert curiosity.',
    'A determined woman on a swift white horse holds ONE sword forward, wind bending trees. Decisive action, no combat.',
    'A clear-eyed queen on a butterfly-patterned throne holds ONE upright sword and extends her free hand in welcome. Honest discernment.',
    'A wise sovereign woman on a symmetrical stone throne holds ONE upright sword at her center, clear sky beyond. Reason and just authority.'
  ],
  Pentacles: [
    'A hand from a luminous cloud offers exactly ONE large gold pentacle over a flowering garden, with a gate and mountain path beyond. Material opportunity.',
    'A woman balances exactly TWO gold pentacles joined by a looping infinity ribbon, small ships riding waves behind her. Adaptability.',
    'A craftswoman and two collaborators discuss an arch decorated with exactly THREE gold pentacles arranged as a triangle. Skilled cooperation.',
    'A seated woman holds ONE pentacle to her chest, balances ONE on her crown and rests her feet on TWO more, four total. Security and holding tight.',
    'Two weary clothed travelers pass a warmly lit window displaying exactly FIVE pentacles, three above two. An open nearby doorway offers shelter. Hardship and help.',
    'A generous woman with balanced scales offers small unmarked coins to two people. Exactly SIX large pentacles in the air, three left and three right. Fair giving.',
    'A woman rests on a garden hoe and assesses a leafy vine bearing exactly SEVEN pentacles, arranged four and three, clearly separated. Patience and investment.',
    'A craftswoman engraves ONE pentacle on her workbench. Exactly SEVEN finished pentacles hang on the wall, four left and three right, eight total. Practice.',
    'An independent woman stands in a grape garden with a small hooded falcon on her wrist. Exactly NINE pentacles on low vines, five left and four right. Earned abundance.',
    'A multigenerational family gathers under a garden arch with two dogs. Exactly TEN pentacles form a clear border within the scene, five left and five right. Legacy and belonging.',
    'A young adult woman studies ONE gold pentacle held in both hands above a green field. Practical learning and opportunity.',
    'A patient woman on a standing dark horse holds ONE gold pentacle over a cultivated field. Reliability and steady effort.',
    'A nurturing queen in a lush garden cradles ONE gold pentacle on her lap, a rabbit at her feet. Resourcefulness and care.',
    'A prosperous sovereign woman sits on a grape-and-bull decorated throne, ONE gold pentacle on her knee, a short scepter in her other hand. Responsible stewardship.'
  ]
};
const layout = 'ONE finished individual circular tarot card, exactly straight on, in a square canvas. Perfect circle centered at 50%/50%, outer diameter 94% of canvas width, complete edges inside a uniform 3% warm ivory margin. No sheet, no montage, no packaging. All important imagery and suit objects comfortably inside the inner circle. Consistent narrow ornamental rim spanning outer 8% of circle radius, double fine antique-gold rules. Art fills the inner circle. Readable figures with natural anatomy. No other cards. No signature, watermark, extra words or incidental writing.';
const decks = [
 {id:'arcana-round',label:'Arcana',reference:'exec-004aaac2-69c1-44d9-b3af-7f1f01882417.png',
 style:'Alphonse Mucha-inspired Art Nouveau lithographic illustration combined with restrained Art Deco geometry, matching the supplied round Arcana reference sheet. Graceful women, fine expressive faces, flowing hair and draped garments, sinuous botanical outlines, patterned halos. Flat restrained lithographic color with delicate shading, fine dark ink contours, warm paper texture. NOT photorealistic, NOT 3D, NOT digital fantasy realism. Muted jade, peacock teal, antique gold, warm ivory, blush and restrained terracotta. Narrow peacock-teal rim with geometrical gold fans at the left and right sides, precise concentric stepped rules. Illustrated figures may vary in age and complexion; all principal human figures are women. Preserve this coherent palette and line quality throughout the deck.',
 suit:'Wands are slender flowering wooden rods; cups are simple gold or terracotta chalices; swords are straight silver blades with gold hilts; pentacles are large gold discs with a single five-pointed star. Decorative border uses fans and leaves, never extra suit objects.',
 back:'A perfectly 180-degree rotationally symmetric medallion of stylized ivory irises, jade leaves, Art Deco palm fans and stepped concentric antique-gold rings on peacock teal. Central eight-pointed gold rosette. Two identical mirrored iris pairs above and below. Flat lithographic treatment, delicate ink lines, warm paper grain. Exact balance and coherent Arcana face border. No text, no numeral, no figures.'},
 {id:'dia-de-los-muertos-round',label:'Día de los Muertos',reference:'exec-cc7691d8-30e8-46d5-91ef-9444d3b2f707.png',
 style:'Luminous richly detailed painted illustration matching the supplied Día de los Muertos round card reference. Mexican remembrance celebration, tender ancestral continuity, dignity and warmth. Mexican women of varied ages and skin tones, expressive brown eyes, dark braids, elegant decorative calavera face paint, embroidered dresses and shawls. Faces visibly alive with decorative paint, not actual exposed skulls. Orange and gold marigolds, deep plum, midnight teal, magenta, candlelight. Marigold crown on principal woman unless hood, crown or helmet is required by the scene. Festive papel picado and ofrenda details only when space permits without obscuring tarot symbols. Narrow midnight-teal rim with evenly spaced small orange marigold flowers and engraved gold leaves, double antique-gold circular rules. Warm sophisticated painterly detail, not horror and not cartoon. Mood follows each tarot card: grief or uncertainty can be quiet and tender. No artist signature.',
 suit:'Translate the setting into Mexican courtyards, gardens, candlelit rooms, paths of marigold petals, landscape or night sky as appropriate. Keep each tarot scene\'s actions and exact symbolic object counts. Wands are straight wooden staffs wrapped with small marigold garlands; cups are painted Talavera ceramic chalices; swords are straight silver ceremonial blades with ornamented brass hilts; pentacles are large gold discs with one five-pointed star framed by tiny marigold petals. Use only small marigold flowers in the border, never extra cups, swords, staffs or pentacles. Background candles must look like small candles, not wands. All principal figures are women; children and distant relatives may be mixed.',
 back:'A perfectly 180-degree rotationally symmetric midnight-teal medallion with a central eight-petaled marigold rosette, two identical small decorated sugar skulls facing outward at top and bottom, mirrored orange marigolds, gold leaves and magenta papel-picado lace ornament. Richly detailed luminous painting matching the faces, narrow marigold-and-gold border. Celebrate remembrance, no horror. No text, no numeral, no people.'}
];
const all = [];
for (const deck of decks) {
 const base = path.join(root,'deck-art',deck.id);
 for (const dir of ['cards','references','generation-records','contact-sheets']) fs.mkdirSync(path.join(base,dir),{recursive:true});
 const source = path.join('C:/Users/glenn/.codex/generated_images/01a0bb1b-e178-7700-82bb-185c0ea74526',deck.reference);
 const reference = path.join(base,'references','approved-style.png');
 if(!fs.existsSync(reference)) fs.copyFileSync(source,reference);
 const cards = [];
 for(let i=0;i<79;i++) {
   const name = i===78 ? 'Card back' : ref.name(i);
   const slug = i===78 ? 'back' : ref.slug(i);
   const suit = i>=22 && i<78 ? ref.SUITS[Math.floor((i-22)/14)] : null;
   const scene = i===78 ? deck.back : i<22 ? majors[i] : suitScenes[suit][(i-22)%14];
   const type = i===78 ? 'back' : i<22 ? 'major' : suit.toLowerCase();
   const title = i===78 ? 'NO letters or text anywhere on card back.' : `Along lower rim, accurately typeset exactly "${name.toUpperCase()}" in legible elegant gold capitals following the circular arc. ${i<22 ? `At top center of rim place exactly "${roman[i]}".` : 'At top center of rim place one small ornamental flower, no number or other words.'} Do not write the deck name.`;
   const prompt = `Use case: illustration-story. Asset: ${deck.label}, ${name}, finished circular tarot card.\nREFERENCE: supplied image is the approved visual language only. Generate ONLY the named single card, never reproduce a multi-card sheet.\n${layout}\nSTYLE: ${deck.style}\n${i===78?'':deck.suit}\nSCENE: ${scene}\nLETTERING: ${title}\nQUALITY: composition designed specifically for a circle; title fully inside rim and never cut off. Respect exact counts, separate countable objects so none merge. Scene and title must agree. Beautiful publication-quality original illustration.`;
   cards.push({deck:deck.id,label:deck.label,index:i,name,category:type,file:path.join(base,'cards',i===78?'78-back.png':`${String(i).padStart(2,'0')}-${slug}.png`).replaceAll('\\','/'),reference:reference.replaceAll('\\','/'),prompt});
 }
 fs.writeFileSync(path.join(base,'generation-plan.json'),JSON.stringify({tool:'Built-in image_gen; one generation per card',label:deck.label,format:'Circular art in square canvas; proof assets, not printer-specific bleed masters',cards},null,2)+'\n');
 all.push(...cards);
}
if(all.length!==158)throw new Error('Expected 158 designs');
fs.writeFileSync(path.join(root,'deck-art','round-decks-queue.json'),JSON.stringify(all,null,2)+'\n');
console.log('Prepared 158 individual card prompts, two references and two generation plans.');
