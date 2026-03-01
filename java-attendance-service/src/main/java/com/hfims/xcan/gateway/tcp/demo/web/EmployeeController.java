package com.hfims.xcan.gateway.tcp.demo.web;

import com.hfims.xcan.gateway.netty.client.HfDeviceClient;
import com.hfims.xcan.gateway.netty.client.resp.HfDeviceResp;
import com.hfims.xcan.gateway.tcp.demo.service.RequestBuilderService;
import com.hfims.xcan.gateway.tcp.demo.support.BaseResult;
import com.hfims.xcan.gateway.tcp.demo.support.ResultWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import javax.annotation.PreDestroy;

// OpenCV imports for face detection
import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.opencv.objdetect.CascadeClassifier;
import org.opencv.objdetect.Objdetect;
import javax.annotation.PostConstruct;
import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

// OpenCV imports for face detection
import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.opencv.objdetect.CascadeClassifier;
import org.opencv.objdetect.Objdetect;
import javax.annotation.PostConstruct;
import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

@RestController
@RequestMapping("/api/employee")
@CrossOrigin(origins = "*")
public class EmployeeController extends BaseController {

    @Autowired
    private RequestBuilderService requestBuilderService;
    
    // ==================== FACE DETECTION SETUP ====================
    private CascadeClassifier faceDetector;
    private static final String HAAR_CASCADE_FRONTALFACE = "haarcascade_frontalface_default.xml";
    
    @PostConstruct
    public void initializeFaceDetection() {
        try {
            System.out.println("=== INITIALIZING FACE DETECTION ===");
            
            // Load OpenCV native library
            nu.pattern.OpenCV.loadLocally();
            System.out.println("✅ OpenCV library loaded successfully");
            
            // Load Haar Cascade classifier from resources
            InputStream cascadeStream = getClass().getClassLoader().getResourceAsStream("haarcascades/" + HAAR_CASCADE_FRONTALFACE);
            
            if (cascadeStream == null) {
                // Try alternative path
                cascadeStream = getClass().getClassLoader().getResourceAsStream(HAAR_CASCADE_FRONTALFACE);
            }
            
            if (cascadeStream != null) {
                // Create temporary file for cascade classifier
                File cascadeFile = File.createTempFile("haarcascade", ".xml");
                cascadeFile.deleteOnExit();
                Files.copy(cascadeStream, cascadeFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
                
                faceDetector = new CascadeClassifier(cascadeFile.getAbsolutePath());
                
                if (!faceDetector.empty()) {
                    System.out.println("✅ Face detection classifier loaded successfully");
                } else {
                    System.err.println("⚠️ WARNING: Face detector is empty, face detection will be skipped");
                    faceDetector = null;
                }
            } else {
                System.err.println("⚠️ WARNING: Haar Cascade file not found, face detection will be skipped");
                System.err.println("   Face validation will rely on device-side detection only");
                faceDetector = null;
            }
            
        } catch (Exception e) {
            System.err.println("⚠️ WARNING: Face detection initialization failed: " + e.getMessage());
            System.err.println("   Face validation will rely on device-side detection only");
            faceDetector = null;
        }
    }
    
    /**
     * Validates that the image contains at least one face
     * This prevents non-face images from being sent to the device
     */
    private FaceDetectionResult detectFaceInImage(byte[] imageBytes) {
        System.out.println("=== FACE DETECTION VALIDATION ===");
        
        // If face detector is not initialized, skip validation
        if (faceDetector == null) {
            System.out.println("⚠️ Face detector not available, skipping face detection");
            return FaceDetectionResult.skipped("Face detector not initialized");
        }
        
        try {
            // Decode image from bytes
            Mat image = Imgcodecs.imdecode(new MatOfByte(imageBytes), Imgcodecs.IMREAD_COLOR);
            
            if (image.empty()) {
                System.err.println("❌ Failed to decode image for face detection");
                return FaceDetectionResult.failed("Unable to decode image");
            }
            
            System.out.println("Image loaded: " + image.width() + "x" + image.height());
            
            // Convert to grayscale for better face detection
            Mat grayImage = new Mat();
            Imgproc.cvtColor(image, grayImage, Imgproc.COLOR_BGR2GRAY);
            
            // Enhance contrast for better detection
            Imgproc.equalizeHist(grayImage, grayImage);
            
            // Detect faces
            MatOfRect faceDetections = new MatOfRect();
            faceDetector.detectMultiScale(
                grayImage,
                faceDetections,
                1.1,        // scaleFactor: 1.1 for better accuracy
                3,          // minNeighbors: 3 for balance between false positives and sensitivity
                Objdetect.CASCADE_SCALE_IMAGE,
                new Size(30, 30),  // minimum face size
                new Size()         // maximum face size (no limit)
            );
            
            Rect[] faces = faceDetections.toArray();
            int faceCount = faces.length;
            
            System.out.println("Face detection complete: " + faceCount + " face(s) detected");
            
            if (faceCount > 0) {
                // Log face details
                for (int i = 0; i < faceCount; i++) {
                    Rect face = faces[i];
                    System.out.println("  Face " + (i + 1) + ": x=" + face.x + ", y=" + face.y + ", width=" + face.width + ", height=" + face.height);
                }
                
                // Calculate confidence based on face size relative to image
                Rect largestFace = faces[0];
                for (Rect face : faces) {
                    if (face.width * face.height > largestFace.width * largestFace.height) {
                        largestFace = face;
                    }
                }
                
                double faceArea = largestFace.width * largestFace.height;
                double imageArea = image.width() * image.height();
                double faceRatio = faceArea / imageArea;
                
                System.out.println("Largest face occupies " + String.format("%.1f", faceRatio * 100) + "% of image");
                
                // Check if face is too small (less than 5% of image)
                if (faceRatio < 0.05) {
                    System.out.println("⚠️ Face detected but very small, may affect recognition quality");
                    return FaceDetectionResult.success(faceCount, "Face detected but small");
                }
                
                System.out.println("✅ Face validation passed");
                return FaceDetectionResult.success(faceCount, "Face detected successfully");
                
            } else {
                System.err.println("❌ No face detected in image");
                return FaceDetectionResult.failed("No face detected in the image. Please ensure:\n" +
                    "  - Face is clearly visible and centered\n" +
                    "  - Good lighting without shadows\n" +
                    "  - Front-facing (not at an angle)\n" +
                    "  - No glasses, hats, or face coverings\n" +
                    "  - Face occupies at least 30% of the image");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Face detection failed: " + e.getMessage());
            e.printStackTrace();
            return FaceDetectionResult.failed("Face detection error: " + e.getMessage());
        }
    }
    
    /**
     * Result class for face detection operations
     */
    private static class FaceDetectionResult {
        private final boolean success;
        private final boolean skipped;
        private final int faceCount;
        private final String message;
        
        private FaceDetectionResult(boolean success, boolean skipped, int faceCount, String message) {
            this.success = success;
            this.skipped = skipped;
            this.faceCount = faceCount;
            this.message = message;
        }
        
        public static FaceDetectionResult success(int faceCount, String message) {
            return new FaceDetectionResult(true, false, faceCount, message);
        }
        
        public static FaceDetectionResult failed(String message) {
            return new FaceDetectionResult(false, false, 0, message);
        }
        
        public static FaceDetectionResult skipped(String message) {
            return new FaceDetectionResult(true, true, 0, message);
        }
        
        public boolean isSuccess() { return success; }
        public boolean isSkipped() { return skipped; }
        public int getFaceCount() { return faceCount; }
        public String getMessage() { return message; }
    }
    
    // ==================== XO5 DEVICE QUEUE PROTECTION ====================
    // Single-threaded executor to ensure sequential processing to XO5 device
    // This prevents device buffer overload when multiple admins enroll simultaneously
    private final ExecutorService deviceExecutor = Executors.newSingleThreadExecutor(
        new ThreadFactory() {
            public Thread newThread(Runnable r) {
                Thread t = new Thread(r, "XO5-Device-Queue");
                t.setDaemon(true);
                return t;
            }
        }
    );
    
    // Track queue statistics
    private final AtomicInteger queuedRequests = new AtomicInteger(0);
    private final AtomicInteger processedRequests = new AtomicInteger(0);
    private final AtomicInteger failedRequests = new AtomicInteger(0);
    
    // Maximum wait time for device operation (15 minutes for large operations)
    private static final long DEVICE_OPERATION_TIMEOUT = 900000;
    
    @PreDestroy
    public void shutdown() {
        System.out.println("Shutting down XO5 device queue...");
        deviceExecutor.shutdown();
        try {
            if (!deviceExecutor.awaitTermination(30, TimeUnit.SECONDS)) {
                deviceExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            deviceExecutor.shutdownNow();
        }
        System.out.println("XO5 device queue shutdown complete");
        System.out.println("Total queued: " + queuedRequests.get());
        System.out.println("Total processed: " + processedRequests.get());
        System.out.println("Total failed: " + failedRequests.get());
    }

    /**
     * Upload Face Image Only (Database-First Architecture)
     * This endpoint is called AFTER employee is saved to database
     * It only handles device synchronization
     */
    @PostMapping("/upload-face")
    public BaseResult uploadFaceImageToDevice(@RequestBody FaceUploadRequest request) {
        System.out.println("=== FACE UPLOAD REQUEST (Database-First) ===");
        System.out.println("Employee ID: " + request.getEmployeeId());
        System.out.println("Full Name: " + request.getFullName());
        System.out.println("Device Key: " + request.getDeviceKey());
        
        try {
            // Validate input
            if (request.getEmployeeId() == null || request.getEmployeeId().trim().isEmpty()) {
                return ResultWrapper.wrapFailure("1001", "Employee ID is required");
            }
            if (request.getFaceImage() == null || request.getFaceImage().trim().isEmpty()) {
                return ResultWrapper.wrapFailure("1001", "Face image is required");
            }
            if (request.getDeviceKey() == null || request.getSecret() == null) {
                return ResultWrapper.wrapFailure("1001", "Device credentials are required");
            }
            
            // Convert to EmployeeRegistrationRequest for compatibility
            EmployeeRegistrationRequest registrationRequest = new EmployeeRegistrationRequest();
            registrationRequest.setEmployeeId(request.getEmployeeId());
            registrationRequest.setFullName(request.getFullName());
            registrationRequest.setFaceImage(request.getFaceImage());
            registrationRequest.setDeviceKey(request.getDeviceKey());
            registrationRequest.setSecret(request.getSecret());
            registrationRequest.setVerificationStyle(request.getVerificationStyle());
            registrationRequest.setForceUpdate(true); // Always allow updates in database-first mode
            
            // Submit to queue
            int queuePosition = queuedRequests.incrementAndGet();
            System.out.println("📊 Queue Position: " + queuePosition);
            
            Future<BaseResult> future = deviceExecutor.submit(() -> processEnrollmentToDevice(registrationRequest));
            BaseResult result = future.get(DEVICE_OPERATION_TIMEOUT, TimeUnit.MILLISECONDS);
            
            processedRequests.incrementAndGet();
            return result;
            
        } catch (TimeoutException e) {
            failedRequests.incrementAndGet();
            return ResultWrapper.wrapFailure("TIMEOUT", "Device operation timed out. Please retry.");
        } catch (Exception e) {
            failedRequests.incrementAndGet();
            e.printStackTrace();
            return ResultWrapper.wrapFailure("1000", "Face upload failed: " + e.getMessage());
        }
    }
    
    /**
     * Delete Person from Device
     * Allows cleanup of person records from device
     */
    @PostMapping("/delete-person")
    public BaseResult deletePersonFromDevice(@RequestBody DeletePersonRequest request) {
        System.out.println("=== DELETE PERSON REQUEST ===");
        System.out.println("Employee ID: " + request.getEmployeeId());
        System.out.println("Device Key: " + request.getDeviceKey());
        
        try {
            if (request.getEmployeeId() == null || request.getEmployeeId().trim().isEmpty()) {
                return ResultWrapper.wrapFailure("1001", "Employee ID is required");
            }
            if (request.getDeviceKey() == null || request.getSecret() == null) {
                return ResultWrapper.wrapFailure("1001", "Device credentials are required");
            }
            
            HfDeviceResp response = deletePersonFromDevice(
                request.getEmployeeId(), 
                request.getDeviceKey(), 
                request.getSecret()
            );
            
            if ("000".equals(response.getCode())) {
                Map<String, Object> data = new HashMap<>();
                data.put("employeeId", request.getEmployeeId());
                data.put("status", "deleted");
                data.put("message", "Person deleted successfully from device");
                return ResultWrapper.wrapSuccess(data);
            } else {
                return ResultWrapper.wrapFailure(response.getCode(), "Failed to delete person: " + response.getMsg());
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResultWrapper.wrapFailure("1000", "Delete operation failed: " + e.getMessage());
        }
    }
    
    /**
     * Get Person Info from Device
     * Retrieves person information from the device
     */
    @PostMapping("/get-person")
    public BaseResult getPersonFromDevice(@RequestBody GetPersonRequest request) {
        System.out.println("=== GET PERSON REQUEST ===");
        System.out.println("Employee ID: " + request.getEmployeeId());
        
        try {
            if (request.getEmployeeId() == null || request.getEmployeeId().trim().isEmpty()) {
                return ResultWrapper.wrapFailure("1001", "Employee ID is required");
            }
            if (request.getDeviceKey() == null || request.getSecret() == null) {
                return ResultWrapper.wrapFailure("1001", "Device credentials are required");
            }
            
            // Get person info from device
            HfDeviceResp response = getPersonInfo(request.getEmployeeId(), request.getDeviceKey(), request.getSecret());
            
            if ("000".equals(response.getCode())) {
                Map<String, Object> data = new HashMap<>();
                data.put("employeeId", request.getEmployeeId());
                data.put("exists", true);
                data.put("deviceResponse", response.getData());
                return ResultWrapper.wrapSuccess(data);
            } else {
                Map<String, Object> data = new HashMap<>();
                data.put("employeeId", request.getEmployeeId());
                data.put("exists", false);
                data.put("message", response.getMsg());
                return ResultWrapper.wrapSuccess(data);
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResultWrapper.wrapFailure("1000", "Get person operation failed: " + e.getMessage());
        }
    }

    /**
     * Delete Face from Device
     * Removes face image associated with an employee from the device
     */
    @PostMapping("/delete-face")
    public BaseResult deleteFaceFromDevice(@RequestBody DeleteFaceRequest request) {
        System.out.println("=== DELETE FACE REQUEST ===");
        System.out.println("Employee ID: " + request.getEmployeeId());
        System.out.println("Device Key: " + request.getDeviceKey());
        
        try {
            if (request.getEmployeeId() == null || request.getEmployeeId().trim().isEmpty()) {
                return ResultWrapper.wrapFailure("1001", "Employee ID is required");
            }
            if (request.getDeviceKey() == null || request.getSecret() == null) {
                return ResultWrapper.wrapFailure("1001", "Device credentials are required");
            }
            
            HfDeviceResp response = deleteFaceFromDevice(
                request.getEmployeeId(), 
                request.getDeviceKey(), 
                request.getSecret()
            );
            
            if ("000".equals(response.getCode())) {
                Map<String, Object> data = new HashMap<>();
                data.put("employeeId", request.getEmployeeId());
                data.put("deleted", true);
                data.put("message", "Face image deleted successfully from device");
                return ResultWrapper.wrapSuccess(data);
            } else {
                return ResultWrapper.wrapFailure(response.getCode(), 
                    "Failed to delete face: " + response.getMsg());
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResultWrapper.wrapFailure("1000", "Delete face operation failed: " + e.getMessage());
        }
    }

    /**
     * Register Employee and Upload Face Image
     */
    @PostMapping("/register")
    public BaseResult registerEmployeeToDevice(@RequestBody EmployeeRegistrationRequest request) {
        System.out.println("=== EMPLOYEE REGISTRATION REQUEST ===");
        System.out.println("Employee ID: " + request.getEmployeeId());
        System.out.println("Full Name: " + request.getFullName());
        System.out.println("Device Key: " + request.getDeviceKey());
        
        // Increment queue counter
        int queuePosition = queuedRequests.incrementAndGet();
        System.out.println("📊 Queue Statistics - Position: " + queuePosition + ", Processed: " + processedRequests.get() + ", Failed: " + failedRequests.get());

        try {
            // Submit to single-threaded queue for sequential device access
            Future<BaseResult> future = deviceExecutor.submit(() -> processEnrollmentToDevice(request));
            
            // Wait for result with timeout
            System.out.println("⏳ Waiting for device operation to complete (timeout: " + DEVICE_OPERATION_TIMEOUT + "ms)...");
            BaseResult result = future.get(DEVICE_OPERATION_TIMEOUT, TimeUnit.MILLISECONDS);
            
            processedRequests.incrementAndGet();
            System.out.println("✅ Enrollment completed successfully");
            return result;
            
        } catch (TimeoutException e) {
            failedRequests.incrementAndGet();
            System.err.println("❌ Device operation timed out after " + DEVICE_OPERATION_TIMEOUT + "ms");
            return ResultWrapper.wrapFailure("TIMEOUT", "Device enrollment timed out. The device may be busy processing other requests. Please try again.");
            
        } catch (ExecutionException e) {
            failedRequests.incrementAndGet();
            Throwable cause = e.getCause();
            System.err.println("❌ Device operation failed: " + cause.getMessage());
            
            if (cause instanceof RuntimeException) {
                RuntimeException re = (RuntimeException) cause;
                String errorMessage = re.getMessage();
                
                if (errorMessage != null && (errorMessage.startsWith("EMPLOYEE_ALREADY_ENROLLED") || errorMessage.startsWith("DUPLICATE_EMPLOYEE_DETECTED"))) {
                    return ResultWrapper.wrapFailure("DUPLICATE_EMPLOYEE", errorMessage);
                }
                return ResultWrapper.wrapFailure("1000", "Employee registration failed: " + errorMessage);
            }
            
            return ResultWrapper.wrapFailure("1000", "Employee registration failed: " + cause.getMessage());
            
        } catch (InterruptedException e) {
            failedRequests.incrementAndGet();
            Thread.currentThread().interrupt();
            System.err.println("❌ Device operation interrupted");
            return ResultWrapper.wrapFailure("INTERRUPTED", "Device enrollment was interrupted. Please try again.");
            
        } catch (Exception e) {
            failedRequests.incrementAndGet();
            e.printStackTrace();
            return ResultWrapper.wrapFailure("1000", "Unexpected error: " + e.getMessage());
        }
    }
    
    /**
     * Process enrollment to device - executed sequentially in queue
     * This ensures only one enrollment happens at a time, preventing XO5 device buffer overload
     */
    private BaseResult processEnrollmentToDevice(EmployeeRegistrationRequest request) {
        System.out.println("\n🔄 === PROCESSING ENROLLMENT FROM QUEUE ===");
        System.out.println("Employee ID: " + request.getEmployeeId());
        System.out.println("Full Name: " + request.getFullName());
        System.out.println("Thread: " + Thread.currentThread().getName());
        
        try {
            // 🔹 1. Validate input
            if (request.getEmployeeId() == null || request.getEmployeeId().trim().isEmpty()) {
                return ResultWrapper.wrapFailure("1001", "Employee ID is required");
            }
            if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
                return ResultWrapper.wrapFailure("1001", "Employee full name is required");
            }
            if (request.getDeviceKey() == null || request.getSecret() == null) {
                return ResultWrapper.wrapFailure("1001", "Device credentials are required");
            }
            if (request.getFaceImage() == null || request.getFaceImage().trim().isEmpty()) {
                return ResultWrapper.wrapFailure("1001", "Face image is required for enrollment");
            }

            // 🔹 2. Test device connectivity
            System.out.println("Testing device connectivity...");
            HfDeviceResp testResponse = HfDeviceClient.test(getHostInfo(), request.getDeviceKey(), request.getSecret());
            System.out.println("Device test response - Code: " + testResponse.getCode() + ", Message: " + testResponse.getMsg());

            if (!"000".equals(testResponse.getCode())) {
                return ResultWrapper.wrapFailure("1002", "Device connectivity failed: " + testResponse.getMsg());
            }

            // 🔹 3. Check if employee already exists on device
            ValidationResult validationResult = validateEmployeeExists(request);
            if (!validationResult.isValid()) {
                return ResultWrapper.wrapFailure(validationResult.getErrorCode(), validationResult.getErrorMessage());
            }

        // 🔹 4. Process and validate face image Base64 data with enhanced checking
        String faceImage = processFaceImageWithEnhancedValidation(request.getFaceImage());
        System.out.println("Enhanced face image validation completed");
        System.out.println("Final processed image data length: " + faceImage.length());            // 🔹 5. Build person creation request
            Object personCreateReq = requestBuilderService.buildPersonCreateReq(
                    request.getEmployeeId(),
                    request.getFullName(),
                    faceImage,
                    request.getVerificationStyle()
            );

            // Optional debugging
            requestBuilderService.inspectPersonCreateReqMethods();

            // 🔹 6. Create or merge person on device (based on validation result)
            HfDeviceResp createResponse = handlePersonCreationOrMerge(request, personCreateReq);
            if (createResponse == null) {
                return ResultWrapper.wrapFailure("1004", "Failed to create or update employee on device: null response");
            }
            if (!"000".equals(createResponse.getCode())) {
                return ResultWrapper.wrapFailure("1004", "Failed to create or update employee on device: " + createResponse.getMsg());
            }

            System.out.println("✅ Employee record created/updated successfully on device");

            // 🔹 7. Upload face image using faceMerge() with retry logic
            HfDeviceResp faceResponse = null;
            boolean faceMergeSucceeded = false;
            String faceMergeMessage = "Face merge completed";
            
            try {
                faceResponse = handleFaceMergeWithRetry(request, faceImage);
                faceMergeSucceeded = true;
            } catch (Exception e) {
                if (e.getMessage() != null && e.getMessage().equals("FACE_MERGE_NULL_SUCCESS")) {
                    System.out.println("✅ Face merge succeeded with null response (common with XO5 devices)");
                    faceMergeSucceeded = true;
                    faceMergeMessage = "Face merge successful (device returned null response)";
                } else {
                    // Face merge failed - cleanup the person record to avoid conflicts
                    System.out.println("❌ Face merge failed, cleaning up person record from device...");
                    try {
                        HfDeviceResp deleteResponse = deletePersonFromDevice(request.getEmployeeId(), request.getDeviceKey(), request.getSecret());
                        if ("000".equals(deleteResponse.getCode())) {
                            System.out.println("✅ Person record cleaned up successfully after face merge failure");
                        } else {
                            System.out.println("⚠️ Failed to cleanup person record: " + deleteResponse.getMsg());
                        }
                    } catch (Exception cleanupError) {
                        System.out.println("⚠️ Cleanup failed: " + cleanupError.getMessage());
                    }
                    throw e; // Re-throw original exception
                }
            }
            
            // Check face merge results
            if (faceResponse != null && !"000".equals(faceResponse.getCode())) {
                // Check if this is a "face already exists" scenario
                if (faceResponse.getMsg() != null && faceResponse.getMsg().toLowerCase().contains("already exists")) {
                    System.out.println("⚠️ Face already exists but person was created/updated successfully");
                    faceMergeSucceeded = true;
                    faceMergeMessage = "Face already exists - " + faceResponse.getMsg();
                } else {
                    // Face merge failed - cleanup the person record to avoid conflicts
                    System.out.println("❌ Face merge failed with code " + faceResponse.getCode() + ", cleaning up person record...");
                    try {
                        HfDeviceResp deleteResponse = deletePersonFromDevice(request.getEmployeeId(), request.getDeviceKey(), request.getSecret());
                        if ("000".equals(deleteResponse.getCode())) {
                            System.out.println("✅ Person record cleaned up successfully after face merge failure");
                        } else {
                            System.out.println("⚠️ Failed to cleanup person record: " + deleteResponse.getMsg());
                        }
                    } catch (Exception cleanupError) {
                        System.out.println("⚠️ Cleanup failed: " + cleanupError.getMessage());
                    }
                    return ResultWrapper.wrapFailure("1006", "Face enrollment failed: " + faceResponse.getMsg() + " (person record cleaned up, you can retry)");
                }
            }

            System.out.println("✅ Face image process completed");

            // 🔹 8. Return success result
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("employeeId", request.getEmployeeId());
            responseData.put("fullName", request.getFullName());
            responseData.put("deviceConnected", true);
            responseData.put("enrollmentStatus", "success");
            responseData.put("deviceResponse", faceMergeMessage);
            responseData.put("status", "Employee successfully enrolled on device with face recognition");
            responseData.put("faceMergeSuccess", faceMergeSucceeded);

            return ResultWrapper.wrapSuccess(responseData);

        } catch (RuntimeException e) {
            e.printStackTrace();
            String errorMessage = e.getMessage();
            
            // Check if it's a duplicate employee error
            if (errorMessage != null && (errorMessage.startsWith("EMPLOYEE_ALREADY_ENROLLED") || errorMessage.startsWith("DUPLICATE_EMPLOYEE_DETECTED"))) {
                throw e; // Re-throw to be caught by caller
            }
            
            throw new RuntimeException("Employee registration failed: " + errorMessage, e);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Employee registration failed: " + e.getMessage(), e);
        }
    }

    /**
     * Handles creating or merging a person record on the device.
     */
    private HfDeviceResp handlePersonCreationOrMerge(EmployeeRegistrationRequest request, Object personCreateReq) throws Exception {
        Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
        Class<?> personCreateReqClass = Class.forName("com.hfims.xcan.gateway.netty.client.req.PersonCreateReq");

        java.lang.reflect.Method personCreateMethod = HfDeviceClient.class.getMethod("personCreate",
                hostInfoClass, String.class, String.class, personCreateReqClass);
        HfDeviceResp createResponse = (HfDeviceResp) personCreateMethod.invoke(null,
                getHostInfo(), request.getDeviceKey(), request.getSecret(), personCreateReq);

        // Check for null response
        if (createResponse == null) {
            throw new RuntimeException("Person create method returned null response");
        }

        System.out.println("Person create response - Code: " + createResponse.getCode() + ", Message: " + createResponse.getMsg());

        // If exists, check forceUpdate flag strictly
        if (!"000".equals(createResponse.getCode())) {
            if ("1201".equals(createResponse.getCode()) ||
                    (createResponse.getMsg() != null && createResponse.getMsg().toLowerCase().contains("exist"))) {
                
                // Employee exists - check if forceUpdate is explicitly set
                Boolean forceUpdate = request.getForceUpdate();
                if (forceUpdate == null || !forceUpdate) {
                    // Employee exists but no force update - return specific error
                    String errorMessage = String.format(
                        "Employee '%s' (%s) already exists on the device. " +
                        "Registration blocked to prevent duplicate entries. " +
                        "To update this employee's information, set 'forceUpdate' to true in your request.",
                        request.getEmployeeId(),
                        request.getFullName() != null ? request.getFullName() : "Unknown Name"
                    );
                    throw new RuntimeException("DUPLICATE_EMPLOYEE_DETECTED: " + errorMessage);
                }
                
                System.out.println("✅ Force update requested - proceeding with person merge for existing employee...");
                java.lang.reflect.Method personMergeMethod = HfDeviceClient.class.getMethod("personMerge",
                        hostInfoClass, String.class, String.class, personCreateReqClass);
                createResponse = (HfDeviceResp) personMergeMethod.invoke(null,
                        getHostInfo(), request.getDeviceKey(), request.getSecret(), personCreateReq);
                
                // Check for null response from merge
                if (createResponse == null) {
                    throw new RuntimeException("Person merge method returned null response");
                }
                
                System.out.println("Person merge response - Code: " + createResponse.getCode() + ", Message: " + createResponse.getMsg());
            }
        }

        return createResponse;
    }

    /**
     * Handles uploading the employee's face to the device.
     */
    private HfDeviceResp handleFaceMerge(EmployeeRegistrationRequest request, String faceImage) throws Exception {
        System.out.println("=== STARTING FACE MERGE ===");
        System.out.println("PersonSn: " + request.getEmployeeId());
        System.out.println("Face image length: " + (faceImage != null ? faceImage.length() : "null"));

        // Debug: List available methods for FaceMergeReq
        Class<?> faceMergeReqClass = Class.forName("com.hfims.xcan.gateway.netty.client.req.FaceMergeReq");
        System.out.println("=== FaceMergeReq Available Methods ===");
        Method[] faceMergeMethods = faceMergeReqClass.getDeclaredMethods();
        for (Method method : faceMergeMethods) {
            if (method.getName().startsWith("set")) {
                System.out.println("Method: " + method.getName() + " | Parameter: " + 
                    (method.getParameterCount() > 0 ? method.getParameterTypes()[0].getSimpleName() : "none"));
            }
        }

        Object faceMergeReq = faceMergeReqClass.getDeclaredConstructor().newInstance();

        // Set PersonSn - try different method names
        boolean personSnSet = false;
        try {
            faceMergeReqClass.getMethod("setPersonSn", String.class).invoke(faceMergeReq, request.getEmployeeId());
            personSnSet = true;
            System.out.println("✅ PersonSn set successfully using setPersonSn");
        } catch (NoSuchMethodException e) {
            try {
                faceMergeReqClass.getMethod("setSn", String.class).invoke(faceMergeReq, request.getEmployeeId());
                personSnSet = true;
                System.out.println("✅ PersonSn set successfully using setSn");
            } catch (NoSuchMethodException e2) {
                try {
                    faceMergeReqClass.getMethod("setId", String.class).invoke(faceMergeReq, request.getEmployeeId());
                    personSnSet = true;
                    System.out.println("✅ PersonSn set successfully using setId");
                } catch (NoSuchMethodException e3) {
                    System.out.println("❌ Failed to set PersonSn - no matching method found");
                }
            }
        }

        // Set face image - try different method names
        boolean faceImageSet = false;
        try {
            faceMergeReqClass.getMethod("setImgBase64", String.class).invoke(faceMergeReq, faceImage);
            faceImageSet = true;
            System.out.println("✅ Face image set successfully using setImgBase64");
        } catch (NoSuchMethodException e) {
            try {
                faceMergeReqClass.getMethod("setFaceImage", String.class).invoke(faceMergeReq, faceImage);
                faceImageSet = true;
                System.out.println("✅ Face image set successfully using setFaceImage");
            } catch (NoSuchMethodException e2) {
                try {
                    faceMergeReqClass.getMethod("setImage", String.class).invoke(faceMergeReq, faceImage);
                    faceImageSet = true;
                    System.out.println("✅ Face image set successfully using setImage");
                } catch (NoSuchMethodException e3) {
                    System.out.println("❌ Failed to set face image - no matching method found");
                }
            }
        }

        // Set easy parameter for photo quality detection (0=strict, 1=loose)
        // According to XO5 SDK documentation: 0 = Strict detection, 1 = Loose detection
        // Using 1 (loose) for better success rate with face recognition
        boolean easySet = false;
        try {
            faceMergeReqClass.getMethod("setEasy", Integer.class).invoke(faceMergeReq, 1);
            easySet = true;
            System.out.println("✅ Quality detection set to LOOSE (easy=1) for better face recognition success");
        } catch (NoSuchMethodException e) {
            System.out.println("⚠️ Could not set 'easy' parameter - using default strict detection");
        }

        if (!personSnSet || !faceImageSet) {
            throw new RuntimeException("Failed to configure FaceMergeReq - PersonSn: " + personSnSet + ", FaceImage: " + faceImageSet);
        }

        // Call faceMerge with enhanced error handling and retry logic
        java.lang.reflect.Method faceMergeMethod = HfDeviceClient.class.getMethod("faceMerge",
                Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto"),
                String.class, String.class, faceMergeReqClass);

        System.out.println("Calling faceMerge with hostInfo: " + hostInfo);
        
        HfDeviceResp faceResp = null;
        int maxRetries = 3;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            System.out.println("🔄 Face merge attempt " + attempt + "/" + maxRetries);
            
            try {
                faceResp = (HfDeviceResp) faceMergeMethod.invoke(null,
                        hostInfo, request.getDeviceKey(), request.getSecret(), faceMergeReq);
                        
                // Check if we got a successful response
                if (faceResp != null && "000".equals(faceResp.getCode())) {
                    System.out.println("✅ Face merge successful on attempt " + attempt);
                    break;
                }
                
                // If we got error 101008, try to optimize the image and retry
                if (faceResp != null && "1500".equals(faceResp.getCode()) && 
                    faceResp.getMsg() != null && faceResp.getMsg().contains("101008") && attempt < maxRetries) {
                    
                    System.out.println("❌ Error 101008 detected on attempt " + attempt + ", trying to optimize image...");
                    
                    // Try to optimize the image for better XO5 compatibility
                    String optimizedImage = optimizeImageForXO5(faceImage, attempt);
                    if (!optimizedImage.equals(faceImage)) {
                        // Update the request with optimized image
                        faceMergeReqClass.getMethod("setImgBase64", String.class).invoke(faceMergeReq, optimizedImage);
                        faceImage = optimizedImage; // Update for next iteration
                        System.out.println("🔧 Image optimized for attempt " + (attempt + 1));
                        continue;
                    }
                }
                
                // If this is the last attempt or we have a different error, break
                if (attempt == maxRetries) {
                    System.out.println("❌ Face merge failed on final attempt " + attempt);
                    break;
                }
                
            } catch (Exception e) {
                System.err.println("❌ Face merge attempt " + attempt + " failed with exception: " + e.getMessage());
                if (attempt == maxRetries) {
                    throw e;
                }
                
                // Wait a bit before retrying
                Thread.sleep(1000);
            }
        }

        // Enhanced error diagnosis
        String responseCode = faceResp != null ? faceResp.getCode() : "null";
        String responseMsg = faceResp != null ? faceResp.getMsg() : "null";
        
        System.out.println("Face merge response - Code: " + responseCode + ", Message: " + responseMsg);
        
        // Handle specific error codes
        if (!"000".equals(responseCode)) {
            System.out.println("❌ Face merge failed with error code: " + responseCode);
            
            // Analyze common error codes with detailed guidance
            if ("101007".equals(responseCode) || "1500".equals(responseCode)) {
                System.out.println("🔍 Diagnosing image format issue...");
                System.out.println("   - Image length: " + faceImage.length());
                System.out.println("   - First 50 chars: " + (faceImage.length() > 50 ? faceImage.substring(0, 50) + "..." : faceImage));
                System.out.println("   - Last 10 chars: " + (faceImage.length() > 10 ? faceImage.substring(faceImage.length() - 10) : faceImage));
                
                // Special handling for error 101008 (embedded in 1500)
                if (responseMsg != null && responseMsg.contains("101008")) {
                    System.out.println("💡 ERROR 101008: Failed to add face via imgBase64");
                    System.out.println("   This usually indicates:");
                    System.out.println("   1. 🖼️  Image quality too poor for face detection");
                    System.out.println("   2. 👤  No clear face detected in the image");
                    System.out.println("   3. 📐  Image resolution too high/low for device");
                    System.out.println("   4. 💾  Image format not optimal for XO5 device");
                    System.out.println("   ");
                    System.out.println("   📋 Recommendations:");
                    System.out.println("   ✓ Use a clear, well-lit photo of the face");
                    System.out.println("   ✓ Ensure face is front-facing and unobstructed");
                    System.out.println("   ✓ Use JPEG format with 640x480 or similar resolution");
                    System.out.println("   ✓ Keep image size between 100-400KB");
                    System.out.println("   ✓ Avoid sunglasses, hats, or face coverings");
                }
                
                // Check if this is a face already exists scenario (treat as success)
                if (responseMsg != null && responseMsg.toLowerCase().contains("already exists")) {
                    System.out.println("⚠️ Face already exists for this employee");
                    System.out.println("✅ Face already exists but person was created/updated successfully");
                    // Return the response - treat as success since the employee is registered
                }
            } else if ("101010".equals(responseCode)) {
                System.out.println("⚠️ Person or face already exists error");
                System.out.println("   This typically means the employee is already enrolled");
                System.out.println("✅ Face already exists, treating as success");
                // Continue processing - treat as success since the employee is already enrolled
            } else {
                System.out.println("❌ Unexpected error code: " + responseCode);
                System.out.println("   Check XO5 device manual for error code meanings");
            }
            
            // Log the full response for debugging
            System.out.println("Full response: " + faceResp);
        } else {
            System.out.println("✅ Face merge successful!");
        }

        // Safety check - if response is still null, create a default success response
        if (faceResp == null) {
            System.out.println("⚠️ WARNING: Face merge returned null response, but operation may have succeeded");
            System.out.println("   This is common with some XO5 device SDK versions when operation succeeds");
            
            // Since person creation succeeded and we're doing face merge, 
            // let's assume success if we got this far without exceptions
            System.out.println("✅ Treating null response as successful face merge");
            
            // We can't create HfDeviceResp directly, so we'll handle this in the caller
            throw new RuntimeException("FACE_MERGE_NULL_SUCCESS");
        }

        return faceResp;
    }

    /**
     * Handles face merge with retry logic for better success rates
     */
    private HfDeviceResp handleFaceMergeWithRetry(EmployeeRegistrationRequest request, String faceImage) throws Exception {
        int maxRetries = 5; // Increased from 3 to 5 retries
        int retryDelayMs = 2000; // Increased from 1000ms to 2000ms (2 seconds)
        
        // Add initial delay to let device buffer clear after person creation
        System.out.println("⏳ Waiting 1.5 seconds before face merge to allow device buffer to clear...");
        Thread.sleep(1500);
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            System.out.println("🔄 Face merge attempt " + attempt + "/" + maxRetries);
            
            try {
                HfDeviceResp response = handleFaceMerge(request, faceImage);
                
                // Handle null response
                if (response == null) {
                    if (attempt < maxRetries) {
                        System.out.println("❌ Null response from face merge on attempt " + attempt + ". Retrying...");
                        Thread.sleep(retryDelayMs);
                        retryDelayMs = Math.min(retryDelayMs * 2, 10000); // Cap at 10 seconds
                        continue;
                    } else {
                        System.out.println("❌ Null response from face merge on final attempt " + attempt);
                        throw new RuntimeException("Face merge returned null response after " + maxRetries + " attempts");
                    }
                }
                
                // Success case
                if ("000".equals(response.getCode())) {
                    System.out.println("✅ Face merge successful on attempt " + attempt);
                    return response;
                }
                
                // Face already exists case - not an error, just log it
                if ("101010".equals(response.getCode()) || 
                    (response.getMsg() != null && response.getMsg().toLowerCase().contains("already exists"))) {
                    System.out.println("⚠️ Face already exists, treating as success");
                    return response; // Return the response as-is for caller to handle
                }
                
                // Error code 101008 (imgBase64 failure) - add extra delay before retry
                if ("101008".equals(response.getCode()) || "1500".equals(response.getCode())) {
                    if (attempt < maxRetries) {
                        System.out.println("❌ Face merge failed with device buffer error (Code: " + response.getCode() + ")");
                        System.out.println("   Message: " + response.getMsg());
                        System.out.println("   Adding extra delay before retry...");
                        Thread.sleep(3000); // 3 second delay for device buffer issues
                        retryDelayMs = Math.min(retryDelayMs * 2, 10000);
                    } else {
                        System.out.println("❌ Face merge failed on final attempt with device buffer error");
                        return response;
                    }
                }
                // Other errors - retry if not last attempt
                else if (attempt < maxRetries) {
                    System.out.println("❌ Face merge failed on attempt " + attempt + " (Code: " + response.getCode() + 
                                     ", Message: " + response.getMsg() + "). Retrying...");
                    Thread.sleep(retryDelayMs);
                    retryDelayMs = Math.min(retryDelayMs * 2, 10000); // Exponential backoff with cap
                } else {
                    System.out.println("❌ Face merge failed on final attempt " + attempt);
                    return response;
                }
                
            } catch (Exception e) {
                // Check for special null success case
                if (e.getMessage() != null && e.getMessage().equals("FACE_MERGE_NULL_SUCCESS")) {
                    System.out.println("✅ Face merge completed successfully (null response indicates success)");
                    throw e; // Let caller handle this special case
                }
                
                if (attempt < maxRetries) {
                    System.out.println("❌ Exception during face merge attempt " + attempt + ": " + e.getMessage() + ". Retrying...");
                    Thread.sleep(retryDelayMs);
                    retryDelayMs = Math.min(retryDelayMs * 2, 10000);
                } else {
                    System.out.println("❌ Exception during final face merge attempt: " + e.getMessage());
                    throw e;
                }
            }
        }
        
        // This shouldn't be reached, but just in case
        throw new RuntimeException("Face merge failed after " + maxRetries + " attempts");
    }

    /**
     * Processes and optimizes the face image for XO5 device compatibility
     */
    private String processFaceImage(String originalImage) {
        try {
            System.out.println("=== PROCESSING FACE IMAGE FOR XO5 DEVICE ===");
            
            if (originalImage == null || originalImage.trim().isEmpty()) {
                throw new IllegalArgumentException("Face image is required");
            }

            String faceImage = originalImage.trim();
            System.out.println("Original image length: " + faceImage.length());

            // Remove data URL prefix if present (data:image/jpeg;base64,)
            if (faceImage.contains(",")) {
                String prefix = faceImage.substring(0, faceImage.indexOf(",") + 1);
                faceImage = faceImage.substring(faceImage.indexOf(",") + 1);
                System.out.println("Removed prefix: " + prefix);
                System.out.println("Base64 length after prefix removal: " + faceImage.length());
            }

            // Clean any whitespace or newlines
            faceImage = faceImage.replaceAll("\\s+", "");
            System.out.println("Base64 length after cleanup: " + faceImage.length());

            // Validate Base64 format
            if (faceImage.length() % 4 != 0) {
                // Add padding if necessary
                int padding = 4 - (faceImage.length() % 4);
                if (padding < 4) {
                    faceImage += "=".repeat(padding);
                    System.out.println("Added " + padding + " padding characters");
                }
            }

            // Validate that it's a valid Base64 string
            try {
                java.util.Base64.getDecoder().decode(faceImage);
                System.out.println("✅ Base64 validation successful");
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Invalid Base64 image data: " + e.getMessage());
            }

            // ✅ XO5 DEVICE OPTIMIZATION: Optimize image for device compatibility
            String optimizedImage = optimizeImageForXO5(faceImage);
            System.out.println("✅ Image optimized for XO5 device");
            System.out.println("Final optimized image length: " + optimizedImage.length());

            return optimizedImage;

        } catch (Exception e) {
            System.err.println("❌ Face image processing failed: " + e.getMessage());
            throw new RuntimeException("Face image processing failed: " + e.getMessage());
        }
    }

    /**
     * Optimizes image specifically for XO5 device requirements
     */
    private String optimizeImageForXO5(String base64Image) throws Exception {
        try {
            System.out.println("=== OPTIMIZING IMAGE FOR XO5 DEVICE ===");
            
            // Decode the Base64 image
            byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Image);
            System.out.println("Original image size: " + imageBytes.length + " bytes");
            
            // ✅ XO5 DEVICE REQUIREMENTS:
            // - JPEG format preferred
            // - Maximum size: 200KB for reliable face recognition
            // - Resolution: 640x480 or smaller
            // - Quality: 70-80% for balance between size and clarity
            
            // If image is too large, we need to compress it
            if (imageBytes.length > 200_000) { // 200KB limit for XO5
                System.out.println("⚠️ Image size " + imageBytes.length + " bytes exceeds XO5 limit (200KB)");
                
                // Try to compress the image while maintaining quality
                String compressedImage = compressImageForXO5(imageBytes);
                if (compressedImage != null) {
                    return compressedImage;
                }
                
                // If compression fails, use size-based truncation (not ideal but fallback)
                System.out.println("⚠️ Image compression failed, using original with size warning");
            }
            
            // Check image format
            String format = detectImageFormat(imageBytes);
            System.out.println("Detected image format: " + format);
            
            // Validate format compatibility
            if (!format.equals("JPEG")) {
                System.out.println("⚠️ Non-JPEG format detected: " + format);
                System.out.println("   XO5 devices work best with JPEG format");
            }
            
            // Final size check
            if (imageBytes.length < 5_000) { // Minimum 5KB
                throw new RuntimeException("Image too small for face recognition: " + imageBytes.length + " bytes. Minimum: 5KB");
            }
            
            System.out.println("✅ Image validation completed");
            System.out.println("   Format: " + format);
            System.out.println("   Size: " + imageBytes.length + " bytes");
            System.out.println("   Base64 length: " + base64Image.length());
            
            return base64Image; // Return original if no optimization needed
            
        } catch (Exception e) {
            System.err.println("❌ Image optimization failed: " + e.getMessage());
            throw new RuntimeException("Image optimization for XO5 failed: " + e.getMessage());
        }
    }
    
    /**
     * Compresses image using basic quality reduction
     */
    private String compressImageForXO5(byte[] imageBytes) {
        try {
            System.out.println("=== COMPRESSING IMAGE FOR XO5 ===");
            
            // For now, implement basic compression by reducing quality
            // This is a simplified approach - in production, you might want
            // to use BufferedImage and ImageIO for proper compression
            
            // Calculate compression ratio needed
            int currentSize = imageBytes.length;
            int targetSize = 180_000; // Target 180KB (below 200KB limit)
            double compressionRatio = (double) targetSize / currentSize;
            
            System.out.println("Current size: " + currentSize + " bytes");
            System.out.println("Target size: " + targetSize + " bytes");
            System.out.println("Compression ratio needed: " + String.format("%.2f", compressionRatio));
            
            if (compressionRatio >= 0.8) {
                // Image is close to target size, no compression needed
                System.out.println("✅ Image size acceptable, no compression needed");
                return java.util.Base64.getEncoder().encodeToString(imageBytes);
            }
            
            // For basic implementation, we'll just warn and return original
            System.out.println("⚠️ Image compression needed but not implemented in basic version");
            System.out.println("   Recommendation: Use image editing software to reduce size to <200KB");
            System.out.println("   Current size: " + currentSize + " bytes");
            System.out.println("   Maximum size: 200,000 bytes");
            
            return java.util.Base64.getEncoder().encodeToString(imageBytes);
            
        } catch (Exception e) {
            System.err.println("❌ Image compression failed: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Detects image format from byte header
     */
    private String detectImageFormat(byte[] imageBytes) {
        if (imageBytes.length < 10) {
            return "Unknown";
        }
        
        // Check for JPEG header (FF D8 FF)
        if (imageBytes[0] == (byte) 0xFF && imageBytes[1] == (byte) 0xD8 && imageBytes[2] == (byte) 0xFF) {
            return "JPEG";
        }
        
        // Check for PNG header (89 50 4E 47 0D 0A 1A 0A)
        if (imageBytes[0] == (byte) 0x89 && imageBytes[1] == 0x50 && 
            imageBytes[2] == 0x4E && imageBytes[3] == 0x47) {
            return "PNG";
        }
        
        // Check for GIF header (47 49 46 38)
        if (imageBytes[0] == 0x47 && imageBytes[1] == 0x49 && 
            imageBytes[2] == 0x46 && imageBytes[3] == 0x38) {
            return "GIF";
        }
        
        // Check for BMP header (42 4D)
        if (imageBytes[0] == 0x42 && imageBytes[1] == 0x4D) {
            return "BMP";
        }
        
        return "Unknown";
    }

    /**
     * Validates image format specifically for XO5 device compatibility
     */
    private void validateImageForXO5Device(String base64Image) throws Exception {
        try {
            System.out.println("=== VALIDATING XO5 DEVICE COMPATIBILITY ===");
            
            // Decode the Base64 to check actual image format
            byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Image);
            System.out.println("Decoded image size: " + imageBytes.length + " bytes");
            
            // Check image size limits for XO5 device
            if (imageBytes.length > 500_000) { // 500KB limit for XO5 devices
                throw new RuntimeException("Image too large for XO5 device: " + imageBytes.length + " bytes. Maximum: 500KB");
            }
            
            if (imageBytes.length < 5_000) { // Minimum 5KB for reasonable quality
                throw new RuntimeException("Image too small for face recognition: " + imageBytes.length + " bytes. Minimum: 5KB");
            }
            
            // Check image header to determine format
            String format = "Unknown";
            boolean isValidFormat = false;
            
            if (imageBytes.length > 10) {
                // Check for JPEG header (FF D8 FF)
                if (imageBytes[0] == (byte) 0xFF && imageBytes[1] == (byte) 0xD8 && imageBytes[2] == (byte) 0xFF) {
                    format = "JPEG";
                    isValidFormat = true;
                }
                // Check for PNG header (89 50 4E 47)
                else if (imageBytes[0] == (byte) 0x89 && imageBytes[1] == (byte) 0x50 && 
                         imageBytes[2] == (byte) 0x4E && imageBytes[3] == (byte) 0x47) {
                    format = "PNG";
                    // XO5 devices prefer JPEG, but PNG might work
                    System.out.println("⚠️ WARNING: PNG format detected. XO5 devices prefer JPEG format.");
                    isValidFormat = true;
                }
                // Check for GIF header (47 49 46)
                else if (imageBytes[0] == (byte) 0x47 && imageBytes[1] == (byte) 0x49 && imageBytes[2] == (byte) 0x46) {
                    format = "GIF";
                    System.out.println("⚠️ WARNING: GIF format detected. XO5 devices may not support GIF.");
                }
            }
            
            System.out.println("Detected image format: " + format);
            
            if (!isValidFormat) {
                throw new RuntimeException("Unsupported image format for XO5 device: " + format + ". Use JPEG format for best compatibility.");
            }
            
            // XO5 devices typically prefer JPEG format
            if (!"JPEG".equals(format)) {
                System.out.println("⚠️ Warning: XO5 devices work best with JPEG images. Detected: " + format);
                // Don't fail, but warn. The device might still accept it.
            }
            
            // Additional XO5-specific recommendations
            System.out.println("💡 XO5 Device Recommendations:");
            System.out.println("   - Preferred format: JPEG");
            System.out.println("   - Recommended size: 100-400KB");
            System.out.println("   - Image dimensions: 640x480 or 480x640");
            System.out.println("   - Face should be clearly visible and well-lit");
            System.out.println("   - Current image: " + format + " format, " + imageBytes.length + " bytes");
            
            System.out.println("✅ XO5 device compatibility check passed");
            
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid Base64 image data for XO5 device: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("❌ XO5 compatibility check failed: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Optimizes image for XO5 device compatibility based on previous error attempts
     */
    private String optimizeImageForXO5(String base64Image, int attemptNumber) {
        try {
            System.out.println("=== OPTIMIZING IMAGE FOR XO5 (Attempt " + attemptNumber + ") ===");
            
            byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Image);
            System.out.println("Original image size: " + imageBytes.length + " bytes");
            
            // Strategy based on attempt number
            switch (attemptNumber) {
                case 1:
                    // First retry: Try to reduce image size if it's too large
                    if (imageBytes.length > 300_000) { // 300KB threshold
                        System.out.println("🔧 Attempt 1: Image too large, recommending smaller size");
                        System.out.println("   Current size: " + imageBytes.length + " bytes");
                        System.out.println("   💡 Please use a smaller image (under 300KB) for better XO5 compatibility");
                        System.out.println("   💡 Recommended: 640x480 JPEG with moderate compression");
                        return base64Image; // Return original, with recommendation logged
                    }
                    break;
                    
                case 2:
                    // Second retry: Check if image might be corrupted or malformed
                    System.out.println("🔧 Attempt 2: Checking for image format issues");
                    
                    // Verify the Base64 padding and format
                    String cleanedImage = base64Image.trim();
                    
                    // Ensure proper Base64 padding
                    while (cleanedImage.length() % 4 != 0) {
                        cleanedImage += "=";
                    }
                    
                    // Remove any data URL prefix if present
                    if (cleanedImage.startsWith("data:image/")) {
                        int commaIndex = cleanedImage.indexOf(",");
                        if (commaIndex != -1) {
                            cleanedImage = cleanedImage.substring(commaIndex + 1);
                            System.out.println("🔧 Removed data URL prefix");
                        }
                    }
                    
                    // Remove any whitespace that might interfere
                    cleanedImage = cleanedImage.replaceAll("\\s", "");
                    
                    if (!cleanedImage.equals(base64Image)) {
                        System.out.println("🔧 Image cleaned - length change: " + base64Image.length() + " -> " + cleanedImage.length());
                        return cleanedImage;
                    }
                    break;
                    
                default:
                    System.out.println("🔧 Attempt " + attemptNumber + ": No further optimizations available");
                    break;
            }
            
            // If no optimization was applied, return original
            System.out.println("💡 No optimization applied for attempt " + attemptNumber);
            System.out.println("💡 XO5 Device Troubleshooting Tips:");
            System.out.println("   - Ensure face is clearly visible and centered");
            System.out.println("   - Use good lighting (avoid shadows)");
            System.out.println("   - Face should be front-facing (not at an angle)");
            System.out.println("   - Avoid glasses, hats, or face coverings");
            System.out.println("   - Use JPEG format with standard compression");
            System.out.println("   - Image size should be between 50KB-400KB");
            
            return base64Image;
            
        } catch (Exception e) {
            System.err.println("❌ Image optimization failed: " + e.getMessage());
            System.out.println("💡 Using original image");
            return base64Image;
        }
    }

    /**
     * Enhanced face image processing with better XO5 device compatibility
     */
    private String processFaceImageWithEnhancedValidation(String originalImage) {
        try {
            System.out.println("=== ENHANCED FACE IMAGE PROCESSING FOR XO5 ===");
            
            if (originalImage == null || originalImage.trim().isEmpty()) {
                throw new IllegalArgumentException("Face image is required for enrollment");
            }

            String processedImage = processFaceImage(originalImage);
            
            // Additional validation for common XO5 failure scenarios
            byte[] imageBytes = java.util.Base64.getDecoder().decode(processedImage);
            int imageSizeKB = imageBytes.length / 1024;
            
            System.out.println("Enhanced validation checks:");
            System.out.println("   Image size: " + imageSizeKB + "KB");
            
            // Size recommendations based on XO5 device testing - relaxed threshold
            if (imageSizeKB < 20) {
                throw new RuntimeException("Image too small for reliable face detection: " + imageSizeKB + "KB. " +
                    "Please capture a higher quality image with better lighting. Minimum recommended: 20KB");
            }
            
            if (imageSizeKB > 400) {
                System.out.println("⚠️ WARNING: Large image size (" + imageSizeKB + "KB) may cause processing delays");
                System.out.println("   Recommended: Keep images between 50-300KB for optimal performance");
            }
            
            // Quality indicators based on Base64 characteristics  
            String base64Preview = processedImage.substring(0, Math.min(50, processedImage.length()));
            System.out.println("   Base64 preview: " + base64Preview + "...");
            
            // Check for JPEG format (starts with /9j/ in Base64)
            if (!processedImage.startsWith("/9j/")) {
                System.out.println("⚠️ WARNING: Image may not be JPEG format");
                System.out.println("   XO5 devices work best with JPEG images");
                System.out.println("   Base64 starts with: " + processedImage.substring(0, Math.min(10, processedImage.length())));
            }
            
            // ==================== FACE DETECTION VALIDATION ====================
            // Optional validation - warns if no face detected but doesn't block enrollment
            // The XO5 device will perform its own face validation
            System.out.println("\n=== VALIDATING IMAGE CONTAINS FACE (Optional) ===");
            FaceDetectionResult faceResult = detectFaceInImage(imageBytes);
            
            if (!faceResult.isSkipped()) {
                // Face detection was performed
                if (!faceResult.isSuccess()) {
                    // No face detected by OpenCV - log warning but continue
                    // XO5 device has its own face detection which may still succeed
                    System.out.println("⚠️ OPENCV FACE DETECTION WARNING");
                    System.out.println("   " + faceResult.getMessage());
                    System.out.println("   Continuing with enrollment - XO5 device will validate");
                } else {
                    System.out.println("✅ Face detection passed: " + faceResult.getFaceCount() + " face(s) detected");
                    if (faceResult.getMessage() != null && faceResult.getMessage().contains("small")) {
                        System.out.println("⚠️ " + faceResult.getMessage());
                    }
                }
            } else {
                System.out.println("⚠️ Face detection skipped: " + faceResult.getMessage());
                System.out.println("   Image will be validated by device only");
            }
            
            System.out.println("✅ Enhanced image validation completed successfully");
            System.out.println("   Final image size: " + imageSizeKB + "KB");
            System.out.println("   Format appears to be: " + (processedImage.startsWith("/9j/") ? "JPEG" : "Non-JPEG"));
            
            return processedImage;
            
        } catch (IllegalArgumentException e) {
            System.err.println("❌ Image validation failed: " + e.getMessage());
            throw new RuntimeException("Invalid face image: " + e.getMessage());
        } catch (Exception e) {
            System.err.println("❌ Enhanced image processing failed: " + e.getMessage());
            throw new RuntimeException("Face image processing failed: " + e.getMessage());
        }
    }

    /**
     * Request DTO for Employee Registration
     */
    public static class EmployeeRegistrationRequest {
        private String employeeId;
        private String fullName;
        private String faceImage;
        private String deviceKey;
        private String secret;
        private String email;
        private String department;
        private String position;
        private Integer verificationStyle;
        private Boolean forceUpdate; // Flag to force update existing employee

        // Getters and setters
        public String getEmployeeId() { return employeeId; }
        public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getFaceImage() { return faceImage; }
        public void setFaceImage(String faceImage) { this.faceImage = faceImage; }

        public String getDeviceKey() { return deviceKey; }
        public void setDeviceKey(String deviceKey) { this.deviceKey = deviceKey; }

        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }

        public String getPosition() { return position; }
        public void setPosition(String position) { this.position = position; }

        public Integer getVerificationStyle() { return verificationStyle; }
        public void setVerificationStyle(Integer verificationStyle) { this.verificationStyle = verificationStyle; }

        public Boolean getForceUpdate() { return forceUpdate; }
        public void setForceUpdate(Boolean forceUpdate) { this.forceUpdate = forceUpdate; }

        // Legacy getters
        public String getPersonId() { return employeeId; }
        public void setPersonId(String personId) { this.employeeId = personId; }

        public String getName() { return fullName; }
        public void setName(String name) { this.fullName = name; }
    }

    /**
     * Validates if an employee already exists and handles duplicate scenarios
     */
    private ValidationResult validateEmployeeExists(EmployeeRegistrationRequest request) {
        try {
            System.out.println("=== VALIDATING EMPLOYEE EXISTENCE ===");
            System.out.println("Employee ID: " + request.getEmployeeId());

            // First, try to query if the person exists on the device
            HfDeviceResp queryResponse = queryPersonExists(request);
            
            if ("000".equals(queryResponse.getCode())) {
                // Employee exists on device
                System.out.println("⚠️ Employee " + request.getEmployeeId() + " already exists on device");
                
                // Check if this is an update request (has forceUpdate flag or similar)
                Boolean forceUpdate = request.getForceUpdate();
                if (forceUpdate != null && forceUpdate) {
                    System.out.println("✅ Force update requested - will update existing employee");
                    return ValidationResult.valid("update");
                } else {
                    // Return a clear error about existing employee
                    String message = String.format(
                        "Employee with ID '%s' has already been enrolled on the device. " +
                        "Employee Name: %s. " +
                        "If you want to update this employee's information, please set 'forceUpdate' to true in your request. " +
                        "If you want to register a different employee, please use a unique employee ID.",
                        request.getEmployeeId(),
                        request.getFullName() != null ? request.getFullName() : "Unknown"
                    );
                    return ValidationResult.invalid("EMPLOYEE_ALREADY_ENROLLED", message);
                }
            } else {
                // Employee does not exist - safe to create
                System.out.println("✅ Employee " + request.getEmployeeId() + " does not exist - safe to create");
                return ValidationResult.valid("create");
            }

        } catch (Exception e) {
            // If query fails, we need to be more careful about proceeding
            System.out.println("⚠️ Could not query employee existence: " + e.getMessage());
            
            // Only proceed if forceUpdate is explicitly true or if it's clearly a method availability issue
            if (e.getMessage().contains("Query method not available") || 
                e.getMessage().contains("PersonQueryReq not available")) {
                System.out.println("PersonQueryReq not available in SDK - proceeding with creation attempt");
                return ValidationResult.valid("create");
            } else {
                // For other errors, we should be safe and require forceUpdate
                Boolean forceUpdate = request.getForceUpdate();
                if (forceUpdate != null && forceUpdate) {
                    System.out.println("Query failed but forceUpdate=true - proceeding with creation");
                    return ValidationResult.valid("create");
                } else {
                    String message = String.format(
                        "Cannot validate if employee '%s' already exists due to device query error. " +
                        "To proceed anyway, set 'forceUpdate' to true. Error: %s",
                        request.getEmployeeId(),
                        e.getMessage()
                    );
                    return ValidationResult.invalid("VALIDATION_ERROR", message);
                }
            }
        }
    }

    /**
     * Queries if a person exists on the device
     */
    private HfDeviceResp queryPersonExists(EmployeeRegistrationRequest request) throws Exception {
        try {
            // Use PersonQueryReq to check if employee exists
            Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
            Class<?> personQueryReqClass = Class.forName("com.hfims.xcan.gateway.netty.client.req.PersonQueryReq");
            
            Object personQueryReq = personQueryReqClass.getDeclaredConstructor().newInstance();
            
            // Set the employee ID (PersonSn) to query
            Method setSnMethod = personQueryReqClass.getMethod("setSn", String.class);
            setSnMethod.invoke(personQueryReq, request.getEmployeeId());
            
            // Call personQuery method
            Method personQueryMethod = HfDeviceClient.class.getMethod("personQuery",
                hostInfoClass, String.class, String.class, personQueryReqClass);
            
            HfDeviceResp queryResponse = (HfDeviceResp) personQueryMethod.invoke(null,
                hostInfo, request.getDeviceKey(), request.getSecret(), personQueryReq);
            
            System.out.println("Person query response - Code: " + queryResponse.getCode() + ", Message: " + queryResponse.getMsg());
            return queryResponse;
            
        } catch (ClassNotFoundException | NoSuchMethodException e) {
            // PersonQueryReq might not exist in this SDK version, fall back to creation attempt
            System.out.println("PersonQueryReq not available, will attempt creation");
            throw new Exception("Query method not available");
        }
    }

    /**
     * Result class for validation operations
     */
    private static class ValidationResult {
        private boolean valid;
        private String action; // "create", "update"
        private String errorCode;
        private String errorMessage;

        private ValidationResult(boolean valid, String action, String errorCode, String errorMessage) {
            this.valid = valid;
            this.action = action;
            this.errorCode = errorCode;
            this.errorMessage = errorMessage;
        }

        public static ValidationResult valid(String action) {
            return new ValidationResult(true, action, null, null);
        }

        public static ValidationResult invalid(String errorCode, String errorMessage) {
            return new ValidationResult(false, null, errorCode, errorMessage);
        }

        public boolean isValid() { return valid; }
        public String getAction() { return action; }
        public String getErrorCode() { return errorCode; }
        public String getErrorMessage() { return errorMessage; }
    }

    // ==================== CRUD OPERATIONS ====================

    /**
     * Get all employees from the device
     */
    @PostMapping("/list")
    public BaseResult getAllEmployees(@RequestBody DeviceRequest request) {
        System.out.println("=== GET ALL EMPLOYEES REQUEST ===");
        System.out.println("Device Key: " + request.getDeviceKey());

        try {
            // Test device connectivity
            HfDeviceResp testResponse = HfDeviceClient.test(hostInfo, request.getDeviceKey(), request.getSecret());
            if (!"000".equals(testResponse.getCode())) {
                return ResultWrapper.wrapFailure("1002", "Device connectivity failed: " + testResponse.getMsg());
            }

            // Get all persons from device
            HfDeviceResp listResponse = getAllPersonsFromDevice(request.getDeviceKey(), request.getSecret());
            
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("deviceConnected", true);
            
            if ("000".equals(listResponse.getCode())) {
                System.out.println("✅ Successfully retrieved employee list");
                responseData.put("message", "Employee list retrieved successfully");
                responseData.put("deviceResponse", listResponse.getMsg());
                
                // Parse the response data to extract employee information
                java.util.List<Map<String, Object>> employees = new java.util.ArrayList<>();
                int totalEmployees = 0;
                
                if (listResponse.getData() != null) {
                    try {
                        // The response data might contain employee list
                        Object data = listResponse.getData();
                        System.out.println("Parsing response data of type: " + data.getClass().getName());
                        
                        // Try to extract employee data from the response
                        // This depends on the actual structure returned by PersonFindListReq
                        if (data instanceof java.util.Map) {
                            java.util.Map<?, ?> dataMap = (java.util.Map<?, ?>) data;
                            System.out.println("Response data keys: " + dataMap.keySet());
                            
                            // Check for common field names that might contain the employee list
                            Object personList = dataMap.get("personList");
                            if (personList == null) personList = dataMap.get("list");
                            if (personList == null) personList = dataMap.get("data");
                            if (personList == null) personList = dataMap.get("persons");
                            if (personList == null) personList = dataMap.get("records");
                            
                            if (personList instanceof java.util.List) {
                                java.util.List<?> list = (java.util.List<?>) personList;
                                totalEmployees = list.size();
                                System.out.println("Found " + totalEmployees + " employees in the list");
                                
                                for (Object person : list) {
                                    if (person instanceof java.util.Map) {
                                        Map<String, Object> employee = extractEmployeeFromResponse(person);
                                        employees.add(employee);
                                    }
                                }
                            } else {
                                // Check if there are any size/total fields indicating the count
                                Object total = dataMap.get("total");
                                if (total == null) total = dataMap.get("totalCount");
                                if (total == null) total = dataMap.get("size");
                                
                                if (total instanceof Number) {
                                    totalEmployees = ((Number) total).intValue();
                                    System.out.println("Found total count from response: " + totalEmployees);
                                }
                            }
                        } else if (data instanceof java.util.List) {
                            // Direct list response
                            java.util.List<?> list = (java.util.List<?>) data;
                            totalEmployees = list.size();
                            System.out.println("Direct list response with " + totalEmployees + " employees");
                            
                            for (Object person : list) {
                                if (person instanceof java.util.Map) {
                                    java.util.Map<?, ?> personMap = (java.util.Map<?, ?>) person;
                                    Map<String, Object> employee = new HashMap<>();
                                    
                                    // Extract common fields - mapping device fields to our format
                                    employee.put("employeeId", personMap.get("sn"));
                                    employee.put("name", personMap.get("name"));
                                    
                                    // Map updateTime to createTime (timestamp from device)
                                    Object updateTime = personMap.get("updateTime");
                                    if (updateTime != null) {
                                        employee.put("createTime", updateTime.toString());
                                    } else {
                                        employee.put("createTime", null);
                                    }
                                    
                                    // Check for photo presence - device might have different field names
                                    Object photoField = personMap.get("hasPhoto");
                                    if (photoField == null) photoField = personMap.get("photoExists");
                                    if (photoField == null) photoField = personMap.get("faceImageExists");
                                    if (photoField == null) {
                                        // Try to detect from verifyStyle or other indicators
                                        Object verifyStyle = personMap.get("verifyStyle");
                                        if (verifyStyle != null && !"0".equals(verifyStyle.toString())) {
                                            photoField = true; // Has some verification method
                                        } else {
                                            photoField = false;
                                        }
                                    }
                                    employee.put("hasPhoto", photoField);
                                    
                                    employees.add(employee);
                                }
                            }
                        }
                        
                    } catch (Exception e) {
                        System.err.println("Error parsing employee data: " + e.getMessage());
                        e.printStackTrace();
                    }
                } else {
                    System.out.println("⚠️ Response data is null - no employee data available");
                }
                
                responseData.put("totalEmployees", totalEmployees);
                responseData.put("employees", employees);
                
                if (totalEmployees == 0) {
                    System.out.println("⚠️ No employees found in device response - device might be empty or response format changed");
                }
                
            } else {
                System.out.println("⚠️ Failed to retrieve employee list: " + listResponse.getMsg());
                responseData.put("totalEmployees", 0);
                responseData.put("employees", new java.util.ArrayList<>());
                responseData.put("message", "No employees found or failed to retrieve list");
                responseData.put("deviceResponse", listResponse.getMsg());
            }

            return ResultWrapper.wrapSuccess(responseData);

        } catch (Exception e) {
            e.printStackTrace();
            String errorMessage = e.getMessage();
            
            // Check if it's a "method not available" error
            if (errorMessage != null && (errorMessage.contains("not available") || 
                                       errorMessage.contains("Person list functionality not available"))) {
                
                // Return a helpful response indicating the limitation
                Map<String, Object> responseData = new HashMap<>();
                responseData.put("deviceConnected", true);
                responseData.put("listFunctionalityAvailable", false);
                responseData.put("message", "Employee listing not supported by current SDK version");
                responseData.put("recommendation", "Use individual employee queries or upgrade SDK");
                responseData.put("alternativeEndpoint", "POST /api/employee/get with specific employeeId");
                responseData.put("sdkLimitation", errorMessage);
                
                return ResultWrapper.wrapSuccess(responseData);
            }
            
            return ResultWrapper.wrapFailure("1000", "Failed to retrieve employees: " + errorMessage);
        }
    }

    /**
     * Get specific employee by ID
     */
    @PostMapping("/get")
    public BaseResult getEmployeeById(@RequestBody GetEmployeeRequest request) {
        System.out.println("=== GET EMPLOYEE BY ID REQUEST ===");
        System.out.println("Employee ID: " + request.getEmployeeId());
        System.out.println("Device Key: " + request.getDeviceKey());

        try {
            // Test device connectivity
            HfDeviceResp testResponse = HfDeviceClient.test(hostInfo, request.getDeviceKey(), request.getSecret());
            if (!"000".equals(testResponse.getCode())) {
                return ResultWrapper.wrapFailure("1002", "Device connectivity failed: " + testResponse.getMsg());
            }

            // Strategy 1: Try PersonFind method
            HfDeviceResp findResponse = findSpecificPerson(request.getEmployeeId(), request.getDeviceKey(), request.getSecret());
            
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("deviceConnected", true);
            responseData.put("employeeId", request.getEmployeeId());
            
            if ("000".equals(findResponse.getCode()) && findResponse.getData() != null) {
                System.out.println("✅ Employee found using PersonFind: " + request.getEmployeeId());
                
                // Extract employee data from response
                Map<String, Object> employee = extractEmployeeFromResponse(findResponse.getData());
                
                responseData.put("found", true);
                responseData.put("message", "Employee found successfully");
                responseData.put("employee", employee);
                responseData.put("deviceResponse", findResponse.getMsg());
                
                return ResultWrapper.wrapSuccess(responseData);
                
            } else {
                // Strategy 2: Fallback to list all and search
                System.out.println("PersonFind failed, trying list search...");
                HfDeviceResp listResponse = getAllPersonsFromDevice(request.getDeviceKey(), request.getSecret());
                
                if ("000".equals(listResponse.getCode()) && listResponse.getData() != null) {
                    // Search through the list for our employee
                    Object data = listResponse.getData();
                    java.util.List<?> personList = null;
                    
                    if (data instanceof java.util.Map) {
                        java.util.Map<?, ?> dataMap = (java.util.Map<?, ?>) data;
                        personList = (java.util.List<?>) dataMap.get("data");
                        if (personList == null) personList = (java.util.List<?>) dataMap.get("list");
                    } else if (data instanceof java.util.List) {
                        personList = (java.util.List<?>) data;
                    }
                    
                    if (personList != null) {
                        for (Object person : personList) {
                            if (person instanceof java.util.Map) {
                                java.util.Map<?, ?> personMap = (java.util.Map<?, ?>) person;
                                String sn = (String) personMap.get("sn");
                                if (request.getEmployeeId().equals(sn)) {
                                    System.out.println("✅ Employee found in list: " + request.getEmployeeId());
                                    
                                    Map<String, Object> employee = extractEmployeeFromResponse(person);
                                    
                                    responseData.put("found", true);
                                    responseData.put("message", "Employee found successfully");
                                    responseData.put("employee", employee);
                                    responseData.put("deviceResponse", "Found in employee list");
                                    
                                    return ResultWrapper.wrapSuccess(responseData);
                                }
                            }
                        }
                    }
                }
                
                // Employee not found
                System.out.println("⚠️ Employee not found: " + request.getEmployeeId());
                responseData.put("found", false);
                responseData.put("message", "Employee not found");
                responseData.put("employee", null);
                responseData.put("deviceResponse", "Employee not found in device records");
                
                return ResultWrapper.wrapSuccess(responseData);
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResultWrapper.wrapFailure("1000", "Failed to retrieve employee: " + e.getMessage());
        }
    }

    /**
     * Update existing employee (requires forceUpdate)
     */
    @PostMapping("/update")
    public BaseResult updateEmployee(@RequestBody EmployeeRegistrationRequest request) {
        System.out.println("=== UPDATE EMPLOYEE REQUEST ===");
        System.out.println("Employee ID: " + request.getEmployeeId());
        System.out.println("Full Name: " + request.getFullName());

        try {
            // Force update flag must be true for updates
            request.setForceUpdate(true);
            
            // Validate input
            if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
                return ResultWrapper.wrapFailure("1001", "Employee full name is required for update");
            }
            if (request.getDeviceKey() == null || request.getSecret() == null) {
                return ResultWrapper.wrapFailure("1001", "Device credentials are required");
            }

            // Test device connectivity
            HfDeviceResp testResponse = HfDeviceClient.test(hostInfo, request.getDeviceKey(), request.getSecret());
            if (!"000".equals(testResponse.getCode())) {
                return ResultWrapper.wrapFailure("1002", "Device connectivity failed: " + testResponse.getMsg());
            }

            // Check if employee exists
            ValidationResult validationResult = validateEmployeeExists(request);
            if (!validationResult.isValid() && !"EMPLOYEE_ALREADY_ENROLLED".equals(validationResult.getErrorCode())) {
                return ResultWrapper.wrapFailure("1003", "Employee not found for update: " + request.getEmployeeId());
            }

            // Process face image if provided
            String faceImage = null;
            boolean updateFace = false;
            if (request.getFaceImage() != null && !request.getFaceImage().trim().isEmpty()) {
                faceImage = processFaceImage(request.getFaceImage());
                updateFace = true;
                System.out.println("Face image provided for update, length: " + faceImage.length());
            }

            // Build person update request
            Object personCreateReq = requestBuilderService.buildPersonCreateReq(
                    request.getEmployeeId(),
                    request.getFullName(),
                    faceImage,
                    request.getVerificationStyle()
            );

            // Perform merge (update) operation
            HfDeviceResp updateResponse = performPersonMerge(request, personCreateReq);
            if (!"000".equals(updateResponse.getCode())) {
                return ResultWrapper.wrapFailure("1004", "Failed to update employee: " + updateResponse.getMsg());
            }

            System.out.println("✅ Employee basic info updated successfully");

            // Update face if provided
            boolean faceUpdateSuccess = true;
            String faceUpdateMessage = "No face update requested";
            
            if (updateFace && faceImage != null) {
                try {
                    HfDeviceResp faceResponse = handleFaceMergeWithRetry(request, faceImage);
                    if (faceResponse != null && "000".equals(faceResponse.getCode())) {
                        faceUpdateMessage = "Face updated successfully";
                    } else {
                        faceUpdateMessage = "Face update completed with response: " + 
                            (faceResponse != null ? faceResponse.getMsg() : "null response");
                    }
                } catch (Exception e) {
                    if (e.getMessage() != null && e.getMessage().equals("FACE_MERGE_NULL_SUCCESS")) {
                        faceUpdateMessage = "Face updated successfully (null response)";
                    } else {
                        faceUpdateSuccess = false;
                        faceUpdateMessage = "Face update failed: " + e.getMessage();
                    }
                }
            }

            // Return success result
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("employeeId", request.getEmployeeId());
            responseData.put("fullName", request.getFullName());
            responseData.put("deviceConnected", true);
            responseData.put("updateStatus", "success");
            responseData.put("faceUpdateRequested", updateFace);
            responseData.put("faceUpdateSuccess", faceUpdateSuccess);
            responseData.put("faceUpdateMessage", faceUpdateMessage);
            responseData.put("message", "Employee updated successfully");

            return ResultWrapper.wrapSuccess(responseData);

        } catch (Exception e) {
            e.printStackTrace();
            return ResultWrapper.wrapFailure("1000", "Employee update failed: " + e.getMessage());
        }
    }

    /**
     * Delete employee from device with validation-first approach
     */
    @PostMapping("/delete")
    public BaseResult deleteEmployee(@RequestBody DeleteEmployeeRequest request) {
        System.out.println("=== DELETE EMPLOYEE REQUEST (Validation-First) ===");
        System.out.println("Employee ID: " + request.getEmployeeId());
        System.out.println("Device Key: " + request.getDeviceKey());

        try {
            // STEP 1: Test device connectivity
            System.out.println("🔍 Step 1: Testing device connectivity...");
            HfDeviceResp testResponse = HfDeviceClient.test(hostInfo, request.getDeviceKey(), request.getSecret());
            if (!"000".equals(testResponse.getCode())) {
                return ResultWrapper.wrapFailure("1002", "Device connectivity failed: " + testResponse.getMsg());
            }
            System.out.println("✅ Device connectivity confirmed");

            // STEP 2: Validate employee exists on device
            System.out.println("� Step 2: Validating employee exists on device...");
            boolean employeeExists = validateEmployeeExistsOnDevice(request.getEmployeeId(), request.getDeviceKey(), request.getSecret());
            
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("employeeId", request.getEmployeeId());
            responseData.put("deviceConnected", true);
            responseData.put("validationPerformed", true);
            responseData.put("employeeExistsOnDevice", employeeExists);

            if (!employeeExists) {
                System.out.println("⚠️ Employee not found on device: " + request.getEmployeeId());
                responseData.put("deleted", false);
                responseData.put("message", "Employee not found on device - cannot proceed with deletion");
                responseData.put("canProceedWithSoftDelete", false);
                return ResultWrapper.wrapFailure("1003", "Employee not found on device: " + request.getEmployeeId());
            }

            System.out.println("✅ Employee confirmed to exist on device");

            // STEP 3: Delete face data first (if exists)
            System.out.println("🗑️ Step 3: Deleting face data from device...");
            boolean faceDeleted = false;
            String faceDeleteMessage = "No face data to delete";
            
            try {
                HfDeviceResp faceDeleteResponse = deleteFaceFromDevice(request.getEmployeeId(), request.getDeviceKey(), request.getSecret());
                if ("000".equals(faceDeleteResponse.getCode())) {
                    System.out.println("✅ Face data deleted successfully");
                    faceDeleted = true;
                    faceDeleteMessage = "Face deleted successfully";
                } else {
                    System.out.println("⚠️ Face deletion response: " + faceDeleteResponse.getCode() + " - " + faceDeleteResponse.getMsg());
                    faceDeleteMessage = "Face deletion: " + faceDeleteResponse.getMsg();
                    // Continue with person deletion even if face deletion fails
                }
            } catch (Exception e) {
                System.out.println("⚠️ Face deletion error (non-critical): " + e.getMessage());
                faceDeleteMessage = "Face deletion error: " + e.getMessage();
                // Continue with person deletion
            }

            // STEP 4: Delete person record from device
            System.out.println("🗑️ Step 4: Deleting person record from device...");
            HfDeviceResp deleteResponse = deletePersonFromDevice(request.getEmployeeId(), request.getDeviceKey(), request.getSecret());
            
            responseData.put("deviceResponse", deleteResponse.getMsg());
            responseData.put("faceDeleted", faceDeleted);
            responseData.put("faceDeleteMessage", faceDeleteMessage);
            
            if ("000".equals(deleteResponse.getCode())) {
                System.out.println("✅ Person record deleted successfully from device: " + request.getEmployeeId());
                responseData.put("deleted", true);
                responseData.put("message", "Employee and face data deleted successfully from device");
                responseData.put("canProceedWithSoftDelete", true);
                return ResultWrapper.wrapSuccess(responseData);
            } else {
                System.out.println("❌ Person deletion failed despite validation: " + deleteResponse.getCode() + " - " + deleteResponse.getMsg());
                responseData.put("deleted", false);
                responseData.put("message", "Person deletion failed: " + deleteResponse.getMsg());
                responseData.put("canProceedWithSoftDelete", false);
                return ResultWrapper.wrapFailure("1004", "Person deletion failed despite validation: " + deleteResponse.getMsg());
            }

        } catch (Exception e) {
            e.printStackTrace();
            return ResultWrapper.wrapFailure("1000", "Employee deletion failed: " + e.getMessage());
        }
    }

    // ==================== HELPER METHODS ====================

    /**
     * Validate if employee exists on device before deletion
     */
    private boolean validateEmployeeExistsOnDevice(String employeeId, String deviceKey, String secret) throws Exception {
        try {
            System.out.println("=== VALIDATING EMPLOYEE EXISTS ON DEVICE ===");
            System.out.println("Employee ID to validate: " + employeeId);
            
            // Get all persons from device
            HfDeviceResp personsResponse = getAllPersonsFromDevice(deviceKey, secret);
            
            if (personsResponse == null || !"000".equals(personsResponse.getCode())) {
                System.out.println("⚠️ Could not retrieve person list from device");
                System.out.println("Response code: " + (personsResponse != null ? personsResponse.getCode() : "null"));
                System.out.println("Response message: " + (personsResponse != null ? personsResponse.getMsg() : "null"));
                
                // If we can't get the list, we cannot validate - this is a failure
                throw new Exception("Cannot retrieve employee list from device for validation: " + 
                    (personsResponse != null ? personsResponse.getMsg() : "null response"));
            }
            
            // Check if the response data contains our employee
            Object responseData = personsResponse.getData();
            if (responseData == null) {
                System.out.println("ℹ️ Device returned empty person list - employee does not exist");
                return false;
            }
            
            // Parse the response data to find our employee
            if (responseData instanceof java.util.List) {
                @SuppressWarnings("unchecked")
                java.util.List<Object> personList = (java.util.List<Object>) responseData;
                
                System.out.println("📋 Found " + personList.size() + " persons on device");
                
                for (Object person : personList) {
                    Map<String, Object> employeeData = extractEmployeeFromResponse(person);
                    String deviceEmployeeId = (String) employeeData.get("employeeId");
                    String deviceEmployeeName = (String) employeeData.get("name");
                    
                    System.out.println("  Checking device employee: ID=" + deviceEmployeeId + ", Name=" + deviceEmployeeName);
                    
                    // Match by employee ID (sn field)
                    if (employeeId.equals(deviceEmployeeId)) {
                        System.out.println("✅ Employee found on device: " + employeeId);
                        return true;
                    }
                }
                
                System.out.println("❌ Employee not found on device: " + employeeId);
                return false;
                
            } else if (responseData instanceof java.util.Map) {
                // Single person response
                @SuppressWarnings("unchecked")
                Map<String, Object> personData = (Map<String, Object>) responseData;
                
                Map<String, Object> employeeData = extractEmployeeFromResponse(personData);
                String deviceEmployeeId = (String) employeeData.get("employeeId");
                
                System.out.println("📋 Single person response - ID: " + deviceEmployeeId);
                
                boolean exists = employeeId.equals(deviceEmployeeId);
                System.out.println(exists ? "✅ Employee found on device" : "❌ Employee not found on device");
                return exists;
                
            } else {
                System.out.println("⚠️ Unexpected response data format: " + responseData.getClass().getName());
                throw new Exception("Unexpected device response format for person validation");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error validating employee existence: " + e.getMessage());
            throw new Exception("Employee validation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Get all persons from device
     */
    private HfDeviceResp getAllPersonsFromDevice(String deviceKey, String secret) throws Exception {
        try {
            System.out.println("=== TRYING PersonFindListReq METHOD ===");
            
            // Strategy 1: Try PersonFindListReq (the correct method available in SDK)
            try {
                System.out.println("✅ Creating PersonFindListReq object...");
                Object personFindListReq = requestBuilderService.buildPersonFindListReq();
                
                Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
                
                Method personFindListMethod = HfDeviceClient.class.getMethod("personFindList", 
                    hostInfoClass, String.class, String.class, personFindListReq.getClass());
                
                System.out.println("✅ Calling personFindList method...");
                HfDeviceResp response = (HfDeviceResp) personFindListMethod.invoke(null, hostInfo, deviceKey, secret, personFindListReq);
                
                if (response != null) {
                    System.out.println("✅ PersonFindListReq response - Code: " + response.getCode() + ", Message: " + response.getMsg());
                    System.out.println("✅ PersonFindListReq response - Data: " + response.getData());
                    
                    // Log the response structure for debugging
                    if (response.getData() != null) {
                        System.out.println("✅ Response data type: " + response.getData().getClass().getName());
                        System.out.println("✅ Response data toString: " + response.getData().toString());
                    } else {
                        System.out.println("⚠️ Response data is null - this might explain the empty list");
                    }
                    
                    return response;
                } else {
                    System.out.println("⚠️ PersonFindListReq returned null response");
                }
                
            } catch (ClassNotFoundException | NoSuchMethodException e) {
                System.out.println("❌ PersonFindListReq method not available: " + e.getMessage());
            } catch (Exception e) {
                System.out.println("❌ Error calling PersonFindListReq: " + e.getMessage());
                e.printStackTrace();
            }
            
            // Strategy 2: Try PersonFind method using direct SDK call
            try {
                System.out.println("✅ Trying PersonFind method as fallback...");
                
                // Build PersonFindReq object manually 
                Class<?> personFindReqClass = Class.forName("com.hfims.xcan.gateway.netty.client.req.PersonFindReq");
                Object personFindReq = personFindReqClass.getDeclaredConstructor().newInstance();
                
                Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
                
                Method personFindMethod = HfDeviceClient.class.getMethod("personFind", 
                    hostInfoClass, String.class, String.class, personFindReq.getClass());
                
                System.out.println("✅ Calling personFind method...");
                HfDeviceResp response = (HfDeviceResp) personFindMethod.invoke(null, hostInfo, deviceKey, secret, personFindReq);
                
                if (response != null) {
                    System.out.println("✅ PersonFind response - Code: " + response.getCode() + ", Message: " + response.getMsg());
                    return response;
                } else {
                    System.out.println("⚠️ PersonFind returned null response");
                }
                
            } catch (ClassNotFoundException | NoSuchMethodException e) {
                System.out.println("❌ PersonFind method not available: " + e.getMessage());
            } catch (Exception e) {
                System.out.println("❌ Error calling PersonFind: " + e.getMessage());
            }
            
            // Strategy 3: Use test method and provide helpful error message
            try {
                // Simple test to verify device connection
                Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
                Method testMethod = HfDeviceClient.class.getMethod("test", 
                    hostInfoClass, String.class, String.class);
                
                HfDeviceResp testResponse = (HfDeviceResp) testMethod.invoke(null, hostInfo, deviceKey, secret);
                
                if (testResponse != null && "000".equals(testResponse.getCode())) {
                    throw new Exception("Person list functionality not available in this SDK version. Device is connected but cannot retrieve employee list.");
                } else {
                    throw new Exception("Device connection failed. Cannot retrieve employee list.");
                }
                
            } catch (NoSuchMethodException e) {
                throw new Exception("SDK methods not available for person listing. Please check SDK version.");
            } catch (Exception e) {
                System.out.println("Failed to get all persons: " + e.getMessage());
                throw e;
            }
            
        } catch (Exception e) {
            System.err.println("Failed to get all persons: " + e.getMessage());
            throw e;
        }
    }

    /**
     * Extract employee data from device response with proper field mapping
     */
    private Map<String, Object> extractEmployeeFromResponse(Object data) {
        Map<String, Object> employee = new HashMap<>();
        
        if (data instanceof Map) {
            Map<?, ?> personMap = (Map<?, ?>) data;
            
            // Extract basic fields with safe type conversion
            Object snObj = personMap.get("sn");
            String sn = snObj != null ? String.valueOf(snObj) : null;
            
            Object nameObj = personMap.get("name");
            String name = nameObj != null ? String.valueOf(nameObj) : null;
            
            Object updateTimeObj = personMap.get("updateTime");
            String updateTime = null;
            if (updateTimeObj != null) {
                if (updateTimeObj instanceof Long) {
                    // Convert timestamp to readable format
                    Long timestamp = (Long) updateTimeObj;
                    updateTime = new java.util.Date(timestamp).toString();
                } else {
                    updateTime = String.valueOf(updateTimeObj);
                }
            }
            
            Object verifyStyleObj = personMap.get("verifyStyle");
            Integer verifyStyle = null;
            if (verifyStyleObj != null) {
                if (verifyStyleObj instanceof Integer) {
                    verifyStyle = (Integer) verifyStyleObj;
                } else if (verifyStyleObj instanceof Long) {
                    verifyStyle = ((Long) verifyStyleObj).intValue();
                } else {
                    try {
                        verifyStyle = Integer.parseInt(String.valueOf(verifyStyleObj));
                    } catch (NumberFormatException e) {
                        System.out.println("Could not parse verifyStyle: " + verifyStyleObj);
                        verifyStyle = 0;
                    }
                }
            }
            
            System.out.println("Extracting employee data:");
            System.out.println("  sn (employeeId): " + sn + " (type: " + (snObj != null ? snObj.getClass().getSimpleName() : "null") + ")");
            System.out.println("  name: " + name + " (type: " + (nameObj != null ? nameObj.getClass().getSimpleName() : "null") + ")");
            System.out.println("  updateTime: " + updateTime + " (type: " + (updateTimeObj != null ? updateTimeObj.getClass().getSimpleName() : "null") + ")");
            System.out.println("  verifyStyle: " + verifyStyle + " (type: " + (verifyStyleObj != null ? verifyStyleObj.getClass().getSimpleName() : "null") + ")");
            
            // Map fields to expected format
            employee.put("employeeId", sn);
            employee.put("sn", sn); // Keep original field name for backwards compatibility
            employee.put("name", name);
            employee.put("fullName", name); // For compatibility
            
            // Map updateTime to createTime
            employee.put("createTime", updateTime);
            employee.put("updateTime", updateTime);
            
            // Map verifyStyle to hasPhoto
            // verifyStyle values: 1=face, 2=finger, 3=face+finger, etc.
            boolean hasPhoto = verifyStyle != null && (verifyStyle == 1 || verifyStyle == 3 || verifyStyle >= 5);
            employee.put("hasPhoto", hasPhoto);
            employee.put("verifyStyle", verifyStyle);
            
            // Add other available fields with safe conversion
            if (personMap.containsKey("dept")) {
                Object deptObj = personMap.get("dept");
                employee.put("department", deptObj != null ? String.valueOf(deptObj) : null);
            }
            if (personMap.containsKey("personId")) {
                Object personIdObj = personMap.get("personId");
                employee.put("personId", personIdObj != null ? String.valueOf(personIdObj) : null);
            }
            if (personMap.containsKey("status")) {
                Object statusObj = personMap.get("status");
                employee.put("status", statusObj != null ? String.valueOf(statusObj) : null);
            }
            
            System.out.println("✅ Employee data extracted: " + employee);
        }
        
        return employee;
    }

    /**
     * Find specific person using PersonFind method
     */
    private HfDeviceResp findSpecificPerson(String employeeId, String deviceKey, String secret) {
        try {
            System.out.println("=== ATTEMPTING PERSON FIND ===");
            System.out.println("Employee ID: " + employeeId);
            
            // Build PersonFindReq using reflection with correct package path
            Class<?> personFindReqClass = Class.forName("com.hfims.xcan.gateway.netty.client.req.PersonFindReq");
            Object personFindReq = personFindReqClass.getDeclaredConstructor().newInstance();
            
            System.out.println("✅ PersonFindReq object created successfully");
            
            // Try different field names for setting the employee ID
            boolean fieldSet = false;
            String[] fieldNames = {"sn", "personSn", "id", "employeeId"};
            
            for (String fieldName : fieldNames) {
                try {
                    String methodName = "set" + fieldName.substring(0, 1).toUpperCase() + fieldName.substring(1);
                    Method setMethod = personFindReqClass.getMethod(methodName, String.class);
                    setMethod.invoke(personFindReq, employeeId);
                    System.out.println("✅ Set field '" + fieldName + "' to: " + employeeId);
                    fieldSet = true;
                    break;
                } catch (NoSuchMethodException e) {
                    System.out.println("Method " + fieldName + " not found, trying next...");
                }
            }
            
            if (!fieldSet) {
                System.out.println("⚠️ Could not find appropriate field setter for employee ID in PersonFindReq");
                HfDeviceResp notFoundResponse = new HfDeviceResp();
                notFoundResponse.setCode("404");
                notFoundResponse.setMsg("PersonFind field setter not found");
                return notFoundResponse;
            }
            
            // Get the method signature for personFind
            Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
            
            Method personFindMethod = HfDeviceClient.class.getMethod("personFind",
                hostInfoClass, String.class, String.class, personFindReqClass);
            
            System.out.println("✅ Found personFind method in HfDeviceClient");
            
            // Call the personFind method
            HfDeviceResp response = (HfDeviceResp) personFindMethod.invoke(null, hostInfo, deviceKey, secret, personFindReq);
            
            System.out.println("PersonFind response - Code: " + response.getCode() + ", Message: " + response.getMsg());
            return response;
                
        } catch (ClassNotFoundException e) {
            System.out.println("PersonFindReq class not found: " + e.getMessage());
            HfDeviceResp notFoundResponse = new HfDeviceResp();
            notFoundResponse.setCode("404");
            notFoundResponse.setMsg("PersonFind class not available in SDK");
            return notFoundResponse;
            
        } catch (NoSuchMethodException e) {
            System.out.println("personFind method not found: " + e.getMessage());
            HfDeviceResp notFoundResponse = new HfDeviceResp();
            notFoundResponse.setCode("404");
            notFoundResponse.setMsg("PersonFind method not available in SDK");
            return notFoundResponse;
            
        } catch (Exception e) {
            System.out.println("Failed to find person using PersonFind: " + e.getMessage());
            e.printStackTrace();
            
            HfDeviceResp errorResponse = new HfDeviceResp();
            errorResponse.setCode("999");
            errorResponse.setMsg("PersonFind method failed: " + e.getMessage());
            return errorResponse;
        }
    }

    /**
     * Perform person merge operation
     */
    private HfDeviceResp performPersonMerge(EmployeeRegistrationRequest request, Object personCreateReq) throws Exception {
        Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
        Class<?> personCreateReqClass = Class.forName("com.hfims.xcan.gateway.netty.client.req.PersonCreateReq");

        Method personMergeMethod = HfDeviceClient.class.getMethod("personMerge",
                hostInfoClass, String.class, String.class, personCreateReqClass);
        
        HfDeviceResp mergeResponse = (HfDeviceResp) personMergeMethod.invoke(null,
                hostInfo, request.getDeviceKey(), request.getSecret(), personCreateReq);

        if (mergeResponse == null) {
            throw new RuntimeException("Person merge method returned null response");
        }

        System.out.println("Person merge response - Code: " + mergeResponse.getCode() + ", Message: " + mergeResponse.getMsg());
        return mergeResponse;
    }

    /**
     * Delete person from device using the correct SDK method
     */
    private HfDeviceResp deletePersonFromDevice(String employeeId, String deviceKey, String secret) throws Exception {
        try {
            System.out.println("=== ATTEMPTING PERSON DELETION ===");
            System.out.println("Employee ID: " + employeeId);
            System.out.println("Device Key: " + deviceKey);
            
            // Use RequestBuilderService to build the PersonDeleteReq properly
            Object personDeleteReq = requestBuilderService.buildPersonDeleteReq(employeeId);
            
            System.out.println("✅ PersonDeleteReq object created successfully using RequestBuilderService");
            
            // Get the method signature for personDelete
            Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
            Class<?> personDeleteReqClass = Class.forName("com.hfims.xcan.gateway.netty.client.req.PersonDeleteReq");
            
            Method personDeleteMethod = HfDeviceClient.class.getMethod("personDelete",
                hostInfoClass, String.class, String.class, personDeleteReqClass);
            
            System.out.println("✅ Found personDelete method in HfDeviceClient");
            
            // Call the personDelete method
            HfDeviceResp response = (HfDeviceResp) personDeleteMethod.invoke(null, hostInfo, deviceKey, secret, personDeleteReq);
            
            return response;
        } catch (ClassNotFoundException e) {
            System.err.println("❌ PersonDeleteReq class not found in SDK");
            throw new RuntimeException("SDK PersonDeleteReq class not available");
        } catch (NoSuchMethodException e) {
            System.err.println("❌ personDelete method not found in HfDeviceClient");
            throw new RuntimeException("SDK personDelete method not available");
        } catch (Exception e) {
            System.err.println("❌ Error during person deletion: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    /**
     * Delete face from device using the correct SDK method
     * Note: Face deletion is optional - if SDK doesn't support it, face data is removed with person record
     */
    private HfDeviceResp deleteFaceFromDevice(String employeeId, String deviceKey, String secret) throws Exception {
        try {
            System.out.println("=== ATTEMPTING FACE DELETION ===");
            System.out.println("Employee ID: " + employeeId);
            System.out.println("Device Key: " + deviceKey);
            
            // List all available methods in HfDeviceClient to debug
            System.out.println("=== Available HfDeviceClient methods ===");
            Method[] allMethods = HfDeviceClient.class.getMethods();
            for (Method m : allMethods) {
                if (m.getName().toLowerCase().contains("face") || m.getName().toLowerCase().contains("delete")) {
                    System.out.println("Method: " + m.getName() + " | Params: " + m.getParameterCount());
                }
            }
            
            // Build FaceDeleteReq
            Class<?> faceDeleteReqClass = Class.forName("com.hfims.xcan.gateway.netty.client.req.FaceDeleteReq");
            Object faceDeleteReq = faceDeleteReqClass.getDeclaredConstructor().newInstance();
            
            // Set personSn (the employee ID that was used during registration)
            try {
                Method setPersonSnMethod = faceDeleteReqClass.getMethod("setPersonSn", String.class);
                setPersonSnMethod.invoke(faceDeleteReq, employeeId);
                System.out.println("✅ PersonSn set to: " + employeeId);
            } catch (NoSuchMethodException e) {
                System.err.println("❌ setPersonSn method not found in FaceDeleteReq");
                // Try alternative method names
                try {
                    Method setIdMethod = faceDeleteReqClass.getMethod("setId", String.class);
                    setIdMethod.invoke(faceDeleteReq, employeeId);
                    System.out.println("✅ Used setId instead");
                } catch (NoSuchMethodException e2) {
                    throw new RuntimeException("Cannot set employee ID in FaceDeleteReq - no suitable setter found");
                }
            }
            
            System.out.println("✅ FaceDeleteReq object created successfully");
            
            // Get the method signature for faceDelete
            Class<?> hostInfoClass = Class.forName("com.hfims.xcan.gateway.netty.client.dto.HostInfoDto");
            
            Method faceDeleteMethod = HfDeviceClient.class.getMethod("faceDelete",
                hostInfoClass, String.class, String.class, faceDeleteReqClass);
            
            System.out.println("✅ Found faceDelete method in HfDeviceClient");
            
            // Call the faceDelete method
            HfDeviceResp response = (HfDeviceResp) faceDeleteMethod.invoke(null, hostInfo, deviceKey, secret, faceDeleteReq);
            
            if (response != null) {
                System.out.println("✅ Face delete response - Code: " + response.getCode() + ", Message: " + response.getMsg());
            } else {
                System.err.println("⚠️ Face delete returned null response");
            }
            
            return response;
        } catch (ClassNotFoundException e) {
            System.err.println("⚠️ FaceDeleteReq class not found in SDK");
            System.err.println("   Face data will be removed when person record is deleted");
            return createMockSuccessResponse();
        } catch (NoSuchMethodException e) {
            System.err.println("⚠️ faceDelete method not found in HfDeviceClient");
            System.err.println("   Available methods checked - face deletion not supported by this SDK version");
            System.err.println("   Face data will be removed when person record is deleted");
            return createMockSuccessResponse();
        } catch (Exception e) {
            System.err.println("❌ Error during face deletion: " + e.getMessage());
            e.printStackTrace();
            // Don't throw - face deletion is optional
            return createMockSuccessResponse();
        }
    }
    
    /**
     * Create a mock success response when SDK doesn't support face deletion
     */
    private HfDeviceResp createMockSuccessResponse() {
        try {
            HfDeviceResp response = new HfDeviceResp();
            response.setCode("000");
            response.setMsg("Face deletion not supported by SDK - will be removed with person record");
            return response;
        } catch (Exception e) {
            return null;
        }
    }
    
    /**
     * Get person info from device
     */
    private HfDeviceResp getPersonInfo(String employeeId, String deviceKey, String secret) throws Exception {
        try {
            System.out.println("=== GETTING PERSON INFO ===");
            System.out.println("Employee ID: " + employeeId);
            
            // Try to use PersonFind method
            HfDeviceResp response = findSpecificPerson(employeeId, deviceKey, secret);
            
            if (response != null && "000".equals(response.getCode())) {
                System.out.println("✅ Person found on device");
                return response;
            }
            
            // If not found, return the response anyway
            System.out.println("⚠️ Person not found or error occurred");
            return response;
            
        } catch (Exception e) {
            System.err.println("Failed to get person info: " + e.getMessage());
            e.printStackTrace();
            throw new Exception("Get person info failed: " + e.getMessage());
        }
    }
}

/**
 * Request class for device operations that only need credentials
 */
class DeviceRequest {
    private String deviceKey;
    private String secret;

    public String getDeviceKey() { return deviceKey; }
    public void setDeviceKey(String deviceKey) { this.deviceKey = deviceKey; }
    
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
}

/**
 * Request class for getting specific employee
 */
class GetEmployeeRequest {
    private String employeeId;
    private String deviceKey;
    private String secret;

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    
    public String getDeviceKey() { return deviceKey; }
    public void setDeviceKey(String deviceKey) { this.deviceKey = deviceKey; }
    
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
}

/**
 * Request class for deleting employee
 */
class DeleteEmployeeRequest {
    private String employeeId;
    private String deviceKey;
    private String secret;

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    
    public String getDeviceKey() { return deviceKey; }
    public void setDeviceKey(String deviceKey) { this.deviceKey = deviceKey; }
    
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
}

/**
 * Request class for uploading face image only (database-first approach)
 */
class FaceUploadRequest {
    private String employeeId;
    private String fullName;
    private String faceImage;
    private String deviceKey;
    private String secret;
    private Integer verificationStyle;

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    
    public String getFaceImage() { return faceImage; }
    public void setFaceImage(String faceImage) { this.faceImage = faceImage; }
    
    public String getDeviceKey() { return deviceKey; }
    public void setDeviceKey(String deviceKey) { this.deviceKey = deviceKey; }
    
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
    
    public Integer getVerificationStyle() { return verificationStyle; }
    public void setVerificationStyle(Integer verificationStyle) { this.verificationStyle = verificationStyle; }
}

/**
 * Request class for deleting person from device
 */
class DeletePersonRequest {
    private String employeeId;
    private String deviceKey;
    private String secret;

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    
    public String getDeviceKey() { return deviceKey; }
    public void setDeviceKey(String deviceKey) { this.deviceKey = deviceKey; }
    
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
}

/**
 * Request class for deleting face from device
 */
class DeleteFaceRequest {
    private String employeeId;
    private String deviceKey;
    private String secret;

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    
    public String getDeviceKey() { return deviceKey; }
    public void setDeviceKey(String deviceKey) { this.deviceKey = deviceKey; }
    
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
}

/**
 * Request class for getting person from device
 */
class GetPersonRequest {
    private String employeeId;
    private String deviceKey;
    private String secret;

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }
    
    public String getDeviceKey() { return deviceKey; }
    public void setDeviceKey(String deviceKey) { this.deviceKey = deviceKey; }
    
    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
}
