module.exports = api => {
    api.cache(false)
    return {
        presets: ['@babel/preset-env'],
        plugins: ["@babel/plugin-proposal-class-properties"]
    }
}
