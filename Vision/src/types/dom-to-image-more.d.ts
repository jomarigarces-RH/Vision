declare module 'dom-to-image-more' {
  interface Options {
    bgcolor?: string;
    width?: number;
    height?: number;
    style?: Record<string, string>;
    quality?: number;
    imagePlaceholder?: string;
    cacheBust?: boolean;
    useCredentials?: boolean;
    scale?: number;
  }
  function toPng(node: HTMLElement, options?: Options): Promise<string>;
  function toJpeg(node: HTMLElement, options?: Options): Promise<string>;
  function toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
  function toPixelData(node: HTMLElement, options?: Options): Promise<Uint8ClampedArray>;
  function toSvg(node: HTMLElement, options?: Options): Promise<string>;
  export default { toPng, toJpeg, toBlob, toPixelData, toSvg };
}
