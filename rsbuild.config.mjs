import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginVue2 } from "@rsbuild/plugin-vue2";
import TestPlugin from "./test-plugin";

const { publicVars } = loadEnv({ prefixes: ["VUE_APP_"] });

export default defineConfig({
  output: {},
  source: {
    alias: {
      "@": "./src",
    },
    entry: {
      index: "./src/main.js",
    },
    include: [
      /[\\/]node_modules[\\/]iview[\\/]/,
      /[\\/]node_modules[\\/]vue-echarts[\\/]/,
      /[\\/]node_modules[\\/]resize-detector[\\/]/,
      /[\\/]node_modules[\\/]sm-crypto[\\/]/,
    ],
    define: publicVars,
  },
  plugins: [pluginVue2()],
  html: {
    template: "./public/index.html",
  },
  dev: {
    progressBar: true,
  },
  tools: {
    bundlerChain: (chain, { CHAIN_ID }) => {
      chain.module
        .rule("style-resources-loader")
        .test(/\.less$/)
        .oneOf(CHAIN_ID.RULE.LESS)
        .before(CHAIN_ID.RULE.LESS)
        .use("style-resources-loader")
        .loader("style-resources-loader")
        .options({
          patterns: ["./src/theme/theme.less"],
        });

      chain.module
        .rule(CHAIN_ID.RULE.LESS)
        .use(CHAIN_ID.USE.LESS)
        .tap((options) => {
          options.lessOptions.math = "always";
          return options;
        });
    },
    rspack: {
      plugins: [new TestPlugin()],
    },
  },
});
