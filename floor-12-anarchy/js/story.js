/* =========================================================
   STORY — the whole script as data.
   Node:  { act, loc, o, clock, steps:[...], choices:[...], timer, input,
            next | go(s) | mini:{type,o,win,lose} | ending | gameover, checkpoint }
   Steps: n narration · s in-person line · m chat message · me player message
          sys chat system line · phone 1/0 · notify · loc · cast · e · fx · sfx
          sting · amb · mus · hb · wait · set · tr · inv · pan · clock · tick
          contact · status · act (title card) · if:{fn, then, else}
   Choice:{ t, to, tr, set, inv, kw:[typed keywords], req(s), silent, once,
            stay (re-show same choices), after:[steps] }
   State s: { trust{max,stas,lena,petya}, f{flags}, inv{light,water,food}, prep{} }
   ========================================================= */
F12.STR = {
  en: {
    tap: 'Tap to continue', silent: '(Say nothing)', choose: 'Choose…', message: 'Message', typing: 'typing…', online: 'online',
    offline: 'last seen 23:48', seen: 'Seen', respond: 'Respond', relaxed: 'Relaxed timers', continueT: 'Continue', retry: 'Retry from checkpoint'
  }
};

F12.Story = (() => {
  const T = { max: 50, stas: 30, lena: 40, petya: 40 };
  const has = (s, k) => !!s.f[k];

  const endings = {
    daylight: { kind: 'Ending · Escape', title: 'Daylight', desc: 'You reached the river with people who trusted you.' },
    grom: { kind: 'Ending · Cliffhanger', title: 'Grom Is Coming', desc: 'The shelter was never safe. The second escape begins.' },
    taken: { kind: 'Ending · Failure', title: 'Taken', desc: 'The night caught up with you.' }
  };

  const contacts = {
    max: { name: 'Max · 45', av: 'max' },
    unknown: { name: '+7 9•• •••-41-12', av: 'max' }
  };

  const N = {};

  /* ================= ACT I · THE TEXT ================= */
  N.start = { act: ['Act I', 'The Text'], loc: 'apartment', o: { }, clock: '21:00', checkpoint: true, steps: [
    { amb: 'apartment' }, { mus: 'dread' }, { fx: 'bars' },
    { n: 'Day nine without power. The city stopped answering on day three.' },
    { pan: 'in' },
    { n: 'Then the police stopped coming. Then the neighbours stopped pretending.' },
    { sfx: 'siren' },
    { n: 'Apartment 47. Twelfth floor. One stairwell down. One stairwell up.' },
    { fx: 'nobars' }, { pan: 'center' },
    { notify: 'max', t: 'You awake? It\'s Max. 45.' }, { wait: 900 }, { contact: 'max' }, { phone: 1 },
    { m: 'max', t: 'Hey. It\'s Max, from 45. Across the hall.' },
    { m: 'max', t: 'Saw candlelight under your door. You okay in there?' }
  ], input: true, choices: [
    { t: 'I\'m okay. How did you get my number?', kw: ['number', 'how', 'okay', 'ok'], to: 'c1_b', set: { cautious: 1 }, after: [
      { m: 'max', t: 'House chat. Before the towers died. You posted about a lost cat in spring.', e: 'smile' },
      { m: 'max', t: 'Hope it came back.' }] },
    { t: 'Barely. No power, no water pressure, no news.', kw: ['barely', 'water', 'power', 'news', 'no'], to: 'c1_b', tr: { max: 5 }, after: [
      { m: 'max', t: 'Same. The tap coughs brown water for ten minutes a day, then nothing.' }] },
    { t: 'Who\'s asking?', kw: ['who', 'asking'], to: 'c1_b', tr: { max: -5 }, after: [
      { m: 'max', t: 'Fair. Max Orlov, 45. Mechanic. I fixed the lift in 2019, for all the good it does now.', e: 'smile' }] }
  ] };

  N.c1_b = { steps: [
    { m: 'max', t: 'Listen. Ivanov from the 9th came up an hour ago. Bleeding.', e: 'scared' },
    { m: 'max', t: 'There\'s a crew going floor by floor. Crowbars. Dogs. They take everything.' },
    { m: 'max', t: 'People who argue don\'t argue twice.' }, { sting: 'hit' }, { fx: 'tense' },
    { m: 'max', t: 'They\'re on 10 now. Tonight they reach us.' }
  ], input: true, choices: [
    { t: 'Then we stick together. What do we do?', kw: ['together', 'what', 'do', 'help'], to: 'c1_c', tr: { max: 10 } },
    { t: 'Why warn me? What do you get out of it?', kw: ['why', 'warn', 'get'], to: 'c1_c', after: [
      { m: 'max', t: 'Honestly? Two doors are harder to break than one.' }, { m: 'max', t: 'And I don\'t want to hear it happen to you through the wall.', e: 'sad' }] },
    { t: 'I\'ll handle myself.', kw: ['handle', 'myself', 'alone', 'fine'], to: 'c1_c', tr: { max: -10 }, after: [
      { m: 'max', t: 'Okay. Okay. Just keep your phone on.', e: 'sad' }] }
  ] };

  N.c1_c = { steps: [
    { fx: 'calm' },
    { m: 'max', t: 'First thing. A code word.', e: 'neutral' },
    { m: 'max', t: 'If anyone ever asks you to open the door "because Max said so", you text me one question: How\'s the weather?' },
    { m: 'max', t: 'The real me answers: Grom is coming. Grom. Like thunder.' },
    { m: 'max', t: 'Anything else, it\'s not me. Don\'t open. No matter what they say.' }, { set: { codeKnown: 1 } }
  ], input: true, choices: [
    { t: 'How\'s the weather?', kw: ['weather'], to: 'c1_d', tr: { max: 5 }, after: [{ m: 'max', t: 'Grom is coming. See? You\'ve got it.', e: 'smile' }] },
    { t: 'Grom. Got it.', kw: ['grom', 'got', 'ok', 'okay'], to: 'c1_d' }
  ] };

  N.c1_d = { steps: [
    { m: 'max', t: 'Second thing. There is ONE stairwell in this building. One. No back stairs, no fire escape.' },
    { m: 'max', t: 'If they hold it, we\'re boxed in. Remember that.' },
    { m: 'max', t: 'So: water. Hide your food. Something on the door so you hear them before they\'re in. Barricade.' },
    { m: 'max', t: 'You have till midnight. Maybe less. I\'m doing the same.' },
    { m: 'max', t: 'Text me if you hear anything.' }
  ], input: true, choices: [
    { t: 'Stay safe, Max.', kw: ['safe', 'thanks', 'thank'], to: 'prep_intro', tr: { max: 3 }, after: [{ m: 'max', t: 'You too, 47.', e: 'smile' }] },
    { t: 'On it.', kw: ['on it', 'ok', 'okay', 'will'], to: 'prep_intro' }
  ] };

  N.prep_intro = { checkpoint: true, steps: [
    { phone: 0 }, { tick: 6 },
    { n: 'The candle gutters. Two hours and thirty-five minutes, if Max is right.' },
    { n: 'You can\'t do everything. Choose what matters. Drag the wardrobe if you dare the noise.' }
  ], mini: { type: 'prep', win: 'c2_pre', lose: 'c2_pre' } };

  /* ================= ACT II · 23:47 ================= */
  N.c2_pre = { act: ['Act II', '23:47'], loc: 'apartment', clock: '23:47', checkpoint: true, steps: [
    { amb: 'apartment' }, { mus: 'tension' }, { fx: 'flicker' }, { hb: 80 },
    { n: '23:47.' }, { sfx: 'steps', a: 12 }, { wait: 1200 },
    { n: 'Boots on the landing. Many. A dog, panting, claws on concrete.' }, { sfx: 'dog' },
    { sfx: 'bang' }, { fx: 'shake' }, { wait: 500 }, { sfx: 'bang' }, { fx: 'shake' },
    { n: 'A crowbar finds a door. Not yours. Not yet.' },
    { notify: 'max', t: 'theyre at my door' }, { wait: 600 }, { contact: 'max' }, { phone: 1 }
  ], next: 'c2_raid' };

  N.c2_raid = { steps: [
    { m: 'max', t: 'theyre at my door', e: 'scared', glitch: 1 },
    { m: 'max', t: '47 please' }, { m: 'max', t: 'what do i do' }, { hb: 110 }
  ], timer: 'short', input: true, choices: [
    { t: 'Bathroom vent! Get in the vent NOW', kw: ['vent', 'bathroom', 'hide'], to: 'c2_vent', tr: { max: 15 }, set: { maxHelped: 1 } },
    { t: 'Hold on. I\'m coming.', kw: ['coming', 'hold', 'help', 'come'], to: 'c2_peek', tr: { max: 10 }, set: { maxHelped: 1, wentOut: 1 } },
    { silent: 1, to: 'c2_silent', tr: { max: -20 }, set: { maxAbandoned: 1 } }
  ] };

  N.c2_vent = { steps: [
    { m: 'max', t: 'ok', e: 'scared' }, { m: 'max', t: 'going' }, { status: 'off' },
    { sfx: 'crash' }, { fx: 'shake' }, { sfx: 'shout' }, { phone: 0 },
    { n: 'Wood gives. Voices flood 45. Something heavy goes over. Then a dog, frantic, at a wall.' }
  ], next: 'c2_after' };

  N.c2_silent = { steps: [
    { sys: 'Seen 23:48' }, { wait: 1400 }, { m: 'max', t: '47?', e: 'scared' }, { wait: 1200 }, { m: 'max', t: 'please' },
    { status: 'off' }, { sfx: 'crash' }, { fx: 'shake' }, { sfx: 'shout' }, { phone: 0 },
    { n: 'You watch the word "please" until the screen dims on its own.' }
  ], next: 'c2_after' };

  N.c2_peek = { steps: [
    { phone: 0 }, { n: 'You slide the chain. Ease the door open the width of a finger.' },
    { loc: 'hall' }, { amb: 'hall' }, { pan: 'in' }, { fx: 'tense' },
    { n: 'Torchlight. Four men at 45. A dog the size of a calf. One of them turns toward your gap.' }
  ], mini: { type: 'hold', o: { title: 'Don\'t breathe', beam: 1 }, win: 'c2_peek_ok', lose: 'go_peek' } };

  N.c2_peek_ok = { steps: [
    { loc: 'apartment' }, { amb: 'apartment' },
    { n: 'The beam slides past. You close the door like it is made of glass.' }, { sfx: 'door' },
    { n: 'Through the wall: Max\'s voice, high and fast. Then not.' }
  ], next: 'c2_after' };

  N.c2_after = { clock: '00:06', checkpoint: true, steps: [
    { hb: 70 }, { fx: 'calm' }, { wait: 800 }, { sfx: 'steps', a: 5 },
    { n: 'Silence. Then footsteps. Not leaving. Spreading.' },
    { notify: 'unknownMax', t: 'they\'re gone' }, { wait: 500 }, { contact: 'max' }, { status: 'on' }, { phone: 1 },
    { m: 'max', t: 'they\'re gone', e: 'lying', lie: 1 },
    { m: 'max', t: 'come to 45. they dropped a bag. meds, a radio', e: 'lying', lie: 1 },
    { m: 'max', t: 'hurry before they come back', e: 'lying', lie: 1 }
  ], timer: 'normal', input: true, choices: [
    { t: 'On my way.', kw: ['way', 'coming', 'omw', 'ok', 'okay', 'go'], to: 'c2_trap', set: { openedDoor: 1 } },
    { t: 'How\'s the weather?', kw: ['weather'], to: 'c2_weather' },
    { t: 'Grom?', kw: ['grom', 'thunder'], to: 'c2_grom' },
    { silent: 1, to: 'c2_quiet' }
  ] };

  const exposedChoices = [
    { t: 'You\'re not Max.', kw: ['not', 'who', 'liar', 'fake'], to: 'c2_exposed', set: { liarCaught: 1 } },
    { t: 'Okay... coming.', kw: ['coming', 'ok', 'okay', 'way'], to: 'c2_trap', set: { openedDoor: 1 } },
    { silent: 1, to: 'c2_exposed', set: { liarCaught: 1 } }
  ];
  N.c2_weather = { steps: [
    { wait: 900 }, { m: 'max', t: 'weather??', e: 'lying', lie: 1 }, { wait: 700 },
    { m: 'max', t: 'its fine. clear. just come', e: 'lying', lie: 1 }, { sting: 'lie' }, { set: { askedCode: 1 } }
  ], timer: 'normal', input: true, choices: exposedChoices };
  N.c2_grom = { steps: [
    { wait: 900 }, { m: 'max', t: 'yeah. grom. whatever you said', e: 'lying', lie: 1 },
    { m: 'max', t: 'come', e: 'lying', lie: 1 }, { sting: 'lie' }
  ], timer: 'normal', input: true, choices: exposedChoices };

  N.c2_exposed = { steps: [
    { m: 'max', t: 'smart neighbour', e: 'angry' },
    { m: 'max', t: 'we have your friend. want to hear him?', e: 'angry' }, { fx: 'shake' },
    { m: 'max', t: 'open up or we take it off the hinges', e: 'angry' },
    { phone: 0 }, { sfx: 'knock' }, { fx: 'redflash' }, { set: { warned: 1 } },
    { n: 'Three knocks on your door. Polite. That is the worst part.' }
  ], next: 'c3_assault' };

  N.c2_quiet = { steps: [
    { phone: 0 }, { n: 'You turn the phone face down. It buzzes. And buzzes. And stops.' },
    { sfx: 'knock' }, { n: 'Three knocks on your door.' }
  ], next: 'c3_assault' };

  N.c2_trap = { steps: [
    { phone: 0 }, { n: 'You pull the chain. Lift the latch. Step into the corridor.' },
    { loc: 'hall' }, { amb: 'hall' }, { mus: 'chase' },
    { n: 'Black. Then six torches come on at once.' }, { sting: 'hit' }, { fx: 'whiteflash' },
    { n: '"There it is. Forty-seven."' }, { n: 'RUN.' }
  ], mini: { type: 'mash', o: { title: 'Back inside', hint: 'Hammer it to slam the door', diff: 1.15, time: 5 }, win: 'c2_trap_ok', lose: 'go_trap' } };

  N.c2_trap_ok = { steps: [
    { loc: 'apartment' }, { sfx: 'bang' }, { fx: 'shake' },
    { n: 'You slam it on fingers. Someone screams. The lock holds. For now.' }, { set: { doorDamaged: 1 } }
  ], next: 'c3_assault' };

  /* the door: preparation pays off here */
  N.c3_assault = { checkpoint: true, steps: [
    { mus: 'chase' }, { hb: 130 }, { fx: 'tense' },
    { sfx: 'bang' }, { fx: 'shake' }, { n: 'They hit the door.' },
    { if: s => s.prep.glass, then: [{ sfx: 'glass' }, { n: 'The glass on the handle shatters. A second of warning. A second is a lot.' }] },
    { if: s => s.prep.bells, then: [{ sfx: 'bells' }, { n: 'The bells scream on the handle. You are already moving.' }] },
    { if: s => s.prep.chair, then: [{ n: 'The chair bites into the floorboards and holds.' }] },
    { if: s => s.prep.wardrobe, then: [{ sfx: 'drag' }, { n: 'The wardrobe shudders. Groans. Holds.' }],
      else: [{ if: s => !s.prep.chair, then: [{ n: 'Nothing between you and them but a lock from 1978.' }] }] },
    { sfx: 'bang' }, { fx: 'shake' }
  ], mini: { type: 'mash', o: { title: 'Brace the door', hint: 'Hammer to hold it shut', door: 1 }, win: 'c3_grab', lose: 'go_door' } };

  N.c3_grab = { steps: [
    { n: 'Behind you the frame splinters. The balcony. The only door they don\'t own.' },
    { if: s => s.prep.bag, then: [{ inv: { light: 1 } }, { n: 'You shoulder the go-bag. The torch knocks against your spine.' }],
      else: [{ n: 'No bag. No torch. Shoes, phone, you.' }] },
    { if: s => s.prep.food && (s.prep.glass || s.prep.bells || s.prep.wardrobe), then: [{ inv: { food: 1 } }, { n: 'You rip up the floorboard and sweep the tins into your jacket.' }],
      else: [{ if: s => s.prep.food, then: [{ n: 'The tins stay under the floor. Maybe someone finds them in a year.' }] }] },
    { if: s => s.prep.bottles, then: [{ inv: { water: 1 } }, { n: 'Two bottles of water. One in each pocket.' }] },
    { if: s => s.prep.tub, then: [{ set: { stamina: 1 } }, { n: 'You drink from the bathtub with both hands like an animal. It helps.' }] }
  ], next: 'c4_balcony' };

  /* ================= ACT III · THE LONG WAY DOWN ================= */
  N.c4_balcony = { act: ['Act III', 'The Long Way Down'], loc: 'balcony', clock: '00:19', checkpoint: true, steps: [
    { amb: 'balcony' }, { mus: 'tension' }, { fx: 'rain' }, { fx: 'sirens' }, { hb: 120 },
    { n: 'Rain. Twelve floors of nothing. The city burns in neat little squares.' }, { pan: 'right' },
    { n: 'Balcony 46, old Vera\'s, is a metre and a half away. In daylight it looked like nothing.' },
    { sfx: 'drag' }, { n: 'Behind you, the wardrobe screams across the floor.' }
  ], mini: { type: 'timing', o: { title: 'Jump' }, win: 'c4_land', lose: 'c4_hang' } };

  N.c4_hang = { steps: [
    { fx: 'shake' }, { sting: 'hit' }, { n: 'Your fingers find the rail. Your feet find nothing.' }
  ], mini: { type: 'mash', o: { title: 'Pull up', hint: 'Hammer to climb', diff: 1.1, stamina: 1, time: 5 }, win: 'c4_land', lose: 'go_fall' } };

  N.c4_land = { steps: [
    { pan: 'center' }, { sfx: 'thud' },
    { n: 'You land on Vera\'s balcony in a crouch, palms open on wet concrete.' },
    { n: 'Her door is unlocked. Of course it is. She left on day four, with her cat in a shopping bag.' },
    { fx: 'norain' }, { fx: 'nosirens' }, { loc: 'hall' }, { amb: 'hall' },
    { n: 'You crack 46\'s front door. Two of them hold the stairwell, smoking, backs half-turned.' },
    { n: 'Between you and them: the lift. Doors pried open months ago. A black mouth.' }
  ], timer: 'long', choices: [
    { t: 'Climb into the elevator shaft.', to: 'c5_shaft' },
    { t: 'Sneak past them to the stairs.', to: 'c5_stairs' },
    { silent: 1, to: 'c4_wait' }
  ] };

  N.c4_wait = { steps: [{ n: 'You wait too long. One of them flicks his cigarette and turns.' }],
    mini: { type: 'hold', o: { title: 'Freeze', beam: 1 }, win: 'c5_shaft', lose: 'go_hall' } };

  N.c5_stairs = { steps: [{ n: 'Low. Slow. Shadow to shadow.' }],
    mini: { type: 'stealth', o: { theme: 'hall', guards: 2 }, win: 'c5_stairs_ok', lose: 'go_hall' } };
  N.c5_stairs_ok = { steps: [
    { loc: 'hall' }, { n: 'Eleven flights in the dark, counting landings by the smell of each floor.' }
  ], next: 'c5_mid' };

  N.c5_shaft = { loc: 'shaft', clock: '00:31', checkpoint: true, steps: [
    { amb: 'shaft' }, { mus: 'dread' }, { pan: 'down' },
    { n: 'The cables are greasy and cold. Eleven floors down, something orange flickers.' },
    { if: s => !s.inv.light, then: [{ fx: 'blackout' }, { n: 'No torch. You climb by feel.' }] }
  ], mini: { type: 'climb', o: { title: 'Climb down', hint: 'Alternate left and right' }, win: 'c5_mid', lose: 'c5_slip' } };

  N.c5_slip = { steps: [
    { fx: 'unblack' }, { fx: 'shake' }, { sfx: 'cable' },
    { n: 'You slip. The cable burns through your palms for two floors before you stop.' }, { set: { hurt: 1 } }
  ], next: 'c5_mid' };

  N.c5_mid = { steps: [
    { fx: 'unblack' }, { pan: 'center' }, { wait: 600 },
    { notify: 'unknown', t: 'it\'s max. new number.' }, { wait: 500 }, { contact: 'unknown' }, { phone: 1 }
  ], go: s => has(s, 'maxHelped') ? 'c5_real' : 'c5_fake' };

  /* Max, if you tried to help him: honest */
  N.c5_real = { steps: [
    { m: 'unknown', t: 'it\'s max. Ivanov\'s old phone. they took mine', e: 'scared' },
    { if: s => has(s, 'wentOut'), then: [{ m: 'unknown', t: 'you opened your door for me. idiot. thank you', e: 'sad' }],
      else: [{ m: 'unknown', t: 'the vent. it worked. I owe you', e: 'sad' }] },
    { m: 'unknown', t: 'anything from my old number is THEM', e: 'scared' },
    { m: 'unknown', t: 'I\'m in the garage, level -2. people hiding by the dead bus' },
    { m: 'unknown', t: 'they\'re setting up at the blue van. if you get "come to the van" — it\'s a trap. they made me record it' }, { set: { maxWarn: 1 } }
  ], input: true, choices: [
    { t: 'How\'s the weather?', kw: ['weather'], once: 1, stay: 1, after: [{ m: 'unknown', t: 'Grom is coming. Go.', e: 'neutral' }, { tr: { max: 5 } }] },
    { t: 'Okay. See you down there.', kw: ['ok', 'okay', 'see', 'coming'], to: 'c5_bottom', tr: { max: 5 } }
  ] };

  /* Max, if you abandoned him: he has been turned */
  N.c5_fake = { steps: [
    { m: 'unknown', t: 'it\'s max. I got out. vent', e: 'sad' },
    { m: 'unknown', t: 'you didn\'t answer me', e: 'sad' }, { wait: 900 },
    { m: 'unknown', t: 'doesn\'t matter. I\'m in the garage, level -2', e: 'lying', lie: 1 },
    { m: 'unknown', t: 'blue van. there\'s a car that runs. bring anyone you find', e: 'lying', lie: 1 }
  ], input: true, choices: [
    { t: 'How\'s the weather?', kw: ['weather'], once: 1, stay: 1, after: [{ wait: 600 }, { m: 'unknown', t: 'Grom is coming.', e: 'lying' }, { set: { askedFake: 1 } }] },
    { t: 'How did you get past them?', kw: ['how', 'past', 'get'], once: 1, stay: 1, after: [{ m: 'unknown', t: 'back stairs. they don\'t watch them', e: 'lying', lie: 1 }, { set: { backStairs: 1 } }] },
    { t: 'On my way.', kw: ['way', 'ok', 'okay', 'coming'], to: 'c5_bottom', set: { maxLure: 1 } },
    { t: 'There are no back stairs, Max.', kw: ['no back', 'stairs', 'liar', 'lying'], req: s => has(s, 'backStairs'), to: 'c5_bottom', set: { maxCaught: 1 }, after: [
      { wait: 1200 }, { m: 'unknown', t: '...', e: 'lying' }, { m: 'unknown', t: 'I\'m sorry', e: 'sad' }, { status: 'off' }] }
  ] };

  N.c5_bottom = { loc: 'garage', o: { beams: 1 }, clock: '00:52', checkpoint: true, steps: [
    { phone: 0 }, { amb: 'garage' }, { mus: 'tension' },
    { n: 'Level -2. The air tastes of petrol and old smoke.' },
    { n: 'Torches between the pillars. Two men sweeping slow. Behind the dead bus at the far end, a whisper.' }
  ], mini: { type: 'stealth', o: { theme: 'garage', guards: 2 }, win: 'c6_meet', lose: 'go_garage' } };

  /* ================= ACT IV · STRANGERS ================= */
  N.c6_meet = { act: ['Act IV', 'Strangers'], loc: 'garage', clock: '01:04', checkpoint: true, steps: [
    { mus: 'dread' }, { cast: ['stas', 'lena', 'petya'], e: { stas: 'angry', lena: 'scared', petya: 'scared' } },
    { s: 'stas', t: 'Stop. Hands where I can see them.', e: 'angry' },
    { s: 'stas', t: 'Five seconds. Tell me why I don\'t send you back up that shaft.' }
  ], timer: 'short', choices: [
    { t: 'I\'m not with them. They took my floor tonight.', to: 'c6_m2', tr: { stas: 5 } },
    { t: 'If I wanted you dead, I\'d have shouted.', to: 'c6_m2', tr: { stas: 10 }, after: [{ s: 'stas', t: '...Fair.', e: 'smile' }] },
    { silent: 1, to: 'c6_m2', tr: { stas: -10 }, after: [{ s: 'stas', t: 'Silent type. Great.', e: 'angry' }] }
  ] };

  N.c6_m2 = { steps: [
    { e: { lena: 'neutral' } },
    { s: 'lena', t: 'Stas. Look at their hands. Cable burns. They came down the shaft.' },
    { s: 'lena', t: 'I\'m Lena. Nursing, third year. That\'s Stas. He was police, back when that meant something.' },
    { s: 'stas', t: 'Still means something.', e: 'neutral' },
    { s: 'petya', t: 'Petya. Hi. Are they... still upstairs?', e: 'scared' }
  ], choices: [
    { t: 'Here. Water. You need it more than me.', req: s => s.inv.water, to: 'c6_m3', tr: { lena: 15, stas: 5 }, inv: { water: 0 }, set: { gaveWater: 1 }, after: [{ s: 'lena', t: '...Thank you. Really.', e: 'smile' }] },
    { t: 'I have tins. Let\'s share.', req: s => s.inv.food, to: 'c6_m3', tr: { petya: 15, stas: 5 }, set: { sharedFood: 1 }, after: [{ s: 'petya', t: 'Is that... peaches? Oh my god.', e: 'smile' }] },
    { t: 'They\'re up there. And they\'re coming down.', to: 'c6_m3', tr: { stas: 5 }, after: [{ s: 'stas', t: 'Then we don\'t stay.', e: 'neutral' }] },
    { t: 'Petya, how old are you?', to: 'c6_m3', tr: { petya: 8 }, after: [{ s: 'petya', t: 'Fifteen. Sixteen in March. If there\'s a March.', e: 'sad' }, { s: 'lena', t: 'There\'ll be a March.', e: 'smile' }] }
  ] };

  N.c6_m3 = { steps: [
    { notify: 'max', t: 'come to the blue van. bring them' }, { wait: 500 },
    { if: s => has(s, 'maxWarn'), then: [{ contact: 'max' }], else: [{ contact: 'unknown' }] },
    { phone: 1 },
    { if: s => has(s, 'maxWarn'),
      then: [{ m: 'max', t: 'come to the blue van, level -2. its safe here. bring them', e: 'lying', lie: 1 }],
      else: [{ m: 'unknown', t: 'I can see the bus. come to the blue van. bring them all. the car is running', e: 'lying', lie: 1 }] },
    { wait: 900 }, { phone: 0 },
    { s: 'petya', t: 'Who\'s texting you? Is it someone who can help?', e: 'neutral' }
  ], timer: 'normal', choices: [
    { t: 'My neighbour Max. There\'s a car at the blue van. Let\'s go.', to: 'c6_van_go' },
    { t: 'Someone wants us at the blue van. It\'s a trap.', to: 'c6_van_warn', tr: { stas: 5 } },
    { t: 'Stas, read this. You decide.', to: 'c6_van_warn', tr: { stas: 12 }, after: [{ s: 'stas', t: 'Never trust a text you can\'t see the face behind.', e: 'angry' }] },
    { silent: 1, to: 'c6_van_warn', tr: { petya: -5 }, after: [{ s: 'petya', t: 'Okay, secrets. Cool. Love that for us.', e: 'angry' }] }
  ] };

  N.c6_van_go = { steps: [
    { mus: 'chase' }, { n: 'The blue van\'s side door is open. Too open.' },
    { if: s => !has(s, 'maxWarn'), then: [{ cast: ['max', 'stas', 'lena', 'petya'], e: { max: 'sad' } },
      { s: 'max', t: 'I\'m sorry. They said they\'d let me go if I brought—', e: 'sad' }] },
    { sting: 'hit' }, { fx: 'whiteflash' }, { n: 'Torches. Everywhere.' },
    { s: 'stas', t: 'RUN!', e: 'angry' }, { set: { ambushed: 1, lenaHurt: 1 } }, { tr: { stas: -10, lena: -5, petya: -10 } }
  ], mini: { type: 'mash', o: { title: 'Run', hint: 'Hammer it', diff: 1.05, time: 6 }, win: 'c6_ambush_ok', lose: 'go_van' } };

  N.c6_ambush_ok = { steps: [
    { cast: ['stas', 'lena', 'petya'], e: { lena: 'sad', stas: 'angry', petya: 'scared' } },
    { n: 'A storm drain behind the ramp. Stas rips the grate up. You fall into black water.' },
    { s: 'lena', t: 'My leg. Something hit my leg.', e: 'sad' },
    { s: 'stas', t: 'Your neighbour. Your text.', e: 'angry' }
  ], next: 'c7_sewer' };

  N.c6_van_warn = { steps: [
    { s: 'stas', t: 'Then we go the other way. Now. Storm drain behind the ramp.', e: 'neutral' },
    { if: s => has(s, 'maxWarn'), then: [
      { n: 'A shape slides out from under a dead Volga. Filthy. Shaking.' },
      { cast: ['stas', 'max', 'lena', 'petya'], e: { max: 'scared', stas: 'angry' } },
      { s: 'max', t: 'You listened. God. You actually listened.', e: 'scared' },
      { s: 'stas', t: 'Who the hell is this?', e: 'angry' }],
      else: [{ n: 'Somewhere behind the van, a voice you know says: "They\'re not coming."' }, { set: { betrayed: 1 } }] }
  ], go: s => has(s, 'maxWarn') ? 'c6_vouch' : 'c7_sewer' };

  N.c6_vouch = { timer: 'normal', choices: [
    { t: 'He\'s with me. He warned us.', to: 'c7_sewer', tr: { max: 10, stas: -5 }, set: { maxJoined: 1 }, after: [{ s: 'max', t: 'Max. Mechanic. I can open almost anything.', e: 'smile' }] },
    { t: 'I don\'t know him.', to: 'c7_sewer', tr: { max: -30 }, set: { maxLeft: 1 }, after: [{ s: 'max', t: '...Right. Of course.', e: 'sad' }] },
    { silent: 1, to: 'c7_sewer', set: { maxJoined: 1 }, after: [{ s: 'stas', t: 'Fine. He walks in front.', e: 'angry' }] }
  ] };

  /* ================= ACT V · UNDERNEATH ================= */
  N.c7_sewer = { act: ['Act V', 'Underneath'], loc: 'sewer', clock: '01:40', checkpoint: true, steps: [
    { amb: 'sewer' }, { mus: 'dread' }, { hb: 0 },
    { cast: s => ['stas', 'lena', 'petya'].concat(has(s, 'maxJoined') ? ['max'] : []), e: s => ({ lena: has(s, 'lenaHurt') ? 'sad' : 'neutral', petya: 'neutral', stas: 'neutral', max: 'neutral' }) },
    { s: 'petya', t: 'Storm drain. I used to come down here with a camera. Urbex. Mum hated it.', e: 'smile' },
    { s: 'petya', t: 'There\'s a junction ahead. Left goes to the river outfall, past the city line. Right goes to the old factory.' },
    { s: 'stas', t: 'The factory has a civil-defence shelter. Steel door. Filters. Food for a year.' },
    { s: 'stas', t: 'I\'ve been inside.', e: 'lying' }, { sting: 'lie' },
    { s: 'petya', t: 'When?', e: 'neutral' }, { s: 'stas', t: 'Before.', e: 'lying' },
    { if: s => has(s, 'lenaHurt'), then: [{ s: 'lena', t: 'I can walk. Not fast. I\'m sorry.', e: 'sad' }] },
    { sfx: 'steps', a: 8 }, { n: 'Boots on the street above. A grate ahead lets in torchlight, and voices.' }
  ], mini: { type: 'hold', o: { title: 'Under the grate', beam: 1, long: 1 }, win: 'c7_choice', lose: 'go_grate' } };

  const routeChoices = [
    { t: 'Stas. You\'ve never been inside that shelter. Have you?', once: 1, to: 'c7_truth' },
    { t: 'We follow Petya. To the river.', to: 'c7_outfall', tr: { petya: 10 } },
    { t: 'We follow Stas. To the shelter.', to: 'c8_bunker', tr: { stas: 10 } }
  ];
  N.c7_choice = { checkpoint: true, steps: [
    { n: 'The junction. Left, the smell of river. Right, the hum of something mechanical, far off.' },
    { s: 'stas', t: 'Right. The shelter.', e: 'angry' }, { s: 'petya', t: 'Left. I know the way. Mostly.', e: 'scared' },
    { if: s => has(s, 'maxJoined'), then: [{ s: 'max', t: 'Your call, 47. You got us this far.', e: 'neutral' }] }
  ], timer: 'long', choices: routeChoices.concat([{ silent: 1, to: 'c7_silence' }]) };

  N.c7_silence = { steps: [{ s: 'stas', t: 'Nobody? Then it\'s my call. Right.', e: 'angry' }], next: 'c8_bunker' };

  N.c7_truth = { steps: [
    { e: { stas: 'sad' } }, { s: 'stas', t: '...No. I\'ve seen the door. A colleague said it was stocked.', e: 'sad' },
    { if: s => has(s, 'lenaHurt'), then: [{ s: 'stas', t: 'The river is three kilometres of water up to your chest. Lena won\'t make it.' }],
      else: [{ s: 'stas', t: 'The river is three kilometres. And out there is just more of this.' }] },
    { tr: { stas: 8 } }
  ], timer: 'long', choices: routeChoices.slice(1) };

  N.c7_outfall = { go: s => (s.trust.petya >= 45 && (!has(s, 'lenaHurt') || s.inv.light || has(s, 'gaveWater'))) ? 'c9_outfall' : 'c7_refuse' };
  N.c7_refuse = { steps: [
    { s: 'petya', t: 'I... I don\'t know if I remember it. In the dark. With them up there.', e: 'scared' },
    { if: s => has(s, 'lenaHurt') && !s.inv.light, then: [{ s: 'lena', t: 'Not without light. Not with this leg.', e: 'sad' }] },
    { s: 'stas', t: 'Then it\'s decided.', e: 'neutral' }
  ], next: 'c8_bunker' };

  /* ---------- ending: cliffhanger in the shelter ---------- */
  N.c8_bunker = { act: ['Shelter No. 3', '04:51'], loc: 'bunker', clock: '02:30', checkpoint: true, steps: [
    { amb: 'bunker' }, { mus: 'calm' }, { cast: [] },
    { n: 'The shelter door takes all of you to turn. It closes with a sound like the end of something.' },
    { n: 'Bunks. Tins. A fan that still spins on a battery. For the first time in nine days, you sleep.' },
    { clock: '04:51' }, { fx: 'blackout' }, { wait: 1600 }, { fx: 'unblack' }, { sfx: 'metal' },
    { n: 'You wake to the intercom crackling.' }, { mus: 'dread' },
    { n: 'A voice through the grille: "Neighbour. How\'s the weather in there?"' }, { sting: 'reveal' }, { wait: 1200 },
    { if: s => has(s, 'maxJoined'), then: [
      { cast: ['max', 'stas', 'petya'], e: { max: 'scared', stas: 'angry', petya: 'scared' } },
      { n: 'Then, Max\'s voice, recorded, flat: "Grom is coming."' },
      { s: 'max', t: 'That\'s my voice note. From my phone. They\'ve been listening to everything.', e: 'scared' }],
      else: [{ n: 'Then, in a voice you would know anywhere: "Grom is coming."' }, { cast: ['stas', 'lena', 'petya'], e: { stas: 'angry', lena: 'scared', petya: 'scared' } }] },
    { fx: 'alarm' }, { sfx: 'metal' }, { fx: 'shake' }, { mus: 'chase' }, { hb: 140 },
    { n: 'The wheel on the steel door begins to turn. From the outside.' },
    { s: 'petya', t: 'There\'s a cooling duct behind the shelves. I saw it on the plans.', e: 'scared' },
    { s: 'stas', t: 'Go. GO.', e: 'angry' }
  ], mini: { type: 'mash', o: { title: 'Second escape', hint: 'Drag the shelf. Hammer it.', diff: 1, time: 6 }, win: 'c8_cliff', lose: 'go_bunker' } };

  N.c8_cliff = { steps: [
    { cast: [] }, { fx: 'noalarm' }, { fx: 'blackout' },
    { n: 'You are in the duct, crawling, the shelf scraping shut behind you, when you hear the door open.' },
    { sfx: 'steps', a: 6 },
    { n: 'And footsteps that stop exactly where you were sleeping.' }
  ], ending: 'grom' };

  /* ---------- ending: escape to the river ---------- */
  N.c9_outfall = { loc: 'sewer', o: { grate: 1 }, clock: '03:10', checkpoint: true, steps: [
    { mus: 'tension' },
    { s: 'petya', t: 'Left. Left. Under the pipe. Don\'t touch the green water.', e: 'neutral' },
    { if: s => has(s, 'maxJoined'), then: [{ s: 'max', t: 'I owe you a lift, 47. When there are lifts again.', e: 'smile' }] },
    { n: 'Torches at the far end of the tunnel. A patrol, wading.' }
  ], mini: { type: 'stealth', o: { theme: 'sewer', guards: 1 }, win: 'c9_dawn', lose: 'go_sewer' } };

  N.c9_dawn = { loc: 'dawn', clock: '05:58', steps: [
    { amb: 'title' }, { mus: 'hope' }, { hb: 0 }, { fx: 'calm' },
    { cast: s => ['petya', 'lena'].concat(has(s, 'maxJoined') ? ['max'] : []).concat(s.trust.stas >= 40 ? ['stas'] : []), e: () => ({ petya: 'smile', lena: 'smile', max: 'smile', stas: 'neutral' }) },
    { n: 'The grate at the outfall is rusted through, just like Petya said.' },
    { n: 'Beyond it: grey water, a broken bridge, and the first daylight you have seen in nine days.' },
    { s: 'petya', t: 'Told you. Mostly.', e: 'smile' },
    { if: s => s.trust.stas >= 40, then: [{ s: 'stas', t: 'Shelter would\'ve held.', e: 'neutral' }, { s: 'lena', t: 'Sure, Stas.', e: 'smile' }],
      else: [{ n: 'Stas went right at the junction. Nobody says his name.' }] }
  ], ending: 'daylight' };

  /* ---------- game overs (ending "Taken") ---------- */
  const GO = (title, text) => ({ gameover: { title, text } });
  N.go_peek = GO('Seen', 'The beam stops on the gap in your door. The dog gets there first.');
  N.go_trap = GO('Opened', 'Six torches. One door. You never get it closed.');
  N.go_door = GO('Breached', 'The door comes off the hinges in one piece. Preparation would have bought you seconds. You had none.');
  N.go_fall = GO('Twelve floors', 'The rail is wet. Your hands are wet. The city is very far away, and then it isn\'t.');
  N.go_hall = GO('Spotted', 'A torch swings. A shout. The stairwell was always theirs.');
  N.go_garage = GO('Caught', 'A beam across your face. "Got one."');
  N.go_van = GO('The blue van', 'The side door slides shut behind you.');
  N.go_grate = GO('Heard', 'One breath too many. The grate lifts.');
  N.go_sewer = GO('Waders', 'The patrol\'s torch finds you up to your waist in black water.');
  N.go_bunker = GO('The door', 'The wheel stops turning. The door swings in.');

  return { nodes: N, start: 'start', trust: T, endings, contacts };
})();
