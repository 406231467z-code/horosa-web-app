import JSZip from 'jszip';
import {
	buildAiTransportPlan,
	buildDirectModelListRequest,
	createVendorSseBridge,
	extractDirectChatContent,
	extractEmbeddingVectors,
	redactSecret,
} from '../utils/aiDirectTransport';

function safeParseJson(text, defVal = null){
	try{
		return text ? JSON.parse(text) : defVal;
	}catch(e){
		return defVal;
	}
}

// 尊重用户在 providerOptions.requestTimeoutMs 配置的超时(1s~10min),否则回退 120s。
function resolveRequestTimeout(values){
	const raw = values && values.providerOptions ? Number(values.providerOptions.requestTimeoutMs) : NaN;
	if(Number.isFinite(raw) && raw >= 1000){
		return Math.min(raw, 600000);
	}
	// v1.16-BB6: Ollama 本地首次模型加载慢(20s+),默认 timeout 给 180s 避免假阴性诊断
	const pt = values && values.providerType;
	if(pt === 'ollama') return 180000;
	return 120000;
}

function createSseParser(onEvent){
	let buffer = '';
	let eventName = 'message';
	let dataLines = [];

	function normalizeLine(rawLine){
		const line = `${rawLine || ''}`;
		if(!line){
			return line;
		}
		const eventIdx = line.indexOf('event:');
		const dataIdx = line.indexOf('data:');
		let idx = -1;
		if(eventIdx >= 0 && dataIdx >= 0){
			idx = Math.min(eventIdx, dataIdx);
		}else if(eventIdx >= 0){
			idx = eventIdx;
		}else if(dataIdx >= 0){
			idx = dataIdx;
		}
		return idx > 0 ? line.slice(idx) : line;
	}

	function flushEvent(){
		if(dataLines.length === 0){
			eventName = 'message';
			return;
		}
		const data = dataLines.join('\n');
		onEvent({
			type: eventName || 'message',
			data,
			json: safeParseJson(data, null),
		});
		eventName = 'message';
		dataLines = [];
	}

	return {
		push(chunk){
			buffer += chunk || '';
			let idx = buffer.indexOf('\n');
			while(idx >= 0){
				const rawLine = buffer.slice(0, idx);
				buffer = buffer.slice(idx + 1);
				const line = normalizeLine(rawLine.replace(/\r$/, ''));
				if(!line){
					flushEvent();
				}else if(line.indexOf('event:') === 0){
					eventName = line.slice(6).trim() || 'message';
				}else if(line.indexOf('data:') === 0){
					dataLines.push(line.slice(5).trim());
				}
				idx = buffer.indexOf('\n');
			}
		},
		end(){
			if(buffer){
				this.push('\n');
			}
			flushEvent();
		},
	};
}

function withTimeout(promiseFactory, timeoutMs, externalSignal){
	const timeout = Number(timeoutMs) > 0 ? Math.floor(Number(timeoutMs)) : 0;
	if(!timeout && !externalSignal){
		return promiseFactory(null);
	}
	const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
	const cleanup = [];
	if(controller && externalSignal && typeof externalSignal.addEventListener === 'function'){
		if(externalSignal.aborted){
			// 调用方已取消（如用户刚点停止）→ 立刻熄火，别再发请求。addEventListener 对已 abort 的 signal 不会再触发。
			controller.abort();
		}else{
			const abortListener = ()=>controller.abort();
			externalSignal.addEventListener('abort', abortListener, { once: true });
			cleanup.push(()=>externalSignal.removeEventListener('abort', abortListener));
		}
	}
	let timer = null;
	if(controller && timeout){
		timer = setTimeout(()=>{
			controller.abort();
		}, timeout);
	}
	return promiseFactory(controller ? controller.signal : externalSignal).finally(()=>{
		if(timer){
			clearTimeout(timer);
		}
		cleanup.forEach((fn)=>fn());
	});
}

function normalizeDirectModelList(providerType, payload){
	let entries = [];
	if(providerType === 'gemini'){
		entries = Array.isArray(payload && payload.models) ? payload.models : [];
	}else{
		entries = Array.isArray(payload && payload.data) ? payload.data
			: (Array.isArray(payload && payload.models) ? payload.models : []);
	}
	const models = [];
	entries.forEach((entry)=>{
		const raw = typeof entry === 'string' ? entry : (entry && (entry.id || entry.name || entry.model));
		const id = `${raw || ''}`.replace(/^models\//, '').trim();
		if(id && models.indexOf(id) < 0){
			models.push(id);
		}
	});
	return models;
}

async function requestDirectProviderModels(values){
	const plan = buildDirectModelListRequest(values || {});
	return withTimeout(async (signal)=>{
		const response = await fetch(plan.url, {
			method: 'GET',
			cache: 'no-store',
			headers: plan.headers,
			signal,
		});
		if(!response.ok){
			await readDirectError(response, plan.apiKey);
		}
		const payload = safeParseJson(await response.text(), null);
		if(!payload || typeof payload !== 'object'){
			throw new Error('供应商模型列表返回了无效数据');
		}
		const models = normalizeDirectModelList(plan.providerType, payload);
		if(!models.length){
			throw new Error('供应商未返回模型列表；可手动填写聊天模型与 Embedding 模型');
		}
		return { Result: { models } };
	}, resolveRequestTimeout(values), null);
}

/** 模型列表与诊断由浏览器直接请求用户配置的 AI 供应商，不经过 Horosa API。 */
export function fetchProviderModels(values){
	return requestDirectProviderModels(values);
}

export async function diagnoseProvider(values){
	const startedAt = Date.now();
	const rsp = await requestDirectProviderModels(values);
	const models = rsp && rsp.Result && Array.isArray(rsp.Result.models) ? rsp.Result.models : [];
	return {
		Result: {
			healthy: models.length > 0,
			latencyMs: Date.now() - startedAt,
			modelCount: models.length,
			failureReason: models.length ? '' : '供应商未返回可用模型',
			checkedAt: new Date().toISOString(),
		},
	};
}

/**
 * Extract readable text from WordprocessingML. Keep DOCX control elements as real
 * whitespace so downstream AI prompts receive paragraph breaks, tabs and line breaks.
 */
export function extractDocxText(xmlText){
	const xml = new DOMParser().parseFromString(`${xmlText || ''}`, 'application/xml');
	if(xml.getElementsByTagName('parsererror').length){
		throw new Error('DOCX 文档 XML 格式无效');
	}
	const paragraphs = Array.from(xml.getElementsByTagName('*')).filter((node)=>node.localName === 'p');
	return paragraphs.map((paragraph)=>{
		return Array.from(paragraph.getElementsByTagName('*')).map((node)=>{
			if(node.localName === 't'){ return node.textContent || ''; }
			if(node.localName === 'tab'){ return '\t'; }
			if(node.localName === 'br' || node.localName === 'cr'){ return '\n'; }
			return '';
		}).join('');
	}).join('\n').trim();
}

/**
 * Local material extraction. Text and Markdown are UTF-8. DOCX is unpacked and
 * parsed in-browser using the existing JSZip dependency. PDF and legacy .doc
 * need a dedicated binary document parser; fail honestly rather than forwarding
 * the uploaded document to a removed Horosa server or returning fabricated text.
 */
export async function extractMaterialContent(values){
	const input = values || {};
	const name = `${input.fileName || 'material'}`;
	const ext = (name.split('.').pop() || '').toLowerCase();
	const mimeType = input.mimeType || '';
	const base64 = `${input.base64Data || ''}`;
	if(!base64){
		throw new Error('资料内容为空');
	}
	const binary = typeof atob === 'function' ? atob(base64) : '';
	if(!binary){
		throw new Error('当前浏览器无法读取资料数据');
	}
	const bytes = new Uint8Array(binary.length);
	for(let i = 0; i < binary.length; i += 1){
		bytes[i] = binary.charCodeAt(i);
	}
	let extractedText = '';
	let extractor = 'browser-text';
	if(ext === 'txt' || ext === 'md' || mimeType.startsWith('text/')){
		extractedText = new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '').trim();
	}else if(ext === 'docx'){
		const zip = await JSZip.loadAsync(bytes);
		const documentFile = zip.file('word/document.xml');
		if(!documentFile){
			throw new Error('DOCX 文件缺少 word/document.xml');
		}
		const xmlText = await documentFile.async('text');
		extractedText = extractDocxText(xmlText);
		extractor = 'browser-docx-jszip';
	}else if(ext === 'pdf'){
		throw new Error('PDF 文本解析器尚未迁入浏览器；请先将 PDF 导出为 TXT、Markdown 或 DOCX，再添加资料。未上传到远程服务。');
	}else if(ext === 'doc'){
		throw new Error('旧版 .doc 二进制格式尚未支持浏览器本地解析；请另存为 DOCX 或 TXT。未上传到远程服务。');
	}else{
		throw new Error(`浏览器不支持本地提取 .${ext || '未知'} 资料格式`);
	}
	if(!extractedText){
		throw new Error('资料中没有提取到可用文本');
	}
	const encoded = new TextEncoder().encode(extractedText);
	const digest = await crypto.subtle.digest('SHA-256', encoded);
	const textHash = Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2, '0')).join('');
	return {
		Result: {
			fileName: name,
			fileExt: `.${ext}`,
			mimeType: mimeType || (ext === 'md' ? 'text/markdown' : 'text/plain'),
			size: bytes.byteLength,
			fileHash: input.fileHash || '',
			extractedText,
			textHash,
			extractMeta: { extractor },
		},
	};
}

async function readDirectError(response, secret){
	const text = await response.text();
	const payload = safeParseJson(text, null);
	const errorText = payload && (payload.error && payload.error.message || payload.message)
		? (payload.error && payload.error.message || payload.message)
		: `${response.status} ${response.statusText || ''}`.trim();
	throw new Error(redactSecret(errorText || 'direct.request.failed', secret));
}

export function requestEmbeddingVectors(values){
	const plan = buildAiTransportPlan(values, { embedding: true });
	return requestDirectEmbeddings(plan.embedding);
}

async function requestDirectEmbeddings(embedding){
	const vectors = [];
	for(let i = 0; i < embedding.requests.length; i++){
		const one = embedding.requests[i];
		const response = await fetch(one.url, {
			method: 'POST',
			cache: 'no-store',
			headers: one.headers,
			body: JSON.stringify(one.body),
		});
		if(!response.ok){
			await readDirectError(response, embedding.apiKey);
		}
		const payload = safeParseJson(await response.text(), null);
		if(embedding.kind === 'gemini'){
			const valuesList = payload && payload.embedding && Array.isArray(payload.embedding.values)
				? payload.embedding.values
				: [];
			vectors.push(valuesList);
		}else{
			extractEmbeddingVectors(payload).forEach((vec)=>vectors.push(vec));
		}
	}
	return {
		Result: {
			vectors,
			model: embedding.model,
			providerType: embedding.providerType,
		},
	};
}

export function requestAIAnalysisChat(values){
	const plan = buildAiTransportPlan(values, { stream: false });
	return requestDirectChat(plan.vendor, values);
}

async function requestDirectChat(vendor, values){
	const response = await withTimeout(async (signal)=>{
		const rsp = await fetch(vendor.url, {
			method: 'POST',
			cache: 'no-store',
			headers: vendor.headers,
			body: JSON.stringify(vendor.body),
			signal,
		});
		if(!rsp.ok){
			await readDirectError(rsp, vendor.apiKey);
		}
		return rsp;
	}, resolveRequestTimeout(values), null);
	const payload = safeParseJson(await response.text(), null);
	return {
		Result: {
			content: extractDirectChatContent(vendor.family, payload),
			model: vendor.body && vendor.body.model ? vendor.body.model : (values && values.model),
			providerType: vendor.providerType,
		},
	};
}

export async function requestAIAnalysisChatStream(values, handlers = {}){
	const plan = buildAiTransportPlan(values, { stream: true });
	const response = await withTimeout(async (signal)=>{
		const rsp = await fetch(plan.vendor.url, {
			method: 'POST',
			cache: 'no-store',
			headers: plan.vendor.headers,
			body: JSON.stringify(plan.vendor.body),
			signal,
		});
		if(!rsp.ok){
			await readDirectError(rsp, plan.vendor.apiKey);
		}
		return rsp;
	}, handlers.timeoutMs || resolveRequestTimeout(values), handlers.signal);
	const vendorBridge = createVendorSseBridge(plan.vendor.family);
	const reader = response.body && response.body.getReader ? response.body.getReader() : null;
	if(!reader){
		throw new Error('chat.stream.not.supported');
	}
	const decoder = new TextDecoder('utf-8');
	// 🔴 停止生成必须在「流式读取阶段」也立即生效(用户报"停止按钮不好使")。
	// 根因:withTimeout 在 fetch resolve(拿到响应头)后即移除了对 externalSignal 的监听,而流式读取发生在其后,
	// 且本读循环原先完全不检查 signal → 点「停止」时当前节仍把整段流吐完才停。
	// 修:直接监听 handlers.signal,abort 时 reader.cancel() 立刻中断 body 流;循环内双重检查 aborted。
	const sig = handlers.signal;
	let aborted = false;
	const abortStream = ()=>{ aborted = true; try{ reader.cancel(); }catch(_){} };
	if(sig){
		if(sig.aborted){ abortStream(); }
		else if(typeof sig.addEventListener === 'function'){ sig.addEventListener('abort', abortStream, { once: true }); }
	}
	const detachAbort = ()=>{ if(sig && typeof sig.removeEventListener === 'function'){ try{ sig.removeEventListener('abort', abortStream); }catch(_){} } };
	// 流「空闲看门狗」+「硬上限」(治用户报「换语言/有时卡很久不生成」):
	//   ⚠️ 此前看门狗在「每个 reader.read() 字节」都重置 → 后端 15s 心跳/keep-alive(无 token)会无限续命,
	//      推理模型「只思考不出 token」时该节永远转圈、且 concurrency=1 下卡死整份报告。
	//   修①:看门狗只在「真有内容 token(delta 事件)」时重置 —— 心跳不再续命,故「只心跳不出 token」超过 STALL_MS 即 fail-fast。
	//   修②:另设不可重置的 MAX_STREAM_MS 绝对上限,兜「token 龟速但永不收尾」。两者皆 → 抛错 → 上层标 failed → 队列推进,绝不永久挂起。
	// [#77 根修] 三层超时语义(Windows 仓 issue「GLM/qwen 回答卡在一半提示超时/思考过久提示重试」):
	//   连接+首响应头 = withTimeout(requestTimeoutMs,默认 120s;流体阶段 timer 已清不受管)
	//   空闲看门狗 STALL = 距上个真产出 token(delta/reasoning)的上限——默认 90s→180s(深思模型
	//     经部分中转网关思考期不流式转发,90s 真空即误杀;心跳仍不续命,fail-fast 语义不变)
	//   总时长 MAX = 不可续命绝对上限——默认 300s→1800s(旧值把「健康产出中的长思考+长文」一并
	//     掐死=issue「卡在一半」主因;定位回「防 token 龟速永不收尾」的兜底,STALL 已盖无产出情形)
	// 优先级:handlers 显式(报告管线) > providerOptions.streamStallMs/streamMaxStreamMs(用户
	// 高级参数,毫秒) > 默认。两键仅前端消费,后端剥离绝不下发上游。
	const po = (values && values.providerOptions) || {};
	const pickMs = (explicit, optVal, defVal)=>{
		if(Number(explicit) > 0){ return Number(explicit); }
		const v = Number(optVal);
		if(Number.isFinite(v) && v >= 1000){ return Math.min(v, 7200000); }
		return defVal;
	};
	const STALL_MS = pickMs(handlers.stallMs, po.streamStallMs, 180000);
	const MAX_STREAM_MS = pickMs(handlers.maxStreamMs, po.streamMaxStreamMs, 1800000);
	let stalled = false;
	let hardTimedOut = false;
	let watchdog = null;
	const armWatchdog = ()=>{
		if(watchdog){ clearTimeout(watchdog); }
		watchdog = setTimeout(()=>{ stalled = true; try{ reader.cancel(); }catch(_){} }, STALL_MS);
	};
	const clearWatchdog = ()=>{ if(watchdog){ clearTimeout(watchdog); watchdog = null; } };
	const hardTimer = setTimeout(()=>{ hardTimedOut = true; try{ reader.cancel(); }catch(_){} }, MAX_STREAM_MS);
	const clearHard = ()=>{ try{ clearTimeout(hardTimer); }catch(_){} };
	const parser = createSseParser((event)=>{
		// 内容 token(delta)与思维链 token(reasoning)都算「真有产出」→ 续命空闲看门狗(心跳/usage 不算)。
		// ⚠️ reasoning 必须续命:推理模型(o系/R1/deepseek-r1)可先纯思考 >90s 再出正文,
		//    若只认 delta,长思考期看门狗会在 STALL_MS 误杀流(报「长时间无新内容」),正是思考档要支持的场景。
		if(event && (event.type === 'delta' || event.type === 'reasoning')){ armWatchdog(); }
		if(handlers.onEvent){
			handlers.onEvent(event);
		}
	});
	try{
		armWatchdog();
		while(true){
			if(aborted || (sig && sig.aborted)){ break; }
			const chunk = await reader.read();
			if(chunk.done){
				break;
			}
			if(aborted || (sig && sig.aborted)){ break; }
			const decoded = decoder.decode(chunk.value, { stream: true });
			parser.push(vendorBridge ? vendorBridge.push(decoded) : decoded);
		}
		clearWatchdog();
		clearHard();
		detachAbort();
		if(aborted || (sig && sig.aborted)){
			// 用户主动停止 → 不当作正常完成,抛 AbortError 让上层按「已取消」处理(不重试、不标成功)。
			const err = new Error('已停止生成'); err.name = 'AbortError'; throw err;
		}
		if(stalled){
			throw new Error(`AI 响应连续 ${Math.round(STALL_MS / 1000)} 秒无新内容(疑似上游卡住或网关思考期不流式转发),已停止等待。深思模型可在提供商高级参数「流式空闲上限」调大;可点「重新生成」重试。`);
		}
		if(hardTimedOut){
			throw new Error(`AI 单次生成超过总时长上限 ${Math.round(MAX_STREAM_MS / 60000)} 分钟,已停止等待。超长任务可在提供商高级参数「流式总时长上限」调大;可点「重新生成」重试。`);
		}
		if(vendorBridge){
			parser.push(vendorBridge.end());
		}
		parser.end();
		if(handlers.onDone){
			handlers.onDone();
		}
	}catch(e){
		// 🔴 hardTimer 必须在异常路径也清:曾只在成功路径 clearHard(),失败/用户点停止
		// 各泄漏一个最长 5 分钟的定时器(闭包持 reader);报告逐节失败会线性堆积。
		clearWatchdog();
		clearHard();
		detachAbort();
		try{
			if(vendorBridge){ parser.push(vendorBridge.end()); }
			parser.end();
		}catch(_){ /* flush buffered SSE (e.g. a final error event) before propagating */ }
		if(handlers.onError){
			handlers.onError(e);
		}
		throw e;
	}
}

// [B-A7] 测试钩:SSE 解析器纯函数(不触网)。
export const __testing__ = { createSseParser };
