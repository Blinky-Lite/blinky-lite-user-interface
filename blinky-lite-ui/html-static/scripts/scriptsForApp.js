var socket;
var graph3d = null;
var itimeSlice = 0;
var modeMax = 88;
var timeMax = 150;
var oodataArray = [];
var timeStamp = [];
var deltaT = 0;
var freeze = false;
var audioAlarm = new Audio('/audio/alarm.ogg');
var alarmOn = false;
var alarmThreshold = 20.0;

$( document ).ready(function()
{
  $("#freezeButton").text('Running');
  $("#alarmButton").text('Alarm OFF');
  $("#alarmThreshold").val(alarmThreshold.toString());
  drawSpectrogram();
  socket = io.connect(window.location.href);
  socket.on('connect', function(data) {socket.emit('join', 'Socket Connection from index page established.');});
  socket.on('ooDataArrays', function(data) {if (!freeze) addOoDataArrays(data);});
  socket.on('ooDataGlobal', function(data) {if (!freeze) addOoGlobalData(data);});
  socket.on('ooSetProcessing', function(data) {if (!freeze) addOoSetProcessing(data);});
  $("#alarmThreshold").change(function(){alarmThreshold = Number($("#alarmThreshold").val());});

});

function initializeDataArray()
{
  for (var imode = 0; imode < modeMax; ++imode)
  {
    var value = 0.0;
    oodataArray[imode] =
    {
      'x': imode,
      'y': 0,
      'z': value,
      'style': value
    };
  }
}

function drawSpectrogram()
{

  // specify options
  var options = {
    width:  '100%',
    height: '1000px',
    style: 'surface',
    showPerspective: false,
    showGrid: true,
    showShadow: false,
    keepAspectRatio: false,
    verticalRatio: 1.0,
    showZAxis: true,
    yCenter: '50%',
    xLabel: 'Mode',
    yLabel: 'Time (sec)',
    zLabel: 'Phase (psec)',
    tooltip: true,
    axisColor: '#ffffff'
  };

  // create a graph3d
  var container = document.getElementById('spectrogram');
  initializeDataArray();

  graph3d = new vis.Graph3d(container, oodataArray, options);
  var horzAngle = 315.0 * 3.1415927 / 180.0;
  var vertAngle = 45.0 * 3.1415927 / 180.0;
  graph3d.setCameraPosition({'horizontal': horzAngle, 'vertical': vertAngle, 'distance': 2.0});
  $("#startTime").text(new Date().toLocaleString());
  $("#stopTime").text(new Date().toLocaleString());
}

function addOoDataArrays(ooDataArrays)
{
  if (itimeSlice < timeMax)
  {
    timeStamp[itimeSlice] = new Date().getTime();3
    deltaT = (timeStamp[itimeSlice] - timeStamp[0]) / 1000;
    for (var imode = 0; imode < modeMax; ++imode)
    {
      var value = Math.round(100.0 * Number(ooDataArrays.modeM[imode])) / 100.0;
      oodataArray[itimeSlice * modeMax + imode] =
      {
        'x': imode,
        'y': deltaT,
        'z': value,
        'style': value
      };
    }
    ++itimeSlice;
  }
  else
  {
    for (var itime = 0; itime < (timeMax - 1); ++itime)
    {
      timeStamp[itime] = timeStamp[itime + 1];
      deltaT = (timeStamp[itime] - timeStamp[0]) / 1000;
      for (var imode = 0; imode < modeMax; ++imode)
      {
        oodataArray[itime * modeMax + imode] =
        {
          'x': oodataArray[(itime + 1) * modeMax + imode].x,
          'y': deltaT,
          'z': oodataArray[(itime + 1) * modeMax + imode].z,
          'style': oodataArray[(itime + 1) * modeMax + imode].style
        };
      }
    }
    timeStamp[timeMax - 1] = new Date().getTime();
    deltaT = (timeStamp[timeMax - 1] - timeStamp[0]) / 1000;
    for (var imode = 0; imode < modeMax; ++imode)
    {
      var value = Math.round(100.0 * Number(ooDataArrays.modeM[imode])) / 100.0;
      oodataArray[(timeMax - 1) * modeMax + imode] =
      {
        'x': imode,
        'y': deltaT,
        'z': value,
        'style': value
      };
    }
  }
  $("#startTime").text(new Date(timeStamp[0]).toLocaleString());
  $("#stopTime").text(new Date(timeStamp[itimeSlice - 1]).toLocaleString());
  //calculateBeamCurrent(oodata);
  //calculateAvgPhase(oodata);
  graph3d.setData(oodataArray);
}
function addOoGlobalData(ooDataGlobal)
{
  $("#beamCurrent").text(ooDataGlobal.beamCurrent.toString() + ' mA');
  $("#avgPhase").text(ooDataGlobal.avgPhase.toString() + ' pS');
  $("#rmsPhase").text(ooDataGlobal.rmsModeAmp.toString() + ' pS');
  $("#maxMode").text(ooDataGlobal.maxDipoleMode);
  $("#maxModeAmplitude").text(ooDataGlobal.maxDipoleModeAmp + ' pS');
  if (alarmOn)
  {
    if (Number(ooDataGlobal.maxDipoleModeAmp) > alarmThreshold)
    {
      audioAlarm.play();
      $("#spectrogram").css('background','#ff0000');
    }
    else
    {
      $("#spectrogram").css('background','#7a7a7a');
    }
  }
}
function addOoSetProcessing(ooSetProcessing)
{
  var avgType = 'Linear';
  if (!ooSetProcessing.linearWeight) avgType = 'Quadratic';
  $("#avgType").text(avgType);
  $("#numAvgs").text(ooSetProcessing.numberOfSamples.toString());
}
function calculateAvgPhase(oodata)
{
  var avgPhase = 0.0;
  for (var ii = 0; ii < 176; ++ii)
  {
    avgPhase = avgPhase + Number(oodata[9].payload[ii]);
  }
  avgPhase = Math.round(100.0 * avgPhase / 176.0) / 100.0;
  $("#avgPhase").text(avgPhase.toString() + ' pS');
}
function freezeRun()
{
  freeze = !freeze;
  if (freeze)
  {
    $("#freezeButton").text('Frozen');
  }
  else
  {
    $("#freezeButton").text('Running');
  }

}
function toggleAlarm()
{
  alarmOn = !alarmOn;
  if (alarmOn)
  {
    $("#alarmButton").text('Alarm ON');
  }
  else
  {
    $("#alarmButton").text('Alarm OFF');
    $("#spectrogram").css('background','#7a7a7a');
  }

}
