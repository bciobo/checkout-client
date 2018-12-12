const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');

console.log(path.resolve(__dirname, 'src'));
const config = {
    mode: (process.env.NODE_ENV === "production") ? 'production' : 'development',
    devtool: (process.env.NODE_ENV === "production") ? false : 'eval-source-map',
    entry: {
        checkout: path.resolve(__dirname, 'src/checkout.js'),
        utilities: path.resolve(__dirname, 'src/payment_utilities.js'),
        store: path.resolve(__dirname, 'src/store.js'),
    },
    output: {
        filename: 'bundle.js',
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
        // new HtmlWebpackPlugin({
        //     template: 'src/index.html',
        //     options: {
        //         favicon: 'src/favicon.ico'
        //     }
        // }),
        new webpack.HotModuleReplacementPlugin(),
        new CleanWebpackPlugin(['dist']),
    ],
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        port: 7001,
        hot: true
    }
};

module.exports = config;
