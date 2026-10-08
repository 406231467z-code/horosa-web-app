/**
 * guotables.py TERM_SU27, SU27, relations. Transcribed. 牛 is absent.
 * Bounds use the same additions as the Python source.
 */
const t = (a, b = 0) => a + b;

export const LIST_SU = [
	'娄', '胃', '昴', '毕', '觜', '参', '井', '鬼', '柳', '星', '张', '翼', '轸', '角', '亢', '氐', '房', '心',
	'尾', '箕', '斗', '女', '虚', '危', '室', '壁', '奎',
];

export const SU_HOUSE_SIZE = 30 * 4 / 9;

export const TERM_SU27 = {
	Aries: [['娄', 0, t(13, 20 / 60)], ['胃', t(13, 20 / 60), t(26, 40 / 60)], ['昴', t(26, 40 / 60), 30]],
	Taurus: [['昴', 0, 10], ['毕', 10, t(23, 20 / 60)], ['觜', t(23, 20 / 60), 30]],
	Gemini: [['觜', 0, t(6, 40 / 60)], ['参', t(6, 40 / 60), 20], ['井', 20, 30]],
	Cancer: [['井', 0, t(3, 20 / 60)], ['鬼', t(3, 20 / 60), t(16, 40 / 60)], ['柳', t(16, 40 / 60), 30]],
	Leo: [['星', 0, t(13, 20 / 60)], ['张', t(13, 20 / 60), t(26, 40 / 60)], ['翼', t(26, 40 / 60), 30]],
	Virgo: [['翼', 0, 10], ['轸', 10, t(23, 20 / 60)], ['角', t(23, 20 / 60), 30]],
	Libra: [['角', 0, t(6, 40 / 60)], ['亢', t(6, 40 / 60), 20], ['氐', 20, 30]],
	Scorpio: [['氐', 0, t(3, 20 / 60)], ['房', t(3, 20 / 60), t(16, 40 / 60)], ['心', t(16, 40 / 60), 30]],
	Sagittarius: [['尾', 0, t(13, 20 / 60)], ['箕', t(13, 20 / 60), t(26, 40 / 60)], ['斗', t(26, 40 / 60), 30]],
	Capricorn: [['斗', 0, 10], ['女', 10, t(23, 20 / 60)], ['虚', t(23, 20 / 60), 30]],
	Aquarius: [['虚', 0, t(6, 40 / 60)], ['危', t(6, 40 / 60), 20], ['室', 20, 30]],
	Pisces: [['室', 0, t(3, 20 / 60)], ['壁', t(3, 20 / 60), t(16, 40 / 60)], ['奎', t(16, 40 / 60), 30]],
};

const row = (sign, signlon, lon, category, character) => ({
	sign, signlon, lon, size: SU_HOUSE_SIZE, category, character,
});

export const SU27 = {
	娄: row('Aries', 0, 0, '急速', ['癖好收集，拈花惹草', '苑牧、聚集、聚众、狱']),
	胃: row('Aries', t(13, 20 / 60), t(13, 20 / 60), '急速', ['强硬驱策，意欲主宰', '五谷、仓廪、运输']),
	昴: row('Aries', t(26, 40 / 60), t(26, 40 / 60), '刚柔', ['小气胆怯、擅长辩论', '狱事、囚犯、白衣']),
	毕: row('Taurus', 10, 40, '安重', ['满腹理想，优柔寡断', '听察、谗言/良言、边兵']),
	觜: row('Taurus', t(23, 20 / 60), 30 + 23 + 20 / 60, '和善', ['巧言善辩，擅理好礼', '贼寇']),
	参: row('Gemini', t(6, 40 / 60), 60 + 6 + 40 / 60, '毒害', ['冒险改革、明亮花心', '度量衡']),
	井: row('Gemini', 20, 80, '轻燥', ['双面不定，柔和擅行', '水、池、渠']),
	鬼: row('Cancer', t(3, 20 / 60), 90 + 3 + 20 / 60, '急速', ['人情世故、沟通健谈', '尸、鬼']),
	柳: row('Cancer', t(16, 40 / 60), 90 + 16 + 40 / 60, '毒害', ['善恶分明，倔强激烈', '草木、木工、厨、食、味']),
	星: row('Leo', 0, 120, '猛恶', ['较真古怪，责任刻板', '衣裳']),
	张: row('Leo', t(13, 20 / 60), 120 + 13 + 20 / 60, '猛恶', ['傲慢讨好，擅势利用', '酒食、赏赐']),
	翼: row('Leo', t(26, 40 / 60), 120 + 26 + 40 / 60, '安重', ['计划持重、不喜纷争', '音律、礼乐']),
	轸: row('Virgo', 10, 160, '急速', ['思维敏迅，内敛善妒', '风、车骑']),
	角: row('Virgo', t(23, 20 / 60), 150 + 23 + 20 / 60, '和善', ['思纯情浮，阴弱聪策', '天门']),
	亢: row('Libra', t(6, 40 / 60), 180 + 6 + 40 / 60, '轻燥', ['骄傲虚荣，自尊反叛', '三公、丞相、布政、享祠']),
	氐: row('Libra', 20, 200, '刚柔', ['不拘好闲，爽直轻松', '行宫、后宫、疫病、徭役']),
	房: row('Scorpio', t(3, 20 / 60), 210 + 3 + 20 / 60, '和善', ['开朗任性、自我拒外', '天子明堂、车架']),
	心: row('Scorpio', t(16, 40 / 60), 210 + 16 + 40 / 60, '毒害', ['难以捉摸，擅弄心理', '中枢、天子、宰相']),
	尾: row('Sagittarius', 0, 240, '毒害', ['顽固报复，偏激好斗', '后宫、皇后、内室、边臣']),
	箕: row('Sagittarius', t(13, 20 / 60), 240 + 13 + 20 / 60, '猛恶', ['粗暴直爽、心急独行', '嫔妃、大风、蛮夷']),
	斗: row('Sagittarius', t(26, 40 / 60), 240 + 26 + 40 / 60, '安重', ['争强好胜，力趋人上', '兵、（天子）寿命']),
	女: row('Capricorn', 10, 280, '轻燥', ['擅技冷情，自私漠然', '嫁娶、女工、布帛']),
	虚: row('Capricorn', t(23, 20 / 60), 270 + 23 + 20 / 60, '轻燥', ['阴沉神秘，宗密祝祷', '庙堂、祭祀、坟冢']),
	危: row('Aquarius', t(6, 40 / 60), 300 + 6 + 40 / 60, '轻燥', ['多情飘忽，小聪大失', '市场、架构、盖屋、亦主坟祀']),
	室: row('Aquarius', 20, 320, '猛恶', ['刚猛无畏、野心机权', '军粮']),
	壁: row('Pisces', t(3, 20 / 60), 330 + 3 + 20 / 60, '安重', ['慎密悭涩，内向冷静', '文章、图书']),
	奎: row('Pisces', t(16, 40 / 60), 330 + 16 + 40 / 60, '和善', ['高傲洁癖、眼高挑剔', '军库、将军']),
};

export const SU_CATEGORY_BIRTH = {
	安重: '法合安重威肃正福德、有大名闻。',
	和善: '法合柔软温良。聪明而爱典教。',
	毒害: '法合碜毒刚猛恶性。',
	急速: '法合刚猛而捷疾有筋力。',
	猛恶: '法合凶害猛杀。宜舍身出家作沙门。',
	轻燥: '法合浇薄不然则质直平稳。',
	刚柔: '法合为性、宽柔而猛、君子之人流也。',
};

export const LIST_SU_RELATION = [
	'命', '荣', '衰', '安', '危', '成', '坏', '友', '亲',
	'业', '荣', '衰', '安', '危', '成', '坏', '友', '亲',
	'胎', '荣', '衰', '安', '危', '成', '坏', '友', '亲',
];

export const LIST_SU_SIXHOUSE = [
	{ id: '意', count: 4 },
	{ id: '事', count: 10 },
	{ id: '克', count: 13 },
	{ id: '聚', count: 16 },
	{ id: '同', count: 20 },
];

export const SIGNS = [
	'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
	'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const LIST_OBJECTS_NOCHIRON = [
	'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
	'Uranus', 'Neptune', 'Pluto', 'North Node', 'South Node', 'Syzygy',
	'Pars Fortuna', 'Dark Moon', 'Purple Clouds',
];

export const LIST_OBJECTS_TRADITIONAL = [
	'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn',
	'North Node', 'South Node', 'Syzygy', 'Pars Fortuna', 'Dark Moon', 'Purple Clouds',
];

export function copySu27() {
	const res = {};
	for (const suid of LIST_SU) {
		const su = SU27[suid];
		res[suid] = {
			id: suid,
			sign: su.sign,
			signlon: su.signlon,
			lon: su.lon,
			size: su.size,
			category: su.category,
			character: su.character.slice(),
			planets: [],
		};
	}
	return res;
}
