package com.leagueos.modules.registration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.leagueos.shared.domain.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("IneExtractionService — Mocked Gemini OCR & Face Cropping Suite")
class IneExtractionServiceTest {

    @Mock private RestClient restClient;
    @Mock private RestClient.RequestBodyUriSpec requestBodyUriSpec;
    @Mock private RestClient.RequestBodySpec requestBodySpec;
    @Mock private RestClient.ResponseSpec responseSpec;

    private IneExtractionService ineExtractionService;
    private ObjectMapper objectMapper;
    private byte[] sampleImageBytes;

    @BeforeEach
    void setUp() throws IOException {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        ineExtractionService = new IneExtractionService("TEST_API_KEY", "gemini-3.6-flash", objectMapper);
        ReflectionTestUtils.setField(ineExtractionService, "restClient", restClient);

        // Generate synthetic in-memory JPEG test image
        BufferedImage img = new BufferedImage(120, 120, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, 120, 120);
        g.setColor(Color.RED);
        g.fillOval(20, 20, 40, 50); // Simulated face area
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpeg", baos);
        sampleImageBytes = baos.toByteArray();
    }

    private void mockGeminiResponse(String geminiJsonPayload) {
        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
        when(requestBodySpec.contentType(any(MediaType.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.body(any(Object.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(byte[].class)).thenReturn(geminiJsonPayload.getBytes(StandardCharsets.UTF_8));
    }

    private String buildGeminiCandidateJson(String jsonText) {
        return """
        {
          "candidates": [
            {
              "content": {
                "parts": [
                  {
                    "text": "%s"
                  }
                ]
              }
            }
          ]
        }
        """.formatted(jsonText.replace("\"", "\\\"").replace("\n", "\\n"));
    }

    // =========================================================================
    // extractDataFromIne — Success Cases
    // =========================================================================

    @Nested
    @DisplayName("extractDataFromIne — Successful Extractions")
    class SuccessExtractions {

        @Test
        @DisplayName("should extract INE data and crop upright face when orientation is NORMAL")
        void extractsDataAndCropsFaceNormal() {
            String ocrJson = """
            {
              "nombre": "CARLOS",
              "apellido_paterno": "GONZÁLEZ",
              "apellido_materno": "PÉREZ",
              "curp": "PERO840112HDFRRB06",
              "clave_elector": "GZPRCL88031509H100",
              "sexo": "H",
              "fecha_nacimiento": "1984-01-12",
              "ine_rotation": "NORMAL",
              "face_box": { "x": 0.1, "y": 0.1, "w": 0.3, "h": 0.3 }
            }
            """;

            mockGeminiResponse(buildGeminiCandidateJson(ocrJson));

            IneExtractionResult result = ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), "image/jpeg");

            assertThat(result).isNotNull();
            assertThat(result.getNombre()).isEqualTo("CARLOS");
            assertThat(result.getApellidoPaterno()).isEqualTo("GONZÁLEZ");
            assertThat(result.getApellidoMaterno()).isEqualTo("PÉREZ");
            assertThat(result.getCurp()).isEqualTo("PERO840112HDFRRB06");
            assertThat(result.getFechaNacimiento()).isEqualTo(LocalDate.of(1984, 1, 12));
            assertThat(result.getCroppedFaceBytes()).isNotNull();
        }

        @Test
        @DisplayName("should rotate image and transform face_box for ROTATED_90_CW")
        void handlesRotation90CW() {
            String ocrJson = """
            {
              "nombre": "MARÍA",
              "apellido_paterno": "LÓPEZ",
              "curp": "PERO840112HDFRRB06",
              "sexo": "M",
              "fecha_nacimiento": "1984-01-12",
              "ine_rotation": "ROTATED_90_CW",
              "face_box": { "x": 0.2, "y": 0.2, "w": 0.4, "h": 0.4 }
            }
            """;

            mockGeminiResponse(buildGeminiCandidateJson(ocrJson));

            IneExtractionResult result = ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), "image/jpeg");

            assertThat(result).isNotNull();
            assertThat(result.getCroppedFaceBytes()).isNotNull();
        }

        @Test
        @DisplayName("should rotate image and transform face_box for ROTATED_90_CCW and UPSIDE_DOWN")
        void handlesRotations90CCWAndUpsideDown() {
            String ocrJson1 = """
            {
              "nombre": "JUAN",
              "curp": "PERO840112HDFRRB06",
              "ine_rotation": "ROTATED_90_CCW",
              "face_box": { "x": 0.1, "y": 0.1, "w": 0.3, "h": 0.3 }
            }
            """;

            mockGeminiResponse(buildGeminiCandidateJson(ocrJson1));
            IneExtractionResult r1 = ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), null);
            assertThat(r1.getCroppedFaceBytes()).isNotNull();

            String ocrJson2 = """
            {
              "nombre": "JUAN",
              "curp": "PERO840112HDFRRB06",
              "ine_rotation": "UPSIDE_DOWN",
              "face_box": { "x": 0.1, "y": 0.1, "w": 0.3, "h": 0.3 }
            }
            """;

            mockGeminiResponse(buildGeminiCandidateJson(ocrJson2));
            IneExtractionResult r2 = ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), "image/png");
            assertThat(r2.getCroppedFaceBytes()).isNotNull();
        }
    }

    // =========================================================================
    // extractDataFromIne — CURP Sanitization & Swapping
    // =========================================================================

    @Nested
    @DisplayName("extractDataFromIne — CURP Sanitization")
    class CurpSanitizationTests {

        @Test
        @DisplayName("should auto-correct noisy CURP OCR using cleanAndRepair")
        void autoCorrectsCurpWithMetadata() {
            // Noisy CURP with letter 'O' instead of digit '0' in birth year
            String ocrJson = """
            {
              "nombre": "ORIBE",
              "apellido_paterno": "PERALTA",
              "curp": "PERO84O112HDFRRB01",
              "sexo": "H",
              "fecha_nacimiento": "1984-01-12",
              "ine_rotation": "NORMAL"
            }
            """;

            mockGeminiResponse(buildGeminiCandidateJson(ocrJson));

            IneExtractionResult result = ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), "image/jpeg");

            assertThat(result.getCurp()).isEqualTo("PERO840112HDFRRB06");
        }

        @Test
        @DisplayName("should detect and swap CURP when placed in clave_elector field")
        void detectsSwappedCurpInClaveElector() {
            String ocrJson = """
            {
              "nombre": "JAVIER",
              "apellido_paterno": "HERNÁNDEZ",
              "curp": "GZPRCL88031509H100",
              "clave_elector": "PERO840112HDFRRB06",
              "fecha_nacimiento": "1988-06-01"
            }
            """;

            mockGeminiResponse(buildGeminiCandidateJson(ocrJson));

            IneExtractionResult result = ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), "image/jpeg");

            assertThat(result.getCurp()).isEqualTo("PERO840112HDFRRB06");
        }
    }

    // =========================================================================
    // Error Handling & Retries
    // =========================================================================

    @Nested
    @DisplayName("Error Handling and Model Fallbacks")
    class ErrorHandling {

        @Test
        @DisplayName("should fallback to secondary model when primary model throws exception")
        void fallbacksToSecondaryModel() {
            String ocrJson = """
            {
              "nombre": "CARLOS",
              "curp": "PERO840112HDFRRB01"
            }
            """;

            when(restClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.contentType(any(MediaType.class))).thenReturn(requestBodySpec);
            when(requestBodySpec.body(any(Object.class))).thenReturn(requestBodySpec);
            when(requestBodySpec.retrieve()).thenReturn(responseSpec);

            // First call fails, second call succeeds
            when(responseSpec.body(byte[].class))
                    .thenThrow(new RuntimeException("503 Service Unavailable"))
                    .thenReturn(buildGeminiCandidateJson(ocrJson).getBytes(StandardCharsets.UTF_8));

            IneExtractionResult result = ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), "image/jpeg");

            assertThat(result).isNotNull();
            assertThat(result.getNombre()).isEqualTo("CARLOS");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when all Gemini models fail")
        void throwsWhenAllModelsFail() {
            when(restClient.post()).thenReturn(requestBodyUriSpec);
            when(requestBodyUriSpec.uri(anyString())).thenReturn(requestBodySpec);
            when(requestBodySpec.contentType(any(MediaType.class))).thenReturn(requestBodySpec);
            when(requestBodySpec.body(any(Object.class))).thenReturn(requestBodySpec);
            when(requestBodySpec.retrieve()).thenReturn(responseSpec);
            when(responseSpec.body(byte[].class)).thenThrow(new RuntimeException("All models exhausted"));

            assertThatThrownBy(() -> ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), "image/jpeg"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El servicio de IA de Google está saturado");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when candidates array is empty")
        void throwsWhenNoCandidates() {
            String emptyCandidatesJson = "{\"candidates\": []}";
            mockGeminiResponse(emptyCandidatesJson);

            assertThatThrownBy(() -> ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), "image/jpeg"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("No se pudo extraer información del INE.");
        }

        @Test
        @DisplayName("should throw BusinessRuleException when CURP cannot be validated or repaired")
        void throwsWhenCurpCannotBeRepaired() {
            String ocrJson = """
            {
              "nombre": "TEST",
              "curp": "TOTALLY_INVALID_CURP"
            }
            """;

            mockGeminiResponse(buildGeminiCandidateJson(ocrJson));

            assertThatThrownBy(() -> ineExtractionService.extractDataFromIne(sampleImageBytes.clone(), "image/jpeg"))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("El CURP extraído");
        }
    }
}
