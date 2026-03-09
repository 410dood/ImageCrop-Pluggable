import { ReactElement } from "react";
import { ImageCropperPreviewProps } from "../typings/ImageCropperProps";

export function preview(_props: ImageCropperPreviewProps): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "180px",
        border: "1px solid #d6d8db",
        borderRadius: "4px",
        background:
          "linear-gradient(45deg, rgba(240,242,244,1) 25%, rgba(248,249,250,1) 25%, rgba(248,249,250,1) 50%, rgba(240,242,244,1) 50%, rgba(240,242,244,1) 75%, rgba(248,249,250,1) 75%, rgba(248,249,250,1) 100%)",
        backgroundSize: "24px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#5f6a77",
        fontSize: "13px",
        fontWeight: 600
      }}
    >
      Image Cropper
    </div>
  );
}

export function getPreviewCss(): string {
  return "";
}
