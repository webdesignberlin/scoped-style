(function(){
"use strict";

  var scopeClassRe = /\bscope-[a-z0-9]*-[0-9]*\b/;
  var scopeSelectorRe = /(?:^|\s|\n|\W)*-x-scope\b/;

  function escapeRegExp (str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }

  function uniqueString(){
    return Math.random().toString(36).slice(2) + '-' + Date.now();
  }

  function createScope () {
    return 'scope-' + uniqueString();
  }

  function createTempId () {
    return 'TempId-' + uniqueString();
  }

  // Recreating jQueries .find()
  function find(node, selector){
    var id = node.getAttribute('id');
    var idIsTmp = false;
    if(!id){
      idIsTmp = true;
      id = createTempId();
      node.setAttribute('id', id);
    }
    var result = document.querySelector('#' + id + ' ' + selector);
    if(idIsTmp){
      node.removeAttribute('id');
    }
    return result;
  }

  // Remove all occurrences of "-x-scope" in a selector and add the scope as
  // a class selector before. When replacing -x-scope with the class selector,
  // add no space afterwards to make stuff like -x-scope[foo=bar] work
  function rewriteSelector (selector, scope) {
    return selector.split(',')
      .map(function(s){
        if(selector.match(scopeSelectorRe)){
          return '.' + scope + s.replace(scopeSelectorRe, '');
        } else {
          return '.' + scope + ' ' + s;
        }
      })
      .join(',');
  }

  // Remove and replace the rule's selector because there's no other way to only
  // get a string of all declarations
  function rewriteRule (rule, scope) {
    var reSelector = new RegExp('^\\s*' + escapeRegExp(rule.selectorText));
    var css = rule.cssText.replace(reSelector, '');
    var selector = rewriteSelector(rule.selectorText, scope);
    return selector + css;
  }

  function rewriteRules (source, scope) {
    var rules = source.cssRules;
    for (var i = 0; i < rules.length; i++) {
      switch (rules[i].type) {
        case 1: // StyleRule
          var newCssText = rewriteRule(rules[i], scope);
          source.deleteRule(i);
          source.insertRule(newCssText, i);
          break;
        case 4: // MediaRule
          rewriteRules(rules[i], scope);
          break;
        default: // Don't touch other rules
          break;
      }
    }
  }

  function setScope (element, scope) {
    // Remove scope classes for which no child style element (identified by its
    // data-scope property) can be found. This is required to keep scopes unique
    // when cloning style elements while still supporting multiple scoped style
    // elements per parent element
    [].forEach.call(element.classList, function (className) {
      if(className.match(scopeClassRe)){
        var keepScope = !!find(element, '> [data-scope="' + className + '"]');
        if(!keepScope){
          element.classList.remove(className);
        }
      }
    });
    element.classList.add(scope);
  }

  var proto = {
    attachedCallback: function () {
      var scope = createScope();
      this.setAttribute('data-scope', scope);
      rewriteRules(this.sheet, scope);
      setScope(this.parentNode, scope);
    }
  };

  Object.setPrototypeOf(proto, window.HTMLStyleElement.prototype);

  document.registerElement('scoped-style', {
    extends: 'style',
    prototype: proto
  });

})();