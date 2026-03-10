# ImageCropper

`olari.imagecropper` is a Mendix pluggable web widget that replicates legacy ImageCrop behavior with a modern crop UI.

## Features

- Mobile-friendly crop selection using `react-image-crop`
- Optional aspect-ratio lock from attribute value (format `W:H`, e.g. `1:1`, `16:9`)
- Max render width/height controls (`cropwidth`, `cropheight`)
- Writes selection coordinates and size:
  - `crop_x1`, `crop_y1`, `crop_x2`, `crop_y2`
  - `crop_width`, `crop_height`
- Mobile-friendly corner handles with dashed crop border

## Widget Properties

- `image` (required): image property bound to the context image
- `aspectRatio` (optional): string/enum attribute with ratio text
- `startwidth`, `startheight`: initial crop rectangle size
- `cropwidth`, `cropheight`: display max width/height (0 = no max)
- `contentAlignment`: left, center, or right alignment for the cropper content
- output attributes for crop coordinates and dimensions

## Build and Release

```bash
npm install
npm run lint
npm run build
npm run release
```

Release output:

- `dist/1.0.0/olari.ImageCropper.mpk`
