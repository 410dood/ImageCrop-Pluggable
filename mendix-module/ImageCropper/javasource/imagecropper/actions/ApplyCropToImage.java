// Create a Mendix Java action with this same package and class name, then replace
// the generated file contents with this implementation.

package imagecropper.actions;

import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.systemwideinterfaces.core.IMendixObject;
import com.mendix.webui.CustomJavaAction;

import imagecropper.implementation.ImageCropSupport;

import java.math.BigDecimal;

public class ApplyCropToImage extends CustomJavaAction<Boolean> {
    private final IMendixObject imageDocument;
    private final Long cropX1;
    private final Long cropY1;
    private final Long cropX2;
    private final Long cropY2;
    private final Long cropWidth;
    private final Long cropHeight;
    private final Long outputWidth;
    private final Long outputHeight;
    private final Long thumbnailWidth;
    private final Long thumbnailHeight;
    private final BigDecimal jpegCompressionQuality;

    public ApplyCropToImage(
        IContext context,
        IMendixObject imageDocument,
        Long cropX1,
        Long cropY1,
        Long cropX2,
        Long cropY2,
        Long cropWidth,
        Long cropHeight,
        Long outputWidth,
        Long outputHeight,
        Long thumbnailWidth,
        Long thumbnailHeight,
        BigDecimal jpegCompressionQuality
    ) {
        super(context);
        this.imageDocument = imageDocument;
        this.cropX1 = cropX1;
        this.cropY1 = cropY1;
        this.cropX2 = cropX2;
        this.cropY2 = cropY2;
        this.cropWidth = cropWidth;
        this.cropHeight = cropHeight;
        this.outputWidth = outputWidth;
        this.outputHeight = outputHeight;
        this.thumbnailWidth = thumbnailWidth;
        this.thumbnailHeight = thumbnailHeight;
        this.jpegCompressionQuality = jpegCompressionQuality;
    }

    @Override
    public Boolean executeAction() throws Exception {
        if (imageDocument == null) {
            return false;
        }

        int safeCropX1 = toInt(cropX1);
        int safeCropY1 = toInt(cropY1);
        int safeCropWidth = toInt(cropWidth);
        int safeCropHeight = toInt(cropHeight);
        int safeCropX2 = cropX2 != null ? toInt(cropX2) : safeCropX1 + safeCropWidth;
        int safeCropY2 = cropY2 != null ? toInt(cropY2) : safeCropY1 + safeCropHeight;

        if (safeCropWidth > 0 && cropX2 == null) {
            safeCropX2 = safeCropX1 + safeCropWidth;
        }
        if (safeCropHeight > 0 && cropY2 == null) {
            safeCropY2 = safeCropY1 + safeCropHeight;
        }

        return ImageCropSupport.cropIntoSameDocument(
            getContext(),
            imageDocument,
            safeCropX1,
            safeCropY1,
            safeCropX2,
            safeCropY2,
            toInt(outputWidth),
            toInt(outputHeight),
            toInt(thumbnailWidth),
            toInt(thumbnailHeight),
            jpegCompressionQuality != null ? jpegCompressionQuality.floatValue() : 0.92f
        );
    }

    @Override
    public String toString() {
        return "ApplyCropToImage";
    }

    private static int toInt(Long value) {
        return value == null ? 0 : value.intValue();
    }
}
