const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force Metro to not use Watchman for this project if it's failing
config.resolver.useWatchman = false;

module.exports = config;
