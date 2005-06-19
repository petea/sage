/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Sage.
 *
 * The Initial Developer of the Original Code is
 * Peter Andrews <petea@jhu.edu>.
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Peter Andrews <petea@jhu.edu>
 * Erik Arvidsson <erik@eae.net>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const APP_NAME			= "Sage";
const APP_CHROME_NAME		= "sage";
const APP_VERSION		= "1.4";
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
const APP_LOCALE_CSCZ_PATH	= "locale/cs-CZ/";
const APP_LOCALE_ELGR_PATH	= "locale/el-GR/";
const APP_LOCALE_PLPL_PATH	= "locale/pl-PL/";
const APP_LOCALE_PTBR_PATH	= "locale/pt-BR/";
const APP_LOCALE_SLSI_PATH	= "locale/sl-SI/";
const APP_LOCALE_ZHCN_PATH	= "locale/zh-CN/";

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
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_CSCZ_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_ELGR_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_PLPL_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_PTBR_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_SLSI_PATH);
registerChrome(LOCALE | PROFILE_CHROME, jarFolder, APP_LOCALE_ZHCN_PATH);

var result = getLastError(); 
if(result == SUCCESS) {
	performInstall();
} else {
	cancelInstall(result);
}
