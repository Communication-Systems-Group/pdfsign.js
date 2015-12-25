# PDFSign.js

PDFSign.js is a JavaScript library that signs a PDF in the browser. No private keys 
or passwords are ever sent over the network. The signing takes place in the browser 
only. The API is very simple:

```javascript
signed-pdf = PDFSIGN.signpdf(pdf, p12-cert, p12-cert-password);
```
An example site is located in `src/html`. In this example, one can set the certificate 
(e.g., `support/mycert-1-alt.p12`), set the password "1234", and add a PDF file. 
The PDF will be signed with the certificate and the Adobe Reader will show that 
the PDF is signed but not trusted (its a self signed certificate). The button 
'Create a PDF and output base64' takes a base64 encode file and outputs a base64
document in the browser, which immediately displays the PDF.

PDFSign uses two external libraries: 
[forge](https://github.com/digitalbazaar/forge) and [PDF.js](https://mozilla.github.io/pdf.js/).

## Forge
The signing part is done with [forge](https://github.com/digitalbazaar/forge). 
This library had to be adapted as a PDF requires a detached pkcs7 signature as 
described [here](https://www.adobe.com/devnet-docs/acrobatetk/tools/DigSig/Acrobat_DigitalSignatures_in_PDF.pdf). 
Forge can handle pkcs7, however, always adds the content as well. 
The patch adds the feature to sign detached, similar as done 
[here](https://gitlab.com/rootcaid/kominfo-pki-websdk/blob/master/lib/forge/pkcs7.js#L331).

## PDF.js
The PDF parsing is done with [PDF.js](https://mozilla.github.io/pdf.js/). This library
had also to be adapted as for writing PDF, offsets needed to be stored as well. 
This library was also stripped down to the parsing part, as the displaying part is
not needed. Unfortunately, this was not only done on a file basis, but inside some
files, displaying and parsing was mixed and had to be removed.

# License
This software is released under the [MIT license](http://www.opensource.org/licenses/MIT).