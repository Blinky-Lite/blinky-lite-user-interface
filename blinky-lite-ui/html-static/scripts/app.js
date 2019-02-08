var ws;
var retries = 0;
var userID = -1;
var sysSelect = [];
var sysName = ['sys01','sys02','sys03','sys04','device','attr','prop'];
var numPlotDevices = 1;
var validDevice = [];
var numSys = sysName.length;
var numDeviceRequested = 0;
var numDeviceReceived = 0;
var csvFile = [null];
var traceData = [];
$( document ).ready(function()
{
    userID  = getRandomInt(4096);
    wsConnectC();
    for (var idev = 0; idev < numPlotDevices; ++idev)
    {
        sysSelect[idev] = [];
        for (var isys = 0; isys < numSys; ++isys)
        {
            sysSelect[idev][isys] = document.getElementById('sysSelect_' + idev.toString() + '_'+ isys.toString());
        }
        validDevice[idev] = false;
    }
    var now = new Date();
    console.log(now.toLocaleString('en-SE'));
    var then = new Date(now.getTime() - 3600 * 24 * 1000);
    $( "#startDate" ).val(then.toLocaleString());
    $( "#stopDate" ).val(now.toLocaleString());
    $( function()
    {
        $('#startDate').datetimepicker();
    } );
    $( function()
    {
        $('#stopDate').datetimepicker();
    } );
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
                case 'loadSystem':
                    loadSystem(msg);
                    break;
                case 'putDevArchive':
                    putDevArchive(msg);
                    break;
                default:
                // code block
            }
        }

    };
    ws.onopen = function()
    {
        console.log("Websocket connected");
        for (var idev = 0; idev < numPlotDevices; ++idev)
        {
            ws.send(JSON.stringify(
            {
                topic       : 'getDevSystem',
                system      : sysName[0],
                payload     : {},
                'userID'    : userID,
                plotDevice      : idev,
                sysSelectIndex  : 0,
            }));
        }
    };
    ws.onclose = function()
    {
    };
}
function getRandomInt(max)
{
  return Math.floor(Math.random() * Math.floor(max));
}
function loadSystem(systemData)
{
    clearDownStreamColumns(systemData.plotDevice, systemData.sysSelectIndex);
    for (var ii = 0; ii < systemData.payload.length; ++ii)
    {
        opt = document.createElement('option');
        opt.value = systemData.payload[ii];
        opt.innerHTML = systemData.payload[ii];
        sysSelect[systemData.plotDevice][systemData.sysSelectIndex].appendChild(opt);
    }
}
function clearDownStreamColumns(plotDevice, sysSelectIndex)
{
    for (var isys = sysSelectIndex; isys < numSys; ++isys)
    {
        while (sysSelect[plotDevice][isys].firstChild)
        {
            sysSelect[plotDevice][isys].removeChild(sysSelect[plotDevice][isys].firstChild);
        }
    }
    var opt = document.createElement('option');
    opt.value = 'notSelected';
    opt.innerHTML = '';
    sysSelect[plotDevice][sysSelectIndex].appendChild(opt);
    $('#csv'+ plotDevice.toString()).removeAttr("href");
    $('#csv'+ plotDevice.toString()).css('color', 'white');
    $('#csv'+ plotDevice.toString()).css('text-decoration', 'none');
    $('#csv'+ plotDevice.toString()).css('font-weight', 'bold');
    validDevice[plotDevice] = false;
}
function sysSelected(plotDevice, sysSelectIndex)
{
    if (sysSelect[plotDevice][sysSelectIndex].value == 'notSelected') return;
    if(sysSelect[plotDevice][sysSelectIndex].firstChild.value == 'notSelected')
    {
        sysSelect[plotDevice][sysSelectIndex].removeChild(sysSelect[plotDevice][sysSelectIndex].firstChild);
    }
    if (sysSelectIndex < (numSys - 1))
    {
        var newMsg =
            {
                topic           : 'getDevSystem',
                system          : sysName[sysSelectIndex + 1],
                payload         : {},
                userID          : userID,
                plotDevice      : plotDevice,
                sysSelectIndex  : sysSelectIndex + 1
            };
        for (var isys = 0; isys <= sysSelectIndex; ++isys)
        {
            newMsg.payload[sysName[isys]] = sysSelect[plotDevice][isys].value;
        }
        ws.send(JSON.stringify(newMsg));
    }
    else
    {
        validDevice[plotDevice] = true;
    }

}
function getDevName(plotDevice)
{
    if (!validDevice[plotDevice]) return;
    var devName = sysSelect[plotDevice][0].value;
    for (var isys = 1; isys < numSys; ++isys)
    {
        devName = devName + '-' + sysSelect[plotDevice][isys].value;
    }
    return devName;
}
function putDevArchive(deviceData)
{
    makeCsvFile(deviceData);
    var data = [];
    var maxPtsToPlot = Number($( '#maxPtsToPlot').val());
    var npts = deviceData.payload.length;
    var step = 1;
    if (deviceData.payload.length > maxPtsToPlot)
    {
        npts = maxPtsToPlot;
        step = deviceData.payload.length / maxPtsToPlot;
    }
    var z_data = [];
    for (var ii = 0; ii < npts; ++ii)
    {
      z_data[ii] = deviceData.payload[Math.round(ii * step)].value[1];
    }
    var data = [{
               z: z_data,
               type: 'surface'
            }];

    var layout = {
      title: 'testy',
      autosize: true,
    };
    Plotly.newPlot('timePlot', data, layout);
    ++numDeviceReceived;
}
makeCsvFile = function (deviceData)
{
    var dataString = '';

    dataString = dataString + 'Device,' + getDevName(deviceData.plotDevice) + '\n';
    dataString = dataString + 'StartDate,' + new Date(deviceData.payload[0].time).toISOString() + '\n';
    dataString = dataString + 'StartDate (mS),' + deviceData.payload[0].time.toString() + '\n';
    dataString = dataString + 'Time (sec),' + sysSelect[deviceData.plotDevice][4].value + '-' + sysSelect[deviceData.plotDevice][5].value + '\n';
    for (var ii = 0; ii < deviceData.payload.length; ++ii)
    {
        dataString = dataString + ((deviceData.payload[ii].time - deviceData.payload[0].time)/1000).toString() + ',x';
        for (var ipt = 0; ipt < deviceData.payload[ii].value[0].length; ++ipt) dataString = dataString + ',' + deviceData.payload[ii].value[0][ipt];
        dataString = dataString + '\n ,y';
        for (var ipt = 0; ipt < deviceData.payload[ii].value[1].length; ++ipt) dataString = dataString + ',' + deviceData.payload[ii].value[1][ipt];
        dataString = dataString + '\n';
    }
    var data = new Blob([dataString], {type: 'text/plain'});

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (csvFile[deviceData.plotDevice] !== null) {
      window.URL.revokeObjectURL(csvFile[deviceData.plotDevice]);
    }

    csvFile[deviceData.plotDevice] = window.URL.createObjectURL(data);
    // returns a URL you can use as a href
    $('#csv'+ deviceData.plotDevice.toString()).css('color', 'blue');
    $('#csv'+ deviceData.plotDevice.toString()).css('text-decoration', 'underline');
    $('#csv'+ deviceData.plotDevice.toString()).css('font-weight', 'bold');
    $('#csv'+ deviceData.plotDevice.toString()).attr("href", csvFile[deviceData.plotDevice]);
    $('#csv'+ deviceData.plotDevice.toString()).attr("download", getDevName(deviceData.plotDevice) + '.csv');

}
function getArchiveData()
{
    numDeviceRequested = 0;
    for (var idev = 0; idev < numPlotDevices; ++idev)
    {
        if (validDevice[idev])
        {
            ++numDeviceRequested;
        }
    };
    if (numDeviceRequested < 1) return;

    numDeviceReceived = 0;
    var startDate = new Date($( "#startDate" ).val());
    var stopDate = new Date($( "#stopDate" ).val());
    $('#plotSetupTable').hide();
    for (var idev = 0; idev < numPlotDevices; ++idev)
    {

        if (validDevice[idev])
        {
            var newMsg =
                {
                    topic           :   'getDevArchive',
                    payload         :   {},
                    userID          :   userID,
                    plotDevice      :   idev,
                    startTime       :   startDate.getTime(),
                    stopTime        :   stopDate.getTime(),
                };
            for (var isys = 0; isys < numSys; ++isys)
            {
                newMsg.payload[sysName[isys]] = sysSelect[idev][isys].value;
            }
            ws.send(JSON.stringify(newMsg));
        }
    }
}
