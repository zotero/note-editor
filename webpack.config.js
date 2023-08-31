const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const configDev = {
	name: 'dev',
	mode: 'development',
	devtool: 'source-map',
	entry: {
		editor: ['./src/index.dev.js', './src/stylesheets/main.scss'],
	},
	optimization: {
		minimize: false,
	},
	output: {
		path: path.resolve(__dirname, './build/dev'),
		filename: '[name].js',
		publicPath: '',
		library: {
			name: 'zotero-editor',
			type: 'umd',
			umdNamedDefine: true,
		},
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
			{
				test: /\.s?css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
					},
					{
						loader: 'postcss-loader',
					},
					{
						loader: 'sass-loader',
						options: {
							additionalData: `$platform: 'dev';`
						}
					},
				],
			},
			{
				test: /\.svg$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/icons/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.woff2$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/fonts/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.(ttf|woff)$/,
				type: 'asset/resource',
				generator: {
					emit: false,
				},
			},
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		new HtmlWebpackPlugin({
			template: './html/editor.dev.html',
			filename: './[name].html',
		}),
	],
	devServer: {
		static: {
			directory: path.resolve(__dirname, 'build/'),
			watch: true,
		},
		devMiddleware: {
			writeToDisk: true,
		},
		open: '/dev/editor.html',
		port: 3002,
	},
};

const configWeb = {
	name: 'web',
	mode: 'production',
	devtool: 'source-map',
	entry: {
		editor: ['./src/index.web.js', './src/stylesheets/main.scss'],
	},
	optimization: {
		minimize: true,
		minimizer: [new TerserPlugin({ extractComments: false }), new CssMinimizerPlugin()],
	},
	output: {
		path: path.resolve(__dirname, './build/web'),
		filename: '[name].js',
		publicPath: '',
		library: {
			name: 'zotero-editor',
			type: 'umd',
			umdNamedDefine: true,
		},
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
			{
				test: /\.s?css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
					},
					{
						loader: 'postcss-loader',
					},
					{
						loader: 'sass-loader',
						options: {
							additionalData: `$platform: 'web';`
						}
					},
				],
			},
			{
				test: /\.svg$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/icons/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.woff2$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/fonts/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.(ttf|woff)$/,
				type: 'asset/resource',
				generator: {
					emit: false,
				},
			},
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		new HtmlWebpackPlugin({
			template: './html/editor.web.html',
			filename: './[name].html',
		}),
	],
};

const configZotero = {
	name: 'zotero',
	mode: 'production',
	devtool: false,
	entry: {
		editor: ['./src/index.zotero.js', './src/stylesheets/main.scss'],
	},
	optimization: {
		minimize: true,
		minimizer: [new CssMinimizerPlugin()],
	},
	output: {
		path: path.resolve(__dirname, './build/zotero'),
		filename: '[name].js',
		publicPath: '',
		library: {
			name: 'zotero-editor',
			type: 'umd',
			umdNamedDefine: true,
		},
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							['@babel/preset-env', { useBuiltIns: false }],
						],
					},
				},
			},
			{
				test: /\.s?css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
					},
					{
						loader: 'postcss-loader',
					},
					{
						loader: 'sass-loader',
						options: {
							additionalData: `$platform: 'zotero';`
						}
					},
				],
			},
			{
				test: /\.svg$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/icons/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.woff2$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/fonts/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.(ttf|woff)$/,
				type: 'asset/resource',
				generator: {
					emit: false,
				},
			},
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		new HtmlWebpackPlugin({
			template: './html/editor.zotero.html',
			filename: './[name].html',
		}),
	],
	externals: {
		react: 'React',
		'react-dom': 'ReactDOM',
		'react-intl': 'ReactIntl',
		'prop-types': 'PropTypes',
	},
};

const configIOS = {
	name: 'ios',
	mode: 'production',
	devtool: false,
	entry: {
		editor: ['./src/index.ios.js', './src/stylesheets/main.scss'],
	},
	optimization: {
		minimize: true,
		minimizer: [new TerserPlugin({ extractComments: false }), new CssMinimizerPlugin()],
	},
	output: {
		path: path.resolve(__dirname, './build/ios'),
		filename: '[name].js',
		publicPath: '',
		library: {
			name: 'zotero-editor',
			type: 'umd',
			umdNamedDefine: true,
		},
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
			{
				test: /\.s?css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
					},
					{
						loader: 'postcss-loader',
					},
					{
						loader: 'sass-loader',
						options: {
							additionalData: `$platform: 'ios';`
						}
					},
				],
			},
			{
				test: /\.svg$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/icons/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.woff2$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/fonts/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.(ttf|woff)$/,
				type: 'asset/resource',
				generator: {
					emit: false,
				},
			},
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		new HtmlWebpackPlugin({
			template: './html/editor.ios.html',
			filename: './[name].html',
		}),
	],
};

const configAndroid = {
	name: 'android',
	mode: 'production',
	devtool: false,
	entry: {
		editor: ['./src/index.android.js', './src/stylesheets/main.scss'],
	},
	optimization: {
		minimize: true,
		minimizer: [new TerserPlugin({ extractComments: false }), new CssMinimizerPlugin()],
	},
	output: {
		path: path.resolve(__dirname, './build/android'),
		filename: '[name].js',
		publicPath: '',
		library: {
			name: 'zotero-editor',
			type: 'umd',
			umdNamedDefine: true,
		},
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
			{
				test: /\.s?css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader',
					},
					{
						loader: 'postcss-loader',
					},
					{
						loader: 'sass-loader',
						options: {
							additionalData: `$platform: 'android';`
						}
					},
				],
			},
			{
				test: /\.svg$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/icons/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.woff2$/,
				type: 'asset/resource',
				generator: {
					filename: 'assets/fonts/[name].[hash:8][ext]',
				},
			},
			{
				test: /\.(ttf|woff)$/,
				type: 'asset/resource',
				generator: {
					emit: false,
				},
			},
		],
	},
	plugins: [
		new CleanWebpackPlugin(),
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		new HtmlWebpackPlugin({
			template: './html/editor.android.html',
			filename: './[name].html',
		}),
	],
};

module.exports = [configDev, configWeb, configZotero, configIOS, configAndroid];
