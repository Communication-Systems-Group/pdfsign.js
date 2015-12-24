/* Copyright 2015 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals global */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/shared/global', ['exports'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports);
  } else {
    factory((root.pdfjsSharedGlobal = {}));
  }
}(this, function (exports) {

  var globalScope = (typeof window !== 'undefined') ? window :
                    (typeof global !== 'undefined') ? global :
                    (typeof self !== 'undefined') ? self : this;

  var isWorker = (typeof window === 'undefined');

  // The global PDFJS object exposes the API
  // In production, it will be declared outside a global wrapper
  // In development, it will be declared here
  if (!globalScope.PDFJS) {
    globalScope.PDFJS = {};
  }

  globalScope.PDFJS.pdfBug = false;

  exports.globalScope = globalScope;
  exports.isWorker = isWorker;
  exports.PDFJS = globalScope.PDFJS;
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals MozBlobBuilder, URL */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/shared/util', ['exports', 'pdfjs/shared/global'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('./global.js'));
  } else {
    factory((root.pdfjsSharedUtil = {}), root.pdfjsSharedGlobal);
  }
}(this, function (exports, sharedGlobal) {

var PDFJS = sharedGlobal.PDFJS;
var globalScope = sharedGlobal.globalScope;

var FONT_IDENTITY_MATRIX = [0.001, 0, 0, 0.001, 0, 0];

var TextRenderingMode = {
  FILL: 0,
  STROKE: 1,
  FILL_STROKE: 2,
  INVISIBLE: 3,
  FILL_ADD_TO_PATH: 4,
  STROKE_ADD_TO_PATH: 5,
  FILL_STROKE_ADD_TO_PATH: 6,
  ADD_TO_PATH: 7,
  FILL_STROKE_MASK: 3,
  ADD_TO_PATH_FLAG: 4
};

var ImageKind = {
  GRAYSCALE_1BPP: 1,
  RGB_24BPP: 2,
  RGBA_32BPP: 3
};

var AnnotationType = {
  TEXT: 1,
  LINK: 2,
  FREETEXT: 3,
  LINE: 4,
  SQUARE: 5,
  CIRCLE: 6,
  POLYGON: 7,
  POLYLINE: 8,
  HIGHLIGHT: 9,
  UNDERLINE: 10,
  SQUIGGLY: 11,
  STRIKEOUT: 12,
  STAMP: 13,
  CARET: 14,
  INK: 15,
  POPUP: 16,
  FILEATTACHMENT: 17,
  SOUND: 18,
  MOVIE: 19,
  WIDGET: 20,
  SCREEN: 21,
  PRINTERMARK: 22,
  TRAPNET: 23,
  WATERMARK: 24,
  THREED: 25,
  REDACT: 26
};

var AnnotationFlag = {
  INVISIBLE: 0x01,
  HIDDEN: 0x02,
  PRINT: 0x04,
  NOZOOM: 0x08,
  NOROTATE: 0x10,
  NOVIEW: 0x20,
  READONLY: 0x40,
  LOCKED: 0x80,
  TOGGLENOVIEW: 0x100,
  LOCKEDCONTENTS: 0x200
};

var AnnotationBorderStyleType = {
  SOLID: 1,
  DASHED: 2,
  BEVELED: 3,
  INSET: 4,
  UNDERLINE: 5
};

var StreamType = {
  UNKNOWN: 0,
  FLATE: 1,
  LZW: 2,
  DCT: 3,
  JPX: 4,
  JBIG: 5,
  A85: 6,
  AHX: 7,
  CCF: 8,
  RL: 9
};

var FontType = {
  UNKNOWN: 0,
  TYPE1: 1,
  TYPE1C: 2,
  CIDFONTTYPE0: 3,
  CIDFONTTYPE0C: 4,
  TRUETYPE: 5,
  CIDFONTTYPE2: 6,
  TYPE3: 7,
  OPENTYPE: 8,
  TYPE0: 9,
  MMTYPE1: 10
};

PDFJS.VERBOSITY_LEVELS = {
  errors: 0,
  warnings: 1,
  infos: 5
};

// All the possible operations for an operator list.
var OPS = PDFJS.OPS = {
  // Intentionally start from 1 so it is easy to spot bad operators that will be
  // 0's.
  dependency: 1,
  setLineWidth: 2,
  setLineCap: 3,
  setLineJoin: 4,
  setMiterLimit: 5,
  setDash: 6,
  setRenderingIntent: 7,
  setFlatness: 8,
  setGState: 9,
  save: 10,
  restore: 11,
  transform: 12,
  moveTo: 13,
  lineTo: 14,
  curveTo: 15,
  curveTo2: 16,
  curveTo3: 17,
  closePath: 18,
  rectangle: 19,
  stroke: 20,
  closeStroke: 21,
  fill: 22,
  eoFill: 23,
  fillStroke: 24,
  eoFillStroke: 25,
  closeFillStroke: 26,
  closeEOFillStroke: 27,
  endPath: 28,
  clip: 29,
  eoClip: 30,
  beginText: 31,
  endText: 32,
  setCharSpacing: 33,
  setWordSpacing: 34,
  setHScale: 35,
  setLeading: 36,
  setFont: 37,
  setTextRenderingMode: 38,
  setTextRise: 39,
  moveText: 40,
  setLeadingMoveText: 41,
  setTextMatrix: 42,
  nextLine: 43,
  showText: 44,
  showSpacedText: 45,
  nextLineShowText: 46,
  nextLineSetSpacingShowText: 47,
  setCharWidth: 48,
  setCharWidthAndBounds: 49,
  setStrokeColorSpace: 50,
  setFillColorSpace: 51,
  setStrokeColor: 52,
  setStrokeColorN: 53,
  setFillColor: 54,
  setFillColorN: 55,
  setStrokeGray: 56,
  setFillGray: 57,
  setStrokeRGBColor: 58,
  setFillRGBColor: 59,
  setStrokeCMYKColor: 60,
  setFillCMYKColor: 61,
  shadingFill: 62,
  beginInlineImage: 63,
  beginImageData: 64,
  endInlineImage: 65,
  paintXObject: 66,
  markPoint: 67,
  markPointProps: 68,
  beginMarkedContent: 69,
  beginMarkedContentProps: 70,
  endMarkedContent: 71,
  beginCompat: 72,
  endCompat: 73,
  paintFormXObjectBegin: 74,
  paintFormXObjectEnd: 75,
  beginGroup: 76,
  endGroup: 77,
  beginAnnotations: 78,
  endAnnotations: 79,
  beginAnnotation: 80,
  endAnnotation: 81,
  paintJpegXObject: 82,
  paintImageMaskXObject: 83,
  paintImageMaskXObjectGroup: 84,
  paintImageXObject: 85,
  paintInlineImageXObject: 86,
  paintInlineImageXObjectGroup: 87,
  paintImageXObjectRepeat: 88,
  paintImageMaskXObjectRepeat: 89,
  paintSolidColorImageMask: 90,
  constructPath: 91
};

// A notice for devs. These are good for things that are helpful to devs, such
// as warning that Workers were disabled, which is important to devs but not
// end users.
function info(msg) {
  if (PDFJS.verbosity >= PDFJS.VERBOSITY_LEVELS.infos) {
    console.log('Info: ' + msg);
  }
}

// Non-fatal warnings.
function warn(msg) {
  if (PDFJS.verbosity >= PDFJS.VERBOSITY_LEVELS.warnings) {
    console.log('Warning: ' + msg);
  }
}

// Deprecated API function -- treated as warnings.
function deprecated(details) {
  warn('Deprecated API usage: ' + details);
}

// Fatal errors that should trigger the fallback UI and halt execution by
// throwing an exception.
function error(msg) {
  if (PDFJS.verbosity >= PDFJS.VERBOSITY_LEVELS.errors) {
    console.log('Error: ' + msg);
    console.log(backtrace());
  }
  throw new Error(msg);
}

function backtrace() {
  try {
    throw new Error();
  } catch (e) {
    return e.stack ? e.stack.split('\n').slice(2).join('\n') : '';
  }
}

function assert(cond, msg) {
  if (!cond) {
    error(msg);
  }
}

var UNSUPPORTED_FEATURES = PDFJS.UNSUPPORTED_FEATURES = {
  unknown: 'unknown',
  forms: 'forms',
  javaScript: 'javaScript',
  smask: 'smask',
  shadingPattern: 'shadingPattern',
  font: 'font'
};

// Combines two URLs. The baseUrl shall be absolute URL. If the url is an
// absolute URL, it will be returned as is.
function combineUrl(baseUrl, url) {
  if (!url) {
    return baseUrl;
  }
  if (/^[a-z][a-z0-9+\-.]*:/i.test(url)) {
    return url;
  }
  var i;
  if (url.charAt(0) === '/') {
    // absolute path
    i = baseUrl.indexOf('://');
    if (url.charAt(1) === '/') {
      ++i;
    } else {
      i = baseUrl.indexOf('/', i + 3);
    }
    return baseUrl.substring(0, i) + url;
  } else {
    // relative path
    var pathLength = baseUrl.length;
    i = baseUrl.lastIndexOf('#');
    pathLength = i >= 0 ? i : pathLength;
    i = baseUrl.lastIndexOf('?', pathLength);
    pathLength = i >= 0 ? i : pathLength;
    var prefixLength = baseUrl.lastIndexOf('/', pathLength);
    return baseUrl.substring(0, prefixLength + 1) + url;
  }
}

// Validates if URL is safe and allowed, e.g. to avoid XSS.
function isValidUrl(url, allowRelative) {
  if (!url) {
    return false;
  }
  // RFC 3986 (http://tools.ietf.org/html/rfc3986#section-3.1)
  // scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
  var protocol = /^[a-z][a-z0-9+\-.]*(?=:)/i.exec(url);
  if (!protocol) {
    return allowRelative;
  }
  protocol = protocol[0].toLowerCase();
  switch (protocol) {
    case 'http':
    case 'https':
    case 'ftp':
    case 'mailto':
    case 'tel':
      return true;
    default:
      return false;
  }
}
PDFJS.isValidUrl = isValidUrl;

function shadow(obj, prop, value) {
  Object.defineProperty(obj, prop, { value: value,
                                     enumerable: true,
                                     configurable: true,
                                     writable: false });
  return value;
}
PDFJS.shadow = shadow;

var LinkTarget = PDFJS.LinkTarget = {
  NONE: 0, // Default value.
  SELF: 1,
  BLANK: 2,
  PARENT: 3,
  TOP: 4,
};
var LinkTargetStringMap = [
  '',
  '_self',
  '_blank',
  '_parent',
  '_top'
];

function isExternalLinkTargetSet() {
//#if !MOZCENTRAL
  if (PDFJS.openExternalLinksInNewWindow) {
    deprecated('PDFJS.openExternalLinksInNewWindow, please use ' +
               '"PDFJS.externalLinkTarget = PDFJS.LinkTarget.BLANK" instead.');
    if (PDFJS.externalLinkTarget === LinkTarget.NONE) {
      PDFJS.externalLinkTarget = LinkTarget.BLANK;
    }
    // Reset the deprecated parameter, to suppress further warnings.
    PDFJS.openExternalLinksInNewWindow = false;
  }
//#endif
  switch (PDFJS.externalLinkTarget) {
    case LinkTarget.NONE:
      return false;
    case LinkTarget.SELF:
    case LinkTarget.BLANK:
    case LinkTarget.PARENT:
    case LinkTarget.TOP:
      return true;
  }
  warn('PDFJS.externalLinkTarget is invalid: ' + PDFJS.externalLinkTarget);
  // Reset the external link target, to suppress further warnings.
  PDFJS.externalLinkTarget = LinkTarget.NONE;
  return false;
}
PDFJS.isExternalLinkTargetSet = isExternalLinkTargetSet;

var PasswordResponses = PDFJS.PasswordResponses = {
  NEED_PASSWORD: 1,
  INCORRECT_PASSWORD: 2
};

var PasswordException = (function PasswordExceptionClosure() {
  function PasswordException(msg, code) {
    this.name = 'PasswordException';
    this.message = msg;
    this.code = code;
  }

  PasswordException.prototype = new Error();
  PasswordException.constructor = PasswordException;

  return PasswordException;
})();
PDFJS.PasswordException = PasswordException;

var UnknownErrorException = (function UnknownErrorExceptionClosure() {
  function UnknownErrorException(msg, details) {
    this.name = 'UnknownErrorException';
    this.message = msg;
    this.details = details;
  }

  UnknownErrorException.prototype = new Error();
  UnknownErrorException.constructor = UnknownErrorException;

  return UnknownErrorException;
})();
PDFJS.UnknownErrorException = UnknownErrorException;

var InvalidPDFException = (function InvalidPDFExceptionClosure() {
  function InvalidPDFException(msg) {
    this.name = 'InvalidPDFException';
    this.message = msg;
  }

  InvalidPDFException.prototype = new Error();
  InvalidPDFException.constructor = InvalidPDFException;

  return InvalidPDFException;
})();
PDFJS.InvalidPDFException = InvalidPDFException;

var MissingPDFException = (function MissingPDFExceptionClosure() {
  function MissingPDFException(msg) {
    this.name = 'MissingPDFException';
    this.message = msg;
  }

  MissingPDFException.prototype = new Error();
  MissingPDFException.constructor = MissingPDFException;

  return MissingPDFException;
})();
PDFJS.MissingPDFException = MissingPDFException;

var UnexpectedResponseException =
    (function UnexpectedResponseExceptionClosure() {
  function UnexpectedResponseException(msg, status) {
    this.name = 'UnexpectedResponseException';
    this.message = msg;
    this.status = status;
  }

  UnexpectedResponseException.prototype = new Error();
  UnexpectedResponseException.constructor = UnexpectedResponseException;

  return UnexpectedResponseException;
})();
PDFJS.UnexpectedResponseException = UnexpectedResponseException;

var NotImplementedException = (function NotImplementedExceptionClosure() {
  function NotImplementedException(msg) {
    this.message = msg;
  }

  NotImplementedException.prototype = new Error();
  NotImplementedException.prototype.name = 'NotImplementedException';
  NotImplementedException.constructor = NotImplementedException;

  return NotImplementedException;
})();

var MissingDataException = (function MissingDataExceptionClosure() {
  function MissingDataException(begin, end) {
    this.begin = begin;
    this.end = end;
    this.message = 'Missing data [' + begin + ', ' + end + ')';
  }

  MissingDataException.prototype = new Error();
  MissingDataException.prototype.name = 'MissingDataException';
  MissingDataException.constructor = MissingDataException;

  return MissingDataException;
})();

var XRefParseException = (function XRefParseExceptionClosure() {
  function XRefParseException(msg) {
    this.message = msg;
  }

  XRefParseException.prototype = new Error();
  XRefParseException.prototype.name = 'XRefParseException';
  XRefParseException.constructor = XRefParseException;

  return XRefParseException;
})();


function bytesToString(bytes) {
  assert(bytes !== null && typeof bytes === 'object' &&
         bytes.length !== undefined, 'Invalid argument for bytesToString');
  var length = bytes.length;
  var MAX_ARGUMENT_COUNT = 8192;
  if (length < MAX_ARGUMENT_COUNT) {
    return String.fromCharCode.apply(null, bytes);
  }
  var strBuf = [];
  for (var i = 0; i < length; i += MAX_ARGUMENT_COUNT) {
    var chunkEnd = Math.min(i + MAX_ARGUMENT_COUNT, length);
    var chunk = bytes.subarray(i, chunkEnd);
    strBuf.push(String.fromCharCode.apply(null, chunk));
  }
  return strBuf.join('');
}

function stringToBytes(str) {
  assert(typeof str === 'string', 'Invalid argument for stringToBytes');
  var length = str.length;
  var bytes = new Uint8Array(length);
  for (var i = 0; i < length; ++i) {
    bytes[i] = str.charCodeAt(i) & 0xFF;
  }
  return bytes;
}

function string32(value) {
  return String.fromCharCode((value >> 24) & 0xff, (value >> 16) & 0xff,
                             (value >> 8) & 0xff, value & 0xff);
}

function log2(x) {
  var n = 1, i = 0;
  while (x > n) {
    n <<= 1;
    i++;
  }
  return i;
}

function readInt8(data, start) {
  return (data[start] << 24) >> 24;
}

function readUint16(data, offset) {
  return (data[offset] << 8) | data[offset + 1];
}

function readUint32(data, offset) {
  return ((data[offset] << 24) | (data[offset + 1] << 16) |
         (data[offset + 2] << 8) | data[offset + 3]) >>> 0;
}

// Lazy test the endianness of the platform
// NOTE: This will be 'true' for simulated TypedArrays
function isLittleEndian() {
  var buffer8 = new Uint8Array(2);
  buffer8[0] = 1;
  var buffer16 = new Uint16Array(buffer8.buffer);
  return (buffer16[0] === 1);
}

Object.defineProperty(PDFJS, 'isLittleEndian', {
  configurable: true,
  get: function PDFJS_isLittleEndian() {
    return shadow(PDFJS, 'isLittleEndian', isLittleEndian());
  }
});

//#if !(FIREFOX || MOZCENTRAL || CHROME)
//// Lazy test if the userAgent support CanvasTypedArrays
function hasCanvasTypedArrays() {
  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  var ctx = canvas.getContext('2d');
  var imageData = ctx.createImageData(1, 1);
  return (typeof imageData.data.buffer !== 'undefined');
}

Object.defineProperty(PDFJS, 'hasCanvasTypedArrays', {
  configurable: true,
  get: function PDFJS_hasCanvasTypedArrays() {
    return shadow(PDFJS, 'hasCanvasTypedArrays', hasCanvasTypedArrays());
  }
});

var Uint32ArrayView = (function Uint32ArrayViewClosure() {

  function Uint32ArrayView(buffer, length) {
    this.buffer = buffer;
    this.byteLength = buffer.length;
    this.length = length === undefined ? (this.byteLength >> 2) : length;
    ensureUint32ArrayViewProps(this.length);
  }
  Uint32ArrayView.prototype = Object.create(null);

  var uint32ArrayViewSetters = 0;
  function createUint32ArrayProp(index) {
    return {
      get: function () {
        var buffer = this.buffer, offset = index << 2;
        return (buffer[offset] | (buffer[offset + 1] << 8) |
          (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24)) >>> 0;
      },
      set: function (value) {
        var buffer = this.buffer, offset = index << 2;
        buffer[offset] = value & 255;
        buffer[offset + 1] = (value >> 8) & 255;
        buffer[offset + 2] = (value >> 16) & 255;
        buffer[offset + 3] = (value >>> 24) & 255;
      }
    };
  }

  function ensureUint32ArrayViewProps(length) {
    while (uint32ArrayViewSetters < length) {
      Object.defineProperty(Uint32ArrayView.prototype,
        uint32ArrayViewSetters,
        createUint32ArrayProp(uint32ArrayViewSetters));
      uint32ArrayViewSetters++;
    }
  }

  return Uint32ArrayView;
})();

exports.Uint32ArrayView = Uint32ArrayView;
//#else
//PDFJS.hasCanvasTypedArrays = true;
//#endif

var IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0];

var Util = PDFJS.Util = (function UtilClosure() {
  function Util() {}

  var rgbBuf = ['rgb(', 0, ',', 0, ',', 0, ')'];

  // makeCssRgb() can be called thousands of times. Using |rgbBuf| avoids
  // creating many intermediate strings.
  Util.makeCssRgb = function Util_makeCssRgb(r, g, b) {
    rgbBuf[1] = r;
    rgbBuf[3] = g;
    rgbBuf[5] = b;
    return rgbBuf.join('');
  };

  // Concatenates two transformation matrices together and returns the result.
  Util.transform = function Util_transform(m1, m2) {
    return [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
  };

  // For 2d affine transforms
  Util.applyTransform = function Util_applyTransform(p, m) {
    var xt = p[0] * m[0] + p[1] * m[2] + m[4];
    var yt = p[0] * m[1] + p[1] * m[3] + m[5];
    return [xt, yt];
  };

  Util.applyInverseTransform = function Util_applyInverseTransform(p, m) {
    var d = m[0] * m[3] - m[1] * m[2];
    var xt = (p[0] * m[3] - p[1] * m[2] + m[2] * m[5] - m[4] * m[3]) / d;
    var yt = (-p[0] * m[1] + p[1] * m[0] + m[4] * m[1] - m[5] * m[0]) / d;
    return [xt, yt];
  };

  // Applies the transform to the rectangle and finds the minimum axially
  // aligned bounding box.
  Util.getAxialAlignedBoundingBox =
    function Util_getAxialAlignedBoundingBox(r, m) {

    var p1 = Util.applyTransform(r, m);
    var p2 = Util.applyTransform(r.slice(2, 4), m);
    var p3 = Util.applyTransform([r[0], r[3]], m);
    var p4 = Util.applyTransform([r[2], r[1]], m);
    return [
      Math.min(p1[0], p2[0], p3[0], p4[0]),
      Math.min(p1[1], p2[1], p3[1], p4[1]),
      Math.max(p1[0], p2[0], p3[0], p4[0]),
      Math.max(p1[1], p2[1], p3[1], p4[1])
    ];
  };

  Util.inverseTransform = function Util_inverseTransform(m) {
    var d = m[0] * m[3] - m[1] * m[2];
    return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d,
      (m[2] * m[5] - m[4] * m[3]) / d, (m[4] * m[1] - m[5] * m[0]) / d];
  };

  // Apply a generic 3d matrix M on a 3-vector v:
  //   | a b c |   | X |
  //   | d e f | x | Y |
  //   | g h i |   | Z |
  // M is assumed to be serialized as [a,b,c,d,e,f,g,h,i],
  // with v as [X,Y,Z]
  Util.apply3dTransform = function Util_apply3dTransform(m, v) {
    return [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
    ];
  };

  // This calculation uses Singular Value Decomposition.
  // The SVD can be represented with formula A = USV. We are interested in the
  // matrix S here because it represents the scale values.
  Util.singularValueDecompose2dScale =
    function Util_singularValueDecompose2dScale(m) {

    var transpose = [m[0], m[2], m[1], m[3]];

    // Multiply matrix m with its transpose.
    var a = m[0] * transpose[0] + m[1] * transpose[2];
    var b = m[0] * transpose[1] + m[1] * transpose[3];
    var c = m[2] * transpose[0] + m[3] * transpose[2];
    var d = m[2] * transpose[1] + m[3] * transpose[3];

    // Solve the second degree polynomial to get roots.
    var first = (a + d) / 2;
    var second = Math.sqrt((a + d) * (a + d) - 4 * (a * d - c * b)) / 2;
    var sx = first + second || 1;
    var sy = first - second || 1;

    // Scale values are the square roots of the eigenvalues.
    return [Math.sqrt(sx), Math.sqrt(sy)];
  };

  // Normalize rectangle rect=[x1, y1, x2, y2] so that (x1,y1) < (x2,y2)
  // For coordinate systems whose origin lies in the bottom-left, this
  // means normalization to (BL,TR) ordering. For systems with origin in the
  // top-left, this means (TL,BR) ordering.
  Util.normalizeRect = function Util_normalizeRect(rect) {
    var r = rect.slice(0); // clone rect
    if (rect[0] > rect[2]) {
      r[0] = rect[2];
      r[2] = rect[0];
    }
    if (rect[1] > rect[3]) {
      r[1] = rect[3];
      r[3] = rect[1];
    }
    return r;
  };

  // Returns a rectangle [x1, y1, x2, y2] corresponding to the
  // intersection of rect1 and rect2. If no intersection, returns 'false'
  // The rectangle coordinates of rect1, rect2 should be [x1, y1, x2, y2]
  Util.intersect = function Util_intersect(rect1, rect2) {
    function compare(a, b) {
      return a - b;
    }

    // Order points along the axes
    var orderedX = [rect1[0], rect1[2], rect2[0], rect2[2]].sort(compare),
        orderedY = [rect1[1], rect1[3], rect2[1], rect2[3]].sort(compare),
        result = [];

    rect1 = Util.normalizeRect(rect1);
    rect2 = Util.normalizeRect(rect2);

    // X: first and second points belong to different rectangles?
    if ((orderedX[0] === rect1[0] && orderedX[1] === rect2[0]) ||
        (orderedX[0] === rect2[0] && orderedX[1] === rect1[0])) {
      // Intersection must be between second and third points
      result[0] = orderedX[1];
      result[2] = orderedX[2];
    } else {
      return false;
    }

    // Y: first and second points belong to different rectangles?
    if ((orderedY[0] === rect1[1] && orderedY[1] === rect2[1]) ||
        (orderedY[0] === rect2[1] && orderedY[1] === rect1[1])) {
      // Intersection must be between second and third points
      result[1] = orderedY[1];
      result[3] = orderedY[2];
    } else {
      return false;
    }

    return result;
  };

  Util.sign = function Util_sign(num) {
    return num < 0 ? -1 : 1;
  };

  Util.appendToArray = function Util_appendToArray(arr1, arr2) {
    Array.prototype.push.apply(arr1, arr2);
  };

  Util.prependToArray = function Util_prependToArray(arr1, arr2) {
    Array.prototype.unshift.apply(arr1, arr2);
  };

  Util.extendObj = function extendObj(obj1, obj2) {
    for (var key in obj2) {
      obj1[key] = obj2[key];
    }
  };

  Util.getInheritableProperty = function Util_getInheritableProperty(dict,
                                                                     name) {
    while (dict && !dict.has(name)) {
      dict = dict.get('Parent');
    }
    if (!dict) {
      return null;
    }
    return dict.get(name);
  };

  Util.inherit = function Util_inherit(sub, base, prototype) {
    sub.prototype = Object.create(base.prototype);
    sub.prototype.constructor = sub;
    for (var prop in prototype) {
      sub.prototype[prop] = prototype[prop];
    }
  };

  Util.loadScript = function Util_loadScript(src, callback) {
    var script = document.createElement('script');
    var loaded = false;
    script.setAttribute('src', src);
    if (callback) {
      script.onload = function() {
        if (!loaded) {
          callback();
        }
        loaded = true;
      };
    }
    document.getElementsByTagName('head')[0].appendChild(script);
  };

  return Util;
})();

/**
 * PDF page viewport created based on scale, rotation and offset.
 * @class
 * @alias PDFJS.PageViewport
 */
var PageViewport = PDFJS.PageViewport = (function PageViewportClosure() {
  /**
   * @constructor
   * @private
   * @param viewBox {Array} xMin, yMin, xMax and yMax coordinates.
   * @param scale {number} scale of the viewport.
   * @param rotation {number} rotations of the viewport in degrees.
   * @param offsetX {number} offset X
   * @param offsetY {number} offset Y
   * @param dontFlip {boolean} if true, axis Y will not be flipped.
   */
  function PageViewport(viewBox, scale, rotation, offsetX, offsetY, dontFlip) {
    this.viewBox = viewBox;
    this.scale = scale;
    this.rotation = rotation;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    // creating transform to convert pdf coordinate system to the normal
    // canvas like coordinates taking in account scale and rotation
    var centerX = (viewBox[2] + viewBox[0]) / 2;
    var centerY = (viewBox[3] + viewBox[1]) / 2;
    var rotateA, rotateB, rotateC, rotateD;
    rotation = rotation % 360;
    rotation = rotation < 0 ? rotation + 360 : rotation;
    switch (rotation) {
      case 180:
        rotateA = -1; rotateB = 0; rotateC = 0; rotateD = 1;
        break;
      case 90:
        rotateA = 0; rotateB = 1; rotateC = 1; rotateD = 0;
        break;
      case 270:
        rotateA = 0; rotateB = -1; rotateC = -1; rotateD = 0;
        break;
      //case 0:
      default:
        rotateA = 1; rotateB = 0; rotateC = 0; rotateD = -1;
        break;
    }

    if (dontFlip) {
      rotateC = -rotateC; rotateD = -rotateD;
    }

    var offsetCanvasX, offsetCanvasY;
    var width, height;
    if (rotateA === 0) {
      offsetCanvasX = Math.abs(centerY - viewBox[1]) * scale + offsetX;
      offsetCanvasY = Math.abs(centerX - viewBox[0]) * scale + offsetY;
      width = Math.abs(viewBox[3] - viewBox[1]) * scale;
      height = Math.abs(viewBox[2] - viewBox[0]) * scale;
    } else {
      offsetCanvasX = Math.abs(centerX - viewBox[0]) * scale + offsetX;
      offsetCanvasY = Math.abs(centerY - viewBox[1]) * scale + offsetY;
      width = Math.abs(viewBox[2] - viewBox[0]) * scale;
      height = Math.abs(viewBox[3] - viewBox[1]) * scale;
    }
    // creating transform for the following operations:
    // translate(-centerX, -centerY), rotate and flip vertically,
    // scale, and translate(offsetCanvasX, offsetCanvasY)
    this.transform = [
      rotateA * scale,
      rotateB * scale,
      rotateC * scale,
      rotateD * scale,
      offsetCanvasX - rotateA * scale * centerX - rotateC * scale * centerY,
      offsetCanvasY - rotateB * scale * centerX - rotateD * scale * centerY
    ];

    this.width = width;
    this.height = height;
    this.fontScale = scale;
  }
  PageViewport.prototype = /** @lends PDFJS.PageViewport.prototype */ {
    /**
     * Clones viewport with additional properties.
     * @param args {Object} (optional) If specified, may contain the 'scale' or
     * 'rotation' properties to override the corresponding properties in
     * the cloned viewport.
     * @returns {PDFJS.PageViewport} Cloned viewport.
     */
    clone: function PageViewPort_clone(args) {
      args = args || {};
      var scale = 'scale' in args ? args.scale : this.scale;
      var rotation = 'rotation' in args ? args.rotation : this.rotation;
      return new PageViewport(this.viewBox.slice(), scale, rotation,
                              this.offsetX, this.offsetY, args.dontFlip);
    },
    /**
     * Converts PDF point to the viewport coordinates. For examples, useful for
     * converting PDF location into canvas pixel coordinates.
     * @param x {number} X coordinate.
     * @param y {number} Y coordinate.
     * @returns {Object} Object that contains 'x' and 'y' properties of the
     * point in the viewport coordinate space.
     * @see {@link convertToPdfPoint}
     * @see {@link convertToViewportRectangle}
     */
    convertToViewportPoint: function PageViewport_convertToViewportPoint(x, y) {
      return Util.applyTransform([x, y], this.transform);
    },
    /**
     * Converts PDF rectangle to the viewport coordinates.
     * @param rect {Array} xMin, yMin, xMax and yMax coordinates.
     * @returns {Array} Contains corresponding coordinates of the rectangle
     * in the viewport coordinate space.
     * @see {@link convertToViewportPoint}
     */
    convertToViewportRectangle:
      function PageViewport_convertToViewportRectangle(rect) {
      var tl = Util.applyTransform([rect[0], rect[1]], this.transform);
      var br = Util.applyTransform([rect[2], rect[3]], this.transform);
      return [tl[0], tl[1], br[0], br[1]];
    },
    /**
     * Converts viewport coordinates to the PDF location. For examples, useful
     * for converting canvas pixel location into PDF one.
     * @param x {number} X coordinate.
     * @param y {number} Y coordinate.
     * @returns {Object} Object that contains 'x' and 'y' properties of the
     * point in the PDF coordinate space.
     * @see {@link convertToViewportPoint}
     */
    convertToPdfPoint: function PageViewport_convertToPdfPoint(x, y) {
      return Util.applyInverseTransform([x, y], this.transform);
    }
  };
  return PageViewport;
})();

var PDFStringTranslateTable = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0x2D8, 0x2C7, 0x2C6, 0x2D9, 0x2DD, 0x2DB, 0x2DA, 0x2DC, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x2022, 0x2020, 0x2021, 0x2026, 0x2014,
  0x2013, 0x192, 0x2044, 0x2039, 0x203A, 0x2212, 0x2030, 0x201E, 0x201C,
  0x201D, 0x2018, 0x2019, 0x201A, 0x2122, 0xFB01, 0xFB02, 0x141, 0x152, 0x160,
  0x178, 0x17D, 0x131, 0x142, 0x153, 0x161, 0x17E, 0, 0x20AC
];

function stringToPDFString(str) {
  var i, n = str.length, strBuf = [];
  if (str[0] === '\xFE' && str[1] === '\xFF') {
    // UTF16BE BOM
    for (i = 2; i < n; i += 2) {
      strBuf.push(String.fromCharCode(
        (str.charCodeAt(i) << 8) | str.charCodeAt(i + 1)));
    }
  } else {
    for (i = 0; i < n; ++i) {
      var code = PDFStringTranslateTable[str.charCodeAt(i)];
      strBuf.push(code ? String.fromCharCode(code) : str.charAt(i));
    }
  }
  return strBuf.join('');
}

function stringToUTF8String(str) {
  return decodeURIComponent(escape(str));
}

function utf8StringToString(str) {
  return unescape(encodeURIComponent(str));
}

function isEmptyObj(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
}

function isBool(v) {
  return typeof v === 'boolean';
}

function isInt(v) {
  return typeof v === 'number' && ((v | 0) === v);
}

function isNum(v) {
  return typeof v === 'number';
}

function isString(v) {
  return typeof v === 'string';
}

function isArray(v) {
  return v instanceof Array;
}

function isArrayBuffer(v) {
  return typeof v === 'object' && v !== null && v.byteLength !== undefined;
}

/**
 * Promise Capability object.
 *
 * @typedef {Object} PromiseCapability
 * @property {Promise} promise - A promise object.
 * @property {function} resolve - Fullfills the promise.
 * @property {function} reject - Rejects the promise.
 */

/**
 * Creates a promise capability object.
 * @alias PDFJS.createPromiseCapability
 *
 * @return {PromiseCapability} A capability object contains:
 * - a Promise, resolve and reject methods.
 */
function createPromiseCapability() {
  var capability = {};
  capability.promise = new Promise(function (resolve, reject) {
    capability.resolve = resolve;
    capability.reject = reject;
  });
  return capability;
}

PDFJS.createPromiseCapability = createPromiseCapability;

/**
 * Polyfill for Promises:
 * The following promise implementation tries to generally implement the
 * Promise/A+ spec. Some notable differences from other promise libaries are:
 * - There currently isn't a seperate deferred and promise object.
 * - Unhandled rejections eventually show an error if they aren't handled.
 *
 * Based off of the work in:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=810490
 */
(function PromiseClosure() {
  if (globalScope.Promise) {
    // Promises existing in the DOM/Worker, checking presence of all/resolve
    if (typeof globalScope.Promise.all !== 'function') {
      globalScope.Promise.all = function (iterable) {
        var count = 0, results = [], resolve, reject;
        var promise = new globalScope.Promise(function (resolve_, reject_) {
          resolve = resolve_;
          reject = reject_;
        });
        iterable.forEach(function (p, i) {
          count++;
          p.then(function (result) {
            results[i] = result;
            count--;
            if (count === 0) {
              resolve(results);
            }
          }, reject);
        });
        if (count === 0) {
          resolve(results);
        }
        return promise;
      };
    }
    if (typeof globalScope.Promise.resolve !== 'function') {
      globalScope.Promise.resolve = function (value) {
        return new globalScope.Promise(function (resolve) { resolve(value); });
      };
    }
    if (typeof globalScope.Promise.reject !== 'function') {
      globalScope.Promise.reject = function (reason) {
        return new globalScope.Promise(function (resolve, reject) {
          reject(reason);
        });
      };
    }
    if (typeof globalScope.Promise.prototype.catch !== 'function') {
      globalScope.Promise.prototype.catch = function (onReject) {
        return globalScope.Promise.prototype.then(undefined, onReject);
      };
    }
    return;
  }
//#if !MOZCENTRAL
  var STATUS_PENDING = 0;
  var STATUS_RESOLVED = 1;
  var STATUS_REJECTED = 2;

  // In an attempt to avoid silent exceptions, unhandled rejections are
  // tracked and if they aren't handled in a certain amount of time an
  // error is logged.
  var REJECTION_TIMEOUT = 500;

  var HandlerManager = {
    handlers: [],
    running: false,
    unhandledRejections: [],
    pendingRejectionCheck: false,

    scheduleHandlers: function scheduleHandlers(promise) {
      if (promise._status === STATUS_PENDING) {
        return;
      }

      this.handlers = this.handlers.concat(promise._handlers);
      promise._handlers = [];

      if (this.running) {
        return;
      }
      this.running = true;

      setTimeout(this.runHandlers.bind(this), 0);
    },

    runHandlers: function runHandlers() {
      var RUN_TIMEOUT = 1; // ms
      var timeoutAt = Date.now() + RUN_TIMEOUT;
      while (this.handlers.length > 0) {
        var handler = this.handlers.shift();

        var nextStatus = handler.thisPromise._status;
        var nextValue = handler.thisPromise._value;

        try {
          if (nextStatus === STATUS_RESOLVED) {
            if (typeof handler.onResolve === 'function') {
              nextValue = handler.onResolve(nextValue);
            }
          } else if (typeof handler.onReject === 'function') {
              nextValue = handler.onReject(nextValue);
              nextStatus = STATUS_RESOLVED;

              if (handler.thisPromise._unhandledRejection) {
                this.removeUnhandeledRejection(handler.thisPromise);
              }
          }
        } catch (ex) {
          nextStatus = STATUS_REJECTED;
          nextValue = ex;
        }

        handler.nextPromise._updateStatus(nextStatus, nextValue);
        if (Date.now() >= timeoutAt) {
          break;
        }
      }

      if (this.handlers.length > 0) {
        setTimeout(this.runHandlers.bind(this), 0);
        return;
      }

      this.running = false;
    },

    addUnhandledRejection: function addUnhandledRejection(promise) {
      this.unhandledRejections.push({
        promise: promise,
        time: Date.now()
      });
      this.scheduleRejectionCheck();
    },

    removeUnhandeledRejection: function removeUnhandeledRejection(promise) {
      promise._unhandledRejection = false;
      for (var i = 0; i < this.unhandledRejections.length; i++) {
        if (this.unhandledRejections[i].promise === promise) {
          this.unhandledRejections.splice(i);
          i--;
        }
      }
    },

    scheduleRejectionCheck: function scheduleRejectionCheck() {
      if (this.pendingRejectionCheck) {
        return;
      }
      this.pendingRejectionCheck = true;
      setTimeout(function rejectionCheck() {
        this.pendingRejectionCheck = false;
        var now = Date.now();
        for (var i = 0; i < this.unhandledRejections.length; i++) {
          if (now - this.unhandledRejections[i].time > REJECTION_TIMEOUT) {
            var unhandled = this.unhandledRejections[i].promise._value;
            var msg = 'Unhandled rejection: ' + unhandled;
            if (unhandled.stack) {
              msg += '\n' + unhandled.stack;
            }
            warn(msg);
            this.unhandledRejections.splice(i);
            i--;
          }
        }
        if (this.unhandledRejections.length) {
          this.scheduleRejectionCheck();
        }
      }.bind(this), REJECTION_TIMEOUT);
    }
  };

  function Promise(resolver) {
    this._status = STATUS_PENDING;
    this._handlers = [];
    try {
      resolver.call(this, this._resolve.bind(this), this._reject.bind(this));
    } catch (e) {
      this._reject(e);
    }
  }
  /**
   * Builds a promise that is resolved when all the passed in promises are
   * resolved.
   * @param {array} array of data and/or promises to wait for.
   * @return {Promise} New dependant promise.
   */
  Promise.all = function Promise_all(promises) {
    var resolveAll, rejectAll;
    var deferred = new Promise(function (resolve, reject) {
      resolveAll = resolve;
      rejectAll = reject;
    });
    var unresolved = promises.length;
    var results = [];
    if (unresolved === 0) {
      resolveAll(results);
      return deferred;
    }
    function reject(reason) {
      if (deferred._status === STATUS_REJECTED) {
        return;
      }
      results = [];
      rejectAll(reason);
    }
    for (var i = 0, ii = promises.length; i < ii; ++i) {
      var promise = promises[i];
      var resolve = (function(i) {
        return function(value) {
          if (deferred._status === STATUS_REJECTED) {
            return;
          }
          results[i] = value;
          unresolved--;
          if (unresolved === 0) {
            resolveAll(results);
          }
        };
      })(i);
      if (Promise.isPromise(promise)) {
        promise.then(resolve, reject);
      } else {
        resolve(promise);
      }
    }
    return deferred;
  };

  /**
   * Checks if the value is likely a promise (has a 'then' function).
   * @return {boolean} true if value is thenable
   */
  Promise.isPromise = function Promise_isPromise(value) {
    return value && typeof value.then === 'function';
  };

  /**
   * Creates resolved promise
   * @param value resolve value
   * @returns {Promise}
   */
  Promise.resolve = function Promise_resolve(value) {
    return new Promise(function (resolve) { resolve(value); });
  };

  /**
   * Creates rejected promise
   * @param reason rejection value
   * @returns {Promise}
   */
  Promise.reject = function Promise_reject(reason) {
    return new Promise(function (resolve, reject) { reject(reason); });
  };

  Promise.prototype = {
    _status: null,
    _value: null,
    _handlers: null,
    _unhandledRejection: null,

    _updateStatus: function Promise__updateStatus(status, value) {
      if (this._status === STATUS_RESOLVED ||
          this._status === STATUS_REJECTED) {
        return;
      }

      if (status === STATUS_RESOLVED &&
          Promise.isPromise(value)) {
        value.then(this._updateStatus.bind(this, STATUS_RESOLVED),
                   this._updateStatus.bind(this, STATUS_REJECTED));
        return;
      }

      this._status = status;
      this._value = value;

      if (status === STATUS_REJECTED && this._handlers.length === 0) {
        this._unhandledRejection = true;
        HandlerManager.addUnhandledRejection(this);
      }

      HandlerManager.scheduleHandlers(this);
    },

    _resolve: function Promise_resolve(value) {
      this._updateStatus(STATUS_RESOLVED, value);
    },

    _reject: function Promise_reject(reason) {
      this._updateStatus(STATUS_REJECTED, reason);
    },

    then: function Promise_then(onResolve, onReject) {
      var nextPromise = new Promise(function (resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
      });
      this._handlers.push({
        thisPromise: this,
        onResolve: onResolve,
        onReject: onReject,
        nextPromise: nextPromise
      });
      HandlerManager.scheduleHandlers(this);
      return nextPromise;
    },

    catch: function Promise_catch(onReject) {
      return this.then(undefined, onReject);
    }
  };

  globalScope.Promise = Promise;
//#else
//throw new Error('DOM Promise is not present');
//#endif
})();

var StatTimer = (function StatTimerClosure() {
  function rpad(str, pad, length) {
    while (str.length < length) {
      str += pad;
    }
    return str;
  }
  function StatTimer() {
    this.started = {};
    this.times = [];
    this.enabled = true;
  }
  StatTimer.prototype = {
    time: function StatTimer_time(name) {
      if (!this.enabled) {
        return;
      }
      if (name in this.started) {
        warn('Timer is already running for ' + name);
      }
      this.started[name] = Date.now();
    },
    timeEnd: function StatTimer_timeEnd(name) {
      if (!this.enabled) {
        return;
      }
      if (!(name in this.started)) {
        warn('Timer has not been started for ' + name);
      }
      this.times.push({
        'name': name,
        'start': this.started[name],
        'end': Date.now()
      });
      // Remove timer from started so it can be called again.
      delete this.started[name];
    },
    toString: function StatTimer_toString() {
      var i, ii;
      var times = this.times;
      var out = '';
      // Find the longest name for padding purposes.
      var longest = 0;
      for (i = 0, ii = times.length; i < ii; ++i) {
        var name = times[i]['name'];
        if (name.length > longest) {
          longest = name.length;
        }
      }
      for (i = 0, ii = times.length; i < ii; ++i) {
        var span = times[i];
        var duration = span.end - span.start;
        out += rpad(span['name'], ' ', longest) + ' ' + duration + 'ms\n';
      }
      return out;
    }
  };
  return StatTimer;
})();

PDFJS.createBlob = function createBlob(data, contentType) {
  if (typeof Blob !== 'undefined') {
    return new Blob([data], { type: contentType });
  }
  // Blob builder is deprecated in FF14 and removed in FF18.
  var bb = new MozBlobBuilder();
  bb.append(data);
  return bb.getBlob(contentType);
};

PDFJS.createObjectURL = (function createObjectURLClosure() {
  // Blob/createObjectURL is not available, falling back to data schema.
  var digits =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  return function createObjectURL(data, contentType) {
    if (!PDFJS.disableCreateObjectURL &&
        typeof URL !== 'undefined' && URL.createObjectURL) {
      var blob = PDFJS.createBlob(data, contentType);
      return URL.createObjectURL(blob);
    }

    var buffer = 'data:' + contentType + ';base64,';
    for (var i = 0, ii = data.length; i < ii; i += 3) {
      var b1 = data[i] & 0xFF;
      var b2 = data[i + 1] & 0xFF;
      var b3 = data[i + 2] & 0xFF;
      var d1 = b1 >> 2, d2 = ((b1 & 3) << 4) | (b2 >> 4);
      var d3 = i + 1 < ii ? ((b2 & 0xF) << 2) | (b3 >> 6) : 64;
      var d4 = i + 2 < ii ? (b3 & 0x3F) : 64;
      buffer += digits[d1] + digits[d2] + digits[d3] + digits[d4];
    }
    return buffer;
  };
})();

function MessageHandler(sourceName, targetName, comObj) {
  this.sourceName = sourceName;
  this.targetName = targetName;
  this.comObj = comObj;
  this.callbackIndex = 1;
  this.postMessageTransfers = true;
  var callbacksCapabilities = this.callbacksCapabilities = {};
  var ah = this.actionHandler = {};

  this._onComObjOnMessage = function messageHandlerComObjOnMessage(event) {
    var data = event.data;
    if (data.targetName !== this.sourceName) {
      return;
    }
    if (data.isReply) {
      var callbackId = data.callbackId;
      if (data.callbackId in callbacksCapabilities) {
        var callback = callbacksCapabilities[callbackId];
        delete callbacksCapabilities[callbackId];
        if ('error' in data) {
          callback.reject(data.error);
        } else {
          callback.resolve(data.data);
        }
      } else {
        error('Cannot resolve callback ' + callbackId);
      }
    } else if (data.action in ah) {
      var action = ah[data.action];
      if (data.callbackId) {
        var sourceName = this.sourceName;
        var targetName = data.sourceName;
        Promise.resolve().then(function () {
          return action[0].call(action[1], data.data);
        }).then(function (result) {
          comObj.postMessage({
            sourceName: sourceName,
            targetName: targetName,
            isReply: true,
            callbackId: data.callbackId,
            data: result
          });
        }, function (reason) {
          if (reason instanceof Error) {
            // Serialize error to avoid "DataCloneError"
            reason = reason + '';
          }
          comObj.postMessage({
            sourceName: sourceName,
            targetName: targetName,
            isReply: true,
            callbackId: data.callbackId,
            error: reason
          });
        });
      } else {
        action[0].call(action[1], data.data);
      }
    } else {
      error('Unknown action from worker: ' + data.action);
    }
  }.bind(this);
  comObj.addEventListener('message', this._onComObjOnMessage);
}

MessageHandler.prototype = {
  on: function messageHandlerOn(actionName, handler, scope) {
    var ah = this.actionHandler;
    if (ah[actionName]) {
      error('There is already an actionName called "' + actionName + '"');
    }
    ah[actionName] = [handler, scope];
  },
  /**
   * Sends a message to the comObj to invoke the action with the supplied data.
   * @param {String} actionName Action to call.
   * @param {JSON} data JSON data to send.
   * @param {Array} [transfers] Optional list of transfers/ArrayBuffers
   */
  send: function messageHandlerSend(actionName, data, transfers) {
    var message = {
      sourceName: this.sourceName,
      targetName: this.targetName,
      action: actionName,
      data: data
    };
    this.postMessage(message, transfers);
  },
  /**
   * Sends a message to the comObj to invoke the action with the supplied data.
   * Expects that other side will callback with the response.
   * @param {String} actionName Action to call.
   * @param {JSON} data JSON data to send.
   * @param {Array} [transfers] Optional list of transfers/ArrayBuffers.
   * @returns {Promise} Promise to be resolved with response data.
   */
  sendWithPromise:
    function messageHandlerSendWithPromise(actionName, data, transfers) {
    var callbackId = this.callbackIndex++;
    var message = {
      sourceName: this.sourceName,
      targetName: this.targetName,
      action: actionName,
      data: data,
      callbackId: callbackId
    };
    var capability = createPromiseCapability();
    this.callbacksCapabilities[callbackId] = capability;
    try {
      this.postMessage(message, transfers);
    } catch (e) {
      capability.reject(e);
    }
    return capability.promise;
  },
  /**
   * Sends raw message to the comObj.
   * @private
   * @param message {Object} Raw message.
   * @param transfers List of transfers/ArrayBuffers, or undefined.
   */
  postMessage: function (message, transfers) {
    if (transfers && this.postMessageTransfers) {
      this.comObj.postMessage(message, transfers);
    } else {
      this.comObj.postMessage(message);
    }
  },

  destroy: function () {
    this.comObj.removeEventListener('message', this._onComObjOnMessage);
  }
};

function loadJpegStream(id, imageUrl, objs) {
  var img = new Image();
  img.onload = (function loadJpegStream_onloadClosure() {
    objs.resolve(id, img);
  });
  img.onerror = (function loadJpegStream_onerrorClosure() {
    objs.resolve(id, null);
    warn('Error during JPEG image loading');
  });
  img.src = imageUrl;
}

exports.FONT_IDENTITY_MATRIX = FONT_IDENTITY_MATRIX;
exports.IDENTITY_MATRIX = IDENTITY_MATRIX;
exports.OPS = OPS;
exports.UNSUPPORTED_FEATURES = UNSUPPORTED_FEATURES;
exports.AnnotationBorderStyleType = AnnotationBorderStyleType;
exports.AnnotationFlag = AnnotationFlag;
exports.AnnotationType = AnnotationType;
exports.FontType = FontType;
exports.ImageKind = ImageKind;
exports.InvalidPDFException = InvalidPDFException;
exports.LinkTarget = LinkTarget;
exports.LinkTargetStringMap = LinkTargetStringMap;
exports.MessageHandler = MessageHandler;
exports.MissingDataException = MissingDataException;
exports.MissingPDFException = MissingPDFException;
exports.NotImplementedException = NotImplementedException;
exports.PasswordException = PasswordException;
exports.PasswordResponses = PasswordResponses;
exports.StatTimer = StatTimer;
exports.StreamType = StreamType;
exports.TextRenderingMode = TextRenderingMode;
exports.UnexpectedResponseException = UnexpectedResponseException;
exports.UnknownErrorException = UnknownErrorException;
exports.Util = Util;
exports.XRefParseException = XRefParseException;
exports.assert = assert;
exports.bytesToString = bytesToString;
exports.combineUrl = combineUrl;
exports.createPromiseCapability = createPromiseCapability;
exports.deprecated = deprecated;
exports.error = error;
exports.info = info;
exports.isArray = isArray;
exports.isArrayBuffer = isArrayBuffer;
exports.isBool = isBool;
exports.isEmptyObj = isEmptyObj;
exports.isExternalLinkTargetSet = isExternalLinkTargetSet;
exports.isInt = isInt;
exports.isNum = isNum;
exports.isString = isString;
exports.isValidUrl = isValidUrl;
exports.loadJpegStream = loadJpegStream;
exports.log2 = log2;
exports.readInt8 = readInt8;
exports.readUint16 = readUint16;
exports.readUint32 = readUint32;
exports.shadow = shadow;
exports.string32 = string32;
exports.stringToBytes = stringToBytes;
exports.stringToPDFString = stringToPDFString;
exports.stringToUTF8String = stringToUTF8String;
exports.utf8StringToString = utf8StringToString;
exports.warn = warn;
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals NetworkManager */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/core/chunked_stream', ['exports', 'pdfjs/shared/util'],
      factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('../shared/util.js'));
  } else {
    factory((root.pdfjsCoreChunkedStream = {}), root.pdfjsSharedUtil);
  }
}(this, function (exports, sharedUtil) {

var MissingDataException = sharedUtil.MissingDataException;
var assert = sharedUtil.assert;
var createPromiseCapability = sharedUtil.createPromiseCapability;
var isInt = sharedUtil.isInt;
var isEmptyObj = sharedUtil.isEmptyObj;

var ChunkedStream = (function ChunkedStreamClosure() {
  function ChunkedStream(length, chunkSize, manager) {
    this.bytes = new Uint8Array(length);
    this.start = 0;
    this.pos = 0;
    this.end = length;
    this.chunkSize = chunkSize;
    this.loadedChunks = [];
    this.numChunksLoaded = 0;
    this.numChunks = Math.ceil(length / chunkSize);
    this.manager = manager;
    this.progressiveDataLength = 0;
    this.lastSuccessfulEnsureByteChunk = -1;  // a single-entry cache
  }

  // required methods for a stream. if a particular stream does not
  // implement these, an error should be thrown
  ChunkedStream.prototype = {

    getMissingChunks: function ChunkedStream_getMissingChunks() {
      var chunks = [];
      for (var chunk = 0, n = this.numChunks; chunk < n; ++chunk) {
        if (!this.loadedChunks[chunk]) {
          chunks.push(chunk);
        }
      }
      return chunks;
    },

    getBaseStreams: function ChunkedStream_getBaseStreams() {
      return [this];
    },

    allChunksLoaded: function ChunkedStream_allChunksLoaded() {
      return this.numChunksLoaded === this.numChunks;
    },

    onReceiveData: function ChunkedStream_onReceiveData(begin, chunk) {
      var end = begin + chunk.byteLength;

      assert(begin % this.chunkSize === 0, 'Bad begin offset: ' + begin);
      // Using this.length is inaccurate here since this.start can be moved
      // See ChunkedStream.moveStart()
      var length = this.bytes.length;
      assert(end % this.chunkSize === 0 || end === length,
             'Bad end offset: ' + end);

      this.bytes.set(new Uint8Array(chunk), begin);
      var chunkSize = this.chunkSize;
      var beginChunk = Math.floor(begin / chunkSize);
      var endChunk = Math.floor((end - 1) / chunkSize) + 1;
      var curChunk;

      for (curChunk = beginChunk; curChunk < endChunk; ++curChunk) {
        if (!this.loadedChunks[curChunk]) {
          this.loadedChunks[curChunk] = true;
          ++this.numChunksLoaded;
        }
      }
    },

    onReceiveProgressiveData:
        function ChunkedStream_onReceiveProgressiveData(data) {
      var position = this.progressiveDataLength;
      var beginChunk = Math.floor(position / this.chunkSize);

      this.bytes.set(new Uint8Array(data), position);
      position += data.byteLength;
      this.progressiveDataLength = position;
      var endChunk = position >= this.end ? this.numChunks :
                     Math.floor(position / this.chunkSize);
      var curChunk;
      for (curChunk = beginChunk; curChunk < endChunk; ++curChunk) {
        if (!this.loadedChunks[curChunk]) {
          this.loadedChunks[curChunk] = true;
          ++this.numChunksLoaded;
        }
      }
    },

    ensureByte: function ChunkedStream_ensureByte(pos) {
      var chunk = Math.floor(pos / this.chunkSize);
      if (chunk === this.lastSuccessfulEnsureByteChunk) {
        return;
      }

      if (!this.loadedChunks[chunk]) {
        throw new MissingDataException(pos, pos + 1);
      }
      this.lastSuccessfulEnsureByteChunk = chunk;
    },

    ensureRange: function ChunkedStream_ensureRange(begin, end) {
      if (begin >= end) {
        return;
      }

      if (end <= this.progressiveDataLength) {
        return;
      }

      var chunkSize = this.chunkSize;
      var beginChunk = Math.floor(begin / chunkSize);
      var endChunk = Math.floor((end - 1) / chunkSize) + 1;
      for (var chunk = beginChunk; chunk < endChunk; ++chunk) {
        if (!this.loadedChunks[chunk]) {
          throw new MissingDataException(begin, end);
        }
      }
    },

    nextEmptyChunk: function ChunkedStream_nextEmptyChunk(beginChunk) {
      var chunk, numChunks = this.numChunks;
      for (var i = 0; i < numChunks; ++i) {
        chunk = (beginChunk + i) % numChunks; // Wrap around to beginning
        if (!this.loadedChunks[chunk]) {
          return chunk;
        }
      }
      return null;
    },

    hasChunk: function ChunkedStream_hasChunk(chunk) {
      return !!this.loadedChunks[chunk];
    },

    get length() {
      return this.end - this.start;
    },

    get isEmpty() {
      return this.length === 0;
    },

    getByte: function ChunkedStream_getByte() {
      var pos = this.pos;
      if (pos >= this.end) {
        return -1;
      }
      this.ensureByte(pos);
      return this.bytes[this.pos++];
    },

    getUint16: function ChunkedStream_getUint16() {
      var b0 = this.getByte();
      var b1 = this.getByte();
      if (b0 === -1 || b1 === -1) {
        return -1;
      }
      return (b0 << 8) + b1;
    },

    getInt32: function ChunkedStream_getInt32() {
      var b0 = this.getByte();
      var b1 = this.getByte();
      var b2 = this.getByte();
      var b3 = this.getByte();
      return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
    },

    // returns subarray of original buffer
    // should only be read
    getBytes: function ChunkedStream_getBytes(length) {
      var bytes = this.bytes;
      var pos = this.pos;
      var strEnd = this.end;

      if (!length) {
        this.ensureRange(pos, strEnd);
        return bytes.subarray(pos, strEnd);
      }

      var end = pos + length;
      if (end > strEnd) {
        end = strEnd;
      }
      this.ensureRange(pos, end);

      this.pos = end;
      return bytes.subarray(pos, end);
    },

    peekByte: function ChunkedStream_peekByte() {
      var peekedByte = this.getByte();
      this.pos--;
      return peekedByte;
    },

    peekBytes: function ChunkedStream_peekBytes(length) {
      var bytes = this.getBytes(length);
      this.pos -= bytes.length;
      return bytes;
    },

    getByteRange: function ChunkedStream_getBytes(begin, end) {
      this.ensureRange(begin, end);
      return this.bytes.subarray(begin, end);
    },

    skip: function ChunkedStream_skip(n) {
      if (!n) {
        n = 1;
      }
      this.pos += n;
    },

    reset: function ChunkedStream_reset() {
      this.pos = this.start;
    },

    moveStart: function ChunkedStream_moveStart() {
      this.start = this.pos;
    },

    makeSubStream: function ChunkedStream_makeSubStream(start, length, dict) {
      this.ensureRange(start, start + length);

      function ChunkedStreamSubstream() {}
      ChunkedStreamSubstream.prototype = Object.create(this);
      ChunkedStreamSubstream.prototype.getMissingChunks = function() {
        var chunkSize = this.chunkSize;
        var beginChunk = Math.floor(this.start / chunkSize);
        var endChunk = Math.floor((this.end - 1) / chunkSize) + 1;
        var missingChunks = [];
        for (var chunk = beginChunk; chunk < endChunk; ++chunk) {
          if (!this.loadedChunks[chunk]) {
            missingChunks.push(chunk);
          }
        }
        return missingChunks;
      };
      var subStream = new ChunkedStreamSubstream();
      subStream.pos = subStream.start = start;
      subStream.end = start + length || this.end;
      subStream.dict = dict;
      return subStream;
    },

    isStream: true
  };

  return ChunkedStream;
})();

var ChunkedStreamManager = (function ChunkedStreamManagerClosure() {

  function ChunkedStreamManager(length, chunkSize, url, args) {
    this.stream = new ChunkedStream(length, chunkSize, this);
    this.length = length;
    this.chunkSize = chunkSize;
    this.url = url;
    this.disableAutoFetch = args.disableAutoFetch;
    var msgHandler = this.msgHandler = args.msgHandler;

    if (args.chunkedViewerLoading) {
      msgHandler.on('OnDataRange', this.onReceiveData.bind(this));
      msgHandler.on('OnDataProgress', this.onProgress.bind(this));
      this.sendRequest = function ChunkedStreamManager_sendRequest(begin, end) {
        msgHandler.send('RequestDataRange', { begin: begin, end: end });
      };
    } else {

      var getXhr = function getXhr() {
        return new XMLHttpRequest();
      };
      this.networkManager = new NetworkManager(this.url, {
        getXhr: getXhr,
        httpHeaders: args.httpHeaders,
        withCredentials: args.withCredentials
      });
      this.sendRequest = function ChunkedStreamManager_sendRequest(begin, end) {
        this.networkManager.requestRange(begin, end, {
          onDone: this.onReceiveData.bind(this),
          onProgress: this.onProgress.bind(this)
        });
      };
    }

    this.currRequestId = 0;

    this.chunksNeededByRequest = {};
    this.requestsByChunk = {};
    this.promisesByRequest = {};
    this.progressiveDataLength = 0;

    this._loadedStreamCapability = createPromiseCapability();

    if (args.initialData) {
      this.onReceiveData({chunk: args.initialData});
    }
  }

  ChunkedStreamManager.prototype = {
    onLoadedStream: function ChunkedStreamManager_getLoadedStream() {
      return this._loadedStreamCapability.promise;
    },

    // Get all the chunks that are not yet loaded and groups them into
    // contiguous ranges to load in as few requests as possible
    requestAllChunks: function ChunkedStreamManager_requestAllChunks() {
      var missingChunks = this.stream.getMissingChunks();
      this._requestChunks(missingChunks);
      return this._loadedStreamCapability.promise;
    },

    _requestChunks: function ChunkedStreamManager_requestChunks(chunks) {
      var requestId = this.currRequestId++;

      var chunksNeeded;
      var i, ii;
      this.chunksNeededByRequest[requestId] = chunksNeeded = {};
      for (i = 0, ii = chunks.length; i < ii; i++) {
        if (!this.stream.hasChunk(chunks[i])) {
          chunksNeeded[chunks[i]] = true;
        }
      }

      if (isEmptyObj(chunksNeeded)) {
        return Promise.resolve();
      }

      var capability = createPromiseCapability();
      this.promisesByRequest[requestId] = capability;

      var chunksToRequest = [];
      for (var chunk in chunksNeeded) {
        chunk = chunk | 0;
        if (!(chunk in this.requestsByChunk)) {
          this.requestsByChunk[chunk] = [];
          chunksToRequest.push(chunk);
        }
        this.requestsByChunk[chunk].push(requestId);
      }

      if (!chunksToRequest.length) {
        return capability.promise;
      }

      var groupedChunksToRequest = this.groupChunks(chunksToRequest);

      for (i = 0; i < groupedChunksToRequest.length; ++i) {
        var groupedChunk = groupedChunksToRequest[i];
        var begin = groupedChunk.beginChunk * this.chunkSize;
        var end = Math.min(groupedChunk.endChunk * this.chunkSize, this.length);
        this.sendRequest(begin, end);
      }

      return capability.promise;
    },

    getStream: function ChunkedStreamManager_getStream() {
      return this.stream;
    },

    // Loads any chunks in the requested range that are not yet loaded
    requestRange: function ChunkedStreamManager_requestRange(begin, end) {

      end = Math.min(end, this.length);

      var beginChunk = this.getBeginChunk(begin);
      var endChunk = this.getEndChunk(end);

      var chunks = [];
      for (var chunk = beginChunk; chunk < endChunk; ++chunk) {
        chunks.push(chunk);
      }

      return this._requestChunks(chunks);
    },

    requestRanges: function ChunkedStreamManager_requestRanges(ranges) {
      ranges = ranges || [];
      var chunksToRequest = [];

      for (var i = 0; i < ranges.length; i++) {
        var beginChunk = this.getBeginChunk(ranges[i].begin);
        var endChunk = this.getEndChunk(ranges[i].end);
        for (var chunk = beginChunk; chunk < endChunk; ++chunk) {
          if (chunksToRequest.indexOf(chunk) < 0) {
            chunksToRequest.push(chunk);
          }
        }
      }

      chunksToRequest.sort(function(a, b) { return a - b; });
      return this._requestChunks(chunksToRequest);
    },

    // Groups a sorted array of chunks into as few contiguous larger
    // chunks as possible
    groupChunks: function ChunkedStreamManager_groupChunks(chunks) {
      var groupedChunks = [];
      var beginChunk = -1;
      var prevChunk = -1;
      for (var i = 0; i < chunks.length; ++i) {
        var chunk = chunks[i];

        if (beginChunk < 0) {
          beginChunk = chunk;
        }

        if (prevChunk >= 0 && prevChunk + 1 !== chunk) {
          groupedChunks.push({ beginChunk: beginChunk,
                               endChunk: prevChunk + 1 });
          beginChunk = chunk;
        }
        if (i + 1 === chunks.length) {
          groupedChunks.push({ beginChunk: beginChunk,
                               endChunk: chunk + 1 });
        }

        prevChunk = chunk;
      }
      return groupedChunks;
    },

    onProgress: function ChunkedStreamManager_onProgress(args) {
      var bytesLoaded = (this.stream.numChunksLoaded * this.chunkSize +
                         args.loaded);
      this.msgHandler.send('DocProgress', {
        loaded: bytesLoaded,
        total: this.length
      });
    },

    onReceiveData: function ChunkedStreamManager_onReceiveData(args) {
      var chunk = args.chunk;
      var isProgressive = args.begin === undefined;
      var begin = isProgressive ? this.progressiveDataLength : args.begin;
      var end = begin + chunk.byteLength;

      var beginChunk = Math.floor(begin / this.chunkSize);
      var endChunk = end < this.length ? Math.floor(end / this.chunkSize) :
                                         Math.ceil(end / this.chunkSize);

      if (isProgressive) {
        this.stream.onReceiveProgressiveData(chunk);
        this.progressiveDataLength = end;
      } else {
        this.stream.onReceiveData(begin, chunk);
      }

      if (this.stream.allChunksLoaded()) {
        this._loadedStreamCapability.resolve(this.stream);
      }

      var loadedRequests = [];
      var i, requestId;
      for (chunk = beginChunk; chunk < endChunk; ++chunk) {
        // The server might return more chunks than requested
        var requestIds = this.requestsByChunk[chunk] || [];
        delete this.requestsByChunk[chunk];

        for (i = 0; i < requestIds.length; ++i) {
          requestId = requestIds[i];
          var chunksNeeded = this.chunksNeededByRequest[requestId];
          if (chunk in chunksNeeded) {
            delete chunksNeeded[chunk];
          }

          if (!isEmptyObj(chunksNeeded)) {
            continue;
          }

          loadedRequests.push(requestId);
        }
      }

      // If there are no pending requests, automatically fetch the next
      // unfetched chunk of the PDF
      if (!this.disableAutoFetch && isEmptyObj(this.requestsByChunk)) {
        var nextEmptyChunk;
        if (this.stream.numChunksLoaded === 1) {
          // This is a special optimization so that after fetching the first
          // chunk, rather than fetching the second chunk, we fetch the last
          // chunk.
          var lastChunk = this.stream.numChunks - 1;
          if (!this.stream.hasChunk(lastChunk)) {
            nextEmptyChunk = lastChunk;
          }
        } else {
          nextEmptyChunk = this.stream.nextEmptyChunk(endChunk);
        }
        if (isInt(nextEmptyChunk)) {
          this._requestChunks([nextEmptyChunk]);
        }
      }

      for (i = 0; i < loadedRequests.length; ++i) {
        requestId = loadedRequests[i];
        var capability = this.promisesByRequest[requestId];
        delete this.promisesByRequest[requestId];
        capability.resolve();
      }

      this.msgHandler.send('DocProgress', {
        loaded: this.stream.numChunksLoaded * this.chunkSize,
        total: this.length
      });
    },

    onError: function ChunkedStreamManager_onError(err) {
      this._loadedStreamCapability.reject(err);
    },

    getBeginChunk: function ChunkedStreamManager_getBeginChunk(begin) {
      var chunk = Math.floor(begin / this.chunkSize);
      return chunk;
    },

    getEndChunk: function ChunkedStreamManager_getEndChunk(end) {
      var chunk = Math.floor((end - 1) / this.chunkSize) + 1;
      return chunk;
    },

    abort: function ChunkedStreamManager_abort() {
      if (this.networkManager) {
        this.networkManager.abortAllRequests();
      }
      for(var requestId in this.promisesByRequest) {
        var capability = this.promisesByRequest[requestId];
        capability.reject(new Error('Request was aborted'));
      }
    }
  };

  return ChunkedStreamManager;
})();

exports.ChunkedStream = ChunkedStream;
exports.ChunkedStreamManager = ChunkedStreamManager;
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* uses XRef */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/core/primitives', ['exports', 'pdfjs/shared/util'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('../shared/util.js'));
  } else {
    factory((root.pdfjsCorePrimitives = {}), root.pdfjsSharedUtil);
  }
}(this, function (exports, sharedUtil) {

var isArray = sharedUtil.isArray;

var Name = (function NameClosure() {
  function Name(name) {
    this.name = name;
  }

  Name.prototype = {};

  var nameCache = {};

  Name.get = function Name_get(name) {
    var nameValue = nameCache[name];
    return (nameValue ? nameValue : (nameCache[name] = new Name(name)));
  };

  return Name;
})();

var Cmd = (function CmdClosure() {
  function Cmd(cmd) {
    this.cmd = cmd;
  }

  Cmd.prototype = {};

  var cmdCache = {};

  Cmd.get = function Cmd_get(cmd) {
    var cmdValue = cmdCache[cmd];
    return (cmdValue ? cmdValue : (cmdCache[cmd] = new Cmd(cmd)));
  };

  return Cmd;
})();

var Dict = (function DictClosure() {
  var nonSerializable = function nonSerializableClosure() {
    return nonSerializable; // creating closure on some variable
  };

  var GETALL_DICTIONARY_TYPES_WHITELIST = {
    'Background': true,
    'ExtGState': true,
    'Halftone': true,
    'Layout': true,
    'Mask': true,
    'Pagination': true,
    'Printing': true
  };

  function isRecursionAllowedFor(dict) {
    if (!isName(dict.Type)) {
      return true;
    }
    var dictType = dict.Type.name;
    return GETALL_DICTIONARY_TYPES_WHITELIST[dictType] === true;
  }

  // xref is optional
  function Dict(xref) {
    // Map should only be used internally, use functions below to access.
    this.map = Object.create(null);
    this.xref = xref;
    this.objId = null;
    this.__nonSerializable__ = nonSerializable; // disable cloning of the Dict
  }

  Dict.prototype = {
    assignXref: function Dict_assignXref(newXref) {
      this.xref = newXref;
    },

    // automatically dereferences Ref objects
    get: function Dict_get(key1, key2, key3) {
      var value;
      var xref = this.xref;
      if (typeof (value = this.map[key1]) !== 'undefined' || key1 in this.map ||
          typeof key2 === 'undefined') {
        return xref ? xref.fetchIfRef(value) : value;
      }
      if (typeof (value = this.map[key2]) !== 'undefined' || key2 in this.map ||
          typeof key3 === 'undefined') {
        return xref ? xref.fetchIfRef(value) : value;
      }
      value = this.map[key3] || null;
      return xref ? xref.fetchIfRef(value) : value;
    },

    // Same as get(), but returns a promise and uses fetchIfRefAsync().
    getAsync: function Dict_getAsync(key1, key2, key3) {
      var value;
      var xref = this.xref;
      if (typeof (value = this.map[key1]) !== 'undefined' || key1 in this.map ||
          typeof key2 === 'undefined') {
        if (xref) {
          return xref.fetchIfRefAsync(value);
        }
        return Promise.resolve(value);
      }
      if (typeof (value = this.map[key2]) !== 'undefined' || key2 in this.map ||
          typeof key3 === 'undefined') {
        if (xref) {
          return xref.fetchIfRefAsync(value);
        }
        return Promise.resolve(value);
      }
      value = this.map[key3] || null;
      if (xref) {
        return xref.fetchIfRefAsync(value);
      }
      return Promise.resolve(value);
    },

    // Same as get(), but dereferences all elements if the result is an Array.
    getArray: function Dict_getArray(key1, key2, key3) {
      var value = this.get(key1, key2, key3);
      var xref = this.xref;
      if (!isArray(value) || !xref) {
        return value;
      }
      value = value.slice(); // Ensure that we don't modify the Dict data.
      for (var i = 0, ii = value.length; i < ii; i++) {
        if (!isRef(value[i])) {
          continue;
        }
        value[i] = xref.fetch(value[i]);
      }
      return value;
    },

    // no dereferencing
    getRaw: function Dict_getRaw(key) {
      return this.map[key];
    },

    // creates new map and dereferences all Refs
    getAll: function Dict_getAll() {
      var all = Object.create(null);
      var queue = null;
      var key, obj;
      for (key in this.map) {
        obj = this.get(key);
        if (obj instanceof Dict) {
          if (isRecursionAllowedFor(obj)) {
            (queue || (queue = [])).push({target: all, key: key, obj: obj});
          } else {
            all[key] = this.getRaw(key);
          }
        } else {
          all[key] = obj;
        }
      }
      if (!queue) {
        return all;
      }

      // trying to take cyclic references into the account
      var processed = Object.create(null);
      while (queue.length > 0) {
        var item = queue.shift();
        var itemObj = item.obj;
        var objId = itemObj.objId;
        if (objId && objId in processed) {
          item.target[item.key] = processed[objId];
          continue;
        }
        var dereferenced = Object.create(null);
        for (key in itemObj.map) {
          obj = itemObj.get(key);
          if (obj instanceof Dict) {
            if (isRecursionAllowedFor(obj)) {
              queue.push({target: dereferenced, key: key, obj: obj});
            } else {
              dereferenced[key] = itemObj.getRaw(key);
            }
          } else {
            dereferenced[key] = obj;
          }
        }
        if (objId) {
          processed[objId] = dereferenced;
        }
        item.target[item.key] = dereferenced;
      }
      return all;
    },

    getKeys: function Dict_getKeys() {
      return Object.keys(this.map);
    },

    set: function Dict_set(key, value) {
      this.map[key] = value;
    },

    has: function Dict_has(key) {
      return key in this.map;
    },

    forEach: function Dict_forEach(callback) {
      for (var key in this.map) {
        callback(key, this.get(key));
      }
    }
  };

  Dict.empty = new Dict(null);

  Dict.merge = function Dict_merge(xref, dictArray) {
    var mergedDict = new Dict(xref);

    for (var i = 0, ii = dictArray.length; i < ii; i++) {
      var dict = dictArray[i];
      if (!isDict(dict)) {
        continue;
      }
      for (var keyName in dict.map) {
        if (mergedDict.map[keyName]) {
          continue;
        }
        mergedDict.map[keyName] = dict.map[keyName];
      }
    }
    return mergedDict;
  };

  return Dict;
})();

var Ref = (function RefClosure() {
  function Ref(num, gen) {
    this.num = num;
    this.gen = gen;
  }

  Ref.prototype = {
    toString: function Ref_toString() {
      // This function is hot, so we make the string as compact as possible.
      // |this.gen| is almost always zero, so we treat that case specially.
      var str = this.num + 'R';
      if (this.gen !== 0) {
        str += this.gen;
      }
      return str;
    }
  };

  return Ref;
})();

// The reference is identified by number and generation.
// This structure stores only one instance of the reference.
var RefSet = (function RefSetClosure() {
  function RefSet() {
    this.dict = {};
  }

  RefSet.prototype = {
    has: function RefSet_has(ref) {
      return ref.toString() in this.dict;
    },

    put: function RefSet_put(ref) {
      this.dict[ref.toString()] = true;
    },

    remove: function RefSet_remove(ref) {
      delete this.dict[ref.toString()];
    }
  };

  return RefSet;
})();

var RefSetCache = (function RefSetCacheClosure() {
  function RefSetCache() {
    this.dict = Object.create(null);
  }

  RefSetCache.prototype = {
    get: function RefSetCache_get(ref) {
      return this.dict[ref.toString()];
    },

    has: function RefSetCache_has(ref) {
      return ref.toString() in this.dict;
    },

    put: function RefSetCache_put(ref, obj) {
      this.dict[ref.toString()] = obj;
    },

    putAlias: function RefSetCache_putAlias(ref, aliasRef) {
      this.dict[ref.toString()] = this.get(aliasRef);
    },

    forEach: function RefSetCache_forEach(fn, thisArg) {
      for (var i in this.dict) {
        fn.call(thisArg, this.dict[i]);
      }
    },

    clear: function RefSetCache_clear() {
      this.dict = Object.create(null);
    }
  };

  return RefSetCache;
})();

function isName(v) {
  return v instanceof Name;
}

function isCmd(v, cmd) {
  return v instanceof Cmd && (cmd === undefined || v.cmd === cmd);
}

function isDict(v, type) {
  if (!(v instanceof Dict)) {
    return false;
  }
  if (!type) {
    return true;
  }
  var dictType = v.get('Type');
  return isName(dictType) && dictType.name === type;
}

function isRef(v) {
  return v instanceof Ref;
}

function isStream(v) {
  return typeof v === 'object' && v !== null && v.getBytes !== undefined;
}

exports.Cmd = Cmd;
exports.Dict = Dict;
exports.Name = Name;
exports.Ref = Ref;
exports.RefSet = RefSet;
exports.RefSetCache = RefSetCache;
exports.isCmd = isCmd;
exports.isDict = isDict;
exports.isName = isName;
exports.isRef = isRef;
exports.isStream = isStream;
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals PDFJS */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/core/stream', ['exports', 'pdfjs/shared/util',
      'pdfjs/core/primitives'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('../shared/util.js'), require('./primitives.js'));
  } else {
    factory((root.pdfjsCoreStream = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives);
  }
}(this, function (exports, sharedUtil, corePrimitives) {

var Util = sharedUtil.Util;
var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var shadow = sharedUtil.shadow;
var warn = sharedUtil.warn;
var Dict = corePrimitives.Dict;

var coreParser; // see _setCoreParser below
var EOF; // = coreParser.EOF;
var Lexer; // = coreParser.Lexer;

var coreColorSpace; // see _setCoreColorSpace below
var ColorSpace; // = coreColorSpace.ColorSpace;

var Stream = (function StreamClosure() {
  function Stream(arrayBuffer, start, length, dict) {
    this.bytes = (arrayBuffer instanceof Uint8Array ?
                  arrayBuffer : new Uint8Array(arrayBuffer));
    this.start = start || 0;
    this.pos = this.start;
    this.end = (start + length) || this.bytes.length;
    this.dict = dict;
  }

  // required methods for a stream. if a particular stream does not
  // implement these, an error should be thrown
  Stream.prototype = {
    get length() {
      return this.end - this.start;
    },
    get isEmpty() {
      return this.length === 0;
    },
    getByte: function Stream_getByte() {
      if (this.pos >= this.end) {
        return -1;
      }
      return this.bytes[this.pos++];
    },
    getUint16: function Stream_getUint16() {
      var b0 = this.getByte();
      var b1 = this.getByte();
      if (b0 === -1 || b1 === -1) {
        return -1;
      }
      return (b0 << 8) + b1;
    },
    getInt32: function Stream_getInt32() {
      var b0 = this.getByte();
      var b1 = this.getByte();
      var b2 = this.getByte();
      var b3 = this.getByte();
      return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
    },
    // returns subarray of original buffer
    // should only be read
    getBytes: function Stream_getBytes(length) {
      var bytes = this.bytes;
      var pos = this.pos;
      var strEnd = this.end;

      if (!length) {
        return bytes.subarray(pos, strEnd);
      }
      var end = pos + length;
      if (end > strEnd) {
        end = strEnd;
      }
      this.pos = end;
      return bytes.subarray(pos, end);
    },
    peekByte: function Stream_peekByte() {
      var peekedByte = this.getByte();
      this.pos--;
      return peekedByte;
    },
    peekBytes: function Stream_peekBytes(length) {
      var bytes = this.getBytes(length);
      this.pos -= bytes.length;
      return bytes;
    },
    skip: function Stream_skip(n) {
      if (!n) {
        n = 1;
      }
      this.pos += n;
    },
    reset: function Stream_reset() {
      this.pos = this.start;
    },
    moveStart: function Stream_moveStart() {
      this.start = this.pos;
    },
    makeSubStream: function Stream_makeSubStream(start, length, dict) {
      return new Stream(this.bytes.buffer, start, length, dict);
    },
    isStream: true
  };

  return Stream;
})();

var StringStream = (function StringStreamClosure() {
  function StringStream(str) {
    var length = str.length;
    var bytes = new Uint8Array(length);
    for (var n = 0; n < length; ++n) {
      bytes[n] = str.charCodeAt(n);
    }
    Stream.call(this, bytes);
  }

  StringStream.prototype = Stream.prototype;

  return StringStream;
})();

// super class for the decoding streams
var DecodeStream = (function DecodeStreamClosure() {
  // Lots of DecodeStreams are created whose buffers are never used.  For these
  // we share a single empty buffer. This is (a) space-efficient and (b) avoids
  // having special cases that would be required if we used |null| for an empty
  // buffer.
  var emptyBuffer = new Uint8Array(0);

  function DecodeStream(maybeMinBufferLength) {
    this.pos = 0;
    this.bufferLength = 0;
    this.eof = false;
    this.buffer = emptyBuffer;
    this.minBufferLength = 512;
    if (maybeMinBufferLength) {
      // Compute the first power of two that is as big as maybeMinBufferLength.
      while (this.minBufferLength < maybeMinBufferLength) {
        this.minBufferLength *= 2;
      }
    }
  }

  DecodeStream.prototype = {
    get isEmpty() {
      while (!this.eof && this.bufferLength === 0) {
        this.readBlock();
      }
      return this.bufferLength === 0;
    },
    ensureBuffer: function DecodeStream_ensureBuffer(requested) {
      var buffer = this.buffer;
      if (requested <= buffer.byteLength) {
        return buffer;
      }
      var size = this.minBufferLength;
      while (size < requested) {
        size *= 2;
      }
      var buffer2 = new Uint8Array(size);
      buffer2.set(buffer);
      return (this.buffer = buffer2);
    },
    getByte: function DecodeStream_getByte() {
      var pos = this.pos;
      while (this.bufferLength <= pos) {
        if (this.eof) {
          return -1;
        }
        this.readBlock();
      }
      return this.buffer[this.pos++];
    },
    getUint16: function DecodeStream_getUint16() {
      var b0 = this.getByte();
      var b1 = this.getByte();
      if (b0 === -1 || b1 === -1) {
        return -1;
      }
      return (b0 << 8) + b1;
    },
    getInt32: function DecodeStream_getInt32() {
      var b0 = this.getByte();
      var b1 = this.getByte();
      var b2 = this.getByte();
      var b3 = this.getByte();
      return (b0 << 24) + (b1 << 16) + (b2 << 8) + b3;
    },
    getBytes: function DecodeStream_getBytes(length) {
      var end, pos = this.pos;

      if (length) {
        this.ensureBuffer(pos + length);
        end = pos + length;

        while (!this.eof && this.bufferLength < end) {
          this.readBlock();
        }
        var bufEnd = this.bufferLength;
        if (end > bufEnd) {
          end = bufEnd;
        }
      } else {
        while (!this.eof) {
          this.readBlock();
        }
        end = this.bufferLength;
      }

      this.pos = end;
      return this.buffer.subarray(pos, end);
    },
    peekByte: function DecodeStream_peekByte() {
      var peekedByte = this.getByte();
      this.pos--;
      return peekedByte;
    },
    peekBytes: function DecodeStream_peekBytes(length) {
      var bytes = this.getBytes(length);
      this.pos -= bytes.length;
      return bytes;
    },
    makeSubStream: function DecodeStream_makeSubStream(start, length, dict) {
      var end = start + length;
      while (this.bufferLength <= end && !this.eof) {
        this.readBlock();
      }
      return new Stream(this.buffer, start, length, dict);
    },
    skip: function DecodeStream_skip(n) {
      if (!n) {
        n = 1;
      }
      this.pos += n;
    },
    reset: function DecodeStream_reset() {
      this.pos = 0;
    },
    getBaseStreams: function DecodeStream_getBaseStreams() {
      if (this.str && this.str.getBaseStreams) {
        return this.str.getBaseStreams();
      }
      return [];
    }
  };

  return DecodeStream;
})();

var StreamsSequenceStream = (function StreamsSequenceStreamClosure() {
  function StreamsSequenceStream(streams) {
    this.streams = streams;
    DecodeStream.call(this, /* maybeLength = */ null);
  }

  StreamsSequenceStream.prototype = Object.create(DecodeStream.prototype);

  StreamsSequenceStream.prototype.readBlock =
      function streamSequenceStreamReadBlock() {

    var streams = this.streams;
    if (streams.length === 0) {
      this.eof = true;
      return;
    }
    var stream = streams.shift();
    var chunk = stream.getBytes();
    var bufferLength = this.bufferLength;
    var newLength = bufferLength + chunk.length;
    var buffer = this.ensureBuffer(newLength);
    buffer.set(chunk, bufferLength);
    this.bufferLength = newLength;
  };

  StreamsSequenceStream.prototype.getBaseStreams =
    function StreamsSequenceStream_getBaseStreams() {

    var baseStreams = [];
    for (var i = 0, ii = this.streams.length; i < ii; i++) {
      var stream = this.streams[i];
      if (stream.getBaseStreams) {
        Util.appendToArray(baseStreams, stream.getBaseStreams());
      }
    }
    return baseStreams;
  };

  return StreamsSequenceStream;
})();

var FlateStream = (function FlateStreamClosure() {
  var codeLenCodeMap = new Int32Array([
    16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
  ]);

  var lengthDecode = new Int32Array([
    0x00003, 0x00004, 0x00005, 0x00006, 0x00007, 0x00008, 0x00009, 0x0000a,
    0x1000b, 0x1000d, 0x1000f, 0x10011, 0x20013, 0x20017, 0x2001b, 0x2001f,
    0x30023, 0x3002b, 0x30033, 0x3003b, 0x40043, 0x40053, 0x40063, 0x40073,
    0x50083, 0x500a3, 0x500c3, 0x500e3, 0x00102, 0x00102, 0x00102
  ]);

  var distDecode = new Int32Array([
    0x00001, 0x00002, 0x00003, 0x00004, 0x10005, 0x10007, 0x20009, 0x2000d,
    0x30011, 0x30019, 0x40021, 0x40031, 0x50041, 0x50061, 0x60081, 0x600c1,
    0x70101, 0x70181, 0x80201, 0x80301, 0x90401, 0x90601, 0xa0801, 0xa0c01,
    0xb1001, 0xb1801, 0xc2001, 0xc3001, 0xd4001, 0xd6001
  ]);

  var fixedLitCodeTab = [new Int32Array([
    0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c0,
    0x70108, 0x80060, 0x80020, 0x900a0, 0x80000, 0x80080, 0x80040, 0x900e0,
    0x70104, 0x80058, 0x80018, 0x90090, 0x70114, 0x80078, 0x80038, 0x900d0,
    0x7010c, 0x80068, 0x80028, 0x900b0, 0x80008, 0x80088, 0x80048, 0x900f0,
    0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c8,
    0x7010a, 0x80064, 0x80024, 0x900a8, 0x80004, 0x80084, 0x80044, 0x900e8,
    0x70106, 0x8005c, 0x8001c, 0x90098, 0x70116, 0x8007c, 0x8003c, 0x900d8,
    0x7010e, 0x8006c, 0x8002c, 0x900b8, 0x8000c, 0x8008c, 0x8004c, 0x900f8,
    0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c4,
    0x70109, 0x80062, 0x80022, 0x900a4, 0x80002, 0x80082, 0x80042, 0x900e4,
    0x70105, 0x8005a, 0x8001a, 0x90094, 0x70115, 0x8007a, 0x8003a, 0x900d4,
    0x7010d, 0x8006a, 0x8002a, 0x900b4, 0x8000a, 0x8008a, 0x8004a, 0x900f4,
    0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cc,
    0x7010b, 0x80066, 0x80026, 0x900ac, 0x80006, 0x80086, 0x80046, 0x900ec,
    0x70107, 0x8005e, 0x8001e, 0x9009c, 0x70117, 0x8007e, 0x8003e, 0x900dc,
    0x7010f, 0x8006e, 0x8002e, 0x900bc, 0x8000e, 0x8008e, 0x8004e, 0x900fc,
    0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c2,
    0x70108, 0x80061, 0x80021, 0x900a2, 0x80001, 0x80081, 0x80041, 0x900e2,
    0x70104, 0x80059, 0x80019, 0x90092, 0x70114, 0x80079, 0x80039, 0x900d2,
    0x7010c, 0x80069, 0x80029, 0x900b2, 0x80009, 0x80089, 0x80049, 0x900f2,
    0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900ca,
    0x7010a, 0x80065, 0x80025, 0x900aa, 0x80005, 0x80085, 0x80045, 0x900ea,
    0x70106, 0x8005d, 0x8001d, 0x9009a, 0x70116, 0x8007d, 0x8003d, 0x900da,
    0x7010e, 0x8006d, 0x8002d, 0x900ba, 0x8000d, 0x8008d, 0x8004d, 0x900fa,
    0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c6,
    0x70109, 0x80063, 0x80023, 0x900a6, 0x80003, 0x80083, 0x80043, 0x900e6,
    0x70105, 0x8005b, 0x8001b, 0x90096, 0x70115, 0x8007b, 0x8003b, 0x900d6,
    0x7010d, 0x8006b, 0x8002b, 0x900b6, 0x8000b, 0x8008b, 0x8004b, 0x900f6,
    0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900ce,
    0x7010b, 0x80067, 0x80027, 0x900ae, 0x80007, 0x80087, 0x80047, 0x900ee,
    0x70107, 0x8005f, 0x8001f, 0x9009e, 0x70117, 0x8007f, 0x8003f, 0x900de,
    0x7010f, 0x8006f, 0x8002f, 0x900be, 0x8000f, 0x8008f, 0x8004f, 0x900fe,
    0x70100, 0x80050, 0x80010, 0x80118, 0x70110, 0x80070, 0x80030, 0x900c1,
    0x70108, 0x80060, 0x80020, 0x900a1, 0x80000, 0x80080, 0x80040, 0x900e1,
    0x70104, 0x80058, 0x80018, 0x90091, 0x70114, 0x80078, 0x80038, 0x900d1,
    0x7010c, 0x80068, 0x80028, 0x900b1, 0x80008, 0x80088, 0x80048, 0x900f1,
    0x70102, 0x80054, 0x80014, 0x8011c, 0x70112, 0x80074, 0x80034, 0x900c9,
    0x7010a, 0x80064, 0x80024, 0x900a9, 0x80004, 0x80084, 0x80044, 0x900e9,
    0x70106, 0x8005c, 0x8001c, 0x90099, 0x70116, 0x8007c, 0x8003c, 0x900d9,
    0x7010e, 0x8006c, 0x8002c, 0x900b9, 0x8000c, 0x8008c, 0x8004c, 0x900f9,
    0x70101, 0x80052, 0x80012, 0x8011a, 0x70111, 0x80072, 0x80032, 0x900c5,
    0x70109, 0x80062, 0x80022, 0x900a5, 0x80002, 0x80082, 0x80042, 0x900e5,
    0x70105, 0x8005a, 0x8001a, 0x90095, 0x70115, 0x8007a, 0x8003a, 0x900d5,
    0x7010d, 0x8006a, 0x8002a, 0x900b5, 0x8000a, 0x8008a, 0x8004a, 0x900f5,
    0x70103, 0x80056, 0x80016, 0x8011e, 0x70113, 0x80076, 0x80036, 0x900cd,
    0x7010b, 0x80066, 0x80026, 0x900ad, 0x80006, 0x80086, 0x80046, 0x900ed,
    0x70107, 0x8005e, 0x8001e, 0x9009d, 0x70117, 0x8007e, 0x8003e, 0x900dd,
    0x7010f, 0x8006e, 0x8002e, 0x900bd, 0x8000e, 0x8008e, 0x8004e, 0x900fd,
    0x70100, 0x80051, 0x80011, 0x80119, 0x70110, 0x80071, 0x80031, 0x900c3,
    0x70108, 0x80061, 0x80021, 0x900a3, 0x80001, 0x80081, 0x80041, 0x900e3,
    0x70104, 0x80059, 0x80019, 0x90093, 0x70114, 0x80079, 0x80039, 0x900d3,
    0x7010c, 0x80069, 0x80029, 0x900b3, 0x80009, 0x80089, 0x80049, 0x900f3,
    0x70102, 0x80055, 0x80015, 0x8011d, 0x70112, 0x80075, 0x80035, 0x900cb,
    0x7010a, 0x80065, 0x80025, 0x900ab, 0x80005, 0x80085, 0x80045, 0x900eb,
    0x70106, 0x8005d, 0x8001d, 0x9009b, 0x70116, 0x8007d, 0x8003d, 0x900db,
    0x7010e, 0x8006d, 0x8002d, 0x900bb, 0x8000d, 0x8008d, 0x8004d, 0x900fb,
    0x70101, 0x80053, 0x80013, 0x8011b, 0x70111, 0x80073, 0x80033, 0x900c7,
    0x70109, 0x80063, 0x80023, 0x900a7, 0x80003, 0x80083, 0x80043, 0x900e7,
    0x70105, 0x8005b, 0x8001b, 0x90097, 0x70115, 0x8007b, 0x8003b, 0x900d7,
    0x7010d, 0x8006b, 0x8002b, 0x900b7, 0x8000b, 0x8008b, 0x8004b, 0x900f7,
    0x70103, 0x80057, 0x80017, 0x8011f, 0x70113, 0x80077, 0x80037, 0x900cf,
    0x7010b, 0x80067, 0x80027, 0x900af, 0x80007, 0x80087, 0x80047, 0x900ef,
    0x70107, 0x8005f, 0x8001f, 0x9009f, 0x70117, 0x8007f, 0x8003f, 0x900df,
    0x7010f, 0x8006f, 0x8002f, 0x900bf, 0x8000f, 0x8008f, 0x8004f, 0x900ff
  ]), 9];

  var fixedDistCodeTab = [new Int32Array([
    0x50000, 0x50010, 0x50008, 0x50018, 0x50004, 0x50014, 0x5000c, 0x5001c,
    0x50002, 0x50012, 0x5000a, 0x5001a, 0x50006, 0x50016, 0x5000e, 0x00000,
    0x50001, 0x50011, 0x50009, 0x50019, 0x50005, 0x50015, 0x5000d, 0x5001d,
    0x50003, 0x50013, 0x5000b, 0x5001b, 0x50007, 0x50017, 0x5000f, 0x00000
  ]), 5];

  function FlateStream(str, maybeLength) {
    this.str = str;
    this.dict = str.dict;

    var cmf = str.getByte();
    var flg = str.getByte();
    if (cmf === -1 || flg === -1) {
      error('Invalid header in flate stream: ' + cmf + ', ' + flg);
    }
    if ((cmf & 0x0f) !== 0x08) {
      error('Unknown compression method in flate stream: ' + cmf + ', ' + flg);
    }
    if ((((cmf << 8) + flg) % 31) !== 0) {
      error('Bad FCHECK in flate stream: ' + cmf + ', ' + flg);
    }
    if (flg & 0x20) {
      error('FDICT bit set in flate stream: ' + cmf + ', ' + flg);
    }

    this.codeSize = 0;
    this.codeBuf = 0;

    DecodeStream.call(this, maybeLength);
  }

  FlateStream.prototype = Object.create(DecodeStream.prototype);

  FlateStream.prototype.getBits = function FlateStream_getBits(bits) {
    var str = this.str;
    var codeSize = this.codeSize;
    var codeBuf = this.codeBuf;

    var b;
    while (codeSize < bits) {
      if ((b = str.getByte()) === -1) {
        error('Bad encoding in flate stream');
      }
      codeBuf |= b << codeSize;
      codeSize += 8;
    }
    b = codeBuf & ((1 << bits) - 1);
    this.codeBuf = codeBuf >> bits;
    this.codeSize = codeSize -= bits;

    return b;
  };

  FlateStream.prototype.getCode = function FlateStream_getCode(table) {
    var str = this.str;
    var codes = table[0];
    var maxLen = table[1];
    var codeSize = this.codeSize;
    var codeBuf = this.codeBuf;

    var b;
    while (codeSize < maxLen) {
      if ((b = str.getByte()) === -1) {
        // premature end of stream. code might however still be valid.
        // codeSize < codeLen check below guards against incomplete codeVal.
        break;
      }
      codeBuf |= (b << codeSize);
      codeSize += 8;
    }
    var code = codes[codeBuf & ((1 << maxLen) - 1)];
    var codeLen = code >> 16;
    var codeVal = code & 0xffff;
    if (codeLen < 1 || codeSize < codeLen) {
      error('Bad encoding in flate stream');
    }
    this.codeBuf = (codeBuf >> codeLen);
    this.codeSize = (codeSize - codeLen);
    return codeVal;
  };

  FlateStream.prototype.generateHuffmanTable =
      function flateStreamGenerateHuffmanTable(lengths) {
    var n = lengths.length;

    // find max code length
    var maxLen = 0;
    var i;
    for (i = 0; i < n; ++i) {
      if (lengths[i] > maxLen) {
        maxLen = lengths[i];
      }
    }

    // build the table
    var size = 1 << maxLen;
    var codes = new Int32Array(size);
    for (var len = 1, code = 0, skip = 2;
         len <= maxLen;
         ++len, code <<= 1, skip <<= 1) {
      for (var val = 0; val < n; ++val) {
        if (lengths[val] === len) {
          // bit-reverse the code
          var code2 = 0;
          var t = code;
          for (i = 0; i < len; ++i) {
            code2 = (code2 << 1) | (t & 1);
            t >>= 1;
          }

          // fill the table entries
          for (i = code2; i < size; i += skip) {
            codes[i] = (len << 16) | val;
          }
          ++code;
        }
      }
    }

    return [codes, maxLen];
  };

  FlateStream.prototype.readBlock = function FlateStream_readBlock() {
    var buffer, len;
    var str = this.str;
    // read block header
    var hdr = this.getBits(3);
    if (hdr & 1) {
      this.eof = true;
    }
    hdr >>= 1;

    if (hdr === 0) { // uncompressed block
      var b;

      if ((b = str.getByte()) === -1) {
        error('Bad block header in flate stream');
      }
      var blockLen = b;
      if ((b = str.getByte()) === -1) {
        error('Bad block header in flate stream');
      }
      blockLen |= (b << 8);
      if ((b = str.getByte()) === -1) {
        error('Bad block header in flate stream');
      }
      var check = b;
      if ((b = str.getByte()) === -1) {
        error('Bad block header in flate stream');
      }
      check |= (b << 8);
      if (check !== (~blockLen & 0xffff) &&
          (blockLen !== 0 || check !== 0)) {
        // Ignoring error for bad "empty" block (see issue 1277)
        error('Bad uncompressed block length in flate stream');
      }

      this.codeBuf = 0;
      this.codeSize = 0;

      var bufferLength = this.bufferLength;
      buffer = this.ensureBuffer(bufferLength + blockLen);
      var end = bufferLength + blockLen;
      this.bufferLength = end;
      if (blockLen === 0) {
        if (str.peekByte() === -1) {
          this.eof = true;
        }
      } else {
        for (var n = bufferLength; n < end; ++n) {
          if ((b = str.getByte()) === -1) {
            this.eof = true;
            break;
          }
          buffer[n] = b;
        }
      }
      return;
    }

    var litCodeTable;
    var distCodeTable;
    if (hdr === 1) { // compressed block, fixed codes
      litCodeTable = fixedLitCodeTab;
      distCodeTable = fixedDistCodeTab;
    } else if (hdr === 2) { // compressed block, dynamic codes
      var numLitCodes = this.getBits(5) + 257;
      var numDistCodes = this.getBits(5) + 1;
      var numCodeLenCodes = this.getBits(4) + 4;

      // build the code lengths code table
      var codeLenCodeLengths = new Uint8Array(codeLenCodeMap.length);

      var i;
      for (i = 0; i < numCodeLenCodes; ++i) {
        codeLenCodeLengths[codeLenCodeMap[i]] = this.getBits(3);
      }
      var codeLenCodeTab = this.generateHuffmanTable(codeLenCodeLengths);

      // build the literal and distance code tables
      len = 0;
      i = 0;
      var codes = numLitCodes + numDistCodes;
      var codeLengths = new Uint8Array(codes);
      var bitsLength, bitsOffset, what;
      while (i < codes) {
        var code = this.getCode(codeLenCodeTab);
        if (code === 16) {
          bitsLength = 2; bitsOffset = 3; what = len;
        } else if (code === 17) {
          bitsLength = 3; bitsOffset = 3; what = (len = 0);
        } else if (code === 18) {
          bitsLength = 7; bitsOffset = 11; what = (len = 0);
        } else {
          codeLengths[i++] = len = code;
          continue;
        }

        var repeatLength = this.getBits(bitsLength) + bitsOffset;
        while (repeatLength-- > 0) {
          codeLengths[i++] = what;
        }
      }

      litCodeTable =
        this.generateHuffmanTable(codeLengths.subarray(0, numLitCodes));
      distCodeTable =
        this.generateHuffmanTable(codeLengths.subarray(numLitCodes, codes));
    } else {
      error('Unknown block type in flate stream');
    }

    buffer = this.buffer;
    var limit = buffer ? buffer.length : 0;
    var pos = this.bufferLength;
    while (true) {
      var code1 = this.getCode(litCodeTable);
      if (code1 < 256) {
        if (pos + 1 >= limit) {
          buffer = this.ensureBuffer(pos + 1);
          limit = buffer.length;
        }
        buffer[pos++] = code1;
        continue;
      }
      if (code1 === 256) {
        this.bufferLength = pos;
        return;
      }
      code1 -= 257;
      code1 = lengthDecode[code1];
      var code2 = code1 >> 16;
      if (code2 > 0) {
        code2 = this.getBits(code2);
      }
      len = (code1 & 0xffff) + code2;
      code1 = this.getCode(distCodeTable);
      code1 = distDecode[code1];
      code2 = code1 >> 16;
      if (code2 > 0) {
        code2 = this.getBits(code2);
      }
      var dist = (code1 & 0xffff) + code2;
      if (pos + len >= limit) {
        buffer = this.ensureBuffer(pos + len);
        limit = buffer.length;
      }
      for (var k = 0; k < len; ++k, ++pos) {
        buffer[pos] = buffer[pos - dist];
      }
    }
  };

  return FlateStream;
})();

var PredictorStream = (function PredictorStreamClosure() {
  function PredictorStream(str, maybeLength, params) {
    var predictor = this.predictor = params.get('Predictor') || 1;

    if (predictor <= 1) {
      return str; // no prediction
    }
    if (predictor !== 2 && (predictor < 10 || predictor > 15)) {
      error('Unsupported predictor: ' + predictor);
    }

    if (predictor === 2) {
      this.readBlock = this.readBlockTiff;
    } else {
      this.readBlock = this.readBlockPng;
    }

    this.str = str;
    this.dict = str.dict;

    var colors = this.colors = params.get('Colors') || 1;
    var bits = this.bits = params.get('BitsPerComponent') || 8;
    var columns = this.columns = params.get('Columns') || 1;

    this.pixBytes = (colors * bits + 7) >> 3;
    this.rowBytes = (columns * colors * bits + 7) >> 3;

    DecodeStream.call(this, maybeLength);
    return this;
  }

  PredictorStream.prototype = Object.create(DecodeStream.prototype);

  PredictorStream.prototype.readBlockTiff =
      function predictorStreamReadBlockTiff() {
    var rowBytes = this.rowBytes;

    var bufferLength = this.bufferLength;
    var buffer = this.ensureBuffer(bufferLength + rowBytes);

    var bits = this.bits;
    var colors = this.colors;

    var rawBytes = this.str.getBytes(rowBytes);
    this.eof = !rawBytes.length;
    if (this.eof) {
      return;
    }

    var inbuf = 0, outbuf = 0;
    var inbits = 0, outbits = 0;
    var pos = bufferLength;
    var i;

    if (bits === 1) {
      for (i = 0; i < rowBytes; ++i) {
        var c = rawBytes[i];
        inbuf = (inbuf << 8) | c;
        // bitwise addition is exclusive or
        // first shift inbuf and then add
        buffer[pos++] = (c ^ (inbuf >> colors)) & 0xFF;
        // truncate inbuf (assumes colors < 16)
        inbuf &= 0xFFFF;
      }
    } else if (bits === 8) {
      for (i = 0; i < colors; ++i) {
        buffer[pos++] = rawBytes[i];
      }
      for (; i < rowBytes; ++i) {
        buffer[pos] = buffer[pos - colors] + rawBytes[i];
        pos++;
      }
    } else {
      var compArray = new Uint8Array(colors + 1);
      var bitMask = (1 << bits) - 1;
      var j = 0, k = bufferLength;
      var columns = this.columns;
      for (i = 0; i < columns; ++i) {
        for (var kk = 0; kk < colors; ++kk) {
          if (inbits < bits) {
            inbuf = (inbuf << 8) | (rawBytes[j++] & 0xFF);
            inbits += 8;
          }
          compArray[kk] = (compArray[kk] +
                           (inbuf >> (inbits - bits))) & bitMask;
          inbits -= bits;
          outbuf = (outbuf << bits) | compArray[kk];
          outbits += bits;
          if (outbits >= 8) {
            buffer[k++] = (outbuf >> (outbits - 8)) & 0xFF;
            outbits -= 8;
          }
        }
      }
      if (outbits > 0) {
        buffer[k++] = (outbuf << (8 - outbits)) +
                      (inbuf & ((1 << (8 - outbits)) - 1));
      }
    }
    this.bufferLength += rowBytes;
  };

  PredictorStream.prototype.readBlockPng =
      function predictorStreamReadBlockPng() {

    var rowBytes = this.rowBytes;
    var pixBytes = this.pixBytes;

    var predictor = this.str.getByte();
    var rawBytes = this.str.getBytes(rowBytes);
    this.eof = !rawBytes.length;
    if (this.eof) {
      return;
    }

    var bufferLength = this.bufferLength;
    var buffer = this.ensureBuffer(bufferLength + rowBytes);

    var prevRow = buffer.subarray(bufferLength - rowBytes, bufferLength);
    if (prevRow.length === 0) {
      prevRow = new Uint8Array(rowBytes);
    }

    var i, j = bufferLength, up, c;
    switch (predictor) {
      case 0:
        for (i = 0; i < rowBytes; ++i) {
          buffer[j++] = rawBytes[i];
        }
        break;
      case 1:
        for (i = 0; i < pixBytes; ++i) {
          buffer[j++] = rawBytes[i];
        }
        for (; i < rowBytes; ++i) {
          buffer[j] = (buffer[j - pixBytes] + rawBytes[i]) & 0xFF;
          j++;
        }
        break;
      case 2:
        for (i = 0; i < rowBytes; ++i) {
          buffer[j++] = (prevRow[i] + rawBytes[i]) & 0xFF;
        }
        break;
      case 3:
        for (i = 0; i < pixBytes; ++i) {
          buffer[j++] = (prevRow[i] >> 1) + rawBytes[i];
        }
        for (; i < rowBytes; ++i) {
          buffer[j] = (((prevRow[i] + buffer[j - pixBytes]) >> 1) +
                           rawBytes[i]) & 0xFF;
          j++;
        }
        break;
      case 4:
        // we need to save the up left pixels values. the simplest way
        // is to create a new buffer
        for (i = 0; i < pixBytes; ++i) {
          up = prevRow[i];
          c = rawBytes[i];
          buffer[j++] = up + c;
        }
        for (; i < rowBytes; ++i) {
          up = prevRow[i];
          var upLeft = prevRow[i - pixBytes];
          var left = buffer[j - pixBytes];
          var p = left + up - upLeft;

          var pa = p - left;
          if (pa < 0) {
            pa = -pa;
          }
          var pb = p - up;
          if (pb < 0) {
            pb = -pb;
          }
          var pc = p - upLeft;
          if (pc < 0) {
            pc = -pc;
          }

          c = rawBytes[i];
          if (pa <= pb && pa <= pc) {
            buffer[j++] = left + c;
          } else if (pb <= pc) {
            buffer[j++] = up + c;
          } else {
            buffer[j++] = upLeft + c;
          }
        }
        break;
      default:
        error('Unsupported predictor: ' + predictor);
    }
    this.bufferLength += rowBytes;
  };

  return PredictorStream;
})();

/**
 * Depending on the type of JPEG a JpegStream is handled in different ways. For
 * JPEG's that are supported natively such as DeviceGray and DeviceRGB the image
 * data is stored and then loaded by the browser.  For unsupported JPEG's we use
 * a library to decode these images and the stream behaves like all the other
 * DecodeStreams.
 */
var JpegStream = (function JpegStreamClosure() {
  function JpegStream(stream, maybeLength, dict, xref) {
    // Some images may contain 'junk' before the SOI (start-of-image) marker.
    // Note: this seems to mainly affect inline images.
    var ch;
    while ((ch = stream.getByte()) !== -1) {
      if (ch === 0xFF) { // Find the first byte of the SOI marker (0xFFD8).
        stream.skip(-1); // Reset the stream position to the SOI.
        break;
      }
    }
    this.stream = stream;
    this.maybeLength = maybeLength;
    this.dict = dict;

    DecodeStream.call(this, maybeLength);
  }

  JpegStream.prototype = Object.create(DecodeStream.prototype);

  Object.defineProperty(JpegStream.prototype, 'bytes', {
    get: function JpegStream_bytes() {
      // If this.maybeLength is null, we'll get the entire stream.
      return shadow(this, 'bytes', this.stream.getBytes(this.maybeLength));
    },
    configurable: true
  });

  JpegStream.prototype.ensureBuffer = function JpegStream_ensureBuffer(req) {
    if (this.bufferLength) {
      return;
    }
    try {
      var jpegImage = new JpegImage();

      // checking if values needs to be transformed before conversion
      if (this.forceRGB && this.dict && isArray(this.dict.get('Decode'))) {
        var decodeArr = this.dict.get('Decode');
        var bitsPerComponent = this.dict.get('BitsPerComponent') || 8;
        var decodeArrLength = decodeArr.length;
        var transform = new Int32Array(decodeArrLength);
        var transformNeeded = false;
        var maxValue = (1 << bitsPerComponent) - 1;
        for (var i = 0; i < decodeArrLength; i += 2) {
          transform[i] = ((decodeArr[i + 1] - decodeArr[i]) * 256) | 0;
          transform[i + 1] = (decodeArr[i] * maxValue) | 0;
          if (transform[i] !== 256 || transform[i + 1] !== 0) {
            transformNeeded = true;
          }
        }
        if (transformNeeded) {
          jpegImage.decodeTransform = transform;
        }
      }

      jpegImage.parse(this.bytes);
      var data = jpegImage.getData(this.drawWidth, this.drawHeight,
                                   this.forceRGB);
      this.buffer = data;
      this.bufferLength = data.length;
      this.eof = true;
    } catch (e) {
      error('JPEG error: ' + e);
    }
  };

  JpegStream.prototype.getBytes = function JpegStream_getBytes(length) {
    this.ensureBuffer();
    return this.buffer;
  };

  JpegStream.prototype.getIR = function JpegStream_getIR() {
    return PDFJS.createObjectURL(this.bytes, 'image/jpeg');
  };
  /**
   * Checks if the image can be decoded and displayed by the browser without any
   * further processing such as color space conversions.
   */
  JpegStream.prototype.isNativelySupported =
      function JpegStream_isNativelySupported(xref, res) {
    var cs = ColorSpace.parse(this.dict.get('ColorSpace', 'CS'), xref, res);
    return (cs.name === 'DeviceGray' || cs.name === 'DeviceRGB') &&
           cs.isDefaultDecode(this.dict.get('Decode', 'D'));
  };
  /**
   * Checks if the image can be decoded by the browser.
   */
  JpegStream.prototype.isNativelyDecodable =
      function JpegStream_isNativelyDecodable(xref, res) {
    var cs = ColorSpace.parse(this.dict.get('ColorSpace', 'CS'), xref, res);
    return (cs.numComps === 1 || cs.numComps === 3) &&
           cs.isDefaultDecode(this.dict.get('Decode', 'D'));
  };

  return JpegStream;
})();

/**
 * For JPEG 2000's we use a library to decode these images and
 * the stream behaves like all the other DecodeStreams.
 */
var JpxStream = (function JpxStreamClosure() {
  function JpxStream(stream, maybeLength, dict) {
    this.stream = stream;
    this.maybeLength = maybeLength;
    this.dict = dict;

    DecodeStream.call(this, maybeLength);
  }

  JpxStream.prototype = Object.create(DecodeStream.prototype);

  Object.defineProperty(JpxStream.prototype, 'bytes', {
    get: function JpxStream_bytes() {
      // If this.maybeLength is null, we'll get the entire stream.
      return shadow(this, 'bytes', this.stream.getBytes(this.maybeLength));
    },
    configurable: true
  });

  JpxStream.prototype.ensureBuffer = function JpxStream_ensureBuffer(req) {
    if (this.bufferLength) {
      return;
    }

    var jpxImage = new JpxImage();
    jpxImage.parse(this.bytes);

    var width = jpxImage.width;
    var height = jpxImage.height;
    var componentsCount = jpxImage.componentsCount;
    var tileCount = jpxImage.tiles.length;
    if (tileCount === 1) {
      this.buffer = jpxImage.tiles[0].items;
    } else {
      var data = new Uint8Array(width * height * componentsCount);

      for (var k = 0; k < tileCount; k++) {
        var tileComponents = jpxImage.tiles[k];
        var tileWidth = tileComponents.width;
        var tileHeight = tileComponents.height;
        var tileLeft = tileComponents.left;
        var tileTop = tileComponents.top;

        var src = tileComponents.items;
        var srcPosition = 0;
        var dataPosition = (width * tileTop + tileLeft) * componentsCount;
        var imgRowSize = width * componentsCount;
        var tileRowSize = tileWidth * componentsCount;

        for (var j = 0; j < tileHeight; j++) {
          var rowBytes = src.subarray(srcPosition, srcPosition + tileRowSize);
          data.set(rowBytes, dataPosition);
          srcPosition += tileRowSize;
          dataPosition += imgRowSize;
        }
      }
      this.buffer = data;
    }
    this.bufferLength = this.buffer.length;
    this.eof = true;
  };

  return JpxStream;
})();

/**
 * For JBIG2's we use a library to decode these images and
 * the stream behaves like all the other DecodeStreams.
 */
var Jbig2Stream = (function Jbig2StreamClosure() {
  function Jbig2Stream(stream, maybeLength, dict) {
    this.stream = stream;
    this.maybeLength = maybeLength;
    this.dict = dict;

    DecodeStream.call(this, maybeLength);
  }

  Jbig2Stream.prototype = Object.create(DecodeStream.prototype);

  Object.defineProperty(Jbig2Stream.prototype, 'bytes', {
    get: function Jbig2Stream_bytes() {
      // If this.maybeLength is null, we'll get the entire stream.
      return shadow(this, 'bytes', this.stream.getBytes(this.maybeLength));
    },
    configurable: true
  });

  Jbig2Stream.prototype.ensureBuffer = function Jbig2Stream_ensureBuffer(req) {
    if (this.bufferLength) {
      return;
    }

    var jbig2Image = new Jbig2Image();

    var chunks = [], xref = this.dict.xref;
    var decodeParams = xref.fetchIfRef(this.dict.get('DecodeParms'));

    // According to the PDF specification, DecodeParms can be either
    // a dictionary, or an array whose elements are dictionaries.
    if (isArray(decodeParams)) {
      if (decodeParams.length > 1) {
        warn('JBIG2 - \'DecodeParms\' array with multiple elements ' +
             'not supported.');
      }
      decodeParams = xref.fetchIfRef(decodeParams[0]);
    }
    if (decodeParams && decodeParams.has('JBIG2Globals')) {
      var globalsStream = decodeParams.get('JBIG2Globals');
      var globals = globalsStream.getBytes();
      chunks.push({data: globals, start: 0, end: globals.length});
    }
    chunks.push({data: this.bytes, start: 0, end: this.bytes.length});
    var data = jbig2Image.parseChunks(chunks);
    var dataLength = data.length;

    // JBIG2 had black as 1 and white as 0, inverting the colors
    for (var i = 0; i < dataLength; i++) {
      data[i] ^= 0xFF;
    }

    this.buffer = data;
    this.bufferLength = dataLength;
    this.eof = true;
  };

  return Jbig2Stream;
})();

var DecryptStream = (function DecryptStreamClosure() {
  function DecryptStream(str, maybeLength, decrypt) {
    this.str = str;
    this.dict = str.dict;
    this.decrypt = decrypt;
    this.nextChunk = null;
    this.initialized = false;

    DecodeStream.call(this, maybeLength);
  }

  var chunkSize = 512;

  DecryptStream.prototype = Object.create(DecodeStream.prototype);

  DecryptStream.prototype.readBlock = function DecryptStream_readBlock() {
    var chunk;
    if (this.initialized) {
      chunk = this.nextChunk;
    } else {
      chunk = this.str.getBytes(chunkSize);
      this.initialized = true;
    }
    if (!chunk || chunk.length === 0) {
      this.eof = true;
      return;
    }
    this.nextChunk = this.str.getBytes(chunkSize);
    var hasMoreData = this.nextChunk && this.nextChunk.length > 0;

    var decrypt = this.decrypt;
    chunk = decrypt(chunk, !hasMoreData);

    var bufferLength = this.bufferLength;
    var i, n = chunk.length;
    var buffer = this.ensureBuffer(bufferLength + n);
    for (i = 0; i < n; i++) {
      buffer[bufferLength++] = chunk[i];
    }
    this.bufferLength = bufferLength;
  };

  return DecryptStream;
})();

var Ascii85Stream = (function Ascii85StreamClosure() {
  function Ascii85Stream(str, maybeLength) {
    this.str = str;
    this.dict = str.dict;
    this.input = new Uint8Array(5);

    // Most streams increase in size when decoded, but Ascii85 streams
    // typically shrink by ~20%.
    if (maybeLength) {
      maybeLength = 0.8 * maybeLength;
    }
    DecodeStream.call(this, maybeLength);
  }

  Ascii85Stream.prototype = Object.create(DecodeStream.prototype);

  Ascii85Stream.prototype.readBlock = function Ascii85Stream_readBlock() {
    var TILDA_CHAR = 0x7E; // '~'
    var Z_LOWER_CHAR = 0x7A; // 'z'
    var EOF = -1;

    var str = this.str;

    var c = str.getByte();
    while (Lexer.isSpace(c)) {
      c = str.getByte();
    }

    if (c === EOF || c === TILDA_CHAR) {
      this.eof = true;
      return;
    }

    var bufferLength = this.bufferLength, buffer;
    var i;

    // special code for z
    if (c === Z_LOWER_CHAR) {
      buffer = this.ensureBuffer(bufferLength + 4);
      for (i = 0; i < 4; ++i) {
        buffer[bufferLength + i] = 0;
      }
      this.bufferLength += 4;
    } else {
      var input = this.input;
      input[0] = c;
      for (i = 1; i < 5; ++i) {
        c = str.getByte();
        while (Lexer.isSpace(c)) {
          c = str.getByte();
        }

        input[i] = c;

        if (c === EOF || c === TILDA_CHAR) {
          break;
        }
      }
      buffer = this.ensureBuffer(bufferLength + i - 1);
      this.bufferLength += i - 1;

      // partial ending;
      if (i < 5) {
        for (; i < 5; ++i) {
          input[i] = 0x21 + 84;
        }
        this.eof = true;
      }
      var t = 0;
      for (i = 0; i < 5; ++i) {
        t = t * 85 + (input[i] - 0x21);
      }

      for (i = 3; i >= 0; --i) {
        buffer[bufferLength + i] = t & 0xFF;
        t >>= 8;
      }
    }
  };

  return Ascii85Stream;
})();

var AsciiHexStream = (function AsciiHexStreamClosure() {
  function AsciiHexStream(str, maybeLength) {
    this.str = str;
    this.dict = str.dict;

    this.firstDigit = -1;

    // Most streams increase in size when decoded, but AsciiHex streams shrink
    // by 50%.
    if (maybeLength) {
      maybeLength = 0.5 * maybeLength;
    }
    DecodeStream.call(this, maybeLength);
  }

  AsciiHexStream.prototype = Object.create(DecodeStream.prototype);

  AsciiHexStream.prototype.readBlock = function AsciiHexStream_readBlock() {
    var UPSTREAM_BLOCK_SIZE = 8000;
    var bytes = this.str.getBytes(UPSTREAM_BLOCK_SIZE);
    if (!bytes.length) {
      this.eof = true;
      return;
    }

    var maxDecodeLength = (bytes.length + 1) >> 1;
    var buffer = this.ensureBuffer(this.bufferLength + maxDecodeLength);
    var bufferLength = this.bufferLength;

    var firstDigit = this.firstDigit;
    for (var i = 0, ii = bytes.length; i < ii; i++) {
      var ch = bytes[i], digit;
      if (ch >= 0x30 && ch <= 0x39) { // '0'-'9'
        digit = ch & 0x0F;
      } else if ((ch >= 0x41 && ch <= 0x46) || (ch >= 0x61 && ch <= 0x66)) {
        // 'A'-'Z', 'a'-'z'
        digit = (ch & 0x0F) + 9;
      } else if (ch === 0x3E) { // '>'
        this.eof = true;
        break;
      } else { // probably whitespace
        continue; // ignoring
      }
      if (firstDigit < 0) {
        firstDigit = digit;
      } else {
        buffer[bufferLength++] = (firstDigit << 4) | digit;
        firstDigit = -1;
      }
    }
    if (firstDigit >= 0 && this.eof) {
      // incomplete byte
      buffer[bufferLength++] = (firstDigit << 4);
      firstDigit = -1;
    }
    this.firstDigit = firstDigit;
    this.bufferLength = bufferLength;
  };

  return AsciiHexStream;
})();

var RunLengthStream = (function RunLengthStreamClosure() {
  function RunLengthStream(str, maybeLength) {
    this.str = str;
    this.dict = str.dict;

    DecodeStream.call(this, maybeLength);
  }

  RunLengthStream.prototype = Object.create(DecodeStream.prototype);

  RunLengthStream.prototype.readBlock = function RunLengthStream_readBlock() {
    // The repeatHeader has following format. The first byte defines type of run
    // and amount of bytes to repeat/copy: n = 0 through 127 - copy next n bytes
    // (in addition to the second byte from the header), n = 129 through 255 -
    // duplicate the second byte from the header (257 - n) times, n = 128 - end.
    var repeatHeader = this.str.getBytes(2);
    if (!repeatHeader || repeatHeader.length < 2 || repeatHeader[0] === 128) {
      this.eof = true;
      return;
    }

    var buffer;
    var bufferLength = this.bufferLength;
    var n = repeatHeader[0];
    if (n < 128) {
      // copy n bytes
      buffer = this.ensureBuffer(bufferLength + n + 1);
      buffer[bufferLength++] = repeatHeader[1];
      if (n > 0) {
        var source = this.str.getBytes(n);
        buffer.set(source, bufferLength);
        bufferLength += n;
      }
    } else {
      n = 257 - n;
      var b = repeatHeader[1];
      buffer = this.ensureBuffer(bufferLength + n + 1);
      for (var i = 0; i < n; i++) {
        buffer[bufferLength++] = b;
      }
    }
    this.bufferLength = bufferLength;
  };

  return RunLengthStream;
})();

var CCITTFaxStream = (function CCITTFaxStreamClosure() {

  var ccittEOL = -2;
  var twoDimPass = 0;
  var twoDimHoriz = 1;
  var twoDimVert0 = 2;
  var twoDimVertR1 = 3;
  var twoDimVertL1 = 4;
  var twoDimVertR2 = 5;
  var twoDimVertL2 = 6;
  var twoDimVertR3 = 7;
  var twoDimVertL3 = 8;

  var twoDimTable = [
    [-1, -1], [-1, -1],                   // 000000x
    [7, twoDimVertL3],                    // 0000010
    [7, twoDimVertR3],                    // 0000011
    [6, twoDimVertL2], [6, twoDimVertL2], // 000010x
    [6, twoDimVertR2], [6, twoDimVertR2], // 000011x
    [4, twoDimPass], [4, twoDimPass],     // 0001xxx
    [4, twoDimPass], [4, twoDimPass],
    [4, twoDimPass], [4, twoDimPass],
    [4, twoDimPass], [4, twoDimPass],
    [3, twoDimHoriz], [3, twoDimHoriz],   // 001xxxx
    [3, twoDimHoriz], [3, twoDimHoriz],
    [3, twoDimHoriz], [3, twoDimHoriz],
    [3, twoDimHoriz], [3, twoDimHoriz],
    [3, twoDimHoriz], [3, twoDimHoriz],
    [3, twoDimHoriz], [3, twoDimHoriz],
    [3, twoDimHoriz], [3, twoDimHoriz],
    [3, twoDimHoriz], [3, twoDimHoriz],
    [3, twoDimVertL1], [3, twoDimVertL1], // 010xxxx
    [3, twoDimVertL1], [3, twoDimVertL1],
    [3, twoDimVertL1], [3, twoDimVertL1],
    [3, twoDimVertL1], [3, twoDimVertL1],
    [3, twoDimVertL1], [3, twoDimVertL1],
    [3, twoDimVertL1], [3, twoDimVertL1],
    [3, twoDimVertL1], [3, twoDimVertL1],
    [3, twoDimVertL1], [3, twoDimVertL1],
    [3, twoDimVertR1], [3, twoDimVertR1], // 011xxxx
    [3, twoDimVertR1], [3, twoDimVertR1],
    [3, twoDimVertR1], [3, twoDimVertR1],
    [3, twoDimVertR1], [3, twoDimVertR1],
    [3, twoDimVertR1], [3, twoDimVertR1],
    [3, twoDimVertR1], [3, twoDimVertR1],
    [3, twoDimVertR1], [3, twoDimVertR1],
    [3, twoDimVertR1], [3, twoDimVertR1],
    [1, twoDimVert0], [1, twoDimVert0],   // 1xxxxxx
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0],
    [1, twoDimVert0], [1, twoDimVert0]
  ];

  var whiteTable1 = [
    [-1, -1],                               // 00000
    [12, ccittEOL],                         // 00001
    [-1, -1], [-1, -1],                     // 0001x
    [-1, -1], [-1, -1], [-1, -1], [-1, -1], // 001xx
    [-1, -1], [-1, -1], [-1, -1], [-1, -1], // 010xx
    [-1, -1], [-1, -1], [-1, -1], [-1, -1], // 011xx
    [11, 1792], [11, 1792],                 // 1000x
    [12, 1984],                             // 10010
    [12, 2048],                             // 10011
    [12, 2112],                             // 10100
    [12, 2176],                             // 10101
    [12, 2240],                             // 10110
    [12, 2304],                             // 10111
    [11, 1856], [11, 1856],                 // 1100x
    [11, 1920], [11, 1920],                 // 1101x
    [12, 2368],                             // 11100
    [12, 2432],                             // 11101
    [12, 2496],                             // 11110
    [12, 2560]                              // 11111
  ];

  var whiteTable2 = [
    [-1, -1], [-1, -1], [-1, -1], [-1, -1],     // 0000000xx
    [8, 29], [8, 29],                           // 00000010x
    [8, 30], [8, 30],                           // 00000011x
    [8, 45], [8, 45],                           // 00000100x
    [8, 46], [8, 46],                           // 00000101x
    [7, 22], [7, 22], [7, 22], [7, 22],         // 0000011xx
    [7, 23], [7, 23], [7, 23], [7, 23],         // 0000100xx
    [8, 47], [8, 47],                           // 00001010x
    [8, 48], [8, 48],                           // 00001011x
    [6, 13], [6, 13], [6, 13], [6, 13],         // 000011xxx
    [6, 13], [6, 13], [6, 13], [6, 13],
    [7, 20], [7, 20], [7, 20], [7, 20],         // 0001000xx
    [8, 33], [8, 33],                           // 00010010x
    [8, 34], [8, 34],                           // 00010011x
    [8, 35], [8, 35],                           // 00010100x
    [8, 36], [8, 36],                           // 00010101x
    [8, 37], [8, 37],                           // 00010110x
    [8, 38], [8, 38],                           // 00010111x
    [7, 19], [7, 19], [7, 19], [7, 19],         // 0001100xx
    [8, 31], [8, 31],                           // 00011010x
    [8, 32], [8, 32],                           // 00011011x
    [6, 1], [6, 1], [6, 1], [6, 1],             // 000111xxx
    [6, 1], [6, 1], [6, 1], [6, 1],
    [6, 12], [6, 12], [6, 12], [6, 12],         // 001000xxx
    [6, 12], [6, 12], [6, 12], [6, 12],
    [8, 53], [8, 53],                           // 00100100x
    [8, 54], [8, 54],                           // 00100101x
    [7, 26], [7, 26], [7, 26], [7, 26],         // 0010011xx
    [8, 39], [8, 39],                           // 00101000x
    [8, 40], [8, 40],                           // 00101001x
    [8, 41], [8, 41],                           // 00101010x
    [8, 42], [8, 42],                           // 00101011x
    [8, 43], [8, 43],                           // 00101100x
    [8, 44], [8, 44],                           // 00101101x
    [7, 21], [7, 21], [7, 21], [7, 21],         // 0010111xx
    [7, 28], [7, 28], [7, 28], [7, 28],         // 0011000xx
    [8, 61], [8, 61],                           // 00110010x
    [8, 62], [8, 62],                           // 00110011x
    [8, 63], [8, 63],                           // 00110100x
    [8, 0], [8, 0],                             // 00110101x
    [8, 320], [8, 320],                         // 00110110x
    [8, 384], [8, 384],                         // 00110111x
    [5, 10], [5, 10], [5, 10], [5, 10],         // 00111xxxx
    [5, 10], [5, 10], [5, 10], [5, 10],
    [5, 10], [5, 10], [5, 10], [5, 10],
    [5, 10], [5, 10], [5, 10], [5, 10],
    [5, 11], [5, 11], [5, 11], [5, 11],         // 01000xxxx
    [5, 11], [5, 11], [5, 11], [5, 11],
    [5, 11], [5, 11], [5, 11], [5, 11],
    [5, 11], [5, 11], [5, 11], [5, 11],
    [7, 27], [7, 27], [7, 27], [7, 27],         // 0100100xx
    [8, 59], [8, 59],                           // 01001010x
    [8, 60], [8, 60],                           // 01001011x
    [9, 1472],                                  // 010011000
    [9, 1536],                                  // 010011001
    [9, 1600],                                  // 010011010
    [9, 1728],                                  // 010011011
    [7, 18], [7, 18], [7, 18], [7, 18],         // 0100111xx
    [7, 24], [7, 24], [7, 24], [7, 24],         // 0101000xx
    [8, 49], [8, 49],                           // 01010010x
    [8, 50], [8, 50],                           // 01010011x
    [8, 51], [8, 51],                           // 01010100x
    [8, 52], [8, 52],                           // 01010101x
    [7, 25], [7, 25], [7, 25], [7, 25],         // 0101011xx
    [8, 55], [8, 55],                           // 01011000x
    [8, 56], [8, 56],                           // 01011001x
    [8, 57], [8, 57],                           // 01011010x
    [8, 58], [8, 58],                           // 01011011x
    [6, 192], [6, 192], [6, 192], [6, 192],     // 010111xxx
    [6, 192], [6, 192], [6, 192], [6, 192],
    [6, 1664], [6, 1664], [6, 1664], [6, 1664], // 011000xxx
    [6, 1664], [6, 1664], [6, 1664], [6, 1664],
    [8, 448], [8, 448],                         // 01100100x
    [8, 512], [8, 512],                         // 01100101x
    [9, 704],                                   // 011001100
    [9, 768],                                   // 011001101
    [8, 640], [8, 640],                         // 01100111x
    [8, 576], [8, 576],                         // 01101000x
    [9, 832],                                   // 011010010
    [9, 896],                                   // 011010011
    [9, 960],                                   // 011010100
    [9, 1024],                                  // 011010101
    [9, 1088],                                  // 011010110
    [9, 1152],                                  // 011010111
    [9, 1216],                                  // 011011000
    [9, 1280],                                  // 011011001
    [9, 1344],                                  // 011011010
    [9, 1408],                                  // 011011011
    [7, 256], [7, 256], [7, 256], [7, 256],     // 0110111xx
    [4, 2], [4, 2], [4, 2], [4, 2],             // 0111xxxxx
    [4, 2], [4, 2], [4, 2], [4, 2],
    [4, 2], [4, 2], [4, 2], [4, 2],
    [4, 2], [4, 2], [4, 2], [4, 2],
    [4, 2], [4, 2], [4, 2], [4, 2],
    [4, 2], [4, 2], [4, 2], [4, 2],
    [4, 2], [4, 2], [4, 2], [4, 2],
    [4, 2], [4, 2], [4, 2], [4, 2],
    [4, 3], [4, 3], [4, 3], [4, 3],             // 1000xxxxx
    [4, 3], [4, 3], [4, 3], [4, 3],
    [4, 3], [4, 3], [4, 3], [4, 3],
    [4, 3], [4, 3], [4, 3], [4, 3],
    [4, 3], [4, 3], [4, 3], [4, 3],
    [4, 3], [4, 3], [4, 3], [4, 3],
    [4, 3], [4, 3], [4, 3], [4, 3],
    [4, 3], [4, 3], [4, 3], [4, 3],
    [5, 128], [5, 128], [5, 128], [5, 128],     // 10010xxxx
    [5, 128], [5, 128], [5, 128], [5, 128],
    [5, 128], [5, 128], [5, 128], [5, 128],
    [5, 128], [5, 128], [5, 128], [5, 128],
    [5, 8], [5, 8], [5, 8], [5, 8],             // 10011xxxx
    [5, 8], [5, 8], [5, 8], [5, 8],
    [5, 8], [5, 8], [5, 8], [5, 8],
    [5, 8], [5, 8], [5, 8], [5, 8],
    [5, 9], [5, 9], [5, 9], [5, 9],             // 10100xxxx
    [5, 9], [5, 9], [5, 9], [5, 9],
    [5, 9], [5, 9], [5, 9], [5, 9],
    [5, 9], [5, 9], [5, 9], [5, 9],
    [6, 16], [6, 16], [6, 16], [6, 16],         // 101010xxx
    [6, 16], [6, 16], [6, 16], [6, 16],
    [6, 17], [6, 17], [6, 17], [6, 17],         // 101011xxx
    [6, 17], [6, 17], [6, 17], [6, 17],
    [4, 4], [4, 4], [4, 4], [4, 4],             // 1011xxxxx
    [4, 4], [4, 4], [4, 4], [4, 4],
    [4, 4], [4, 4], [4, 4], [4, 4],
    [4, 4], [4, 4], [4, 4], [4, 4],
    [4, 4], [4, 4], [4, 4], [4, 4],
    [4, 4], [4, 4], [4, 4], [4, 4],
    [4, 4], [4, 4], [4, 4], [4, 4],
    [4, 4], [4, 4], [4, 4], [4, 4],
    [4, 5], [4, 5], [4, 5], [4, 5],             // 1100xxxxx
    [4, 5], [4, 5], [4, 5], [4, 5],
    [4, 5], [4, 5], [4, 5], [4, 5],
    [4, 5], [4, 5], [4, 5], [4, 5],
    [4, 5], [4, 5], [4, 5], [4, 5],
    [4, 5], [4, 5], [4, 5], [4, 5],
    [4, 5], [4, 5], [4, 5], [4, 5],
    [4, 5], [4, 5], [4, 5], [4, 5],
    [6, 14], [6, 14], [6, 14], [6, 14],         // 110100xxx
    [6, 14], [6, 14], [6, 14], [6, 14],
    [6, 15], [6, 15], [6, 15], [6, 15],         // 110101xxx
    [6, 15], [6, 15], [6, 15], [6, 15],
    [5, 64], [5, 64], [5, 64], [5, 64],         // 11011xxxx
    [5, 64], [5, 64], [5, 64], [5, 64],
    [5, 64], [5, 64], [5, 64], [5, 64],
    [5, 64], [5, 64], [5, 64], [5, 64],
    [4, 6], [4, 6], [4, 6], [4, 6],             // 1110xxxxx
    [4, 6], [4, 6], [4, 6], [4, 6],
    [4, 6], [4, 6], [4, 6], [4, 6],
    [4, 6], [4, 6], [4, 6], [4, 6],
    [4, 6], [4, 6], [4, 6], [4, 6],
    [4, 6], [4, 6], [4, 6], [4, 6],
    [4, 6], [4, 6], [4, 6], [4, 6],
    [4, 6], [4, 6], [4, 6], [4, 6],
    [4, 7], [4, 7], [4, 7], [4, 7],             // 1111xxxxx
    [4, 7], [4, 7], [4, 7], [4, 7],
    [4, 7], [4, 7], [4, 7], [4, 7],
    [4, 7], [4, 7], [4, 7], [4, 7],
    [4, 7], [4, 7], [4, 7], [4, 7],
    [4, 7], [4, 7], [4, 7], [4, 7],
    [4, 7], [4, 7], [4, 7], [4, 7],
    [4, 7], [4, 7], [4, 7], [4, 7]
  ];

  var blackTable1 = [
    [-1, -1], [-1, -1],                             // 000000000000x
    [12, ccittEOL], [12, ccittEOL],                 // 000000000001x
    [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000001xx
    [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000010xx
    [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000011xx
    [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000100xx
    [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000101xx
    [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000110xx
    [-1, -1], [-1, -1], [-1, -1], [-1, -1],         // 00000000111xx
    [11, 1792], [11, 1792], [11, 1792], [11, 1792], // 00000001000xx
    [12, 1984], [12, 1984],                         // 000000010010x
    [12, 2048], [12, 2048],                         // 000000010011x
    [12, 2112], [12, 2112],                         // 000000010100x
    [12, 2176], [12, 2176],                         // 000000010101x
    [12, 2240], [12, 2240],                         // 000000010110x
    [12, 2304], [12, 2304],                         // 000000010111x
    [11, 1856], [11, 1856], [11, 1856], [11, 1856], // 00000001100xx
    [11, 1920], [11, 1920], [11, 1920], [11, 1920], // 00000001101xx
    [12, 2368], [12, 2368],                         // 000000011100x
    [12, 2432], [12, 2432],                         // 000000011101x
    [12, 2496], [12, 2496],                         // 000000011110x
    [12, 2560], [12, 2560],                         // 000000011111x
    [10, 18], [10, 18], [10, 18], [10, 18],         // 0000001000xxx
    [10, 18], [10, 18], [10, 18], [10, 18],
    [12, 52], [12, 52],                             // 000000100100x
    [13, 640],                                      // 0000001001010
    [13, 704],                                      // 0000001001011
    [13, 768],                                      // 0000001001100
    [13, 832],                                      // 0000001001101
    [12, 55], [12, 55],                             // 000000100111x
    [12, 56], [12, 56],                             // 000000101000x
    [13, 1280],                                     // 0000001010010
    [13, 1344],                                     // 0000001010011
    [13, 1408],                                     // 0000001010100
    [13, 1472],                                     // 0000001010101
    [12, 59], [12, 59],                             // 000000101011x
    [12, 60], [12, 60],                             // 000000101100x
    [13, 1536],                                     // 0000001011010
    [13, 1600],                                     // 0000001011011
    [11, 24], [11, 24], [11, 24], [11, 24],         // 00000010111xx
    [11, 25], [11, 25], [11, 25], [11, 25],         // 00000011000xx
    [13, 1664],                                     // 0000001100100
    [13, 1728],                                     // 0000001100101
    [12, 320], [12, 320],                           // 000000110011x
    [12, 384], [12, 384],                           // 000000110100x
    [12, 448], [12, 448],                           // 000000110101x
    [13, 512],                                      // 0000001101100
    [13, 576],                                      // 0000001101101
    [12, 53], [12, 53],                             // 000000110111x
    [12, 54], [12, 54],                             // 000000111000x
    [13, 896],                                      // 0000001110010
    [13, 960],                                      // 0000001110011
    [13, 1024],                                     // 0000001110100
    [13, 1088],                                     // 0000001110101
    [13, 1152],                                     // 0000001110110
    [13, 1216],                                     // 0000001110111
    [10, 64], [10, 64], [10, 64], [10, 64],         // 0000001111xxx
    [10, 64], [10, 64], [10, 64], [10, 64]
  ];

  var blackTable2 = [
    [8, 13], [8, 13], [8, 13], [8, 13],     // 00000100xxxx
    [8, 13], [8, 13], [8, 13], [8, 13],
    [8, 13], [8, 13], [8, 13], [8, 13],
    [8, 13], [8, 13], [8, 13], [8, 13],
    [11, 23], [11, 23],                     // 00000101000x
    [12, 50],                               // 000001010010
    [12, 51],                               // 000001010011
    [12, 44],                               // 000001010100
    [12, 45],                               // 000001010101
    [12, 46],                               // 000001010110
    [12, 47],                               // 000001010111
    [12, 57],                               // 000001011000
    [12, 58],                               // 000001011001
    [12, 61],                               // 000001011010
    [12, 256],                              // 000001011011
    [10, 16], [10, 16], [10, 16], [10, 16], // 0000010111xx
    [10, 17], [10, 17], [10, 17], [10, 17], // 0000011000xx
    [12, 48],                               // 000001100100
    [12, 49],                               // 000001100101
    [12, 62],                               // 000001100110
    [12, 63],                               // 000001100111
    [12, 30],                               // 000001101000
    [12, 31],                               // 000001101001
    [12, 32],                               // 000001101010
    [12, 33],                               // 000001101011
    [12, 40],                               // 000001101100
    [12, 41],                               // 000001101101
    [11, 22], [11, 22],                     // 00000110111x
    [8, 14], [8, 14], [8, 14], [8, 14],     // 00000111xxxx
    [8, 14], [8, 14], [8, 14], [8, 14],
    [8, 14], [8, 14], [8, 14], [8, 14],
    [8, 14], [8, 14], [8, 14], [8, 14],
    [7, 10], [7, 10], [7, 10], [7, 10],     // 0000100xxxxx
    [7, 10], [7, 10], [7, 10], [7, 10],
    [7, 10], [7, 10], [7, 10], [7, 10],
    [7, 10], [7, 10], [7, 10], [7, 10],
    [7, 10], [7, 10], [7, 10], [7, 10],
    [7, 10], [7, 10], [7, 10], [7, 10],
    [7, 10], [7, 10], [7, 10], [7, 10],
    [7, 10], [7, 10], [7, 10], [7, 10],
    [7, 11], [7, 11], [7, 11], [7, 11],     // 0000101xxxxx
    [7, 11], [7, 11], [7, 11], [7, 11],
    [7, 11], [7, 11], [7, 11], [7, 11],
    [7, 11], [7, 11], [7, 11], [7, 11],
    [7, 11], [7, 11], [7, 11], [7, 11],
    [7, 11], [7, 11], [7, 11], [7, 11],
    [7, 11], [7, 11], [7, 11], [7, 11],
    [7, 11], [7, 11], [7, 11], [7, 11],
    [9, 15], [9, 15], [9, 15], [9, 15],     // 000011000xxx
    [9, 15], [9, 15], [9, 15], [9, 15],
    [12, 128],                              // 000011001000
    [12, 192],                              // 000011001001
    [12, 26],                               // 000011001010
    [12, 27],                               // 000011001011
    [12, 28],                               // 000011001100
    [12, 29],                               // 000011001101
    [11, 19], [11, 19],                     // 00001100111x
    [11, 20], [11, 20],                     // 00001101000x
    [12, 34],                               // 000011010010
    [12, 35],                               // 000011010011
    [12, 36],                               // 000011010100
    [12, 37],                               // 000011010101
    [12, 38],                               // 000011010110
    [12, 39],                               // 000011010111
    [11, 21], [11, 21],                     // 00001101100x
    [12, 42],                               // 000011011010
    [12, 43],                               // 000011011011
    [10, 0], [10, 0], [10, 0], [10, 0],     // 0000110111xx
    [7, 12], [7, 12], [7, 12], [7, 12],     // 0000111xxxxx
    [7, 12], [7, 12], [7, 12], [7, 12],
    [7, 12], [7, 12], [7, 12], [7, 12],
    [7, 12], [7, 12], [7, 12], [7, 12],
    [7, 12], [7, 12], [7, 12], [7, 12],
    [7, 12], [7, 12], [7, 12], [7, 12],
    [7, 12], [7, 12], [7, 12], [7, 12],
    [7, 12], [7, 12], [7, 12], [7, 12]
  ];

  var blackTable3 = [
    [-1, -1], [-1, -1], [-1, -1], [-1, -1], // 0000xx
    [6, 9],                                 // 000100
    [6, 8],                                 // 000101
    [5, 7], [5, 7],                         // 00011x
    [4, 6], [4, 6], [4, 6], [4, 6],         // 0010xx
    [4, 5], [4, 5], [4, 5], [4, 5],         // 0011xx
    [3, 1], [3, 1], [3, 1], [3, 1],         // 010xxx
    [3, 1], [3, 1], [3, 1], [3, 1],
    [3, 4], [3, 4], [3, 4], [3, 4],         // 011xxx
    [3, 4], [3, 4], [3, 4], [3, 4],
    [2, 3], [2, 3], [2, 3], [2, 3],         // 10xxxx
    [2, 3], [2, 3], [2, 3], [2, 3],
    [2, 3], [2, 3], [2, 3], [2, 3],
    [2, 3], [2, 3], [2, 3], [2, 3],
    [2, 2], [2, 2], [2, 2], [2, 2],         // 11xxxx
    [2, 2], [2, 2], [2, 2], [2, 2],
    [2, 2], [2, 2], [2, 2], [2, 2],
    [2, 2], [2, 2], [2, 2], [2, 2]
  ];

  function CCITTFaxStream(str, maybeLength, params) {
    this.str = str;
    this.dict = str.dict;

    params = params || Dict.empty;

    this.encoding = params.get('K') || 0;
    this.eoline = params.get('EndOfLine') || false;
    this.byteAlign = params.get('EncodedByteAlign') || false;
    this.columns = params.get('Columns') || 1728;
    this.rows = params.get('Rows') || 0;
    var eoblock = params.get('EndOfBlock');
    if (eoblock === null || eoblock === undefined) {
      eoblock = true;
    }
    this.eoblock = eoblock;
    this.black = params.get('BlackIs1') || false;

    this.codingLine = new Uint32Array(this.columns + 1);
    this.refLine = new Uint32Array(this.columns + 2);

    this.codingLine[0] = this.columns;
    this.codingPos = 0;

    this.row = 0;
    this.nextLine2D = this.encoding < 0;
    this.inputBits = 0;
    this.inputBuf = 0;
    this.outputBits = 0;

    var code1;
    while ((code1 = this.lookBits(12)) === 0) {
      this.eatBits(1);
    }
    if (code1 === 1) {
      this.eatBits(12);
    }
    if (this.encoding > 0) {
      this.nextLine2D = !this.lookBits(1);
      this.eatBits(1);
    }

    DecodeStream.call(this, maybeLength);
  }

  CCITTFaxStream.prototype = Object.create(DecodeStream.prototype);

  CCITTFaxStream.prototype.readBlock = function CCITTFaxStream_readBlock() {
    while (!this.eof) {
      var c = this.lookChar();
      this.ensureBuffer(this.bufferLength + 1);
      this.buffer[this.bufferLength++] = c;
    }
  };

  CCITTFaxStream.prototype.addPixels =
      function ccittFaxStreamAddPixels(a1, blackPixels) {
    var codingLine = this.codingLine;
    var codingPos = this.codingPos;

    if (a1 > codingLine[codingPos]) {
      if (a1 > this.columns) {
        info('row is wrong length');
        this.err = true;
        a1 = this.columns;
      }
      if ((codingPos & 1) ^ blackPixels) {
        ++codingPos;
      }

      codingLine[codingPos] = a1;
    }
    this.codingPos = codingPos;
  };

  CCITTFaxStream.prototype.addPixelsNeg =
      function ccittFaxStreamAddPixelsNeg(a1, blackPixels) {
    var codingLine = this.codingLine;
    var codingPos = this.codingPos;

    if (a1 > codingLine[codingPos]) {
      if (a1 > this.columns) {
        info('row is wrong length');
        this.err = true;
        a1 = this.columns;
      }
      if ((codingPos & 1) ^ blackPixels) {
        ++codingPos;
      }

      codingLine[codingPos] = a1;
    } else if (a1 < codingLine[codingPos]) {
      if (a1 < 0) {
        info('invalid code');
        this.err = true;
        a1 = 0;
      }
      while (codingPos > 0 && a1 < codingLine[codingPos - 1]) {
        --codingPos;
      }
      codingLine[codingPos] = a1;
    }

    this.codingPos = codingPos;
  };

  CCITTFaxStream.prototype.lookChar = function CCITTFaxStream_lookChar() {
    var refLine = this.refLine;
    var codingLine = this.codingLine;
    var columns = this.columns;

    var refPos, blackPixels, bits, i;

    if (this.outputBits === 0) {
      if (this.eof) {
        return null;
      }
      this.err = false;

      var code1, code2, code3;
      if (this.nextLine2D) {
        for (i = 0; codingLine[i] < columns; ++i) {
          refLine[i] = codingLine[i];
        }
        refLine[i++] = columns;
        refLine[i] = columns;
        codingLine[0] = 0;
        this.codingPos = 0;
        refPos = 0;
        blackPixels = 0;

        while (codingLine[this.codingPos] < columns) {
          code1 = this.getTwoDimCode();
          switch (code1) {
            case twoDimPass:
              this.addPixels(refLine[refPos + 1], blackPixels);
              if (refLine[refPos + 1] < columns) {
                refPos += 2;
              }
              break;
            case twoDimHoriz:
              code1 = code2 = 0;
              if (blackPixels) {
                do {
                  code1 += (code3 = this.getBlackCode());
                } while (code3 >= 64);
                do {
                  code2 += (code3 = this.getWhiteCode());
                } while (code3 >= 64);
              } else {
                do {
                  code1 += (code3 = this.getWhiteCode());
                } while (code3 >= 64);
                do {
                  code2 += (code3 = this.getBlackCode());
                } while (code3 >= 64);
              }
              this.addPixels(codingLine[this.codingPos] +
                             code1, blackPixels);
              if (codingLine[this.codingPos] < columns) {
                this.addPixels(codingLine[this.codingPos] + code2,
                               blackPixels ^ 1);
              }
              while (refLine[refPos] <= codingLine[this.codingPos] &&
                     refLine[refPos] < columns) {
                refPos += 2;
              }
              break;
            case twoDimVertR3:
              this.addPixels(refLine[refPos] + 3, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (refLine[refPos] <= codingLine[this.codingPos] &&
                       refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertR2:
              this.addPixels(refLine[refPos] + 2, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (refLine[refPos] <= codingLine[this.codingPos] &&
                       refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertR1:
              this.addPixels(refLine[refPos] + 1, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (refLine[refPos] <= codingLine[this.codingPos] &&
                       refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVert0:
              this.addPixels(refLine[refPos], blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                ++refPos;
                while (refLine[refPos] <= codingLine[this.codingPos] &&
                       refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertL3:
              this.addPixelsNeg(refLine[refPos] - 3, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                if (refPos > 0) {
                  --refPos;
                } else {
                  ++refPos;
                }
                while (refLine[refPos] <= codingLine[this.codingPos] &&
                       refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertL2:
              this.addPixelsNeg(refLine[refPos] - 2, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                if (refPos > 0) {
                  --refPos;
                } else {
                  ++refPos;
                }
                while (refLine[refPos] <= codingLine[this.codingPos] &&
                       refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case twoDimVertL1:
              this.addPixelsNeg(refLine[refPos] - 1, blackPixels);
              blackPixels ^= 1;
              if (codingLine[this.codingPos] < columns) {
                if (refPos > 0) {
                  --refPos;
                } else {
                  ++refPos;
                }
                while (refLine[refPos] <= codingLine[this.codingPos] &&
                       refLine[refPos] < columns) {
                  refPos += 2;
                }
              }
              break;
            case EOF:
              this.addPixels(columns, 0);
              this.eof = true;
              break;
            default:
              info('bad 2d code');
              this.addPixels(columns, 0);
              this.err = true;
          }
        }
      } else {
        codingLine[0] = 0;
        this.codingPos = 0;
        blackPixels = 0;
        while (codingLine[this.codingPos] < columns) {
          code1 = 0;
          if (blackPixels) {
            do {
              code1 += (code3 = this.getBlackCode());
            } while (code3 >= 64);
          } else {
            do {
              code1 += (code3 = this.getWhiteCode());
            } while (code3 >= 64);
          }
          this.addPixels(codingLine[this.codingPos] + code1, blackPixels);
          blackPixels ^= 1;
        }
      }

      var gotEOL = false;

      if (this.byteAlign) {
        this.inputBits &= ~7;
      }

      if (!this.eoblock && this.row === this.rows - 1) {
        this.eof = true;
      } else {
        code1 = this.lookBits(12);
        if (this.eoline) {
          while (code1 !== EOF && code1 !== 1) {
            this.eatBits(1);
            code1 = this.lookBits(12);
          }
        } else {
          while (code1 === 0) {
            this.eatBits(1);
            code1 = this.lookBits(12);
          }
        }
        if (code1 === 1) {
          this.eatBits(12);
          gotEOL = true;
        } else if (code1 === EOF) {
          this.eof = true;
        }
      }

      if (!this.eof && this.encoding > 0) {
        this.nextLine2D = !this.lookBits(1);
        this.eatBits(1);
      }

      if (this.eoblock && gotEOL && this.byteAlign) {
        code1 = this.lookBits(12);
        if (code1 === 1) {
          this.eatBits(12);
          if (this.encoding > 0) {
            this.lookBits(1);
            this.eatBits(1);
          }
          if (this.encoding >= 0) {
            for (i = 0; i < 4; ++i) {
              code1 = this.lookBits(12);
              if (code1 !== 1) {
                info('bad rtc code: ' + code1);
              }
              this.eatBits(12);
              if (this.encoding > 0) {
                this.lookBits(1);
                this.eatBits(1);
              }
            }
          }
          this.eof = true;
        }
      } else if (this.err && this.eoline) {
        while (true) {
          code1 = this.lookBits(13);
          if (code1 === EOF) {
            this.eof = true;
            return null;
          }
          if ((code1 >> 1) === 1) {
            break;
          }
          this.eatBits(1);
        }
        this.eatBits(12);
        if (this.encoding > 0) {
          this.eatBits(1);
          this.nextLine2D = !(code1 & 1);
        }
      }

      if (codingLine[0] > 0) {
        this.outputBits = codingLine[this.codingPos = 0];
      } else {
        this.outputBits = codingLine[this.codingPos = 1];
      }
      this.row++;
    }

    var c;
    if (this.outputBits >= 8) {
      c = (this.codingPos & 1) ? 0 : 0xFF;
      this.outputBits -= 8;
      if (this.outputBits === 0 && codingLine[this.codingPos] < columns) {
        this.codingPos++;
        this.outputBits = (codingLine[this.codingPos] -
                           codingLine[this.codingPos - 1]);
      }
    } else {
      bits = 8;
      c = 0;
      do {
        if (this.outputBits > bits) {
          c <<= bits;
          if (!(this.codingPos & 1)) {
            c |= 0xFF >> (8 - bits);
          }
          this.outputBits -= bits;
          bits = 0;
        } else {
          c <<= this.outputBits;
          if (!(this.codingPos & 1)) {
            c |= 0xFF >> (8 - this.outputBits);
          }
          bits -= this.outputBits;
          this.outputBits = 0;
          if (codingLine[this.codingPos] < columns) {
            this.codingPos++;
            this.outputBits = (codingLine[this.codingPos] -
                               codingLine[this.codingPos - 1]);
          } else if (bits > 0) {
            c <<= bits;
            bits = 0;
          }
        }
      } while (bits);
    }
    if (this.black) {
      c ^= 0xFF;
    }
    return c;
  };

  // This functions returns the code found from the table.
  // The start and end parameters set the boundaries for searching the table.
  // The limit parameter is optional. Function returns an array with three
  // values. The first array element indicates whether a valid code is being
  // returned. The second array element is the actual code. The third array
  // element indicates whether EOF was reached.
  CCITTFaxStream.prototype.findTableCode =
      function ccittFaxStreamFindTableCode(start, end, table, limit) {

    var limitValue = limit || 0;
    for (var i = start; i <= end; ++i) {
      var code = this.lookBits(i);
      if (code === EOF) {
        return [true, 1, false];
      }
      if (i < end) {
        code <<= end - i;
      }
      if (!limitValue || code >= limitValue) {
        var p = table[code - limitValue];
        if (p[0] === i) {
          this.eatBits(i);
          return [true, p[1], true];
        }
      }
    }
    return [false, 0, false];
  };

  CCITTFaxStream.prototype.getTwoDimCode =
      function ccittFaxStreamGetTwoDimCode() {

    var code = 0;
    var p;
    if (this.eoblock) {
      code = this.lookBits(7);
      p = twoDimTable[code];
      if (p && p[0] > 0) {
        this.eatBits(p[0]);
        return p[1];
      }
    } else {
      var result = this.findTableCode(1, 7, twoDimTable);
      if (result[0] && result[2]) {
        return result[1];
      }
    }
    info('Bad two dim code');
    return EOF;
  };

  CCITTFaxStream.prototype.getWhiteCode =
      function ccittFaxStreamGetWhiteCode() {

    var code = 0;
    var p;
    if (this.eoblock) {
      code = this.lookBits(12);
      if (code === EOF) {
        return 1;
      }

      if ((code >> 5) === 0) {
        p = whiteTable1[code];
      } else {
        p = whiteTable2[code >> 3];
      }

      if (p[0] > 0) {
        this.eatBits(p[0]);
        return p[1];
      }
    } else {
      var result = this.findTableCode(1, 9, whiteTable2);
      if (result[0]) {
        return result[1];
      }

      result = this.findTableCode(11, 12, whiteTable1);
      if (result[0]) {
        return result[1];
      }
    }
    info('bad white code');
    this.eatBits(1);
    return 1;
  };

  CCITTFaxStream.prototype.getBlackCode =
      function ccittFaxStreamGetBlackCode() {

    var code, p;
    if (this.eoblock) {
      code = this.lookBits(13);
      if (code === EOF) {
        return 1;
      }
      if ((code >> 7) === 0) {
        p = blackTable1[code];
      } else if ((code >> 9) === 0 && (code >> 7) !== 0) {
        p = blackTable2[(code >> 1) - 64];
      } else {
        p = blackTable3[code >> 7];
      }

      if (p[0] > 0) {
        this.eatBits(p[0]);
        return p[1];
      }
    } else {
      var result = this.findTableCode(2, 6, blackTable3);
      if (result[0]) {
        return result[1];
      }

      result = this.findTableCode(7, 12, blackTable2, 64);
      if (result[0]) {
        return result[1];
      }

      result = this.findTableCode(10, 13, blackTable1);
      if (result[0]) {
        return result[1];
      }
    }
    info('bad black code');
    this.eatBits(1);
    return 1;
  };

  CCITTFaxStream.prototype.lookBits = function CCITTFaxStream_lookBits(n) {
    var c;
    while (this.inputBits < n) {
      if ((c = this.str.getByte()) === -1) {
        if (this.inputBits === 0) {
          return EOF;
        }
        return ((this.inputBuf << (n - this.inputBits)) &
                (0xFFFF >> (16 - n)));
      }
      this.inputBuf = (this.inputBuf << 8) + c;
      this.inputBits += 8;
    }
    return (this.inputBuf >> (this.inputBits - n)) & (0xFFFF >> (16 - n));
  };

  CCITTFaxStream.prototype.eatBits = function CCITTFaxStream_eatBits(n) {
    if ((this.inputBits -= n) < 0) {
      this.inputBits = 0;
    }
  };

  return CCITTFaxStream;
})();

var LZWStream = (function LZWStreamClosure() {
  function LZWStream(str, maybeLength, earlyChange) {
    this.str = str;
    this.dict = str.dict;
    this.cachedData = 0;
    this.bitsCached = 0;

    var maxLzwDictionarySize = 4096;
    var lzwState = {
      earlyChange: earlyChange,
      codeLength: 9,
      nextCode: 258,
      dictionaryValues: new Uint8Array(maxLzwDictionarySize),
      dictionaryLengths: new Uint16Array(maxLzwDictionarySize),
      dictionaryPrevCodes: new Uint16Array(maxLzwDictionarySize),
      currentSequence: new Uint8Array(maxLzwDictionarySize),
      currentSequenceLength: 0
    };
    for (var i = 0; i < 256; ++i) {
      lzwState.dictionaryValues[i] = i;
      lzwState.dictionaryLengths[i] = 1;
    }
    this.lzwState = lzwState;

    DecodeStream.call(this, maybeLength);
  }

  LZWStream.prototype = Object.create(DecodeStream.prototype);

  LZWStream.prototype.readBits = function LZWStream_readBits(n) {
    var bitsCached = this.bitsCached;
    var cachedData = this.cachedData;
    while (bitsCached < n) {
      var c = this.str.getByte();
      if (c === -1) {
        this.eof = true;
        return null;
      }
      cachedData = (cachedData << 8) | c;
      bitsCached += 8;
    }
    this.bitsCached = (bitsCached -= n);
    this.cachedData = cachedData;
    this.lastCode = null;
    return (cachedData >>> bitsCached) & ((1 << n) - 1);
  };

  LZWStream.prototype.readBlock = function LZWStream_readBlock() {
    var blockSize = 512;
    var estimatedDecodedSize = blockSize * 2, decodedSizeDelta = blockSize;
    var i, j, q;

    var lzwState = this.lzwState;
    if (!lzwState) {
      return; // eof was found
    }

    var earlyChange = lzwState.earlyChange;
    var nextCode = lzwState.nextCode;
    var dictionaryValues = lzwState.dictionaryValues;
    var dictionaryLengths = lzwState.dictionaryLengths;
    var dictionaryPrevCodes = lzwState.dictionaryPrevCodes;
    var codeLength = lzwState.codeLength;
    var prevCode = lzwState.prevCode;
    var currentSequence = lzwState.currentSequence;
    var currentSequenceLength = lzwState.currentSequenceLength;

    var decodedLength = 0;
    var currentBufferLength = this.bufferLength;
    var buffer = this.ensureBuffer(this.bufferLength + estimatedDecodedSize);

    for (i = 0; i < blockSize; i++) {
      var code = this.readBits(codeLength);
      var hasPrev = currentSequenceLength > 0;
      if (code < 256) {
        currentSequence[0] = code;
        currentSequenceLength = 1;
      } else if (code >= 258) {
        if (code < nextCode) {
          currentSequenceLength = dictionaryLengths[code];
          for (j = currentSequenceLength - 1, q = code; j >= 0; j--) {
            currentSequence[j] = dictionaryValues[q];
            q = dictionaryPrevCodes[q];
          }
        } else {
          currentSequence[currentSequenceLength++] = currentSequence[0];
        }
      } else if (code === 256) {
        codeLength = 9;
        nextCode = 258;
        currentSequenceLength = 0;
        continue;
      } else {
        this.eof = true;
        delete this.lzwState;
        break;
      }

      if (hasPrev) {
        dictionaryPrevCodes[nextCode] = prevCode;
        dictionaryLengths[nextCode] = dictionaryLengths[prevCode] + 1;
        dictionaryValues[nextCode] = currentSequence[0];
        nextCode++;
        codeLength = (nextCode + earlyChange) & (nextCode + earlyChange - 1) ?
          codeLength : Math.min(Math.log(nextCode + earlyChange) /
          0.6931471805599453 + 1, 12) | 0;
      }
      prevCode = code;

      decodedLength += currentSequenceLength;
      if (estimatedDecodedSize < decodedLength) {
        do {
          estimatedDecodedSize += decodedSizeDelta;
        } while (estimatedDecodedSize < decodedLength);
        buffer = this.ensureBuffer(this.bufferLength + estimatedDecodedSize);
      }
      for (j = 0; j < currentSequenceLength; j++) {
        buffer[currentBufferLength++] = currentSequence[j];
      }
    }
    lzwState.nextCode = nextCode;
    lzwState.codeLength = codeLength;
    lzwState.prevCode = prevCode;
    lzwState.currentSequenceLength = currentSequenceLength;

    this.bufferLength = currentBufferLength;
  };

  return LZWStream;
})();

var NullStream = (function NullStreamClosure() {
  function NullStream() {
    Stream.call(this, new Uint8Array(0));
  }

  NullStream.prototype = Stream.prototype;

  return NullStream;
})();

// TODO refactor to remove dependency on parser.js
function _setCoreParser(coreParser_) {
  coreParser = coreParser_;
  EOF = coreParser_.EOF;
  Lexer = coreParser_.Lexer;
}
exports._setCoreParser = _setCoreParser;

// TODO refactor to remove dependency on colorspace.js
function _setCoreColorSpace(coreColorSpace_) {
  coreColorSpace = coreColorSpace_;
  ColorSpace = coreColorSpace_.ColorSpace;
}
exports._setCoreColorSpace = _setCoreColorSpace;

exports.Ascii85Stream = Ascii85Stream;
exports.AsciiHexStream = AsciiHexStream;
exports.CCITTFaxStream = CCITTFaxStream;
exports.DecryptStream = DecryptStream;
exports.DecodeStream = DecodeStream;
exports.FlateStream = FlateStream;
exports.Jbig2Stream = Jbig2Stream;
exports.JpegStream = JpegStream;
exports.JpxStream = JpxStream;
exports.NullStream = NullStream;
exports.PredictorStream = PredictorStream;
exports.RunLengthStream = RunLengthStream;
exports.Stream = Stream;
exports.StreamsSequenceStream = StreamsSequenceStream;
exports.StringStream = StringStream;
exports.LZWStream = LZWStream;
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/core/parser', ['exports', 'pdfjs/shared/util',
      'pdfjs/core/primitives', 'pdfjs/core/stream'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('../shared/util.js'), require('./primitives.js'),
      require('./stream.js'));
  } else {
    factory((root.pdfjsCoreParser = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreStream);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreStream) {

var MissingDataException = sharedUtil.MissingDataException;
var StreamType = sharedUtil.StreamType;
var assert = sharedUtil.assert;
var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var isInt = sharedUtil.isInt;
var isNum = sharedUtil.isNum;
var isString = sharedUtil.isString;
var warn = sharedUtil.warn;
var Cmd = corePrimitives.Cmd;
var Dict = corePrimitives.Dict;
var Name = corePrimitives.Name;
var Ref = corePrimitives.Ref;
var isCmd = corePrimitives.isCmd;
var isDict = corePrimitives.isDict;
var isName = corePrimitives.isName;
var Ascii85Stream = coreStream.Ascii85Stream;
var AsciiHexStream = coreStream.AsciiHexStream;
var CCITTFaxStream = coreStream.CCITTFaxStream;
var FlateStream = coreStream.FlateStream;
var Jbig2Stream = coreStream.Jbig2Stream;
var JpegStream = coreStream.JpegStream;
var JpxStream = coreStream.JpxStream;
var LZWStream = coreStream.LZWStream;
var NullStream = coreStream.NullStream;
var PredictorStream = coreStream.PredictorStream;
var RunLengthStream = coreStream.RunLengthStream;

var EOF = {};

function isEOF(v) {
  return (v === EOF);
}

var MAX_LENGTH_TO_CACHE = 1000;

var Parser = (function ParserClosure() {
  function Parser(lexer, allowStreams, xref) {
    this.lexer = lexer;
    this.allowStreams = allowStreams;
    this.xref = xref;
    this.imageCache = {};
    this.refill();
  }

  Parser.prototype = {
    refill: function Parser_refill() {
      this.buf1 = this.lexer.getObj();
      this.buf2 = this.lexer.getObj();
    },
    shift: function Parser_shift() {
      if (isCmd(this.buf2, 'ID')) {
        this.buf1 = this.buf2;
        this.buf2 = null;
      } else {
        this.buf1 = this.buf2;
        this.buf2 = this.lexer.getObj();
      }
    },
    tryShift: function Parser_tryShift() {
      try {
        this.shift();
        return true;
      } catch (e) {
        if (e instanceof MissingDataException) {
          throw e;
        }
        // Upon failure, the caller should reset this.lexer.pos to a known good
        // state and call this.shift() twice to reset the buffers.
        return false;
      }
    },
    getObj: function Parser_getObj(cipherTransform) {
      var buf1 = this.buf1;
      this.shift();

      if (buf1 instanceof Cmd) {
        switch (buf1.cmd) {
          case 'BI': // inline image
            return this.makeInlineImage(cipherTransform);
          case '[': // array
            var array = [];
            while (!isCmd(this.buf1, ']') && !isEOF(this.buf1)) {
              array.push(this.getObj(cipherTransform));
            }
            if (isEOF(this.buf1)) {
              error('End of file inside array');
            }
            this.shift();
            return array;
          case '<<': // dictionary or stream
            var dict = new Dict(this.xref);
            while (!isCmd(this.buf1, '>>') && !isEOF(this.buf1)) {
              if (!isName(this.buf1)) {
                info('Malformed dictionary: key must be a name object');
                this.shift();
                continue;
              }
              var pos = this.lexer.stream.pos;
              var key = this.buf1.name;
              dict.set('#' +key+ '_offset', pos);
              this.shift();
              if (isEOF(this.buf1)) {
                break;
              }
              dict.set(key, this.getObj(cipherTransform));
              
            }
            if (isEOF(this.buf1)) {
              error('End of file inside dictionary');
            }

            // Stream objects are not allowed inside content streams or
            // object streams.
            if (isCmd(this.buf2, 'stream')) {
              return (this.allowStreams ?
                      this.makeStream(dict, cipherTransform) : dict);
            }
            this.shift();
            return dict;
          default: // simple object
            return buf1;
        }
      }

      if (isInt(buf1)) { // indirect reference or integer
        var num = buf1;
        if (isInt(this.buf1) && isCmd(this.buf2, 'R')) {
          var ref = new Ref(num, this.buf1);
          this.shift();
          this.shift();
          return ref;
        }
        return num;
      }

      if (isString(buf1)) { // string
        var str = buf1;
        if (cipherTransform) {
          str = cipherTransform.decryptString(str);
        }
        return str;
      }

      // simple object
      return buf1;
    },
    /**
     * Find the end of the stream by searching for the /EI\s/.
     * @returns {number} The inline stream length.
     */
    findDefaultInlineStreamEnd:
        function Parser_findDefaultInlineStreamEnd(stream) {
      var E = 0x45, I = 0x49, SPACE = 0x20, LF = 0xA, CR = 0xD;
      var startPos = stream.pos, state = 0, ch, i, n, followingBytes;
      while ((ch = stream.getByte()) !== -1) {
        if (state === 0) {
          state = (ch === E) ? 1 : 0;
        } else if (state === 1) {
          state = (ch === I) ? 2 : 0;
        } else {
          assert(state === 2);
          if (ch === SPACE || ch === LF || ch === CR) {
            // Let's check the next five bytes are ASCII... just be sure.
            n = 5;
            followingBytes = stream.peekBytes(n);
            for (i = 0; i < n; i++) {
              ch = followingBytes[i];
              if (ch !== LF && ch !== CR && (ch < SPACE || ch > 0x7F)) {
                // Not a LF, CR, SPACE or any visible ASCII character, i.e.
                // it's binary stuff. Resetting the state.
                state = 0;
                break;
              }
            }
            if (state === 2) {
              break;  // Finished!
            }
          } else {
            state = 0;
          }
        }
      }
      return ((stream.pos - 4) - startPos);
    },
    /**
     * Find the EOI (end-of-image) marker 0xFFD9 of the stream.
     * @returns {number} The inline stream length.
     */
    findDCTDecodeInlineStreamEnd:
        function Parser_findDCTDecodeInlineStreamEnd(stream) {
      var startPos = stream.pos, foundEOI = false, b, markerLength, length;
      while ((b = stream.getByte()) !== -1) {
        if (b !== 0xFF) { // Not a valid marker.
          continue;
        }
        switch (stream.getByte()) {
          case 0x00: // Byte stuffing.
            // 0xFF00 appears to be a very common byte sequence in JPEG images.
            break;

          case 0xFF: // Fill byte.
            // Avoid skipping a valid marker, resetting the stream position.
            stream.skip(-1);
            break;

          case 0xD9: // EOI
            foundEOI = true;
            break;

          case 0xC0: // SOF0
          case 0xC1: // SOF1
          case 0xC2: // SOF2
          case 0xC3: // SOF3

          case 0xC5: // SOF5
          case 0xC6: // SOF6
          case 0xC7: // SOF7

          case 0xC9: // SOF9
          case 0xCA: // SOF10
          case 0xCB: // SOF11

          case 0xCD: // SOF13
          case 0xCE: // SOF14
          case 0xCF: // SOF15

          case 0xC4: // DHT
          case 0xCC: // DAC

          case 0xDA: // SOS
          case 0xDB: // DQT
          case 0xDC: // DNL
          case 0xDD: // DRI
          case 0xDE: // DHP
          case 0xDF: // EXP

          case 0xE0: // APP0
          case 0xE1: // APP1
          case 0xE2: // APP2
          case 0xE3: // APP3
          case 0xE4: // APP4
          case 0xE5: // APP5
          case 0xE6: // APP6
          case 0xE7: // APP7
          case 0xE8: // APP8
          case 0xE9: // APP9
          case 0xEA: // APP10
          case 0xEB: // APP11
          case 0xEC: // APP12
          case 0xED: // APP13
          case 0xEE: // APP14
          case 0xEF: // APP15

          case 0xFE: // COM
            // The marker should be followed by the length of the segment.
            markerLength = stream.getUint16();
            if (markerLength > 2) {
              // |markerLength| contains the byte length of the marker segment,
              // including its own length (2 bytes) and excluding the marker.
              stream.skip(markerLength - 2); // Jump to the next marker.
            } else {
              // The marker length is invalid, resetting the stream position.
              stream.skip(-2);
            }
            break;
        }
        if (foundEOI) {
          break;
        }
      }
      length = stream.pos - startPos;
      if (b === -1) {
        warn('Inline DCTDecode image stream: ' +
             'EOI marker not found, searching for /EI/ instead.');
        stream.skip(-length); // Reset the stream position.
        return this.findDefaultInlineStreamEnd(stream);
      }
      this.inlineStreamSkipEI(stream);
      return length;
    },
    /**
     * Find the EOD (end-of-data) marker '~>' (i.e. TILDE + GT) of the stream.
     * @returns {number} The inline stream length.
     */
    findASCII85DecodeInlineStreamEnd:
        function Parser_findASCII85DecodeInlineStreamEnd(stream) {
      var TILDE = 0x7E, GT = 0x3E;
      var startPos = stream.pos, ch, length;
      while ((ch = stream.getByte()) !== -1) {
        if (ch === TILDE && stream.peekByte() === GT) {
          stream.skip();
          break;
        }
      }
      length = stream.pos - startPos;
      if (ch === -1) {
        warn('Inline ASCII85Decode image stream: ' +
             'EOD marker not found, searching for /EI/ instead.');
        stream.skip(-length); // Reset the stream position.
        return this.findDefaultInlineStreamEnd(stream);
      }
      this.inlineStreamSkipEI(stream);
      return length;
    },
    /**
     * Find the EOD (end-of-data) marker '>' (i.e. GT) of the stream.
     * @returns {number} The inline stream length.
     */
    findASCIIHexDecodeInlineStreamEnd:
        function Parser_findASCIIHexDecodeInlineStreamEnd(stream) {
      var GT = 0x3E;
      var startPos = stream.pos, ch, length;
      while ((ch = stream.getByte()) !== -1) {
        if (ch === GT) {
          break;
        }
      }
      length = stream.pos - startPos;
      if (ch === -1) {
        warn('Inline ASCIIHexDecode image stream: ' +
             'EOD marker not found, searching for /EI/ instead.');
        stream.skip(-length); // Reset the stream position.
        return this.findDefaultInlineStreamEnd(stream);
      }
      this.inlineStreamSkipEI(stream);
      return length;
    },
    /**
     * Skip over the /EI/ for streams where we search for an EOD marker.
     */
    inlineStreamSkipEI: function Parser_inlineStreamSkipEI(stream) {
      var E = 0x45, I = 0x49;
      var state = 0, ch;
      while ((ch = stream.getByte()) !== -1) {
        if (state === 0) {
          state = (ch === E) ? 1 : 0;
        } else if (state === 1) {
          state = (ch === I) ? 2 : 0;
        } else if (state === 2) {
          break;
        }
      }
    },
    makeInlineImage: function Parser_makeInlineImage(cipherTransform) {
      var lexer = this.lexer;
      var stream = lexer.stream;

      // Parse dictionary.
      var dict = new Dict(this.xref);
      while (!isCmd(this.buf1, 'ID') && !isEOF(this.buf1)) {
        if (!isName(this.buf1)) {
          error('Dictionary key must be a name object');
        }
        var key = this.buf1.name;
        this.shift();
        if (isEOF(this.buf1)) {
          break;
        }
        dict.set(key, this.getObj(cipherTransform));
      }

      // Extract the name of the first (i.e. the current) image filter.
      var filter = dict.get('Filter', 'F'), filterName;
      if (isName(filter)) {
        filterName = filter.name;
      } else if (isArray(filter) && isName(filter[0])) {
        filterName = filter[0].name;
      }

      // Parse image stream.
      var startPos = stream.pos, length, i, ii;
      if (filterName === 'DCTDecode' || filterName === 'DCT') {
        length = this.findDCTDecodeInlineStreamEnd(stream);
      } else if (filterName === 'ASCII85Decide' || filterName === 'A85') {
        length = this.findASCII85DecodeInlineStreamEnd(stream);
      } else if (filterName === 'ASCIIHexDecode' || filterName === 'AHx') {
        length = this.findASCIIHexDecodeInlineStreamEnd(stream);
      } else {
        length = this.findDefaultInlineStreamEnd(stream);
      }
      var imageStream = stream.makeSubStream(startPos, length, dict);

      // Cache all images below the MAX_LENGTH_TO_CACHE threshold by their
      // adler32 checksum.
      var adler32;
      if (length < MAX_LENGTH_TO_CACHE) {
        var imageBytes = imageStream.getBytes();
        imageStream.reset();

        var a = 1;
        var b = 0;
        for (i = 0, ii = imageBytes.length; i < ii; ++i) {
          // No modulo required in the loop if imageBytes.length < 5552.
          a += imageBytes[i] & 0xff;
          b += a;
        }
        adler32 = ((b % 65521) << 16) | (a % 65521);

        if (this.imageCache.adler32 === adler32) {
          this.buf2 = Cmd.get('EI');
          this.shift();

          this.imageCache[adler32].reset();
          return this.imageCache[adler32];
        }
      }

      if (cipherTransform) {
        imageStream = cipherTransform.createStream(imageStream, length);
      }

      imageStream = this.filter(imageStream, dict, length);
      imageStream.dict = dict;
      if (adler32 !== undefined) {
        imageStream.cacheKey = 'inline_' + length + '_' + adler32;
        this.imageCache[adler32] = imageStream;
      }

      this.buf2 = Cmd.get('EI');
      this.shift();

      return imageStream;
    },
    makeStream: function Parser_makeStream(dict, cipherTransform) {
      var lexer = this.lexer;
      var stream = lexer.stream;

      // get stream start position
      lexer.skipToNextLine();
      var pos = stream.pos - 1;

      // get length
      var length = dict.get('Length');
      if (!isInt(length)) {
        info('Bad ' + length + ' attribute in stream');
        length = 0;
      }

      // skip over the stream data
      stream.pos = pos + length;
      lexer.nextChar();

      // Shift '>>' and check whether the new object marks the end of the stream
      if (this.tryShift() && isCmd(this.buf2, 'endstream')) {
        this.shift(); // 'stream'
      } else {
        // bad stream length, scanning for endstream
        stream.pos = pos;
        var SCAN_BLOCK_SIZE = 2048;
        var ENDSTREAM_SIGNATURE_LENGTH = 9;
        var ENDSTREAM_SIGNATURE = [0x65, 0x6E, 0x64, 0x73, 0x74, 0x72, 0x65,
                                   0x61, 0x6D];
        var skipped = 0, found = false, i, j;
        while (stream.pos < stream.end) {
          var scanBytes = stream.peekBytes(SCAN_BLOCK_SIZE);
          var scanLength = scanBytes.length - ENDSTREAM_SIGNATURE_LENGTH;
          if (scanLength <= 0) {
            break;
          }
          found = false;
          for (i = 0, j = 0; i < scanLength; i++) {
            var b = scanBytes[i];
            if (b !== ENDSTREAM_SIGNATURE[j]) {
              i -= j;
              j = 0;
            } else {
              j++;
              if (j >= ENDSTREAM_SIGNATURE_LENGTH) {
                i++;
                found = true;
                break;
              }
            }
          }
          if (found) {
            skipped += i - ENDSTREAM_SIGNATURE_LENGTH;
            stream.pos += i - ENDSTREAM_SIGNATURE_LENGTH;
            break;
          }
          skipped += scanLength;
          stream.pos += scanLength;
        }
        if (!found) {
          error('Missing endstream');
        }
        length = skipped;

        lexer.nextChar();
        this.shift();
        this.shift();
      }
      this.shift(); // 'endstream'

      stream = stream.makeSubStream(pos, length, dict);
      if (cipherTransform) {
        stream = cipherTransform.createStream(stream, length);
      }
      stream = this.filter(stream, dict, length);
      stream.dict = dict;
      return stream;
    },
    filter: function Parser_filter(stream, dict, length) {
      var filter = dict.get('Filter', 'F');
      var params = dict.get('DecodeParms', 'DP');
      if (isName(filter)) {
        return this.makeFilter(stream, filter.name, length, params);
      }

      var maybeLength = length;
      if (isArray(filter)) {
        var filterArray = filter;
        var paramsArray = params;
        for (var i = 0, ii = filterArray.length; i < ii; ++i) {
          filter = filterArray[i];
          if (!isName(filter)) {
            error('Bad filter name: ' + filter);
          }

          params = null;
          if (isArray(paramsArray) && (i in paramsArray)) {
            params = paramsArray[i];
          }
          stream = this.makeFilter(stream, filter.name, maybeLength, params);
          // after the first stream the length variable is invalid
          maybeLength = null;
        }
      }
      return stream;
    },
    makeFilter: function Parser_makeFilter(stream, name, maybeLength, params) {
      if (stream.dict.get('Length') === 0 && !maybeLength) {
        warn('Empty "' + name + '" stream.');
        return new NullStream(stream);
      }
      try {
        if (params && this.xref) {
          params = this.xref.fetchIfRef(params);
        }
        var xrefStreamStats = this.xref.stats.streamTypes;
        if (name === 'FlateDecode' || name === 'Fl') {
          xrefStreamStats[StreamType.FLATE] = true;
          if (params) {
            return new PredictorStream(new FlateStream(stream, maybeLength),
                                       maybeLength, params);
          }
          return new FlateStream(stream, maybeLength);
        }
        if (name === 'LZWDecode' || name === 'LZW') {
          xrefStreamStats[StreamType.LZW] = true;
          var earlyChange = 1;
          if (params) {
            if (params.has('EarlyChange')) {
              earlyChange = params.get('EarlyChange');
            }
            return new PredictorStream(
              new LZWStream(stream, maybeLength, earlyChange),
              maybeLength, params);
          }
          return new LZWStream(stream, maybeLength, earlyChange);
        }
        if (name === 'DCTDecode' || name === 'DCT') {
          xrefStreamStats[StreamType.DCT] = true;
          return new JpegStream(stream, maybeLength, stream.dict, this.xref);
        }
        if (name === 'JPXDecode' || name === 'JPX') {
          xrefStreamStats[StreamType.JPX] = true;
          return new JpxStream(stream, maybeLength, stream.dict);
        }
        if (name === 'ASCII85Decode' || name === 'A85') {
          xrefStreamStats[StreamType.A85] = true;
          return new Ascii85Stream(stream, maybeLength);
        }
        if (name === 'ASCIIHexDecode' || name === 'AHx') {
          xrefStreamStats[StreamType.AHX] = true;
          return new AsciiHexStream(stream, maybeLength);
        }
        if (name === 'CCITTFaxDecode' || name === 'CCF') {
          xrefStreamStats[StreamType.CCF] = true;
          return new CCITTFaxStream(stream, maybeLength, params);
        }
        if (name === 'RunLengthDecode' || name === 'RL') {
          xrefStreamStats[StreamType.RL] = true;
          return new RunLengthStream(stream, maybeLength);
        }
        if (name === 'JBIG2Decode') {
          xrefStreamStats[StreamType.JBIG] = true;
          return new Jbig2Stream(stream, maybeLength, stream.dict);
        }
        warn('filter "' + name + '" not supported yet');
        return stream;
      } catch (ex) {
        if (ex instanceof MissingDataException) {
          throw ex;
        }
        warn('Invalid stream: \"' + ex + '\"');
        return new NullStream(stream);
      }
    }
  };

  return Parser;
})();

var Lexer = (function LexerClosure() {
  function Lexer(stream, knownCommands) {
    this.stream = stream;
    this.nextChar();

    // While lexing, we build up many strings one char at a time. Using += for
    // this can result in lots of garbage strings. It's better to build an
    // array of single-char strings and then join() them together at the end.
    // And reusing a single array (i.e. |this.strBuf|) over and over for this
    // purpose uses less memory than using a new array for each string.
    this.strBuf = [];

    // The PDFs might have "glued" commands with other commands, operands or
    // literals, e.g. "q1". The knownCommands is a dictionary of the valid
    // commands and their prefixes. The prefixes are built the following way:
    // if there a command that is a prefix of the other valid command or
    // literal (e.g. 'f' and 'false') the following prefixes must be included,
    // 'fa', 'fal', 'fals'. The prefixes are not needed, if the command has no
    // other commands or literals as a prefix. The knowCommands is optional.
    this.knownCommands = knownCommands;
  }

  Lexer.isSpace = function Lexer_isSpace(ch) {
    // Space is one of the following characters: SPACE, TAB, CR or LF.
    return (ch === 0x20 || ch === 0x09 || ch === 0x0D || ch === 0x0A);
  };

  // A '1' in this array means the character is white space. A '1' or
  // '2' means the character ends a name or command.
  var specialChars = [
    1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, // 0x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 1x
    1, 0, 0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 2, // 2x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, // 3x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 4x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, // 5x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 6x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, // 7x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 8x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 9x
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // ax
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // bx
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // cx
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // dx
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // ex
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0  // fx
  ];

  function toHexDigit(ch) {
    if (ch >= 0x30 && ch <= 0x39) { // '0'-'9'
      return ch & 0x0F;
    }
    if ((ch >= 0x41 && ch <= 0x46) || (ch >= 0x61 && ch <= 0x66)) {
      // 'A'-'F', 'a'-'f'
      return (ch & 0x0F) + 9;
    }
    return -1;
  }

  Lexer.prototype = {
    nextChar: function Lexer_nextChar() {
      return (this.currentChar = this.stream.getByte());
    },
    peekChar: function Lexer_peekChar() {
      return this.stream.peekByte();
    },
    getNumber: function Lexer_getNumber() {
      var ch = this.currentChar;
      var eNotation = false;
      var divideBy = 0; // different from 0 if it's a floating point value
      var sign = 1;

      if (ch === 0x2D) { // '-'
        sign = -1;
        ch = this.nextChar();

        if (ch === 0x2D) { // '-'
          // Ignore double negative (this is consistent with Adobe Reader).
          ch = this.nextChar();
        }
      } else if (ch === 0x2B) { // '+'
        ch = this.nextChar();
      }
      if (ch === 0x2E) { // '.'
        divideBy = 10;
        ch = this.nextChar();
      }
      if (ch < 0x30 || ch > 0x39) { // '0' - '9'
        error('Invalid number: ' + String.fromCharCode(ch));
        return 0;
      }

      var baseValue = ch - 0x30; // '0'
      var powerValue = 0;
      var powerValueSign = 1;

      while ((ch = this.nextChar()) >= 0) {
        if (0x30 <= ch && ch <= 0x39) { // '0' - '9'
          var currentDigit = ch - 0x30; // '0'
          if (eNotation) { // We are after an 'e' or 'E'
            powerValue = powerValue * 10 + currentDigit;
          } else {
            if (divideBy !== 0) { // We are after a point
              divideBy *= 10;
            }
            baseValue = baseValue * 10 + currentDigit;
          }
        } else if (ch === 0x2E) { // '.'
          if (divideBy === 0) {
            divideBy = 1;
          } else {
            // A number can have only one '.'
            break;
          }
        } else if (ch === 0x2D) { // '-'
          // ignore minus signs in the middle of numbers to match
          // Adobe's behavior
          warn('Badly formated number');
        } else if (ch === 0x45 || ch === 0x65) { // 'E', 'e'
          // 'E' can be either a scientific notation or the beginning of a new
          // operator
          ch = this.peekChar();
          if (ch === 0x2B || ch === 0x2D) { // '+', '-'
            powerValueSign = (ch === 0x2D) ? -1 : 1;
            this.nextChar(); // Consume the sign character
          } else if (ch < 0x30 || ch > 0x39) { // '0' - '9'
            // The 'E' must be the beginning of a new operator
            break;
          }
          eNotation = true;
        } else {
          // the last character doesn't belong to us
          break;
        }
      }

      if (divideBy !== 0) {
        baseValue /= divideBy;
      }
      if (eNotation) {
        baseValue *= Math.pow(10, powerValueSign * powerValue);
      }
      return sign * baseValue;
    },
    getString: function Lexer_getString() {
      var numParen = 1;
      var done = false;
      var strBuf = this.strBuf;
      strBuf.length = 0;

      var ch = this.nextChar();
      while (true) {
        var charBuffered = false;
        switch (ch | 0) {
          case -1:
            warn('Unterminated string');
            done = true;
            break;
          case 0x28: // '('
            ++numParen;
            strBuf.push('(');
            break;
          case 0x29: // ')'
            if (--numParen === 0) {
              this.nextChar(); // consume strings ')'
              done = true;
            } else {
              strBuf.push(')');
            }
            break;
          case 0x5C: // '\\'
            ch = this.nextChar();
            switch (ch) {
              case -1:
                warn('Unterminated string');
                done = true;
                break;
              case 0x6E: // 'n'
                strBuf.push('\n');
                break;
              case 0x72: // 'r'
                strBuf.push('\r');
                break;
              case 0x74: // 't'
                strBuf.push('\t');
                break;
              case 0x62: // 'b'
                strBuf.push('\b');
                break;
              case 0x66: // 'f'
                strBuf.push('\f');
                break;
              case 0x5C: // '\'
              case 0x28: // '('
              case 0x29: // ')'
                strBuf.push(String.fromCharCode(ch));
                break;
              case 0x30: case 0x31: case 0x32: case 0x33: // '0'-'3'
              case 0x34: case 0x35: case 0x36: case 0x37: // '4'-'7'
                var x = ch & 0x0F;
                ch = this.nextChar();
                charBuffered = true;
                if (ch >= 0x30 && ch <= 0x37) { // '0'-'7'
                  x = (x << 3) + (ch & 0x0F);
                  ch = this.nextChar();
                  if (ch >= 0x30 && ch <= 0x37) {  // '0'-'7'
                    charBuffered = false;
                    x = (x << 3) + (ch & 0x0F);
                  }
                }
                strBuf.push(String.fromCharCode(x));
                break;
              case 0x0D: // CR
                if (this.peekChar() === 0x0A) { // LF
                  this.nextChar();
                }
                break;
              case 0x0A: // LF
                break;
              default:
                strBuf.push(String.fromCharCode(ch));
                break;
            }
            break;
          default:
            strBuf.push(String.fromCharCode(ch));
            break;
        }
        if (done) {
          break;
        }
        if (!charBuffered) {
          ch = this.nextChar();
        }
      }
      return strBuf.join('');
    },
    getName: function Lexer_getName() {
      var ch, previousCh;
      var strBuf = this.strBuf;
      strBuf.length = 0;
      while ((ch = this.nextChar()) >= 0 && !specialChars[ch]) {
        if (ch === 0x23) { // '#'
          ch = this.nextChar();
          if (specialChars[ch]) {
            warn('Lexer_getName: ' +
                 'NUMBER SIGN (#) should be followed by a hexadecimal number.');
            strBuf.push('#');
            break;
          }
          var x = toHexDigit(ch);
          if (x !== -1) {
            previousCh = ch;
            ch = this.nextChar();
            var x2 = toHexDigit(ch);
            if (x2 === -1) {
              warn('Lexer_getName: Illegal digit (' +
                   String.fromCharCode(ch) +') in hexadecimal number.');
              strBuf.push('#', String.fromCharCode(previousCh));
              if (specialChars[ch]) {
                break;
              }
              strBuf.push(String.fromCharCode(ch));
              continue;
            }
            strBuf.push(String.fromCharCode((x << 4) | x2));
          } else {
            strBuf.push('#', String.fromCharCode(ch));
          }
        } else {
          strBuf.push(String.fromCharCode(ch));
        }
      }
      if (strBuf.length > 127) {
        warn('name token is longer than allowed by the spec: ' + strBuf.length);
      }
      return Name.get(strBuf.join(''));
    },
    getHexString: function Lexer_getHexString() {
      var strBuf = this.strBuf;
      strBuf.length = 0;
      var ch = this.currentChar;
      var isFirstHex = true;
      var firstDigit;
      var secondDigit;
      while (true) {
        if (ch < 0) {
          warn('Unterminated hex string');
          break;
        } else if (ch === 0x3E) { // '>'
          this.nextChar();
          break;
        } else if (specialChars[ch] === 1) {
          ch = this.nextChar();
          continue;
        } else {
          if (isFirstHex) {
            firstDigit = toHexDigit(ch);
            if (firstDigit === -1) {
              warn('Ignoring invalid character "' + ch + '" in hex string');
              ch = this.nextChar();
              continue;
            }
          } else {
            secondDigit = toHexDigit(ch);
            if (secondDigit === -1) {
              warn('Ignoring invalid character "' + ch + '" in hex string');
              ch = this.nextChar();
              continue;
            }
            strBuf.push(String.fromCharCode((firstDigit << 4) | secondDigit));
          }
          isFirstHex = !isFirstHex;
          ch = this.nextChar();
        }
      }
      return strBuf.join('');
    },
    getObj: function Lexer_getObj() {
      // skip whitespace and comments
      var comment = false;
      var ch = this.currentChar;
      while (true) {
        if (ch < 0) {
          return EOF;
        }
        if (comment) {
          if (ch === 0x0A || ch === 0x0D) { // LF, CR
            comment = false;
          }
        } else if (ch === 0x25) { // '%'
          comment = true;
        } else if (specialChars[ch] !== 1) {
          break;
        }
        ch = this.nextChar();
      }

      // start reading token
      switch (ch | 0) {
        case 0x30: case 0x31: case 0x32: case 0x33: case 0x34: // '0'-'4'
        case 0x35: case 0x36: case 0x37: case 0x38: case 0x39: // '5'-'9'
        case 0x2B: case 0x2D: case 0x2E: // '+', '-', '.'
          return this.getNumber();
        case 0x28: // '('
          return this.getString();
        case 0x2F: // '/'
          return this.getName();
        // array punctuation
        case 0x5B: // '['
          this.nextChar();
          return Cmd.get('[');
        case 0x5D: // ']'
          this.nextChar();
          return Cmd.get(']');
        // hex string or dict punctuation
        case 0x3C: // '<'
          ch = this.nextChar();
          if (ch === 0x3C) {
            // dict punctuation
            this.nextChar();
            return Cmd.get('<<');
          }
          return this.getHexString();
        // dict punctuation
        case 0x3E: // '>'
          ch = this.nextChar();
          if (ch === 0x3E) {
            this.nextChar();
            return Cmd.get('>>');
          }
          return Cmd.get('>');
        case 0x7B: // '{'
          this.nextChar();
          return Cmd.get('{');
        case 0x7D: // '}'
          this.nextChar();
          return Cmd.get('}');
        case 0x29: // ')'
          error('Illegal character: ' + ch);
          break;
      }

      // command
      var str = String.fromCharCode(ch);
      var knownCommands = this.knownCommands;
      var knownCommandFound = knownCommands && knownCommands[str] !== undefined;
      while ((ch = this.nextChar()) >= 0 && !specialChars[ch]) {
        // stop if known command is found and next character does not make
        // the str a command
        var possibleCommand = str + String.fromCharCode(ch);
        if (knownCommandFound && knownCommands[possibleCommand] === undefined) {
          break;
        }
        if (str.length === 128) {
          error('Command token too long: ' + str.length);
        }
        str = possibleCommand;
        knownCommandFound = knownCommands && knownCommands[str] !== undefined;
      }
      if (str === 'true') {
        return true;
      }
      if (str === 'false') {
        return false;
      }
      if (str === 'null') {
        return null;
      }
      return Cmd.get(str);
    },
    skipToNextLine: function Lexer_skipToNextLine() {
      var ch = this.currentChar;
      while (ch >= 0) {
        if (ch === 0x0D) { // CR
          ch = this.nextChar();
          if (ch === 0x0A) { // LF
            this.nextChar();
          }
          break;
        } else if (ch === 0x0A) { // LF
          this.nextChar();
          break;
        }
        ch = this.nextChar();
      }
    }
  };

  return Lexer;
})();

var Linearization = {
  create: function LinearizationCreate(stream) {
    function getInt(name, allowZeroValue) {
      var obj = linDict.get(name);
      if (isInt(obj) && (allowZeroValue ? obj >= 0 : obj > 0)) {
        return obj;
      }
      throw new Error('The "' + name + '" parameter in the linearization ' +
                      'dictionary is invalid.');
    }
    function getHints() {
      var hints = linDict.get('H'), hintsLength, item;
      if (isArray(hints) &&
          ((hintsLength = hints.length) === 2 || hintsLength === 4)) {
        for (var index = 0; index < hintsLength; index++) {
          if (!(isInt(item = hints[index]) && item > 0)) {
            throw new Error('Hint (' + index +
                            ') in the linearization dictionary is invalid.');
          }
        }
        return hints;
      }
      throw new Error('Hint array in the linearization dictionary is invalid.');
    }
    var parser = new Parser(new Lexer(stream), false, null);
    var obj1 = parser.getObj();
    var obj2 = parser.getObj();
    var obj3 = parser.getObj();
    var linDict = parser.getObj();
    var obj, length;
    if (!(isInt(obj1) && isInt(obj2) && isCmd(obj3, 'obj') && isDict(linDict) &&
          isNum(obj = linDict.get('Linearized')) && obj > 0)) {
      return null; // No valid linearization dictionary found.
    } else if ((length = getInt('L')) !== stream.length) {
      throw new Error('The "L" parameter in the linearization dictionary ' +
                      'does not equal the stream length.');
    }
    return {
      length: length,
      hints: getHints(),
      objectNumberFirst: getInt('O'),
      endFirst: getInt('E'),
      numPages: getInt('N'),
      mainXRefEntriesOffset: getInt('T'),
      pageFirst: (linDict.has('P') ? getInt('P', true) : 0)
    };
  }
};

exports.EOF = EOF;
exports.Lexer = Lexer;
exports.Linearization = Linearization;
exports.Parser = Parser;
exports.isEOF = isEOF;

// TODO refactor to remove dependency on stream.js
coreStream._setCoreParser(exports);
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/core/crypto', ['exports', 'pdfjs/shared/util',
      'pdfjs/core/primitives', 'pdfjs/core/stream'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('../shared/util.js'), require('./primitives.js'),
      require('./stream.js'));
  } else {
    factory((root.pdfjsCoreCrypto = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreStream);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreStream) {

var PasswordException = sharedUtil.PasswordException;
var PasswordResponses = sharedUtil.PasswordResponses;
var bytesToString = sharedUtil.bytesToString;
var error = sharedUtil.error;
var isInt = sharedUtil.isInt;
var stringToBytes = sharedUtil.stringToBytes;
var utf8StringToString = sharedUtil.utf8StringToString;
var warn = sharedUtil.warn;
var Name = corePrimitives.Name;
var isName = corePrimitives.isName;
var DecryptStream = coreStream.DecryptStream;

var ARCFourCipher = (function ARCFourCipherClosure() {
  function ARCFourCipher(key) {
    this.a = 0;
    this.b = 0;
    var s = new Uint8Array(256);
    var i, j = 0, tmp, keyLength = key.length;
    for (i = 0; i < 256; ++i) {
      s[i] = i;
    }
    for (i = 0; i < 256; ++i) {
      tmp = s[i];
      j = (j + tmp + key[i % keyLength]) & 0xFF;
      s[i] = s[j];
      s[j] = tmp;
    }
    this.s = s;
  }

  ARCFourCipher.prototype = {
    encryptBlock: function ARCFourCipher_encryptBlock(data) {
      var i, n = data.length, tmp, tmp2;
      var a = this.a, b = this.b, s = this.s;
      var output = new Uint8Array(n);
      for (i = 0; i < n; ++i) {
        a = (a + 1) & 0xFF;
        tmp = s[a];
        b = (b + tmp) & 0xFF;
        tmp2 = s[b];
        s[a] = tmp2;
        s[b] = tmp;
        output[i] = data[i] ^ s[(tmp + tmp2) & 0xFF];
      }
      this.a = a;
      this.b = b;
      return output;
    }
  };
  ARCFourCipher.prototype.decryptBlock = ARCFourCipher.prototype.encryptBlock;

  return ARCFourCipher;
})();

var calculateMD5 = (function calculateMD5Closure() {
  var r = new Uint8Array([
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]);

  var k = new Int32Array([
    -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426,
    -1473231341, -45705983, 1770035416, -1958414417, -42063, -1990404162,
    1804603682, -40341101, -1502002290, 1236535329, -165796510, -1069501632,
    643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
    568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784,
    1735328473, -1926607734, -378558, -2022574463, 1839030562, -35309556,
    -1530992060, 1272893353, -155497632, -1094730640, 681279174, -358537222,
    -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
    -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606,
    -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649,
    -145523070, -1120210379, 718787259, -343485551]);

  function hash(data, offset, length) {
    var h0 = 1732584193, h1 = -271733879, h2 = -1732584194, h3 = 271733878;
    // pre-processing
    var paddedLength = (length + 72) & ~63; // data + 9 extra bytes
    var padded = new Uint8Array(paddedLength);
    var i, j, n;
    for (i = 0; i < length; ++i) {
      padded[i] = data[offset++];
    }
    padded[i++] = 0x80;
    n = paddedLength - 8;
    while (i < n) {
      padded[i++] = 0;
    }
    padded[i++] = (length << 3) & 0xFF;
    padded[i++] = (length >> 5) & 0xFF;
    padded[i++] = (length >> 13) & 0xFF;
    padded[i++] = (length >> 21) & 0xFF;
    padded[i++] = (length >>> 29) & 0xFF;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    var w = new Int32Array(16);
    for (i = 0; i < paddedLength;) {
      for (j = 0; j < 16; ++j, i += 4) {
        w[j] = (padded[i] | (padded[i + 1] << 8) |
               (padded[i + 2] << 16) | (padded[i + 3] << 24));
      }
      var a = h0, b = h1, c = h2, d = h3, f, g;
      for (j = 0; j < 64; ++j) {
        if (j < 16) {
          f = (b & c) | ((~b) & d);
          g = j;
        } else if (j < 32) {
          f = (d & b) | ((~d) & c);
          g = (5 * j + 1) & 15;
        } else if (j < 48) {
          f = b ^ c ^ d;
          g = (3 * j + 5) & 15;
        } else {
          f = c ^ (b | (~d));
          g = (7 * j) & 15;
        }
        var tmp = d, rotateArg = (a + f + k[j] + w[g]) | 0, rotate = r[j];
        d = c;
        c = b;
        b = (b + ((rotateArg << rotate) | (rotateArg >>> (32 - rotate)))) | 0;
        a = tmp;
      }
      h0 = (h0 + a) | 0;
      h1 = (h1 + b) | 0;
      h2 = (h2 + c) | 0;
      h3 = (h3 + d) | 0;
    }
    return new Uint8Array([
      h0 & 0xFF, (h0 >> 8) & 0xFF, (h0 >> 16) & 0xFF, (h0 >>> 24) & 0xFF,
      h1 & 0xFF, (h1 >> 8) & 0xFF, (h1 >> 16) & 0xFF, (h1 >>> 24) & 0xFF,
      h2 & 0xFF, (h2 >> 8) & 0xFF, (h2 >> 16) & 0xFF, (h2 >>> 24) & 0xFF,
      h3 & 0xFF, (h3 >> 8) & 0xFF, (h3 >> 16) & 0xFF, (h3 >>> 24) & 0xFF
    ]);
  }

  return hash;
})();
var Word64 = (function Word64Closure() {
  function Word64(highInteger, lowInteger) {
    this.high = highInteger | 0;
    this.low = lowInteger | 0;
  }
  Word64.prototype = {
    and: function Word64_and(word) {
      this.high &= word.high;
      this.low &= word.low;
    },
    xor: function Word64_xor(word) {
     this.high ^= word.high;
     this.low ^= word.low;
    },

    or: function Word64_or(word) {
      this.high |= word.high;
      this.low |= word.low;
    },

    shiftRight: function Word64_shiftRight(places) {
      if (places >= 32) {
        this.low = (this.high >>> (places - 32)) | 0;
        this.high = 0;
      } else {
        this.low = (this.low >>> places) | (this.high << (32 - places));
        this.high = (this.high >>> places) | 0;
      }
    },

    shiftLeft: function Word64_shiftLeft(places) {
      if (places >= 32) {
        this.high = this.low << (places - 32);
        this.low = 0;
      } else {
        this.high = (this.high << places) | (this.low >>> (32 - places));
        this.low = this.low << places;
      }
    },

    rotateRight: function Word64_rotateRight(places) {
      var low, high;
      if (places & 32) {
        high = this.low;
        low = this.high;
      } else {
        low = this.low;
        high = this.high;
      }
      places &= 31;
      this.low = (low >>> places) | (high << (32 - places));
      this.high = (high >>> places) | (low << (32 - places));
    },

    not: function Word64_not() {
      this.high = ~this.high;
      this.low = ~this.low;
    },

    add: function Word64_add(word) {
      var lowAdd = (this.low >>> 0) + (word.low >>> 0);
      var highAdd = (this.high >>> 0) + (word.high >>> 0);
      if (lowAdd > 0xFFFFFFFF) {
        highAdd += 1;
      }
      this.low = lowAdd | 0;
      this.high = highAdd | 0;
    },

    copyTo: function Word64_copyTo(bytes, offset) {
      bytes[offset] = (this.high >>> 24) & 0xFF;
      bytes[offset + 1] = (this.high >> 16) & 0xFF;
      bytes[offset + 2] = (this.high >> 8) & 0xFF;
      bytes[offset + 3] = this.high & 0xFF;
      bytes[offset + 4] = (this.low >>> 24) & 0xFF;
      bytes[offset + 5] = (this.low >> 16) & 0xFF;
      bytes[offset + 6] = (this.low >> 8) & 0xFF;
      bytes[offset + 7] = this.low & 0xFF;
    },

    assign: function Word64_assign(word) {
      this.high = word.high;
      this.low = word.low;
    }
  };
  return Word64;
})();

var calculateSHA256 = (function calculateSHA256Closure() {
  function rotr(x, n) {
    return (x >>> n) | (x << 32 - n);
  }

  function ch(x, y, z) {
    return (x & y) ^ (~x & z);
  }

  function maj(x, y, z) {
    return (x & y) ^ (x & z) ^ (y & z);
  }

  function sigma(x) {
    return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
  }

  function sigmaPrime(x) {
    return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
  }

  function littleSigma(x) {
    return rotr(x, 7) ^ rotr(x, 18) ^ x >>> 3;
  }

  function littleSigmaPrime(x) {
    return rotr(x, 17) ^ rotr(x, 19) ^ x >>> 10;
  }

  var k = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
           0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
           0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
           0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
           0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
           0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
           0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
           0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
           0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
           0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
           0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
           0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
           0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
           0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
           0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
           0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];

  function hash(data, offset, length) {
    // initial hash values
    var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372,
        h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c,
        h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    // pre-processing
    var paddedLength = Math.ceil((length + 9) / 64) * 64;
    var padded = new Uint8Array(paddedLength);
    var i, j, n;
    for (i = 0; i < length; ++i) {
      padded[i] = data[offset++];
    }
    padded[i++] = 0x80;
    n = paddedLength - 8;
    while (i < n) {
      padded[i++] = 0;
    }
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = (length >>> 29) & 0xFF;
    padded[i++] = (length >> 21) & 0xFF;
    padded[i++] = (length >> 13) & 0xFF;
    padded[i++] = (length >> 5) & 0xFF;
    padded[i++] = (length << 3) & 0xFF;
    var w = new Uint32Array(64);
    // for each 512 bit block
    for (i = 0; i < paddedLength;) {
      for (j = 0; j < 16; ++j) {
        w[j] = (padded[i] << 24 | (padded[i + 1] << 16) |
               (padded[i + 2] << 8) | (padded[i + 3]));
        i += 4;
      }

      for (j = 16; j < 64; ++j) {
        w[j] = littleSigmaPrime(w[j - 2]) + w[j - 7] +
               littleSigma(w[j - 15]) + w[j - 16] | 0;
      }
      var a = h0, b = h1, c = h2, d = h3, e = h4,
          f = h5, g = h6, h = h7, t1, t2;
      for (j = 0; j < 64; ++j) {
        t1 = h + sigmaPrime(e) + ch(e, f, g) + k[j] + w[j];
        t2 = sigma(a) + maj(a, b, c);
        h = g;
        g = f;
        f = e;
        e = (d + t1) | 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0;
      h1 = (h1 + b) | 0;
      h2 = (h2 + c) | 0;
      h3 = (h3 + d) | 0;
      h4 = (h4 + e) | 0;
      h5 = (h5 + f) | 0;
      h6 = (h6 + g) | 0;
      h7 = (h7 + h) | 0;
    }
    return new Uint8Array([
      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, (h0) & 0xFF,
      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, (h1) & 0xFF,
      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, (h2) & 0xFF,
      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, (h3) & 0xFF,
      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, (h4) & 0xFF,
      (h5 >> 24) & 0xFF, (h5 >> 16) & 0xFF, (h5 >> 8) & 0xFF, (h5) & 0xFF,
      (h6 >> 24) & 0xFF, (h6 >> 16) & 0xFF, (h6 >> 8) & 0xFF, (h6) & 0xFF,
      (h7 >> 24) & 0xFF, (h7 >> 16) & 0xFF, (h7 >> 8) & 0xFF, (h7) & 0xFF
    ]);
  }

  return hash;
})();

var calculateSHA512 = (function calculateSHA512Closure() {
  function ch(result, x, y, z, tmp) {
    result.assign(x);
    result.and(y);
    tmp.assign(x);
    tmp.not();
    tmp.and(z);
    result.xor(tmp);
  }

  function maj(result, x, y, z, tmp) {
    result.assign(x);
    result.and(y);
    tmp.assign(x);
    tmp.and(z);
    result.xor(tmp);
    tmp.assign(y);
    tmp.and(z);
    result.xor(tmp);
  }

  function sigma(result, x, tmp) {
    result.assign(x);
    result.rotateRight(28);
    tmp.assign(x);
    tmp.rotateRight(34);
    result.xor(tmp);
    tmp.assign(x);
    tmp.rotateRight(39);
    result.xor(tmp);
  }

  function sigmaPrime(result, x, tmp) {
    result.assign(x);
    result.rotateRight(14);
    tmp.assign(x);
    tmp.rotateRight(18);
    result.xor(tmp);
    tmp.assign(x);
    tmp.rotateRight(41);
    result.xor(tmp);
  }

  function littleSigma(result, x, tmp) {
    result.assign(x);
    result.rotateRight(1);
    tmp.assign(x);
    tmp.rotateRight(8);
    result.xor(tmp);
    tmp.assign(x);
    tmp.shiftRight(7);
    result.xor(tmp);
  }

  function littleSigmaPrime(result, x, tmp) {
    result.assign(x);
    result.rotateRight(19);
    tmp.assign(x);
    tmp.rotateRight(61);
    result.xor(tmp);
    tmp.assign(x);
    tmp.shiftRight(6);
    result.xor(tmp);
  }

  var k = [
    new Word64(0x428a2f98, 0xd728ae22), new Word64(0x71374491, 0x23ef65cd),
    new Word64(0xb5c0fbcf, 0xec4d3b2f), new Word64(0xe9b5dba5, 0x8189dbbc),
    new Word64(0x3956c25b, 0xf348b538), new Word64(0x59f111f1, 0xb605d019),
    new Word64(0x923f82a4, 0xaf194f9b), new Word64(0xab1c5ed5, 0xda6d8118),
    new Word64(0xd807aa98, 0xa3030242), new Word64(0x12835b01, 0x45706fbe),
    new Word64(0x243185be, 0x4ee4b28c), new Word64(0x550c7dc3, 0xd5ffb4e2),
    new Word64(0x72be5d74, 0xf27b896f), new Word64(0x80deb1fe, 0x3b1696b1),
    new Word64(0x9bdc06a7, 0x25c71235), new Word64(0xc19bf174, 0xcf692694),
    new Word64(0xe49b69c1, 0x9ef14ad2), new Word64(0xefbe4786, 0x384f25e3),
    new Word64(0x0fc19dc6, 0x8b8cd5b5), new Word64(0x240ca1cc, 0x77ac9c65),
    new Word64(0x2de92c6f, 0x592b0275), new Word64(0x4a7484aa, 0x6ea6e483),
    new Word64(0x5cb0a9dc, 0xbd41fbd4), new Word64(0x76f988da, 0x831153b5),
    new Word64(0x983e5152, 0xee66dfab), new Word64(0xa831c66d, 0x2db43210),
    new Word64(0xb00327c8, 0x98fb213f), new Word64(0xbf597fc7, 0xbeef0ee4),
    new Word64(0xc6e00bf3, 0x3da88fc2), new Word64(0xd5a79147, 0x930aa725),
    new Word64(0x06ca6351, 0xe003826f), new Word64(0x14292967, 0x0a0e6e70),
    new Word64(0x27b70a85, 0x46d22ffc), new Word64(0x2e1b2138, 0x5c26c926),
    new Word64(0x4d2c6dfc, 0x5ac42aed), new Word64(0x53380d13, 0x9d95b3df),
    new Word64(0x650a7354, 0x8baf63de), new Word64(0x766a0abb, 0x3c77b2a8),
    new Word64(0x81c2c92e, 0x47edaee6), new Word64(0x92722c85, 0x1482353b),
    new Word64(0xa2bfe8a1, 0x4cf10364), new Word64(0xa81a664b, 0xbc423001),
    new Word64(0xc24b8b70, 0xd0f89791), new Word64(0xc76c51a3, 0x0654be30),
    new Word64(0xd192e819, 0xd6ef5218), new Word64(0xd6990624, 0x5565a910),
    new Word64(0xf40e3585, 0x5771202a), new Word64(0x106aa070, 0x32bbd1b8),
    new Word64(0x19a4c116, 0xb8d2d0c8), new Word64(0x1e376c08, 0x5141ab53),
    new Word64(0x2748774c, 0xdf8eeb99), new Word64(0x34b0bcb5, 0xe19b48a8),
    new Word64(0x391c0cb3, 0xc5c95a63), new Word64(0x4ed8aa4a, 0xe3418acb),
    new Word64(0x5b9cca4f, 0x7763e373), new Word64(0x682e6ff3, 0xd6b2b8a3),
    new Word64(0x748f82ee, 0x5defb2fc), new Word64(0x78a5636f, 0x43172f60),
    new Word64(0x84c87814, 0xa1f0ab72), new Word64(0x8cc70208, 0x1a6439ec),
    new Word64(0x90befffa, 0x23631e28), new Word64(0xa4506ceb, 0xde82bde9),
    new Word64(0xbef9a3f7, 0xb2c67915), new Word64(0xc67178f2, 0xe372532b),
    new Word64(0xca273ece, 0xea26619c), new Word64(0xd186b8c7, 0x21c0c207),
    new Word64(0xeada7dd6, 0xcde0eb1e), new Word64(0xf57d4f7f, 0xee6ed178),
    new Word64(0x06f067aa, 0x72176fba), new Word64(0x0a637dc5, 0xa2c898a6),
    new Word64(0x113f9804, 0xbef90dae), new Word64(0x1b710b35, 0x131c471b),
    new Word64(0x28db77f5, 0x23047d84), new Word64(0x32caab7b, 0x40c72493),
    new Word64(0x3c9ebe0a, 0x15c9bebc), new Word64(0x431d67c4, 0x9c100d4c),
    new Word64(0x4cc5d4be, 0xcb3e42b6), new Word64(0x597f299c, 0xfc657e2a),
    new Word64(0x5fcb6fab, 0x3ad6faec), new Word64(0x6c44198c, 0x4a475817)];

  function hash(data, offset, length, mode384) {
    mode384 = !!mode384;
    // initial hash values
    var h0, h1, h2, h3, h4, h5, h6, h7;
    if (!mode384) {
      h0 = new Word64(0x6a09e667, 0xf3bcc908);
      h1 = new Word64(0xbb67ae85, 0x84caa73b);
      h2 = new Word64(0x3c6ef372, 0xfe94f82b);
      h3 = new Word64(0xa54ff53a, 0x5f1d36f1);
      h4 = new Word64(0x510e527f, 0xade682d1);
      h5 = new Word64(0x9b05688c, 0x2b3e6c1f);
      h6 = new Word64(0x1f83d9ab, 0xfb41bd6b);
      h7 = new Word64(0x5be0cd19, 0x137e2179);
    }
    else {
      // SHA384 is exactly the same
      // except with different starting values and a trimmed result
      h0 = new Word64(0xcbbb9d5d, 0xc1059ed8);
      h1 = new Word64(0x629a292a, 0x367cd507);
      h2 = new Word64(0x9159015a, 0x3070dd17);
      h3 = new Word64(0x152fecd8, 0xf70e5939);
      h4 = new Word64(0x67332667, 0xffc00b31);
      h5 = new Word64(0x8eb44a87, 0x68581511);
      h6 = new Word64(0xdb0c2e0d, 0x64f98fa7);
      h7 = new Word64(0x47b5481d, 0xbefa4fa4);
    }

    // pre-processing
    var paddedLength = Math.ceil((length + 17) / 128) * 128;
    var padded = new Uint8Array(paddedLength);
    var i, j, n;
    for (i = 0; i < length; ++i) {
      padded[i] = data[offset++];
    }
    padded[i++] = 0x80;
    n = paddedLength - 16;
    while (i < n) {
      padded[i++] = 0;
    }
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = 0;
    padded[i++] = (length >>> 29) & 0xFF;
    padded[i++] = (length >> 21) & 0xFF;
    padded[i++] = (length >> 13) & 0xFF;
    padded[i++] = (length >> 5) & 0xFF;
    padded[i++] = (length << 3) & 0xFF;

    var w = new Array(80);
    for (i = 0; i < 80; i++) {
      w[i] = new Word64(0, 0);
    }
    var a = new Word64(0, 0), b = new Word64(0, 0), c = new Word64(0, 0);
    var d = new Word64(0, 0), e = new Word64(0, 0), f = new Word64(0, 0);
    var g = new Word64(0, 0), h = new Word64(0, 0);
    var t1 = new Word64(0, 0), t2 = new Word64(0, 0);
    var tmp1 = new Word64(0, 0), tmp2 = new Word64(0, 0), tmp3;

    // for each 1024 bit block
    for (i = 0; i < paddedLength;) {
      for (j = 0; j < 16; ++j) {
        w[j].high = (padded[i] << 24) | (padded[i + 1] << 16) |
                    (padded[i + 2] << 8) | (padded[i + 3]);
        w[j].low = (padded[i + 4]) << 24 | (padded[i + 5]) << 16 |
                   (padded[i + 6]) << 8 | (padded[i + 7]);
        i += 8;
      }
      for (j = 16; j < 80; ++j) {
        tmp3 = w[j];
        littleSigmaPrime(tmp3, w[j - 2], tmp2);
        tmp3.add(w[j - 7]);
        littleSigma(tmp1, w[j - 15], tmp2);
        tmp3.add(tmp1);
        tmp3.add(w[j - 16]);
      }

      a.assign(h0); b.assign(h1); c.assign(h2); d.assign(h3);
      e.assign(h4); f.assign(h5); g.assign(h6); h.assign(h7);
      for (j = 0; j < 80; ++j) {
        t1.assign(h);
        sigmaPrime(tmp1, e, tmp2);
        t1.add(tmp1);
        ch(tmp1, e, f, g, tmp2);
        t1.add(tmp1);
        t1.add(k[j]);
        t1.add(w[j]);

        sigma(t2, a, tmp2);
        maj(tmp1, a, b, c, tmp2);
        t2.add(tmp1);

        tmp3 = h;
        h = g;
        g = f;
        f = e;
        d.add(t1);
        e = d;
        d = c;
        c = b;
        b = a;
        tmp3.assign(t1);
        tmp3.add(t2);
        a = tmp3;
      }
      h0.add(a);
      h1.add(b);
      h2.add(c);
      h3.add(d);
      h4.add(e);
      h5.add(f);
      h6.add(g);
      h7.add(h);
    }

    var result;
    if (!mode384) {
      result = new Uint8Array(64);
      h0.copyTo(result,0);
      h1.copyTo(result,8);
      h2.copyTo(result,16);
      h3.copyTo(result,24);
      h4.copyTo(result,32);
      h5.copyTo(result,40);
      h6.copyTo(result,48);
      h7.copyTo(result,56);
    }
    else {
      result = new Uint8Array(48);
      h0.copyTo(result,0);
      h1.copyTo(result,8);
      h2.copyTo(result,16);
      h3.copyTo(result,24);
      h4.copyTo(result,32);
      h5.copyTo(result,40);
    }
    return result;
  }

  return hash;
})();
var calculateSHA384 = (function calculateSHA384Closure() {
  function hash(data, offset, length) {
    return calculateSHA512(data, offset, length, true);
  }

  return hash;
})();
var NullCipher = (function NullCipherClosure() {
  function NullCipher() {
  }

  NullCipher.prototype = {
    decryptBlock: function NullCipher_decryptBlock(data) {
      return data;
    }
  };

  return NullCipher;
})();

var AES128Cipher = (function AES128CipherClosure() {
  var rcon = new Uint8Array([
    0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c,
    0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a,
    0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd,
    0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a,
    0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80,
    0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6,
    0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72,
    0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc,
    0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02, 0x04, 0x08, 0x10,
    0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e,
    0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5,
    0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94,
    0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02,
    0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d,
    0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d,
    0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f,
    0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb,
    0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c,
    0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a,
    0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd,
    0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a,
    0x74, 0xe8, 0xcb, 0x8d]);

  var s = new Uint8Array([
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b,
    0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0,
    0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26,
    0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2,
    0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0,
    0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed,
    0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f,
    0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5,
    0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec,
    0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
    0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c,
    0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d,
    0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f,
    0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e,
    0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11,
    0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f,
    0xb0, 0x54, 0xbb, 0x16]);

  var inv_s = new Uint8Array([
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e,
    0x81, 0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87,
    0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32,
    0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49,
    0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16,
    0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50,
    0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05,
    0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02,
    0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41,
    0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8,
    0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89,
    0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b,
    0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59,
    0x27, 0x80, 0xec, 0x5f, 0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d,
    0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d,
    0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63,
    0x55, 0x21, 0x0c, 0x7d]);
  var mixCol = new Uint8Array(256);
  for (var i = 0; i < 256; i++) {
    if (i < 128) {
      mixCol[i] = i << 1;
    } else {
      mixCol[i] = (i << 1) ^ 0x1b;
    }
  }
  var mix = new Uint32Array([
    0x00000000, 0x0e090d0b, 0x1c121a16, 0x121b171d, 0x3824342c, 0x362d3927,
    0x24362e3a, 0x2a3f2331, 0x70486858, 0x7e416553, 0x6c5a724e, 0x62537f45,
    0x486c5c74, 0x4665517f, 0x547e4662, 0x5a774b69, 0xe090d0b0, 0xee99ddbb,
    0xfc82caa6, 0xf28bc7ad, 0xd8b4e49c, 0xd6bde997, 0xc4a6fe8a, 0xcaaff381,
    0x90d8b8e8, 0x9ed1b5e3, 0x8ccaa2fe, 0x82c3aff5, 0xa8fc8cc4, 0xa6f581cf,
    0xb4ee96d2, 0xbae79bd9, 0xdb3bbb7b, 0xd532b670, 0xc729a16d, 0xc920ac66,
    0xe31f8f57, 0xed16825c, 0xff0d9541, 0xf104984a, 0xab73d323, 0xa57ade28,
    0xb761c935, 0xb968c43e, 0x9357e70f, 0x9d5eea04, 0x8f45fd19, 0x814cf012,
    0x3bab6bcb, 0x35a266c0, 0x27b971dd, 0x29b07cd6, 0x038f5fe7, 0x0d8652ec,
    0x1f9d45f1, 0x119448fa, 0x4be30393, 0x45ea0e98, 0x57f11985, 0x59f8148e,
    0x73c737bf, 0x7dce3ab4, 0x6fd52da9, 0x61dc20a2, 0xad766df6, 0xa37f60fd,
    0xb16477e0, 0xbf6d7aeb, 0x955259da, 0x9b5b54d1, 0x894043cc, 0x87494ec7,
    0xdd3e05ae, 0xd33708a5, 0xc12c1fb8, 0xcf2512b3, 0xe51a3182, 0xeb133c89,
    0xf9082b94, 0xf701269f, 0x4de6bd46, 0x43efb04d, 0x51f4a750, 0x5ffdaa5b,
    0x75c2896a, 0x7bcb8461, 0x69d0937c, 0x67d99e77, 0x3daed51e, 0x33a7d815,
    0x21bccf08, 0x2fb5c203, 0x058ae132, 0x0b83ec39, 0x1998fb24, 0x1791f62f,
    0x764dd68d, 0x7844db86, 0x6a5fcc9b, 0x6456c190, 0x4e69e2a1, 0x4060efaa,
    0x527bf8b7, 0x5c72f5bc, 0x0605bed5, 0x080cb3de, 0x1a17a4c3, 0x141ea9c8,
    0x3e218af9, 0x302887f2, 0x223390ef, 0x2c3a9de4, 0x96dd063d, 0x98d40b36,
    0x8acf1c2b, 0x84c61120, 0xaef93211, 0xa0f03f1a, 0xb2eb2807, 0xbce2250c,
    0xe6956e65, 0xe89c636e, 0xfa877473, 0xf48e7978, 0xdeb15a49, 0xd0b85742,
    0xc2a3405f, 0xccaa4d54, 0x41ecdaf7, 0x4fe5d7fc, 0x5dfec0e1, 0x53f7cdea,
    0x79c8eedb, 0x77c1e3d0, 0x65daf4cd, 0x6bd3f9c6, 0x31a4b2af, 0x3fadbfa4,
    0x2db6a8b9, 0x23bfa5b2, 0x09808683, 0x07898b88, 0x15929c95, 0x1b9b919e,
    0xa17c0a47, 0xaf75074c, 0xbd6e1051, 0xb3671d5a, 0x99583e6b, 0x97513360,
    0x854a247d, 0x8b432976, 0xd134621f, 0xdf3d6f14, 0xcd267809, 0xc32f7502,
    0xe9105633, 0xe7195b38, 0xf5024c25, 0xfb0b412e, 0x9ad7618c, 0x94de6c87,
    0x86c57b9a, 0x88cc7691, 0xa2f355a0, 0xacfa58ab, 0xbee14fb6, 0xb0e842bd,
    0xea9f09d4, 0xe49604df, 0xf68d13c2, 0xf8841ec9, 0xd2bb3df8, 0xdcb230f3,
    0xcea927ee, 0xc0a02ae5, 0x7a47b13c, 0x744ebc37, 0x6655ab2a, 0x685ca621,
    0x42638510, 0x4c6a881b, 0x5e719f06, 0x5078920d, 0x0a0fd964, 0x0406d46f,
    0x161dc372, 0x1814ce79, 0x322bed48, 0x3c22e043, 0x2e39f75e, 0x2030fa55,
    0xec9ab701, 0xe293ba0a, 0xf088ad17, 0xfe81a01c, 0xd4be832d, 0xdab78e26,
    0xc8ac993b, 0xc6a59430, 0x9cd2df59, 0x92dbd252, 0x80c0c54f, 0x8ec9c844,
    0xa4f6eb75, 0xaaffe67e, 0xb8e4f163, 0xb6edfc68, 0x0c0a67b1, 0x02036aba,
    0x10187da7, 0x1e1170ac, 0x342e539d, 0x3a275e96, 0x283c498b, 0x26354480,
    0x7c420fe9, 0x724b02e2, 0x605015ff, 0x6e5918f4, 0x44663bc5, 0x4a6f36ce,
    0x587421d3, 0x567d2cd8, 0x37a10c7a, 0x39a80171, 0x2bb3166c, 0x25ba1b67,
    0x0f853856, 0x018c355d, 0x13972240, 0x1d9e2f4b, 0x47e96422, 0x49e06929,
    0x5bfb7e34, 0x55f2733f, 0x7fcd500e, 0x71c45d05, 0x63df4a18, 0x6dd64713,
    0xd731dcca, 0xd938d1c1, 0xcb23c6dc, 0xc52acbd7, 0xef15e8e6, 0xe11ce5ed,
    0xf307f2f0, 0xfd0efffb, 0xa779b492, 0xa970b999, 0xbb6bae84, 0xb562a38f,
    0x9f5d80be, 0x91548db5, 0x834f9aa8, 0x8d4697a3]);

  function expandKey128(cipherKey) {
    var b = 176, result = new Uint8Array(b);
    result.set(cipherKey);
    for (var j = 16, i = 1; j < b; ++i) {
      // RotWord
      var t1 = result[j - 3], t2 = result[j - 2],
          t3 = result[j - 1], t4 = result[j - 4];
      // SubWord
      t1 = s[t1];
      t2 = s[t2];
      t3 = s[t3];
      t4 = s[t4];
      // Rcon
      t1 = t1 ^ rcon[i];
      for (var n = 0; n < 4; ++n) {
        result[j] = (t1 ^= result[j - 16]);
        j++;
        result[j] = (t2 ^= result[j - 16]);
        j++;
        result[j] = (t3 ^= result[j - 16]);
        j++;
        result[j] = (t4 ^= result[j - 16]);
        j++;
      }
    }
    return result;
  }

  function decrypt128(input, key) {
    var state = new Uint8Array(16);
    state.set(input);
    var i, j, k;
    var t, u, v;
    // AddRoundKey
    for (j = 0, k = 160; j < 16; ++j, ++k) {
      state[j] ^= key[k];
    }
    for (i = 9; i >= 1; --i) {
      // InvShiftRows
      t = state[13];
      state[13] = state[9];
      state[9] = state[5];
      state[5] = state[1];
      state[1] = t;
      t = state[14];
      u = state[10];
      state[14] = state[6];
      state[10] = state[2];
      state[6] = t;
      state[2] = u;
      t = state[15];
      u = state[11];
      v = state[7];
      state[15] = state[3];
      state[11] = t;
      state[7] = u;
      state[3] = v;
      // InvSubBytes
      for (j = 0; j < 16; ++j) {
        state[j] = inv_s[state[j]];
      }
      // AddRoundKey
      for (j = 0, k = i * 16; j < 16; ++j, ++k) {
        state[j] ^= key[k];
      }
      // InvMixColumns
      for (j = 0; j < 16; j += 4) {
        var s0 = mix[state[j]], s1 = mix[state[j + 1]],
          s2 = mix[state[j + 2]], s3 = mix[state[j + 3]];
        t = (s0 ^ (s1 >>> 8) ^ (s1 << 24) ^ (s2 >>> 16) ^ (s2 << 16) ^
          (s3 >>> 24) ^ (s3 << 8));
        state[j] = (t >>> 24) & 0xFF;
        state[j + 1] = (t >> 16) & 0xFF;
        state[j + 2] = (t >> 8) & 0xFF;
        state[j + 3] = t & 0xFF;
      }
    }
    // InvShiftRows
    t = state[13];
    state[13] = state[9];
    state[9] = state[5];
    state[5] = state[1];
    state[1] = t;
    t = state[14];
    u = state[10];
    state[14] = state[6];
    state[10] = state[2];
    state[6] = t;
    state[2] = u;
    t = state[15];
    u = state[11];
    v = state[7];
    state[15] = state[3];
    state[11] = t;
    state[7] = u;
    state[3] = v;
    for (j = 0; j < 16; ++j) {
      // InvSubBytes
      state[j] = inv_s[state[j]];
      // AddRoundKey
      state[j] ^= key[j];
    }
    return state;
  }

  function encrypt128(input, key) {
    var t, u, v, k;
    var state = new Uint8Array(16);
    state.set(input);
    for (j = 0; j < 16; ++j) {
      // AddRoundKey
      state[j] ^= key[j];
    }

    for (i = 1; i < 10; i++) {
      //SubBytes
      for (j = 0; j < 16; ++j) {
        state[j] = s[state[j]];
      }
      //ShiftRows
      v = state[1];
      state[1] = state[5];
      state[5] = state[9];
      state[9] = state[13];
      state[13] = v;
      v = state[2];
      u = state[6];
      state[2] = state[10];
      state[6] = state[14];
      state[10] = v;
      state[14] = u;
      v = state[3];
      u = state[7];
      t = state[11];
      state[3] = state[15];
      state[7] = v;
      state[11] = u;
      state[15] = t;
      //MixColumns
      for (var j = 0; j < 16; j += 4) {
        var s0 = state[j + 0], s1 = state[j + 1];
        var s2 = state[j + 2], s3 = state[j + 3];
        t = s0 ^ s1 ^ s2 ^ s3;
        state[j + 0] ^= t ^ mixCol[s0 ^ s1];
        state[j + 1] ^= t ^ mixCol[s1 ^ s2];
        state[j + 2] ^= t ^ mixCol[s2 ^ s3];
        state[j + 3] ^= t ^ mixCol[s3 ^ s0];
      }
      //AddRoundKey
      for (j = 0, k = i * 16; j < 16; ++j, ++k) {
        state[j] ^= key[k];
      }
    }

    //SubBytes
    for (j = 0; j < 16; ++j) {
      state[j] = s[state[j]];
    }
    //ShiftRows
    v = state[1];
    state[1] = state[5];
    state[5] = state[9];
    state[9] = state[13];
    state[13] = v;
    v = state[2];
    u = state[6];
    state[2] = state[10];
    state[6] = state[14];
    state[10] = v;
    state[14] = u;
    v = state[3];
    u = state[7];
    t = state[11];
    state[3] = state[15];
    state[7] = v;
    state[11] = u;
    state[15] = t;
    //AddRoundKey
    for (j = 0, k = 160; j < 16; ++j, ++k) {
      state[j] ^= key[k];
    }
    return state;
  }

  function AES128Cipher(key) {
    this.key = expandKey128(key);
    this.buffer = new Uint8Array(16);
    this.bufferPosition = 0;
  }

  function decryptBlock2(data, finalize) {
    var i, j, ii, sourceLength = data.length,
        buffer = this.buffer, bufferLength = this.bufferPosition,
        result = [], iv = this.iv;
    for (i = 0; i < sourceLength; ++i) {
      buffer[bufferLength] = data[i];
      ++bufferLength;
      if (bufferLength < 16) {
        continue;
      }
      // buffer is full, decrypting
      var plain = decrypt128(buffer, this.key);
      // xor-ing the IV vector to get plain text
      for (j = 0; j < 16; ++j) {
        plain[j] ^= iv[j];
      }
      iv = buffer;
      result.push(plain);
      buffer = new Uint8Array(16);
      bufferLength = 0;
    }
    // saving incomplete buffer
    this.buffer = buffer;
    this.bufferLength = bufferLength;
    this.iv = iv;
    if (result.length === 0) {
      return new Uint8Array([]);
    }
    // combining plain text blocks into one
    var outputLength = 16 * result.length;
    if (finalize) {
      // undo a padding that is described in RFC 2898
      var lastBlock = result[result.length - 1];
      var psLen = lastBlock[15];
      if (psLen <= 16) {
        for (i = 15, ii = 16 - psLen; i >= ii; --i) {
          if (lastBlock[i] !== psLen) {
            // Invalid padding, assume that the block has no padding.
            psLen = 0;
            break;
          }
        }
        outputLength -= psLen;
        result[result.length - 1] = lastBlock.subarray(0, 16 - psLen);
      }
    }
    var output = new Uint8Array(outputLength);
    for (i = 0, j = 0, ii = result.length; i < ii; ++i, j += 16) {
      output.set(result[i], j);
    }
    return output;
  }

  AES128Cipher.prototype = {
    decryptBlock: function AES128Cipher_decryptBlock(data, finalize) {
      var i, sourceLength = data.length;
      var buffer = this.buffer, bufferLength = this.bufferPosition;
      // waiting for IV values -- they are at the start of the stream
      for (i = 0; bufferLength < 16 && i < sourceLength; ++i, ++bufferLength) {
        buffer[bufferLength] = data[i];
      }
      if (bufferLength < 16) {
        // need more data
        this.bufferLength = bufferLength;
        return new Uint8Array([]);
      }
      this.iv = buffer;
      this.buffer = new Uint8Array(16);
      this.bufferLength = 0;
      // starting decryption
      this.decryptBlock = decryptBlock2;
      return this.decryptBlock(data.subarray(16), finalize);
    },
    encrypt: function AES128Cipher_encrypt(data, iv) {
      var i, j, ii, sourceLength = data.length,
          buffer = this.buffer, bufferLength = this.bufferPosition,
          result = [];
      if (!iv) {
        iv = new Uint8Array(16);
      }
      for (i = 0; i < sourceLength; ++i) {
        buffer[bufferLength] = data[i];
        ++bufferLength;
        if (bufferLength < 16) {
          continue;
        }
        for (j = 0; j < 16; ++j) {
          buffer[j] ^= iv[j];
        }

        // buffer is full, encrypting
        var cipher = encrypt128(buffer, this.key);
        iv = cipher;
        result.push(cipher);
        buffer = new Uint8Array(16);
        bufferLength = 0;
      }
      // saving incomplete buffer
      this.buffer = buffer;
      this.bufferLength = bufferLength;
      this.iv = iv;
      if (result.length === 0) {
        return new Uint8Array([]);
      }
      // combining plain text blocks into one
      var outputLength = 16 * result.length;
      var output = new Uint8Array(outputLength);
      for (i = 0, j = 0, ii = result.length; i < ii; ++i, j += 16) {
        output.set(result[i], j);
      }
      return output;
    }
  };

  return AES128Cipher;
})();

var AES256Cipher = (function AES256CipherClosure() {
  var rcon = new Uint8Array([
    0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c,
    0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a,
    0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd,
    0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a,
    0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80,
    0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6,
    0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72,
    0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc,
    0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02, 0x04, 0x08, 0x10,
    0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e,
    0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5,
    0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94,
    0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb, 0x8d, 0x01, 0x02,
    0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d,
    0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d,
    0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f,
    0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a, 0x74, 0xe8, 0xcb,
    0x8d, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c,
    0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a,
    0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 0x72, 0xe4, 0xd3, 0xbd,
    0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a,
    0x74, 0xe8, 0xcb, 0x8d]);

  var s = new Uint8Array([
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b,
    0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0,
    0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26,
    0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2,
    0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0,
    0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed,
    0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f,
    0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5,
    0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec,
    0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
    0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c,
    0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d,
    0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f,
    0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e,
    0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11,
    0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f,
    0xb0, 0x54, 0xbb, 0x16]);

  var inv_s = new Uint8Array([
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e,
    0x81, 0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87,
    0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32,
    0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49,
    0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16,
    0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50,
    0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05,
    0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02,
    0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41,
    0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8,
    0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89,
    0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b,
    0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59,
    0x27, 0x80, 0xec, 0x5f, 0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d,
    0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d,
    0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63,
    0x55, 0x21, 0x0c, 0x7d]);

  var mixCol = new Uint8Array(256);
  for (var i = 0; i < 256; i++) {
    if (i < 128) {
      mixCol[i] = i << 1;
    } else {
      mixCol[i] = (i << 1) ^ 0x1b;
    }
  }
  var mix = new Uint32Array([
    0x00000000, 0x0e090d0b, 0x1c121a16, 0x121b171d, 0x3824342c, 0x362d3927,
    0x24362e3a, 0x2a3f2331, 0x70486858, 0x7e416553, 0x6c5a724e, 0x62537f45,
    0x486c5c74, 0x4665517f, 0x547e4662, 0x5a774b69, 0xe090d0b0, 0xee99ddbb,
    0xfc82caa6, 0xf28bc7ad, 0xd8b4e49c, 0xd6bde997, 0xc4a6fe8a, 0xcaaff381,
    0x90d8b8e8, 0x9ed1b5e3, 0x8ccaa2fe, 0x82c3aff5, 0xa8fc8cc4, 0xa6f581cf,
    0xb4ee96d2, 0xbae79bd9, 0xdb3bbb7b, 0xd532b670, 0xc729a16d, 0xc920ac66,
    0xe31f8f57, 0xed16825c, 0xff0d9541, 0xf104984a, 0xab73d323, 0xa57ade28,
    0xb761c935, 0xb968c43e, 0x9357e70f, 0x9d5eea04, 0x8f45fd19, 0x814cf012,
    0x3bab6bcb, 0x35a266c0, 0x27b971dd, 0x29b07cd6, 0x038f5fe7, 0x0d8652ec,
    0x1f9d45f1, 0x119448fa, 0x4be30393, 0x45ea0e98, 0x57f11985, 0x59f8148e,
    0x73c737bf, 0x7dce3ab4, 0x6fd52da9, 0x61dc20a2, 0xad766df6, 0xa37f60fd,
    0xb16477e0, 0xbf6d7aeb, 0x955259da, 0x9b5b54d1, 0x894043cc, 0x87494ec7,
    0xdd3e05ae, 0xd33708a5, 0xc12c1fb8, 0xcf2512b3, 0xe51a3182, 0xeb133c89,
    0xf9082b94, 0xf701269f, 0x4de6bd46, 0x43efb04d, 0x51f4a750, 0x5ffdaa5b,
    0x75c2896a, 0x7bcb8461, 0x69d0937c, 0x67d99e77, 0x3daed51e, 0x33a7d815,
    0x21bccf08, 0x2fb5c203, 0x058ae132, 0x0b83ec39, 0x1998fb24, 0x1791f62f,
    0x764dd68d, 0x7844db86, 0x6a5fcc9b, 0x6456c190, 0x4e69e2a1, 0x4060efaa,
    0x527bf8b7, 0x5c72f5bc, 0x0605bed5, 0x080cb3de, 0x1a17a4c3, 0x141ea9c8,
    0x3e218af9, 0x302887f2, 0x223390ef, 0x2c3a9de4, 0x96dd063d, 0x98d40b36,
    0x8acf1c2b, 0x84c61120, 0xaef93211, 0xa0f03f1a, 0xb2eb2807, 0xbce2250c,
    0xe6956e65, 0xe89c636e, 0xfa877473, 0xf48e7978, 0xdeb15a49, 0xd0b85742,
    0xc2a3405f, 0xccaa4d54, 0x41ecdaf7, 0x4fe5d7fc, 0x5dfec0e1, 0x53f7cdea,
    0x79c8eedb, 0x77c1e3d0, 0x65daf4cd, 0x6bd3f9c6, 0x31a4b2af, 0x3fadbfa4,
    0x2db6a8b9, 0x23bfa5b2, 0x09808683, 0x07898b88, 0x15929c95, 0x1b9b919e,
    0xa17c0a47, 0xaf75074c, 0xbd6e1051, 0xb3671d5a, 0x99583e6b, 0x97513360,
    0x854a247d, 0x8b432976, 0xd134621f, 0xdf3d6f14, 0xcd267809, 0xc32f7502,
    0xe9105633, 0xe7195b38, 0xf5024c25, 0xfb0b412e, 0x9ad7618c, 0x94de6c87,
    0x86c57b9a, 0x88cc7691, 0xa2f355a0, 0xacfa58ab, 0xbee14fb6, 0xb0e842bd,
    0xea9f09d4, 0xe49604df, 0xf68d13c2, 0xf8841ec9, 0xd2bb3df8, 0xdcb230f3,
    0xcea927ee, 0xc0a02ae5, 0x7a47b13c, 0x744ebc37, 0x6655ab2a, 0x685ca621,
    0x42638510, 0x4c6a881b, 0x5e719f06, 0x5078920d, 0x0a0fd964, 0x0406d46f,
    0x161dc372, 0x1814ce79, 0x322bed48, 0x3c22e043, 0x2e39f75e, 0x2030fa55,
    0xec9ab701, 0xe293ba0a, 0xf088ad17, 0xfe81a01c, 0xd4be832d, 0xdab78e26,
    0xc8ac993b, 0xc6a59430, 0x9cd2df59, 0x92dbd252, 0x80c0c54f, 0x8ec9c844,
    0xa4f6eb75, 0xaaffe67e, 0xb8e4f163, 0xb6edfc68, 0x0c0a67b1, 0x02036aba,
    0x10187da7, 0x1e1170ac, 0x342e539d, 0x3a275e96, 0x283c498b, 0x26354480,
    0x7c420fe9, 0x724b02e2, 0x605015ff, 0x6e5918f4, 0x44663bc5, 0x4a6f36ce,
    0x587421d3, 0x567d2cd8, 0x37a10c7a, 0x39a80171, 0x2bb3166c, 0x25ba1b67,
    0x0f853856, 0x018c355d, 0x13972240, 0x1d9e2f4b, 0x47e96422, 0x49e06929,
    0x5bfb7e34, 0x55f2733f, 0x7fcd500e, 0x71c45d05, 0x63df4a18, 0x6dd64713,
    0xd731dcca, 0xd938d1c1, 0xcb23c6dc, 0xc52acbd7, 0xef15e8e6, 0xe11ce5ed,
    0xf307f2f0, 0xfd0efffb, 0xa779b492, 0xa970b999, 0xbb6bae84, 0xb562a38f,
    0x9f5d80be, 0x91548db5, 0x834f9aa8, 0x8d4697a3]);

  function expandKey256(cipherKey) {
    var b = 240, result = new Uint8Array(b);
    var r = 1;

    result.set(cipherKey);
    for (var j = 32, i = 1; j < b; ++i) {
      if (j % 32 === 16) {
        t1 = s[t1];
        t2 = s[t2];
        t3 = s[t3];
        t4 = s[t4];
      } else if (j % 32 === 0) {
        // RotWord
        var t1 = result[j - 3], t2 = result[j - 2],
          t3 = result[j - 1], t4 = result[j - 4];
        // SubWord
        t1 = s[t1];
        t2 = s[t2];
        t3 = s[t3];
        t4 = s[t4];
        // Rcon
        t1 = t1 ^ r;
        if ((r <<= 1) >= 256) {
          r = (r ^ 0x1b) & 0xFF;
        }
      }

      for (var n = 0; n < 4; ++n) {
        result[j] = (t1 ^= result[j - 32]);
        j++;
        result[j] = (t2 ^= result[j - 32]);
        j++;
        result[j] = (t3 ^= result[j - 32]);
        j++;
        result[j] = (t4 ^= result[j - 32]);
        j++;
      }
    }
    return result;
  }

  function decrypt256(input, key) {
    var state = new Uint8Array(16);
    state.set(input);
    var i, j, k;
    var t, u, v;
    // AddRoundKey
    for (j = 0, k = 224; j < 16; ++j, ++k) {
      state[j] ^= key[k];
    }
    for (i = 13; i >= 1; --i) {
      // InvShiftRows
      t = state[13];
      state[13] = state[9];
      state[9] = state[5];
      state[5] = state[1];
      state[1] = t;
      t = state[14];
      u = state[10];
      state[14] = state[6];
      state[10] = state[2];
      state[6] = t;
      state[2] = u;
      t = state[15];
      u = state[11];
      v = state[7];
      state[15] = state[3];
      state[11] = t;
      state[7] = u;
      state[3] = v;
      // InvSubBytes
      for (j = 0; j < 16; ++j) {
        state[j] = inv_s[state[j]];
      }
      // AddRoundKey
      for (j = 0, k = i * 16; j < 16; ++j, ++k) {
        state[j] ^= key[k];
      }
      // InvMixColumns
      for (j = 0; j < 16; j += 4) {
        var s0 = mix[state[j]], s1 = mix[state[j + 1]],
            s2 = mix[state[j + 2]], s3 = mix[state[j + 3]];
        t = (s0 ^ (s1 >>> 8) ^ (s1 << 24) ^ (s2 >>> 16) ^ (s2 << 16) ^
            (s3 >>> 24) ^ (s3 << 8));
        state[j] = (t >>> 24) & 0xFF;
        state[j + 1] = (t >> 16) & 0xFF;
        state[j + 2] = (t >> 8) & 0xFF;
        state[j + 3] = t & 0xFF;
      }
    }
    // InvShiftRows
    t = state[13];
    state[13] = state[9];
    state[9] = state[5];
    state[5] = state[1];
    state[1] = t;
    t = state[14];
    u = state[10];
    state[14] = state[6];
    state[10] = state[2];
    state[6] = t;
    state[2] = u;
    t = state[15];
    u = state[11];
    v = state[7];
    state[15] = state[3];
    state[11] = t;
    state[7] = u;
    state[3] = v;
    for (j = 0; j < 16; ++j) {
      // InvSubBytes
      state[j] = inv_s[state[j]];
      // AddRoundKey
      state[j] ^= key[j];
    }
    return state;
  }

  function encrypt256(input, key) {
    var t, u, v, k;
    var state = new Uint8Array(16);
    state.set(input);
    for (j = 0; j < 16; ++j) {
      // AddRoundKey
      state[j] ^= key[j];
    }

    for (i = 1; i < 14; i++) {
      //SubBytes
      for (j = 0; j < 16; ++j) {
        state[j] = s[state[j]];
      }
      //ShiftRows
      v = state[1];
      state[1] = state[5];
      state[5] = state[9];
      state[9] = state[13];
      state[13] = v;
      v = state[2];
      u = state[6];
      state[2] = state[10];
      state[6] = state[14];
      state[10] = v;
      state[14] = u;
      v = state[3];
      u = state[7];
      t = state[11];
      state[3] = state[15];
      state[7] = v;
      state[11] = u;
      state[15] = t;
      //MixColumns
      for (var j = 0; j < 16; j += 4) {
        var s0 = state[j + 0], s1 = state[j + 1];
        var s2 = state[j + 2], s3 = state[j + 3];
        t = s0 ^ s1 ^ s2 ^ s3;
        state[j + 0] ^= t ^ mixCol[s0 ^ s1];
        state[j + 1] ^= t ^ mixCol[s1 ^ s2];
        state[j + 2] ^= t ^ mixCol[s2 ^ s3];
        state[j + 3] ^= t ^ mixCol[s3 ^ s0];
      }
      //AddRoundKey
      for (j = 0, k = i * 16; j < 16; ++j, ++k) {
        state[j] ^= key[k];
      }
    }

    //SubBytes
    for (j = 0; j < 16; ++j) {
      state[j] = s[state[j]];
    }
    //ShiftRows
    v = state[1];
    state[1] = state[5];
    state[5] = state[9];
    state[9] = state[13];
    state[13] = v;
    v = state[2];
    u = state[6];
    state[2] = state[10];
    state[6] = state[14];
    state[10] = v;
    state[14] = u;
    v = state[3];
    u = state[7];
    t = state[11];
    state[3] = state[15];
    state[7] = v;
    state[11] = u;
    state[15] = t;
    //AddRoundKey
    for (j = 0, k = 224; j < 16; ++j, ++k) {
      state[j] ^= key[k];
    }

    return state;

  }

  function AES256Cipher(key) {
    this.key = expandKey256(key);
    this.buffer = new Uint8Array(16);
    this.bufferPosition = 0;
  }

  function decryptBlock2(data, finalize) {
    var i, j, ii, sourceLength = data.length,
        buffer = this.buffer, bufferLength = this.bufferPosition,
        result = [], iv = this.iv;

    for (i = 0; i < sourceLength; ++i) {
      buffer[bufferLength] = data[i];
      ++bufferLength;
      if (bufferLength < 16) {
        continue;
      }
      // buffer is full, decrypting
      var plain = decrypt256(buffer, this.key);
      // xor-ing the IV vector to get plain text
      for (j = 0; j < 16; ++j) {
        plain[j] ^= iv[j];
      }
      iv = buffer;
      result.push(plain);
      buffer = new Uint8Array(16);
      bufferLength = 0;
    }
    // saving incomplete buffer
    this.buffer = buffer;
    this.bufferLength = bufferLength;
    this.iv = iv;
    if (result.length === 0) {
      return new Uint8Array([]);
    }
    // combining plain text blocks into one
    var outputLength = 16 * result.length;
    if (finalize) {
      // undo a padding that is described in RFC 2898
      var lastBlock = result[result.length - 1];
      var psLen = lastBlock[15];
      if (psLen <= 16) {
        for (i = 15, ii = 16 - psLen; i >= ii; --i) {
          if (lastBlock[i] !== psLen) {
            // Invalid padding, assume that the block has no padding.
            psLen = 0;
            break;
          }
        }
        outputLength -= psLen;
        result[result.length - 1] = lastBlock.subarray(0, 16 - psLen);
      }
    }
    var output = new Uint8Array(outputLength);
    for (i = 0, j = 0, ii = result.length; i < ii; ++i, j += 16) {
      output.set(result[i], j);
    }
    return output;

  }

  AES256Cipher.prototype = {
    decryptBlock: function AES256Cipher_decryptBlock(data, finalize, iv) {
      var i, sourceLength = data.length;
      var buffer = this.buffer, bufferLength = this.bufferPosition;
      // if not supplied an IV wait for IV values
      // they are at the start of the stream
      if (iv) {
        this.iv = iv;
      } else {
        for (i = 0; bufferLength < 16 &&
             i < sourceLength; ++i, ++bufferLength) {
          buffer[bufferLength] = data[i];
        }
        if (bufferLength < 16) {
          //need more data
          this.bufferLength = bufferLength;
          return new Uint8Array([]);
        }
        this.iv = buffer;
        data = data.subarray(16);
      }
      this.buffer = new Uint8Array(16);
      this.bufferLength = 0;
      // starting decryption
      this.decryptBlock = decryptBlock2;
      return this.decryptBlock(data, finalize);
    },
    encrypt: function AES256Cipher_encrypt(data, iv) {
      var i, j, ii, sourceLength = data.length,
          buffer = this.buffer, bufferLength = this.bufferPosition,
          result = [];
      if (!iv) {
        iv = new Uint8Array(16);
      }
      for (i = 0; i < sourceLength; ++i) {
        buffer[bufferLength] = data[i];
        ++bufferLength;
        if (bufferLength < 16) {
          continue;
        }
        for (j = 0; j < 16; ++j) {
          buffer[j] ^= iv[j];
        }

        // buffer is full, encrypting
        var cipher = encrypt256(buffer, this.key);
        this.iv = cipher;
        result.push(cipher);
        buffer = new Uint8Array(16);
        bufferLength = 0;
      }
      // saving incomplete buffer
      this.buffer = buffer;
      this.bufferLength = bufferLength;
      this.iv = iv;
      if (result.length === 0) {
        return new Uint8Array([]);
      }
      // combining plain text blocks into one
      var outputLength = 16 * result.length;
      var output = new Uint8Array(outputLength);
      for (i = 0, j = 0, ii = result.length; i < ii; ++i, j += 16) {
        output.set(result[i], j);
      }
      return output;
    }
  };

  return AES256Cipher;
})();

var PDF17 = (function PDF17Closure() {

  function compareByteArrays(array1, array2) {
    if (array1.length !== array2.length) {
      return false;
    }
    for (var i = 0; i < array1.length; i++) {
      if (array1[i] !== array2[i]) {
        return false;
      }
    }
    return true;
  }

  function PDF17() {
  }

  PDF17.prototype = {
    checkOwnerPassword: function PDF17_checkOwnerPassword(password,
                                                          ownerValidationSalt,
                                                          userBytes,
                                                          ownerPassword) {
      var hashData = new Uint8Array(password.length + 56);
      hashData.set(password, 0);
      hashData.set(ownerValidationSalt, password.length);
      hashData.set(userBytes, password.length + ownerValidationSalt.length);
      var result = calculateSHA256(hashData, 0, hashData.length);
      return compareByteArrays(result, ownerPassword);
    },
    checkUserPassword: function PDF17_checkUserPassword(password,
                                                        userValidationSalt,
                                                        userPassword) {
      var hashData = new Uint8Array(password.length + 8);
      hashData.set(password, 0);
      hashData.set(userValidationSalt, password.length);
      var result = calculateSHA256(hashData, 0, hashData.length);
      return compareByteArrays(result, userPassword);
    },
    getOwnerKey: function PDF17_getOwnerKey(password, ownerKeySalt, userBytes,
                                            ownerEncryption) {
      var hashData = new Uint8Array(password.length + 56);
      hashData.set(password, 0);
      hashData.set(ownerKeySalt, password.length);
      hashData.set(userBytes, password.length + ownerKeySalt.length);
      var key = calculateSHA256(hashData, 0, hashData.length);
      var cipher = new AES256Cipher(key);
      return cipher.decryptBlock(ownerEncryption,
                                 false,
                                 new Uint8Array(16));

    },
    getUserKey: function PDF17_getUserKey(password, userKeySalt,
                                          userEncryption) {
      var hashData = new Uint8Array(password.length + 8);
      hashData.set(password, 0);
      hashData.set(userKeySalt, password.length);
      //key is the decryption key for the UE string
      var key = calculateSHA256(hashData, 0, hashData.length);
      var cipher = new AES256Cipher(key);
      return cipher.decryptBlock(userEncryption,
                                 false,
                                 new Uint8Array(16));
    }
  };
  return PDF17;
})();

var PDF20 = (function PDF20Closure() {

  function concatArrays(array1, array2) {
    var t = new Uint8Array(array1.length + array2.length);
    t.set(array1, 0);
    t.set(array2, array1.length);
    return t;
  }

  function calculatePDF20Hash(password, input, userBytes) {
    //This refers to Algorithm 2.B as defined in ISO 32000-2
    var k = calculateSHA256(input, 0, input.length).subarray(0, 32);
    var e = [0];
    var i = 0;
    while (i < 64 || e[e.length - 1] > i - 32) {
      var arrayLength = password.length + k.length + userBytes.length;

      var k1 = new Uint8Array(arrayLength * 64);
      var array = concatArrays(password, k);
      array = concatArrays(array, userBytes);
      for (var j = 0, pos = 0; j < 64; j++, pos += arrayLength) {
        k1.set(array, pos);
      }
      //AES128 CBC NO PADDING with
      //first 16 bytes of k as the key and the second 16 as the iv.
      var cipher = new AES128Cipher(k.subarray(0, 16));
      e = cipher.encrypt(k1, k.subarray(16, 32));
      //Now we have to take the first 16 bytes of an unsigned
      //big endian integer... and compute the remainder
      //modulo 3.... That is a fairly large number and
      //JavaScript isn't going to handle that well...
      //So we're using a trick that allows us to perform
      //modulo math byte by byte
      var remainder = 0;
      for (var z = 0; z < 16; z++) {
        remainder *= (256 % 3);
        remainder %= 3;
        remainder += ((e[z] >>> 0) % 3);
        remainder %= 3;
      }
      if (remainder === 0) {
        k = calculateSHA256(e, 0, e.length);
      }
      else if (remainder === 1) {
        k = calculateSHA384(e, 0, e.length);
      }
      else if (remainder === 2) {
        k = calculateSHA512(e, 0, e.length);
      }
      i++;
    }
    return k.subarray(0, 32);
  }

  function PDF20() {
  }

  function compareByteArrays(array1, array2) {
    if (array1.length !== array2.length) {
      return false;
    }
    for (var i = 0; i < array1.length; i++) {
      if (array1[i] !== array2[i]) {
        return false;
      }
    }
    return true;
  }

  PDF20.prototype = {
    hash: function PDF20_hash(password, concatBytes, userBytes) {
      return calculatePDF20Hash(password, concatBytes, userBytes);
    },
    checkOwnerPassword: function PDF20_checkOwnerPassword(password,
                                                          ownerValidationSalt,
                                                          userBytes,
                                                          ownerPassword) {
      var hashData = new Uint8Array(password.length + 56);
      hashData.set(password, 0);
      hashData.set(ownerValidationSalt, password.length);
      hashData.set(userBytes, password.length + ownerValidationSalt.length);
      var result = calculatePDF20Hash(password, hashData, userBytes);
      return compareByteArrays(result, ownerPassword);
    },
    checkUserPassword: function PDF20_checkUserPassword(password,
                                                        userValidationSalt,
                                                        userPassword) {
      var hashData = new Uint8Array(password.length + 8);
      hashData.set(password, 0);
      hashData.set(userValidationSalt, password.length);
      var result = calculatePDF20Hash(password, hashData, []);
      return compareByteArrays(result, userPassword);
    },
    getOwnerKey: function PDF20_getOwnerKey(password, ownerKeySalt, userBytes,
                                            ownerEncryption) {
      var hashData = new Uint8Array(password.length + 56);
      hashData.set(password, 0);
      hashData.set(ownerKeySalt, password.length);
      hashData.set(userBytes, password.length + ownerKeySalt.length);
      var key = calculatePDF20Hash(password, hashData, userBytes);
      var cipher = new AES256Cipher(key);
      return cipher.decryptBlock(ownerEncryption,
                                 false,
                                 new Uint8Array(16));

    },
    getUserKey: function PDF20_getUserKey(password, userKeySalt,
                                          userEncryption) {
      var hashData = new Uint8Array(password.length + 8);
      hashData.set(password, 0);
      hashData.set(userKeySalt, password.length);
      //key is the decryption key for the UE string
      var key = calculatePDF20Hash(password, hashData, []);
      var cipher = new AES256Cipher(key);
      return cipher.decryptBlock(userEncryption,
                                 false,
                                 new Uint8Array(16));
    }
  };
  return PDF20;
})();

var CipherTransform = (function CipherTransformClosure() {
  function CipherTransform(stringCipherConstructor, streamCipherConstructor) {
    this.stringCipherConstructor = stringCipherConstructor;
    this.streamCipherConstructor = streamCipherConstructor;
  }

  CipherTransform.prototype = {
    createStream: function CipherTransform_createStream(stream, length) {
      var cipher = new this.streamCipherConstructor();
      return new DecryptStream(stream, length,
        function cipherTransformDecryptStream(data, finalize) {
          return cipher.decryptBlock(data, finalize);
        }
      );
    },
    decryptString: function CipherTransform_decryptString(s) {
      var cipher = new this.stringCipherConstructor();
      var data = stringToBytes(s);
      data = cipher.decryptBlock(data, true);
      return bytesToString(data);
    }
  };
  return CipherTransform;
})();

var CipherTransformFactory = (function CipherTransformFactoryClosure() {
  var defaultPasswordBytes = new Uint8Array([
    0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
    0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
    0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
    0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A]);

  function createEncryptionKey20(revision, password, ownerPassword,
                                 ownerValidationSalt, ownerKeySalt, uBytes,
                                 userPassword, userValidationSalt, userKeySalt,
                                 ownerEncryption, userEncryption, perms) {
    if (password) {
      var passwordLength = Math.min(127, password.length);
      password = password.subarray(0, passwordLength);
    } else {
      password = [];
    }
    var pdfAlgorithm;
    if (revision === 6) {
      pdfAlgorithm = new PDF20();
    } else {
      pdfAlgorithm = new PDF17();
    }

    if (pdfAlgorithm) {
      if (pdfAlgorithm.checkUserPassword(password, userValidationSalt,
                                         userPassword)) {
        return pdfAlgorithm.getUserKey(password, userKeySalt, userEncryption);
      } else if (password.length && pdfAlgorithm.checkOwnerPassword(password,
                                                   ownerValidationSalt,
                                                   uBytes,
                                                   ownerPassword)) {
        return pdfAlgorithm.getOwnerKey(password, ownerKeySalt, uBytes,
                                        ownerEncryption);
      }
    }

    return null;
  }

  function prepareKeyData(fileId, password, ownerPassword, userPassword,
                          flags, revision, keyLength, encryptMetadata) {
    var hashDataSize = 40 + ownerPassword.length + fileId.length;
    var hashData = new Uint8Array(hashDataSize), i = 0, j, n;
    if (password) {
      n = Math.min(32, password.length);
      for (; i < n; ++i) {
        hashData[i] = password[i];
      }
    }
    j = 0;
    while (i < 32) {
      hashData[i++] = defaultPasswordBytes[j++];
    }
    // as now the padded password in the hashData[0..i]
    for (j = 0, n = ownerPassword.length; j < n; ++j) {
      hashData[i++] = ownerPassword[j];
    }
    hashData[i++] = flags & 0xFF;
    hashData[i++] = (flags >> 8) & 0xFF;
    hashData[i++] = (flags >> 16) & 0xFF;
    hashData[i++] = (flags >>> 24) & 0xFF;
    for (j = 0, n = fileId.length; j < n; ++j) {
      hashData[i++] = fileId[j];
    }
    if (revision >= 4 && !encryptMetadata) {
      hashData[i++] = 0xFF;
      hashData[i++] = 0xFF;
      hashData[i++] = 0xFF;
      hashData[i++] = 0xFF;
    }
    var hash = calculateMD5(hashData, 0, i);
    var keyLengthInBytes = keyLength >> 3;
    if (revision >= 3) {
      for (j = 0; j < 50; ++j) {
        hash = calculateMD5(hash, 0, keyLengthInBytes);
      }
    }
    var encryptionKey = hash.subarray(0, keyLengthInBytes);
    var cipher, checkData;

    if (revision >= 3) {
      for (i = 0; i < 32; ++i) {
        hashData[i] = defaultPasswordBytes[i];
      }
      for (j = 0, n = fileId.length; j < n; ++j) {
        hashData[i++] = fileId[j];
      }
      cipher = new ARCFourCipher(encryptionKey);
      checkData = cipher.encryptBlock(calculateMD5(hashData, 0, i));
      n = encryptionKey.length;
      var derivedKey = new Uint8Array(n), k;
      for (j = 1; j <= 19; ++j) {
        for (k = 0; k < n; ++k) {
          derivedKey[k] = encryptionKey[k] ^ j;
        }
        cipher = new ARCFourCipher(derivedKey);
        checkData = cipher.encryptBlock(checkData);
      }
      for (j = 0, n = checkData.length; j < n; ++j) {
        if (userPassword[j] !== checkData[j]) {
          return null;
        }
      }
    } else {
      cipher = new ARCFourCipher(encryptionKey);
      checkData = cipher.encryptBlock(defaultPasswordBytes);
      for (j = 0, n = checkData.length; j < n; ++j) {
        if (userPassword[j] !== checkData[j]) {
          return null;
        }
      }
    }
    return encryptionKey;
  }

  function decodeUserPassword(password, ownerPassword, revision, keyLength) {
    var hashData = new Uint8Array(32), i = 0, j, n;
    n = Math.min(32, password.length);
    for (; i < n; ++i) {
      hashData[i] = password[i];
    }
    j = 0;
    while (i < 32) {
      hashData[i++] = defaultPasswordBytes[j++];
    }
    var hash = calculateMD5(hashData, 0, i);
    var keyLengthInBytes = keyLength >> 3;
    if (revision >= 3) {
      for (j = 0; j < 50; ++j) {
        hash = calculateMD5(hash, 0, hash.length);
      }
    }

    var cipher, userPassword;
    if (revision >= 3) {
      userPassword = ownerPassword;
      var derivedKey = new Uint8Array(keyLengthInBytes), k;
      for (j = 19; j >= 0; j--) {
        for (k = 0; k < keyLengthInBytes; ++k) {
          derivedKey[k] = hash[k] ^ j;
        }
        cipher = new ARCFourCipher(derivedKey);
        userPassword = cipher.encryptBlock(userPassword);
      }
    } else {
      cipher = new ARCFourCipher(hash.subarray(0, keyLengthInBytes));
      userPassword = cipher.encryptBlock(ownerPassword);
    }
    return userPassword;
  }

  var identityName = Name.get('Identity');

  function CipherTransformFactory(dict, fileId, password) {
    var filter = dict.get('Filter');
    if (!isName(filter) || filter.name !== 'Standard') {
      error('unknown encryption method');
    }
    this.dict = dict;
    var algorithm = dict.get('V');
    if (!isInt(algorithm) ||
        (algorithm !== 1 && algorithm !== 2 && algorithm !== 4 &&
        algorithm !== 5)) {
      error('unsupported encryption algorithm');
    }
    this.algorithm = algorithm;
    var keyLength = dict.get('Length') || 40;
    if (!isInt(keyLength) ||
        keyLength < 40 || (keyLength % 8) !== 0) {
      error('invalid key length');
    }

    // prepare keys
    var ownerPassword = stringToBytes(dict.get('O')).subarray(0, 32);
    var userPassword = stringToBytes(dict.get('U')).subarray(0, 32);
    var flags = dict.get('P');
    var revision = dict.get('R');
    // meaningful when V is 4 or 5
    var encryptMetadata = ((algorithm === 4 || algorithm === 5) &&
                           dict.get('EncryptMetadata') !== false);
    this.encryptMetadata = encryptMetadata;

    var fileIdBytes = stringToBytes(fileId);
    var passwordBytes;
    if (password) {
      if (revision === 6) {
        try {
          password = utf8StringToString(password);
        } catch (ex) {
          warn('CipherTransformFactory: ' +
               'Unable to convert UTF8 encoded password.');
        }
      }
      passwordBytes = stringToBytes(password);
    }

    var encryptionKey;
    if (algorithm !== 5) {
      encryptionKey = prepareKeyData(fileIdBytes, passwordBytes,
                                     ownerPassword, userPassword, flags,
                                     revision, keyLength, encryptMetadata);
    }
    else {
      var ownerValidationSalt = stringToBytes(dict.get('O')).subarray(32, 40);
      var ownerKeySalt = stringToBytes(dict.get('O')).subarray(40, 48);
      var uBytes = stringToBytes(dict.get('U')).subarray(0, 48);
      var userValidationSalt = stringToBytes(dict.get('U')).subarray(32, 40);
      var userKeySalt = stringToBytes(dict.get('U')).subarray(40, 48);
      var ownerEncryption = stringToBytes(dict.get('OE'));
      var userEncryption = stringToBytes(dict.get('UE'));
      var perms = stringToBytes(dict.get('Perms'));
      encryptionKey =
        createEncryptionKey20(revision, passwordBytes,
          ownerPassword, ownerValidationSalt,
          ownerKeySalt, uBytes,
          userPassword, userValidationSalt,
          userKeySalt, ownerEncryption,
          userEncryption, perms);
    }
    if (!encryptionKey && !password) {
      throw new PasswordException('No password given',
                                  PasswordResponses.NEED_PASSWORD);
    } else if (!encryptionKey && password) {
      // Attempting use the password as an owner password
      var decodedPassword = decodeUserPassword(passwordBytes, ownerPassword,
                                               revision, keyLength);
      encryptionKey = prepareKeyData(fileIdBytes, decodedPassword,
                                     ownerPassword, userPassword, flags,
                                     revision, keyLength, encryptMetadata);
    }

    if (!encryptionKey) {
      throw new PasswordException('Incorrect Password',
                                  PasswordResponses.INCORRECT_PASSWORD);
    }

    this.encryptionKey = encryptionKey;

    if (algorithm >= 4) {
      this.cf = dict.get('CF');
      this.stmf = dict.get('StmF') || identityName;
      this.strf = dict.get('StrF') || identityName;
      this.eff = dict.get('EFF') || this.stmf;
    }
  }

  function buildObjectKey(num, gen, encryptionKey, isAes) {
    var key = new Uint8Array(encryptionKey.length + 9), i, n;
    for (i = 0, n = encryptionKey.length; i < n; ++i) {
      key[i] = encryptionKey[i];
    }
    key[i++] = num & 0xFF;
    key[i++] = (num >> 8) & 0xFF;
    key[i++] = (num >> 16) & 0xFF;
    key[i++] = gen & 0xFF;
    key[i++] = (gen >> 8) & 0xFF;
    if (isAes) {
      key[i++] = 0x73;
      key[i++] = 0x41;
      key[i++] = 0x6C;
      key[i++] = 0x54;
    }
    var hash = calculateMD5(key, 0, i);
    return hash.subarray(0, Math.min(encryptionKey.length + 5, 16));
  }

  function buildCipherConstructor(cf, name, num, gen, key) {
    var cryptFilter = cf.get(name.name);
    var cfm;
    if (cryptFilter !== null && cryptFilter !== undefined) {
      cfm = cryptFilter.get('CFM');
    }
    if (!cfm || cfm.name === 'None') {
      return function cipherTransformFactoryBuildCipherConstructorNone() {
        return new NullCipher();
      };
    }
    if ('V2' === cfm.name) {
      return function cipherTransformFactoryBuildCipherConstructorV2() {
        return new ARCFourCipher(buildObjectKey(num, gen, key, false));
      };
    }
    if ('AESV2' === cfm.name) {
      return function cipherTransformFactoryBuildCipherConstructorAESV2() {
        return new AES128Cipher(buildObjectKey(num, gen, key, true));
      };
    }
    if ('AESV3' === cfm.name) {
      return function cipherTransformFactoryBuildCipherConstructorAESV3() {
        return new AES256Cipher(key);
      };
    }
    error('Unknown crypto method');
  }

  CipherTransformFactory.prototype = {
    createCipherTransform:
        function CipherTransformFactory_createCipherTransform(num, gen) {
      if (this.algorithm === 4 || this.algorithm === 5) {
        return new CipherTransform(
          buildCipherConstructor(this.cf, this.stmf,
                                 num, gen, this.encryptionKey),
          buildCipherConstructor(this.cf, this.strf,
                                 num, gen, this.encryptionKey));
      }
      // algorithms 1 and 2
      var key = buildObjectKey(num, gen, this.encryptionKey, false);
      var cipherConstructor = function buildCipherCipherConstructor() {
        return new ARCFourCipher(key);
      };
      return new CipherTransform(cipherConstructor, cipherConstructor);
    }
  };

  return CipherTransformFactory;
})();

exports.AES128Cipher = AES128Cipher;
exports.AES256Cipher = AES256Cipher;
exports.ARCFourCipher = ARCFourCipher;
exports.CipherTransformFactory = CipherTransformFactory;
exports.PDF17 = PDF17;
exports.PDF20 = PDF20;
exports.calculateMD5 = calculateMD5;
exports.calculateSHA256 = calculateSHA256;
exports.calculateSHA384 = calculateSHA384;
exports.calculateSHA512 = calculateSHA512;
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/core/obj', ['exports', 'pdfjs/shared/util',
      'pdfjs/core/primitives', 'pdfjs/core/crypto', 'pdfjs/core/parser',
      'pdfjs/core/chunked_stream'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('../shared/util.js'), require('./primitives.js'),
      require('./crypto.js'), require('./parser.js'),
      require('./chunked_stream.js'));
  } else {
    factory((root.pdfjsCoreObj = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreCrypto, root.pdfjsCoreParser,
      root.pdfjsCoreChunkedStream);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreCrypto, coreParser,
                  coreChunkedStream) {

var InvalidPDFException = sharedUtil.InvalidPDFException;
var MissingDataException = sharedUtil.MissingDataException;
var XRefParseException = sharedUtil.XRefParseException;
var assert = sharedUtil.assert;
var bytesToString = sharedUtil.bytesToString;
var createPromiseCapability = sharedUtil.createPromiseCapability;
var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var isInt = sharedUtil.isInt;
var isString = sharedUtil.isString;
var shadow = sharedUtil.shadow;
var stringToPDFString = sharedUtil.stringToPDFString;
var stringToUTF8String = sharedUtil.stringToUTF8String;
var warn = sharedUtil.warn;
var Ref = corePrimitives.Ref;
var RefSet = corePrimitives.RefSet;
var RefSetCache = corePrimitives.RefSetCache;
var isName = corePrimitives.isName;
var isCmd = corePrimitives.isCmd;
var isDict = corePrimitives.isDict;
var isRef = corePrimitives.isRef;
var isStream = corePrimitives.isStream;
var CipherTransformFactory = coreCrypto.CipherTransformFactory;
var Lexer = coreParser.Lexer;
var Parser = coreParser.Parser;
var ChunkedStream = coreChunkedStream.ChunkedStream;

var Catalog = (function CatalogClosure() {
  function Catalog(pdfManager, xref, pageFactory) {
    this.pdfManager = pdfManager;
    this.xref = xref;
    this.catDict = xref.getCatalogObj();
    this.fontCache = new RefSetCache();
    assert(isDict(this.catDict),
      'catalog object is not a dictionary');

    // TODO refactor to move getPage() to the PDFDocument.
    this.pageFactory = pageFactory;
    this.pagePromises = [];
  }

  Catalog.prototype = {
    get metadata() {
      var streamRef = this.catDict.getRaw('Metadata');
      if (!isRef(streamRef)) {
        return shadow(this, 'metadata', null);
      }

      var encryptMetadata = (!this.xref.encrypt ? false :
                             this.xref.encrypt.encryptMetadata);

      var stream = this.xref.fetch(streamRef, !encryptMetadata);
      var metadata;
      if (stream && isDict(stream.dict)) {
        var type = stream.dict.get('Type');
        var subtype = stream.dict.get('Subtype');

        if (isName(type) && isName(subtype) &&
            type.name === 'Metadata' && subtype.name === 'XML') {
          // XXX: This should examine the charset the XML document defines,
          // however since there are currently no real means to decode
          // arbitrary charsets, let's just hope that the author of the PDF
          // was reasonable enough to stick with the XML default charset,
          // which is UTF-8.
          try {
            metadata = stringToUTF8String(bytesToString(stream.getBytes()));
          } catch (e) {
            info('Skipping invalid metadata.');
          }
        }
      }

      return shadow(this, 'metadata', metadata);
    },
    get toplevelPagesDict() {
      var pagesObj = this.catDict.get('Pages');
      assert(isDict(pagesObj), 'invalid top-level pages dictionary');
      // shadow the prototype getter
      return shadow(this, 'toplevelPagesDict', pagesObj);
    },
    get documentOutline() {
      var obj = null;
      try {
        obj = this.readDocumentOutline();
      } catch (ex) {
        if (ex instanceof MissingDataException) {
          throw ex;
        }
        warn('Unable to read document outline');
      }
      return shadow(this, 'documentOutline', obj);
    },
    readDocumentOutline: function Catalog_readDocumentOutline() {
      var xref = this.xref;
      var obj = this.catDict.get('Outlines');
      var root = { items: [] };
      if (isDict(obj)) {
        obj = obj.getRaw('First');
        var processed = new RefSet();
        if (isRef(obj)) {
          var queue = [{obj: obj, parent: root}];
          // to avoid recursion keeping track of the items
          // in the processed dictionary
          processed.put(obj);
          while (queue.length > 0) {
            var i = queue.shift();
            var outlineDict = xref.fetchIfRef(i.obj);
            if (outlineDict === null) {
              continue;
            }
            if (!outlineDict.has('Title')) {
              error('Invalid outline item');
            }
            var dest = outlineDict.get('A');
            if (dest) {
              dest = dest.get('D');
            } else if (outlineDict.has('Dest')) {
              dest = outlineDict.getRaw('Dest');
              if (isName(dest)) {
                dest = dest.name;
              }
            }
            var title = outlineDict.get('Title');
            var outlineItem = {
              dest: dest,
              title: stringToPDFString(title),
              color: outlineDict.get('C') || [0, 0, 0],
              count: outlineDict.get('Count'),
              bold: !!(outlineDict.get('F') & 2),
              italic: !!(outlineDict.get('F') & 1),
              items: []
            };
            i.parent.items.push(outlineItem);
            obj = outlineDict.getRaw('First');
            if (isRef(obj) && !processed.has(obj)) {
              queue.push({obj: obj, parent: outlineItem});
              processed.put(obj);
            }
            obj = outlineDict.getRaw('Next');
            if (isRef(obj) && !processed.has(obj)) {
              queue.push({obj: obj, parent: i.parent});
              processed.put(obj);
            }
          }
        }
      }
      return (root.items.length > 0 ? root.items : null);
    },
    get numPages() {
      var obj = this.toplevelPagesDict.get('Count');
      assert(
        isInt(obj),
        'page count in top level pages object is not an integer'
      );
      // shadow the prototype getter
      return shadow(this, 'num', obj);
    },
    get destinations() {
      function fetchDestination(dest) {
        return isDict(dest) ? dest.get('D') : dest;
      }

      var xref = this.xref;
      var dests = {}, nameTreeRef, nameDictionaryRef;
      var obj = this.catDict.get('Names');
      if (obj && obj.has('Dests')) {
        nameTreeRef = obj.getRaw('Dests');
      } else if (this.catDict.has('Dests')) {
        nameDictionaryRef = this.catDict.get('Dests');
      }

      if (nameDictionaryRef) {
        // reading simple destination dictionary
        obj = nameDictionaryRef;
        obj.forEach(function catalogForEach(key, value) {
          if (!value) {
            return;
          }
          dests[key] = fetchDestination(value);
        });
      }
      if (nameTreeRef) {
        var nameTree = new NameTree(nameTreeRef, xref);
        var names = nameTree.getAll();
        for (var name in names) {
          if (!names.hasOwnProperty(name)) {
            continue;
          }
          dests[name] = fetchDestination(names[name]);
        }
      }
      return shadow(this, 'destinations', dests);
    },
    getDestination: function Catalog_getDestination(destinationId) {
      function fetchDestination(dest) {
        return isDict(dest) ? dest.get('D') : dest;
      }

      var xref = this.xref;
      var dest = null, nameTreeRef, nameDictionaryRef;
      var obj = this.catDict.get('Names');
      if (obj && obj.has('Dests')) {
        nameTreeRef = obj.getRaw('Dests');
      } else if (this.catDict.has('Dests')) {
        nameDictionaryRef = this.catDict.get('Dests');
      }

      if (nameDictionaryRef) { // Simple destination dictionary.
        var value = nameDictionaryRef.get(destinationId);
        if (value) {
          dest = fetchDestination(value);
        }
      }
      if (nameTreeRef) {
        var nameTree = new NameTree(nameTreeRef, xref);
        dest = fetchDestination(nameTree.get(destinationId));
      }
      return dest;
    },
    get attachments() {
      var xref = this.xref;
      var attachments = null, nameTreeRef;
      var obj = this.catDict.get('Names');
      if (obj) {
        nameTreeRef = obj.getRaw('EmbeddedFiles');
      }

      if (nameTreeRef) {
        var nameTree = new NameTree(nameTreeRef, xref);
        var names = nameTree.getAll();
        for (var name in names) {
          if (!names.hasOwnProperty(name)) {
            continue;
          }
          var fs = new FileSpec(names[name], xref);
          if (!attachments) {
            attachments = {};
          }
          attachments[stringToPDFString(name)] = fs.serializable;
        }
      }
      return shadow(this, 'attachments', attachments);
    },
    get javaScript() {
      var xref = this.xref;
      var obj = this.catDict.get('Names');

      var javaScript = [];
      function appendIfJavaScriptDict(jsDict) {
        var type = jsDict.get('S');
        if (!isName(type) || type.name !== 'JavaScript') {
          return;
        }
        var js = jsDict.get('JS');
        if (isStream(js)) {
          js = bytesToString(js.getBytes());
        } else if (!isString(js)) {
          return;
        }
        javaScript.push(stringToPDFString(js));
      }
      if (obj && obj.has('JavaScript')) {
        var nameTree = new NameTree(obj.getRaw('JavaScript'), xref);
        var names = nameTree.getAll();
        for (var name in names) {
          if (!names.hasOwnProperty(name)) {
            continue;
          }
          // We don't really use the JavaScript right now. This code is
          // defensive so we don't cause errors on document load.
          var jsDict = names[name];
          if (isDict(jsDict)) {
            appendIfJavaScriptDict(jsDict);
          }
        }
      }

      // Append OpenAction actions to javaScript array
      var openactionDict = this.catDict.get('OpenAction');
      if (isDict(openactionDict, 'Action')) {
        var actionType = openactionDict.get('S');
        if (isName(actionType) && actionType.name === 'Named') {
          // The named Print action is not a part of the PDF 1.7 specification,
          // but is supported by many PDF readers/writers (including Adobe's).
          var action = openactionDict.get('N');
          if (isName(action) && action.name === 'Print') {
            javaScript.push('print({});');
          }
        } else {
          appendIfJavaScriptDict(openactionDict);
        }
      }

      return shadow(this, 'javaScript', javaScript);
    },

    cleanup: function Catalog_cleanup() {
      var promises = [];
      this.fontCache.forEach(function (promise) {
        promises.push(promise);
      });
      return Promise.all(promises).then(function (translatedFonts) {
        for (var i = 0, ii = translatedFonts.length; i < ii; i++) {
          var font = translatedFonts[i].dict;
          delete font.translated;
        }
        this.fontCache.clear();
      }.bind(this));
    },

    getPage: function Catalog_getPage(pageIndex) {
      if (!(pageIndex in this.pagePromises)) {
        this.pagePromises[pageIndex] = this.getPageDict(pageIndex).then(
          function (a) {
            var dict = a[0];
            var ref = a[1];
            return this.pageFactory.createPage(pageIndex, dict, ref,
                                               this.fontCache);
          }.bind(this)
        );
      }
      return this.pagePromises[pageIndex];
    },

    getPageDict: function Catalog_getPageDict(pageIndex) {
      var capability = createPromiseCapability();
      var nodesToVisit = [this.catDict.getRaw('Pages')];
      var currentPageIndex = 0;
      var xref = this.xref;
      var checkAllKids = false;

      function next() {
        while (nodesToVisit.length) {
          var currentNode = nodesToVisit.pop();

          if (isRef(currentNode)) {
            xref.fetchAsync(currentNode).then(function (obj) {
              if (isDict(obj, 'Page') || (isDict(obj) && !obj.has('Kids'))) {
                if (pageIndex === currentPageIndex) {
                  capability.resolve([obj, currentNode]);
                } else {
                  currentPageIndex++;
                  next();
                }
                return;
              }
              nodesToVisit.push(obj);
              next();
            }, capability.reject);
            return;
          }

          // Must be a child page dictionary.
          assert(
            isDict(currentNode),
            'page dictionary kid reference points to wrong type of object'
          );
          var count = currentNode.get('Count');
          // If the current node doesn't have any children, avoid getting stuck
          // in an empty node further down in the tree (see issue5644.pdf).
          if (count === 0) {
            checkAllKids = true;
          }
          // Skip nodes where the page can't be.
          if (currentPageIndex + count <= pageIndex) {
            currentPageIndex += count;
            continue;
          }

          var kids = currentNode.get('Kids');
          assert(isArray(kids), 'page dictionary kids object is not an array');
          if (!checkAllKids && count === kids.length) {
            // Nodes that don't have the page have been skipped and this is the
            // bottom of the tree which means the page requested must be a
            // descendant of this pages node. Ideally we would just resolve the
            // promise with the page ref here, but there is the case where more
            // pages nodes could link to single a page (see issue 3666 pdf). To
            // handle this push it back on the queue so if it is a pages node it
            // will be descended into.
            nodesToVisit = [kids[pageIndex - currentPageIndex]];
            currentPageIndex = pageIndex;
            continue;
          } else {
            for (var last = kids.length - 1; last >= 0; last--) {
              nodesToVisit.push(kids[last]);
            }
          }
        }
        capability.reject('Page index ' + pageIndex + ' not found.');
      }
      next();
      return capability.promise;
    },

    getPageIndex: function Catalog_getPageIndex(ref) {
      // The page tree nodes have the count of all the leaves below them. To get
      // how many pages are before we just have to walk up the tree and keep
      // adding the count of siblings to the left of the node.
      var xref = this.xref;
      function pagesBeforeRef(kidRef) {
        var total = 0;
        var parentRef;
        return xref.fetchAsync(kidRef).then(function (node) {
          if (!node) {
            return null;
          }
          parentRef = node.getRaw('Parent');
          return node.getAsync('Parent');
        }).then(function (parent) {
          if (!parent) {
            return null;
          }
          return parent.getAsync('Kids');
        }).then(function (kids) {
          if (!kids) {
            return null;
          }
          var kidPromises = [];
          var found = false;
          for (var i = 0; i < kids.length; i++) {
            var kid = kids[i];
            assert(isRef(kid), 'kids must be a ref');
            if (kid.num === kidRef.num) {
              found = true;
              break;
            }
            kidPromises.push(xref.fetchAsync(kid).then(function (kid) {
              if (kid.has('Count')) {
                var count = kid.get('Count');
                total += count;
              } else { // page leaf node
                total++;
              }
            }));
          }
          if (!found) {
            error('kid ref not found in parents kids');
          }
          return Promise.all(kidPromises).then(function () {
            return [total, parentRef];
          });
        });
      }

      var total = 0;
      function next(ref) {
        return pagesBeforeRef(ref).then(function (args) {
          if (!args) {
            return total;
          }
          var count = args[0];
          var parentRef = args[1];
          total += count;
          return next(parentRef);
        });
      }

      return next(ref);
    }
  };

  return Catalog;
})();

var XRef = (function XRefClosure() {
  function XRef(stream, password) {
    this.stream = stream;
    this.entries = [];
    this.xrefstms = {};
    // prepare the XRef cache
    this.cache = [];
    this.password = password;
    this.stats = {
      streamTypes: [],
      fontTypes: []
    };
  }

  XRef.prototype = {
    setStartXRef: function XRef_setStartXRef(startXRef) {
      // Store the starting positions of xref tables as we process them
      // so we can recover from missing data errors
      this.startXRefQueue = [startXRef];
      this.xrefBlocks = [startXRef];
    },

    parse: function XRef_parse(recoveryMode) {
      var trailerDict;
      if (!recoveryMode) {
        trailerDict = this.readXRef();
      } else {
        warn('Indexing all PDF objects');
        trailerDict = this.indexObjects();
      }
      trailerDict.assignXref(this);
      this.trailer = trailerDict;
      var encrypt = trailerDict.get('Encrypt');
      if (encrypt) {
        var ids = trailerDict.get('ID');
        var fileId = (ids && ids.length) ? ids[0] : '';
        this.encrypt = new CipherTransformFactory(encrypt, fileId,
                                                  this.password);
      }

      // get the root dictionary (catalog) object
      if (!(this.root = trailerDict.get('Root'))) {
        error('Invalid root reference');
      }
    },

    processXRefTable: function XRef_processXRefTable(parser) {
      if (!('tableState' in this)) {
        // Stores state of the table as we process it so we can resume
        // from middle of table in case of missing data error
        this.tableState = {
          entryNum: 0,
          streamPos: parser.lexer.stream.pos,
          parserBuf1: parser.buf1,
          parserBuf2: parser.buf2
        };
      }

      var obj = this.readXRefTable(parser);

      // Sanity check
      if (!isCmd(obj, 'trailer')) {
        error('Invalid XRef table: could not find trailer dictionary');
      }
      // Read trailer dictionary, e.g.
      // trailer
      //    << /Size 22
      //      /Root 20R
      //      /Info 10R
      //      /ID [ <81b14aafa313db63dbd6f981e49f94f4> ]
      //    >>
      // The parser goes through the entire stream << ... >> and provides
      // a getter interface for the key-value table
      var dict = parser.getObj();

      // The pdflib PDF generator can generate a nested trailer dictionary
      if (!isDict(dict) && dict.dict) {
        dict = dict.dict;
      }
      if (!isDict(dict)) {
        error('Invalid XRef table: could not parse trailer dictionary');
      }
      delete this.tableState;

      return dict;
    },

    readXRefTable: function XRef_readXRefTable(parser) {
      // Example of cross-reference table:
      // xref
      // 0 1                    <-- subsection header (first obj #, obj count)
      // 0000000000 65535 f     <-- actual object (offset, generation #, f/n)
      // 23 2                   <-- subsection header ... and so on ...
      // 0000025518 00002 n
      // 0000025635 00000 n
      // trailer
      // ...

      var stream = parser.lexer.stream;
      var tableState = this.tableState;
      stream.pos = tableState.streamPos;
      parser.buf1 = tableState.parserBuf1;
      parser.buf2 = tableState.parserBuf2;

      // Outer loop is over subsection headers
      var obj;

      while (true) {
        if (!('firstEntryNum' in tableState) || !('entryCount' in tableState)) {
          if (isCmd(obj = parser.getObj(), 'trailer')) {
            break;
          }
          tableState.firstEntryNum = obj;
          tableState.entryCount = parser.getObj();
        }

        var first = tableState.firstEntryNum;
        var count = tableState.entryCount;
        if (!isInt(first) || !isInt(count)) {
          error('Invalid XRef table: wrong types in subsection header');
        }
        // Inner loop is over objects themselves
        for (var i = tableState.entryNum; i < count; i++) {
          tableState.streamPos = stream.pos;
          tableState.entryNum = i;
          tableState.parserBuf1 = parser.buf1;
          tableState.parserBuf2 = parser.buf2;

          var entry = {};
          entry.offset = parser.getObj();
          entry.gen = parser.getObj();
          var type = parser.getObj();

          if (isCmd(type, 'f')) {
            entry.free = true;
          } else if (isCmd(type, 'n')) {
            entry.uncompressed = true;
          }

          // Validate entry obj
          if (!isInt(entry.offset) || !isInt(entry.gen) ||
              !(entry.free || entry.uncompressed)) {
            error('Invalid entry in XRef subsection: ' + first + ', ' + count);
          }

          if (!this.entries[i + first]) {
            this.entries[i + first] = entry;
          }
        }

        tableState.entryNum = 0;
        tableState.streamPos = stream.pos;
        tableState.parserBuf1 = parser.buf1;
        tableState.parserBuf2 = parser.buf2;
        delete tableState.firstEntryNum;
        delete tableState.entryCount;
      }

      // Per issue 3248: hp scanners generate bad XRef
      if (first === 1 && this.entries[1] && this.entries[1].free) {
        // shifting the entries
        this.entries.shift();
      }

      // Sanity check: as per spec, first object must be free
      if (this.entries[0] && !this.entries[0].free) {
        error('Invalid XRef table: unexpected first object');
      }
      return obj;
    },

    processXRefStream: function XRef_processXRefStream(stream) {
      if (!('streamState' in this)) {
        // Stores state of the stream as we process it so we can resume
        // from middle of stream in case of missing data error
        var streamParameters = stream.dict;
        var byteWidths = streamParameters.get('W');
        var range = streamParameters.get('Index');
        if (!range) {
          range = [0, streamParameters.get('Size')];
        }

        this.streamState = {
          entryRanges: range,
          byteWidths: byteWidths,
          entryNum: 0,
          streamPos: stream.pos
        };
      }
      this.readXRefStream(stream);
      delete this.streamState;

      return stream.dict;
    },

    readXRefStream: function XRef_readXRefStream(stream) {
      var i, j;
      var streamState = this.streamState;
      stream.pos = streamState.streamPos;

      var byteWidths = streamState.byteWidths;
      var typeFieldWidth = byteWidths[0];
      var offsetFieldWidth = byteWidths[1];
      var generationFieldWidth = byteWidths[2];

      var entryRanges = streamState.entryRanges;
      while (entryRanges.length > 0) {
        var first = entryRanges[0];
        var n = entryRanges[1];

        if (!isInt(first) || !isInt(n)) {
          error('Invalid XRef range fields: ' + first + ', ' + n);
        }
        if (!isInt(typeFieldWidth) || !isInt(offsetFieldWidth) ||
            !isInt(generationFieldWidth)) {
          error('Invalid XRef entry fields length: ' + first + ', ' + n);
        }
        for (i = streamState.entryNum; i < n; ++i) {
          streamState.entryNum = i;
          streamState.streamPos = stream.pos;

          var type = 0, offset = 0, generation = 0;
          for (j = 0; j < typeFieldWidth; ++j) {
            type = (type << 8) | stream.getByte();
          }
          // if type field is absent, its default value is 1
          if (typeFieldWidth === 0) {
            type = 1;
          }
          for (j = 0; j < offsetFieldWidth; ++j) {
            offset = (offset << 8) | stream.getByte();
          }
          for (j = 0; j < generationFieldWidth; ++j) {
            generation = (generation << 8) | stream.getByte();
          }
          var entry = {};
          entry.offset = offset;
          entry.gen = generation;
          switch (type) {
            case 0:
              entry.free = true;
              break;
            case 1:
              entry.uncompressed = true;
              break;
            case 2:
              break;
            default:
              error('Invalid XRef entry type: ' + type);
          }
          if (!this.entries[first + i]) {
            this.entries[first + i] = entry;
          }
        }

        streamState.entryNum = 0;
        streamState.streamPos = stream.pos;
        entryRanges.splice(0, 2);
      }
    },

    indexObjects: function XRef_indexObjects() {
      // Simple scan through the PDF content to find objects,
      // trailers and XRef streams.
      var TAB = 0x9, LF = 0xA, CR = 0xD, SPACE = 0x20;
      var PERCENT = 0x25, LT = 0x3C;

      function readToken(data, offset) {
        var token = '', ch = data[offset];
        while (ch !== LF && ch !== CR && ch !== LT) {
          if (++offset >= data.length) {
            break;
          }
          token += String.fromCharCode(ch);
          ch = data[offset];
        }
        return token;
      }
      function skipUntil(data, offset, what) {
        var length = what.length, dataLength = data.length;
        var skipped = 0;
        // finding byte sequence
        while (offset < dataLength) {
          var i = 0;
          while (i < length && data[offset + i] === what[i]) {
            ++i;
          }
          if (i >= length) {
            break; // sequence found
          }
          offset++;
          skipped++;
        }
        return skipped;
      }
      var objRegExp = /^(\d+)\s+(\d+)\s+obj\b/;
      var trailerBytes = new Uint8Array([116, 114, 97, 105, 108, 101, 114]);
      var startxrefBytes = new Uint8Array([115, 116, 97, 114, 116, 120, 114,
                                          101, 102]);
      var endobjBytes = new Uint8Array([101, 110, 100, 111, 98, 106]);
      var xrefBytes = new Uint8Array([47, 88, 82, 101, 102]);

      // Clear out any existing entries, since they may be bogus.
      this.entries.length = 0;

      var stream = this.stream;
      stream.pos = 0;
      var buffer = stream.getBytes();
      var position = stream.start, length = buffer.length;
      var trailers = [], xrefStms = [];
      while (position < length) {
        var ch = buffer[position];
        if (ch === TAB || ch === LF || ch === CR || ch === SPACE) {
          ++position;
          continue;
        }
        if (ch === PERCENT) { // %-comment
          do {
            ++position;
            if (position >= length) {
              break;
            }
            ch = buffer[position];
          } while (ch !== LF && ch !== CR);
          continue;
        }
        var token = readToken(buffer, position);
        var m;
        if (token.indexOf('xref') === 0 &&
            (token.length === 4 || /\s/.test(token[4]))) {
          position += skipUntil(buffer, position, trailerBytes);
          trailers.push(position);
          position += skipUntil(buffer, position, startxrefBytes);
        } else if ((m = objRegExp.exec(token))) {
          if (typeof this.entries[m[1]] === 'undefined') {
            this.entries[m[1]] = {
              offset: position - stream.start,
              gen: m[2] | 0,
              uncompressed: true
            };
          }
          var contentLength = skipUntil(buffer, position, endobjBytes) + 7;
          var content = buffer.subarray(position, position + contentLength);

          // checking XRef stream suspect
          // (it shall have '/XRef' and next char is not a letter)
          var xrefTagOffset = skipUntil(content, 0, xrefBytes);
          if (xrefTagOffset < contentLength &&
              content[xrefTagOffset + 5] < 64) {
            xrefStms.push(position - stream.start);
            this.xrefstms[position - stream.start] = 1; // Avoid recursion
          }

          position += contentLength;
        } else if (token.indexOf('trailer') === 0 &&
                   (token.length === 7 || /\s/.test(token[7]))) {
          trailers.push(position);
          position += skipUntil(buffer, position, startxrefBytes);
        } else {
          position += token.length + 1;
        }
      }
      // reading XRef streams
      var i, ii;
      for (i = 0, ii = xrefStms.length; i < ii; ++i) {
        this.startXRefQueue.push(xrefStms[i]);
        this.xrefBlocks.push(xrefStms[i]);
        this.readXRef(/* recoveryMode */ true);
      }
      // finding main trailer
      var dict;
      for (i = 0, ii = trailers.length; i < ii; ++i) {
        stream.pos = trailers[i];
        var parser = new Parser(new Lexer(stream), true, this);
        var obj = parser.getObj();
        if (!isCmd(obj, 'trailer')) {
          continue;
        }
        // read the trailer dictionary
        if (!isDict(dict = parser.getObj())) {
          continue;
        }
        // taking the first one with 'ID'
        if (dict.has('ID')) {
          return dict;
        }
      }
      // no tailer with 'ID', taking last one (if exists)
      if (dict) {
        return dict;
      }
      // nothing helps
      // calling error() would reject worker with an UnknownErrorException.
      throw new InvalidPDFException('Invalid PDF structure');
    },

    readXRef: function XRef_readXRef(recoveryMode) {
      var stream = this.stream;

      try {
        while (this.startXRefQueue.length) {
          var startXRef = this.startXRefQueue[0];

          stream.pos = startXRef + stream.start;

          var parser = new Parser(new Lexer(stream), true, this);
          var obj = parser.getObj();
          var dict;

          // Get dictionary
          if (isCmd(obj, 'xref')) {
            // Parse end-of-file XRef
            dict = this.processXRefTable(parser);
            if (!this.topDict) {
              this.topDict = dict;
            }

            // Recursively get other XRefs 'XRefStm', if any
            obj = dict.get('XRefStm');
            if (isInt(obj)) {
              var pos = obj;
              // ignore previously loaded xref streams
              // (possible infinite recursion)
              if (!(pos in this.xrefstms)) {
                this.xrefstms[pos] = 1;
                this.startXRefQueue.push(pos);
                this.xrefBlocks.push(pos);
              }
            }
          } else if (isInt(obj)) {
            // Parse in-stream XRef
            if (!isInt(parser.getObj()) ||
                !isCmd(parser.getObj(), 'obj') ||
                !isStream(obj = parser.getObj())) {
              error('Invalid XRef stream');
            }
            dict = this.processXRefStream(obj);
            if (!this.topDict) {
              this.topDict = dict;
            }
            if (!dict) {
              error('Failed to read XRef stream');
            }
          } else {
            error('Invalid XRef stream header');
          }

          // Recursively get previous dictionary, if any
          obj = dict.get('Prev');
          if (isInt(obj)) {
            this.startXRefQueue.push(obj);
            this.xrefBlocks.push(obj);
          } else if (isRef(obj)) {
            // The spec says Prev must not be a reference, i.e. "/Prev NNN"
            // This is a fallback for non-compliant PDFs, i.e. "/Prev NNN 0 R"
            this.startXRefQueue.push(obj.num);
            this.xrefBlocks.push(obj.num);
          }
          this.xrefBlocks.push(stream.pos);
          this.startXRefQueue.shift();
        }

        return this.topDict;
      } catch (e) {
        if (e instanceof MissingDataException) {
          throw e;
        }
        info('(while reading XRef): ' + e);
      }

      if (recoveryMode) {
        return;
      }
      throw new XRefParseException();
    },

    getEntry: function XRef_getEntry(i) {
      var xrefEntry = this.entries[i];
      if (xrefEntry && !xrefEntry.free && xrefEntry.offset) {
        return xrefEntry;
      }
      return null;
    },

    fetchIfRef: function XRef_fetchIfRef(obj) {
      if (!isRef(obj)) {
        return obj;
      }
      return this.fetch(obj);
    },

    fetch: function XRef_fetch(ref, suppressEncryption) {
      assert(isRef(ref), 'ref object is not a reference');
      var num = ref.num;
      if (num in this.cache) {
        var cacheEntry = this.cache[num];
        return cacheEntry;
      }

      var xrefEntry = this.getEntry(num);

      // the referenced entry can be free
      if (xrefEntry === null) {
        return (this.cache[num] = null);
      }

      if (xrefEntry.uncompressed) {
        xrefEntry = this.fetchUncompressed(ref, xrefEntry, suppressEncryption);
      } else {
        xrefEntry = this.fetchCompressed(xrefEntry, suppressEncryption);
      }
      if (isDict(xrefEntry)){
        xrefEntry.objId = ref.toString();
      } else if (isStream(xrefEntry)) {
        xrefEntry.dict.objId = ref.toString();
      }
      return xrefEntry;
    },

    fetchUncompressed: function XRef_fetchUncompressed(ref, xrefEntry,
                                                       suppressEncryption) {
      var gen = ref.gen;
      var num = ref.num;
      if (xrefEntry.gen !== gen) {
        error('inconsistent generation in XRef');
      }
      var stream = this.stream.makeSubStream(xrefEntry.offset +
                                             this.stream.start);
      var parser = new Parser(new Lexer(stream), true, this);
      var obj1 = parser.getObj();
      var obj2 = parser.getObj();
      var obj3 = parser.getObj();
      if (!isInt(obj1) || parseInt(obj1, 10) !== num ||
          !isInt(obj2) || parseInt(obj2, 10) !== gen ||
          !isCmd(obj3)) {
        error('bad XRef entry');
      }
      if (!isCmd(obj3, 'obj')) {
        // some bad PDFs use "obj1234" and really mean 1234
        if (obj3.cmd.indexOf('obj') === 0) {
          num = parseInt(obj3.cmd.substring(3), 10);
          if (!isNaN(num)) {
            return num;
          }
        }
        error('bad XRef entry');
      }
      if (this.encrypt && !suppressEncryption) {
        xrefEntry = parser.getObj(this.encrypt.createCipherTransform(num, gen));
      } else {
        xrefEntry = parser.getObj();
      }
      if (!isStream(xrefEntry)) {
        this.cache[num] = xrefEntry;
      }
      return xrefEntry;
    },

    fetchCompressed: function XRef_fetchCompressed(xrefEntry,
                                                   suppressEncryption) {
      var tableOffset = xrefEntry.offset;
      var stream = this.fetch(new Ref(tableOffset, 0));
      if (!isStream(stream)) {
        error('bad ObjStm stream');
      }
      var first = stream.dict.get('First');
      var n = stream.dict.get('N');
      if (!isInt(first) || !isInt(n)) {
        error('invalid first and n parameters for ObjStm stream');
      }
      var parser = new Parser(new Lexer(stream), false, this);
      parser.allowStreams = true;
      var i, entries = [], num, nums = [];
      // read the object numbers to populate cache
      for (i = 0; i < n; ++i) {
        num = parser.getObj();
        if (!isInt(num)) {
          error('invalid object number in the ObjStm stream: ' + num);
        }
        nums.push(num);
        var offset = parser.getObj();
        if (!isInt(offset)) {
          error('invalid object offset in the ObjStm stream: ' + offset);
        }
      }
      // read stream objects for cache
      for (i = 0; i < n; ++i) {
        entries.push(parser.getObj());
        num = nums[i];
        var entry = this.entries[num];
        if (entry && entry.offset === tableOffset && entry.gen === i) {
          this.cache[num] = entries[i];
        }
      }
      xrefEntry = entries[xrefEntry.gen];
      if (xrefEntry === undefined) {
        error('bad XRef entry for compressed object');
      }
      return xrefEntry;
    },

    fetchIfRefAsync: function XRef_fetchIfRefAsync(obj) {
      if (!isRef(obj)) {
        return Promise.resolve(obj);
      }
      return this.fetchAsync(obj);
    },

    fetchAsync: function XRef_fetchAsync(ref, suppressEncryption) {
      var streamManager = this.stream.manager;
      var xref = this;
      return new Promise(function tryFetch(resolve, reject) {
        try {
          resolve(xref.fetch(ref, suppressEncryption));
        } catch (e) {
          if (e instanceof MissingDataException) {
            streamManager.requestRange(e.begin, e.end).then(function () {
              tryFetch(resolve, reject);
            }, reject);
            return;
          }
          reject(e);
        }
      });
    },

    getCatalogObj: function XRef_getCatalogObj() {
      return this.root;
    }
  };

  return XRef;
})();

/**
 * A NameTree is like a Dict but has some advantageous properties, see the
 * spec (7.9.6) for more details.
 * TODO: implement all the Dict functions and make this more efficent.
 */
var NameTree = (function NameTreeClosure() {
  function NameTree(root, xref) {
    this.root = root;
    this.xref = xref;
  }

  NameTree.prototype = {
    getAll: function NameTree_getAll() {
      var dict = {};
      if (!this.root) {
        return dict;
      }
      var xref = this.xref;
      // reading name tree
      var processed = new RefSet();
      processed.put(this.root);
      var queue = [this.root];
      while (queue.length > 0) {
        var i, n;
        var obj = xref.fetchIfRef(queue.shift());
        if (!isDict(obj)) {
          continue;
        }
        if (obj.has('Kids')) {
          var kids = obj.get('Kids');
          for (i = 0, n = kids.length; i < n; i++) {
            var kid = kids[i];
            if (processed.has(kid)) {
              error('invalid destinations');
            }
            queue.push(kid);
            processed.put(kid);
          }
          continue;
        }
        var names = obj.get('Names');
        if (names) {
          for (i = 0, n = names.length; i < n; i += 2) {
            dict[xref.fetchIfRef(names[i])] = xref.fetchIfRef(names[i + 1]);
          }
        }
      }
      return dict;
    },

    get: function NameTree_get(destinationId) {
      if (!this.root) {
        return null;
      }

      var xref = this.xref;
      var kidsOrNames = xref.fetchIfRef(this.root);
      var loopCount = 0;
      var MAX_NAMES_LEVELS = 10;
      var l, r, m;

      // Perform a binary search to quickly find the entry that
      // contains the named destination we are looking for.
      while (kidsOrNames.has('Kids')) {
        loopCount++;
        if (loopCount > MAX_NAMES_LEVELS) {
          warn('Search depth limit for named destionations has been reached.');
          return null;
        }

        var kids = kidsOrNames.get('Kids');
        if (!isArray(kids)) {
          return null;
        }

        l = 0;
        r = kids.length - 1;
        while (l <= r) {
          m = (l + r) >> 1;
          var kid = xref.fetchIfRef(kids[m]);
          var limits = kid.get('Limits');

          if (destinationId < xref.fetchIfRef(limits[0])) {
            r = m - 1;
          } else if (destinationId > xref.fetchIfRef(limits[1])) {
            l = m + 1;
          } else {
            kidsOrNames = xref.fetchIfRef(kids[m]);
            break;
          }
        }
        if (l > r) {
          return null;
        }
      }

      // If we get here, then we have found the right entry. Now
      // go through the named destinations in the Named dictionary
      // until we find the exact destination we're looking for.
      var names = kidsOrNames.get('Names');
      if (isArray(names)) {
        // Perform a binary search to reduce the lookup time.
        l = 0;
        r = names.length - 2;
        while (l <= r) {
          // Check only even indices (0, 2, 4, ...) because the
          // odd indices contain the actual D array.
          m = (l + r) & ~1;
          if (destinationId < xref.fetchIfRef(names[m])) {
            r = m - 2;
          } else if (destinationId > xref.fetchIfRef(names[m])) {
            l = m + 2;
          } else {
            return xref.fetchIfRef(names[m + 1]);
          }
        }
      }
      return null;
    }
  };
  return NameTree;
})();

/**
 * "A PDF file can refer to the contents of another file by using a File
 * Specification (PDF 1.1)", see the spec (7.11) for more details.
 * NOTE: Only embedded files are supported (as part of the attachments support)
 * TODO: support the 'URL' file system (with caching if !/V), portable
 * collections attributes and related files (/RF)
 */
var FileSpec = (function FileSpecClosure() {
  function FileSpec(root, xref) {
    if (!root || !isDict(root)) {
      return;
    }
    this.xref = xref;
    this.root = root;
    if (root.has('FS')) {
      this.fs = root.get('FS');
    }
    this.description = root.has('Desc') ?
                         stringToPDFString(root.get('Desc')) :
                         '';
    if (root.has('RF')) {
      warn('Related file specifications are not supported');
    }
    this.contentAvailable = true;
    if (!root.has('EF')) {
      this.contentAvailable = false;
      warn('Non-embedded file specifications are not supported');
    }
  }

  function pickPlatformItem(dict) {
    // Look for the filename in this order:
    // UF, F, Unix, Mac, DOS
    if (dict.has('UF')) {
      return dict.get('UF');
    } else if (dict.has('F')) {
      return dict.get('F');
    } else if (dict.has('Unix')) {
      return dict.get('Unix');
    } else if (dict.has('Mac')) {
      return dict.get('Mac');
    } else if (dict.has('DOS')) {
      return dict.get('DOS');
    } else {
      return null;
    }
  }

  FileSpec.prototype = {
    get filename() {
      if (!this._filename && this.root) {
        var filename = pickPlatformItem(this.root) || 'unnamed';
        this._filename = stringToPDFString(filename).
          replace(/\\\\/g, '\\').
          replace(/\\\//g, '/').
          replace(/\\/g, '/');
      }
      return this._filename;
    },
    get content() {
      if (!this.contentAvailable) {
        return null;
      }
      if (!this.contentRef && this.root) {
        this.contentRef = pickPlatformItem(this.root.get('EF'));
      }
      var content = null;
      if (this.contentRef) {
        var xref = this.xref;
        var fileObj = xref.fetchIfRef(this.contentRef);
        if (fileObj && isStream(fileObj)) {
          content = fileObj.getBytes();
        } else {
          warn('Embedded file specification points to non-existing/invalid ' +
            'content');
        }
      } else {
        warn('Embedded file specification does not have a content');
      }
      return content;
    },
    get serializable() {
      return {
        filename: this.filename,
        content: this.content
      };
    }
  };
  return FileSpec;
})();

/**
 * A helper for loading missing data in object graphs. It traverses the graph
 * depth first and queues up any objects that have missing data. Once it has
 * has traversed as many objects that are available it attempts to bundle the
 * missing data requests and then resume from the nodes that weren't ready.
 *
 * NOTE: It provides protection from circular references by keeping track of
 * of loaded references. However, you must be careful not to load any graphs
 * that have references to the catalog or other pages since that will cause the
 * entire PDF document object graph to be traversed.
 */
var ObjectLoader = (function() {
  function mayHaveChildren(value) {
    return isRef(value) || isDict(value) || isArray(value) || isStream(value);
  }

  function addChildren(node, nodesToVisit) {
    var value;
    if (isDict(node) || isStream(node)) {
      var map;
      if (isDict(node)) {
        map = node.map;
      } else {
        map = node.dict.map;
      }
      for (var key in map) {
        value = map[key];
        if (mayHaveChildren(value)) {
          nodesToVisit.push(value);
        }
      }
    } else if (isArray(node)) {
      for (var i = 0, ii = node.length; i < ii; i++) {
        value = node[i];
        if (mayHaveChildren(value)) {
          nodesToVisit.push(value);
        }
      }
    }
  }

  function ObjectLoader(obj, keys, xref) {
    this.obj = obj;
    this.keys = keys;
    this.xref = xref;
    this.refSet = null;
    this.capability = null;
  }

  ObjectLoader.prototype = {
    load: function ObjectLoader_load() {
      var keys = this.keys;
      this.capability = createPromiseCapability();
      // Don't walk the graph if all the data is already loaded.
      if (!(this.xref.stream instanceof ChunkedStream) ||
          this.xref.stream.getMissingChunks().length === 0) {
        this.capability.resolve();
        return this.capability.promise;
      }

      this.refSet = new RefSet();
      // Setup the initial nodes to visit.
      var nodesToVisit = [];
      for (var i = 0; i < keys.length; i++) {
        nodesToVisit.push(this.obj[keys[i]]);
      }

      this._walk(nodesToVisit);
      return this.capability.promise;
    },

    _walk: function ObjectLoader_walk(nodesToVisit) {
      var nodesToRevisit = [];
      var pendingRequests = [];
      // DFS walk of the object graph.
      while (nodesToVisit.length) {
        var currentNode = nodesToVisit.pop();

        // Only references or chunked streams can cause missing data exceptions.
        if (isRef(currentNode)) {
          // Skip nodes that have already been visited.
          if (this.refSet.has(currentNode)) {
            continue;
          }
          try {
            var ref = currentNode;
            this.refSet.put(ref);
            currentNode = this.xref.fetch(currentNode);
          } catch (e) {
            if (!(e instanceof MissingDataException)) {
              throw e;
            }
            nodesToRevisit.push(currentNode);
            pendingRequests.push({ begin: e.begin, end: e.end });
          }
        }
        if (currentNode && currentNode.getBaseStreams) {
          var baseStreams = currentNode.getBaseStreams();
          var foundMissingData = false;
          for (var i = 0; i < baseStreams.length; i++) {
            var stream = baseStreams[i];
            if (stream.getMissingChunks && stream.getMissingChunks().length) {
              foundMissingData = true;
              pendingRequests.push({
                begin: stream.start,
                end: stream.end
              });
            }
          }
          if (foundMissingData) {
            nodesToRevisit.push(currentNode);
          }
        }

        addChildren(currentNode, nodesToVisit);
      }

      if (pendingRequests.length) {
        this.xref.stream.manager.requestRanges(pendingRequests).then(
            function pendingRequestCallback() {
          nodesToVisit = nodesToRevisit;
          for (var i = 0; i < nodesToRevisit.length; i++) {
            var node = nodesToRevisit[i];
            // Remove any reference nodes from the currrent refset so they
            // aren't skipped when we revist them.
            if (isRef(node)) {
              this.refSet.remove(node);
            }
          }
          this._walk(nodesToVisit);
        }.bind(this), this.capability.reject);
        return;
      }
      // Everything is loaded.
      this.refSet = null;
      this.capability.resolve();
    }
  };

  return ObjectLoader;
})();

exports.Catalog = Catalog;
exports.ObjectLoader = ObjectLoader;
exports.XRef = XRef;
}));

/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define('pdfjs/core/document', ['exports', 'pdfjs/shared/util',
      'pdfjs/core/primitives', 'pdfjs/core/stream', 'pdfjs/core/obj',
      'pdfjs/core/parser', 'pdfjs/core/crypto'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports, require('../shared/util.js'), require('./primitives.js'),
      require('./stream.js'), require('./obj.js'), require('./parser.js'),
      require('./crypto.js'));
  } else {
    factory((root.pdfjsCoreDocument = {}), root.pdfjsSharedUtil,
      root.pdfjsCorePrimitives, root.pdfjsCoreStream,
      root.pdfjsCoreObj, root.pdfjsCoreParser, root.pdfjsCoreCrypto);
  }
}(this, function (exports, sharedUtil, corePrimitives, coreStream, coreObj,
                  coreParser, coreCrypto) {

var MissingDataException = sharedUtil.MissingDataException;
var Util = sharedUtil.Util;
var assert = sharedUtil.assert;
var error = sharedUtil.error;
var info = sharedUtil.info;
var isArray = sharedUtil.isArray;
var isArrayBuffer = sharedUtil.isArrayBuffer;
var isString = sharedUtil.isString;
var shadow = sharedUtil.shadow;
var stringToBytes = sharedUtil.stringToBytes;
var stringToPDFString = sharedUtil.stringToPDFString;
var warn = sharedUtil.warn;
var Dict = corePrimitives.Dict;
var isDict = corePrimitives.isDict;
var isName = corePrimitives.isName;
var isStream = corePrimitives.isStream;
var NullStream = coreStream.NullStream;
var Stream = coreStream.Stream;
var StreamsSequenceStream = coreStream.StreamsSequenceStream;
var Catalog = coreObj.Catalog;
var ObjectLoader = coreObj.ObjectLoader;
var XRef = coreObj.XRef;
var Lexer = coreParser.Lexer;
var Linearization = coreParser.Linearization;
var calculateMD5 = coreCrypto.calculateMD5;


/**
 * The `PDFDocument` holds all the data of the PDF file. Compared to the
 * `PDFDoc`, this one doesn't have any job management code.
 * Right now there exists one PDFDocument on the main thread + one object
 * for each worker. If there is no worker support enabled, there are two
 * `PDFDocument` objects on the main thread created.
 */
var PDFDocument = (function PDFDocumentClosure() {
  var FINGERPRINT_FIRST_BYTES = 1024;
  var EMPTY_FINGERPRINT = '\x00\x00\x00\x00\x00\x00\x00' +
    '\x00\x00\x00\x00\x00\x00\x00\x00\x00';

  function PDFDocument(pdfManager, arg, password) {
    if (isStream(arg)) {
      init.call(this, pdfManager, arg, password);
    } else if (isArrayBuffer(arg)) {
      init.call(this, pdfManager, new Stream(arg), password);
    } else {
      error('PDFDocument: Unknown argument type');
    }
  }

  function init(pdfManager, stream, password) {
    assert(stream.length > 0, 'stream must have data');
    this.pdfManager = pdfManager;
    this.stream = stream;
    var xref = new XRef(this.stream, password, pdfManager);
    this.xref = xref;
  }

  function find(stream, needle, limit, backwards) {
    var pos = stream.pos;
    var end = stream.end;
    var strBuf = [];
    if (pos + limit > end) {
      limit = end - pos;
    }
    for (var n = 0; n < limit; ++n) {
      strBuf.push(String.fromCharCode(stream.getByte()));
    }
    var str = strBuf.join('');
    stream.pos = pos;
    var index = backwards ? str.lastIndexOf(needle) : str.indexOf(needle);
    if (index === -1) {
      return false; /* not found */
    }
    stream.pos += index;
    return true; /* found */
  }

  var DocumentInfoValidators = {
    get entries() {
      // Lazily build this since all the validation functions below are not
      // defined until after this file loads.
      return shadow(this, 'entries', {
        Title: isString,
        Author: isString,
        Subject: isString,
        Keywords: isString,
        Creator: isString,
        Producer: isString,
        CreationDate: isString,
        ModDate: isString,
        Trapped: isName
      });
    }
  };

  PDFDocument.prototype = {
    parse: function PDFDocument_parse(recoveryMode) {
      this.setup(recoveryMode);
      var version = this.catalog.catDict.get('Version');
      if (isName(version)) {
        this.pdfFormatVersion = version.name;
      }
      try {
        // checking if AcroForm is present
        this.acroForm = this.catalog.catDict.get('AcroForm');
        if (this.acroForm) {
          this.xfa = this.acroForm.get('XFA');
          var fields = this.acroForm.get('Fields');
          if ((!fields || !isArray(fields) || fields.length === 0) &&
              !this.xfa) {
            // no fields and no XFA -- not a form (?)
            this.acroForm = null;
          }
        }
      } catch (ex) {
        info('Something wrong with AcroForm entry');
        this.acroForm = null;
      }
    },

    get linearization() {
      var linearization = null;
      if (this.stream.length) {
        try {
          linearization = Linearization.create(this.stream);
        } catch (err) {
          if (err instanceof MissingDataException) {
            throw err;
          }
          info(err);
        }
      }
      // shadow the prototype getter with a data property
      return shadow(this, 'linearization', linearization);
    },
    get startXRef() {
      var stream = this.stream;
      var startXRef = 0;
      var linearization = this.linearization;
      if (linearization) {
        // Find end of first obj.
        stream.reset();
        if (find(stream, 'endobj', 1024)) {
          startXRef = stream.pos + 6;
        }
      } else {
        // Find startxref by jumping backward from the end of the file.
        var step = 1024;
        var found = false, pos = stream.end;
        while (!found && pos > 0) {
          pos -= step - 'startxref'.length;
          if (pos < 0) {
            pos = 0;
          }
          stream.pos = pos;
          found = find(stream, 'startxref', step, true);
        }
        if (found) {
          stream.skip(9);
          var ch;
          do {
            ch = stream.getByte();
          } while (Lexer.isSpace(ch));
          var str = '';
          while (ch >= 0x20 && ch <= 0x39) { // < '9'
            str += String.fromCharCode(ch);
            ch = stream.getByte();
          }
          startXRef = parseInt(str, 10);
          if (isNaN(startXRef)) {
            startXRef = 0;
          }
        }
      }
      // shadow the prototype getter with a data property
      return shadow(this, 'startXRef', startXRef);
    },
    get mainXRefEntriesOffset() {
      var mainXRefEntriesOffset = 0;
      var linearization = this.linearization;
      if (linearization) {
        mainXRefEntriesOffset = linearization.mainXRefEntriesOffset;
      }
      // shadow the prototype getter with a data property
      return shadow(this, 'mainXRefEntriesOffset', mainXRefEntriesOffset);
    },
    // Find the header, remove leading garbage and setup the stream
    // starting from the header.
    checkHeader: function PDFDocument_checkHeader() {
      var stream = this.stream;
      stream.reset();
      if (find(stream, '%PDF-', 1024)) {
        // Found the header, trim off any garbage before it.
        stream.moveStart();
        // Reading file format version
        var MAX_VERSION_LENGTH = 12;
        var version = '', ch;
        while ((ch = stream.getByte()) > 0x20) { // SPACE
          if (version.length >= MAX_VERSION_LENGTH) {
            break;
          }
          version += String.fromCharCode(ch);
        }
        if (!this.pdfFormatVersion) {
          // removing "%PDF-"-prefix
          this.pdfFormatVersion = version.substring(5);
        }
        return;
      }
      // May not be a PDF file, continue anyway.
    },
    parseStartXRef: function PDFDocument_parseStartXRef() {
      var startXRef = this.startXRef;
      this.xref.setStartXRef(startXRef);
    },
    setup: function PDFDocument_setup(recoveryMode) {
      this.xref.parse(recoveryMode);
      var self = this;
      this.catalog = new Catalog(this.pdfManager, this.xref, false);
    },
    get numPages() {
      var linearization = this.linearization;
      var num = linearization ? linearization.numPages : this.catalog.numPages;
      // shadow the prototype getter
      return shadow(this, 'numPages', num);
    },
    get documentInfo() {
      var docInfo = {
        PDFFormatVersion: this.pdfFormatVersion,
        IsAcroFormPresent: !!this.acroForm,
        IsXFAPresent: !!this.xfa
      };
      var infoDict;
      try {
        infoDict = this.xref.trailer.get('Info');
      } catch (err) {
        info('The document information dictionary is invalid.');
      }
      if (infoDict) {
        var validEntries = DocumentInfoValidators.entries;
        // Only fill the document info with valid entries from the spec.
        for (var key in validEntries) {
          if (infoDict.has(key)) {
            var value = infoDict.get(key);
            // Make sure the value conforms to the spec.
            if (validEntries[key](value)) {
              docInfo[key] = (typeof value !== 'string' ?
                              value : stringToPDFString(value));
            } else {
              info('Bad value in document info for "' + key + '"');
            }
          }
        }
      }
      return shadow(this, 'documentInfo', docInfo);
    },
    get fingerprint() {
      var xref = this.xref, hash, fileID = '';
      var idArray = xref.trailer.get('ID');

      if (idArray && isArray(idArray) && idArray[0] && isString(idArray[0]) &&
          idArray[0] !== EMPTY_FINGERPRINT) {
        hash = stringToBytes(idArray[0]);
      } else {
        if (this.stream.ensureRange) {
          this.stream.ensureRange(0,
            Math.min(FINGERPRINT_FIRST_BYTES, this.stream.end));
        }
        hash = calculateMD5(this.stream.bytes.subarray(0,
          FINGERPRINT_FIRST_BYTES), 0, FINGERPRINT_FIRST_BYTES);
      }

      for (var i = 0, n = hash.length; i < n; i++) {
        var hex = hash[i].toString(16);
        fileID += hex.length === 1 ? '0' + hex : hex;
      }

      return shadow(this, 'fingerprint', fileID);
    },

    getPage: function PDFDocument_getPage(pageIndex) {
      return this.catalog.getPage(pageIndex);
    },

    cleanup: function PDFDocument_cleanup() {
      return this.catalog.cleanup();
    }
  };

  return PDFDocument;
})();

exports.PDFDocument = PDFDocument;
}));
