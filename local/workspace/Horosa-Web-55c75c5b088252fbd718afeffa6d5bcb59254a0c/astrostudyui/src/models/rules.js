import { getZiweiRulesEnvelope } from '../utils/ziweiRulesLocal';

export default {
	namespace: 'rules',

	state: {
		ziwei: null,
	},

	reducers: {
		save(state, { payload: values }) {
			return { ...state, ...values };
		},
	},

	effects: {
		// 紫微规则是随前端发布的静态表。启动时直接读本地 JSON，不再请求 /ziwei/rules。
		*loadZiweiRulesLocal({ payload: values }, { put }) {
			const data = getZiweiRulesEnvelope();
			yield put({
				type: 'save',
				payload: {
					ziwei: data.Result,
				},
			});
		},
	},
};
