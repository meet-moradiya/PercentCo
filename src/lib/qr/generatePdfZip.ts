import JSZip from "jszip";
import { generateTablePdf, PdfTheme } from "./generatePdf";

export const generatePdfZip = async (
  tables: number[],
  baseUrl: string,
  message: string,
  theme: PdfTheme = "dark"
) => {
  const zip = new JSZip();

  for (const table of tables) {
    const pdfBlob = await generateTablePdf(table, baseUrl, message, theme);
    zip.file(`table-${table}.pdf`, pdfBlob);
  }

  return zip.generateAsync({ type: "blob" });
};