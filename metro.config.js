const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const originalGetPolyfills = config.serializer?.getPolyfills;
config.serializer = {
    ...config.serializer,
    getPolyfills: (ctx) => {
        const existing = originalGetPolyfills ? originalGetPolyfills(ctx) : [];
        return [
            path.resolve(__dirname, './polyfills/dom-exception.js'),
            ...existing,
        ];
    },
};

module.exports = config;