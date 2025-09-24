module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            services: "./src/services",
            screens: "./src/screens",
            components: "./src/components",
            navigation: "./src/navigation",
          },
        },
      ],
      // 👇 must be last
      "react-native-reanimated/plugin",
    ],
  };
};
