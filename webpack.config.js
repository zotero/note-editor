const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');

const configDev = {
	mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
	devtool: 'source-map',
	entry: [
		'./src/index.dev.js',
		'./src/stylesheets/main.scss'
	],
	output: {
		path: path.join(__dirname, './build'),
		filename: 'dev/editor.js',
		library: 'zotero-editor',
		libraryTarget: 'umd',
		publicPath: '/',
		umdNamedDefine: true
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
							'@babel/preset-react',
							[
								'@babel/preset-env',
								{
									modules: false
								}
							]
						],
						'plugins': [
							'@babel/plugin-transform-runtime',
							'@babel/plugin-proposal-class-properties'
						]
					}
				}
			},
			{
				test: /\.scss$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: 'dev/editor.css'
						}
					},
					{
						loader: 'extract-loader'
					},
					{
						loader: 'css-loader',
						options: {
							sourceMap: true,
							url: false
						}
					},
					{
						loader: 'postcss-loader',
						options: {
							sourceMap: true
						}
					},
					{
						loader: 'sass-loader',
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	},
	resolve: {
		extensions: ['*', '.js']
	},
	plugins: [
		new CopyWebpackPlugin([
				{ from: 'res/', to: 'dev/' },
				{ from: 'html/editor.dev.html', to: 'dev/editor.html' }
			], { copyUnmodified: true }
		),
		new WriteFilePlugin()
	],
	devServer: {
		port: 3002,
		contentBase: path.join(__dirname, 'build/'),
		openPage: 'dev/editor.html',
		open: false,
		watchOptions: {
			poll: true
		}
	}
};

const configWeb = {
	name: 'web',
	mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
	devtool: 'source-map',
	entry: [
		'./src/index.web.js',
		'./src/stylesheets/main.scss'
	],
	output: {
		path: path.join(__dirname, './build'),
		filename: 'web/editor.js',
		library: 'zotero-editor',
		libraryTarget: 'umd',
		publicPath: '/',
		umdNamedDefine: true
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
							'@babel/preset-react',
							[
								'@babel/preset-env',
								{
									modules: false
								}
							]
						],
						'plugins': [
							'@babel/plugin-transform-runtime',
							'@babel/plugin-proposal-class-properties'
						]
					}
				}
			},
			{
				test: /\.scss$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: 'web/editor.css'
						}
					},
					{
						loader: 'extract-loader'
					},
					{
						loader: 'css-loader',
						options: {
							sourceMap: true,
							url: false
						}
					},
					{
						loader: 'postcss-loader',
						options: {
							sourceMap: true
						}
					},
					{
						loader: 'sass-loader',
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	},
	resolve: {
		extensions: ['*', '.js']
	},
	plugins: [
		new CopyWebpackPlugin([
				{ from: 'res/', to: 'web/' },
				{ from: 'html/editor.web.html', to: 'web/editor.html' }
			], { copyUnmodified: true }
		),
		new WriteFilePlugin()
	]
};

const configZotero = {
	mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
	devtool: false,
	entry: [
		'./src/index.zotero.js',
		'./src/stylesheets/main.scss'
	],
	output: {
		path: path.join(__dirname, './build/zotero'),
		filename: 'editor.js',
		library: 'zotero-editor',
		libraryTarget: 'umd',
		publicPath: '/',
		umdNamedDefine: true
	},
	optimization: {
		minimize: false
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
							'@babel/preset-react',
							[
								'@babel/preset-env',
								{
									useBuiltIns: false,
									modules: false
								}
							]

						],
						'plugins': [
							'@babel/plugin-transform-runtime',
							'@babel/plugin-proposal-class-properties'
						]
					}
				}
			},
			{
				test: /\.scss$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: 'editor.css'
						}
					},
					{
						loader: 'extract-loader'
					},
					{
						loader: 'css-loader?-url'
					},
					{
						loader: 'postcss-loader'
					},
					{
						loader: 'sass-loader'
					}
				]
			}
		]
	},
	resolve: {
		extensions: ['*', '.js']
	},
	plugins: [
		new CopyWebpackPlugin([
				{ from: 'res/', to: './' },
				{ from: 'html/editor.zotero.html', to: './editor.html' }
			], { copyUnmodified: true }
		)
	],
	externals: {
		'react': 'React',
		'react-dom': 'ReactDOM',
		'react-intl': 'ReactIntl',
		'prop-types': 'PropTypes'
	}
};

const configIOS = {
	name: 'ios',
	mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
	devtool: 'source-map',
	entry: [
		'./src/index.ios.js',
		'./src/stylesheets/main.scss'
	],
	output: {
		path: path.join(__dirname, './build'),
		filename: 'ios/editor.js',
		library: 'zotero-editor',
		libraryTarget: 'umd',
		publicPath: '/',
		umdNamedDefine: true
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
							'@babel/preset-react',
							[
								'@babel/preset-env',
								{
									modules: false
								}
							]
						],
						'plugins': [
							'@babel/plugin-transform-runtime',
							'@babel/plugin-proposal-class-properties'
						]
					}
				}
			},
			{
				test: /\.scss$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: 'ios/editor.css'
						}
					},
					{
						loader: 'extract-loader'
					},
					{
						loader: 'css-loader',
						options: {
							sourceMap: true,
							url: false
						}
					},
					{
						loader: 'postcss-loader',
						options: {
							sourceMap: true
						}
					},
					{
						loader: 'sass-loader',
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	},
	resolve: {
		extensions: ['*', '.js']
	},
	plugins: [
		new CopyWebpackPlugin([
				{ from: 'res/', to: 'ios/' },
				{ from: 'html/editor.ios.html', to: 'ios/editor.html' }
			], { copyUnmodified: true }
		),
		new WriteFilePlugin()
	]
};

module.exports = [configDev, configWeb, configZotero, configIOS];
