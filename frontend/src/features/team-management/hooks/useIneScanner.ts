import { useState, useCallback } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

export const useIneScanner = () => {
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionError, setDetectionError] = useState<string | null>(null);

    const detectFace = useCallback(async (imageElement: HTMLImageElement | HTMLCanvasElement): Promise<Blob | null> => {
        setIsDetecting(true);
        setDetectionError(null);

        try {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
            );

            const faceDetector = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
                    delegate: "CPU"
                },
                runningMode: "IMAGE"
            });

            const getDimensions = (img: HTMLImageElement | HTMLCanvasElement) => {
                return {
                    w: img instanceof HTMLImageElement ? img.naturalWidth : img.width,
                    h: img instanceof HTMLImageElement ? img.naturalHeight : img.height
                };
            };

            let detections = faceDetector.detect(imageElement).detections;
            let finalImageElement: HTMLImageElement | HTMLCanvasElement = imageElement;

            if (!detections || detections.length === 0) {
                // Try rotations
                const rotations = [90, 180, 270];
                const { w, h } = getDimensions(imageElement);

                for (const angle of rotations) {
                    const rotCanvas = document.createElement('canvas');
                    const ctx = rotCanvas.getContext('2d');
                    if (!ctx) continue;
                    
                    if (angle === 90 || angle === 270) {
                        rotCanvas.width = h;
                        rotCanvas.height = w;
                    } else {
                        rotCanvas.width = w;
                        rotCanvas.height = h;
                    }
                    
                    ctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
                    ctx.rotate((angle * Math.PI) / 180);
                    ctx.drawImage(imageElement, -w / 2, -h / 2, w, h);
                    
                    const newDetections = faceDetector.detect(rotCanvas).detections;
                    if (newDetections && newDetections.length > 0) {
                        detections = newDetections;
                        finalImageElement = rotCanvas;
                        break;
                    }
                }
            }

            if (!detections || detections.length === 0) {
                throw new Error("No se detectó ningún rostro en ninguna orientación.");
            }

            const face = detections[0];
            const boundingBox = face.boundingBox;

            if (!boundingBox) {
                throw new Error("No se pudo obtener las dimensiones del rostro.");
            }

            // Create canvas to crop
            const canvas = document.createElement('canvas');
            
            // Add padding to crop
            const padding = Math.max(boundingBox.width, boundingBox.height) * 0.2; // 20% padding
            const sx = Math.max(0, boundingBox.originX - padding);
            const sy = Math.max(0, boundingBox.originY - padding);
            
            const finalDims = getDimensions(finalImageElement);
            
            // Make crop square
            const size = Math.min(
                Math.max(boundingBox.width + padding * 2, boundingBox.height + padding * 2),
                finalDims.w - sx,
                finalDims.h - sy
            );

            canvas.width = size;
            canvas.height = size;
            const cropCtx = canvas.getContext('2d');

            if (!cropCtx) {
                throw new Error("Error al crear contexto de dibujo.");
            }

            cropCtx.drawImage(
                finalImageElement,
                sx, sy, size, size,
                0, 0, size, size
            );

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    setIsDetecting(false);
                    resolve(blob);
                }, 'image/webp', 0.9);
            });

        } catch (error) {
            console.error("Face detection error:", error);
            
            // Fallback: Create a square crop from the center of the image (or slightly offset top)
            try {
                const canvas = document.createElement('canvas');
                const w = imageElement instanceof HTMLImageElement ? imageElement.naturalWidth : imageElement.width;
                const h = imageElement instanceof HTMLImageElement ? imageElement.naturalHeight : imageElement.height;
                
                const size = Math.min(w, h);
                const sx = (w - size) / 2;
                // Try to crop upper half since faces are usually at the top
                const sy = h > w ? (h - size) * 0.2 : (h - size) / 2;
                
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(imageElement, sx, sy, size, size, 0, 0, size, size);
                    return new Promise((resolve) => {
                        canvas.toBlob((blob) => {
                            setIsDetecting(false);
                            resolve(blob);
                        }, 'image/webp', 0.9);
                    });
                }
            } catch (fallbackError) {
                console.error("Fallback crop error:", fallbackError);
            }

            setDetectionError("No pudimos recortar tu rostro automáticamente. Por favor recórtala manualmente antes de subirla.");
            setIsDetecting(false);
            return null;
        }
    }, []);

    return { detectFace, isDetecting, detectionError };
};
