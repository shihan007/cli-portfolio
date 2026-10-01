# Showreel 2026

A 15 second, 1920×1080 / 60 fps motion graphics reel. All of it is code: no
footage, no After Effects, no samples.

`showreel.mp4` is the rendered result.

## The cut

Scored at 120 BPM, so every scene is four beats (2 s) and every cut lands on a downbeat.

| Time | Scene | What it shows |
| --- | --- | --- |
| 0–2 s | **01 Impact** | Squash-and-stretch bounce, a particle explosion with shockwave rings, then a layered circle wipe |
| 2–4 s | **02 Kinetic type** | Masked per-letter reveals, a bar wipe, a marquee, and an alternating slice transition |
| 4–6 s | **03 Form** | Point-matched shape morphs (circle → square → triangle → star) with echo trails and orbiting rings. The star becomes the mask for the next scene |
| 6–8 s | **04 Depth** | 1,296 points in 3D (sphere → cube → torus) that flatten into a screen-aligned grid |
| 8–10 s | **05 Rhythm** | The grid reused as tiles: a radial bloom, a diagonal rotation sweep, "TIMING" built from cells, then a domino wipe |
| 10–12 s | **06 Flow** | Perlin-noise ridgelines that hide and reveal type, pulse on the beat and collapse into a single line |
| 12–14 s | **07 Particles** | The line shatters into about 5,000 particles that swirl and land in the wordmark, and the subtitle decodes |
| 14–15 s | **08 Resolve** | The wordmark resolves with a color sweep, collapses to a line, then to the dot it started from |

Craft details: 4-sample motion blur (180° shutter), camera shake and chromatic
aberration driven by an impact list shared with the audio, film grain, a
vignette, and a difference-blended HUD with timecode and a beat counter.

## Files

- `reel.js`: the animation. Every frame is a pure function of time.
- `index.html`: open it through a local server to preview in real time (`?t=6.5` jumps to one frame).
- `audio.mjs`: synthesises the soundtrack (kick, clap, hats, bass, pad, arp, risers, impacts, UI blips) into a WAV.
- `render.mjs`: steps through the frames in headless Chromium and encodes H.264 + AAC with ffmpeg.

## Render

```sh
node showreel/render.mjs                        # -> showreel/showreel.mp4
node showreel/render.mjs --stills 1.1,6.5,13.6  # -> showreel/out/still-*.png
```

You need ffmpeg and Playwright's Chromium.
