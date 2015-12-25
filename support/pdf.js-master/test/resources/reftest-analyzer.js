/*
Copyright 2012 Mozilla Foundation

Version: MPL 1.1/GPL 2.0/LGPL 2.1

The contents of this file are subject to the Mozilla Public License Version
1.1 (the "License"); you may not use this file except in compliance with
the License. You may obtain a copy of the License at

    http://www.mozilla.org/MPL

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
for the specific language governing rights and limitations under the
License.

Alternatively, the contents of this file may be used under the terms of
either the GNU General Public License Version 2 or later (the "GPL"), or
the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
in which case the provisions of the GPL or the LGPL are applicable instead
of those above. If you wish to allow use of your version of this file only
under the terms of either the GPL or the LGPL, and not to allow others to
use your version of this file under the terms of the MPL, indicate your
decision by deleting the provisions above and replace them with the notice
and other provisions required by the LGPL or the GPL. If you do not delete
the provisions above, a recipient may use your version of this file under
the terms of any one of the MPL, the GPL or the LGPL.

Original author: L. David Baron <dbaron@dbaron.org>
*/

// Global variables
window.gPhases = null;
window.XLINK_NS = "http://www.w3.org/1999/xlink";
window.SVG_NS = "http://www.w3.org/2000/svg";
window.gMagPixPaths = []; // 2D array of array-of-two <path> objects used in the pixel magnifier
window.gMagWidth = 5; // number of zoomed in pixels to show horizontally
window.gMagHeight = 5; // number of zoomed in pixels to show vertically
window.gMagZoom = 16; // size of the zoomed in pixels
window.gImage1Data; // ImageData object for the test output image
window.gImage2Data; // ImageData object for the reference image
window.gFlashingPixels = []; // array of <path> objects that should be flashed due to pixel color mismatch
window.gPath = ''; // path taken from #web= and prepended to ref/snp urls
window.gSelected = null; // currently selected comparison

window.onload = function() {
  load();

  function ID(id) {
    return document.getElementById(id);
  }

  function hashParameters() {
    var result = { };
    var params = window.location.hash.substr(1).split(/[&;]/);
    for (var i = 0; i < params.length; i++) {
      var parts = params[i].split("=");
      result[parts[0]] = unescape(unescape(parts[1]));
    }
    return result;
  }

  function load() {
    gPhases = [ ID("entry"), ID("loading"), ID("viewer") ];
    buildMag();
    var params = hashParameters();
    if (params.log) {
      ID("logEntry").value = params.log;
      logPasted();
    } else if (params.web) {
      loadFromWeb(params.web);
    }
    ID("logEntry").focus();
  }

  function buildMag() {
    var mag = ID("mag");
    var r = document.createElementNS(SVG_NS, "rect");
    r.setAttribute("x", gMagZoom * -gMagWidth / 2);
    r.setAttribute("y", gMagZoom * -gMagHeight / 2);
    r.setAttribute("width", gMagZoom * gMagWidth);
    r.setAttribute("height", gMagZoom * gMagHeight);
    mag.appendChild(r);
    mag.setAttribute("transform", "translate(" + (gMagZoom * (gMagWidth / 2) + 1) + "," + (gMagZoom * (gMagHeight / 2) + 1) + ")");

    for (var x = 0; x < gMagWidth; x++) {
      gMagPixPaths[x] = [];
      for (var y = 0; y < gMagHeight; y++) {
        var p1 = document.createElementNS(SVG_NS, "path");
        p1.setAttribute("d", "M" + ((x - gMagWidth / 2) + 1) * gMagZoom + "," + (y - gMagHeight / 2) * gMagZoom + "h" + -gMagZoom + "v" + gMagZoom);
        p1.setAttribute("stroke", "#CCC");
        p1.setAttribute("stroke-width", "1px");
        p1.setAttribute("fill", "#aaa");

        var p2 = document.createElementNS(SVG_NS, "path");
        p2.setAttribute("d", "M" + ((x - gMagWidth / 2) + 1) * gMagZoom + "," + (y - gMagHeight / 2) * gMagZoom + "v" + gMagZoom + "h" + -gMagZoom);
        p2.setAttribute("stroke", "#CCC");
        p2.setAttribute("stroke-width", "1px");
        p2.setAttribute("fill", "#888");

        mag.appendChild(p1);
        mag.appendChild(p2);
        gMagPixPaths[x][y] = [p1, p2];
      }
    }

    var flashedOn = false;
    setInterval(function() {
      flashedOn = !flashedOn;
      flashPixels(flashedOn);
    }, 500);
  }

  function showPhase(phaseId) {
    for (var i in gPhases) {
      var phase = gPhases[i];
      phase.style.display = (phase.id == phaseId) ? "block" : "none";
    }
    if (phaseId == "viewer") {
      ID("images").style.display = "none";
    }
  }

  function loadFromWeb(url) {
    var lastSlash = url.lastIndexOf('/');
    if (lastSlash) {
      gPath = url.substring(0, lastSlash + 1);
    }

    var r = new XMLHttpRequest();
    r.open("GET", url);
    r.onreadystatechange = function() {
      if (r.readyState == 4) {
        processLog(r.response);
      }
    }
    r.send(null);
  }

  function fileEntryChanged() {
    showPhase("loading");
    var input = ID("fileEntry");
    var files = input.files;
    if (files.length > 0) {
      // Only handle the first file; don't handle multiple selection.
      // The parts of the log we care about are ASCII-only.  Since we
      // can ignore lines we don't care about, best to read in as
      // ISO-8859-1, which guarantees we don't get decoding errors.
      var fileReader = new FileReader();
      fileReader.onload = function(e) {
        var log = e.target.result;
        if (log) {
          processLog(log);
        } else {
          showPhase("entry");
        }
      }
      fileReader.readAsText(files[0], "iso-8859-1");
    }
    // So the user can process the same filename again (after
    // overwriting the log), clear the value on the form input so we
    // will always get an onchange event.
    input.value = "";
  }

  function logPasted() {
    showPhase("loading");
    var entry = ID("logEntry");
    var log = entry.value;
    entry.value = "";
    processLog(log);
  }

  var gTestItems;

  function processLog(contents) {
    var lines = contents.split(/[\r\n]+/);
    gTestItems = [];
    for (var j in lines) {
      var line = lines[j];
      var match = line.match(/^(?:NEXT ERROR )?REFTEST (.*)$/);
      if (!match) {
        continue;
      }
      line = match[1];
      match = line.match(/^(TEST-PASS|TEST-UNEXPECTED-PASS|TEST-KNOWN-FAIL|TEST-UNEXPECTED-FAIL)(\(EXPECTED RANDOM\)|) \| ([^\|]+) \|(.*)/);
      if (match) {
        var state = match[1];
        var random = match[2];
        var url = match[3];
        var extra = match[4];

        gTestItems.push({
          pass: !state.match(/FAIL$/),
          // only one of the following three should ever be true
          unexpected: !!state.match(/^TEST-UNEXPECTED/),
          random: (random == "(EXPECTED RANDOM)"),
          skip: (extra == " (SKIP)"),
          url: url,
          images: []
        });
        continue;
      }
      match = line.match(/^  IMAGE[^:]*: (.*)$/);
      if (match) {
        var item = gTestItems[gTestItems.length - 1];
        item.images.push(match[1]);
      }
    }
    buildViewer();
  }

  function buildViewer() {
    if (gTestItems.length == 0) {
      showPhase("entry");
      return;
    }

    var cell = ID("itemlist");
    var table = document.getElementById("itemtable");
    while (table.childNodes.length > 0) {
      table.removeChild(table.childNodes[table.childNodes.length - 1]);
    }
    var tbody = document.createElement("tbody");
    table.appendChild(tbody);

    for (var i in gTestItems) {
      var item = gTestItems[i];
      if (item.pass && !item.unexpected) {
        continue;
      }

      var tr = document.createElement("tr");
      var rowclass = item.pass ? "pass" : "fail";
      var td = document.createElement("td");
      var text = "";

      if (item.unexpected) {
        text += "!";
        rowclass += " unexpected";
      }
      if (item.random) {
        text += "R";
        rowclass += " random";
      }
      if (item.skip) {
        text += "S";
        rowclass += " skip";
      }
      td.appendChild(document.createTextNode(text));
      tr.appendChild(td);

      td = document.createElement("td");
      td.id = "url" + i;
      td.className = "url";

      var match = item.url.match(/\/mozilla\/(.*)/);
      text = document.createTextNode(match ? match[1] : item.url);
      if (item.images.length > 0) {
        var a = document.createElement("a");
        a.id = i;
        a.className = "image";
        a.href = "#";
        a.appendChild(text);
        td.appendChild(a);
      } else {
        td.appendChild(text);
      }
      tr.appendChild(td);
      tr.className = rowclass;
      tbody.appendChild(tr);
    }

    // Bind an event handler to each image link
    var images = document.getElementsByClassName("image");
    for (var i = 0; i < images.length; i++) {
      images[i].addEventListener("click", function(e) {
        showImages(e.target.id);
      }, false);
    }
    showPhase("viewer");
  }

  function getImageData(src, whenReady) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 1000;

      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      whenReady(ctx.getImageData(0, 0, 800, 1000));
    };
    img.src = gPath + src;
  }

  function showImages(i) {
    if (gSelected !== null) {
      ID('url' + gSelected).classList.remove('selected');
    }
    gSelected = i;
    ID('url' + gSelected).classList.add('selected');
    var item = gTestItems[i];
    var cell = ID("images");

    ID("image1").style.display = "";
    ID("image2").style.display = "none";
    ID("diffrect").style.display = "none";
    ID("imgcontrols").reset();

    ID("image1").setAttributeNS(XLINK_NS, "xlink:href", gPath + item.images[0]);
    // Making the href be #image1 doesn't seem to work
    ID("feimage1").setAttributeNS(XLINK_NS, "xlink:href", gPath + item.images[0]);
    if (item.images.length == 1) {
      ID("imgcontrols").style.display = "none";
    } else {
      ID("imgcontrols").style.display = "";
      ID("image2").setAttributeNS(XLINK_NS, "xlink:href", gPath + item.images[1]);
      // Making the href be #image2 doesn't seem to work
      ID("feimage2").setAttributeNS(XLINK_NS, "xlink:href", gPath + item.images[1]);
    }
    cell.style.display = "";
    getImageData(item.images[0], function(data) {
      gImage1Data = data
    });
    getImageData(item.images[1], function(data) {
      gImage2Data = data
    });
  }

  function showImage(i) {
    if (i == 1) {
      ID("image1").style.display = "";
      ID("image2").style.display = "none";
    } else {
      ID("image1").style.display = "none";
      ID("image2").style.display = "";
    }
  }

  function showDifferences(cb) {
    ID("diffrect").style.display = cb.checked ? "" : "none";
  }

  function flashPixels(on) {
    var stroke = on ? "#FF0000" : "#CCC";
    var strokeWidth = on ? "2px" : "1px";
    for (var i = 0; i < gFlashingPixels.length; i++) {
      gFlashingPixels[i].setAttribute("stroke", stroke);
      gFlashingPixels[i].setAttribute("stroke-width", strokeWidth);
    }
  }

  function cursorPoint(evt) {
    var m = evt.target.getScreenCTM().inverse();
    var p = ID("svg").createSVGPoint();
    p.x = evt.clientX;
    p.y = evt.clientY;
    p = p.matrixTransform(m);
    return { x: Math.floor(p.x), y: Math.floor(p.y) };
  }

  function hex2(i) {
    return (i < 16 ? "0" : "") + i.toString(16);
  }

  function canvasPixelAsHex(data, x, y) {
    var offset = (y * data.width + x) * 4;
    var r = data.data[offset];
    var g = data.data[offset + 1];
    var b = data.data[offset + 2];
    return "#" + hex2(r) + hex2(g) + hex2(b);
  }

  function hexAsRgb(hex) {
    return "rgb(" + [parseInt(hex.substring(1, 3), 16), parseInt(hex.substring(3, 5), 16), parseInt(hex.substring(5, 7), 16)] + ")";
  }

  function magnify(evt) {
    var cursor = cursorPoint(evt);
    var x = cursor.x;
    var y = cursor.y;
    var centerPixelColor1, centerPixelColor2;

    var dx_lo = -Math.floor(gMagWidth / 2);
    var dx_hi = Math.floor(gMagWidth / 2);
    var dy_lo = -Math.floor(gMagHeight / 2);
    var dy_hi = Math.floor(gMagHeight / 2);

    flashPixels(false);
    gFlashingPixels = [];
    for (var j = dy_lo; j <= dy_hi; j++) {
      for (var i = dx_lo; i <= dx_hi; i++) {
        var px = x + i;
        var py = y + j;
        var p1 = gMagPixPaths[i + dx_hi][j + dy_hi][0];
        var p2 = gMagPixPaths[i + dx_hi][j + dy_hi][1];
        if (px < 0 || py < 0 || px >= 800 || py >= 1000) {
          p1.setAttribute("fill", "#aaa");
          p2.setAttribute("fill", "#888");
        } else {
          var color1 = canvasPixelAsHex(gImage1Data, x + i, y + j);
          var color2 = canvasPixelAsHex(gImage2Data, x + i, y + j);
          p1.setAttribute("fill", color1);
          p2.setAttribute("fill", color2);
          if (color1 != color2) {
            gFlashingPixels.push(p1, p2);
            p1.parentNode.appendChild(p1);
            p2.parentNode.appendChild(p2);
          }
          if (i == 0 && j == 0) {
            centerPixelColor1 = color1;
            centerPixelColor2 = color2;
          }
        }
      }
    }
    flashPixels(true);
    showPixelInfo(x, y, centerPixelColor1, hexAsRgb(centerPixelColor1), centerPixelColor2, hexAsRgb(centerPixelColor2));
  }

  function showPixelInfo(x, y, pix1rgb, pix1hex, pix2rgb, pix2hex) {
    var pixelinfo = ID("pixelinfo");
    ID("coords").textContent = [x, y];
    ID("pix1hex").textContent = pix1hex;
    ID("pix1rgb").textContent = pix1rgb;
    ID("pix2hex").textContent = pix2hex;
    ID("pix2rgb").textContent = pix2rgb;
  }

  var logPastedButton = document.getElementById("logPasted");
  logPastedButton.addEventListener("click", logPasted, false);

  var fileEntryButton = document.getElementById("fileEntry");
  fileEntryButton.addEventListener("change", fileEntryChanged, false);

  var testImage = document.getElementById("testImage");
  testImage.addEventListener("click", function() {
    showImage(1);
  }, false);

  var referenceImage = document.getElementById("referenceImage");
  referenceImage.addEventListener("click", function() {
    showImage(2);
  }, false);

  var differences = document.getElementById("differences");
  differences.addEventListener("click", function(e) {
    showDifferences(e.target);
  }, false);

  var magnifyElement = document.getElementById("magnify");
  magnifyElement.addEventListener("mousemove", function(e) {
    magnify(e);
  }, false);

  window.addEventListener('keydown', function keydown(event) {
    if (event.which === 84) {
      // 't' switch test/ref images
      var val = 0;
      if (document.querySelector('input[name="which"][value="0"]:checked')) {
        val = 1;
      }
      document.querySelector('input[name="which"][value="' + val + '"]').click();
    } else if (event.which === 68) {
      // 'd' toggle differences
      document.getElementById("differences").click();
    } else if (event.which === 78 || event.which === 80) {
      // 'n' next image, 'p' previous image
      var select = gSelected;
      if (gSelected === null) {
        select = 0;
      } else if (event.which === 78) {
        select++;
      } else {
        select--;
      }
      var length = gTestItems.length;
      select = select < 0 ? length - 1 : select >= length ? 0 : select;
      showImages(select);
    }
  });
}
