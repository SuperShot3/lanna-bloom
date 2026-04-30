# lanna-bloom-social-reel

A HyperFrames video composition. Plain HTML + GSAP; rendered to MP4 by the `hyperframes` CLI.

## Requirements

- **Node.js 22+** — [nodejs.org](https://nodejs.org/)
- **FFmpeg** — `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Linux) or [ffmpeg.org/download](https://ffmpeg.org/download.html) (Windows)

Verify: `npx hyperframes doctor`

## Preview

```bash
npx hyperframes preview
```

Opens HyperFrames Studio at `http://localhost:3002` with frame-accurate scrubbing.

## Refine with Claude Code

```bash
npx skills add heygen-com/hyperframes
npx hyperframes lint
npx hyperframes preview
```

## Render

```bash
npx hyperframes render index.html -o output.mp4
```

1920×1080 / 30fps default. Use `--fps 60` or `--resolution 3840x2160` to override.
