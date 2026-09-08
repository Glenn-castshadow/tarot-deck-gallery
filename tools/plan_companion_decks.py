"""Persist the scene plan and exact built-in image generation prompts."""
import json
import shutil
from pathlib import Path
from build_ishtar_print import CARDS

ROOT = Path(__file__).resolve().parents[1]
SCENES = [
    "A young traveler with a bundle and a small white dog takes a first step at a cliff edge; an open horizon suggests trust and beginnings.",
    "A standing magician raises a wand while pointing down with the other hand. One chalice, one sword, one pentacle disk and one short wand lie distinctly on a table. A small infinity above the head; agency and craft.",
    "A serene priestess sits between contrasting pale and dark pillars, a closed scroll in her lap, crescent at her feet and still water behind a hanging veil; intuition and hidden knowledge.",
    "A serene pregnant empress in coral-red and ivory robes sits on a low throne beside wheat, pomegranates and a stream. A Venus disk at her feet, a crown of twelve tiny stars; nurturing and abundance.",
    "A dignified elder ruler in a red-coral mantle sits upright on a cubic stone throne with subtle ram-head armrests, holding an orb and a simple scepter. Mountains behind; structure, guardianship and steadiness.",
    "A wise teacher seated between two pillars offers a blessing to two attentive learners. Two crossed keys rest on a low step. The atmosphere is generous learning and shared tradition, not authoritarian spectacle.",
    "Two adult lovers stand facing one another across a small stream, reaching open hands toward each other. One fruit tree and one bare flowering tree flank them. A winged figure above unites the scene; honest choice and connection.",
    "A composed charioteer stands in a small elegant wheeled chariot. Two sphinxlike animals, one pale and one deep blue, sit facing forward in front of it. A star canopy and open road; opposing forces guided toward one direction.",
    "A calm woman gently rests both hands beside the muzzle of a peacefully seated golden lion. Her stance is relaxed and compassionate, a tiny infinity loop above her head. Gentle courage, no struggle or violence.",
    "A solitary elder in a simple cloak stands on a high rocky path holding a small lantern containing a six-pointed star and a walking staff. Vast quiet distance; contemplation and guidance.",
    "A large eight-spoked wheel stands upright or floats over a landscape, an ascending small animal on one side and descending serpent on the other. A composed sphinx atop the wheel, small winged beings in four corners. Cycles and change. No letters on the wheel.",
    "A centered seated woman holds balanced scales in one hand and an upright straight sword in the other. Two plain pillars frame her; symmetrical, calm and clear, representing truth and fair consequences.",
    "A peaceful person hangs upside down by ONE ankle from a T-shaped living tree, the free leg bent across the straight leg and hands relaxed behind the back. A small warm halo around the head, no injury. Voluntary pause and changed perspective.",
    "A cloaked skeletal rider on a pale horse crosses a field of cut grain while a new green shoot grows in the foreground. A small black banner bears a white rose; a sunrise between distant pillars. Peaceful transformation, no gore or terror.",
    "A graceful winged figure pours a thin stream between TWO distinct chalices, one foot on dry land and one in shallow water. A winding path beyond, a tiny sun on the horizon; balance, patient blending and healing.",
    "A stylized horned winged figure sits on a low stone pedestal. Two fully clothed adults stand below with loose chains around their waists, visibly able to lift the chains away. Symbolic attachment and regained agency, dignified rather than frightening.",
    "A tall narrow tower on a rocky rise is struck by one angular bolt of lightning. Its crown-like top breaks loose; two small clothed figures fall away into open space. Clear dramatic rupture without gore; truth breaking a brittle structure.",
    "A woman in a simple light garment kneels by a pool, pouring water from TWO pitchers, one into the pool and one onto the land. ONE large eight-pointed star and SEVEN smaller stars above. Renewal, quiet hope and openness.",
    "A luminous full moon above a winding path between TWO towers. A dog and a wolf stand on opposite sides, a small crayfish emerges from a foreground pool. An uncertain dreamlike journey, composed and legible.",
    "A joyful young child in a simple ivory tunic rides a calm white horse in front of sunflowers. A red-coral banner, a large warm radiant sun overhead. Clear daylight, vitality and uncomplicated joy.",
    "A winged herald high above sounds a single trumpet with a small cross banner. Three fully clothed people rise from opened low stone chambers with lifted faces and welcoming arms. Renewal and answering a calling; no horror.",
    "A graceful dancing adult figure draped in a flowing scarf holds two short wands inside an oval leafy wreath. Small human, eagle, bull and lion emblems occupy the four corners. Completion, integration and a welcoming horizon.",
    "ONE hand emerges from a small cloud offering ONE sprouting wooden wand upright over an open landscape. A few fresh leaves and a distant beginning path; creative potential.",
    "A person on a high terrace holds a small globe and ONE wand; a SECOND wand is fixed beside the parapet. Exactly TWO wands. Surveying a distant horizon, planning and possibility.",
    "A traveler seen from behind watches small ships crossing distant water. Exactly THREE upright wooden wands planted around the figure, one being held. Expansion and anticipation.",
    "Exactly FOUR upright wands form an open ceremonial gateway with a garland connecting the tops. Two people welcome one another beyond it, simple home in the distance. Celebration and belonging.",
    "FIVE young adults in a playful but energetic practice contest each hold ONE wooden wand, crossing them at different angles. Exactly FIVE wands total; no injury. Creative friction and competing efforts.",
    "A rider on a pale horse carries ONE upright wand topped with a laurel wreath, while FIVE companions carry one wand each. Exactly SIX wands total. Public recognition, shared celebration.",
    "A resolute person on a small hill braces ONE wand across the body against SIX wand tips rising from the lower foreground. Exactly SEVEN wands. Defending a position with courage.",
    "Exactly EIGHT long wooden wands fly in parallel diagonals through open sky above a distant river and rolling landscape. No person, no other sticks. Swift news and movement, broad negative space.",
    "A tired but alert person with a small head bandage holds ONE upright wand beside a fence of exactly EIGHT other upright wands. Exactly NINE total. Resilience and earned boundaries.",
    "A person carries a bundled load of exactly TEN distinct wooden wands toward a modest distant home, leaning forward under their weight. Responsibility, burdens and the need to set something down.",
    "A curious youthful page in a simple traveling robe stands on open ground studying ONE tall sprouting wand held upright. Fresh curiosity and enthusiasm; full figure clearly legible.",
    "An energetic knight in light stylized armor rides a rearing horse, holding ONE wooden wand upright. Warm wind moves the cloak, bare landscape behind. Creative pursuit, speed and bold initiative.",
    "A composed queen on a simple throne holds ONE wand and a sunflower. A small black cat sits by her feet, two small lion motifs on the throne. Warm confidence and creative self-possession.",
    "A mature king in a warm-colored cloak sits upright holding ONE sprouting wand. A small salamander near the feet and restrained lion detail on the throne. Wise initiative and responsible creative leadership.",
    "ONE ornate but simple chalice is offered by a hand emerging from a cloud. FIVE narrow streams flow from it into a calm pool with a few lotus flowers. A small white dove above; emotional beginnings.",
    "Two adults face each other, each holding ONE chalice at chest height, exactly TWO cups. A small winged lion emblem with two intertwined slender lines above them. Mutual affection and honest partnership.",
    "THREE friends raise ONE chalice each in a circle, exactly THREE cups. A few ripe fruits and flowers by their feet. Friendship, shared joy and celebration.",
    "A seated person beneath one tree looks inward while THREE chalices rest on the ground. A hand emerging from a small cloud offers a FOURTH chalice at the side. Exactly FOUR cups. Reflection and an overlooked invitation.",
    "A cloaked person looks toward THREE overturned chalices spilling water. TWO upright chalices remain behind them, a bridge over a small stream in the distance. Exactly FIVE cups. Grief with support still available.",
    "Two youthful figures exchange ONE flower-filled chalice in a quiet garden. FIVE other flower-filled chalices are placed clearly around them. Exactly SIX cups. Kindness, memory and simple generosity.",
    "A person faces exactly SEVEN chalices resting on separate small cloud shelves. Each contains one different symbol: a face, a veiled figure, a serpent, a small tower, jewels, a laurel wreath, and a tiny dragon. Choices, imagination and discernment.",
    "A cloaked traveler walks away toward hills under a crescent moon. Exactly EIGHT chalices remain neatly arranged in the foreground, five below and three above, an intentional gap visible. Leaving what is no longer fulfilling.",
    "A contented person sits comfortably on a simple bench with folded arms. Exactly NINE chalices line a single curved shelf behind them, all distinct. Satisfaction, gratitude and emotional fulfillment.",
    "Two adults with two playing children stand near a home and stream, welcoming a rainbow. Exactly TEN chalices arranged clearly along the rainbow arc. Family, belonging and lasting shared joy.",
    "A thoughtful youthful page by the water holds ONE chalice with a small fish peeking out. A gentle breeze moves a simple patterned tunic. Surprise, tenderness and imaginative curiosity.",
    "A calm knight rides a walking white horse beside a stream and offers ONE chalice forward. Gentle rather than charging, reflective water and open space. Heart-led pursuit and invitations.",
    "A thoughtful queen sits on a shore-side throne holding ONE beautiful lidded chalice in both hands, studying it with care. A few shells and flowing water. Deep empathy and emotional wisdom.",
    "A composed mature king sits on a stone throne surrounded by gentle moving water, holding ONE chalice and a small scepter. A small ship far away and a leaping fish. Steadiness amid emotional currents.",
    "ONE hand emerges from a small cloud holding ONE upright double-edged sword crowned by a simple golden crown and two leafy branches. Open mountain landscape. Clarity, truth and decisive thought.",
    "A blindfolded seated woman holds exactly TWO swords crossed symmetrically over her chest. Still water and a crescent moon behind her. A suspended decision and careful inner listening.",
    "ONE simple red heart is pierced by exactly THREE straight swords under a small rain cloud. Symbolic clean graphic emblem, not anatomical or bloody. Sorrow, honesty and the pain of separation.",
    "A peaceful clothed figure lies resting on a low stone bench, hands together. THREE swords hang above, ONE sword rests horizontally below the bench. Exactly FOUR. A quiet window and stillness; recovery and reflection.",
    "One person in the foreground holds THREE swords while TWO swords lie separately on the ground. Two other people walk away toward the sea. Exactly FIVE swords. A hollow victory and the cost of conflict.",
    "A boatman gently poles a small boat carrying an adult and child across calm water. Exactly SIX swords stand upright in the bow, their blades clearly separate. Transition, passage and leaving difficulty behind.",
    "A cautious traveler carries FIVE swords while glancing back at TWO swords still planted beside a simple camp. Exactly SEVEN total. Strategy, discretion and the tension of concealment.",
    "A blindfolded lightly bound woman stands on open ground between exactly EIGHT planted swords, FOUR on each side, with an obvious opening before her. No injury. Feeling restricted while a path remains possible.",
    "A person sits upright in bed with head in hands. Exactly NINE swords hang horizontally on the wall behind them, clearly separate. A small dawn-lit window suggests worry is passing; anxiety, reflection and compassion.",
    "A clothed person lies face down on still earth with exactly TEN stylized swords aligned along the back. No blood, wounds or gore; abstract symbolic placement. A golden dawn opens beyond a calm sea. A difficult ending and the next beginning.",
    "An alert youthful page stands on a windy rise holding ONE upright sword in both hands, looking to the side. A few windblown leaves. Curiosity, observation and the desire for truth.",
    "A focused knight on a galloping horse holds ONE sword forward and upward. Wind streams the cloak and bends distant trees. Clear forceful diagonal movement; determination and hasty thought.",
    "An upright queen sits on a spare throne with a butterfly motif, holding ONE vertical sword while the other hand opens in a clear outward gesture. Clouds and open sky. Discernment, honesty and boundaries.",
    "A wise king sits squarely on a simple throne, holding ONE upright sword in the right hand. A calm direct gaze, a few cloud forms and two distant birds. Fair judgement and disciplined thought.",
    "ONE hand emerges from a cloud offering ONE large golden disk marked with a simple five-point star. Below, a small flowering garden path passes through an open arch toward distant mountains. Material opportunity.",
    "A lively person balances exactly TWO golden pentacle disks joined by a single looping infinity ribbon. Two small ships bob on waves far behind. Adaptability and balancing responsibilities.",
    "A stone artisan works beneath an arch while two collaborators discuss a small unlettered plan. Exactly THREE golden pentacle disks are set into the arch overhead. Skill, craft and teamwork.",
    "A seated person holds ONE pentacle to the chest, rests each foot on ONE pentacle, and wears ONE pentacle above the crown. Exactly FOUR disks. A compact protective posture; security and holding too tightly.",
    "Two weary travelers, one with a walking crutch, pass a warmly illuminated window set with exactly FIVE pentacle disks. Light snow and an inviting nearby doorway. Hardship, exclusion and available help.",
    "A generous standing person offers coins to two people while holding balanced scales in the other hand. Exactly SIX prominent golden pentacle disks float or sit in a clear arrangement above. Dignified giving and receiving.",
    "A gardener leans on a hoe and studies a climbing plant bearing exactly SEVEN golden pentacle disks. No other coins. Quiet pause, patient tending and assessing progress.",
    "An artisan seated at a bench carefully engraves ONE pentacle disk; SEVEN completed pentacle disks are neatly displayed nearby. Exactly EIGHT total, no other disks. Repeated practice and developing skill.",
    "An independent elegant woman stands in a fruitful walled garden with a hooded falcon on her gloved hand. Exactly NINE golden pentacle disks among the vines. Self-sufficiency, cultivation and earned pleasure.",
    "An elder, two adults, a child and two dogs gather in a courtyard beneath an arch. Exactly TEN golden pentacle disks are arranged distinctly around the scene. Family legacy, continuity and shared material foundations.",
    "A focused youthful page stands in a simple garden holding ONE golden pentacle disk at eye level with both hands. Freshly turned soil and distant hills. Practical curiosity and study.",
    "A steady knight sits on a still sturdy horse beside a cultivated field, holding ONE golden pentacle disk. Measured posture, no charge or dramatic wind. Reliability and patient work.",
    "A warm queen sits on a carved throne in a garden, cradling ONE golden pentacle disk in her lap. A small rabbit nearby, a few roses and leaves. Practical nurturing, comfort and generosity.",
    "A mature king sits on a sturdy throne with subtle bull motifs and vine foliage, holding ONE golden pentacle disk and a simple scepter. A settled landscape behind. Responsible prosperity and stewardship.",
]

STYLES = {
    "light-minimal": "Use case: illustration-story. Create ONE new original Moebius-inspired tarot illustration, light and minimal but with luminous, clearly saturated color. Attached image is STYLE REFERENCE ONLY; match fine precise blue-gray ink, spacious cerulean sky, warm ivory and ochre desert, coral and iris-lavender color accents, elegant surreal sculptural forms. Translate the described scene into this airy science-fiction bande dessinee world. New scene, not a variation of the reference subject. Minimal broad flat color fields, a few precise contours, sparse hatching, calm negative space in upper half. Main symbolic subject lower-middle, legible at card scale. Portrait 3:5, highest available resolution. No lettering, numbers, borders, logo, watermark, mockup, photorealism, neon, heavy gradients, or heavy shading. Keep important details central 80%.",
    "arts-and-crafts": "Use case: illustration-story. Create ONE new original Arts and Crafts tarot card illustration. Attached image is STYLE REFERENCE ONLY. Match William Morris botanical design and Walter Crane woodcut allegorical clarity: fine hand-cut contours, flat forest-green, warm ivory, madder red, muted indigo, ochre fields and selective hatching. Elegant narrow symmetrical acanthus/oak/acacia border with red flowers, tiny sun/moon upper corner roundels, blank small bottom title cartouche. Large clearly legible central figure/scene. Subtle Freemasonry inspiration through craft, paired pillars, measured geometry and tiled thresholds where appropriate; no letter G, conspiratorial collage or gratuitous symbols. New scene with the same coherent botanical border. Portrait 3:5, highest available resolution. No lettering, numerals, signature, logo, mockup, photorealism or metallic shine.",
}

BACKS = {
    "light-minimal": "One tarot CARD BACK, NO face scene. A spare two-way ornamental design in clear cerulean blue, ivory, coral and iris-lavender, fine blue-gray Moebius-like pen contours. Two opposing floating stone spires and two opposing small sun disks orbit one central eight-pointed star/lotus geometry. Lots of calm blue and ivory space. Precisely 180-degree rotational symmetry: turning the card upside down must look identical. No letters, numerals, title, signature, directional horizon or person. Flat portrait 3:5, whole artwork, highest available resolution. Match the reference palette and fine linework, but create a distinct minimalist reversible back.",
    "arts-and-crafts": "One tarot CARD BACK, NO face scene. An elegant William Morris-style symmetrical botanical repeat of oak, acanthus and acacia, forest green, warm ivory, madder red and ochre. A central eight-pointed star medallion with two opposing pairs of drawing compasses and set squares woven subtly into the foliage. Fine woodcut contours, flat matte printed color, restrained geometric border. Precisely 180-degree rotational symmetry: turning the card upside down must look identical. No letters, G, numerals, title cartouche, signature or person. Flat portrait 3:5, whole artwork, highest available resolution. Match the reference's printmaking and botanical border.",
}


def main():
    assert len(SCENES) == len(CARDS) == 78
    jobs = []
    for deck, style in STYLES.items():
        base = ROOT / "deck-art" / deck
        existing = base / "generation-plan.json"
        if existing.exists():
            # Preserve selected revisions and their exact prompts on a rerun.
            selected = json.loads(existing.read_text(encoding="utf-8"))["cards"]
            jobs.extend(entry for entry in selected if not (ROOT / entry["file"]).exists())
            continue
        (base / "raw-fronts").mkdir(parents=True, exist_ok=True)
        (base / "raw-backs").mkdir(exist_ok=True)
        proof = base / "proofs" / ("v2" if deck == "light-minimal" else "")
        entries = []
        for i, (number, name, oldfile, category) in enumerate(CARDS):
            slug = f"{i:02d}-" + name.lower().replace(" ", "-")
            target = base / "raw-fronts" / f"{slug}.png"
            if i < 3 and not target.exists():
                shutil.copy2(proof / f"{slug}.png", target)
            entry = {"deck": deck, "index": i, "number": number, "name": name, "category": category,
                     "file": target.relative_to(ROOT).as_posix(),
                     "reference": (proof / "01-the-magician.png").as_posix(),
                     "prompt": style + "\nCard: " + name.upper() + ".\nScene: " + SCENES[i],
                     "source": "approved study" if i < 3 else "new generation"}
            entries.append(entry)
            if i >= 3:
                jobs.append(entry)
        back = {"deck": deck, "index": 78, "name": "Card back", "category": "back",
                "file": (base / "raw-backs" / "back.png").relative_to(ROOT).as_posix(),
                "reference": (proof / "01-the-magician.png").as_posix(),
                "prompt": "Use case: illustration-story. Style reference only. " + BACKS[deck]}
        entries.append(back)
        jobs.append(back)
        (base / "generation-plan.json").write_text(json.dumps({"tool": "built-in image_gen", "cards": entries}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (ROOT / "deck-art" / "companion-generation-queue.json").write_text(json.dumps(jobs, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Prepared {len(jobs)} remaining illustrations; existing selections preserved.")


if __name__ == "__main__":
    main()
