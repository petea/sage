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

const sageIFeed = Components.interfaces.sageIFeed;

/******************************************************************************
 * sageFeed Component
 ******************************************************************************/
function sageFeed() {};
sageFeed.prototype = {

	classDescription: "Sage Feed Component",
	classID: Components.ID("{E7E23F87-1993-4D04-8663-25946CB58153}"),
	contractID: "@sage.mozdev.org/sage/feed;1",

	_title: null,
	_link: null,
	_description: null,
	_author: null,
	_feedURI: null,
	_format: null,
	_items: null,
	_sortedItems: null,
	_lastPubDate: null,
	_currentSort: null,
	_requestedSort: null,

	init: function(title, link, description, author, feedURI, format)
	{
		this._title = title;
		this._link = link;
		this._description = description;
		this._author = author;
		this._feedURI = feedURI;
		this._format = format;
		this._items = new Array();
		this._requestedSort = sageIFeed.SORT_CHRONO;
	},
	
	addItem: function(item)
	{
		this._items.push(item);
		if (item.hasPubDate()) {
			if (item.getPubDate() > this._lastPubDate) {
				this._lastPubDate = item.getPubDate();
			}
		}
	},
	
	hasFeedURI: function()
	{
		return Boolean(this._feedURI);
	},
	
	getFeedURI: function()
	{
		return this._feedURI;
	},
	
	setFeedURI: function(feedURI)
	{
		this._feedURI = feedURI
	},
	
	getTitle: function()
	{
		return this._title;
	},
	
	hasDescription: function()
	{
		return Boolean(this._description);
	},
	
	getDescription: function()
	{
		return this.hasDescription() ? this._description : null;
	},
	
	getLink: function()
	{
		return this._link;
	},
	
	hasAuthor: function()
	{
		return Boolean(this._author);
	},
	
	getAuthor: function()
	{
		return this.hasAuthor() ? this._author : null;
	},
	
	hasLastPubDate: function()
	{
		return Boolean(this._lastPubDate);
	},
	
	getLastPubDate: function()
	{
		return this.hasLastPubDate() ? this._lastPubDate : null;
	},
	
	getItemCount: function()
	{
		return this._items.length;
	},
	
	getItem: function(index)
	{
		if (this._currentSort != this._requestedSort || this._items.length != this._sortedItems.length) {
			this._sortItems();
		}
		return this._sortedItems[index];
	},
	
	_sortItems: function()
	{
		// if the feed doesn't have pub dates, we're going to force a source sort
		if (this._requestedSort == sageIFeed.SORT_CHRONO && !this.hasLastPubDate()) {
			sort = sageIFeed.SORT_SOURCE;
		} else {
			sort = this._requestedSort;
		}

		switch(sort) {
			case sageIFeed.SORT_CHRONO:
				var items = new Array();
				var c;
				for (c = 0; c < this._items.length; c++) {
					items.push(new Array(this._items[c], c));
				}
				function chronoSort(a, b) {
					var a_ts = a[0].hasPubDate() ? ((a[0].getPubDate() * 1000) - a[1]) : (0 - a[1]);
					var b_ts = b[0].hasPubDate() ? ((b[0].getPubDate() * 1000) - b[1]) : (0 - b[1]);
					return b_ts - a_ts;
				}
				items.sort(chronoSort);
				var items_array = new Array();
				for (c = 0; c < items.length; c++) {
					items_array.push(items[c][0]);
				}
				this._sortedItems = items_array;
				break;
			case sageIFeed.SORT_SOURCE:
				this._sortedItems = this._items;
				break;
		}
		this._currentSort = this._requestedSort;
	},
	
	setSort: function(order)
	{
		this._requestedSort = order;
	},
	
	getFormat: function()
	{
		return this._format;
	},
	
	getSignature: function()
	{
		// build string to be hashed
		var text = "";
		for(var c = 0; c < this.getItemCount(); c++) {
			text += this.getItem(c).getTitle();
		}
		
		// take lower 8 bits of unicode characters and form a byte array
		var charBits = 8;
		var bin = new Array();
		var mask = (1 << charBits) - 1;
		for(var i = 0; i < text.length * charBits; i += charBits) {
			bin[i>>5] |= (text.charCodeAt(i / charBits) & mask) << (24 - i%32);
		}

		// get base 64 encoded SHA1 hash string
		var cHash = Components.classes["@mozilla.org/security/hash;1"].getService(Components.interfaces.nsICryptoHash);
		cHash.init(cHash.SHA1);
		cHash.update(bin, bin.length);
		var hash = cHash.finish(true);
		
		return hash;
	},
	
	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.sageIFeed])

};

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([sageFeed]);
} else {
	var NSGetModule = XPCOMUtils.generateNSGetModule([sageFeed]);
}
