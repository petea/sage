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

var CreateHTML = {
	
	HTML_SOURCE: SageUtils.loadText("chrome://sage/content/res/template-html.txt"),
	ITEM_SOURCE: SageUtils.loadText("chrome://sage/content/res/template-item.txt"),
	DEFAULT_CSS: "chrome://sage/content/res/sage.css",

	getUserCssURL : function() {
		var userCssEnable = SageUtils.getSagePrefValue(SageUtils.PREF_USER_CSS_ENABLE);
		var userCssPath = SageUtils.getSagePrefValue(SageUtils.PREF_USER_CSS_PATH);
		if (!userCssEnable || !userCssPath) {
			return null;
		}
		var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
		var tmpFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
		try {
			tmpFile.initWithPath(userCssPath);
			var cssUrl = ioService.newFileURI(tmpFile);
			var contentType = ioService.newChannelFromURI(cssUrl).contentType;
			return cssUrl.spec;
		} catch(e) {
			return null;
		}
	},

	formatFileSize : function(n) {
		if (n > 1048576) {
			return Math.round(n / 1048576) + " MB";
		} else if (n > 1024) {
			return Math.round(n / 1024) + " KB";
		} else {
			return n + " B";
		}
	},

	createHTMLSource : function(feed) {
		return this.HTML_SOURCE.replace(/\*\*[^\*]+\*\*/g, function (s) {
				return CreateHTML.replaceFeedKeyword(feed, s);
			});
	},

	replaceFeedKeyword : function(feed, s) {
		var footer;

		switch (s) {
			case "**LINK**":
				return feed.getLink();
				break;

			case "**TITLE**":
				return this.entityEncode(feed.getTitle());

			case "**AUTHOR**":
				if (feed.hasAuthor()) {
					return "<div class=\"feed-author\">" + this.entityEncode(feed.getAuthor()) + "</div>";
				}
				return "";

			case "**DESCRIPTION**":
				if (feed.hasDescription()) {
					return feed.getDescription();
				}
				return "";

			case "**ITEMS**":
				return this.getItemsHtml(feed);
		}

		return s;
	},

	getItemsHtml : function(feed) {
		var feedItemOrder = SageUtils.getSagePrefValue(SageUtils.PREF_FEED_ITEM_ORDER);
		switch (feedItemOrder) {
			case "chrono": feed.setSort(feed.SORT_CHRONO); break;
			case "source": feed.setSort(feed.SORT_SOURCE); break;
		}
		var sb = [];
		for (var i = 0; i < feed.getItemCount(); i++) {
			sb.push(this.getItemHtml(feed, feed.getItem(i), i));
		}
		return sb.join("");
	},

	getItemHtml : function(feed, item, i) {
		return  this.ITEM_SOURCE.replace(/\*\*[^\*]+\*\*/g, function (s) {
			return CreateHTML.replaceFeedItemKeyword(feed, item, i, s);
		});
	},

	replaceFeedItemKeyword : function(feed, item, i, s) {
		switch (s) {
			case "**NUMBER**":
				return i + 1;

			case "**LINK**":
				return item.getLink();

			case "**TITLE**":
				if (item.hasTitle()) {
					return this.entityEncode(item.getTitle());
				} else if (item.getTitle()) {
					return this.entityEncode(item.getTitle());
				} else {
					return this.entityEncode(strRes.GetStringFromName("feed_item_no_title"));
				}

			case "**CONTENT**":
				if (item.hasContent()) {
					var allowEContent = SageUtils.getSagePrefValue(SageUtils.PREF_ALLOW_ENCODED_CONTENT);
					var ds;
					if (allowEContent) {
						this.filterHtmlHandler.clear();
						this.simpleHtmlParser.parse(item.getContent());
						ds = this.filterHtmlHandler.toString();
					} else {
						ds = SageUtils.htmlToText(item.getContent());
					}
					return "<div class=\"item-desc\">" + ds + "</div>";
				}
				return "";

			case "**ENCLOSURE**":
				if (item.hasEnclosure()) {
					var enc = item.getEnclosure();
					function createDescriptionFromURL(url) {
						var array = url.split("/");
						var description = "";
						if (array.length > 0) {
							description = array[array.length - 1];
						}
						return description;
					}
					return "<div class=\"item-enclosure\">" +
						"<a href=\"" + enc.getLink() + "\" title=\"" +
						strRes.GetStringFromName("feed_summary_enclosure") +
						"\"><img src=\"" +
							(enc.hasMimeType() ?
								"moz-icon://dummy?size=16&contentType=" + enc.getMimeType() :
								"chrome://sage/skin/enclosure.png") +
						"\">" +
						(enc.getDescription() ? enc.getDescription() + ", " : createDescriptionFromURL(enc.getLink())) +
						"</a>" +
						(enc.hasLength() ? " (" + this.formatFileSize(enc.getLength()) + ")" : "") +
						"</div>";
				}
				return "";

			case "**PUBDATE**":
				if (item.hasPubDate()) {
					var twelveHourClock = SageUtils.getSagePrefValue(SageUtils.PREF_TWELVE_HOUR_CLOCK);
					var formatter = Cc["@sage.mozdev.org/sage/dateformatter;1"].getService(Ci.sageIDateFormatter);
					formatter.setFormat(formatter.FORMAT_LONG, formatter.ABBREVIATED_FALSE, twelveHourClock ? formatter.CLOCK_12HOUR : formatter.CLOCK_24HOUR);
					var dateString = formatter.formatDate(item.getPubDate());
					return "<div class=\"item-pubDate\">" + dateString + "</div>";
				}
				return "";

			case "**AUTHOR**":
				if (item.hasAuthor()) {
					return "<div class=\"item-author\">" + this.entityEncode(item.getAuthor()) + "</div>";
				}
				return "";
		}

		return s;
	},
	
	entityEncode : function(aStr) {
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
		return aStr.replace(re, function(m) { return replacechar(m) });
	},

	simpleHtmlParser:	new SimpleHtmlParser,
	filterHtmlHandler:	new FilterHtmlHandler
};

CreateHTML.simpleHtmlParser.contentHandler = CreateHTML.filterHtmlHandler
