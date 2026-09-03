import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

/**
 * Standard Code 128 (Subset B) 107-Pattern Table (ISO/IEC 15417)
 * Each pattern consists of alternating widths of 3 bars and 3 spaces (6 elements),
 * except Stop (index 106) which has 4 bars and 3 spaces (7 elements).
 */
export const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"                                // 100-106 (103: Start A, 104: Start B, 105: Start C, 106: Stop)
];

/**
 * Generate standard Code 128 (Subset B) pattern string
 * Output is a sequence of module widths alternating between Bar and Space.
 */
export function getCode128Pattern(text: string): string {
  const clean = (text || "000000").trim();
  const START_B = 104;
  const STOP = 106;
  let checksum = START_B;
  const codes: number[] = [START_B];

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i) - 32;
    const code = charCode >= 0 && charCode <= 95 ? charCode : 0;
    codes.push(code);
    checksum += code * (i + 1);
  }

  codes.push(checksum % 103);
  codes.push(STOP);

  let pattern = "";
  codes.forEach(code => {
    pattern += CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
  });
  return pattern;
}

/**
 * Generate standard 13-digit EAN-13 barcode with prefix 899 (Indonesia) and valid check digit
 * Universally recognized by ALL phone cameras, tablets, and 1D/2D hardware scanners.
 */
export function generateValidEan13(): string {
  const random9 = Math.floor(100000000 + Math.random() * 900000000).toString();
  const digits12 = '899' + random9;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits12[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return digits12 + checkDigit;
}

export interface BarcodeGraphicProps {
  value: string;
  className?: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
  fontSize?: number;
  fontFamily?: string;
  margin?: number;
  quietZone?: number;
  preserveRatio?: boolean;
  format?: 'CODE128' | 'EAN13' | 'EAN8' | 'UPC' | 'CODE39' | 'ITF' | 'QR' | 'CODABAR' | string;
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * 🏷️ Industry-Standard Barcode & QR Code Renderer using JsBarcode
 * - Generates 100% scanner-compliant Code 128, EAN-13, EAN-8, UPC, Code 39, ITF, Codabar, & QR
 * - Sharp crispEdges rendering without clipping or distortion
 * - Solid white background to prevent dark-theme or thermal bleed
 */
export const BarcodeGraphic: React.FC<BarcodeGraphicProps> = ({
  value,
  className = "h-12 w-full",
  height = 50,
  width = 2,
  displayValue = false,
  fontSize = 12,
  fontFamily = 'monospace',
  margin = 8,
  format = 'CODE128',
  textAlign = 'center',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cleanValue = (value || "000000").trim();
  const upperFormat = (format || 'CODE128').toUpperCase();

  useEffect(() => {
    if (svgRef.current && cleanValue) {
      try {
        // Clear previous children
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }

        if (upperFormat === 'QR') {
          // Render high-density 2D QR Code SVG
          renderQrCodeSvg(svgRef.current, cleanValue, height || 60);
          return;
        }

        // Determine appropriate JsBarcode format & sanitize value if needed
        let targetFormat = 'CODE128';
        let renderValue = cleanValue;

        if (upperFormat === 'EAN13') {
          // Must be 12 or 13 digits
          const digitsOnly = cleanValue.replace(/\D/g, '');
          if (digitsOnly.length === 12 || digitsOnly.length === 13) {
            targetFormat = 'EAN13';
            renderValue = digitsOnly.slice(0, 13);
          } else if (digitsOnly.length > 0) {
            // Pad or generate valid EAN-13
            targetFormat = 'EAN13';
            const padded = (digitsOnly + '000000000000').slice(0, 12);
            let sum = 0;
            for (let i = 0; i < 12; i++) {
              sum += parseInt(padded[i], 10) * (i % 2 === 0 ? 1 : 3);
            }
            const check = (10 - (sum % 10)) % 10;
            renderValue = padded + check;
          } else {
            targetFormat = 'CODE128';
          }
        } else if (upperFormat === 'EAN8') {
          const digitsOnly = cleanValue.replace(/\D/g, '');
          if (digitsOnly.length === 7 || digitsOnly.length === 8) {
            targetFormat = 'EAN8';
            renderValue = digitsOnly.slice(0, 8);
          } else {
            targetFormat = 'CODE128';
          }
        } else if (upperFormat === 'UPC') {
          const digitsOnly = cleanValue.replace(/\D/g, '');
          if (digitsOnly.length === 11 || digitsOnly.length === 12) {
            targetFormat = 'UPC';
            renderValue = digitsOnly.slice(0, 12);
          } else {
            targetFormat = 'CODE128';
          }
        } else if (upperFormat === 'CODE39') {
          targetFormat = 'CODE39';
          // Code 39 accepts uppercase alphanumeric and - . $ / + % SPACE
          renderValue = cleanValue.toUpperCase().replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '');
          if (!renderValue) renderValue = '000000';
        } else if (upperFormat === 'ITF' || upperFormat === 'ITF14') {
          const digitsOnly = cleanValue.replace(/\D/g, '');
          targetFormat = 'ITF';
          renderValue = digitsOnly.length % 2 === 0 ? digitsOnly : '0' + digitsOnly;
          if (!renderValue) renderValue = '000000';
        } else if (upperFormat === 'CODABAR') {
          targetFormat = 'codabar';
          renderValue = cleanValue.toUpperCase();
        } else {
          targetFormat = 'CODE128';
        }

        JsBarcode(svgRef.current, renderValue, {
          format: targetFormat,
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          font: fontFamily || 'monospace',
          textAlign: textAlign || 'center',
          margin: margin,
          background: "#ffffff",
          lineColor: "#000000",
          valid: (valid) => {
            if (!valid) {
              console.warn(`JsBarcode fallback to CODE128 for value: ${cleanValue}`);
              if (svgRef.current && targetFormat !== 'CODE128') {
                try {
                  JsBarcode(svgRef.current, cleanValue, {
                    format: 'CODE128',
                    width: width,
                    height: height,
                    displayValue: displayValue,
                    fontSize: fontSize,
                    font: fontFamily || 'monospace',
                    margin: margin,
                    background: '#ffffff',
                    lineColor: '#000000',
                  });
                } catch (_) {}
              }
            }
          }
        });

        // Ensure SVG preserves aspect ratio and centers cleanly according to textAlign
        if (svgRef.current) {
          svgRef.current.setAttribute(
            'preserveAspectRatio',
            textAlign === 'left' ? 'xMinYMid meet' : textAlign === 'right' ? 'xMaxYMid meet' : 'xMidYMid meet'
          );
        }
      } catch (err) {
        console.error("JsBarcode render error:", err);
      }
    }
  }, [cleanValue, width, height, displayValue, fontSize, fontFamily, margin, upperFormat, textAlign]);

  return (
    <div className={`flex items-center ${textAlign === 'left' ? 'justify-start' : textAlign === 'right' ? 'justify-end' : 'justify-center'} w-full h-full bg-white p-0 overflow-hidden`}>
      <svg
        ref={svgRef}
        className={className}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: '100%',
          display: 'block',
          margin: textAlign === 'left' ? '0 auto 0 0' : textAlign === 'right' ? '0 0 0 auto' : '0 auto',
          backgroundColor: '#ffffff',
        }}
      />
    </div>
  );
};

/**
 * ISO/IEC 18004 Compliant QR Code SVG Renderer using 'qrcode' library
 * Generates real, scannable QR codes (not decorative patterns)
 */
function renderQrCodeSvg(svg: SVGSVGElement, text: string, size: number = 60) {
  const clean = text || '000000';

  QRCode.toString(clean, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  }).then((svgString: string) => {
    // Parse the generated SVG and extract path/rect elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const generatedSvg = doc.querySelector('svg');

    if (generatedSvg) {
      // Copy viewBox and dimensions from generated SVG
      const viewBox = generatedSvg.getAttribute('viewBox');
      if (viewBox) svg.setAttribute('viewBox', viewBox);
      svg.setAttribute('width', `${size}`);
      svg.setAttribute('height', `${size}`);

      // Copy all child elements (paths/rects) from generated SVG
      Array.from(generatedSvg.childNodes).forEach(child => {
        svg.appendChild(child.cloneNode(true));
      });
    }
  }).catch((err: Error) => {
    console.warn('QR Code generation failed, rendering fallback:', err);
    // Fallback: render a simple placeholder
    svg.setAttribute('viewBox', '0 0 21 21');
    svg.setAttribute('width', `${size}`);
    svg.setAttribute('height', `${size}`);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '21');
    rect.setAttribute('height', '21');
    rect.setAttribute('fill', '#f0f0f0');
    svg.appendChild(rect);
    const errText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    errText.setAttribute('x', '10.5');
    errText.setAttribute('y', '11');
    errText.setAttribute('text-anchor', 'middle');
    errText.setAttribute('font-size', '3');
    errText.setAttribute('fill', '#999');
    errText.textContent = 'QR Error';
    svg.appendChild(errText);
  });
}

