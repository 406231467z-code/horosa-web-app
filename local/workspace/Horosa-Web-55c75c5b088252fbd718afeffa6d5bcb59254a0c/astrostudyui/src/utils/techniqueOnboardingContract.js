// 🔴 [V5-C1] 技法接入合同注册表 —— 「新增技法必须同步全部数据管理链」的单一登记处。
//
// 分母 = src/pages/index.js 的 navigationPages(技法宇宙:用户可见面=最真实全集)。
// 新技法进导航 → techniqueOnboardingContract.test 立刻要求本表有它的合同,缺=红;
// 僵尸合同(导航已删表还在)同样红。堵死历史逃逸面:「AI 审计闸分母=preset 键集 →
// 忘接 AI 导出就不进分母(零审计零红)」——本表让「进导航」本身成为分母事件。
//
// 五项合同(与 docs/DATA_MANAGEMENT_PLAYBOOK.md §4 机器可读表逐 id 对应,preflight[214] 双向锁):
//   help        帮助文档:'registry'=TECHNIQUE_HELP_DOCS 必须有该 navKey(机械判)
//   aiExport    AI 导出:[preset键...]=每键必须 ∈ AI_EXPORT_PRESET_SECTIONS(机械判,
//               并自动进内容完备性审计分母);'exempt:理由'=显式豁免
//   mount       AI 挂载:'viaPresets'=aiExport 声明键至少一键 ∈ TECHNIQUE_SETTINGS_SCHEMA
//               (挂载设置面与 preset 同名族,机械判);'exempt:理由'
//   archive     存档通道:'chart'=命盘库;'case:[类型...]'=事盘且每类型 ∈ CASE_TYPE_OPTIONS
//               (机械判);'exempt:理由'
//   storageKeys 设置键:[键/前缀代表键...]=每键必须 classifyStorageKey 可分类(防拼错;
//               **穷尽性由 storageRegistryCompleteness 全站哨兵负责,本项只锁链接入**);
//               'none'=该技法无独立持久化键
//
// ⚠ 豁免纪律:'exempt:' 后必须有非空理由;豁免也是 ratchet——只准减少不准新增无由豁免。
export const TECHNIQUE_ONBOARDING_CONTRACT = {
	astrochart: { help: 'registry', aiExport: ['astrochart', 'astrochart_like', 'hellenastro', 'dwadasamsa'], mount: 'viaPresets', archive: 'chart', storageKeys: ['horosa.chart.classicalGlobals.v1', 'horosa.egypt.school.v1'] },
	direction: { help: 'registry', aiExport: ['primarydirect', 'distributions', 'agepoint', 'primarydirchart', 'zodialrelease', 'firdaria', 'profection', 'solararc', 'solarreturn', 'lunarreturn', 'givenyear', 'decennials', 'planetaryages', 'vedicprog', 'jaynesprog', 'planetaryarc', 'persiandirected', 'yearsystem129', 'balbillus', 'triplicityrulers', 'keypoints', 'lunationphase', 'extrareturns'], mount: 'viaPresets', archive: 'chart', storageKeys: ['horosa.pd.columns.v1', 'horosa.pd.orb.v1', 'horosa.pd.pageSize', 'horosa.pdsphere.viewMode', 'horosa.lifespan.method'] },
	bazi: { help: 'registry', aiExport: ['bazi'], mount: 'viaPresets', archive: 'chart', storageKeys: 'none' },
	ziwei: { help: 'registry', aiExport: ['ziwei'], mount: 'viaPresets', archive: 'chart', storageKeys: ['ziweiPreset', 'ziweiBrightnessCustom', 'ziweiSihuaCustom'] },
	guolao: { help: 'registry', aiExport: ['guolao'], mount: 'viaPresets', archive: 'chart', storageKeys: ['horosa.guolao.engineMode', 'horosaGuolaoLifeMode'] },
	indiachart: { help: 'registry', aiExport: ['indiachart'], mount: 'viaPresets', archive: 'chart', storageKeys: ['horosa.india.rectify.prefs.v1'] },
	auxchart: { help: 'registry', aiExport: ['horary', 'election', 'mundane', 'harmonic', 'draconic', 'relocation', 'locastro', 'germany', 'babylon'], mount: 'viaPresets', archive: 'chart', storageKeys: ['horosa.uranian.dial.v1', 'horosa.uranian.gephem.v1', 'horosa.chart.divinationJudgeGlobals.v1'] },
	relativechart: { help: 'registry', aiExport: ['relative'], mount: 'viaPresets', archive: 'chart', storageKeys: 'none' },
	shusuan: { help: 'registry', aiExport: ['shaozi', 'tieban', 'heluo', 'canping', 'zhengchuan', 'beiji', 'nanji', 'chunzi', 'fendjing'], mount: 'viaPresets', archive: 'chart', storageKeys: 'none' },
	mingother: { help: 'registry', aiExport: ['xianqin', 'cetian', 'yizhangjing', 'qizhengkin'], mount: 'viaPresets', archive: 'chart', storageKeys: 'none' },
	sanshiunited: { help: 'registry', aiExport: ['sanshiunited'], mount: 'viaPresets', archive: 'case:sanshiunited', storageKeys: 'none' },
	liureng: { help: 'registry', aiExport: ['liureng'], mount: 'viaPresets', archive: 'case:liureng', storageKeys: ['liurengPanView', 'liurengXiangOn'] },
	dunjia: { help: 'registry', aiExport: ['qimen'], mount: 'viaPresets', archive: 'case:qimen,qimenzeri', storageKeys: ['horosa.zeri.qimen.schemes.v1'] },
	guazhan: { help: 'registry', aiExport: ['sixyao'], mount: 'viaPresets', archive: 'case:liuyao', storageKeys: ['horosa.liuyao.settings.v1'] },
	taiyi: { help: 'registry', aiExport: ['taiyi'], mount: 'viaPresets', archive: 'case:taiyi', storageKeys: 'none' },
	jieqichart: { help: 'registry', aiExport: ['jieqi'], mount: 'exempt:分至盘为时刻天象盘,无逐技法挂载设置面', archive: 'exempt:分至盘按节气时刻生成,不入事盘库(可随命盘技法保存)', storageKeys: 'none' },
	cnyibu: { help: 'registry', aiExport: ['jinkou', 'wuzhao', 'taixuan', 'jingjue', 'shenyishu', 'huangji', 'guice', 'tongshefa', 'geomancy', 'lingqi', 'xiaoliuren', 'xiaochengtu', 'feigong', 'suzhan', 'otherbu'], mount: 'viaPresets', archive: 'case:jinkou,wuzhao,taixuan,jingjue,shenyishu,huangji,guice,tongshefa,geomancy,lingqi,xiaoliuren,xiaochengtu,feigong,suzhan', storageKeys: ['horosa.lingqi.settings.v1', 'horosa.guice.settings.v1', 'horosa.feigong.settings.v1', 'horosa.xiaochengtu.settings.v1', 'horosa.xiaoliuren.settings.v1', 'suzhanChartType'] },
	aianalysis: { help: 'registry', aiExport: 'exempt:AI 分析页是导出/挂载的消费端,不是被导出的技法', mount: 'exempt:同 aiExport', archive: 'exempt:对话历史走 AI 工作区 IndexedDB(备份 aiWorkspace 段)', storageKeys: ['horosa.ai.analysis.ui.v3', 'horosa.ai.export.settings.v1', 'horosa.ai.mount.techniqueDefaults.v1', 'horosa.report.thinkingLevel', 'horosa.report.prefill.v1', 'horosa.report.glossary.global.v1', 'horosa.sec.aiBodyEncrypt'] },
	__charts__: { help: 'exempt:命盘管理是本地抽屉,不是技法页', aiExport: 'exempt:命盘管理不导出技法快照', mount: 'exempt:同 aiExport', archive: 'chart', storageKeys: 'none' },
};
