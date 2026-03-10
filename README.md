# ImageCropper

`olari.imagecropper` is a Mendix pluggable web widget that replicates legacy ImageCrop behavior with a modern crop UI and an optional Java companion for persistent image cropping.

## Features

- Mobile-friendly crop selection using `react-image-crop`
- Optional aspect-ratio lock from attribute value (format `W:H`, e.g. `1:1`, `16:9`)
- Max render width/height controls (`cropwidth`, `cropheight`)
- Writes selection coordinates and size:
  - `crop_x1`, `crop_y1`, `crop_x2`, `crop_y2`
  - `crop_width`, `crop_height`
- Optional `On apply` action hook for server-side crop persistence

## Widget Properties

- `image` (required): image property bound to the context image
- `aspectRatio` (optional): string/enum attribute with ratio text
- `startwidth`, `startheight`: initial crop rectangle size
- `cropwidth`, `cropheight`: display max width/height (0 = no max)
- output attributes for crop coordinates and dimensions
- `onApplyAction` (optional): execute a microflow/nanoflow after selection is confirmed

## Build and Release

```bash
npm install
npm run lint
npm run build
npm run release
```

Release output:

- `dist/1.0.0/olari.ImageCropper.mpk`

## Persistent Cropping

The widget itself is Studio Pro compatible and frontend-only. For actual image mutation, use the companion module in:

- `mendix-module/ImageCropper`

That companion includes:

- a Java action template
- a reusable image crop implementation
- setup instructions for wiring `On apply` to crop and overwrite the same `System.Image`
