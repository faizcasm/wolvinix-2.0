/**
 * Root ESLint entry point so `npx eslint apps/...` works from the repo root.
 *
 * The workspace configs under `apps/*` remain the source of truth (they are
 * what `npm run lint --workspace ...` uses). This file only re-scopes their
 * rules to the matching directory so ad-hoc root-level runs behave the same.
 */
const web = (await import("./apps/web/eslint.config.js")).default;
const api = (await import("./apps/api/eslint.config.js")).default;
const root = import.meta.dirname;

/**
 * Force a flat-config block to apply only to one directory, and pin the
 * TypeScript parser to that workspace's tsconfig (it would otherwise find
 * two candidates and refuse to guess).
 */
function scopeTo(dir) {
  return (config) => {
    if (config.ignores) {
      return { ...config, ignores: config.ignores.map((i) => `${dir}/${i}`) };
    }

    const files = config.files
      ? config.files.map((f) => `${dir}/${f}`)
      : [`${dir}/**/*.{js,jsx,ts,tsx}`];

    return {
      ...config,
      files,
      languageOptions: {
        ...config.languageOptions,
        parserOptions: {
          ...config.languageOptions?.parserOptions,
          tsconfigRootDir: `${root}/${dir}`,
        },
      },
    };
  };
}

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "**/.vite/**", "**/*.d.ts"],
  },
  ...web.map(scopeTo("apps/web")),
  ...api.map(scopeTo("apps/api")),
];
