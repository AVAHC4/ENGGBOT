declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  type PdfParse = (data: Buffer | Uint8Array, options?: any) => Promise<PdfParseResult>;

  const pdfParse: PdfParse;
  export default pdfParse;
}

