# Order inbox

This folder holds raw customer photos and drafts while an order is being built. Everything except this README is gitignored. Do not commit the photos.

## The normal flow (about ten minutes per order)

1. The customer fills in the form at `/order` and sends it on WhatsApp. It arrives as one message that starts with `LES MEMORA ORDER FORM`.
2. They send their photos in the same chat, in the order of their captions.
3. Make a folder for them and put two things in it:
   - the photos, saved from WhatsApp (keep them in the order they were sent; the file names sort that way)
   - the form message, pasted into a text file called `intake.txt`
4. Turn the message into a draft. This fills in every word, date, letter, and caption for you:

```bash
npm run intake -- "Paul"
```

5. Check it. This publishes nothing and tells you what is wrong in plain words:

```bash
npm run check_order -- "Paul"
```

6. Publish it. The script runs the same check first and stops if anything is wrong:

```bash
npm run new_order -- "Paul"
```

7. It prints the link. Run `git add orders public/o`, commit, and push. Pushing is what puts the museum online.

## If you do not have a form message

Start from a blank draft instead. It picks up every photo already in the folder:

```bash
npm run new_order:template -- "Paul"
```

Then open `order_inbox/Paul/order.json` and replace every line that says `Replace this ...`. `new_order` refuses to publish while any of that wording is left, so template text can never reach a customer.

## Why only one photo or no text showed up

Two things caused it, and both are now handled.

- **Only the photos listed in `order.json` are published.** The old template listed one photo, so extra photos in the folder were skipped. The template now lists every photo it finds, `npm run add_photos -- "Paul"` adds any you drop in later, and `new_order` stops with an error if a photo is in the folder but not in the order.
- **The template text was published as real text.** Lines such as "Replace this letter." are placeholders. `new_order` now refuses to run until they are replaced.

## Fixing an order that is already live

Edit `order_inbox/Paul/order.json` (or add photos and run `npm run add_photos -- "Paul"`), then publish again under the same link:

```bash
npm run new_order -- "Paul" --replace <slug>
```

The slug is the last part of the museum address, for example `fTc5M5s6uK2z`. The customer's link, creation date, and expiry stay the same. Only the content changes. Without `--replace`, every run creates a brand-new link.

## All commands

| Command | What it does |
| --- | --- |
| `npm run intake -- "Name"` | Turns `intake.txt` (the form message) into `order.json`, matching captions to photos by position. Add `--force` to overwrite an existing `order.json`. |
| `npm run new_order:template -- "Name"` | Starts a blank `order.json` using the photos in the folder. |
| `npm run add_photos -- "Name"` | Adds photos that are in the folder but not in `order.json` to the last gallery room. |
| `npm run check_order -- "Name"` | Lists errors and warnings. Publishes nothing. |
| `npm run new_order -- "Name"` | Checks, then publishes. `--replace <slug>` keeps the old link. `--force` publishes even with errors. |
| `npm run list_orders` | Every order with its expiry status. |
| `npm run delete_order -- <slug>` | Deletes an order and its photos after you type the slug again. |

## What the check looks for

Errors stop publishing:

- template wording such as "Replace this ..." left in any title, name, caption, or text
- a photo in the folder that is not in the order
- no photos at all

Warnings are printed and publishing goes ahead:

- photos with no caption
- a very short letter
- placeholder library music

## Fields in `order.json`

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
| `notes` | Internal only. Never shown on the museum. The intake command writes the customer's name, occasion, and music request here. |
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
