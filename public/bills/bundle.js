"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/react/cjs/react.development.js
  var require_react_development = __commonJS({
    "node_modules/react/cjs/react.development.js"(exports, module) {
      "use strict";
      (function() {
        function defineDeprecationWarning(methodName, info) {
          Object.defineProperty(Component.prototype, methodName, {
            get: function() {
              console.warn(
                "%s(...) is deprecated in plain JavaScript React classes. %s",
                info[0],
                info[1]
              );
            }
          });
        }
        function getIteratorFn(maybeIterable) {
          if (null === maybeIterable || "object" !== typeof maybeIterable)
            return null;
          maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
          return "function" === typeof maybeIterable ? maybeIterable : null;
        }
        function warnNoop(publicInstance, callerName) {
          publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
          var warningKey = publicInstance + "." + callerName;
          didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
            "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
            callerName,
            publicInstance
          ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        function ComponentDummy() {
        }
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        function noop() {
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          try {
            testStringCoercion(value);
            var JSCompiler_inline_result = false;
          } catch (e) {
            JSCompiler_inline_result = true;
          }
          if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(
              JSCompiler_inline_result,
              "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
              JSCompiler_inline_result$jscomp$0
            );
            return testStringCoercion(value);
          }
        }
        function getComponentNameFromType(type) {
          if (null == type) return null;
          if ("function" === typeof type)
            return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
          if ("string" === typeof type) return type;
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
              return "Activity";
          }
          if ("object" === typeof type)
            switch ("number" === typeof type.tag && console.error(
              "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
            ), type.$$typeof) {
              case REACT_PORTAL_TYPE:
                return "Portal";
              case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
              case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
              case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
              case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                  return getComponentNameFromType(type(innerType));
                } catch (x) {
                }
            }
          return null;
        }
        function getTaskName(type) {
          if (type === REACT_FRAGMENT_TYPE) return "<>";
          if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
            return "<...>";
          try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
          } catch (x) {
            return "<...>";
          }
        }
        function getOwner() {
          var dispatcher = ReactSharedInternals.A;
          return null === dispatcher ? null : dispatcher.getOwner();
        }
        function UnknownOwner() {
          return Error("react-stack-top-frame");
        }
        function hasValidKey(config) {
          if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return false;
          }
          return void 0 !== config.key;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
              "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
              displayName
            ));
          }
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function elementRefGetterWithDeprecationWarning() {
          var componentName = getComponentNameFromType(this.type);
          didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
            "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
          ));
          componentName = this.props.ref;
          return void 0 !== componentName ? componentName : null;
        }
        function ReactElement(type, key, props, owner, debugStack, debugTask) {
          var refProp = props.ref;
          type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type,
            key,
            props,
            _owner: owner
          };
          null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: false,
            get: elementRefGetterWithDeprecationWarning
          }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
          type._store = {};
          Object.defineProperty(type._store, "validated", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: 0
          });
          Object.defineProperty(type, "_debugInfo", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: null
          });
          Object.defineProperty(type, "_debugStack", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: debugStack
          });
          Object.defineProperty(type, "_debugTask", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: debugTask
          });
          Object.freeze && (Object.freeze(type.props), Object.freeze(type));
          return type;
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          newKey = ReactElement(
            oldElement.type,
            newKey,
            oldElement.props,
            oldElement._owner,
            oldElement._debugStack,
            oldElement._debugTask
          );
          oldElement._store && (newKey._store.validated = oldElement._store.validated);
          return newKey;
        }
        function validateChildKeys(node) {
          isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
        }
        function isValidElement(object) {
          return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        function escape(key) {
          var escaperLookup = { "=": "=0", ":": "=2" };
          return "$" + key.replace(/[=:]/g, function(match) {
            return escaperLookup[match];
          });
        }
        function getElementKey(element, index) {
          return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
        }
        function resolveThenable(thenable) {
          switch (thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
            default:
              switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
                function(fulfilledValue) {
                  "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
                },
                function(error) {
                  "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
                }
              )), thenable.status) {
                case "fulfilled":
                  return thenable.value;
                case "rejected":
                  throw thenable.reason;
              }
          }
          throw thenable;
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if ("undefined" === type || "boolean" === type) children = null;
          var invokeCallback = false;
          if (null === children) invokeCallback = true;
          else
            switch (type) {
              case "bigint":
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                    break;
                  case REACT_LAZY_TYPE:
                    return invokeCallback = children._init, mapIntoArray(
                      invokeCallback(children._payload),
                      array,
                      escapedPrefix,
                      nameSoFar,
                      callback
                    );
                }
            }
          if (invokeCallback) {
            invokeCallback = children;
            callback = callback(invokeCallback);
            var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
            isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
              return c;
            })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
              callback,
              escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
                userProvidedKeyEscapeRegex,
                "$&/"
              ) + "/") + childKey
            ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
            return 1;
          }
          invokeCallback = 0;
          childKey = "" === nameSoFar ? "." : nameSoFar + ":";
          if (isArrayImpl(children))
            for (var i = 0; i < children.length; i++)
              nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
                nameSoFar,
                array,
                escapedPrefix,
                type,
                callback
              );
          else if (i = getIteratorFn(children), "function" === typeof i)
            for (i === children.entries && (didWarnAboutMaps || console.warn(
              "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
            ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
              nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
                nameSoFar,
                array,
                escapedPrefix,
                type,
                callback
              );
          else if ("object" === type) {
            if ("function" === typeof children.then)
              return mapIntoArray(
                resolveThenable(children),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              );
            array = String(children);
            throw Error(
              "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
            );
          }
          return invokeCallback;
        }
        function mapChildren(children, func, context) {
          if (null == children) return children;
          var result = [], count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function lazyInitializer(payload) {
          if (-1 === payload._status) {
            var ioInfo = payload._ioInfo;
            null != ioInfo && (ioInfo.start = ioInfo.end = performance.now());
            ioInfo = payload._result;
            var thenable = ioInfo();
            thenable.then(
              function(moduleObject) {
                if (0 === payload._status || -1 === payload._status) {
                  payload._status = 1;
                  payload._result = moduleObject;
                  var _ioInfo = payload._ioInfo;
                  null != _ioInfo && (_ioInfo.end = performance.now());
                  void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
                }
              },
              function(error) {
                if (0 === payload._status || -1 === payload._status) {
                  payload._status = 2;
                  payload._result = error;
                  var _ioInfo2 = payload._ioInfo;
                  null != _ioInfo2 && (_ioInfo2.end = performance.now());
                  void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
                }
              }
            );
            ioInfo = payload._ioInfo;
            if (null != ioInfo) {
              ioInfo.value = thenable;
              var displayName = thenable.displayName;
              "string" === typeof displayName && (ioInfo.name = displayName);
            }
            -1 === payload._status && (payload._status = 0, payload._result = thenable);
          }
          if (1 === payload._status)
            return ioInfo = payload._result, void 0 === ioInfo && console.error(
              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
              ioInfo
            ), "default" in ioInfo || console.error(
              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
              ioInfo
            ), ioInfo.default;
          throw payload._result;
        }
        function resolveDispatcher() {
          var dispatcher = ReactSharedInternals.H;
          null === dispatcher && console.error(
            "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
          );
          return dispatcher;
        }
        function releaseAsyncTransition() {
          ReactSharedInternals.asyncTransitions--;
        }
        function enqueueTask(task) {
          if (null === enqueueTaskImpl)
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              enqueueTaskImpl = (module && module[requireString]).call(
                module,
                "timers"
              ).setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                  "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
                ));
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          return enqueueTaskImpl(task);
        }
        function aggregateErrors(errors) {
          return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
        }
        function popActScope(prevActQueue, prevActScopeDepth) {
          prevActScopeDepth !== actScopeDepth - 1 && console.error(
            "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
          );
          actScopeDepth = prevActScopeDepth;
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          var queue = ReactSharedInternals.actQueue;
          if (null !== queue)
            if (0 !== queue.length)
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                });
                return;
              } catch (error) {
                ReactSharedInternals.thrownErrors.push(error);
              }
            else ReactSharedInternals.actQueue = null;
          0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
        }
        function flushActQueue(queue) {
          if (!isFlushing) {
            isFlushing = true;
            var i = 0;
            try {
              for (; i < queue.length; i++) {
                var callback = queue[i];
                do {
                  ReactSharedInternals.didUsePromise = false;
                  var continuation = callback(false);
                  if (null !== continuation) {
                    if (ReactSharedInternals.didUsePromise) {
                      queue[i] = callback;
                      queue.splice(0, i);
                      return;
                    }
                    callback = continuation;
                  } else break;
                } while (1);
              }
              queue.length = 0;
            } catch (error) {
              queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
            } finally {
              isFlushing = false;
            }
          }
        }
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
        var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
          isMounted: function() {
            return false;
          },
          enqueueForceUpdate: function(publicInstance) {
            warnNoop(publicInstance, "forceUpdate");
          },
          enqueueReplaceState: function(publicInstance) {
            warnNoop(publicInstance, "replaceState");
          },
          enqueueSetState: function(publicInstance) {
            warnNoop(publicInstance, "setState");
          }
        }, assign = Object.assign, emptyObject = {};
        Object.freeze(emptyObject);
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
            throw Error(
              "takes an object of state variables to update or a function which returns an object of state variables."
            );
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        var deprecatedAPIs = {
          isMounted: [
            "isMounted",
            "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
          ],
          replaceState: [
            "replaceState",
            "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
          ]
        };
        for (fnName in deprecatedAPIs)
          deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
        ComponentDummy.prototype = Component.prototype;
        deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
        deprecatedAPIs.constructor = PureComponent;
        assign(deprecatedAPIs, Component.prototype);
        deprecatedAPIs.isPureReactComponent = true;
        var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
          H: null,
          A: null,
          T: null,
          S: null,
          actQueue: null,
          asyncTransitions: 0,
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false,
          didUsePromise: false,
          thrownErrors: [],
          getCurrentStack: null,
          recentlyCreatedOwnerStacks: 0
        }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
          return null;
        };
        deprecatedAPIs = {
          react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
          }
        };
        var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
        var didWarnAboutElementRef = {};
        var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
          deprecatedAPIs,
          UnknownOwner
        )();
        var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
        var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
          if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
            var event = new window.ErrorEvent("error", {
              bubbles: true,
              cancelable: true,
              message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
              error
            });
            if (!window.dispatchEvent(event)) return;
          } else if ("object" === typeof process && "function" === typeof process.emit) {
            process.emit("uncaughtException", error);
            return;
          }
          console.error(error);
        }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
          queueMicrotask(function() {
            return queueMicrotask(callback);
          });
        } : enqueueTask;
        deprecatedAPIs = Object.freeze({
          __proto__: null,
          c: function(size) {
            return resolveDispatcher().useMemoCache(size);
          }
        });
        var fnName = {
          map: mapChildren,
          forEach: function(children, forEachFunc, forEachContext) {
            mapChildren(
              children,
              function() {
                forEachFunc.apply(this, arguments);
              },
              forEachContext
            );
          },
          count: function(children) {
            var n = 0;
            mapChildren(children, function() {
              n++;
            });
            return n;
          },
          toArray: function(children) {
            return mapChildren(children, function(child) {
              return child;
            }) || [];
          },
          only: function(children) {
            if (!isValidElement(children))
              throw Error(
                "React.Children.only expected to receive a single React element child."
              );
            return children;
          }
        };
        exports.Activity = REACT_ACTIVITY_TYPE;
        exports.Children = fnName;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
        exports.__COMPILER_RUNTIME = deprecatedAPIs;
        exports.act = function(callback) {
          var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
          actScopeDepth++;
          var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
          try {
            var result = callback();
          } catch (error) {
            ReactSharedInternals.thrownErrors.push(error);
          }
          if (0 < ReactSharedInternals.thrownErrors.length)
            throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
          if (null !== result && "object" === typeof result && "function" === typeof result.then) {
            var thenable = result;
            queueSeveralMicrotasks(function() {
              didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
                "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
              ));
            });
            return {
              then: function(resolve, reject) {
                didAwaitActCall = true;
                thenable.then(
                  function(returnValue) {
                    popActScope(prevActQueue, prevActScopeDepth);
                    if (0 === prevActScopeDepth) {
                      try {
                        flushActQueue(queue), enqueueTask(function() {
                          return recursivelyFlushAsyncActWork(
                            returnValue,
                            resolve,
                            reject
                          );
                        });
                      } catch (error$0) {
                        ReactSharedInternals.thrownErrors.push(error$0);
                      }
                      if (0 < ReactSharedInternals.thrownErrors.length) {
                        var _thrownError = aggregateErrors(
                          ReactSharedInternals.thrownErrors
                        );
                        ReactSharedInternals.thrownErrors.length = 0;
                        reject(_thrownError);
                      }
                    } else resolve(returnValue);
                  },
                  function(error) {
                    popActScope(prevActQueue, prevActScopeDepth);
                    0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                      ReactSharedInternals.thrownErrors
                    ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                  }
                );
              }
            };
          }
          var returnValue$jscomp$0 = result;
          popActScope(prevActQueue, prevActScopeDepth);
          0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
            ));
          }), ReactSharedInternals.actQueue = null);
          if (0 < ReactSharedInternals.thrownErrors.length)
            throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
                return recursivelyFlushAsyncActWork(
                  returnValue$jscomp$0,
                  resolve,
                  reject
                );
              })) : resolve(returnValue$jscomp$0);
            }
          };
        };
        exports.cache = function(fn) {
          return function() {
            return fn.apply(null, arguments);
          };
        };
        exports.cacheSignal = function() {
          return null;
        };
        exports.captureOwnerStack = function() {
          var getCurrentStack = ReactSharedInternals.getCurrentStack;
          return null === getCurrentStack ? null : getCurrentStack();
        };
        exports.cloneElement = function(element, config, children) {
          if (null === element || void 0 === element)
            throw Error(
              "The argument must be a React element, but you passed " + element + "."
            );
          var props = assign({}, element.props), key = element.key, owner = element._owner;
          if (null != config) {
            var JSCompiler_inline_result;
            a: {
              if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
                config,
                "ref"
              ).get) && JSCompiler_inline_result.isReactWarning) {
                JSCompiler_inline_result = false;
                break a;
              }
              JSCompiler_inline_result = void 0 !== config.ref;
            }
            JSCompiler_inline_result && (owner = getOwner());
            hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
            for (propName in config)
              !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
          }
          var propName = arguments.length - 2;
          if (1 === propName) props.children = children;
          else if (1 < propName) {
            JSCompiler_inline_result = Array(propName);
            for (var i = 0; i < propName; i++)
              JSCompiler_inline_result[i] = arguments[i + 2];
            props.children = JSCompiler_inline_result;
          }
          props = ReactElement(
            element.type,
            key,
            props,
            owner,
            element._debugStack,
            element._debugTask
          );
          for (key = 2; key < arguments.length; key++)
            validateChildKeys(arguments[key]);
          return props;
        };
        exports.createContext = function(defaultValue) {
          defaultValue = {
            $$typeof: REACT_CONTEXT_TYPE,
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            _threadCount: 0,
            Provider: null,
            Consumer: null
          };
          defaultValue.Provider = defaultValue;
          defaultValue.Consumer = {
            $$typeof: REACT_CONSUMER_TYPE,
            _context: defaultValue
          };
          defaultValue._currentRenderer = null;
          defaultValue._currentRenderer2 = null;
          return defaultValue;
        };
        exports.createElement = function(type, config, children) {
          for (var i = 2; i < arguments.length; i++)
            validateChildKeys(arguments[i]);
          i = {};
          var key = null;
          if (null != config)
            for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
              "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
            )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
              hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
          var childrenLength = arguments.length - 2;
          if (1 === childrenLength) i.children = children;
          else if (1 < childrenLength) {
            for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
              childArray[_i] = arguments[_i + 2];
            Object.freeze && Object.freeze(childArray);
            i.children = childArray;
          }
          if (type && type.defaultProps)
            for (propName in childrenLength = type.defaultProps, childrenLength)
              void 0 === i[propName] && (i[propName] = childrenLength[propName]);
          key && defineKeyPropWarningGetter(
            i,
            "function" === typeof type ? type.displayName || type.name || "Unknown" : type
          );
          var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
          return ReactElement(
            type,
            key,
            i,
            getOwner(),
            propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
            propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
          );
        };
        exports.createRef = function() {
          var refObject = { current: null };
          Object.seal(refObject);
          return refObject;
        };
        exports.forwardRef = function(render) {
          null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
            "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
          ) : "function" !== typeof render ? console.error(
            "forwardRef requires a render function but was given %s.",
            null === render ? "null" : typeof render
          ) : 0 !== render.length && 2 !== render.length && console.error(
            "forwardRef render functions accept exactly two parameters: props and ref. %s",
            1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
          );
          null != render && null != render.defaultProps && console.error(
            "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
          );
          var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
          Object.defineProperty(elementType, "displayName", {
            enumerable: false,
            configurable: true,
            get: function() {
              return ownName;
            },
            set: function(name) {
              ownName = name;
              render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
            }
          });
          return elementType;
        };
        exports.isValidElement = isValidElement;
        exports.lazy = function(ctor) {
          ctor = { _status: -1, _result: ctor };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: ctor,
            _init: lazyInitializer
          }, ioInfo = {
            name: "lazy",
            start: -1,
            end: -1,
            value: null,
            owner: null,
            debugStack: Error("react-stack-top-frame"),
            debugTask: console.createTask ? console.createTask("lazy()") : null
          };
          ctor._ioInfo = ioInfo;
          lazyType._debugInfo = [{ awaited: ioInfo }];
          return lazyType;
        };
        exports.memo = function(type, compare) {
          null == type && console.error(
            "memo: The first argument must be a component. Instead received: %s",
            null === type ? "null" : typeof type
          );
          compare = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: void 0 === compare ? null : compare
          };
          var ownName;
          Object.defineProperty(compare, "displayName", {
            enumerable: false,
            configurable: true,
            get: function() {
              return ownName;
            },
            set: function(name) {
              ownName = name;
              type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
            }
          });
          return compare;
        };
        exports.startTransition = function(scope) {
          var prevTransition = ReactSharedInternals.T, currentTransition = {};
          currentTransition._updatedFibers = /* @__PURE__ */ new Set();
          ReactSharedInternals.T = currentTransition;
          try {
            var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
            null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
            "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
          } catch (error) {
            reportGlobalError(error);
          } finally {
            null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
              "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
            )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
              "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
            ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
          }
        };
        exports.unstable_useCacheRefresh = function() {
          return resolveDispatcher().useCacheRefresh();
        };
        exports.use = function(usable) {
          return resolveDispatcher().use(usable);
        };
        exports.useActionState = function(action, initialState, permalink) {
          return resolveDispatcher().useActionState(
            action,
            initialState,
            permalink
          );
        };
        exports.useCallback = function(callback, deps) {
          return resolveDispatcher().useCallback(callback, deps);
        };
        exports.useContext = function(Context) {
          var dispatcher = resolveDispatcher();
          Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
            "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
          );
          return dispatcher.useContext(Context);
        };
        exports.useDebugValue = function(value, formatterFn) {
          return resolveDispatcher().useDebugValue(value, formatterFn);
        };
        exports.useDeferredValue = function(value, initialValue) {
          return resolveDispatcher().useDeferredValue(value, initialValue);
        };
        exports.useEffect = function(create, deps) {
          null == create && console.warn(
            "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
          );
          return resolveDispatcher().useEffect(create, deps);
        };
        exports.useEffectEvent = function(callback) {
          return resolveDispatcher().useEffectEvent(callback);
        };
        exports.useId = function() {
          return resolveDispatcher().useId();
        };
        exports.useImperativeHandle = function(ref, create, deps) {
          return resolveDispatcher().useImperativeHandle(ref, create, deps);
        };
        exports.useInsertionEffect = function(create, deps) {
          null == create && console.warn(
            "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
          );
          return resolveDispatcher().useInsertionEffect(create, deps);
        };
        exports.useLayoutEffect = function(create, deps) {
          null == create && console.warn(
            "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
          );
          return resolveDispatcher().useLayoutEffect(create, deps);
        };
        exports.useMemo = function(create, deps) {
          return resolveDispatcher().useMemo(create, deps);
        };
        exports.useOptimistic = function(passthrough, reducer) {
          return resolveDispatcher().useOptimistic(passthrough, reducer);
        };
        exports.useReducer = function(reducer, initialArg, init) {
          return resolveDispatcher().useReducer(reducer, initialArg, init);
        };
        exports.useRef = function(initialValue) {
          return resolveDispatcher().useRef(initialValue);
        };
        exports.useState = function(initialState) {
          return resolveDispatcher().useState(initialState);
        };
        exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
          return resolveDispatcher().useSyncExternalStore(
            subscribe,
            getSnapshot,
            getServerSnapshot
          );
        };
        exports.useTransition = function() {
          return resolveDispatcher().useTransition();
        };
        exports.version = "19.2.0";
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
      })();
    }
  });

  // node_modules/react/index.js
  var require_react = __commonJS({
    "node_modules/react/index.js"(exports, module) {
      "use strict";
      if (false) {
        module.exports = null;
      } else {
        module.exports = require_react_development();
      }
    }
  });

  // projects/bills/frontend/App.tsx
  var import_react6 = __toESM(require_react());

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  var import_react2 = __toESM(require_react());

  // node_modules/lucide-react/dist/esm/shared/src/utils.js
  var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  var toCamelCase = (string) => string.replace(
    /^([A-Z])|[\s-_]+(\w)/g,
    (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase()
  );
  var toPascalCase = (string) => {
    const camelCase = toCamelCase(string);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  };
  var mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
  }).join(" ").trim();
  var hasA11yProp = (props) => {
    for (const prop in props) {
      if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
        return true;
      }
    }
  };

  // node_modules/lucide-react/dist/esm/Icon.js
  var import_react = __toESM(require_react());

  // node_modules/lucide-react/dist/esm/defaultAttributes.js
  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  // node_modules/lucide-react/dist/esm/Icon.js
  var Icon = (0, import_react.forwardRef)(
    ({
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      className = "",
      children,
      iconNode,
      ...rest
    }, ref) => (0, import_react.createElement)(
      "svg",
      {
        ref,
        ...defaultAttributes,
        width: size,
        height: size,
        stroke: color,
        strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
        className: mergeClasses("lucide", className),
        ...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
        ...rest
      },
      [
        ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
        ...Array.isArray(children) ? children : [children]
      ]
    )
  );

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  var createLucideIcon = (iconName, iconNode) => {
    const Component = (0, import_react2.forwardRef)(
      ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
        ref,
        iconNode,
        className: mergeClasses(
          `lucide-${toKebabCase(toPascalCase(iconName))}`,
          `lucide-${iconName}`,
          className
        ),
        ...props
      })
    );
    Component.displayName = toPascalCase(iconName);
    return Component;
  };

  // node_modules/lucide-react/dist/esm/icons/calendar.js
  var __iconNode = [
    ["path", { d: "M8 2v4", key: "1cmpym" }],
    ["path", { d: "M16 2v4", key: "4m81vk" }],
    ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
    ["path", { d: "M3 10h18", key: "8toen8" }]
  ];
  var Calendar = createLucideIcon("calendar", __iconNode);

  // node_modules/lucide-react/dist/esm/icons/check.js
  var __iconNode2 = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]];
  var Check = createLucideIcon("check", __iconNode2);

  // node_modules/lucide-react/dist/esm/icons/chevron-down.js
  var __iconNode3 = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]];
  var ChevronDown = createLucideIcon("chevron-down", __iconNode3);

  // node_modules/lucide-react/dist/esm/icons/chevron-right.js
  var __iconNode4 = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]];
  var ChevronRight = createLucideIcon("chevron-right", __iconNode4);

  // node_modules/lucide-react/dist/esm/icons/dollar-sign.js
  var __iconNode5 = [
    ["line", { x1: "12", x2: "12", y1: "2", y2: "22", key: "7eqyqh" }],
    ["path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", key: "1b0p4s" }]
  ];
  var DollarSign = createLucideIcon("dollar-sign", __iconNode5);

  // node_modules/lucide-react/dist/esm/icons/download.js
  var __iconNode6 = [
    ["path", { d: "M12 15V3", key: "m9g1x1" }],
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
    ["path", { d: "m7 10 5 5 5-5", key: "brsn70" }]
  ];
  var Download = createLucideIcon("download", __iconNode6);

  // node_modules/lucide-react/dist/esm/icons/funnel.js
  var __iconNode7 = [
    [
      "path",
      {
        d: "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",
        key: "sc7q7i"
      }
    ]
  ];
  var Funnel = createLucideIcon("funnel", __iconNode7);

  // node_modules/lucide-react/dist/esm/icons/grip-vertical.js
  var __iconNode8 = [
    ["circle", { cx: "9", cy: "12", r: "1", key: "1vctgf" }],
    ["circle", { cx: "9", cy: "5", r: "1", key: "hp0tcf" }],
    ["circle", { cx: "9", cy: "19", r: "1", key: "fkjjf6" }],
    ["circle", { cx: "15", cy: "12", r: "1", key: "1tmaij" }],
    ["circle", { cx: "15", cy: "5", r: "1", key: "19l28e" }],
    ["circle", { cx: "15", cy: "19", r: "1", key: "f4zoj3" }]
  ];
  var GripVertical = createLucideIcon("grip-vertical", __iconNode8);

  // node_modules/lucide-react/dist/esm/icons/list.js
  var __iconNode9 = [
    ["path", { d: "M3 5h.01", key: "18ugdj" }],
    ["path", { d: "M3 12h.01", key: "nlz23k" }],
    ["path", { d: "M3 19h.01", key: "noohij" }],
    ["path", { d: "M8 5h13", key: "1pao27" }],
    ["path", { d: "M8 12h13", key: "1za7za" }],
    ["path", { d: "M8 19h13", key: "m83p4d" }]
  ];
  var List = createLucideIcon("list", __iconNode9);

  // node_modules/lucide-react/dist/esm/icons/pen.js
  var __iconNode10 = [
    [
      "path",
      {
        d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
        key: "1a8usu"
      }
    ]
  ];
  var Pen = createLucideIcon("pen", __iconNode10);

  // node_modules/lucide-react/dist/esm/icons/plus.js
  var __iconNode11 = [
    ["path", { d: "M5 12h14", key: "1ays0h" }],
    ["path", { d: "M12 5v14", key: "s699le" }]
  ];
  var Plus = createLucideIcon("plus", __iconNode11);

  // node_modules/lucide-react/dist/esm/icons/refresh-cw.js
  var __iconNode12 = [
    ["path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", key: "v9h5vc" }],
    ["path", { d: "M21 3v5h-5", key: "1q7to0" }],
    ["path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", key: "3uifl3" }],
    ["path", { d: "M8 16H3v5", key: "1cv678" }]
  ];
  var RefreshCw = createLucideIcon("refresh-cw", __iconNode12);

  // node_modules/lucide-react/dist/esm/icons/trash-2.js
  var __iconNode13 = [
    ["path", { d: "M10 11v6", key: "nco0om" }],
    ["path", { d: "M14 11v6", key: "outv1u" }],
    ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6", key: "miytrc" }],
    ["path", { d: "M3 6h18", key: "d0wm0j" }],
    ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "e791ji" }]
  ];
  var Trash2 = createLucideIcon("trash-2", __iconNode13);

  // node_modules/lucide-react/dist/esm/icons/upload.js
  var __iconNode14 = [
    ["path", { d: "M12 3v12", key: "1x0j5s" }],
    ["path", { d: "m17 8-5-5-5 5", key: "7q97r8" }],
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }]
  ];
  var Upload = createLucideIcon("upload", __iconNode14);

  // node_modules/lucide-react/dist/esm/icons/x.js
  var __iconNode15 = [
    ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
    ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
  ];
  var X = createLucideIcon("x", __iconNode15);

  // projects/bills/frontend/components/QuickTemplates.tsx
  var import_react3 = __toESM(require_react());
  function QuickTemplates({ templates, templateDates, setTemplateDates, addFromTemplate, calculateNextPaymentDate, getCategoryColor }) {
    return /* @__PURE__ */ import_react3.default.createElement("div", { className: "bg-white rounded-lg shadow-lg p-6 mb-6" }, /* @__PURE__ */ import_react3.default.createElement("h2", { className: "text-xl font-bold text-gray-800 mb-4" }, "Quick Add from Templates"), templates.length === 0 ? /* @__PURE__ */ import_react3.default.createElement("p", { className: "text-gray-500 text-center py-4" }, "No templates saved. Click the refresh icon on any bill to save it as a template.") : /* @__PURE__ */ import_react3.default.createElement("div", { className: "space-y-2" }, templates.map((template) => {
      const defaultDate = calculateNextPaymentDate(template.id, Number(template.frequencyNumber || 1), template.frequencyPeriod || "months");
      const templateDate = templateDates[template.id] || defaultDate;
      return /* @__PURE__ */ import_react3.default.createElement("div", { key: template.id, className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ import_react3.default.createElement("div", { className: "font-medium text-gray-800" }, template.name), /* @__PURE__ */ import_react3.default.createElement("div", { className: `flex items-center gap-1 font-semibold ${template.amount >= 0 ? "text-green-600" : "text-red-600"}` }, /* @__PURE__ */ import_react3.default.createElement(DollarSign, { size: 16 }), template.amount >= 0 ? "+" : "", template.amount.toFixed(2)), /* @__PURE__ */ import_react3.default.createElement("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}` }, template.category)), /* @__PURE__ */ import_react3.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react3.default.createElement("input", { type: "date", value: templateDate, onChange: (e) => setTemplateDates({ ...templateDates, [template.id]: e.target.value }), className: "px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" }), /* @__PURE__ */ import_react3.default.createElement("button", { onClick: () => addFromTemplate(template), className: "px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm" }, "Add to Bills")));
    })));
  }

  // projects/bills/frontend/components/BillItem.tsx
  var import_react4 = __toESM(require_react());
  function BillItem({ bill, index, isEditing, balance, editForm, setEditForm, saveEdit, cancelEdit, startEdit, deleteBill, saveAsTemplate, viewRecurringBill, getCategoryColor, isRecurringBill, handleDragStart, handleDragOver, handleDragEnd, draggedItem, sortBy }) {
    return /* @__PURE__ */ import_react4.default.createElement(
      "div",
      {
        key: bill.id,
        draggable: !isEditing && sortBy === "order",
        onDragStart: (e) => handleDragStart(e, index),
        onDragOver: (e) => handleDragOver(e, index),
        onDragEnd: handleDragEnd,
        className: `bg-white rounded-lg shadow p-4 transition ${isEditing ? "" : sortBy === "order" ? "cursor-move hover:shadow-md" : "hover:shadow-md"} ${draggedItem === index ? "opacity-50" : ""}`
      },
      /* @__PURE__ */ import_react4.default.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ import_react4.default.createElement(
        GripVertical,
        {
          className: `flex-shrink-0 ${sortBy === "order" && !isEditing ? "text-gray-400" : "text-gray-300"}`,
          size: 24
        }
      ), isEditing ? /* @__PURE__ */ import_react4.default.createElement("div", { className: "flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 items-center" }, /* @__PURE__ */ import_react4.default.createElement(
        "input",
        {
          type: "text",
          value: editForm.name,
          onChange: (e) => setEditForm({ ...editForm, name: e.target.value }),
          className: "px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }
      ), /* @__PURE__ */ import_react4.default.createElement(
        "input",
        {
          type: "number",
          step: "0.01",
          value: editForm.amount,
          onChange: (e) => setEditForm({ ...editForm, amount: e.target.value }),
          className: "px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }
      ), /* @__PURE__ */ import_react4.default.createElement(
        "input",
        {
          type: "date",
          value: editForm.date,
          onChange: (e) => setEditForm({ ...editForm, date: e.target.value }),
          className: "px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }
      ), /* @__PURE__ */ import_react4.default.createElement(
        "select",
        {
          value: editForm.category,
          onChange: (e) => setEditForm({ ...editForm, category: e.target.value }),
          className: "px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        },
        /* @__PURE__ */ import_react4.default.createElement("option", { value: editForm.category }, editForm.category)
      ), /* @__PURE__ */ import_react4.default.createElement("div", { className: "flex items-center gap-2 justify-end" }, /* @__PURE__ */ import_react4.default.createElement(
        "button",
        {
          onClick: saveEdit,
          className: "text-green-600 hover:text-green-700 transition p-2 bg-green-50 rounded"
        },
        /* @__PURE__ */ import_react4.default.createElement(Check, { size: 20 })
      ), /* @__PURE__ */ import_react4.default.createElement(
        "button",
        {
          onClick: cancelEdit,
          className: "text-gray-600 hover:text-gray-700 transition p-2 bg-gray-50 rounded"
        },
        /* @__PURE__ */ import_react4.default.createElement(X, { size: 20 })
      )), /* @__PURE__ */ import_react4.default.createElement("div", { className: "col-span-full" }, /* @__PURE__ */ import_react4.default.createElement(
        "input",
        {
          type: "text",
          placeholder: "Notes (optional)",
          value: editForm.notes,
          onChange: (e) => setEditForm({ ...editForm, notes: e.target.value }),
          className: "w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        }
      ))) : /* @__PURE__ */ import_react4.default.createElement("div", { className: "flex-1" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-3 items-center" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: "font-medium text-gray-800" }, bill.name), /* @__PURE__ */ import_react4.default.createElement("div", { className: `flex items-center gap-1 font-semibold ${bill.amount >= 0 ? "text-green-600" : "text-red-600"}` }, /* @__PURE__ */ import_react4.default.createElement(DollarSign, { size: 18 }), bill.amount >= 0 ? "+" : "", bill.amount.toFixed(2)), /* @__PURE__ */ import_react4.default.createElement("div", { className: "text-gray-600" }, new Date(bill.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })), /* @__PURE__ */ import_react4.default.createElement("span", { className: `px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(bill.category)} w-fit` }, bill.category), /* @__PURE__ */ import_react4.default.createElement("div", { className: "flex items-center justify-between md:justify-end gap-2" }, /* @__PURE__ */ import_react4.default.createElement("div", { className: `font-medium text-sm ${balance >= 0 ? "text-green-700" : "text-red-700"}` }, "Balance: $", balance.toFixed(2)), /* @__PURE__ */ import_react4.default.createElement("div", { className: "flex items-center gap-1" }, isRecurringBill(bill.billId) ? /* @__PURE__ */ import_react4.default.createElement(
        "button",
        {
          onClick: () => viewRecurringBill(bill.billId),
          className: "text-purple-500 hover:text-purple-700 transition p-1",
          title: "View recurring bill"
        },
        /* @__PURE__ */ import_react4.default.createElement(List, { size: 18 })
      ) : /* @__PURE__ */ import_react4.default.createElement(
        "button",
        {
          onClick: () => saveAsTemplate(bill),
          className: "text-purple-500 hover:text-purple-700 transition p-1",
          title: "Save as template"
        },
        /* @__PURE__ */ import_react4.default.createElement(RefreshCw, { size: 18 })
      ), /* @__PURE__ */ import_react4.default.createElement(
        "button",
        {
          onClick: () => startEdit(bill),
          className: "text-blue-500 hover:text-blue-700 transition p-1"
        },
        /* @__PURE__ */ import_react4.default.createElement(Pen, { size: 18 })
      ), /* @__PURE__ */ import_react4.default.createElement(
        "button",
        {
          onClick: () => deleteBill(bill.id),
          className: "text-red-500 hover:text-red-700 transition p-1"
        },
        /* @__PURE__ */ import_react4.default.createElement(Trash2, { size: 18 })
      )))), bill.notes && /* @__PURE__ */ import_react4.default.createElement("div", { className: "mt-2 text-sm text-gray-600 italic" }, bill.notes)))
    );
  }

  // projects/bills/frontend/components/TemplatesPanel.tsx
  var import_react5 = __toESM(require_react());
  function TemplatesPanel({ templates, expandedTemplates, editingTemplateId, templateEditForm, setTemplateEditForm, startTemplateEdit, cancelTemplateEdit, saveTemplateEdit, deleteTemplate, getTemplatePayments, calculateNextPaymentDate, setTemplateDates, templateDates, addFromTemplate, addNewTemplate, exportTemplatesToCSV, importTemplatesFromCSV, newTemplate, setNewTemplate, TIME_PERIODS: TIME_PERIODS2, CATEGORIES: CATEGORIES2, getCategoryColor, setCurrentPage, startEdit, deleteBill }) {
    return /* @__PURE__ */ import_react5.default.createElement(import_react5.default.Fragment, null, /* @__PURE__ */ import_react5.default.createElement("div", { className: "bg-white rounded-lg shadow-lg p-6 mb-6" }, /* @__PURE__ */ import_react5.default.createElement("h1", { className: "text-3xl font-bold text-gray-800 mb-2" }, "Recurring Bills"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ import_react5.default.createElement("p", { className: "text-gray-600" }, "Manage your recurring bill templates and view payment history"), /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react5.default.createElement(
      "button",
      {
        onClick: exportTemplatesToCSV,
        className: "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-2 text-sm"
      },
      /* @__PURE__ */ import_react5.default.createElement(Download, { size: 16 }),
      "Export"
    ), /* @__PURE__ */ import_react5.default.createElement("label", { className: "px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition flex items-center gap-2 text-sm cursor-pointer" }, /* @__PURE__ */ import_react5.default.createElement(Upload, { size: 16 }), "Import", /* @__PURE__ */ import_react5.default.createElement(
      "input",
      {
        type: "file",
        accept: ".csv",
        onChange: importTemplatesFromCSV,
        className: "hidden"
      }
    )))), /* @__PURE__ */ import_react5.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-7 gap-3 mb-3" }, /* @__PURE__ */ import_react5.default.createElement(
      "input",
      {
        type: "text",
        placeholder: "Bill name",
        value: newTemplate.name,
        onChange: (e) => setNewTemplate({ ...newTemplate, name: e.target.value }),
        className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      }
    ), /* @__PURE__ */ import_react5.default.createElement(
      "input",
      {
        type: "number",
        placeholder: "Amount",
        step: "0.01",
        value: newTemplate.amount,
        onChange: (e) => setNewTemplate({ ...newTemplate, amount: e.target.value }),
        className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      }
    ), /* @__PURE__ */ import_react5.default.createElement(
      "select",
      {
        value: newTemplate.category,
        onChange: (e) => setNewTemplate({ ...newTemplate, category: e.target.value }),
        className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      },
      CATEGORIES2.map((cat) => /* @__PURE__ */ import_react5.default.createElement("option", { key: cat, value: cat }, cat))
    ), /* @__PURE__ */ import_react5.default.createElement("div", { className: "col-span-2 flex gap-2" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center gap-2 flex-1" }, /* @__PURE__ */ import_react5.default.createElement("span", { className: "text-sm text-gray-600 whitespace-nowrap" }, "Every"), /* @__PURE__ */ import_react5.default.createElement(
      "input",
      {
        type: "number",
        min: "1",
        value: newTemplate.frequencyNumber,
        onChange: (e) => setNewTemplate({ ...newTemplate, frequencyNumber: e.target.value }),
        className: "w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      }
    ), /* @__PURE__ */ import_react5.default.createElement(
      "select",
      {
        value: newTemplate.frequencyPeriod,
        onChange: (e) => setNewTemplate({ ...newTemplate, frequencyPeriod: e.target.value }),
        className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      },
      TIME_PERIODS2.map((period) => /* @__PURE__ */ import_react5.default.createElement("option", { key: period, value: period }, period))
    ))), /* @__PURE__ */ import_react5.default.createElement(
      "button",
      {
        onClick: addNewTemplate,
        className: "col-span-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ import_react5.default.createElement(Plus, { size: 20 }),
      "Add"
    )), /* @__PURE__ */ import_react5.default.createElement(
      "input",
      {
        type: "text",
        placeholder: "Notes (optional)",
        value: newTemplate.notes,
        onChange: (e) => setNewTemplate({ ...newTemplate, notes: e.target.value }),
        className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      }
    )), templates.length === 0 ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "bg-white rounded-lg shadow p-8 text-center text-gray-500" }, /* @__PURE__ */ import_react5.default.createElement(RefreshCw, { size: 48, className: "mx-auto mb-4 text-gray-400" }), /* @__PURE__ */ import_react5.default.createElement("p", { className: "text-lg mb-2" }, "No recurring bills yet"), /* @__PURE__ */ import_react5.default.createElement("p", null, "Go to the Payment Planner and click the refresh icon on any bill to save it as a recurring template.")) : /* @__PURE__ */ import_react5.default.createElement("div", { className: "space-y-3" }, templates.map((template) => {
      const isExpanded = expandedTemplates[template.id];
      const isEditing = editingTemplateId === template.id;
      const payments = getTemplatePayments(template.id);
      return /* @__PURE__ */ import_react5.default.createElement("div", { key: template.id, className: "bg-white rounded-lg shadow" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "p-4" }, isEditing ? /* @__PURE__ */ import_react5.default.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ import_react5.default.createElement(
        "input",
        {
          type: "text",
          value: templateEditForm.name,
          onChange: (e) => setTemplateEditForm({ ...templateEditForm, name: e.target.value }),
          className: "flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }
      ), /* @__PURE__ */ import_react5.default.createElement(
        "input",
        {
          type: "number",
          step: "0.01",
          value: templateEditForm.amount,
          onChange: (e) => setTemplateEditForm({ ...templateEditForm, amount: e.target.value }),
          className: "w-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }
      ), /* @__PURE__ */ import_react5.default.createElement(
        "select",
        {
          value: templateEditForm.category,
          onChange: (e) => setTemplateEditForm({ ...templateEditForm, category: e.target.value }),
          className: "w-40 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        },
        CATEGORIES2.map((cat) => /* @__PURE__ */ import_react5.default.createElement("option", { key: cat, value: cat }, cat))
      ), /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react5.default.createElement("span", { className: "text-sm text-gray-600" }, "Every"), /* @__PURE__ */ import_react5.default.createElement(
        "input",
        {
          type: "number",
          min: "1",
          value: templateEditForm.frequencyNumber,
          onChange: (e) => setTemplateEditForm({ ...templateEditForm, frequencyNumber: e.target.value }),
          className: "w-16 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }
      ), /* @__PURE__ */ import_react5.default.createElement(
        "select",
        {
          value: templateEditForm.frequencyPeriod,
          onChange: (e) => setTemplateEditForm({ ...templateEditForm, frequencyPeriod: e.target.value }),
          className: "w-28 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        },
        TIME_PERIODS2.map((period) => /* @__PURE__ */ import_react5.default.createElement("option", { key: period, value: period }, period))
      )), /* @__PURE__ */ import_react5.default.createElement(
        "button",
        {
          onClick: saveTemplateEdit,
          className: "text-green-600 hover:text-green-700 transition p-2 bg-green-50 rounded"
        },
        /* @__PURE__ */ import_react5.default.createElement(Check, { size: 20 })
      ), /* @__PURE__ */ import_react5.default.createElement(
        "button",
        {
          onClick: cancelTemplateEdit,
          className: "text-gray-600 hover:text-gray-700 transition p-2 bg-gray-50 rounded"
        },
        /* @__PURE__ */ import_react5.default.createElement(X, { size: 20 })
      )), /* @__PURE__ */ import_react5.default.createElement(
        "input",
        {
          type: "text",
          placeholder: "Notes (optional)",
          value: templateEditForm.notes,
          onChange: (e) => setTemplateEditForm({ ...templateEditForm, notes: e.target.value }),
          className: "w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        }
      )) : /* @__PURE__ */ import_react5.default.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ import_react5.default.createElement(
        "button",
        {
          onClick: () => setCurrentPage("templates"),
          className: "text-gray-500 hover:text-gray-700 transition"
        },
        isExpanded ? /* @__PURE__ */ import_react5.default.createElement(ChevronDown, { size: 24 }) : /* @__PURE__ */ import_react5.default.createElement(ChevronRight, { size: 24 })
      ), /* @__PURE__ */ import_react5.default.createElement("div", { className: "font-bold text-lg text-gray-800" }, template.name), /* @__PURE__ */ import_react5.default.createElement("div", { className: `flex items-center gap-1 font-bold text-lg ${template.amount >= 0 ? "text-green-600" : "text-red-600"}` }, /* @__PURE__ */ import_react5.default.createElement(DollarSign, { size: 20 }), template.amount >= 0 ? "+" : "", template.amount.toFixed(2)), /* @__PURE__ */ import_react5.default.createElement("span", { className: `px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(template.category)}` }, template.category), /* @__PURE__ */ import_react5.default.createElement("span", { className: "text-sm text-gray-600" }, "Every ", template.frequencyNumber, " ", template.frequencyPeriod), payments.length > 0 && /* @__PURE__ */ import_react5.default.createElement("span", { className: "px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium" }, payments.length, " payment", payments.length !== 1 ? "s" : "")), /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ import_react5.default.createElement(
        "button",
        {
          onClick: () => startTemplateEdit(template),
          className: "text-blue-500 hover:text-blue-700 transition p-2",
          title: "Edit template"
        },
        /* @__PURE__ */ import_react5.default.createElement(Pen, { size: 20 })
      ), /* @__PURE__ */ import_react5.default.createElement(
        "button",
        {
          onClick: () => deleteTemplate(template.id),
          className: "text-red-500 hover:text-red-700 transition p-2",
          title: "Delete template"
        },
        /* @__PURE__ */ import_react5.default.createElement(Trash2, { size: 20 })
      ))), template.notes && /* @__PURE__ */ import_react5.default.createElement("div", { className: "ml-10 text-sm text-gray-600 italic" }, template.notes))), isExpanded && payments.length > 0 && /* @__PURE__ */ import_react5.default.createElement("div", { className: "border-t border-gray-200 p-4 bg-gray-50" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ import_react5.default.createElement("h3", { className: "text-sm font-semibold text-gray-700" }, "Payment History"), /* @__PURE__ */ import_react5.default.createElement(
        "button",
        {
          onClick: () => {
            const defaultDate = calculateNextPaymentDate(
              template.id,
              Number(template.frequencyNumber || 1),
              template.frequencyPeriod || "months"
            );
            setTemplateDates({ ...templateDates, [template.id]: defaultDate });
            addFromTemplate(template);
          },
          className: "px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center gap-2"
        },
        /* @__PURE__ */ import_react5.default.createElement(Plus, { size: 16 }),
        "Add Payment"
      )), /* @__PURE__ */ import_react5.default.createElement("div", { className: "space-y-2" }, payments.map((payment) => /* @__PURE__ */ import_react5.default.createElement("div", { key: payment.id, className: "flex items-center justify-between p-3 bg-white rounded border border-gray-200" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "text-gray-700" }, new Date(payment.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })), /* @__PURE__ */ import_react5.default.createElement("div", { className: `flex items-center gap-1 font-semibold ${payment.amount >= 0 ? "text-green-600" : "text-red-600"}` }, /* @__PURE__ */ import_react5.default.createElement(DollarSign, { size: 16 }), payment.amount >= 0 ? "+" : "", payment.amount.toFixed(2))), /* @__PURE__ */ import_react5.default.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ import_react5.default.createElement(
        "button",
        {
          onClick: () => {
            setCurrentPage("planner");
            startEdit(payment);
          },
          className: "text-blue-500 hover:text-blue-700 transition p-1",
          title: "Edit payment"
        },
        /* @__PURE__ */ import_react5.default.createElement(Pen, { size: 16 })
      ), /* @__PURE__ */ import_react5.default.createElement(
        "button",
        {
          onClick: () => deleteBill(payment.id),
          className: "text-red-500 hover:text-red-700 transition p-1",
          title: "Delete payment"
        },
        /* @__PURE__ */ import_react5.default.createElement(Trash2, { size: 16 })
      )))))), isExpanded && payments.length === 0 && /* @__PURE__ */ import_react5.default.createElement("div", { className: "border-t border-gray-200 p-4 bg-gray-50" }, /* @__PURE__ */ import_react5.default.createElement("div", { className: "text-center" }, /* @__PURE__ */ import_react5.default.createElement("p", { className: "text-gray-500 text-sm mb-3" }, "No payments yet for this recurring bill"), /* @__PURE__ */ import_react5.default.createElement(
        "button",
        {
          onClick: () => {
            const defaultDate = calculateNextPaymentDate(
              template.id,
              Number(template.frequencyNumber || 1),
              template.frequencyPeriod || "months"
            );
            setTemplateDates({ ...templateDates, [template.id]: defaultDate });
            addFromTemplate(template);
          },
          className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center gap-2 mx-auto"
        },
        /* @__PURE__ */ import_react5.default.createElement(Plus, { size: 16 }),
        "Add First Payment"
      ))));
    })));
  }

  // projects/bills/frontend/utils.ts
  var STORAGE_KEY = "bill-payment-planner-bills";
  var TEMPLATES_KEY = "bill-payment-planner-templates";
  var CATEGORIES = ["Income", "Housing", "Utilities", "Subscriptions", "Insurance", "Transportation", "Food", "Entertainment", "Healthcare", "Other"];
  var TIME_PERIODS = ["days", "weeks", "months", "years"];
  var getInitialBills = () => {
    try {
      const savedBills = localStorage.getItem(STORAGE_KEY);
      if (savedBills) {
        return JSON.parse(savedBills);
      }
    } catch (error) {
      console.error("Error loading bills:", error);
    }
    return [
      { id: 1, name: "Rent", amount: -1500, date: "2025-11-01", category: "Housing" },
      { id: 2, name: "Electricity", amount: -120, date: "2025-11-05", category: "Utilities" },
      { id: 3, name: "Paycheck", amount: 3e3, date: "2025-11-15", category: "Income" }
    ];
  };
  var getInitialTemplates = () => {
    try {
      const savedTemplates = localStorage.getItem(TEMPLATES_KEY);
      if (savedTemplates) {
        return JSON.parse(savedTemplates);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
    return [];
  };

  // projects/bills/frontend/App.tsx
  function BillPaymentPlanner() {
    const [bills, setBills] = (0, import_react6.useState)(getInitialBills());
    const [templates, setTemplates] = (0, import_react6.useState)(getInitialTemplates());
    const [draggedItem, setDraggedItem] = (0, import_react6.useState)(null);
    const [newBill, setNewBill] = (0, import_react6.useState)({ name: "", amount: "", date: "", category: "Other", notes: "" });
    const [editingId, setEditingId] = (0, import_react6.useState)(null);
    const [editForm, setEditForm] = (0, import_react6.useState)({ name: "", amount: "", date: "", category: "Other", notes: "" });
    const [sortBy, setSortBy] = (0, import_react6.useState)("order");
    const [filterCategory, setFilterCategory] = (0, import_react6.useState)("all");
    const [showTemplates, setShowTemplates] = (0, import_react6.useState)(false);
    const [templateDates, setTemplateDates] = (0, import_react6.useState)({});
    const [currentPage, setCurrentPage] = (0, import_react6.useState)("planner");
    const [expandedTemplates, setExpandedTemplates] = (0, import_react6.useState)({});
    const [editingTemplateId, setEditingTemplateId] = (0, import_react6.useState)(null);
    const [templateEditForm, setTemplateEditForm] = (0, import_react6.useState)({ name: "", amount: "", category: "Other", frequencyNumber: 1, frequencyPeriod: "months", notes: "" });
    const [newTemplate, setNewTemplate] = (0, import_react6.useState)({ name: "", amount: "", category: "Other", frequencyNumber: 1, frequencyPeriod: "months", notes: "" });
    (0, import_react6.useEffect)(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
      } catch (error) {
        console.error("Error saving bills:", error);
      }
    }, [bills]);
    (0, import_react6.useEffect)(() => {
      try {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
      } catch (error) {
        console.error("Error saving templates:", error);
      }
    }, [templates]);
    const handleDragStart = (e, index) => {
      if (sortBy !== "order") return;
      setDraggedItem(index);
      e.dataTransfer.effectAllowed = "move";
    };
    const handleDragOver = (e, index) => {
      e.preventDefault();
      if (sortBy !== "order" || draggedItem === null || draggedItem === index) return;
      const newBills = [...bills];
      const draggedBill = newBills[draggedItem];
      newBills.splice(draggedItem, 1);
      newBills.splice(index, 0, draggedBill);
      setBills(newBills);
      setDraggedItem(index);
    };
    const handleDragEnd = () => {
      setDraggedItem(null);
    };
    const addBill = () => {
      if (!newBill.name || !newBill.amount || !newBill.date) return;
      const bill = {
        id: Date.now(),
        name: newBill.name,
        amount: parseFloat(newBill.amount),
        date: newBill.date,
        category: newBill.category,
        notes: newBill.notes,
        billId: null
      };
      setBills([...bills, bill]);
      setNewBill({ name: "", amount: "", date: "", category: "Other", notes: "" });
    };
    const deleteBill = (id) => {
      setBills(bills.filter((bill) => bill.id !== id));
    };
    const startEdit = (bill) => {
      setEditingId(bill.id);
      setEditForm({ name: bill.name, amount: bill.amount.toString(), date: bill.date, category: bill.category, notes: bill.notes || "" });
    };
    const cancelEdit = () => {
      setEditingId(null);
      setEditForm({ name: "", amount: "", date: "", category: "Other", notes: "" });
    };
    const saveEdit = () => {
      if (!editForm.name || !editForm.amount || !editForm.date) return;
      setBills(bills.map(
        (bill) => bill.id === editingId ? { ...bill, name: editForm.name, amount: parseFloat(editForm.amount), date: editForm.date, category: editForm.category, notes: editForm.notes } : bill
      ));
      setEditingId(null);
      setEditForm({ name: "", amount: "", date: "", category: "Other", notes: "" });
    };
    const saveAsTemplate = (bill) => {
      const template = {
        id: Date.now(),
        name: bill.name,
        amount: bill.amount,
        category: bill.category,
        frequencyNumber: 1,
        frequencyPeriod: "months",
        notes: bill.notes || ""
      };
      setTemplates([...templates, template]);
    };
    const addNewTemplate = () => {
      if (!newTemplate.name || !newTemplate.amount) return;
      const template = {
        id: Date.now(),
        name: newTemplate.name,
        amount: parseFloat(newTemplate.amount),
        category: newTemplate.category,
        frequencyNumber: parseInt(String(newTemplate.frequencyNumber)),
        frequencyPeriod: newTemplate.frequencyPeriod,
        notes: newTemplate.notes
      };
      setTemplates([...templates, template]);
      setNewTemplate({ name: "", amount: "", category: "Other", frequencyNumber: 1, frequencyPeriod: "months", notes: "" });
    };
    const viewRecurringBill = (billId) => {
      if (billId) {
        setCurrentPage("templates");
        setExpandedTemplates({ [billId]: true });
      }
    };
    const calculateNextPaymentDate = (templateId, frequencyNumber, frequencyPeriod) => {
      const payments = getTemplatePayments(templateId);
      if (payments.length === 0) {
        return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      }
      const latestPayment = payments[payments.length - 1];
      const latestDate = new Date(latestPayment.date);
      let nextDate = new Date(latestDate);
      switch (frequencyPeriod) {
        case "days":
          nextDate.setDate(nextDate.getDate() + frequencyNumber);
          break;
        case "weeks":
          nextDate.setDate(nextDate.getDate() + frequencyNumber * 7);
          break;
        case "months":
          nextDate.setMonth(nextDate.getMonth() + frequencyNumber);
          break;
        case "years":
          nextDate.setFullYear(nextDate.getFullYear() + frequencyNumber);
          break;
      }
      return nextDate.toISOString().split("T")[0];
    };
    const addFromTemplate = (template) => {
      const defaultDate = calculateNextPaymentDate(
        template.id,
        Number(template.frequencyNumber || 1),
        template.frequencyPeriod || "months"
      );
      const selectedDate = templateDates[template.id] || defaultDate;
      const bill = {
        id: Date.now(),
        name: template.name,
        amount: template.amount,
        date: selectedDate,
        category: template.category,
        notes: template.notes || "",
        billId: template.id
      };
      setBills([...bills, bill]);
    };
    const deleteTemplate = (id) => {
      setTemplates(templates.filter((t) => t.id !== id));
      const newTemplateDates = { ...templateDates };
      delete newTemplateDates[id];
      setTemplateDates(newTemplateDates);
      const newExpanded = { ...expandedTemplates };
      delete newExpanded[id];
      setExpandedTemplates(newExpanded);
    };
    const startTemplateEdit = (template) => {
      setEditingTemplateId(template.id);
      setTemplateEditForm({
        name: template.name,
        amount: template.amount.toString(),
        category: template.category,
        frequencyNumber: template.frequencyNumber || 1,
        frequencyPeriod: template.frequencyPeriod || "months",
        notes: template.notes || ""
      });
    };
    const cancelTemplateEdit = () => {
      setEditingTemplateId(null);
      setTemplateEditForm({ name: "", amount: "", category: "Other", frequencyNumber: 1, frequencyPeriod: "months", notes: "" });
    };
    const saveTemplateEdit = () => {
      if (!templateEditForm.name || !templateEditForm.amount) return;
      setTemplates(templates.map(
        (template) => template.id === editingTemplateId ? {
          ...template,
          name: templateEditForm.name,
          amount: parseFloat(templateEditForm.amount),
          category: templateEditForm.category,
          frequencyNumber: parseInt(String(templateEditForm.frequencyNumber)),
          frequencyPeriod: templateEditForm.frequencyPeriod,
          notes: templateEditForm.notes
        } : template
      ));
      setEditingTemplateId(null);
      setTemplateEditForm({ name: "", amount: "", category: "Other", frequencyNumber: 1, frequencyPeriod: "months", notes: "" });
    };
    const getTemplatePayments = (templateId) => {
      return bills.filter((bill) => bill.billId === templateId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };
    const isRecurringBill = (billId) => {
      return billId !== null && billId !== void 0;
    };
    const exportPaymentsToCSV = () => {
      const headers = ["id", "name", "amount", "date", "category", "notes", "billId"];
      const rows = bills.map((bill) => [
        bill.id,
        bill.name,
        bill.amount,
        bill.date,
        bill.category,
        bill.notes || "",
        bill.billId || ""
      ]);
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
    const exportTemplatesToCSV = () => {
      const headers = ["id", "name", "amount", "category", "frequencyNumber", "frequencyPeriod", "notes"];
      const rows = templates.map((template) => [
        template.id,
        template.name,
        template.amount,
        template.category,
        template.frequencyNumber || 1,
        template.frequencyPeriod || "months",
        template.notes || ""
      ]);
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recurring-bills-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };
    const importPaymentsFromCSV = (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text !== "string") return;
          const lines = text.split("\n").filter((line) => line.trim());
          const newBills = [];
          for (let i = 1; i < lines.length; i++) {
            const match = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
            const values = match.map((v) => v.replace(/^"|"$/g, "").trim());
            const bill = {
              id: parseInt(values[0]) || Date.now() + i,
              name: values[1] || "",
              amount: parseFloat(values[2]) || 0,
              date: values[3] || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              category: values[4] || "Other",
              notes: values[5] || "",
              billId: values[6] && values[6] !== "" ? parseInt(values[6]) : null
            };
            if (bill.name && bill.amount !== 0) {
              newBills.push(bill);
            }
          }
          setBills([...bills, ...newBills]);
          alert(`Successfully imported ${newBills.length} payment(s)`);
        } catch (error) {
          alert("Error importing CSV. Please check the file format.");
          console.error("Import error:", error);
        }
      };
      reader.readAsText(file);
      if (event.target) event.target.value = "";
    };
    const importTemplatesFromCSV = (event) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text !== "string") return;
          const lines = text.split("\n").filter((line) => line.trim());
          const newTemplates = [];
          for (let i = 1; i < lines.length; i++) {
            const match = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
            const values = match.map((v) => v.replace(/^"|"$/g, "").trim());
            const template = {
              id: parseInt(values[0]) || Date.now() + i,
              name: values[1] || "",
              amount: parseFloat(values[2]) || 0,
              category: values[3] || "Other",
              frequencyNumber: parseInt(values[4]) || 1,
              frequencyPeriod: values[5] || "months",
              notes: values[6] || ""
            };
            if (template.name && template.amount !== 0) {
              newTemplates.push(template);
            }
          }
          setTemplates([...templates, ...newTemplates]);
          alert(`Successfully imported ${newTemplates.length} recurring bill(s)`);
        } catch (error) {
          alert("Error importing CSV. Please check the file format.");
          console.error("Import error:", error);
        }
      };
      reader.readAsText(file);
      if (event.target) event.target.value = "";
    };
    const getFilteredAndSortedBills = () => {
      let filtered = bills;
      if (filterCategory !== "all") {
        filtered = bills.filter((bill) => bill.category === filterCategory);
      }
      let sorted = [...filtered];
      switch (sortBy) {
        case "date":
          sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          break;
        case "amount":
          sorted.sort((a, b) => a.amount - b.amount);
          break;
        case "name":
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "category":
          sorted.sort((a, b) => a.category.localeCompare(b.category));
          break;
        default:
          break;
      }
      return sorted;
    };
    const displayBills = getFilteredAndSortedBills();
    const getRunningBalance = (index) => {
      return displayBills.slice(0, index + 1).reduce((acc, bill) => acc + bill.amount, 0);
    };
    const runningTotal = displayBills.reduce((acc, bill) => acc + bill.amount, 0);
    const getCategoryColor = (category) => {
      const colors = {
        "Income": "bg-green-100 text-green-800",
        "Housing": "bg-blue-100 text-blue-800",
        "Utilities": "bg-yellow-100 text-yellow-800",
        "Subscriptions": "bg-purple-100 text-purple-800",
        "Insurance": "bg-indigo-100 text-indigo-800",
        "Transportation": "bg-orange-100 text-orange-800",
        "Food": "bg-red-100 text-red-800",
        "Entertainment": "bg-pink-100 text-pink-800",
        "Healthcare": "bg-teal-100 text-teal-800",
        "Other": "bg-gray-100 text-gray-800"
      };
      return colors[category] || colors["Other"];
    };
    return /* @__PURE__ */ import_react6.default.createElement("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "max-w-4xl mx-auto" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "bg-white rounded-lg shadow-lg p-4 mb-6" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react6.default.createElement(
      "button",
      {
        onClick: () => setCurrentPage("planner"),
        className: `flex-1 py-2 px-4 rounded-lg font-medium transition ${currentPage === "planner" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`
      },
      /* @__PURE__ */ import_react6.default.createElement("div", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ import_react6.default.createElement(Calendar, { size: 20 }), "Payment Planner")
    ), /* @__PURE__ */ import_react6.default.createElement(
      "button",
      {
        onClick: () => setCurrentPage("templates"),
        className: `flex-1 py-2 px-4 rounded-lg font-medium transition ${currentPage === "templates" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`
      },
      /* @__PURE__ */ import_react6.default.createElement("div", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ import_react6.default.createElement(RefreshCw, { size: 20 }), "Recurring Bills (", templates.length, ")")
    ))), currentPage === "planner" && /* @__PURE__ */ import_react6.default.createElement(import_react6.default.Fragment, null, /* @__PURE__ */ import_react6.default.createElement("div", { className: "bg-white rounded-lg shadow-lg p-6 mb-6" }, /* @__PURE__ */ import_react6.default.createElement("h1", { className: "text-3xl font-bold text-gray-800 mb-2" }, "Bill Payment Planner"), /* @__PURE__ */ import_react6.default.createElement("p", { className: "text-gray-600 mb-4" }, "Manage your bills with categories and templates"), /* @__PURE__ */ import_react6.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-3 mb-4" }, /* @__PURE__ */ import_react6.default.createElement(
      "input",
      {
        type: "text",
        placeholder: "Bill name",
        value: newBill.name,
        onChange: (e) => setNewBill({ ...newBill, name: e.target.value }),
        className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      }
    ), /* @__PURE__ */ import_react6.default.createElement(
      "input",
      {
        type: "number",
        placeholder: "Amount",
        step: "0.01",
        value: newBill.amount,
        onChange: (e) => setNewBill({ ...newBill, amount: e.target.value }),
        className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      }
    ), /* @__PURE__ */ import_react6.default.createElement(
      "input",
      {
        type: "date",
        value: newBill.date,
        onChange: (e) => setNewBill({ ...newBill, date: e.target.value }),
        className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      }
    ), /* @__PURE__ */ import_react6.default.createElement(
      "select",
      {
        value: newBill.category,
        onChange: (e) => setNewBill({ ...newBill, category: e.target.value }),
        className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      },
      CATEGORIES.map((cat) => /* @__PURE__ */ import_react6.default.createElement("option", { key: cat, value: cat }, cat))
    ), /* @__PURE__ */ import_react6.default.createElement(
      "button",
      {
        onClick: addBill,
        className: "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ import_react6.default.createElement(Plus, { size: 20 }),
      "Add"
    )), /* @__PURE__ */ import_react6.default.createElement("div", { className: "mb-4" }, /* @__PURE__ */ import_react6.default.createElement(
      "input",
      {
        type: "text",
        placeholder: "Notes (optional)",
        value: newBill.notes,
        onChange: (e) => setNewBill({ ...newBill, notes: e.target.value }),
        className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      }
    )), /* @__PURE__ */ import_react6.default.createElement("div", { className: "flex flex-wrap gap-3 items-center" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react6.default.createElement(Funnel, { size: 18, className: "text-gray-600" }), /* @__PURE__ */ import_react6.default.createElement(
      "select",
      {
        value: filterCategory,
        onChange: (e) => setFilterCategory(e.target.value),
        className: "px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      },
      /* @__PURE__ */ import_react6.default.createElement("option", { value: "all" }, "All Categories"),
      CATEGORIES.map((cat) => /* @__PURE__ */ import_react6.default.createElement("option", { key: cat, value: cat }, cat))
    )), /* @__PURE__ */ import_react6.default.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ import_react6.default.createElement("span", { className: "text-gray-600 text-sm" }, "Sort by:"), /* @__PURE__ */ import_react6.default.createElement(
      "select",
      {
        value: sortBy,
        onChange: (e) => setSortBy(e.target.value),
        className: "px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      },
      /* @__PURE__ */ import_react6.default.createElement("option", { value: "order" }, "Manual Order"),
      /* @__PURE__ */ import_react6.default.createElement("option", { value: "date" }, "Date"),
      /* @__PURE__ */ import_react6.default.createElement("option", { value: "amount" }, "Amount"),
      /* @__PURE__ */ import_react6.default.createElement("option", { value: "name" }, "Name"),
      /* @__PURE__ */ import_react6.default.createElement("option", { value: "category" }, "Category")
    )), /* @__PURE__ */ import_react6.default.createElement("div", { className: "ml-auto flex items-center gap-2" }, /* @__PURE__ */ import_react6.default.createElement(
      "button",
      {
        onClick: exportPaymentsToCSV,
        className: "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-2 text-sm"
      },
      /* @__PURE__ */ import_react6.default.createElement(Download, { size: 16 }),
      "Export"
    ), /* @__PURE__ */ import_react6.default.createElement("label", { className: "px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition flex items-center gap-2 text-sm cursor-pointer" }, /* @__PURE__ */ import_react6.default.createElement(Upload, { size: 16 }), "Import", /* @__PURE__ */ import_react6.default.createElement(
      "input",
      {
        type: "file",
        accept: ".csv",
        onChange: importPaymentsFromCSV,
        className: "hidden"
      }
    )), /* @__PURE__ */ import_react6.default.createElement(
      "button",
      {
        onClick: () => setShowTemplates(!showTemplates),
        className: "px-4 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition flex items-center gap-2 text-sm"
      },
      /* @__PURE__ */ import_react6.default.createElement(RefreshCw, { size: 16 }),
      "Quick Add from Templates"
    )))), showTemplates && /* @__PURE__ */ import_react6.default.createElement(
      QuickTemplates,
      {
        templates,
        templateDates,
        setTemplateDates,
        addFromTemplate,
        calculateNextPaymentDate,
        getCategoryColor
      }
    ), /* @__PURE__ */ import_react6.default.createElement("div", { className: "space-y-2" }, displayBills.map((bill, index) => {
      const isEditing = editingId === bill.id;
      const balance = getRunningBalance(index);
      return /* @__PURE__ */ import_react6.default.createElement(
        BillItem,
        {
          key: bill.id,
          bill,
          index,
          isEditing,
          balance,
          editForm,
          setEditForm,
          saveEdit,
          cancelEdit,
          startEdit,
          deleteBill,
          saveAsTemplate,
          viewRecurringBill,
          getCategoryColor,
          isRecurringBill,
          handleDragStart,
          handleDragOver,
          handleDragEnd,
          draggedItem,
          sortBy
        }
      );
    })), displayBills.length === 0 && /* @__PURE__ */ import_react6.default.createElement("div", { className: "bg-white rounded-lg shadow p-8 text-center text-gray-500" }, filterCategory !== "all" ? "No bills in this category." : "No bills added yet. Add your first bill above!"), displayBills.length > 0 && /* @__PURE__ */ import_react6.default.createElement("div", { className: "bg-white rounded-lg shadow-lg p-6 mt-6" }, /* @__PURE__ */ import_react6.default.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ import_react6.default.createElement("span", { className: "text-lg font-medium text-gray-700" }, filterCategory !== "all" ? `${filterCategory} Balance:` : "Final Balance:"), /* @__PURE__ */ import_react6.default.createElement("span", { className: `text-2xl font-bold ${runningTotal >= 0 ? "text-green-600" : "text-red-600"}` }, "$", runningTotal.toFixed(2))))), currentPage === "templates" && /* @__PURE__ */ import_react6.default.createElement(
      TemplatesPanel,
      {
        templates,
        expandedTemplates,
        editingTemplateId,
        templateEditForm,
        setTemplateEditForm,
        startTemplateEdit,
        cancelTemplateEdit,
        saveTemplateEdit,
        deleteTemplate,
        getTemplatePayments,
        calculateNextPaymentDate,
        setTemplateDates,
        templateDates,
        addFromTemplate,
        addNewTemplate,
        exportTemplatesToCSV,
        importTemplatesFromCSV,
        newTemplate,
        setNewTemplate,
        TIME_PERIODS,
        CATEGORIES,
        getCategoryColor,
        setCurrentPage,
        startEdit,
        deleteBill
      }
    )));
  }
})();
/*! Bundled license information:

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/calendar.js:
lucide-react/dist/esm/icons/check.js:
lucide-react/dist/esm/icons/chevron-down.js:
lucide-react/dist/esm/icons/chevron-right.js:
lucide-react/dist/esm/icons/dollar-sign.js:
lucide-react/dist/esm/icons/download.js:
lucide-react/dist/esm/icons/funnel.js:
lucide-react/dist/esm/icons/grip-vertical.js:
lucide-react/dist/esm/icons/list.js:
lucide-react/dist/esm/icons/pen.js:
lucide-react/dist/esm/icons/plus.js:
lucide-react/dist/esm/icons/refresh-cw.js:
lucide-react/dist/esm/icons/trash-2.js:
lucide-react/dist/esm/icons/upload.js:
lucide-react/dist/esm/icons/x.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.552.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
//# sourceMappingURL=bundle.js.map
