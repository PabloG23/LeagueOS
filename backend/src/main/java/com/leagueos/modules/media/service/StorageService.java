package com.leagueos.modules.media.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.net.URI;
import java.time.Duration;

@Service
public class StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;
    private final String environment;

    public StorageService(
            @Value("${cloudflare.r2.access-key}") String accessKey,
            @Value("${cloudflare.r2.secret-key}") String secretKey,
            @Value("${cloudflare.r2.endpoint}") String endpoint,
            @Value("${cloudflare.r2.bucket}") String bucketName,
            @Value("${app.environment:dev}") String environment) {

        this.bucketName = bucketName;
        this.environment = (environment != null && !environment.isBlank()) ? environment.trim().toLowerCase() : "dev";

        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        software.amazon.awssdk.services.s3.S3Configuration s3Config = software.amazon.awssdk.services.s3.S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build();

        this.s3Client = S3Client.builder()
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.US_EAST_1) // R2 uses us-east-1 as default for S3 compat
                .endpointOverride(URI.create(endpoint))
                .serviceConfiguration(s3Config)
                .build();

        this.s3Presigner = S3Presigner.builder()
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.US_EAST_1)
                .endpointOverride(URI.create(endpoint))
                .serviceConfiguration(s3Config)
                .build();
    }

    public String buildTenantKey(java.util.UUID tenantId, String module, String filename) {
        return environment + "/tenants/" + tenantId + "/" + module + "/" + filename;
    }

    public String buildPlayerKey(java.util.UUID tenantId, String teamName, String playerName, String extension) {
        String teamSlug = toSlug(teamName);
        String playerSlug = toSlug(playerName);
        String shortId = java.util.UUID.randomUUID().toString().substring(0, 8);
        String ext = (extension != null && extension.startsWith(".")) ? extension : (extension != null && !extension.isBlank() ? "." + extension : ".jpg");
        return environment + "/tenants/" + tenantId + "/players/team/" + teamSlug + "/" + playerSlug + "_" + shortId + ext;
    }

    public static String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "asset";
        }
        String nowhitespace = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        String normalized = nowhitespace.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String slug = normalized.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return slug.isEmpty() ? "asset" : slug;
    }

    public String getEnvironment() {
        return this.environment;
    }

    public String uploadFile(String key, byte[] bytes, String contentType) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(bytes));
        return key;
    }

    public String getSignedUrl(String key, int durationMinutes) {
        if (key == null || key.isEmpty()) {
            return null;
        }

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(durationMinutes))
                .getObjectRequest(b -> b.bucket(bucketName).key(key))
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    public byte[] getFileBytes(String key) {
        if (key == null || key.isEmpty()) return null;
        try {
            return s3Client.getObject(software.amazon.awssdk.services.s3.model.GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build()).readAllBytes();
        } catch (Exception e) {
            return null;
        }
    }

    public void deleteFile(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        try {
            s3Client.deleteObject(software.amazon.awssdk.services.s3.model.DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
        } catch (Exception ignored) {
            // Fail silently to avoid breaking business operations if object does not exist
        }
    }
}
