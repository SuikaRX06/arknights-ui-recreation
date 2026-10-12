# Development tools

Run commands from the event folder. Node.js 22+ is required.

```sh
npm run check
npm test
npm run release
```

The release builder writes the runtime folder to `../dist/直到大地变成一颗酸橙/`. Research files, extraction dependencies and tests are excluded.

`node tools/capture-doc-media.mjs <playwright-index.mjs>` captures screenshots and animation frames from the running local preview. Start `npm start` first. Then run `python tools/encode-doc-media.py` (requires Pillow) to encode both GIFs.

Python extraction scripts are optional development tools, not runtime dependencies. Their pinned dependencies are in `extraction-requirements.txt`. Historical provenance and validation notes are retained in `../reference/document-history/`.
