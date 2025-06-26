const path = require('path');
const webpack = require('webpack');               // ← 1) new import
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ZoteroLocalePlugin = require('./webpack.zotero-locale-plugin');

const babelConfigs = new Map([
	['zotero', {
		presets: [
			['@babel/preset-env', { useBuiltIns: false }],
		],
	}],
	['web', {
		presets: [
			["@babel/preset-env", {
				targets: 'firefox >= 68, chrome >= 67, edge >= 79, safari >= 11, last 2 versions, not dead, not ie 11, not ie 10',
				corejs: { version: 3.37 },
				useBuiltIns: "usage",
			}]
		]
	}],
]);

function generateEditorConfig(build) {
	let config = {
		name: build,
		mode: build === 'dev' ? 'development' : 'production',
		devtool: build === 'dev' ? 'source-map' : (build === 'zotero' ? false : 'source-map'),
		entry: {
			editor: [
				`./src/index.${build}.js`,
				'./src/stylesheets/main.scss'
			]
		},
		output: {
			path: path.resolve(__dirname, `./build/${build}`),
			filename: '[name].js',
			publicPath: '',
			library: {
				name: 'zotero-editor',
				type: 'umd',
				umdNamedDefine: true,
			},
		},
		optimization: {
			minimize: build !== 'dev',
			minimizer: build === 'dev' ? [] : [new TerserPlugin({ extractComments: false }), new CssMinimizerPlugin()],
		},
		module: {
			rules: [
				{
					test: /\.(js|jsx)$/,
					exclude: {
						and: [/node_modules/],
						not: build === 'web'
						// some dependencies need to be transpiled for web, see zotero/web-library#556
							? [
								/@benrbray[\\/]prosemirror-math/,
							]
							: []
					},
					use: {
						loader: 'babel-loader',
						options: babelConfigs.get(build) ?? {},
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
								additionalData: `$platform: '${build}';`
							}
						},
					],
				},
				{
					test: /\.svg$/i,
					issuer: /\.[jt]sx?$/,
					use: ['@svgr/webpack'],
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
				{
					test: /\.ftl$/,
					type: 'asset/source'
				}
			]
		},
		plugins: [
			new ZoteroLocalePlugin({
				files: ['zotero.ftl', 'note-editor.ftl'],
				locales: ['en-US'],
				commitHash: '80d01c9d02ae471516402d8fe22bee28ab47955f',
			}),
			new CleanWebpackPlugin(),
			new MiniCssExtractPlugin({
				filename: '[name].css',
			}),
			new HtmlWebpackPlugin({
				template: `./html/editor.${build}.html`,
				filename: './[name].html',
			}),
			new webpack.DefinePlugin({ __BUILD__: JSON.stringify(build) })
		],
	};

	if (build === 'zotero') {
		config.externals = {
			react: 'React',
			'react-dom': 'ReactDOM',
			'prop-types': 'PropTypes',
		};
	}
	else if (build === 'dev') {
		config.devServer = {
			static: {
				directory: path.resolve(__dirname, 'build/'),
				watch: true,
			},
			devMiddleware: {
				writeToDisk: true,
			},
			open: `/dev/editor.html`,
			port: 3002,
		};
	}

	return config;
}

module.exports = ['dev', 'web', 'zotero', 'ios', 'android'].map(generateEditorConfig);
