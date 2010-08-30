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

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const sageILogger = Components.interfaces.sageILogger;
const PREF_LOG_LEVEL = "extensions.sage.logLevel";

/******************************************************************************
 * sageLogger Component
 ******************************************************************************/
function sageLogger() {};
sageLogger.prototype = {
	
	classDescription: "Sage Logger Component",
	classID: Components.ID("{DA518D7D-6C3E-4507-99E2-6102EB3BD031}"),
	contractID: "@sage.mozdev.org/sage/logger;1",
		
	_level: sageILogger.LEVEL_WARN,
	_consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
	
	init: function()
	{
		var pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		if (pref.prefHasUserValue(PREF_LOG_LEVEL)) {
			this.setLevel(pref.getIntPref(PREF_LOG_LEVEL));
		}	
	},

	setLevel: function(aLevel)
	{
		this._level = aLevel;
	},

	debug: function(aMessage)
	{
		if (this._level <= sageILogger.LEVEL_DEBUG) {
			this._consoleService.logStringMessage("Sage [DEBUG]: " + aMessage);
		}
	},
	
	info: function(aMessage)
	{
		if (this._level <= sageILogger.LEVEL_INFO) {
			this._consoleService.logStringMessage("Sage [INFO]: " + aMessage);
		}
	},
	
	warn: function(aMessage)
	{
		if (this._level <= sageILogger.LEVEL_WARN) {
			this._consoleService.logStringMessage("Sage [WARN]: " + aMessage);
		}
	},
	
	error: function(aMessage)
	{
		if (this._level <= sageILogger.LEVEL_ERROR) {
			this._consoleService.logStringMessage("Sage [ERROR]: " + aMessage);
		}
	},
	
	fatal: function(aMessage)
	{
		if (this._level <= sageILogger.LEVEL_FATAL) {
			this._consoleService.logStringMessage("Sage [FATAL]: " + aMessage);
		}
	},
	
	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.sageILogger])

};

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([sageLogger]);
} else {
	var NSGetModule = XPCOMUtils.generateNSGetModule([sageLogger]);
}
