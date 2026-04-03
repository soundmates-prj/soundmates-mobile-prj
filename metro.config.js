// Learn more https://docs.expo.dev/guides/customize-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Limit to 1 worker to avoid jest-worker spawn crash on Node.js v24
// (jest-worker uses child_process.fork() which is unreliable on Node v24 + Windows)
config.maxWorkers = 1;

module.exports = config;
