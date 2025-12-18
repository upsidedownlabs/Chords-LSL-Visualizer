declare module '@iarna/toml' {
  export function parse(str: string): any;
  export function stringify(obj: any): string;
}