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

const actionBarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginTop: "10px",
  flexWrap: "wrap"
};

const buttonStyle: CSSProperties = {
  appearance: "none",
  border: "1px solid #1f2a37",
  borderRadius: "4px",
  background: "#ffffff",
  color: "#1f2a37",
  padding: "6px 10px",
  fontSize: "13px",
  lineHeight: 1.2,
  cursor: "pointer"
};

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#1f2a37",
  color: "#ffffff"
};

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

function isCoarsePointerDevice(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia("(pointer: coarse)").matches;
}

export default function ImageCropper(
  props: ImageCropperContainerProps
): ReactElement {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const initializedForKeyRef = useRef<string>("");

  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [naturalBounds, setNaturalBounds] = useState<Bounds | null>(null);
  const [crop, setCrop] = useState<PixelCrop>();
  const [isCoarsePointer, setIsCoarsePointer] = useState(isCoarsePointerDevice);

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

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updatePointerMode = () => {
      setIsCoarsePointer(mediaQuery.matches);
    };

    updatePointerMode();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePointerMode);
      return () => {
        mediaQuery.removeEventListener("change", updatePointerMode);
      };
    }

    mediaQuery.addListener(updatePointerMode);
    return () => {
      mediaQuery.removeListener(updatePointerMode);
    };
  }, []);

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

  const dynamicActionBarStyle = useMemo<CSSProperties>(
    () => ({
      ...actionBarStyle,
      width: "100%",
      gap: isCoarsePointer ? "10px" : actionBarStyle.gap
    }),
    [isCoarsePointer]
  );

  const dynamicPrimaryButtonStyle = useMemo<CSSProperties>(
    () => ({
      ...primaryButtonStyle,
      minHeight: isCoarsePointer ? "42px" : undefined,
      padding: isCoarsePointer ? "10px 14px" : primaryButtonStyle.padding
    }),
    [isCoarsePointer]
  );

  const noImage = props.image.status === "available" && !imageUri;
  const canRunApplyAction =
    !!props.onApplyAction?.canExecute &&
    !!crop &&
    !!bounds &&
    !!naturalBounds &&
    props.image.status === "available" &&
    !!imageUri;

  const applySelection = useCallback(() => {
    if (!canRunApplyAction) {
      return;
    }

    props.onApplyAction?.execute();
  }, [canRunApplyAction, props.onApplyAction]);

  return (
    <div className="image-cropper" tabIndex={props.tabIndex}>
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
            ruleOfThirds
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
          <div style={dynamicActionBarStyle}>
            {props.onApplyAction ? (
              <button
                type="button"
                style={
                  canRunApplyAction
                    ? dynamicPrimaryButtonStyle
                    : {
                        ...dynamicPrimaryButtonStyle,
                        opacity: 0.55,
                        cursor: "not-allowed"
                      }
                }
                onClick={applySelection}
                disabled={!canRunApplyAction}
              >
                Apply selection
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
