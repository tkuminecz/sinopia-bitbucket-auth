/* global __dirname, module, require */
const path = require('path'),
	pkg = require('./package.json');
	// UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const deps = pkg.dependencies || {};

if (!pkg.config || !pkg.config.libName) {
	throw new Error('Must specify "libName" in package.json "config" object!');
}

module.exports = {
	entry: './src/index.js',
	output: {
		path: path.join(__dirname, path.dirname(pkg.main)),
		filename: path.basename(pkg.main),
		library: pkg.config.libName,
		libraryTarget: 'umd',
	},
	externals: Object.keys(deps).map(dep => ({
		[dep]: {
			commonjs: dep,
			commonjs2: dep,
			amd: dep,
		},
	})),
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			}
		],
	},
	plugins: [
		// new UglifyJSPlugin(),
	],
};
