const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');


const config = {
    mode: (process.env.NODE_ENV === "production") ? 'production' : 'development',
    devtool: (process.env.NODE_ENV === "production") ? false : 'eval-source-map',
    entry: path.resolve(__dirname, 'src'),
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
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                },
                {
                    test: /\.(png|svg|jpg|gif|ico)$/,
                    use: ['file-loader']
                }
            ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            options: {
                favicon: 'src/favicon.ico'
            }
        }),
        new webpack.HotModuleReplacementPlugin(),
        new CleanWebpackPlugin(['dist']),
    ],
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        port: 9900,
        hot: true
    }
};

module.exports = config;
