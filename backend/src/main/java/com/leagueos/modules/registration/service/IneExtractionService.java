package com.leagueos.modules.registration.service;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.leagueos.shared.domain.exception.BusinessRuleException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class IneExtractionService {

    private static final Logger log = LoggerFactory.getLogger(IneExtractionService.class);

    private final RestClient restClient;
    private final String apiKey;
    private final ObjectMapper objectMapper;

    private static final List<String> MODELS = List.of(
            "gemini-3-flash-preview",
            "gemini-flash-latest",
            "gemini-3.1-flash-lite-preview"
    );

    /**
     * We ask Gemini for:
     *  - The data fields
     *  - ine_rotation: how the INE TEXT is rotated in the image (reliable — text is easy for AI to read)
     *  - face_box: normalized coordinates in the ORIGINAL (pre-rotation) image
     *
     * Java then:
     *  1. Applies EXIF correction
     *  2. Rotates the whole image according to ine_rotation (so INE is upright)
     *  3. Transforms face_box coordinates to the rotated image space
     *  4. Crops the face — guaranteed upright
     */
    private static final String PROMPT =
            "Analiza esta imagen de una credencial de elector (INE/IFE) mexicana.\n" +
            "Extrae los datos con la máxima fidelidad y responde ÚNICAMENTE con el siguiente JSON estricto, sin explicaciones ni markdown:\n" +
            "{\n" +
            "  \"nombre\": \"nombre(s) del titular en mayúsculas\",\n" +
            "  \"apellido_paterno\": \"primer apellido en mayúsculas\",\n" +
            "  \"apellido_materno\": \"segundo apellido en mayúsculas\",\n" +
            "  \"curp\": \"CURP de exactamente 18 caracteres alfanuméricos en mayúsculas\",\n" +
            "  \"clave_elector\": \"clave de elector de 18 caracteres alfanuméricos\",\n" +
            "  \"sexo\": \"H o M\",\n" +
            "  \"fecha_nacimiento\": \"fecha en formato YYYY-MM-DD\",\n" +
            "  \"ine_rotation\": \"NORMAL\",\n" +
            "  \"face_box\": { \"x\": 0.1, \"y\": 0.1, \"w\": 0.2, \"h\": 0.2 }\n" +
            "}\n\n" +
            "Reglas críticas para CURP vs CLAVE DE ELECTOR:\n" +
            "- NO confundas la CLAVE DE ELECTOR con el CURP. Son dos códigos distintos en la credencial.\n" +
            "- El CURP siempre está explícitamente etiquetado como \"CURP\".\n" +
            "- La estructura del CURP es: 4 letras iniciales + 6 dígitos de fecha (AAMMDD igual a fecha_nacimiento) + 1 letra sexo (H/M) + 2 letras entidad federativa (ej. DF, MC, JC, NL, etc.) + 3 letras consonantes internas + 2 caracteres finales.\n" +
            "- Coteja que los dígitos 5 al 10 del CURP coincidan con el año, mes y día de fecha_nacimiento.\n\n" +
            "Reglas para ine_rotation (cómo está orientado el TEXTO del INE en esta imagen):\n" +
            "- \"NORMAL\": el texto del INE se lee normalmente de izquierda a derecha (situación más común).\n" +
            "- \"ROTATED_90_CW\": para leer el texto debes inclinar la cabeza hacia la DERECHA (el INE está girado 90° horario).\n" +
            "- \"UPSIDE_DOWN\": el texto del INE está completamente al revés (180°).\n" +
            "- \"ROTATED_90_CCW\": para leer el texto debes inclinar la cabeza hacia la IZQUIERDA (el INE está girado 90° anti-horario).\n\n" +
            "Reglas para face_box:\n" +
            "- Coordenadas normalizadas (0.0 a 1.0) en la imagen TAL COMO ESTÁ (sin corregir rotación).\n" +
            "- Delimita ÚNICAMENTE la foto del rostro: desde cabello hasta barbilla, de mejilla a mejilla.\n" +
            "- Sin márgenes extra, sin incluir texto/firmas/sellos.";

    public IneExtractionService(
            @Value("${gemini.api-key}") String apiKey,
            @Value("${gemini.model:gemini-3-flash-preview}") String model,
            ObjectMapper objectMapper) {
        this.restClient = RestClient.create();
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
    }

    public IneExtractionResult extractDataFromIne(byte[] imageBytes, String mimeType) {
        // Step 1: Apply EXIF orientation so the physical pixels are correct
        byte[] exifCorrectedBytes = applyExifOrientation(imageBytes);

        String base64Image = Base64.getEncoder().encodeToString(exifCorrectedBytes);
        String effectiveMime = (mimeType != null) ? mimeType : "image/jpeg";

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", PROMPT),
                                Map.of("inline_data", Map.of(
                                        "mime_type", effectiveMime,
                                        "data", base64Image
                                ))
                        ))
                )
        );

        String responseString = null;

        for (String currentModel : MODELS) {
            for (int attempt = 1; attempt <= 2; attempt++) {
                try {
                    String url = String.format(
                            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                            currentModel, apiKey);
                    log.info("Gemini OCR — model: {} attempt: {}", currentModel, attempt);

                    responseString = restClient.post()
                            .uri(url)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(requestBody)
                            .retrieve()
                            .body(String.class);

                    if (responseString != null && !responseString.isEmpty()) break;
                } catch (Exception e) {
                    log.warn("Gemini model {} attempt {} failed: {}", currentModel, attempt, e.getMessage());
                    try { Thread.sleep(600); } catch (InterruptedException ignored) {}
                }
            }
            if (responseString != null) break;
        }

        if (responseString == null) {
            throw new BusinessRuleException(
                    "El servicio de IA de Google está saturado temporalmente. Intenta de nuevo en unos segundos.");
        }

        try {
            Map<String, Object> responseMap = objectMapper.readValue(responseString, Map.class);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new BusinessRuleException("No se pudo extraer información del INE.");
            }

            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String jsonText = (String) parts.get(0).get("text");
            jsonText = jsonText.replaceAll("(?s)```json", "").replaceAll("```", "").trim();

            IneExtractionResult result = objectMapper.readValue(jsonText, IneExtractionResult.class);

            if (result.getCurp() != null && !result.getCurp().isBlank()) {
                String rawCurp = result.getCurp().trim().toUpperCase();
                
                // High precision processing & O(1) sanitization
                if (!CurpUtils.isValid(rawCurp)) {
                    String repaired = CurpUtils.cleanAndRepair(rawCurp, result.getFechaNacimiento(), result.getSexo());
                    if (CurpUtils.isValid(repaired)) {
                        log.info("Auto-corrected CURP OCR from '{}' to '{}'", rawCurp, repaired);
                        result.setCurp(repaired);
                    } else if (result.getClaveElector() != null && CurpUtils.isValid(CurpUtils.sanitizeOcr(result.getClaveElector()))) {
                        String swapped = CurpUtils.sanitizeOcr(result.getClaveElector());
                        log.info("Detected swapped CURP from Clave Elector field: '{}'", swapped);
                        result.setCurp(swapped);
                    } else {
                        validateCurp(repaired != null ? repaired : rawCurp);
                        result.setCurp(repaired);
                    }
                } else {
                    result.setCurp(rawCurp);
                }
            }

            // Step 2: Crop face with deterministic orientation correction
            if (result.getFaceBox() != null) {
                String ineRotation = result.getIneRotation() != null ? result.getIneRotation() : "NORMAL";
                log.info("INE rotation reported by Gemini: {}", ineRotation);
                result.setCroppedFaceBytes(cropFaceUpright(exifCorrectedBytes, result.getFaceBox(), ineRotation));
            }

            java.util.Arrays.fill(imageBytes, (byte) 0);
            java.util.Arrays.fill(exifCorrectedBytes, (byte) 0);

            return result;
        } catch (BusinessRuleException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessRuleException("Error al procesar la respuesta del INE: " + e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // EXIF correction — fixes camera-native rotation stored in JPEG metadata
    // -------------------------------------------------------------------------

    private byte[] applyExifOrientation(byte[] imageBytes) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(imageBytes));
            ExifIFD0Directory exifDir = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            int orientation = 1;
            if (exifDir != null && exifDir.containsTag(ExifIFD0Directory.TAG_ORIENTATION)) {
                orientation = exifDir.getInt(ExifIFD0Directory.TAG_ORIENTATION);
            }
            if (orientation == 1) return imageBytes;

            BufferedImage img = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (img == null) return imageBytes;

            BufferedImage fixed = transformByExifOrientation(img, orientation);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(fixed, "jpeg", baos);
            log.info("Applied EXIF orientation {} to image", orientation);
            return baos.toByteArray();
        } catch (Exception e) {
            log.warn("Could not read EXIF orientation, using image as-is: {}", e.getMessage());
            return imageBytes;
        }
    }

    private BufferedImage transformByExifOrientation(BufferedImage src, int orientation) {
        int w = src.getWidth();
        int h = src.getHeight();
        boolean swapDims = orientation >= 5;
        int outW = swapDims ? h : w;
        int outH = swapDims ? w : h;

        BufferedImage out = new BufferedImage(outW, outH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        switch (orientation) {
            case 2 -> { g.translate(outW, 0);  g.scale(-1, 1); }
            case 3 -> { g.translate(outW, outH); g.rotate(Math.PI); }
            case 4 -> { g.translate(0, outH);  g.scale(1, -1); }
            case 5 -> { g.rotate(-Math.PI / 2); g.scale(-1, 1); }
            case 6 -> { g.translate(outW, 0);  g.rotate(Math.PI / 2); }
            case 7 -> { g.translate(outW, outH); g.rotate(Math.PI / 2); g.scale(-1, 1); }
            case 8 -> { g.translate(0, outH);  g.rotate(-Math.PI / 2); }
        }
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return out;
    }

    // -------------------------------------------------------------------------
    // Upright face crop using INE text orientation to determine rotation angle
    // -------------------------------------------------------------------------

    /**
     * Strategy:
     *  1. Rotate the full EXIF-corrected image so the INE text is upright (NORMAL).
     *  2. Transform the face_box coordinates to the rotated image space.
     *  3. Crop the face — it will always be upright because the INE is upright.
     *  4. Frame as a square avatar.
     *
     * Using INE text orientation is far more reliable than face orientation because
     * Gemini reads text accurately regardless of angle.
     */
    private byte[] cropFaceUpright(byte[] imageBytes, IneExtractionResult.FaceBox origBox, String ineRotation) {
        try {
            BufferedImage img = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (img == null) return null;

            // How many degrees CW to rotate the image to make it NORMAL (text readable)
            int rotateDeg = switch (ineRotation) {
                case "ROTATED_90_CW"  -> 270; // undo 90°CW by rotating 270°CW (= 90°CCW)
                case "UPSIDE_DOWN"    -> 180;
                case "ROTATED_90_CCW" -> 90;  // undo 90°CCW by rotating 90°CW
                default               -> 0;   // NORMAL
            };

            BufferedImage uprightIne = (rotateDeg == 0) ? img : rotateImage(img, rotateDeg);

            // Transform the face_box from original image space to rotated image space
            IneExtractionResult.FaceBox rotatedBox = transformFaceBox(origBox, rotateDeg);

            // Crop face from the upright INE
            int iW = uprightIne.getWidth();
            int iH = uprightIne.getHeight();
            int x = (int) Math.max(0, rotatedBox.getX() * iW);
            int y = (int) Math.max(0, rotatedBox.getY() * iH);
            int w = (int) Math.min(iW - x, rotatedBox.getW() * iW);
            int h = (int) Math.min(iH - y, rotatedBox.getH() * iH);

            if (w <= 0 || h <= 0) return null;

            BufferedImage faceCrop = uprightIne.getSubimage(x, y, w, h);

            // Square avatar
            int maxDim = Math.max(faceCrop.getWidth(), faceCrop.getHeight());
            BufferedImage avatar = new BufferedImage(maxDim, maxDim, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = avatar.createGraphics();
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, maxDim, maxDim);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(faceCrop, (maxDim - faceCrop.getWidth()) / 2, (maxDim - faceCrop.getHeight()) / 2, null);
            g.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(avatar, "jpeg", baos);
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Failed to crop/orient face: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Rotates a BufferedImage by the given clockwise degrees (0, 90, 180, 270).
     */
    private BufferedImage rotateImage(BufferedImage src, int cwDegrees) {
        int w = src.getWidth();
        int h = src.getHeight();
        boolean swapDims = (cwDegrees == 90 || cwDegrees == 270);
        int outW = swapDims ? h : w;
        int outH = swapDims ? w : h;

        BufferedImage out = new BufferedImage(outW, outH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.translate(outW / 2.0, outH / 2.0);
        g.rotate(Math.toRadians(cwDegrees));
        g.drawImage(src, -w / 2, -h / 2, null);
        g.dispose();
        return out;
    }

    /**
     * Transforms normalized face_box coordinates from the original image space
     * to the rotated image space.
     *
     * For a box (x, y, w, h) normalized in a W×H image:
     *   - 90° CW:   new coords in H×W space: x'=1-y-h,  y'=x,     w'=h, h'=w
     *   - 180°:     new coords in W×H space: x'=1-x-w,  y'=1-y-h, w'=w, h'=h
     *   - 270° CW:  new coords in H×W space: x'=y,      y'=1-x-w, w'=h, h'=w
     */
    private IneExtractionResult.FaceBox transformFaceBox(IneExtractionResult.FaceBox orig, int cwDegrees) {
        double ox = orig.getX(), oy = orig.getY(), ow = orig.getW(), oh = orig.getH();
        IneExtractionResult.FaceBox box = new IneExtractionResult.FaceBox();
        switch (cwDegrees) {
            case 90 -> { box.setX(1 - oy - oh); box.setY(ox);       box.setW(oh); box.setH(ow); }
            case 180 -> { box.setX(1 - ox - ow); box.setY(1 - oy - oh); box.setW(ow); box.setH(oh); }
            case 270 -> { box.setX(oy);           box.setY(1 - ox - ow); box.setW(oh); box.setH(ow); }
            default  -> { box.setX(ox); box.setY(oy); box.setW(ow); box.setH(oh); } // 0°
        }
        return box;
    }

    private void validateCurp(String curp) {
        if (curp == null || curp.length() != 18) {
            throw new BusinessRuleException("El CURP extraído debe tener exactamente 18 caracteres.");
        }
        if (!CurpUtils.isValid(curp)) {
            throw new BusinessRuleException("El CURP extraído ('" + curp + "') no tiene un formato válido o su dígito verificador es incorrecto.");
        }
    }
}
