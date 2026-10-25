declare module '*.css' {
  const content: { [classNames: string]: string };
  export default content;
}

declare module '*.module.less' {
  const content: { [classNames: string]: string };
  export default content;
}

declare module '*.png' {
  const src: string;
  export default src;
}
