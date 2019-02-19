var ws;
var retries = 0;
var userID = -1;
$( document ).ready(function()
{
    userID  = getRandomInt(4096);
    $('#button2').hide();
    wsConnectC();
});
function wsConnectC()
{
    var uri = window.location.href.split('://');
    var wslead = 'ws://';
    if (uri[0] == 'https') wslead = 'wss://';
    ws = new WebSocket(wslead + uri[1] + '/websocket');
    ws.onmessage = function(event)
    {
        var msg = JSON.parse(event.data);
        if (msg.userID == userID)
        {
            switch(msg.topic)
            {
                case 'message1':
                    message1(msg);
                    break;
                case 'message2':
                    message2(msg);
                    break;
                default:
                // code block
            }
        }

    };
    ws.onopen = function()
    {
        console.log("Websocket connected");
        ws.send(JSON.stringify(
        {
            topic       : 'hello',
            payload     :
            {
              data : [1,2,3],
            },
            'userID'    : userID,
        }));
    };
    ws.onclose = function()
    {
    };
}
function getRandomInt(max)
{
  return Math.floor(Math.random() * Math.floor(max));
}
function message1(msg)
{
  console.log(msg);
  $('#button1').hide();
  $('#button2').show();
}
function message2(msg)
{
  console.log(msg);
  $('#button1').show();
  $('#button2').hide();
}
function buttonPushed(button)
{
  var topic = 'message1';
  var payload = 'payload1';
  if (button == 2) topic = 'message2';
  if (button == 2) payload = 'payload2';
  ws.send(JSON.stringify(
  {
      topic       : topic,
      payload     :
      {
        data : payload,
      },
      'userID'    : userID,
  }));
}
