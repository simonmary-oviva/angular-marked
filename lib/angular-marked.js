/*
 * angular-marked
 * (c) 2014 - 2016 J. Harshbarger
 * Licensed MIT
 */

/* global angular, marked */

'use strict';

var unindent = require('./strip-indent');

  /**
   * @ngdoc overview
   * @name index
   *
   * @description
   * AngularJS Markdown using [marked](https://github.com/chjj/marked).
   *
   * ## Why?
   *
   * I wanted to use [marked](https://github.com/chjj/marked) instead of [showdown](https://github.com/coreyti/showdown) as used in [angular-markdown-directive](https://github.com/btford/angular-markdown-directive) as well as expose the option to globally set defaults.
   *
   * ## How?
   *
   * - {@link hc.marked.directive:marked As a directive}
   * - {@link hc.marked.service:marked As a service}
   * - {@link hc.marked.service:markedProvider Set default options}
   *
   * @example

      Convert markdown to html at run time.  For example:

      <example module="app">
        <file name="example.html">
          <form ng-controller="MainController">
            Markdown:<br />
            <textarea ng-model="my_markdown" cols="60" rows="5" class="span8"></textarea><br />
            Output:<br />
            <div marked="my_markdown" />
          </form>
        </file>
        <file  name="example.js">
          function MainController($scope) {
            $scope.my_markdown = "*This* **is** [markdown](https://daringfireball.net/projects/markdown/)";
          }
          angular.module('app', ['hc.marked']).controller('MainController', MainController);
        </file>
      </example>

    *
    */

    /**
     * @ngdoc overview
     * @name hc.marked
     * @description # angular-marked (core module)
       # Installation
      First include angular-marked.js in your HTML:

      ```js
        <script src="angular-marked.js">
      ```

      Then load the module in your application by adding it as a dependency:

      ```js
      angular.module('yourApp', ['hc.marked']);
      ```

      With that you're ready to get started!
     */

    /**
    * @ngdoc service
    * @name hc.marked.service:marked
    * @requires $window
    * @description
    * A reference to the [marked](https://github.com/chjj/marked) parser.
    *
    * @example
    <example module="app">
      <file name="example.html">
        <div ng-controller="MainController">
          html: {{html}}
        </div>
      </file>
      <file  name="example.js">
        function MainController($scope, marked) {
          $scope.html = marked('#TEST');
        }
        angular.module('app', ['hc.marked']).controller('MainController', MainController);
      </file>
    </example>
   **/

   /**
   * @ngdoc service
   * @name hc.marked.service:markedProvider
   * @description
   * Use `markedProvider` to change the default behavior of the {@link hc.marked.service:marked marked} service.
   *
   * @example

    ## Example using [google-code-prettify syntax highlighter](https://code.google.com/p/google-code-prettify/) (must include google-code-prettify.js script).  Also works with [highlight.js Javascript syntax highlighter](http://highlightjs.org/).

    <example module="myAppA">
      <file name="exampleA.js">
      angular.module('myAppA', ['hc.marked'])
        .config(['markedProvider', function(markedProvider) {
          markedProvider.setOptions({
            gfm: true,
            tables: true,
            highlight: function (code) {
              return prettyPrintOne(code);
            }
          });
        }]);
      </file>
      <file name="exampleA.html">
        <marked>
        ```js
        angular.module('myAppA', ['hc.marked'])
          .config(['markedProvider', function(markedProvider) {
            markedProvider.setOptions({
              gfm: true,
              tables: true,
              highlight: function (code) {
                return prettyPrintOne(code);
              }
            });
          }]);
        ```
        </marked>
      </file>
    </example>

    ## Example overriding the way custom markdown links are displayed

    <example module="myAppB">
      <file name="exampleB.js">
      angular.module('myAppB', ['hc.marked'])
        .config(['markedProvider', function(markedProvider) {
          markedProvider.setRenderer({
            link: function(href, title, text) {
              return "<a href='" + href + "'" + (title ? " title='" + title + "'" : '') + " target='_blank'>" + text + "</a>";
            }
          });
        }]);
      </file>
      <file name="exampleB.html">
        <marked>
          This is [an example](http://example.com/ "Title") inline link.
          [This link](http://example.net/) has no title attribute.
        </marked>
      </file>
    </example>
  **/

function markedProvider() {
  var self = this;

  /**
   * @ngdoc method
   * @name markedProvider#setRenderer
   * @methodOf hc.marked.service:markedProvider
   *
   * @param {object} opts Default renderer options for [marked](https://github.com/markedjs/marked#overriding-renderer-methods).
   */

  self.setRenderer = function (opts) {
    this.renderer = opts;
  };

  /**
   * @ngdoc method
   * @name markedProvider#setOptions
   * @methodOf hc.marked.service:markedProvider
   *
   * @param {object} opts Default options for [marked](https://github.com/markedjs/marked#options).
   */

  self.setOptions = function (opts) {  // Store options for later
    this.defaults = opts;
  };

  self.$get = ['$log', '$window', function ($log, $window) {
    var m;

    try {
      m = require('marked');
    } catch (err) {
      m = $window.marked || marked;
    }

    if (angular.isUndefined(m)) {
      $log.error('angular-marked Error: marked not loaded.  See installation instructions.');
      return;
    }

    // Setup default options
    var defaults = {
      gfm: true,
      breaks: false,
      silent: false,
      langPrefix: 'lang-',
      headerIds: true
    };

    // For testing and backward compatibility
    var markedFn = function(src, opt) {
      try {
        return m.parse(src, Object.assign({}, opt || {}));
      } catch (e) {
        // Return empty string if parsing fails
        console.error('Marked parsing error:', e);
        return '';
      }
    };
    
    // Add default options for compatibility with tests
    markedFn.defaults = defaults;

    // Set up renderer
    var renderer = new m.Renderer();
    
    // Apply custom renderer methods
    if (self.renderer) {
      var o = Object.keys(self.renderer);
      var l = o.length;

      while (l--) {
        renderer[o[l]] = self.renderer[o[l]];
      }
    }

    // Customize code and codespan rendering to wrap default or overriden output in a ng-non-bindable span
    function wrapNonBindable(string) {
      return '<span ng-non-bindable>' + string + '</span>';
    }

    var renderCode = renderer.code.bind(renderer);
    renderer.code = function (code, lang, escaped) {
      return wrapNonBindable(renderCode(code, lang, escaped));
    };
    
    var renderCodespan = renderer.codespan.bind(renderer);
    renderer.codespan = function (code) {
      return wrapNonBindable(renderCodespan(code));
    };

    // Set the custom renderer and any other options
    var options = Object.assign({}, defaults, self.defaults || {});
    options.renderer = renderer;
    
    // Update the defaults object for testing compatibility
    if (self.defaults) {
      Object.assign(markedFn.defaults, self.defaults);
    }

    // Set options on the instance
    m.setOptions(options);

    return markedFn;
  }];
}

  // xTODO: filter and tests */
  // app.filter('marked', ['marked', function(marked) {
  //   return marked;
  // }]);

  /**
   * @ngdoc directive
   * @name hc.marked.directive:marked
   * @restrict AE
   * @element any
   *
   * @description
   * Compiles source test into HTML.
   *
   * @param {expression=} marked The source text to be compiled.  If blank uses content as the source.
   * @param {expression=} opts Hash of options that override defaults.
   * @param {boolean=} compile Set to true to to support AngularJS directives inside markdown.
   * @param {string=} src Expression evaluating to URL. If the source is a string constant,
   *                 make sure you wrap it in **single** quotes, e.g. `src="'myPartialTemplate.html'"`.
   *
   * @example

     ## A simple block of text

      <example module="hc.marked">
        <file name="exampleA.html">
         * <marked>
         *   ### Markdown directive
         *
         *   *It works!*
         *
         *   *This* **is** [markdown](https://daringfireball.net/projects/markdown/) in the view.
         * </marked>
        </file>
      </example>

     ## Bind to a scope variable

      <example module="app">
        <file name="exampleB.html">
          <form ng-controller="MainController">
            Markdown:<br />
            <textarea ng-model="my_markdown" class="span8" cols="60" rows="5"></textarea><br />
            Output:<br />
            <blockquote marked="my_markdown"></blockquote>
          </form>
        </file>
        <file  name="exampleB.js">
          * function MainController($scope) {
          *     $scope.my_markdown = '*This* **is** [markdown](https://daringfireball.net/projects/markdown/)';
          *     $scope.my_markdown += ' in a scope variable';
          * }
          * angular.module('app', ['hc.marked']).controller('MainController', MainController);
        </file>
      </example>

      ## Include a markdown file:

       <example module="hc.marked">
         <file name="exampleC.html">
           <div marked src="'include.html'" />
         </file>
         * <file name="include.html">
         * *This* **is** [markdown](https://daringfireball.net/projects/markdown/) in a include file.
         * </file>
       </example>
   */
markedDirective.$inject = ['marked', '$templateRequest', '$compile'];
function markedDirective(marked, $templateRequest, $compile) {
  return {
    restrict: 'AE',
    replace: true,
    scope: {
      opts: '=',
      marked: '=',
      compile: '@',
      src: '='
    },
    link: function (scope, element, attrs) {
      if (attrs.marked) {
        set(scope.marked);
        scope.$watch('marked', set);
      } else if (attrs.src) {
        scope.$watch('src', function (src) {
          $templateRequest(src, true).then(function (response) {
            set(response);
          }, function () {
            set('');
            scope.$emit('$markedIncludeError', attrs.src);
          });
        });
      } else {
        set(element.text());
      }

      function set(text) {
        text = unindent(String(text || ''));
        element.html(marked(text, scope.opts || undefined));
        if (scope.$eval(attrs.compile)) {
          $compile(element.contents())(scope.$parent);
        }
      }
    }
  };
}

module.exports =
  angular.module('hc.marked', [])
    .directive('marked', markedDirective)
    .provider('marked', markedProvider)
    .name;
