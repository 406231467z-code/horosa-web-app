const buildForFile = process.env.BUILD_FOR_FILE === '1';

export default {
	publicPath: buildForFile ? './' : '/static/',
	outputPath: buildForFile ? 'dist-file' : 'dist',
	history: buildForFile ? { type: 'hash' } : undefined,
	hash: true,
	dva: {
		immer: false,
	},
	antd: {},
	dynamicImport: {},
	// 性能分包:多个技法路由 chunk 曾各自内联同一批重依赖(three/lunar/kinastro 等被双份
	// 打进 5.7MB+4.8MB 两个 chunk,双份下载双份解析)。把 ≥2 处引用的重库/重源码提成命名
	// async vendor chunk;moment 裁掉未用 locale(zh-cn 在 layouts 显式 import 完整路径,
	// 不受 IgnorePlugin 的 context 匹配影响,保留)。回退=注释本段(kill-switch)。
	chainWebpack(config, { webpack }) {
		config.merge({
			optimization: {
				splitChunks: {
					chunks: 'async',
					minSize: 30000,
					maxInitialRequests: 12,
					// WS-N1(2026-07-16):16 → 40。16 时恰好顶格:两个最大页面根(46/47 chunk)的
					// Promise.all 恰 16 项,共享的 9-10 个独立 chunk 文件在场却因请求预算引用不了,
					// 内容被【回灌】进两根各存一份(94 共有模块/重复 2.48MB,dist 白胖 ~5MB)。
					// 首试 30 仍被用满(p__index 组=30 顶格,check-chunk-dup 哨兵实咬)→ 40 留余量。
					// 2026-07-19:40 再顶格(P5 懒化把 CnYiBu 子技法/AstroRelative/ChartMemo 全转
					// async,p__index 组=40 == 上限,哨兵咬)→ 56 续留余量,同判据同回退。
					// 判据:任何组的 Promise.all 长度 == 本值即再次顶格(scripts/check-chunk-dup.js
					// 哨兵盯)。请求数多 = 桌面本地协议零成本/web 静态托管可并发,回灌才是真税。
					// 回退 kill-switch:HOROSA_SPLIT_MAXREQ=16。
					maxAsyncRequests: Number(process.env.HOROSA_SPLIT_MAXREQ || 56),
					cacheGroups: {
						vendorsD3: {
							name: 'vendors-d3',
							test: /[\\/]node_modules[\\/](d3|d3-[^\\/]+)[\\/]/,
							chunks: 'async',
							priority: 28,
							minChunks: 1,
							reuseExistingChunk: true,
						},
						zhengchuanEngine: {
							name: 'zhengchuan-engine',
							test: /[\\/]src[\\/]utils[\\/](zhengchuan[A-Za-z]+\.js|data[\\/]zhengchuan(?!.*Verses)[A-Za-z]+\.json)$/,
							chunks: 'async',
							priority: 24,
							minChunks: 1,
							reuseExistingChunk: true,
						},
						sharedTechnique: {
							name: 'shared-technique',
							test: /[\\/]src[\\/](components[\\/](kinastro|comp|xq-ui)|utils|data|constants)[\\/]/,
							chunks: 'async',
							priority: 20,
							minChunks: 2,
							minSize: 60000,
							reuseExistingChunk: true,
						},
					},
				},
			},
		});
		// 只保留 zh-cn(IgnorePlugin 在本 webpack 版本会连显式 import 的 zh-cn 一起裁掉,
		// 实测破坏中文日期 → 改用 ContextReplacement 精确白名单)
		config.plugin('moment-locale-trim')
			.use(webpack.ContextReplacementPlugin, [/moment[\\/]locale$/, /zh-cn/]);
	},
	dll: false,
	hardSource: false,
	pwa: false,
	hd: false,
	fastClick: false,
	title: '星阙 - 玄学与星座云平台',
}
