/**
 * This file was generated from ImageCropper.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { ActionValue, DynamicValue, EditableValue, WebImage } from "mendix";
import { Big } from "big.js";

export interface ImageCropperContainerProps {
    name: string;
    tabIndex?: number;
    id: string;
    image: DynamicValue<WebImage>;
    aspectRatio?: EditableValue<string>;
    startwidth: number;
    startheight: number;
    cropwidth: number;
    cropheight: number;
    crop_x1: EditableValue<Big>;
    crop_y1: EditableValue<Big>;
    crop_x2: EditableValue<Big>;
    crop_y2: EditableValue<Big>;
    crop_width: EditableValue<Big>;
    crop_height: EditableValue<Big>;
    onApplyAction?: ActionValue;
}

export interface ImageCropperPreviewProps {
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    image: { type: "static"; imageUrl: string; } | { type: "dynamic"; entity: string; } | null;
    aspectRatio: string;
    startwidth: number | null;
    startheight: number | null;
    cropwidth: number | null;
    cropheight: number | null;
    crop_x1: string;
    crop_y1: string;
    crop_x2: string;
    crop_y2: string;
    crop_width: string;
    crop_height: string;
    onApplyAction: {} | null;
}
