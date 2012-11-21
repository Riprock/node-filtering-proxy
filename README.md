node-filtering-proxy - HTTP proxy with rule based filtering
===========================================================

Quite simple. The rules are in the code. Implemented using 
[node.js](http://nodejs.org/).

Based on [psanford/node-proxy](https://github.com/psanford/node-proxy).

To-do
-----

In no particular order:

1. More flexible matching (strings, boolean functions on request 
   objects, objects of functions for request and response matching, 
   with option of and/or logic for speed?).
2. Using a watched file for defining rules.
3. HTTPS?

