// Decide, antes da primeira pintura, se a animação de entrada aparece. Fica fora do componente (que é "use client")
// porque o layout do servidor precisa do texto do script: de um ficheiro "use client" só lhe chegava uma referência.

export const INTRO_KEY = "msx-intro";
/** quando a entrada apareceu pela última vez (guardado no aparelho, não só na sessão) */
export const INTRO_AT_KEY = "msx-intro-at";
/** depois de aparecer, não volta durante este tempo: recarregar a página mostra só o ecrã de carregamento */
const RECENT_MS = 30 * 60 * 1000;

/**
 * Esconde a entrada se já foi vista nesta sessão ou há menos de 30 minutos (alguns telemóveis, ao recarregar a app
 * instalada, começam uma sessão nova), em testes automáticos ou nas páginas legais. `?intro=1` mostra-a sempre.
 */
export const INTRO_GATE = `try{var q=/[?&]intro=1/.test(location.search),t=+localStorage.getItem('${INTRO_AT_KEY}')||0;if(!q&&(sessionStorage.getItem('${INTRO_KEY}')||Date.now()-t<${RECENT_MS}||navigator.webdriver||/^\\/(privacidade|termos)/.test(location.pathname)))document.documentElement.dataset.intro='skip'}catch(e){document.documentElement.dataset.intro='skip'}`;
