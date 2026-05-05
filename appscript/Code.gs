/**
 * Coaching Dashboard - Google Apps Script Web App
 * Serves the dashboard as a web application
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Resident Home — Vision')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * Include helper - allows modular HTML/CSS/JS files
 * Usage in HTML: <?!= include('CSS') ?> or <?!= include('JS') ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
