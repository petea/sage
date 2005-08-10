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

/**
 * Feed class
 *
 */

function Feed(feedXML, aURI) {
	if (!feedXML) {
		throw "Empty Feed";
	}

	this.uri = aURI;
	this.logo = {link:"", alt:""};
	this.footer = {copyright:"", generator:"", editor:"", webmaster:""};
	this.items = [];

	var rootNodeName = feedXML.documentElement.localName.toLowerCase();
	if (rootNodeName == "feed") {
		this.parseAtom(feedXML);
	} else if (rootNodeName == "rss" || rootNodeName == "rdf") {
		this.parseRSS(feedXML);
	} else {
		throw "Feed has invalid root element";
	}
}

Feed.prototype.feedFormat =
Feed.prototype.title =
Feed.prototype.link =
Feed.prototype.description =
Feed.prototype.author =
Feed.prototype.lastPubDate = null;

Feed.prototype.parseRSS = function(feedXML) {
	const nsIURIFixup = Components.interfaces.nsIURIFixup;
	const URIFixup = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(nsIURIFixup);

	var firstElement = feedXML.documentElement;

	if (firstElement.localName.toLowerCase() == "rdf") {
		this.feedFormat = "RSS (1.0)";
	} else if (firstElement.localName.toLowerCase() == "rss") {
		if (firstElement.hasAttribute("version")) {
			this.feedFormat = "RSS (" + firstElement.getAttribute("version") + ")";
		} else {
			this.feedFormat = "RSS (?)";
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

	if (feedXML.getElementsByTagName("channel").length != 0) {
		channelNode = feedXML.getElementsByTagName("channel")[0];
	} else {
		throw "No elements in channel tag";
	}

	for (i = channelNode.firstChild; i != null; i = i.nextSibling) {
		if (i.nodeType != i.ELEMENT_NODE) continue;
		switch(i.localName) {
			case "title":
				this.title = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "link":
				this.link = CommonFunc.getInnerText(i);
				break;
			case "description":
				this.description = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "author":
				this.author = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "copyright":
				this.footer.copyright = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "generator":
				this.footer.generator = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "webMaster":
				this.footer.webmaster = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "managingEditor":
				this.footer.editor = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "image":
				for (j = i.firstChild; j!=null; j=j.nextSibling) {
					if (j.nodeType != j.ELEMENT_NODE) continue;
					switch(j.localName) {
						case "url":
							this.logo.link = entityDecode(CommonFunc.getInnerText(j));
							break;
						case "title":
							this.logo.alt = entityDecode(CommonFunc.getInnerText(j));
							break;
					}
				}
				break;
		}
	}

	var itemNodes = feedXML.getElementsByTagName("item");
	var item, guid;
	var dateParser = Components.classes["@sage.mozdev.org/sage/dateparser;1"].getService(Components.interfaces.sageIDateParser);
	for (i = 0; itemNodes.length > i; i++) {
		item = {title:"", link:"", content:"", author:"", pubDate:"", enclosure:""};
		guid = null;

		for (j = itemNodes[i].firstChild; j!=null; j=j.nextSibling) {
			if (j.nodeType != j.ELEMENT_NODE) continue;
			switch(j.localName) {
				case "title":
					item.title = entityDecode(CommonFunc.getInnerText(j));
					break;
				case "link":
					if (!item.link) {
						item.link = this.link ? URIFixup.createFixupURI(this.link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(CommonFunc.getInnerText(j)) : CommonFunc.getInnerText(j);
					}
					break;
				case "creator":
					item.author = entityDecode(CommonFunc.getInnerText(j));
					break;
				case "guid":
					if(!guid) {
						guid = CommonFunc.getInnerText(j);
					}
					break;
				case "description":
					if (!item.content) {
						item.content = CommonFunc.getInnerText(j);
					}
					break;
				case "encoded":
					item.content = CommonFunc.getInnerText(j);
					break;
				case "pubDate":
					tmp_str = CommonFunc.getInnerText(j);
					try {
						item.pubDate = new Date(dateParser.parseRFC822(tmp_str));
					} catch(e) {
						logMessage("unable to parse RFC 822 date string: " + tmp_str + " feed: " + this.title);
					}
					break;
				case "date":
					tmp_str = CommonFunc.getInnerText(j);
					try {
						item.pubDate = new Date(dateParser.parseISO8601(tmp_str));
					} catch(e) {
						logMessage("unable to parse ISO 8601 date string: " + tmp_str + " feed: " + this.title);
					}
					break;
				case "enclosure":
					item.enclosure = new FeedItemEnclosure(j.getAttribute("url"), j.getAttribute("length"), j.getAttribute("type"));
					break;
			}
		}

		if (!item.link && guid) {
			item.link = this.link ? URIFixup.createFixupURI(this.link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(guid) : guid;
		}

		var tmpFeedItem = new FeedItem(item.title, item.link, item.author, item.content, item.pubDate, item.enclosure);

		if (tmpFeedItem.hasPubDate()) {
			if (tmpFeedItem.getPubDate() > this.lastPubDate) {
				this.lastPubDate = tmpFeedItem.getPubDate();
			}
		}

		this.items.push(tmpFeedItem);
	}
}

Feed.prototype.parseAtom = function(feedXML) {
	const nsIURIFixup = Components.interfaces.nsIURIFixup;
	const URIFixup = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(nsIURIFixup);

	var firstElement = feedXML.documentElement;

	if (firstElement.hasAttribute("version")) {
		this.feedFormat = "Atom (" + firstElement.getAttribute("version") + ")";
	} else {
		this.feedFormat = "Atom (?)";
	}
	
	var i, j, z;

	for (i = feedXML.documentElement.firstChild; i != null; i = i.nextSibling) {
		if (i.nodeType != i.ELEMENT_NODE) continue;
		switch(i.localName) {
			case "title":
				this.title = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "link":
				if (this.link) {
					if (i.getAttribute("rel").toLowerCase() == "alternate") {
						this.link = i.getAttribute("href");
					}
				} else {
					this.link = i.getAttribute("href");
				}
				break;
			case "tagline":
				this.description = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "name":
				this.author = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "copyright":
				this.footer.copyright = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "generator":
				this.footer.generator = entityDecode(CommonFunc.getInnerText(i));
				break;
		}
	}

	var entryNodes = feedXML.getElementsByTagName("entry");
	var dateParser = Components.classes["@sage.mozdev.org/sage/dateparser;1"].getService(Components.interfaces.sageIDateParser);
	for (i = 0; entryNodes.length > i; i++) {
		var item = {title:"", link:"", author:"", content:"", pubDate:"", enclosure:""};

		var titleNodes = entryNodes[i].getElementsByTagName("title");
		if (titleNodes.length) {
			item.title = entityDecode(CommonFunc.getInnerText(titleNodes[0]));
		}

		var linkNodes = entryNodes[i].getElementsByTagName("link");
		if (linkNodes.length) {
			for (j = 0; j < linkNodes.length; j++) {
				if (linkNodes[j].getAttribute("rel").toLowerCase() == "alternate") {
					item.link = this.link ? URIFixup.createFixupURI(this.link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(linkNodes[j].getAttribute("href")) : linkNodes[j].getAttribute("href");
					break;
				}
			}
		}

		var authorNodes = entryNodes[i].getElementsByTagName("author");
		if (authorNodes.length) {
			item.author = entityDecode(CommonFunc.getInnerText(authorNodes[0]));
		}

		var issuedNodes = entryNodes[i].getElementsByTagName("issued");
		if (issuedNodes.length) {
			tmp_str = CommonFunc.getInnerText(issuedNodes[0]);
			try {
				item.pubDate = new Date(dateParser.parseISO8601(tmp_str));
			} catch(e) {
				logMessage("unable to parse ISO 8601 date string: " + tmp_str + " feed: " + this.title);
			}
		}

		var aEntryNode = entryNodes[i];

		var contentNodes = aEntryNode.getElementsByTagName("content");
		var contentHash = {};
		var contentString;
		var xmlSerializer = new XMLSerializer();
		for(j = 0; j < contentNodes.length; j++) {
			var contType = contentNodes[j].getAttribute("type");
			if(contType == "application/xhtml+xml") {
				contentString = "";
				for(z = 0; z < contentNodes[j].childNodes.length; z++) {
					contentString += xmlSerializer.serializeToString(contentNodes[j].childNodes[z]);
				}
			} else {
				contentString = CommonFunc.getInnerText(contentNodes[j]);
			}
			contentHash[contType] = contentString;
		}

		var summaryNodes = aEntryNode.getElementsByTagName("summary");

		if ("application/xhtml+xml" in contentHash) {
			item.content = contentHash["application/xhtml+xml"];
		} else if ("text/html" in contentHash) {
			item.content = contentHash["text/html"];
		} else if ("text/plain" in contentHash) {
			item.content = contentHash["text/plain"];
		} else if (summaryNodes.length) {
			item.content = CommonFunc.getInnerText(summaryNodes[0]);
		}

		var tmpFeedItem = new FeedItem(item.title, item.link, item.author, item.content, item.pubDate, item.enclosure);

		if (tmpFeedItem.hasPubDate()) {
			if (tmpFeedItem.getPubDate() > this.lastPubDate) {
				this.lastPubDate = tmpFeedItem.getPubDate();
			}
		}

		this.items.push(tmpFeedItem);
	}
}

Feed.prototype.getURI = function() {
	return this.uri;
}

Feed.prototype.getTitle = function() {
	return this.title.replace(/<.*?>/g,'');
}

Feed.prototype.hasDescription = function() {
	return Boolean(this.description);
}

Feed.prototype.getDescription = function() {
	return this.hasDescription() ? this.description : "";
}

Feed.prototype.getLink = function() {
	return this.link;
}

Feed.prototype.hasAuthor = function() {
	return Boolean(this.author);
}

Feed.prototype.getAuthor = function() {
	return this.hasAuthor() ? this.author : "";
}

Feed.prototype.hasLastPubDate = function() {
	return Boolean(this.lastPubDate);
}

Feed.prototype.getLastPubDate = function() {
	return this.hasLastPubDate() ? this.lastPubDate : null;
}

Feed.prototype.getItemCount = function() {
	return this.items.length;
}

Feed.prototype.getItem = function(itemIndex) {
	return this.items[itemIndex];
}

Feed.prototype.getItems = function(sort) {
	if (sort == "chrono" && !this.hasLastPubDate()) {  // if the feed doesn't have pub dates, we're going to do a source sort
		sort = "source";
	}
	var items_array;
	switch(sort) {
		case "chrono":
			var items = new Array();
			for (var c = 0; c < this.items.length; c++) {
				items.push(new Array(this.items[c], c));
			}
			function chronoSort(a, b) {
				var a_ts = a[0].hasPubDate() ? ((a[0].getPubDate().getTime() * 1000) - a[1]) : (0 - a[1]);
				var b_ts = b[0].hasPubDate() ? ((b[0].getPubDate().getTime() * 1000) - b[1]) : (0 - b[1]);
				return b_ts - a_ts;
			}
			items.sort(chronoSort);
			items_array = new Array();
			for (var c = 0; c < items.length; c++) {
				items_array.push(items[c][0]);
			}
			break;
		case "source":
			items_array = this.items;
			break;
		default:
			items_array = this.items;
			break;
	}
	return items_array;
}

Feed.prototype.getFormat = function() {
	return this.feedFormat;
}

Feed.prototype.getSignature = function() {
	var hashText = "";
	for(var c = 0; c < this.getItemCount(); c++) {
		hashText += this.getItem(c).getTitle();
	}
	sig ="[" + b64_sha1(hashText) + "]";
	return sig;
}

Feed.prototype.hasFooter = function() {
	return Boolean(this.footer);
}

Feed.prototype.getFooter = function() {
	return this.hasFooter() ? this.footer : "";
}

Feed.prototype.hasLogo = function() {
	return Boolean(this.logo);
}

Feed.prototype.getLogo = function() {
	return this.hasLogo() ? this.logo : "";
}


/**
 * FeedItem class
 *
 */

function FeedItem(title, link, author, content, pubDate, enclosure) {
	this.title = title;
	this.link = link;
	this.author = author;
	this.content = content;
	this.pubDate = pubDate;
	this.enclosure = enclosure;
}

FeedItem.prototype.hasTitle = function() {
	return Boolean(this.title);
}

FeedItem.prototype.getTitle = function() {
	var title;
	if (this.hasTitle()) {
		title = this.title.replace(/<.*?>/g,'');
	} else {
		if (this.hasContent()) {
			temp = this.getContent();
			temp = temp.replace(/<.*?>/g,'');
			title = temp.substring(0, 30) + "...";
		} else {
			title = "No Title";
		}
	}
	return title;
}

FeedItem.prototype.hasAuthor = function() {
	return Boolean(this.author);
}

FeedItem.prototype.getAuthor = function() {
	return this.hasAuthor() ? this.author : "";
}

FeedItem.prototype.getLink = function() {
	return this.link;
}

FeedItem.prototype.hasContent = function() {
	return Boolean(this.content);
}

FeedItem.prototype.getContent = function() {
	// TODO: Localize
	return this.hasContent() ? this.content : "No content";
}

FeedItem.prototype.hasPubDate = function() {
	return Boolean(this.pubDate);
}

FeedItem.prototype.getPubDate = function() {
	return this.hasPubDate() ? this.pubDate : null;
}

FeedItem.prototype.hasEnclosure = function() {
	return Boolean(this.enclosure);
}

FeedItem.prototype.getEnclosure = function() {
	return this.hasEnclosure() ? this.enclosure : null;
}



/**
 * FeedItemEnclosure class
 *
 */

function FeedItemEnclosure(link, length, mimeType) {
	this.link = link;
	this.length = Number(length);
	this.mimeType = mimeType;
}

FeedItemEnclosure.prototype.hasLink = function() {
	return Boolean(this.link);
}

FeedItemEnclosure.prototype.getLink = function() {
	return this.hasLink() ? this.link : null;
}

FeedItemEnclosure.prototype.hasLength = function() {
	return this.length != null;
}

FeedItemEnclosure.prototype.getLength = function() {
	return this.hasLength() ? this.length : null;
}

// TODO: This is not used anywhere
FeedItemEnclosure.prototype.getSize = function() {
	if (this.hasLength()) {
		if (this.length > 1048576) {
			return Math.round(this.length / 1048576) + "M";
            }
		else if (this.length > 1024) {
			return Math.round(this.length / 1024) + "K";
		}
		else {
			return this.length + "B";
		}
	} else {
		return null;
	}
}

FeedItemEnclosure.prototype.hasMimeType = function() {
	return Boolean(this.mimeType);
}

FeedItemEnclosure.prototype.getMimeType = function() {
	return this.hasMimeType() ? this.mimeType : null;
	// TODO: Use mime service to map URI to mime type
}

FeedItemEnclosure.prototype.getDescription = function() {
	if (this.hasMimeType()) {

		var mimeService = Components.classes["@mozilla.org/mime;1"].createInstance(Components.interfaces.nsIMIMEService);
		var mimeInfo = mimeService.getFromTypeAndExtension(this.mimeType, "");	// should also pass extension

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
}


/**
 * Utility functions
 *
 */
 
function entityDecode(aStr) {
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
}
