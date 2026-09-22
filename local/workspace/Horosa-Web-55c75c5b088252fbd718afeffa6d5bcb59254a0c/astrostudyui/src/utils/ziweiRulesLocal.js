import zwrules from './data/zwrules.json';
import zwrulesihua from './data/zwrulesihua.json';
import { ResultKey } from './constants';

// PHASE 4-C: /ziwei/rules 是 classpath 静态表，与盘无关。原文迁入浏览器，不改条文。
export function getZiweiRulesEnvelope(){
	return {
		[ResultKey]: {
			ZWRules: zwrules,
			ZWRuleSihua: zwrulesihua,
		},
	};
}
