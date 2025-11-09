import { useState, useEffect, useRef } from "react";
import { os } from "../os-core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Camera, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Ensure Pictures folder exists
  useEffect(() => {
    if (!os.fs.exists("Pictures")) {
      try {
        os.fs.createFolder("Pictures", "");
      } catch (e) {
        // Folder might already exist, ignore
      }
    }
  }, []);

  // Start camera stream
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setPermissionDenied(false);
      
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      // Clear video source before setting new one
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        // Set srcObject first
        videoRef.current.srcObject = stream;
        
        // Wait for metadata to load before playing
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log("Video is playing");
                  setIsStreaming(true);
                })
                .catch((err) => {
                  console.error("Error playing video:", err);
                  // Only set error if it's not the interrupted play error
                  if (err.name !== "AbortError" && err.message !== "The play() request was interrupted by a new load request.") {
                    setError(`Video playback error: ${err.message}`);
                  }
                });
            }
          }
        };
      }
    } catch (err) {
      const error = err as Error;
      setIsStreaming(false);
      
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setPermissionDenied(true);
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setError("No camera found. Please connect a camera device.");
      } else {
        setError(`Failed to access camera: ${error.message}`);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Failed to capture photo");
      return;
    }
    
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Failed to process photo");
        return;
      }
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        
        // Save to Pictures folder
        const timestamp = Date.now();
        const filename = `photo-${timestamp}.png`;
        
        // Store base64 data as content
        os.fs.writeFile(filename, base64data, "Pictures");
        
        toast.success(`Photo saved as ${filename}`);
      };
      reader.onerror = () => {
        toast.error("Failed to read photo data");
      };
      reader.readAsDataURL(blob);
    }, "image/png");
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Camera className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Camera</h1>
            <p className="text-sm text-muted-foreground">
              Take photos with your webcam
            </p>
          </div>
        </div>

        {permissionDenied && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Camera Permission Required</AlertTitle>
            <AlertDescription>
              Please allow camera access in your browser settings and refresh the page.
              <br />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={startCamera}
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {error && !permissionDenied && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              <br />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={startCamera}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="relative bg-black rounded-lg overflow-hidden mb-6" style={{ minHeight: '400px', aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ 
              transform: 'scaleX(-1)',
              display: isStreaming ? 'block' : 'none',
              minHeight: '400px'
            }}
            onError={(e) => {
              console.error("Video error:", e);
              const target = e.target as HTMLVideoElement;
              console.error("Video error details:", {
                error: target.error,
                networkState: target.networkState,
                readyState: target.readyState
              });
              // Only set error if it's a real error, not the interrupted play error
              if (target.error && target.error.code !== MediaError.MEDIA_ERR_ABORTED) {
                setError("Video playback error");
                setIsStreaming(false);
              }
            }}
          />
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-500">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p>Camera not available</p>
                {streamRef.current && (
                  <p className="text-xs mt-2">Stream active but not displaying</p>
                )}
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-center gap-3">
          {isStreaming ? (
            <>
              <Button
                onClick={capturePhoto}
                size="sm"
                className="h-10 px-5 rounded-full bg-black text-white dark:bg-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Capture
              </Button>
              
              <Button
                onClick={stopCamera}
                size="sm"
                className="h-10 px-5 rounded-full bg-black text-white dark:bg-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Stop
              </Button>
            </>
          ) : (
            <Button
              onClick={startCamera}
              size="sm"
              className="h-10 px-5 rounded-full bg-black text-white dark:bg-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Start Camera
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

