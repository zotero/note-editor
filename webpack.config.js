const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

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
					exclude: /node_modules/,
					use: {
						loader: 'babel-loader',
						options: build === 'zotero' ? {
							presets: [
								['@babel/preset-env', { useBuiltIns: false }],
							],
						} : {},
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
			],
		},
		plugins: [
			new CleanWebpackPlugin(),
			new MiniCssExtractPlugin({
				filename: '[name].css',
			}),
			new HtmlWebpackPlugin({
				template: `./html/editor.${build}.html`,
				filename: './[name].html',
			}),
		],
	};

	if (build === 'zotero') {
		config.externals = {
			react: 'React',
			'react-dom': 'ReactDOM',
			'react-intl': 'ReactIntl',
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
