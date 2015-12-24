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
