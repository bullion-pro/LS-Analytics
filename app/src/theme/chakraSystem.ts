import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

/**
 * Chakra is used narrowly here — only for behavioral primitives (Popover, Menu,
 * Dialog, Tabs, focus/keyboard handling). Visual surface is bespoke Tailwind,
 * so this config only carries typography tokens, not a component theme.
 */
const customConfig = defineConfig({
  theme: {
    tokens: {
      fonts: {
        body: { value: `'Outfit', system-ui, -apple-system, sans-serif` },
        heading: { value: `'Outfit', system-ui, -apple-system, sans-serif` },
      },
    },
  },
  globalCss: {
    "*": { fontFamily: "inherit" },
  },
});

export const chakraSystem = createSystem(defaultConfig, customConfig);
