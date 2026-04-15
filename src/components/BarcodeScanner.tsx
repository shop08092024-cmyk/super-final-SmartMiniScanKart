import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Zap } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  overlayDialog?: boolean; // when true, renders above dialogs (z-[200])
}

const BarcodeScanner = ({ onScan, onClose, overlayDialog = false }: BarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const hasScannedRef = useRef(false);

  // ── Accuracy: track recent scan results and only accept when same code seen N times ──
  const recentScans = useRef<string[]>([]);
  const CONFIRM_COUNT = 2; // same barcode must appear at least 2 times consecutively
  const HISTORY_WINDOW = 6; // within the last 6 decode attempts

  const [error, setError] = useState("");
  const [scanStatus, setScanStatus] = useState<"scanning" | "detected" | "confirmed">("scanning");
  const [detectedCode, setDetectedCode] = useState("");

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    const scannerId = "barcode-scanner-region";
    let retryTimer: ReturnType<typeof setTimeout>;
    let startTimer: ReturnType<typeof setTimeout>;

    const startWithId = (cameraId: string, scanner: Html5Qrcode, fallbackId?: string) => {
      scanner
        .start(
          { deviceId: { exact: cameraId } },
          {
            fps: 20,               // higher fps = more decode attempts = faster confirmation
            qrbox: { width: 280, height: 160 },
            videoConstraints: {
              deviceId: { exact: cameraId },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30, min: 15 },
              focusMode: "continuous", // auto-focus helps accuracy
            },
          },
          (decodedText) => {
            if (hasScannedRef.current) return;

            // ── Confirmation logic: push into rolling window ──
            recentScans.current.push(decodedText);
            if (recentScans.current.length > HISTORY_WINDOW) {
              recentScans.current.shift();
            }

            // Count how many of the last N are the same code
            const countForCode = recentScans.current.filter(c => c === decodedText).length;

            if (countForCode === 1) {
              // First sight — show "detected" feedback
              setDetectedCode(decodedText);
              setScanStatus("detected");
            }

            if (countForCode >= CONFIRM_COUNT) {
              // Confirmed — accept the scan
              hasScannedRef.current = true;
              setScanStatus("confirmed");

              try {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 1400;
                gain.gain.setValueAtTime(0.4, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.18);
              } catch (_) {}

              setTimeout(() => {
                scanner.stop()
                  .then(() => onScanRef.current(decodedText))
                  .catch(() => onScanRef.current(decodedText));
              }, 200); // small delay so user sees "confirmed" flash
            }
          },
          () => {
            // decode failure — clear detected state if nothing recent
            if (recentScans.current.length > 0) {
              const last = recentScans.current[recentScans.current.length - 1];
              // push an empty "miss" to dilute the window
              recentScans.current.push("");
              if (recentScans.current.length > HISTORY_WINDOW) recentScans.current.shift();
              // if recent confirmed code gets diluted, reset UI
              const countForLast = recentScans.current.filter(c => c === last).length;
              if (countForLast < CONFIRM_COUNT) setScanStatus("scanning");
            }
          }
        )
        .catch((err) => {
          console.error("Scanner start error:", err);
          if (fallbackId) {
            retryTimer = setTimeout(() => startWithId(fallbackId, scanner, undefined), 600);
          } else {
            setError("Camera access denied. Please allow camera permissions in your browser settings.");
          }
        });
    };

    startTimer = setTimeout(async () => {
      const el = document.getElementById(scannerId);
      if (!el) { setError("Scanner UI failed to render. Please close and try again."); return; }

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) { setError("No camera found on this device."); return; }

        const backCamera =
          devices.find(d => /back|rear|environment/i.test(d.label)) ||
          devices[devices.length - 1];

        const frontCamera = devices[0];
        const fallbackId = backCamera.id !== frontCamera.id ? frontCamera.id : undefined;

        startWithId(backCamera.id, scanner, fallbackId);
      } catch (err) {
        console.error("getCameras error:", err);
        setError("Could not access camera. Please allow camera permissions.");
      }
    }, 300);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(retryTimer);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zClass = overlayDialog ? "z-[200]" : "z-50";

  return (
    <div className={`fixed inset-0 ${zClass} flex flex-col bg-black/95`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <div>
          <h2 className="text-base font-bold text-white">Scan Barcode</h2>
          <p className="text-xs text-white/60">Hold steady — camera auto-confirms</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {/* Viewfinder frame */}
        <div className="relative mb-4 w-full max-w-sm">
          {/* Corner decorations */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute top-0 left-0 h-8 w-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="absolute top-0 right-0 h-8 w-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-white rounded-br-lg" />
            {/* Scan line animation */}
            {scanStatus === "scanning" && (
              <div className="absolute inset-x-4 top-1/2 h-0.5 bg-primary/80 blur-[1px] animate-[scan-line_2s_ease-in-out_infinite]" />
            )}
          </div>
          <div
            id="barcode-scanner-region"
            className="w-full overflow-hidden rounded-xl"
          />
        </div>

        {/* Status indicators */}
        {!error && (
          <div className="mt-2 flex flex-col items-center gap-2">
            {scanStatus === "scanning" && (
              <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-white">Scanning…</span>
              </div>
            )}
            {scanStatus === "detected" && (
              <div className="flex items-center gap-2 rounded-full bg-yellow-500/20 border border-yellow-400/40 px-4 py-2">
                <Zap className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-300">Code detected — hold still…</span>
              </div>
            )}
            {scanStatus === "confirmed" && (
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-4 py-2 animate-bounce">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">✓ Confirmed!</span>
              </div>
            )}
            {detectedCode && scanStatus !== "scanning" && (
              <p className="text-[11px] text-white/40 font-mono">{detectedCode}</p>
            )}
            <p className="text-xs text-white/40 text-center mt-1">
              Supports EAN-13, UPC-A, Code-128, QR
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/20 border border-destructive/40 px-4 py-3 text-center max-w-xs">
            <p className="text-sm font-semibold text-destructive-foreground text-white">{error}</p>
            <button onClick={onClose} className="mt-2 text-xs text-white/60 hover:text-white underline">
              Close scanner
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;
