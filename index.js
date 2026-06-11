// index.js (Root folder)

// Polyfill for React Native 0.81 Compatibility
if (typeof global.DOMException === 'undefined') {
    global.DOMException = class DOMException extends Error {
        constructor(message, name) {
            super(message);
            this.name = name;
        }
    };
}

// This line loads your app and finds app/index.tsx
import 'expo-router/entry';
