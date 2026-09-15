/**
 * Shared by the server layout and the client toggle. Kept out of the toggle's
 * 'use client' module: a server component importing a value from one receives
 * a client reference rather than the string itself.
 */
export const THEME_STORAGE_KEY = 'ar-menu-theme'

/**
 * Runs inline in <head> before first paint, so a saved choice is applied
 * before the page is drawn instead of flashing the system theme first. Only
 * reads storage; nothing is written until someone presses the toggle.
 */
export const themeInitScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`
