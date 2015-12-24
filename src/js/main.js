//using the object if available or creating a new instance if not present
if (typeof PDFSIGN === 'undefined') {
	  (typeof window !== 'undefined' ? window : this).PDFSIGN = {};
	  if (typeof PDFSIGN === 'undefined') {
		  PDFSIGN = {};
	  }
}

PDFSIGN = (function () {
	
        var BASE64_MARKER = ';base64,';
        var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        
	//private functions
        //structure of inputs:
        //
        //xrefEntries.offset / number
        //xrefEntries.gen / number
        //xrefEntries.free / boolean
        //startxref / number
        //sha256hex / string
        function createXrefTable(xrefEntries) {
            xrefEntries = sortOnKeys(xrefEntries);
            var retVal ='xref\n';
            var last = -2;
            for(var i in xrefEntries) {
                i = parseInt(i);
                if(typeof xrefEntries[i].offset === 'undefined') { continue; }
                retVal += calcFlow(i, last, xrefEntries);
                var offset = xrefEntries[i].offset;
                retVal += pad10(offset)+' '+pad5(xrefEntries[i].gen)+' '+(xrefEntries[i].free?'f':'n')+' \n'; 
                last = i;
            }
            return retVal;
        }
        
        function calcFlow(i, last, xrefEntries) {
            if(last + 1 === i) {return '';}
            var count = 1;
            while(typeof xrefEntries[(i+count)] !== 'undefined' 
                    && typeof xrefEntries[(i+count)].offset !== 'undefined') {count ++;}
            return i + ' '+count+'\n';
        }
        
        function createTrailer(topDict, startxref, sha256Hex, size, prev) {
            var retVal ='trailer <<\n';
            retVal +='  /Size '+(size)+'\n';
            var refRoot = topDict.getRaw('Root');
            if(typeof refRoot !== 'undefined') {
                retVal +='  /Root '+refRoot.num+' '+refRoot.gen+' R\n';
            }
            var refInfo = topDict.getRaw('Info');
            if(typeof refInfo !== 'undefined') {
                retVal +='  /Info '+refInfo.num+' '+refInfo.gen+' R\n';
            }
            retVal +='  /ID [<'+sha256Hex.substring(0,32)+'><'+sha256Hex.substring(32,64)+'>]\n';
            if(typeof prev !== 'undefined' ) {
                retVal +='  /Prev '+prev+'\n';
            }
            retVal +='>>\n';
            retVal +='startxref\n';
            retVal +=startxref + '\n';
            retVal +='%%EOF\n';
            return retVal;
        }
        
        function createXrefTableAppend(xrefEntries) {
            xrefEntries = sortOnKeys(xrefEntries);
            
            var retVal ='xref\n';
            //retVal += '0 1\n';
            //retVal += '0000000000 65535 f \n';
            
            var last = -2;
            for(var i in xrefEntries) {
                i = parseInt(i);
                if(typeof xrefEntries[i].offset === 'undefined') { continue; }
                retVal += calcFlow(i, last, xrefEntries);
                var offset = xrefEntries[i].offset;
                retVal += pad10(offset)+' '+pad5(xrefEntries[i].gen)+' '+(xrefEntries[i].free?'f':'n')+' \n'; 
                last = i;
            }
            return retVal;
        }
        
        //http://stackoverflow.com/questions/10946880/sort-a-dictionary-or-whatever-key-value-data-structure-in-js-on-word-number-ke
        function sortOnKeys(dict) {
            var sorted = [];
            for(var key in dict) {
                sorted[sorted.length] = key;
            }
            sorted.sort();

            var tempDict = {};
            for(var i = 0; i < sorted.length; i++) {
                tempDict[sorted[i]] = dict[sorted[i]];
            }

            return tempDict;
        }
        
        function removeFromArray(array, from, to) {
            var cutlen = to - from;
            var buf = new Uint8Array(array.length - cutlen);
            
            for (var i = 0; i < from; i++) {
		buf[i] = array[i];
            }
            for (var i = to, len = array.length; i < len; i++) {
		buf[i-cutlen] = array[i];
            }
            return buf;
        }
        
	function findXrefBlocks(xrefBlocks) {
            var num = xrefBlocks.length / 2;
            var retVal = [];
            for (var i=0;i<num;i++) {
                retVal.push({start: xrefBlocks[i], end: xrefBlocks[i+num]});
            }
            return retVal;
        }
        
        function convertUint8ArrayToBinaryString(u8Array) {
            var i, len = u8Array.length, b_str = "";
            for (i=0; i<len; i++) {
		b_str += String.fromCharCode(u8Array[i]);
            }
            return b_str;
        }
          
        function arrayObjectIndexOf(array, start, end, orig) {
            for(var i = 0, len = array.length; i < len; i++) {
                if ((array[i].start === start) && (array[i].end === end) && (array[i].orig === orig)) {
                    return i;
                }
            }
            return -1;
        }

	function pad10(num) {
	    var s = "000000000" + num;
	    return s.substr(s.length-10);
	}
        
        function pad5(num) {
	    var s = "0000" + num;
	    return s.substr(s.length-5);
	}
        
        function pad2(num) {
	    var s = "0" + num;
	    return s.substr(s.length-2);
	}

	function findRootEntry(xref) {
            var rootNr = xref.root.objId.substring(0, xref.root.objId.length - 1);
            return xref.entries[rootNr];
	}
        
        function findSuccessorEntry(xrefEntries, current) {
            //find it first
            var currentOffset = current.offset;
            var currentMin = Number.MAX_SAFE_INTEGER;
            var currentMinIndex = -1;
            for(var i in xrefEntries) {
                if(xrefEntries[i].offset > currentOffset) {
                    if(xrefEntries[i].offset < currentMin) {
                        currentMin = xrefEntries[i].offset;
                        currentMinIndex = i;
                    }
                }
            }
            if(currentMinIndex === -1) {
                return current;
            }
            return xrefEntries[currentMinIndex];
        }
        
        function findXref(xrefEntries, offset) {
            var currentMin = Number.MAX_SAFE_INTEGER;
            var currentMinIndex = -1;
            for(var i in xrefEntries) {
                if(xrefEntries[i].offset < offset) {
                    if(offset - xrefEntries[i].offset < currentMin) {
                        currentMin = offset - xrefEntries[i].offset;
                        currentMinIndex = i;
                    }
                }
            }
            return xrefEntries[currentMinIndex];
        }
        
        function updateArray(array, pos, str) {
            var upd = stringToUint8Array(str);
            for (var i = 0, len=upd.length; i < len; i++) {
            	array[i+pos] = upd[i];
            }
            return array;
	}

        function copyToEnd(array, from, to) {
            var buf = new Uint8Array(array.length + (to - from));
            for (var i = 0, len=array.length; i < len; i++) {
            	buf[i] = array[i];
            }
            
            for (var i = 0, len=(to - from); i < len; i++) {
                buf[array.length + i] = array[from + i];
            }
            return buf;
        }

	function insertIntoArray(array, pos, str) {
            var ins = stringToUint8Array(str);
            var buf = new Uint8Array(array.length + ins.length);
            for (var i = 0; i < pos; i++) {
            	buf[i] = array[i];
            }
            for (var i = 0; i < ins.length; i++) {
		buf[pos+i] = ins[i];
            }
            for (var i = pos; i < array.length; i++) {
		buf[ins.length+i] = array[i];
            }
            return buf;
	}

	function stringToUint8Array(str) {
            var buf = new Uint8Array(str.length);
            for (var i=0, strLen=str.length; i<strLen; i++) {
                buf[i] = str.charCodeAt(i);
            }
            return buf;
	}
	
	function uint8ArrayToString(buf, from, to) {
            if(typeof from !== 'undefined' && typeof to !== 'undefined') {
                var s = ''
                for (var i=from; i<to; i++) {
                    s = s + String.fromCharCode(buf[i]);
                }
                return s;
            }
            return String.fromCharCode.apply(null, buf);	  
	}

	

	function findFreeXrefNr(xrefEntries, used) {
            used = typeof used !== 'undefined' ?  used : [];
            var inc = used.length;
            
            for (var i=1;i<xrefEntries.length;i++) {
                
                var index = used.indexOf(i);
                var entry = xrefEntries[""+i];
                if(index === -1 && (typeof entry === 'undefined' || entry.free)) {
                    return i;
	    	}
                if(index !== -1) {
                    inc--;
                }
	    }
            return xrefEntries.length + inc;
	}

	function find(uint8, needle, start, limit) {     
            start = typeof start !== 'undefined' ? start : 0;
            limit = typeof limit !== 'undefined' ? limit : Number.MAX_SAFE_INTEGER;
            
            var search = stringToUint8Array(needle);
            var match = 0;
            
            for(var i=start;i<uint8.length && i<limit;i++) {
                if(uint8[i] === search[match]) {
                    match++;
                } else {
                    match = 0;
                    if(uint8[i] === search[match]) {
                        match++;
                    }
                }
                
                if(match === search.length) {
                    return (i + 1) - match;
                }
            }
            return -1;
        }
        
        function findBackwards(uint8, needle, start, limit) {     
            start = typeof start !== 'undefined' ? start : uint8.length;
            limit = typeof limit !== 'undefined' ? limit : Number.MAX_SAFE_INTEGER;
            
            var search = stringToUint8Array(needle);
            var match = search.length - 1;
            
            for(var i=start;i>=0 && i<limit;i--) {
                if(uint8[i] === search[match]) {
                    match--;
                } else {
                    match = search.length - 1;
                    if(uint8[i] === search[match]) {
                        match--;
                    }
                }
                
                if(match === 0) {
                    return i - 1;
                }
            }
            return -1;
        }
        
        function findInCurrent(array, xrefEntries, needle1, needle2) {
            for(var i in xrefEntries) {
                var curr = xrefEntries[i];
                if(curr.offset === 0) {continue;}
                var next = findSuccessorEntry(xrefEntries, curr);
                var offset1 = find(array, needle1, curr.offset, next.offset);
                if(typeof needle2 !== 'undefined') {
                    var offset2 = find(array, needle2, curr.offset, next.offset);
                    if(offset1 >= 0 && offset2 >=0) {
                        var type = uint8ArrayToString(array, offset1, offset2 + needle2.length + 1).replace(/\s+/g, '');
                        if(type !== needle1+needle2) {
                            offset2 = -1;
                        }
                    }
                } else {
                    offset2 = offset1;
                }
                if(offset1 >= 0 && offset2 >=0) {
                    return {offset:offset1, xref:curr, next:next, num:i};
                }
            }
        }
        
        function findWS(uint8, needle, start, limit) {
            
            start = typeof start !== 'undefined' ? start : 0;
            limit = typeof limit !== 'undefined' ? limit : Number.MAX_SAFE_INTEGER;
            
            var search = stringToUint8Array(needle);
            var match = 0;
            
            for(var i=start;i<uint8.length && i<limit;i++) {
                //63 is ?, 32 is space
                if(63 === search[match] && uint8[i] === 32) {
                    continue;
                } else if(63 === search[match] && uint8[i] !== 32) {
                    match++;
                }
                if(uint8[i] === search[match]) {
                    match++;
                } else {
                    match = 0;
                    if(uint8[i] === search[match]) {
                        match++;
                    }
                }
                
                if(match === search.length) {
                    return (i + 1) - match;
                }
            }
            
            return -1;
        }
        
        function findLastLine(array, needle, last) {
            last = typeof last !== 'undefined' ? last : 0;
            var offset = find(array, '\n'+needle+'\n', last);
            if( offset >= 0) {
                last = findLastLine(array, needle, offset + 1);
            }
            var offset = find(array, '\n'+needle+'\r', last);
            if( offset >= 0) {
                last = findLastLine(array, needle, offset + 1);
            }
            return last;
        }
	
	function convertDataURIToBinary(dataURI) {
            var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
            var base64 = dataURI.substring(base64Index);
            return decodeBase64(base64);
	}

	function strHex(s) {
            var a = "";
            for( var i=0; i<s.length; i++ ) {
		a = a + pad2(s.charCodeAt(i).toString(16));
            }
            return a;
	}
        
        function isSigInRoot(pdf) {
            if (typeof pdf.acroForm === 'undefined') {
                return false;
            }
            return pdf.acroForm.get('SigFlags') === 3;
        }
	
	/**
	*
	*  Base64 encode / decode
	*  http://www.webtoolkit.info/
	*  
	*  window.atob -> browser/node.js dependant, this works on any engine
	*
	**/
        function encodeBase64(input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            while (i < input.length) {
                chr1 = input[i++];
                chr2 = input[i++];
                chr3 = input[i++];
 
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
 
                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
            }
            return output;
        }

	function decodeBase64(input) {
	    var chr1, chr2, chr3;
	    var enc1, enc2, enc3, enc4;
	    var i = 0;
            var size = 0;
            
	    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            var uint8 = new Uint8Array(input.length);

	    while (i < input.length) {

	        enc1 = keyStr.indexOf(input.charAt(i++));
	        enc2 = keyStr.indexOf(input.charAt(i++));
	        enc3 = keyStr.indexOf(input.charAt(i++));
	        enc4 = keyStr.indexOf(input.charAt(i++));

	        chr1 = (enc1 << 2) | (enc2 >> 4);
	        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
	        chr3 = ((enc3 & 3) << 6) | enc4;

                uint8[size++] = (chr1 & 0xff);

	        if (enc3 !== 64) {
                    uint8[size++] = (chr2 & 0xff);
	        }
	        if (enc4 !== 64) {
                    uint8[size++] = (chr3 & 0xff);
	        }

	    }
            return uint8.subarray(0,size);
	}
        
        function updateXrefOffset(xref, offset, offsetDelta) {
            for(var i in xref.entries) {
                if(xref.entries[i].offset >= offset) {
                    xref.entries[i].offset += offsetDelta; 
                }
            }
            for(var i in xref.xrefBlocks) {
                if(xref.xrefBlocks[i] >= offset) {
                    xref.xrefBlocks[i]  += offsetDelta; 
                }
            }
        }
        
        function updateXrefBlocks(xrefBlocks, offset, offsetDelta) {
            for(var i in xrefBlocks) {
                if(xrefBlocks[i].start >= offset) {
                    xrefBlocks[i].start += offsetDelta;
                }
                if(xrefBlocks[i].end >= offset) {
                    xrefBlocks[i].end += offsetDelta;
                }
            }
        }
        
        function updateOffset(pos, offset, offsetDelta) {
            if(pos >= offset) {
                return pos + offsetDelta;
            }
            return pos;
        }
        
        function round256(x) {
            return (Math.ceil(x/256)*256) - 1;
        }
        
        /**
         * (D:YYYYMMDDHHmmSSOHH'mm)
         * e.g. (D:20151210164400+01'00')
         * where:
         * YYYY shall be the year
         * MM shall be the month (01–12)
         * DD shall be the day (01–31)
         * HH shall be the hour (00–23)
         * mm shall be the minute (00–59)
         * SS shall be the second (00–59)
         * O shall be the relationship of local time to Universal Time (UT), and shall be denoted by one of the characters PLUS SIGN (U+002B) (+), HYPHEN-MINUS (U+002D) (-), or LATIN CAPITAL LETTER Z (U+005A) (Z) (see below)
         * HH followed by APOSTROPHE (U+0027) (') shall be the absolute value of the offset from UT in hours (00–23)
         * mm shall be the absolute value of the offset from UT in minutes (00–59)
         */
        function now(date) {
            date = typeof date !== 'undefined' ? date : new Date();
            var yyyy = date.getFullYear().toString();
            var MM = pad2(date.getMonth() + 1);
            var dd = pad2(date.getDate());
            var hh = pad2(date.getHours());
            var mm = pad2(date.getMinutes());
            var ss = pad2(date.getSeconds());
            return yyyy + MM + dd+  hh + mm + ss + createOffset(date);
        }
        
        function createOffset(date) {
            var sign = (date.getTimezoneOffset() > 0) ? "-" : "+";
            var offset = Math.abs(date.getTimezoneOffset());
            var hours = pad2(Math.floor(offset / 60));
            var minutes = pad2(offset % 60);
            return sign + hours + "'" + minutes;
        }
        
        function newSig(pdf, root, rootSuccessor, date, cert, password) {
            // {annotEntry} is the ref to the annot widget. If we enlarge the array, make sure all the offsets 
            // after the modification will be updated -> xref table and startxref
            var annotEntry = findFreeXrefNr(pdf.xref.entries);
            // we'll store all the modifications we make, as we need to adjust the offset in the PDF
            var offsetForm = find(pdf.stream.bytes, '<<', root.offset, rootSuccessor.offset) + 2;
            //first we need to find the root element and add the following:
            //
            // /AcroForm<</Fields[{annotEntry} 0 R] /SigFlags 3>>
            //
            var appendAcroForm = '/AcroForm<</Fields['+annotEntry+' 0 R] /SigFlags 3>>';
            //before we insert the acroform, we find the right place for annotentry
            
            //we need to add Annots [x y R] to the /Type /Page section. We can do that by searching /Contents[
            var pages = pdf.catalog.catDict.get('Pages');
            //get first page, we have hidden sig, so don't bother
            var ref = pages.get('Kids')[0];
            var xref = pdf.xref.fetch(ref);
            var offsetContentEnd = xref.get('#Contents_offset');
            //we now search backwards, this is safe as we don't expect user content here
            var offsetContent = findBackwards(pdf.stream.bytes, '/Contents', offsetContentEnd);
            var appendAnnots = '/Annots['+annotEntry+' 0 R]\n ';
            
            //now insert string into stream
            var array = insertIntoArray(pdf.stream.bytes, offsetForm, appendAcroForm);
            //recalculate the offsets in the xref table, only update those that are affected
            updateXrefOffset(pdf.xref, offsetForm, appendAcroForm.length);
            offsetContent = updateOffset(offsetContent, offsetForm, appendAcroForm.length);
                    
            var array = insertIntoArray(array, offsetContent, appendAnnots);
            updateXrefOffset(pdf.xref, offsetContent, appendAnnots.length);
            offsetContent = -1; //not needed anymore, don't update when offset changes
            
            //Then add to the next free object (annotEntry)
            //add right before the xref table or stream
            //if its a table, place element before the xref table
            //
            // sigEntry is the ref to the signature content. Next we need the signature object
            var sigEntry = findFreeXrefNr(pdf.xref.entries, [annotEntry]);
                
            //
            // {annotEntry} 0 obj
            // <</F 132/Type/Annot/Subtype/Widget/Rect[0 0 0 0]/FT/Sig/DR<<>>/T(signature)/V Y 0 R>>
            // endobj
            //
            var append = annotEntry + ' 0 obj\n<</F 132/Type/Annot/Subtype/Widget/Rect[0 0 0 0]/FT/Sig/DR<<>>/T(signature'+annotEntry+')/V '+sigEntry+' 0 R>>\nendobj\n\n';
            
            // we want the offset just before the last xref table or entry
            var blocks = findXrefBlocks(pdf.xref.xrefBlocks);
            var offsetAnnot = blocks[0].start;
            array = insertIntoArray(array, offsetAnnot, append);
            //no updateXrefOffset, as the next entry will be following
                    
            //
            // {sigEntry} 0 obj
            // <</Contents <0481801e6d931d561563fb254e27c846e08325570847ed63d6f9e35 ... b2c8788a5>
            // /Type/Sig/SubFilter/adbe.pkcs7.detached/Location(Ghent)/M(D:20120928104114+02'00')
            // /ByteRange [A B C D]/Filter/Adobe.PPKLite/Reason(Test)/ContactInfo()>>
            // endobj
            //
                
            //the next entry goes below the above
            var offsetSig = offsetAnnot + append.length;
                                   
            // Both {annotEntry} and {sigEntry} objects need to be added to the last xref table. The byte range needs 
            // to be adjusted. Since the signature will always be in a gap, use first an empty sig 
            // to check the size, add ~25% size, then calculate the signature and place in the empty 
            // space.
            var start = sigEntry+ ' 0 obj\n<</Contents <';
            var dummy = api.sign(convertUint8ArrayToBinaryString(cert), 'A', password);
            //TODO: Adobe thinks its important to have the right size, no idea why this is the case
            var crypto = new Array(round256(dummy.length * 2)).join( '0' );
            var middle = '>\n/Type/Sig/SubFilter/adbe.pkcs7.detached/Location()/M(D:'+now(date)+'\')\n/ByteRange ';
            var byteRange = '[0000000000 0000000000 0000000000 0000000000]';
            var end = '/Filter/Adobe.PPKLite/Reason()/ContactInfo()>>\nendobj\n\n';
            //all together
            var append2 = start+crypto+middle+byteRange+end;
            var offsetByteRange = start.length+crypto.length+middle.length;
                 
            array = insertIntoArray(array, offsetSig, append2);
            updateXrefOffset(pdf.xref, offsetAnnot, append2.length + append.length);

            //find the xref tables, remove them and also the EOF, as we'll write a new table
            var xrefBlocks = findXrefBlocks(pdf.xref.xrefBlocks);
                
            for(var i in xrefBlocks) {
                var oldSize = array.length;
                array = removeFromArray(array, xrefBlocks[i].start, xrefBlocks[i].end);
                var length = array.length - oldSize;
                updateXrefOffset(pdf.xref, xrefBlocks[i].start, length);
                        
                //check for %%EOF and remove it as well
                var offsetEOF = find(array, '%%EOF', xrefBlocks[i].start, xrefBlocks[i].start+20);
                if(offsetEOF > 0) {
                    var lengthEOF = '%%EOF'.length;
                    array = removeFromArray(array, offsetEOF, offsetEOF + lengthEOF);
                    updateXrefOffset(pdf.xref, offsetEOF, -lengthEOF);
                    updateXrefBlocks(xrefBlocks, offsetEOF, -lengthEOF);
                    offsetAnnot = updateOffset(offsetAnnot, offsetEOF, -lengthEOF);
                    offsetSig = updateOffset(offsetSig, offsetEOF, -lengthEOF);
                }
                updateXrefBlocks(xrefBlocks, xrefBlocks[i].start, length);
                offsetAnnot = updateOffset(offsetAnnot, xrefBlocks[i].start, length);
                offsetSig = updateOffset(offsetSig, xrefBlocks[i].start, length);
            }
                    
            var sha256Hex = sha256(array, false);
                
            //add the new entries to the xref 
            pdf.xref.entries[annotEntry] = {offset:offsetAnnot, gen:0, free:false};
            pdf.xref.entries[sigEntry] = {offset:offsetSig, gen:0, free:false};
                    
            var xrefTable = createXrefTable(pdf.xref.entries);
            //also empty entries count as in the PDF spec, page 720 (example)
            xrefTable += createTrailer(pdf.xref.topDict, array.length, sha256Hex, pdf.xref.entries.length);
            array = insertIntoArray(array, array.length, xrefTable);
                    
            //since we consolidate, no prev! [adjust /Prev -> rawparsing + offset]
            var from1 = 0;
            var to1 = offsetSig+start.length;
            var from2 = to1 + crypto.length;
            var to2 = (array.length - from2) - 1;
            var byteRange = '['+pad10(from1)+' '+pad10(to1 - 1) + ' ' +pad10(from2 + 1)+ ' ' + pad10(to2) + ']';
            array = updateArray(array, (offsetSig + offsetByteRange), byteRange);
            var data = removeFromArray(array, to1 - 1, from2 + 1);
            var crypto2 = api.sign(convertUint8ArrayToBinaryString(cert), data, password, date);
            array = updateArray(array, to1, crypto2);
            return array;
        }
        
        function appendSig(pdf, root, rootSuccessor, date, cert, password) {
            //copy root and the entry with contents to the end
            var startRoot = pdf.stream.bytes.length + 1;
                    
            var array = copyToEnd(pdf.stream.bytes, root.offset - 1, rootSuccessor.offset);
                    
            //since we signed the first one, we know how the pdf has to look like:
            var offsetAcroForm = find(array, '/AcroForm<</Fields', startRoot);
            var endOffsetAcroForm = find(array, ']', offsetAcroForm);
                    
            var annotEntry = findFreeXrefNr(pdf.xref.entries);
            var sigEntry = findFreeXrefNr(pdf.xref.entries, [annotEntry]);
                    
            var appendAnnot = ' ' + annotEntry + ' 0 R';
            array = insertIntoArray(array, endOffsetAcroForm, appendAnnot);
            
            //we need to add Annots [x y R] to the /Type /Page section. We can do that by searching /Annots
            var pages = pdf.catalog.catDict.get('Pages');
            //get first page, we have hidden sig, so don't bother
            var contentRef = pages.get('Kids')[0];
            var xref = pdf.xref.fetch(contentRef);
            var offsetAnnotEnd = xref.get('#Annots_offset');
            //we now search ], this is safe as we signed it previously
            var endOffsetAnnot = find(array, ']', offsetAnnotEnd);
            var xrefEntry = pdf.xref.getEntry(contentRef.num);
            var xrefEntrySuccosser = findSuccessorEntry(pdf.xref.entries, xrefEntry);
            var offsetAnnotRelative = endOffsetAnnot - xrefEntrySuccosser.offset;
            var startContent = array.length;
            array = copyToEnd(array, xrefEntry.offset, xrefEntrySuccosser.offset);
            array = insertIntoArray(array, array.length + offsetAnnotRelative, appendAnnot);
                    
            var startAnnot = array.length;
            var append = annotEntry + ' 0 obj\n<</F 132/Type/Annot/Subtype/Widget/Rect[0 0 0 0]/FT/Sig/DR<<>>/T(signature'+annotEntry+')/V '+sigEntry+' 0 R>>\nendobj\n\n';
            array = insertIntoArray(array, startAnnot, append);
                    
            var startSig = array.length;
            var start = sigEntry+ ' 0 obj\n<</Contents <';
            var dummy = api.sign(convertUint8ArrayToBinaryString(cert), 'A', password);
            //TODO: Adobe thinks its important to have the right size, no idea why this is the case
            var crypto = new Array(round256(dummy.length * 2)).join( '0' );
            var middle = '>\n/Type/Sig/SubFilter/adbe.pkcs7.detached/Location()/M(D:'+now(date)+'\')\n/ByteRange ';
            var byteRange = '[0000000000 0000000000 0000000000 0000000000]';
            var end = '/Filter/Adobe.PPKLite/Reason()/ContactInfo()>>\nendobj\n\n';
            //all together
            var append2 = start+crypto+middle+byteRange+end;
            array = insertIntoArray(array, startSig, append2);

            var sha256Hex = sha256(array, false);
                    
            var prev = pdf.xref.xrefBlocks[0];
            var startxref = array.length;
            var xrefEntries = [];
            xrefEntries[0] = {offset:0, gen:65535, free:true};
            xrefEntries[pdf.xref.topDict.getRaw('Root').num] = {offset:startRoot, gen:0, free:false};
            xrefEntries[contentRef.num] = {offset:startContent, gen:0, free:false};
            xrefEntries[annotEntry] = {offset:startAnnot, gen:0, free:false};
            xrefEntries[sigEntry] = {offset:startSig, gen:0, free:false};
            var xrefTable = createXrefTableAppend(xrefEntries);
            xrefTable += createTrailer(pdf.xref.topDict, startxref, sha256Hex, xrefEntries.length, prev);
            array = insertIntoArray(array, array.length, xrefTable);
                    
            var from1 = 0;
            var to1 = startSig + start.length;
            var from2 = to1 + crypto.length;
            var to2 = (array.length - from2) - 1;
            var byteRange = '['+pad10(from1)+' '+pad10(to1 - 1) + ' ' +pad10(from2 + 1)+ ' ' + pad10(to2) + ']';
                    
            array = updateArray(array, from2 + middle.length, byteRange);
            //now sign from1-to1 / from2-to2 and update byterange
                    
            var data = removeFromArray(array, to1 - 1, from2 + 1);
            var crypto2 = api.sign(convertUint8ArrayToBinaryString(cert), data, password, date);
            array = updateArray(array, to1, crypto2);
            return array;
        }
        
        function loadPdf(pdfArray) {
            var pdf = new pdfjsCoreDocument.PDFDocument(false, pdfArray, '');
            pdf.parseStartXRef();
            pdf.parse();
            return pdf;
        }
	
	var api = {
            sign: function(data, rawpdf, password, date) {
                date = typeof date !== 'undefined' ?  date : new Date();
		var certBag = '1.2.840.113549.1.12.10.1.3';
		var keyBag =  '1.2.840.113549.1.12.10.1.2';
		
		var p12Asn1 = forge.asn1.fromDer(data);
		var p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
		
		// get bags by type
		var bags = p12.getBags({bagType: certBag});
		// bags are key'd by bagType and each bagType key's value
		// is an array of matches (in this case, certificate objects)
                
		var p7 = forge.pkcs7.createSignedData();
                p7.content = forge.util.createBuffer(rawpdf);
                var last = bags[certBag][0];
                for (var i in bags[certBag]) {
                    p7.addCertificate(bags[certBag][i].cert);
                    last = bags[certBag][i];
                }
                
                // get key bags
		var bags = p12.getBags({bagType: keyBag});
		// get key
		var bag = bags[keyBag][0];
		var key = bag.key;
                
		p7.addSigner({
		  key: key,
		  certificate: last.cert,
		  digestAlgorithm: forge.pki.oids.sha256,
		  authenticatedAttributes: [{
		    type: forge.pki.oids.contentType,
		    value: forge.pki.oids.data
		  }, {
		    type: forge.pki.oids.messageDigest
		    // value will be auto-populated at signing time
		  }, {
		    type: forge.pki.oids.signingTime,
		    // value can also be auto-populated at signing time
		    value: date
		  }]
		});
		p7.signDetached();
                //detached as described in:
                //https://gitlab.com/rootcaid/kominfo-pki-websdk/blob/master/lib/forge/pkcs7.js#L331
                
                var raw = forge.asn1.toDer(p7.toAsn1()).getBytes();
                var hex = strHex(raw);
                return hex;
            },
        
            signpdf: function(pdfRaw, cert, password, date) {
                date = typeof date !== 'undefined' ? date : new Date();
                pdf = loadPdf(pdfRaw)
                var root = findRootEntry(pdf.xref);
                var rootSuccessor = findSuccessorEntry(pdf.xref.entries, root);
                if(!isSigInRoot(pdf)) {
                    return newSig(pdf, root, rootSuccessor, date, cert, password);
                } else {
                    return appendSig(pdf, root, rootSuccessor, date, cert, password);
                }
            }
	};
	
	/* test-code */
	api._strHex = strHex;
	api._convertDataURIToBinary = convertDataURIToBinary;
	api._find = find;
        api._findBackwards = findBackwards;
	api._findFreeXrefNr = findFreeXrefNr;
	api._stringToUint8Array = stringToUint8Array;
	api._uint8ArrayToString = uint8ArrayToString;
	api._insertIntoArray = insertIntoArray;
	api._findRootEntry = findRootEntry;
        api._findSuccessorEntry = findSuccessorEntry;
        api._isSigInRoot = isSigInRoot;
        api._copyToEnd = copyToEnd;
        api._sortOnKeys = sortOnKeys;
        api._createXrefTable = createXrefTable;
        api._findXrefBlocks = findXrefBlocks;
        api._loadPdf = loadPdf;
        api._encodeBase64 = encodeBase64;
        api._decodeBase64 = decodeBase64;
	/* end-test-code */
	
	return api;
}());


