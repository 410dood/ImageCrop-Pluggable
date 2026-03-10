# ImageCropper Mendix module companion

This folder contains the server-side companion for the pluggable `ImageCropper` widget.

Purpose:
- The widget handles crop selection UI and writes crop coordinates to Mendix attributes.
- The Java action reads those coordinates and writes the cropped bytes back to the same `System.Image` object.

## What is included

- `javasource/imagecropper/implementation/ImageCropSupport.java`
  - reusable crop implementation
- `javasource/imagecropper/actions/ApplyCropToImage.java`
  - generated-style Java action template for Studio Pro

No third-party jars are required. The implementation uses:
- Mendix runtime APIs
- `java.awt`
- `javax.imageio`

## Recommended object model

Use an entity that:
- is a specialization of `System.Image`
- contains the widget output attributes:
  - `crop_x1`
  - `crop_y1`
  - `crop_x2`
  - `crop_y2`
  - `crop_width`
  - `crop_height`

## Mendix setup

1. Copy the Java files into your app `javasource`:
   - `imagecropper/actions/ApplyCropToImage.java`
   - `imagecropper/implementation/ImageCropSupport.java`
2. In Studio Pro, create a Java action named `ApplyCropToImage`.
3. Use package name `imagecropper.actions`.
4. Give it return type `Boolean`.
5. Add these parameters in this order:
   - `imageDocument` : Object, your `System.Image` specialization
   - `cropX1` : Integer or Long
   - `cropY1` : Integer or Long
   - `cropX2` : Integer or Long
   - `cropY2` : Integer or Long
   - `cropWidth` : Integer or Long
   - `cropHeight` : Integer or Long
   - `outputWidth` : Integer or Long
   - `outputHeight` : Integer or Long
   - `thumbnailWidth` : Integer or Long
   - `thumbnailHeight` : Integer or Long
   - `jpegCompressionQuality` : Decimal
6. Replace the generated Java file contents with `ApplyCropToImage.java` from this folder.
7. Deploy the app once so the action compiles.

## Parameter guidance

- `outputWidth` / `outputHeight`
  - Use `0` to keep the cropped size.
  - Set one side to `0` to preserve aspect ratio from the crop box.
- `thumbnailWidth` / `thumbnailHeight`
  - Pass your preferred Mendix thumbnail sizes.
  - `250 / 250` is a safe default.
- `jpegCompressionQuality`
  - Use `0.92` for normal quality.
  - Range is clamped to `0.0 - 1.0`.

## Microflow wiring

Recommended `On apply` microflow:

1. Commit the crop owner object if needed.
2. Call Java action `ApplyCropToImage` with:
   - `imageDocument = $CurrentObject`
   - `cropX1 = $CurrentObject/crop_x1`
   - `cropY1 = $CurrentObject/crop_y1`
   - `cropX2 = $CurrentObject/crop_x2`
   - `cropY2 = $CurrentObject/crop_y2`
   - `cropWidth = $CurrentObject/crop_width`
   - `cropHeight = $CurrentObject/crop_height`
   - `outputWidth = 0`
   - `outputHeight = 0`
   - `thumbnailWidth = 250`
   - `thumbnailHeight = 250`
   - `jpegCompressionQuality = 0.92`
3. Commit or refresh the image object.

## Behavior

- The action crops from the original stored image content.
- The result is written back into the same image document.
- The original format is preserved where possible.
- JPEG output is recompressed using the provided quality.

## Notes

- This is the Mendix-compatible persistence path for Studio Pro versions that do not support editable image upload directly from a pluggable widget.
- The pluggable widget stays frontend-only; the actual file mutation happens in the Java action.
