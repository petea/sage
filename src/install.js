const APP_NAME			= "Sage";
const APP_CHROME_NAME		= "sage";
const APP_VERSION		= "1.3";
const APP_FILE 			= "sage.jar";
const APP_CONTENTS_PATH		= "content/";
const APP_SKIN_CLASSIC_PATH	= "skin/classic/";
const APP_LOCALE_ENUS_PATH	= "locale/en-US/";
const APP_LOCALE_JAJP_PATH	= "locale/ja-JP/";
const APP_LOCALE_FRFR_PATH	= "locale/fr-FR/";
const APP_LOCALE_HUHU_PATH	= "locale/hu-HU/";
const APP_LOCALE_ITIT_PATH	= "locale/it-IT/";
const APP_LOCALE_NLNL_PATH	= "locale/nl-NL/";
const APP_LOCALE_CAAD_PATH	= "locale/ca-AD/";
const APP_LOCALE_ZHTW_PATH	= "locale/zh-TW/";
const APP_LOCALE_DEDE_PATH	= "locale/de-DE/";
const APP_LOCALE_ESES_PATH	= "locale/es-ES/";
const APP_LOCALE_RURU_PATH	= "locale/ru-RU/";
const APP_LOCALE_DEAT_PATH	= "locale/de-AT/";
const APP_LOCALE_DECH_PATH	= "locale/de-CH/";
const APP_LOCALE_SVSE_PATH	= "locale/sv-SE/";
const APP_LOCALE_KOKR_PATH	= "locale/ko-KR/";
const APP_LOCALE_SRYU_PATH	= "locale/sr-YU/";
const APP_LOCALE_SRYU_LATN_PATH	= "locale/sr-YU@Latn/";
const APP_LOCALE_ESAR_PATH	= "locale/es-AR/";
const APP_LOCALE_FIFI_PATH	= "locale/fi-FI/";

initInstall(APP_NAME, APP_CHROME_NAME, APP_VERSION); 

var chromeFolder = getFolder("Current User", "chrome");
setPackageFolder(chromeFolder);
addFile(APP_NAME, "chrome/" + APP_FILE, chromeFolder, "");

var jarFolder = getFolder(chromeFolder, APP_FILE);
registerChrome(CONTENT | PROFILE_CHROME, jarFolder, APP_CONTENTS_PATH);
registerChrome(SKIN | PROFILE_CHROME, jarFolder, APP_SKIN_CLASSIC_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_ENUS_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_JAJP_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_FRFR_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_HUHU_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_ITIT_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_NLNL_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_CAAD_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_ZHTW_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_DEDE_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_ESES_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_RURU_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_DEAT_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_DECH_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_SVSE_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_KOKR_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_SRYU_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_SRYU_LATN_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_ESAR_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_FIFI_PATH);

var result = getLastError(); 
if(result == SUCCESS) {
	performInstall();
} else {
	cancelInstall(result);
}
