module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            ['@babel/plugin-transform-class-properties', { loose: true }],
            ['@babel/plugin-transform-private-methods', { loose: true }],

            // --- REMOVED THE INVALID LINE BELOW ---
            // ['@babel/plugin-transform-private-field-has-instance', { loose: true }],

            ['babel-plugin-module-resolver', {
                extensions: ['.js', '.jsx', '.ts', '.tsx'],
            }],
        ],
    };
};