declare module 'blob-stream' {
  interface BlobStream {
    on(event: string, callback: Function): void;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    toBlob(type?: string): Blob;
  }

  function blobStream(): BlobStream;
  
  export = blobStream;
} 