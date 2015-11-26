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
        
        function createXrefTable(xrefs, offsetDelta, startxref, newXrefEntries) {
            var retVal ='xref\n';
            var max = -1;
            for(var i in xrefs.entries) {
                if(i > max) { max = i;}
                if(typeof xrefs.entries[i].offset === 'undefined') { continue; }
                retVal += i + ' 1\n';
                var num = adjustOffset(xrefs.entries[i].offset, offsetDelta);
                retVal += pad10(num)+' '+pad5(xrefs.entries[i].gen)+' '+(xrefs.entries[i].free?'f':'n')+' \n'; 
            }
            for(var i in newXrefEntries) {
                retVal += newXrefEntries[i].nr + ' 1\n';
                var num = newXrefEntries[i].offset;
                retVal += pad10(num)+' '+pad5(0)+' n \n'; 
            }
            retVal +='trailer <<\n';
            retVal +='  /Size '+(parseInt(max) + 3)+'\n';
            var refRoot = xrefs.topDict.getRaw('Root');
            if(typeof refRoot !== 'undefined') {
                retVal +='  /Root '+refRoot.num+' '+refRoot.gen+' R\n';
            }
            var refInfo = xrefs.topDict.getRaw('Info');
            if(typeof refInfo !== 'undefined') {
                retVal +='  /Info '+refInfo.num+' '+refInfo.gen+' R\n';
            }
            var id = xrefs.topDict.getRaw('ID');
            if(typeof id !== 'undefined') {
                //TODO: get the right IDs
                retVal +='  /ID [<'+id1+'><'+id2+'>]\n';
            }
            retVal +='>>\n';
            retVal +='startxref\n';
            retVal +=startxref + '\n';
            retVal +='%%EOF\n';
            return retVal;
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
        
	function getXrefBlocks(xrefEntries, offsetDelta) {
            var xrefBlocks = [];
            for(var i in xrefEntries) {
                if(typeof xrefEntries[i].xrefPos !== 'undefined') {
                    //xref table
                    var adjustedStart = adjustOffset(xrefEntries[i].xrefPos, offsetDelta);
                    var adjustedEnd = adjustOffset(xrefEntries[i].xrefEnd, offsetDelta);
                    if(arrayObjectIndexOf(xrefBlocks, adjustedStart, adjustedEnd, xrefEntries[i].xrefPos) === -1) {
                        xrefBlocks.push({start:adjustedStart, end:adjustedEnd, orig:xrefEntries[i].xrefPos});
                    }
                } else if(typeof xrefEntries[i].xrefEntry !== 'undefined') {
                    //xref stream
                    var xrefStart = xrefEntries[xrefEntries[i].xrefEntry];
                    var xrefEnd = getNextEntry(xrefEntries, xrefStart);
                    var adjustedStart = adjustOffset(xrefStart.offset, offsetDelta);
                    var adjustedEnd = adjustOffset(xrefEnd.offset - 1, offsetDelta);
                    if(arrayObjectIndexOf(xrefBlocks, adjustedStart, adjustedEnd, xrefStart) === -1) {
                        xrefBlocks.push({start:adjustedStart, end:adjustedEnd, orig:xrefStart, entry:xrefEntries[i].xrefEntry});
                    }
                } else {
                    //irrelevant xref
                }
                
            }
            return xrefBlocks;
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

	function getRootEntry(xref) {
            var rootNr = xref.root.objId.substring(0, xref.root.objId.length - 1);
            return xref.entries[rootNr];
	}
        
        function getNextEntry(xrefEntries, entry) {
            //find it first
            var currentOffset = entry.offset;
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
                return entry;
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
	
	function uint8ArrayToString(buf) {
            return String.fromCharCode.apply(null, buf);
            /*var s = ''
            for (var i=0, strLen=buf.length; i<strLen; i++) {
            	s= s + String.fromCharCode(buf[i]);
            }
            return s*/	  
	}


	//not tested, works in browser only
	function createPDFDownload(array, filename) {
            var a = window.document.createElement('a');
            a.href = window.URL.createObjectURL(new Blob([array], { type: 'application/pdf' }));
            a.download = filename;
            // Append anchor to body.
            document.body.appendChild(a);
            a.click();
            // Remove anchor from body
            document.body.removeChild(a);
	}

	function findFreeXrefNr(xrefEntries, used) {
            used = typeof used !== 'undefined' ?  used : -1;
            for (var i=1;i<xrefEntries.length;i++) {
		if(i!==used && (typeof xrefEntries[i] === 'undefined' 
	    		|| (!xrefEntries[i].free && !xrefEntries[i].uncompressed))) {
                    return i;
	    	}
	    }
            if(used === xrefEntries.length) {
		return xrefEntries.length + 1;
            } else {
            	return xrefEntries.length;
            }
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
                }
                
                if(match === search.length) {
                    return (i + 1) - match;
                }
            }
            
            return -1;
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
        
        function adjustOffset(offset, offsetDelta) {
            for (var i in offsetDelta) {
                if(offset > offsetDelta[i].from) {
                    offset += offsetDelta[i].length;
                }
            }
            return offset;
        }
	
	var api = {
			
            sign: function(data, rawpdf, password) {
		
		var certBag = '1.2.840.113549.1.12.10.1.3';
		var keyBag =  '1.2.840.113549.1.12.10.1.2';
		
		var p12Asn1 = forge.asn1.fromDer(data);
		var p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
		//console.log(p12);
		
		// get bags by type
		var bags = p12.getBags({bagType: certBag});
		// bags are key'd by bagType and each bagType key's value
		// is an array of matches (in this case, certificate objects)
		var cert = bags[certBag][0];
		//console.log(cert);
		var cert1 = bags[certBag][1];
		//console.log(cert1);
		var cert2 = bags[certBag][2];
		//console.log(cert2);
		
		// get key bags
		var bags = p12.getBags({bagType: keyBag});
		//console.log(bags);
		// get key
		var bag = bags[keyBag][0];
		var key = bag.key;
		
		//console.log(key);
		
		var p7 = forge.pkcs7.createSignedData();
                p7.content = forge.util.createBuffer(rawpdf);
                p7.addCertificate(cert.cert);
		if(typeof cert1 !== 'undefined') {
                    p7.addCertificate(cert1.cert);
                }
                if(typeof cert2 !== 'undefined') {
                    p7.addCertificate(cert2.cert);
                }
		
		p7.addSigner({
		  key: key,
		  certificate: cert.cert,
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
		    value: new Date()
		  }]
		});
		var t = p7.sign();
		//console.log(t);
		var pem = forge.pkcs7.messageToPem(p7);
		
		//console.log(p7.toAsn1());
		//console.log(typeof p7.toAsn1());
                
		return strHex(forge.asn1.toDer(p7.toAsn1()).getBytes());
		
		
            },
        
            signpdf: function(pdf, cert, password) {
                if(!isSigInRoot(pdf)) {
                    //initial sig
                    var root = getRootEntry(pdf.xref);
                    var nextEntry = getNextEntry(pdf.xref.entries, root);
                    // {annotEntry} is the ref to the annot widget. If we enlarge the array, make sure all the offsets 
                    // after the modification will be updated -> xref table and startxref
                    var annotEntry = findFreeXrefNr(pdf.xref.entries);
                    // we'll store all the modifications we make, as we need to adjust the offset in the PDF
                    var offsetDelta = [];
                    var offset = find(pdf.stream.bytes, '<<', root.offset, nextEntry.offset) + 2;
                    // 
                    //first we need to find the root element and add the following:
                    //
                    // /AcroForm<</Fields[{annotEntry} 0 R] /SigFlags 3>>
                    //
                    var append = '/AcroForm<</Fields['+annotEntry+' 0 R] /SigFlags 3>>';
                    offsetDelta.push({from: offset, length:append.length});
                    //now insert string into stream
                    var array = insertIntoArray(pdf.stream.bytes, offset, append);
                
                    // Then add to the next free object (annotEntry)
                    //add right before the xref table or stream
                    //if its a table, place element before the xref table
                    //
                    // sigEntry is the ref to the signature content. Next we need the signature object
                    var sigEntry = findFreeXrefNr(pdf.xref.entries, annotEntry);
                
                    //
                    // {annotEntry} 0 obj
                    // <</F 132/Type/Annot/Subtype/Widget/Rect[0 0 0 0]/FT/Sig/DR<<>>/T(signature)/V Y 0 R>>
                    // endobj
                    //
                    //5369676E61747572655F31 -> signature
                    var append = annotEntry + ' 0 obj\n<</F 132/Type/Annot/Subtype/Widget/Rect[0 0 0 0]/FT/Sig/DR<<>>/T(signature)/V '+sigEntry+' 0 R>>\nendobj\n\n';
                    // we want the offset just before the xref table or entry
                    if (typeof root.xrefPos === 'undefined' || root.xrefPos === null) {
                        // we have a stream
                        var offset = pdf.xref.entries[root.xrefEntry].offset;
                    } else {
                        var offset = root.xrefPos;
                    }
                    var origOffset = offset;
                    var tmpOffset = adjustOffset(offset, offsetDelta);
                    array = insertIntoArray(array, tmpOffset, append);
                
                    //
                    // {sigEntry} 0 obj
                    // <</Contents <0481801e6d931d561563fb254e27c846e08325570847ed63d6f9e35 ... b2c8788a5>
                    // /Type/Sig/SubFilter/adbe.pkcs7.detached/Location(Ghent)/M(D:20120928104114+02'00')
                    // /ByteRange [A B C D]/Filter/Adobe.PPKLite/Reason(Test)/ContactInfo()>>
                    // endobj
                    //
                
                    //the next entry goes below the above
                    var offset = tmpOffset + append.length;
                                   
                    // Both {annotEntry} and {sigEntry} objects need to be added to the last xref table. The byte range needs 
                    // to be adjusted. Since the signature will always be in a gap, use first an empty sig 
                    // to check the size, add ~25% size, then calculate the signature and place in the empty 
                    // space.
                    var start = sigEntry+ ' 0 obj\n<</Contents <';
                    var dummy = api.sign(convertUint8ArrayToBinaryString(cert), 'A', password);
                    var crypto = new Array(dummy.length * 3).join( '0' );
                    var middle = '>\n/Type/Sig/SubFilter/adbe.pkcs7.detached/Location(Zurich)/M(D:20120928104114+02\'00\')\n/ByteRange ';
                    var byteRange = '[0000000000 0000000000 0000000000 0000000000]';
                    var end = '/Filter/Adobe.PPKLite/Reason(Test)/ContactInfo()>>\nendobj\n\n';
                    //all together
                    var append2 = start+crypto+middle+byteRange+end;
                    var offsetByteRange = start.length+crypto.length+middle.length;
                 
                    offsetDelta.push({from: origOffset, length:(append.length + append2.length)});
                    array = insertIntoArray(array, offset, append2);
                    //now we have all the data in there. We now have to update the xref tables
                
                    var xrefBlocks = getXrefBlocks(pdf.xref.entries, offsetDelta);
                
                    for(var i in xrefBlocks) {
                        var oldSize = array.length;
                        array = removeFromArray(array, xrefBlocks[i].start, xrefBlocks[i].end);
                        var length = array.length - oldSize;
                        //check for %%EOF and remove it as well
                        
                        var offsetEOF = find(array, '%%EOF', xrefBlocks[i].start, xrefBlocks[i].start+20);
                        if(offsetEOF > 0) {
                            array = removeFromArray(array, offsetEOF, offsetEOF + '%%EOF'.length);
                        }
                        
                        offsetDelta.push({from: xrefBlocks[i].orig, length:(length - ('%%EOF'.length))});
                        if(tmpOffset > xrefBlocks[i].start) {
                            tmpOffset += (length - ('%%EOF'.length));
                        }
                        
                        //console.log('from:'+xrefBlocks[i].orig +'//' + (length - ('%%EOF'.length)));
                    }
                
                    //now insert one xref table at the end
                    var newXrefEntries = [{nr:annotEntry, offset:tmpOffset},
                            {nr:sigEntry, offset:(tmpOffset+append.length)}];
                    var xrefTable = createXrefTable(pdf.xref, offsetDelta, array.length, newXrefEntries);
                    array = insertIntoArray(array, array.length, xrefTable);
                    
                    //since we consolidate, no prev! [adjust /Prev -> rawparsing + offset]
                    //adjust /Size -> rawparsing + 2
                    //ajdust startxref, next line -> rawparsing + offset
                    var from1 = 0;
                    var to1 = tmpOffset+append.length+start.length;
                    var from2 = to1 + crypto.length;
                    var to2 = array.length - from2;
                    var byteRange = '['+pad10(from1)+' '+pad10(to1 - 1) + ' ' +pad10(from2 + 1)+ ' ' + pad10(to2) + ']';
                    console.log('BR: '+byteRange+" in "+(array.length));
                    array = updateArray(array, (tmpOffset + offsetByteRange + append.length), byteRange);
                    //now sign from1-to1 / from2-to2 and update byterange
                    
                    var data = removeFromArray(array, to1 - 1, from2 + 1);
                    var crypto2 = api.sign(convertUint8ArrayToBinaryString(cert), data, password);
                    array = updateArray(array, to1, crypto2);
                    return array;
                
                } else {
                    //TODO
                    //append sig
                }
            }
	};
	
	/* test-code */
        api._createPDFDownload = createPDFDownload;
	api._strHex = strHex;
	api._convertDataURIToBinary = convertDataURIToBinary;
	api._find = find;
	api._findFreeXrefNr = findFreeXrefNr;
	api._stringToUint8Array = stringToUint8Array;
	api._uint8ArrayToString = uint8ArrayToString;
	api._insertIntoArray = insertIntoArray;
	api._getRootEntry = getRootEntry;
        api._getNextEntry = getNextEntry;
        api._isSigInRoot = isSigInRoot;
        api._getXrefBlocks = getXrefBlocks;
	/* end-test-code */
	
	return api;
}());


