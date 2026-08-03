require('@babel/register')({
	extensions: ['.js'],
	presets: [
		['@babel/preset-env', {
			modules: 'commonjs',
			targets: { node: 'current' }
		}]
	]
});

global.__BUILD__ = 'dev';

require.extensions['.ftl'] = (module) => {
	module.exports = '';
};
