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
 * sageAtom03Parser Component
 ******************************************************************************/
function sageAtom03Parser() {};
sageAtom03Parser.prototype = {

	classDescription: "Sage Atom 0.3 Parser Component",
	classID: Components.ID("{B315E9D2-7300-4C70-A2A3-B2BE328813AE}"),
	contractID: "@sage.mozdev.org/sage/atom03parser;1",		

	discover: function(feedDocument)
	{
		var rootNode = feedDocument.documentElement;
		if (rootNode.localName.toLowerCase() == "feed"  && rootNode.namespaceURI == "http://purl.org/atom/ns#") {
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
		
		var xmlSerializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].getService(Components.interfaces.nsIDOMSerializer);

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
		
		const ATOM_NS = "http://purl.org/atom/ns#";
		
		var firstElement = feedDocument.documentElement;
	
		if (firstElement.hasAttribute("version")) {
			format = "Atom (" + firstElement.getAttribute("version") + ")";
		} else {
			format = "Atom (?)";
		}
		
		// xml:base support for <feed> element
		var baseURI;
		if (firstElement.hasAttribute("xml:base")) {
			baseURI = firstElement.getAttribute("xml:base");
		}
		
		var i, j, z;
	
		for (i = feedDocument.documentElement.firstChild; i != null; i = i.nextSibling) {
			if (i.nodeType != i.ELEMENT_NODE) continue;
			if (i.namespaceURI != ATOM_NS) continue;  // skip elements that are outside the Atom namespace
			switch(i.localName) {
				case "title":
					if (i.hasAttribute("type") && (i.getAttribute("type").toLowerCase() == "html" || i.getAttribute("type").toLowerCase() == "xhtml")) {
						title = this._entityDecode(this._getInnerText(i));
					} else {
						title = this._getInnerText(i);
					}
					break;
				case "link":
					if ((i.hasAttribute("rel") && i.getAttribute("rel").toLowerCase() == "alternate") || !i.hasAttribute("rel")) {
						if (baseURI) {
							try {
								link = URIFixup.createFixupURI(baseURI, nsIURIFixup.FIXUP_FLAG_NONE).resolve(i.getAttribute("href"));
							} catch (e) {
								logger.warn("unable to resolve URI: " + i.getAttribute("href") + " feed: " + title);
							}
						} else {
							link = i.getAttribute("href");
						}
					}
					break;
				case "tagline":
					if (i.hasAttribute("type") && (i.getAttribute("type").toLowerCase() == "html" || i.getAttribute("type").toLowerCase() == "xhtml")) {
						description = this._entityDecode(this._getInnerText(i));
					} else {
						description = this._getInnerText(i);
					}
					break;
				case "name":
					if (i.hasAttribute("type") && (i.getAttribute("type").toLowerCase() == "html" || i.getAttribute("type").toLowerCase() == "xhtml")) {
						author = this._entityDecode(this._getInnerText(i));
					} else {
						author = this._getInnerText(i);
					}
					break;
/*
				case "copyright":
					this.footer.copyright = this._entityDecode(this._getInnerText(i));
					break;
				case "generator":
					this.footer.generator = this._entityDecode(this._getInnerText(i));
					break;
*/
			}
		}
		
		feed = new Feed(title, link, description, author, feedURI, format);
	
		var entryNodes = feedDocument.getElementsByTagNameNS(ATOM_NS, "entry");
		var node;
		for (i = 0; entryNodes.length > i; i++) {
			var item = {title:"", link:"", author:"", content:"", pubDate:"", enclosure: null, baseURI:""};
			
			// xml:base support for <entry> element
			if (entryNodes[i].hasAttribute("xml:base")) {
				if (baseURI) {
					try {
						item.baseURI = URIFixup.createFixupURI(baseURI, nsIURIFixup.FIXUP_FLAG_NONE).resolve(entryNodes[i].getAttribute("xml:base"));
					} catch (e) {
						logger.warn("unable to resolve URI: " + entryNodes[i].getAttribute("xml:base") + " feed: " + title);
					}
				} else {
					item.baseURI = entryNodes[i].getAttribute("xml:base");
				}
			} else {
				item.baseURI = baseURI;
			}
	
			var titleNodes = entryNodes[i].getElementsByTagNameNS(ATOM_NS, "title");
			if (titleNodes.length) {
				node = titleNodes[0];
				if (node.hasAttribute("type") && (node.getAttribute("type").toLowerCase() == "html" || node.getAttribute("type").toLowerCase() == "xhtml")) {
					item.title = this._entityDecode(this._getInnerText(node));
				} else {
					item.title = this._getInnerText(node);
				}
			}
	
			var linkNodes = entryNodes[i].getElementsByTagNameNS(ATOM_NS, "link");
			if (linkNodes.length) {
				for (j = 0; j < linkNodes.length; j++) {
					if (!linkNodes[j].hasAttribute("rel") || linkNodes[j].getAttribute("rel").toLowerCase() == "alternate") {
						try {
							item.link = item.baseURI ? URIFixup.createFixupURI(item.baseURI, nsIURIFixup.FIXUP_FLAG_NONE).resolve(linkNodes[j].getAttribute("href")) : linkNodes[j].getAttribute("href");
						} catch (e) {
							logger.warn("unable to resolve URI: " + linkNodes[j].getAttribute("href") + " feed: " + title);
						}
						break;
					}
				}
			}
	
			var authorNodes = entryNodes[i].getElementsByTagNameNS(ATOM_NS, "author");
			if (authorNodes.length) {
				node = authorNodes[0];
				if (node.hasAttribute("type") && (node.getAttribute("type").toLowerCase() == "html" || node.getAttribute("type").toLowerCase() == "xhtml")) {
					item.author = this._entityDecode(this._getInnerText(node));
				} else {
					item.author = this._getInnerText(node);
				}
			}
	
			var issuedNodes = entryNodes[i].getElementsByTagNameNS(ATOM_NS, "issued");
			if (issuedNodes.length) {
				tmp_str = this._getInnerText(issuedNodes[0]);
				try {
					item.pubDate = dateParser.parseISO8601(tmp_str);
				} catch(e) {
					logger.warn("unable to parse ISO 8601 date string: " + tmp_str + " feed: " + title);
				}
			}
	
			var aEntryNode = entryNodes[i];
			var contentNodes = aEntryNode.getElementsByTagNameNS(ATOM_NS, "content");
			var summaryNodes = aEntryNode.getElementsByTagNameNS(ATOM_NS, "summary");
			var contentHash = {};
			var contentString;
			for(j = 0; j < contentNodes.length; j++) {
				var contType = contentNodes[j].getAttribute("type");
				if(contType == "application/xhtml+xml" || contType == "xhtml") {
					contentString = "";
					for(z = 0; z < contentNodes[j].childNodes.length; z++) {
						contentString += xmlSerializer.serializeToString(contentNodes[j].childNodes[z]);
					}
				} else {
					contentString = this._getInnerText(contentNodes[j]);
				}
				contentHash[contType] = contentString;
			}
	
			if ("application/xhtml+xml" in contentHash) {
				item.content = contentHash["application/xhtml+xml"];
			} else if ("xhtml" in contentHash) {
				item.content = contentHash["xhtml"];
			} else if ("text/html" in contentHash) {
				item.content = contentHash["text/html"];
			} else if ("html" in contentHash) {
				item.content = contentHash["html"];
			} else if ("text/plain" in contentHash) {
				item.content = this._entityEncode(contentHash["text/plain"]);
			} else if ("text" in contentHash) {
				item.content = this._entityEncode(contentHash["text"]);
			} else if (summaryNodes.length) {
				item.content = this._entityEncode(this._getInnerText(summaryNodes[0]));
			}
			
			var feedItem = new FeedItem(item.title, item.link, item.author, item.content, item.pubDate, item.enclosure, item.baseURI);
	
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
	
	_entityEncode: function(aStr)
	{
		function replacechar(match) {
			if (match=="<")
				return "&lt;";
			else if (match==">")
				return "&gt;";
			else if (match=="\"")
				return "&quot;";
			else if (match=="'")
				return "&#039;";
			else if (match=="&")
				return "&amp;";
		}
		
		var re = /[<>"'&]/g;
		return aStr.replace(re, function(m){return replacechar(m)});
	},
	
	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.sageIFeedParser])

};

if (XPCOMUtils.generateNSGetFactory) {
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([sageAtom03Parser]);
} else {
	var NSGetModule = XPCOMUtils.generateNSGetModule([sageAtom03Parser]);
}
