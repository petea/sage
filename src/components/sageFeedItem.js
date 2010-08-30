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

const sageIFeedItem = Components.interfaces.sageIFeedItem;

/******************************************************************************
 * sageFeedItem Component
 ******************************************************************************/
function sageFeedItem() {};
sageFeedItem.prototype = {

	classDescription: "Sage Feed Item Component",
	classID: Components.ID("{BBAEEF86-C8B5-4B03-A250-2C433CB8EC5B}"),
	contractID: "@sage.mozdev.org/sage/feeditem;1",
		
	_title: null,
	_link: null,
	_author: null,
	_content: null,
	_pubDate: null,
	_enclosure: null,
	_baseURI: null,

	init: function(title, link, author, content, pubDate, enclosure, baseURI)
	{
		this._title = title;
		this._link = link;
		this._author = author;
		this._content = content;
		this._pubDate = pubDate;
		this._enclosure = enclosure;
		this._baseURI = baseURI;
	},
	
	hasTitle: function()
	{
		return Boolean(this._title);
	},
	
	getTitle: function()
	{
		var title;
		if (this.hasTitle()) {
			title = this._title;
		} else {
			if (this.hasContent()) {
				var temp = this.getContent();
				temp = temp.replace(/<.*?>/g, "");
				title = this._smartTrim(temp, 30, " ...");
			} else {
				title = null;
			}
		}
		return title;
	},
	
	hasAuthor: function()
	{
		return Boolean(this._author);
	},
	
	getAuthor: function()
	{
		return this.hasAuthor() ? this._author : null;
	},
	
	getLink: function()
	{
		return this._link;
	},
	
	hasContent: function()
	{
		return Boolean(this._content);
	},
	
	getContent: function()
	{
		return this.hasContent() ? this._content : null;
	},
	
	hasPubDate: function()
	{
		return Boolean(this._pubDate);
	},
	
	getPubDate: function()
	{
		return this.hasPubDate() ? this._pubDate : null;
	},
	
	hasEnclosure: function()
	{
		return Boolean(this._enclosure);
	},
	
	getEnclosure: function()
	{
		return this.hasEnclosure() ? this._enclosure : null;
	},
	
	hasBaseURI: function()
	{
		return Boolean(this._baseURI);
	},
	
	getBaseURI: function()
	{
		return this.hasBaseURI() ? this._baseURI : null;
	},
	
	_smartTrim: function(s, l, p) {
		var words = s.split(" ");
		var numWords = words.length;
		var output = [];
		var cwl, ol, cWord, w;
		ol = 0;
		for(w = 0; w < numWords; ++w) {
			cWord = words[w];
			cwl = cWord.length;
			if((ol + cwl) <= l) {
				output.push(cWord);
				ol += cwl + 1;
			} else {
				break;
			}
		}
		var trimmedString = output.join(" ");
		if (trimmedString == s) {
			return s;
		} else {
			return trimmedString + p;
		}
	},
	
	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.sageIFeedItem])

};

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([sageFeedItem]);
} else {
	var NSGetModule = XPCOMUtils.generateNSGetModule([sageFeedItem]);
}
