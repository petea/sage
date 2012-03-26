Sage
====

Sage is a lightweight [RSS][rss] and [Atom][atom] feed reader [extension][extensions] for [Mozilla Firefox][firefox]. It's got a lot of what you need and not much of what you don't.

If you'd just like to start using Sage, [head to the website][sage] to get started.

Developing Sage
---------------

### Dependencies

* [Python][python]
* [Gecko SDK][gecko]
* [Ant][ant]

### Building

    $ git clone git@github.com:petea/sage.git
    $ cd sage
    $ curl [Gecko SDK download URL] | tar -x
    $ ant

If all goes well, you'll find the [XPI][xpi] file under the sage/build folder.

### Installing

With the XPI built, you can install it by opening it from Firefox or [copying it][install] to your Firefox profile directory.  Either way, you'll need to restart Firefox.

[rss]: http://en.wikipedia.org/wiki/RSS
[atom]: http://en.wikipedia.org/wiki/Atom_(standard)
[extensions]: https://developer.mozilla.org/en/Extensions
[firefox]: http://www.mozilla.com/firefox/
[sage]: http://sagerss.com
[python]: http://www.python.org
[gecko]: https://developer.mozilla.org/en/Gecko_SDK
[ant]: http://ant.apache.org
[xpi]: https://developer.mozilla.org/en/XPI
[install]: https://developer.mozilla.org/en/Installing_extensions