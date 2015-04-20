var restify = require('restify');
var mubsub = require('mubsub');

var server = restify.createServer();

var client = mubsub('mongodb://localhost:27017/mubsub_example');
var channel = client.channel('test');

server.get('/', restify.serveStatic({
	directory : './static/',
	default: 'index.html'
}));

server.get('/sse', function(req, res) {
  // let request last as long as possible
  req.socket.setTimeout(0x7FFFFFFF);

  var messageCount = 0;
  var subscriber = client.channel('test');
//  var subscriber = channel;

  // In case we encounter an error...print it out to the console
  subscriber.on("error", function(err) {
    console.log("Redis Error: " + err);
  });

  // When we receive a message from the redis connection
  var subscription = subscriber.subscribe("message", function(message) {
    messageCount++; // Increment our message count
    res.write('id: ' + messageCount + '\n');
    res.write("data: " + message + '\n\n'); // Note the extra newline
  });

  //send headers for event-stream connection
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
//    'Access-Control-Allow-Origin': 'https://toromanoff.org',
//    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS'
  });
  res.write('\n');

  // The 'close' event is fired when a user closes their browser window.
  // In that situation we want to make sure our redis channel subscription
  // is properly shut down to prevent memory leaks...and incorrect subscriber
  // counts to the channel.
  req.on("close", function() {
    subscription.unsubscribe();
  });
});

server.get('/fire-event/:event_name', function(req, res) {
  channel.publish('update', ('"' + req.params.event_name + '" page visited') );
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('All clients have received "' + req.params.event_name + '"');
  res.end();
});


server.listen(process.env.PORT, process.env.IP, function() {
  console.log('listening: %s', server.url);
});
