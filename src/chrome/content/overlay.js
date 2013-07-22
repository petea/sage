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

Cu.import("resource://sage/SageUpdateChecker.jsm");
Cu.import("resource://sage/SageMetrics.jsm");

var sageOverlay = {

  logger : null,
  needsRestart : null,

  init : function() {
    var Logger = new Components.Constructor("@sage.mozdev.org/sage/logger;1", "sageILogger", "init");
    this.logger = new Logger();
    SageMetrics.init();

    this.needsRestart = false;
    
    if (this.isNewUser()) {
      SageUtils.createRootFolder();
      this.addToolbarButton();
      this.addContentHandler();
      this.needsRestart = true;
      SageMetrics.event("Noninteractive", "New Install", { newInstall: true });
    } else if (this.needsMigration()) {
      try {
        this.migrate();
      } catch (e) {
        this.logger.error("migration failed: " + e);
      }
      SageMetrics.event("Noninteractive", "Upgrade");
    }
    SageUtils.setSagePrefValue(SageUtils.PREF_VERSION, SageUtils.VERSION);
    if (this.needsRestart) {
      var prefService = Cc["@mozilla.org/preferences;1"].getService(Ci.nsIPrefBranch);
      prefService.setBoolPref("browser.sessionstore.resume_session_once", true);
      Cc["@mozilla.org/toolkit/app-startup;1"]
        .getService(Ci.nsIAppStartup)
        .quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
    }
    this.obs = {
      observe: function(aSubject, aTopic, aData) {
        switch (aTopic) {
          case "sage-hasNewUpdated":
            var button = document.getElementById("sage-button"),
                sidebarWindow = document.getElementById("sidebar").contentWindow,
                isSidebarOpen = (sidebarWindow.location.href == "chrome://sage/content/sidebar.xul");
            if (button && !(isSidebarOpen && aData == "true")) {
              button.setAttribute("hasNew", aData);
            }
            break;
          default:
            // do nothing
        }
      },
      getInterfaces: function (count) {
        var interfaceList = [Ci.nsIObserver, Ci.nsIClassInfo];
        count.value = interfaceList.length;
        return interfaceList;
      },
      QueryInterface: function (iid) {
        /*if (!iid.equals(Ci.nsIObserver) &&
            !iid.equals(Ci.nsIClassInfo))
          throw Components.results.NS_ERROR_NO_INTERFACE;*/
        return this;
      }
    };
    var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    observerService.addObserver(this.obs, "sage-hasNewUpdated", true);

    // Start background feed checking
    SageUpdateChecker.init();
    
    this.logger.info("initialized");
  },

  uninit : function() {
    var observerService = Cc["@mozilla.org/observer-service;1"]
                          .getService(Ci.nsIObserverService);
    observerService.removeObserver(this.obs, "sage-hasNewUpdated");
  },
  
  getVersion : function() {
    var prefService = Cc["@mozilla.org/preferences;1"].getService(Ci.nsIPrefBranch);
    var oldVersionString = null;
    try {
      oldVersionString = prefService.getCharPref("sage.last_version");
    } catch (e) { }
    var versionString = SageUtils.getSagePrefValue(SageUtils.PREF_VERSION);
    
    if (oldVersionString != null && versionString == "") {
      return oldVersionString;
    } else if (versionString != "") {
      return versionString;
    }
    return null;
  },
  
  isNewUser : function() {
    if (this.getVersion()) {
      return false;
    }
    return true;
  },
  
  needsMigration : function() {
    var version = this.getVersion();
    if (version) {
      var comparator = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
      var x = comparator.compare(SageUtils.VERSION, version);
      if (x > 0) {
        return true;
      }
    }
    return false;
  },
  
  migrate : function() {
    var comparator = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
    var version = this.getVersion();
    if (!version) {
      return;
    }

    var self = this;
    
    var migrations = {
      
      "1.5a" : function() {
        self.addContentHandler();
        self.needsRestart = true;
      },

      "1.5.2b3" : function() {
        var RDF = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService);
        var localstore = RDF.GetDataSource("rdf:local-store");
        SageUtils.setSagePrefValue(
          "showFeedItemList",
          localstore.HasAssertion(
            RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemList"),
            RDF.GetResource("checked"),
            RDF.GetLiteral(true),
            true));
        SageUtils.setSagePrefValue(
          "showFeedItemListToolbar",
          localstore.HasAssertion(
            RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemListToolbar"),
            RDF.GetResource("checked"),
            RDF.GetLiteral(true),
            true));
        SageUtils.setSagePrefValue(
          "showFeedItemListTooltips",
          localstore.HasAssertion(
            RDF.GetResource("chrome://sage/content/sage.xul#chkShowFeedItemTooltips"),
            RDF.GetResource("checked"),
            RDF.GetLiteral(true),
            true));
      }
      
    };
    
    for (var migration in migrations) {
      if (comparator.compare(migration, version) > 0) {
        this.logger.info("performing migration " + migration);
        migrations[migration]();
      }
    }
  },

  hasButton : function() {
    var toolbox = document.getElementById("navigator-toolbox");
    for (var i = 0; i < toolbox.childNodes.length; ++i) {
      var toolbar = toolbox.childNodes[i];
      if (toolbar.localName == "toolbar" && toolbar.getAttribute("customizable") == "true") {
        if (toolbar.currentSet.indexOf("sage-button") > -1) {
          return true;
        }
      }
    }
    return false;
  },
  
  addToolbarButton : function() {
    if (!this.hasButton()) {
      var toolbox = document.getElementById("navigator-toolbox");
      for (var i = 0; i < toolbox.childNodes.length; ++i) {
        toolbar = toolbox.childNodes[i];
        if (toolbar.localName == "toolbar" &&  toolbar.getAttribute("customizable") == "true" && toolbar.id == "nav-bar") {
          var newSet = "";
          var child = toolbar.firstChild;
          while (child) {
            newSet += child.id + ",";
            child = child.nextSibling;
          }
          newSet += "sage-button";
          toolbar.currentSet = newSet;
          toolbar.setAttribute("currentset", newSet);
          toolbox.ownerDocument.persist(toolbar.id, "currentset");
          try {
            BrowserToolboxCustomizeDone(true);
          } catch (e) {}
          break;
        }
      }
    }
  },
  
  addContentHandler : function() {
    var prefService = Cc["@mozilla.org/preferences;1"].getService(Ci.nsIPrefService);
    var i = 0;
    var prefBranch = null;
    while (true) {
      prefBranch = prefService.getBranch("browser.contentHandlers.types." + i + ".");
      try {
        var title = prefBranch.getCharPref("title");
        if (title == "Sage") {
          break;
        }
        i++;
      } catch (e) {
        // No more handlers
        break;
      }
    }
    if (prefBranch) {
      prefBranch.setCharPref("title", "Sage");
      prefBranch.setCharPref("type", "application/vnd.mozilla.maybe.feed");
      prefBranch.setCharPref("uri", "sage://viewer/#feed/%s");
    }
    prefService.savePrefFile(null);
  },
  
  // nsIDOMEventListener
  handleEvent: function(event) {
    switch(event.type) {
      case "load":
        this.init();
        break;
      case "unload":
        this.uninit();
        break;
    }
  }

}

window.addEventListener("load", sageOverlay, false);
window.addEventListener("unload", sageOverlay, false);
