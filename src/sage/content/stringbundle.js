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
 * Erik Arvidsson <erik@eae.net>.
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

// TODO: Need to update the license block with info regarding this being ported
// from the XBL code

// This is a direct port of the stringbundle xbl implementation

function StringBundle(aSrc)
{
	if (aSrc)
		this.src = aSrc;
}

StringBundle.prototype = {
	_src:		null,
	_bundle:	null,

	set src(s) {
		this._bundle = null
		return this._src = s;
	},

	get src ()
	{
		return this._src;
	},

	getString:	function (aStringKey)
	{
		try
		{
			return this.stringBundle.GetStringFromName(aStringKey);
		}
		catch (e)
		{
			dump("*** Failed to get string " + aStringKey + " in bundle: " + this.src + "\n");
			throw e;
		}
	},


	getFormattedString:	function (aStringKey, aStringsArray)
	{
		try
		{
			return this.stringBundle.formatStringFromName(aStringKey, aStringsArray, aStringsArray.length);
		}
		catch (e)
		{
			dump("*** Failed to get string " + aStringKey + " in bundle: " + this.src + "\n");
			throw e;
		}
	},

	get stringBundle ()
	{
		if (!this._bundle)
		{
			try
			{
				var stringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
					.getService(Components.interfaces.nsIStringBundleService);
				this._bundle = stringBundleService.createBundle(this.src, this.appLocale);
			}
			catch (e)
			{
				dump("Failed to get stringbundle:\n");
				dump(e + "\n");
			}
		}
		return this._bundle;
	},

	get appLocale()
	{
		try
		{
			var localeService = Components.classes["@mozilla.org/intl/nslocaleservice;1"]
				.getService(Components.interfaces.nsILocaleService);
			return localeService.getApplicationLocale();
		}
		catch (ex)
		{
			return null;
		}
	}
};
