# Les Memora

A private, room-by-room museum for someone you love. Phase 1 is the walk-through. Phase 1.5 adds hand-built orders: a JSON file and photos, published by a deploy.

```bash
npm install
npm run dev
```

Open `/` and choose a theme, or go straight to `/m/sample-romantic`.

Set `NEXT_PUBLIC_SITE_URL` in `.env.local` before publishing an order, for example `http://localhost:3000` or your Vercel URL. Set `ORDER_GATE_SECRET` to a long random string before a password-protected museum is deployed. Without it, local cookies still work, and anyone with the deployment could forge one.

Music placeholders live in `public/music`. Replace the wav files and edit `tracks.json` before launch. Do not add audio uploads.

Sample art is generated with `npm run generate:art`.

## How to fulfil an order

1. Create a draft and a customer folder. npm treats `--template` as its own flag, so the draft command is a separate script:

   ```bash
   npm run new_order:template -- "Alex"
   ```

2. Put the photos in `order_inbox/Alex/` and edit `order.json`. The field list is in `order_inbox/README.md`. Raw photos stay in that folder. It is gitignored.

3. Publish the order. This resizes each photo to 1600px, saves a WebP with a random name, strips EXIF and GPS, and writes `orders/<slug>.json`.

   ```bash
   npm run new_order -- "Alex"
   ```

   The command prints `https://<site>/m/<slug>` and the expiry date. Free orders last 7 days. Paid orders last one year. Put `expires_at` in the draft to override either one.

4. Check the table:

   ```bash
   npm run list_orders
   ```

   Status is `active`, `expiring within 7 days`, or `expired`.

5. Commit `orders/<slug>.json` and `public/o/<slug>/`, then `git push`. The push triggers the Vercel deploy. The link starts working when that deploy finishes.

6. To remove an order and its photos:

   ```bash
   npm run delete_order -- <slug>
   ```

   Type the slug again when asked. Then commit the deletion and push.

`/public/o/` files are reachable by anyone who has the exact URL. Slugs and file names have to stay unguessable, and the repository has to stay private. A leaked slug is a leaked museum.

## The 3D hall

Museum links (`/m/<slug>`) open a first-person 3D hall. Rooms follow the museum's room order. Photos hang on the walls, milestones are printed plaques with lit floor markers, the letter room has a desk and an envelope you can open, and each theme has its own atmosphere (petals, stars, bunting, window light, rings, embers, leaves, paper).

How it behaves:

- **Guided walk** is the default. It walks to each frame, pauses, and carries on. It stops at the letter desk and at the end so the visitor can read and share. Controls fade after a few seconds and return with a tap.
- **Explore on my own** lets the visitor drag to look, hold the arrow buttons (or use W/S, arrow keys, or the mouse wheel) to walk.
- **Tap any frame** to glide up to it. A card shows the caption and date, and "Zoom photo" opens a pinch/double-tap viewer.
- **Menu** has an all-exhibits list (also the screen-reader view), share, and the simple viewer.
- Only the current room and its neighbors are mounted. Photos are shrunk to 1024px (768px on weaker phones) before they reach the GPU and freed when a room unmounts.

Quality tiers: devices with 4 or fewer cores, or 3 GB or less memory, start on the low tier (no floor reflections, fewer particles, 1x pixel ratio). The viewer measures frame rate after the visitor enters. Under 30 fps on the high tier it drops to low. Under 18 fps on the low tier it switches to the simple 2.5D viewer on its own. Phones without WebGL go straight to the simple viewer.

Testing shortcuts (add to the museum address):

- `?q=high` or `?q=low` forces a tier and turns off the automatic fallback.
- `?q=simple` forces the simple viewer.

Where things live: `lib/gallery_layout.ts` (rooms to 3D space, guided stops, walking limits), `lib/gallery_tour.ts` (camera path math, no three.js), `components/museum/gallery3d/` (scene, camera, HUD, overlays). `tests/gallery_layout.test.ts` covers the layout and path for every sample museum in both landscape and portrait.

For the later video export, `run_guided_tour` and `get_canvas` on the viewer handle are still exposed, and the tour clock is deterministic.
