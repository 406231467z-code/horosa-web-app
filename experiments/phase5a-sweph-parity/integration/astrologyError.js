/**
 * Provider errors stay explicit. Callers do not infer a silent backend retry.
 */
export function astrologyError(code, message, capability, provider) {
	const err = new Error(message);
	err.name = 'AstrologyCalculationError';
	err.code = code;
	err.capability = capability;
	err.provider = provider;
	return err;
}

export function isAstrologyError(err) {
	return !!(err && err.name === 'AstrologyCalculationError' && err.code && err.provider);
}
