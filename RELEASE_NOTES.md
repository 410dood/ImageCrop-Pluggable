# Release notes

## Unreleased

- Switched the crop UI to `react-image-crop` for more reliable mouse and touch behavior.
- Removed the `On apply` action from the widget contract and runtime.
- Consolidated runtime crop styling into the widget code path used by Mendix packaging.
- Removed the bundled Java companion module from this repository.

## 1.0.0

- Initial release of the pluggable `ImageCropper` widget.
- Added crop area drawing, moving, and corner resizing.
- Added optional aspect ratio enforcement from attribute value (`W:H`).
- Added coordinate output attributes compatible with legacy crop flows.
