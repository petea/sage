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

const sageIFeedParser = Components.interfaces.sageIFeedParser;

/******************************************************************************
 * sageRSSParser Component
 ******************************************************************************/
function sageRSSParser() {};
sageRSSParser.prototype = {

	classDescription: "Sage RSS Parser Component",
	classID: Components.ID("{69F7C75E-9A41-4E7B-9E6F-620158D2DE09}"),
	contractID: "@sage.mozdev.org/sage/rssparser;1",

	discover: function(feedDocument)
	{
		var rootNodeName = feedDocument.documentElement.localName.toLowerCase();
		if (rootNodeName == "rss" || rootNodeName == "rdf") {
			return true;
		} else {
			return false;
		}
	},

	parse: function(feedDocument)
	{
		var Feed = new Components.Constructor("@sage.mozdev.org/sage/feed;1", "sageIFeed", "init");
		var FeedItem = new Components.Constructor("@sage.mozdev.org/sage/feeditem;1", "sageIFeedItem", "init");
		var FeedItemEnclosure = new Components.Constructor("@sage.mozdev.org/sage/feeditemenclosure;1", "sageIFeedItemEnclosure", "init");

		var dateParser = Components.classes["@sage.mozdev.org/sage/dateparser;1"].getService(Components.interfaces.sageIDateParser);

		var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
		var logger = new Logger();
	
		const nsIURIFixup = Components.interfaces.nsIURIFixup;
		const URIFixup = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(nsIURIFixup);
	
		var title;
		var link;
		var description;
		var author;
		var feedURI;
		var format;
	
		var firstElement = feedDocument.documentElement;

		if (firstElement.localName.toLowerCase() == "rdf") {
			format = "RSS (1.0)";
		} else if (firstElement.localName.toLowerCase() == "rss") {
			if (firstElement.hasAttribute("version")) {
				format = "RSS (" + firstElement.getAttribute("version") + ")";
			} else {
				format = "RSS (?)";
			}
		}
	
		var i, j;
	
		var channelNode;
		for (i = firstElement.firstChild; i != null; i = i.nextSibling) {
			if (i.nodeType != i.ELEMENT_NODE) continue;
			if (i.localName.toLowerCase() == "channel") {
				channelNode = i;
			}
		}
		if (!channelNode) {
			throw "No channel element where expected";
		}
	
		if (feedDocument.getElementsByTagName("channel").length != 0) {
			channelNode = feedDocument.getElementsByTagName("channel")[0];
		} else {
			throw "No elements in channel tag";
		}
	
		for (i = channelNode.firstChild; i != null; i = i.nextSibling) {
			if (i.nodeType != i.ELEMENT_NODE) continue;
			switch(i.nodeName) {
				case "title":
					title = this._getInnerText(i);
					break;
				case "link":
					link = this._getInnerText(i);
					break;
				case "description":
					description = this._getInnerText(i);
					break;
				case "author":
					author = this._getInnerText(i);
					break;
/*
				case "copyright":
					this.footer.copyright = this._entityDecode(this._getInnerText(i));
					break;
				case "generator":
					this.footer.generator = this._entityDecode(this._getInnerText(i));
					break;
				case "webMaster":
					this.footer.webmaster = this._entityDecode(this._getInnerText(i));
					break;
				case "managingEditor":
					this.footer.editor = this._entityDecode(this._getInnerText(i));
					break;
				case "image":
					for (j = i.firstChild; j!=null; j=j.nextSibling) {
						if (j.nodeType != j.ELEMENT_NODE) continue;
						switch(j.localName) {
							case "url":
								this.logo.link = this._entityDecode(this._getInnerText(j));
								break;
							case "title":
								this.logo.alt = this._entityDecode(this._getInnerText(j));
								break;
						}
					}
					break;
*/
			}
		}
		
		feed = new Feed(title, link, description, author, feedURI, format);
		
		var itemNodes = feedDocument.getElementsByTagName("item");
		var item, guid;
		for (i = 0; itemNodes.length > i; i++) {
			if (itemNodes[i].prefix) continue;  // skip elements with namespaces
		
			item = {title:"", link:"", content:"", author:"", pubDate:"", enclosure: null};
			guid = null;
	
			for (j = itemNodes[i].firstChild; j!=null; j=j.nextSibling) {
				if (j.nodeType != j.ELEMENT_NODE) continue;
				switch(j.nodeName) {
					case "title":
						item.title = this._getInnerText(j);
						break;
					case "link":
						if (!item.link) {
							try {
								item.link = link ? URIFixup.createFixupURI(link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(this._getInnerText(j)) : this._getInnerText(j);
							} catch (e) {
								logger.warn("unable to resolve URI: " + this._getInnerText(j) + " feed: " + title);
							}
						}
						break;
					case "creator":
					case "dc:creator":
						item.author = this._getInnerText(j);
						break;
					case "guid":
						if(!guid) {
							guid = this._getInnerText(j);
						}
						break;
					case "description":
						if (!item.content) {
							item.content = this._getInnerText(j);
						}
						break;
					case "content:encoded":
						item.content = this._getInnerText(j);
						break;
					case "pubDate":
						tmp_str = this._getInnerText(j);
						try {
							item.pubDate = dateParser.parseRFC822(tmp_str);
						} catch(e) {
							logger.warn("unable to parse RFC 822 date string: " + tmp_str + " feed: " + title);
						}
						break;
					case "dc:date":
						tmp_str = this._getInnerText(j);
						try {
							item.pubDate = dateParser.parseISO8601(tmp_str);
						} catch(e) {
							logger.warn("unable to parse ISO 8601 date string: " + tmp_str + " feed: " + title);
						}
						break;
					case "enclosure":
						item.enclosure = new FeedItemEnclosure(j.getAttribute("url"), j.getAttribute("length"), j.getAttribute("type"));
						break;
				}
			}
	
			if (!item.link && guid) {
				try {
					item.link = link ? URIFixup.createFixupURI(link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(guid) : guid;
				} catch (e) {
					logger.warn("unable to resolve URI: " + guid + " feed: " + title);
				}
			}

			var feedItem = new FeedItem(item.title, item.link, item.author, item.content, item.pubDate, item.enclosure, null);

			feed.addItem(feedItem);
		}
		
		return feed;
	},
	
	_entityDecode: function(aStr)
	{
		var	formatConverter = Components.classes["@mozilla.org/widget/htmlformatconverter;1"].createInstance(Components.interfaces.nsIFormatConverter);
		var fromStr = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		fromStr.data = aStr;
		var toStr = {value: null};
	
		try {
			formatConverter.convert("text/html", fromStr, fromStr.toString().length, "text/unicode", toStr, {});
		} catch(e) {
			return aStr;
		}
		if (toStr.value) {
			toStr = toStr.value.QueryInterface(Components.interfaces.nsISupportsString);
			return toStr.toString();
		}
		return aStr;
	},
	
	_getInnerText: function(aNode)
	{
		if(!aNode.hasChildNodes()) return "";
		
		var NodeFilter = Components.interfaces.nsIDOMNodeFilter;
	
		var resultArray = new Array();
		var walker = aNode.ownerDocument.createTreeWalker(aNode, NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_TEXT, null, false);
		while(walker.nextNode()) {
			resultArray.push(walker.currentNode.nodeValue);
		}
		return resultArray.join('').replace(/^\s+|\s+$/g, "");
	},
	
	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.sageIFeedParser])

};

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([sageRSSParser]);
} else {
	var NSGetModule = XPCOMUtils.generateNSGetModule([sageRSSParser]);
}
