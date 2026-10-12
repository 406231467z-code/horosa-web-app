// Cloud account endpoints were removed from the pure-web product scope.
// These compatibility exports deliberately perform no network requests.
function unavailableAccountAction(){
	return Promise.reject(new Error('云账号功能已移除；请使用本地命盘管理。'));
}

export function getImgToken(){
	return unavailableAccountAction();
}

export function login(){
	return unavailableAccountAction();
}

export function register(){
	return unavailableAccountAction();
}

export function resetpwd(){
	return unavailableAccountAction();
}

export function logout(){
	return Promise.resolve({ Result: true });
}
