package com.leagueos.modules.registration.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.LocalDate;

@Data
public class IneExtractionResult {
    private String nombre;
    @JsonProperty("apellido_paterno")
    private String apellidoPaterno;
    @JsonProperty("apellido_materno")
    private String apellidoMaterno;
    private String curp;
    @JsonProperty("clave_elector")
    private String claveElector;
    private String sexo;
    @JsonProperty("fecha_nacimiento")
    private LocalDate fechaNacimiento;
    @JsonProperty("face_box")
    private FaceBox faceBox;
    /** How the INE text is oriented in the image: NORMAL | ROTATED_90_CW | UPSIDE_DOWN | ROTATED_90_CCW */
    @JsonProperty("ine_rotation")
    private String ineRotation = "NORMAL";
    /** Legacy – kept for backward compat, no longer used for rotation logic */
    @JsonProperty("rotation_degrees")
    private Integer rotationDegrees = 0;

    /** Transient field – holds the cropped face bytes once computed on the backend */
    private transient byte[] croppedFaceBytes;

    @Data
    public static class FaceBox {
        private double x;
        private double y;
        private double w;
        private double h;

        // Explicit setters needed for coordinate transformation in IneExtractionService
        public void setX(double x) { this.x = x; }
        public void setY(double y) { this.y = y; }
        public void setW(double w) { this.w = w; }
        public void setH(double h) { this.h = h; }
    }
}
