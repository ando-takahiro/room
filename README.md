# room - a 3D virtual space

## Motivation

This provides an experimental 3D virtual space using node.js, webgl, redis, socket.io. My goal is something like [UGC](http://en.wikipedia.org/wiki/User-generated_content) web space, for example [Minecraft](http://www.minecraft.net/) :)

## How to run

 1. checkout this repository
 1. npm install
 1. install redis(use deps/redis-*.tar.gz)
 1. run redis-server with default setting(no argument)
 1. sh scripts/dev.sh
 1. access [http://localhost:8080/](http://localhost:8080/)

## DB

 * now using [Redis](http://redis.io/)
 * only 3 schemas
   * **room:default:room** key contains active users in the room
   * **room:default:chat** key contains chat log
   * **account:[user-id]:entity** key contains last status of user
 * store as JSON string

## Important files and directories

 * server.js: server entry point
 * public: client side static files
  * room.html: core html
  * js
     * controller.js: core logic of client
 * src: server side codes
  * room.js: core logic of server
 * test: test codes

## Testing strategy

 * now using [mocha](https://mochajs.org/)
   * browser side test is also mocha based (but it's tricky. see test/browser.js)
 * experimental redis mock

## More details

Technical details will be writen [here](https://github.com/ando-takahiro/blog/) in Japanese.

## Lisence

MIT

## Based on

[threejsboilerplate](http://jeromeetienne.github.com/threejsboilerplatebuilder/)
