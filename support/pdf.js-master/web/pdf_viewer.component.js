/* Copyright 2014 Mozilla Foundation
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
/*jshint globalstrict: false */
/* globals PDFJS, PDFViewer, PDFPageView, TextLayerBuilder, PDFLinkService,
           DefaultTextLayerFactory, AnnotationLayerBuilder, PDFHistory,
           DefaultAnnotationLayerFactory, getFileName, ProgressBar */

// Initializing PDFJS global object (if still undefined)
if (typeof PDFJS === 'undefined') {
  (typeof window !== 'undefined' ? window : this).PDFJS = {};
}

(function pdfViewerWrapper() {
  'use strict';

//#include ui_utils.js
//#include pdf_link_service.js
//#include pdf_viewer.js
//#include pdf_history.js

  PDFJS.PDFViewer = PDFViewer;
  PDFJS.PDFPageView = PDFPageView;
  PDFJS.PDFLinkService = PDFLinkService;
  PDFJS.TextLayerBuilder = TextLayerBuilder;
  PDFJS.DefaultTextLayerFactory = DefaultTextLayerFactory;
  PDFJS.AnnotationLayerBuilder = AnnotationLayerBuilder;
  PDFJS.DefaultAnnotationLayerFactory = DefaultAnnotationLayerFactory;
  PDFJS.PDFHistory = PDFHistory;

  PDFJS.getFileName = getFileName;
  PDFJS.ProgressBar = ProgressBar;
}).call((typeof window === 'undefined') ? this : window);
