// Sound pairs Vietnamese speakers often mix up, and how -s and -ed endings sound.

export interface SoundContrast {
  id: string
  /** The two sounds, e.g. ['iː', 'ɪ']; none for contrasts that are not one sound against another. */
  sounds: [string, string] | null
  /** Short name for the filter chip when there are no sounds to show. */
  chip?: string
  title: string
  tip: string
  pairs: [string, string][]
}

export const SOUND_CONTRASTS: SoundContrast[] = [
  {
    id: 'ee-i',
    sounds: ['iː', 'ɪ'],
    title: 'Long ee or short i',
    tip: 'Stretch /iː/ and smile a little; /ɪ/ is short and relaxed.',
    pairs: [
      ['sheep', 'ship'],
      ['leave', 'live'],
      ['seat', 'sit'],
      ['feel', 'fill'],
      ['heel', 'hill'],
      ['beat', 'bit'],
      ['cheap', 'chip'],
      ['peel', 'pill'],
    ],
  },
  {
    id: 'a-e',
    sounds: ['æ', 'e'],
    title: 'Open a or e',
    tip: 'Drop your jaw for /æ/ as in "cat"; /e/ as in "bed" is smaller.',
    pairs: [
      ['bad', 'bed'],
      ['man', 'men'],
      ['sad', 'said'],
      ['pan', 'pen'],
      ['bag', 'beg'],
      ['had', 'head'],
    ],
  },
  {
    id: 'u-ar',
    sounds: ['ʌ', 'ɑː'],
    title: 'Short u or long ar',
    tip: '/ʌ/ is short and central, as in "cut"; /ɑː/ is long and from the back of the mouth.',
    pairs: [
      ['cut', 'cart'],
      ['hut', 'heart'],
      ['much', 'march'],
      ['come', 'calm'],
      ['bun', 'barn'],
    ],
  },
  {
    id: 'th-t',
    sounds: ['θ', 't'],
    title: 'th or t',
    tip: 'For /θ/, put the tip of your tongue between your teeth and blow softly. No tongue between the teeth for /t/.',
    pairs: [
      ['three', 'tree'],
      ['thin', 'tin'],
      ['thank', 'tank'],
      ['thought', 'taught'],
      ['both', 'boat'],
      ['path', 'pat'],
    ],
  },
  {
    id: 'dh-d',
    sounds: ['ð', 'd'],
    title: 'Voiced th or d',
    tip: '/ð/ is /θ/ with your voice on: tongue between the teeth, and feel it buzz.',
    pairs: [
      ['they', 'day'],
      ['then', 'den'],
      ['though', 'dough'],
      ['there', 'dare'],
      ['breathe', 'breed'],
    ],
  },
  {
    id: 's-sh',
    sounds: ['s', 'ʃ'],
    title: 's or sh',
    tip: 'For /ʃ/, round your lips and pull the tongue back a little; /s/ is a thin hiss behind the teeth.',
    pairs: [
      ['sip', 'ship'],
      ['sea', 'she'],
      ['save', 'shave'],
      ['sell', 'shell'],
      ['seat', 'sheet'],
      ['mass', 'mash'],
    ],
  },
  {
    id: 'sh-ch',
    sounds: ['ʃ', 'tʃ'],
    title: 'sh or ch',
    tip: '/tʃ/ starts with a stop, like a quick "t" before "sh"; /ʃ/ flows without a stop.',
    pairs: [
      ['shoes', 'choose'],
      ['wash', 'watch'],
      ['sheep', 'cheap'],
      ['share', 'chair'],
      ['cash', 'catch'],
      ['shop', 'chop'],
    ],
  },
  {
    id: 'f-v',
    sounds: ['f', 'v'],
    title: 'f or v',
    tip: 'Both use the top teeth on the lower lip; turn your voice on for /v/.',
    pairs: [
      ['fan', 'van'],
      ['fine', 'vine'],
      ['fast', 'vast'],
      ['few', 'view'],
      ['leaf', 'leave'],
      ['safe', 'save'],
    ],
  },
  {
    id: 'l-n',
    sounds: ['l', 'n'],
    title: 'l or n',
    tip: 'Some Vietnamese accents mix these. For /n/ air goes through the nose; for /l/ it flows round the sides of the tongue.',
    pairs: [
      ['light', 'night'],
      ['low', 'no'],
      ['lead', 'need'],
      ['line', 'nine'],
      ['lock', 'knock'],
      ['lot', 'not'],
    ],
  },
  {
    id: 'p-b',
    sounds: ['p', 'b'],
    title: 'p or b',
    tip: 'English /p/ at the start of a word has a small puff of air; /b/ has none and uses your voice.',
    pairs: [
      ['pea', 'bee'],
      ['pack', 'back'],
      ['pig', 'big'],
      ['cap', 'cab'],
      ['rope', 'robe'],
    ],
  },
  {
    id: 'final',
    sounds: null,
    chip: 'Last sound',
    title: 'Saying the last sound',
    tip: 'Vietnamese words often end softly. In English the last consonant changes the word, so say it clearly.',
    pairs: [
      ['buy', 'bike'],
      ['rye', 'rice'],
      ['why', 'white'],
      ['high', 'height'],
      ['play', 'plate'],
      ['see', 'seat'],
    ],
  },
  {
    id: 'z-s',
    sounds: ['z', 's'],
    title: 'Final z or s',
    tip: 'A final /z/ buzzes and makes the vowel before it a little longer; a final /s/ is a short hiss.',
    pairs: [
      ['prize', 'price'],
      ['eyes', 'ice'],
      ['rise', 'rice'],
      ['peas', 'peace'],
      ['lose', 'loose'],
    ],
  },
]

export interface EndingGroup {
  sound: string
  rule: string
  words: string[]
}

export interface EndingSet {
  id: 's' | 'ed'
  title: string
  intro: string
  groups: EndingGroup[]
}

export const ENDINGS: EndingSet[] = [
  {
    id: 's',
    title: '-s and -es',
    intro: 'Plurals, verbs with he / she / it, and possessives end in one of three sounds, decided by the sound before them.',
    groups: [
      { sound: '/s/', rule: 'After a voiceless sound: /p/ /t/ /k/ /f/ /θ/', words: ['cats', 'books', 'stops', 'laughs', 'months', 'shops'] },
      { sound: '/z/', rule: 'After a voiced sound or a vowel', words: ['dogs', 'plays', 'bags', 'cars', 'trees', 'calls'] },
      { sound: '/ɪz/', rule: 'After /s/ /z/ /ʃ/ /tʃ/ /dʒ/: an extra syllable', words: ['buses', 'watches', 'washes', 'pages', 'roses', 'boxes'] },
    ],
  },
  {
    id: 'ed',
    title: '-ed',
    intro: 'The past tense -ed has three sounds too. Only after /t/ and /d/ does it add a syllable.',
    groups: [
      { sound: '/t/', rule: 'After a voiceless sound: /p/ /k/ /s/ /ʃ/ /tʃ/ /f/', words: ['stopped', 'worked', 'missed', 'washed', 'watched', 'laughed'] },
      { sound: '/d/', rule: 'After a voiced sound or a vowel', words: ['played', 'called', 'opened', 'lived', 'cleaned', 'cried'] },
      { sound: '/ɪd/', rule: 'After /t/ or /d/: an extra syllable', words: ['wanted', 'needed', 'started', 'decided', 'visited', 'ended'] },
    ],
  },
]
