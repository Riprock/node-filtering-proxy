/*
 Copyright (c) 2010 Peter Sanford

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

var rules = [
  {
    name : '4OD ads',
    match : /^http:\/\/ais.channel4.com\/asset\/.+/,
    filter : function(data) {
      return data.replace(/<adverts>[\s\S]*<\/adverts>/, '');
    }
  }
];

var sys = require('sys'),
    http = require('http');

var server = http.createServer(function (client_request, client_resp) {
  // sys.puts(sys.inspect(client_request.headers));

  var host;
  var port;
  var path;

  client_request.url.replace(/^http:\/\/([^\/:]+)(?::(\d+))?(.*)/, function(m, h, po, pa) {
    host = h;
    port = po;
    path = pa;
  });

  var filtering = false;
  var rule;
  for (var i = 0; i < rules.length; i++) {
    if (rules[i].match.test(client_request.url)) {
      filtering = true;
      rule = i;
      break;
    }
  }

  path = path || '/';

  // sys.puts(client_request.method + " " + host + " " + path);
  var request = http.request({
    method : "GET",
    hostname : host,
    port: port || 80,
    path : path,
    headers : client_request.headers
  });
  
  request.on('error', function(error) {
    console.log('Request error: '+ error.message, request._headers.host);
  });
  
  client_request.addListener("data", function (chunk) {
    request.write(chunk);
  });

  client_request.addListener("end", function () {
    request.on('response', function (foreign_response) {
      // sys.puts("STATUS: " + foreign_response.statusCode);
      // sys.puts("HEADERS: " + JSON.stringify(foreign_response.headers));
      
      client_resp.statusCode = foreign_response.statusCode;
      for (var name in foreign_response.headers) {
        client_resp.setHeader(name, foreign_response.headers[name]);
      }
      
      var data = '';
      foreign_response.addListener("data", function (chunk) {
        if (filtering) {
          data += chunk;
        }
        else {
          client_resp.write(chunk);
        }
      });
      foreign_response.on('end', function () {
        if (filtering) {
          console.log('Filtering ' + rules[rule].name);
          var newData = rules[rule].filter(data);
          client_resp.setHeader('Content-length', newData.length);
          client_resp.write(rules[rule].filter(data));
        }
        client_resp.end();
      });
    });

    request.end();
  });
});

server.listen(8000);
sys.puts('Server running at http://127.0.0.1:8000');
