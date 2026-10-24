import { get_theme } from "./themes";
import type { exhibit, museum, room, theme_config } from "./types";

interface photo_draft {
  scene: string;
  caption: string;
  date?: string;
}

interface gallery_draft {
  name?: string;
  photos: photo_draft[];
}

interface milestone_draft {
  date: string;
  caption: string;
  body: string;
}

interface letter_draft {
  caption: string;
  date?: string;
  body: string;
}

interface sample_draft {
  theme_id: string;
  title: string;
  recipient_name: string;
  dedication: string;
  track_id: string;
  galleries: gallery_draft[];
  milestones: milestone_draft[];
  letters: letter_draft[];
  closing: string;
}

/**
 * These museums are fictional samples. They are not customer stories,
 * and the pictures are generated art rather than anyone's photos.
 */
function require_theme(theme_id: string): theme_config {
  const theme = get_theme(theme_id);
  if (!theme) {
    throw new Error(`Unknown theme "${theme_id}".`);
  }
  return theme;
}

function photo_exhibit(
  slug: string,
  theme_id: string,
  gallery_index: number,
  photo: photo_draft,
  position: number,
): exhibit {
  return {
    id: `${slug}-gallery-${gallery_index + 1}-photo-${position + 1}`,
    kind: "photo",
    image_key: null,
    image_src: `/samples/${theme_id}/${photo.scene}.png`,
    caption: photo.caption,
    body: null,
    date: photo.date ?? null,
    position,
  };
}

/**
 * Build one sample museum from a short draft and the theme's default room names.
 *
 * @param draft - Copy and picture choices for one theme.
 * @returns A museum the viewer can walk.
 */
function build_sample(draft: sample_draft): museum {
  const theme = require_theme(draft.theme_id);
  const slug = `sample-${draft.theme_id}`;
  if (draft.galleries.length < 1 || draft.galleries.length > 5) {
    throw new Error(`${slug} needs between 1 and 5 gallery rooms.`);
  }

  const rooms: room[] = [
    {
      id: `${slug}-lobby`,
      type: "lobby",
      name: theme.default_room_names.lobby,
      position: 0,
      exhibits: [],
    },
  ];

  draft.galleries.forEach((gallery, gallery_index) => {
    rooms.push({
      id: `${slug}-gallery-${gallery_index + 1}`,
      type: "gallery",
      name: gallery.name ?? theme.default_room_names.gallery,
      position: rooms.length,
      exhibits: gallery.photos.map((photo, photo_index) =>
        photo_exhibit(slug, draft.theme_id, gallery_index, photo, photo_index),
      ),
    });
  });

  rooms.push({
    id: `${slug}-timeline`,
    type: "timeline",
    name: theme.default_room_names.timeline,
    position: rooms.length,
    exhibits: draft.milestones.map((milestone, index) => ({
      id: `${slug}-milestone-${index + 1}`,
      kind: "milestone",
      image_key: null,
      image_src: null,
      caption: milestone.caption,
      body: milestone.body,
      date: milestone.date,
      position: index,
    })),
  });

  rooms.push({
    id: `${slug}-letter`,
    type: "letter",
    name: theme.default_room_names.letter,
    position: rooms.length,
    exhibits: draft.letters.map((letter, index) => ({
      id: `${slug}-letter-${index + 1}`,
      kind: "letter",
      image_key: null,
      image_src: null,
      caption: letter.caption,
      body: letter.body,
      date: letter.date ?? null,
      position: index,
    })),
  });

  rooms.push({
    id: `${slug}-finale`,
    type: "finale",
    name: theme.default_room_names.finale,
    position: rooms.length,
    exhibits: [
      {
        id: `${slug}-closing`,
        kind: "note",
        image_key: null,
        image_src: null,
        caption: null,
        body: draft.closing,
        date: null,
        position: 0,
      },
    ],
  });

  return {
    id: `sample-${draft.theme_id}`,
    slug,
    theme_id: draft.theme_id,
    title: draft.title,
    recipient_name: draft.recipient_name,
    dedication: draft.dedication,
    music: { source: "library", track_id: draft.track_id },
    rooms,
    show_badge: true,
    cover_image: `/samples/${draft.theme_id}/cover.png`,
  };
}

const sample_museums: readonly museum[] = [
  build_sample({
    theme_id: "romantic",
    title: "For Maya",
    recipient_name: "Maya",
    dedication: "For the way an ordinary Tuesday became the day I wanted to keep.",
    track_id: "soft_room",
    galleries: [
      {
        name: "The Quiet Hours",
        photos: [
          { scene: "kitchen", caption: "Sunday soup, and the playlist you pretended not to like.", date: "2021-01-17" },
          { scene: "window", caption: "Rain you refused to call bad weather.", date: "2022-03-04" },
        ],
      },
      {
        name: "The Long Way",
        photos: [
          { scene: "path", caption: "We missed the bus on purpose.", date: "2019-06-08" },
          { scene: "garden", caption: "You stopped to learn the names of the flowers.", date: "2023-05-20" },
        ],
      },
    ],
    milestones: [
      { date: "2016-04-02", caption: "First coffee", body: "It was supposed to be twenty minutes. The cups went cold." },
      { date: "2019-09-18", caption: "The yellow kettle", body: "We moved into the apartment that faced the bakery." },
      { date: "2023-06-03", caption: "A Tuesday", body: "Nothing famous happened. We still talk about it." },
    ],
    letters: [
      {
        caption: "Read this one aloud",
        date: "2024-02-14",
        body: "Maya,\n\nI keep trying to write you something grand, and then I remember the way you line your shoes up by the door like they are guests. That is the part I want in a museum.\n\nThank you for the Tuesdays. Thank you for sending me home with the good leftovers and for laughing at the same part of the story every time. If these rooms feel quiet, that is all right. We were quiet in the best way.\n\nI am glad it was you.",
      },
    ],
    closing: "Stay as long as you like. The kettle is on.",
  }),
  build_sample({
    theme_id: "friendship",
    title: "For Jordan",
    recipient_name: "Jordan",
    dedication: "For the friend who saved the seat, and then stayed.",
    track_id: "bright_room",
    galleries: [
      {
        photos: [
          { scene: "porch", caption: "The steps where we decided the night was still young.", date: "2018-08-11" },
          { scene: "stars", caption: "You knew the two constellations. You invented the rest.", date: "2020-07-19" },
          { scene: "path", caption: "Walking you to the station, slowly, as a sport.", date: "2022-11-02" },
        ],
      },
    ],
    milestones: [
      { date: "2014-09-03", caption: "Same row", body: "Assigned seats. We kept them long after the class ended." },
      { date: "2017-12-31", caption: "The bad fireworks", body: "They fizzled. We ranked the year anyway." },
      { date: "2024-04-16", caption: "You moved, I visited", body: "The new city already had a booth that felt like ours." },
    ],
    letters: [
      {
        caption: "Not a text",
        date: "2024-05-01",
        body: "Jordan,\n\nI owe you a museum because a voice note cannot hold a decade. You are the person I send the unflattering photo to, and the person who tells me when I am being dramatic with my whole chest.\n\nThank you for the airport pickups and for remembering how I take my tea in three different cities. If friendship is a room, you kept the light switch where I could find it.\n\nSave me a seat.",
      },
      {
        caption: "P.S.",
        body: "The constellation you named after the corner shop is still not official. I checked. I am telling people anyway.",
      },
    ],
    closing: "Your turn to pick the booth.",
  }),
  build_sample({
    theme_id: "siblings",
    title: "For Sam",
    recipient_name: "Sam",
    dedication: "For the sibling who knew the house rules, and broke the funny ones with me.",
    track_id: "warm_room",
    galleries: [
      {
        photos: [
          { scene: "lake", caption: "You swam out farther and then waited.", date: "2009-07-22" },
          { scene: "garden", caption: "The tomato plants we were trusted with. Briefly.", date: "2012-08-01" },
          { scene: "kitchen", caption: "Midnight toast negotiations.", date: "2016-01-09" },
        ],
      },
    ],
    milestones: [
      { date: "2004-06-15", caption: "Bunk beds", body: "You took the top. I took the stories you told down the ladder." },
      { date: "2015-09-01", caption: "Different schools", body: "The walk split in two. We still met at the corner." },
      { date: "2021-12-24", caption: "Both home", body: "The house got loud in the old key." },
    ],
    letters: [
      {
        caption: "From the landing",
        body: "Sam,\n\nI spent years pretending we were nothing alike, which was my funniest lie. You still finish my sentences when they are about food, and you still knock twice on my door like we are kids and the knock is a password.\n\nThank you for being on my side in rooms where I did not know I needed a side. This museum is the long version of that knock.\n\nCome home when you can.",
      },
    ],
    closing: "The top bunk is still yours, in spirit.",
  }),
  build_sample({
    theme_id: "parents",
    title: "For Amina",
    recipient_name: "Amina",
    dedication: "For the kitchen light that meant someone was waiting up.",
    track_id: "soft_room",
    galleries: [
      {
        photos: [
          { scene: "kitchen", caption: "The table where homework became dinner.", date: "2008-10-14" },
          { scene: "window", caption: "You watched the street until I waved.", date: "2011-03-28" },
          { scene: "porch", caption: "Sunday shoes by the door.", date: "2019-05-12" },
        ],
      },
    ],
    milestones: [
      { date: "1998-02-02", caption: "You named me", body: "I grew into a name you chose carefully." },
      { date: "2013-08-30", caption: "First day you did not walk me in", body: "You still stood where I could see you if I turned." },
      { date: "2022-11-20", caption: "I cooked", body: "You let me, and you only corrected the salt once." },
    ],
    letters: [
      {
        caption: "The thank-you that got too big for a card",
        body: "Mom,\n\nI notice it now: the way you kept a second set of keys, a second helping, a second calm voice for the days I came in loud. This is a small museum for a large kindness.\n\nI remember the window. I remember you pretending you were not waiting. Thank you for the meals that were also advice, and for the advice that was also a meal.\n\nI am home whenever I sit at a table you taught me to set.",
      },
    ],
    closing: "There is a plate for you in every one of these rooms.",
  }),
  build_sample({
    theme_id: "grandparents",
    title: "For Grandma Rose",
    recipient_name: "Grandma Rose",
    dedication: "For the stories you told more than once, so we would have them.",
    track_id: "warm_room",
    galleries: [
      {
        photos: [
          { scene: "porch", caption: "The chair that faced the street and the weather.", date: "2006-06-18" },
          { scene: "desk", caption: "Letters you kept in a tin, in order, mostly.", date: "1994-01-01" },
          { scene: "garden", caption: "Mint by the step. You said it was stubborn, fondly.", date: "2010-07-04" },
        ],
      },
    ],
    milestones: [
      { date: "1952-04-11", caption: "A train south", body: "You told it as an adventure. We heard the courage later." },
      { date: "1978-09-09", caption: "The recipe card", body: "Butter in the margin, in your handwriting." },
      { date: "2017-12-25", caption: "All of us, loud", body: "You watched the room like it was the point of the year." },
    ],
    letters: [
      {
        caption: "In your handwriting, if I could",
        body: "Grandma Rose,\n\nI built you a porch you can visit without the stairs. The mint is here, and the tin of letters, and the chair that knew everyone's name before we said it.\n\nYou repeated the good stories until they were ours. That was the gift. I am repeating them back, in rooms, so the youngest cousins can walk through them too.\n\nSit as long as you like. I will put the kettle where you expect it.",
      },
    ],
    closing: "The chair by the window is yours.",
  }),
  build_sample({
    theme_id: "birthday",
    title: "Noah is 30",
    recipient_name: "Noah",
    dedication: "For the person the room gets brighter for. Thirty looks good on you.",
    track_id: "bright_room",
    galleries: [
      {
        name: "This Year",
        photos: [
          { scene: "cake", caption: "Last year's candle. You gave the wish away.", date: "2025-03-12" },
          { scene: "kitchen", caption: "The breakfast you make when people stay over.", date: "2024-08-03" },
          { scene: "stars", caption: "The roof, because the venue was booked. By us. For us.", date: "2023-03-12" },
        ],
      },
    ],
    milestones: [
      { date: "1996-03-12", caption: "You arrived", body: "The day we throw a museum at, once a year." },
      { date: "2014-06-20", caption: "The move", body: "Two boxes and a plant that somehow lived." },
      { date: "2026-03-12", caption: "Thirty", body: "Same laugh. Better playlists. Still early to things you care about." },
    ],
    letters: [
      {
        caption: "Before the singing",
        date: "2026-03-12",
        body: "Noah,\n\nHappy birthday. I am not putting the embarrassing stories on the wall, which is a kindness you may thank me for later. They are safe. They are also accurate.\n\nThis year I hope you get a long table, a late morning, and one plan that is only yours. You make rooms kinder by walking into them. Consider this one proof.\n\nMake a wish. I already did.",
      },
    ],
    closing: "Same time next year. I will bring the good candles.",
  }),
  build_sample({
    theme_id: "anniversary",
    title: "Ten years, Alex and Jules",
    recipient_name: "Alex and Jules",
    dedication: "For the life you kept choosing, year after year.",
    track_id: "soft_room",
    galleries: [
      {
        photos: [
          { scene: "window", caption: "The first apartment, and the plant that outlived the couch.", date: "2016-05-02" },
          { scene: "desk", caption: "Vows, rewritten in the notes app, then by hand.", date: "2016-09-17" },
          { scene: "path", caption: "The anniversary walk. Same route, slower now, on purpose.", date: "2024-09-17" },
        ],
      },
    ],
    milestones: [
      { date: "2015-02-14", caption: "You said it", body: "Not the first kind thing. The one you both still quote." },
      { date: "2016-09-17", caption: "The day", body: "A small room, a large promise." },
      { date: "2021-04-09", caption: "The keys", body: "A door that was finally both of yours." },
    ],
    letters: [
      {
        caption: "To the pair of you",
        date: "2026-09-17",
        body: "Alex and Jules,\n\nTen years is not a highlight reel. It is a kitchen, a calendar, and the way you hand each other the quieter task without a speech. This museum is those rooms, in order.\n\nThank you for letting the rest of us see what choosing looks like when it is ordinary and gold at the same time.\n\nHere is to the next door.",
      },
    ],
    closing: "Again, and again.",
  }),
  build_sample({
    theme_id: "reliving",
    title: "The lake, for Dad",
    recipient_name: "Dad",
    dedication: "For the summers that still smell like pine and wet rope.",
    track_id: "warm_room",
    galleries: [
      {
        photos: [
          { scene: "lake", caption: "Morning, before the boats. You called it the honest hour.", date: "2007-07-06" },
          { scene: "porch", caption: "Cards on the railing. The rules changed if you were winning.", date: "2011-08-15" },
          { scene: "path", caption: "The track down to the water, packed hard by our summers.", date: "2015-07-21" },
        ],
      },
    ],
    milestones: [
      { date: "2001-07-01", caption: "First summer", body: "I learned the lake has a shallow side and a story side." },
      { date: "2010-07-18", caption: "The storm", body: "We watched it cross the water and counted together." },
      { date: "2019-08-02", caption: "Last weekend in August", body: "You said we would come back. This room is me coming back." },
    ],
    letters: [
      {
        caption: "From the honest hour",
        body: "Dad,\n\nI went back without the car, without the cooler, just the order of the rooms: path, porch, water. You are in all three, telling me to look at the far shore before I look at my feet.\n\nI remember the rope swing and the way you checked the knot twice. I remember you letting the storm be interesting instead of only scary.\n\nThe light is on. Visit when you want. I will be on the porch.",
      },
    ],
    closing: "You can visit whenever you need to.",
  }),
];

/**
 * Fictional museums, one for each theme.
 *
 * @returns Sample museums in theme-catalog order.
 */
export function list_sample_museums(): readonly museum[] {
  return sample_museums;
}

/**
 * Find a sample museum by its public slug.
 *
 * @param slug - Path segment under `/m/`.
 * @returns The museum, or null when the slug is not a sample.
 */
export function get_sample_museum(slug: string): museum | null {
  return sample_museums.find((museum) => museum.slug === slug) ?? null;
}
