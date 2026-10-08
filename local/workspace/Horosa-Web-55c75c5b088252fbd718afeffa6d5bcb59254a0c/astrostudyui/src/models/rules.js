import { getZiweiRulesEnvelope } from '../utils/ziweiRulesLocal';


export default {
	namespace: 'rules',

	state: {
		ziwei: null,
	},

	reducers: {
		save(state, {payload: values}){
			let st = { ...state, ...values, };
			return st;
		},
	},

	effects: {
		*ziwei({ payload: values }, { put }){
			// /ziwei/rules 是 classpath 静态表，浏览器副本在 ziweiRulesLocal。启动不再打 :9999。
			const data = getZiweiRulesEnvelope();
			if(!data){
				return;
			}
			yield put({
                type: 'save',
                payload: {
					ziwei: data.Result,
                },
			});

		},

	},
}