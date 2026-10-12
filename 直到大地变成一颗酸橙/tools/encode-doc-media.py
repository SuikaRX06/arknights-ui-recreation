"""Encode captured browser frames as compact GIF previews. Requires Pillow."""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).resolve().parent.parent
results = []
for folder, name in [('home', 'preview'), ('maps', 'maps')]:
    sources = sorted((root / 'reference/release-preparation/doc-frames' / folder).glob('*.jpg'))
    if len(sources) != 144:
        raise ValueError(f'{folder}: run capture-doc-media.mjs first')
    frames = []
    for source in sources[::2]:
        with Image.open(source) as image:
            frames.append(image.resize((480, 270), Image.Resampling.LANCZOS).quantize(colors=96))
    target = root / 'media' / f'{name}.gif'
    frames[0].save(target, save_all=True, append_images=frames[1:],
                   duration=[160, 170, 170] * 24, loop=0, optimize=False, disposal=2)
    with Image.open(target) as gif:
        duration = 0
        for i in range(gif.n_frames):
            gif.seek(i)
            duration += gif.info['duration']
        if duration != 12000:
            raise ValueError(f'{name}: unexpected duration {duration}')
        results.append(dict(file=target.name, frames=gif.n_frames, durationMs=duration,
                            width=480, height=270, bytes=target.stat().st_size))
report = root / 'reference/release-preparation/doc-gifs.json'
report.write_text(json.dumps(results, indent=2) + '\n', encoding='utf-8')
print(json.dumps(results))
