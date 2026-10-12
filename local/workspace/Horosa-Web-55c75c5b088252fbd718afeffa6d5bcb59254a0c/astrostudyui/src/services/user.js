// Legacy cloud-account and AstroReader services are outside the local-first web scope.
// Keep compatibility exports for old views, but never send requests to the old backend.
function removedLegacyService(){
	return Promise.reject(new Error('此版本已移除云账号/星阅云服务；命盘请使用本地管理。'));
}

export function changepwd(){
	return removedLegacyService();
}

export function changeparams(){
	return removedLegacyService();
}

export function listBooks(){
	return removedLegacyService();
}

export function allBooks(){
	return removedLegacyService();
}

export function getChapter(){
	return removedLegacyService();
}

export function updateBook(){
	return removedLegacyService();
}

export function deleteBook(){
	return removedLegacyService();
}

export function removeBook(){
	return removedLegacyService();
}

export function readprogress(){
	return removedLegacyService();
}
