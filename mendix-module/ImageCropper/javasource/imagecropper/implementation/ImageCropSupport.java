package imagecropper.implementation;

import com.mendix.core.Core;
import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.systemwideinterfaces.core.IMendixObject;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;

public final class ImageCropSupport {
    private ImageCropSupport() {
    }

    public static boolean cropIntoSameDocument(
        IContext context,
        IMendixObject imageDocument,
        int cropX1,
        int cropY1,
        int cropX2,
        int cropY2,
        int outputWidth,
        int outputHeight,
        int thumbnailWidth,
        int thumbnailHeight,
        float jpegCompressionQuality
    ) throws IOException {
        if (context == null || imageDocument == null) {
            return false;
        }

        BufferedImage originalImage;
        try (InputStream stream = Core.getImage(context, imageDocument, false)) {
            originalImage = ImageIO.read(stream);
        }

        if (originalImage == null) {
            throw new IOException("Image content could not be read.");
        }

        int imageWidth = originalImage.getWidth();
        int imageHeight = originalImage.getHeight();

        int safeX1 = clamp(cropX1, 0, imageWidth);
        int safeY1 = clamp(cropY1, 0, imageHeight);
        int safeX2 = clamp(cropX2, 0, imageWidth);
        int safeY2 = clamp(cropY2, 0, imageHeight);

        if (safeX2 <= safeX1 || safeY2 <= safeY1) {
            throw new IOException("Crop coordinates are invalid.");
        }

        int cropWidth = safeX2 - safeX1;
        int cropHeight = safeY2 - safeY1;

        int targetWidth = resolveOutputWidth(outputWidth, outputHeight, cropWidth, cropHeight);
        int targetHeight = resolveOutputHeight(outputWidth, outputHeight, cropWidth, cropHeight);

        String formatName = detectFormat(context, imageDocument);
        boolean isJpeg = isJpegFormat(formatName);
        int bufferedImageType = isJpeg
            ? BufferedImage.TYPE_INT_RGB
            : originalImage.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;

        BufferedImage croppedImage = new BufferedImage(targetWidth, targetHeight, bufferedImageType);
        Graphics2D graphics = croppedImage.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.drawImage(
                originalImage,
                0,
                0,
                targetWidth,
                targetHeight,
                safeX1,
                safeY1,
                safeX2,
                safeY2,
                null
            );
        } finally {
            graphics.dispose();
        }

        byte[] bytes = writeImageBytes(croppedImage, formatName, jpegCompressionQuality);
        try (InputStream storedStream = new ByteArrayInputStream(bytes)) {
            Core.storeImageDocumentContent(
                context,
                imageDocument,
                storedStream,
                Math.max(0, thumbnailWidth),
                Math.max(0, thumbnailHeight)
            );
        }

        return true;
    }

    private static int resolveOutputWidth(int outputWidth, int outputHeight, int cropWidth, int cropHeight) {
        if (outputWidth > 0) {
            return outputWidth;
        }
        if (outputHeight > 0) {
            return Math.max(1, Math.round((cropWidth / (float) cropHeight) * outputHeight));
        }
        return cropWidth;
    }

    private static int resolveOutputHeight(int outputWidth, int outputHeight, int cropWidth, int cropHeight) {
        if (outputHeight > 0) {
            return outputHeight;
        }
        if (outputWidth > 0) {
            return Math.max(1, Math.round((cropHeight / (float) cropWidth) * outputWidth));
        }
        return cropHeight;
    }

    private static byte[] writeImageBytes(BufferedImage image, String formatName, float jpegCompressionQuality)
        throws IOException {
        if (formatName == null || formatName.trim().isEmpty()) {
            throw new IOException("Image format could not be identified.");
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        if (isJpegFormat(formatName)) {
            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
            if (!writers.hasNext()) {
                throw new IOException("No JPEG writer is available.");
            }

            ImageWriter writer = writers.next();
            try {
                ImageWriteParam params = writer.getDefaultWriteParam();
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(clampQuality(jpegCompressionQuality));
                writer.setOutput(new MemoryCacheImageOutputStream(outputStream));
                writer.write(null, new IIOImage(image, null, null), params);
            } finally {
                writer.dispose();
            }
        } else {
            ImageIO.write(image, formatName, outputStream);
        }

        return outputStream.toByteArray();
    }

    private static String detectFormat(IContext context, IMendixObject imageDocument) throws IOException {
        try (InputStream stream = Core.getImage(context, imageDocument, false);
             ImageInputStream imageInputStream = ImageIO.createImageInputStream(stream)) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(imageInputStream);
            if (!readers.hasNext()) {
                return "jpeg";
            }

            ImageReader reader = readers.next();
            try {
                String formatName = reader.getFormatName();
                return formatName == null || formatName.trim().isEmpty() ? "jpeg" : formatName;
            } finally {
                reader.dispose();
            }
        }
    }

    private static boolean isJpegFormat(String formatName) {
        if (formatName == null) {
            return false;
        }

        String normalized = formatName.trim().toLowerCase();
        return "jpeg".equals(normalized) || "jpg".equals(normalized);
    }

    private static float clampQuality(float value) {
        if (value < 0f) {
            return 0f;
        }
        if (value > 1f) {
            return 1f;
        }
        return value;
    }

    private static int clamp(int value, int min, int max) {
        return Math.min(max, Math.max(min, value));
    }
}
