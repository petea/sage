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

function Feed(feedXML) {
	this.feedXML = feedXML;
	this.feedFormat = null;

	this.title = null;
	this.link = null;
	this.logo = {link:"", alt:""};
	this.description = null;
    this.author = null;
	this.footer = {copyright:"", generator:"", editor:"", webmaster:""};
	this.items = new Array();
	this.lastPubDate = null;

	if(!feedXML) {
		throw "Empty Feed";
	}

	var rootNodeName = feedXML.documentElement.localName.toLowerCase();
	if(rootNodeName == "feed") {
		this.parseAtom();
	} else if(rootNodeName == "rss" || rootNodeName == "rdf") {
		this.parseRSS();
	} else {
		throw "Feed has invalid root element";
	}
}

Feed.prototype.parseRSS = function() {
	var feedXML = this.feedXML;

	const nsIURIFixup = Components.interfaces.nsIURIFixup;
	const URIFixup = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(nsIURIFixup);

	var firstElement = feedXML.documentElement;

	if(firstElement.localName.toLowerCase() == "rdf") {
		this.feedFormat = "RSS (1.0)";
	} else if(firstElement.localName.toLowerCase() == "rss") {
		if(firstElement.hasAttribute("version")) {
			this.feedFormat = "RSS (" + firstElement.getAttribute("version") + ")";
		} else {
			this.feedFormat = "RSS (?)";
		}
	}

	var channelNode;
	for(var i = firstElement.firstChild; i != null; i = i.nextSibling) {
		if(i.nodeType != i.ELEMENT_NODE) continue;
		if(i.localName.toLowerCase() == "channel") {
			channelNode = i;
		}
	}
	if(!channelNode) {
		throw "No channel element where expected";
	}

	if(feedXML.getElementsByTagName("channel").length != 0) {
		channelNode = feedXML.getElementsByTagName("channel")[0];
	} else {
		throw "No elements in channel tag";
	}

	for(i = channelNode.firstChild; i != null; i = i.nextSibling) {
		if(i.nodeType != i.ELEMENT_NODE) continue;
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
				for(var j = i.firstChild; j!=null; j=j.nextSibling) {
					if(j.nodeType != j.ELEMENT_NODE) continue;
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
	for(i = 0; itemNodes.length > i; i++) {
		item = {title:"", link:"", content:"", author:"", pubDate:"", enclosure:""};
		guid = null;

		for(var j = itemNodes[i].firstChild; j!=null; j=j.nextSibling) {
			if(j.nodeType != j.ELEMENT_NODE) continue;
			switch(j.localName) {
				case "title":
					item.title = entityDecode(CommonFunc.getInnerText(j));
					break;
				case "link":
					if(!item.link) {
						item.link = this.link ? URIFixup.createFixupURI(this.link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(CommonFunc.getInnerText(j)) : CommonFunc.getInnerText(j);
					}
					break;
				case "author":
					item.author = entityDecode(CommonFunc.getInnerText(j));
					break;
				case "guid":
					if(!guid) {
						guid = CommonFunc.getInnerText(j);
					}
					break;
				case "description":
					if(!item.content) {
						item.content = CommonFunc.getInnerText(j);
					}
					break;
				case "encoded":
					item.content = CommonFunc.getInnerText(j);
					break;
				case "pubDate":
					tmp_str = CommonFunc.getInnerText(j);
					tmp_date = new Date(tmp_str);
					if(tmp_date != "Invalid Date") {
						item.pubDate = tmp_date;
					} else {
						logMessage("unable to parse date string: " + tmp_str + " feed: " + this.title);
					}
					break;
				case "date":
					tmp_str = CommonFunc.getInnerText(j);
					tmp_date = iso8601ToJSDate(tmp_str);
					if(tmp_date) {
						item.pubDate = tmp_date;
					} else {
						logMessage("unable to parse date string: " + tmp_str + " feed: " + this.title);
					}
					break;
				case "enclosure":
					item.enclosure = new FeedItemEnclosure(j.getAttribute("url"), j.getAttribute("length"), j.getAttribute("type"));
					break;
			}
		}

		if(!item.link && guid) {
			item.link = this.link ? URIFixup.createFixupURI(this.link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(guid) : guid;
		}

		var tmpFeedItem = new FeedItem(item.title, item.link, item.author, item.content, item.pubDate, item.enclosure);

		if(tmpFeedItem.hasPubDate()) {
			if(tmpFeedItem.getPubDate() > this.lastPubDate) {
				this.lastPubDate = tmpFeedItem.getPubDate();
			}
		}

		this.items.push(tmpFeedItem);
	}
}

Feed.prototype.parseAtom = function() {
	var feedXML = this.feedXML;

	const nsIURIFixup = Components.interfaces.nsIURIFixup;
	const URIFixup = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(nsIURIFixup);

	var firstElement = feedXML.documentElement;

	if(firstElement.hasAttribute("version")) {
		this.feedFormat = "Atom (" + firstElement.getAttribute("version") + ")";
	} else {
		this.feedFormat = "Atom (?)";
	}

	for(var i = feedXML.documentElement.firstChild; i != null; i = i.nextSibling) {
		if(i.nodeType != i.ELEMENT_NODE) continue;
		switch(i.localName) {
			case "title":
				this.title = entityDecode(CommonFunc.getInnerText(i));
				break;
			case "link":
				if(this.link) {
					if(i.getAttribute("rel").toLowerCase() == "alternate") {
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
	for(i = 0; entryNodes.length > i; i++) {
		var item = {title:"", link:"", author:"", content:"", pubDate:"", enclosure:""};

		var titleNodes = entryNodes[i].getElementsByTagName("title");
		if(titleNodes.length) {
			item.title = entityDecode(CommonFunc.getInnerText(titleNodes[0]));
		}

		var linkNodes = entryNodes[i].getElementsByTagName("link");
		if(linkNodes.length) {
			for (var j = 0; j < linkNodes.length; j++) {
				if (linkNodes[j].getAttribute("rel").toLowerCase() == "alternate") {
					item.link = this.link ? URIFixup.createFixupURI(this.link, nsIURIFixup.FIXUP_FLAG_NONE).resolve(linkNodes[j].getAttribute("href")) : linkNodes[j].getAttribute("href");
					break;
				}
			}
		}

		var authorNodes = entryNodes[i].getElementsByTagName("author");
		if(authorNodes.length) {
			item.author = entityDecode(CommonFunc.getInnerText(authorNodes[0]));
		}

		var issuedNodes = entryNodes[i].getElementsByTagName("issued");
		if(issuedNodes.length) {
			tmp_str = CommonFunc.getInnerText(issuedNodes[0]);
			tmp_date = iso8601ToJSDate(tmp_str);
			if(tmp_date) {
				item.pubDate = tmp_date;
			} else {
				logMessage("unable to parse date string: " + tmp_str + " feed: " + this.title);
			}
		}

		var aEntryNode = entryNodes[i];

		var contentNodes = aEntryNode.getElementsByTagName("content");
		var contentArray = new Array();
		for(j = 0; j < contentNodes.length; j++) {
			var contType = contentNodes[j].getAttribute("type");
			contentArray[contType] = CommonFunc.getInnerText(contentNodes[j]);
		}

		var summaryNodes = aEntryNode.getElementsByTagName("summary");

		if("application/xhtml+xml" in contentArray) {
			item.content = contentArray["application/xhtml+xml"];
		} else if("text/html" in contentArray) {
			item.content = contentArray["text/html"];
		} else if("text/plain" in contentArray) {
			item.content = contentArray["text/plain"];
		}	else if(summaryNodes.length) {
			item.content = CommonFunc.getInnerText(summaryNodes[0]);
		}

		var tmpFeedItem = new FeedItem(item.title, item.link, item.author, item.content, item.pubDate, item.enclosure);

		if(tmpFeedItem.hasPubDate()) {
			if(tmpFeedItem.getPubDate() > this.lastPubDate) {
				this.lastPubDate = tmpFeedItem.getPubDate();
			}
		}

		this.items.push(tmpFeedItem);
	}
}

Feed.prototype.getTitle = function() {
	return this.title.replace(/<.*?>/g,'');
}

Feed.prototype.hasDescription = function() {
	return Boolean(this.description);
}

Feed.prototype.getDescription = function() {
	if(this.hasDescription()) {
		return this.description;
	} else {
		return "";
	}
}

Feed.prototype.getLink = function() {
	return this.link;
}

Feed.prototype.hasAuthor = function() {
	return Boolean(this.author);
}

Feed.prototype.getAuthor = function() {
	if(this.hasAuthor()) {
		return this.author;
	} else {
		return "";
	}
}

Feed.prototype.hasLastPubDate = function() {
	return Boolean(this.lastPubDate);
}

Feed.prototype.getLastPubDate = function() {
	if(this.hasLastPubDate()) {
		return this.lastPubDate;
	} else {
		return null;
	}
}

Feed.prototype.getItemCount = function() {
	return this.items.length;
}

Feed.prototype.getItem = function(itemIndex) {
	return this.items[itemIndex];
}

Feed.prototype.getItems = function(sort) {
	if(sort == "chrono" && !this.hasLastPubDate()) {  // if the feed doesn't have pub dates, we're going to do a source sort
		sort = "source";
	}
	var items_array;
	switch(sort) {
		case "chrono":
			var items = new Array();
			for(var c = 0; c < this.items.length; c++) {
				items.push(this.items[c]);
			}
			function chronoSort(a, b) {
				var a_ts = a.hasPubDate() ? a.getPubDate() : 0;
				var b_ts = b.hasPubDate() ? b.getPubDate() : 0;
				return b_ts - a_ts;
			}
			items.sort(chronoSort);
			items_array = items;
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
	var sig = "[";
	for(var c = 0; c < this.getItemCount(); c++) {
		if(c != 0) sig += ",";
		sig += this.getItem(c).getTitle().length;
	}
	sig += "]";
	return sig;
}

Feed.prototype.hasFooter = function() {
	return Boolean(this.footer);
}

Feed.prototype.getFooter = function() {
	if(this.hasFooter()) {
		return this.footer;
	} else {
		return "";
	}
}

Feed.prototype.hasLogo = function() {
	return Boolean(this.logo);
}

Feed.prototype.getLogo = function() {
	if(this.hasLogo()) {
		return this.logo;
	} else {
		return "";
	}
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
	if(this.hasTitle()) {
		title = this.title.replace(/<.*?>/g,'');
	} else {
		if(this.hasContent()) {
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
	if(this.hasAuthor()) {
		return this.author;
	} else {
		return "";
	}
}

FeedItem.prototype.getLink = function() {
	return this.link;
}

FeedItem.prototype.hasContent = function() {
	return Boolean(this.content);
}

FeedItem.prototype.getContent = function() {
	if(this.hasContent()) {
		return this.content;
	} else {
		return "No content";
	}
}

FeedItem.prototype.hasPubDate = function() {
	return Boolean(this.pubDate);
}

FeedItem.prototype.getPubDate = function() {
	if(this.hasPubDate()) {
		return this.pubDate;
	} else {
		return null;
	}
}

FeedItem.prototype.hasEnclosure = function() {
	return Boolean(this.enclosure);
}

FeedItem.prototype.getEnclosure = function() {
	if(this.hasEnclosure()) {
		return this.enclosure;
	} else {
		return null;
	}
}



/**
 * FeedItemEnclosure class
 *
 */

function FeedItemEnclosure(link, length, mimeType) {
	this.link = link;
	this.length = length;
	this.mimeType = mimeType;
}

FeedItemEnclosure.prototype.hasLink = function() {
	return Boolean(this.link);
}

FeedItemEnclosure.prototype.getLink = function() {
	if(this.hasLink()) {
		return this.link;
	} else {
		return null;
	}
}

FeedItemEnclosure.prototype.hasLength = function() {
	return Boolean(this.length);
}

FeedItemEnclosure.prototype.getLength = function() {
	if(this.hasLength()) {
		return this.length;
	} else {
		return null;
	}
}

FeedItemEnclosure.prototype.getSize = function() {
	if(this.hasLength()) {
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
	if(this.hasMimeType()) {
		return this.mimeType;
	} else {
		return null;
		// TODO: Use mime service to map URI to mime type

	}
}

FeedItemEnclosure.prototype.getDesc = function() {
	if(this.hasMimeType()) {

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
			}
			catch (ex) {
			}
			if (primaryExtension != "")
				typeString = primaryExtension.toUpperCase() + " file";
			// 3. If we can't even do that, just give up and show the MIME type.
			else
				typeString = mimeInfo.MIMEType;
		}

		return typeString;

		//return navigator.mimeTypes[this.mimeType].description;
	} else {
		return null;
	}
}


/**
 * Utility functions
 *
 */

// Parses an ISO 8601 formatted date string and returns a JavaScript Date object, returns null on parse error
// Example inputs:  2004-06-17T18:00Z 2004-06-17T18:34:12+02:00

function iso8601ToJSDate(date_str) {
	var tmp = date_str.split("T");
	var date = tmp[0];

  date = date.split("-");
	var year = date[0];
	var month = date[1];
	var day = date[2];

	var hours = 0;
	var minutes = 0;
	var seconds = 0;
	var tz_mark = "Z";
	var tz_hours = 0;
	var tz_minutes = 0;
	var time, whole_time, tz;

	if(tmp.length == 2) {
		whole_time = tmp[1];
		tz_mark = whole_time.match("[Z+-]{1}");
		if(tz_mark) {
			tmp = whole_time.split(tz_mark);
			time = tmp[0];
			if(tz_mark == "+" || tz_mark == "-") {
				tz = tmp[1];
				tmp = tz.split(":");
				tz_hours = tmp[0];
				tz_minutes = tmp[1];
			}
		} else {
			tz_mark = "Z";
			time = whole_time;
		}
		tmp = time.split(":");
		hours = tmp[0];
		minutes = tmp[1];
		if(tmp.length == 3) {
			seconds = tmp[2];
		}
	}

	var utc = Date.UTC(year, month - 1, day, hours, minutes, seconds);
	var tmp_date;
	if(tz_mark == "Z") {
		tmp_date = new Date(utc);
	} else if(tz_mark == "+") {
		tmp_date = new Date(utc - tz_hours*3600000 - tz_minutes*60000);
	} else if(tz_mark == "-") {
		tmp_date = new Date(utc + tz_hours*3600000 + tz_minutes*60000);
	} else {
		tmp_date = "Invalid Date";
	}

	if (tmp_date == "Invalid Date") {
		return null;
	} else {
		return tmp_date;
	}
}

function entityDecode(aStr) {
	var	formatConverter = Components.classes["@mozilla.org/widget/htmlformatconverter;1"].createInstance(Components.interfaces.nsIFormatConverter);
	var fromStr = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
	fromStr.data = aStr;
	var toStr = { value: null };

	try {
		formatConverter.convert("text/html", fromStr, fromStr.toString().length, "text/unicode", toStr, {});
	} catch(e) {
		return aStr;
	}
	if(toStr.value) {
		toStr = toStr.value.QueryInterface(Components.interfaces.nsISupportsString);
		return toStr.toString();
	}
	return aStr;
}
