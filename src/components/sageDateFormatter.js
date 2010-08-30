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

const sageIDateFormatter = Components.interfaces.sageIDateFormatter;

/******************************************************************************
 * sageDateFormatter Component
 ******************************************************************************/
function sageDateFormatter() {};
sageDateFormatter.prototype = {

	classDescription: "Sage Date Formatter Component",
	classID: Components.ID("{E5D15F67-C113-497D-AC6F-40296FEAD058}"),
	contractID: "@sage.mozdev.org/sage/dateformatter;1",

	_format: sageIDateFormatter.FORMAT_LONG,
	_abbreviated: sageIDateFormatter.ABBREVIATED_TRUE,
	_clock: sageIDateFormatter.CLOCK_12HOUR,
	
	get format() { return this._format; },
	get abbreviated() { return this._abbreviated; },
	get clock() { return this._clock; },
	
	setFormat: function(aFormat, aAbbreviated, aClock)
	{
		this._format = aFormat;
		this._abbreviated = aAbbreviated;
		this._clock = aClock;
	},
	
	formatDate: function(aDate)
	{
		function padout(number) { return (number < 10) ? '0' + number : number; }

		var date = new Date(aDate);
		var dayOfMonth = date.getDate();
		
		var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
		var stringBundle = strBundleService.createBundle("chrome://sage/locale/sage.properties");
	
		var key, modifier;
		if (this._abbreviated == sageIDateFormatter.ABBREVIATED_TRUE) {
			modifier = "_short";
		} else {
			modifier = "";
		}
		
		switch (date.getDay()) {
			case 0: key = "date_sunday"; break;
			case 1: key = "date_monday"; break;
			case 2: key = "date_tuesday"; break;
			case 3: key = "date_wednesday"; break;
			case 4: key = "date_thursday"; break;
			case 5: key = "date_friday"; break;
			case 6: key = "date_saturday"; break;
		}
		var day = stringBundle.GetStringFromName(key + modifier);
	
		var monthNum = date.getMonth() + 1;
		switch (monthNum) {
			case 1: key = "date_january"; break;
			case 2: key = "date_february"; break;
			case 3: key = "date_march"; break;
			case 4: key = "date_april"; break;
			case 5: key = "date_may"; break;
			case 6: key = "date_june"; break;
			case 7: key = "date_july"; break;
			case 8: key = "date_august"; break;
			case 9: key = "date_september"; break;
			case 10: key = "date_october"; break;
			case 11: key = "date_november"; break;
			case 12: key = "date_december"; break;
		}
		var month = stringBundle.GetStringFromName(key + modifier);
		
		var year = date.getYear() + 1900;
	
		var date_str;
		switch (this._format) {
			case sageIDateFormatter.FORMAT_LONG:
				date_str = day + ", " + month + " " + dayOfMonth + ", " + year;
				break;
			case sageIDateFormatter.FORMAT_SHORT:
				date_str = monthNum + "/" + dayOfMonth + "/" + year;
				break;
		}
	
		var hours = date.getHours(), minutes = padout(date.getMinutes()), seconds = padout(date.getSeconds());
		var adjhours, time_str;
		switch (this._clock) {
			case sageIDateFormatter.CLOCK_12HOUR:
				adjhours = (hours == 0) ? 12 : ((hours < 13) ? hours : hours-12);
				time_str = adjhours + ":" + minutes + ((hours < 12) ? " AM" : " PM");
				break;
			case sageIDateFormatter.CLOCK_24HOUR:
				time_str = hours + ":" + minutes;
				break;
		}
		return date_str + " " + time_str;
	},
	
	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.sageIDateFormatter])

};

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([sageDateFormatter]);
} else {
	var NSGetModule = XPCOMUtils.generateNSGetModule([sageDateFormatter]);
}
