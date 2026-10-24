# Order inbox

This folder holds raw customer photos while an order is being built. Everything except this README is gitignored. Do not commit the photos.

Create a draft:

```bash
npm run new_order:template -- "Alex"
```

That writes `order_inbox/Alex/order.json`. Put the photo files in the same folder, using the file names the draft mentions, then edit the draft and run:

```bash
npm run new_order -- "Alex"
```

## Fields

| Field | Meaning |
| --- | --- |
| `theme_id` | One of `romantic`, `friendship`, `siblings`, `parents`, `grandparents`, `birthday`, `anniversary`, `reliving`. |
| `title` | Museum title. This is the only private-looking line allowed in the share card. |
| `recipient_name` | Shown inside the museum. It is not put in the share text. |
| `dedication` | The line under the title in the lobby. It is not put in link previews. |
| `plan` | `free` (7 days, badge on, 20 photos) or `paid` (1 year, badge off, 100 photos). |
| `show_badge` | Optional. Leave it out to use the plan default: on for free, off for paid. |
| `expires_at` | Optional ISO date (`2027-10-24`) or timestamp. Leave it out and the script picks 7 days or 1 year. A calendar date stays open through the end of that UTC day. |
| `password` | Optional plaintext password. Leave it empty for a link with no gate. The site hashes it when the file is read. |
| `notes` | Internal only. Never shown on the museum. |
| `music.type` | `library`, `youtube`, `spotify`, or `apple`. |
| `music.track_id` | For `library`. Use an `id` from `public/music/tracks.json`. |
| `music.url` | For `youtube`. An 11-character id or a youtube.com / youtu.be link. |
| `music.embed_url` | For `spotify` or `apple`. An official link. A normal Spotify or Apple Music URL is converted to the embed. |
| `music.title` | Optional label in the player. |
| `rooms` | In order: one lobby, 1 to 5 galleries, then optional timeline and letter, then one finale. The lobby is first and the finale is last. |
| `rooms[].name` | Room title on the wall. |
| `rooms[].exhibits` | Items in that room, in walk order. |
| `exhibits[].kind` | `photo`, `milestone`, `letter`, or `note`. |
| `exhibits[].file` | Photo file name in this folder. Not a path. The script resizes it and strips location data. |
| `exhibits[].caption` | Short line under a photo, or the name of a milestone. |
| `exhibits[].body` | Letter text, milestone detail, or the finale note. |
| `exhibits[].date` | `YYYY-MM-DD` when the item has a date. |

Do not put audio files in the order. Music is a library track or a YouTube, Spotify, or Apple Music link.
