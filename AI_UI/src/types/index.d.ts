// Type definitions for missing modules

declare module 'file-saver' {
  export function saveAs(data: Blob | string, filename?: string, options?: { autoBom?: boolean }): void;
}

declare module 'pdfmake/build/pdfmake' {
  const pdfMake: any;
  export = pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: {
    pdfMake: {
      vfs: any;
    };
  };
  export = pdfFonts;
} 