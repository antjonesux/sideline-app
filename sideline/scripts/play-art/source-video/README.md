# OBS source videos for play-art preparation

Place recordings here using the filename contract:

```
{game-version}-{side}-{playbook-slug}.mp4
```

```
source-video/
├── offense/
│   └── cfb27-offense-go-go.mp4
└── defense/
    └── cfb27-defense-3-3-5-tite.mp4
```

Filename is authoritative for game version, side, and playbook.
If directory side disagrees with the filename, preparation fails closed.

See `scripts/play-art/video/README.md`.
