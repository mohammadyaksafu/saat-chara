# Saat Chara (সাত চাড়া) · Seven Stones

A browser version of the childhood game from Bangladesh, also known as Lagori or Pithu.
One team knocks down the tower of seven stones. Then it has to stack all seven back up
while the other team tries to hit its players with the ball.

**Play:** https://mohammadyaksafu.github.io/saat-chara/
**Visitor stats:** https://mohammadyaksafu.github.io/saat-chara/stats.html

Plain HTML, CSS and JavaScript. There's no build step and no audio or image files to load
for gameplay: the field, players, sounds and music are all drawn or generated in the browser.

## Features

- **Play with a friend on two devices:** create a room, send the link (or the 6-letter code), and your friend opens it on their own phone or computer. Choose **Friend vs friend** (you lead opposite teams) or **Together vs computer** (same team against the AI). Computer players fill the remaining spots.
- **Tutorial:** a one-minute guided round for first-time players (throw, pick up, stack, switch, dodge).
- **Quick match:** choose a team, difficulty (Easy / Normal / Hard), 3–5 players per team, match length, field and house rules.
- **Village tournament:** beat five teams in a row to become Upazila champion. Each win unlocks a new field.
- **Five fields:** village field, schoolyard, riverbank, monsoon (rain and puddles) and Boishakhi Mela.
- **Skill-based tower throw:** a power meter with a green zone that shrinks with difficulty, plus wind that changes every round.
- **Stack biggest first:** the next stone needed has a gold ring. Stones brought in the wrong order wait in a pile in the circle.
- **Switch players and choose targets:** switch to any teammate, and lock onto an attacker before you throw.
- **3-second ball limit** for defenders, with a countdown ring.
- **Phone camera:** on small screens the camera zooms in and follows your player, with a minimap of the whole field.
- **English and বাংলা:** the whole interface works in both languages, with Bengali numerals.
- **10 achievements**, a win/loss record and a shareable result card.
- **Works offline** after the first visit (service worker), and can be installed to the home screen.
- **Accessibility:** each team also has its own shirt pattern (so colour isn't the only difference), there's a screen-shake toggle, and it respects reduced-motion settings.

## Controls

| Action | Computer | Phone / tablet |
| --- | --- | --- |
| Throw at the tower (you take every throw) | Aim with the mouse, hold to charge, release in the green zone (or hold Space). On Easy, **E** locks the aim onto the tower | Touch toward the tower, hold, then release. On Easy, **TARGET** locks on |
| Move | WASD / arrow keys | Drag with your left thumb |
| Dash / dodge | Space or Shift | DASH |
| Switch player | **Q** or **Tab**, or click a teammate | **SWITCH**, or tap a teammate |
| Defending: throw at a target | Click a player, or **E** to cycle targets and **Space** to throw | Tap a player, or **TARGET** to cycle and **THROW** to fire |
| Defending: pass | Click a teammate | Tap a teammate |
| Pause / sound | Esc / M | Buttons on screen |

## Rules used

- Each attacker gets one throw. A ball caught before it bounces puts the thrower out (house rule).
- After the tower falls, attackers carry stones into the chalk circle and stand still to stack them, biggest first (house rule).
- If the ball hits an attacker before it bounces, that attacker is out. Running into a loose ball kicks it away.
- Defenders can't run while holding the ball, must throw within 3 seconds (house rule), and can't stand in the chalk circle.
- Stacking all 7 before the timer runs out wins the round. If every attacker is out, or time runs out, the defenders win the round. The teams then swap roles.

## How online play works

- The two browsers connect directly to each other with WebRTC. The free [PeerJS](https://peerjs.com/) public server only introduces them; game data never goes through a game server.
- The person who creates the room (the host) runs the match and sends what's happening about 20 times a second. The friend's device draws it, moves its own player locally (so movement feels instant) and sends its actions back.
- The PeerJS library is loaded only when someone opens online play.
- Rooms are private: only someone with the link or code can join, and a room takes one friend.

Things to know:
- Both players need to keep the game open in the front. If the host switches apps, phones pause the page and the match freezes for both.
- Most home Wi-Fi and mobile networks connect fine. Some strict mobile or office networks block direct connections. If a link won't connect, both players can try the same Wi-Fi. A TURN relay server would fix this for every network, and can be added later (for example a free Metered or Cloudflare TURN account).

## Visitor counter

The game counts visits, unique visitors (one per browser), matches, finished tutorials and
tournament champions with the free [Abacus](https://jasoncameron.dev/abacus/) counter API.
Only counts are sent: no cookies, names or IP addresses are stored by the game. Counting is
switched off on `localhost` and when opening the file directly, so testing doesn't inflate
the numbers. `stats.html` shows the totals and a chart of visits for the last 14 days.

The counter namespace is set in `js/counter.js` (`NS`). Change it if you fork the game.

## Run it locally

```bash
npx serve .            # or: python -m http.server 8000
```

Opening `index.html` directly also works, but offline mode needs a server.

## Deploy

The repository is ready for **GitHub Pages** (Settings → Pages → Deploy from branch → `main` / root).
Any other static host works too (Netlify, Vercel, cPanel): upload the folder as it is.

## Files

```
index.html             page, menus and HUD
stats.html             visitor stats page
css/style.css          UI styling (responsive, safe areas, reduced motion)
js/i18n.js             English and Bengali text
js/audio.js            Web Audio sound effects, music, ambience and voice shouts
js/counter.js          anonymous visit counters
js/net.js              two-device play over WebRTC (PeerJS)
js/game.js             game loop, physics, AI, camera, rendering, input, menus
js/stats.js            visitor stats page logic and chart
sw.js                  offline cache
manifest.webmanifest   install to home screen
assets/                icons and the link-preview image
```

You can tune the AI and difficulty in the `DIFF` table at the top of `js/game.js`, and the
tournament in `TOURNEY`.
