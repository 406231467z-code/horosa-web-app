import { ziweiRulesCacheEnabled } from '../utils/perfFlags';
import { getZiweiRulesEnvelope } from '../utils/ziweiRulesLocal';

// The Ziwei rule tables ship with the frontend. This service keeps its old public
// names for callers, but is now local-only: no /ziwei/rules HTTP request.
export function ziweirules(){
	return Promise.resolve(getZiweiRulesEnvelope());
}

const ZIWEI_RULES_CACHE = new Map();

export function ziweirulesCached(values){
	if(!ziweiRulesCacheEnabled()){
		return ziweirules(values);
	}
	const key = JSON.stringify(values || {});
	const hit = ZIWEI_RULES_CACHE.get(key);
	if(hit){
		return hit;
	}
	const promise = Promise.resolve().then(()=>getZiweiRulesEnvelope()).then((data)=>{
		if(!data || !data.Result){
			if(ZIWEI_RULES_CACHE.get(key) === promise){
				ZIWEI_RULES_CACHE.delete(key);
			}
			throw new Error('ziwei rules 本地数据为空');
		}
		return data;
	}, (err)=>{
		if(ZIWEI_RULES_CACHE.get(key) === promise){
			ZIWEI_RULES_CACHE.delete(key);
		}
		throw err;
	});
	ZIWEI_RULES_CACHE.set(key, promise);
	return promise;
}

export function clearZiweiRulesCache(){
	ZIWEI_RULES_CACHE.clear();
}
