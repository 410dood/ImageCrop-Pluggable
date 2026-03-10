import { Big } from "big.js";
import {
  CSSProperties,
  ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { EditableValue, WebImage } from "mendix";
import ReactCrop, {
  makeAspectCrop,
  type Crop,
  type PixelCrop
} from "react-image-crop";
import { ImageCropperContainerProps } from "../typings/ImageCropperProps";

interface Bounds {
  w: number;
  h: number;
}

interface SourceRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  w: number;
  h: number;
}

const messageStyle: CSSProperties = {
  padding: "8px 10px",
  fontSize: "13px",
  color: "#5f6a77"
};

const runtimeStyleElementId = "olari-imagecropper-runtime-styles";
// Mendix is not reliably loading packaged widget CSS for this widget,
// so the runtime crop UI styles live here as the single source of truth.
const runtimeCropStyles = `
.image-cropper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
}

.image-cropper--align-left {
  align-items: flex-start;
  text-align: left;
}

.image-cropper--align-center {
  align-items: center;
  text-align: center;
}

.image-cropper--align-right {
  align-items: flex-end;
  text-align: right;
}

.image-cropper .ReactCrop {
  position: relative;
  display: inline-block;
  max-width: 100%;
  cursor: crosshair;
}

.image-cropper .ReactCrop,
.image-cropper .ReactCrop *,
.image-cropper .ReactCrop *::before,
.image-cropper .ReactCrop *::after {
  box-sizing: border-box;
}

.image-cropper .ReactCrop__child-wrapper {
  overflow: hidden;
}

.image-cropper .ReactCrop__child-wrapper > img,
.image-cropper .ReactCrop__child-wrapper > video {
  display: block;
  max-width: 100%;
  height: auto;
}

.image-cropper .ReactCrop:not(.ReactCrop--disabled) .ReactCrop__child-wrapper > img,
.image-cropper .ReactCrop:not(.ReactCrop--disabled) .ReactCrop__child-wrapper > video,
.image-cropper .ReactCrop:not(.ReactCrop--disabled) .ReactCrop__crop-selection {
  touch-action: none;
}

.image-cropper .ReactCrop__crop-mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  width: calc(100% + 0.5px);
  height: calc(100% + 0.5px);
}

.image-cropper .ReactCrop__crop-selection {
  position: absolute;
  top: 0;
  left: 0;
  transform: translateZ(0);
  cursor: move;
  border: 2px dashed #4076f4;
}

.image-cropper .ReactCrop--disabled .ReactCrop__crop-selection,
.image-cropper .ReactCrop--locked .ReactCrop__crop-selection {
  cursor: inherit;
}

.image-cropper .ReactCrop__crop-selection:focus {
  outline: 1px solid #4076f4;
  outline-offset: 0;
}

.image-cropper .ReactCrop--invisible-crop .ReactCrop__crop-mask,
.image-cropper .ReactCrop--invisible-crop .ReactCrop__crop-selection {
  display: none;
}

.image-cropper .ReactCrop__drag-bar,
.image-cropper .ReactCrop__drag-handle.ord-n,
.image-cropper .ReactCrop__drag-handle.ord-e,
.image-cropper .ReactCrop__drag-handle.ord-s,
.image-cropper .ReactCrop__drag-handle.ord-w {
  display: none !important;
}

.image-cropper .ReactCrop__drag-handle {
  position: absolute;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 0;
}

.image-cropper .ReactCrop__drag-handle::before,
.image-cropper .ReactCrop__drag-handle::after {
  content: "";
  position: absolute;
  display: block;
  background: transparent;
  border-radius: 5px;
}

.image-cropper .ReactCrop .ord-nw {
  top: 0;
  left: 0;
  transform: translate(-35%, -35%);
  cursor: nw-resize;
}

.image-cropper .ReactCrop .ord-nw::before {
  top: 0;
  left: 0;
  width: 24px;
  border-top: 8px solid #4076f4;
}

.image-cropper .ReactCrop .ord-nw::after {
  top: 0;
  left: 0;
  height: 24px;
  border-left: 8px solid #4076f4;
}

.image-cropper .ReactCrop .ord-ne {
  top: 0;
  right: 0;
  transform: translate(35%, -35%);
  cursor: ne-resize;
}

.image-cropper .ReactCrop .ord-ne::before {
  top: 0;
  right: 0;
  width: 24px;
  border-top: 8px solid #4076f4;
}

.image-cropper .ReactCrop .ord-ne::after {
  top: 0;
  right: 0;
  height: 24px;
  border-right: 8px solid #4076f4;
}

.image-cropper .ReactCrop .ord-se {
  right: 0;
  bottom: 0;
  transform: translate(35%, 35%);
  cursor: se-resize;
}

.image-cropper .ReactCrop .ord-se::before {
  right: 0;
  bottom: 0;
  width: 24px;
  border-bottom: 8px solid #4076f4;
}

.image-cropper .ReactCrop .ord-se::after {
  right: 0;
  bottom: 0;
  height: 24px;
  border-right: 8px solid #4076f4;
}

.image-cropper .ReactCrop .ord-sw {
  left: 0;
  bottom: 0;
  transform: translate(-35%, 35%);
  cursor: sw-resize;
}

.image-cropper .ReactCrop .ord-sw::before {
  left: 0;
  bottom: 0;
  width: 24px;
  border-bottom: 8px solid #4076f4;
}

.image-cropper .ReactCrop .ord-sw::after {
  left: 0;
  bottom: 0;
  height: 24px;
  border-left: 8px solid #4076f4;
}

@media (pointer: coarse) {
  .image-cropper .ReactCrop__drag-handle {
    width: 34px;
    height: 34px;
  }

  .image-cropper .ReactCrop .ord-nw::before,
  .image-cropper .ReactCrop .ord-ne::before,
  .image-cropper .ReactCrop .ord-se::before,
  .image-cropper .ReactCrop .ord-sw::before {
    width: 30px;
    border-width: 10px;
  }

  .image-cropper .ReactCrop .ord-nw::after,
  .image-cropper .ReactCrop .ord-ne::after,
  .image-cropper .ReactCrop .ord-se::after,
  .image-cropper .ReactCrop .ord-sw::after {
    height: 30px;
    border-width: 10px;
  }
}
`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundNumber(value: number | undefined): number {
  return Math.round(value ?? 0);
}

function normalizeCrop(crop: Partial<Crop>): PixelCrop {
  return {
    unit: "px",
    x: roundNumber(crop.x),
    y: roundNumber(crop.y),
    width: Math.max(1, roundNumber(crop.width)),
    height: Math.max(1, roundNumber(crop.height))
  };
}

function parseAspectRatio(raw?: string | null): number {
  if (!raw) {
    return 0;
  }

  const text = String(raw).trim();
  const match = text.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!match) {
    return 0;
  }

  const left = Number(match[1]);
  const right = Number(match[2]);
  if (
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    left <= 0 ||
    right <= 0
  ) {
    return 0;
  }

  return left / right;
}

function setInteger(attribute: EditableValue<Big>, value: number): void {
  if (attribute.readOnly || attribute.status !== "available") {
    return;
  }

  attribute.setValue(new Big(Math.round(value)));
}

function getImageUri(image: WebImage | undefined): string | undefined {
  return image?.uri;
}

function readBig(value: Big | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value.toString());
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function cropToSourceRect(
  crop: Partial<Crop>,
  displayBounds: Bounds,
  naturalBounds: Bounds
): SourceRect | null {
  const width = crop.width ?? 0;
  const height = crop.height ?? 0;
  if (
    width <= 0 ||
    height <= 0 ||
    displayBounds.w <= 0 ||
    displayBounds.h <= 0
  ) {
    return null;
  }

  const scaleX = naturalBounds.w / displayBounds.w;
  const scaleY = naturalBounds.h / displayBounds.h;
  const x1 = Math.round((crop.x ?? 0) * scaleX);
  const y1 = Math.round((crop.y ?? 0) * scaleY);
  const x2 = Math.round(((crop.x ?? 0) + width) * scaleX);
  const y2 = Math.round(((crop.y ?? 0) + height) * scaleY);

  return {
    x1,
    y1,
    x2,
    y2,
    w: Math.max(1, x2 - x1),
    h: Math.max(1, y2 - y1)
  };
}

function sourceRectToCrop(
  sourceRect: SourceRect,
  displayBounds: Bounds,
  naturalBounds: Bounds
): PixelCrop {
  const scaleX = displayBounds.w / naturalBounds.w;
  const scaleY = displayBounds.h / naturalBounds.h;

  const width = Math.max(1, Math.round(sourceRect.w * scaleX));
  const height = Math.max(1, Math.round(sourceRect.h * scaleY));

  return {
    unit: "px",
    x: clamp(
      Math.round(sourceRect.x1 * scaleX),
      0,
      Math.max(0, displayBounds.w - width)
    ),
    y: clamp(
      Math.round(sourceRect.y1 * scaleY),
      0,
      Math.max(0, displayBounds.h - height)
    ),
    width: Math.min(width, displayBounds.w),
    height: Math.min(height, displayBounds.h)
  };
}

function readSourceRectFromAttributes(
  props: ImageCropperContainerProps,
  naturalBounds: Bounds
): SourceRect | null {
  const x1 = readBig(props.crop_x1.value);
  const y1 = readBig(props.crop_y1.value);
  const x2 = readBig(props.crop_x2.value);
  const y2 = readBig(props.crop_y2.value);
  const width = readBig(props.crop_width.value);
  const height = readBig(props.crop_height.value);

  const resolvedX1 = x1 ?? 0;
  const resolvedY1 = y1 ?? 0;
  const resolvedW =
    width ?? (x2 !== undefined && x1 !== undefined ? x2 - x1 : undefined);
  const resolvedH =
    height ?? (y2 !== undefined && y1 !== undefined ? y2 - y1 : undefined);
  const resolvedX2 =
    x2 ?? (resolvedW !== undefined ? resolvedX1 + resolvedW : undefined);
  const resolvedY2 =
    y2 ?? (resolvedH !== undefined ? resolvedY1 + resolvedH : undefined);

  if (
    resolvedW === undefined ||
    resolvedH === undefined ||
    resolvedX2 === undefined ||
    resolvedY2 === undefined ||
    resolvedW <= 0 ||
    resolvedH <= 0
  ) {
    return null;
  }

  return {
    x1: clamp(resolvedX1, 0, naturalBounds.w),
    y1: clamp(resolvedY1, 0, naturalBounds.h),
    x2: clamp(resolvedX2, 0, naturalBounds.w),
    y2: clamp(resolvedY2, 0, naturalBounds.h),
    w: clamp(resolvedW, 1, naturalBounds.w),
    h: clamp(resolvedH, 1, naturalBounds.h)
  };
}

function createInitialCrop(
  displayBounds: Bounds,
  aspectRatio: number,
  startWidth: number,
  startHeight: number
): PixelCrop {
  const width = clamp(startWidth || 100, 1, displayBounds.w);
  const height = clamp(startHeight || 100, 1, displayBounds.h);

  if (aspectRatio > 0) {
    return normalizeCrop(
      makeAspectCrop(
        {
          unit: "px",
          x: 0,
          y: 0,
          width
        },
        aspectRatio,
        displayBounds.w,
        displayBounds.h
      )
    );
  }

  return {
    unit: "px",
    x: 0,
    y: 0,
    width,
    height
  };
}

function getDefaultCrop(
  props: ImageCropperContainerProps,
  displayBounds: Bounds,
  naturalBounds: Bounds,
  aspectRatio: number
): PixelCrop {
  const sourceRect = readSourceRectFromAttributes(props, naturalBounds);
  if (sourceRect) {
    return sourceRectToCrop(sourceRect, displayBounds, naturalBounds);
  }

  return createInitialCrop(
    displayBounds,
    aspectRatio,
    props.startwidth,
    props.startheight
  );
}

export default function ImageCropper(
  props: ImageCropperContainerProps
): ReactElement {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const initializedForKeyRef = useRef<string>("");

  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [naturalBounds, setNaturalBounds] = useState<Bounds | null>(null);
  const [crop, setCrop] = useState<PixelCrop>();

  const aspectRatio = useMemo(
    () => parseAspectRatio(props.aspectRatio?.value),
    [props.aspectRatio?.value]
  );
  const imageUri = useMemo(
    () => getImageUri(props.image.value),
    [props.image.value]
  );

  const updateBounds = useCallback(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const nextNatural = {
      w: image.naturalWidth || image.clientWidth,
      h: image.naturalHeight || image.clientHeight
    };
    const nextBounds = {
      w: image.clientWidth,
      h: image.clientHeight
    };

    if (nextBounds.w > 0 && nextBounds.h > 0) {
      setBounds((current) =>
        current && current.w === nextBounds.w && current.h === nextBounds.h
          ? current
          : nextBounds
      );
    }

    if (nextNatural.w > 0 && nextNatural.h > 0) {
      setNaturalBounds((current) =>
        current && current.w === nextNatural.w && current.h === nextNatural.h
          ? current
          : nextNatural
      );
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (document.getElementById(runtimeStyleElementId)) {
      return;
    }

    const styleElement = document.createElement("style");
    styleElement.id = runtimeStyleElementId;
    styleElement.textContent = runtimeCropStyles;
    document.head.appendChild(styleElement);
  }, []);

  useEffect(() => {
    if (!imageUri) {
      initializedForKeyRef.current = "";
      setBounds(null);
      setNaturalBounds(null);
      setCrop(undefined);
    }
  }, [imageUri]);

  useEffect(() => {
    if (!bounds || !naturalBounds || !imageUri) {
      setCrop(undefined);
      return;
    }

    const initializationKey = `${imageUri}:${bounds.w}x${bounds.h}:${naturalBounds.w}x${naturalBounds.h}:${aspectRatio}`;
    if (initializedForKeyRef.current === initializationKey) {
      return;
    }

    initializedForKeyRef.current = initializationKey;
    setCrop(getDefaultCrop(props, bounds, naturalBounds, aspectRatio));
  }, [aspectRatio, bounds, imageUri, naturalBounds, props]);

  useEffect(() => {
    if (!crop || !bounds || !naturalBounds) {
      return;
    }

    const sourceRect = cropToSourceRect(crop, bounds, naturalBounds);
    if (!sourceRect) {
      return;
    }

    setInteger(props.crop_x1, sourceRect.x1);
    setInteger(props.crop_y1, sourceRect.y1);
    setInteger(props.crop_x2, sourceRect.x2);
    setInteger(props.crop_y2, sourceRect.y2);
    setInteger(props.crop_width, sourceRect.w);
    setInteger(props.crop_height, sourceRect.h);
  }, [
    bounds,
    crop,
    naturalBounds,
    props.crop_height,
    props.crop_width,
    props.crop_x1,
    props.crop_x2,
    props.crop_y1,
    props.crop_y2
  ]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      updateBounds();
    });
    resizeObserver.observe(image);

    return () => {
      resizeObserver.disconnect();
    };
  }, [imageUri, updateBounds]);

  useLayoutEffect(() => {
    if (!imageUri) {
      return;
    }

    const image = imageRef.current;
    if (!image) {
      return;
    }

    if (image.complete) {
      updateBounds();
      return;
    }

    const frame = window.requestAnimationFrame(updateBounds);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [imageUri, updateBounds]);

  const imageStyle = useMemo<CSSProperties>(
    () => ({
      display: "block",
      width: "100%",
      height: "auto",
      maxWidth: props.cropwidth > 0 ? `${props.cropwidth}px` : "100%",
      maxHeight: props.cropheight > 0 ? `${props.cropheight}px` : "none"
    }),
    [props.cropheight, props.cropwidth]
  );

  const noImage = props.image.status === "available" && !imageUri;

  const rootClassName = useMemo(
    () => `image-cropper image-cropper--align-${props.contentAlignment}`,
    [props.contentAlignment]
  );

  return (
    <div className={rootClassName} tabIndex={props.tabIndex}>
      {props.image.status === "loading" ? (
        <div style={messageStyle}>Loading image...</div>
      ) : null}
      {props.image.status === "unavailable" ? (
        <div style={messageStyle}>Image is unavailable.</div>
      ) : null}
      {noImage ? <div style={messageStyle}>No image to display.</div> : null}

      {imageUri ? (
        <>
          <ReactCrop
            crop={crop}
            aspect={aspectRatio > 0 ? aspectRatio : undefined}
            minWidth={1}
            minHeight={1}
            keepSelection
            onChange={(nextCrop) => {
              setCrop(normalizeCrop(nextCrop));
            }}
            className="image-cropper__react-crop"
          >
            <img
              ref={imageRef}
              alt={props.image.value?.altText || "Image crop source"}
              src={imageUri}
              className="image-cropper__image"
              style={imageStyle}
              draggable={false}
              onLoad={updateBounds}
              onDragStart={(event) => event.preventDefault()}
            />
          </ReactCrop>
        </>
      ) : null}
    </div>
  );
}
