module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // babel-preset-expo is hoisted to the workspace root but expo-router stays
      // under apps/mobile/node_modules, so the preset's hasModule('expo-router')
      // check fails and the plugin that inlines EXPO_ROUTER_APP_ROOT is skipped.
      // Register it explicitly here.
      require('babel-preset-expo/build/expo-router-plugin').expoRouterBabelPlugin,
    ],
  };
};
