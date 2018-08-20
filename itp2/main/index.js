"use strict";

document.addEventListener("DOMContentLoaded", function(event) {
  updateElWithOrigin('#origin');
  loadThirdPartyFromQueryParam({ param: 'thirdparty-url', selectors: { input: '#thirdparty-url', iframe: '#thirdparty-iframe' } });
});

function loadThirdPartyFromQueryParam(opts) {
  const params = (new URL(document.location)).searchParams;
  const url = decodeURIComponent(params.get(opts.param));
  console.log(`"${opts.param}" query param has url: "${url}"`)
  document.querySelector(opts.selectors.iframe).src = url;
  document.querySelector(opts.selectors.input).value = url;
}

function updateElWithOrigin(selector) {
  updateDomElementText(document.querySelector(selector), window.origin);
}

function updateDomElementText(element, text) {
  element.innerHTML = text;
  element.classList.add('updated');
  setTimeout(function () { element.classList.remove('updated'); }, 200);
}
