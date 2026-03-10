# Release notes

## Unreleased

- Switched the crop UI to `react-image-crop` for more reliable mouse and touch behavior.
- Added Mendix module companion under `mendix-module/ImageCropper` with Java action template and reusable crop support.
- Updated README with server-side crop persistence guidance and `On apply` wiring.

## 1.0.0

- Initial release of the pluggable `ImageCropper` widget.
- Added crop area drawing, moving, and corner resizing.
- Added optional aspect ratio enforcement from attribute value (`W:H`).
- Added coordinate output attributes compatible with legacy crop flows.
