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

var UpdateChecker = {
	checking: false,
	checkList: null,
	httpReq: null,
	lastResource: null,

	startCheck: function(aCheckFolderId) {
		if(this.checking) return;

		var resourceList = CommonFunc.getBMDSCChildren(aCheckFolderId);
		this.checkList = new Array();

		// select feeds to be checked, exclude separators and updated feeds
		for(var i = 0; i < resourceList.length; i++) {
			var url = CommonFunc.getBMDSProperty(resourceList[i], CommonFunc.BM_URL);
			var desc = CommonFunc.getBMDSProperty(resourceList[i], CommonFunc.BM_DESCRIPTION);
			var status = desc.split(" ")[0];
			if(url && !(status == CommonFunc.STATUS_UPDATE || status == CommonFunc.STATUS_NO_CHECK)) {
				this.checkList.push(resourceList[i]);
			}
		}

		logMessage("checking " + this.checkList.length + " feed(s)");

		if (this.checkList.length > 0) {
			this.checking = true;
			this.check();
		}
	},

	done: function() {
		if (this.checking) {
			this.httpReq.abort();
			this.setCheckingFlag(this.lastResource, false);
		}
	},

	check: function() {
		this.lastResource = this.checkList.shift();
		var name = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_NAME);
		var type = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.RDF_TYPE);
		var url;
		if(type == NC_NS + "Bookmark") {
			url = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_URL);
		}
		if(type == NC_NS + "Livemark") {
			url = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_FEEDURL);
		}

		if(!url) {
			this.checkResult(false, 0);
		}

		if(this.httpReq) {
			this.httpReq.abort();
		}

		this.httpReq = new XMLHttpRequest();
		this.httpReq.parent = this;

		this.httpReq.open("GET", url);

		this.httpReq.onload = this.httpLoaded;
		this.httpReq.onerror = this.httpError;
		this.httpReq.onreadystatechange = this.httpReadyStateChange;

		try {
			this.httpReq.setRequestHeader("User-Agent", CommonFunc.USER_AGENT);
			this.httpReq.overrideMimeType("application/xml");
			this.httpReq.send(null);
			this.setCheckingFlag(this.lastResource, true);
			this.onCheck(name, url);
		} catch(e) {
				// FAILURE
			this.httpReq.abort();
			this.checkResult(false, 0);
		}
	},

	httpError: function(e) {
		logMessage("HTTP Error: " + e.target.status + " - " + e.target.statusText);
		UpdateChecker.httpReq.abort();
		UpdateChecker.checkResult(false, 0);
	},

	httpReadyStateChange: function() {
		if(UpdateChecker.httpReq.readyState == 2) {
			try {
				UpdateChecker.httpReq.status;
			} catch(e) {
					// URL NOT AVAILABLE
				UpdateChecker.httpReq.abort();
				UpdateChecker.checkResult(false, 0);
			}
		}
	},

	httpLoaded: function(e) {
		var lastModified = 0;

		try {
			var feed = new Feed(UpdateChecker.httpReq.responseXML, UpdateChecker.httpReq.channel.originalURI);
		} catch(e) {
			UpdateChecker.checkResult(false, 0);
			return;
		}

		if(feed.hasLastPubDate()) {
			lastModified = feed.getLastPubDate().getTime();
		}

		UpdateChecker.checkResult(true, lastModified, feed);
	},

	checkResult: function(aSucceed, aLastModified, feed) {
		var name = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_NAME);
		var url = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_URL);
		var status = 0;

		var lastVisit = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_LAST_VISIT);
		if(!lastVisit) {
			lastVisit = 0;
		} else {
			lastVisit /= 1000;
		}

		if(aSucceed) {
			var sig = CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_DESCRIPTION).match(/\[.*\]/);
			if(aLastModified) {
				if((aLastModified > lastVisit) && (sig != feed.getSignature())) {
					status = CommonFunc.STATUS_UPDATE;
				} else {
					status = CommonFunc.STATUS_NO_UPDATE;
				}
			} else {
				if(sig != feed.getSignature()) {
					//logMessage("signature mismatch: " + feed.getTitle() + "; old sig: " + sig + "  new sig: " + feed.getSignature());
					status = CommonFunc.STATUS_UPDATE;
				} else {
					status = CommonFunc.STATUS_NO_UPDATE;
				}
			}
		} else {
			status = CommonFunc.STATUS_ERROR;
		}

		CommonFunc.setBMDSProperty(this.lastResource, CommonFunc.BM_DESCRIPTION, status + " " + CommonFunc.getBMDSProperty(this.lastResource, CommonFunc.BM_DESCRIPTION).match(/\[.*\]/));
		this.setCheckingFlag(this.lastResource, false);

		if(this.checkList.length == 0) {
			this.checking = false;
			this.onChecked(name, url);
			return;
		} else {
			this.check();
		}
	},

	setCheckingFlag: function(aRes, aSet, aRecursive) {
		if (!aSet) {
			// Clear the "checking" indicator on lastResource if it is set
			var desc = CommonFunc.getBMDSProperty(aRes, CommonFunc.BM_DESCRIPTION);
			var status = desc.split(" ")[0];
			if (status == CommonFunc.STATUS_CHECKING) {
				CommonFunc.setBMDSProperty(aRes, CommonFunc.BM_DESCRIPTION,
										   CommonFunc.STATUS_UNKNOWN + " " +
										   CommonFunc.getBMDSProperty(aRes, CommonFunc.BM_DESCRIPTION).match(/\[.*\]/));
			}
		} else {
			CommonFunc.setBMDSProperty(aRes, CommonFunc.BM_DESCRIPTION,
									   CommonFunc.STATUS_CHECKING + " " +
									   CommonFunc.getBMDSProperty(aRes, CommonFunc.BM_DESCRIPTION).match(/\[.*\]/));
		}

		if (aRecursive || aRecursive === undefined) {
			// Go to parent folder
			var predicate = BMDS.ArcLabelsIn(aRes).getNext();
			if (predicate instanceof Components.interfaces.nsIRDFResource) {
				var parent = BMDS.GetSource(predicate, aRes, true);
				if (parent.Value != sageFolderID) {
					this.setCheckingFlag(parent, aSet);
				}
			}
		}
	},
	
	onCheck: function(aName, aURL) {},
	onChecked: function(aName, aURL) {}
}
