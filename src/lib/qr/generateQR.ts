import QRCode from "qrcode";

export const generateQrSvg = async (url: string) => {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "H",
  });
};

export const generateQrPng = async (url: string, size = 1200) => {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "H",
  });
};
