declare module '*.html?raw' {
  const content: string;
  export default content;
}

declare module '*.tsx?raw' {
  const content: string;
  export default content;
}

declare module '*.ts?raw' {
  const content: string;
  export default content;
}

declare module '*.wasm?url' {
  const url: string;
  export default url;
}
