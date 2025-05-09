const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
	publicPath: process.env.NODE_ENV === 'production'
		? './' 
		: '/', 
	pluginOptions: {
		electronBuilder: {
			nodeIntegration: true
		}
	},
	transpileDependencies: true,
	configureWebpack: {
		resolve: {
			fallback: {
				util: require.resolve("util/")
			}
		}
	}
})
