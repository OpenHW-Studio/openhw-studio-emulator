/// <reference types="vite/client" />

// Allow importing files with ?raw suffix (Vite raw imports)
declare module '*.html?raw' {
  const content: string;
  export default content;
}
