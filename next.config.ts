const configuredBase = process.env.PAGES_BASE_PATH ?? "";
const base = configuredBase === "/" ? "" : configuredBase;
export default {
  output: "export",
  assetPrefix: base,
  env: { NEXT_PUBLIC_BASE_PATH: base },
};
