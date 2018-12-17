const CleanWebpackPlugin = require('clean-webpack-plugin');
const path = require('path');

const config = {
    mode: (process.env.NODE_ENV === "production") ? 'production' : 'development',
    devtool: (process.env.NODE_ENV === "production") ? false : 'eval-source-map',
    watch: (process.env.NODE_ENV === "development"),
    entry: {
        'bundle.js': [
            path.resolve(__dirname, 'src/checkout.js'),
            path.resolve(__dirname, 'src/payment_utilities.js'),
            path.resolve(__dirname, 'src/store.js'),]
    },
    output: {
        filename: '[name]',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules:
            [
                {
                    test: /\.scss$/,
                    use: [
                        {
                            loader: "style-loader"
                        },
                        {
                            loader: "css-loader",
                            options: {sourceMap: true}
                        }, {
                            loader: "sass-loader",
                            options: {sourceMap: true}
                        }
                    ]
                },
                {
                    test: /\.m?js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                    }
                },
                {
                    test: /\.(png|svg|jpg|gif|ico)$/,
                    use: ['file-loader']
                }
            ]
    },
    plugins: [
        // new HtmlWebpackPlugin()
        new CleanWebpackPlugin(['dist']),
    ],
};

module.exports = config;
