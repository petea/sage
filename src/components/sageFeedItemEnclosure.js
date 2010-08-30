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

const sageIFeedItemEnclosure = Components.interfaces.sageIFeedItemEnclosure;

/******************************************************************************
 * sageFeedItemEnclosure Component
 ******************************************************************************/
function sageFeedItemEnclosure() {};
sageFeedItemEnclosure.prototype = {
	
	classDescription: "Sage Feed Item Enclosure Component",
	classID: Components.ID("{E32528AA-6F29-4763-AB2A-2182CA6649FA}"),
	contractID: "@sage.mozdev.org/sage/feeditemenclosure;1",
	
	_link: null,
	_length: null,
	_mimeType: null,
	
	init: function(link, length, mimeType)
	{
		this._link = link;
		this._length = length;
		this._mimeType = mimeType;
	},
	
	hasLink: function()
	{
		return Boolean(this._link);
	},
	
	getLink: function()
	{
		return this.hasLink() ? this._link : null;
	},
	
	hasLength: function()
	{
		return this._length != null;
	},
	
	getLength: function()
	{
		return this.hasLength() ? this._length : null;
	},
	
	getSize: function()
	{
		if (this.hasLength()) {
			if (this._length > 1048576) {
				return Math.round(this._length / 1048576) + "M";
	            }
			else if (this._length > 1024) {
				return Math.round(this._length / 1024) + "K";
			}
			else {
				return this._length + "B";
			}
		} else {
			return null;
		}
	},
	
	hasMimeType: function()
	{
		return Boolean(this._mimeType);
	},
	
	getMimeType: function()
	{
		return this.hasMimeType() ? this._mimeType : null;
		// TODO: Use mime service to map URI to mime type
	},
	
	getDescription: function()
	{
		if (this.hasMimeType()) {

			var mimeService = Components.classes["@mozilla.org/mime;1"].createInstance(Components.interfaces.nsIMIMEService);
			var mimeInfo = mimeService.getFromTypeAndExtension(this._mimeType, "");	// should also pass extension
	
			// from nsHelperAppDlg.js
			// 1. Try to use the pretty description of the type, if one is available.
			var typeString = mimeInfo.Description;
	
			if (typeString == "") {
				// 2. If there is none, use the extension to identify the file, e.g. "ZIP file"
				var primaryExtension = "";
				try {
					primaryExtension = mimeInfo.primaryExtension;
				} catch (ex) {
				}
				if (primaryExtension != "") {
					typeString = primaryExtension.toUpperCase() + " file";
				// 3. If we can't even do that, just give up and show the MIME type.
				} else {
					typeString = mimeInfo.MIMEType;
				}
			}
	
			return typeString;
	
			//return navigator.mimeTypes[this.mimeType].description;
		} else {
			// Can we return something here?
			return null;
		}
	},
	
	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.sageIFeedItemEnclosure])

};

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([sageFeedItemEnclosure]);
} else {
	var NSGetModule = XPCOMUtils.generateNSGetModule([sageFeedItemEnclosure]);
}
