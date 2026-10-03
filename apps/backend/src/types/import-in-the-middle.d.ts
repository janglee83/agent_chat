// import-in-the-middle ships register-hooks.d.ts but no "exports" map, so TypeScript cannot
// pair it with the .mjs entry under NodeNext resolution. Mirrors register-hooks.d.ts (v3.5).
declare module 'import-in-the-middle/register-hooks.mjs' {
  export interface RegisterHooksOptions {
    include?: (RegExp | string)[];
    exclude?: (RegExp | string)[];
    disableCjsSourceStripping?: boolean;
  }
  export function register(options?: RegisterHooksOptions): void;
  export function supportsSyncHooks(): boolean;
}
