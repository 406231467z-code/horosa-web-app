// CPython random.Random：MT19937 与 _randbelow 拒绝抽样。
// randint(0, 1) 取 2 位再丢掉 >= 2 的值，与 Python 3.14 Random.randint 一致。
const N = 624;
const M = 397;

function u32(n){
	return n >>> 0;
}

function mul32(a, b){
	return Math.imul(a | 0, b | 0) >>> 0;
}

function bitLength(n){
	let k = 0;
	let x = n;
	while(x > 0){
		k += 1;
		x = Math.floor(x / 2);
	}
	return k;
}

export function createPythonRandom(seed){
	const mt = new Uint32Array(N);
	let index = N;
	function initGenrand(s){
		mt[0] = u32(s);
		for(let i = 1; i < N; i += 1){
			mt[i] = u32(mul32(1812433253, mt[i - 1] ^ (mt[i - 1] >>> 30)) + i);
		}
		index = N;
	}
	function initByArray(key){
		initGenrand(19650218);
		let i = 1;
		let j = 0;
		const keyLength = key.length;
		for(let k = N > keyLength ? N : keyLength; k; k -= 1){
			mt[i] = u32((mt[i] ^ mul32(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + key[j] + j);
			i += 1;
			j += 1;
			if(i >= N){
				mt[0] = mt[N - 1];
				i = 1;
			}
			if(j >= keyLength){
				j = 0;
			}
		}
		for(let k = N - 1; k; k -= 1){
			mt[i] = u32((mt[i] ^ mul32(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i);
			i += 1;
			if(i >= N){
				mt[0] = mt[N - 1];
				i = 1;
			}
		}
		mt[0] = 0x80000000;
	}
	let x = BigInt(seed);
	if(x < 0n){
		x = -x;
	}
	const key = [];
	if(x === 0n){
		key.push(0);
	}
	while(x > 0n){
		key.push(Number(x & 0xffffffffn));
		x >>= 32n;
	}
	initByArray(key);
	function genrand(){
		if(index >= N){
			for(let kk = 0; kk < N - M; kk += 1){
				const y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
				mt[kk] = u32(mt[kk + M] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0));
			}
			for(let kk = N - M; kk < N - 1; kk += 1){
				const y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
				mt[kk] = u32(mt[kk + (M - N)] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0));
			}
			const y = (mt[N - 1] & 0x80000000) | (mt[0] & 0x7fffffff);
			mt[N - 1] = u32(mt[M - 1] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0));
			index = 0;
		}
		let y = mt[index];
		index += 1;
		y = u32(y ^ (y >>> 11));
		y = u32(y ^ ((y << 7) & 0x9d2c5680));
		y = u32(y ^ ((y << 15) & 0xefc60000));
		y = u32(y ^ (y >>> 18));
		return y;
	}
	function randbelow(n){
		const k = bitLength(n);
		let r = genrand() >>> (32 - k);
		while(r >= n){
			r = genrand() >>> (32 - k);
		}
		return r;
	}
	return {
		randint(a, b){
			return a + randbelow(b - a + 1);
		},
		randint01(){
			for(;;){
				const r = genrand() >>> 30;
				if(r < 2){
					return r;
				}
			}
		},
	};
}
