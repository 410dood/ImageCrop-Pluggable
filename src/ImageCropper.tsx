import { Big } from "big.js";
import {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { EditableValue, WebImage } from "mendix";
import { ImageCropperContainerProps } from "../typings/ImageCropperProps";

type CornerHandle = "nw" | "ne" | "se" | "sw";

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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

type Interaction =
  | {
      mode: "draw";
      anchor: Point;
    }
  | {
      mode: "move";
      startPointer: Point;
      startRect: Rect;
    }
  | {
      mode: "resize";
      anchor: Point;
      dirX: -1 | 1;
      dirY: -1 | 1;
    };

const HANDLE_DIRECTION: Record<CornerHandle, { dirX: -1 | 1; dirY: -1 | 1 }> = {
  nw: { dirX: -1, dirY: -1 },
  ne: { dirX: 1, dirY: -1 },
  se: { dirX: 1, dirY: 1 },
  sw: { dirX: -1, dirY: 1 }
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundRect(rect: Rect): Rect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    w: Math.round(rect.w),
    h: Math.round(rect.h)
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
  if (!image) {
    return undefined;
  }
  return image.uri;
}

function readBig(value: Big | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const numberValue = Number(value.toString());
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function rectToSourceRect(
  rect: Rect,
  displayBounds: Bounds,
  naturalBounds: Bounds
): SourceRect {
  const scaleX = naturalBounds.w / displayBounds.w;
  const scaleY = naturalBounds.h / displayBounds.h;

  const x1 = Math.round(rect.x * scaleX);
  const y1 = Math.round(rect.y * scaleY);
  const x2 = Math.round((rect.x + rect.w) * scaleX);
  const y2 = Math.round((rect.y + rect.h) * scaleY);

  return {
    x1,
    y1,
    x2,
    y2,
    w: Math.max(1, x2 - x1),
    h: Math.max(1, y2 - y1)
  };
}

function sourceRectToDisplayRect(
  sourceRect: SourceRect,
  displayBounds: Bounds,
  naturalBounds: Bounds
): Rect {
  const scaleX = displayBounds.w / naturalBounds.w;
  const scaleY = displayBounds.h / naturalBounds.h;

  const x = sourceRect.x1 * scaleX;
  const y = sourceRect.y1 * scaleY;
  const w = Math.max(1, sourceRect.w * scaleX);
  const h = Math.max(1, sourceRect.h * scaleY);

  return roundRect({
    x: clamp(x, 0, displayBounds.w - w),
    y: clamp(y, 0, displayBounds.h - h),
    w: Math.min(w, displayBounds.w),
    h: Math.min(h, displayBounds.h)
  });
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
    resolvedY2 === undefined
  ) {
    return null;
  }

  if (resolvedW <= 0 || resolvedH <= 0) {
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

function createRectFromAnchor(
  anchor: Point,
  pointer: Point,
  direction: { dirX: -1 | 1; dirY: -1 | 1 },
  bounds: Bounds,
  aspectRatio: number
): Rect {
  const maxW = direction.dirX > 0 ? bounds.w - anchor.x : anchor.x;
  const maxH = direction.dirY > 0 ? bounds.h - anchor.y : anchor.y;

  let w = direction.dirX > 0 ? pointer.x - anchor.x : anchor.x - pointer.x;
  let h = direction.dirY > 0 ? pointer.y - anchor.y : anchor.y - pointer.y;
  w = clamp(w, 1, maxW);
  h = clamp(h, 1, maxH);

  if (aspectRatio > 0) {
    const progressX = w / Math.max(1, maxW);
    const progressY = h / Math.max(1, maxH);
    if (progressX >= progressY) {
      h = w / aspectRatio;
    } else {
      w = h * aspectRatio;
    }

    if (w > maxW) {
      w = maxW;
      h = w / aspectRatio;
    }
    if (h > maxH) {
      h = maxH;
      w = h * aspectRatio;
    }
    w = Math.max(1, w);
    h = Math.max(1, h);
  }

  const x = direction.dirX > 0 ? anchor.x : anchor.x - w;
  const y = direction.dirY > 0 ? anchor.y : anchor.y - h;

  return roundRect({
    x: clamp(x, 0, bounds.w - w),
    y: clamp(y, 0, bounds.h - h),
    w,
    h
  });
}

function createInitialRect(
  bounds: Bounds,
  startWidth: number,
  startHeight: number,
  aspectRatio: number
): Rect {
  let w = clamp(startWidth || 100, 1, bounds.w);
  let h = clamp(startHeight || 100, 1, bounds.h);

  if (aspectRatio > 0) {
    h = w / aspectRatio;
    if (h > bounds.h) {
      h = bounds.h;
      w = h * aspectRatio;
    }
  }

  return roundRect({ x: 0, y: 0, w, h });
}

export default function ImageCropper(
  props: ImageCropperContainerProps
): ReactElement {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const rectRef = useRef<Rect | null>(null);
  const initializedForKeyRef = useRef<string>("");

  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [naturalBounds, setNaturalBounds] = useState<Bounds | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

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
    const next = { w: image.clientWidth, h: image.clientHeight };
    if (next.w > 0 && next.h > 0) {
      setBounds((current) =>
        current && current.w === next.w && current.h === next.h ? current : next
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

  const toLocalPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      const currentBounds = bounds;
      if (!canvas || !currentBounds) {
        return null;
      }
      const box = canvas.getBoundingClientRect();
      return {
        x: clamp(clientX - box.left, 0, currentBounds.w),
        y: clamp(clientY - box.top, 0, currentBounds.h)
      };
    },
    [bounds]
  );

  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  useEffect(() => {
    if (!imageUri) {
      initializedForKeyRef.current = "";
      setRect(null);
      setBounds(null);
      setNaturalBounds(null);
      return;
    }
  }, [imageUri]);

  useEffect(() => {
    if (!bounds || !naturalBounds || !imageUri) {
      setRect(null);
      return;
    }
    const initializationKey = `${imageUri}:${bounds.w}x${bounds.h}:${naturalBounds.w}x${naturalBounds.h}`;
    if (initializedForKeyRef.current === initializationKey) {
      return;
    }
    initializedForKeyRef.current = initializationKey;

    const sourceRect = readSourceRectFromAttributes(props, naturalBounds);
    if (sourceRect) {
      setRect(sourceRectToDisplayRect(sourceRect, bounds, naturalBounds));
      return;
    }

    setRect(
      createInitialRect(
        bounds,
        props.startwidth,
        props.startheight,
        aspectRatio
      )
    );
  }, [
    aspectRatio,
    bounds,
    imageUri,
    naturalBounds,
    props,
    props.startheight,
    props.startwidth
  ]);

  useEffect(() => {
    if (!rect || !bounds || !naturalBounds) {
      return;
    }
    const sourceRect = rectToSourceRect(rect, bounds, naturalBounds);
    setInteger(props.crop_x1, sourceRect.x1);
    setInteger(props.crop_y1, sourceRect.y1);
    setInteger(props.crop_x2, sourceRect.x2);
    setInteger(props.crop_y2, sourceRect.y2);
    setInteger(props.crop_width, sourceRect.w);
    setInteger(props.crop_height, sourceRect.h);
  }, [
    bounds,
    naturalBounds,
    props.crop_x1,
    props.crop_y1,
    props.crop_x2,
    props.crop_y2,
    props.crop_width,
    props.crop_height,
    rect
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

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      const currentBounds = bounds;
      if (!interaction || !currentBounds) {
        return;
      }
      const point = toLocalPoint(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      if (interaction.mode === "draw") {
        const direction = {
          dirX: point.x >= interaction.anchor.x ? (1 as const) : (-1 as const),
          dirY: point.y >= interaction.anchor.y ? (1 as const) : (-1 as const)
        };
        setRect(
          createRectFromAnchor(
            interaction.anchor,
            point,
            direction,
            currentBounds,
            aspectRatio
          )
        );
        return;
      }

      if (interaction.mode === "move") {
        const dx = point.x - interaction.startPointer.x;
        const dy = point.y - interaction.startPointer.y;
        setRect(
          roundRect({
            x: clamp(
              interaction.startRect.x + dx,
              0,
              currentBounds.w - interaction.startRect.w
            ),
            y: clamp(
              interaction.startRect.y + dy,
              0,
              currentBounds.h - interaction.startRect.h
            ),
            w: interaction.startRect.w,
            h: interaction.startRect.h
          })
        );
        return;
      }

      setRect(
        createRectFromAnchor(
          interaction.anchor,
          point,
          { dirX: interaction.dirX, dirY: interaction.dirY },
          currentBounds,
          aspectRatio
        )
      );
    };

    const handlePointerUp = () => {
      interactionRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [aspectRatio, bounds, toLocalPoint]);

  const beginDraw = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!bounds) {
        return;
      }
      const point = toLocalPoint(event.clientX, event.clientY);
      if (!point) {
        return;
      }
      interactionRef.current = { mode: "draw", anchor: point };
      setRect(
        createRectFromAnchor(
          point,
          point,
          { dirX: 1, dirY: 1 },
          bounds,
          aspectRatio
        )
      );
      event.preventDefault();
    },
    [aspectRatio, bounds, toLocalPoint]
  );

  const beginMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const point = toLocalPoint(event.clientX, event.clientY);
      const currentRect = rectRef.current;
      if (!point || !currentRect) {
        return;
      }
      interactionRef.current = {
        mode: "move",
        startPointer: point,
        startRect: currentRect
      };
      event.preventDefault();
      event.stopPropagation();
    },
    [toLocalPoint]
  );

  const beginResize = useCallback(
    (handle: CornerHandle, event: React.PointerEvent<HTMLButtonElement>) => {
      const currentRect = rectRef.current;
      if (!currentRect) {
        return;
      }
      const direction = HANDLE_DIRECTION[handle];

      const anchor: Point = {
        x: direction.dirX > 0 ? currentRect.x : currentRect.x + currentRect.w,
        y: direction.dirY > 0 ? currentRect.y : currentRect.y + currentRect.h
      };

      interactionRef.current = {
        mode: "resize",
        anchor,
        dirX: direction.dirX,
        dirY: direction.dirY
      };
      event.preventDefault();
      event.stopPropagation();
    },
    []
  );

  const imageStyle = useMemo(
    () => ({
      maxWidth: props.cropwidth > 0 ? `${props.cropwidth}px` : "none",
      maxHeight: props.cropheight > 0 ? `${props.cropheight}px` : "none"
    }),
    [props.cropheight, props.cropwidth]
  );

  const className = "image-cropper";
  const noImage = props.image.status === "available" && !imageUri;

  return (
    <div className={className} tabIndex={props.tabIndex}>
      {props.image.status === "loading" ? (
        <div className="image-cropper__message">Loading image...</div>
      ) : null}
      {props.image.status === "unavailable" ? (
        <div className="image-cropper__message">Image is unavailable.</div>
      ) : null}
      {noImage ? (
        <div className="image-cropper__message">No image to display.</div>
      ) : null}

      {imageUri ? (
        <div
          className="image-cropper__canvas"
          ref={canvasRef}
          onPointerDown={beginDraw}
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
          {rect && bounds ? (
            <>
              <div
                className="image-cropper__shade"
                style={{ left: 0, top: 0, width: "100%", height: rect.y }}
              />
              <div
                className="image-cropper__shade"
                style={{ left: 0, top: rect.y, width: rect.x, height: rect.h }}
              />
              <div
                className="image-cropper__shade"
                style={{
                  left: rect.x + rect.w,
                  top: rect.y,
                  width: bounds.w - rect.x - rect.w,
                  height: rect.h
                }}
              />
              <div
                className="image-cropper__shade"
                style={{
                  left: 0,
                  top: rect.y + rect.h,
                  width: "100%",
                  height: bounds.h - rect.y - rect.h
                }}
              />

              <div
                className="image-cropper__selection"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.w,
                  height: rect.h
                }}
                onPointerDown={beginMove}
              >
                <button
                  type="button"
                  className="image-cropper__handle image-cropper__handle--nw"
                  onPointerDown={(event) => beginResize("nw", event)}
                  aria-label="Resize north-west"
                />
                <button
                  type="button"
                  className="image-cropper__handle image-cropper__handle--ne"
                  onPointerDown={(event) => beginResize("ne", event)}
                  aria-label="Resize north-east"
                />
                <button
                  type="button"
                  className="image-cropper__handle image-cropper__handle--se"
                  onPointerDown={(event) => beginResize("se", event)}
                  aria-label="Resize south-east"
                />
                <button
                  type="button"
                  className="image-cropper__handle image-cropper__handle--sw"
                  onPointerDown={(event) => beginResize("sw", event)}
                  aria-label="Resize south-west"
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
