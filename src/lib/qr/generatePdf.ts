import { jsPDF } from "jspdf";
import { svg2pdf } from "svg2pdf.js";
import { generateQrSvg } from "./generateQR";

export type PdfTheme = "dark" | "light";

interface ThemeColors {
  bg: [number, number, number];
  accent: [number, number, number];
  title: [number, number, number];
  subtitle: [number, number, number];
  muted: [number, number, number];
  qrDark: string;
  qrLight: string;
}

const THEMES: Record<PdfTheme, ThemeColors> = {
  dark: {
    bg: [12, 12, 12],
    accent: [201, 169, 110],
    title: [201, 169, 110],
    subtitle: [235, 235, 235],
    muted: [120, 120, 120],
    qrDark: "#ededed",
    qrLight: "#0c0c0c",
  },
  light: {
    bg: [255, 255, 255],
    accent: [160, 130, 70],
    title: [30, 30, 30],
    subtitle: [60, 60, 60],
    muted: [140, 140, 140],
    qrDark: "#0a0a0a",
    qrLight: "#ffffff",
  },
};

/**
 * Renders multi-language text onto a canvas and returns it as a data URL.
 * Canvas natively supports all Unicode via system fonts (Hindi, Gujarati, etc.)
 */
function renderTextAsImage(
  text: string,
  maxWidthPx: number,
  color: string,
  fontSize: number = 28
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Use system fonts that support Devanagari, Gujarati, etc.
  const fontStack = `${fontSize}px 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Gujarati', system-ui, sans-serif`;
  ctx.font = fontStack;

  // Word-wrap and measure
  const lines: string[] = [];
  const words = text.split(" ");
  let currentLine = "";
  for (const word of words) {
    const test = currentLine ? currentLine + " " + word : word;
    if (ctx.measureText(test).width > maxWidthPx && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.5;
  canvas.width = maxWidthPx + 40;
  canvas.height = Math.max(lines.length * lineHeight + 20, lineHeight + 20);

  // Re-set font after resize
  ctx.font = fontStack;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const cx = canvas.width / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, 10 + i * lineHeight);
  });

  return canvas.toDataURL("image/png");
}

export const generateTablePdf = async (
  tableNumber: number,
  baseUrl: string,
  message: string,
  theme: PdfTheme = "dark"
): Promise<Blob> => {
  const url = `${baseUrl}/order?table=${tableNumber}`;
  const colors = THEMES[theme];

  const qrSvg = await generateQrSvg(url);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pw = doc.internal.pageSize.getWidth(); // 210
  const ph = doc.internal.pageSize.getHeight(); // 297

  // ── Background ──
  doc.setFillColor(...colors.bg);
  doc.rect(0, 0, pw, ph, "F");

  // ── Top accent bar ──
  doc.setFillColor(...colors.accent);
  doc.rect(0, 0, pw, 4, "F");

  // ── Decorative corner accents ──
  const cornerLen = 18;
  const cornerInset = 12;
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.6);
  // Top-left
  doc.line(cornerInset, cornerInset, cornerInset + cornerLen, cornerInset);
  doc.line(cornerInset, cornerInset, cornerInset, cornerInset + cornerLen);
  // Top-right
  doc.line(pw - cornerInset, cornerInset, pw - cornerInset - cornerLen, cornerInset);
  doc.line(pw - cornerInset, cornerInset, pw - cornerInset, cornerInset + cornerLen);
  // Bottom-left
  doc.line(cornerInset, ph - cornerInset, cornerInset + cornerLen, ph - cornerInset);
  doc.line(cornerInset, ph - cornerInset, cornerInset, ph - cornerInset - cornerLen);
  // Bottom-right
  doc.line(pw - cornerInset, ph - cornerInset, pw - cornerInset - cornerLen, ph - cornerInset);
  doc.line(pw - cornerInset, ph - cornerInset, pw - cornerInset, ph - cornerInset - cornerLen);

  // ── Restaurant brand ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...colors.muted);
  doc.text("FINE DINING EXPERIENCE", pw / 2, 28, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(...colors.title);
  doc.text("PercentCo", pw / 2, 42, { align: "center" });

  // ── Decorative line under brand ──
  const lineY = 48;
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.3);
  doc.line(pw / 2 - 30, lineY, pw / 2 - 8, lineY);
  doc.line(pw / 2 + 8, lineY, pw / 2 + 30, lineY);
  // Diamond in center
  const dy = lineY;
  const ds = 2;
  doc.setFillColor(...colors.accent);
  doc.triangle(pw / 2, dy - ds, pw / 2 + ds, dy, pw / 2, dy + ds, "F");
  doc.triangle(pw / 2, dy - ds, pw / 2 - ds, dy, pw / 2, dy + ds, "F");

  // ── Table number ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...colors.muted);
  doc.text("TABLE", pw / 2, 60, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(48);
  doc.setTextColor(...colors.subtitle);
  doc.text(`${tableNumber}`, pw / 2, 78, { align: "center" });

  // ── QR Code (vector via svg2pdf.js) ──
  const qrSize = 90;
  const qrX = pw / 2 - qrSize / 2;
  const qrY = 90;

  // QR background pad
  const qrPad = 6;
  doc.setFillColor(
    ...(theme === "dark" ? [25, 25, 25] as [number, number, number] : [245, 245, 245] as [number, number, number])
  );
  doc.roundedRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 3, 3, "F");

  // Border around QR
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.4);
  doc.roundedRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 3, 3, "S");

  const parser = new DOMParser();
  const svgEl = parser.parseFromString(qrSvg, "image/svg+xml").documentElement;

  await svg2pdf(svgEl, doc, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  // ── "Scan to Order" instruction ──
  const instrY = qrY + qrSize + qrPad + 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...colors.muted);
  doc.text("Scan the QR code above to place your order", pw / 2, instrY, { align: "center" });

  // ── Decorative separator ──
  const sepY = instrY + 10;
  doc.setDrawColor(...colors.accent);
  doc.setLineWidth(0.3);
  doc.line(40, sepY, pw - 40, sepY);

  // ── Custom message (canvas-rendered for multi-language support) ──
  // if (message && message.trim()) {
  //   const textColor = theme === "dark" ? "#d4d4d4" : "#333333";
  //   const textImgDataUrl = renderTextAsImage(message, 600, textColor, 28);

  //   const img = new Image();
  //   await new Promise<void>((resolve) => {
  //     img.onload = () => resolve();
  //     img.src = textImgDataUrl;
  //   });

  //   const imgAspect = img.width / img.height;
  //   const imgWidthMm = 140;
  //   const imgHeightMm = imgWidthMm / imgAspect;
  //   const msgY = sepY + 6;

  //   doc.addImage(textImgDataUrl, "PNG", pw / 2 - imgWidthMm / 2, msgY, imgWidthMm, imgHeightMm);
  // }

  // ── Custom message (vector text) ──
  if (message && message.trim()) {
    const msgY = sepY + 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);

    const textColor: [number, number, number] =
      theme === "dark"
        ? [212, 212, 212]
        : [50, 50, 50];

    doc.setTextColor(...textColor);

    doc.text(message, pw / 2, msgY, {
      align: "center",
      maxWidth: 140,
    });
  }

  // // ── URL at bottom ──
  // doc.setFont("helvetica", "normal");
  // doc.setFontSize(8);
  // doc.setTextColor(...colors.muted);
  // doc.text(url, pw / 2, ph - 18, { align: "center" });

  // ── Bottom accent bar ──
  doc.setFillColor(...colors.accent);
  doc.rect(0, ph - 4, pw, 4, "F");

  return doc.output("blob");
};
