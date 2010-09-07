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

const sageIDateParser = Components.interfaces.sageIDateParser;

/******************************************************************************
 * sageDateParser Component
 ******************************************************************************/
function sageDateParser() {};
sageDateParser.prototype = {

	classDescription: "Sage Date Parser Component",
	classID: Components.ID("{16077429-E1DE-434C-BCDB-D0AD6BE13AEE}"),
	contractID: "@sage.mozdev.org/sage/dateparser;1",

	parseRFC822: function(aDateString)
	{
		date_array = aDateString.split(" ");
		// check for two digit year
		if(!isNaN(date_array[3]) && date_array[3].length == 2) { // format DDD, dd MMM yy [tt:mm:ss zzz], asumes that time is in format tt:mm or uexpected result will happen
			// convert to four digit year with a pivot of 70
			if(date_array[3] < 70) {
				date_array[3] = "20" + date_array[3];
			} else {
				date_array[3] = "19" + date_array[3];
			}
		} else if(!isNaN(date_array[2]) && date_array[2].length == 2) { // format dd MMM yy [tt:mm:ss zzz]
			// convert to four digit year with a pivot of 70
			if(date_array[2] < 70) {
				date_array[2] = "20" + date_array[2];
			} else {
				date_array[2] = "19" + date_array[2];
			}
		}
		dLength = date_array.length-1;
		if (date_array[dLength].length == 1) { // uses 1alpha as timezone marker
			// but im confused, rfc822 and rfc2822 that replace the former have oppositt defenitions. "A" in rfc822 is -0100 and in rfc2822 +0100
			switch (date_array[dLength]) {
				case 'A', 'a':
					date_array[dLength] = '-0100'
				case 'B', 'b':
					date_array[dLength] = '-0200'
				case 'C', 'c':
					date_array[dLength] = '-0300'
				case 'D', 'd':
					date_array[dLength] = '-0400'
				case 'E', 'e':
					date_array[dLength] = '-0500'
				case 'F', 'f':
					date_array[dLength] = '-0600'
				case 'G', 'g':
					date_array[dLength] = '-0700'
				case 'H', 'h':
					date_array[dLength] = '-0800'
				case 'I', 'i':
					date_array[dLength] = '-0900'
				case 'K', 'k':
					date_array[dLength] = '-1000'
				case 'L', 'l':
					date_array[dLength] = '-1100'
				case 'M', 'm':
					date_array[dLength] = '-1200'
				case 'N', 'n':
					date_array[dLength] = '+0100'
				case 'O', 'o':
					date_array[dLength] = '+0200'
				case 'P', 'p':
					date_array[dLength] = '+0300'
				case 'Q', 'q':
					date_array[dLength] = '+0400'
				case 'R', 'r':
					date_array[dLength] = '+0500'
				case 'S', 's':
					date_array[dLength] = '+0600'
				case 'T', 't':
					date_array[dLength] = '+0700'
				case 'U', 'u':
					date_array[dLength] = '+0800'
				case 'V', 'v':
					date_array[dLength] = '+0900'
				case 'W', 'w':
					date_array[dLength] = '+1000'
				case 'X', 'x':
					date_array[dLength] = '+1100'
				case 'Y', 'y':
					date_array[dLength] = '+1200'
				case 'Z', 'z':
					date_array[dLength] = 'GMT'
			}
		}
		aDateString = date_array.join(" ");
		date = new Date(aDateString);
		if(date != "Invalid Date") {
			return date.getTime();
		} else {
			throw "RFC 822 parse error";
		}
	},
	
	parseISO8601: function(aDateString)
	{
		// trims leading spaces
		function lTrim(string) {
			return string.replace(/^\s+/gm, '');
		}
		
		// trims trailing spaces
		function rTrim(string) {
			return string.replace(/\s+$/gm, '');
		}
		
		// trims spaces
		function trim(string) {
			return lTrim(rTrim(string));
		}
	
		var tmp = trim(aDateString); // remove any leding and/or trailing spaces
		if (tmp.indexOf('T') > -1) {
			tmp = tmp.split('T');
		} else {
			tmp = tmp.split(' '); // space can also be a legel date/time separator
		}
		var date = tmp[0];
		var year, month, day;
		var hours = 0;
		var minutes = 0;
		var seconds = 0;
		var tz_mark, tz_hours, tz_minutes;
		tz_hours = 0;
		tz_minutes = 0;
		var time, whole_time, tz;
	
		if (date.indexOf('-') > -1) { //extended notation
			date = date.split("-");
			year = date[0];
			month = date[1];
			day = date[2];
		} else if (date.length == 8) { // basic notation with YYYY as year
			year = date.substr(0,4);
			month = date.substr(4,2);
			day = date.substr(6,2);
		} else if (date.length == 6) { // basic notation with YY as year
			year = date.substr(0,2);
			month = date.substr(2,2);
			day = date.substr(4,2);
		} else {
			year = 'NaN';
			month = 'NaN';
			day = 'NaN';
		}
		if (year.length == 1) { // when i tested i could se that 5-5-5 will give me a valid date
			year = '0' + year;
		}
		if (year.length == 2) { // add century to YY notation
			if (year < 70) {
				year = '20' + year;
			} else {
				year = '19' + year;
			}
		}
	
		if(tmp.length == 2) { // contains time
			whole_time = tmp[1];
			tz_mark = whole_time.match("[Z+-]{1}");
			if(tz_mark) {// contains timezone
				tmp = whole_time.split(tz_mark);
				time = tmp[0];
				if(tz_mark == "+" || tz_mark == "-") { // is not utc time
					tz = tmp[1];
					if (tz.indexOf(':') > -1) { // extended notation
						tmp = tz.split(":");
						tz_hours = tmp[0];
						tz_minutes = tmp[1];
					} else { // basic notation
						tz_hours = tz.substr(0,2);
						tz_minutes = tz.substr(2,2);
					}
				}
			} else {
				//tz_mark = "Z";
				time = whole_time;
			}
			if (time.indexOf(':') > -1) { // extended notation
				tmp = time.split(":");
				hours = tmp[0];
				minutes = tmp[1];
				seconds = tmp[2]?tmp[2]:0;
			} else { // basic notation
				hours = time.substr(0,2);
				minutes = time.substr(2,2);
				seconds = time.substr(4,2);
			}
		}
	
		var utc = Date.UTC(year, month - 1, day, hours, minutes, seconds);
		var return_date;
		if (!tz_mark) {// no timezone, assume local date
			return_date = new Date(year, month - 1, day, hours, minutes, seconds);
		} else if(tz_mark == "Z") {
			return_date = new Date(utc);
		} else if(tz_mark == "+") {
			return_date = new Date(utc - tz_hours*3600000 - tz_minutes*60000);
		} else if(tz_mark == "-") {
			return_date = new Date(utc + tz_hours*3600000 + tz_minutes*60000);
		} else {
			throw "ISO 6801 parse error";
		}
		if (return_date == "Invalid Date") {
			throw "ISO 6801 parse error";
		} else {
			return return_date.getTime();
		}
	},
	
	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.sageIDateParser])

};

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([sageDateParser]);
} else {
	var NSGetModule = XPCOMUtils.generateNSGetModule([sageDateParser]);
}
