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
