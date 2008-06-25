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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

const CLASS_ID = Components.ID("{9C558AA2-52B7-4C0D-A7AB-387EB0EFBA05}");
const CLASS_NAME = "Sage Mozilla Feed Parser Component";
const CONTRACT_ID = "@sage.mozdev.org/sage/mozillafeedparser;1";

function sageMozillaFeedParser() {}

sageMozillaFeedParser.prototype = {

  discover : function(feedText) {
    return true;
  },

  parse : function(feedText, feedUri, listener) {
    this._listener = listener;
    var parser = Cc["@mozilla.org/feed-processor;1"].createInstance(Ci.nsIFeedProcessor);
    try {
      parser.listener = this;
      parser.parseFromString(feedText, feedUri);
    } catch (e) {
      this._listener.onFeedParsed(null);
    }
  },
  
  // nsIFeedResultListener
  handleResult : function(result) {
    
    var Feed = new Components.Constructor("@sage.mozdev.org/sage/feed;1", "sageIFeed", "init");
    var FeedItem = new Components.Constructor("@sage.mozdev.org/sage/feeditem;1", "sageIFeedItem", "init");
    var FeedItemEnclosure = new Components.Constructor("@sage.mozdev.org/sage/feeditemenclosure;1", "sageIFeedItemEnclosure", "init");
    
    var dateParser = Components.classes["@sage.mozdev.org/sage/dateparser;1"].getService(Components.interfaces.sageIDateParser);
    
    var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
    var logger = new Logger();
  
    if (!result || !result.doc || result.bozo) {
      this._listener.onFeedParsed(null);
      return;
    }
    
    var feed = result.doc;
    feed.QueryInterface(Ci.nsIFeed);
      
    var title = feed.title ? feed.title.plainText() : null;
    var link = feed.link ? feed.link.spec : null;
    var description = feed.subtitle ? feed.subtitle.plainText() : null;
    var author = null;
    if (feed.authors && feed.authors.length) {
      author = feed.authors.queryElementAt(0, Ci.nsIFeedPerson).name;
    }
    var feedURI = null;
    if (result.uri) {
      feedURI = result.uri.spec;
    }
    var format = result.version;
    
    var sageFeed = new Feed(title, link, description, author, feedURI, format);
  
    var feedItems = feed.items;
    var feedItem, item, date, enc;
    
    for (i = 0; i < feedItems.length; i++) {
      feedItem = feedItems.queryElementAt(i, Ci.nsIFeedEntry);
      
      item = { title : "", link : "", author : "", content : "", pubDate : "", enclosure : null, baseURI : "" };
      
      item.baseURI = feedItem.baseURI.spec;
      if (feedItem.title) {
        item.title = feedItem.title.plainText();
      }
      item.link = feedItem.link.spec;
      if (feedItem.authors && feedItem.authors.length) {
        item.author = feedItem.authors.queryElementAt(0, Ci.nsIFeedPerson).name;
      }
      date = null;
      if (feedItem.published) {
        date = feedItem.published;
      } else if (feedItem.updated) {
        date = feedItem.updated;
      } else if (feed.updated) {
        date = feed.udpated;
      }
      if (date) {
        try {
          item.pubDate = dateParser.parseRFC822(date);
        } catch (e) {
          logger.warn("unable to parse RFC822 date string: " + date + " feed: " + title);
        }
      }
      item.content = feedItem.content ? feedItem.content.text : feedItem.summary.text;
      if (feedItem.enclosures && feedItem.enclosures.length) {
        enc = feedItem.enclosures.queryElementAt(0, Ci.nsIWritablePropertyBag2);
        if (enc.hasKey("url")) {
          item.enclosure = new FeedItemEnclosure(enc.get("url"), enc.hasKey("length") ? enc.get("length") : null, enc.hasKey("type") ? enc.get("type") : null);
        }
      }
      
      sageFeed.addItem(new FeedItem(item.title, item.link, item.author, item.content, item.pubDate, item.enclosure, item.baseURI));
    }
    
    this._listener.onFeedParsed(sageFeed);
  },
  
  // nsIClassInfo
  getInterfaces : function(aCount) {
    var interfaces = [Ci.sageIFeedParser, Ci.nsIFeedResultListener, Ci.nsIClassInfo];
    aCount.value = interfaces.length;
    return interfaces;
  },

  // nsIClassInfo
  getHelperForLanguage : function(aLanguage) {
    return null;
  },

  // nsIClassInfo
  contractID : CONTRACT_ID,

  // nsIClassInfo
  classDescription : CLASS_NAME,

  // nsIClassInfo
  classID : CLASS_ID,

  // nsIClassInfo
  implementationLanguage : Ci.nsIProgrammingLanguage.JAVASCRIPT,

  // nsIClassInfo
  flags : null,
  
  // nsISupports
  QueryInterface : function(aIID) {
    if (!aIID.equals(Ci.nsISupports) &&
        !aIID.equals(Ci.sageIFeedParser) &&
        !aIID.equals(Ci.nsIFeedResultListener) &&
        !aIID.equals(Ci.nsIClassInfo)) {
      throw Cr.NS_ERROR_NO_INTERFACE;
    }
    return this;
  }
};

/******************************************************************************
 * XPCOM Functions for construction and registration
 ******************************************************************************/
var Module = {
  _firstTime: true,
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType)
  {
    if (this._firstTime) {
      this._firstTime = false;
      throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    }
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID)
  {
    if (!aIID.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    if (aCID.equals(CLASS_ID))
      return Factory;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

var Factory = {
  createInstance: function(aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    return (new sageMozillaFeedParser()).QueryInterface(aIID);
  }
};

function NSGetModule(aCompMgr, aFileSpec) { return Module; }