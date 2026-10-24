import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface CampusQrProps {
  payload: string;
  code: string;
  name: string;
  size?: number;
}

export default function CampusQr({ payload, code, name, size = 220 }: CampusQrProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!payload) return;
    QRCode.toDataURL(payload, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#075d5d',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [payload, size]);

  const copyLink = () => {
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `CampusConnect-${code}-QR.png`;
    a.click();
  };

  return (
    <div className="campus-qr-card">
      <div className="qr-image-wrapper" style={{ width: size, height: size }}>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR Code for ${code}`} className="campus-qr-img" />
        ) : (
          <div className="qr-loading-placeholder">Generating Campus QR…</div>
        )}
        <div className="qr-center-emblem">
          <span className="material-symbols-rounded symbol" data-filled={true}>domain</span>
        </div>
      </div>

      <div className="qr-card-info">
        <span className="qr-campus-name">{name}</span>
        <div className="qr-code-pill">
          <span className="qr-pill-label">OFFICIAL ACCESS CODE:</span>
          <strong className="qr-pill-code">{code}</strong>
        </div>
        <p className="qr-instructions">
          Scan with any mobile camera to launch the CampusConnect portal with authorized institutional access.
        </p>
      </div>

      <div className="qr-actions-row">
        <button type="button" className="button secondary compact" onClick={copyLink}>
          <span className="material-symbols-rounded symbol">{copied ? 'check' : 'content_copy'}</span>
          {copied ? 'Link Copied!' : 'Copy Portal Link'}
        </button>
        <button type="button" className="button primary compact" onClick={downloadQr}>
          <span className="material-symbols-rounded symbol">download</span>
          Download QR Pass
        </button>
      </div>
    </div>
  );
}
