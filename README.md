# validate-markdown-code

Basically, this code was originally written to check the code of [map-factory](https://github.com/midknight41/map-factory) for source code errors in it's markdown. It could and should probably be cleaned up though to be a bit clean and more generic though as, in theory, this could be quite an awesome module.

## Usage

It is just plain old node 4 compatable JS so no need to build. There is no command line arguments at this stage so you need to clone in the same repo folder as map-factory. If it isn't then just change the path in `server.js`.

To execute, execute server.js

```bash
node server
```

It will report errors. Fix them and then repeat.

Once you have fixed all the things it will tell you so.

## Quirks in your code

If your code is async then always return a promise. If the return value looks
like a promise (has a `then` and `catch` method) then it will wait for it - this
will timeout after 10 seconds though so keep it short.

If it isn't, there is no need to return anything.

Your code will be running in a sandbox so it doesn't have access to just any old
thing. It has access to:

* `clearTimeout`
* `console`
* `done` - A callback function for async code. At the moment this should only
be called automatically when your promise exits. You should not call it
manually if your code is not promisified.
* `module` - The context module
* `process` - Remember, this is the shared process so don't mess with it. This
will probably be removed in a later version.
* `require` (See require quicks later on)
* `setTimeout`

If you need anything in here then it shouldn't be too hard to add. Just ask or
send a pull request.

## Require Quirks

1. Require is a bit quirky as it has been overwritten. It will only attempt to the
get the modules from the base of the where the README file is so add the
packages to the module you are testing, not the `test-markdown-code` package.

2. In your README code you are probably going to want to use

    ```js
    const myPackage = require("your-package");
    ````

    but as `your-package` is not actually included in your module, as it IS the
    module, require will not normally get this package. The retrieval code has
    been modified so that it will check for a package.json in the folder of the
    README and if there is one, check if the name of the package is the same. If
    it is, then it will change the module id to the main id of the package (what
    is stored in your `main` attribute)
