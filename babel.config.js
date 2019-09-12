module.exports = api => {
    api.cache(false);
    return {
        presets: [
            ['@babel/preset-env', {"useBuiltIns": "usage"}]
        ],
        plugins: [
            "@babel/plugin-proposal-class-properties",
            "@babel/plugin-transform-regenerator",
            "@babel/plugin-transform-object-assign",
        ]
    }
};
