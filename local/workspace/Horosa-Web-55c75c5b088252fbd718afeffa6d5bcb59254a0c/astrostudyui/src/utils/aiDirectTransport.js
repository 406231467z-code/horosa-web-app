import {
	getProviderPreset,
	getProviderProtocolFamily,
	isOpenAIReasoningModel,
} from './aiAnalysisProviders';

export const AI_TRANSPORT_PROXY = 'proxy';
export const AI_TRANSPORT_DIRECT = 'direct';

const HOROSA_OPTION_KEYS = new Set([
	'extraHeaders',
	'extraBody',
	'apiVersion',
	'requestTimeoutMs',
	'streamStallMs',
	'streamMaxStreamMs',
	'embeddingModel',
	'authHeaderName',
	'authPrefix',
	'aiTransport',
]);

const CACHE_MARK = '[[__CACHE_BP__]]';

export function resolveAiTransport(values){
	const fromTop = values && values.aiTransport;
	const fromOpts = values && values.providerOptions && values.providerOptions.aiTransport;
	return fromTop === AI_TRANSPORT_DIRECT || fromOpts === AI_TRANSPORT_DIRECT
		? AI_TRANSPORT_DIRECT
		: AI_TRANSPORT_PROXY;
}

export function stripAiTransport(values){
	const src = values && typeof values === 'object' ? values : {};
	const next = { ...src };
	delete next.aiTransport;
	if(src.providerOptions && typeof src.providerOptions === 'object'){
		const opts = { ...src.providerOptions };
		delete opts.aiTransport;
		next.providerOptions = opts;
	}
	return next;
}

function joinUrl(base, suffix){
	const b = `${base || ''}`.replace(/\/+$/, '');
	const s = `${suffix || ''}`.startsWith('/') ? `${suffix}` : `/${suffix || ''}`;
	return b + s;
}

function redact(text, secret){
	const raw = `${text || ''}`;
	const key = `${secret || ''}`;
	if(!key){
		return raw;
	}
	return raw.split(key).join('[redacted]');
}

function stripCache(text){
	return `${text || ''}`.split(CACHE_MARK).join('');
}

function vendorBodyFields(providerOptions){
	const opts = providerOptions && typeof providerOptions === 'object' ? providerOptions : {};
	const extra = opts.extraBody && typeof opts.extraBody === 'object' ? { ...opts.extraBody } : {};
	const body = { ...extra };
	Object.keys(opts).forEach((key)=>{
		if(!HOROSA_OPTION_KEYS.has(key)){
			body[key] = opts[key];
		}
	});
	delete body.apiKey;
	return body;
}

function authHeaders(providerType, apiKey, providerOptions){
	const headers = { 'Content-Type': 'application/json; charset=UTF-8' };
	const key = `${apiKey || ''}`.trim();
	const opts = providerOptions || {};
	if(providerType === 'anthropic'){
		headers['x-api-key'] = key;
		headers['anthropic-version'] = `${opts.apiVersion || '2023-06-01'}`.trim() || '2023-06-01';
	}else if(key && providerType !== 'ollama' && providerType !== 'gemini'){
		const name = `${opts.authHeaderName || 'Authorization'}`.trim() || 'Authorization';
		const prefix = opts.authPrefix === undefined || opts.authPrefix === null
			? (name.toLowerCase() === 'authorization' ? 'Bearer ' : '')
			: `${opts.authPrefix}`;
		headers[name] = prefix + key;
	}
	if(providerType === 'openrouter'){
		headers['HTTP-Referer'] = 'https://www.horosa.com';
		headers['X-Title'] = 'Horosa AI Analysis';
	}
	const extra = opts.extraHeaders && typeof opts.extraHeaders === 'object' ? opts.extraHeaders : {};
	Object.keys(extra).forEach((name)=>{
		const value = extra[name];
		if(name && value !== undefined && value !== null && `${value}` !== ''){
			headers[name] = `${value}`;
		}
	});
	return headers;
}

function textMessages(messages){
	return (Array.isArray(messages) ? messages : []).map((item)=>{
		const one = item && typeof item === 'object' ? item : {};
		return {
			role: `${one.role || 'user'}`,
			content: stripCache(typeof one.content === 'string' ? one.content : ''),
		};
	}).filter((item)=>item.content);
}

function openaiBody(model, messages, stream, providerOptions){
	const body = {
		model,
		messages: textMessages(messages),
		...vendorBodyFields(providerOptions),
		stream: !!stream,
	};
	if(stream){
		body.stream_options = body.stream_options || { include_usage: true };
	}
	if(isOpenAIReasoningModel(model)){
		if(body.max_tokens != null && body.max_completion_tokens == null){
			body.max_completion_tokens = body.max_tokens;
		}
		delete body.max_tokens;
		delete body.temperature;
		delete body.top_p;
	}else if(body.max_completion_tokens != null && body.max_tokens == null){
		body.max_tokens = body.max_completion_tokens;
		delete body.max_completion_tokens;
	}
	delete body.apiKey;
	return body;
}

function anthropicBody(model, messages, stream, providerOptions){
	const fields = vendorBodyFields(providerOptions);
	const system = [];
	const chat = [];
	textMessages(messages).forEach((item)=>{
		if(item.role === 'system'){
			system.push(item.content);
			return;
		}
		chat.push({
			role: item.role === 'assistant' ? 'assistant' : 'user',
			content: [{ type: 'text', text: item.content }],
		});
	});
	const body = {
		model,
		max_tokens: fields.max_tokens || 2048,
		messages: chat,
		stream: !!stream,
	};
	if(system.length){
		body.system = system.join('\n\n');
	}
	if(fields.thinking){
		body.thinking = fields.thinking;
	}else if(fields.temperature != null){
		body.temperature = fields.temperature;
	}
	if(fields.stop_sequences){
		body.stop_sequences = fields.stop_sequences;
	}
	if(fields.top_p != null && !fields.thinking){
		body.top_p = fields.top_p;
	}
	if(fields.top_k != null && !fields.thinking){
		body.top_k = fields.top_k;
	}
	delete body.apiKey;
	return body;
}

function geminiBody(messages, providerOptions){
	const fields = vendorBodyFields(providerOptions);
	const system = [];
	const contents = [];
	textMessages(messages).forEach((item)=>{
		if(item.role === 'system'){
			system.push(item.content);
			return;
		}
		contents.push({
			role: item.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: item.content }],
		});
	});
	const body = { contents };
	if(system.length){
		body.systemInstruction = { parts: [{ text: system.join('\n\n') }] };
	}
	const generationConfig = { ...(fields.generationConfig || {}) };
	if(fields.temperature != null && generationConfig.temperature == null){
		generationConfig.temperature = fields.temperature;
	}
	if(fields.top_p != null && generationConfig.topP == null){
		generationConfig.topP = fields.top_p;
	}
	if(fields.maxOutputTokens != null && generationConfig.maxOutputTokens == null){
		generationConfig.maxOutputTokens = fields.maxOutputTokens;
	}
	if(fields.response_format && fields.response_format.type === 'json_object' && !generationConfig.responseMimeType){
		generationConfig.responseMimeType = 'application/json';
	}
	if(Object.keys(generationConfig).length){
		body.generationConfig = generationConfig;
	}
	if(Array.isArray(fields.safetySettings) && fields.safetySettings.length){
		body.safetySettings = fields.safetySettings;
	}
	delete body.apiKey;
	return body;
}

export function buildDirectChatRequest(values, stream){
	const providerType = `${(values && values.providerType) || 'openai'}`.trim() || 'openai';
	const preset = getProviderPreset(providerType);
	const family = getProviderProtocolFamily(providerType);
	const baseUrl = `${(values && values.baseUrl) || preset.baseUrl || ''}`.trim();
	const model = `${(values && values.model) || ''}`.trim();
	const apiKey = `${(values && values.apiKey) || ''}`.trim();
	const opts = (values && values.providerOptions) || {};
	if(!model){
		throw new Error('缺少模型');
	}
	if(!apiKey && providerType !== 'ollama'){
		throw new Error('直连需要 API Key');
	}
	const headers = authHeaders(providerType, apiKey, opts);
	let url;
	let body;
	if(family === 'anthropic' || providerType === 'anthropic'){
		url = joinUrl(baseUrl, '/v1/messages');
		body = anthropicBody(model, values.messages, stream, opts);
	}else if(family === 'gemini' || providerType === 'gemini'){
		const action = stream ? 'streamGenerateContent' : 'generateContent';
		const query = stream ? `?alt=sse&key=${encodeURIComponent(apiKey)}` : `?key=${encodeURIComponent(apiKey)}`;
		url = joinUrl(baseUrl, `/models/${encodeURIComponent(model)}:${action}${query}`);
		body = geminiBody(values.messages, opts);
	}else{
		url = joinUrl(baseUrl, '/chat/completions');
		body = openaiBody(model, values.messages, stream, opts);
	}
	return {
		url,
		headers,
		body,
		providerType,
		family,
		apiKey,
	};
}

export function buildDirectEmbeddingRequest(values){
	const providerType = `${(values && values.providerType) || 'openai'}`.trim() || 'openai';
	const family = getProviderProtocolFamily(providerType);
	const preset = getProviderPreset(providerType);
	const baseUrl = `${(values && values.baseUrl) || preset.baseUrl || ''}`.trim();
	const model = `${(values && (values.embeddingModel || values.model)) || ''}`.trim();
	const apiKey = `${(values && values.apiKey) || ''}`.trim();
	const input = Array.isArray(values && values.input) ? values.input : [];
	if(!model){
		throw new Error('缺少 embedding 模型');
	}
	if(family === 'gemini' || providerType === 'gemini'){
		return {
			kind: 'gemini',
			requests: input.map((text)=>({
				url: joinUrl(baseUrl, `/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(apiKey)}`),
				headers: authHeaders(providerType, apiKey, values.providerOptions),
				body: { content: { parts: [{ text: `${text || ''}` }] } },
			})),
			apiKey,
			providerType,
			model,
		};
	}
	return {
		kind: 'openai',
		requests: [{
			url: joinUrl(baseUrl, '/embeddings'),
			headers: authHeaders(providerType, apiKey, values.providerOptions),
			body: { model, input },
		}],
		apiKey,
		providerType,
		model,
	};
}

export function buildAiTransportPlan(values, options = {}){
	const mode = resolveAiTransport(values);
	if(mode === AI_TRANSPORT_DIRECT){
		const vendor = options.embedding
			? null
			: buildDirectChatRequest(values, !!options.stream);
		return {
			mode,
			sealForJava: false,
			proxyValues: null,
			vendor,
			embedding: options.embedding ? buildDirectEmbeddingRequest(values) : null,
		};
	}
	return {
		mode: AI_TRANSPORT_PROXY,
		sealForJava: true,
		proxyValues: stripAiTransport(values),
		vendor: null,
		embedding: null,
	};
}

export function bodyHasSecret(body, secret){
	const key = `${secret || ''}`;
	if(!key){
		return false;
	}
	return JSON.stringify(body).indexOf(key) >= 0;
}

function horosaFrame(type, payload){
	return `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function openaiFrames(payload){
	if(!payload || typeof payload !== 'object'){
		return '';
	}
	const choice = payload.choices && payload.choices[0];
	const delta = choice && (choice.delta || choice.message);
	let out = '';
	if(delta && typeof delta === 'object'){
		const reasoning = delta.reasoning_content || delta.reasoning;
		if(reasoning){
			out += horosaFrame('reasoning', { reasoning });
		}
		const content = typeof delta.content === 'string' ? delta.content : '';
		if(content){
			out += horosaFrame('delta', { delta: content });
		}
	}
	if(payload.usage){
		out += horosaFrame('usage', { usage: payload.usage });
	}
	return out;
}

function anthropicFrames(eventName, payload){
	if(!payload || typeof payload !== 'object'){
		return '';
	}
	const type = payload.type || eventName;
	if(type === 'content_block_delta' && payload.delta){
		if(payload.delta.type === 'thinking_delta' && payload.delta.thinking){
			return horosaFrame('reasoning', { reasoning: payload.delta.thinking });
		}
		if(payload.delta.text){
			return horosaFrame('delta', { delta: payload.delta.text });
		}
	}
	return '';
}

function geminiFrames(payload){
	const parts = payload
		&& payload.candidates
		&& payload.candidates[0]
		&& payload.candidates[0].content
		&& payload.candidates[0].content.parts;
	if(!Array.isArray(parts)){
		return '';
	}
	let out = '';
	parts.forEach((part)=>{
		if(!part || !part.text){
			return;
		}
		if(part.thought){
			out += horosaFrame('reasoning', { reasoning: part.text });
		}else{
			out += horosaFrame('delta', { delta: part.text });
		}
	});
	return out;
}

export function createVendorSseBridge(family){
	let buffer = '';
	let eventName = 'message';
	function consume(line){
		if(!line){
			eventName = 'message';
			return '';
		}
		if(line.indexOf('event:') === 0){
			eventName = line.slice(6).trim() || 'message';
			return '';
		}
		if(line.indexOf('data:') !== 0){
			return '';
		}
		const data = line.slice(5).trim();
		if(!data || data === '[DONE]'){
			return '';
		}
		let payload = null;
		try{
			payload = JSON.parse(data);
		}catch(e){
			return '';
		}
		if(family === 'anthropic'){
			return anthropicFrames(eventName, payload);
		}
		if(family === 'gemini'){
			return geminiFrames(payload);
		}
		return openaiFrames(payload);
	}
	return {
		push(chunk){
			buffer += chunk || '';
			let out = '';
			let idx = buffer.indexOf('\n');
			while(idx >= 0){
				const line = buffer.slice(0, idx).replace(/\r$/, '');
				buffer = buffer.slice(idx + 1);
				out += consume(line);
				idx = buffer.indexOf('\n');
			}
			return out;
		},
		end(){
			const rest = buffer;
			buffer = '';
			return rest ? consume(rest.replace(/\r$/, '')) : '';
		},
	};
}

export function extractDirectChatContent(family, payload){
	if(!payload || typeof payload !== 'object'){
		return '';
	}
	if(family === 'anthropic'){
		const blocks = Array.isArray(payload.content) ? payload.content : [];
		return blocks.map((block)=>block && block.text ? block.text : '').join('');
	}
	if(family === 'gemini'){
		const parts = payload.candidates
			&& payload.candidates[0]
			&& payload.candidates[0].content
			&& payload.candidates[0].content.parts;
		if(!Array.isArray(parts)){
			return '';
		}
		return parts.filter((part)=>part && part.text && !part.thought).map((part)=>part.text).join('');
	}
	const choice = payload.choices && payload.choices[0];
	const message = choice && choice.message;
	return message && typeof message.content === 'string' ? message.content : '';
}

export function extractEmbeddingVectors(payload){
	const data = payload && Array.isArray(payload.data) ? payload.data : [];
	return data.map((item)=>item && Array.isArray(item.embedding) ? item.embedding : []);
}

export function redactSecret(text, secret){
	return redact(text, secret);
}
