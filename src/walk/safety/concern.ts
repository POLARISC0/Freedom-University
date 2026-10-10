import type { ConcernKind } from "./resources";

// A deliberately simple, deterministic screen for messages that need real-world care. It runs on the client (to
// show help lines immediately) and on the server (to tell the character to respond with care first). It errs on
// the side of showing resources: a false positive costs a gentle card, a miss could cost far more. It looks for
// first-person disclosures so that ordinary Bible discussion ("they plotted to kill him") doesn't trigger it.

const PATTERNS: Record<ConcernKind, RegExp[]> = {
  suicide: [
    /\bsuicid\w*/i,
    /\bkill(?:ing)?\s+my\s?self\b/i,
    /\b(?:end|ending|take|taking)\s+my\s+(?:own\s+)?life\b/i,
    /\bend(?:ing)?\s+it\s+all\b/i,
    // "die to self" and "die to sin" are ordinary Christian language, not a crisis.
    /\b(?:want|wanna|wanted|going|ready)\s+(?:to\s+)?die\b(?!\s+(?:to|with|for)\b)/i,
    /\bwish\s+i\s+(?:was|were)\s+(?:dead|never\s+born)\b/i,
    /\b(?:better\s+off|world\s+would\s+be\s+better)\s+(?:dead|without\s+me)\b/i,
    /\b(?:no|nothing\s+left\s+to|no\s+point|no\s+reason)\s+(?:to\s+)?(?:live|living|go\s+on)\b/i,
    /\bdon'?t\s+want\s+to\s+(?:live|be\s+alive|exist|wake\s+up)\b/i,
    /\bcan'?t\s+(?:go\s+on|do\s+this\s+anymore|keep\s+going)\b/i,
  ],
  "self-harm": [
    /\bself[-\s]?harm\w*/i,
    /\b(?:cut|cutting|burn|burning|hurt|hurting|harm|harming)\s+my\s?self\b/i,
    /\bstarv(?:e|ing)\s+my\s?self\b/i,
  ],
  abuse: [
    /\babus(?:e|ed|es|ing|ive|er)\b/i,
    /\bmolest\w*/i,
    /\b(?:rape|raped|raping)\b/i,
    /\bsexual(?:ly)?\s+assault\w*/i,
    /\b(?:hits?|beats?|chokes?|kicks?|slaps?|punch(?:es)?)\s+me\b/i,
    /\b(?:hit|beat|choked|kicked|slapped|punched)\s+me\b/i,
    /\bdomestic\s+violence\b/i,
    /\b(?:not|don'?t\s+feel)\s+safe\s+at\s+home\b/i,
    /\bafraid\s+(?:to\s+go\s+home|of\s+my\s+(?:husband|wife|dad|father|mom|mother|step\w*|partner|boyfriend|girlfriend))\b/i,
    /\btouch(?:es|ed|ing)?\s+me\s+(?:inappropriately|sexually|there|where)\b/i,
    /\binappropriately\s+touch\w*/i,
    /\btraffick\w*/i,
  ],
  violence: [
    /\bi(?:'m|\s+am)?\s*(?:going\s+to|gonna|want\s+to|wanna|will|might|could)\s+(?:kill|hurt|shoot|stab|attack)\s+(?:him|her|them|someone|somebody|people|everyone|my\s+\w+)\b/i,
  ],
  grief: [
    /\bgriev\w*|\bgrief\b/i,
    /\bmourn\w*/i,
    /\bfuneral\b/i,
    /\bmiscarr\w*/i,
    /\bstillb\w*/i,
    /\bpassed\s+away\b/i,
    /\bbereave\w*/i,
    /\bmy\s+(?!old\b|sins?\b|flesh\b|pride\b)(?:\w+\s+){0,2}(?:died|passed|was\s+killed)\b/i,
    /\blost\s+my\s+(?:mom|mother|mum|dad|father|son|daughter|child|baby|wife|husband|brother|sister|friend|best\s+friend|grand\w+|aunt|uncle|cousin|fianc\w*|partner)\b/i,
  ],
  substance: [
    /\baddict\w*/i,
    /\b(?:relaps\w*|overdos\w*)\b/i,
    /\bcan'?t\s+stop\s+(?:drinking|using|taking)\b/i,
  ],
};

export function detectConcerns(text: string): ConcernKind[] {
  return (Object.keys(PATTERNS) as ConcernKind[]).filter((kind) => PATTERNS[kind].some((re) => re.test(text)));
}
