// jquery-ui.min
{
  /*! jQuery UI - v1.12.1 - 2016-09-14
   * http://jqueryui.com
   * Includes: widget.js, position.js, data.js, disable-selection.js, effect.js, effects/effect-blind.js, effects/effect-bounce.js, effects/effect-clip.js, effects/effect-drop.js, effects/effect-explode.js, effects/effect-fade.js, effects/effect-fold.js, effects/effect-highlight.js, effects/effect-puff.js, effects/effect-pulsate.js, effects/effect-scale.js, effects/effect-shake.js, effects/effect-size.js, effects/effect-slide.js, effects/effect-transfer.js, focusable.js, form-reset-mixin.js, jquery-1-7.js, keycode.js, labels.js, scroll-parent.js, tabbable.js, unique-id.js, widgets/accordion.js, widgets/autocomplete.js, widgets/button.js, widgets/checkboxradio.js, widgets/controlgroup.js, widgets/datepicker.js, widgets/dialog.js, widgets/draggable.js, widgets/droppable.js, widgets/menu.js, widgets/mouse.js, widgets/progressbar.js, widgets/resizable.js, widgets/selectable.js, widgets/selectmenu.js, widgets/slider.js, widgets/sortable.js, widgets/spinner.js, widgets/tabs.js, widgets/tooltip.js
   * Copyright jQuery Foundation and other contributors; Licensed MIT */
  !(function (t) {
      'function' == typeof define && define.amd
          ? define(['jquery'], t)
          : t(jQuery);
  })(function (t) {
      function e() {
          (this._curInst = null),
              (this._keyEvent = !1),
              (this._disabledInputs = []),
              (this._datepickerShowing = !1),
              (this._inDialog = !1),
              (this._mainDivId = 'ui-datepicker-div'),
              (this._inlineClass = 'ui-datepicker-inline'),
              (this._appendClass = 'ui-datepicker-append'),
              (this._triggerClass = 'ui-datepicker-trigger'),
              (this._dialogClass = 'ui-datepicker-dialog'),
              (this._disableClass = 'ui-datepicker-disabled'),
              (this._unselectableClass = 'ui-datepicker-unselectable'),
              (this._currentClass = 'ui-datepicker-current-day'),
              (this._dayOverClass = 'ui-datepicker-days-cell-over'),
              (this.regional = []),
              (this.regional[''] = {
                  closeText: 'Done',
                  prevText: 'Prev',
                  nextText: 'Next',
                  currentText: 'Today',
                  monthNames: [
                      'January',
                      'February',
                      'March',
                      'April',
                      'May',
                      'June',
                      'July',
                      'August',
                      'September',
                      'October',
                      'November',
                      'December',
                  ],
                  monthNamesShort: [
                      'Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'May',
                      'Jun',
                      'Jul',
                      'Aug',
                      'Sep',
                      'Oct',
                      'Nov',
                      'Dec',
                  ],
                  dayNames: [
                      'Sunday',
                      'Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday',
                  ],
                  dayNamesShort: [
                      'Sun',
                      'Mon',
                      'Tue',
                      'Wed',
                      'Thu',
                      'Fri',
                      'Sat',
                  ],
                  dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
                  weekHeader: 'Wk',
                  dateFormat: 'mm/dd/yy',
                  firstDay: 0,
                  isRTL: !1,
                  showMonthAfterYear: !1,
                  yearSuffix: '',
              }),
              (this._defaults = {
                  showOn: 'focus',
                  showAnim: 'fadeIn',
                  showOptions: {},
                  defaultDate: null,
                  appendText: '',
                  buttonText: '...',
                  buttonImage: '',
                  buttonImageOnly: !1,
                  hideIfNoPrevNext: !1,
                  navigationAsDateFormat: !1,
                  gotoCurrent: !1,
                  changeMonth: !1,
                  changeYear: !1,
                  yearRange: 'c-10:c+10',
                  showOtherMonths: !1,
                  selectOtherMonths: !1,
                  showWeek: !1,
                  calculateWeek: this.iso8601Week,
                  shortYearCutoff: '+10',
                  minDate: null,
                  maxDate: null,
                  duration: 'fast',
                  beforeShowDay: null,
                  beforeShow: null,
                  onSelect: null,
                  onChangeMonthYear: null,
                  onClose: null,
                  numberOfMonths: 1,
                  showCurrentAtPos: 0,
                  stepMonths: 1,
                  stepBigMonths: 12,
                  altField: '',
                  altFormat: '',
                  constrainInput: !0,
                  showButtonPanel: !1,
                  autoSize: !1,
                  disabled: !1,
              }),
              t.extend(this._defaults, this.regional['']),
              (this.regional.en = t.extend(!0, {}, this.regional[''])),
              (this.regional['en-US'] = t.extend(!0, {}, this.regional.en)),
              (this.dpDiv = i(
                  t(
                      "<div id='" +
                          this._mainDivId +
                          "' class='ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>"
                  )
              ));
      }
      function i(e) {
          var i =
              'button, .ui-datepicker-prev, .ui-datepicker-next, .ui-datepicker-calendar td a';
          return e
              .on('mouseout', i, function () {
                  t(this).removeClass('ui-state-hover'),
                      -1 !== this.className.indexOf('ui-datepicker-prev') &&
                          t(this).removeClass('ui-datepicker-prev-hover'),
                      -1 !== this.className.indexOf('ui-datepicker-next') &&
                          t(this).removeClass('ui-datepicker-next-hover');
              })
              .on('mouseover', i, s);
      }
      function s() {
          t.datepicker._isDisabledDatepicker(
              d.inline ? d.dpDiv.parent()[0] : d.input[0]
          ) ||
              (t(this)
                  .parents('.ui-datepicker-calendar')
                  .find('a')
                  .removeClass('ui-state-hover'),
              t(this).addClass('ui-state-hover'),
              -1 !== this.className.indexOf('ui-datepicker-prev') &&
                  t(this).addClass('ui-datepicker-prev-hover'),
              -1 !== this.className.indexOf('ui-datepicker-next') &&
                  t(this).addClass('ui-datepicker-next-hover'));
      }
      function n(e, i) {
          for (var s in (t.extend(e, i), i)) null == i[s] && (e[s] = i[s]);
          return e;
      }
      function o(t) {
          return function () {
              var e = this.element.val();
              t.apply(this, arguments),
                  this._refresh(),
                  e !== this.element.val() && this._trigger('change');
          };
      }
      (t.ui = t.ui || {}), (t.ui.version = '1.12.1');
      var a = 0,
          r = Array.prototype.slice;
      (t.cleanData = (function (e) {
          return function (i) {
              var s, n, o;
              for (o = 0; null != (n = i[o]); o++)
                  try {
                      (s = t._data(n, 'events')) &&
                          s.remove &&
                          t(n).triggerHandler('remove');
                  } catch (t) {}
              e(i);
          };
      })(t.cleanData)),
          (t.widget = function (e, i, s) {
              var n,
                  o,
                  a,
                  r = {},
                  h = e.split('.')[0],
                  l = h + '-' + (e = e.split('.')[1]);
              return (
                  s || ((s = i), (i = t.Widget)),
                  t.isArray(s) && (s = t.extend.apply(null, [{}].concat(s))),
                  (t.expr[':'][l.toLowerCase()] = function (e) {
                      return !!t.data(e, l);
                  }),
                  (t[h] = t[h] || {}),
                  (n = t[h][e]),
                  (o = t[h][e] = function (t, e) {
                      return this._createWidget
                          ? void (arguments.length && this._createWidget(t, e))
                          : new o(t, e);
                  }),
                  t.extend(o, n, {
                      version: s.version,
                      _proto: t.extend({}, s),
                      _childConstructors: [],
                  }),
                  ((a = new i()).options = t.widget.extend({}, a.options)),
                  t.each(s, function (e, s) {
                      return t.isFunction(s)
                          ? void (r[e] = (function () {
                                function t() {
                                    return i.prototype[e].apply(this, arguments);
                                }
                                function n(t) {
                                    return i.prototype[e].apply(this, t);
                                }
                                return function () {
                                    var e,
                                        i = this._super,
                                        o = this._superApply;
                                    return (
                                        (this._super = t),
                                        (this._superApply = n),
                                        (e = s.apply(this, arguments)),
                                        (this._super = i),
                                        (this._superApply = o),
                                        e
                                    );
                                };
                            })())
                          : void (r[e] = s);
                  }),
                  (o.prototype = t.widget.extend(
                      a,
                      { widgetEventPrefix: (n && a.widgetEventPrefix) || e },
                      r,
                      {
                          constructor: o,
                          namespace: h,
                          widgetName: e,
                          widgetFullName: l,
                      }
                  )),
                  n
                      ? (t.each(n._childConstructors, function (e, i) {
                            var s = i.prototype;
                            t.widget(
                                s.namespace + '.' + s.widgetName,
                                o,
                                i._proto
                            );
                        }),
                        delete n._childConstructors)
                      : i._childConstructors.push(o),
                  t.widget.bridge(e, o),
                  o
              );
          }),
          (t.widget.extend = function (e) {
              for (
                  var i, s, n = r.call(arguments, 1), o = 0, a = n.length;
                  a > o;
                  o++
              )
                  for (i in n[o])
                      (s = n[o][i]),
                          n[o].hasOwnProperty(i) &&
                              void 0 !== s &&
                              (e[i] = t.isPlainObject(s)
                                  ? t.isPlainObject(e[i])
                                      ? t.widget.extend({}, e[i], s)
                                      : t.widget.extend({}, s)
                                  : s);
              return e;
          }),
          (t.widget.bridge = function (e, i) {
              var s = i.prototype.widgetFullName || e;
              t.fn[e] = function (n) {
                  var o = 'string' == typeof n,
                      a = r.call(arguments, 1),
                      h = this;
                  return (
                      o
                          ? this.length || 'instance' !== n
                              ? this.each(function () {
                                    var i,
                                        o = t.data(this, s);
                                    return 'instance' === n
                                        ? ((h = o), !1)
                                        : o
                                        ? t.isFunction(o[n]) &&
                                          '_' !== n.charAt(0)
                                            ? (i = o[n].apply(o, a)) !== o &&
                                              void 0 !== i
                                                ? ((h =
                                                      i && i.jquery
                                                          ? h.pushStack(i.get())
                                                          : i),
                                                  !1)
                                                : void 0
                                            : t.error(
                                                  "no such method '" +
                                                      n +
                                                      "' for " +
                                                      e +
                                                      ' widget instance'
                                              )
                                        : t.error(
                                              'cannot call methods on ' +
                                                  e +
                                                  " prior to initialization; attempted to call method '" +
                                                  n +
                                                  "'"
                                          );
                                })
                              : (h = void 0)
                          : (a.length &&
                                (n = t.widget.extend.apply(null, [n].concat(a))),
                            this.each(function () {
                                var e = t.data(this, s);
                                e
                                    ? (e.option(n || {}), e._init && e._init())
                                    : t.data(this, s, new i(n, this));
                            })),
                      h
                  );
              };
          }),
          (t.Widget = function () {}),
          (t.Widget._childConstructors = []),
          (t.Widget.prototype = {
              widgetName: 'widget',
              widgetEventPrefix: '',
              defaultElement: '<div>',
              options: { classes: {}, disabled: !1, create: null },
              _createWidget: function (e, i) {
                  (i = t(i || this.defaultElement || this)[0]),
                      (this.element = t(i)),
                      (this.uuid = a++),
                      (this.eventNamespace = '.' + this.widgetName + this.uuid),
                      (this.bindings = t()),
                      (this.hoverable = t()),
                      (this.focusable = t()),
                      (this.classesElementLookup = {}),
                      i !== this &&
                          (t.data(i, this.widgetFullName, this),
                          this._on(!0, this.element, {
                              remove: function (t) {
                                  t.target === i && this.destroy();
                              },
                          }),
                          (this.document = t(
                              i.style ? i.ownerDocument : i.document || i
                          )),
                          (this.window = t(
                              this.document[0].defaultView ||
                                  this.document[0].parentWindow
                          ))),
                      (this.options = t.widget.extend(
                          {},
                          this.options,
                          this._getCreateOptions(),
                          e
                      )),
                      this._create(),
                      this.options.disabled &&
                          this._setOptionDisabled(this.options.disabled),
                      this._trigger('create', null, this._getCreateEventData()),
                      this._init();
              },
              _getCreateOptions: function () {
                  return {};
              },
              _getCreateEventData: t.noop,
              _create: t.noop,
              _init: t.noop,
              destroy: function () {
                  var e = this;
                  this._destroy(),
                      t.each(this.classesElementLookup, function (t, i) {
                          e._removeClass(i, t);
                      }),
                      this.element
                          .off(this.eventNamespace)
                          .removeData(this.widgetFullName),
                      this.widget()
                          .off(this.eventNamespace)
                          .removeAttr('aria-disabled'),
                      this.bindings.off(this.eventNamespace);
              },
              _destroy: t.noop,
              widget: function () {
                  return this.element;
              },
              option: function (e, i) {
                  var s,
                      n,
                      o,
                      a = e;
                  if (0 === arguments.length)
                      return t.widget.extend({}, this.options);
                  if ('string' == typeof e)
                      if (
                          ((a = {}),
                          (s = e.split('.')),
                          (e = s.shift()),
                          s.length)
                      ) {
                          for (
                              n = a[e] = t.widget.extend({}, this.options[e]),
                                  o = 0;
                              s.length - 1 > o;
                              o++
                          )
                              (n[s[o]] = n[s[o]] || {}), (n = n[s[o]]);
                          if (((e = s.pop()), 1 === arguments.length))
                              return void 0 === n[e] ? null : n[e];
                          n[e] = i;
                      } else {
                          if (1 === arguments.length)
                              return void 0 === this.options[e]
                                  ? null
                                  : this.options[e];
                          a[e] = i;
                      }
                  return this._setOptions(a), this;
              },
              _setOptions: function (t) {
                  var e;
                  for (e in t) this._setOption(e, t[e]);
                  return this;
              },
              _setOption: function (t, e) {
                  return (
                      'classes' === t && this._setOptionClasses(e),
                      (this.options[t] = e),
                      'disabled' === t && this._setOptionDisabled(e),
                      this
                  );
              },
              _setOptionClasses: function (e) {
                  var i, s, n;
                  for (i in e)
                      (n = this.classesElementLookup[i]),
                          e[i] !== this.options.classes[i] &&
                              n &&
                              n.length &&
                              ((s = t(n.get())),
                              this._removeClass(n, i),
                              s.addClass(
                                  this._classes({
                                      element: s,
                                      keys: i,
                                      classes: e,
                                      add: !0,
                                  })
                              ));
              },
              _setOptionDisabled: function (t) {
                  this._toggleClass(
                      this.widget(),
                      this.widgetFullName + '-disabled',
                      null,
                      !!t
                  ),
                      t &&
                          (this._removeClass(
                              this.hoverable,
                              null,
                              'ui-state-hover'
                          ),
                          this._removeClass(
                              this.focusable,
                              null,
                              'ui-state-focus'
                          ));
              },
              enable: function () {
                  return this._setOptions({ disabled: !1 });
              },
              disable: function () {
                  return this._setOptions({ disabled: !0 });
              },
              _classes: function (e) {
                  function i(i, o) {
                      var a, r;
                      for (r = 0; i.length > r; r++)
                          (a = n.classesElementLookup[i[r]] || t()),
                              (a = e.add
                                  ? t(t.unique(a.get().concat(e.element.get())))
                                  : t(a.not(e.element).get())),
                              (n.classesElementLookup[i[r]] = a),
                              s.push(i[r]),
                              o && e.classes[i[r]] && s.push(e.classes[i[r]]);
                  }
                  var s = [],
                      n = this;
                  return (
                      (e = t.extend(
                          {
                              element: this.element,
                              classes: this.options.classes || {},
                          },
                          e
                      )),
                      this._on(e.element, { remove: '_untrackClassesElement' }),
                      e.keys && i(e.keys.match(/\S+/g) || [], !0),
                      e.extra && i(e.extra.match(/\S+/g) || []),
                      s.join(' ')
                  );
              },
              _untrackClassesElement: function (e) {
                  var i = this;
                  t.each(i.classesElementLookup, function (s, n) {
                      -1 !== t.inArray(e.target, n) &&
                          (i.classesElementLookup[s] = t(n.not(e.target).get()));
                  });
              },
              _removeClass: function (t, e, i) {
                  return this._toggleClass(t, e, i, !1);
              },
              _addClass: function (t, e, i) {
                  return this._toggleClass(t, e, i, !0);
              },
              _toggleClass: function (t, e, i, s) {
                  s = 'boolean' == typeof s ? s : i;
                  var n = 'string' == typeof t || null === t,
                      o = {
                          extra: n ? e : i,
                          keys: n ? t : e,
                          element: n ? this.element : t,
                          add: s,
                      };
                  return o.element.toggleClass(this._classes(o), s), this;
              },
              _on: function (e, i, s) {
                  var n,
                      o = this;
                  'boolean' != typeof e && ((s = i), (i = e), (e = !1)),
                      s
                          ? ((i = n = t(i)),
                            (this.bindings = this.bindings.add(i)))
                          : ((s = i), (i = this.element), (n = this.widget())),
                      t.each(s, function (s, a) {
                          function r() {
                              return e ||
                                  (!0 !== o.options.disabled &&
                                      !t(this).hasClass('ui-state-disabled'))
                                  ? ('string' == typeof a ? o[a] : a).apply(
                                        o,
                                        arguments
                                    )
                                  : void 0;
                          }
                          'string' != typeof a &&
                              (r.guid = a.guid = a.guid || r.guid || t.guid++);
                          var h = s.match(/^([\w:-]*)\s*(.*)$/),
                              l = h[1] + o.eventNamespace,
                              c = h[2];
                          c ? n.on(l, c, r) : i.on(l, r);
                      });
              },
              _off: function (e, i) {
                  (i =
                      (i || '').split(' ').join(this.eventNamespace + ' ') +
                      this.eventNamespace),
                      e.off(i).off(i),
                      (this.bindings = t(this.bindings.not(e).get())),
                      (this.focusable = t(this.focusable.not(e).get())),
                      (this.hoverable = t(this.hoverable.not(e).get()));
              },
              _delay: function (t, e) {
                  var i = this;
                  return setTimeout(function () {
                      return ('string' == typeof t ? i[t] : t).apply(
                          i,
                          arguments
                      );
                  }, e || 0);
              },
              _hoverable: function (e) {
                  (this.hoverable = this.hoverable.add(e)),
                      this._on(e, {
                          mouseenter: function (e) {
                              this._addClass(
                                  t(e.currentTarget),
                                  null,
                                  'ui-state-hover'
                              );
                          },
                          mouseleave: function (e) {
                              this._removeClass(
                                  t(e.currentTarget),
                                  null,
                                  'ui-state-hover'
                              );
                          },
                      });
              },
              _focusable: function (e) {
                  (this.focusable = this.focusable.add(e)),
                      this._on(e, {
                          focusin: function (e) {
                              this._addClass(
                                  t(e.currentTarget),
                                  null,
                                  'ui-state-focus'
                              );
                          },
                          focusout: function (e) {
                              this._removeClass(
                                  t(e.currentTarget),
                                  null,
                                  'ui-state-focus'
                              );
                          },
                      });
              },
              _trigger: function (e, i, s) {
                  var n,
                      o,
                      a = this.options[e];
                  if (
                      ((s = s || {}),
                      ((i = t.Event(i)).type = (e === this.widgetEventPrefix
                          ? e
                          : this.widgetEventPrefix + e
                      ).toLowerCase()),
                      (i.target = this.element[0]),
                      (o = i.originalEvent))
                  )
                      for (n in o) n in i || (i[n] = o[n]);
                  return (
                      this.element.trigger(i, s),
                      !(
                          (t.isFunction(a) &&
                              !1 === a.apply(this.element[0], [i].concat(s))) ||
                          i.isDefaultPrevented()
                      )
                  );
              },
          }),
          t.each({ show: 'fadeIn', hide: 'fadeOut' }, function (e, i) {
              t.Widget.prototype['_' + e] = function (s, n, o) {
                  'string' == typeof n && (n = { effect: n });
                  var a,
                      r = n
                          ? !0 === n || 'number' == typeof n
                              ? i
                              : n.effect || i
                          : e;
                  'number' == typeof (n = n || {}) && (n = { duration: n }),
                      (a = !t.isEmptyObject(n)),
                      (n.complete = o),
                      n.delay && s.delay(n.delay),
                      a && t.effects && t.effects.effect[r]
                          ? s[e](n)
                          : r !== e && s[r]
                          ? s[r](n.duration, n.easing, o)
                          : s.queue(function (i) {
                                t(this)[e](), o && o.call(s[0]), i();
                            });
              };
          }),
          t.widget,
          (function () {
              function e(t, e, i) {
                  return [
                      parseFloat(t[0]) * (u.test(t[0]) ? e / 100 : 1),
                      parseFloat(t[1]) * (u.test(t[1]) ? i / 100 : 1),
                  ];
              }
              function i(e, i) {
                  return parseInt(t.css(e, i), 10) || 0;
              }
              function s(e) {
                  var i = e[0];
                  return 9 === i.nodeType
                      ? {
                            width: e.width(),
                            height: e.height(),
                            offset: { top: 0, left: 0 },
                        }
                      : t.isWindow(i)
                      ? {
                            width: e.width(),
                            height: e.height(),
                            offset: { top: e.scrollTop(), left: e.scrollLeft() },
                        }
                      : i.preventDefault
                      ? {
                            width: 0,
                            height: 0,
                            offset: { top: i.pageY, left: i.pageX },
                        }
                      : {
                            width: e.outerWidth(),
                            height: e.outerHeight(),
                            offset: e.offset(),
                        };
              }
              var n,
                  o = Math.max,
                  a = Math.abs,
                  r = /left|center|right/,
                  h = /top|center|bottom/,
                  l = /[\+\-]\d+(\.[\d]+)?%?/,
                  c = /^\w+/,
                  u = /%$/,
                  d = t.fn.position;
              (t.position = {
                  scrollbarWidth: function () {
                      if (void 0 !== n) return n;
                      var e,
                          i,
                          s = t(
                              "<div style='display:block;position:absolute;width:50px;height:50px;overflow:hidden;'><div style='height:100px;width:auto;'></div></div>"
                          ),
                          o = s.children()[0];
                      return (
                          t('body').append(s),
                          (e = o.offsetWidth),
                          s.css('overflow', 'scroll'),
                          e === (i = o.offsetWidth) && (i = s[0].clientWidth),
                          s.remove(),
                          (n = e - i)
                      );
                  },
                  getScrollInfo: function (e) {
                      var i =
                              e.isWindow || e.isDocument
                                  ? ''
                                  : e.element.css('overflow-x'),
                          s =
                              e.isWindow || e.isDocument
                                  ? ''
                                  : e.element.css('overflow-y'),
                          n =
                              'scroll' === i ||
                              ('auto' === i &&
                                  e.width < e.element[0].scrollWidth);
                      return {
                          width:
                              'scroll' === s ||
                              ('auto' === s &&
                                  e.height < e.element[0].scrollHeight)
                                  ? t.position.scrollbarWidth()
                                  : 0,
                          height: n ? t.position.scrollbarWidth() : 0,
                      };
                  },
                  getWithinInfo: function (e) {
                      var i = t(e || window),
                          s = t.isWindow(i[0]),
                          n = !!i[0] && 9 === i[0].nodeType;
                      return {
                          element: i,
                          isWindow: s,
                          isDocument: n,
                          offset: !s && !n ? t(e).offset() : { left: 0, top: 0 },
                          scrollLeft: i.scrollLeft(),
                          scrollTop: i.scrollTop(),
                          width: i.outerWidth(),
                          height: i.outerHeight(),
                      };
                  },
              }),
                  (t.fn.position = function (n) {
                      if (!n || !n.of) return d.apply(this, arguments);
                      n = t.extend({}, n);
                      var u,
                          p,
                          f,
                          g,
                          m,
                          _,
                          v = t(n.of),
                          b = t.position.getWithinInfo(n.within),
                          y = t.position.getScrollInfo(b),
                          w = (n.collision || 'flip').split(' '),
                          k = {};
                      return (
                          (_ = s(v)),
                          v[0].preventDefault && (n.at = 'left top'),
                          (p = _.width),
                          (f = _.height),
                          (g = _.offset),
                          (m = t.extend({}, g)),
                          t.each(['my', 'at'], function () {
                              var t,
                                  e,
                                  i = (n[this] || '').split(' ');
                              1 === i.length &&
                                  (i = r.test(i[0])
                                      ? i.concat(['center'])
                                      : h.test(i[0])
                                      ? ['center'].concat(i)
                                      : ['center', 'center']),
                                  (i[0] = r.test(i[0]) ? i[0] : 'center'),
                                  (i[1] = h.test(i[1]) ? i[1] : 'center'),
                                  (t = l.exec(i[0])),
                                  (e = l.exec(i[1])),
                                  (k[this] = [t ? t[0] : 0, e ? e[0] : 0]),
                                  (n[this] = [c.exec(i[0])[0], c.exec(i[1])[0]]);
                          }),
                          1 === w.length && (w[1] = w[0]),
                          'right' === n.at[0]
                              ? (m.left += p)
                              : 'center' === n.at[0] && (m.left += p / 2),
                          'bottom' === n.at[1]
                              ? (m.top += f)
                              : 'center' === n.at[1] && (m.top += f / 2),
                          (u = e(k.at, p, f)),
                          (m.left += u[0]),
                          (m.top += u[1]),
                          this.each(function () {
                              var s,
                                  r,
                                  h = t(this),
                                  l = h.outerWidth(),
                                  c = h.outerHeight(),
                                  d = i(this, 'marginLeft'),
                                  _ = i(this, 'marginTop'),
                                  x = l + d + i(this, 'marginRight') + y.width,
                                  C = c + _ + i(this, 'marginBottom') + y.height,
                                  D = t.extend({}, m),
                                  I = e(k.my, h.outerWidth(), h.outerHeight());
                              'right' === n.my[0]
                                  ? (D.left -= l)
                                  : 'center' === n.my[0] && (D.left -= l / 2),
                                  'bottom' === n.my[1]
                                      ? (D.top -= c)
                                      : 'center' === n.my[1] && (D.top -= c / 2),
                                  (D.left += I[0]),
                                  (D.top += I[1]),
                                  (s = { marginLeft: d, marginTop: _ }),
                                  t.each(['left', 'top'], function (e, i) {
                                      t.ui.position[w[e]] &&
                                          t.ui.position[w[e]][i](D, {
                                              targetWidth: p,
                                              targetHeight: f,
                                              elemWidth: l,
                                              elemHeight: c,
                                              collisionPosition: s,
                                              collisionWidth: x,
                                              collisionHeight: C,
                                              offset: [u[0] + I[0], u[1] + I[1]],
                                              my: n.my,
                                              at: n.at,
                                              within: b,
                                              elem: h,
                                          });
                                  }),
                                  n.using &&
                                      (r = function (t) {
                                          var e = g.left - D.left,
                                              i = e + p - l,
                                              s = g.top - D.top,
                                              r = s + f - c,
                                              u = {
                                                  target: {
                                                      element: v,
                                                      left: g.left,
                                                      top: g.top,
                                                      width: p,
                                                      height: f,
                                                  },
                                                  element: {
                                                      element: h,
                                                      left: D.left,
                                                      top: D.top,
                                                      width: l,
                                                      height: c,
                                                  },
                                                  horizontal:
                                                      0 > i
                                                          ? 'left'
                                                          : e > 0
                                                          ? 'right'
                                                          : 'center',
                                                  vertical:
                                                      0 > r
                                                          ? 'top'
                                                          : s > 0
                                                          ? 'bottom'
                                                          : 'middle',
                                              };
                                          l > p &&
                                              p > a(e + i) &&
                                              (u.horizontal = 'center'),
                                              c > f &&
                                                  f > a(s + r) &&
                                                  (u.vertical = 'middle'),
                                              (u.important =
                                                  o(a(e), a(i)) > o(a(s), a(r))
                                                      ? 'horizontal'
                                                      : 'vertical'),
                                              n.using.call(this, t, u);
                                      }),
                                  h.offset(t.extend(D, { using: r }));
                          })
                      );
                  }),
                  (t.ui.position = {
                      fit: {
                          left: function (t, e) {
                              var i,
                                  s = e.within,
                                  n = s.isWindow ? s.scrollLeft : s.offset.left,
                                  a = s.width,
                                  r = t.left - e.collisionPosition.marginLeft,
                                  h = n - r,
                                  l = r + e.collisionWidth - a - n;
                              e.collisionWidth > a
                                  ? h > 0 && 0 >= l
                                      ? ((i =
                                            t.left +
                                            h +
                                            e.collisionWidth -
                                            a -
                                            n),
                                        (t.left += h - i))
                                      : (t.left =
                                            l > 0 && 0 >= h
                                                ? n
                                                : h > l
                                                ? n + a - e.collisionWidth
                                                : n)
                                  : h > 0
                                  ? (t.left += h)
                                  : l > 0
                                  ? (t.left -= l)
                                  : (t.left = o(t.left - r, t.left));
                          },
                          top: function (t, e) {
                              var i,
                                  s = e.within,
                                  n = s.isWindow ? s.scrollTop : s.offset.top,
                                  a = e.within.height,
                                  r = t.top - e.collisionPosition.marginTop,
                                  h = n - r,
                                  l = r + e.collisionHeight - a - n;
                              e.collisionHeight > a
                                  ? h > 0 && 0 >= l
                                      ? ((i =
                                            t.top +
                                            h +
                                            e.collisionHeight -
                                            a -
                                            n),
                                        (t.top += h - i))
                                      : (t.top =
                                            l > 0 && 0 >= h
                                                ? n
                                                : h > l
                                                ? n + a - e.collisionHeight
                                                : n)
                                  : h > 0
                                  ? (t.top += h)
                                  : l > 0
                                  ? (t.top -= l)
                                  : (t.top = o(t.top - r, t.top));
                          },
                      },
                      flip: {
                          left: function (t, e) {
                              var i,
                                  s,
                                  n = e.within,
                                  o = n.offset.left + n.scrollLeft,
                                  r = n.width,
                                  h = n.isWindow ? n.scrollLeft : n.offset.left,
                                  l = t.left - e.collisionPosition.marginLeft,
                                  c = l - h,
                                  u = l + e.collisionWidth - r - h,
                                  d =
                                      'left' === e.my[0]
                                          ? -e.elemWidth
                                          : 'right' === e.my[0]
                                          ? e.elemWidth
                                          : 0,
                                  p =
                                      'left' === e.at[0]
                                          ? e.targetWidth
                                          : 'right' === e.at[0]
                                          ? -e.targetWidth
                                          : 0,
                                  f = -2 * e.offset[0];
                              0 > c
                                  ? (0 >
                                        (i =
                                            t.left +
                                            d +
                                            p +
                                            f +
                                            e.collisionWidth -
                                            r -
                                            o) ||
                                        a(c) > i) &&
                                    (t.left += d + p + f)
                                  : u > 0 &&
                                    ((s =
                                        t.left -
                                        e.collisionPosition.marginLeft +
                                        d +
                                        p +
                                        f -
                                        h) > 0 ||
                                        u > a(s)) &&
                                    (t.left += d + p + f);
                          },
                          top: function (t, e) {
                              var i,
                                  s,
                                  n = e.within,
                                  o = n.offset.top + n.scrollTop,
                                  r = n.height,
                                  h = n.isWindow ? n.scrollTop : n.offset.top,
                                  l = t.top - e.collisionPosition.marginTop,
                                  c = l - h,
                                  u = l + e.collisionHeight - r - h,
                                  d =
                                      'top' === e.my[1]
                                          ? -e.elemHeight
                                          : 'bottom' === e.my[1]
                                          ? e.elemHeight
                                          : 0,
                                  p =
                                      'top' === e.at[1]
                                          ? e.targetHeight
                                          : 'bottom' === e.at[1]
                                          ? -e.targetHeight
                                          : 0,
                                  f = -2 * e.offset[1];
                              0 > c
                                  ? (0 >
                                        (s =
                                            t.top +
                                            d +
                                            p +
                                            f +
                                            e.collisionHeight -
                                            r -
                                            o) ||
                                        a(c) > s) &&
                                    (t.top += d + p + f)
                                  : u > 0 &&
                                    ((i =
                                        t.top -
                                        e.collisionPosition.marginTop +
                                        d +
                                        p +
                                        f -
                                        h) > 0 ||
                                        u > a(i)) &&
                                    (t.top += d + p + f);
                          },
                      },
                      flipfit: {
                          left: function () {
                              t.ui.position.flip.left.apply(this, arguments),
                                  t.ui.position.fit.left.apply(this, arguments);
                          },
                          top: function () {
                              t.ui.position.flip.top.apply(this, arguments),
                                  t.ui.position.fit.top.apply(this, arguments);
                          },
                      },
                  });
          })(),
          t.ui.position,
          t.extend(t.expr[':'], {
              data: t.expr.createPseudo
                  ? t.expr.createPseudo(function (e) {
                        return function (i) {
                            return !!t.data(i, e);
                        };
                    })
                  : function (e, i, s) {
                        return !!t.data(e, s[3]);
                    },
          }),
          t.fn.extend({
              disableSelection: (function () {
                  var t =
                      'onselectstart' in document.createElement('div')
                          ? 'selectstart'
                          : 'mousedown';
                  return function () {
                      return this.on(t + '.ui-disableSelection', function (t) {
                          t.preventDefault();
                      });
                  };
              })(),
              enableSelection: function () {
                  return this.off('.ui-disableSelection');
              },
          });
      var h = 'ui-effects-',
          l = 'ui-effects-style',
          c = 'ui-effects-animated',
          u = t;
      (t.effects = { effect: {} }),
          (function (t, e) {
              function i(t, e, i) {
                  var s = c[e.type] || {};
                  return null == t
                      ? i || !e.def
                          ? null
                          : e.def
                      : ((t = s.floor ? ~~t : parseFloat(t)),
                        isNaN(t)
                            ? e.def
                            : s.mod
                            ? (t + s.mod) % s.mod
                            : 0 > t
                            ? 0
                            : t > s.max
                            ? s.max
                            : t);
              }
              function s(i) {
                  var s = h(),
                      n = (s._rgba = []);
                  return (
                      (i = i.toLowerCase()),
                      p(r, function (t, o) {
                          var a,
                              r = o.re.exec(i),
                              h = r && o.parse(r),
                              c = o.space || 'rgba';
                          return h
                              ? ((a = s[c](h)),
                                (s[l[c].cache] = a[l[c].cache]),
                                (n = s._rgba = a._rgba),
                                !1)
                              : e;
                      }),
                      n.length
                          ? ('0,0,0,0' === n.join() && t.extend(n, o.transparent),
                            s)
                          : o[i]
                  );
              }
              function n(t, e, i) {
                  return 1 > 6 * (i = (i + 1) % 1)
                      ? t + 6 * (e - t) * i
                      : 1 > 2 * i
                      ? e
                      : 2 > 3 * i
                      ? t + 6 * (e - t) * (2 / 3 - i)
                      : t;
              }
              var o,
                  a = /^([\-+])=\s*(\d+\.?\d*)/,
                  r = [
                      {
                          re: /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,
                          parse: function (t) {
                              return [t[1], t[2], t[3], t[4]];
                          },
                      },
                      {
                          re: /rgba?\(\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,
                          parse: function (t) {
                              return [
                                  2.55 * t[1],
                                  2.55 * t[2],
                                  2.55 * t[3],
                                  t[4],
                              ];
                          },
                      },
                      {
                          re: /#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/,
                          parse: function (t) {
                              return [
                                  parseInt(t[1], 16),
                                  parseInt(t[2], 16),
                                  parseInt(t[3], 16),
                              ];
                          },
                      },
                      {
                          re: /#([a-f0-9])([a-f0-9])([a-f0-9])/,
                          parse: function (t) {
                              return [
                                  parseInt(t[1] + t[1], 16),
                                  parseInt(t[2] + t[2], 16),
                                  parseInt(t[3] + t[3], 16),
                              ];
                          },
                      },
                      {
                          re: /hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\%\s*,\s*(\d+(?:\.\d+)?)\%\s*(?:,\s*(\d?(?:\.\d+)?)\s*)?\)/,
                          space: 'hsla',
                          parse: function (t) {
                              return [t[1], t[2] / 100, t[3] / 100, t[4]];
                          },
                      },
                  ],
                  h = (t.Color = function (e, i, s, n) {
                      return new t.Color.fn.parse(e, i, s, n);
                  }),
                  l = {
                      rgba: {
                          props: {
                              red: { idx: 0, type: 'byte' },
                              green: { idx: 1, type: 'byte' },
                              blue: { idx: 2, type: 'byte' },
                          },
                      },
                      hsla: {
                          props: {
                              hue: { idx: 0, type: 'degrees' },
                              saturation: { idx: 1, type: 'percent' },
                              lightness: { idx: 2, type: 'percent' },
                          },
                      },
                  },
                  c = {
                      byte: { floor: !0, max: 255 },
                      percent: { max: 1 },
                      degrees: { mod: 360, floor: !0 },
                  },
                  u = (h.support = {}),
                  d = t('<p>')[0],
                  p = t.each;
              (d.style.cssText = 'background-color:rgba(1,1,1,.5)'),
                  (u.rgba = d.style.backgroundColor.indexOf('rgba') > -1),
                  p(l, function (t, e) {
                      (e.cache = '_' + t),
                          (e.props.alpha = { idx: 3, type: 'percent', def: 1 });
                  }),
                  (h.fn = t.extend(h.prototype, {
                      parse: function (n, a, r, c) {
                          if (n === e)
                              return (
                                  (this._rgba = [null, null, null, null]), this
                              );
                          (n.jquery || n.nodeType) &&
                              ((n = t(n).css(a)), (a = e));
                          var u = this,
                              d = t.type(n),
                              f = (this._rgba = []);
                          return (
                              a !== e && ((n = [n, a, r, c]), (d = 'array')),
                              'string' === d
                                  ? this.parse(s(n) || o._default)
                                  : 'array' === d
                                  ? (p(l.rgba.props, function (t, e) {
                                        f[e.idx] = i(n[e.idx], e);
                                    }),
                                    this)
                                  : 'object' === d
                                  ? (p(
                                        l,
                                        n instanceof h
                                            ? function (t, e) {
                                                  n[e.cache] &&
                                                      (u[e.cache] = n[
                                                          e.cache
                                                      ].slice());
                                              }
                                            : function (e, s) {
                                                  var o = s.cache;
                                                  p(s.props, function (t, e) {
                                                      if (!u[o] && s.to) {
                                                          if (
                                                              'alpha' === t ||
                                                              null == n[t]
                                                          )
                                                              return;
                                                          u[o] = s.to(u._rgba);
                                                      }
                                                      u[o][e.idx] = i(
                                                          n[t],
                                                          e,
                                                          !0
                                                      );
                                                  }),
                                                      u[o] &&
                                                          0 >
                                                              t.inArray(
                                                                  null,
                                                                  u[o].slice(0, 3)
                                                              ) &&
                                                          ((u[o][3] = 1),
                                                          s.from &&
                                                              (u._rgba = s.from(
                                                                  u[o]
                                                              )));
                                              }
                                    ),
                                    this)
                                  : e
                          );
                      },
                      is: function (t) {
                          var i = h(t),
                              s = !0,
                              n = this;
                          return (
                              p(l, function (t, o) {
                                  var a,
                                      r = i[o.cache];
                                  return (
                                      r &&
                                          ((a =
                                              n[o.cache] ||
                                              (o.to && o.to(n._rgba)) ||
                                              []),
                                          p(o.props, function (t, i) {
                                              return null != r[i.idx]
                                                  ? (s = r[i.idx] === a[i.idx])
                                                  : e;
                                          })),
                                      s
                                  );
                              }),
                              s
                          );
                      },
                      _space: function () {
                          var t = [],
                              e = this;
                          return (
                              p(l, function (i, s) {
                                  e[s.cache] && t.push(i);
                              }),
                              t.pop()
                          );
                      },
                      transition: function (t, e) {
                          var s = h(t),
                              n = s._space(),
                              o = l[n],
                              a = 0 === this.alpha() ? h('transparent') : this,
                              r = a[o.cache] || o.to(a._rgba),
                              u = r.slice();
                          return (
                              (s = s[o.cache]),
                              p(o.props, function (t, n) {
                                  var o = n.idx,
                                      a = r[o],
                                      h = s[o],
                                      l = c[n.type] || {};
                                  null !== h &&
                                      (null === a
                                          ? (u[o] = h)
                                          : (l.mod &&
                                                (h - a > l.mod / 2
                                                    ? (a += l.mod)
                                                    : a - h > l.mod / 2 &&
                                                      (a -= l.mod)),
                                            (u[o] = i((h - a) * e + a, n))));
                              }),
                              this[n](u)
                          );
                      },
                      blend: function (e) {
                          if (1 === this._rgba[3]) return this;
                          var i = this._rgba.slice(),
                              s = i.pop(),
                              n = h(e)._rgba;
                          return h(
                              t.map(i, function (t, e) {
                                  return (1 - s) * n[e] + s * t;
                              })
                          );
                      },
                      toRgbaString: function () {
                          var e = 'rgba(',
                              i = t.map(this._rgba, function (t, e) {
                                  return null == t ? (e > 2 ? 1 : 0) : t;
                              });
                          return (
                              1 === i[3] && (i.pop(), (e = 'rgb(')),
                              e + i.join() + ')'
                          );
                      },
                      toHslaString: function () {
                          var e = 'hsla(',
                              i = t.map(this.hsla(), function (t, e) {
                                  return (
                                      null == t && (t = e > 2 ? 1 : 0),
                                      e &&
                                          3 > e &&
                                          (t = Math.round(100 * t) + '%'),
                                      t
                                  );
                              });
                          return (
                              1 === i[3] && (i.pop(), (e = 'hsl(')),
                              e + i.join() + ')'
                          );
                      },
                      toHexString: function (e) {
                          var i = this._rgba.slice(),
                              s = i.pop();
                          return (
                              e && i.push(~~(255 * s)),
                              '#' +
                                  t
                                      .map(i, function (t) {
                                          return 1 ===
                                              (t = (t || 0).toString(16)).length
                                              ? '0' + t
                                              : t;
                                      })
                                      .join('')
                          );
                      },
                      toString: function () {
                          return 0 === this._rgba[3]
                              ? 'transparent'
                              : this.toRgbaString();
                      },
                  })),
                  (h.fn.parse.prototype = h.fn),
                  (l.hsla.to = function (t) {
                      if (null == t[0] || null == t[1] || null == t[2])
                          return [null, null, null, t[3]];
                      var e,
                          i,
                          s = t[0] / 255,
                          n = t[1] / 255,
                          o = t[2] / 255,
                          a = t[3],
                          r = Math.max(s, n, o),
                          h = Math.min(s, n, o),
                          l = r - h,
                          c = r + h,
                          u = 0.5 * c;
                      return (
                          (e =
                              h === r
                                  ? 0
                                  : s === r
                                  ? (60 * (n - o)) / l + 360
                                  : n === r
                                  ? (60 * (o - s)) / l + 120
                                  : (60 * (s - n)) / l + 240),
                          (i = 0 === l ? 0 : 0.5 >= u ? l / c : l / (2 - c)),
                          [Math.round(e) % 360, i, u, null == a ? 1 : a]
                      );
                  }),
                  (l.hsla.from = function (t) {
                      if (null == t[0] || null == t[1] || null == t[2])
                          return [null, null, null, t[3]];
                      var e = t[0] / 360,
                          i = t[1],
                          s = t[2],
                          o = t[3],
                          a = 0.5 >= s ? s * (1 + i) : s + i - s * i,
                          r = 2 * s - a;
                      return [
                          Math.round(255 * n(r, a, e + 1 / 3)),
                          Math.round(255 * n(r, a, e)),
                          Math.round(255 * n(r, a, e - 1 / 3)),
                          o,
                      ];
                  }),
                  p(l, function (s, n) {
                      var o = n.props,
                          r = n.cache,
                          l = n.to,
                          c = n.from;
                      (h.fn[s] = function (s) {
                          if (
                              (l && !this[r] && (this[r] = l(this._rgba)),
                              s === e)
                          )
                              return this[r].slice();
                          var n,
                              a = t.type(s),
                              u = 'array' === a || 'object' === a ? s : arguments,
                              d = this[r].slice();
                          return (
                              p(o, function (t, e) {
                                  var s = u['object' === a ? t : e.idx];
                                  null == s && (s = d[e.idx]),
                                      (d[e.idx] = i(s, e));
                              }),
                              c ? (((n = h(c(d)))[r] = d), n) : h(d)
                          );
                      }),
                          p(o, function (e, i) {
                              h.fn[e] ||
                                  (h.fn[e] = function (n) {
                                      var o,
                                          r = t.type(n),
                                          h =
                                              'alpha' === e
                                                  ? this._hsla
                                                      ? 'hsla'
                                                      : 'rgba'
                                                  : s,
                                          l = this[h](),
                                          c = l[i.idx];
                                      return 'undefined' === r
                                          ? c
                                          : ('function' === r &&
                                                ((n = n.call(this, c)),
                                                (r = t.type(n))),
                                            null == n && i.empty
                                                ? this
                                                : ('string' === r &&
                                                      (o = a.exec(n)) &&
                                                      (n =
                                                          c +
                                                          parseFloat(o[2]) *
                                                              ('+' === o[1]
                                                                  ? 1
                                                                  : -1)),
                                                  (l[i.idx] = n),
                                                  this[h](l)));
                                  });
                          });
                  }),
                  (h.hook = function (e) {
                      var i = e.split(' ');
                      p(i, function (e, i) {
                          (t.cssHooks[i] = {
                              set: function (e, n) {
                                  var o,
                                      a,
                                      r = '';
                                  if (
                                      'transparent' !== n &&
                                      ('string' !== t.type(n) || (o = s(n)))
                                  ) {
                                      if (
                                          ((n = h(o || n)),
                                          !u.rgba && 1 !== n._rgba[3])
                                      ) {
                                          for (
                                              a =
                                                  'backgroundColor' === i
                                                      ? e.parentNode
                                                      : e;
                                              ('' === r || 'transparent' === r) &&
                                              a &&
                                              a.style;

                                          )
                                              try {
                                                  (r = t.css(
                                                      a,
                                                      'backgroundColor'
                                                  )),
                                                      (a = a.parentNode);
                                              } catch (t) {}
                                          n = n.blend(
                                              r && 'transparent' !== r
                                                  ? r
                                                  : '_default'
                                          );
                                      }
                                      n = n.toRgbaString();
                                  }
                                  try {
                                      e.style[i] = n;
                                  } catch (t) {}
                              },
                          }),
                              (t.fx.step[i] = function (e) {
                                  e.colorInit ||
                                      ((e.start = h(e.elem, i)),
                                      (e.end = h(e.end)),
                                      (e.colorInit = !0)),
                                      t.cssHooks[i].set(
                                          e.elem,
                                          e.start.transition(e.end, e.pos)
                                      );
                              });
                      });
                  }),
                  h.hook(
                      'backgroundColor borderBottomColor borderLeftColor borderRightColor borderTopColor color columnRuleColor outlineColor textDecorationColor textEmphasisColor'
                  ),
                  (t.cssHooks.borderColor = {
                      expand: function (t) {
                          var e = {};
                          return (
                              p(['Top', 'Right', 'Bottom', 'Left'], function (
                                  i,
                                  s
                              ) {
                                  e['border' + s + 'Color'] = t;
                              }),
                              e
                          );
                      },
                  }),
                  (o = t.Color.names = {
                      aqua: '#00ffff',
                      black: '#000000',
                      blue: '#0000ff',
                      fuchsia: '#ff00ff',
                      gray: '#808080',
                      green: '#008000',
                      lime: '#00ff00',
                      maroon: '#800000',
                      navy: '#000080',
                      olive: '#808000',
                      purple: '#800080',
                      red: '#ff0000',
                      silver: '#c0c0c0',
                      teal: '#008080',
                      white: '#ffffff',
                      yellow: '#ffff00',
                      transparent: [null, null, null, 0],
                      _default: '#ffffff',
                  });
          })(u),
          (function () {
              function e(e) {
                  var i,
                      s,
                      n = e.ownerDocument.defaultView
                          ? e.ownerDocument.defaultView.getComputedStyle(e, null)
                          : e.currentStyle,
                      o = {};
                  if (n && n.length && n[0] && n[n[0]])
                      for (s = n.length; s--; )
                          'string' == typeof n[(i = n[s])] &&
                              (o[t.camelCase(i)] = n[i]);
                  else for (i in n) 'string' == typeof n[i] && (o[i] = n[i]);
                  return o;
              }
              function i(e, i) {
                  var s,
                      o,
                      a = {};
                  for (s in i)
                      (o = i[s]),
                          e[s] !== o &&
                              (n[s] ||
                                  ((t.fx.step[s] || !isNaN(parseFloat(o))) &&
                                      (a[s] = o)));
                  return a;
              }
              var s = ['add', 'remove', 'toggle'],
                  n = {
                      border: 1,
                      borderBottom: 1,
                      borderColor: 1,
                      borderLeft: 1,
                      borderRight: 1,
                      borderTop: 1,
                      borderWidth: 1,
                      margin: 1,
                      padding: 1,
                  };
              t.each(
                  [
                      'borderLeftStyle',
                      'borderRightStyle',
                      'borderBottomStyle',
                      'borderTopStyle',
                  ],
                  function (e, i) {
                      t.fx.step[i] = function (t) {
                          (('none' !== t.end && !t.setAttr) ||
                              (1 === t.pos && !t.setAttr)) &&
                              (u.style(t.elem, i, t.end), (t.setAttr = !0));
                      };
                  }
              ),
                  t.fn.addBack ||
                      (t.fn.addBack = function (t) {
                          return this.add(
                              null == t
                                  ? this.prevObject
                                  : this.prevObject.filter(t)
                          );
                      }),
                  (t.effects.animateClass = function (n, o, a, r) {
                      var h = t.speed(o, a, r);
                      return this.queue(function () {
                          var o,
                              a = t(this),
                              r = a.attr('class') || '',
                              l = h.children ? a.find('*').addBack() : a;
                          (l = l.map(function () {
                              return { el: t(this), start: e(this) };
                          })),
                              (o = function () {
                                  t.each(s, function (t, e) {
                                      n[e] && a[e + 'Class'](n[e]);
                                  });
                              })(),
                              (l = l.map(function () {
                                  return (
                                      (this.end = e(this.el[0])),
                                      (this.diff = i(this.start, this.end)),
                                      this
                                  );
                              })),
                              a.attr('class', r),
                              (l = l.map(function () {
                                  var e = this,
                                      i = t.Deferred(),
                                      s = t.extend({}, h, {
                                          queue: !1,
                                          complete: function () {
                                              i.resolve(e);
                                          },
                                      });
                                  return (
                                      this.el.animate(this.diff, s), i.promise()
                                  );
                              })),
                              t.when.apply(t, l.get()).done(function () {
                                  o(),
                                      t.each(arguments, function () {
                                          var e = this.el;
                                          t.each(this.diff, function (t) {
                                              e.css(t, '');
                                          });
                                      }),
                                      h.complete.call(a[0]);
                              });
                      });
                  }),
                  t.fn.extend({
                      addClass: (function (e) {
                          return function (i, s, n, o) {
                              return s
                                  ? t.effects.animateClass.call(
                                        this,
                                        { add: i },
                                        s,
                                        n,
                                        o
                                    )
                                  : e.apply(this, arguments);
                          };
                      })(t.fn.addClass),
                      removeClass: (function (e) {
                          return function (i, s, n, o) {
                              return arguments.length > 1
                                  ? t.effects.animateClass.call(
                                        this,
                                        { remove: i },
                                        s,
                                        n,
                                        o
                                    )
                                  : e.apply(this, arguments);
                          };
                      })(t.fn.removeClass),
                      toggleClass: (function (e) {
                          return function (i, s, n, o, a) {
                              return 'boolean' == typeof s || void 0 === s
                                  ? n
                                      ? t.effects.animateClass.call(
                                            this,
                                            s ? { add: i } : { remove: i },
                                            n,
                                            o,
                                            a
                                        )
                                      : e.apply(this, arguments)
                                  : t.effects.animateClass.call(
                                        this,
                                        { toggle: i },
                                        s,
                                        n,
                                        o
                                    );
                          };
                      })(t.fn.toggleClass),
                      switchClass: function (e, i, s, n, o) {
                          return t.effects.animateClass.call(
                              this,
                              { add: i, remove: e },
                              s,
                              n,
                              o
                          );
                      },
                  });
          })(),
          (function () {
              function e(e, i, s, n) {
                  return (
                      t.isPlainObject(e) && ((i = e), (e = e.effect)),
                      (e = { effect: e }),
                      null == i && (i = {}),
                      t.isFunction(i) && ((n = i), (s = null), (i = {})),
                      ('number' == typeof i || t.fx.speeds[i]) &&
                          ((n = s), (s = i), (i = {})),
                      t.isFunction(s) && ((n = s), (s = null)),
                      i && t.extend(e, i),
                      (s = s || i.duration),
                      (e.duration = t.fx.off
                          ? 0
                          : 'number' == typeof s
                          ? s
                          : s in t.fx.speeds
                          ? t.fx.speeds[s]
                          : t.fx.speeds._default),
                      (e.complete = n || i.complete),
                      e
                  );
              }
              function i(e) {
                  return (
                      !(e && 'number' != typeof e && !t.fx.speeds[e]) ||
                      ('string' == typeof e && !t.effects.effect[e]) ||
                      !!t.isFunction(e) ||
                      ('object' == typeof e && !e.effect)
                  );
              }
              function s(t, e) {
                  var i = e.outerWidth(),
                      s = e.outerHeight(),
                      n = /^rect\((-?\d*\.?\d*px|-?\d+%|auto),?\s*(-?\d*\.?\d*px|-?\d+%|auto),?\s*(-?\d*\.?\d*px|-?\d+%|auto),?\s*(-?\d*\.?\d*px|-?\d+%|auto)\)$/.exec(
                          t
                      ) || ['', 0, i, s, 0];
                  return {
                      top: parseFloat(n[1]) || 0,
                      right: 'auto' === n[2] ? i : parseFloat(n[2]),
                      bottom: 'auto' === n[3] ? s : parseFloat(n[3]),
                      left: parseFloat(n[4]) || 0,
                  };
              }
              t.expr &&
                  t.expr.filters &&
                  t.expr.filters.animated &&
                  (t.expr.filters.animated = (function (e) {
                      return function (i) {
                          return !!t(i).data(c) || e(i);
                      };
                  })(t.expr.filters.animated)),
                  !1 !== t.uiBackCompat &&
                      t.extend(t.effects, {
                          save: function (t, e) {
                              for (var i = 0, s = e.length; s > i; i++)
                                  null !== e[i] &&
                                      t.data(h + e[i], t[0].style[e[i]]);
                          },
                          restore: function (t, e) {
                              for (var i, s = 0, n = e.length; n > s; s++)
                                  null !== e[s] &&
                                      ((i = t.data(h + e[s])), t.css(e[s], i));
                          },
                          setMode: function (t, e) {
                              return (
                                  'toggle' === e &&
                                      (e = t.is(':hidden') ? 'show' : 'hide'),
                                  e
                              );
                          },
                          createWrapper: function (e) {
                              if (e.parent().is('.ui-effects-wrapper'))
                                  return e.parent();
                              var i = {
                                      width: e.outerWidth(!0),
                                      height: e.outerHeight(!0),
                                      float: e.css('float'),
                                  },
                                  s = t('<div></div>')
                                      .addClass('ui-effects-wrapper')
                                      .css({
                                          fontSize: '100%',
                                          background: 'transparent',
                                          border: 'none',
                                          margin: 0,
                                          padding: 0,
                                      }),
                                  n = { width: e.width(), height: e.height() },
                                  o = document.activeElement;
                              try {
                                  o.id;
                              } catch (t) {
                                  o = document.body;
                              }
                              return (
                                  e.wrap(s),
                                  (e[0] === o || t.contains(e[0], o)) &&
                                      t(o).trigger('focus'),
                                  (s = e.parent()),
                                  'static' === e.css('position')
                                      ? (s.css({ position: 'relative' }),
                                        e.css({ position: 'relative' }))
                                      : (t.extend(i, {
                                            position: e.css('position'),
                                            zIndex: e.css('z-index'),
                                        }),
                                        t.each(
                                            ['top', 'left', 'bottom', 'right'],
                                            function (t, s) {
                                                (i[s] = e.css(s)),
                                                    isNaN(parseInt(i[s], 10)) &&
                                                        (i[s] = 'auto');
                                            }
                                        ),
                                        e.css({
                                            position: 'relative',
                                            top: 0,
                                            left: 0,
                                            right: 'auto',
                                            bottom: 'auto',
                                        })),
                                  e.css(n),
                                  s.css(i).show()
                              );
                          },
                          removeWrapper: function (e) {
                              var i = document.activeElement;
                              return (
                                  e.parent().is('.ui-effects-wrapper') &&
                                      (e.parent().replaceWith(e),
                                      (e[0] === i || t.contains(e[0], i)) &&
                                          t(i).trigger('focus')),
                                  e
                              );
                          },
                      }),
                  t.extend(t.effects, {
                      version: '1.12.1',
                      define: function (e, i, s) {
                          return (
                              s || ((s = i), (i = 'effect')),
                              (t.effects.effect[e] = s),
                              (t.effects.effect[e].mode = i),
                              s
                          );
                      },
                      scaledDimensions: function (t, e, i) {
                          if (0 === e)
                              return {
                                  height: 0,
                                  width: 0,
                                  outerHeight: 0,
                                  outerWidth: 0,
                              };
                          var s = 'horizontal' !== i ? (e || 100) / 100 : 1,
                              n = 'vertical' !== i ? (e || 100) / 100 : 1;
                          return {
                              height: t.height() * n,
                              width: t.width() * s,
                              outerHeight: t.outerHeight() * n,
                              outerWidth: t.outerWidth() * s,
                          };
                      },
                      clipToBox: function (t) {
                          return {
                              width: t.clip.right - t.clip.left,
                              height: t.clip.bottom - t.clip.top,
                              left: t.clip.left,
                              top: t.clip.top,
                          };
                      },
                      unshift: function (t, e, i) {
                          var s = t.queue();
                          e > 1 &&
                              s.splice.apply(s, [1, 0].concat(s.splice(e, i))),
                              t.dequeue();
                      },
                      saveStyle: function (t) {
                          t.data(l, t[0].style.cssText);
                      },
                      restoreStyle: function (t) {
                          (t[0].style.cssText = t.data(l) || ''), t.removeData(l);
                      },
                      mode: function (t, e) {
                          var i = t.is(':hidden');
                          return (
                              'toggle' === e && (e = i ? 'show' : 'hide'),
                              (i ? 'hide' === e : 'show' === e) && (e = 'none'),
                              e
                          );
                      },
                      getBaseline: function (t, e) {
                          var i, s;
                          switch (t[0]) {
                              case 'top':
                                  i = 0;
                                  break;
                              case 'middle':
                                  i = 0.5;
                                  break;
                              case 'bottom':
                                  i = 1;
                                  break;
                              default:
                                  i = t[0] / e.height;
                          }
                          switch (t[1]) {
                              case 'left':
                                  s = 0;
                                  break;
                              case 'center':
                                  s = 0.5;
                                  break;
                              case 'right':
                                  s = 1;
                                  break;
                              default:
                                  s = t[1] / e.width;
                          }
                          return { x: s, y: i };
                      },
                      createPlaceholder: function (e) {
                          var i,
                              s = e.css('position'),
                              n = e.position();
                          return (
                              e
                                  .css({
                                      marginTop: e.css('marginTop'),
                                      marginBottom: e.css('marginBottom'),
                                      marginLeft: e.css('marginLeft'),
                                      marginRight: e.css('marginRight'),
                                  })
                                  .outerWidth(e.outerWidth())
                                  .outerHeight(e.outerHeight()),
                              /^(static|relative)/.test(s) &&
                                  ((s = 'absolute'),
                                  (i = t('<' + e[0].nodeName + '>')
                                      .insertAfter(e)
                                      .css({
                                          display: /^(inline|ruby)/.test(
                                              e.css('display')
                                          )
                                              ? 'inline-block'
                                              : 'block',
                                          visibility: 'hidden',
                                          marginTop: e.css('marginTop'),
                                          marginBottom: e.css('marginBottom'),
                                          marginLeft: e.css('marginLeft'),
                                          marginRight: e.css('marginRight'),
                                          float: e.css('float'),
                                      })
                                      .outerWidth(e.outerWidth())
                                      .outerHeight(e.outerHeight())
                                      .addClass('ui-effects-placeholder')),
                                  e.data(h + 'placeholder', i)),
                              e.css({ position: s, left: n.left, top: n.top }),
                              i
                          );
                      },
                      removePlaceholder: function (t) {
                          var e = h + 'placeholder',
                              i = t.data(e);
                          i && (i.remove(), t.removeData(e));
                      },
                      cleanUp: function (e) {
                          t.effects.restoreStyle(e),
                              t.effects.removePlaceholder(e);
                      },
                      setTransition: function (e, i, s, n) {
                          return (
                              (n = n || {}),
                              t.each(i, function (t, i) {
                                  var o = e.cssUnit(i);
                                  o[0] > 0 && (n[i] = o[0] * s + o[1]);
                              }),
                              n
                          );
                      },
                  }),
                  t.fn.extend({
                      effect: function () {
                          function i(e) {
                              function i() {
                                  t.isFunction(h) && h.call(a[0]),
                                      t.isFunction(e) && e();
                              }
                              var a = t(this);
                              (s.mode = u.shift()),
                                  !1 === t.uiBackCompat || o
                                      ? 'none' === s.mode
                                          ? (a[l](), i())
                                          : n.call(a[0], s, function () {
                                                a.removeData(c),
                                                    t.effects.cleanUp(a),
                                                    'hide' === s.mode && a.hide(),
                                                    i();
                                            })
                                      : (
                                            a.is(':hidden')
                                                ? 'hide' === l
                                                : 'show' === l
                                        )
                                      ? (a[l](), i())
                                      : n.call(a[0], s, i);
                          }
                          var s = e.apply(this, arguments),
                              n = t.effects.effect[s.effect],
                              o = n.mode,
                              a = s.queue,
                              r = a || 'fx',
                              h = s.complete,
                              l = s.mode,
                              u = [],
                              d = function (e) {
                                  var i = t(this),
                                      s = t.effects.mode(i, l) || o;
                                  i.data(c, !0),
                                      u.push(s),
                                      o &&
                                          ('show' === s ||
                                              (s === o && 'hide' === s)) &&
                                          i.show(),
                                      (o && 'none' === s) ||
                                          t.effects.saveStyle(i),
                                      t.isFunction(e) && e();
                              };
                          return t.fx.off || !n
                              ? l
                                  ? this[l](s.duration, h)
                                  : this.each(function () {
                                        h && h.call(this);
                                    })
                              : !1 === a
                              ? this.each(d).each(i)
                              : this.queue(r, d).queue(r, i);
                      },
                      show: (function (t) {
                          return function (s) {
                              if (i(s)) return t.apply(this, arguments);
                              var n = e.apply(this, arguments);
                              return (n.mode = 'show'), this.effect.call(this, n);
                          };
                      })(t.fn.show),
                      hide: (function (t) {
                          return function (s) {
                              if (i(s)) return t.apply(this, arguments);
                              var n = e.apply(this, arguments);
                              return (n.mode = 'hide'), this.effect.call(this, n);
                          };
                      })(t.fn.hide),
                      toggle: (function (t) {
                          return function (s) {
                              if (i(s) || 'boolean' == typeof s)
                                  return t.apply(this, arguments);
                              var n = e.apply(this, arguments);
                              return (
                                  (n.mode = 'toggle'), this.effect.call(this, n)
                              );
                          };
                      })(t.fn.toggle),
                      cssUnit: function (e) {
                          var i = this.css(e),
                              s = [];
                          return (
                              t.each(['em', 'px', '%', 'pt'], function (t, e) {
                                  i.indexOf(e) > 0 && (s = [parseFloat(i), e]);
                              }),
                              s
                          );
                      },
                      cssClip: function (t) {
                          return t
                              ? this.css(
                                    'clip',
                                    'rect(' +
                                        t.top +
                                        'px ' +
                                        t.right +
                                        'px ' +
                                        t.bottom +
                                        'px ' +
                                        t.left +
                                        'px)'
                                )
                              : s(this.css('clip'), this);
                      },
                      transfer: function (e, i) {
                          var s = t(this),
                              n = t(e.to),
                              o = 'fixed' === n.css('position'),
                              a = t('body'),
                              r = o ? a.scrollTop() : 0,
                              h = o ? a.scrollLeft() : 0,
                              l = n.offset(),
                              c = {
                                  top: l.top - r,
                                  left: l.left - h,
                                  height: n.innerHeight(),
                                  width: n.innerWidth(),
                              },
                              u = s.offset(),
                              d = t("<div class='ui-effects-transfer'></div>")
                                  .appendTo('body')
                                  .addClass(e.className)
                                  .css({
                                      top: u.top - r,
                                      left: u.left - h,
                                      height: s.innerHeight(),
                                      width: s.innerWidth(),
                                      position: o ? 'fixed' : 'absolute',
                                  })
                                  .animate(c, e.duration, e.easing, function () {
                                      d.remove(), t.isFunction(i) && i();
                                  });
                      },
                  }),
                  (t.fx.step.clip = function (e) {
                      e.clipInit ||
                          ((e.start = t(e.elem).cssClip()),
                          'string' == typeof e.end && (e.end = s(e.end, e.elem)),
                          (e.clipInit = !0)),
                          t(e.elem).cssClip({
                              top:
                                  e.pos * (e.end.top - e.start.top) + e.start.top,
                              right:
                                  e.pos * (e.end.right - e.start.right) +
                                  e.start.right,
                              bottom:
                                  e.pos * (e.end.bottom - e.start.bottom) +
                                  e.start.bottom,
                              left:
                                  e.pos * (e.end.left - e.start.left) +
                                  e.start.left,
                          });
                  });
          })(),
          (function () {
              var e = {};
              t.each(['Quad', 'Cubic', 'Quart', 'Quint', 'Expo'], function (
                  t,
                  i
              ) {
                  e[i] = function (e) {
                      return Math.pow(e, t + 2);
                  };
              }),
                  t.extend(e, {
                      Sine: function (t) {
                          return 1 - Math.cos((t * Math.PI) / 2);
                      },
                      Circ: function (t) {
                          return 1 - Math.sqrt(1 - t * t);
                      },
                      Elastic: function (t) {
                          return 0 === t || 1 === t
                              ? t
                              : -Math.pow(2, 8 * (t - 1)) *
                                    Math.sin(
                                        ((80 * (t - 1) - 7.5) * Math.PI) / 15
                                    );
                      },
                      Back: function (t) {
                          return t * t * (3 * t - 2);
                      },
                      Bounce: function (t) {
                          for (
                              var e, i = 4;
                              ((e = Math.pow(2, --i)) - 1) / 11 > t;

                          );
                          return (
                              1 / Math.pow(4, 3 - i) -
                              7.5625 * Math.pow((3 * e - 2) / 22 - t, 2)
                          );
                      },
                  }),
                  t.each(e, function (e, i) {
                      (t.easing['easeIn' + e] = i),
                          (t.easing['easeOut' + e] = function (t) {
                              return 1 - i(1 - t);
                          }),
                          (t.easing['easeInOut' + e] = function (t) {
                              return 0.5 > t
                                  ? i(2 * t) / 2
                                  : 1 - i(-2 * t + 2) / 2;
                          });
                  });
          })();
      t.effects;
      t.effects.define('blind', 'hide', function (e, i) {
          var s = {
                  up: ['bottom', 'top'],
                  vertical: ['bottom', 'top'],
                  down: ['top', 'bottom'],
                  left: ['right', 'left'],
                  horizontal: ['right', 'left'],
                  right: ['left', 'right'],
              },
              n = t(this),
              o = e.direction || 'up',
              a = n.cssClip(),
              r = { clip: t.extend({}, a) },
              h = t.effects.createPlaceholder(n);
          (r.clip[s[o][0]] = r.clip[s[o][1]]),
              'show' === e.mode &&
                  (n.cssClip(r.clip),
                  h && h.css(t.effects.clipToBox(r)),
                  (r.clip = a)),
              h && h.animate(t.effects.clipToBox(r), e.duration, e.easing),
              n.animate(r, {
                  queue: !1,
                  duration: e.duration,
                  easing: e.easing,
                  complete: i,
              });
      }),
          t.effects.define('bounce', function (e, i) {
              var s,
                  n,
                  o,
                  a = t(this),
                  r = e.mode,
                  h = 'hide' === r,
                  l = 'show' === r,
                  c = e.direction || 'up',
                  u = e.distance,
                  d = e.times || 5,
                  p = 2 * d + (l || h ? 1 : 0),
                  f = e.duration / p,
                  g = e.easing,
                  m = 'up' === c || 'down' === c ? 'top' : 'left',
                  _ = 'up' === c || 'left' === c,
                  v = 0,
                  b = a.queue().length;
              for (
                  t.effects.createPlaceholder(a),
                      o = a.css(m),
                      u ||
                          (u =
                              a['top' === m ? 'outerHeight' : 'outerWidth']() /
                              3),
                      l &&
                          (((n = { opacity: 1 })[m] = o),
                          a
                              .css('opacity', 0)
                              .css(m, _ ? 2 * -u : 2 * u)
                              .animate(n, f, g)),
                      h && (u /= Math.pow(2, d - 1)),
                      (n = {})[m] = o;
                  d > v;
                  v++
              )
                  ((s = {})[m] = (_ ? '-=' : '+=') + u),
                      a.animate(s, f, g).animate(n, f, g),
                      (u = h ? 2 * u : u / 2);
              h &&
                  (((s = { opacity: 0 })[m] = (_ ? '-=' : '+=') + u),
                  a.animate(s, f, g)),
                  a.queue(i),
                  t.effects.unshift(a, b, p + 1);
          }),
          t.effects.define('clip', 'hide', function (e, i) {
              var s,
                  n = {},
                  o = t(this),
                  a = e.direction || 'vertical',
                  r = 'both' === a,
                  h = r || 'horizontal' === a,
                  l = r || 'vertical' === a;
              (s = o.cssClip()),
                  (n.clip = {
                      top: l ? (s.bottom - s.top) / 2 : s.top,
                      right: h ? (s.right - s.left) / 2 : s.right,
                      bottom: l ? (s.bottom - s.top) / 2 : s.bottom,
                      left: h ? (s.right - s.left) / 2 : s.left,
                  }),
                  t.effects.createPlaceholder(o),
                  'show' === e.mode && (o.cssClip(n.clip), (n.clip = s)),
                  o.animate(n, {
                      queue: !1,
                      duration: e.duration,
                      easing: e.easing,
                      complete: i,
                  });
          }),
          t.effects.define('drop', 'hide', function (e, i) {
              var s,
                  n = t(this),
                  o = 'show' === e.mode,
                  a = e.direction || 'left',
                  r = 'up' === a || 'down' === a ? 'top' : 'left',
                  h = 'up' === a || 'left' === a ? '-=' : '+=',
                  l = '+=' === h ? '-=' : '+=',
                  c = { opacity: 0 };
              t.effects.createPlaceholder(n),
                  (s =
                      e.distance ||
                      n['top' === r ? 'outerHeight' : 'outerWidth'](!0) / 2),
                  (c[r] = h + s),
                  o && (n.css(c), (c[r] = l + s), (c.opacity = 1)),
                  n.animate(c, {
                      queue: !1,
                      duration: e.duration,
                      easing: e.easing,
                      complete: i,
                  });
          }),
          t.effects.define('explode', 'hide', function (e, i) {
              function s() {
                  _.push(this),
                      _.length === c * u &&
                          (d.css({ visibility: 'visible' }), t(_).remove(), i());
              }
              var n,
                  o,
                  a,
                  r,
                  h,
                  l,
                  c = e.pieces ? Math.round(Math.sqrt(e.pieces)) : 3,
                  u = c,
                  d = t(this),
                  p = 'show' === e.mode,
                  f = d.show().css('visibility', 'hidden').offset(),
                  g = Math.ceil(d.outerWidth() / u),
                  m = Math.ceil(d.outerHeight() / c),
                  _ = [];
              for (n = 0; c > n; n++)
                  for (r = f.top + n * m, l = n - (c - 1) / 2, o = 0; u > o; o++)
                      (a = f.left + o * g),
                          (h = o - (u - 1) / 2),
                          d
                              .clone()
                              .appendTo('body')
                              .wrap('<div></div>')
                              .css({
                                  position: 'absolute',
                                  visibility: 'visible',
                                  left: -o * g,
                                  top: -n * m,
                              })
                              .parent()
                              .addClass('ui-effects-explode')
                              .css({
                                  position: 'absolute',
                                  overflow: 'hidden',
                                  width: g,
                                  height: m,
                                  left: a + (p ? h * g : 0),
                                  top: r + (p ? l * m : 0),
                                  opacity: p ? 0 : 1,
                              })
                              .animate(
                                  {
                                      left: a + (p ? 0 : h * g),
                                      top: r + (p ? 0 : l * m),
                                      opacity: p ? 1 : 0,
                                  },
                                  e.duration || 500,
                                  e.easing,
                                  s
                              );
          }),
          t.effects.define('fade', 'toggle', function (e, i) {
              var s = 'show' === e.mode;
              t(this)
                  .css('opacity', s ? 0 : 1)
                  .animate(
                      { opacity: s ? 1 : 0 },
                      {
                          queue: !1,
                          duration: e.duration,
                          easing: e.easing,
                          complete: i,
                      }
                  );
          }),
          t.effects.define('fold', 'hide', function (e, i) {
              var s = t(this),
                  n = e.mode,
                  o = 'show' === n,
                  a = 'hide' === n,
                  r = e.size || 15,
                  h = /([0-9]+)%/.exec(r),
                  l = !!e.horizFirst ? ['right', 'bottom'] : ['bottom', 'right'],
                  c = e.duration / 2,
                  u = t.effects.createPlaceholder(s),
                  d = s.cssClip(),
                  p = { clip: t.extend({}, d) },
                  f = { clip: t.extend({}, d) },
                  g = [d[l[0]], d[l[1]]],
                  m = s.queue().length;
              h && (r = (parseInt(h[1], 10) / 100) * g[a ? 0 : 1]),
                  (p.clip[l[0]] = r),
                  (f.clip[l[0]] = r),
                  (f.clip[l[1]] = 0),
                  o &&
                      (s.cssClip(f.clip),
                      u && u.css(t.effects.clipToBox(f)),
                      (f.clip = d)),
                  s
                      .queue(function (i) {
                          u &&
                              u
                                  .animate(t.effects.clipToBox(p), c, e.easing)
                                  .animate(t.effects.clipToBox(f), c, e.easing),
                              i();
                      })
                      .animate(p, c, e.easing)
                      .animate(f, c, e.easing)
                      .queue(i),
                  t.effects.unshift(s, m, 4);
          }),
          t.effects.define('highlight', 'show', function (e, i) {
              var s = t(this),
                  n = { backgroundColor: s.css('backgroundColor') };
              'hide' === e.mode && (n.opacity = 0),
                  t.effects.saveStyle(s),
                  s
                      .css({
                          backgroundImage: 'none',
                          backgroundColor: e.color || '#ffff99',
                      })
                      .animate(n, {
                          queue: !1,
                          duration: e.duration,
                          easing: e.easing,
                          complete: i,
                      });
          }),
          t.effects.define('size', function (e, i) {
              var s,
                  n,
                  o,
                  a = t(this),
                  r = ['fontSize'],
                  h = [
                      'borderTopWidth',
                      'borderBottomWidth',
                      'paddingTop',
                      'paddingBottom',
                  ],
                  l = [
                      'borderLeftWidth',
                      'borderRightWidth',
                      'paddingLeft',
                      'paddingRight',
                  ],
                  c = e.mode,
                  u = 'effect' !== c,
                  d = e.scale || 'both',
                  p = e.origin || ['middle', 'center'],
                  f = a.css('position'),
                  g = a.position(),
                  m = t.effects.scaledDimensions(a),
                  _ = e.from || m,
                  v = e.to || t.effects.scaledDimensions(a, 0);
              t.effects.createPlaceholder(a),
                  'show' === c && ((o = _), (_ = v), (v = o)),
                  (n = {
                      from: { y: _.height / m.height, x: _.width / m.width },
                      to: { y: v.height / m.height, x: v.width / m.width },
                  }),
                  ('box' === d || 'both' === d) &&
                      (n.from.y !== n.to.y &&
                          ((_ = t.effects.setTransition(a, h, n.from.y, _)),
                          (v = t.effects.setTransition(a, h, n.to.y, v))),
                      n.from.x !== n.to.x &&
                          ((_ = t.effects.setTransition(a, l, n.from.x, _)),
                          (v = t.effects.setTransition(a, l, n.to.x, v)))),
                  ('content' === d || 'both' === d) &&
                      n.from.y !== n.to.y &&
                      ((_ = t.effects.setTransition(a, r, n.from.y, _)),
                      (v = t.effects.setTransition(a, r, n.to.y, v))),
                  p &&
                      ((s = t.effects.getBaseline(p, m)),
                      (_.top = (m.outerHeight - _.outerHeight) * s.y + g.top),
                      (_.left = (m.outerWidth - _.outerWidth) * s.x + g.left),
                      (v.top = (m.outerHeight - v.outerHeight) * s.y + g.top),
                      (v.left = (m.outerWidth - v.outerWidth) * s.x + g.left)),
                  a.css(_),
                  ('content' === d || 'both' === d) &&
                      ((h = h.concat(['marginTop', 'marginBottom']).concat(r)),
                      (l = l.concat(['marginLeft', 'marginRight'])),
                      a.find('*[width]').each(function () {
                          var i = t(this),
                              s = t.effects.scaledDimensions(i),
                              o = {
                                  height: s.height * n.from.y,
                                  width: s.width * n.from.x,
                                  outerHeight: s.outerHeight * n.from.y,
                                  outerWidth: s.outerWidth * n.from.x,
                              },
                              a = {
                                  height: s.height * n.to.y,
                                  width: s.width * n.to.x,
                                  outerHeight: s.height * n.to.y,
                                  outerWidth: s.width * n.to.x,
                              };
                          n.from.y !== n.to.y &&
                              ((o = t.effects.setTransition(i, h, n.from.y, o)),
                              (a = t.effects.setTransition(i, h, n.to.y, a))),
                              n.from.x !== n.to.x &&
                                  ((o = t.effects.setTransition(
                                      i,
                                      l,
                                      n.from.x,
                                      o
                                  )),
                                  (a = t.effects.setTransition(i, l, n.to.x, a))),
                              u && t.effects.saveStyle(i),
                              i.css(o),
                              i.animate(a, e.duration, e.easing, function () {
                                  u && t.effects.restoreStyle(i);
                              });
                      })),
                  a.animate(v, {
                      queue: !1,
                      duration: e.duration,
                      easing: e.easing,
                      complete: function () {
                          var e = a.offset();
                          0 === v.opacity && a.css('opacity', _.opacity),
                              u ||
                                  (a
                                      .css(
                                          'position',
                                          'static' === f ? 'relative' : f
                                      )
                                      .offset(e),
                                  t.effects.saveStyle(a)),
                              i();
                      },
                  });
          }),
          t.effects.define('scale', function (e, i) {
              var s = t(this),
                  n = e.mode,
                  o =
                      parseInt(e.percent, 10) ||
                      (0 === parseInt(e.percent, 10) || 'effect' !== n ? 0 : 100),
                  a = t.extend(
                      !0,
                      {
                          from: t.effects.scaledDimensions(s),
                          to: t.effects.scaledDimensions(
                              s,
                              o,
                              e.direction || 'both'
                          ),
                          origin: e.origin || ['middle', 'center'],
                      },
                      e
                  );
              e.fade && ((a.from.opacity = 1), (a.to.opacity = 0)),
                  t.effects.effect.size.call(this, a, i);
          }),
          t.effects.define('puff', 'hide', function (e, i) {
              var s = t.extend(!0, {}, e, {
                  fade: !0,
                  percent: parseInt(e.percent, 10) || 150,
              });
              t.effects.effect.scale.call(this, s, i);
          }),
          t.effects.define('pulsate', 'show', function (e, i) {
              var s = t(this),
                  n = e.mode,
                  o = 'show' === n,
                  a = o || 'hide' === n,
                  r = 2 * (e.times || 5) + (a ? 1 : 0),
                  h = e.duration / r,
                  l = 0,
                  c = 1,
                  u = s.queue().length;
              for (
                  (o || !s.is(':visible')) &&
                  (s.css('opacity', 0).show(), (l = 1));
                  r > c;
                  c++
              )
                  s.animate({ opacity: l }, h, e.easing), (l = 1 - l);
              s.animate({ opacity: l }, h, e.easing),
                  s.queue(i),
                  t.effects.unshift(s, u, r + 1);
          }),
          t.effects.define('shake', function (e, i) {
              var s = 1,
                  n = t(this),
                  o = e.direction || 'left',
                  a = e.distance || 20,
                  r = e.times || 3,
                  h = 2 * r + 1,
                  l = Math.round(e.duration / h),
                  c = 'up' === o || 'down' === o ? 'top' : 'left',
                  u = 'up' === o || 'left' === o,
                  d = {},
                  p = {},
                  f = {},
                  g = n.queue().length;
              for (
                  t.effects.createPlaceholder(n),
                      d[c] = (u ? '-=' : '+=') + a,
                      p[c] = (u ? '+=' : '-=') + 2 * a,
                      f[c] = (u ? '-=' : '+=') + 2 * a,
                      n.animate(d, l, e.easing);
                  r > s;
                  s++
              )
                  n.animate(p, l, e.easing).animate(f, l, e.easing);
              n
                  .animate(p, l, e.easing)
                  .animate(d, l / 2, e.easing)
                  .queue(i),
                  t.effects.unshift(n, g, h + 1);
          }),
          t.effects.define('slide', 'show', function (e, i) {
              var s,
                  n,
                  o = t(this),
                  a = {
                      up: ['bottom', 'top'],
                      down: ['top', 'bottom'],
                      left: ['right', 'left'],
                      right: ['left', 'right'],
                  },
                  r = e.mode,
                  h = e.direction || 'left',
                  l = 'up' === h || 'down' === h ? 'top' : 'left',
                  c = 'up' === h || 'left' === h,
                  u =
                      e.distance ||
                      o['top' === l ? 'outerHeight' : 'outerWidth'](!0),
                  d = {};
              t.effects.createPlaceholder(o),
                  (s = o.cssClip()),
                  (n = o.position()[l]),
                  (d[l] = (c ? -1 : 1) * u + n),
                  (d.clip = o.cssClip()),
                  (d.clip[a[h][1]] = d.clip[a[h][0]]),
                  'show' === r &&
                      (o.cssClip(d.clip),
                      o.css(l, d[l]),
                      (d.clip = s),
                      (d[l] = n)),
                  o.animate(d, {
                      queue: !1,
                      duration: e.duration,
                      easing: e.easing,
                      complete: i,
                  });
          }),
          !1 !== t.uiBackCompat &&
              t.effects.define('transfer', function (e, i) {
                  t(this).transfer(e, i);
              }),
          (t.ui.focusable = function (e, i) {
              var s,
                  n,
                  o,
                  a,
                  r,
                  h = e.nodeName.toLowerCase();
              return 'area' === h
                  ? ((n = (s = e.parentNode).name),
                    !(!e.href || !n || 'map' !== s.nodeName.toLowerCase()) &&
                        (o = t("img[usemap='#" + n + "']")).length > 0 &&
                        o.is(':visible'))
                  : (/^(input|select|textarea|button|object)$/.test(h)
                        ? (a = !e.disabled) &&
                          (r = t(e).closest('fieldset')[0]) &&
                          (a = !r.disabled)
                        : (a = ('a' === h && e.href) || i),
                    a &&
                        t(e).is(':visible') &&
                        (function (t) {
                            for (var e = t.css('visibility'); 'inherit' === e; )
                                e = (t = t.parent()).css('visibility');
                            return 'hidden' !== e;
                        })(t(e)));
          }),
          t.extend(t.expr[':'], {
              focusable: function (e) {
                  return t.ui.focusable(e, null != t.attr(e, 'tabindex'));
              },
          }),
          t.ui.focusable,
          (t.fn.form = function () {
              return 'string' == typeof this[0].form
                  ? this.closest('form')
                  : t(this[0].form);
          }),
          (t.ui.formResetMixin = {
              _formResetHandler: function () {
                  var e = t(this);
                  setTimeout(function () {
                      var i = e.data('ui-form-reset-instances');
                      t.each(i, function () {
                          this.refresh();
                      });
                  });
              },
              _bindFormResetHandler: function () {
                  if (((this.form = this.element.form()), this.form.length)) {
                      var t = this.form.data('ui-form-reset-instances') || [];
                      t.length ||
                          this.form.on(
                              'reset.ui-form-reset',
                              this._formResetHandler
                          ),
                          t.push(this),
                          this.form.data('ui-form-reset-instances', t);
                  }
              },
              _unbindFormResetHandler: function () {
                  if (this.form.length) {
                      var e = this.form.data('ui-form-reset-instances');
                      e.splice(t.inArray(this, e), 1),
                          e.length
                              ? this.form.data('ui-form-reset-instances', e)
                              : this.form
                                    .removeData('ui-form-reset-instances')
                                    .off('reset.ui-form-reset');
                  }
              },
          }),
          '1.7' === t.fn.jquery.substring(0, 3) &&
              (t.each(['Width', 'Height'], function (e, i) {
                  function s(e, i, s, o) {
                      return (
                          t.each(n, function () {
                              (i -= parseFloat(t.css(e, 'padding' + this)) || 0),
                                  s &&
                                      (i -=
                                          parseFloat(
                                              t.css(e, 'border' + this + 'Width')
                                          ) || 0),
                                  o &&
                                      (i -=
                                          parseFloat(t.css(e, 'margin' + this)) ||
                                          0);
                          }),
                          i
                      );
                  }
                  var n = 'Width' === i ? ['Left', 'Right'] : ['Top', 'Bottom'],
                      o = i.toLowerCase(),
                      a = {
                          innerWidth: t.fn.innerWidth,
                          innerHeight: t.fn.innerHeight,
                          outerWidth: t.fn.outerWidth,
                          outerHeight: t.fn.outerHeight,
                      };
                  (t.fn['inner' + i] = function (e) {
                      return void 0 === e
                          ? a['inner' + i].call(this)
                          : this.each(function () {
                                t(this).css(o, s(this, e) + 'px');
                            });
                  }),
                      (t.fn['outer' + i] = function (e, n) {
                          return 'number' != typeof e
                              ? a['outer' + i].call(this, e)
                              : this.each(function () {
                                    t(this).css(o, s(this, e, !0, n) + 'px');
                                });
                      });
              }),
              (t.fn.addBack = function (t) {
                  return this.add(
                      null == t ? this.prevObject : this.prevObject.filter(t)
                  );
              })),
          (t.ui.keyCode = {
              BACKSPACE: 8,
              COMMA: 188,
              DELETE: 46,
              DOWN: 40,
              END: 35,
              ENTER: 13,
              ESCAPE: 27,
              HOME: 36,
              LEFT: 37,
              PAGE_DOWN: 34,
              PAGE_UP: 33,
              PERIOD: 190,
              RIGHT: 39,
              SPACE: 32,
              TAB: 9,
              UP: 38,
          }),
          (t.ui.escapeSelector = (function () {
              var t = /([!"#$%&'()*+,.\/:;<=>?@[\]^`{|}~])/g;
              return function (e) {
                  return e.replace(t, '\\$1');
              };
          })()),
          (t.fn.labels = function () {
              var e, i, s, n, o;
              return this[0].labels && this[0].labels.length
                  ? this.pushStack(this[0].labels)
                  : ((n = this.eq(0).parents('label')),
                    (s = this.attr('id')) &&
                        ((o = (e = this.eq(0).parents().last()).add(
                            e.length ? e.siblings() : this.siblings()
                        )),
                        (i = "label[for='" + t.ui.escapeSelector(s) + "']"),
                        (n = n.add(o.find(i).addBack(i)))),
                    this.pushStack(n));
          }),
          (t.fn.scrollParent = function (e) {
              var i = this.css('position'),
                  s = 'absolute' === i,
                  n = e ? /(auto|scroll|hidden)/ : /(auto|scroll)/,
                  o = this.parents()
                      .filter(function () {
                          var e = t(this);
                          return (
                              (!s || 'static' !== e.css('position')) &&
                              n.test(
                                  e.css('overflow') +
                                      e.css('overflow-y') +
                                      e.css('overflow-x')
                              )
                          );
                      })
                      .eq(0);
              return 'fixed' !== i && o.length
                  ? o
                  : t(this[0].ownerDocument || document);
          }),
          t.extend(t.expr[':'], {
              tabbable: function (e) {
                  var i = t.attr(e, 'tabindex'),
                      s = null != i;
                  return (!s || i >= 0) && t.ui.focusable(e, s);
              },
          }),
          t.fn.extend({
              uniqueId: (function () {
                  var t = 0;
                  return function () {
                      return this.each(function () {
                          this.id || (this.id = 'ui-id-' + ++t);
                      });
                  };
              })(),
              removeUniqueId: function () {
                  return this.each(function () {
                      /^ui-id-\d+$/.test(this.id) && t(this).removeAttr('id');
                  });
              },
          }),
          t.widget('ui.accordion', {
              version: '1.12.1',
              options: {
                  active: 0,
                  animate: {},
                  classes: {
                      'ui-accordion-header': 'ui-corner-top',
                      'ui-accordion-header-collapsed': 'ui-corner-all',
                      'ui-accordion-content': 'ui-corner-bottom',
                  },
                  collapsible: !1,
                  event: 'click',
                  header: '> li > :first-child, > :not(li):even',
                  heightStyle: 'auto',
                  icons: {
                      activeHeader: 'ui-icon-triangle-1-s',
                      header: 'ui-icon-triangle-1-e',
                  },
                  activate: null,
                  beforeActivate: null,
              },
              hideProps: {
                  borderTopWidth: 'hide',
                  borderBottomWidth: 'hide',
                  paddingTop: 'hide',
                  paddingBottom: 'hide',
                  height: 'hide',
              },
              showProps: {
                  borderTopWidth: 'show',
                  borderBottomWidth: 'show',
                  paddingTop: 'show',
                  paddingBottom: 'show',
                  height: 'show',
              },
              _create: function () {
                  var e = this.options;
                  (this.prevShow = this.prevHide = t()),
                      this._addClass('ui-accordion', 'ui-widget ui-helper-reset'),
                      this.element.attr('role', 'tablist'),
                      e.collapsible ||
                          (!1 !== e.active && null != e.active) ||
                          (e.active = 0),
                      this._processPanels(),
                      0 > e.active && (e.active += this.headers.length),
                      this._refresh();
              },
              _getCreateEventData: function () {
                  return {
                      header: this.active,
                      panel: this.active.length ? this.active.next() : t(),
                  };
              },
              _createIcons: function () {
                  var e,
                      i,
                      s = this.options.icons;
                  s &&
                      ((e = t('<span>')),
                      this._addClass(
                          e,
                          'ui-accordion-header-icon',
                          'ui-icon ' + s.header
                      ),
                      e.prependTo(this.headers),
                      (i = this.active.children('.ui-accordion-header-icon')),
                      this._removeClass(i, s.header)
                          ._addClass(i, null, s.activeHeader)
                          ._addClass(this.headers, 'ui-accordion-icons'));
              },
              _destroyIcons: function () {
                  this._removeClass(this.headers, 'ui-accordion-icons'),
                      this.headers.children('.ui-accordion-header-icon').remove();
              },
              _destroy: function () {
                  var t;
                  this.element.removeAttr('role'),
                      this.headers
                          .removeAttr(
                              'role aria-expanded aria-selected aria-controls tabIndex'
                          )
                          .removeUniqueId(),
                      this._destroyIcons(),
                      (t = this.headers
                          .next()
                          .css('display', '')
                          .removeAttr('role aria-hidden aria-labelledby')
                          .removeUniqueId()),
                      'content' !== this.options.heightStyle &&
                          t.css('height', '');
              },
              _setOption: function (t, e) {
                  return 'active' === t
                      ? void this._activate(e)
                      : ('event' === t &&
                            (this.options.event &&
                                this._off(this.headers, this.options.event),
                            this._setupEvents(e)),
                        this._super(t, e),
                        'collapsible' !== t ||
                            e ||
                            !1 !== this.options.active ||
                            this._activate(0),
                        void (
                            'icons' === t &&
                            (this._destroyIcons(), e && this._createIcons())
                        ));
              },
              _setOptionDisabled: function (t) {
                  this._super(t),
                      this.element.attr('aria-disabled', t),
                      this._toggleClass(null, 'ui-state-disabled', !!t),
                      this._toggleClass(
                          this.headers.add(this.headers.next()),
                          null,
                          'ui-state-disabled',
                          !!t
                      );
              },
              _keydown: function (e) {
                  if (!e.altKey && !e.ctrlKey) {
                      var i = t.ui.keyCode,
                          s = this.headers.length,
                          n = this.headers.index(e.target),
                          o = !1;
                      switch (e.keyCode) {
                          case i.RIGHT:
                          case i.DOWN:
                              o = this.headers[(n + 1) % s];
                              break;
                          case i.LEFT:
                          case i.UP:
                              o = this.headers[(n - 1 + s) % s];
                              break;
                          case i.SPACE:
                          case i.ENTER:
                              this._eventHandler(e);
                              break;
                          case i.HOME:
                              o = this.headers[0];
                              break;
                          case i.END:
                              o = this.headers[s - 1];
                      }
                      o &&
                          (t(e.target).attr('tabIndex', -1),
                          t(o).attr('tabIndex', 0),
                          t(o).trigger('focus'),
                          e.preventDefault());
                  }
              },
              _panelKeyDown: function (e) {
                  e.keyCode === t.ui.keyCode.UP &&
                      e.ctrlKey &&
                      t(e.currentTarget).prev().trigger('focus');
              },
              refresh: function () {
                  var e = this.options;
                  this._processPanels(),
                      (!1 === e.active && !0 === e.collapsible) ||
                      !this.headers.length
                          ? ((e.active = !1), (this.active = t()))
                          : !1 === e.active
                          ? this._activate(0)
                          : this.active.length &&
                            !t.contains(this.element[0], this.active[0])
                          ? this.headers.length ===
                            this.headers.find('.ui-state-disabled').length
                              ? ((e.active = !1), (this.active = t()))
                              : this._activate(Math.max(0, e.active - 1))
                          : (e.active = this.headers.index(this.active)),
                      this._destroyIcons(),
                      this._refresh();
              },
              _processPanels: function () {
                  var t = this.headers,
                      e = this.panels;
                  (this.headers = this.element.find(this.options.header)),
                      this._addClass(
                          this.headers,
                          'ui-accordion-header ui-accordion-header-collapsed',
                          'ui-state-default'
                      ),
                      (this.panels = this.headers
                          .next()
                          .filter(':not(.ui-accordion-content-active)')
                          .hide()),
                      this._addClass(
                          this.panels,
                          'ui-accordion-content',
                          'ui-helper-reset ui-widget-content'
                      ),
                      e &&
                          (this._off(t.not(this.headers)),
                          this._off(e.not(this.panels)));
              },
              _refresh: function () {
                  var e,
                      i = this.options,
                      s = i.heightStyle,
                      n = this.element.parent();
                  (this.active = this._findActive(i.active)),
                      this._addClass(
                          this.active,
                          'ui-accordion-header-active',
                          'ui-state-active'
                      )._removeClass(
                          this.active,
                          'ui-accordion-header-collapsed'
                      ),
                      this._addClass(
                          this.active.next(),
                          'ui-accordion-content-active'
                      ),
                      this.active.next().show(),
                      this.headers
                          .attr('role', 'tab')
                          .each(function () {
                              var e = t(this),
                                  i = e.uniqueId().attr('id'),
                                  s = e.next(),
                                  n = s.uniqueId().attr('id');
                              e.attr('aria-controls', n),
                                  s.attr('aria-labelledby', i);
                          })
                          .next()
                          .attr('role', 'tabpanel'),
                      this.headers
                          .not(this.active)
                          .attr({
                              'aria-selected': 'false',
                              'aria-expanded': 'false',
                              tabIndex: -1,
                          })
                          .next()
                          .attr({ 'aria-hidden': 'true' })
                          .hide(),
                      this.active.length
                          ? this.active
                                .attr({
                                    'aria-selected': 'true',
                                    'aria-expanded': 'true',
                                    tabIndex: 0,
                                })
                                .next()
                                .attr({ 'aria-hidden': 'false' })
                          : this.headers.eq(0).attr('tabIndex', 0),
                      this._createIcons(),
                      this._setupEvents(i.event),
                      'fill' === s
                          ? ((e = n.height()),
                            this.element.siblings(':visible').each(function () {
                                var i = t(this),
                                    s = i.css('position');
                                'absolute' !== s &&
                                    'fixed' !== s &&
                                    (e -= i.outerHeight(!0));
                            }),
                            this.headers.each(function () {
                                e -= t(this).outerHeight(!0);
                            }),
                            this.headers
                                .next()
                                .each(function () {
                                    t(this).height(
                                        Math.max(
                                            0,
                                            e -
                                                t(this).innerHeight() +
                                                t(this).height()
                                        )
                                    );
                                })
                                .css('overflow', 'auto'))
                          : 'auto' === s &&
                            ((e = 0),
                            this.headers
                                .next()
                                .each(function () {
                                    var i = t(this).is(':visible');
                                    i || t(this).show(),
                                        (e = Math.max(
                                            e,
                                            t(this).css('height', '').height()
                                        )),
                                        i || t(this).hide();
                                })
                                .height(e));
              },
              _activate: function (e) {
                  var i = this._findActive(e)[0];
                  i !== this.active[0] &&
                      ((i = i || this.active[0]),
                      this._eventHandler({
                          target: i,
                          currentTarget: i,
                          preventDefault: t.noop,
                      }));
              },
              _findActive: function (e) {
                  return 'number' == typeof e ? this.headers.eq(e) : t();
              },
              _setupEvents: function (e) {
                  var i = { keydown: '_keydown' };
                  e &&
                      t.each(e.split(' '), function (t, e) {
                          i[e] = '_eventHandler';
                      }),
                      this._off(this.headers.add(this.headers.next())),
                      this._on(this.headers, i),
                      this._on(this.headers.next(), { keydown: '_panelKeyDown' }),
                      this._hoverable(this.headers),
                      this._focusable(this.headers);
              },
              _eventHandler: function (e) {
                  var i,
                      s,
                      n = this.options,
                      o = this.active,
                      a = t(e.currentTarget),
                      r = a[0] === o[0],
                      h = r && n.collapsible,
                      l = h ? t() : a.next(),
                      c = o.next(),
                      u = {
                          oldHeader: o,
                          oldPanel: c,
                          newHeader: h ? t() : a,
                          newPanel: l,
                      };
                  e.preventDefault(),
                      (r && !n.collapsible) ||
                          !1 === this._trigger('beforeActivate', e, u) ||
                          ((n.active = !h && this.headers.index(a)),
                          (this.active = r ? t() : a),
                          this._toggle(u),
                          this._removeClass(
                              o,
                              'ui-accordion-header-active',
                              'ui-state-active'
                          ),
                          n.icons &&
                              ((i = o.children('.ui-accordion-header-icon')),
                              this._removeClass(
                                  i,
                                  null,
                                  n.icons.activeHeader
                              )._addClass(i, null, n.icons.header)),
                          r ||
                              (this._removeClass(
                                  a,
                                  'ui-accordion-header-collapsed'
                              )._addClass(
                                  a,
                                  'ui-accordion-header-active',
                                  'ui-state-active'
                              ),
                              n.icons &&
                                  ((s = a.children('.ui-accordion-header-icon')),
                                  this._removeClass(
                                      s,
                                      null,
                                      n.icons.header
                                  )._addClass(s, null, n.icons.activeHeader)),
                              this._addClass(
                                  a.next(),
                                  'ui-accordion-content-active'
                              )));
              },
              _toggle: function (e) {
                  var i = e.newPanel,
                      s = this.prevShow.length ? this.prevShow : e.oldPanel;
                  this.prevShow.add(this.prevHide).stop(!0, !0),
                      (this.prevShow = i),
                      (this.prevHide = s),
                      this.options.animate
                          ? this._animate(i, s, e)
                          : (s.hide(), i.show(), this._toggleComplete(e)),
                      s.attr({ 'aria-hidden': 'true' }),
                      s.prev().attr({
                          'aria-selected': 'false',
                          'aria-expanded': 'false',
                      }),
                      i.length && s.length
                          ? s
                                .prev()
                                .attr({ tabIndex: -1, 'aria-expanded': 'false' })
                          : i.length &&
                            this.headers
                                .filter(function () {
                                    return (
                                        0 ===
                                        parseInt(t(this).attr('tabIndex'), 10)
                                    );
                                })
                                .attr('tabIndex', -1),
                      i.attr('aria-hidden', 'false').prev().attr({
                          'aria-selected': 'true',
                          'aria-expanded': 'true',
                          tabIndex: 0,
                      });
              },
              _animate: function (t, e, i) {
                  var s,
                      n,
                      o,
                      a = this,
                      r = 0,
                      h = t.css('box-sizing'),
                      l = t.length && (!e.length || t.index() < e.index()),
                      c = this.options.animate || {},
                      u = (l && c.down) || c,
                      d = function () {
                          a._toggleComplete(i);
                      };
                  return (
                      'number' == typeof u && (o = u),
                      'string' == typeof u && (n = u),
                      (n = n || u.easing || c.easing),
                      (o = o || u.duration || c.duration),
                      e.length
                          ? t.length
                              ? ((s = t.show().outerHeight()),
                                e.animate(this.hideProps, {
                                    duration: o,
                                    easing: n,
                                    step: function (t, e) {
                                        e.now = Math.round(t);
                                    },
                                }),
                                void t.hide().animate(this.showProps, {
                                    duration: o,
                                    easing: n,
                                    complete: d,
                                    step: function (t, i) {
                                        (i.now = Math.round(t)),
                                            'height' !== i.prop
                                                ? 'content-box' === h &&
                                                  (r += i.now)
                                                : 'content' !==
                                                      a.options.heightStyle &&
                                                  ((i.now = Math.round(
                                                      s - e.outerHeight() - r
                                                  )),
                                                  (r = 0));
                                    },
                                }))
                              : e.animate(this.hideProps, o, n, d)
                          : t.animate(this.showProps, o, n, d)
                  );
              },
              _toggleComplete: function (t) {
                  var e = t.oldPanel,
                      i = e.prev();
                  this._removeClass(e, 'ui-accordion-content-active'),
                      this._removeClass(
                          i,
                          'ui-accordion-header-active'
                      )._addClass(i, 'ui-accordion-header-collapsed'),
                      e.length &&
                          (e.parent()[0].className = e.parent()[0].className),
                      this._trigger('activate', null, t);
              },
          }),
          (t.ui.safeActiveElement = function (t) {
              var e;
              try {
                  e = t.activeElement;
              } catch (i) {
                  e = t.body;
              }
              return e || (e = t.body), e.nodeName || (e = t.body), e;
          }),
          t.widget('ui.menu', {
              version: '1.12.1',
              defaultElement: '<ul>',
              delay: 300,
              options: {
                  icons: { submenu: 'ui-icon-caret-1-e' },
                  items: '> *',
                  menus: 'ul',
                  position: { my: 'left top', at: 'right top' },
                  role: 'menu',
                  blur: null,
                  focus: null,
                  select: null,
              },
              _create: function () {
                  (this.activeMenu = this.element),
                      (this.mouseHandled = !1),
                      this.element
                          .uniqueId()
                          .attr({ role: this.options.role, tabIndex: 0 }),
                      this._addClass('ui-menu', 'ui-widget ui-widget-content'),
                      this._on({
                          'mousedown .ui-menu-item': function (t) {
                              t.preventDefault();
                          },
                          'click .ui-menu-item': function (e) {
                              var i = t(e.target),
                                  s = t(t.ui.safeActiveElement(this.document[0]));
                              !this.mouseHandled &&
                                  i.not('.ui-state-disabled').length &&
                                  (this.select(e),
                                  e.isPropagationStopped() ||
                                      (this.mouseHandled = !0),
                                  i.has('.ui-menu').length
                                      ? this.expand(e)
                                      : !this.element.is(':focus') &&
                                        s.closest('.ui-menu').length &&
                                        (this.element.trigger('focus', [!0]),
                                        this.active &&
                                            1 ===
                                                this.active.parents('.ui-menu')
                                                    .length &&
                                            clearTimeout(this.timer)));
                          },
                          'mouseenter .ui-menu-item': function (e) {
                              if (!this.previousFilter) {
                                  var i = t(e.target).closest('.ui-menu-item'),
                                      s = t(e.currentTarget);
                                  i[0] === s[0] &&
                                      (this._removeClass(
                                          s
                                              .siblings()
                                              .children('.ui-state-active'),
                                          null,
                                          'ui-state-active'
                                      ),
                                      this.focus(e, s));
                              }
                          },
                          mouseleave: 'collapseAll',
                          'mouseleave .ui-menu': 'collapseAll',
                          focus: function (t, e) {
                              var i =
                                  this.active ||
                                  this.element.find(this.options.items).eq(0);
                              e || this.focus(t, i);
                          },
                          blur: function (e) {
                              this._delay(function () {
                                  !t.contains(
                                      this.element[0],
                                      t.ui.safeActiveElement(this.document[0])
                                  ) && this.collapseAll(e);
                              });
                          },
                          keydown: '_keydown',
                      }),
                      this.refresh(),
                      this._on(this.document, {
                          click: function (t) {
                              this._closeOnDocumentClick(t) &&
                                  this.collapseAll(t),
                                  (this.mouseHandled = !1);
                          },
                      });
              },
              _destroy: function () {
                  var e = this.element
                      .find('.ui-menu-item')
                      .removeAttr('role aria-disabled')
                      .children('.ui-menu-item-wrapper')
                      .removeUniqueId()
                      .removeAttr('tabIndex role aria-haspopup');
                  this.element
                      .removeAttr('aria-activedescendant')
                      .find('.ui-menu')
                      .addBack()
                      .removeAttr(
                          'role aria-labelledby aria-expanded aria-hidden aria-disabled tabIndex'
                      )
                      .removeUniqueId()
                      .show(),
                      e.children().each(function () {
                          var e = t(this);
                          e.data('ui-menu-submenu-caret') && e.remove();
                      });
              },
              _keydown: function (e) {
                  var i,
                      s,
                      n,
                      o,
                      a = !0;
                  switch (e.keyCode) {
                      case t.ui.keyCode.PAGE_UP:
                          this.previousPage(e);
                          break;
                      case t.ui.keyCode.PAGE_DOWN:
                          this.nextPage(e);
                          break;
                      case t.ui.keyCode.HOME:
                          this._move('first', 'first', e);
                          break;
                      case t.ui.keyCode.END:
                          this._move('last', 'last', e);
                          break;
                      case t.ui.keyCode.UP:
                          this.previous(e);
                          break;
                      case t.ui.keyCode.DOWN:
                          this.next(e);
                          break;
                      case t.ui.keyCode.LEFT:
                          this.collapse(e);
                          break;
                      case t.ui.keyCode.RIGHT:
                          this.active &&
                              !this.active.is('.ui-state-disabled') &&
                              this.expand(e);
                          break;
                      case t.ui.keyCode.ENTER:
                      case t.ui.keyCode.SPACE:
                          this._activate(e);
                          break;
                      case t.ui.keyCode.ESCAPE:
                          this.collapse(e);
                          break;
                      default:
                          (a = !1),
                              (s = this.previousFilter || ''),
                              (o = !1),
                              (n =
                                  e.keyCode >= 96 && 105 >= e.keyCode
                                      ? '' + (e.keyCode - 96)
                                      : String.fromCharCode(e.keyCode)),
                              clearTimeout(this.filterTimer),
                              n === s ? (o = !0) : (n = s + n),
                              (i = this._filterMenuItems(n)),
                              (i =
                                  o && -1 !== i.index(this.active.next())
                                      ? this.active.nextAll('.ui-menu-item')
                                      : i).length ||
                                  ((n = String.fromCharCode(e.keyCode)),
                                  (i = this._filterMenuItems(n))),
                              i.length
                                  ? (this.focus(e, i),
                                    (this.previousFilter = n),
                                    (this.filterTimer = this._delay(function () {
                                        delete this.previousFilter;
                                    }, 1e3)))
                                  : delete this.previousFilter;
                  }
                  a && e.preventDefault();
              },
              _activate: function (t) {
                  this.active &&
                      !this.active.is('.ui-state-disabled') &&
                      (this.active.children("[aria-haspopup='true']").length
                          ? this.expand(t)
                          : this.select(t));
              },
              refresh: function () {
                  var e,
                      i,
                      s,
                      n,
                      o = this,
                      a = this.options.icons.submenu,
                      r = this.element.find(this.options.menus);
                  this._toggleClass(
                      'ui-menu-icons',
                      null,
                      !!this.element.find('.ui-icon').length
                  ),
                      (i = r
                          .filter(':not(.ui-menu)')
                          .hide()
                          .attr({
                              role: this.options.role,
                              'aria-hidden': 'true',
                              'aria-expanded': 'false',
                          })
                          .each(function () {
                              var e = t(this),
                                  i = e.prev(),
                                  s = t('<span>').data(
                                      'ui-menu-submenu-caret',
                                      !0
                                  );
                              o._addClass(s, 'ui-menu-icon', 'ui-icon ' + a),
                                  i.attr('aria-haspopup', 'true').prepend(s),
                                  e.attr('aria-labelledby', i.attr('id'));
                          })),
                      this._addClass(
                          i,
                          'ui-menu',
                          'ui-widget ui-widget-content ui-front'
                      ),
                      (e = r.add(this.element).find(this.options.items))
                          .not('.ui-menu-item')
                          .each(function () {
                              var e = t(this);
                              o._isDivider(e) &&
                                  o._addClass(
                                      e,
                                      'ui-menu-divider',
                                      'ui-widget-content'
                                  );
                          }),
                      (n = (s = e.not('.ui-menu-item, .ui-menu-divider'))
                          .children()
                          .not('.ui-menu')
                          .uniqueId()
                          .attr({ tabIndex: -1, role: this._itemRole() })),
                      this._addClass(s, 'ui-menu-item')._addClass(
                          n,
                          'ui-menu-item-wrapper'
                      ),
                      e
                          .filter('.ui-state-disabled')
                          .attr('aria-disabled', 'true'),
                      this.active &&
                          !t.contains(this.element[0], this.active[0]) &&
                          this.blur();
              },
              _itemRole: function () {
                  return { menu: 'menuitem', listbox: 'option' }[
                      this.options.role
                  ];
              },
              _setOption: function (t, e) {
                  if ('icons' === t) {
                      var i = this.element.find('.ui-menu-icon');
                      this._removeClass(
                          i,
                          null,
                          this.options.icons.submenu
                      )._addClass(i, null, e.submenu);
                  }
                  this._super(t, e);
              },
              _setOptionDisabled: function (t) {
                  this._super(t),
                      this.element.attr('aria-disabled', t + ''),
                      this._toggleClass(null, 'ui-state-disabled', !!t);
              },
              focus: function (t, e) {
                  var i, s, n;
                  this.blur(t, t && 'focus' === t.type),
                      this._scrollIntoView(e),
                      (this.active = e.first()),
                      (s = this.active.children('.ui-menu-item-wrapper')),
                      this._addClass(s, null, 'ui-state-active'),
                      this.options.role &&
                          this.element.attr(
                              'aria-activedescendant',
                              s.attr('id')
                          ),
                      (n = this.active
                          .parent()
                          .closest('.ui-menu-item')
                          .children('.ui-menu-item-wrapper')),
                      this._addClass(n, null, 'ui-state-active'),
                      t && 'keydown' === t.type
                          ? this._close()
                          : (this.timer = this._delay(function () {
                                this._close();
                            }, this.delay)),
                      (i = e.children('.ui-menu')).length &&
                          t &&
                          /^mouse/.test(t.type) &&
                          this._startOpening(i),
                      (this.activeMenu = e.parent()),
                      this._trigger('focus', t, { item: e });
              },
              _scrollIntoView: function (e) {
                  var i, s, n, o, a, r;
                  this._hasScroll() &&
                      ((i =
                          parseFloat(
                              t.css(this.activeMenu[0], 'borderTopWidth')
                          ) || 0),
                      (s =
                          parseFloat(t.css(this.activeMenu[0], 'paddingTop')) ||
                          0),
                      (n = e.offset().top - this.activeMenu.offset().top - i - s),
                      (o = this.activeMenu.scrollTop()),
                      (a = this.activeMenu.height()),
                      (r = e.outerHeight()),
                      0 > n
                          ? this.activeMenu.scrollTop(o + n)
                          : n + r > a &&
                            this.activeMenu.scrollTop(o + n - a + r));
              },
              blur: function (t, e) {
                  e || clearTimeout(this.timer),
                      this.active &&
                          (this._removeClass(
                              this.active.children('.ui-menu-item-wrapper'),
                              null,
                              'ui-state-active'
                          ),
                          this._trigger('blur', t, { item: this.active }),
                          (this.active = null));
              },
              _startOpening: function (t) {
                  clearTimeout(this.timer),
                      'true' === t.attr('aria-hidden') &&
                          (this.timer = this._delay(function () {
                              this._close(), this._open(t);
                          }, this.delay));
              },
              _open: function (e) {
                  var i = t.extend({ of: this.active }, this.options.position);
                  clearTimeout(this.timer),
                      this.element
                          .find('.ui-menu')
                          .not(e.parents('.ui-menu'))
                          .hide()
                          .attr('aria-hidden', 'true'),
                      e
                          .show()
                          .removeAttr('aria-hidden')
                          .attr('aria-expanded', 'true')
                          .position(i);
              },
              collapseAll: function (e, i) {
                  clearTimeout(this.timer),
                      (this.timer = this._delay(function () {
                          var s = i
                              ? this.element
                              : t(e && e.target).closest(
                                    this.element.find('.ui-menu')
                                );
                          s.length || (s = this.element),
                              this._close(s),
                              this.blur(e),
                              this._removeClass(
                                  s.find('.ui-state-active'),
                                  null,
                                  'ui-state-active'
                              ),
                              (this.activeMenu = s);
                      }, this.delay));
              },
              _close: function (t) {
                  t || (t = this.active ? this.active.parent() : this.element),
                      t
                          .find('.ui-menu')
                          .hide()
                          .attr('aria-hidden', 'true')
                          .attr('aria-expanded', 'false');
              },
              _closeOnDocumentClick: function (e) {
                  return !t(e.target).closest('.ui-menu').length;
              },
              _isDivider: function (t) {
                  return !/[^\-\u2014\u2013\s]/.test(t.text());
              },
              collapse: function (t) {
                  var e =
                      this.active &&
                      this.active.parent().closest('.ui-menu-item', this.element);
                  e && e.length && (this._close(), this.focus(t, e));
              },
              expand: function (t) {
                  var e =
                      this.active &&
                      this.active
                          .children('.ui-menu ')
                          .find(this.options.items)
                          .first();
                  e &&
                      e.length &&
                      (this._open(e.parent()),
                      this._delay(function () {
                          this.focus(t, e);
                      }));
              },
              next: function (t) {
                  this._move('next', 'first', t);
              },
              previous: function (t) {
                  this._move('prev', 'last', t);
              },
              isFirstItem: function () {
                  return (
                      this.active && !this.active.prevAll('.ui-menu-item').length
                  );
              },
              isLastItem: function () {
                  return (
                      this.active && !this.active.nextAll('.ui-menu-item').length
                  );
              },
              _move: function (t, e, i) {
                  var s;
                  this.active &&
                      (s =
                          'first' === t || 'last' === t
                              ? this.active[
                                    'first' === t ? 'prevAll' : 'nextAll'
                                ]('.ui-menu-item').eq(-1)
                              : this.active[t + 'All']('.ui-menu-item').eq(0)),
                      (s && s.length && this.active) ||
                          (s = this.activeMenu.find(this.options.items)[e]()),
                      this.focus(i, s);
              },
              nextPage: function (e) {
                  var i, s, n;
                  return this.active
                      ? void (
                            this.isLastItem() ||
                            (this._hasScroll()
                                ? ((s = this.active.offset().top),
                                  (n = this.element.height()),
                                  this.active
                                      .nextAll('.ui-menu-item')
                                      .each(function () {
                                          return (
                                              0 >
                                              (i = t(this)).offset().top - s - n
                                          );
                                      }),
                                  this.focus(e, i))
                                : this.focus(
                                      e,
                                      this.activeMenu
                                          .find(this.options.items)
                                          [this.active ? 'last' : 'first']()
                                  ))
                        )
                      : void this.next(e);
              },
              previousPage: function (e) {
                  var i, s, n;
                  return this.active
                      ? void (
                            this.isFirstItem() ||
                            (this._hasScroll()
                                ? ((s = this.active.offset().top),
                                  (n = this.element.height()),
                                  this.active
                                      .prevAll('.ui-menu-item')
                                      .each(function () {
                                          return (
                                              (i = t(this)).offset().top - s + n >
                                              0
                                          );
                                      }),
                                  this.focus(e, i))
                                : this.focus(
                                      e,
                                      this.activeMenu
                                          .find(this.options.items)
                                          .first()
                                  ))
                        )
                      : void this.next(e);
              },
              _hasScroll: function () {
                  return (
                      this.element.outerHeight() <
                      this.element.prop('scrollHeight')
                  );
              },
              select: function (e) {
                  this.active =
                      this.active || t(e.target).closest('.ui-menu-item');
                  var i = { item: this.active };
                  this.active.has('.ui-menu').length || this.collapseAll(e, !0),
                      this._trigger('select', e, i);
              },
              _filterMenuItems: function (e) {
                  var i = e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&'),
                      s = RegExp('^' + i, 'i');
                  return this.activeMenu
                      .find(this.options.items)
                      .filter('.ui-menu-item')
                      .filter(function () {
                          return s.test(
                              t.trim(
                                  t(this).children('.ui-menu-item-wrapper').text()
                              )
                          );
                      });
              },
          }),
          t.widget('ui.autocomplete', {
              version: '1.12.1',
              defaultElement: '<input>',
              options: {
                  appendTo: null,
                  autoFocus: !1,
                  delay: 300,
                  minLength: 1,
                  position: {
                      my: 'left top',
                      at: 'left bottom',
                      collision: 'none',
                  },
                  source: null,
                  change: null,
                  close: null,
                  focus: null,
                  open: null,
                  response: null,
                  search: null,
                  select: null,
              },
              requestIndex: 0,
              pending: 0,
              _create: function () {
                  var e,
                      i,
                      s,
                      n = this.element[0].nodeName.toLowerCase(),
                      o = 'textarea' === n,
                      a = 'input' === n;
                  (this.isMultiLine =
                      o || (!a && this._isContentEditable(this.element))),
                      (this.valueMethod = this.element[o || a ? 'val' : 'text']),
                      (this.isNewMenu = !0),
                      this._addClass('ui-autocomplete-input'),
                      this.element.attr('autocomplete', 'off'),
                      this._on(this.element, {
                          keydown: function (n) {
                              if (this.element.prop('readOnly'))
                                  return (e = !0), (s = !0), void (i = !0);
                              (e = !1), (s = !1), (i = !1);
                              var o = t.ui.keyCode;
                              switch (n.keyCode) {
                                  case o.PAGE_UP:
                                      (e = !0), this._move('previousPage', n);
                                      break;
                                  case o.PAGE_DOWN:
                                      (e = !0), this._move('nextPage', n);
                                      break;
                                  case o.UP:
                                      (e = !0), this._keyEvent('previous', n);
                                      break;
                                  case o.DOWN:
                                      (e = !0), this._keyEvent('next', n);
                                      break;
                                  case o.ENTER:
                                      this.menu.active &&
                                          ((e = !0),
                                          n.preventDefault(),
                                          this.menu.select(n));
                                      break;
                                  case o.TAB:
                                      this.menu.active && this.menu.select(n);
                                      break;
                                  case o.ESCAPE:
                                      this.menu.element.is(':visible') &&
                                          (this.isMultiLine ||
                                              this._value(this.term),
                                          this.close(n),
                                          n.preventDefault());
                                      break;
                                  default:
                                      (i = !0), this._searchTimeout(n);
                              }
                          },
                          keypress: function (s) {
                              if (e)
                                  return (
                                      (e = !1),
                                      void (
                                          (!this.isMultiLine ||
                                              this.menu.element.is(':visible')) &&
                                          s.preventDefault()
                                      )
                                  );
                              if (!i) {
                                  var n = t.ui.keyCode;
                                  switch (s.keyCode) {
                                      case n.PAGE_UP:
                                          this._move('previousPage', s);
                                          break;
                                      case n.PAGE_DOWN:
                                          this._move('nextPage', s);
                                          break;
                                      case n.UP:
                                          this._keyEvent('previous', s);
                                          break;
                                      case n.DOWN:
                                          this._keyEvent('next', s);
                                  }
                              }
                          },
                          input: function (t) {
                              return s
                                  ? ((s = !1), void t.preventDefault())
                                  : void this._searchTimeout(t);
                          },
                          focus: function () {
                              (this.selectedItem = null),
                                  (this.previous = this._value());
                          },
                          blur: function (t) {
                              return this.cancelBlur
                                  ? void delete this.cancelBlur
                                  : (clearTimeout(this.searching),
                                    this.close(t),
                                    void this._change(t));
                          },
                      }),
                      this._initSource(),
                      (this.menu = t('<ul>')
                          .appendTo(this._appendTo())
                          .menu({ role: null })
                          .hide()
                          .menu('instance')),
                      this._addClass(
                          this.menu.element,
                          'ui-autocomplete',
                          'ui-front'
                      ),
                      this._on(this.menu.element, {
                          mousedown: function (e) {
                              e.preventDefault(),
                                  (this.cancelBlur = !0),
                                  this._delay(function () {
                                      delete this.cancelBlur,
                                          this.element[0] !==
                                              t.ui.safeActiveElement(
                                                  this.document[0]
                                              ) && this.element.trigger('focus');
                                  });
                          },
                          menufocus: function (e, i) {
                              var s, n;
                              return this.isNewMenu &&
                                  ((this.isNewMenu = !1),
                                  e.originalEvent &&
                                      /^mouse/.test(e.originalEvent.type))
                                  ? (this.menu.blur(),
                                    void this.document.one(
                                        'mousemove',
                                        function () {
                                            t(e.target).trigger(e.originalEvent);
                                        }
                                    ))
                                  : ((n = i.item.data('ui-autocomplete-item')),
                                    !1 !==
                                        this._trigger('focus', e, { item: n }) &&
                                        e.originalEvent &&
                                        /^key/.test(e.originalEvent.type) &&
                                        this._value(n.value),
                                    void (
                                        (s =
                                            i.item.attr('aria-label') ||
                                            n.value) &&
                                        t.trim(s).length &&
                                        (this.liveRegion.children().hide(),
                                        t('<div>')
                                            .text(s)
                                            .appendTo(this.liveRegion))
                                    ));
                          },
                          menuselect: function (e, i) {
                              var s = i.item.data('ui-autocomplete-item'),
                                  n = this.previous;
                              this.element[0] !==
                                  t.ui.safeActiveElement(this.document[0]) &&
                                  (this.element.trigger('focus'),
                                  (this.previous = n),
                                  this._delay(function () {
                                      (this.previous = n),
                                          (this.selectedItem = s);
                                  })),
                                  !1 !==
                                      this._trigger('select', e, { item: s }) &&
                                      this._value(s.value),
                                  (this.term = this._value()),
                                  this.close(e),
                                  (this.selectedItem = s);
                          },
                      }),
                      (this.liveRegion = t('<div>', {
                          role: 'status',
                          'aria-live': 'assertive',
                          'aria-relevant': 'additions',
                      }).appendTo(this.document[0].body)),
                      this._addClass(
                          this.liveRegion,
                          null,
                          'ui-helper-hidden-accessible'
                      ),
                      this._on(this.window, {
                          beforeunload: function () {
                              this.element.removeAttr('autocomplete');
                          },
                      });
              },
              _destroy: function () {
                  clearTimeout(this.searching),
                      this.element.removeAttr('autocomplete'),
                      this.menu.element.remove(),
                      this.liveRegion.remove();
              },
              _setOption: function (t, e) {
                  this._super(t, e),
                      'source' === t && this._initSource(),
                      'appendTo' === t &&
                          this.menu.element.appendTo(this._appendTo()),
                      'disabled' === t && e && this.xhr && this.xhr.abort();
              },
              _isEventTargetInWidget: function (e) {
                  var i = this.menu.element[0];
                  return (
                      e.target === this.element[0] ||
                      e.target === i ||
                      t.contains(i, e.target)
                  );
              },
              _closeOnClickOutside: function (t) {
                  this._isEventTargetInWidget(t) || this.close();
              },
              _appendTo: function () {
                  var e = this.options.appendTo;
                  return (
                      e &&
                          (e =
                              e.jquery || e.nodeType
                                  ? t(e)
                                  : this.document.find(e).eq(0)),
                      (e && e[0]) ||
                          (e = this.element.closest('.ui-front, dialog')),
                      e.length || (e = this.document[0].body),
                      e
                  );
              },
              _initSource: function () {
                  var e,
                      i,
                      s = this;
                  t.isArray(this.options.source)
                      ? ((e = this.options.source),
                        (this.source = function (i, s) {
                            s(t.ui.autocomplete.filter(e, i.term));
                        }))
                      : 'string' == typeof this.options.source
                      ? ((i = this.options.source),
                        (this.source = function (e, n) {
                            s.xhr && s.xhr.abort(),
                                (s.xhr = t.ajax({
                                    url: i,
                                    data: e,
                                    dataType: 'json',
                                    success: function (t) {
                                        n(t);
                                    },
                                    error: function () {
                                        n([]);
                                    },
                                }));
                        }))
                      : (this.source = this.options.source);
              },
              _searchTimeout: function (t) {
                  clearTimeout(this.searching),
                      (this.searching = this._delay(function () {
                          var e = this.term === this._value(),
                              i = this.menu.element.is(':visible'),
                              s =
                                  t.altKey ||
                                  t.ctrlKey ||
                                  t.metaKey ||
                                  t.shiftKey;
                          (!e || (e && !i && !s)) &&
                              ((this.selectedItem = null), this.search(null, t));
                      }, this.options.delay));
              },
              search: function (t, e) {
                  return (
                      (t = null != t ? t : this._value()),
                      (this.term = this._value()),
                      t.length < this.options.minLength
                          ? this.close(e)
                          : !1 !== this._trigger('search', e)
                          ? this._search(t)
                          : void 0
                  );
              },
              _search: function (t) {
                  this.pending++,
                      this._addClass('ui-autocomplete-loading'),
                      (this.cancelSearch = !1),
                      this.source({ term: t }, this._response());
              },
              _response: function () {
                  var e = ++this.requestIndex;
                  return t.proxy(function (t) {
                      e === this.requestIndex && this.__response(t),
                          this.pending--,
                          this.pending ||
                              this._removeClass('ui-autocomplete-loading');
                  }, this);
              },
              __response: function (t) {
                  t && (t = this._normalize(t)),
                      this._trigger('response', null, { content: t }),
                      !this.options.disabled &&
                      t &&
                      t.length &&
                      !this.cancelSearch
                          ? (this._suggest(t), this._trigger('open'))
                          : this._close();
              },
              close: function (t) {
                  (this.cancelSearch = !0), this._close(t);
              },
              _close: function (t) {
                  this._off(this.document, 'mousedown'),
                      this.menu.element.is(':visible') &&
                          (this.menu.element.hide(),
                          this.menu.blur(),
                          (this.isNewMenu = !0),
                          this._trigger('close', t));
              },
              _change: function (t) {
                  this.previous !== this._value() &&
                      this._trigger('change', t, { item: this.selectedItem });
              },
              _normalize: function (e) {
                  return e.length && e[0].label && e[0].value
                      ? e
                      : t.map(e, function (e) {
                            return 'string' == typeof e
                                ? { label: e, value: e }
                                : t.extend({}, e, {
                                      label: e.label || e.value,
                                      value: e.value || e.label,
                                  });
                        });
              },
              _suggest: function (e) {
                  var i = this.menu.element.empty();
                  this._renderMenu(i, e),
                      (this.isNewMenu = !0),
                      this.menu.refresh(),
                      i.show(),
                      this._resizeMenu(),
                      i.position(
                          t.extend({ of: this.element }, this.options.position)
                      ),
                      this.options.autoFocus && this.menu.next(),
                      this._on(this.document, {
                          mousedown: '_closeOnClickOutside',
                      });
              },
              _resizeMenu: function () {
                  var t = this.menu.element;
                  t.outerWidth(
                      Math.max(
                          t.width('').outerWidth() + 1,
                          this.element.outerWidth()
                      )
                  );
              },
              _renderMenu: function (e, i) {
                  var s = this;
                  t.each(i, function (t, i) {
                      s._renderItemData(e, i);
                  });
              },
              _renderItemData: function (t, e) {
                  return this._renderItem(t, e).data('ui-autocomplete-item', e);
              },
              _renderItem: function (e, i) {
                  return t('<li>').append(t('<div>').text(i.label)).appendTo(e);
              },
              _move: function (t, e) {
                  return this.menu.element.is(':visible')
                      ? (this.menu.isFirstItem() && /^previous/.test(t)) ||
                        (this.menu.isLastItem() && /^next/.test(t))
                          ? (this.isMultiLine || this._value(this.term),
                            void this.menu.blur())
                          : void this.menu[t](e)
                      : void this.search(null, e);
              },
              widget: function () {
                  return this.menu.element;
              },
              _value: function () {
                  return this.valueMethod.apply(this.element, arguments);
              },
              _keyEvent: function (t, e) {
                  (!this.isMultiLine || this.menu.element.is(':visible')) &&
                      (this._move(t, e), e.preventDefault());
              },
              _isContentEditable: function (t) {
                  if (!t.length) return !1;
                  var e = t.prop('contentEditable');
                  return 'inherit' === e
                      ? this._isContentEditable(t.parent())
                      : 'true' === e;
              },
          }),
          t.extend(t.ui.autocomplete, {
              escapeRegex: function (t) {
                  return t.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
              },
              filter: function (e, i) {
                  var s = RegExp(t.ui.autocomplete.escapeRegex(i), 'i');
                  return t.grep(e, function (t) {
                      return s.test(t.label || t.value || t);
                  });
              },
          }),
          t.widget('ui.autocomplete', t.ui.autocomplete, {
              options: {
                  messages: {
                      noResults: 'No search results.',
                      results: function (t) {
                          return (
                              t +
                              (t > 1 ? ' results are' : ' result is') +
                              ' available, use up and down arrow keys to navigate.'
                          );
                      },
                  },
              },
              __response: function (e) {
                  var i;
                  this._superApply(arguments),
                      this.options.disabled ||
                          this.cancelSearch ||
                          ((i =
                              e && e.length
                                  ? this.options.messages.results(e.length)
                                  : this.options.messages.noResults),
                          this.liveRegion.children().hide(),
                          t('<div>').text(i).appendTo(this.liveRegion));
              },
          }),
          t.ui.autocomplete;
      var d,
          p = /ui-corner-([a-z]){2,6}/g;
      t.widget('ui.controlgroup', {
          version: '1.12.1',
          defaultElement: '<div>',
          options: {
              direction: 'horizontal',
              disabled: null,
              onlyVisible: !0,
              items: {
                  button:
                      'input[type=button], input[type=submit], input[type=reset], button, a',
                  controlgroupLabel: '.ui-controlgroup-label',
                  checkboxradio: "input[type='checkbox'], input[type='radio']",
                  selectmenu: 'select',
                  spinner: '.ui-spinner-input',
              },
          },
          _create: function () {
              this._enhance();
          },
          _enhance: function () {
              this.element.attr('role', 'toolbar'), this.refresh();
          },
          _destroy: function () {
              this._callChildMethod('destroy'),
                  this.childWidgets.removeData('ui-controlgroup-data'),
                  this.element.removeAttr('role'),
                  this.options.items.controlgroupLabel &&
                      this.element
                          .find(this.options.items.controlgroupLabel)
                          .find('.ui-controlgroup-label-contents')
                          .contents()
                          .unwrap();
          },
          _initWidgets: function () {
              var e = this,
                  i = [];
              t.each(this.options.items, function (s, n) {
                  var o,
                      a = {};
                  return n
                      ? 'controlgroupLabel' === s
                          ? ((o = e.element.find(n)).each(function () {
                                var e = t(this);
                                e.children('.ui-controlgroup-label-contents')
                                    .length ||
                                    e
                                        .contents()
                                        .wrapAll(
                                            "<span class='ui-controlgroup-label-contents'></span>"
                                        );
                            }),
                            e._addClass(
                                o,
                                null,
                                'ui-widget ui-widget-content ui-state-default'
                            ),
                            void (i = i.concat(o.get())))
                          : void (
                                t.fn[s] &&
                                ((a = e['_' + s + 'Options']
                                    ? e['_' + s + 'Options']('middle')
                                    : { classes: {} }),
                                e.element.find(n).each(function () {
                                    var n = t(this),
                                        o = n[s]('instance'),
                                        r = t.widget.extend({}, a);
                                    if (
                                        'button' !== s ||
                                        !n.parent('.ui-spinner').length
                                    ) {
                                        o || (o = n[s]()[s]('instance')),
                                            o &&
                                                (r.classes = e._resolveClassesValues(
                                                    r.classes,
                                                    o
                                                )),
                                            n[s](r);
                                        var h = n[s]('widget');
                                        t.data(
                                            h[0],
                                            'ui-controlgroup-data',
                                            o || n[s]('instance')
                                        ),
                                            i.push(h[0]);
                                    }
                                }))
                            )
                      : void 0;
              }),
                  (this.childWidgets = t(t.unique(i))),
                  this._addClass(this.childWidgets, 'ui-controlgroup-item');
          },
          _callChildMethod: function (e) {
              this.childWidgets.each(function () {
                  var i = t(this).data('ui-controlgroup-data');
                  i && i[e] && i[e]();
              });
          },
          _updateCornerClass: function (t, e) {
              var i = this._buildSimpleOptions(e, 'label').classes.label;
              this._removeClass(
                  t,
                  null,
                  'ui-corner-top ui-corner-bottom ui-corner-left ui-corner-right ui-corner-all'
              ),
                  this._addClass(t, null, i);
          },
          _buildSimpleOptions: function (t, e) {
              var i = 'vertical' === this.options.direction,
                  s = { classes: {} };
              return (
                  (s.classes[e] = {
                      middle: '',
                      first: 'ui-corner-' + (i ? 'top' : 'left'),
                      last: 'ui-corner-' + (i ? 'bottom' : 'right'),
                      only: 'ui-corner-all',
                  }[t]),
                  s
              );
          },
          _spinnerOptions: function (t) {
              var e = this._buildSimpleOptions(t, 'ui-spinner');
              return (
                  (e.classes['ui-spinner-up'] = ''),
                  (e.classes['ui-spinner-down'] = ''),
                  e
              );
          },
          _buttonOptions: function (t) {
              return this._buildSimpleOptions(t, 'ui-button');
          },
          _checkboxradioOptions: function (t) {
              return this._buildSimpleOptions(t, 'ui-checkboxradio-label');
          },
          _selectmenuOptions: function (t) {
              var e = 'vertical' === this.options.direction;
              return {
                  width: !!e && 'auto',
                  classes: {
                      middle: {
                          'ui-selectmenu-button-open': '',
                          'ui-selectmenu-button-closed': '',
                      },
                      first: {
                          'ui-selectmenu-button-open':
                              'ui-corner-' + (e ? 'top' : 'tl'),
                          'ui-selectmenu-button-closed':
                              'ui-corner-' + (e ? 'top' : 'left'),
                      },
                      last: {
                          'ui-selectmenu-button-open': e ? '' : 'ui-corner-tr',
                          'ui-selectmenu-button-closed':
                              'ui-corner-' + (e ? 'bottom' : 'right'),
                      },
                      only: {
                          'ui-selectmenu-button-open': 'ui-corner-top',
                          'ui-selectmenu-button-closed': 'ui-corner-all',
                      },
                  }[t],
              };
          },
          _resolveClassesValues: function (e, i) {
              var s = {};
              return (
                  t.each(e, function (n) {
                      var o = i.options.classes[n] || '';
                      (o = t.trim(o.replace(p, ''))),
                          (s[n] = (o + ' ' + e[n]).replace(/\s+/g, ' '));
                  }),
                  s
              );
          },
          _setOption: function (t, e) {
              return (
                  'direction' === t &&
                      this._removeClass(
                          'ui-controlgroup-' + this.options.direction
                      ),
                  this._super(t, e),
                  'disabled' === t
                      ? void this._callChildMethod(e ? 'disable' : 'enable')
                      : void this.refresh()
              );
          },
          refresh: function () {
              var e,
                  i = this;
              this._addClass(
                  'ui-controlgroup ui-controlgroup-' + this.options.direction
              ),
                  'horizontal' === this.options.direction &&
                      this._addClass(null, 'ui-helper-clearfix'),
                  this._initWidgets(),
                  (e = this.childWidgets),
                  this.options.onlyVisible && (e = e.filter(':visible')),
                  e.length &&
                      (t.each(['first', 'last'], function (t, s) {
                          var n = e[s]().data('ui-controlgroup-data');
                          if (n && i['_' + n.widgetName + 'Options']) {
                              var o = i['_' + n.widgetName + 'Options'](
                                  1 === e.length ? 'only' : s
                              );
                              (o.classes = i._resolveClassesValues(o.classes, n)),
                                  n.element[n.widgetName](o);
                          } else i._updateCornerClass(e[s](), s);
                      }),
                      this._callChildMethod('refresh'));
          },
      }),
          t.widget('ui.checkboxradio', [
              t.ui.formResetMixin,
              {
                  version: '1.12.1',
                  options: {
                      disabled: null,
                      label: null,
                      icon: !0,
                      classes: {
                          'ui-checkboxradio-label': 'ui-corner-all',
                          'ui-checkboxradio-icon': 'ui-corner-all',
                      },
                  },
                  _getCreateOptions: function () {
                      var e,
                          i,
                          s = this,
                          n = this._super() || {};
                      return (
                          this._readType(),
                          (i = this.element.labels()),
                          (this.label = t(i[i.length - 1])),
                          this.label.length ||
                              t.error('No label found for checkboxradio widget'),
                          (this.originalLabel = ''),
                          this.label
                              .contents()
                              .not(this.element[0])
                              .each(function () {
                                  s.originalLabel +=
                                      3 === this.nodeType
                                          ? t(this).text()
                                          : this.outerHTML;
                              }),
                          this.originalLabel && (n.label = this.originalLabel),
                          null != (e = this.element[0].disabled) &&
                              (n.disabled = e),
                          n
                      );
                  },
                  _create: function () {
                      var t = this.element[0].checked;
                      this._bindFormResetHandler(),
                          null == this.options.disabled &&
                              (this.options.disabled = this.element[0].disabled),
                          this._setOption('disabled', this.options.disabled),
                          this._addClass(
                              'ui-checkboxradio',
                              'ui-helper-hidden-accessible'
                          ),
                          this._addClass(
                              this.label,
                              'ui-checkboxradio-label',
                              'ui-button ui-widget'
                          ),
                          'radio' === this.type &&
                              this._addClass(
                                  this.label,
                                  'ui-checkboxradio-radio-label'
                              ),
                          this.options.label &&
                          this.options.label !== this.originalLabel
                              ? this._updateLabel()
                              : this.originalLabel &&
                                (this.options.label = this.originalLabel),
                          this._enhance(),
                          t &&
                              (this._addClass(
                                  this.label,
                                  'ui-checkboxradio-checked',
                                  'ui-state-active'
                              ),
                              this.icon &&
                                  this._addClass(
                                      this.icon,
                                      null,
                                      'ui-state-hover'
                                  )),
                          this._on({
                              change: '_toggleClasses',
                              focus: function () {
                                  this._addClass(
                                      this.label,
                                      null,
                                      'ui-state-focus ui-visual-focus'
                                  );
                              },
                              blur: function () {
                                  this._removeClass(
                                      this.label,
                                      null,
                                      'ui-state-focus ui-visual-focus'
                                  );
                              },
                          });
                  },
                  _readType: function () {
                      var e = this.element[0].nodeName.toLowerCase();
                      (this.type = this.element[0].type),
                          ('input' === e && /radio|checkbox/.test(this.type)) ||
                              t.error(
                                  "Can't create checkboxradio on element.nodeName=" +
                                      e +
                                      ' and element.type=' +
                                      this.type
                              );
                  },
                  _enhance: function () {
                      this._updateIcon(this.element[0].checked);
                  },
                  widget: function () {
                      return this.label;
                  },
                  _getRadioGroup: function () {
                      var e = this.element[0].name,
                          i = "input[name='" + t.ui.escapeSelector(e) + "']";
                      return e
                          ? (this.form.length
                                ? t(this.form[0].elements).filter(i)
                                : t(i).filter(function () {
                                      return 0 === t(this).form().length;
                                  })
                            ).not(this.element)
                          : t([]);
                  },
                  _toggleClasses: function () {
                      var e = this.element[0].checked;
                      this._toggleClass(
                          this.label,
                          'ui-checkboxradio-checked',
                          'ui-state-active',
                          e
                      ),
                          this.options.icon &&
                              'checkbox' === this.type &&
                              this._toggleClass(
                                  this.icon,
                                  null,
                                  'ui-icon-check ui-state-checked',
                                  e
                              )._toggleClass(
                                  this.icon,
                                  null,
                                  'ui-icon-blank',
                                  !e
                              ),
                          'radio' === this.type &&
                              this._getRadioGroup().each(function () {
                                  var e = t(this).checkboxradio('instance');
                                  e &&
                                      e._removeClass(
                                          e.label,
                                          'ui-checkboxradio-checked',
                                          'ui-state-active'
                                      );
                              });
                  },
                  _destroy: function () {
                      this._unbindFormResetHandler(),
                          this.icon &&
                              (this.icon.remove(), this.iconSpace.remove());
                  },
                  _setOption: function (t, e) {
                      return 'label' !== t || e
                          ? (this._super(t, e),
                            'disabled' === t
                                ? (this._toggleClass(
                                      this.label,
                                      null,
                                      'ui-state-disabled',
                                      e
                                  ),
                                  void (this.element[0].disabled = e))
                                : void this.refresh())
                          : void 0;
                  },
                  _updateIcon: function (e) {
                      var i = 'ui-icon ui-icon-background ';
                      this.options.icon
                          ? (this.icon ||
                                ((this.icon = t('<span>')),
                                (this.iconSpace = t('<span> </span>')),
                                this._addClass(
                                    this.iconSpace,
                                    'ui-checkboxradio-icon-space'
                                )),
                            'checkbox' === this.type
                                ? ((i += e
                                      ? 'ui-icon-check ui-state-checked'
                                      : 'ui-icon-blank'),
                                  this._removeClass(
                                      this.icon,
                                      null,
                                      e ? 'ui-icon-blank' : 'ui-icon-check'
                                  ))
                                : (i += 'ui-icon-blank'),
                            this._addClass(this.icon, 'ui-checkboxradio-icon', i),
                            e ||
                                this._removeClass(
                                    this.icon,
                                    null,
                                    'ui-icon-check ui-state-checked'
                                ),
                            this.icon.prependTo(this.label).after(this.iconSpace))
                          : void 0 !== this.icon &&
                            (this.icon.remove(),
                            this.iconSpace.remove(),
                            delete this.icon);
                  },
                  _updateLabel: function () {
                      var t = this.label.contents().not(this.element[0]);
                      this.icon && (t = t.not(this.icon[0])),
                          this.iconSpace && (t = t.not(this.iconSpace[0])),
                          t.remove(),
                          this.label.append(this.options.label);
                  },
                  refresh: function () {
                      var t = this.element[0].checked,
                          e = this.element[0].disabled;
                      this._updateIcon(t),
                          this._toggleClass(
                              this.label,
                              'ui-checkboxradio-checked',
                              'ui-state-active',
                              t
                          ),
                          null !== this.options.label && this._updateLabel(),
                          e !== this.options.disabled &&
                              this._setOptions({ disabled: e });
                  },
              },
          ]),
          t.ui.checkboxradio,
          t.widget('ui.button', {
              version: '1.12.1',
              defaultElement: '<button>',
              options: {
                  classes: { 'ui-button': 'ui-corner-all' },
                  disabled: null,
                  icon: null,
                  iconPosition: 'beginning',
                  label: null,
                  showLabel: !0,
              },
              _getCreateOptions: function () {
                  var t,
                      e = this._super() || {};
                  return (
                      (this.isInput = this.element.is('input')),
                      null != (t = this.element[0].disabled) && (e.disabled = t),
                      (this.originalLabel = this.isInput
                          ? this.element.val()
                          : this.element.html()),
                      this.originalLabel && (e.label = this.originalLabel),
                      e
                  );
              },
              _create: function () {
                  !this.option.showLabel & !this.options.icon &&
                      (this.options.showLabel = !0),
                      null == this.options.disabled &&
                          (this.options.disabled =
                              this.element[0].disabled || !1),
                      (this.hasTitle = !!this.element.attr('title')),
                      this.options.label &&
                          this.options.label !== this.originalLabel &&
                          (this.isInput
                              ? this.element.val(this.options.label)
                              : this.element.html(this.options.label)),
                      this._addClass('ui-button', 'ui-widget'),
                      this._setOption('disabled', this.options.disabled),
                      this._enhance(),
                      this.element.is('a') &&
                          this._on({
                              keyup: function (e) {
                                  e.keyCode === t.ui.keyCode.SPACE &&
                                      (e.preventDefault(),
                                      this.element[0].click
                                          ? this.element[0].click()
                                          : this.element.trigger('click'));
                              },
                          });
              },
              _enhance: function () {
                  this.element.is('button') ||
                      this.element.attr('role', 'button'),
                      this.options.icon &&
                          (this._updateIcon('icon', this.options.icon),
                          this._updateTooltip());
              },
              _updateTooltip: function () {
                  (this.title = this.element.attr('title')),
                      this.options.showLabel ||
                          this.title ||
                          this.element.attr('title', this.options.label);
              },
              _updateIcon: function (e, i) {
                  var s = 'iconPosition' !== e,
                      n = s ? this.options.iconPosition : i,
                      o = 'top' === n || 'bottom' === n;
                  this.icon
                      ? s && this._removeClass(this.icon, null, this.options.icon)
                      : ((this.icon = t('<span>')),
                        this._addClass(this.icon, 'ui-button-icon', 'ui-icon'),
                        this.options.showLabel ||
                            this._addClass('ui-button-icon-only')),
                      s && this._addClass(this.icon, null, i),
                      this._attachIcon(n),
                      o
                          ? (this._addClass(
                                this.icon,
                                null,
                                'ui-widget-icon-block'
                            ),
                            this.iconSpace && this.iconSpace.remove())
                          : (this.iconSpace ||
                                ((this.iconSpace = t('<span> </span>')),
                                this._addClass(
                                    this.iconSpace,
                                    'ui-button-icon-space'
                                )),
                            this._removeClass(
                                this.icon,
                                null,
                                'ui-wiget-icon-block'
                            ),
                            this._attachIconSpace(n));
              },
              _destroy: function () {
                  this.element.removeAttr('role'),
                      this.icon && this.icon.remove(),
                      this.iconSpace && this.iconSpace.remove(),
                      this.hasTitle || this.element.removeAttr('title');
              },
              _attachIconSpace: function (t) {
                  this.icon[/^(?:end|bottom)/.test(t) ? 'before' : 'after'](
                      this.iconSpace
                  );
              },
              _attachIcon: function (t) {
                  this.element[/^(?:end|bottom)/.test(t) ? 'append' : 'prepend'](
                      this.icon
                  );
              },
              _setOptions: function (t) {
                  var e =
                          void 0 === t.showLabel
                              ? this.options.showLabel
                              : t.showLabel,
                      i = void 0 === t.icon ? this.options.icon : t.icon;
                  e || i || (t.showLabel = !0), this._super(t);
              },
              _setOption: function (t, e) {
                  'icon' === t &&
                      (e
                          ? this._updateIcon(t, e)
                          : this.icon &&
                            (this.icon.remove(),
                            this.iconSpace && this.iconSpace.remove())),
                      'iconPosition' === t && this._updateIcon(t, e),
                      'showLabel' === t &&
                          (this._toggleClass('ui-button-icon-only', null, !e),
                          this._updateTooltip()),
                      'label' === t &&
                          (this.isInput
                              ? this.element.val(e)
                              : (this.element.html(e),
                                this.icon &&
                                    (this._attachIcon(this.options.iconPosition),
                                    this._attachIconSpace(
                                        this.options.iconPosition
                                    )))),
                      this._super(t, e),
                      'disabled' === t &&
                          (this._toggleClass(null, 'ui-state-disabled', e),
                          (this.element[0].disabled = e),
                          e && this.element.blur());
              },
              refresh: function () {
                  var t = this.element.is('input, button')
                      ? this.element[0].disabled
                      : this.element.hasClass('ui-button-disabled');
                  t !== this.options.disabled &&
                      this._setOptions({ disabled: t }),
                      this._updateTooltip();
              },
          }),
          !1 !== t.uiBackCompat &&
              (t.widget('ui.button', t.ui.button, {
                  options: {
                      text: !0,
                      icons: { primary: null, secondary: null },
                  },
                  _create: function () {
                      this.options.showLabel &&
                          !this.options.text &&
                          (this.options.showLabel = this.options.text),
                          !this.options.showLabel &&
                              this.options.text &&
                              (this.options.text = this.options.showLabel),
                          this.options.icon ||
                          (!this.options.icons.primary &&
                              !this.options.icons.secondary)
                              ? this.options.icon &&
                                (this.options.icons.primary = this.options.icon)
                              : this.options.icons.primary
                              ? (this.options.icon = this.options.icons.primary)
                              : ((this.options.icon = this.options.icons.secondary),
                                (this.options.iconPosition = 'end')),
                          this._super();
                  },
                  _setOption: function (t, e) {
                      return 'text' === t
                          ? void this._super('showLabel', e)
                          : ('showLabel' === t && (this.options.text = e),
                            'icon' === t && (this.options.icons.primary = e),
                            'icons' === t &&
                                (e.primary
                                    ? (this._super('icon', e.primary),
                                      this._super('iconPosition', 'beginning'))
                                    : e.secondary &&
                                      (this._super('icon', e.secondary),
                                      this._super('iconPosition', 'end'))),
                            void this._superApply(arguments));
                  },
              }),
              (t.fn.button = (function (e) {
                  return function () {
                      return !this.length ||
                          (this.length && 'INPUT' !== this[0].tagName) ||
                          (this.length &&
                              'INPUT' === this[0].tagName &&
                              'checkbox' !== this.attr('type') &&
                              'radio' !== this.attr('type'))
                          ? e.apply(this, arguments)
                          : (t.ui.checkboxradio ||
                                t.error('Checkboxradio widget missing'),
                            0 === arguments.length
                                ? this.checkboxradio({ icon: !1 })
                                : this.checkboxradio.apply(this, arguments));
                  };
              })(t.fn.button)),
              (t.fn.buttonset = function () {
                  return (
                      t.ui.controlgroup || t.error('Controlgroup widget missing'),
                      'option' === arguments[0] &&
                      'items' === arguments[1] &&
                      arguments[2]
                          ? this.controlgroup.apply(this, [
                                arguments[0],
                                'items.button',
                                arguments[2],
                            ])
                          : 'option' === arguments[0] && 'items' === arguments[1]
                          ? this.controlgroup.apply(this, [
                                arguments[0],
                                'items.button',
                            ])
                          : ('object' == typeof arguments[0] &&
                                arguments[0].items &&
                                (arguments[0].items = {
                                    button: arguments[0].items,
                                }),
                            this.controlgroup.apply(this, arguments))
                  );
              })),
          t.ui.button,
          t.extend(t.ui, { datepicker: { version: '1.12.1' } }),
          t.extend(e.prototype, {
              markerClassName: 'hasDatepicker',
              maxRows: 4,
              _widgetDatepicker: function () {
                  return this.dpDiv;
              },
              setDefaults: function (t) {
                  return n(this._defaults, t || {}), this;
              },
              _attachDatepicker: function (e, i) {
                  var s, n, o;
                  (n = 'div' === (s = e.nodeName.toLowerCase()) || 'span' === s),
                      e.id || ((this.uuid += 1), (e.id = 'dp' + this.uuid)),
                      ((o = this._newInst(t(e), n)).settings = t.extend(
                          {},
                          i || {}
                      )),
                      'input' === s
                          ? this._connectDatepicker(e, o)
                          : n && this._inlineDatepicker(e, o);
              },
              _newInst: function (e, s) {
                  return {
                      id: e[0].id.replace(/([^A-Za-z0-9_\-])/g, '\\\\$1'),
                      input: e,
                      selectedDay: 0,
                      selectedMonth: 0,
                      selectedYear: 0,
                      drawMonth: 0,
                      drawYear: 0,
                      inline: s,
                      dpDiv: s
                          ? i(
                                t(
                                    "<div class='" +
                                        this._inlineClass +
                                        " ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all'></div>"
                                )
                            )
                          : this.dpDiv,
                  };
              },
              _connectDatepicker: function (e, i) {
                  var s = t(e);
                  (i.append = t([])),
                      (i.trigger = t([])),
                      s.hasClass(this.markerClassName) ||
                          (this._attachments(s, i),
                          s
                              .addClass(this.markerClassName)
                              .on('keydown', this._doKeyDown)
                              .on('keypress', this._doKeyPress)
                              .on('keyup', this._doKeyUp),
                          this._autoSize(i),
                          t.data(e, 'datepicker', i),
                          i.settings.disabled && this._disableDatepicker(e));
              },
              _attachments: function (e, i) {
                  var s,
                      n,
                      o,
                      a = this._get(i, 'appendText'),
                      r = this._get(i, 'isRTL');
                  i.append && i.append.remove(),
                      a &&
                          ((i.append = t(
                              "<span class='" +
                                  this._appendClass +
                                  "'>" +
                                  a +
                                  '</span>'
                          )),
                          e[r ? 'before' : 'after'](i.append)),
                      e.off('focus', this._showDatepicker),
                      i.trigger && i.trigger.remove(),
                      ('focus' === (s = this._get(i, 'showOn')) ||
                          'both' === s) &&
                          e.on('focus', this._showDatepicker),
                      ('button' === s || 'both' === s) &&
                          ((n = this._get(i, 'buttonText')),
                          (o = this._get(i, 'buttonImage')),
                          (i.trigger = t(
                              this._get(i, 'buttonImageOnly')
                                  ? t('<img/>')
                                        .addClass(this._triggerClass)
                                        .attr({ src: o, alt: n, title: n })
                                  : t("<button type='button'></button>")
                                        .addClass(this._triggerClass)
                                        .html(
                                            o
                                                ? t('<img/>').attr({
                                                      src: o,
                                                      alt: n,
                                                      title: n,
                                                  })
                                                : n
                                        )
                          )),
                          e[r ? 'before' : 'after'](i.trigger),
                          i.trigger.on('click', function () {
                              return (
                                  t.datepicker._datepickerShowing &&
                                  t.datepicker._lastInput === e[0]
                                      ? t.datepicker._hideDatepicker()
                                      : t.datepicker._datepickerShowing &&
                                        t.datepicker._lastInput !== e[0]
                                      ? (t.datepicker._hideDatepicker(),
                                        t.datepicker._showDatepicker(e[0]))
                                      : t.datepicker._showDatepicker(e[0]),
                                  !1
                              );
                          }));
              },
              _autoSize: function (t) {
                  if (this._get(t, 'autoSize') && !t.inline) {
                      var e,
                          i,
                          s,
                          n,
                          o = new Date(2009, 11, 20),
                          a = this._get(t, 'dateFormat');
                      a.match(/[DM]/) &&
                          ((e = function (t) {
                              for (i = 0, s = 0, n = 0; t.length > n; n++)
                                  t[n].length > i && ((i = t[n].length), (s = n));
                              return s;
                          }),
                          o.setMonth(
                              e(
                                  this._get(
                                      t,
                                      a.match(/MM/)
                                          ? 'monthNames'
                                          : 'monthNamesShort'
                                  )
                              )
                          ),
                          o.setDate(
                              e(
                                  this._get(
                                      t,
                                      a.match(/DD/) ? 'dayNames' : 'dayNamesShort'
                                  )
                              ) +
                                  20 -
                                  o.getDay()
                          )),
                          t.input.attr('size', this._formatDate(t, o).length);
                  }
              },
              _inlineDatepicker: function (e, i) {
                  var s = t(e);
                  s.hasClass(this.markerClassName) ||
                      (s.addClass(this.markerClassName).append(i.dpDiv),
                      t.data(e, 'datepicker', i),
                      this._setDate(i, this._getDefaultDate(i), !0),
                      this._updateDatepicker(i),
                      this._updateAlternate(i),
                      i.settings.disabled && this._disableDatepicker(e),
                      i.dpDiv.css('display', 'block'));
              },
              _dialogDatepicker: function (e, i, s, o, a) {
                  var r,
                      h,
                      l,
                      c,
                      u,
                      d = this._dialogInst;
                  return (
                      d ||
                          ((this.uuid += 1),
                          (r = 'dp' + this.uuid),
                          (this._dialogInput = t(
                              "<input type='text' id='" +
                                  r +
                                  "' style='position: absolute; top: -100px; width: 0px;'/>"
                          )),
                          this._dialogInput.on('keydown', this._doKeyDown),
                          t('body').append(this._dialogInput),
                          ((d = this._dialogInst = this._newInst(
                              this._dialogInput,
                              !1
                          )).settings = {}),
                          t.data(this._dialogInput[0], 'datepicker', d)),
                      n(d.settings, o || {}),
                      (i =
                          i && i.constructor === Date
                              ? this._formatDate(d, i)
                              : i),
                      this._dialogInput.val(i),
                      (this._pos = a
                          ? a.length
                              ? a
                              : [a.pageX, a.pageY]
                          : null),
                      this._pos ||
                          ((h = document.documentElement.clientWidth),
                          (l = document.documentElement.clientHeight),
                          (c =
                              document.documentElement.scrollLeft ||
                              document.body.scrollLeft),
                          (u =
                              document.documentElement.scrollTop ||
                              document.body.scrollTop),
                          (this._pos = [h / 2 - 100 + c, l / 2 - 150 + u])),
                      this._dialogInput
                          .css('left', this._pos[0] + 20 + 'px')
                          .css('top', this._pos[1] + 'px'),
                      (d.settings.onSelect = s),
                      (this._inDialog = !0),
                      this.dpDiv.addClass(this._dialogClass),
                      this._showDatepicker(this._dialogInput[0]),
                      t.blockUI && t.blockUI(this.dpDiv),
                      t.data(this._dialogInput[0], 'datepicker', d),
                      this
                  );
              },
              _destroyDatepicker: function (e) {
                  var i,
                      s = t(e),
                      n = t.data(e, 'datepicker');
                  s.hasClass(this.markerClassName) &&
                      ((i = e.nodeName.toLowerCase()),
                      t.removeData(e, 'datepicker'),
                      'input' === i
                          ? (n.append.remove(),
                            n.trigger.remove(),
                            s
                                .removeClass(this.markerClassName)
                                .off('focus', this._showDatepicker)
                                .off('keydown', this._doKeyDown)
                                .off('keypress', this._doKeyPress)
                                .off('keyup', this._doKeyUp))
                          : ('div' === i || 'span' === i) &&
                            s.removeClass(this.markerClassName).empty(),
                      d === n && (d = null));
              },
              _enableDatepicker: function (e) {
                  var i,
                      s,
                      n = t(e),
                      o = t.data(e, 'datepicker');
                  n.hasClass(this.markerClassName) &&
                      ('input' === (i = e.nodeName.toLowerCase())
                          ? ((e.disabled = !1),
                            o.trigger
                                .filter('button')
                                .each(function () {
                                    this.disabled = !1;
                                })
                                .end()
                                .filter('img')
                                .css({ opacity: '1.0', cursor: '' }))
                          : ('div' === i || 'span' === i) &&
                            ((s = n.children('.' + this._inlineClass))
                                .children()
                                .removeClass('ui-state-disabled'),
                            s
                                .find(
                                    'select.ui-datepicker-month, select.ui-datepicker-year'
                                )
                                .prop('disabled', !1)),
                      (this._disabledInputs = t.map(
                          this._disabledInputs,
                          function (t) {
                              return t === e ? null : t;
                          }
                      )));
              },
              _disableDatepicker: function (e) {
                  var i,
                      s,
                      n = t(e),
                      o = t.data(e, 'datepicker');
                  n.hasClass(this.markerClassName) &&
                      ('input' === (i = e.nodeName.toLowerCase())
                          ? ((e.disabled = !0),
                            o.trigger
                                .filter('button')
                                .each(function () {
                                    this.disabled = !0;
                                })
                                .end()
                                .filter('img')
                                .css({ opacity: '0.5', cursor: 'default' }))
                          : ('div' === i || 'span' === i) &&
                            ((s = n.children('.' + this._inlineClass))
                                .children()
                                .addClass('ui-state-disabled'),
                            s
                                .find(
                                    'select.ui-datepicker-month, select.ui-datepicker-year'
                                )
                                .prop('disabled', !0)),
                      (this._disabledInputs = t.map(
                          this._disabledInputs,
                          function (t) {
                              return t === e ? null : t;
                          }
                      )),
                      (this._disabledInputs[this._disabledInputs.length] = e));
              },
              _isDisabledDatepicker: function (t) {
                  if (!t) return !1;
                  for (var e = 0; this._disabledInputs.length > e; e++)
                      if (this._disabledInputs[e] === t) return !0;
                  return !1;
              },
              _getInst: function (e) {
                  try {
                      return t.data(e, 'datepicker');
                  } catch (t) {
                      throw 'Missing instance data for this datepicker';
                  }
              },
              _optionDatepicker: function (e, i, s) {
                  var o,
                      a,
                      r,
                      h,
                      l = this._getInst(e);
                  return 2 === arguments.length && 'string' == typeof i
                      ? 'defaults' === i
                          ? t.extend({}, t.datepicker._defaults)
                          : l
                          ? 'all' === i
                              ? t.extend({}, l.settings)
                              : this._get(l, i)
                          : null
                      : ((o = i || {}),
                        'string' == typeof i && ((o = {})[i] = s),
                        void (
                            l &&
                            (this._curInst === l && this._hideDatepicker(),
                            (a = this._getDateDatepicker(e, !0)),
                            (r = this._getMinMaxDate(l, 'min')),
                            (h = this._getMinMaxDate(l, 'max')),
                            n(l.settings, o),
                            null !== r &&
                                void 0 !== o.dateFormat &&
                                void 0 === o.minDate &&
                                (l.settings.minDate = this._formatDate(l, r)),
                            null !== h &&
                                void 0 !== o.dateFormat &&
                                void 0 === o.maxDate &&
                                (l.settings.maxDate = this._formatDate(l, h)),
                            'disabled' in o &&
                                (o.disabled
                                    ? this._disableDatepicker(e)
                                    : this._enableDatepicker(e)),
                            this._attachments(t(e), l),
                            this._autoSize(l),
                            this._setDate(l, a),
                            this._updateAlternate(l),
                            this._updateDatepicker(l))
                        ));
              },
              _changeDatepicker: function (t, e, i) {
                  this._optionDatepicker(t, e, i);
              },
              _refreshDatepicker: function (t) {
                  var e = this._getInst(t);
                  e && this._updateDatepicker(e);
              },
              _setDateDatepicker: function (t, e) {
                  var i = this._getInst(t);
                  i &&
                      (this._setDate(i, e),
                      this._updateDatepicker(i),
                      this._updateAlternate(i));
              },
              _getDateDatepicker: function (t, e) {
                  var i = this._getInst(t);
                  return (
                      i && !i.inline && this._setDateFromField(i, e),
                      i ? this._getDate(i) : null
                  );
              },
              _doKeyDown: function (e) {
                  var i,
                      s,
                      n,
                      o = t.datepicker._getInst(e.target),
                      a = !0,
                      r = o.dpDiv.is('.ui-datepicker-rtl');
                  if (((o._keyEvent = !0), t.datepicker._datepickerShowing))
                      switch (e.keyCode) {
                          case 9:
                              t.datepicker._hideDatepicker(), (a = !1);
                              break;
                          case 13:
                              return (
                                  (n = t(
                                      'td.' +
                                          t.datepicker._dayOverClass +
                                          ':not(.' +
                                          t.datepicker._currentClass +
                                          ')',
                                      o.dpDiv
                                  ))[0] &&
                                      t.datepicker._selectDay(
                                          e.target,
                                          o.selectedMonth,
                                          o.selectedYear,
                                          n[0]
                                      ),
                                  (i = t.datepicker._get(o, 'onSelect'))
                                      ? ((s = t.datepicker._formatDate(o)),
                                        i.apply(o.input ? o.input[0] : null, [
                                            s,
                                            o,
                                        ]))
                                      : t.datepicker._hideDatepicker(),
                                  !1
                              );
                          case 27:
                              t.datepicker._hideDatepicker();
                              break;
                          case 33:
                              t.datepicker._adjustDate(
                                  e.target,
                                  e.ctrlKey
                                      ? -t.datepicker._get(o, 'stepBigMonths')
                                      : -t.datepicker._get(o, 'stepMonths'),
                                  'M'
                              );
                              break;
                          case 34:
                              t.datepicker._adjustDate(
                                  e.target,
                                  e.ctrlKey
                                      ? +t.datepicker._get(o, 'stepBigMonths')
                                      : +t.datepicker._get(o, 'stepMonths'),
                                  'M'
                              );
                              break;
                          case 35:
                              (e.ctrlKey || e.metaKey) &&
                                  t.datepicker._clearDate(e.target),
                                  (a = e.ctrlKey || e.metaKey);
                              break;
                          case 36:
                              (e.ctrlKey || e.metaKey) &&
                                  t.datepicker._gotoToday(e.target),
                                  (a = e.ctrlKey || e.metaKey);
                              break;
                          case 37:
                              (e.ctrlKey || e.metaKey) &&
                                  t.datepicker._adjustDate(
                                      e.target,
                                      r ? 1 : -1,
                                      'D'
                                  ),
                                  (a = e.ctrlKey || e.metaKey),
                                  e.originalEvent.altKey &&
                                      t.datepicker._adjustDate(
                                          e.target,
                                          e.ctrlKey
                                              ? -t.datepicker._get(
                                                    o,
                                                    'stepBigMonths'
                                                )
                                              : -t.datepicker._get(
                                                    o,
                                                    'stepMonths'
                                                ),
                                          'M'
                                      );
                              break;
                          case 38:
                              (e.ctrlKey || e.metaKey) &&
                                  t.datepicker._adjustDate(e.target, -7, 'D'),
                                  (a = e.ctrlKey || e.metaKey);
                              break;
                          case 39:
                              (e.ctrlKey || e.metaKey) &&
                                  t.datepicker._adjustDate(
                                      e.target,
                                      r ? -1 : 1,
                                      'D'
                                  ),
                                  (a = e.ctrlKey || e.metaKey),
                                  e.originalEvent.altKey &&
                                      t.datepicker._adjustDate(
                                          e.target,
                                          e.ctrlKey
                                              ? +t.datepicker._get(
                                                    o,
                                                    'stepBigMonths'
                                                )
                                              : +t.datepicker._get(
                                                    o,
                                                    'stepMonths'
                                                ),
                                          'M'
                                      );
                              break;
                          case 40:
                              (e.ctrlKey || e.metaKey) &&
                                  t.datepicker._adjustDate(e.target, 7, 'D'),
                                  (a = e.ctrlKey || e.metaKey);
                              break;
                          default:
                              a = !1;
                      }
                  else
                      36 === e.keyCode && e.ctrlKey
                          ? t.datepicker._showDatepicker(this)
                          : (a = !1);
                  a && (e.preventDefault(), e.stopPropagation());
              },
              _doKeyPress: function (e) {
                  var i,
                      s,
                      n = t.datepicker._getInst(e.target);
                  return t.datepicker._get(n, 'constrainInput')
                      ? ((i = t.datepicker._possibleChars(
                            t.datepicker._get(n, 'dateFormat')
                        )),
                        (s = String.fromCharCode(
                            null == e.charCode ? e.keyCode : e.charCode
                        )),
                        e.ctrlKey ||
                            e.metaKey ||
                            ' ' > s ||
                            !i ||
                            i.indexOf(s) > -1)
                      : void 0;
              },
              _doKeyUp: function (e) {
                  var i = t.datepicker._getInst(e.target);
                  if (i.input.val() !== i.lastVal)
                      try {
                          t.datepicker.parseDate(
                              t.datepicker._get(i, 'dateFormat'),
                              i.input ? i.input.val() : null,
                              t.datepicker._getFormatConfig(i)
                          ) &&
                              (t.datepicker._setDateFromField(i),
                              t.datepicker._updateAlternate(i),
                              t.datepicker._updateDatepicker(i));
                      } catch (t) {}
                  return !0;
              },
              _showDatepicker: function (e) {
                  var i, s, o, a, r, h, l;
                  ('input' !== (e = e.target || e).nodeName.toLowerCase() &&
                      (e = t('input', e.parentNode)[0]),
                  t.datepicker._isDisabledDatepicker(e) ||
                      t.datepicker._lastInput === e) ||
                      ((i = t.datepicker._getInst(e)),
                      t.datepicker._curInst &&
                          t.datepicker._curInst !== i &&
                          (t.datepicker._curInst.dpDiv.stop(!0, !0),
                          i &&
                              t.datepicker._datepickerShowing &&
                              t.datepicker._hideDatepicker(
                                  t.datepicker._curInst.input[0]
                              )),
                      !1 !==
                          (o = (s = t.datepicker._get(i, 'beforeShow'))
                              ? s.apply(e, [e, i])
                              : {}) &&
                          (n(i.settings, o),
                          (i.lastVal = null),
                          (t.datepicker._lastInput = e),
                          t.datepicker._setDateFromField(i),
                          t.datepicker._inDialog && (e.value = ''),
                          t.datepicker._pos ||
                              ((t.datepicker._pos = t.datepicker._findPos(e)),
                              (t.datepicker._pos[1] += e.offsetHeight)),
                          (a = !1),
                          t(e)
                              .parents()
                              .each(function () {
                                  return !(a |=
                                      'fixed' === t(this).css('position'));
                              }),
                          (r = {
                              left: t.datepicker._pos[0],
                              top: t.datepicker._pos[1],
                          }),
                          (t.datepicker._pos = null),
                          i.dpDiv.empty(),
                          i.dpDiv.css({
                              position: 'absolute',
                              display: 'block',
                              top: '-1000px',
                          }),
                          t.datepicker._updateDatepicker(i),
                          (r = t.datepicker._checkOffset(i, r, a)),
                          i.dpDiv.css({
                              position:
                                  t.datepicker._inDialog && t.blockUI
                                      ? 'static'
                                      : a
                                      ? 'fixed'
                                      : 'absolute',
                              display: 'none',
                              left: r.left + 'px',
                              top: r.top + 'px',
                          }),
                          i.inline ||
                              ((h = t.datepicker._get(i, 'showAnim')),
                              (l = t.datepicker._get(i, 'duration')),
                              i.dpDiv.css(
                                  'z-index',
                                  (function (t) {
                                      for (
                                          var e, i;
                                          t.length && t[0] !== document;

                                      ) {
                                          if (
                                              ('absolute' ===
                                                  (e = t.css('position')) ||
                                                  'relative' === e ||
                                                  'fixed' === e) &&
                                              ((i = parseInt(
                                                  t.css('zIndex'),
                                                  10
                                              )),
                                              !isNaN(i) && 0 !== i)
                                          )
                                              return i;
                                          t = t.parent();
                                      }
                                      return 0;
                                  })(t(e)) + 1
                              ),
                              (t.datepicker._datepickerShowing = !0),
                              t.effects && t.effects.effect[h]
                                  ? i.dpDiv.show(
                                        h,
                                        t.datepicker._get(i, 'showOptions'),
                                        l
                                    )
                                  : i.dpDiv[h || 'show'](h ? l : null),
                              t.datepicker._shouldFocusInput(i) &&
                                  i.input.trigger('focus'),
                              (t.datepicker._curInst = i))));
              },
              _updateDatepicker: function (e) {
                  (this.maxRows = 4),
                      (d = e),
                      e.dpDiv.empty().append(this._generateHTML(e)),
                      this._attachHandlers(e);
                  var i,
                      n = this._getNumberOfMonths(e),
                      o = n[1],
                      a = e.dpDiv.find('.' + this._dayOverClass + ' a');
                  a.length > 0 && s.apply(a.get(0)),
                      e.dpDiv
                          .removeClass(
                              'ui-datepicker-multi-2 ui-datepicker-multi-3 ui-datepicker-multi-4'
                          )
                          .width(''),
                      o > 1 &&
                          e.dpDiv
                              .addClass('ui-datepicker-multi-' + o)
                              .css('width', 17 * o + 'em'),
                      e.dpDiv[
                          (1 !== n[0] || 1 !== n[1] ? 'add' : 'remove') + 'Class'
                      ]('ui-datepicker-multi'),
                      e.dpDiv[
                          (this._get(e, 'isRTL') ? 'add' : 'remove') + 'Class'
                      ]('ui-datepicker-rtl'),
                      e === t.datepicker._curInst &&
                          t.datepicker._datepickerShowing &&
                          t.datepicker._shouldFocusInput(e) &&
                          e.input.trigger('focus'),
                      e.yearshtml &&
                          ((i = e.yearshtml),
                          setTimeout(function () {
                              i === e.yearshtml &&
                                  e.yearshtml &&
                                  e.dpDiv
                                      .find('select.ui-datepicker-year:first')
                                      .replaceWith(e.yearshtml),
                                  (i = e.yearshtml = null);
                          }, 0));
              },
              _shouldFocusInput: function (t) {
                  return (
                      t.input &&
                      t.input.is(':visible') &&
                      !t.input.is(':disabled') &&
                      !t.input.is(':focus')
                  );
              },
              _checkOffset: function (e, i, s) {
                  var n = e.dpDiv.outerWidth(),
                      o = e.dpDiv.outerHeight(),
                      a = e.input ? e.input.outerWidth() : 0,
                      r = e.input ? e.input.outerHeight() : 0,
                      h =
                          document.documentElement.clientWidth +
                          (s ? 0 : t(document).scrollLeft()),
                      l =
                          document.documentElement.clientHeight +
                          (s ? 0 : t(document).scrollTop());
                  return (
                      (i.left -= this._get(e, 'isRTL') ? n - a : 0),
                      (i.left -=
                          s && i.left === e.input.offset().left
                              ? t(document).scrollLeft()
                              : 0),
                      (i.top -=
                          s && i.top === e.input.offset().top + r
                              ? t(document).scrollTop()
                              : 0),
                      (i.left -= Math.min(
                          i.left,
                          i.left + n > h && h > n ? Math.abs(i.left + n - h) : 0
                      )),
                      (i.top -= Math.min(
                          i.top,
                          i.top + o > l && l > o ? Math.abs(o + r) : 0
                      )),
                      i
                  );
              },
              _findPos: function (e) {
                  for (
                      var i, s = this._getInst(e), n = this._get(s, 'isRTL');
                      e &&
                      ('hidden' === e.type ||
                          1 !== e.nodeType ||
                          t.expr.filters.hidden(e));

                  )
                      e = e[n ? 'previousSibling' : 'nextSibling'];
                  return [(i = t(e).offset()).left, i.top];
              },
              _hideDatepicker: function (e) {
                  var i,
                      s,
                      n,
                      o,
                      a = this._curInst;
                  !a ||
                      (e && a !== t.data(e, 'datepicker')) ||
                      (this._datepickerShowing &&
                          ((i = this._get(a, 'showAnim')),
                          (s = this._get(a, 'duration')),
                          (n = function () {
                              t.datepicker._tidyDialog(a);
                          }),
                          t.effects && (t.effects.effect[i] || t.effects[i])
                              ? a.dpDiv.hide(
                                    i,
                                    t.datepicker._get(a, 'showOptions'),
                                    s,
                                    n
                                )
                              : a.dpDiv[
                                    'slideDown' === i
                                        ? 'slideUp'
                                        : 'fadeIn' === i
                                        ? 'fadeOut'
                                        : 'hide'
                                ](i ? s : null, n),
                          i || n(),
                          (this._datepickerShowing = !1),
                          (o = this._get(a, 'onClose')) &&
                              o.apply(a.input ? a.input[0] : null, [
                                  a.input ? a.input.val() : '',
                                  a,
                              ]),
                          (this._lastInput = null),
                          this._inDialog &&
                              (this._dialogInput.css({
                                  position: 'absolute',
                                  left: '0',
                                  top: '-100px',
                              }),
                              t.blockUI &&
                                  (t.unblockUI(), t('body').append(this.dpDiv))),
                          (this._inDialog = !1)));
              },
              _tidyDialog: function (t) {
                  t.dpDiv
                      .removeClass(this._dialogClass)
                      .off('.ui-datepicker-calendar');
              },
              _checkExternalClick: function (e) {
                  if (t.datepicker._curInst) {
                      var i = t(e.target),
                          s = t.datepicker._getInst(i[0]);
                      ((i[0].id !== t.datepicker._mainDivId &&
                          0 === i.parents('#' + t.datepicker._mainDivId).length &&
                          !i.hasClass(t.datepicker.markerClassName) &&
                          !i.closest('.' + t.datepicker._triggerClass).length &&
                          t.datepicker._datepickerShowing &&
                          (!t.datepicker._inDialog || !t.blockUI)) ||
                          (i.hasClass(t.datepicker.markerClassName) &&
                              t.datepicker._curInst !== s)) &&
                          t.datepicker._hideDatepicker();
                  }
              },
              _adjustDate: function (e, i, s) {
                  var n = t(e),
                      o = this._getInst(n[0]);
                  this._isDisabledDatepicker(n[0]) ||
                      (this._adjustInstDate(
                          o,
                          i + ('M' === s ? this._get(o, 'showCurrentAtPos') : 0),
                          s
                      ),
                      this._updateDatepicker(o));
              },
              _gotoToday: function (e) {
                  var i,
                      s = t(e),
                      n = this._getInst(s[0]);
                  this._get(n, 'gotoCurrent') && n.currentDay
                      ? ((n.selectedDay = n.currentDay),
                        (n.drawMonth = n.selectedMonth = n.currentMonth),
                        (n.drawYear = n.selectedYear = n.currentYear))
                      : ((i = new Date()),
                        (n.selectedDay = i.getDate()),
                        (n.drawMonth = n.selectedMonth = i.getMonth()),
                        (n.drawYear = n.selectedYear = i.getFullYear())),
                      this._notifyChange(n),
                      this._adjustDate(s);
              },
              _selectMonthYear: function (e, i, s) {
                  var n = t(e),
                      o = this._getInst(n[0]);
                  (o['selected' + ('M' === s ? 'Month' : 'Year')] = o[
                      'draw' + ('M' === s ? 'Month' : 'Year')
                  ] = parseInt(i.options[i.selectedIndex].value, 10)),
                      this._notifyChange(o),
                      this._adjustDate(n);
              },
              _selectDay: function (e, i, s, n) {
                  var o,
                      a = t(e);
                  t(n).hasClass(this._unselectableClass) ||
                      this._isDisabledDatepicker(a[0]) ||
                      (((o = this._getInst(a[0])).selectedDay = o.currentDay = t(
                          'a',
                          n
                      ).html()),
                      (o.selectedMonth = o.currentMonth = i),
                      (o.selectedYear = o.currentYear = s),
                      this._selectDate(
                          e,
                          this._formatDate(
                              o,
                              o.currentDay,
                              o.currentMonth,
                              o.currentYear
                          )
                      ));
              },
              _clearDate: function (e) {
                  var i = t(e);
                  this._selectDate(i, '');
              },
              _selectDate: function (e, i) {
                  var s,
                      n = t(e),
                      o = this._getInst(n[0]);
                  (i = null != i ? i : this._formatDate(o)),
                      o.input && o.input.val(i),
                      this._updateAlternate(o),
                      (s = this._get(o, 'onSelect'))
                          ? s.apply(o.input ? o.input[0] : null, [i, o])
                          : o.input && o.input.trigger('change'),
                      o.inline
                          ? this._updateDatepicker(o)
                          : (this._hideDatepicker(),
                            (this._lastInput = o.input[0]),
                            'object' != typeof o.input[0] &&
                                o.input.trigger('focus'),
                            (this._lastInput = null));
              },
              _updateAlternate: function (e) {
                  var i,
                      s,
                      n,
                      o = this._get(e, 'altField');
                  o &&
                      ((i =
                          this._get(e, 'altFormat') ||
                          this._get(e, 'dateFormat')),
                      (s = this._getDate(e)),
                      (n = this.formatDate(i, s, this._getFormatConfig(e))),
                      t(o).val(n));
              },
              noWeekends: function (t) {
                  var e = t.getDay();
                  return [e > 0 && 6 > e, ''];
              },
              iso8601Week: function (t) {
                  var e,
                      i = new Date(t.getTime());
                  return (
                      i.setDate(i.getDate() + 4 - (i.getDay() || 7)),
                      (e = i.getTime()),
                      i.setMonth(0),
                      i.setDate(1),
                      Math.floor(Math.round((e - i) / 864e5) / 7) + 1
                  );
              },
              parseDate: function (e, i, s) {
                  if (null == e || null == i) throw 'Invalid arguments';
                  if ('' === (i = 'object' == typeof i ? '' + i : i + ''))
                      return null;
                  var n,
                      o,
                      a,
                      r,
                      h = 0,
                      l =
                          (s ? s.shortYearCutoff : null) ||
                          this._defaults.shortYearCutoff,
                      c =
                          'string' != typeof l
                              ? l
                              : (new Date().getFullYear() % 100) +
                                parseInt(l, 10),
                      u =
                          (s ? s.dayNamesShort : null) ||
                          this._defaults.dayNamesShort,
                      d = (s ? s.dayNames : null) || this._defaults.dayNames,
                      p =
                          (s ? s.monthNamesShort : null) ||
                          this._defaults.monthNamesShort,
                      f = (s ? s.monthNames : null) || this._defaults.monthNames,
                      g = -1,
                      m = -1,
                      _ = -1,
                      v = -1,
                      b = !1,
                      y = function (t) {
                          var i = e.length > n + 1 && e.charAt(n + 1) === t;
                          return i && n++, i;
                      },
                      w = function (t) {
                          var e = y(t),
                              s =
                                  '@' === t
                                      ? 14
                                      : '!' === t
                                      ? 20
                                      : 'y' === t && e
                                      ? 4
                                      : 'o' === t
                                      ? 3
                                      : 2,
                              n = RegExp(
                                  '^\\d{' + ('y' === t ? s : 1) + ',' + s + '}'
                              ),
                              o = i.substring(h).match(n);
                          if (!o) throw 'Missing number at position ' + h;
                          return (h += o[0].length), parseInt(o[0], 10);
                      },
                      k = function (e, s, n) {
                          var o = -1,
                              a = t
                                  .map(y(e) ? n : s, function (t, e) {
                                      return [[e, t]];
                                  })
                                  .sort(function (t, e) {
                                      return -(t[1].length - e[1].length);
                                  });
                          if (
                              (t.each(a, function (t, e) {
                                  var s = e[1];
                                  return i.substr(h, s.length).toLowerCase() ===
                                      s.toLowerCase()
                                      ? ((o = e[0]), (h += s.length), !1)
                                      : void 0;
                              }),
                              -1 !== o)
                          )
                              return o + 1;
                          throw 'Unknown name at position ' + h;
                      },
                      x = function () {
                          if (i.charAt(h) !== e.charAt(n))
                              throw 'Unexpected literal at position ' + h;
                          h++;
                      };
                  for (n = 0; e.length > n; n++)
                      if (b) "'" !== e.charAt(n) || y("'") ? x() : (b = !1);
                      else
                          switch (e.charAt(n)) {
                              case 'd':
                                  _ = w('d');
                                  break;
                              case 'D':
                                  k('D', u, d);
                                  break;
                              case 'o':
                                  v = w('o');
                                  break;
                              case 'm':
                                  m = w('m');
                                  break;
                              case 'M':
                                  m = k('M', p, f);
                                  break;
                              case 'y':
                                  g = w('y');
                                  break;
                              case '@':
                                  (g = (r = new Date(w('@'))).getFullYear()),
                                      (m = r.getMonth() + 1),
                                      (_ = r.getDate());
                                  break;
                              case '!':
                                  (g = (r = new Date(
                                      (w('!') - this._ticksTo1970) / 1e4
                                  )).getFullYear()),
                                      (m = r.getMonth() + 1),
                                      (_ = r.getDate());
                                  break;
                              case "'":
                                  y("'") ? x() : (b = !0);
                                  break;
                              default:
                                  x();
                          }
                  if (i.length > h && ((a = i.substr(h)), !/^\s+/.test(a)))
                      throw 'Extra/unparsed characters found in date: ' + a;
                  if (
                      (-1 === g
                          ? (g = new Date().getFullYear())
                          : 100 > g &&
                            (g +=
                                new Date().getFullYear() -
                                (new Date().getFullYear() % 100) +
                                (c >= g ? 0 : -100)),
                      v > -1)
                  )
                      for (
                          m = 1, _ = v;
                          !((o = this._getDaysInMonth(g, m - 1)) >= _);

                      )
                          m++, (_ -= o);
                  if (
                      (r = this._daylightSavingAdjust(
                          new Date(g, m - 1, _)
                      )).getFullYear() !== g ||
                      r.getMonth() + 1 !== m ||
                      r.getDate() !== _
                  )
                      throw 'Invalid date';
                  return r;
              },
              ATOM: 'yy-mm-dd',
              COOKIE: 'D, dd M yy',
              ISO_8601: 'yy-mm-dd',
              RFC_822: 'D, d M y',
              RFC_850: 'DD, dd-M-y',
              RFC_1036: 'D, d M y',
              RFC_1123: 'D, d M yy',
              RFC_2822: 'D, d M yy',
              RSS: 'D, d M y',
              TICKS: '!',
              TIMESTAMP: '@',
              W3C: 'yy-mm-dd',
              _ticksTo1970:
                  864e9 *
                  (718685 +
                      Math.floor(492.5) -
                      Math.floor(19.7) +
                      Math.floor(4.925)),
              formatDate: function (t, e, i) {
                  if (!e) return '';
                  var s,
                      n =
                          (i ? i.dayNamesShort : null) ||
                          this._defaults.dayNamesShort,
                      o = (i ? i.dayNames : null) || this._defaults.dayNames,
                      a =
                          (i ? i.monthNamesShort : null) ||
                          this._defaults.monthNamesShort,
                      r = (i ? i.monthNames : null) || this._defaults.monthNames,
                      h = function (e) {
                          var i = t.length > s + 1 && t.charAt(s + 1) === e;
                          return i && s++, i;
                      },
                      l = function (t, e, i) {
                          var s = '' + e;
                          if (h(t)) for (; i > s.length; ) s = '0' + s;
                          return s;
                      },
                      c = function (t, e, i, s) {
                          return h(t) ? s[e] : i[e];
                      },
                      u = '',
                      d = !1;
                  if (e)
                      for (s = 0; t.length > s; s++)
                          if (d)
                              "'" !== t.charAt(s) || h("'")
                                  ? (u += t.charAt(s))
                                  : (d = !1);
                          else
                              switch (t.charAt(s)) {
                                  case 'd':
                                      u += l('d', e.getDate(), 2);
                                      break;
                                  case 'D':
                                      u += c('D', e.getDay(), n, o);
                                      break;
                                  case 'o':
                                      u += l(
                                          'o',
                                          Math.round(
                                              (new Date(
                                                  e.getFullYear(),
                                                  e.getMonth(),
                                                  e.getDate()
                                              ).getTime() -
                                                  new Date(
                                                      e.getFullYear(),
                                                      0,
                                                      0
                                                  ).getTime()) /
                                                  864e5
                                          ),
                                          3
                                      );
                                      break;
                                  case 'm':
                                      u += l('m', e.getMonth() + 1, 2);
                                      break;
                                  case 'M':
                                      u += c('M', e.getMonth(), a, r);
                                      break;
                                  case 'y':
                                      u += h('y')
                                          ? e.getFullYear()
                                          : (10 > e.getFullYear() % 100
                                                ? '0'
                                                : '') +
                                            (e.getFullYear() % 100);
                                      break;
                                  case '@':
                                      u += e.getTime();
                                      break;
                                  case '!':
                                      u += 1e4 * e.getTime() + this._ticksTo1970;
                                      break;
                                  case "'":
                                      h("'") ? (u += "'") : (d = !0);
                                      break;
                                  default:
                                      u += t.charAt(s);
                              }
                  return u;
              },
              _possibleChars: function (t) {
                  var e,
                      i = '',
                      s = !1,
                      n = function (i) {
                          var s = t.length > e + 1 && t.charAt(e + 1) === i;
                          return s && e++, s;
                      };
                  for (e = 0; t.length > e; e++)
                      if (s)
                          "'" !== t.charAt(e) || n("'")
                              ? (i += t.charAt(e))
                              : (s = !1);
                      else
                          switch (t.charAt(e)) {
                              case 'd':
                              case 'm':
                              case 'y':
                              case '@':
                                  i += '0123456789';
                                  break;
                              case 'D':
                              case 'M':
                                  return null;
                              case "'":
                                  n("'") ? (i += "'") : (s = !0);
                                  break;
                              default:
                                  i += t.charAt(e);
                          }
                  return i;
              },
              _get: function (t, e) {
                  return void 0 !== t.settings[e]
                      ? t.settings[e]
                      : this._defaults[e];
              },
              _setDateFromField: function (t, e) {
                  if (t.input.val() !== t.lastVal) {
                      var i = this._get(t, 'dateFormat'),
                          s = (t.lastVal = t.input ? t.input.val() : null),
                          n = this._getDefaultDate(t),
                          o = n,
                          a = this._getFormatConfig(t);
                      try {
                          o = this.parseDate(i, s, a) || n;
                      } catch (t) {
                          s = e ? '' : s;
                      }
                      (t.selectedDay = o.getDate()),
                          (t.drawMonth = t.selectedMonth = o.getMonth()),
                          (t.drawYear = t.selectedYear = o.getFullYear()),
                          (t.currentDay = s ? o.getDate() : 0),
                          (t.currentMonth = s ? o.getMonth() : 0),
                          (t.currentYear = s ? o.getFullYear() : 0),
                          this._adjustInstDate(t);
                  }
              },
              _getDefaultDate: function (t) {
                  return this._restrictMinMax(
                      t,
                      this._determineDate(
                          t,
                          this._get(t, 'defaultDate'),
                          new Date()
                      )
                  );
              },
              _determineDate: function (e, i, s) {
                  var n =
                      null == i || '' === i
                          ? s
                          : 'string' == typeof i
                          ? (function (i) {
                                try {
                                    return t.datepicker.parseDate(
                                        t.datepicker._get(e, 'dateFormat'),
                                        i,
                                        t.datepicker._getFormatConfig(e)
                                    );
                                } catch (t) {}
                                for (
                                    var s =
                                            (i.toLowerCase().match(/^c/)
                                                ? t.datepicker._getDate(e)
                                                : null) || new Date(),
                                        n = s.getFullYear(),
                                        o = s.getMonth(),
                                        a = s.getDate(),
                                        r = /([+\-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g,
                                        h = r.exec(i);
                                    h;

                                ) {
                                    switch (h[2] || 'd') {
                                        case 'd':
                                        case 'D':
                                            a += parseInt(h[1], 10);
                                            break;
                                        case 'w':
                                        case 'W':
                                            a += 7 * parseInt(h[1], 10);
                                            break;
                                        case 'm':
                                        case 'M':
                                            (o += parseInt(h[1], 10)),
                                                (a = Math.min(
                                                    a,
                                                    t.datepicker._getDaysInMonth(
                                                        n,
                                                        o
                                                    )
                                                ));
                                            break;
                                        case 'y':
                                        case 'Y':
                                            (n += parseInt(h[1], 10)),
                                                (a = Math.min(
                                                    a,
                                                    t.datepicker._getDaysInMonth(
                                                        n,
                                                        o
                                                    )
                                                ));
                                    }
                                    h = r.exec(i);
                                }
                                return new Date(n, o, a);
                            })(i)
                          : 'number' == typeof i
                          ? isNaN(i)
                              ? s
                              : (function (t) {
                                    var e = new Date();
                                    return e.setDate(e.getDate() + t), e;
                                })(i)
                          : new Date(i.getTime());
                  return (
                      (n = n && 'Invalid Date' == '' + n ? s : n) &&
                          (n.setHours(0),
                          n.setMinutes(0),
                          n.setSeconds(0),
                          n.setMilliseconds(0)),
                      this._daylightSavingAdjust(n)
                  );
              },
              _daylightSavingAdjust: function (t) {
                  return t
                      ? (t.setHours(t.getHours() > 12 ? t.getHours() + 2 : 0), t)
                      : null;
              },
              _setDate: function (t, e, i) {
                  var s = !e,
                      n = t.selectedMonth,
                      o = t.selectedYear,
                      a = this._restrictMinMax(
                          t,
                          this._determineDate(t, e, new Date())
                      );
                  (t.selectedDay = t.currentDay = a.getDate()),
                      (t.drawMonth = t.selectedMonth = t.currentMonth = a.getMonth()),
                      (t.drawYear = t.selectedYear = t.currentYear = a.getFullYear()),
                      (n === t.selectedMonth && o === t.selectedYear) ||
                          i ||
                          this._notifyChange(t),
                      this._adjustInstDate(t),
                      t.input && t.input.val(s ? '' : this._formatDate(t));
              },
              _getDate: function (t) {
                  return !t.currentYear || (t.input && '' === t.input.val())
                      ? null
                      : this._daylightSavingAdjust(
                            new Date(t.currentYear, t.currentMonth, t.currentDay)
                        );
              },
              _attachHandlers: function (e) {
                  var i = this._get(e, 'stepMonths'),
                      s = '#' + e.id.replace(/\\\\/g, '\\');
                  e.dpDiv.find('[data-handler]').map(function () {
                      var e = {
                          prev: function () {
                              t.datepicker._adjustDate(s, -i, 'M');
                          },
                          next: function () {
                              t.datepicker._adjustDate(s, +i, 'M');
                          },
                          hide: function () {
                              t.datepicker._hideDatepicker();
                          },
                          today: function () {
                              t.datepicker._gotoToday(s);
                          },
                          selectDay: function () {
                              return (
                                  t.datepicker._selectDay(
                                      s,
                                      +this.getAttribute('data-month'),
                                      +this.getAttribute('data-year'),
                                      this
                                  ),
                                  !1
                              );
                          },
                          selectMonth: function () {
                              return (
                                  t.datepicker._selectMonthYear(s, this, 'M'), !1
                              );
                          },
                          selectYear: function () {
                              return (
                                  t.datepicker._selectMonthYear(s, this, 'Y'), !1
                              );
                          },
                      };
                      t(this).on(
                          this.getAttribute('data-event'),
                          e[this.getAttribute('data-handler')]
                      );
                  });
              },
              _generateHTML: function (t) {
                  var e,
                      i,
                      s,
                      n,
                      o,
                      a,
                      r,
                      h,
                      l,
                      c,
                      u,
                      d,
                      p,
                      f,
                      g,
                      m,
                      _,
                      v,
                      b,
                      y,
                      w,
                      k,
                      x,
                      C,
                      D,
                      I,
                      T,
                      P,
                      M,
                      S,
                      H,
                      z,
                      O,
                      A,
                      N,
                      W,
                      E,
                      F,
                      L,
                      R = new Date(),
                      B = this._daylightSavingAdjust(
                          new Date(R.getFullYear(), R.getMonth(), R.getDate())
                      ),
                      Y = this._get(t, 'isRTL'),
                      j = this._get(t, 'showButtonPanel'),
                      q = this._get(t, 'hideIfNoPrevNext'),
                      K = this._get(t, 'navigationAsDateFormat'),
                      U = this._getNumberOfMonths(t),
                      V = this._get(t, 'showCurrentAtPos'),
                      $ = this._get(t, 'stepMonths'),
                      X = 1 !== U[0] || 1 !== U[1],
                      G = this._daylightSavingAdjust(
                          t.currentDay
                              ? new Date(
                                    t.currentYear,
                                    t.currentMonth,
                                    t.currentDay
                                )
                              : new Date(9999, 9, 9)
                      ),
                      Q = this._getMinMaxDate(t, 'min'),
                      J = this._getMinMaxDate(t, 'max'),
                      Z = t.drawMonth - V,
                      tt = t.drawYear;
                  if ((0 > Z && ((Z += 12), tt--), J))
                      for (
                          e = this._daylightSavingAdjust(
                              new Date(
                                  J.getFullYear(),
                                  J.getMonth() - U[0] * U[1] + 1,
                                  J.getDate()
                              )
                          ),
                              e = Q && Q > e ? Q : e;
                          this._daylightSavingAdjust(new Date(tt, Z, 1)) > e;

                      )
                          0 > --Z && ((Z = 11), tt--);
                  for (
                      t.drawMonth = Z,
                          t.drawYear = tt,
                          i = this._get(t, 'prevText'),
                          i = K
                              ? this.formatDate(
                                    i,
                                    this._daylightSavingAdjust(
                                        new Date(tt, Z - $, 1)
                                    ),
                                    this._getFormatConfig(t)
                                )
                              : i,
                          s = this._canAdjustMonth(t, -1, tt, Z)
                              ? "<a class='ui-datepicker-prev ui-corner-all' data-handler='prev' data-event='click' title='" +
                                i +
                                "'><span class='ui-icon ui-icon-circle-triangle-" +
                                (Y ? 'e' : 'w') +
                                "'>" +
                                i +
                                '</span></a>'
                              : q
                              ? ''
                              : "<a class='ui-datepicker-prev ui-corner-all ui-state-disabled' title='" +
                                i +
                                "'><span class='ui-icon ui-icon-circle-triangle-" +
                                (Y ? 'e' : 'w') +
                                "'>" +
                                i +
                                '</span></a>',
                          n = this._get(t, 'nextText'),
                          n = K
                              ? this.formatDate(
                                    n,
                                    this._daylightSavingAdjust(
                                        new Date(tt, Z + $, 1)
                                    ),
                                    this._getFormatConfig(t)
                                )
                              : n,
                          o = this._canAdjustMonth(t, 1, tt, Z)
                              ? "<a class='ui-datepicker-next ui-corner-all' data-handler='next' data-event='click' title='" +
                                n +
                                "'><span class='ui-icon ui-icon-circle-triangle-" +
                                (Y ? 'w' : 'e') +
                                "'>" +
                                n +
                                '</span></a>'
                              : q
                              ? ''
                              : "<a class='ui-datepicker-next ui-corner-all ui-state-disabled' title='" +
                                n +
                                "'><span class='ui-icon ui-icon-circle-triangle-" +
                                (Y ? 'w' : 'e') +
                                "'>" +
                                n +
                                '</span></a>',
                          a = this._get(t, 'currentText'),
                          r = this._get(t, 'gotoCurrent') && t.currentDay ? G : B,
                          a = K
                              ? this.formatDate(a, r, this._getFormatConfig(t))
                              : a,
                          h = t.inline
                              ? ''
                              : "<button type='button' class='ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all' data-handler='hide' data-event='click'>" +
                                this._get(t, 'closeText') +
                                '</button>',
                          l = j
                              ? "<div class='ui-datepicker-buttonpane ui-widget-content'>" +
                                (Y ? h : '') +
                                (this._isInRange(t, r)
                                    ? "<button type='button' class='ui-datepicker-current ui-state-default ui-priority-secondary ui-corner-all' data-handler='today' data-event='click'>" +
                                      a +
                                      '</button>'
                                    : '') +
                                (Y ? '' : h) +
                                '</div>'
                              : '',
                          c = parseInt(this._get(t, 'firstDay'), 10),
                          c = isNaN(c) ? 0 : c,
                          u = this._get(t, 'showWeek'),
                          d = this._get(t, 'dayNames'),
                          p = this._get(t, 'dayNamesMin'),
                          f = this._get(t, 'monthNames'),
                          g = this._get(t, 'monthNamesShort'),
                          m = this._get(t, 'beforeShowDay'),
                          _ = this._get(t, 'showOtherMonths'),
                          v = this._get(t, 'selectOtherMonths'),
                          b = this._getDefaultDate(t),
                          y = '',
                          k = 0;
                      U[0] > k;
                      k++
                  ) {
                      for (x = '', this.maxRows = 4, C = 0; U[1] > C; C++) {
                          if (
                              ((D = this._daylightSavingAdjust(
                                  new Date(tt, Z, t.selectedDay)
                              )),
                              (I = ' ui-corner-all'),
                              (T = ''),
                              X)
                          ) {
                              if (
                                  ((T += "<div class='ui-datepicker-group"),
                                  U[1] > 1)
                              )
                                  switch (C) {
                                      case 0:
                                          (T += ' ui-datepicker-group-first'),
                                              (I =
                                                  ' ui-corner-' +
                                                  (Y ? 'right' : 'left'));
                                          break;
                                      case U[1] - 1:
                                          (T += ' ui-datepicker-group-last'),
                                              (I =
                                                  ' ui-corner-' +
                                                  (Y ? 'left' : 'right'));
                                          break;
                                      default:
                                          (T += ' ui-datepicker-group-middle'),
                                              (I = '');
                                  }
                              T += "'>";
                          }
                          for (
                              T +=
                                  "<div class='ui-datepicker-header ui-widget-header ui-helper-clearfix" +
                                  I +
                                  "'>" +
                                  (/all|left/.test(I) && 0 === k
                                      ? Y
                                          ? o
                                          : s
                                      : '') +
                                  (/all|right/.test(I) && 0 === k
                                      ? Y
                                          ? s
                                          : o
                                      : '') +
                                  this._generateMonthYearHeader(
                                      t,
                                      Z,
                                      tt,
                                      Q,
                                      J,
                                      k > 0 || C > 0,
                                      f,
                                      g
                                  ) +
                                  "</div><table class='ui-datepicker-calendar'><thead><tr>",
                                  P = u
                                      ? "<th class='ui-datepicker-week-col'>" +
                                        this._get(t, 'weekHeader') +
                                        '</th>'
                                      : '',
                                  w = 0;
                              7 > w;
                              w++
                          )
                              P +=
                                  "<th scope='col'" +
                                  ((w + c + 6) % 7 >= 5
                                      ? " class='ui-datepicker-week-end'"
                                      : '') +
                                  "><span title='" +
                                  d[(M = (w + c) % 7)] +
                                  "'>" +
                                  p[M] +
                                  '</span></th>';
                          for (
                              T += P + '</tr></thead><tbody>',
                                  S = this._getDaysInMonth(tt, Z),
                                  tt === t.selectedYear &&
                                      Z === t.selectedMonth &&
                                      (t.selectedDay = Math.min(
                                          t.selectedDay,
                                          S
                                      )),
                                  H =
                                      (this._getFirstDayOfMonth(tt, Z) - c + 7) %
                                      7,
                                  z = Math.ceil((H + S) / 7),
                                  O = X && this.maxRows > z ? this.maxRows : z,
                                  this.maxRows = O,
                                  A = this._daylightSavingAdjust(
                                      new Date(tt, Z, 1 - H)
                                  ),
                                  N = 0;
                              O > N;
                              N++
                          ) {
                              for (
                                  T += '<tr>',
                                      W = u
                                          ? "<td class='ui-datepicker-week-col'>" +
                                            this._get(t, 'calculateWeek')(A) +
                                            '</td>'
                                          : '',
                                      w = 0;
                                  7 > w;
                                  w++
                              )
                                  (E = m
                                      ? m.apply(t.input ? t.input[0] : null, [A])
                                      : [!0, '']),
                                      (L =
                                          ((F = A.getMonth() !== Z) && !v) ||
                                          !E[0] ||
                                          (Q && Q > A) ||
                                          (J && A > J)),
                                      (W +=
                                          "<td class='" +
                                          ((w + c + 6) % 7 >= 5
                                              ? ' ui-datepicker-week-end'
                                              : '') +
                                          (F
                                              ? ' ui-datepicker-other-month'
                                              : '') +
                                          ((A.getTime() === D.getTime() &&
                                              Z === t.selectedMonth &&
                                              t._keyEvent) ||
                                          (b.getTime() === A.getTime() &&
                                              b.getTime() === D.getTime())
                                              ? ' ' + this._dayOverClass
                                              : '') +
                                          (L
                                              ? ' ' +
                                                this._unselectableClass +
                                                ' ui-state-disabled'
                                              : '') +
                                          (F && !_
                                              ? ''
                                              : ' ' +
                                                E[1] +
                                                (A.getTime() === G.getTime()
                                                    ? ' ' + this._currentClass
                                                    : '') +
                                                (A.getTime() === B.getTime()
                                                    ? ' ui-datepicker-today'
                                                    : '')) +
                                          "'" +
                                          ((F && !_) || !E[2]
                                              ? ''
                                              : " title='" +
                                                E[2].replace(/'/g, '&#39;') +
                                                "'") +
                                          (L
                                              ? ''
                                              : " data-handler='selectDay' data-event='click' data-month='" +
                                                A.getMonth() +
                                                "' data-year='" +
                                                A.getFullYear() +
                                                "'") +
                                          '>' +
                                          (F && !_
                                              ? '&#xa0;'
                                              : L
                                              ? "<span class='ui-state-default'>" +
                                                A.getDate() +
                                                '</span>'
                                              : "<a class='ui-state-default" +
                                                (A.getTime() === B.getTime()
                                                    ? ' ui-state-highlight'
                                                    : '') +
                                                (A.getTime() === G.getTime()
                                                    ? ' ui-state-active'
                                                    : '') +
                                                (F
                                                    ? ' ui-priority-secondary'
                                                    : '') +
                                                "' href='#'>" +
                                                A.getDate() +
                                                '</a>') +
                                          '</td>'),
                                      A.setDate(A.getDate() + 1),
                                      (A = this._daylightSavingAdjust(A));
                              T += W + '</tr>';
                          }
                          ++Z > 11 && ((Z = 0), tt++),
                              (x += T +=
                                  '</tbody></table>' +
                                  (X
                                      ? '</div>' +
                                        (U[0] > 0 && C === U[1] - 1
                                            ? "<div class='ui-datepicker-row-break'></div>"
                                            : '')
                                      : ''));
                      }
                      y += x;
                  }
                  return (y += l), (t._keyEvent = !1), y;
              },
              _generateMonthYearHeader: function (t, e, i, s, n, o, a, r) {
                  var h,
                      l,
                      c,
                      u,
                      d,
                      p,
                      f,
                      g,
                      m = this._get(t, 'changeMonth'),
                      _ = this._get(t, 'changeYear'),
                      v = this._get(t, 'showMonthAfterYear'),
                      b = "<div class='ui-datepicker-title'>",
                      y = '';
                  if (o || !m)
                      y +=
                          "<span class='ui-datepicker-month'>" + a[e] + '</span>';
                  else {
                      for (
                          h = s && s.getFullYear() === i,
                              l = n && n.getFullYear() === i,
                              y +=
                                  "<select class='ui-datepicker-month' data-handler='selectMonth' data-event='change'>",
                              c = 0;
                          12 > c;
                          c++
                      )
                          (!h || c >= s.getMonth()) &&
                              (!l || n.getMonth() >= c) &&
                              (y +=
                                  "<option value='" +
                                  c +
                                  "'" +
                                  (c === e ? " selected='selected'" : '') +
                                  '>' +
                                  r[c] +
                                  '</option>');
                      y += '</select>';
                  }
                  if (
                      (v || (b += y + (!o && m && _ ? '' : '&#xa0;')),
                      !t.yearshtml)
                  )
                      if (((t.yearshtml = ''), o || !_))
                          b +=
                              "<span class='ui-datepicker-year'>" + i + '</span>';
                      else {
                          for (
                              u = this._get(t, 'yearRange').split(':'),
                                  d = new Date().getFullYear(),
                                  f = (p = function (t) {
                                      var e = t.match(/c[+\-].*/)
                                          ? i + parseInt(t.substring(1), 10)
                                          : t.match(/[+\-].*/)
                                          ? d + parseInt(t, 10)
                                          : parseInt(t, 10);
                                      return isNaN(e) ? d : e;
                                  })(u[0]),
                                  g = Math.max(f, p(u[1] || '')),
                                  f = s ? Math.max(f, s.getFullYear()) : f,
                                  g = n ? Math.min(g, n.getFullYear()) : g,
                                  t.yearshtml +=
                                      "<select class='ui-datepicker-year' data-handler='selectYear' data-event='change'>";
                              g >= f;
                              f++
                          )
                              t.yearshtml +=
                                  "<option value='" +
                                  f +
                                  "'" +
                                  (f === i ? " selected='selected'" : '') +
                                  '>' +
                                  f +
                                  '</option>';
                          (t.yearshtml += '</select>'),
                              (b += t.yearshtml),
                              (t.yearshtml = null);
                      }
                  return (
                      (b += this._get(t, 'yearSuffix')),
                      v && (b += (!o && m && _ ? '' : '&#xa0;') + y),
                      (b += '</div>')
                  );
              },
              _adjustInstDate: function (t, e, i) {
                  var s = t.selectedYear + ('Y' === i ? e : 0),
                      n = t.selectedMonth + ('M' === i ? e : 0),
                      o =
                          Math.min(t.selectedDay, this._getDaysInMonth(s, n)) +
                          ('D' === i ? e : 0),
                      a = this._restrictMinMax(
                          t,
                          this._daylightSavingAdjust(new Date(s, n, o))
                      );
                  (t.selectedDay = a.getDate()),
                      (t.drawMonth = t.selectedMonth = a.getMonth()),
                      (t.drawYear = t.selectedYear = a.getFullYear()),
                      ('M' === i || 'Y' === i) && this._notifyChange(t);
              },
              _restrictMinMax: function (t, e) {
                  var i = this._getMinMaxDate(t, 'min'),
                      s = this._getMinMaxDate(t, 'max'),
                      n = i && i > e ? i : e;
                  return s && n > s ? s : n;
              },
              _notifyChange: function (t) {
                  var e = this._get(t, 'onChangeMonthYear');
                  e &&
                      e.apply(t.input ? t.input[0] : null, [
                          t.selectedYear,
                          t.selectedMonth + 1,
                          t,
                      ]);
              },
              _getNumberOfMonths: function (t) {
                  var e = this._get(t, 'numberOfMonths');
                  return null == e ? [1, 1] : 'number' == typeof e ? [1, e] : e;
              },
              _getMinMaxDate: function (t, e) {
                  return this._determineDate(t, this._get(t, e + 'Date'), null);
              },
              _getDaysInMonth: function (t, e) {
                  return (
                      32 -
                      this._daylightSavingAdjust(new Date(t, e, 32)).getDate()
                  );
              },
              _getFirstDayOfMonth: function (t, e) {
                  return new Date(t, e, 1).getDay();
              },
              _canAdjustMonth: function (t, e, i, s) {
                  var n = this._getNumberOfMonths(t),
                      o = this._daylightSavingAdjust(
                          new Date(i, s + (0 > e ? e : n[0] * n[1]), 1)
                      );
                  return (
                      0 > e &&
                          o.setDate(
                              this._getDaysInMonth(o.getFullYear(), o.getMonth())
                          ),
                      this._isInRange(t, o)
                  );
              },
              _isInRange: function (t, e) {
                  var i,
                      s,
                      n = this._getMinMaxDate(t, 'min'),
                      o = this._getMinMaxDate(t, 'max'),
                      a = null,
                      r = null,
                      h = this._get(t, 'yearRange');
                  return (
                      h &&
                          ((i = h.split(':')),
                          (s = new Date().getFullYear()),
                          (a = parseInt(i[0], 10)),
                          (r = parseInt(i[1], 10)),
                          i[0].match(/[+\-].*/) && (a += s),
                          i[1].match(/[+\-].*/) && (r += s)),
                      (!n || e.getTime() >= n.getTime()) &&
                          (!o || e.getTime() <= o.getTime()) &&
                          (!a || e.getFullYear() >= a) &&
                          (!r || r >= e.getFullYear())
                  );
              },
              _getFormatConfig: function (t) {
                  var e = this._get(t, 'shortYearCutoff');
                  return {
                      shortYearCutoff: (e =
                          'string' != typeof e
                              ? e
                              : (new Date().getFullYear() % 100) +
                                parseInt(e, 10)),
                      dayNamesShort: this._get(t, 'dayNamesShort'),
                      dayNames: this._get(t, 'dayNames'),
                      monthNamesShort: this._get(t, 'monthNamesShort'),
                      monthNames: this._get(t, 'monthNames'),
                  };
              },
              _formatDate: function (t, e, i, s) {
                  e ||
                      ((t.currentDay = t.selectedDay),
                      (t.currentMonth = t.selectedMonth),
                      (t.currentYear = t.selectedYear));
                  var n = e
                      ? 'object' == typeof e
                          ? e
                          : this._daylightSavingAdjust(new Date(s, i, e))
                      : this._daylightSavingAdjust(
                            new Date(t.currentYear, t.currentMonth, t.currentDay)
                        );
                  return this.formatDate(
                      this._get(t, 'dateFormat'),
                      n,
                      this._getFormatConfig(t)
                  );
              },
          }),
          (t.fn.datepicker = function (e) {
              if (!this.length) return this;
              t.datepicker.initialized ||
                  (t(document).on('mousedown', t.datepicker._checkExternalClick),
                  (t.datepicker.initialized = !0)),
                  0 === t('#' + t.datepicker._mainDivId).length &&
                      t('body').append(t.datepicker.dpDiv);
              var i = Array.prototype.slice.call(arguments, 1);
              return 'string' != typeof e ||
                  ('isDisabled' !== e && 'getDate' !== e && 'widget' !== e)
                  ? 'option' === e &&
                    2 === arguments.length &&
                    'string' == typeof arguments[1]
                      ? t.datepicker['_' + e + 'Datepicker'].apply(
                            t.datepicker,
                            [this[0]].concat(i)
                        )
                      : this.each(function () {
                            'string' == typeof e
                                ? t.datepicker['_' + e + 'Datepicker'].apply(
                                      t.datepicker,
                                      [this].concat(i)
                                  )
                                : t.datepicker._attachDatepicker(this, e);
                        })
                  : t.datepicker['_' + e + 'Datepicker'].apply(
                        t.datepicker,
                        [this[0]].concat(i)
                    );
          }),
          (t.datepicker = new e()),
          (t.datepicker.initialized = !1),
          (t.datepicker.uuid = new Date().getTime()),
          (t.datepicker.version = '1.12.1'),
          t.datepicker,
          (t.ui.ie = !!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()));
      var f = !1;
      t(document).on('mouseup', function () {
          f = !1;
      }),
          t.widget('ui.mouse', {
              version: '1.12.1',
              options: {
                  cancel: 'input, textarea, button, select, option',
                  distance: 1,
                  delay: 0,
              },
              _mouseInit: function () {
                  var e = this;
                  this.element
                      .on('mousedown.' + this.widgetName, function (t) {
                          return e._mouseDown(t);
                      })
                      .on('click.' + this.widgetName, function (i) {
                          return !0 ===
                              t.data(
                                  i.target,
                                  e.widgetName + '.preventClickEvent'
                              )
                              ? (t.removeData(
                                    i.target,
                                    e.widgetName + '.preventClickEvent'
                                ),
                                i.stopImmediatePropagation(),
                                !1)
                              : void 0;
                      }),
                      (this.started = !1);
              },
              _mouseDestroy: function () {
                  this.element.off('.' + this.widgetName),
                      this._mouseMoveDelegate &&
                          this.document
                              .off(
                                  'mousemove.' + this.widgetName,
                                  this._mouseMoveDelegate
                              )
                              .off(
                                  'mouseup.' + this.widgetName,
                                  this._mouseUpDelegate
                              );
              },
              _mouseDown: function (e) {
                  if (!f) {
                      (this._mouseMoved = !1),
                          this._mouseStarted && this._mouseUp(e),
                          (this._mouseDownEvent = e);
                      var i = this,
                          s = 1 === e.which,
                          n =
                              !(
                                  'string' != typeof this.options.cancel ||
                                  !e.target.nodeName
                              ) &&
                              t(e.target).closest(this.options.cancel).length;
                      return (
                          !(s && !n && this._mouseCapture(e)) ||
                          ((this.mouseDelayMet = !this.options.delay),
                          this.mouseDelayMet ||
                              (this._mouseDelayTimer = setTimeout(function () {
                                  i.mouseDelayMet = !0;
                              }, this.options.delay)),
                          this._mouseDistanceMet(e) &&
                          this._mouseDelayMet(e) &&
                          ((this._mouseStarted = !1 !== this._mouseStart(e)),
                          !this._mouseStarted)
                              ? (e.preventDefault(), !0)
                              : (!0 ===
                                    t.data(
                                        e.target,
                                        this.widgetName + '.preventClickEvent'
                                    ) &&
                                    t.removeData(
                                        e.target,
                                        this.widgetName + '.preventClickEvent'
                                    ),
                                (this._mouseMoveDelegate = function (t) {
                                    return i._mouseMove(t);
                                }),
                                (this._mouseUpDelegate = function (t) {
                                    return i._mouseUp(t);
                                }),
                                this.document
                                    .on(
                                        'mousemove.' + this.widgetName,
                                        this._mouseMoveDelegate
                                    )
                                    .on(
                                        'mouseup.' + this.widgetName,
                                        this._mouseUpDelegate
                                    ),
                                e.preventDefault(),
                                (f = !0),
                                !0))
                      );
                  }
              },
              _mouseMove: function (e) {
                  if (this._mouseMoved) {
                      if (
                          t.ui.ie &&
                          (!document.documentMode || 9 > document.documentMode) &&
                          !e.button
                      )
                          return this._mouseUp(e);
                      if (!e.which)
                          if (
                              e.originalEvent.altKey ||
                              e.originalEvent.ctrlKey ||
                              e.originalEvent.metaKey ||
                              e.originalEvent.shiftKey
                          )
                              this.ignoreMissingWhich = !0;
                          else if (!this.ignoreMissingWhich)
                              return this._mouseUp(e);
                  }
                  return (
                      (e.which || e.button) && (this._mouseMoved = !0),
                      this._mouseStarted
                          ? (this._mouseDrag(e), e.preventDefault())
                          : (this._mouseDistanceMet(e) &&
                                this._mouseDelayMet(e) &&
                                ((this._mouseStarted =
                                    !1 !==
                                    this._mouseStart(this._mouseDownEvent, e)),
                                this._mouseStarted
                                    ? this._mouseDrag(e)
                                    : this._mouseUp(e)),
                            !this._mouseStarted)
                  );
              },
              _mouseUp: function (e) {
                  this.document
                      .off(
                          'mousemove.' + this.widgetName,
                          this._mouseMoveDelegate
                      )
                      .off('mouseup.' + this.widgetName, this._mouseUpDelegate),
                      this._mouseStarted &&
                          ((this._mouseStarted = !1),
                          e.target === this._mouseDownEvent.target &&
                              t.data(
                                  e.target,
                                  this.widgetName + '.preventClickEvent',
                                  !0
                              ),
                          this._mouseStop(e)),
                      this._mouseDelayTimer &&
                          (clearTimeout(this._mouseDelayTimer),
                          delete this._mouseDelayTimer),
                      (this.ignoreMissingWhich = !1),
                      (f = !1),
                      e.preventDefault();
              },
              _mouseDistanceMet: function (t) {
                  return (
                      Math.max(
                          Math.abs(this._mouseDownEvent.pageX - t.pageX),
                          Math.abs(this._mouseDownEvent.pageY - t.pageY)
                      ) >= this.options.distance
                  );
              },
              _mouseDelayMet: function () {
                  return this.mouseDelayMet;
              },
              _mouseStart: function () {},
              _mouseDrag: function () {},
              _mouseStop: function () {},
              _mouseCapture: function () {
                  return !0;
              },
          }),
          (t.ui.plugin = {
              add: function (e, i, s) {
                  var n,
                      o = t.ui[e].prototype;
                  for (n in s)
                      (o.plugins[n] = o.plugins[n] || []),
                          o.plugins[n].push([i, s[n]]);
              },
              call: function (t, e, i, s) {
                  var n,
                      o = t.plugins[e];
                  if (
                      o &&
                      (s ||
                          (t.element[0].parentNode &&
                              11 !== t.element[0].parentNode.nodeType))
                  )
                      for (n = 0; o.length > n; n++)
                          t.options[o[n][0]] && o[n][1].apply(t.element, i);
              },
          }),
          (t.ui.safeBlur = function (e) {
              e && 'body' !== e.nodeName.toLowerCase() && t(e).trigger('blur');
          }),
          t.widget('ui.draggable', t.ui.mouse, {
              version: '1.12.1',
              widgetEventPrefix: 'drag',
              options: {
                  addClasses: !0,
                  appendTo: 'parent',
                  axis: !1,
                  connectToSortable: !1,
                  containment: !1,
                  cursor: 'auto',
                  cursorAt: !1,
                  grid: !1,
                  handle: !1,
                  helper: 'original',
                  iframeFix: !1,
                  opacity: !1,
                  refreshPositions: !1,
                  revert: !1,
                  revertDuration: 500,
                  scope: 'default',
                  scroll: !0,
                  scrollSensitivity: 20,
                  scrollSpeed: 20,
                  snap: !1,
                  snapMode: 'both',
                  snapTolerance: 20,
                  stack: !1,
                  zIndex: !1,
                  drag: null,
                  start: null,
                  stop: null,
              },
              _create: function () {
                  'original' === this.options.helper &&
                      this._setPositionRelative(),
                      this.options.addClasses && this._addClass('ui-draggable'),
                      this._setHandleClassName(),
                      this._mouseInit();
              },
              _setOption: function (t, e) {
                  this._super(t, e),
                      'handle' === t &&
                          (this._removeHandleClassName(),
                          this._setHandleClassName());
              },
              _destroy: function () {
                  return (this.helper || this.element).is(
                      '.ui-draggable-dragging'
                  )
                      ? void (this.destroyOnClear = !0)
                      : (this._removeHandleClassName(),
                        void this._mouseDestroy());
              },
              _mouseCapture: function (e) {
                  var i = this.options;
                  return (
                      !(
                          this.helper ||
                          i.disabled ||
                          t(e.target).closest('.ui-resizable-handle').length > 0
                      ) &&
                      ((this.handle = this._getHandle(e)),
                      !!this.handle &&
                          (this._blurActiveElement(e),
                          this._blockFrames(
                              !0 === i.iframeFix ? 'iframe' : i.iframeFix
                          ),
                          !0))
                  );
              },
              _blockFrames: function (e) {
                  this.iframeBlocks = this.document.find(e).map(function () {
                      var e = t(this);
                      return t('<div>')
                          .css('position', 'absolute')
                          .appendTo(e.parent())
                          .outerWidth(e.outerWidth())
                          .outerHeight(e.outerHeight())
                          .offset(e.offset())[0];
                  });
              },
              _unblockFrames: function () {
                  this.iframeBlocks &&
                      (this.iframeBlocks.remove(), delete this.iframeBlocks);
              },
              _blurActiveElement: function (e) {
                  var i = t.ui.safeActiveElement(this.document[0]);
                  t(e.target).closest(i).length || t.ui.safeBlur(i);
              },
              _mouseStart: function (e) {
                  var i = this.options;
                  return (
                      (this.helper = this._createHelper(e)),
                      this._addClass(this.helper, 'ui-draggable-dragging'),
                      this._cacheHelperProportions(),
                      t.ui.ddmanager && (t.ui.ddmanager.current = this),
                      this._cacheMargins(),
                      (this.cssPosition = this.helper.css('position')),
                      (this.scrollParent = this.helper.scrollParent(!0)),
                      (this.offsetParent = this.helper.offsetParent()),
                      (this.hasFixedAncestor =
                          this.helper.parents().filter(function () {
                              return 'fixed' === t(this).css('position');
                          }).length > 0),
                      (this.positionAbs = this.element.offset()),
                      this._refreshOffsets(e),
                      (this.originalPosition = this.position = this._generatePosition(
                          e,
                          !1
                      )),
                      (this.originalPageX = e.pageX),
                      (this.originalPageY = e.pageY),
                      i.cursorAt && this._adjustOffsetFromHelper(i.cursorAt),
                      this._setContainment(),
                      !1 === this._trigger('start', e)
                          ? (this._clear(), !1)
                          : (this._cacheHelperProportions(),
                            t.ui.ddmanager &&
                                !i.dropBehaviour &&
                                t.ui.ddmanager.prepareOffsets(this, e),
                            this._mouseDrag(e, !0),
                            t.ui.ddmanager && t.ui.ddmanager.dragStart(this, e),
                            !0)
                  );
              },
              _refreshOffsets: function (t) {
                  (this.offset = {
                      top: this.positionAbs.top - this.margins.top,
                      left: this.positionAbs.left - this.margins.left,
                      scroll: !1,
                      parent: this._getParentOffset(),
                      relative: this._getRelativeOffset(),
                  }),
                      (this.offset.click = {
                          left: t.pageX - this.offset.left,
                          top: t.pageY - this.offset.top,
                      });
              },
              _mouseDrag: function (e, i) {
                  if (
                      (this.hasFixedAncestor &&
                          (this.offset.parent = this._getParentOffset()),
                      (this.position = this._generatePosition(e, !0)),
                      (this.positionAbs = this._convertPositionTo('absolute')),
                      !i)
                  ) {
                      var s = this._uiHash();
                      if (!1 === this._trigger('drag', e, s))
                          return this._mouseUp(new t.Event('mouseup', e)), !1;
                      this.position = s.position;
                  }
                  return (
                      (this.helper[0].style.left = this.position.left + 'px'),
                      (this.helper[0].style.top = this.position.top + 'px'),
                      t.ui.ddmanager && t.ui.ddmanager.drag(this, e),
                      !1
                  );
              },
              _mouseStop: function (e) {
                  var i = this,
                      s = !1;
                  return (
                      t.ui.ddmanager &&
                          !this.options.dropBehaviour &&
                          (s = t.ui.ddmanager.drop(this, e)),
                      this.dropped && ((s = this.dropped), (this.dropped = !1)),
                      ('invalid' === this.options.revert && !s) ||
                      ('valid' === this.options.revert && s) ||
                      !0 === this.options.revert ||
                      (t.isFunction(this.options.revert) &&
                          this.options.revert.call(this.element, s))
                          ? t(this.helper).animate(
                                this.originalPosition,
                                parseInt(this.options.revertDuration, 10),
                                function () {
                                    !1 !== i._trigger('stop', e) && i._clear();
                                }
                            )
                          : !1 !== this._trigger('stop', e) && this._clear(),
                      !1
                  );
              },
              _mouseUp: function (e) {
                  return (
                      this._unblockFrames(),
                      t.ui.ddmanager && t.ui.ddmanager.dragStop(this, e),
                      this.handleElement.is(e.target) &&
                          this.element.trigger('focus'),
                      t.ui.mouse.prototype._mouseUp.call(this, e)
                  );
              },
              cancel: function () {
                  return (
                      this.helper.is('.ui-draggable-dragging')
                          ? this._mouseUp(
                                new t.Event('mouseup', {
                                    target: this.element[0],
                                })
                            )
                          : this._clear(),
                      this
                  );
              },
              _getHandle: function (e) {
                  return (
                      !this.options.handle ||
                      !!t(e.target).closest(
                          this.element.find(this.options.handle)
                      ).length
                  );
              },
              _setHandleClassName: function () {
                  (this.handleElement = this.options.handle
                      ? this.element.find(this.options.handle)
                      : this.element),
                      this._addClass(this.handleElement, 'ui-draggable-handle');
              },
              _removeHandleClassName: function () {
                  this._removeClass(this.handleElement, 'ui-draggable-handle');
              },
              _createHelper: function (e) {
                  var i = this.options,
                      s = t.isFunction(i.helper),
                      n = s
                          ? t(i.helper.apply(this.element[0], [e]))
                          : 'clone' === i.helper
                          ? this.element.clone().removeAttr('id')
                          : this.element;
                  return (
                      n.parents('body').length ||
                          n.appendTo(
                              'parent' === i.appendTo
                                  ? this.element[0].parentNode
                                  : i.appendTo
                          ),
                      s &&
                          n[0] === this.element[0] &&
                          this._setPositionRelative(),
                      n[0] === this.element[0] ||
                          /(fixed|absolute)/.test(n.css('position')) ||
                          n.css('position', 'absolute'),
                      n
                  );
              },
              _setPositionRelative: function () {
                  /^(?:r|a|f)/.test(this.element.css('position')) ||
                      (this.element[0].style.position = 'relative');
              },
              _adjustOffsetFromHelper: function (e) {
                  'string' == typeof e && (e = e.split(' ')),
                      t.isArray(e) && (e = { left: +e[0], top: +e[1] || 0 }),
                      'left' in e &&
                          (this.offset.click.left = e.left + this.margins.left),
                      'right' in e &&
                          (this.offset.click.left =
                              this.helperProportions.width -
                              e.right +
                              this.margins.left),
                      'top' in e &&
                          (this.offset.click.top = e.top + this.margins.top),
                      'bottom' in e &&
                          (this.offset.click.top =
                              this.helperProportions.height -
                              e.bottom +
                              this.margins.top);
              },
              _isRootNode: function (t) {
                  return /(html|body)/i.test(t.tagName) || t === this.document[0];
              },
              _getParentOffset: function () {
                  var e = this.offsetParent.offset(),
                      i = this.document[0];
                  return (
                      'absolute' === this.cssPosition &&
                          this.scrollParent[0] !== i &&
                          t.contains(
                              this.scrollParent[0],
                              this.offsetParent[0]
                          ) &&
                          ((e.left += this.scrollParent.scrollLeft()),
                          (e.top += this.scrollParent.scrollTop())),
                      this._isRootNode(this.offsetParent[0]) &&
                          (e = { top: 0, left: 0 }),
                      {
                          top:
                              e.top +
                              (parseInt(
                                  this.offsetParent.css('borderTopWidth'),
                                  10
                              ) || 0),
                          left:
                              e.left +
                              (parseInt(
                                  this.offsetParent.css('borderLeftWidth'),
                                  10
                              ) || 0),
                      }
                  );
              },
              _getRelativeOffset: function () {
                  if ('relative' !== this.cssPosition) return { top: 0, left: 0 };
                  var t = this.element.position(),
                      e = this._isRootNode(this.scrollParent[0]);
                  return {
                      top:
                          t.top -
                          (parseInt(this.helper.css('top'), 10) || 0) +
                          (e ? 0 : this.scrollParent.scrollTop()),
                      left:
                          t.left -
                          (parseInt(this.helper.css('left'), 10) || 0) +
                          (e ? 0 : this.scrollParent.scrollLeft()),
                  };
              },
              _cacheMargins: function () {
                  this.margins = {
                      left: parseInt(this.element.css('marginLeft'), 10) || 0,
                      top: parseInt(this.element.css('marginTop'), 10) || 0,
                      right: parseInt(this.element.css('marginRight'), 10) || 0,
                      bottom: parseInt(this.element.css('marginBottom'), 10) || 0,
                  };
              },
              _cacheHelperProportions: function () {
                  this.helperProportions = {
                      width: this.helper.outerWidth(),
                      height: this.helper.outerHeight(),
                  };
              },
              _setContainment: function () {
                  var e,
                      i,
                      s,
                      n = this.options,
                      o = this.document[0];
                  return (
                      (this.relativeContainer = null),
                      n.containment
                          ? 'window' === n.containment
                              ? void (this.containment = [
                                    t(window).scrollLeft() -
                                        this.offset.relative.left -
                                        this.offset.parent.left,
                                    t(window).scrollTop() -
                                        this.offset.relative.top -
                                        this.offset.parent.top,
                                    t(window).scrollLeft() +
                                        t(window).width() -
                                        this.helperProportions.width -
                                        this.margins.left,
                                    t(window).scrollTop() +
                                        (t(window).height() ||
                                            o.body.parentNode.scrollHeight) -
                                        this.helperProportions.height -
                                        this.margins.top,
                                ])
                              : 'document' === n.containment
                              ? void (this.containment = [
                                    0,
                                    0,
                                    t(o).width() -
                                        this.helperProportions.width -
                                        this.margins.left,
                                    (t(o).height() ||
                                        o.body.parentNode.scrollHeight) -
                                        this.helperProportions.height -
                                        this.margins.top,
                                ])
                              : n.containment.constructor === Array
                              ? void (this.containment = n.containment)
                              : ('parent' === n.containment &&
                                    (n.containment = this.helper[0].parentNode),
                                void (
                                    (s = (i = t(n.containment))[0]) &&
                                    ((e = /(scroll|auto)/.test(
                                        i.css('overflow')
                                    )),
                                    (this.containment = [
                                        (parseInt(i.css('borderLeftWidth'), 10) ||
                                            0) +
                                            (parseInt(i.css('paddingLeft'), 10) ||
                                                0),
                                        (parseInt(i.css('borderTopWidth'), 10) ||
                                            0) +
                                            (parseInt(i.css('paddingTop'), 10) ||
                                                0),
                                        (e
                                            ? Math.max(
                                                  s.scrollWidth,
                                                  s.offsetWidth
                                              )
                                            : s.offsetWidth) -
                                            (parseInt(
                                                i.css('borderRightWidth'),
                                                10
                                            ) || 0) -
                                            (parseInt(
                                                i.css('paddingRight'),
                                                10
                                            ) || 0) -
                                            this.helperProportions.width -
                                            this.margins.left -
                                            this.margins.right,
                                        (e
                                            ? Math.max(
                                                  s.scrollHeight,
                                                  s.offsetHeight
                                              )
                                            : s.offsetHeight) -
                                            (parseInt(
                                                i.css('borderBottomWidth'),
                                                10
                                            ) || 0) -
                                            (parseInt(
                                                i.css('paddingBottom'),
                                                10
                                            ) || 0) -
                                            this.helperProportions.height -
                                            this.margins.top -
                                            this.margins.bottom,
                                    ]),
                                    (this.relativeContainer = i))
                                ))
                          : void (this.containment = null)
                  );
              },
              _convertPositionTo: function (t, e) {
                  e || (e = this.position);
                  var i = 'absolute' === t ? 1 : -1,
                      s = this._isRootNode(this.scrollParent[0]);
                  return {
                      top:
                          e.top +
                          this.offset.relative.top * i +
                          this.offset.parent.top * i -
                          ('fixed' === this.cssPosition
                              ? -this.offset.scroll.top
                              : s
                              ? 0
                              : this.offset.scroll.top) *
                              i,
                      left:
                          e.left +
                          this.offset.relative.left * i +
                          this.offset.parent.left * i -
                          ('fixed' === this.cssPosition
                              ? -this.offset.scroll.left
                              : s
                              ? 0
                              : this.offset.scroll.left) *
                              i,
                  };
              },
              _generatePosition: function (t, e) {
                  var i,
                      s,
                      n,
                      o,
                      a = this.options,
                      r = this._isRootNode(this.scrollParent[0]),
                      h = t.pageX,
                      l = t.pageY;
                  return (
                      (r && this.offset.scroll) ||
                          (this.offset.scroll = {
                              top: this.scrollParent.scrollTop(),
                              left: this.scrollParent.scrollLeft(),
                          }),
                      e &&
                          (this.containment &&
                              (this.relativeContainer
                                  ? ((s = this.relativeContainer.offset()),
                                    (i = [
                                        this.containment[0] + s.left,
                                        this.containment[1] + s.top,
                                        this.containment[2] + s.left,
                                        this.containment[3] + s.top,
                                    ]))
                                  : (i = this.containment),
                              t.pageX - this.offset.click.left < i[0] &&
                                  (h = i[0] + this.offset.click.left),
                              t.pageY - this.offset.click.top < i[1] &&
                                  (l = i[1] + this.offset.click.top),
                              t.pageX - this.offset.click.left > i[2] &&
                                  (h = i[2] + this.offset.click.left),
                              t.pageY - this.offset.click.top > i[3] &&
                                  (l = i[3] + this.offset.click.top)),
                          a.grid &&
                              ((n = a.grid[1]
                                  ? this.originalPageY +
                                    Math.round(
                                        (l - this.originalPageY) / a.grid[1]
                                    ) *
                                        a.grid[1]
                                  : this.originalPageY),
                              (l = i
                                  ? n - this.offset.click.top >= i[1] ||
                                    n - this.offset.click.top > i[3]
                                      ? n
                                      : n - this.offset.click.top >= i[1]
                                      ? n - a.grid[1]
                                      : n + a.grid[1]
                                  : n),
                              (o = a.grid[0]
                                  ? this.originalPageX +
                                    Math.round(
                                        (h - this.originalPageX) / a.grid[0]
                                    ) *
                                        a.grid[0]
                                  : this.originalPageX),
                              (h = i
                                  ? o - this.offset.click.left >= i[0] ||
                                    o - this.offset.click.left > i[2]
                                      ? o
                                      : o - this.offset.click.left >= i[0]
                                      ? o - a.grid[0]
                                      : o + a.grid[0]
                                  : o)),
                          'y' === a.axis && (h = this.originalPageX),
                          'x' === a.axis && (l = this.originalPageY)),
                      {
                          top:
                              l -
                              this.offset.click.top -
                              this.offset.relative.top -
                              this.offset.parent.top +
                              ('fixed' === this.cssPosition
                                  ? -this.offset.scroll.top
                                  : r
                                  ? 0
                                  : this.offset.scroll.top),
                          left:
                              h -
                              this.offset.click.left -
                              this.offset.relative.left -
                              this.offset.parent.left +
                              ('fixed' === this.cssPosition
                                  ? -this.offset.scroll.left
                                  : r
                                  ? 0
                                  : this.offset.scroll.left),
                      }
                  );
              },
              _clear: function () {
                  this._removeClass(this.helper, 'ui-draggable-dragging'),
                      this.helper[0] === this.element[0] ||
                          this.cancelHelperRemoval ||
                          this.helper.remove(),
                      (this.helper = null),
                      (this.cancelHelperRemoval = !1),
                      this.destroyOnClear && this.destroy();
              },
              _trigger: function (e, i, s) {
                  return (
                      (s = s || this._uiHash()),
                      t.ui.plugin.call(this, e, [i, s, this], !0),
                      /^(drag|start|stop)/.test(e) &&
                          ((this.positionAbs = this._convertPositionTo(
                              'absolute'
                          )),
                          (s.offset = this.positionAbs)),
                      t.Widget.prototype._trigger.call(this, e, i, s)
                  );
              },
              plugins: {},
              _uiHash: function () {
                  return {
                      helper: this.helper,
                      position: this.position,
                      originalPosition: this.originalPosition,
                      offset: this.positionAbs,
                  };
              },
          }),
          t.ui.plugin.add('draggable', 'connectToSortable', {
              start: function (e, i, s) {
                  var n = t.extend({}, i, { item: s.element });
                  (s.sortables = []),
                      t(s.options.connectToSortable).each(function () {
                          var i = t(this).sortable('instance');
                          i &&
                              !i.options.disabled &&
                              (s.sortables.push(i),
                              i.refreshPositions(),
                              i._trigger('activate', e, n));
                      });
              },
              stop: function (e, i, s) {
                  var n = t.extend({}, i, { item: s.element });
                  (s.cancelHelperRemoval = !1),
                      t.each(s.sortables, function () {
                          var t = this;
                          t.isOver
                              ? ((t.isOver = 0),
                                (s.cancelHelperRemoval = !0),
                                (t.cancelHelperRemoval = !1),
                                (t._storedCSS = {
                                    position: t.placeholder.css('position'),
                                    top: t.placeholder.css('top'),
                                    left: t.placeholder.css('left'),
                                }),
                                t._mouseStop(e),
                                (t.options.helper = t.options._helper))
                              : ((t.cancelHelperRemoval = !0),
                                t._trigger('deactivate', e, n));
                      });
              },
              drag: function (e, i, s) {
                  t.each(s.sortables, function () {
                      var n = !1,
                          o = this;
                      (o.positionAbs = s.positionAbs),
                          (o.helperProportions = s.helperProportions),
                          (o.offset.click = s.offset.click),
                          o._intersectsWith(o.containerCache) &&
                              ((n = !0),
                              t.each(s.sortables, function () {
                                  return (
                                      (this.positionAbs = s.positionAbs),
                                      (this.helperProportions =
                                          s.helperProportions),
                                      (this.offset.click = s.offset.click),
                                      this !== o &&
                                          this._intersectsWith(
                                              this.containerCache
                                          ) &&
                                          t.contains(
                                              o.element[0],
                                              this.element[0]
                                          ) &&
                                          (n = !1),
                                      n
                                  );
                              })),
                          n
                              ? (o.isOver ||
                                    ((o.isOver = 1),
                                    (s._parent = i.helper.parent()),
                                    (o.currentItem = i.helper
                                        .appendTo(o.element)
                                        .data('ui-sortable-item', !0)),
                                    (o.options._helper = o.options.helper),
                                    (o.options.helper = function () {
                                        return i.helper[0];
                                    }),
                                    (e.target = o.currentItem[0]),
                                    o._mouseCapture(e, !0),
                                    o._mouseStart(e, !0, !0),
                                    (o.offset.click.top = s.offset.click.top),
                                    (o.offset.click.left = s.offset.click.left),
                                    (o.offset.parent.left -=
                                        s.offset.parent.left -
                                        o.offset.parent.left),
                                    (o.offset.parent.top -=
                                        s.offset.parent.top -
                                        o.offset.parent.top),
                                    s._trigger('toSortable', e),
                                    (s.dropped = o.element),
                                    t.each(s.sortables, function () {
                                        this.refreshPositions();
                                    }),
                                    (s.currentItem = s.element),
                                    (o.fromOutside = s)),
                                o.currentItem &&
                                    (o._mouseDrag(e), (i.position = o.position)))
                              : o.isOver &&
                                ((o.isOver = 0),
                                (o.cancelHelperRemoval = !0),
                                (o.options._revert = o.options.revert),
                                (o.options.revert = !1),
                                o._trigger('out', e, o._uiHash(o)),
                                o._mouseStop(e, !0),
                                (o.options.revert = o.options._revert),
                                (o.options.helper = o.options._helper),
                                o.placeholder && o.placeholder.remove(),
                                i.helper.appendTo(s._parent),
                                s._refreshOffsets(e),
                                (i.position = s._generatePosition(e, !0)),
                                s._trigger('fromSortable', e),
                                (s.dropped = !1),
                                t.each(s.sortables, function () {
                                    this.refreshPositions();
                                }));
                  });
              },
          }),
          t.ui.plugin.add('draggable', 'cursor', {
              start: function (e, i, s) {
                  var n = t('body'),
                      o = s.options;
                  n.css('cursor') && (o._cursor = n.css('cursor')),
                      n.css('cursor', o.cursor);
              },
              stop: function (e, i, s) {
                  var n = s.options;
                  n._cursor && t('body').css('cursor', n._cursor);
              },
          }),
          t.ui.plugin.add('draggable', 'opacity', {
              start: function (e, i, s) {
                  var n = t(i.helper),
                      o = s.options;
                  n.css('opacity') && (o._opacity = n.css('opacity')),
                      n.css('opacity', o.opacity);
              },
              stop: function (e, i, s) {
                  var n = s.options;
                  n._opacity && t(i.helper).css('opacity', n._opacity);
              },
          }),
          t.ui.plugin.add('draggable', 'scroll', {
              start: function (t, e, i) {
                  i.scrollParentNotHidden ||
                      (i.scrollParentNotHidden = i.helper.scrollParent(!1)),
                      i.scrollParentNotHidden[0] !== i.document[0] &&
                          'HTML' !== i.scrollParentNotHidden[0].tagName &&
                          (i.overflowOffset = i.scrollParentNotHidden.offset());
              },
              drag: function (e, i, s) {
                  var n = s.options,
                      o = !1,
                      a = s.scrollParentNotHidden[0],
                      r = s.document[0];
                  a !== r && 'HTML' !== a.tagName
                      ? ((n.axis && 'x' === n.axis) ||
                            (s.overflowOffset.top + a.offsetHeight - e.pageY <
                            n.scrollSensitivity
                                ? (a.scrollTop = o = a.scrollTop + n.scrollSpeed)
                                : e.pageY - s.overflowOffset.top <
                                      n.scrollSensitivity &&
                                  (a.scrollTop = o =
                                      a.scrollTop - n.scrollSpeed)),
                        (n.axis && 'y' === n.axis) ||
                            (s.overflowOffset.left + a.offsetWidth - e.pageX <
                            n.scrollSensitivity
                                ? (a.scrollLeft = o =
                                      a.scrollLeft + n.scrollSpeed)
                                : e.pageX - s.overflowOffset.left <
                                      n.scrollSensitivity &&
                                  (a.scrollLeft = o =
                                      a.scrollLeft - n.scrollSpeed)))
                      : ((n.axis && 'x' === n.axis) ||
                            (e.pageY - t(r).scrollTop() < n.scrollSensitivity
                                ? (o = t(r).scrollTop(
                                      t(r).scrollTop() - n.scrollSpeed
                                  ))
                                : t(window).height() -
                                      (e.pageY - t(r).scrollTop()) <
                                      n.scrollSensitivity &&
                                  (o = t(r).scrollTop(
                                      t(r).scrollTop() + n.scrollSpeed
                                  ))),
                        (n.axis && 'y' === n.axis) ||
                            (e.pageX - t(r).scrollLeft() < n.scrollSensitivity
                                ? (o = t(r).scrollLeft(
                                      t(r).scrollLeft() - n.scrollSpeed
                                  ))
                                : t(window).width() -
                                      (e.pageX - t(r).scrollLeft()) <
                                      n.scrollSensitivity &&
                                  (o = t(r).scrollLeft(
                                      t(r).scrollLeft() + n.scrollSpeed
                                  )))),
                      !1 !== o &&
                          t.ui.ddmanager &&
                          !n.dropBehaviour &&
                          t.ui.ddmanager.prepareOffsets(s, e);
              },
          }),
          t.ui.plugin.add('draggable', 'snap', {
              start: function (e, i, s) {
                  var n = s.options;
                  (s.snapElements = []),
                      t(
                          n.snap.constructor !== String
                              ? n.snap.items || ':data(ui-draggable)'
                              : n.snap
                      ).each(function () {
                          var e = t(this),
                              i = e.offset();
                          this !== s.element[0] &&
                              s.snapElements.push({
                                  item: this,
                                  width: e.outerWidth(),
                                  height: e.outerHeight(),
                                  top: i.top,
                                  left: i.left,
                              });
                      });
              },
              drag: function (e, i, s) {
                  var n,
                      o,
                      a,
                      r,
                      h,
                      l,
                      c,
                      u,
                      d,
                      p,
                      f = s.options,
                      g = f.snapTolerance,
                      m = i.offset.left,
                      _ = m + s.helperProportions.width,
                      v = i.offset.top,
                      b = v + s.helperProportions.height;
                  for (d = s.snapElements.length - 1; d >= 0; d--)
                      (l =
                          (h = s.snapElements[d].left - s.margins.left) +
                          s.snapElements[d].width),
                          (u =
                              (c = s.snapElements[d].top - s.margins.top) +
                              s.snapElements[d].height),
                          h - g > _ ||
                          m > l + g ||
                          c - g > b ||
                          v > u + g ||
                          !t.contains(
                              s.snapElements[d].item.ownerDocument,
                              s.snapElements[d].item
                          )
                              ? (s.snapElements[d].snapping &&
                                    s.options.snap.release &&
                                    s.options.snap.release.call(
                                        s.element,
                                        e,
                                        t.extend(s._uiHash(), {
                                            snapItem: s.snapElements[d].item,
                                        })
                                    ),
                                (s.snapElements[d].snapping = !1))
                              : ('inner' !== f.snapMode &&
                                    ((n = g >= Math.abs(c - b)),
                                    (o = g >= Math.abs(u - v)),
                                    (a = g >= Math.abs(h - _)),
                                    (r = g >= Math.abs(l - m)),
                                    n &&
                                        (i.position.top = s._convertPositionTo(
                                            'relative',
                                            {
                                                top:
                                                    c -
                                                    s.helperProportions.height,
                                                left: 0,
                                            }
                                        ).top),
                                    o &&
                                        (i.position.top = s._convertPositionTo(
                                            'relative',
                                            { top: u, left: 0 }
                                        ).top),
                                    a &&
                                        (i.position.left = s._convertPositionTo(
                                            'relative',
                                            {
                                                top: 0,
                                                left:
                                                    h - s.helperProportions.width,
                                            }
                                        ).left),
                                    r &&
                                        (i.position.left = s._convertPositionTo(
                                            'relative',
                                            { top: 0, left: l }
                                        ).left)),
                                (p = n || o || a || r),
                                'outer' !== f.snapMode &&
                                    ((n = g >= Math.abs(c - v)),
                                    (o = g >= Math.abs(u - b)),
                                    (a = g >= Math.abs(h - m)),
                                    (r = g >= Math.abs(l - _)),
                                    n &&
                                        (i.position.top = s._convertPositionTo(
                                            'relative',
                                            { top: c, left: 0 }
                                        ).top),
                                    o &&
                                        (i.position.top = s._convertPositionTo(
                                            'relative',
                                            {
                                                top:
                                                    u -
                                                    s.helperProportions.height,
                                                left: 0,
                                            }
                                        ).top),
                                    a &&
                                        (i.position.left = s._convertPositionTo(
                                            'relative',
                                            { top: 0, left: h }
                                        ).left),
                                    r &&
                                        (i.position.left = s._convertPositionTo(
                                            'relative',
                                            {
                                                top: 0,
                                                left:
                                                    l - s.helperProportions.width,
                                            }
                                        ).left)),
                                !s.snapElements[d].snapping &&
                                    (n || o || a || r || p) &&
                                    s.options.snap.snap &&
                                    s.options.snap.snap.call(
                                        s.element,
                                        e,
                                        t.extend(s._uiHash(), {
                                            snapItem: s.snapElements[d].item,
                                        })
                                    ),
                                (s.snapElements[d].snapping =
                                    n || o || a || r || p));
              },
          }),
          t.ui.plugin.add('draggable', 'stack', {
              start: function (e, i, s) {
                  var n,
                      o = s.options,
                      a = t.makeArray(t(o.stack)).sort(function (e, i) {
                          return (
                              (parseInt(t(e).css('zIndex'), 10) || 0) -
                              (parseInt(t(i).css('zIndex'), 10) || 0)
                          );
                      });
                  a.length &&
                      ((n = parseInt(t(a[0]).css('zIndex'), 10) || 0),
                      t(a).each(function (e) {
                          t(this).css('zIndex', n + e);
                      }),
                      this.css('zIndex', n + a.length));
              },
          }),
          t.ui.plugin.add('draggable', 'zIndex', {
              start: function (e, i, s) {
                  var n = t(i.helper),
                      o = s.options;
                  n.css('zIndex') && (o._zIndex = n.css('zIndex')),
                      n.css('zIndex', o.zIndex);
              },
              stop: function (e, i, s) {
                  var n = s.options;
                  n._zIndex && t(i.helper).css('zIndex', n._zIndex);
              },
          }),
          t.ui.draggable,
          t.widget('ui.resizable', t.ui.mouse, {
              version: '1.12.1',
              widgetEventPrefix: 'resize',
              options: {
                  alsoResize: !1,
                  animate: !1,
                  animateDuration: 'slow',
                  animateEasing: 'swing',
                  aspectRatio: !1,
                  autoHide: !1,
                  classes: {
                      'ui-resizable-se': 'ui-icon ui-icon-gripsmall-diagonal-se',
                  },
                  containment: !1,
                  ghost: !1,
                  grid: !1,
                  handles: 'e,s,se',
                  helper: !1,
                  maxHeight: null,
                  maxWidth: null,
                  minHeight: 10,
                  minWidth: 10,
                  zIndex: 90,
                  resize: null,
                  start: null,
                  stop: null,
              },
              _num: function (t) {
                  return parseFloat(t) || 0;
              },
              _isNumber: function (t) {
                  return !isNaN(parseFloat(t));
              },
              _hasScroll: function (e, i) {
                  if ('hidden' === t(e).css('overflow')) return !1;
                  var s = i && 'left' === i ? 'scrollLeft' : 'scrollTop',
                      n = !1;
                  return e[s] > 0 || ((e[s] = 1), (n = e[s] > 0), (e[s] = 0), n);
              },
              _create: function () {
                  var e,
                      i = this.options,
                      s = this;
                  this._addClass('ui-resizable'),
                      t.extend(this, {
                          _aspectRatio: !!i.aspectRatio,
                          aspectRatio: i.aspectRatio,
                          originalElement: this.element,
                          _proportionallyResizeElements: [],
                          _helper:
                              i.helper || i.ghost || i.animate
                                  ? i.helper || 'ui-resizable-helper'
                                  : null,
                      }),
                      this.element[0].nodeName.match(
                          /^(canvas|textarea|input|select|button|img)$/i
                      ) &&
                          (this.element.wrap(
                              t(
                                  "<div class='ui-wrapper' style='overflow: hidden;'></div>"
                              ).css({
                                  position: this.element.css('position'),
                                  width: this.element.outerWidth(),
                                  height: this.element.outerHeight(),
                                  top: this.element.css('top'),
                                  left: this.element.css('left'),
                              })
                          ),
                          (this.element = this.element
                              .parent()
                              .data(
                                  'ui-resizable',
                                  this.element.resizable('instance')
                              )),
                          (this.elementIsWrapper = !0),
                          (e = {
                              marginTop: this.originalElement.css('marginTop'),
                              marginRight: this.originalElement.css(
                                  'marginRight'
                              ),
                              marginBottom: this.originalElement.css(
                                  'marginBottom'
                              ),
                              marginLeft: this.originalElement.css('marginLeft'),
                          }),
                          this.element.css(e),
                          this.originalElement.css('margin', 0),
                          (this.originalResizeStyle = this.originalElement.css(
                              'resize'
                          )),
                          this.originalElement.css('resize', 'none'),
                          this._proportionallyResizeElements.push(
                              this.originalElement.css({
                                  position: 'static',
                                  zoom: 1,
                                  display: 'block',
                              })
                          ),
                          this.originalElement.css(e),
                          this._proportionallyResize()),
                      this._setupHandles(),
                      i.autoHide &&
                          t(this.element)
                              .on('mouseenter', function () {
                                  i.disabled ||
                                      (s._removeClass('ui-resizable-autohide'),
                                      s._handles.show());
                              })
                              .on('mouseleave', function () {
                                  i.disabled ||
                                      s.resizing ||
                                      (s._addClass('ui-resizable-autohide'),
                                      s._handles.hide());
                              }),
                      this._mouseInit();
              },
              _destroy: function () {
                  this._mouseDestroy();
                  var e,
                      i = function (e) {
                          t(e)
                              .removeData('resizable')
                              .removeData('ui-resizable')
                              .off('.resizable')
                              .find('.ui-resizable-handle')
                              .remove();
                      };
                  return (
                      this.elementIsWrapper &&
                          (i(this.element),
                          (e = this.element),
                          this.originalElement
                              .css({
                                  position: e.css('position'),
                                  width: e.outerWidth(),
                                  height: e.outerHeight(),
                                  top: e.css('top'),
                                  left: e.css('left'),
                              })
                              .insertAfter(e),
                          e.remove()),
                      this.originalElement.css(
                          'resize',
                          this.originalResizeStyle
                      ),
                      i(this.originalElement),
                      this
                  );
              },
              _setOption: function (t, e) {
                  switch ((this._super(t, e), t)) {
                      case 'handles':
                          this._removeHandles(), this._setupHandles();
                          break;
                      default:
                  }
              },
              _setupHandles: function () {
                  var e,
                      i,
                      s,
                      n,
                      o,
                      a = this.options,
                      r = this;
                  if (
                      ((this.handles =
                          a.handles ||
                          (t('.ui-resizable-handle', this.element).length
                              ? {
                                    n: '.ui-resizable-n',
                                    e: '.ui-resizable-e',
                                    s: '.ui-resizable-s',
                                    w: '.ui-resizable-w',
                                    se: '.ui-resizable-se',
                                    sw: '.ui-resizable-sw',
                                    ne: '.ui-resizable-ne',
                                    nw: '.ui-resizable-nw',
                                }
                              : 'e,s,se')),
                      (this._handles = t()),
                      this.handles.constructor === String)
                  )
                      for (
                          'all' === this.handles &&
                              (this.handles = 'n,e,s,w,se,sw,ne,nw'),
                              s = this.handles.split(','),
                              this.handles = {},
                              i = 0;
                          s.length > i;
                          i++
                      )
                          (n = 'ui-resizable-' + (e = t.trim(s[i]))),
                              (o = t('<div>')),
                              this._addClass(o, 'ui-resizable-handle ' + n),
                              o.css({ zIndex: a.zIndex }),
                              (this.handles[e] = '.ui-resizable-' + e),
                              this.element.append(o);
                  (this._renderAxis = function (e) {
                      var i, s, n, o;
                      for (i in ((e = e || this.element), this.handles))
                          this.handles[i].constructor === String
                              ? (this.handles[i] = this.element
                                    .children(this.handles[i])
                                    .first()
                                    .show())
                              : (this.handles[i].jquery ||
                                    this.handles[i].nodeType) &&
                                ((this.handles[i] = t(this.handles[i])),
                                this._on(this.handles[i], {
                                    mousedown: r._mouseDown,
                                })),
                              this.elementIsWrapper &&
                                  this.originalElement[0].nodeName.match(
                                      /^(textarea|input|select|button)$/i
                                  ) &&
                                  ((s = t(this.handles[i], this.element)),
                                  (o = /sw|ne|nw|se|n|s/.test(i)
                                      ? s.outerHeight()
                                      : s.outerWidth()),
                                  (n = [
                                      'padding',
                                      /ne|nw|n/.test(i)
                                          ? 'Top'
                                          : /se|sw|s/.test(i)
                                          ? 'Bottom'
                                          : /^e$/.test(i)
                                          ? 'Right'
                                          : 'Left',
                                  ].join('')),
                                  e.css(n, o),
                                  this._proportionallyResize()),
                              (this._handles = this._handles.add(
                                  this.handles[i]
                              ));
                  }),
                      this._renderAxis(this.element),
                      (this._handles = this._handles.add(
                          this.element.find('.ui-resizable-handle')
                      )),
                      this._handles.disableSelection(),
                      this._handles.on('mouseover', function () {
                          r.resizing ||
                              (this.className &&
                                  (o = this.className.match(
                                      /ui-resizable-(se|sw|ne|nw|n|e|s|w)/i
                                  )),
                              (r.axis = o && o[1] ? o[1] : 'se'));
                      }),
                      a.autoHide &&
                          (this._handles.hide(),
                          this._addClass('ui-resizable-autohide'));
              },
              _removeHandles: function () {
                  this._handles.remove();
              },
              _mouseCapture: function (e) {
                  var i,
                      s,
                      n = !1;
                  for (i in this.handles)
                      ((s = t(this.handles[i])[0]) === e.target ||
                          t.contains(s, e.target)) &&
                          (n = !0);
                  return !this.options.disabled && n;
              },
              _mouseStart: function (e) {
                  var i,
                      s,
                      n,
                      o = this.options,
                      a = this.element;
                  return (
                      (this.resizing = !0),
                      this._renderProxy(),
                      (i = this._num(this.helper.css('left'))),
                      (s = this._num(this.helper.css('top'))),
                      o.containment &&
                          ((i += t(o.containment).scrollLeft() || 0),
                          (s += t(o.containment).scrollTop() || 0)),
                      (this.offset = this.helper.offset()),
                      (this.position = { left: i, top: s }),
                      (this.size = this._helper
                          ? {
                                width: this.helper.width(),
                                height: this.helper.height(),
                            }
                          : { width: a.width(), height: a.height() }),
                      (this.originalSize = this._helper
                          ? { width: a.outerWidth(), height: a.outerHeight() }
                          : { width: a.width(), height: a.height() }),
                      (this.sizeDiff = {
                          width: a.outerWidth() - a.width(),
                          height: a.outerHeight() - a.height(),
                      }),
                      (this.originalPosition = { left: i, top: s }),
                      (this.originalMousePosition = {
                          left: e.pageX,
                          top: e.pageY,
                      }),
                      (this.aspectRatio =
                          'number' == typeof o.aspectRatio
                              ? o.aspectRatio
                              : this.originalSize.width /
                                    this.originalSize.height || 1),
                      (n = t('.ui-resizable-' + this.axis).css('cursor')),
                      t('body').css(
                          'cursor',
                          'auto' === n ? this.axis + '-resize' : n
                      ),
                      this._addClass('ui-resizable-resizing'),
                      this._propagate('start', e),
                      !0
                  );
              },
              _mouseDrag: function (e) {
                  var i,
                      s,
                      n = this.originalMousePosition,
                      o = this.axis,
                      a = e.pageX - n.left || 0,
                      r = e.pageY - n.top || 0,
                      h = this._change[o];
                  return (
                      this._updatePrevProperties(),
                      !!h &&
                          ((i = h.apply(this, [e, a, r])),
                          this._updateVirtualBoundaries(e.shiftKey),
                          (this._aspectRatio || e.shiftKey) &&
                              (i = this._updateRatio(i, e)),
                          (i = this._respectSize(i, e)),
                          this._updateCache(i),
                          this._propagate('resize', e),
                          (s = this._applyChanges()),
                          !this._helper &&
                              this._proportionallyResizeElements.length &&
                              this._proportionallyResize(),
                          t.isEmptyObject(s) ||
                              (this._updatePrevProperties(),
                              this._trigger('resize', e, this.ui()),
                              this._applyChanges()),
                          !1)
                  );
              },
              _mouseStop: function (e) {
                  this.resizing = !1;
                  var i,
                      s,
                      n,
                      o,
                      a,
                      r,
                      h,
                      l = this.options,
                      c = this;
                  return (
                      this._helper &&
                          ((n =
                              (s =
                                  (i = this._proportionallyResizeElements)
                                      .length &&
                                  /textarea/i.test(i[0].nodeName)) &&
                              this._hasScroll(i[0], 'left')
                                  ? 0
                                  : c.sizeDiff.height),
                          (o = s ? 0 : c.sizeDiff.width),
                          (a = {
                              width: c.helper.width() - o,
                              height: c.helper.height() - n,
                          }),
                          (r =
                              parseFloat(c.element.css('left')) +
                                  (c.position.left - c.originalPosition.left) ||
                              null),
                          (h =
                              parseFloat(c.element.css('top')) +
                                  (c.position.top - c.originalPosition.top) ||
                              null),
                          l.animate ||
                              this.element.css(t.extend(a, { top: h, left: r })),
                          c.helper.height(c.size.height),
                          c.helper.width(c.size.width),
                          this._helper &&
                              !l.animate &&
                              this._proportionallyResize()),
                      t('body').css('cursor', 'auto'),
                      this._removeClass('ui-resizable-resizing'),
                      this._propagate('stop', e),
                      this._helper && this.helper.remove(),
                      !1
                  );
              },
              _updatePrevProperties: function () {
                  (this.prevPosition = {
                      top: this.position.top,
                      left: this.position.left,
                  }),
                      (this.prevSize = {
                          width: this.size.width,
                          height: this.size.height,
                      });
              },
              _applyChanges: function () {
                  var t = {};
                  return (
                      this.position.top !== this.prevPosition.top &&
                          (t.top = this.position.top + 'px'),
                      this.position.left !== this.prevPosition.left &&
                          (t.left = this.position.left + 'px'),
                      this.size.width !== this.prevSize.width &&
                          (t.width = this.size.width + 'px'),
                      this.size.height !== this.prevSize.height &&
                          (t.height = this.size.height + 'px'),
                      this.helper.css(t),
                      t
                  );
              },
              _updateVirtualBoundaries: function (t) {
                  var e,
                      i,
                      s,
                      n,
                      o,
                      a = this.options;
                  (o = {
                      minWidth: this._isNumber(a.minWidth) ? a.minWidth : 0,
                      maxWidth: this._isNumber(a.maxWidth) ? a.maxWidth : 1 / 0,
                      minHeight: this._isNumber(a.minHeight) ? a.minHeight : 0,
                      maxHeight: this._isNumber(a.maxHeight)
                          ? a.maxHeight
                          : 1 / 0,
                  }),
                      (this._aspectRatio || t) &&
                          ((e = o.minHeight * this.aspectRatio),
                          (s = o.minWidth / this.aspectRatio),
                          (i = o.maxHeight * this.aspectRatio),
                          (n = o.maxWidth / this.aspectRatio),
                          e > o.minWidth && (o.minWidth = e),
                          s > o.minHeight && (o.minHeight = s),
                          o.maxWidth > i && (o.maxWidth = i),
                          o.maxHeight > n && (o.maxHeight = n)),
                      (this._vBoundaries = o);
              },
              _updateCache: function (t) {
                  (this.offset = this.helper.offset()),
                      this._isNumber(t.left) && (this.position.left = t.left),
                      this._isNumber(t.top) && (this.position.top = t.top),
                      this._isNumber(t.height) && (this.size.height = t.height),
                      this._isNumber(t.width) && (this.size.width = t.width);
              },
              _updateRatio: function (t) {
                  var e = this.position,
                      i = this.size,
                      s = this.axis;
                  return (
                      this._isNumber(t.height)
                          ? (t.width = t.height * this.aspectRatio)
                          : this._isNumber(t.width) &&
                            (t.height = t.width / this.aspectRatio),
                      'sw' === s &&
                          ((t.left = e.left + (i.width - t.width)),
                          (t.top = null)),
                      'nw' === s &&
                          ((t.top = e.top + (i.height - t.height)),
                          (t.left = e.left + (i.width - t.width))),
                      t
                  );
              },
              _respectSize: function (t) {
                  var e = this._vBoundaries,
                      i = this.axis,
                      s =
                          this._isNumber(t.width) &&
                          e.maxWidth &&
                          e.maxWidth < t.width,
                      n =
                          this._isNumber(t.height) &&
                          e.maxHeight &&
                          e.maxHeight < t.height,
                      o =
                          this._isNumber(t.width) &&
                          e.minWidth &&
                          e.minWidth > t.width,
                      a =
                          this._isNumber(t.height) &&
                          e.minHeight &&
                          e.minHeight > t.height,
                      r = this.originalPosition.left + this.originalSize.width,
                      h = this.originalPosition.top + this.originalSize.height,
                      l = /sw|nw|w/.test(i),
                      c = /nw|ne|n/.test(i);
                  return (
                      o && (t.width = e.minWidth),
                      a && (t.height = e.minHeight),
                      s && (t.width = e.maxWidth),
                      n && (t.height = e.maxHeight),
                      o && l && (t.left = r - e.minWidth),
                      s && l && (t.left = r - e.maxWidth),
                      a && c && (t.top = h - e.minHeight),
                      n && c && (t.top = h - e.maxHeight),
                      t.width || t.height || t.left || !t.top
                          ? t.width ||
                            t.height ||
                            t.top ||
                            !t.left ||
                            (t.left = null)
                          : (t.top = null),
                      t
                  );
              },
              _getPaddingPlusBorderDimensions: function (t) {
                  for (
                      var e = 0,
                          i = [],
                          s = [
                              t.css('borderTopWidth'),
                              t.css('borderRightWidth'),
                              t.css('borderBottomWidth'),
                              t.css('borderLeftWidth'),
                          ],
                          n = [
                              t.css('paddingTop'),
                              t.css('paddingRight'),
                              t.css('paddingBottom'),
                              t.css('paddingLeft'),
                          ];
                      4 > e;
                      e++
                  )
                      (i[e] = parseFloat(s[e]) || 0),
                          (i[e] += parseFloat(n[e]) || 0);
                  return { height: i[0] + i[2], width: i[1] + i[3] };
              },
              _proportionallyResize: function () {
                  if (this._proportionallyResizeElements.length)
                      for (
                          var t, e = 0, i = this.helper || this.element;
                          this._proportionallyResizeElements.length > e;
                          e++
                      )
                          (t = this._proportionallyResizeElements[e]),
                              this.outerDimensions ||
                                  (this.outerDimensions = this._getPaddingPlusBorderDimensions(
                                      t
                                  )),
                              t.css({
                                  height:
                                      i.height() - this.outerDimensions.height ||
                                      0,
                                  width:
                                      i.width() - this.outerDimensions.width || 0,
                              });
              },
              _renderProxy: function () {
                  var e = this.element,
                      i = this.options;
                  (this.elementOffset = e.offset()),
                      this._helper
                          ? ((this.helper =
                                this.helper ||
                                t("<div style='overflow:hidden;'></div>")),
                            this._addClass(this.helper, this._helper),
                            this.helper.css({
                                width: this.element.outerWidth(),
                                height: this.element.outerHeight(),
                                position: 'absolute',
                                left: this.elementOffset.left + 'px',
                                top: this.elementOffset.top + 'px',
                                zIndex: ++i.zIndex,
                            }),
                            this.helper.appendTo('body').disableSelection())
                          : (this.helper = this.element);
              },
              _change: {
                  e: function (t, e) {
                      return { width: this.originalSize.width + e };
                  },
                  w: function (t, e) {
                      var i = this.originalSize;
                      return {
                          left: this.originalPosition.left + e,
                          width: i.width - e,
                      };
                  },
                  n: function (t, e, i) {
                      var s = this.originalSize;
                      return {
                          top: this.originalPosition.top + i,
                          height: s.height - i,
                      };
                  },
                  s: function (t, e, i) {
                      return { height: this.originalSize.height + i };
                  },
                  se: function (e, i, s) {
                      return t.extend(
                          this._change.s.apply(this, arguments),
                          this._change.e.apply(this, [e, i, s])
                      );
                  },
                  sw: function (e, i, s) {
                      return t.extend(
                          this._change.s.apply(this, arguments),
                          this._change.w.apply(this, [e, i, s])
                      );
                  },
                  ne: function (e, i, s) {
                      return t.extend(
                          this._change.n.apply(this, arguments),
                          this._change.e.apply(this, [e, i, s])
                      );
                  },
                  nw: function (e, i, s) {
                      return t.extend(
                          this._change.n.apply(this, arguments),
                          this._change.w.apply(this, [e, i, s])
                      );
                  },
              },
              _propagate: function (e, i) {
                  t.ui.plugin.call(this, e, [i, this.ui()]),
                      'resize' !== e && this._trigger(e, i, this.ui());
              },
              plugins: {},
              ui: function () {
                  return {
                      originalElement: this.originalElement,
                      element: this.element,
                      helper: this.helper,
                      position: this.position,
                      size: this.size,
                      originalSize: this.originalSize,
                      originalPosition: this.originalPosition,
                  };
              },
          }),
          t.ui.plugin.add('resizable', 'animate', {
              stop: function (e) {
                  var i = t(this).resizable('instance'),
                      s = i.options,
                      n = i._proportionallyResizeElements,
                      o = n.length && /textarea/i.test(n[0].nodeName),
                      a = o && i._hasScroll(n[0], 'left') ? 0 : i.sizeDiff.height,
                      r = o ? 0 : i.sizeDiff.width,
                      h = { width: i.size.width - r, height: i.size.height - a },
                      l =
                          parseFloat(i.element.css('left')) +
                              (i.position.left - i.originalPosition.left) || null,
                      c =
                          parseFloat(i.element.css('top')) +
                              (i.position.top - i.originalPosition.top) || null;
                  i.element.animate(
                      t.extend(h, c && l ? { top: c, left: l } : {}),
                      {
                          duration: s.animateDuration,
                          easing: s.animateEasing,
                          step: function () {
                              var s = {
                                  width: parseFloat(i.element.css('width')),
                                  height: parseFloat(i.element.css('height')),
                                  top: parseFloat(i.element.css('top')),
                                  left: parseFloat(i.element.css('left')),
                              };
                              n &&
                                  n.length &&
                                  t(n[0]).css({
                                      width: s.width,
                                      height: s.height,
                                  }),
                                  i._updateCache(s),
                                  i._propagate('resize', e);
                          },
                      }
                  );
              },
          }),
          t.ui.plugin.add('resizable', 'containment', {
              start: function () {
                  var e,
                      i,
                      s,
                      n,
                      o,
                      a,
                      r,
                      h = t(this).resizable('instance'),
                      l = h.options,
                      c = h.element,
                      u = l.containment,
                      d =
                          u instanceof t
                              ? u.get(0)
                              : /parent/.test(u)
                              ? c.parent().get(0)
                              : u;
                  d &&
                      ((h.containerElement = t(d)),
                      /document/.test(u) || u === document
                          ? ((h.containerOffset = { left: 0, top: 0 }),
                            (h.containerPosition = { left: 0, top: 0 }),
                            (h.parentData = {
                                element: t(document),
                                left: 0,
                                top: 0,
                                width: t(document).width(),
                                height:
                                    t(document).height() ||
                                    document.body.parentNode.scrollHeight,
                            }))
                          : ((e = t(d)),
                            (i = []),
                            t(['Top', 'Right', 'Left', 'Bottom']).each(function (
                                t,
                                s
                            ) {
                                i[t] = h._num(e.css('padding' + s));
                            }),
                            (h.containerOffset = e.offset()),
                            (h.containerPosition = e.position()),
                            (h.containerSize = {
                                height: e.innerHeight() - i[3],
                                width: e.innerWidth() - i[1],
                            }),
                            (s = h.containerOffset),
                            (n = h.containerSize.height),
                            (o = h.containerSize.width),
                            (a = h._hasScroll(d, 'left') ? d.scrollWidth : o),
                            (r = h._hasScroll(d) ? d.scrollHeight : n),
                            (h.parentData = {
                                element: d,
                                left: s.left,
                                top: s.top,
                                width: a,
                                height: r,
                            })));
              },
              resize: function (e) {
                  var i,
                      s,
                      n,
                      o,
                      a = t(this).resizable('instance'),
                      r = a.options,
                      h = a.containerOffset,
                      l = a.position,
                      c = a._aspectRatio || e.shiftKey,
                      u = { top: 0, left: 0 },
                      d = a.containerElement,
                      p = !0;
                  d[0] !== document &&
                      /static/.test(d.css('position')) &&
                      (u = h),
                      l.left < (a._helper ? h.left : 0) &&
                          ((a.size.width =
                              a.size.width +
                              (a._helper
                                  ? a.position.left - h.left
                                  : a.position.left - u.left)),
                          c &&
                              ((a.size.height = a.size.width / a.aspectRatio),
                              (p = !1)),
                          (a.position.left = r.helper ? h.left : 0)),
                      l.top < (a._helper ? h.top : 0) &&
                          ((a.size.height =
                              a.size.height +
                              (a._helper
                                  ? a.position.top - h.top
                                  : a.position.top)),
                          c &&
                              ((a.size.width = a.size.height * a.aspectRatio),
                              (p = !1)),
                          (a.position.top = a._helper ? h.top : 0)),
                      (n =
                          a.containerElement.get(0) ===
                          a.element.parent().get(0)),
                      (o = /relative|absolute/.test(
                          a.containerElement.css('position')
                      )),
                      n && o
                          ? ((a.offset.left =
                                a.parentData.left + a.position.left),
                            (a.offset.top = a.parentData.top + a.position.top))
                          : ((a.offset.left = a.element.offset().left),
                            (a.offset.top = a.element.offset().top)),
                      (i = Math.abs(
                          a.sizeDiff.width +
                              (a._helper
                                  ? a.offset.left - u.left
                                  : a.offset.left - h.left)
                      )),
                      (s = Math.abs(
                          a.sizeDiff.height +
                              (a._helper
                                  ? a.offset.top - u.top
                                  : a.offset.top - h.top)
                      )),
                      i + a.size.width >= a.parentData.width &&
                          ((a.size.width = a.parentData.width - i),
                          c &&
                              ((a.size.height = a.size.width / a.aspectRatio),
                              (p = !1))),
                      s + a.size.height >= a.parentData.height &&
                          ((a.size.height = a.parentData.height - s),
                          c &&
                              ((a.size.width = a.size.height * a.aspectRatio),
                              (p = !1))),
                      p ||
                          ((a.position.left = a.prevPosition.left),
                          (a.position.top = a.prevPosition.top),
                          (a.size.width = a.prevSize.width),
                          (a.size.height = a.prevSize.height));
              },
              stop: function () {
                  var e = t(this).resizable('instance'),
                      i = e.options,
                      s = e.containerOffset,
                      n = e.containerPosition,
                      o = e.containerElement,
                      a = t(e.helper),
                      r = a.offset(),
                      h = a.outerWidth() - e.sizeDiff.width,
                      l = a.outerHeight() - e.sizeDiff.height;
                  e._helper &&
                      !i.animate &&
                      /relative/.test(o.css('position')) &&
                      t(this).css({
                          left: r.left - n.left - s.left,
                          width: h,
                          height: l,
                      }),
                      e._helper &&
                          !i.animate &&
                          /static/.test(o.css('position')) &&
                          t(this).css({
                              left: r.left - n.left - s.left,
                              width: h,
                              height: l,
                          });
              },
          }),
          t.ui.plugin.add('resizable', 'alsoResize', {
              start: function () {
                  var e = t(this).resizable('instance').options;
                  t(e.alsoResize).each(function () {
                      var e = t(this);
                      e.data('ui-resizable-alsoresize', {
                          width: parseFloat(e.width()),
                          height: parseFloat(e.height()),
                          left: parseFloat(e.css('left')),
                          top: parseFloat(e.css('top')),
                      });
                  });
              },
              resize: function (e, i) {
                  var s = t(this).resizable('instance'),
                      n = s.options,
                      o = s.originalSize,
                      a = s.originalPosition,
                      r = {
                          height: s.size.height - o.height || 0,
                          width: s.size.width - o.width || 0,
                          top: s.position.top - a.top || 0,
                          left: s.position.left - a.left || 0,
                      };
                  t(n.alsoResize).each(function () {
                      var e = t(this),
                          s = t(this).data('ui-resizable-alsoresize'),
                          n = {},
                          o = e.parents(i.originalElement[0]).length
                              ? ['width', 'height']
                              : ['width', 'height', 'top', 'left'];
                      t.each(o, function (t, e) {
                          var i = (s[e] || 0) + (r[e] || 0);
                          i && i >= 0 && (n[e] = i || null);
                      }),
                          e.css(n);
                  });
              },
              stop: function () {
                  t(this).removeData('ui-resizable-alsoresize');
              },
          }),
          t.ui.plugin.add('resizable', 'ghost', {
              start: function () {
                  var e = t(this).resizable('instance'),
                      i = e.size;
                  (e.ghost = e.originalElement.clone()),
                      e.ghost.css({
                          opacity: 0.25,
                          display: 'block',
                          position: 'relative',
                          height: i.height,
                          width: i.width,
                          margin: 0,
                          left: 0,
                          top: 0,
                      }),
                      e._addClass(e.ghost, 'ui-resizable-ghost'),
                      !1 !== t.uiBackCompat &&
                          'string' == typeof e.options.ghost &&
                          e.ghost.addClass(this.options.ghost),
                      e.ghost.appendTo(e.helper);
              },
              resize: function () {
                  var e = t(this).resizable('instance');
                  e.ghost &&
                      e.ghost.css({
                          position: 'relative',
                          height: e.size.height,
                          width: e.size.width,
                      });
              },
              stop: function () {
                  var e = t(this).resizable('instance');
                  e.ghost &&
                      e.helper &&
                      e.helper.get(0).removeChild(e.ghost.get(0));
              },
          }),
          t.ui.plugin.add('resizable', 'grid', {
              resize: function () {
                  var e,
                      i = t(this).resizable('instance'),
                      s = i.options,
                      n = i.size,
                      o = i.originalSize,
                      a = i.originalPosition,
                      r = i.axis,
                      h = 'number' == typeof s.grid ? [s.grid, s.grid] : s.grid,
                      l = h[0] || 1,
                      c = h[1] || 1,
                      u = Math.round((n.width - o.width) / l) * l,
                      d = Math.round((n.height - o.height) / c) * c,
                      p = o.width + u,
                      f = o.height + d,
                      g = s.maxWidth && p > s.maxWidth,
                      m = s.maxHeight && f > s.maxHeight,
                      _ = s.minWidth && s.minWidth > p,
                      v = s.minHeight && s.minHeight > f;
                  (s.grid = h),
                      _ && (p += l),
                      v && (f += c),
                      g && (p -= l),
                      m && (f -= c),
                      /^(se|s|e)$/.test(r)
                          ? ((i.size.width = p), (i.size.height = f))
                          : /^(ne)$/.test(r)
                          ? ((i.size.width = p),
                            (i.size.height = f),
                            (i.position.top = a.top - d))
                          : /^(sw)$/.test(r)
                          ? ((i.size.width = p),
                            (i.size.height = f),
                            (i.position.left = a.left - u))
                          : ((0 >= f - c || 0 >= p - l) &&
                                (e = i._getPaddingPlusBorderDimensions(this)),
                            f - c > 0
                                ? ((i.size.height = f),
                                  (i.position.top = a.top - d))
                                : ((f = c - e.height),
                                  (i.size.height = f),
                                  (i.position.top = a.top + o.height - f)),
                            p - l > 0
                                ? ((i.size.width = p),
                                  (i.position.left = a.left - u))
                                : ((p = l - e.width),
                                  (i.size.width = p),
                                  (i.position.left = a.left + o.width - p)));
              },
          }),
          t.ui.resizable,
          t.widget('ui.dialog', {
              version: '1.12.1',
              options: {
                  appendTo: 'body',
                  autoOpen: !0,
                  buttons: [],
                  classes: {
                      'ui-dialog': 'ui-corner-all',
                      'ui-dialog-titlebar': 'ui-corner-all',
                  },
                  closeOnEscape: !0,
                  closeText: 'Close',
                  draggable: !0,
                  hide: null,
                  height: 'auto',
                  maxHeight: null,
                  maxWidth: null,
                  minHeight: 150,
                  minWidth: 150,
                  modal: !1,
                  position: {
                      my: 'center',
                      at: 'center',
                      of: window,
                      collision: 'fit',
                      using: function (e) {
                          var i = t(this).css(e).offset().top;
                          0 > i && t(this).css('top', e.top - i);
                      },
                  },
                  resizable: !0,
                  show: null,
                  title: null,
                  width: 300,
                  beforeClose: null,
                  close: null,
                  drag: null,
                  dragStart: null,
                  dragStop: null,
                  focus: null,
                  open: null,
                  resize: null,
                  resizeStart: null,
                  resizeStop: null,
              },
              sizeRelatedOptions: {
                  buttons: !0,
                  height: !0,
                  maxHeight: !0,
                  maxWidth: !0,
                  minHeight: !0,
                  minWidth: !0,
                  width: !0,
              },
              resizableRelatedOptions: {
                  maxHeight: !0,
                  maxWidth: !0,
                  minHeight: !0,
                  minWidth: !0,
              },
              _create: function () {
                  (this.originalCss = {
                      display: this.element[0].style.display,
                      width: this.element[0].style.width,
                      minHeight: this.element[0].style.minHeight,
                      maxHeight: this.element[0].style.maxHeight,
                      height: this.element[0].style.height,
                  }),
                      (this.originalPosition = {
                          parent: this.element.parent(),
                          index: this.element
                              .parent()
                              .children()
                              .index(this.element),
                      }),
                      (this.originalTitle = this.element.attr('title')),
                      null == this.options.title &&
                          null != this.originalTitle &&
                          (this.options.title = this.originalTitle),
                      this.options.disabled && (this.options.disabled = !1),
                      this._createWrapper(),
                      this.element
                          .show()
                          .removeAttr('title')
                          .appendTo(this.uiDialog),
                      this._addClass('ui-dialog-content', 'ui-widget-content'),
                      this._createTitlebar(),
                      this._createButtonPane(),
                      this.options.draggable &&
                          t.fn.draggable &&
                          this._makeDraggable(),
                      this.options.resizable &&
                          t.fn.resizable &&
                          this._makeResizable(),
                      (this._isOpen = !1),
                      this._trackFocus();
              },
              _init: function () {
                  this.options.autoOpen && this.open();
              },
              _appendTo: function () {
                  var e = this.options.appendTo;
                  return e && (e.jquery || e.nodeType)
                      ? t(e)
                      : this.document.find(e || 'body').eq(0);
              },
              _destroy: function () {
                  var t,
                      e = this.originalPosition;
                  this._untrackInstance(),
                      this._destroyOverlay(),
                      this.element
                          .removeUniqueId()
                          .css(this.originalCss)
                          .detach(),
                      this.uiDialog.remove(),
                      this.originalTitle &&
                          this.element.attr('title', this.originalTitle),
                      (t = e.parent.children().eq(e.index)).length &&
                      t[0] !== this.element[0]
                          ? t.before(this.element)
                          : e.parent.append(this.element);
              },
              widget: function () {
                  return this.uiDialog;
              },
              disable: t.noop,
              enable: t.noop,
              close: function (e) {
                  var i = this;
                  this._isOpen &&
                      !1 !== this._trigger('beforeClose', e) &&
                      ((this._isOpen = !1),
                      (this._focusedElement = null),
                      this._destroyOverlay(),
                      this._untrackInstance(),
                      this.opener.filter(':focusable').trigger('focus').length ||
                          t.ui.safeBlur(t.ui.safeActiveElement(this.document[0])),
                      this._hide(this.uiDialog, this.options.hide, function () {
                          i._trigger('close', e);
                      }));
              },
              isOpen: function () {
                  return this._isOpen;
              },
              moveToTop: function () {
                  this._moveToTop();
              },
              _moveToTop: function (e, i) {
                  var s = !1,
                      n = this.uiDialog
                          .siblings('.ui-front:visible')
                          .map(function () {
                              return +t(this).css('z-index');
                          })
                          .get(),
                      o = Math.max.apply(null, n);
                  return (
                      o >= +this.uiDialog.css('z-index') &&
                          (this.uiDialog.css('z-index', o + 1), (s = !0)),
                      s && !i && this._trigger('focus', e),
                      s
                  );
              },
              open: function () {
                  var e = this;
                  return this._isOpen
                      ? void (this._moveToTop() && this._focusTabbable())
                      : ((this._isOpen = !0),
                        (this.opener = t(
                            t.ui.safeActiveElement(this.document[0])
                        )),
                        this._size(),
                        this._position(),
                        this._createOverlay(),
                        this._moveToTop(null, !0),
                        this.overlay &&
                            this.overlay.css(
                                'z-index',
                                this.uiDialog.css('z-index') - 1
                            ),
                        this._show(this.uiDialog, this.options.show, function () {
                            e._focusTabbable(), e._trigger('focus');
                        }),
                        this._makeFocusTarget(),
                        void this._trigger('open'));
              },
              _focusTabbable: function () {
                  var t = this._focusedElement;
                  t || (t = this.element.find('[autofocus]')),
                      t.length || (t = this.element.find(':tabbable')),
                      t.length || (t = this.uiDialogButtonPane.find(':tabbable')),
                      t.length ||
                          (t = this.uiDialogTitlebarClose.filter(':tabbable')),
                      t.length || (t = this.uiDialog),
                      t.eq(0).trigger('focus');
              },
              _keepFocus: function (e) {
                  function i() {
                      var e = t.ui.safeActiveElement(this.document[0]);
                      this.uiDialog[0] === e ||
                          t.contains(this.uiDialog[0], e) ||
                          this._focusTabbable();
                  }
                  e.preventDefault(), i.call(this), this._delay(i);
              },
              _createWrapper: function () {
                  (this.uiDialog = t('<div>')
                      .hide()
                      .attr({ tabIndex: -1, role: 'dialog' })
                      .appendTo(this._appendTo())),
                      this._addClass(
                          this.uiDialog,
                          'ui-dialog',
                          'ui-widget ui-widget-content ui-front'
                      ),
                      this._on(this.uiDialog, {
                          keydown: function (e) {
                              if (
                                  this.options.closeOnEscape &&
                                  !e.isDefaultPrevented() &&
                                  e.keyCode &&
                                  e.keyCode === t.ui.keyCode.ESCAPE
                              )
                                  return e.preventDefault(), void this.close(e);
                              if (
                                  e.keyCode === t.ui.keyCode.TAB &&
                                  !e.isDefaultPrevented()
                              ) {
                                  var i = this.uiDialog.find(':tabbable'),
                                      s = i.filter(':first'),
                                      n = i.filter(':last');
                                  (e.target !== n[0] &&
                                      e.target !== this.uiDialog[0]) ||
                                  e.shiftKey
                                      ? (e.target !== s[0] &&
                                            e.target !== this.uiDialog[0]) ||
                                        !e.shiftKey ||
                                        (this._delay(function () {
                                            n.trigger('focus');
                                        }),
                                        e.preventDefault())
                                      : (this._delay(function () {
                                            s.trigger('focus');
                                        }),
                                        e.preventDefault());
                              }
                          },
                          mousedown: function (t) {
                              this._moveToTop(t) && this._focusTabbable();
                          },
                      }),
                      this.element.find('[aria-describedby]').length ||
                          this.uiDialog.attr({
                              'aria-describedby': this.element
                                  .uniqueId()
                                  .attr('id'),
                          });
              },
              _createTitlebar: function () {
                  var e;
                  (this.uiDialogTitlebar = t('<div>')),
                      this._addClass(
                          this.uiDialogTitlebar,
                          'ui-dialog-titlebar',
                          'ui-widget-header ui-helper-clearfix'
                      ),
                      this._on(this.uiDialogTitlebar, {
                          mousedown: function (e) {
                              t(e.target).closest('.ui-dialog-titlebar-close') ||
                                  this.uiDialog.trigger('focus');
                          },
                      }),
                      (this.uiDialogTitlebarClose = t(
                          "<button type='button'></button>"
                      )
                          .button({
                              label: t('<a>').text(this.options.closeText).html(),
                              icon: 'ui-icon-closethick',
                              showLabel: !1,
                          })
                          .appendTo(this.uiDialogTitlebar)),
                      this._addClass(
                          this.uiDialogTitlebarClose,
                          'ui-dialog-titlebar-close'
                      ),
                      this._on(this.uiDialogTitlebarClose, {
                          click: function (t) {
                              t.preventDefault(), this.close(t);
                          },
                      }),
                      (e = t('<span>')
                          .uniqueId()
                          .prependTo(this.uiDialogTitlebar)),
                      this._addClass(e, 'ui-dialog-title'),
                      this._title(e),
                      this.uiDialogTitlebar.prependTo(this.uiDialog),
                      this.uiDialog.attr({ 'aria-labelledby': e.attr('id') });
              },
              _title: function (t) {
                  this.options.title
                      ? t.text(this.options.title)
                      : t.html('&#160;');
              },
              _createButtonPane: function () {
                  (this.uiDialogButtonPane = t('<div>')),
                      this._addClass(
                          this.uiDialogButtonPane,
                          'ui-dialog-buttonpane',
                          'ui-widget-content ui-helper-clearfix'
                      ),
                      (this.uiButtonSet = t('<div>').appendTo(
                          this.uiDialogButtonPane
                      )),
                      this._addClass(this.uiButtonSet, 'ui-dialog-buttonset'),
                      this._createButtons();
              },
              _createButtons: function () {
                  var e = this,
                      i = this.options.buttons;
                  return (
                      this.uiDialogButtonPane.remove(),
                      this.uiButtonSet.empty(),
                      t.isEmptyObject(i) || (t.isArray(i) && !i.length)
                          ? void this._removeClass(
                                this.uiDialog,
                                'ui-dialog-buttons'
                            )
                          : (t.each(i, function (i, s) {
                                var n, o;
                                (s = t.isFunction(s) ? { click: s, text: i } : s),
                                    (s = t.extend({ type: 'button' }, s)),
                                    (n = s.click),
                                    (o = {
                                        icon: s.icon,
                                        iconPosition: s.iconPosition,
                                        showLabel: s.showLabel,
                                        icons: s.icons,
                                        text: s.text,
                                    }),
                                    delete s.click,
                                    delete s.icon,
                                    delete s.iconPosition,
                                    delete s.showLabel,
                                    delete s.icons,
                                    'boolean' == typeof s.text && delete s.text,
                                    t('<button></button>', s)
                                        .button(o)
                                        .appendTo(e.uiButtonSet)
                                        .on('click', function () {
                                            n.apply(e.element[0], arguments);
                                        });
                            }),
                            this._addClass(this.uiDialog, 'ui-dialog-buttons'),
                            void this.uiDialogButtonPane.appendTo(this.uiDialog))
                  );
              },
              _makeDraggable: function () {
                  function e(t) {
                      return { position: t.position, offset: t.offset };
                  }
                  var i = this,
                      s = this.options;
                  this.uiDialog.draggable({
                      cancel: '.ui-dialog-content, .ui-dialog-titlebar-close',
                      handle: '.ui-dialog-titlebar',
                      containment: 'document',
                      start: function (s, n) {
                          i._addClass(t(this), 'ui-dialog-dragging'),
                              i._blockFrames(),
                              i._trigger('dragStart', s, e(n));
                      },
                      drag: function (t, s) {
                          i._trigger('drag', t, e(s));
                      },
                      stop: function (n, o) {
                          var a = o.offset.left - i.document.scrollLeft(),
                              r = o.offset.top - i.document.scrollTop();
                          (s.position = {
                              my: 'left top',
                              at:
                                  'left' +
                                  (a >= 0 ? '+' : '') +
                                  a +
                                  ' top' +
                                  (r >= 0 ? '+' : '') +
                                  r,
                              of: i.window,
                          }),
                              i._removeClass(t(this), 'ui-dialog-dragging'),
                              i._unblockFrames(),
                              i._trigger('dragStop', n, e(o));
                      },
                  });
              },
              _makeResizable: function () {
                  function e(t) {
                      return {
                          originalPosition: t.originalPosition,
                          originalSize: t.originalSize,
                          position: t.position,
                          size: t.size,
                      };
                  }
                  var i = this,
                      s = this.options,
                      n = s.resizable,
                      o = this.uiDialog.css('position'),
                      a = 'string' == typeof n ? n : 'n,e,s,w,se,sw,ne,nw';
                  this.uiDialog
                      .resizable({
                          cancel: '.ui-dialog-content',
                          containment: 'document',
                          alsoResize: this.element,
                          maxWidth: s.maxWidth,
                          maxHeight: s.maxHeight,
                          minWidth: s.minWidth,
                          minHeight: this._minHeight(),
                          handles: a,
                          start: function (s, n) {
                              i._addClass(t(this), 'ui-dialog-resizing'),
                                  i._blockFrames(),
                                  i._trigger('resizeStart', s, e(n));
                          },
                          resize: function (t, s) {
                              i._trigger('resize', t, e(s));
                          },
                          stop: function (n, o) {
                              var a = i.uiDialog.offset(),
                                  r = a.left - i.document.scrollLeft(),
                                  h = a.top - i.document.scrollTop();
                              (s.height = i.uiDialog.height()),
                                  (s.width = i.uiDialog.width()),
                                  (s.position = {
                                      my: 'left top',
                                      at:
                                          'left' +
                                          (r >= 0 ? '+' : '') +
                                          r +
                                          ' top' +
                                          (h >= 0 ? '+' : '') +
                                          h,
                                      of: i.window,
                                  }),
                                  i._removeClass(t(this), 'ui-dialog-resizing'),
                                  i._unblockFrames(),
                                  i._trigger('resizeStop', n, e(o));
                          },
                      })
                      .css('position', o);
              },
              _trackFocus: function () {
                  this._on(this.widget(), {
                      focusin: function (e) {
                          this._makeFocusTarget(),
                              (this._focusedElement = t(e.target));
                      },
                  });
              },
              _makeFocusTarget: function () {
                  this._untrackInstance(),
                      this._trackingInstances().unshift(this);
              },
              _untrackInstance: function () {
                  var e = this._trackingInstances(),
                      i = t.inArray(this, e);
                  -1 !== i && e.splice(i, 1);
              },
              _trackingInstances: function () {
                  var t = this.document.data('ui-dialog-instances');
                  return (
                      t ||
                          ((t = []),
                          this.document.data('ui-dialog-instances', t)),
                      t
                  );
              },
              _minHeight: function () {
                  var t = this.options;
                  return 'auto' === t.height
                      ? t.minHeight
                      : Math.min(t.minHeight, t.height);
              },
              _position: function () {
                  var t = this.uiDialog.is(':visible');
                  t || this.uiDialog.show(),
                      this.uiDialog.position(this.options.position),
                      t || this.uiDialog.hide();
              },
              _setOptions: function (e) {
                  var i = this,
                      s = !1,
                      n = {};
                  t.each(e, function (t, e) {
                      i._setOption(t, e),
                          t in i.sizeRelatedOptions && (s = !0),
                          t in i.resizableRelatedOptions && (n[t] = e);
                  }),
                      s && (this._size(), this._position()),
                      this.uiDialog.is(':data(ui-resizable)') &&
                          this.uiDialog.resizable('option', n);
              },
              _setOption: function (e, i) {
                  var s,
                      n,
                      o = this.uiDialog;
                  'disabled' !== e &&
                      (this._super(e, i),
                      'appendTo' === e &&
                          this.uiDialog.appendTo(this._appendTo()),
                      'buttons' === e && this._createButtons(),
                      'closeText' === e &&
                          this.uiDialogTitlebarClose.button({
                              label: t('<a>')
                                  .text('' + this.options.closeText)
                                  .html(),
                          }),
                      'draggable' === e &&
                          ((s = o.is(':data(ui-draggable)')) &&
                              !i &&
                              o.draggable('destroy'),
                          !s && i && this._makeDraggable()),
                      'position' === e && this._position(),
                      'resizable' === e &&
                          ((n = o.is(':data(ui-resizable)')) &&
                              !i &&
                              o.resizable('destroy'),
                          n &&
                              'string' == typeof i &&
                              o.resizable('option', 'handles', i),
                          n || !1 === i || this._makeResizable()),
                      'title' === e &&
                          this._title(
                              this.uiDialogTitlebar.find('.ui-dialog-title')
                          ));
              },
              _size: function () {
                  var t,
                      e,
                      i,
                      s = this.options;
                  this.element.show().css({
                      width: 'auto',
                      minHeight: 0,
                      maxHeight: 'none',
                      height: 0,
                  }),
                      s.minWidth > s.width && (s.width = s.minWidth),
                      (t = this.uiDialog
                          .css({ height: 'auto', width: s.width })
                          .outerHeight()),
                      (e = Math.max(0, s.minHeight - t)),
                      (i =
                          'number' == typeof s.maxHeight
                              ? Math.max(0, s.maxHeight - t)
                              : 'none'),
                      'auto' === s.height
                          ? this.element.css({
                                minHeight: e,
                                maxHeight: i,
                                height: 'auto',
                            })
                          : this.element.height(Math.max(0, s.height - t)),
                      this.uiDialog.is(':data(ui-resizable)') &&
                          this.uiDialog.resizable(
                              'option',
                              'minHeight',
                              this._minHeight()
                          );
              },
              _blockFrames: function () {
                  this.iframeBlocks = this.document
                      .find('iframe')
                      .map(function () {
                          var e = t(this);
                          return t('<div>')
                              .css({
                                  position: 'absolute',
                                  width: e.outerWidth(),
                                  height: e.outerHeight(),
                              })
                              .appendTo(e.parent())
                              .offset(e.offset())[0];
                      });
              },
              _unblockFrames: function () {
                  this.iframeBlocks &&
                      (this.iframeBlocks.remove(), delete this.iframeBlocks);
              },
              _allowInteraction: function (e) {
                  return (
                      !!t(e.target).closest('.ui-dialog').length ||
                      !!t(e.target).closest('.ui-datepicker').length
                  );
              },
              _createOverlay: function () {
                  if (this.options.modal) {
                      var e = !0;
                      this._delay(function () {
                          e = !1;
                      }),
                          this.document.data('ui-dialog-overlays') ||
                              this._on(this.document, {
                                  focusin: function (t) {
                                      e ||
                                          this._allowInteraction(t) ||
                                          (t.preventDefault(),
                                          this._trackingInstances()[0]._focusTabbable());
                                  },
                              }),
                          (this.overlay = t('<div>').appendTo(this._appendTo())),
                          this._addClass(
                              this.overlay,
                              null,
                              'ui-widget-overlay ui-front'
                          ),
                          this._on(this.overlay, { mousedown: '_keepFocus' }),
                          this.document.data(
                              'ui-dialog-overlays',
                              (this.document.data('ui-dialog-overlays') || 0) + 1
                          );
                  }
              },
              _destroyOverlay: function () {
                  if (this.options.modal && this.overlay) {
                      var t = this.document.data('ui-dialog-overlays') - 1;
                      t
                          ? this.document.data('ui-dialog-overlays', t)
                          : (this._off(this.document, 'focusin'),
                            this.document.removeData('ui-dialog-overlays')),
                          this.overlay.remove(),
                          (this.overlay = null);
                  }
              },
          }),
          !1 !== t.uiBackCompat &&
              t.widget('ui.dialog', t.ui.dialog, {
                  options: { dialogClass: '' },
                  _createWrapper: function () {
                      this._super(),
                          this.uiDialog.addClass(this.options.dialogClass);
                  },
                  _setOption: function (t, e) {
                      'dialogClass' === t &&
                          this.uiDialog
                              .removeClass(this.options.dialogClass)
                              .addClass(e),
                          this._superApply(arguments);
                  },
              }),
          t.ui.dialog,
          t.widget('ui.droppable', {
              version: '1.12.1',
              widgetEventPrefix: 'drop',
              options: {
                  accept: '*',
                  addClasses: !0,
                  greedy: !1,
                  scope: 'default',
                  tolerance: 'intersect',
                  activate: null,
                  deactivate: null,
                  drop: null,
                  out: null,
                  over: null,
              },
              _create: function () {
                  var e,
                      i = this.options,
                      s = i.accept;
                  (this.isover = !1),
                      (this.isout = !0),
                      (this.accept = t.isFunction(s)
                          ? s
                          : function (t) {
                                return t.is(s);
                            }),
                      (this.proportions = function () {
                          return arguments.length
                              ? void (e = arguments[0])
                              : e ||
                                    (e = {
                                        width: this.element[0].offsetWidth,
                                        height: this.element[0].offsetHeight,
                                    });
                      }),
                      this._addToManager(i.scope),
                      i.addClasses && this._addClass('ui-droppable');
              },
              _addToManager: function (e) {
                  (t.ui.ddmanager.droppables[e] =
                      t.ui.ddmanager.droppables[e] || []),
                      t.ui.ddmanager.droppables[e].push(this);
              },
              _splice: function (t) {
                  for (var e = 0; t.length > e; e++)
                      t[e] === this && t.splice(e, 1);
              },
              _destroy: function () {
                  var e = t.ui.ddmanager.droppables[this.options.scope];
                  this._splice(e);
              },
              _setOption: function (e, i) {
                  if ('accept' === e)
                      this.accept = t.isFunction(i)
                          ? i
                          : function (t) {
                                return t.is(i);
                            };
                  else if ('scope' === e) {
                      var s = t.ui.ddmanager.droppables[this.options.scope];
                      this._splice(s), this._addToManager(i);
                  }
                  this._super(e, i);
              },
              _activate: function (e) {
                  var i = t.ui.ddmanager.current;
                  this._addActiveClass(),
                      i && this._trigger('activate', e, this.ui(i));
              },
              _deactivate: function (e) {
                  var i = t.ui.ddmanager.current;
                  this._removeActiveClass(),
                      i && this._trigger('deactivate', e, this.ui(i));
              },
              _over: function (e) {
                  var i = t.ui.ddmanager.current;
                  i &&
                      (i.currentItem || i.element)[0] !== this.element[0] &&
                      this.accept.call(
                          this.element[0],
                          i.currentItem || i.element
                      ) &&
                      (this._addHoverClass(),
                      this._trigger('over', e, this.ui(i)));
              },
              _out: function (e) {
                  var i = t.ui.ddmanager.current;
                  i &&
                      (i.currentItem || i.element)[0] !== this.element[0] &&
                      this.accept.call(
                          this.element[0],
                          i.currentItem || i.element
                      ) &&
                      (this._removeHoverClass(),
                      this._trigger('out', e, this.ui(i)));
              },
              _drop: function (e, i) {
                  var s = i || t.ui.ddmanager.current,
                      n = !1;
                  return (
                      !(
                          !s ||
                          (s.currentItem || s.element)[0] === this.element[0]
                      ) &&
                      (this.element
                          .find(':data(ui-droppable)')
                          .not('.ui-draggable-dragging')
                          .each(function () {
                              var i = t(this).droppable('instance');
                              return i.options.greedy &&
                                  !i.options.disabled &&
                                  i.options.scope === s.options.scope &&
                                  i.accept.call(
                                      i.element[0],
                                      s.currentItem || s.element
                                  ) &&
                                  g(
                                      s,
                                      t.extend(i, { offset: i.element.offset() }),
                                      i.options.tolerance,
                                      e
                                  )
                                  ? ((n = !0), !1)
                                  : void 0;
                          }),
                      !n &&
                          !!this.accept.call(
                              this.element[0],
                              s.currentItem || s.element
                          ) &&
                          (this._removeActiveClass(),
                          this._removeHoverClass(),
                          this._trigger('drop', e, this.ui(s)),
                          this.element))
                  );
              },
              ui: function (t) {
                  return {
                      draggable: t.currentItem || t.element,
                      helper: t.helper,
                      position: t.position,
                      offset: t.positionAbs,
                  };
              },
              _addHoverClass: function () {
                  this._addClass('ui-droppable-hover');
              },
              _removeHoverClass: function () {
                  this._removeClass('ui-droppable-hover');
              },
              _addActiveClass: function () {
                  this._addClass('ui-droppable-active');
              },
              _removeActiveClass: function () {
                  this._removeClass('ui-droppable-active');
              },
          });
      var g = (t.ui.intersect = (function () {
          function t(t, e, i) {
              return t >= e && e + i > t;
          }
          return function (e, i, s, n) {
              if (!i.offset) return !1;
              var o =
                      (e.positionAbs || e.position.absolute).left +
                      e.margins.left,
                  a = (e.positionAbs || e.position.absolute).top + e.margins.top,
                  r = o + e.helperProportions.width,
                  h = a + e.helperProportions.height,
                  l = i.offset.left,
                  c = i.offset.top,
                  u = l + i.proportions().width,
                  d = c + i.proportions().height;
              switch (s) {
                  case 'fit':
                      return o >= l && u >= r && a >= c && d >= h;
                  case 'intersect':
                      return (
                          o + e.helperProportions.width / 2 > l &&
                          u > r - e.helperProportions.width / 2 &&
                          a + e.helperProportions.height / 2 > c &&
                          d > h - e.helperProportions.height / 2
                      );
                  case 'pointer':
                      return (
                          t(n.pageY, c, i.proportions().height) &&
                          t(n.pageX, l, i.proportions().width)
                      );
                  case 'touch':
                      return (
                          ((a >= c && d >= a) ||
                              (h >= c && d >= h) ||
                              (c > a && h > d)) &&
                          ((o >= l && u >= o) ||
                              (r >= l && u >= r) ||
                              (l > o && r > u))
                      );
                  default:
                      return !1;
              }
          };
      })());
      (t.ui.ddmanager = {
          current: null,
          droppables: { default: [] },
          prepareOffsets: function (e, i) {
              var s,
                  n,
                  o = t.ui.ddmanager.droppables[e.options.scope] || [],
                  a = i ? i.type : null,
                  r = (e.currentItem || e.element)
                      .find(':data(ui-droppable)')
                      .addBack();
              t: for (s = 0; o.length > s; s++)
                  if (
                      !(
                          o[s].options.disabled ||
                          (e &&
                              !o[s].accept.call(
                                  o[s].element[0],
                                  e.currentItem || e.element
                              ))
                      )
                  ) {
                      for (n = 0; r.length > n; n++)
                          if (r[n] === o[s].element[0]) {
                              o[s].proportions().height = 0;
                              continue t;
                          }
                      (o[s].visible = 'none' !== o[s].element.css('display')),
                          o[s].visible &&
                              ('mousedown' === a && o[s]._activate.call(o[s], i),
                              (o[s].offset = o[s].element.offset()),
                              o[s].proportions({
                                  width: o[s].element[0].offsetWidth,
                                  height: o[s].element[0].offsetHeight,
                              }));
                  }
          },
          drop: function (e, i) {
              var s = !1;
              return (
                  t.each(
                      (t.ui.ddmanager.droppables[e.options.scope] || []).slice(),
                      function () {
                          this.options &&
                              (!this.options.disabled &&
                                  this.visible &&
                                  g(e, this, this.options.tolerance, i) &&
                                  (s = this._drop.call(this, i) || s),
                              !this.options.disabled &&
                                  this.visible &&
                                  this.accept.call(
                                      this.element[0],
                                      e.currentItem || e.element
                                  ) &&
                                  ((this.isout = !0),
                                  (this.isover = !1),
                                  this._deactivate.call(this, i)));
                      }
                  ),
                  s
              );
          },
          dragStart: function (e, i) {
              e.element.parentsUntil('body').on('scroll.droppable', function () {
                  e.options.refreshPositions ||
                      t.ui.ddmanager.prepareOffsets(e, i);
              });
          },
          drag: function (e, i) {
              e.options.refreshPositions && t.ui.ddmanager.prepareOffsets(e, i),
                  t.each(
                      t.ui.ddmanager.droppables[e.options.scope] || [],
                      function () {
                          if (
                              !this.options.disabled &&
                              !this.greedyChild &&
                              this.visible
                          ) {
                              var s,
                                  n,
                                  o,
                                  a = g(e, this, this.options.tolerance, i),
                                  r =
                                      !a && this.isover
                                          ? 'isout'
                                          : a && !this.isover
                                          ? 'isover'
                                          : null;
                              r &&
                                  (this.options.greedy &&
                                      ((n = this.options.scope),
                                      (o = this.element
                                          .parents(':data(ui-droppable)')
                                          .filter(function () {
                                              return (
                                                  t(this).droppable('instance')
                                                      .options.scope === n
                                              );
                                          })).length &&
                                          ((s = t(o[0]).droppable(
                                              'instance'
                                          )).greedyChild = 'isover' === r)),
                                  s &&
                                      'isover' === r &&
                                      ((s.isover = !1),
                                      (s.isout = !0),
                                      s._out.call(s, i)),
                                  (this[r] = !0),
                                  (this['isout' === r ? 'isover' : 'isout'] = !1),
                                  this['isover' === r ? '_over' : '_out'].call(
                                      this,
                                      i
                                  ),
                                  s &&
                                      'isout' === r &&
                                      ((s.isout = !1),
                                      (s.isover = !0),
                                      s._over.call(s, i)));
                          }
                      }
                  );
          },
          dragStop: function (e, i) {
              e.element.parentsUntil('body').off('scroll.droppable'),
                  e.options.refreshPositions ||
                      t.ui.ddmanager.prepareOffsets(e, i);
          },
      }),
          !1 !== t.uiBackCompat &&
              t.widget('ui.droppable', t.ui.droppable, {
                  options: { hoverClass: !1, activeClass: !1 },
                  _addActiveClass: function () {
                      this._super(),
                          this.options.activeClass &&
                              this.element.addClass(this.options.activeClass);
                  },
                  _removeActiveClass: function () {
                      this._super(),
                          this.options.activeClass &&
                              this.element.removeClass(this.options.activeClass);
                  },
                  _addHoverClass: function () {
                      this._super(),
                          this.options.hoverClass &&
                              this.element.addClass(this.options.hoverClass);
                  },
                  _removeHoverClass: function () {
                      this._super(),
                          this.options.hoverClass &&
                              this.element.removeClass(this.options.hoverClass);
                  },
              }),
          t.ui.droppable,
          t.widget('ui.progressbar', {
              version: '1.12.1',
              options: {
                  classes: {
                      'ui-progressbar': 'ui-corner-all',
                      'ui-progressbar-value': 'ui-corner-left',
                      'ui-progressbar-complete': 'ui-corner-right',
                  },
                  max: 100,
                  value: 0,
                  change: null,
                  complete: null,
              },
              min: 0,
              _create: function () {
                  (this.oldValue = this.options.value = this._constrainedValue()),
                      this.element.attr({
                          role: 'progressbar',
                          'aria-valuemin': this.min,
                      }),
                      this._addClass(
                          'ui-progressbar',
                          'ui-widget ui-widget-content'
                      ),
                      (this.valueDiv = t('<div>').appendTo(this.element)),
                      this._addClass(
                          this.valueDiv,
                          'ui-progressbar-value',
                          'ui-widget-header'
                      ),
                      this._refreshValue();
              },
              _destroy: function () {
                  this.element.removeAttr(
                      'role aria-valuemin aria-valuemax aria-valuenow'
                  ),
                      this.valueDiv.remove();
              },
              value: function (t) {
                  return void 0 === t
                      ? this.options.value
                      : ((this.options.value = this._constrainedValue(t)),
                        void this._refreshValue());
              },
              _constrainedValue: function (t) {
                  return (
                      void 0 === t && (t = this.options.value),
                      (this.indeterminate = !1 === t),
                      'number' != typeof t && (t = 0),
                      !this.indeterminate &&
                          Math.min(this.options.max, Math.max(this.min, t))
                  );
              },
              _setOptions: function (t) {
                  var e = t.value;
                  delete t.value,
                      this._super(t),
                      (this.options.value = this._constrainedValue(e)),
                      this._refreshValue();
              },
              _setOption: function (t, e) {
                  'max' === t && (e = Math.max(this.min, e)), this._super(t, e);
              },
              _setOptionDisabled: function (t) {
                  this._super(t),
                      this.element.attr('aria-disabled', t),
                      this._toggleClass(null, 'ui-state-disabled', !!t);
              },
              _percentage: function () {
                  return this.indeterminate
                      ? 100
                      : (100 * (this.options.value - this.min)) /
                            (this.options.max - this.min);
              },
              _refreshValue: function () {
                  var e = this.options.value,
                      i = this._percentage();
                  this.valueDiv
                      .toggle(this.indeterminate || e > this.min)
                      .width(i.toFixed(0) + '%'),
                      this._toggleClass(
                          this.valueDiv,
                          'ui-progressbar-complete',
                          null,
                          e === this.options.max
                      )._toggleClass(
                          'ui-progressbar-indeterminate',
                          null,
                          this.indeterminate
                      ),
                      this.indeterminate
                          ? (this.element.removeAttr('aria-valuenow'),
                            this.overlayDiv ||
                                ((this.overlayDiv = t('<div>').appendTo(
                                    this.valueDiv
                                )),
                                this._addClass(
                                    this.overlayDiv,
                                    'ui-progressbar-overlay'
                                )))
                          : (this.element.attr({
                                'aria-valuemax': this.options.max,
                                'aria-valuenow': e,
                            }),
                            this.overlayDiv &&
                                (this.overlayDiv.remove(),
                                (this.overlayDiv = null))),
                      this.oldValue !== e &&
                          ((this.oldValue = e), this._trigger('change')),
                      e === this.options.max && this._trigger('complete');
              },
          }),
          t.widget('ui.selectable', t.ui.mouse, {
              version: '1.12.1',
              options: {
                  appendTo: 'body',
                  autoRefresh: !0,
                  distance: 0,
                  filter: '*',
                  tolerance: 'touch',
                  selected: null,
                  selecting: null,
                  start: null,
                  stop: null,
                  unselected: null,
                  unselecting: null,
              },
              _create: function () {
                  var e = this;
                  this._addClass('ui-selectable'),
                      (this.dragged = !1),
                      (this.refresh = function () {
                          (e.elementPos = t(e.element[0]).offset()),
                              (e.selectees = t(e.options.filter, e.element[0])),
                              e._addClass(e.selectees, 'ui-selectee'),
                              e.selectees.each(function () {
                                  var i = t(this),
                                      s = i.offset(),
                                      n = {
                                          left: s.left - e.elementPos.left,
                                          top: s.top - e.elementPos.top,
                                      };
                                  t.data(this, 'selectable-item', {
                                      element: this,
                                      $element: i,
                                      left: n.left,
                                      top: n.top,
                                      right: n.left + i.outerWidth(),
                                      bottom: n.top + i.outerHeight(),
                                      startselected: !1,
                                      selected: i.hasClass('ui-selected'),
                                      selecting: i.hasClass('ui-selecting'),
                                      unselecting: i.hasClass('ui-unselecting'),
                                  });
                              });
                      }),
                      this.refresh(),
                      this._mouseInit(),
                      (this.helper = t('<div>')),
                      this._addClass(this.helper, 'ui-selectable-helper');
              },
              _destroy: function () {
                  this.selectees.removeData('selectable-item'),
                      this._mouseDestroy();
              },
              _mouseStart: function (e) {
                  var i = this,
                      s = this.options;
                  (this.opos = [e.pageX, e.pageY]),
                      (this.elementPos = t(this.element[0]).offset()),
                      this.options.disabled ||
                          ((this.selectees = t(s.filter, this.element[0])),
                          this._trigger('start', e),
                          t(s.appendTo).append(this.helper),
                          this.helper.css({
                              left: e.pageX,
                              top: e.pageY,
                              width: 0,
                              height: 0,
                          }),
                          s.autoRefresh && this.refresh(),
                          this.selectees.filter('.ui-selected').each(function () {
                              var s = t.data(this, 'selectable-item');
                              (s.startselected = !0),
                                  e.metaKey ||
                                      e.ctrlKey ||
                                      (i._removeClass(s.$element, 'ui-selected'),
                                      (s.selected = !1),
                                      i._addClass(s.$element, 'ui-unselecting'),
                                      (s.unselecting = !0),
                                      i._trigger('unselecting', e, {
                                          unselecting: s.element,
                                      }));
                          }),
                          t(e.target)
                              .parents()
                              .addBack()
                              .each(function () {
                                  var s,
                                      n = t.data(this, 'selectable-item');
                                  return n
                                      ? ((s =
                                            (!e.metaKey && !e.ctrlKey) ||
                                            !n.$element.hasClass('ui-selected')),
                                        i
                                            ._removeClass(
                                                n.$element,
                                                s
                                                    ? 'ui-unselecting'
                                                    : 'ui-selected'
                                            )
                                            ._addClass(
                                                n.$element,
                                                s
                                                    ? 'ui-selecting'
                                                    : 'ui-unselecting'
                                            ),
                                        (n.unselecting = !s),
                                        (n.selecting = s),
                                        (n.selected = s),
                                        s
                                            ? i._trigger('selecting', e, {
                                                  selecting: n.element,
                                              })
                                            : i._trigger('unselecting', e, {
                                                  unselecting: n.element,
                                              }),
                                        !1)
                                      : void 0;
                              }));
              },
              _mouseDrag: function (e) {
                  if (((this.dragged = !0), !this.options.disabled)) {
                      var i,
                          s = this,
                          n = this.options,
                          o = this.opos[0],
                          a = this.opos[1],
                          r = e.pageX,
                          h = e.pageY;
                      return (
                          o > r && ((i = r), (r = o), (o = i)),
                          a > h && ((i = h), (h = a), (a = i)),
                          this.helper.css({
                              left: o,
                              top: a,
                              width: r - o,
                              height: h - a,
                          }),
                          this.selectees.each(function () {
                              var i = t.data(this, 'selectable-item'),
                                  l = !1,
                                  c = {};
                              i &&
                                  i.element !== s.element[0] &&
                                  ((c.left = i.left + s.elementPos.left),
                                  (c.right = i.right + s.elementPos.left),
                                  (c.top = i.top + s.elementPos.top),
                                  (c.bottom = i.bottom + s.elementPos.top),
                                  'touch' === n.tolerance
                                      ? (l = !(
                                            c.left > r ||
                                            o > c.right ||
                                            c.top > h ||
                                            a > c.bottom
                                        ))
                                      : 'fit' === n.tolerance &&
                                        (l =
                                            c.left > o &&
                                            r > c.right &&
                                            c.top > a &&
                                            h > c.bottom),
                                  l
                                      ? (i.selected &&
                                            (s._removeClass(
                                                i.$element,
                                                'ui-selected'
                                            ),
                                            (i.selected = !1)),
                                        i.unselecting &&
                                            (s._removeClass(
                                                i.$element,
                                                'ui-unselecting'
                                            ),
                                            (i.unselecting = !1)),
                                        i.selecting ||
                                            (s._addClass(
                                                i.$element,
                                                'ui-selecting'
                                            ),
                                            (i.selecting = !0),
                                            s._trigger('selecting', e, {
                                                selecting: i.element,
                                            })))
                                      : (i.selecting &&
                                            ((e.metaKey || e.ctrlKey) &&
                                            i.startselected
                                                ? (s._removeClass(
                                                      i.$element,
                                                      'ui-selecting'
                                                  ),
                                                  (i.selecting = !1),
                                                  s._addClass(
                                                      i.$element,
                                                      'ui-selected'
                                                  ),
                                                  (i.selected = !0))
                                                : (s._removeClass(
                                                      i.$element,
                                                      'ui-selecting'
                                                  ),
                                                  (i.selecting = !1),
                                                  i.startselected &&
                                                      (s._addClass(
                                                          i.$element,
                                                          'ui-unselecting'
                                                      ),
                                                      (i.unselecting = !0)),
                                                  s._trigger('unselecting', e, {
                                                      unselecting: i.element,
                                                  }))),
                                        i.selected &&
                                            (e.metaKey ||
                                                e.ctrlKey ||
                                                i.startselected ||
                                                (s._removeClass(
                                                    i.$element,
                                                    'ui-selected'
                                                ),
                                                (i.selected = !1),
                                                s._addClass(
                                                    i.$element,
                                                    'ui-unselecting'
                                                ),
                                                (i.unselecting = !0),
                                                s._trigger('unselecting', e, {
                                                    unselecting: i.element,
                                                })))));
                          }),
                          !1
                      );
                  }
              },
              _mouseStop: function (e) {
                  var i = this;
                  return (
                      (this.dragged = !1),
                      t('.ui-unselecting', this.element[0]).each(function () {
                          var s = t.data(this, 'selectable-item');
                          i._removeClass(s.$element, 'ui-unselecting'),
                              (s.unselecting = !1),
                              (s.startselected = !1),
                              i._trigger('unselected', e, {
                                  unselected: s.element,
                              });
                      }),
                      t('.ui-selecting', this.element[0]).each(function () {
                          var s = t.data(this, 'selectable-item');
                          i
                              ._removeClass(s.$element, 'ui-selecting')
                              ._addClass(s.$element, 'ui-selected'),
                              (s.selecting = !1),
                              (s.selected = !0),
                              (s.startselected = !0),
                              i._trigger('selected', e, { selected: s.element });
                      }),
                      this._trigger('stop', e),
                      this.helper.remove(),
                      !1
                  );
              },
          }),
          t.widget('ui.selectmenu', [
              t.ui.formResetMixin,
              {
                  version: '1.12.1',
                  defaultElement: '<select>',
                  options: {
                      appendTo: null,
                      classes: {
                          'ui-selectmenu-button-open': 'ui-corner-top',
                          'ui-selectmenu-button-closed': 'ui-corner-all',
                      },
                      disabled: null,
                      icons: { button: 'ui-icon-triangle-1-s' },
                      position: {
                          my: 'left top',
                          at: 'left bottom',
                          collision: 'none',
                      },
                      width: !1,
                      change: null,
                      close: null,
                      focus: null,
                      open: null,
                      select: null,
                  },
                  _create: function () {
                      var e = this.element.uniqueId().attr('id');
                      (this.ids = {
                          element: e,
                          button: e + '-button',
                          menu: e + '-menu',
                      }),
                          this._drawButton(),
                          this._drawMenu(),
                          this._bindFormResetHandler(),
                          (this._rendered = !1),
                          (this.menuItems = t());
                  },
                  _drawButton: function () {
                      var e,
                          i = this,
                          s = this._parseOption(
                              this.element.find('option:selected'),
                              this.element[0].selectedIndex
                          );
                      (this.labels = this.element
                          .labels()
                          .attr('for', this.ids.button)),
                          this._on(this.labels, {
                              click: function (t) {
                                  this.button.focus(), t.preventDefault();
                              },
                          }),
                          this.element.hide(),
                          (this.button = t('<span>', {
                              tabindex: this.options.disabled ? -1 : 0,
                              id: this.ids.button,
                              role: 'combobox',
                              'aria-expanded': 'false',
                              'aria-autocomplete': 'list',
                              'aria-owns': this.ids.menu,
                              'aria-haspopup': 'true',
                              title: this.element.attr('title'),
                          }).insertAfter(this.element)),
                          this._addClass(
                              this.button,
                              'ui-selectmenu-button ui-selectmenu-button-closed',
                              'ui-button ui-widget'
                          ),
                          (e = t('<span>').appendTo(this.button)),
                          this._addClass(
                              e,
                              'ui-selectmenu-icon',
                              'ui-icon ' + this.options.icons.button
                          ),
                          (this.buttonItem = this._renderButtonItem(s).appendTo(
                              this.button
                          )),
                          !1 !== this.options.width && this._resizeButton(),
                          this._on(this.button, this._buttonEvents),
                          this.button.one('focusin', function () {
                              i._rendered || i._refreshMenu();
                          });
                  },
                  _drawMenu: function () {
                      var e = this;
                      (this.menu = t('<ul>', {
                          'aria-hidden': 'true',
                          'aria-labelledby': this.ids.button,
                          id: this.ids.menu,
                      })),
                          (this.menuWrap = t('<div>').append(this.menu)),
                          this._addClass(
                              this.menuWrap,
                              'ui-selectmenu-menu',
                              'ui-front'
                          ),
                          this.menuWrap.appendTo(this._appendTo()),
                          (this.menuInstance = this.menu
                              .menu({
                                  classes: { 'ui-menu': 'ui-corner-bottom' },
                                  role: 'listbox',
                                  select: function (t, i) {
                                      t.preventDefault(),
                                          e._setSelection(),
                                          e._select(
                                              i.item.data('ui-selectmenu-item'),
                                              t
                                          );
                                  },
                                  focus: function (t, i) {
                                      var s = i.item.data('ui-selectmenu-item');
                                      null != e.focusIndex &&
                                          s.index !== e.focusIndex &&
                                          (e._trigger('focus', t, { item: s }),
                                          e.isOpen || e._select(s, t)),
                                          (e.focusIndex = s.index),
                                          e.button.attr(
                                              'aria-activedescendant',
                                              e.menuItems.eq(s.index).attr('id')
                                          );
                                  },
                              })
                              .menu('instance')),
                          this.menuInstance._off(this.menu, 'mouseleave'),
                          (this.menuInstance._closeOnDocumentClick = function () {
                              return !1;
                          }),
                          (this.menuInstance._isDivider = function () {
                              return !1;
                          });
                  },
                  refresh: function () {
                      this._refreshMenu(),
                          this.buttonItem.replaceWith(
                              (this.buttonItem = this._renderButtonItem(
                                  this._getSelectedItem().data(
                                      'ui-selectmenu-item'
                                  ) || {}
                              ))
                          ),
                          null === this.options.width && this._resizeButton();
                  },
                  _refreshMenu: function () {
                      var t,
                          e = this.element.find('option');
                      this.menu.empty(),
                          this._parseOptions(e),
                          this._renderMenu(this.menu, this.items),
                          this.menuInstance.refresh(),
                          (this.menuItems = this.menu
                              .find('li')
                              .not('.ui-selectmenu-optgroup')
                              .find('.ui-menu-item-wrapper')),
                          (this._rendered = !0),
                          e.length &&
                              ((t = this._getSelectedItem()),
                              this.menuInstance.focus(null, t),
                              this._setAria(t.data('ui-selectmenu-item')),
                              this._setOption(
                                  'disabled',
                                  this.element.prop('disabled')
                              ));
                  },
                  open: function (t) {
                      this.options.disabled ||
                          (this._rendered
                              ? (this._removeClass(
                                    this.menu.find('.ui-state-active'),
                                    null,
                                    'ui-state-active'
                                ),
                                this.menuInstance.focus(
                                    null,
                                    this._getSelectedItem()
                                ))
                              : this._refreshMenu(),
                          this.menuItems.length &&
                              ((this.isOpen = !0),
                              this._toggleAttr(),
                              this._resizeMenu(),
                              this._position(),
                              this._on(this.document, this._documentClick),
                              this._trigger('open', t)));
                  },
                  _position: function () {
                      this.menuWrap.position(
                          t.extend({ of: this.button }, this.options.position)
                      );
                  },
                  close: function (t) {
                      this.isOpen &&
                          ((this.isOpen = !1),
                          this._toggleAttr(),
                          (this.range = null),
                          this._off(this.document),
                          this._trigger('close', t));
                  },
                  widget: function () {
                      return this.button;
                  },
                  menuWidget: function () {
                      return this.menu;
                  },
                  _renderButtonItem: function (e) {
                      var i = t('<span>');
                      return (
                          this._setText(i, e.label),
                          this._addClass(i, 'ui-selectmenu-text'),
                          i
                      );
                  },
                  _renderMenu: function (e, i) {
                      var s = this,
                          n = '';
                      t.each(i, function (i, o) {
                          var a;
                          o.optgroup !== n &&
                              ((a = t('<li>', { text: o.optgroup })),
                              s._addClass(
                                  a,
                                  'ui-selectmenu-optgroup',
                                  'ui-menu-divider' +
                                      (o.element
                                          .parent('optgroup')
                                          .prop('disabled')
                                          ? ' ui-state-disabled'
                                          : '')
                              ),
                              a.appendTo(e),
                              (n = o.optgroup)),
                              s._renderItemData(e, o);
                      });
                  },
                  _renderItemData: function (t, e) {
                      return this._renderItem(t, e).data('ui-selectmenu-item', e);
                  },
                  _renderItem: function (e, i) {
                      var s = t('<li>'),
                          n = t('<div>', { title: i.element.attr('title') });
                      return (
                          i.disabled &&
                              this._addClass(s, null, 'ui-state-disabled'),
                          this._setText(n, i.label),
                          s.append(n).appendTo(e)
                      );
                  },
                  _setText: function (t, e) {
                      e ? t.text(e) : t.html('&#160;');
                  },
                  _move: function (t, e) {
                      var i,
                          s,
                          n = '.ui-menu-item';
                      this.isOpen
                          ? (i = this.menuItems.eq(this.focusIndex).parent('li'))
                          : ((i = this.menuItems
                                .eq(this.element[0].selectedIndex)
                                .parent('li')),
                            (n += ':not(.ui-state-disabled)')),
                          (s =
                              'first' === t || 'last' === t
                                  ? i['first' === t ? 'prevAll' : 'nextAll'](
                                        n
                                    ).eq(-1)
                                  : i[t + 'All'](n).eq(0)).length &&
                              this.menuInstance.focus(e, s);
                  },
                  _getSelectedItem: function () {
                      return this.menuItems
                          .eq(this.element[0].selectedIndex)
                          .parent('li');
                  },
                  _toggle: function (t) {
                      this[this.isOpen ? 'close' : 'open'](t);
                  },
                  _setSelection: function () {
                      var t;
                      this.range &&
                          (window.getSelection
                              ? ((t = window.getSelection()).removeAllRanges(),
                                t.addRange(this.range))
                              : this.range.select(),
                          this.button.focus());
                  },
                  _documentClick: {
                      mousedown: function (e) {
                          this.isOpen &&
                              (t(e.target).closest(
                                  '.ui-selectmenu-menu, #' +
                                      t.ui.escapeSelector(this.ids.button)
                              ).length ||
                                  this.close(e));
                      },
                  },
                  _buttonEvents: {
                      mousedown: function () {
                          var t;
                          window.getSelection
                              ? (t = window.getSelection()).rangeCount &&
                                (this.range = t.getRangeAt(0))
                              : (this.range = document.selection.createRange());
                      },
                      click: function (t) {
                          this._setSelection(), this._toggle(t);
                      },
                      keydown: function (e) {
                          var i = !0;
                          switch (e.keyCode) {
                              case t.ui.keyCode.TAB:
                              case t.ui.keyCode.ESCAPE:
                                  this.close(e), (i = !1);
                                  break;
                              case t.ui.keyCode.ENTER:
                                  this.isOpen && this._selectFocusedItem(e);
                                  break;
                              case t.ui.keyCode.UP:
                                  e.altKey
                                      ? this._toggle(e)
                                      : this._move('prev', e);
                                  break;
                              case t.ui.keyCode.DOWN:
                                  e.altKey
                                      ? this._toggle(e)
                                      : this._move('next', e);
                                  break;
                              case t.ui.keyCode.SPACE:
                                  this.isOpen
                                      ? this._selectFocusedItem(e)
                                      : this._toggle(e);
                                  break;
                              case t.ui.keyCode.LEFT:
                                  this._move('prev', e);
                                  break;
                              case t.ui.keyCode.RIGHT:
                                  this._move('next', e);
                                  break;
                              case t.ui.keyCode.HOME:
                              case t.ui.keyCode.PAGE_UP:
                                  this._move('first', e);
                                  break;
                              case t.ui.keyCode.END:
                              case t.ui.keyCode.PAGE_DOWN:
                                  this._move('last', e);
                                  break;
                              default:
                                  this.menu.trigger(e), (i = !1);
                          }
                          i && e.preventDefault();
                      },
                  },
                  _selectFocusedItem: function (t) {
                      var e = this.menuItems.eq(this.focusIndex).parent('li');
                      e.hasClass('ui-state-disabled') ||
                          this._select(e.data('ui-selectmenu-item'), t);
                  },
                  _select: function (t, e) {
                      var i = this.element[0].selectedIndex;
                      (this.element[0].selectedIndex = t.index),
                          this.buttonItem.replaceWith(
                              (this.buttonItem = this._renderButtonItem(t))
                          ),
                          this._setAria(t),
                          this._trigger('select', e, { item: t }),
                          t.index !== i &&
                              this._trigger('change', e, { item: t }),
                          this.close(e);
                  },
                  _setAria: function (t) {
                      var e = this.menuItems.eq(t.index).attr('id');
                      this.button.attr({
                          'aria-labelledby': e,
                          'aria-activedescendant': e,
                      }),
                          this.menu.attr('aria-activedescendant', e);
                  },
                  _setOption: function (t, e) {
                      if ('icons' === t) {
                          var i = this.button.find('span.ui-icon');
                          this._removeClass(
                              i,
                              null,
                              this.options.icons.button
                          )._addClass(i, null, e.button);
                      }
                      this._super(t, e),
                          'appendTo' === t &&
                              this.menuWrap.appendTo(this._appendTo()),
                          'width' === t && this._resizeButton();
                  },
                  _setOptionDisabled: function (t) {
                      this._super(t),
                          this.menuInstance.option('disabled', t),
                          this.button.attr('aria-disabled', t),
                          this._toggleClass(
                              this.button,
                              null,
                              'ui-state-disabled',
                              t
                          ),
                          this.element.prop('disabled', t),
                          t
                              ? (this.button.attr('tabindex', -1), this.close())
                              : this.button.attr('tabindex', 0);
                  },
                  _appendTo: function () {
                      var e = this.options.appendTo;
                      return (
                          e &&
                              (e =
                                  e.jquery || e.nodeType
                                      ? t(e)
                                      : this.document.find(e).eq(0)),
                          (e && e[0]) ||
                              (e = this.element.closest('.ui-front, dialog')),
                          e.length || (e = this.document[0].body),
                          e
                      );
                  },
                  _toggleAttr: function () {
                      this.button.attr('aria-expanded', this.isOpen),
                          this._removeClass(
                              this.button,
                              'ui-selectmenu-button-' +
                                  (this.isOpen ? 'closed' : 'open')
                          )
                              ._addClass(
                                  this.button,
                                  'ui-selectmenu-button-' +
                                      (this.isOpen ? 'open' : 'closed')
                              )
                              ._toggleClass(
                                  this.menuWrap,
                                  'ui-selectmenu-open',
                                  null,
                                  this.isOpen
                              ),
                          this.menu.attr('aria-hidden', !this.isOpen);
                  },
                  _resizeButton: function () {
                      var t = this.options.width;
                      return !1 === t
                          ? void this.button.css('width', '')
                          : (null === t &&
                                ((t = this.element.show().outerWidth()),
                                this.element.hide()),
                            void this.button.outerWidth(t));
                  },
                  _resizeMenu: function () {
                      this.menu.outerWidth(
                          Math.max(
                              this.button.outerWidth(),
                              this.menu.width('').outerWidth() + 1
                          )
                      );
                  },
                  _getCreateOptions: function () {
                      var t = this._super();
                      return (t.disabled = this.element.prop('disabled')), t;
                  },
                  _parseOptions: function (e) {
                      var i = this,
                          s = [];
                      e.each(function (e, n) {
                          s.push(i._parseOption(t(n), e));
                      }),
                          (this.items = s);
                  },
                  _parseOption: function (t, e) {
                      var i = t.parent('optgroup');
                      return {
                          element: t,
                          index: e,
                          value: t.val(),
                          label: t.text(),
                          optgroup: i.attr('label') || '',
                          disabled: i.prop('disabled') || t.prop('disabled'),
                      };
                  },
                  _destroy: function () {
                      this._unbindFormResetHandler(),
                          this.menuWrap.remove(),
                          this.button.remove(),
                          this.element.show(),
                          this.element.removeUniqueId(),
                          this.labels.attr('for', this.ids.element);
                  },
              },
          ]),
          t.widget('ui.slider', t.ui.mouse, {
              version: '1.12.1',
              widgetEventPrefix: 'slide',
              options: {
                  animate: !1,
                  classes: {
                      'ui-slider': 'ui-corner-all',
                      'ui-slider-handle': 'ui-corner-all',
                      'ui-slider-range': 'ui-corner-all ui-widget-header',
                  },
                  distance: 0,
                  max: 100,
                  min: 0,
                  orientation: 'horizontal',
                  range: !1,
                  step: 1,
                  value: 0,
                  values: null,
                  change: null,
                  slide: null,
                  start: null,
                  stop: null,
              },
              numPages: 5,
              _create: function () {
                  (this._keySliding = !1),
                      (this._mouseSliding = !1),
                      (this._animateOff = !0),
                      (this._handleIndex = null),
                      this._detectOrientation(),
                      this._mouseInit(),
                      this._calculateNewMax(),
                      this._addClass(
                          'ui-slider ui-slider-' + this.orientation,
                          'ui-widget ui-widget-content'
                      ),
                      this._refresh(),
                      (this._animateOff = !1);
              },
              _refresh: function () {
                  this._createRange(),
                      this._createHandles(),
                      this._setupEvents(),
                      this._refreshValue();
              },
              _createHandles: function () {
                  var e,
                      i,
                      s = this.options,
                      n = this.element.find('.ui-slider-handle'),
                      o = [];
                  for (
                      i = (s.values && s.values.length) || 1,
                          n.length > i &&
                              (n.slice(i).remove(), (n = n.slice(0, i))),
                          e = n.length;
                      i > e;
                      e++
                  )
                      o.push("<span tabindex='0'></span>");
                  (this.handles = n.add(t(o.join('')).appendTo(this.element))),
                      this._addClass(
                          this.handles,
                          'ui-slider-handle',
                          'ui-state-default'
                      ),
                      (this.handle = this.handles.eq(0)),
                      this.handles.each(function (e) {
                          t(this)
                              .data('ui-slider-handle-index', e)
                              .attr('tabIndex', 0);
                      });
              },
              _createRange: function () {
                  var e = this.options;
                  e.range
                      ? (!0 === e.range &&
                            (e.values
                                ? e.values.length && 2 !== e.values.length
                                    ? (e.values = [e.values[0], e.values[0]])
                                    : t.isArray(e.values) &&
                                      (e.values = e.values.slice(0))
                                : (e.values = [
                                      this._valueMin(),
                                      this._valueMin(),
                                  ])),
                        this.range && this.range.length
                            ? (this._removeClass(
                                  this.range,
                                  'ui-slider-range-min ui-slider-range-max'
                              ),
                              this.range.css({ left: '', bottom: '' }))
                            : ((this.range = t('<div>').appendTo(this.element)),
                              this._addClass(this.range, 'ui-slider-range')),
                        ('min' === e.range || 'max' === e.range) &&
                            this._addClass(
                                this.range,
                                'ui-slider-range-' + e.range
                            ))
                      : (this.range && this.range.remove(), (this.range = null));
              },
              _setupEvents: function () {
                  this._off(this.handles),
                      this._on(this.handles, this._handleEvents),
                      this._hoverable(this.handles),
                      this._focusable(this.handles);
              },
              _destroy: function () {
                  this.handles.remove(),
                      this.range && this.range.remove(),
                      this._mouseDestroy();
              },
              _mouseCapture: function (e) {
                  var i,
                      s,
                      n,
                      o,
                      a,
                      r,
                      h,
                      l = this,
                      c = this.options;
                  return (
                      !c.disabled &&
                      ((this.elementSize = {
                          width: this.element.outerWidth(),
                          height: this.element.outerHeight(),
                      }),
                      (this.elementOffset = this.element.offset()),
                      (i = { x: e.pageX, y: e.pageY }),
                      (s = this._normValueFromMouse(i)),
                      (n = this._valueMax() - this._valueMin() + 1),
                      this.handles.each(function (e) {
                          var i = Math.abs(s - l.values(e));
                          (n > i ||
                              (n === i &&
                                  (e === l._lastChangedValue ||
                                      l.values(e) === c.min))) &&
                              ((n = i), (o = t(this)), (a = e));
                      }),
                      !1 !== this._start(e, a) &&
                          ((this._mouseSliding = !0),
                          (this._handleIndex = a),
                          this._addClass(o, null, 'ui-state-active'),
                          o.trigger('focus'),
                          (r = o.offset()),
                          (h = !t(e.target)
                              .parents()
                              .addBack()
                              .is('.ui-slider-handle')),
                          (this._clickOffset = h
                              ? { left: 0, top: 0 }
                              : {
                                    left: e.pageX - r.left - o.width() / 2,
                                    top:
                                        e.pageY -
                                        r.top -
                                        o.height() / 2 -
                                        (parseInt(o.css('borderTopWidth'), 10) ||
                                            0) -
                                        (parseInt(
                                            o.css('borderBottomWidth'),
                                            10
                                        ) || 0) +
                                        (parseInt(o.css('marginTop'), 10) || 0),
                                }),
                          this.handles.hasClass('ui-state-hover') ||
                              this._slide(e, a, s),
                          (this._animateOff = !0),
                          !0))
                  );
              },
              _mouseStart: function () {
                  return !0;
              },
              _mouseDrag: function (t) {
                  var e = { x: t.pageX, y: t.pageY },
                      i = this._normValueFromMouse(e);
                  return this._slide(t, this._handleIndex, i), !1;
              },
              _mouseStop: function (t) {
                  return (
                      this._removeClass(this.handles, null, 'ui-state-active'),
                      (this._mouseSliding = !1),
                      this._stop(t, this._handleIndex),
                      this._change(t, this._handleIndex),
                      (this._handleIndex = null),
                      (this._clickOffset = null),
                      (this._animateOff = !1),
                      !1
                  );
              },
              _detectOrientation: function () {
                  this.orientation =
                      'vertical' === this.options.orientation
                          ? 'vertical'
                          : 'horizontal';
              },
              _normValueFromMouse: function (t) {
                  var e, i, s, n, o;
                  return (
                      'horizontal' === this.orientation
                          ? ((e = this.elementSize.width),
                            (i =
                                t.x -
                                this.elementOffset.left -
                                (this._clickOffset ? this._clickOffset.left : 0)))
                          : ((e = this.elementSize.height),
                            (i =
                                t.y -
                                this.elementOffset.top -
                                (this._clickOffset ? this._clickOffset.top : 0))),
                      (s = i / e) > 1 && (s = 1),
                      0 > s && (s = 0),
                      'vertical' === this.orientation && (s = 1 - s),
                      (n = this._valueMax() - this._valueMin()),
                      (o = this._valueMin() + s * n),
                      this._trimAlignValue(o)
                  );
              },
              _uiHash: function (t, e, i) {
                  var s = {
                      handle: this.handles[t],
                      handleIndex: t,
                      value: void 0 !== e ? e : this.value(),
                  };
                  return (
                      this._hasMultipleValues() &&
                          ((s.value = void 0 !== e ? e : this.values(t)),
                          (s.values = i || this.values())),
                      s
                  );
              },
              _hasMultipleValues: function () {
                  return this.options.values && this.options.values.length;
              },
              _start: function (t, e) {
                  return this._trigger('start', t, this._uiHash(e));
              },
              _slide: function (t, e, i) {
                  var s,
                      n = this.value(),
                      o = this.values();
                  this._hasMultipleValues() &&
                      ((s = this.values(e ? 0 : 1)),
                      (n = this.values(e)),
                      2 === this.options.values.length &&
                          !0 === this.options.range &&
                          (i = 0 === e ? Math.min(s, i) : Math.max(s, i)),
                      (o[e] = i)),
                      i !== n &&
                          !1 !==
                              this._trigger('slide', t, this._uiHash(e, i, o)) &&
                          (this._hasMultipleValues()
                              ? this.values(e, i)
                              : this.value(i));
              },
              _stop: function (t, e) {
                  this._trigger('stop', t, this._uiHash(e));
              },
              _change: function (t, e) {
                  this._keySliding ||
                      this._mouseSliding ||
                      ((this._lastChangedValue = e),
                      this._trigger('change', t, this._uiHash(e)));
              },
              value: function (t) {
                  return arguments.length
                      ? ((this.options.value = this._trimAlignValue(t)),
                        this._refreshValue(),
                        void this._change(null, 0))
                      : this._value();
              },
              values: function (e, i) {
                  var s, n, o;
                  if (arguments.length > 1)
                      return (
                          (this.options.values[e] = this._trimAlignValue(i)),
                          this._refreshValue(),
                          void this._change(null, e)
                      );
                  if (!arguments.length) return this._values();
                  if (!t.isArray(arguments[0]))
                      return this._hasMultipleValues()
                          ? this._values(e)
                          : this.value();
                  for (
                      s = this.options.values, n = arguments[0], o = 0;
                      s.length > o;
                      o += 1
                  )
                      (s[o] = this._trimAlignValue(n[o])), this._change(null, o);
                  this._refreshValue();
              },
              _setOption: function (e, i) {
                  var s,
                      n = 0;
                  switch (
                      ('range' === e &&
                          !0 === this.options.range &&
                          ('min' === i
                              ? ((this.options.value = this._values(0)),
                                (this.options.values = null))
                              : 'max' === i &&
                                ((this.options.value = this._values(
                                    this.options.values.length - 1
                                )),
                                (this.options.values = null))),
                      t.isArray(this.options.values) &&
                          (n = this.options.values.length),
                      this._super(e, i),
                      e)
                  ) {
                      case 'orientation':
                          this._detectOrientation(),
                              this._removeClass(
                                  'ui-slider-horizontal ui-slider-vertical'
                              )._addClass('ui-slider-' + this.orientation),
                              this._refreshValue(),
                              this.options.range && this._refreshRange(i),
                              this.handles.css(
                                  'horizontal' === i ? 'bottom' : 'left',
                                  ''
                              );
                          break;
                      case 'value':
                          (this._animateOff = !0),
                              this._refreshValue(),
                              this._change(null, 0),
                              (this._animateOff = !1);
                          break;
                      case 'values':
                          for (
                              this._animateOff = !0,
                                  this._refreshValue(),
                                  s = n - 1;
                              s >= 0;
                              s--
                          )
                              this._change(null, s);
                          this._animateOff = !1;
                          break;
                      case 'step':
                      case 'min':
                      case 'max':
                          (this._animateOff = !0),
                              this._calculateNewMax(),
                              this._refreshValue(),
                              (this._animateOff = !1);
                          break;
                      case 'range':
                          (this._animateOff = !0),
                              this._refresh(),
                              (this._animateOff = !1);
                  }
              },
              _setOptionDisabled: function (t) {
                  this._super(t),
                      this._toggleClass(null, 'ui-state-disabled', !!t);
              },
              _value: function () {
                  var t = this.options.value;
                  return (t = this._trimAlignValue(t));
              },
              _values: function (t) {
                  var e, i, s;
                  if (arguments.length)
                      return (
                          (e = this.options.values[t]),
                          (e = this._trimAlignValue(e))
                      );
                  if (this._hasMultipleValues()) {
                      for (
                          i = this.options.values.slice(), s = 0;
                          i.length > s;
                          s += 1
                      )
                          i[s] = this._trimAlignValue(i[s]);
                      return i;
                  }
                  return [];
              },
              _trimAlignValue: function (t) {
                  if (this._valueMin() >= t) return this._valueMin();
                  if (t >= this._valueMax()) return this._valueMax();
                  var e = this.options.step > 0 ? this.options.step : 1,
                      i = (t - this._valueMin()) % e,
                      s = t - i;
                  return (
                      2 * Math.abs(i) >= e && (s += i > 0 ? e : -e),
                      parseFloat(s.toFixed(5))
                  );
              },
              _calculateNewMax: function () {
                  var t = this.options.max,
                      e = this._valueMin(),
                      i = this.options.step;
                  (t = Math.round((t - e) / i) * i + e) > this.options.max &&
                      (t -= i),
                      (this.max = parseFloat(t.toFixed(this._precision())));
              },
              _precision: function () {
                  var t = this._precisionOf(this.options.step);
                  return (
                      null !== this.options.min &&
                          (t = Math.max(t, this._precisionOf(this.options.min))),
                      t
                  );
              },
              _precisionOf: function (t) {
                  var e = '' + t,
                      i = e.indexOf('.');
                  return -1 === i ? 0 : e.length - i - 1;
              },
              _valueMin: function () {
                  return this.options.min;
              },
              _valueMax: function () {
                  return this.max;
              },
              _refreshRange: function (t) {
                  'vertical' === t && this.range.css({ width: '', left: '' }),
                      'horizontal' === t &&
                          this.range.css({ height: '', bottom: '' });
              },
              _refreshValue: function () {
                  var e,
                      i,
                      s,
                      n,
                      o,
                      a = this.options.range,
                      r = this.options,
                      h = this,
                      l = !this._animateOff && r.animate,
                      c = {};
                  this._hasMultipleValues()
                      ? this.handles.each(function (s) {
                            (i =
                                ((h.values(s) - h._valueMin()) /
                                    (h._valueMax() - h._valueMin())) *
                                100),
                                (c[
                                    'horizontal' === h.orientation
                                        ? 'left'
                                        : 'bottom'
                                ] = i + '%'),
                                t(this)
                                    .stop(1, 1)
                                    [l ? 'animate' : 'css'](c, r.animate),
                                !0 === h.options.range &&
                                    ('horizontal' === h.orientation
                                        ? (0 === s &&
                                              h.range
                                                  .stop(1, 1)
                                                  [l ? 'animate' : 'css'](
                                                      { left: i + '%' },
                                                      r.animate
                                                  ),
                                          1 === s &&
                                              h.range[l ? 'animate' : 'css'](
                                                  { width: i - e + '%' },
                                                  {
                                                      queue: !1,
                                                      duration: r.animate,
                                                  }
                                              ))
                                        : (0 === s &&
                                              h.range
                                                  .stop(1, 1)
                                                  [l ? 'animate' : 'css'](
                                                      { bottom: i + '%' },
                                                      r.animate
                                                  ),
                                          1 === s &&
                                              h.range[l ? 'animate' : 'css'](
                                                  { height: i - e + '%' },
                                                  {
                                                      queue: !1,
                                                      duration: r.animate,
                                                  }
                                              ))),
                                (e = i);
                        })
                      : ((s = this.value()),
                        (n = this._valueMin()),
                        (o = this._valueMax()),
                        (i = o !== n ? ((s - n) / (o - n)) * 100 : 0),
                        (c[
                            'horizontal' === this.orientation ? 'left' : 'bottom'
                        ] = i + '%'),
                        this.handle
                            .stop(1, 1)
                            [l ? 'animate' : 'css'](c, r.animate),
                        'min' === a &&
                            'horizontal' === this.orientation &&
                            this.range
                                .stop(1, 1)
                                [l ? 'animate' : 'css'](
                                    { width: i + '%' },
                                    r.animate
                                ),
                        'max' === a &&
                            'horizontal' === this.orientation &&
                            this.range
                                .stop(1, 1)
                                [l ? 'animate' : 'css'](
                                    { width: 100 - i + '%' },
                                    r.animate
                                ),
                        'min' === a &&
                            'vertical' === this.orientation &&
                            this.range
                                .stop(1, 1)
                                [l ? 'animate' : 'css'](
                                    { height: i + '%' },
                                    r.animate
                                ),
                        'max' === a &&
                            'vertical' === this.orientation &&
                            this.range
                                .stop(1, 1)
                                [l ? 'animate' : 'css'](
                                    { height: 100 - i + '%' },
                                    r.animate
                                ));
              },
              _handleEvents: {
                  keydown: function (e) {
                      var i,
                          s,
                          n,
                          o = t(e.target).data('ui-slider-handle-index');
                      switch (e.keyCode) {
                          case t.ui.keyCode.HOME:
                          case t.ui.keyCode.END:
                          case t.ui.keyCode.PAGE_UP:
                          case t.ui.keyCode.PAGE_DOWN:
                          case t.ui.keyCode.UP:
                          case t.ui.keyCode.RIGHT:
                          case t.ui.keyCode.DOWN:
                          case t.ui.keyCode.LEFT:
                              if (
                                  (e.preventDefault(),
                                  !this._keySliding &&
                                      ((this._keySliding = !0),
                                      this._addClass(
                                          t(e.target),
                                          null,
                                          'ui-state-active'
                                      ),
                                      !1 === this._start(e, o)))
                              )
                                  return;
                      }
                      switch (
                          ((n = this.options.step),
                          (i = s = this._hasMultipleValues()
                              ? this.values(o)
                              : this.value()),
                          e.keyCode)
                      ) {
                          case t.ui.keyCode.HOME:
                              s = this._valueMin();
                              break;
                          case t.ui.keyCode.END:
                              s = this._valueMax();
                              break;
                          case t.ui.keyCode.PAGE_UP:
                              s = this._trimAlignValue(
                                  i +
                                      (this._valueMax() - this._valueMin()) /
                                          this.numPages
                              );
                              break;
                          case t.ui.keyCode.PAGE_DOWN:
                              s = this._trimAlignValue(
                                  i -
                                      (this._valueMax() - this._valueMin()) /
                                          this.numPages
                              );
                              break;
                          case t.ui.keyCode.UP:
                          case t.ui.keyCode.RIGHT:
                              if (i === this._valueMax()) return;
                              s = this._trimAlignValue(i + n);
                              break;
                          case t.ui.keyCode.DOWN:
                          case t.ui.keyCode.LEFT:
                              if (i === this._valueMin()) return;
                              s = this._trimAlignValue(i - n);
                      }
                      this._slide(e, o, s);
                  },
                  keyup: function (e) {
                      var i = t(e.target).data('ui-slider-handle-index');
                      this._keySliding &&
                          ((this._keySliding = !1),
                          this._stop(e, i),
                          this._change(e, i),
                          this._removeClass(
                              t(e.target),
                              null,
                              'ui-state-active'
                          ));
                  },
              },
          }),
          t.widget('ui.sortable', t.ui.mouse, {
              version: '1.12.1',
              widgetEventPrefix: 'sort',
              ready: !1,
              options: {
                  appendTo: 'parent',
                  axis: !1,
                  connectWith: !1,
                  containment: !1,
                  cursor: 'auto',
                  cursorAt: !1,
                  dropOnEmpty: !0,
                  forcePlaceholderSize: !1,
                  forceHelperSize: !1,
                  grid: !1,
                  handle: !1,
                  helper: 'original',
                  items: '> *',
                  opacity: !1,
                  placeholder: !1,
                  revert: !1,
                  scroll: !0,
                  scrollSensitivity: 20,
                  scrollSpeed: 20,
                  scope: 'default',
                  tolerance: 'intersect',
                  zIndex: 1e3,
                  activate: null,
                  beforeStop: null,
                  change: null,
                  deactivate: null,
                  out: null,
                  over: null,
                  receive: null,
                  remove: null,
                  sort: null,
                  start: null,
                  stop: null,
                  update: null,
              },
              _isOverAxis: function (t, e, i) {
                  return t >= e && e + i > t;
              },
              _isFloating: function (t) {
                  return (
                      /left|right/.test(t.css('float')) ||
                      /inline|table-cell/.test(t.css('display'))
                  );
              },
              _create: function () {
                  (this.containerCache = {}),
                      this._addClass('ui-sortable'),
                      this.refresh(),
                      (this.offset = this.element.offset()),
                      this._mouseInit(),
                      this._setHandleClassName(),
                      (this.ready = !0);
              },
              _setOption: function (t, e) {
                  this._super(t, e), 'handle' === t && this._setHandleClassName();
              },
              _setHandleClassName: function () {
                  var e = this;
                  this._removeClass(
                      this.element.find('.ui-sortable-handle'),
                      'ui-sortable-handle'
                  ),
                      t.each(this.items, function () {
                          e._addClass(
                              this.instance.options.handle
                                  ? this.item.find(this.instance.options.handle)
                                  : this.item,
                              'ui-sortable-handle'
                          );
                      });
              },
              _destroy: function () {
                  this._mouseDestroy();
                  for (var t = this.items.length - 1; t >= 0; t--)
                      this.items[t].item.removeData(this.widgetName + '-item');
                  return this;
              },
              _mouseCapture: function (e, i) {
                  var s = null,
                      n = !1,
                      o = this;
                  return (
                      !this.reverting &&
                      !this.options.disabled &&
                      'static' !== this.options.type &&
                      (this._refreshItems(e),
                      t(e.target)
                          .parents()
                          .each(function () {
                              return t.data(this, o.widgetName + '-item') === o
                                  ? ((s = t(this)), !1)
                                  : void 0;
                          }),
                      t.data(e.target, o.widgetName + '-item') === o &&
                          (s = t(e.target)),
                      !!s &&
                          !(
                              this.options.handle &&
                              !i &&
                              (t(this.options.handle, s)
                                  .find('*')
                                  .addBack()
                                  .each(function () {
                                      this === e.target && (n = !0);
                                  }),
                              !n)
                          ) &&
                          ((this.currentItem = s),
                          this._removeCurrentsFromItems(),
                          !0))
                  );
              },
              _mouseStart: function (e, i, s) {
                  var n,
                      o,
                      a = this.options;
                  if (
                      ((this.currentContainer = this),
                      this.refreshPositions(),
                      (this.helper = this._createHelper(e)),
                      this._cacheHelperProportions(),
                      this._cacheMargins(),
                      (this.scrollParent = this.helper.scrollParent()),
                      (this.offset = this.currentItem.offset()),
                      (this.offset = {
                          top: this.offset.top - this.margins.top,
                          left: this.offset.left - this.margins.left,
                      }),
                      t.extend(this.offset, {
                          click: {
                              left: e.pageX - this.offset.left,
                              top: e.pageY - this.offset.top,
                          },
                          parent: this._getParentOffset(),
                          relative: this._getRelativeOffset(),
                      }),
                      this.helper.css('position', 'absolute'),
                      (this.cssPosition = this.helper.css('position')),
                      (this.originalPosition = this._generatePosition(e)),
                      (this.originalPageX = e.pageX),
                      (this.originalPageY = e.pageY),
                      a.cursorAt && this._adjustOffsetFromHelper(a.cursorAt),
                      (this.domPosition = {
                          prev: this.currentItem.prev()[0],
                          parent: this.currentItem.parent()[0],
                      }),
                      this.helper[0] !== this.currentItem[0] &&
                          this.currentItem.hide(),
                      this._createPlaceholder(),
                      a.containment && this._setContainment(),
                      a.cursor &&
                          'auto' !== a.cursor &&
                          ((o = this.document.find('body')),
                          (this.storedCursor = o.css('cursor')),
                          o.css('cursor', a.cursor),
                          (this.storedStylesheet = t(
                              '<style>*{ cursor: ' +
                                  a.cursor +
                                  ' !important; }</style>'
                          ).appendTo(o))),
                      a.opacity &&
                          (this.helper.css('opacity') &&
                              (this._storedOpacity = this.helper.css('opacity')),
                          this.helper.css('opacity', a.opacity)),
                      a.zIndex &&
                          (this.helper.css('zIndex') &&
                              (this._storedZIndex = this.helper.css('zIndex')),
                          this.helper.css('zIndex', a.zIndex)),
                      this.scrollParent[0] !== this.document[0] &&
                          'HTML' !== this.scrollParent[0].tagName &&
                          (this.overflowOffset = this.scrollParent.offset()),
                      this._trigger('start', e, this._uiHash()),
                      this._preserveHelperProportions ||
                          this._cacheHelperProportions(),
                      !s)
                  )
                      for (n = this.containers.length - 1; n >= 0; n--)
                          this.containers[n]._trigger(
                              'activate',
                              e,
                              this._uiHash(this)
                          );
                  return (
                      t.ui.ddmanager && (t.ui.ddmanager.current = this),
                      t.ui.ddmanager &&
                          !a.dropBehaviour &&
                          t.ui.ddmanager.prepareOffsets(this, e),
                      (this.dragging = !0),
                      this._addClass(this.helper, 'ui-sortable-helper'),
                      this._mouseDrag(e),
                      !0
                  );
              },
              _mouseDrag: function (e) {
                  var i,
                      s,
                      n,
                      o,
                      a = this.options,
                      r = !1;
                  for (
                      this.position = this._generatePosition(e),
                          this.positionAbs = this._convertPositionTo('absolute'),
                          this.lastPositionAbs ||
                              (this.lastPositionAbs = this.positionAbs),
                          this.options.scroll &&
                              (this.scrollParent[0] !== this.document[0] &&
                              'HTML' !== this.scrollParent[0].tagName
                                  ? (this.overflowOffset.top +
                                        this.scrollParent[0].offsetHeight -
                                        e.pageY <
                                    a.scrollSensitivity
                                        ? (this.scrollParent[0].scrollTop = r =
                                              this.scrollParent[0].scrollTop +
                                              a.scrollSpeed)
                                        : e.pageY - this.overflowOffset.top <
                                              a.scrollSensitivity &&
                                          (this.scrollParent[0].scrollTop = r =
                                              this.scrollParent[0].scrollTop -
                                              a.scrollSpeed),
                                    this.overflowOffset.left +
                                        this.scrollParent[0].offsetWidth -
                                        e.pageX <
                                    a.scrollSensitivity
                                        ? (this.scrollParent[0].scrollLeft = r =
                                              this.scrollParent[0].scrollLeft +
                                              a.scrollSpeed)
                                        : e.pageX - this.overflowOffset.left <
                                              a.scrollSensitivity &&
                                          (this.scrollParent[0].scrollLeft = r =
                                              this.scrollParent[0].scrollLeft -
                                              a.scrollSpeed))
                                  : (e.pageY - this.document.scrollTop() <
                                    a.scrollSensitivity
                                        ? (r = this.document.scrollTop(
                                              this.document.scrollTop() -
                                                  a.scrollSpeed
                                          ))
                                        : this.window.height() -
                                              (e.pageY -
                                                  this.document.scrollTop()) <
                                              a.scrollSensitivity &&
                                          (r = this.document.scrollTop(
                                              this.document.scrollTop() +
                                                  a.scrollSpeed
                                          )),
                                    e.pageX - this.document.scrollLeft() <
                                    a.scrollSensitivity
                                        ? (r = this.document.scrollLeft(
                                              this.document.scrollLeft() -
                                                  a.scrollSpeed
                                          ))
                                        : this.window.width() -
                                              (e.pageX -
                                                  this.document.scrollLeft()) <
                                              a.scrollSensitivity &&
                                          (r = this.document.scrollLeft(
                                              this.document.scrollLeft() +
                                                  a.scrollSpeed
                                          ))),
                              !1 !== r &&
                                  t.ui.ddmanager &&
                                  !a.dropBehaviour &&
                                  t.ui.ddmanager.prepareOffsets(this, e)),
                          this.positionAbs = this._convertPositionTo('absolute'),
                          (this.options.axis && 'y' === this.options.axis) ||
                              (this.helper[0].style.left =
                                  this.position.left + 'px'),
                          (this.options.axis && 'x' === this.options.axis) ||
                              (this.helper[0].style.top =
                                  this.position.top + 'px'),
                          i = this.items.length - 1;
                      i >= 0;
                      i--
                  )
                      if (
                          ((n = (s = this.items[i]).item[0]),
                          (o = this._intersectsWithPointer(s)) &&
                              s.instance === this.currentContainer &&
                              n !== this.currentItem[0] &&
                              this.placeholder[1 === o ? 'next' : 'prev']()[0] !==
                                  n &&
                              !t.contains(this.placeholder[0], n) &&
                              ('semi-dynamic' !== this.options.type ||
                                  !t.contains(this.element[0], n)))
                      ) {
                          if (
                              ((this.direction = 1 === o ? 'down' : 'up'),
                              'pointer' !== this.options.tolerance &&
                                  !this._intersectsWithSides(s))
                          )
                              break;
                          this._rearrange(e, s),
                              this._trigger('change', e, this._uiHash());
                          break;
                      }
                  return (
                      this._contactContainers(e),
                      t.ui.ddmanager && t.ui.ddmanager.drag(this, e),
                      this._trigger('sort', e, this._uiHash()),
                      (this.lastPositionAbs = this.positionAbs),
                      !1
                  );
              },
              _mouseStop: function (e, i) {
                  if (e) {
                      if (
                          (t.ui.ddmanager &&
                              !this.options.dropBehaviour &&
                              t.ui.ddmanager.drop(this, e),
                          this.options.revert)
                      ) {
                          var s = this,
                              n = this.placeholder.offset(),
                              o = this.options.axis,
                              a = {};
                          (o && 'x' !== o) ||
                              (a.left =
                                  n.left -
                                  this.offset.parent.left -
                                  this.margins.left +
                                  (this.offsetParent[0] === this.document[0].body
                                      ? 0
                                      : this.offsetParent[0].scrollLeft)),
                              (o && 'y' !== o) ||
                                  (a.top =
                                      n.top -
                                      this.offset.parent.top -
                                      this.margins.top +
                                      (this.offsetParent[0] ===
                                      this.document[0].body
                                          ? 0
                                          : this.offsetParent[0].scrollTop)),
                              (this.reverting = !0),
                              t(this.helper).animate(
                                  a,
                                  parseInt(this.options.revert, 10) || 500,
                                  function () {
                                      s._clear(e);
                                  }
                              );
                      } else this._clear(e, i);
                      return !1;
                  }
              },
              cancel: function () {
                  if (this.dragging) {
                      this._mouseUp(new t.Event('mouseup', { target: null })),
                          'original' === this.options.helper
                              ? (this.currentItem.css(this._storedCSS),
                                this._removeClass(
                                    this.currentItem,
                                    'ui-sortable-helper'
                                ))
                              : this.currentItem.show();
                      for (var e = this.containers.length - 1; e >= 0; e--)
                          this.containers[e]._trigger(
                              'deactivate',
                              null,
                              this._uiHash(this)
                          ),
                              this.containers[e].containerCache.over &&
                                  (this.containers[e]._trigger(
                                      'out',
                                      null,
                                      this._uiHash(this)
                                  ),
                                  (this.containers[e].containerCache.over = 0));
                  }
                  return (
                      this.placeholder &&
                          (this.placeholder[0].parentNode &&
                              this.placeholder[0].parentNode.removeChild(
                                  this.placeholder[0]
                              ),
                          'original' !== this.options.helper &&
                              this.helper &&
                              this.helper[0].parentNode &&
                              this.helper.remove(),
                          t.extend(this, {
                              helper: null,
                              dragging: !1,
                              reverting: !1,
                              _noFinalSort: null,
                          }),
                          this.domPosition.prev
                              ? t(this.domPosition.prev).after(this.currentItem)
                              : t(this.domPosition.parent).prepend(
                                    this.currentItem
                                )),
                      this
                  );
              },
              serialize: function (e) {
                  var i = this._getItemsAsjQuery(e && e.connected),
                      s = [];
                  return (
                      (e = e || {}),
                      t(i).each(function () {
                          var i = (
                              t(e.item || this).attr(e.attribute || 'id') || ''
                          ).match(e.expression || /(.+)[\-=_](.+)/);
                          i &&
                              s.push(
                                  (e.key || i[1] + '[]') +
                                      '=' +
                                      (e.key && e.expression ? i[1] : i[2])
                              );
                      }),
                      !s.length && e.key && s.push(e.key + '='),
                      s.join('&')
                  );
              },
              toArray: function (e) {
                  var i = this._getItemsAsjQuery(e && e.connected),
                      s = [];
                  return (
                      (e = e || {}),
                      i.each(function () {
                          s.push(
                              t(e.item || this).attr(e.attribute || 'id') || ''
                          );
                      }),
                      s
                  );
              },
              _intersectsWith: function (t) {
                  var e = this.positionAbs.left,
                      i = e + this.helperProportions.width,
                      s = this.positionAbs.top,
                      n = s + this.helperProportions.height,
                      o = t.left,
                      a = o + t.width,
                      r = t.top,
                      h = r + t.height,
                      l = this.offset.click.top,
                      c = this.offset.click.left,
                      u = 'x' === this.options.axis || (s + l > r && h > s + l),
                      d = 'y' === this.options.axis || (e + c > o && a > e + c),
                      p = u && d;
                  return 'pointer' === this.options.tolerance ||
                      this.options.forcePointerForContainers ||
                      ('pointer' !== this.options.tolerance &&
                          this.helperProportions[
                              this.floating ? 'width' : 'height'
                          ] > t[this.floating ? 'width' : 'height'])
                      ? p
                      : e + this.helperProportions.width / 2 > o &&
                            a > i - this.helperProportions.width / 2 &&
                            s + this.helperProportions.height / 2 > r &&
                            h > n - this.helperProportions.height / 2;
              },
              _intersectsWithPointer: function (t) {
                  var e,
                      i,
                      s =
                          'x' === this.options.axis ||
                          this._isOverAxis(
                              this.positionAbs.top + this.offset.click.top,
                              t.top,
                              t.height
                          ),
                      n =
                          'y' === this.options.axis ||
                          this._isOverAxis(
                              this.positionAbs.left + this.offset.click.left,
                              t.left,
                              t.width
                          );
                  return (
                      !!(s && n) &&
                      ((e = this._getDragVerticalDirection()),
                      (i = this._getDragHorizontalDirection()),
                      this.floating
                          ? 'right' === i || 'down' === e
                              ? 2
                              : 1
                          : e && ('down' === e ? 2 : 1))
                  );
              },
              _intersectsWithSides: function (t) {
                  var e = this._isOverAxis(
                          this.positionAbs.top + this.offset.click.top,
                          t.top + t.height / 2,
                          t.height
                      ),
                      i = this._isOverAxis(
                          this.positionAbs.left + this.offset.click.left,
                          t.left + t.width / 2,
                          t.width
                      ),
                      s = this._getDragVerticalDirection(),
                      n = this._getDragHorizontalDirection();
                  return this.floating && n
                      ? ('right' === n && i) || ('left' === n && !i)
                      : s && (('down' === s && e) || ('up' === s && !e));
              },
              _getDragVerticalDirection: function () {
                  var t = this.positionAbs.top - this.lastPositionAbs.top;
                  return 0 !== t && (t > 0 ? 'down' : 'up');
              },
              _getDragHorizontalDirection: function () {
                  var t = this.positionAbs.left - this.lastPositionAbs.left;
                  return 0 !== t && (t > 0 ? 'right' : 'left');
              },
              refresh: function (t) {
                  return (
                      this._refreshItems(t),
                      this._setHandleClassName(),
                      this.refreshPositions(),
                      this
                  );
              },
              _connectWith: function () {
                  var t = this.options;
                  return t.connectWith.constructor === String
                      ? [t.connectWith]
                      : t.connectWith;
              },
              _getItemsAsjQuery: function (e) {
                  function i() {
                      r.push(this);
                  }
                  var s,
                      n,
                      o,
                      a,
                      r = [],
                      h = [],
                      l = this._connectWith();
                  if (l && e)
                      for (s = l.length - 1; s >= 0; s--)
                          for (
                              n = (o = t(l[s], this.document[0])).length - 1;
                              n >= 0;
                              n--
                          )
                              (a = t.data(o[n], this.widgetFullName)) &&
                                  a !== this &&
                                  !a.options.disabled &&
                                  h.push([
                                      t.isFunction(a.options.items)
                                          ? a.options.items.call(a.element)
                                          : t(a.options.items, a.element)
                                                .not('.ui-sortable-helper')
                                                .not('.ui-sortable-placeholder'),
                                      a,
                                  ]);
                  for (
                      h.push([
                          t.isFunction(this.options.items)
                              ? this.options.items.call(this.element, null, {
                                    options: this.options,
                                    item: this.currentItem,
                                })
                              : t(this.options.items, this.element)
                                    .not('.ui-sortable-helper')
                                    .not('.ui-sortable-placeholder'),
                          this,
                      ]),
                          s = h.length - 1;
                      s >= 0;
                      s--
                  )
                      h[s][0].each(i);
                  return t(r);
              },
              _removeCurrentsFromItems: function () {
                  var e = this.currentItem.find(
                      ':data(' + this.widgetName + '-item)'
                  );
                  this.items = t.grep(this.items, function (t) {
                      for (var i = 0; e.length > i; i++)
                          if (e[i] === t.item[0]) return !1;
                      return !0;
                  });
              },
              _refreshItems: function (e) {
                  (this.items = []), (this.containers = [this]);
                  var i,
                      s,
                      n,
                      o,
                      a,
                      r,
                      h,
                      l,
                      c = this.items,
                      u = [
                          [
                              t.isFunction(this.options.items)
                                  ? this.options.items.call(this.element[0], e, {
                                        item: this.currentItem,
                                    })
                                  : t(this.options.items, this.element),
                              this,
                          ],
                      ],
                      d = this._connectWith();
                  if (d && this.ready)
                      for (i = d.length - 1; i >= 0; i--)
                          for (
                              s = (n = t(d[i], this.document[0])).length - 1;
                              s >= 0;
                              s--
                          )
                              (o = t.data(n[s], this.widgetFullName)) &&
                                  o !== this &&
                                  !o.options.disabled &&
                                  (u.push([
                                      t.isFunction(o.options.items)
                                          ? o.options.items.call(
                                                o.element[0],
                                                e,
                                                { item: this.currentItem }
                                            )
                                          : t(o.options.items, o.element),
                                      o,
                                  ]),
                                  this.containers.push(o));
                  for (i = u.length - 1; i >= 0; i--)
                      for (
                          a = u[i][1], s = 0, l = (r = u[i][0]).length;
                          l > s;
                          s++
                      )
                          (h = t(r[s])).data(this.widgetName + '-item', a),
                              c.push({
                                  item: h,
                                  instance: a,
                                  width: 0,
                                  height: 0,
                                  left: 0,
                                  top: 0,
                              });
              },
              refreshPositions: function (e) {
                  var i, s, n, o;
                  for (
                      this.floating =
                          !!this.items.length &&
                          ('x' === this.options.axis ||
                              this._isFloating(this.items[0].item)),
                          this.offsetParent &&
                              this.helper &&
                              (this.offset.parent = this._getParentOffset()),
                          i = this.items.length - 1;
                      i >= 0;
                      i--
                  )
                      ((s = this.items[i]).instance !== this.currentContainer &&
                          this.currentContainer &&
                          s.item[0] !== this.currentItem[0]) ||
                          ((n = this.options.toleranceElement
                              ? t(this.options.toleranceElement, s.item)
                              : s.item),
                          e ||
                              ((s.width = n.outerWidth()),
                              (s.height = n.outerHeight())),
                          (o = n.offset()),
                          (s.left = o.left),
                          (s.top = o.top));
                  if (
                      this.options.custom &&
                      this.options.custom.refreshContainers
                  )
                      this.options.custom.refreshContainers.call(this);
                  else
                      for (i = this.containers.length - 1; i >= 0; i--)
                          (o = this.containers[i].element.offset()),
                              (this.containers[i].containerCache.left = o.left),
                              (this.containers[i].containerCache.top = o.top),
                              (this.containers[
                                  i
                              ].containerCache.width = this.containers[
                                  i
                              ].element.outerWidth()),
                              (this.containers[
                                  i
                              ].containerCache.height = this.containers[
                                  i
                              ].element.outerHeight());
                  return this;
              },
              _createPlaceholder: function (e) {
                  var i,
                      s = (e = e || this).options;
                  (s.placeholder && s.placeholder.constructor !== String) ||
                      ((i = s.placeholder),
                      (s.placeholder = {
                          element: function () {
                              var s = e.currentItem[0].nodeName.toLowerCase(),
                                  n = t('<' + s + '>', e.document[0]);
                              return (
                                  e
                                      ._addClass(
                                          n,
                                          'ui-sortable-placeholder',
                                          i || e.currentItem[0].className
                                      )
                                      ._removeClass(n, 'ui-sortable-helper'),
                                  'tbody' === s
                                      ? e._createTrPlaceholder(
                                            e.currentItem.find('tr').eq(0),
                                            t('<tr>', e.document[0]).appendTo(n)
                                        )
                                      : 'tr' === s
                                      ? e._createTrPlaceholder(e.currentItem, n)
                                      : 'img' === s &&
                                        n.attr('src', e.currentItem.attr('src')),
                                  i || n.css('visibility', 'hidden'),
                                  n
                              );
                          },
                          update: function (t, n) {
                              (!i || s.forcePlaceholderSize) &&
                                  (n.height() ||
                                      n.height(
                                          e.currentItem.innerHeight() -
                                              parseInt(
                                                  e.currentItem.css(
                                                      'paddingTop'
                                                  ) || 0,
                                                  10
                                              ) -
                                              parseInt(
                                                  e.currentItem.css(
                                                      'paddingBottom'
                                                  ) || 0,
                                                  10
                                              )
                                      ),
                                  n.width() ||
                                      n.width(
                                          e.currentItem.innerWidth() -
                                              parseInt(
                                                  e.currentItem.css(
                                                      'paddingLeft'
                                                  ) || 0,
                                                  10
                                              ) -
                                              parseInt(
                                                  e.currentItem.css(
                                                      'paddingRight'
                                                  ) || 0,
                                                  10
                                              )
                                      ));
                          },
                      })),
                      (e.placeholder = t(
                          s.placeholder.element.call(e.element, e.currentItem)
                      )),
                      e.currentItem.after(e.placeholder),
                      s.placeholder.update(e, e.placeholder);
              },
              _createTrPlaceholder: function (e, i) {
                  var s = this;
                  e.children().each(function () {
                      t('<td>&#160;</td>', s.document[0])
                          .attr('colspan', t(this).attr('colspan') || 1)
                          .appendTo(i);
                  });
              },
              _contactContainers: function (e) {
                  var i,
                      s,
                      n,
                      o,
                      a,
                      r,
                      h,
                      l,
                      c,
                      u,
                      d = null,
                      p = null;
                  for (i = this.containers.length - 1; i >= 0; i--)
                      if (
                          !t.contains(
                              this.currentItem[0],
                              this.containers[i].element[0]
                          )
                      )
                          if (
                              this._intersectsWith(
                                  this.containers[i].containerCache
                              )
                          ) {
                              if (
                                  d &&
                                  t.contains(
                                      this.containers[i].element[0],
                                      d.element[0]
                                  )
                              )
                                  continue;
                              (d = this.containers[i]), (p = i);
                          } else
                              this.containers[i].containerCache.over &&
                                  (this.containers[i]._trigger(
                                      'out',
                                      e,
                                      this._uiHash(this)
                                  ),
                                  (this.containers[i].containerCache.over = 0));
                  if (d)
                      if (1 === this.containers.length)
                          this.containers[p].containerCache.over ||
                              (this.containers[p]._trigger(
                                  'over',
                                  e,
                                  this._uiHash(this)
                              ),
                              (this.containers[p].containerCache.over = 1));
                      else {
                          for (
                              n = 1e4,
                                  o = null,
                                  a = (c =
                                      d.floating ||
                                      this._isFloating(this.currentItem))
                                      ? 'left'
                                      : 'top',
                                  r = c ? 'width' : 'height',
                                  u = c ? 'pageX' : 'pageY',
                                  s = this.items.length - 1;
                              s >= 0;
                              s--
                          )
                              t.contains(
                                  this.containers[p].element[0],
                                  this.items[s].item[0]
                              ) &&
                                  this.items[s].item[0] !== this.currentItem[0] &&
                                  ((h = this.items[s].item.offset()[a]),
                                  (l = !1),
                                  e[u] - h > this.items[s][r] / 2 && (l = !0),
                                  n > Math.abs(e[u] - h) &&
                                      ((n = Math.abs(e[u] - h)),
                                      (o = this.items[s]),
                                      (this.direction = l ? 'up' : 'down')));
                          if (!o && !this.options.dropOnEmpty) return;
                          if (this.currentContainer === this.containers[p])
                              return void (
                                  this.currentContainer.containerCache.over ||
                                  (this.containers[p]._trigger(
                                      'over',
                                      e,
                                      this._uiHash()
                                  ),
                                  (this.currentContainer.containerCache.over = 1))
                              );
                          o
                              ? this._rearrange(e, o, null, !0)
                              : this._rearrange(
                                    e,
                                    null,
                                    this.containers[p].element,
                                    !0
                                ),
                              this._trigger('change', e, this._uiHash()),
                              this.containers[p]._trigger(
                                  'change',
                                  e,
                                  this._uiHash(this)
                              ),
                              (this.currentContainer = this.containers[p]),
                              this.options.placeholder.update(
                                  this.currentContainer,
                                  this.placeholder
                              ),
                              this.containers[p]._trigger(
                                  'over',
                                  e,
                                  this._uiHash(this)
                              ),
                              (this.containers[p].containerCache.over = 1);
                      }
              },
              _createHelper: function (e) {
                  var i = this.options,
                      s = t.isFunction(i.helper)
                          ? t(
                                i.helper.apply(this.element[0], [
                                    e,
                                    this.currentItem,
                                ])
                            )
                          : 'clone' === i.helper
                          ? this.currentItem.clone()
                          : this.currentItem;
                  return (
                      s.parents('body').length ||
                          t(
                              'parent' !== i.appendTo
                                  ? i.appendTo
                                  : this.currentItem[0].parentNode
                          )[0].appendChild(s[0]),
                      s[0] === this.currentItem[0] &&
                          (this._storedCSS = {
                              width: this.currentItem[0].style.width,
                              height: this.currentItem[0].style.height,
                              position: this.currentItem.css('position'),
                              top: this.currentItem.css('top'),
                              left: this.currentItem.css('left'),
                          }),
                      (!s[0].style.width || i.forceHelperSize) &&
                          s.width(this.currentItem.width()),
                      (!s[0].style.height || i.forceHelperSize) &&
                          s.height(this.currentItem.height()),
                      s
                  );
              },
              _adjustOffsetFromHelper: function (e) {
                  'string' == typeof e && (e = e.split(' ')),
                      t.isArray(e) && (e = { left: +e[0], top: +e[1] || 0 }),
                      'left' in e &&
                          (this.offset.click.left = e.left + this.margins.left),
                      'right' in e &&
                          (this.offset.click.left =
                              this.helperProportions.width -
                              e.right +
                              this.margins.left),
                      'top' in e &&
                          (this.offset.click.top = e.top + this.margins.top),
                      'bottom' in e &&
                          (this.offset.click.top =
                              this.helperProportions.height -
                              e.bottom +
                              this.margins.top);
              },
              _getParentOffset: function () {
                  this.offsetParent = this.helper.offsetParent();
                  var e = this.offsetParent.offset();
                  return (
                      'absolute' === this.cssPosition &&
                          this.scrollParent[0] !== this.document[0] &&
                          t.contains(
                              this.scrollParent[0],
                              this.offsetParent[0]
                          ) &&
                          ((e.left += this.scrollParent.scrollLeft()),
                          (e.top += this.scrollParent.scrollTop())),
                      (this.offsetParent[0] === this.document[0].body ||
                          (this.offsetParent[0].tagName &&
                              'html' ===
                                  this.offsetParent[0].tagName.toLowerCase() &&
                              t.ui.ie)) &&
                          (e = { top: 0, left: 0 }),
                      {
                          top:
                              e.top +
                              (parseInt(
                                  this.offsetParent.css('borderTopWidth'),
                                  10
                              ) || 0),
                          left:
                              e.left +
                              (parseInt(
                                  this.offsetParent.css('borderLeftWidth'),
                                  10
                              ) || 0),
                      }
                  );
              },
              _getRelativeOffset: function () {
                  if ('relative' === this.cssPosition) {
                      var t = this.currentItem.position();
                      return {
                          top:
                              t.top -
                              (parseInt(this.helper.css('top'), 10) || 0) +
                              this.scrollParent.scrollTop(),
                          left:
                              t.left -
                              (parseInt(this.helper.css('left'), 10) || 0) +
                              this.scrollParent.scrollLeft(),
                      };
                  }
                  return { top: 0, left: 0 };
              },
              _cacheMargins: function () {
                  this.margins = {
                      left: parseInt(this.currentItem.css('marginLeft'), 10) || 0,
                      top: parseInt(this.currentItem.css('marginTop'), 10) || 0,
                  };
              },
              _cacheHelperProportions: function () {
                  this.helperProportions = {
                      width: this.helper.outerWidth(),
                      height: this.helper.outerHeight(),
                  };
              },
              _setContainment: function () {
                  var e,
                      i,
                      s,
                      n = this.options;
                  'parent' === n.containment &&
                      (n.containment = this.helper[0].parentNode),
                      ('document' === n.containment ||
                          'window' === n.containment) &&
                          (this.containment = [
                              0 -
                                  this.offset.relative.left -
                                  this.offset.parent.left,
                              0 -
                                  this.offset.relative.top -
                                  this.offset.parent.top,
                              'document' === n.containment
                                  ? this.document.width()
                                  : this.window.width() -
                                    this.helperProportions.width -
                                    this.margins.left,
                              ('document' === n.containment
                                  ? this.document.height() ||
                                    document.body.parentNode.scrollHeight
                                  : this.window.height() ||
                                    this.document[0].body.parentNode
                                        .scrollHeight) -
                                  this.helperProportions.height -
                                  this.margins.top,
                          ]),
                      /^(document|window|parent)$/.test(n.containment) ||
                          ((e = t(n.containment)[0]),
                          (i = t(n.containment).offset()),
                          (s = 'hidden' !== t(e).css('overflow')),
                          (this.containment = [
                              i.left +
                                  (parseInt(t(e).css('borderLeftWidth'), 10) ||
                                      0) +
                                  (parseInt(t(e).css('paddingLeft'), 10) || 0) -
                                  this.margins.left,
                              i.top +
                                  (parseInt(t(e).css('borderTopWidth'), 10) ||
                                      0) +
                                  (parseInt(t(e).css('paddingTop'), 10) || 0) -
                                  this.margins.top,
                              i.left +
                                  (s
                                      ? Math.max(e.scrollWidth, e.offsetWidth)
                                      : e.offsetWidth) -
                                  (parseInt(t(e).css('borderLeftWidth'), 10) ||
                                      0) -
                                  (parseInt(t(e).css('paddingRight'), 10) || 0) -
                                  this.helperProportions.width -
                                  this.margins.left,
                              i.top +
                                  (s
                                      ? Math.max(e.scrollHeight, e.offsetHeight)
                                      : e.offsetHeight) -
                                  (parseInt(t(e).css('borderTopWidth'), 10) ||
                                      0) -
                                  (parseInt(t(e).css('paddingBottom'), 10) || 0) -
                                  this.helperProportions.height -
                                  this.margins.top,
                          ]));
              },
              _convertPositionTo: function (e, i) {
                  i || (i = this.position);
                  var s = 'absolute' === e ? 1 : -1,
                      n =
                          'absolute' !== this.cssPosition ||
                          (this.scrollParent[0] !== this.document[0] &&
                              t.contains(
                                  this.scrollParent[0],
                                  this.offsetParent[0]
                              ))
                              ? this.scrollParent
                              : this.offsetParent,
                      o = /(html|body)/i.test(n[0].tagName);
                  return {
                      top:
                          i.top +
                          this.offset.relative.top * s +
                          this.offset.parent.top * s -
                          ('fixed' === this.cssPosition
                              ? -this.scrollParent.scrollTop()
                              : o
                              ? 0
                              : n.scrollTop()) *
                              s,
                      left:
                          i.left +
                          this.offset.relative.left * s +
                          this.offset.parent.left * s -
                          ('fixed' === this.cssPosition
                              ? -this.scrollParent.scrollLeft()
                              : o
                              ? 0
                              : n.scrollLeft()) *
                              s,
                  };
              },
              _generatePosition: function (e) {
                  var i,
                      s,
                      n = this.options,
                      o = e.pageX,
                      a = e.pageY,
                      r =
                          'absolute' !== this.cssPosition ||
                          (this.scrollParent[0] !== this.document[0] &&
                              t.contains(
                                  this.scrollParent[0],
                                  this.offsetParent[0]
                              ))
                              ? this.scrollParent
                              : this.offsetParent,
                      h = /(html|body)/i.test(r[0].tagName);
                  return (
                      'relative' !== this.cssPosition ||
                          (this.scrollParent[0] !== this.document[0] &&
                              this.scrollParent[0] !== this.offsetParent[0]) ||
                          (this.offset.relative = this._getRelativeOffset()),
                      this.originalPosition &&
                          (this.containment &&
                              (e.pageX - this.offset.click.left <
                                  this.containment[0] &&
                                  (o =
                                      this.containment[0] +
                                      this.offset.click.left),
                              e.pageY - this.offset.click.top <
                                  this.containment[1] &&
                                  (a =
                                      this.containment[1] +
                                      this.offset.click.top),
                              e.pageX - this.offset.click.left >
                                  this.containment[2] &&
                                  (o =
                                      this.containment[2] +
                                      this.offset.click.left),
                              e.pageY - this.offset.click.top >
                                  this.containment[3] &&
                                  (a =
                                      this.containment[3] +
                                      this.offset.click.top)),
                          n.grid &&
                              ((i =
                                  this.originalPageY +
                                  Math.round(
                                      (a - this.originalPageY) / n.grid[1]
                                  ) *
                                      n.grid[1]),
                              (a = this.containment
                                  ? i - this.offset.click.top >=
                                        this.containment[1] &&
                                    i - this.offset.click.top <=
                                        this.containment[3]
                                      ? i
                                      : i - this.offset.click.top >=
                                        this.containment[1]
                                      ? i - n.grid[1]
                                      : i + n.grid[1]
                                  : i),
                              (s =
                                  this.originalPageX +
                                  Math.round(
                                      (o - this.originalPageX) / n.grid[0]
                                  ) *
                                      n.grid[0]),
                              (o = this.containment
                                  ? s - this.offset.click.left >=
                                        this.containment[0] &&
                                    s - this.offset.click.left <=
                                        this.containment[2]
                                      ? s
                                      : s - this.offset.click.left >=
                                        this.containment[0]
                                      ? s - n.grid[0]
                                      : s + n.grid[0]
                                  : s))),
                      {
                          top:
                              a -
                              this.offset.click.top -
                              this.offset.relative.top -
                              this.offset.parent.top +
                              ('fixed' === this.cssPosition
                                  ? -this.scrollParent.scrollTop()
                                  : h
                                  ? 0
                                  : r.scrollTop()),
                          left:
                              o -
                              this.offset.click.left -
                              this.offset.relative.left -
                              this.offset.parent.left +
                              ('fixed' === this.cssPosition
                                  ? -this.scrollParent.scrollLeft()
                                  : h
                                  ? 0
                                  : r.scrollLeft()),
                      }
                  );
              },
              _rearrange: function (t, e, i, s) {
                  i
                      ? i[0].appendChild(this.placeholder[0])
                      : e.item[0].parentNode.insertBefore(
                            this.placeholder[0],
                            'down' === this.direction
                                ? e.item[0]
                                : e.item[0].nextSibling
                        ),
                      (this.counter = this.counter ? ++this.counter : 1);
                  var n = this.counter;
                  this._delay(function () {
                      n === this.counter && this.refreshPositions(!s);
                  });
              },
              _clear: function (t, e) {
                  function i(t, e, i) {
                      return function (s) {
                          i._trigger(t, s, e._uiHash(e));
                      };
                  }
                  this.reverting = !1;
                  var s,
                      n = [];
                  if (
                      (!this._noFinalSort &&
                          this.currentItem.parent().length &&
                          this.placeholder.before(this.currentItem),
                      (this._noFinalSort = null),
                      this.helper[0] === this.currentItem[0])
                  ) {
                      for (s in this._storedCSS)
                          ('auto' === this._storedCSS[s] ||
                              'static' === this._storedCSS[s]) &&
                              (this._storedCSS[s] = '');
                      this.currentItem.css(this._storedCSS),
                          this._removeClass(
                              this.currentItem,
                              'ui-sortable-helper'
                          );
                  } else this.currentItem.show();
                  for (
                      this.fromOutside &&
                          !e &&
                          n.push(function (t) {
                              this._trigger(
                                  'receive',
                                  t,
                                  this._uiHash(this.fromOutside)
                              );
                          }),
                          (!this.fromOutside &&
                              this.domPosition.prev ===
                                  this.currentItem
                                      .prev()
                                      .not('.ui-sortable-helper')[0] &&
                              this.domPosition.parent ===
                                  this.currentItem.parent()[0]) ||
                              e ||
                              n.push(function (t) {
                                  this._trigger('update', t, this._uiHash());
                              }),
                          this !== this.currentContainer &&
                              (e ||
                                  (n.push(function (t) {
                                      this._trigger('remove', t, this._uiHash());
                                  }),
                                  n.push(
                                      function (t) {
                                          return function (e) {
                                              t._trigger(
                                                  'receive',
                                                  e,
                                                  this._uiHash(this)
                                              );
                                          };
                                      }.call(this, this.currentContainer)
                                  ),
                                  n.push(
                                      function (t) {
                                          return function (e) {
                                              t._trigger(
                                                  'update',
                                                  e,
                                                  this._uiHash(this)
                                              );
                                          };
                                      }.call(this, this.currentContainer)
                                  ))),
                          s = this.containers.length - 1;
                      s >= 0;
                      s--
                  )
                      e || n.push(i('deactivate', this, this.containers[s])),
                          this.containers[s].containerCache.over &&
                              (n.push(i('out', this, this.containers[s])),
                              (this.containers[s].containerCache.over = 0));
                  if (
                      (this.storedCursor &&
                          (this.document
                              .find('body')
                              .css('cursor', this.storedCursor),
                          this.storedStylesheet.remove()),
                      this._storedOpacity &&
                          this.helper.css('opacity', this._storedOpacity),
                      this._storedZIndex &&
                          this.helper.css(
                              'zIndex',
                              'auto' === this._storedZIndex
                                  ? ''
                                  : this._storedZIndex
                          ),
                      (this.dragging = !1),
                      e || this._trigger('beforeStop', t, this._uiHash()),
                      this.placeholder[0].parentNode.removeChild(
                          this.placeholder[0]
                      ),
                      this.cancelHelperRemoval ||
                          (this.helper[0] !== this.currentItem[0] &&
                              this.helper.remove(),
                          (this.helper = null)),
                      !e)
                  ) {
                      for (s = 0; n.length > s; s++) n[s].call(this, t);
                      this._trigger('stop', t, this._uiHash());
                  }
                  return (this.fromOutside = !1), !this.cancelHelperRemoval;
              },
              _trigger: function () {
                  !1 === t.Widget.prototype._trigger.apply(this, arguments) &&
                      this.cancel();
              },
              _uiHash: function (e) {
                  var i = e || this;
                  return {
                      helper: i.helper,
                      placeholder: i.placeholder || t([]),
                      position: i.position,
                      originalPosition: i.originalPosition,
                      offset: i.positionAbs,
                      item: i.currentItem,
                      sender: e ? e.element : null,
                  };
              },
          }),
          t.widget('ui.spinner', {
              version: '1.12.1',
              defaultElement: '<input>',
              widgetEventPrefix: 'spin',
              options: {
                  classes: {
                      'ui-spinner': 'ui-corner-all',
                      'ui-spinner-down': 'ui-corner-br',
                      'ui-spinner-up': 'ui-corner-tr',
                  },
                  culture: null,
                  icons: {
                      down: 'ui-icon-triangle-1-s',
                      up: 'ui-icon-triangle-1-n',
                  },
                  incremental: !0,
                  max: null,
                  min: null,
                  numberFormat: null,
                  page: 10,
                  step: 1,
                  change: null,
                  spin: null,
                  start: null,
                  stop: null,
              },
              _create: function () {
                  this._setOption('max', this.options.max),
                      this._setOption('min', this.options.min),
                      this._setOption('step', this.options.step),
                      '' !== this.value() && this._value(this.element.val(), !0),
                      this._draw(),
                      this._on(this._events),
                      this._refresh(),
                      this._on(this.window, {
                          beforeunload: function () {
                              this.element.removeAttr('autocomplete');
                          },
                      });
              },
              _getCreateOptions: function () {
                  var e = this._super(),
                      i = this.element;
                  return (
                      t.each(['min', 'max', 'step'], function (t, s) {
                          var n = i.attr(s);
                          null != n && n.length && (e[s] = n);
                      }),
                      e
                  );
              },
              _events: {
                  keydown: function (t) {
                      this._start(t) && this._keydown(t) && t.preventDefault();
                  },
                  keyup: '_stop',
                  focus: function () {
                      this.previous = this.element.val();
                  },
                  blur: function (t) {
                      return this.cancelBlur
                          ? void delete this.cancelBlur
                          : (this._stop(),
                            this._refresh(),
                            void (
                                this.previous !== this.element.val() &&
                                this._trigger('change', t)
                            ));
                  },
                  mousewheel: function (t, e) {
                      if (e) {
                          if (!this.spinning && !this._start(t)) return !1;
                          this._spin((e > 0 ? 1 : -1) * this.options.step, t),
                              clearTimeout(this.mousewheelTimer),
                              (this.mousewheelTimer = this._delay(function () {
                                  this.spinning && this._stop(t);
                              }, 100)),
                              t.preventDefault();
                      }
                  },
                  'mousedown .ui-spinner-button': function (e) {
                      function i() {
                          this.element[0] ===
                              t.ui.safeActiveElement(this.document[0]) ||
                              (this.element.trigger('focus'),
                              (this.previous = s),
                              this._delay(function () {
                                  this.previous = s;
                              }));
                      }
                      var s;
                      (s =
                          this.element[0] ===
                          t.ui.safeActiveElement(this.document[0])
                              ? this.previous
                              : this.element.val()),
                          e.preventDefault(),
                          i.call(this),
                          (this.cancelBlur = !0),
                          this._delay(function () {
                              delete this.cancelBlur, i.call(this);
                          }),
                          !1 !== this._start(e) &&
                              this._repeat(
                                  null,
                                  t(e.currentTarget).hasClass('ui-spinner-up')
                                      ? 1
                                      : -1,
                                  e
                              );
                  },
                  'mouseup .ui-spinner-button': '_stop',
                  'mouseenter .ui-spinner-button': function (e) {
                      return t(e.currentTarget).hasClass('ui-state-active')
                          ? !1 !== this._start(e) &&
                                void this._repeat(
                                    null,
                                    t(e.currentTarget).hasClass('ui-spinner-up')
                                        ? 1
                                        : -1,
                                    e
                                )
                          : void 0;
                  },
                  'mouseleave .ui-spinner-button': '_stop',
              },
              _enhance: function () {
                  this.uiSpinner = this.element
                      .attr('autocomplete', 'off')
                      .wrap('<span>')
                      .parent()
                      .append('<a></a><a></a>');
              },
              _draw: function () {
                  this._enhance(),
                      this._addClass(
                          this.uiSpinner,
                          'ui-spinner',
                          'ui-widget ui-widget-content'
                      ),
                      this._addClass('ui-spinner-input'),
                      this.element.attr('role', 'spinbutton'),
                      (this.buttons = this.uiSpinner
                          .children('a')
                          .attr('tabIndex', -1)
                          .attr('aria-hidden', !0)
                          .button({ classes: { 'ui-button': '' } })),
                      this._removeClass(this.buttons, 'ui-corner-all'),
                      this._addClass(
                          this.buttons.first(),
                          'ui-spinner-button ui-spinner-up'
                      ),
                      this._addClass(
                          this.buttons.last(),
                          'ui-spinner-button ui-spinner-down'
                      ),
                      this.buttons
                          .first()
                          .button({ icon: this.options.icons.up, showLabel: !1 }),
                      this.buttons.last().button({
                          icon: this.options.icons.down,
                          showLabel: !1,
                      }),
                      this.buttons.height() >
                          Math.ceil(0.5 * this.uiSpinner.height()) &&
                          this.uiSpinner.height() > 0 &&
                          this.uiSpinner.height(this.uiSpinner.height());
              },
              _keydown: function (e) {
                  var i = this.options,
                      s = t.ui.keyCode;
                  switch (e.keyCode) {
                      case s.UP:
                          return this._repeat(null, 1, e), !0;
                      case s.DOWN:
                          return this._repeat(null, -1, e), !0;
                      case s.PAGE_UP:
                          return this._repeat(null, i.page, e), !0;
                      case s.PAGE_DOWN:
                          return this._repeat(null, -i.page, e), !0;
                  }
                  return !1;
              },
              _start: function (t) {
                  return (
                      !(!this.spinning && !1 === this._trigger('start', t)) &&
                      (this.counter || (this.counter = 1),
                      (this.spinning = !0),
                      !0)
                  );
              },
              _repeat: function (t, e, i) {
                  (t = t || 500),
                      clearTimeout(this.timer),
                      (this.timer = this._delay(function () {
                          this._repeat(40, e, i);
                      }, t)),
                      this._spin(e * this.options.step, i);
              },
              _spin: function (t, e) {
                  var i = this.value() || 0;
                  this.counter || (this.counter = 1),
                      (i = this._adjustValue(
                          i + t * this._increment(this.counter)
                      )),
                      (this.spinning &&
                          !1 === this._trigger('spin', e, { value: i })) ||
                          (this._value(i), this.counter++);
              },
              _increment: function (e) {
                  var i = this.options.incremental;
                  return i
                      ? t.isFunction(i)
                          ? i(e)
                          : Math.floor(
                                (e * e * e) / 5e4 -
                                    (e * e) / 500 +
                                    (17 * e) / 200 +
                                    1
                            )
                      : 1;
              },
              _precision: function () {
                  var t = this._precisionOf(this.options.step);
                  return (
                      null !== this.options.min &&
                          (t = Math.max(t, this._precisionOf(this.options.min))),
                      t
                  );
              },
              _precisionOf: function (t) {
                  var e = '' + t,
                      i = e.indexOf('.');
                  return -1 === i ? 0 : e.length - i - 1;
              },
              _adjustValue: function (t) {
                  var e,
                      i,
                      s = this.options;
                  return (
                      (i = t - (e = null !== s.min ? s.min : 0)),
                      (t = e + (i = Math.round(i / s.step) * s.step)),
                      (t = parseFloat(t.toFixed(this._precision()))),
                      null !== s.max && t > s.max
                          ? s.max
                          : null !== s.min && s.min > t
                          ? s.min
                          : t
                  );
              },
              _stop: function (t) {
                  this.spinning &&
                      (clearTimeout(this.timer),
                      clearTimeout(this.mousewheelTimer),
                      (this.counter = 0),
                      (this.spinning = !1),
                      this._trigger('stop', t));
              },
              _setOption: function (t, e) {
                  var i, s, n;
                  return 'culture' === t || 'numberFormat' === t
                      ? ((i = this._parse(this.element.val())),
                        (this.options[t] = e),
                        void this.element.val(this._format(i)))
                      : (('max' === t || 'min' === t || 'step' === t) &&
                            'string' == typeof e &&
                            (e = this._parse(e)),
                        'icons' === t &&
                            ((s = this.buttons.first().find('.ui-icon')),
                            this._removeClass(s, null, this.options.icons.up),
                            this._addClass(s, null, e.up),
                            (n = this.buttons.last().find('.ui-icon')),
                            this._removeClass(n, null, this.options.icons.down),
                            this._addClass(n, null, e.down)),
                        void this._super(t, e));
              },
              _setOptionDisabled: function (t) {
                  this._super(t),
                      this._toggleClass(
                          this.uiSpinner,
                          null,
                          'ui-state-disabled',
                          !!t
                      ),
                      this.element.prop('disabled', !!t),
                      this.buttons.button(t ? 'disable' : 'enable');
              },
              _setOptions: o(function (t) {
                  this._super(t);
              }),
              _parse: function (t) {
                  return (
                      'string' == typeof t &&
                          '' !== t &&
                          (t =
                              window.Globalize && this.options.numberFormat
                                  ? Globalize.parseFloat(
                                        t,
                                        10,
                                        this.options.culture
                                    )
                                  : +t),
                      '' === t || isNaN(t) ? null : t
                  );
              },
              _format: function (t) {
                  return '' === t
                      ? ''
                      : window.Globalize && this.options.numberFormat
                      ? Globalize.format(
                            t,
                            this.options.numberFormat,
                            this.options.culture
                        )
                      : t;
              },
              _refresh: function () {
                  this.element.attr({
                      'aria-valuemin': this.options.min,
                      'aria-valuemax': this.options.max,
                      'aria-valuenow': this._parse(this.element.val()),
                  });
              },
              isValid: function () {
                  var t = this.value();
                  return null !== t && t === this._adjustValue(t);
              },
              _value: function (t, e) {
                  var i;
                  '' !== t &&
                      null !== (i = this._parse(t)) &&
                      (e || (i = this._adjustValue(i)), (t = this._format(i))),
                      this.element.val(t),
                      this._refresh();
              },
              _destroy: function () {
                  this.element
                      .prop('disabled', !1)
                      .removeAttr(
                          'autocomplete role aria-valuemin aria-valuemax aria-valuenow'
                      ),
                      this.uiSpinner.replaceWith(this.element);
              },
              stepUp: o(function (t) {
                  this._stepUp(t);
              }),
              _stepUp: function (t) {
                  this._start() &&
                      (this._spin((t || 1) * this.options.step), this._stop());
              },
              stepDown: o(function (t) {
                  this._stepDown(t);
              }),
              _stepDown: function (t) {
                  this._start() &&
                      (this._spin((t || 1) * -this.options.step), this._stop());
              },
              pageUp: o(function (t) {
                  this._stepUp((t || 1) * this.options.page);
              }),
              pageDown: o(function (t) {
                  this._stepDown((t || 1) * this.options.page);
              }),
              value: function (t) {
                  return arguments.length
                      ? void o(this._value).call(this, t)
                      : this._parse(this.element.val());
              },
              widget: function () {
                  return this.uiSpinner;
              },
          }),
          !1 !== t.uiBackCompat &&
              t.widget('ui.spinner', t.ui.spinner, {
                  _enhance: function () {
                      this.uiSpinner = this.element
                          .attr('autocomplete', 'off')
                          .wrap(this._uiSpinnerHtml())
                          .parent()
                          .append(this._buttonHtml());
                  },
                  _uiSpinnerHtml: function () {
                      return '<span>';
                  },
                  _buttonHtml: function () {
                      return '<a></a><a></a>';
                  },
              }),
          t.ui.spinner,
          t.widget('ui.tabs', {
              version: '1.12.1',
              delay: 300,
              options: {
                  active: null,
                  classes: {
                      'ui-tabs': 'ui-corner-all',
                      'ui-tabs-nav': 'ui-corner-all',
                      'ui-tabs-panel': 'ui-corner-bottom',
                      'ui-tabs-tab': 'ui-corner-top',
                  },
                  collapsible: !1,
                  event: 'click',
                  heightStyle: 'content',
                  hide: null,
                  show: null,
                  activate: null,
                  beforeActivate: null,
                  beforeLoad: null,
                  load: null,
              },
              _isLocal: (function () {
                  var t = /#.*$/;
                  return function (e) {
                      var i, s;
                      (i = e.href.replace(t, '')),
                          (s = location.href.replace(t, ''));
                      try {
                          i = decodeURIComponent(i);
                      } catch (t) {}
                      try {
                          s = decodeURIComponent(s);
                      } catch (t) {}
                      return e.hash.length > 1 && i === s;
                  };
              })(),
              _create: function () {
                  var e = this,
                      i = this.options;
                  (this.running = !1),
                      this._addClass('ui-tabs', 'ui-widget ui-widget-content'),
                      this._toggleClass(
                          'ui-tabs-collapsible',
                          null,
                          i.collapsible
                      ),
                      this._processTabs(),
                      (i.active = this._initialActive()),
                      t.isArray(i.disabled) &&
                          (i.disabled = t
                              .unique(
                                  i.disabled.concat(
                                      t.map(
                                          this.tabs.filter('.ui-state-disabled'),
                                          function (t) {
                                              return e.tabs.index(t);
                                          }
                                      )
                                  )
                              )
                              .sort()),
                      (this.active =
                          !1 !== this.options.active && this.anchors.length
                              ? this._findActive(i.active)
                              : t()),
                      this._refresh(),
                      this.active.length && this.load(i.active);
              },
              _initialActive: function () {
                  var e = this.options.active,
                      i = this.options.collapsible,
                      s = location.hash.substring(1);
                  return (
                      null === e &&
                          (s &&
                              this.tabs.each(function (i, n) {
                                  return t(n).attr('aria-controls') === s
                                      ? ((e = i), !1)
                                      : void 0;
                              }),
                          null === e &&
                              (e = this.tabs.index(
                                  this.tabs.filter('.ui-tabs-active')
                              )),
                          (null === e || -1 === e) &&
                              (e = !!this.tabs.length && 0)),
                      !1 !== e &&
                          -1 === (e = this.tabs.index(this.tabs.eq(e))) &&
                          (e = !i && 0),
                      !i && !1 === e && this.anchors.length && (e = 0),
                      e
                  );
              },
              _getCreateEventData: function () {
                  return {
                      tab: this.active,
                      panel: this.active.length
                          ? this._getPanelForTab(this.active)
                          : t(),
                  };
              },
              _tabKeydown: function (e) {
                  var i = t(t.ui.safeActiveElement(this.document[0])).closest(
                          'li'
                      ),
                      s = this.tabs.index(i),
                      n = !0;
                  if (!this._handlePageNav(e)) {
                      switch (e.keyCode) {
                          case t.ui.keyCode.RIGHT:
                          case t.ui.keyCode.DOWN:
                              s++;
                              break;
                          case t.ui.keyCode.UP:
                          case t.ui.keyCode.LEFT:
                              (n = !1), s--;
                              break;
                          case t.ui.keyCode.END:
                              s = this.anchors.length - 1;
                              break;
                          case t.ui.keyCode.HOME:
                              s = 0;
                              break;
                          case t.ui.keyCode.SPACE:
                              return (
                                  e.preventDefault(),
                                  clearTimeout(this.activating),
                                  void this._activate(s)
                              );
                          case t.ui.keyCode.ENTER:
                              return (
                                  e.preventDefault(),
                                  clearTimeout(this.activating),
                                  void this._activate(
                                      s !== this.options.active && s
                                  )
                              );
                          default:
                              return;
                      }
                      e.preventDefault(),
                          clearTimeout(this.activating),
                          (s = this._focusNextTab(s, n)),
                          e.ctrlKey ||
                              e.metaKey ||
                              (i.attr('aria-selected', 'false'),
                              this.tabs.eq(s).attr('aria-selected', 'true'),
                              (this.activating = this._delay(function () {
                                  this.option('active', s);
                              }, this.delay)));
                  }
              },
              _panelKeydown: function (e) {
                  this._handlePageNav(e) ||
                      (e.ctrlKey &&
                          e.keyCode === t.ui.keyCode.UP &&
                          (e.preventDefault(), this.active.trigger('focus')));
              },
              _handlePageNav: function (e) {
                  return e.altKey && e.keyCode === t.ui.keyCode.PAGE_UP
                      ? (this._activate(
                            this._focusNextTab(this.options.active - 1, !1)
                        ),
                        !0)
                      : e.altKey && e.keyCode === t.ui.keyCode.PAGE_DOWN
                      ? (this._activate(
                            this._focusNextTab(this.options.active + 1, !0)
                        ),
                        !0)
                      : void 0;
              },
              _findNextTab: function (e, i) {
                  for (
                      var s = this.tabs.length - 1;
                      -1 !==
                      t.inArray(
                          (e > s && (e = 0), 0 > e && (e = s), e),
                          this.options.disabled
                      );

                  )
                      e = i ? e + 1 : e - 1;
                  return e;
              },
              _focusNextTab: function (t, e) {
                  return (
                      (t = this._findNextTab(t, e)),
                      this.tabs.eq(t).trigger('focus'),
                      t
                  );
              },
              _setOption: function (t, e) {
                  return 'active' === t
                      ? void this._activate(e)
                      : (this._super(t, e),
                        'collapsible' === t &&
                            (this._toggleClass('ui-tabs-collapsible', null, e),
                            e || !1 !== this.options.active || this._activate(0)),
                        'event' === t && this._setupEvents(e),
                        void ('heightStyle' === t && this._setupHeightStyle(e)));
              },
              _sanitizeSelector: function (t) {
                  return t
                      ? t.replace(/[!"$%&'()*+,.\/:;<=>?@\[\]\^`{|}~]/g, '\\$&')
                      : '';
              },
              refresh: function () {
                  var e = this.options,
                      i = this.tablist.children(':has(a[href])');
                  (e.disabled = t.map(i.filter('.ui-state-disabled'), function (
                      t
                  ) {
                      return i.index(t);
                  })),
                      this._processTabs(),
                      !1 !== e.active && this.anchors.length
                          ? this.active.length &&
                            !t.contains(this.tablist[0], this.active[0])
                              ? this.tabs.length === e.disabled.length
                                  ? ((e.active = !1), (this.active = t()))
                                  : this._activate(
                                        this._findNextTab(
                                            Math.max(0, e.active - 1),
                                            !1
                                        )
                                    )
                              : (e.active = this.tabs.index(this.active))
                          : ((e.active = !1), (this.active = t())),
                      this._refresh();
              },
              _refresh: function () {
                  this._setOptionDisabled(this.options.disabled),
                      this._setupEvents(this.options.event),
                      this._setupHeightStyle(this.options.heightStyle),
                      this.tabs.not(this.active).attr({
                          'aria-selected': 'false',
                          'aria-expanded': 'false',
                          tabIndex: -1,
                      }),
                      this.panels
                          .not(this._getPanelForTab(this.active))
                          .hide()
                          .attr({ 'aria-hidden': 'true' }),
                      this.active.length
                          ? (this.active.attr({
                                'aria-selected': 'true',
                                'aria-expanded': 'true',
                                tabIndex: 0,
                            }),
                            this._addClass(
                                this.active,
                                'ui-tabs-active',
                                'ui-state-active'
                            ),
                            this._getPanelForTab(this.active)
                                .show()
                                .attr({ 'aria-hidden': 'false' }))
                          : this.tabs.eq(0).attr('tabIndex', 0);
              },
              _processTabs: function () {
                  var e = this,
                      i = this.tabs,
                      s = this.anchors,
                      n = this.panels;
                  (this.tablist = this._getList().attr('role', 'tablist')),
                      this._addClass(
                          this.tablist,
                          'ui-tabs-nav',
                          'ui-helper-reset ui-helper-clearfix ui-widget-header'
                      ),
                      this.tablist
                          .on(
                              'mousedown' + this.eventNamespace,
                              '> li',
                              function (e) {
                                  t(this).is('.ui-state-disabled') &&
                                      e.preventDefault();
                              }
                          )
                          .on(
                              'focus' + this.eventNamespace,
                              '.ui-tabs-anchor',
                              function () {
                                  t(this)
                                      .closest('li')
                                      .is('.ui-state-disabled') && this.blur();
                              }
                          ),
                      (this.tabs = this.tablist
                          .find('> li:has(a[href])')
                          .attr({ role: 'tab', tabIndex: -1 })),
                      this._addClass(
                          this.tabs,
                          'ui-tabs-tab',
                          'ui-state-default'
                      ),
                      (this.anchors = this.tabs
                          .map(function () {
                              return t('a', this)[0];
                          })
                          .attr({ role: 'presentation', tabIndex: -1 })),
                      this._addClass(this.anchors, 'ui-tabs-anchor'),
                      (this.panels = t()),
                      this.anchors.each(function (i, s) {
                          var n,
                              o,
                              a,
                              r = t(s).uniqueId().attr('id'),
                              h = t(s).closest('li'),
                              l = h.attr('aria-controls');
                          e._isLocal(s)
                              ? ((a = (n = s.hash).substring(1)),
                                (o = e.element.find(e._sanitizeSelector(n))))
                              : ((n =
                                    '#' +
                                    (a =
                                        h.attr('aria-controls') ||
                                        t({}).uniqueId()[0].id)),
                                (o = e.element.find(n)).length ||
                                    (o = e._createPanel(a)).insertAfter(
                                        e.panels[i - 1] || e.tablist
                                    ),
                                o.attr('aria-live', 'polite')),
                              o.length && (e.panels = e.panels.add(o)),
                              l && h.data('ui-tabs-aria-controls', l),
                              h.attr({
                                  'aria-controls': a,
                                  'aria-labelledby': r,
                              }),
                              o.attr('aria-labelledby', r);
                      }),
                      this.panels.attr('role', 'tabpanel'),
                      this._addClass(
                          this.panels,
                          'ui-tabs-panel',
                          'ui-widget-content'
                      ),
                      i &&
                          (this._off(i.not(this.tabs)),
                          this._off(s.not(this.anchors)),
                          this._off(n.not(this.panels)));
              },
              _getList: function () {
                  return this.tablist || this.element.find('ol, ul').eq(0);
              },
              _createPanel: function (e) {
                  return t('<div>').attr('id', e).data('ui-tabs-destroy', !0);
              },
              _setOptionDisabled: function (e) {
                  var i, s, n;
                  for (
                      t.isArray(e) &&
                          (e.length
                              ? e.length === this.anchors.length && (e = !0)
                              : (e = !1)),
                          n = 0;
                      (s = this.tabs[n]);
                      n++
                  )
                      (i = t(s)),
                          !0 === e || -1 !== t.inArray(n, e)
                              ? (i.attr('aria-disabled', 'true'),
                                this._addClass(i, null, 'ui-state-disabled'))
                              : (i.removeAttr('aria-disabled'),
                                this._removeClass(i, null, 'ui-state-disabled'));
                  (this.options.disabled = e),
                      this._toggleClass(
                          this.widget(),
                          this.widgetFullName + '-disabled',
                          null,
                          !0 === e
                      );
              },
              _setupEvents: function (e) {
                  var i = {};
                  e &&
                      t.each(e.split(' '), function (t, e) {
                          i[e] = '_eventHandler';
                      }),
                      this._off(this.anchors.add(this.tabs).add(this.panels)),
                      this._on(!0, this.anchors, {
                          click: function (t) {
                              t.preventDefault();
                          },
                      }),
                      this._on(this.anchors, i),
                      this._on(this.tabs, { keydown: '_tabKeydown' }),
                      this._on(this.panels, { keydown: '_panelKeydown' }),
                      this._focusable(this.tabs),
                      this._hoverable(this.tabs);
              },
              _setupHeightStyle: function (e) {
                  var i,
                      s = this.element.parent();
                  'fill' === e
                      ? ((i = s.height()),
                        (i -= this.element.outerHeight() - this.element.height()),
                        this.element.siblings(':visible').each(function () {
                            var e = t(this),
                                s = e.css('position');
                            'absolute' !== s &&
                                'fixed' !== s &&
                                (i -= e.outerHeight(!0));
                        }),
                        this.element
                            .children()
                            .not(this.panels)
                            .each(function () {
                                i -= t(this).outerHeight(!0);
                            }),
                        this.panels
                            .each(function () {
                                t(this).height(
                                    Math.max(
                                        0,
                                        i -
                                            t(this).innerHeight() +
                                            t(this).height()
                                    )
                                );
                            })
                            .css('overflow', 'auto'))
                      : 'auto' === e &&
                        ((i = 0),
                        this.panels
                            .each(function () {
                                i = Math.max(i, t(this).height('').height());
                            })
                            .height(i));
              },
              _eventHandler: function (e) {
                  var i = this.options,
                      s = this.active,
                      n = t(e.currentTarget).closest('li'),
                      o = n[0] === s[0],
                      a = o && i.collapsible,
                      r = a ? t() : this._getPanelForTab(n),
                      h = s.length ? this._getPanelForTab(s) : t(),
                      l = {
                          oldTab: s,
                          oldPanel: h,
                          newTab: a ? t() : n,
                          newPanel: r,
                      };
                  e.preventDefault(),
                      n.hasClass('ui-state-disabled') ||
                          n.hasClass('ui-tabs-loading') ||
                          this.running ||
                          (o && !i.collapsible) ||
                          !1 === this._trigger('beforeActivate', e, l) ||
                          ((i.active = !a && this.tabs.index(n)),
                          (this.active = o ? t() : n),
                          this.xhr && this.xhr.abort(),
                          h.length ||
                              r.length ||
                              t.error(
                                  'jQuery UI Tabs: Mismatching fragment identifier.'
                              ),
                          r.length && this.load(this.tabs.index(n), e),
                          this._toggle(e, l));
              },
              _toggle: function (e, i) {
                  function s() {
                      (o.running = !1), o._trigger('activate', e, i);
                  }
                  function n() {
                      o._addClass(
                          i.newTab.closest('li'),
                          'ui-tabs-active',
                          'ui-state-active'
                      ),
                          a.length && o.options.show
                              ? o._show(a, o.options.show, s)
                              : (a.show(), s());
                  }
                  var o = this,
                      a = i.newPanel,
                      r = i.oldPanel;
                  (this.running = !0),
                      r.length && this.options.hide
                          ? this._hide(r, this.options.hide, function () {
                                o._removeClass(
                                    i.oldTab.closest('li'),
                                    'ui-tabs-active',
                                    'ui-state-active'
                                ),
                                    n();
                            })
                          : (this._removeClass(
                                i.oldTab.closest('li'),
                                'ui-tabs-active',
                                'ui-state-active'
                            ),
                            r.hide(),
                            n()),
                      r.attr('aria-hidden', 'true'),
                      i.oldTab.attr({
                          'aria-selected': 'false',
                          'aria-expanded': 'false',
                      }),
                      a.length && r.length
                          ? i.oldTab.attr('tabIndex', -1)
                          : a.length &&
                            this.tabs
                                .filter(function () {
                                    return 0 === t(this).attr('tabIndex');
                                })
                                .attr('tabIndex', -1),
                      a.attr('aria-hidden', 'false'),
                      i.newTab.attr({
                          'aria-selected': 'true',
                          'aria-expanded': 'true',
                          tabIndex: 0,
                      });
              },
              _activate: function (e) {
                  var i,
                      s = this._findActive(e);
                  s[0] !== this.active[0] &&
                      (s.length || (s = this.active),
                      (i = s.find('.ui-tabs-anchor')[0]),
                      this._eventHandler({
                          target: i,
                          currentTarget: i,
                          preventDefault: t.noop,
                      }));
              },
              _findActive: function (e) {
                  return !1 === e ? t() : this.tabs.eq(e);
              },
              _getIndex: function (e) {
                  return (
                      'string' == typeof e &&
                          (e = this.anchors.index(
                              this.anchors.filter(
                                  "[href$='" + t.ui.escapeSelector(e) + "']"
                              )
                          )),
                      e
                  );
              },
              _destroy: function () {
                  this.xhr && this.xhr.abort(),
                      this.tablist.removeAttr('role').off(this.eventNamespace),
                      this.anchors.removeAttr('role tabIndex').removeUniqueId(),
                      this.tabs.add(this.panels).each(function () {
                          t.data(this, 'ui-tabs-destroy')
                              ? t(this).remove()
                              : t(this).removeAttr(
                                    'role tabIndex aria-live aria-busy aria-selected aria-labelledby aria-hidden aria-expanded'
                                );
                      }),
                      this.tabs.each(function () {
                          var e = t(this),
                              i = e.data('ui-tabs-aria-controls');
                          i
                              ? e
                                    .attr('aria-controls', i)
                                    .removeData('ui-tabs-aria-controls')
                              : e.removeAttr('aria-controls');
                      }),
                      this.panels.show(),
                      'content' !== this.options.heightStyle &&
                          this.panels.css('height', '');
              },
              enable: function (e) {
                  var i = this.options.disabled;
                  !1 !== i &&
                      (void 0 === e
                          ? (i = !1)
                          : ((e = this._getIndex(e)),
                            (i = t.isArray(i)
                                ? t.map(i, function (t) {
                                      return t !== e ? t : null;
                                  })
                                : t.map(this.tabs, function (t, i) {
                                      return i !== e ? i : null;
                                  }))),
                      this._setOptionDisabled(i));
              },
              disable: function (e) {
                  var i = this.options.disabled;
                  if (!0 !== i) {
                      if (void 0 === e) i = !0;
                      else {
                          if (((e = this._getIndex(e)), -1 !== t.inArray(e, i)))
                              return;
                          i = t.isArray(i) ? t.merge([e], i).sort() : [e];
                      }
                      this._setOptionDisabled(i);
                  }
              },
              load: function (e, i) {
                  e = this._getIndex(e);
                  var s = this,
                      n = this.tabs.eq(e),
                      o = n.find('.ui-tabs-anchor'),
                      a = this._getPanelForTab(n),
                      r = { tab: n, panel: a },
                      h = function (t, e) {
                          'abort' === e && s.panels.stop(!1, !0),
                              s._removeClass(n, 'ui-tabs-loading'),
                              a.removeAttr('aria-busy'),
                              t === s.xhr && delete s.xhr;
                      };
                  this._isLocal(o[0]) ||
                      ((this.xhr = t.ajax(this._ajaxSettings(o, i, r))),
                      this.xhr &&
                          'canceled' !== this.xhr.statusText &&
                          (this._addClass(n, 'ui-tabs-loading'),
                          a.attr('aria-busy', 'true'),
                          this.xhr
                              .done(function (t, e, n) {
                                  setTimeout(function () {
                                      a.html(t),
                                          s._trigger('load', i, r),
                                          h(n, e);
                                  }, 1);
                              })
                              .fail(function (t, e) {
                                  setTimeout(function () {
                                      h(t, e);
                                  }, 1);
                              })));
              },
              _ajaxSettings: function (e, i, s) {
                  var n = this;
                  return {
                      url: e.attr('href').replace(/#.*$/, ''),
                      beforeSend: function (e, o) {
                          return n._trigger(
                              'beforeLoad',
                              i,
                              t.extend({ jqXHR: e, ajaxSettings: o }, s)
                          );
                      },
                  };
              },
              _getPanelForTab: function (e) {
                  var i = t(e).attr('aria-controls');
                  return this.element.find(this._sanitizeSelector('#' + i));
              },
          }),
          !1 !== t.uiBackCompat &&
              t.widget('ui.tabs', t.ui.tabs, {
                  _processTabs: function () {
                      this._superApply(arguments),
                          this._addClass(this.tabs, 'ui-tab');
                  },
              }),
          t.ui.tabs,
          t.widget('ui.tooltip', {
              version: '1.12.1',
              options: {
                  classes: { 'ui-tooltip': 'ui-corner-all ui-widget-shadow' },
                  content: function () {
                      var e = t(this).attr('title') || '';
                      return t('<a>').text(e).html();
                  },
                  hide: !0,
                  items: '[title]:not([disabled])',
                  position: {
                      my: 'left top+15',
                      at: 'left bottom',
                      collision: 'flipfit flip',
                  },
                  show: !0,
                  track: !1,
                  close: null,
                  open: null,
              },
              _addDescribedBy: function (e, i) {
                  var s = (e.attr('aria-describedby') || '').split(/\s+/);
                  s.push(i),
                      e
                          .data('ui-tooltip-id', i)
                          .attr('aria-describedby', t.trim(s.join(' ')));
              },
              _removeDescribedBy: function (e) {
                  var i = e.data('ui-tooltip-id'),
                      s = (e.attr('aria-describedby') || '').split(/\s+/),
                      n = t.inArray(i, s);
                  -1 !== n && s.splice(n, 1),
                      e.removeData('ui-tooltip-id'),
                      (s = t.trim(s.join(' ')))
                          ? e.attr('aria-describedby', s)
                          : e.removeAttr('aria-describedby');
              },
              _create: function () {
                  this._on({ mouseover: 'open', focusin: 'open' }),
                      (this.tooltips = {}),
                      (this.parents = {}),
                      (this.liveRegion = t('<div>')
                          .attr({
                              role: 'log',
                              'aria-live': 'assertive',
                              'aria-relevant': 'additions',
                          })
                          .appendTo(this.document[0].body)),
                      this._addClass(
                          this.liveRegion,
                          null,
                          'ui-helper-hidden-accessible'
                      ),
                      (this.disabledTitles = t([]));
              },
              _setOption: function (e, i) {
                  var s = this;
                  this._super(e, i),
                      'content' === e &&
                          t.each(this.tooltips, function (t, e) {
                              s._updateContent(e.element);
                          });
              },
              _setOptionDisabled: function (t) {
                  this[t ? '_disable' : '_enable']();
              },
              _disable: function () {
                  var e = this;
                  t.each(this.tooltips, function (i, s) {
                      var n = t.Event('blur');
                      (n.target = n.currentTarget = s.element[0]), e.close(n, !0);
                  }),
                      (this.disabledTitles = this.disabledTitles.add(
                          this.element
                              .find(this.options.items)
                              .addBack()
                              .filter(function () {
                                  var e = t(this);
                                  return e.is('[title]')
                                      ? e
                                            .data(
                                                'ui-tooltip-title',
                                                e.attr('title')
                                            )
                                            .removeAttr('title')
                                      : void 0;
                              })
                      ));
              },
              _enable: function () {
                  this.disabledTitles.each(function () {
                      var e = t(this);
                      e.data('ui-tooltip-title') &&
                          e.attr('title', e.data('ui-tooltip-title'));
                  }),
                      (this.disabledTitles = t([]));
              },
              open: function (e) {
                  var i = this,
                      s = t(e ? e.target : this.element).closest(
                          this.options.items
                      );
                  s.length &&
                      !s.data('ui-tooltip-id') &&
                      (s.attr('title') &&
                          s.data('ui-tooltip-title', s.attr('title')),
                      s.data('ui-tooltip-open', !0),
                      e &&
                          'mouseover' === e.type &&
                          s.parents().each(function () {
                              var e,
                                  s = t(this);
                              s.data('ui-tooltip-open') &&
                                  (((e = t.Event(
                                      'blur'
                                  )).target = e.currentTarget = this),
                                  i.close(e, !0)),
                                  s.attr('title') &&
                                      (s.uniqueId(),
                                      (i.parents[this.id] = {
                                          element: this,
                                          title: s.attr('title'),
                                      }),
                                      s.attr('title', ''));
                          }),
                      this._registerCloseHandlers(e, s),
                      this._updateContent(s, e));
              },
              _updateContent: function (t, e) {
                  var i,
                      s = this.options.content,
                      n = this,
                      o = e ? e.type : null;
                  return 'string' == typeof s || s.nodeType || s.jquery
                      ? this._open(e, t, s)
                      : void (
                            (i = s.call(t[0], function (i) {
                                n._delay(function () {
                                    t.data('ui-tooltip-open') &&
                                        (e && (e.type = o), this._open(e, t, i));
                                });
                            })) && this._open(e, t, i)
                        );
              },
              _open: function (e, i, s) {
                  function n(t) {
                      (l.of = t), a.is(':hidden') || a.position(l);
                  }
                  var o,
                      a,
                      r,
                      h,
                      l = t.extend({}, this.options.position);
                  if (s) {
                      if ((o = this._find(i)))
                          return void o.tooltip
                              .find('.ui-tooltip-content')
                              .html(s);
                      i.is('[title]') &&
                          (e && 'mouseover' === e.type
                              ? i.attr('title', '')
                              : i.removeAttr('title')),
                          (o = this._tooltip(i)),
                          (a = o.tooltip),
                          this._addDescribedBy(i, a.attr('id')),
                          a.find('.ui-tooltip-content').html(s),
                          this.liveRegion.children().hide(),
                          (h = t('<div>').html(
                              a.find('.ui-tooltip-content').html()
                          ))
                              .removeAttr('name')
                              .find('[name]')
                              .removeAttr('name'),
                          h.removeAttr('id').find('[id]').removeAttr('id'),
                          h.appendTo(this.liveRegion),
                          this.options.track && e && /^mouse/.test(e.type)
                              ? (this._on(this.document, { mousemove: n }), n(e))
                              : a.position(
                                    t.extend({ of: i }, this.options.position)
                                ),
                          a.hide(),
                          this._show(a, this.options.show),
                          this.options.track &&
                              this.options.show &&
                              this.options.show.delay &&
                              (r = this.delayedShow = setInterval(function () {
                                  a.is(':visible') && (n(l.of), clearInterval(r));
                              }, t.fx.interval)),
                          this._trigger('open', e, { tooltip: a });
                  }
              },
              _registerCloseHandlers: function (e, i) {
                  var s = {
                      keyup: function (e) {
                          if (e.keyCode === t.ui.keyCode.ESCAPE) {
                              var s = t.Event(e);
                              (s.currentTarget = i[0]), this.close(s, !0);
                          }
                      },
                  };
                  i[0] !== this.element[0] &&
                      (s.remove = function () {
                          this._removeTooltip(this._find(i).tooltip);
                      }),
                      (e && 'mouseover' !== e.type) || (s.mouseleave = 'close'),
                      (e && 'focusin' !== e.type) || (s.focusout = 'close'),
                      this._on(!0, i, s);
              },
              close: function (e) {
                  var i,
                      s = this,
                      n = t(e ? e.currentTarget : this.element),
                      o = this._find(n);
                  return o
                      ? ((i = o.tooltip),
                        void (
                            o.closing ||
                            (clearInterval(this.delayedShow),
                            n.data('ui-tooltip-title') &&
                                !n.attr('title') &&
                                n.attr('title', n.data('ui-tooltip-title')),
                            this._removeDescribedBy(n),
                            (o.hiding = !0),
                            i.stop(!0),
                            this._hide(i, this.options.hide, function () {
                                s._removeTooltip(t(this));
                            }),
                            n.removeData('ui-tooltip-open'),
                            this._off(n, 'mouseleave focusout keyup'),
                            n[0] !== this.element[0] && this._off(n, 'remove'),
                            this._off(this.document, 'mousemove'),
                            e &&
                                'mouseleave' === e.type &&
                                t.each(this.parents, function (e, i) {
                                    t(i.element).attr('title', i.title),
                                        delete s.parents[e];
                                }),
                            (o.closing = !0),
                            this._trigger('close', e, { tooltip: i }),
                            o.hiding || (o.closing = !1))
                        ))
                      : void n.removeData('ui-tooltip-open');
              },
              _tooltip: function (e) {
                  var i = t('<div>').attr('role', 'tooltip'),
                      s = t('<div>').appendTo(i),
                      n = i.uniqueId().attr('id');
                  return (
                      this._addClass(s, 'ui-tooltip-content'),
                      this._addClass(
                          i,
                          'ui-tooltip',
                          'ui-widget ui-widget-content'
                      ),
                      i.appendTo(this._appendTo(e)),
                      (this.tooltips[n] = { element: e, tooltip: i })
                  );
              },
              _find: function (t) {
                  var e = t.data('ui-tooltip-id');
                  return e ? this.tooltips[e] : null;
              },
              _removeTooltip: function (t) {
                  t.remove(), delete this.tooltips[t.attr('id')];
              },
              _appendTo: function (t) {
                  var e = t.closest('.ui-front, dialog');
                  return e.length || (e = this.document[0].body), e;
              },
              _destroy: function () {
                  var e = this;
                  t.each(this.tooltips, function (i, s) {
                      var n = t.Event('blur'),
                          o = s.element;
                      (n.target = n.currentTarget = o[0]),
                          e.close(n, !0),
                          t('#' + i).remove(),
                          o.data('ui-tooltip-title') &&
                              (o.attr('title') ||
                                  o.attr('title', o.data('ui-tooltip-title')),
                              o.removeData('ui-tooltip-title'));
                  }),
                      this.liveRegion.remove();
              },
          }),
          !1 !== t.uiBackCompat &&
              t.widget('ui.tooltip', t.ui.tooltip, {
                  options: { tooltipClass: null },
                  _tooltip: function () {
                      var t = this._superApply(arguments);
                      return (
                          this.options.tooltipClass &&
                              t.tooltip.addClass(this.options.tooltipClass),
                          t
                      );
                  },
              }),
          t.ui.tooltip;
  });

}
// jquery-ui-slideraccess
{
  /*
   * jQuery UI Slider Access
   * By: Trent Richardson [http://trentrichardson.com]
   * Version 0.3
   * Last Modified: 10/20/2012
   *
   * Copyright 2011 Trent Richardson
   * Dual licensed under the MIT and GPL licenses.
   * http://trentrichardson.com/Impromptu/GPL-LICENSE.txt
   * http://trentrichardson.com/Impromptu/MIT-LICENSE.txt
   *
   */
  (function ($) {
      $.fn.extend({
          sliderAccess: function (options) {
              options = options || {};
              options.touchonly =
                  options.touchonly !== undefined ? options.touchonly : true; // by default only show it if touch device

              if (options.touchonly === true && !('ontouchend' in document))
                  return $(this);

              return $(this).each(function (i, obj) {
                  var $t = $(this),
                      o = $.extend(
                          {},
                          {
                              where: 'after',
                              step: $t.slider('option', 'step'),
                              upIcon: 'ui-icon-plus',
                              downIcon: 'ui-icon-minus',
                              text: false,
                              upText: '+',
                              downText: '-',
                              buttonset: true,
                              buttonsetTag: 'span',
                              isRTL: false,
                          },
                          options
                      ),
                      $buttons = $(
                          '<' +
                              o.buttonsetTag +
                              ' class="ui-slider-access">' +
                              '<button data-icon="' +
                              o.downIcon +
                              '" data-step="' +
                              (o.isRTL ? o.step : o.step * -1) +
                              '">' +
                              o.downText +
                              '</button>' +
                              '<button data-icon="' +
                              o.upIcon +
                              '" data-step="' +
                              (o.isRTL ? o.step * -1 : o.step) +
                              '">' +
                              o.upText +
                              '</button>' +
                              '</' +
                              o.buttonsetTag +
                              '>'
                      );

                  $buttons.children('button').each(function (j, jobj) {
                      var $jt = $(this);
                      $jt.button({
                          text: o.text,
                          icons: { primary: $jt.data('icon') },
                      }).click(function (e) {
                          var step = $jt.data('step'),
                              curr = $t.slider('value'),
                              newval = (curr += step * 1),
                              minval = $t.slider('option', 'min'),
                              maxval = $t.slider('option', 'max'),
                              slidee =
                                  $t.slider('option', 'slide') || function () {},
                              stope =
                                  $t.slider('option', 'stop') || function () {};

                          e.preventDefault();

                          if (newval < minval || newval > maxval) return;

                          $t.slider('value', newval);

                          slidee.call($t, null, { value: newval });
                          stope.call($t, null, { value: newval });
                      });
                  });

                  // before or after
                  $t[o.where]($buttons);

                  if (o.buttonset) {
                      $buttons
                          .removeClass('ui-corner-right')
                          .removeClass('ui-corner-left')
                          .buttonset();
                      $buttons.eq(0).addClass('ui-corner-left');
                      $buttons.eq(1).addClass('ui-corner-right');
                  }

                  // adjust the width so we don't break the original layout
                  var bOuterWidth =
                      $buttons
                          .css({
                              marginLeft:
                                  (o.where == 'after' && !o.isRTL) ||
                                  (o.where == 'before' && o.isRTL)
                                      ? 10
                                      : 0,
                              marginRight:
                                  (o.where == 'before' && !o.isRTL) ||
                                  (o.where == 'after' && o.isRTL)
                                      ? 10
                                      : 0,
                          })
                          .outerWidth(true) + 5;
                  var tOuterWidth = $t.outerWidth(true);
                  $t.css('display', 'inline-block').width(
                      tOuterWidth - bOuterWidth
                  );
              });
          },
      });
  })(jQuery);

}
// jquery-ui-timepicker
{
  /*! jQuery Timepicker Addon - v1.6.3 - 2016-04-20
   * http://trentrichardson.com/examples/timepicker
   * Copyright (c) 2016 Trent Richardson; Licensed MIT */
  !(function (a) {
      'function' == typeof define && define.amd
          ? define(['jquery', 'jquery-ui'], a)
          : a(jQuery);
  })(function ($) {
      if ((($.ui.timepicker = $.ui.timepicker || {}), !$.ui.timepicker.version)) {
          $.extend($.ui, { timepicker: { version: '1.6.3' } });
          var Timepicker = function () {
              (this.regional = []),
                  (this.regional[''] = {
                      currentText: 'Now',
                      closeText: 'Done',
                      amNames: ['AM', 'A'],
                      pmNames: ['PM', 'P'],
                      timeFormat: 'HH:mm',
                      timeSuffix: '',
                      timeOnlyTitle: 'Choose Time',
                      timeText: 'Time',
                      hourText: 'Hour',
                      minuteText: 'Minute',
                      secondText: 'Second',
                      millisecText: 'Millisecond',
                      microsecText: 'Microsecond',
                      timezoneText: 'Time Zone',
                      isRTL: !1,
                  }),
                  (this._defaults = {
                      showButtonPanel: !0,
                      timeOnly: !1,
                      timeOnlyShowDate: !1,
                      showHour: null,
                      showMinute: null,
                      showSecond: null,
                      showMillisec: null,
                      showMicrosec: null,
                      showTimezone: null,
                      showTime: !0,
                      stepHour: 1,
                      stepMinute: 1,
                      stepSecond: 1,
                      stepMillisec: 1,
                      stepMicrosec: 1,
                      hour: 0,
                      minute: 0,
                      second: 0,
                      millisec: 0,
                      microsec: 0,
                      timezone: null,
                      hourMin: 0,
                      minuteMin: 0,
                      secondMin: 0,
                      millisecMin: 0,
                      microsecMin: 0,
                      hourMax: 23,
                      minuteMax: 59,
                      secondMax: 59,
                      millisecMax: 999,
                      microsecMax: 999,
                      minDateTime: null,
                      maxDateTime: null,
                      maxTime: null,
                      minTime: null,
                      onSelect: null,
                      hourGrid: 0,
                      minuteGrid: 0,
                      secondGrid: 0,
                      millisecGrid: 0,
                      microsecGrid: 0,
                      alwaysSetTime: !0,
                      separator: ' ',
                      altFieldTimeOnly: !0,
                      altTimeFormat: null,
                      altSeparator: null,
                      altTimeSuffix: null,
                      altRedirectFocus: !0,
                      pickerTimeFormat: null,
                      pickerTimeSuffix: null,
                      showTimepicker: !0,
                      timezoneList: null,
                      addSliderAccess: !1,
                      sliderAccessArgs: null,
                      controlType: 'slider',
                      oneLine: !1,
                      defaultValue: null,
                      parse: 'strict',
                      afterInject: null,
                  }),
                  $.extend(this._defaults, this.regional['']);
          };
          $.extend(Timepicker.prototype, {
              $input: null,
              $altInput: null,
              $timeObj: null,
              inst: null,
              hour_slider: null,
              minute_slider: null,
              second_slider: null,
              millisec_slider: null,
              microsec_slider: null,
              timezone_select: null,
              maxTime: null,
              minTime: null,
              hour: 0,
              minute: 0,
              second: 0,
              millisec: 0,
              microsec: 0,
              timezone: null,
              hourMinOriginal: null,
              minuteMinOriginal: null,
              secondMinOriginal: null,
              millisecMinOriginal: null,
              microsecMinOriginal: null,
              hourMaxOriginal: null,
              minuteMaxOriginal: null,
              secondMaxOriginal: null,
              millisecMaxOriginal: null,
              microsecMaxOriginal: null,
              ampm: '',
              formattedDate: '',
              formattedTime: '',
              formattedDateTime: '',
              timezoneList: null,
              units: ['hour', 'minute', 'second', 'millisec', 'microsec'],
              support: {},
              control: null,
              setDefaults: function (a) {
                  return extendRemove(this._defaults, a || {}), this;
              },
              _newInst: function ($input, opts) {
                  var tp_inst = new Timepicker(),
                      inlineSettings = {},
                      fns = {},
                      overrides,
                      i;
                  for (var attrName in this._defaults)
                      if (this._defaults.hasOwnProperty(attrName)) {
                          var attrValue = $input.attr('time:' + attrName);
                          if (attrValue)
                              try {
                                  inlineSettings[attrName] = eval(attrValue);
                              } catch (a) {
                                  inlineSettings[attrName] = attrValue;
                              }
                      }
                  overrides = {
                      beforeShow: function (a, b) {
                          if ($.isFunction(tp_inst._defaults.evnts.beforeShow))
                              return tp_inst._defaults.evnts.beforeShow.call(
                                  $input[0],
                                  a,
                                  b,
                                  tp_inst
                              );
                      },
                      onChangeMonthYear: function (a, b, c) {
                          $.isFunction(
                              tp_inst._defaults.evnts.onChangeMonthYear
                          ) &&
                              tp_inst._defaults.evnts.onChangeMonthYear.call(
                                  $input[0],
                                  a,
                                  b,
                                  c,
                                  tp_inst
                              );
                      },
                      onClose: function (a, b) {
                          tp_inst.timeDefined === !0 &&
                              '' !== $input.val() &&
                              tp_inst._updateDateTime(b),
                              $.isFunction(tp_inst._defaults.evnts.onClose) &&
                                  tp_inst._defaults.evnts.onClose.call(
                                      $input[0],
                                      a,
                                      b,
                                      tp_inst
                                  );
                      },
                  };
                  for (i in overrides)
                      overrides.hasOwnProperty(i) &&
                          (fns[i] = opts[i] || this._defaults[i] || null);
                  (tp_inst._defaults = $.extend(
                      {},
                      this._defaults,
                      inlineSettings,
                      opts,
                      overrides,
                      { evnts: fns, timepicker: tp_inst }
                  )),
                      (tp_inst.amNames = $.map(
                          tp_inst._defaults.amNames,
                          function (a) {
                              return a.toUpperCase();
                          }
                      )),
                      (tp_inst.pmNames = $.map(
                          tp_inst._defaults.pmNames,
                          function (a) {
                              return a.toUpperCase();
                          }
                      )),
                      (tp_inst.support = detectSupport(
                          tp_inst._defaults.timeFormat +
                              (tp_inst._defaults.pickerTimeFormat
                                  ? tp_inst._defaults.pickerTimeFormat
                                  : '') +
                              (tp_inst._defaults.altTimeFormat
                                  ? tp_inst._defaults.altTimeFormat
                                  : '')
                      )),
                      'string' == typeof tp_inst._defaults.controlType
                          ? ('slider' === tp_inst._defaults.controlType &&
                                'undefined' == typeof $.ui.slider &&
                                (tp_inst._defaults.controlType = 'select'),
                            (tp_inst.control =
                                tp_inst._controls[tp_inst._defaults.controlType]))
                          : (tp_inst.control = tp_inst._defaults.controlType);
                  var timezoneList = [
                      -720,
                      -660,
                      -600,
                      -570,
                      -540,
                      -480,
                      -420,
                      -360,
                      -300,
                      -270,
                      -240,
                      -210,
                      -180,
                      -120,
                      -60,
                      0,
                      60,
                      120,
                      180,
                      210,
                      240,
                      270,
                      300,
                      330,
                      345,
                      360,
                      390,
                      420,
                      480,
                      525,
                      540,
                      570,
                      600,
                      630,
                      660,
                      690,
                      720,
                      765,
                      780,
                      840,
                  ];
                  null !== tp_inst._defaults.timezoneList &&
                      (timezoneList = tp_inst._defaults.timezoneList);
                  var tzl = timezoneList.length,
                      tzi = 0,
                      tzv = null;
                  if (tzl > 0 && 'object' != typeof timezoneList[0])
                      for (; tzi < tzl; tzi++)
                          (tzv = timezoneList[tzi]),
                              (timezoneList[tzi] = {
                                  value: tzv,
                                  label: $.timepicker.timezoneOffsetString(
                                      tzv,
                                      tp_inst.support.iso8601
                                  ),
                              });
                  return (
                      (tp_inst._defaults.timezoneList = timezoneList),
                      (tp_inst.timezone =
                          null !== tp_inst._defaults.timezone
                              ? $.timepicker.timezoneOffsetNumber(
                                    tp_inst._defaults.timezone
                                )
                              : new Date().getTimezoneOffset() * -1),
                      (tp_inst.hour =
                          tp_inst._defaults.hour < tp_inst._defaults.hourMin
                              ? tp_inst._defaults.hourMin
                              : tp_inst._defaults.hour > tp_inst._defaults.hourMax
                              ? tp_inst._defaults.hourMax
                              : tp_inst._defaults.hour),
                      (tp_inst.minute =
                          tp_inst._defaults.minute < tp_inst._defaults.minuteMin
                              ? tp_inst._defaults.minuteMin
                              : tp_inst._defaults.minute >
                                tp_inst._defaults.minuteMax
                              ? tp_inst._defaults.minuteMax
                              : tp_inst._defaults.minute),
                      (tp_inst.second =
                          tp_inst._defaults.second < tp_inst._defaults.secondMin
                              ? tp_inst._defaults.secondMin
                              : tp_inst._defaults.second >
                                tp_inst._defaults.secondMax
                              ? tp_inst._defaults.secondMax
                              : tp_inst._defaults.second),
                      (tp_inst.millisec =
                          tp_inst._defaults.millisec <
                          tp_inst._defaults.millisecMin
                              ? tp_inst._defaults.millisecMin
                              : tp_inst._defaults.millisec >
                                tp_inst._defaults.millisecMax
                              ? tp_inst._defaults.millisecMax
                              : tp_inst._defaults.millisec),
                      (tp_inst.microsec =
                          tp_inst._defaults.microsec <
                          tp_inst._defaults.microsecMin
                              ? tp_inst._defaults.microsecMin
                              : tp_inst._defaults.microsec >
                                tp_inst._defaults.microsecMax
                              ? tp_inst._defaults.microsecMax
                              : tp_inst._defaults.microsec),
                      (tp_inst.ampm = ''),
                      (tp_inst.$input = $input),
                      tp_inst._defaults.altField &&
                          ((tp_inst.$altInput = $(tp_inst._defaults.altField)),
                          tp_inst._defaults.altRedirectFocus === !0 &&
                              tp_inst.$altInput
                                  .css({ cursor: 'pointer' })
                                  .focus(function () {
                                      $input.trigger('focus');
                                  })),
                      (0 !== tp_inst._defaults.minDate &&
                          0 !== tp_inst._defaults.minDateTime) ||
                          (tp_inst._defaults.minDate = new Date()),
                      (0 !== tp_inst._defaults.maxDate &&
                          0 !== tp_inst._defaults.maxDateTime) ||
                          (tp_inst._defaults.maxDate = new Date()),
                      void 0 !== tp_inst._defaults.minDate &&
                          tp_inst._defaults.minDate instanceof Date &&
                          (tp_inst._defaults.minDateTime = new Date(
                              tp_inst._defaults.minDate.getTime()
                          )),
                      void 0 !== tp_inst._defaults.minDateTime &&
                          tp_inst._defaults.minDateTime instanceof Date &&
                          (tp_inst._defaults.minDate = new Date(
                              tp_inst._defaults.minDateTime.getTime()
                          )),
                      void 0 !== tp_inst._defaults.maxDate &&
                          tp_inst._defaults.maxDate instanceof Date &&
                          (tp_inst._defaults.maxDateTime = new Date(
                              tp_inst._defaults.maxDate.getTime()
                          )),
                      void 0 !== tp_inst._defaults.maxDateTime &&
                          tp_inst._defaults.maxDateTime instanceof Date &&
                          (tp_inst._defaults.maxDate = new Date(
                              tp_inst._defaults.maxDateTime.getTime()
                          )),
                      tp_inst.$input.bind('focus', function () {
                          tp_inst._onFocus();
                      }),
                      tp_inst
                  );
              },
              _addTimePicker: function (a) {
                  var b = $.trim(
                      this.$altInput && this._defaults.altFieldTimeOnly
                          ? this.$input.val() + ' ' + this.$altInput.val()
                          : this.$input.val()
                  );
                  (this.timeDefined = this._parseTime(b)),
                      this._limitMinMaxDateTime(a, !1),
                      this._injectTimePicker(),
                      this._afterInject();
              },
              _parseTime: function (a, b) {
                  if (
                      (this.inst ||
                          (this.inst = $.datepicker._getInst(this.$input[0])),
                      b || !this._defaults.timeOnly)
                  ) {
                      var c = $.datepicker._get(this.inst, 'dateFormat');
                      try {
                          var d = parseDateTimeInternal(
                              c,
                              this._defaults.timeFormat,
                              a,
                              $.datepicker._getFormatConfig(this.inst),
                              this._defaults
                          );
                          if (!d.timeObj) return !1;
                          $.extend(this, d.timeObj);
                      } catch (b) {
                          return (
                              $.timepicker.log(
                                  'Error parsing the date/time string: ' +
                                      b +
                                      '\ndate/time string = ' +
                                      a +
                                      '\ntimeFormat = ' +
                                      this._defaults.timeFormat +
                                      '\ndateFormat = ' +
                                      c
                              ),
                              !1
                          );
                      }
                      return !0;
                  }
                  var e = $.datepicker.parseTime(
                      this._defaults.timeFormat,
                      a,
                      this._defaults
                  );
                  return !!e && ($.extend(this, e), !0);
              },
              _afterInject: function () {
                  var a = this.inst.settings;
                  $.isFunction(a.afterInject) && a.afterInject.call(this);
              },
              _injectTimePicker: function () {
                  var a = this.inst.dpDiv,
                      b = this.inst.settings,
                      c = this,
                      d = '',
                      e = '',
                      f = null,
                      g = {},
                      h = {},
                      i = null,
                      j = 0,
                      k = 0;
                  if (
                      0 === a.find('div.ui-timepicker-div').length &&
                      b.showTimepicker
                  ) {
                      var l = ' ui_tpicker_unit_hide',
                          m =
                              '<div class="ui-timepicker-div' +
                              (b.isRTL ? ' ui-timepicker-rtl' : '') +
                              (b.oneLine && 'select' === b.controlType
                                  ? ' ui-timepicker-oneLine'
                                  : '') +
                              '"><dl><dt class="ui_tpicker_time_label' +
                              (b.showTime ? '' : l) +
                              '">' +
                              b.timeText +
                              '</dt><dd class="ui_tpicker_time ' +
                              (b.showTime ? '' : l) +
                              '"><input class="ui_tpicker_time_input" ' +
                              (b.timeInput ? '' : 'disabled') +
                              '/></dd>';
                      for (j = 0, k = this.units.length; j < k; j++) {
                          if (
                              ((d = this.units[j]),
                              (e = d.substr(0, 1).toUpperCase() + d.substr(1)),
                              (f =
                                  null !== b['show' + e]
                                      ? b['show' + e]
                                      : this.support[d]),
                              (g[d] = parseInt(
                                  b[d + 'Max'] -
                                      ((b[d + 'Max'] - b[d + 'Min']) %
                                          b['step' + e]),
                                  10
                              )),
                              (h[d] = 0),
                              (m +=
                                  '<dt class="ui_tpicker_' +
                                  d +
                                  '_label' +
                                  (f ? '' : l) +
                                  '">' +
                                  b[d + 'Text'] +
                                  '</dt><dd class="ui_tpicker_' +
                                  d +
                                  (f ? '' : l) +
                                  '"><div class="ui_tpicker_' +
                                  d +
                                  '_slider' +
                                  (f ? '' : l) +
                                  '"></div>'),
                              f && b[d + 'Grid'] > 0)
                          ) {
                              if (
                                  ((m +=
                                      '<div style="padding-left: 1px"><table class="ui-tpicker-grid-label"><tr>'),
                                  'hour' === d)
                              )
                                  for (
                                      var n = b[d + 'Min'];
                                      n <= g[d];
                                      n += parseInt(b[d + 'Grid'], 10)
                                  ) {
                                      h[d]++;
                                      var o = $.datepicker.formatTime(
                                          this.support.ampm ? 'hht' : 'HH',
                                          { hour: n },
                                          b
                                      );
                                      m +=
                                          '<td data-for="' +
                                          d +
                                          '">' +
                                          o +
                                          '</td>';
                                  }
                              else
                                  for (
                                      var p = b[d + 'Min'];
                                      p <= g[d];
                                      p += parseInt(b[d + 'Grid'], 10)
                                  )
                                      h[d]++,
                                          (m +=
                                              '<td data-for="' +
                                              d +
                                              '">' +
                                              (p < 10 ? '0' : '') +
                                              p +
                                              '</td>');
                              m += '</tr></table></div>';
                          }
                          m += '</dd>';
                      }
                      var q =
                          null !== b.showTimezone
                              ? b.showTimezone
                              : this.support.timezone;
                      (m +=
                          '<dt class="ui_tpicker_timezone_label' +
                          (q ? '' : l) +
                          '">' +
                          b.timezoneText +
                          '</dt>'),
                          (m +=
                              '<dd class="ui_tpicker_timezone' +
                              (q ? '' : l) +
                              '"></dd>'),
                          (m += '</dl></div>');
                      var r = $(m);
                      for (
                          b.timeOnly === !0 &&
                              (r.prepend(
                                  '<div class="ui-widget-header ui-helper-clearfix ui-corner-all"><div class="ui-datepicker-title">' +
                                      b.timeOnlyTitle +
                                      '</div></div>'
                              ),
                              a
                                  .find(
                                      '.ui-datepicker-header, .ui-datepicker-calendar'
                                  )
                                  .hide()),
                              j = 0,
                              k = c.units.length;
                          j < k;
                          j++
                      )
                          (d = c.units[j]),
                              (e = d.substr(0, 1).toUpperCase() + d.substr(1)),
                              (f =
                                  null !== b['show' + e]
                                      ? b['show' + e]
                                      : this.support[d]),
                              (c[d + '_slider'] = c.control.create(
                                  c,
                                  r.find('.ui_tpicker_' + d + '_slider'),
                                  d,
                                  c[d],
                                  b[d + 'Min'],
                                  g[d],
                                  b['step' + e]
                              )),
                              f &&
                                  b[d + 'Grid'] > 0 &&
                                  ((i =
                                      (100 * h[d] * b[d + 'Grid']) /
                                      (g[d] - b[d + 'Min'])),
                                  r
                                      .find('.ui_tpicker_' + d + ' table')
                                      .css({
                                          width: i + '%',
                                          marginLeft: b.isRTL
                                              ? '0'
                                              : i / (-2 * h[d]) + '%',
                                          marginRight: b.isRTL
                                              ? i / (-2 * h[d]) + '%'
                                              : '0',
                                          borderCollapse: 'collapse',
                                      })
                                      .find('td')
                                      .on('click', function (a) {
                                          var b = $(this),
                                              e = b.html(),
                                              f = parseInt(
                                                  e.replace(/[^0-9]/g),
                                                  10
                                              ),
                                              g = e.replace(/[^apm]/gi),
                                              h = b.data('for');
                                          'hour' === h &&
                                              (g.indexOf('p') !== -1 && f < 12
                                                  ? (f += 12)
                                                  : g.indexOf('a') !== -1 &&
                                                    12 === f &&
                                                    (f = 0)),
                                              c.control.value(
                                                  c,
                                                  c[h + '_slider'],
                                                  d,
                                                  f
                                              ),
                                              c._onTimeChange(),
                                              c._onSelectHandler();
                                      })
                                      .css({
                                          cursor: 'pointer',
                                          width: 100 / h[d] + '%',
                                          textAlign: 'center',
                                          overflow: 'hidden',
                                      }));
                      if (
                          ((this.timezone_select = r
                              .find('.ui_tpicker_timezone')
                              .append('<select></select>')
                              .find('select')),
                          $.fn.append.apply(
                              this.timezone_select,
                              $.map(b.timezoneList, function (a, b) {
                                  return $('<option />')
                                      .val('object' == typeof a ? a.value : a)
                                      .text('object' == typeof a ? a.label : a);
                              })
                          ),
                          'undefined' != typeof this.timezone &&
                              null !== this.timezone &&
                              '' !== this.timezone)
                      ) {
                          var s =
                              new Date(
                                  this.inst.selectedYear,
                                  this.inst.selectedMonth,
                                  this.inst.selectedDay,
                                  12
                              ).getTimezoneOffset() * -1;
                          s === this.timezone
                              ? selectLocalTimezone(c)
                              : this.timezone_select.val(this.timezone);
                      } else
                          'undefined' != typeof this.hour &&
                          null !== this.hour &&
                          '' !== this.hour
                              ? this.timezone_select.val(b.timezone)
                              : selectLocalTimezone(c);
                      this.timezone_select.change(function () {
                          c._onTimeChange(),
                              c._onSelectHandler(),
                              c._afterInject();
                      });
                      var t = a.find('.ui-datepicker-buttonpane');
                      if (
                          (t.length ? t.before(r) : a.append(r),
                          (this.$timeObj = r.find('.ui_tpicker_time_input')),
                          this.$timeObj.change(function () {
                              var a = c.inst.settings.timeFormat,
                                  b = $.datepicker.parseTime(a, this.value),
                                  d = new Date();
                              b
                                  ? (d.setHours(b.hour),
                                    d.setMinutes(b.minute),
                                    d.setSeconds(b.second),
                                    $.datepicker._setTime(c.inst, d))
                                  : ((this.value = c.formattedTime),
                                    this.on('blur'));
                          }),
                          null !== this.inst)
                      ) {
                          var u = this.timeDefined;
                          this._onTimeChange(), (this.timeDefined = u);
                      }
                      if (this._defaults.addSliderAccess) {
                          var v = this._defaults.sliderAccessArgs,
                              w = this._defaults.isRTL;
                          (v.isRTL = w),
                              setTimeout(function () {
                                  if (0 === r.find('.ui-slider-access').length) {
                                      r.find('.ui-slider:visible').sliderAccess(
                                          v
                                      );
                                      var a = r
                                          .find('.ui-slider-access:eq(0)')
                                          .outerWidth(!0);
                                      a &&
                                          r
                                              .find('table:visible')
                                              .each(function () {
                                                  var b = $(this),
                                                      c = b.outerWidth(),
                                                      d = b
                                                          .css(
                                                              w
                                                                  ? 'marginRight'
                                                                  : 'marginLeft'
                                                          )
                                                          .toString()
                                                          .replace('%', ''),
                                                      e = c - a,
                                                      f = (d * e) / c + '%',
                                                      g = {
                                                          width: e,
                                                          marginRight: 0,
                                                          marginLeft: 0,
                                                      };
                                                  (g[
                                                      w
                                                          ? 'marginRight'
                                                          : 'marginLeft'
                                                  ] = f),
                                                      b.css(g);
                                              });
                                  }
                              }, 10);
                      }
                      c._limitMinMaxDateTime(this.inst, !0);
                  }
              },
              _limitMinMaxDateTime: function (a, b) {
                  var c = this._defaults,
                      d = new Date(
                          a.selectedYear,
                          a.selectedMonth,
                          a.selectedDay
                      );
                  if (this._defaults.showTimepicker) {
                      if (
                          null !== $.datepicker._get(a, 'minDateTime') &&
                          void 0 !== $.datepicker._get(a, 'minDateTime') &&
                          d
                      ) {
                          var e = $.datepicker._get(a, 'minDateTime'),
                              f = new Date(
                                  e.getFullYear(),
                                  e.getMonth(),
                                  e.getDate(),
                                  0,
                                  0,
                                  0,
                                  0
                              );
                          (null !== this.hourMinOriginal &&
                              null !== this.minuteMinOriginal &&
                              null !== this.secondMinOriginal &&
                              null !== this.millisecMinOriginal &&
                              null !== this.microsecMinOriginal) ||
                              ((this.hourMinOriginal = c.hourMin),
                              (this.minuteMinOriginal = c.minuteMin),
                              (this.secondMinOriginal = c.secondMin),
                              (this.millisecMinOriginal = c.millisecMin),
                              (this.microsecMinOriginal = c.microsecMin)),
                              a.settings.timeOnly || f.getTime() === d.getTime()
                                  ? ((this._defaults.hourMin = e.getHours()),
                                    this.hour <= this._defaults.hourMin
                                        ? ((this.hour = this._defaults.hourMin),
                                          (this._defaults.minuteMin = e.getMinutes()),
                                          this.minute <= this._defaults.minuteMin
                                              ? ((this.minute = this._defaults.minuteMin),
                                                (this._defaults.secondMin = e.getSeconds()),
                                                this.second <=
                                                this._defaults.secondMin
                                                    ? ((this.second = this._defaults.secondMin),
                                                      (this._defaults.millisecMin = e.getMilliseconds()),
                                                      this.millisec <=
                                                      this._defaults.millisecMin
                                                          ? ((this.millisec = this._defaults.millisecMin),
                                                            (this._defaults.microsecMin = e.getMicroseconds()))
                                                          : (this.microsec <
                                                                this._defaults
                                                                    .microsecMin &&
                                                                (this.microsec = this._defaults.microsecMin),
                                                            (this._defaults.microsecMin = this.microsecMinOriginal)))
                                                    : ((this._defaults.millisecMin = this.millisecMinOriginal),
                                                      (this._defaults.microsecMin = this.microsecMinOriginal)))
                                              : ((this._defaults.secondMin = this.secondMinOriginal),
                                                (this._defaults.millisecMin = this.millisecMinOriginal),
                                                (this._defaults.microsecMin = this.microsecMinOriginal)))
                                        : ((this._defaults.minuteMin = this.minuteMinOriginal),
                                          (this._defaults.secondMin = this.secondMinOriginal),
                                          (this._defaults.millisecMin = this.millisecMinOriginal),
                                          (this._defaults.microsecMin = this.microsecMinOriginal)))
                                  : ((this._defaults.hourMin = this.hourMinOriginal),
                                    (this._defaults.minuteMin = this.minuteMinOriginal),
                                    (this._defaults.secondMin = this.secondMinOriginal),
                                    (this._defaults.millisecMin = this.millisecMinOriginal),
                                    (this._defaults.microsecMin = this.microsecMinOriginal));
                      }
                      if (
                          null !== $.datepicker._get(a, 'maxDateTime') &&
                          void 0 !== $.datepicker._get(a, 'maxDateTime') &&
                          d
                      ) {
                          var g = $.datepicker._get(a, 'maxDateTime'),
                              h = new Date(
                                  g.getFullYear(),
                                  g.getMonth(),
                                  g.getDate(),
                                  0,
                                  0,
                                  0,
                                  0
                              );
                          (null !== this.hourMaxOriginal &&
                              null !== this.minuteMaxOriginal &&
                              null !== this.secondMaxOriginal &&
                              null !== this.millisecMaxOriginal) ||
                              ((this.hourMaxOriginal = c.hourMax),
                              (this.minuteMaxOriginal = c.minuteMax),
                              (this.secondMaxOriginal = c.secondMax),
                              (this.millisecMaxOriginal = c.millisecMax),
                              (this.microsecMaxOriginal = c.microsecMax)),
                              a.settings.timeOnly || h.getTime() === d.getTime()
                                  ? ((this._defaults.hourMax = g.getHours()),
                                    this.hour >= this._defaults.hourMax
                                        ? ((this.hour = this._defaults.hourMax),
                                          (this._defaults.minuteMax = g.getMinutes()),
                                          this.minute >= this._defaults.minuteMax
                                              ? ((this.minute = this._defaults.minuteMax),
                                                (this._defaults.secondMax = g.getSeconds()),
                                                this.second >=
                                                this._defaults.secondMax
                                                    ? ((this.second = this._defaults.secondMax),
                                                      (this._defaults.millisecMax = g.getMilliseconds()),
                                                      this.millisec >=
                                                      this._defaults.millisecMax
                                                          ? ((this.millisec = this._defaults.millisecMax),
                                                            (this._defaults.microsecMax = g.getMicroseconds()))
                                                          : (this.microsec >
                                                                this._defaults
                                                                    .microsecMax &&
                                                                (this.microsec = this._defaults.microsecMax),
                                                            (this._defaults.microsecMax = this.microsecMaxOriginal)))
                                                    : ((this._defaults.millisecMax = this.millisecMaxOriginal),
                                                      (this._defaults.microsecMax = this.microsecMaxOriginal)))
                                              : ((this._defaults.secondMax = this.secondMaxOriginal),
                                                (this._defaults.millisecMax = this.millisecMaxOriginal),
                                                (this._defaults.microsecMax = this.microsecMaxOriginal)))
                                        : ((this._defaults.minuteMax = this.minuteMaxOriginal),
                                          (this._defaults.secondMax = this.secondMaxOriginal),
                                          (this._defaults.millisecMax = this.millisecMaxOriginal),
                                          (this._defaults.microsecMax = this.microsecMaxOriginal)))
                                  : ((this._defaults.hourMax = this.hourMaxOriginal),
                                    (this._defaults.minuteMax = this.minuteMaxOriginal),
                                    (this._defaults.secondMax = this.secondMaxOriginal),
                                    (this._defaults.millisecMax = this.millisecMaxOriginal),
                                    (this._defaults.microsecMax = this.microsecMaxOriginal));
                      }
                      if (null !== a.settings.minTime) {
                          var i = new Date('01/01/1970 ' + a.settings.minTime);
                          this.hour < i.getHours()
                              ? ((this.hour = this._defaults.hourMin = i.getHours()),
                                (this.minute = this._defaults.minuteMin = i.getMinutes()))
                              : this.hour === i.getHours() &&
                                this.minute < i.getMinutes()
                              ? (this.minute = this._defaults.minuteMin = i.getMinutes())
                              : this._defaults.hourMin < i.getHours()
                              ? ((this._defaults.hourMin = i.getHours()),
                                (this._defaults.minuteMin = i.getMinutes()))
                              : (this._defaults.hourMin === i.getHours()) ===
                                    this.hour &&
                                this._defaults.minuteMin < i.getMinutes()
                              ? (this._defaults.minuteMin = i.getMinutes())
                              : (this._defaults.minuteMin = 0);
                      }
                      if (null !== a.settings.maxTime) {
                          var j = new Date('01/01/1970 ' + a.settings.maxTime);
                          this.hour > j.getHours()
                              ? ((this.hour = this._defaults.hourMax = j.getHours()),
                                (this.minute = this._defaults.minuteMax = j.getMinutes()))
                              : this.hour === j.getHours() &&
                                this.minute > j.getMinutes()
                              ? (this.minute = this._defaults.minuteMax = j.getMinutes())
                              : this._defaults.hourMax > j.getHours()
                              ? ((this._defaults.hourMax = j.getHours()),
                                (this._defaults.minuteMax = j.getMinutes()))
                              : (this._defaults.hourMax === j.getHours()) ===
                                    this.hour &&
                                this._defaults.minuteMax > j.getMinutes()
                              ? (this._defaults.minuteMax = j.getMinutes())
                              : (this._defaults.minuteMax = 59);
                      }
                      if (void 0 !== b && b === !0) {
                          var k = parseInt(
                                  this._defaults.hourMax -
                                      ((this._defaults.hourMax -
                                          this._defaults.hourMin) %
                                          this._defaults.stepHour),
                                  10
                              ),
                              l = parseInt(
                                  this._defaults.minuteMax -
                                      ((this._defaults.minuteMax -
                                          this._defaults.minuteMin) %
                                          this._defaults.stepMinute),
                                  10
                              ),
                              m = parseInt(
                                  this._defaults.secondMax -
                                      ((this._defaults.secondMax -
                                          this._defaults.secondMin) %
                                          this._defaults.stepSecond),
                                  10
                              ),
                              n = parseInt(
                                  this._defaults.millisecMax -
                                      ((this._defaults.millisecMax -
                                          this._defaults.millisecMin) %
                                          this._defaults.stepMillisec),
                                  10
                              ),
                              o = parseInt(
                                  this._defaults.microsecMax -
                                      ((this._defaults.microsecMax -
                                          this._defaults.microsecMin) %
                                          this._defaults.stepMicrosec),
                                  10
                              );
                          this.hour_slider &&
                              (this.control.options(
                                  this,
                                  this.hour_slider,
                                  'hour',
                                  {
                                      min: this._defaults.hourMin,
                                      max: k,
                                      step: this._defaults.stepHour,
                                  }
                              ),
                              this.control.value(
                                  this,
                                  this.hour_slider,
                                  'hour',
                                  this.hour -
                                      (this.hour % this._defaults.stepHour)
                              )),
                              this.minute_slider &&
                                  (this.control.options(
                                      this,
                                      this.minute_slider,
                                      'minute',
                                      {
                                          min: this._defaults.minuteMin,
                                          max: l,
                                          step: this._defaults.stepMinute,
                                      }
                                  ),
                                  this.control.value(
                                      this,
                                      this.minute_slider,
                                      'minute',
                                      this.minute -
                                          (this.minute %
                                              this._defaults.stepMinute)
                                  )),
                              this.second_slider &&
                                  (this.control.options(
                                      this,
                                      this.second_slider,
                                      'second',
                                      {
                                          min: this._defaults.secondMin,
                                          max: m,
                                          step: this._defaults.stepSecond,
                                      }
                                  ),
                                  this.control.value(
                                      this,
                                      this.second_slider,
                                      'second',
                                      this.second -
                                          (this.second %
                                              this._defaults.stepSecond)
                                  )),
                              this.millisec_slider &&
                                  (this.control.options(
                                      this,
                                      this.millisec_slider,
                                      'millisec',
                                      {
                                          min: this._defaults.millisecMin,
                                          max: n,
                                          step: this._defaults.stepMillisec,
                                      }
                                  ),
                                  this.control.value(
                                      this,
                                      this.millisec_slider,
                                      'millisec',
                                      this.millisec -
                                          (this.millisec %
                                              this._defaults.stepMillisec)
                                  )),
                              this.microsec_slider &&
                                  (this.control.options(
                                      this,
                                      this.microsec_slider,
                                      'microsec',
                                      {
                                          min: this._defaults.microsecMin,
                                          max: o,
                                          step: this._defaults.stepMicrosec,
                                      }
                                  ),
                                  this.control.value(
                                      this,
                                      this.microsec_slider,
                                      'microsec',
                                      this.microsec -
                                          (this.microsec %
                                              this._defaults.stepMicrosec)
                                  ));
                      }
                  }
              },
              _onTimeChange: function () {
                  if (this._defaults.showTimepicker) {
                      var a =
                              !!this.hour_slider &&
                              this.control.value(this, this.hour_slider, 'hour'),
                          b =
                              !!this.minute_slider &&
                              this.control.value(
                                  this,
                                  this.minute_slider,
                                  'minute'
                              ),
                          c =
                              !!this.second_slider &&
                              this.control.value(
                                  this,
                                  this.second_slider,
                                  'second'
                              ),
                          d =
                              !!this.millisec_slider &&
                              this.control.value(
                                  this,
                                  this.millisec_slider,
                                  'millisec'
                              ),
                          e =
                              !!this.microsec_slider &&
                              this.control.value(
                                  this,
                                  this.microsec_slider,
                                  'microsec'
                              ),
                          f =
                              !!this.timezone_select &&
                              this.timezone_select.val(),
                          g = this._defaults,
                          h = g.pickerTimeFormat || g.timeFormat,
                          i = g.pickerTimeSuffix || g.timeSuffix;
                      'object' == typeof a && (a = !1),
                          'object' == typeof b && (b = !1),
                          'object' == typeof c && (c = !1),
                          'object' == typeof d && (d = !1),
                          'object' == typeof e && (e = !1),
                          'object' == typeof f && (f = !1),
                          a !== !1 && (a = parseInt(a, 10)),
                          b !== !1 && (b = parseInt(b, 10)),
                          c !== !1 && (c = parseInt(c, 10)),
                          d !== !1 && (d = parseInt(d, 10)),
                          e !== !1 && (e = parseInt(e, 10)),
                          f !== !1 && (f = f.toString());
                      var j = g[a < 12 ? 'amNames' : 'pmNames'][0],
                          k =
                              a !== parseInt(this.hour, 10) ||
                              b !== parseInt(this.minute, 10) ||
                              c !== parseInt(this.second, 10) ||
                              d !== parseInt(this.millisec, 10) ||
                              e !== parseInt(this.microsec, 10) ||
                              (this.ampm.length > 0 &&
                                  a < 12 !=
                                      ($.inArray(
                                          this.ampm.toUpperCase(),
                                          this.amNames
                                      ) !==
                                          -1)) ||
                              (null !== this.timezone &&
                                  f !== this.timezone.toString());
                      if (
                          (k &&
                              (a !== !1 && (this.hour = a),
                              b !== !1 && (this.minute = b),
                              c !== !1 && (this.second = c),
                              d !== !1 && (this.millisec = d),
                              e !== !1 && (this.microsec = e),
                              f !== !1 && (this.timezone = f),
                              this.inst ||
                                  (this.inst = $.datepicker._getInst(
                                      this.$input[0]
                                  )),
                              this._limitMinMaxDateTime(this.inst, !0)),
                          this.support.ampm && (this.ampm = j),
                          (this.formattedTime = $.datepicker.formatTime(
                              g.timeFormat,
                              this,
                              g
                          )),
                          this.$timeObj &&
                              (h === g.timeFormat
                                  ? this.$timeObj.val(this.formattedTime + i)
                                  : this.$timeObj.val(
                                        $.datepicker.formatTime(h, this, g) + i
                                    ),
                              this.$timeObj[0].setSelectionRange))
                      ) {
                          var l = this.$timeObj[0].selectionStart,
                              m = this.$timeObj[0].selectionEnd;
                          this.$timeObj[0].setSelectionRange(l, m);
                      }
                      (this.timeDefined = !0), k && this._updateDateTime();
                  }
              },
              _onSelectHandler: function () {
                  var a = this._defaults.onSelect || this.inst.settings.onSelect,
                      b = this.$input ? this.$input[0] : null;
                  a && b && a.apply(b, [this.formattedDateTime, this]);
              },
              _updateDateTime: function (a) {
                  a = this.inst || a;
                  var b =
                          a.currentYear > 0
                              ? new Date(
                                    a.currentYear,
                                    a.currentMonth,
                                    a.currentDay
                                )
                              : new Date(
                                    a.selectedYear,
                                    a.selectedMonth,
                                    a.selectedDay
                                ),
                      c = $.datepicker._daylightSavingAdjust(b),
                      d = $.datepicker._get(a, 'dateFormat'),
                      e = $.datepicker._getFormatConfig(a),
                      f = null !== c && this.timeDefined;
                  this.formattedDate = $.datepicker.formatDate(
                      d,
                      null === c ? new Date() : c,
                      e
                  );
                  var g = this.formattedDate;
                  if (
                      ('' === a.lastVal &&
                          ((a.currentYear = a.selectedYear),
                          (a.currentMonth = a.selectedMonth),
                          (a.currentDay = a.selectedDay)),
                      this._defaults.timeOnly === !0 &&
                      this._defaults.timeOnlyShowDate === !1
                          ? (g = this.formattedTime)
                          : ((this._defaults.timeOnly !== !0 &&
                                (this._defaults.alwaysSetTime || f)) ||
                                (this._defaults.timeOnly === !0 &&
                                    this._defaults.timeOnlyShowDate === !0)) &&
                            (g +=
                                this._defaults.separator +
                                this.formattedTime +
                                this._defaults.timeSuffix),
                      (this.formattedDateTime = g),
                      this._defaults.showTimepicker)
                  )
                      if (
                          this.$altInput &&
                          this._defaults.timeOnly === !1 &&
                          this._defaults.altFieldTimeOnly === !0
                      )
                          this.$altInput.val(this.formattedTime),
                              this.$input.val(this.formattedDate);
                      else if (this.$altInput) {
                          this.$input.val(g);
                          var h = '',
                              i =
                                  null !== this._defaults.altSeparator
                                      ? this._defaults.altSeparator
                                      : this._defaults.separator,
                              j =
                                  null !== this._defaults.altTimeSuffix
                                      ? this._defaults.altTimeSuffix
                                      : this._defaults.timeSuffix;
                          this._defaults.timeOnly ||
                              ((h = this._defaults.altFormat
                                  ? $.datepicker.formatDate(
                                        this._defaults.altFormat,
                                        null === c ? new Date() : c,
                                        e
                                    )
                                  : this.formattedDate),
                              h && (h += i)),
                              (h +=
                                  null !== this._defaults.altTimeFormat
                                      ? $.datepicker.formatTime(
                                            this._defaults.altTimeFormat,
                                            this,
                                            this._defaults
                                        ) + j
                                      : this.formattedTime + j),
                              this.$altInput.val(h);
                      } else this.$input.val(g);
                  else this.$input.val(this.formattedDate);
                  this.$input.trigger('change');
              },
              _onFocus: function () {
                  if (!this.$input.val() && this._defaults.defaultValue) {
                      this.$input.val(this._defaults.defaultValue);
                      var a = $.datepicker._getInst(this.$input.get(0)),
                          b = $.datepicker._get(a, 'timepicker');
                      if (
                          b &&
                          b._defaults.timeOnly &&
                          a.input.val() !== a.lastVal
                      )
                          try {
                              $.datepicker._updateDatepicker(a);
                          } catch (a) {
                              $.timepicker.log(a);
                          }
                  }
              },
              _controls: {
                  slider: {
                      create: function (a, b, c, d, e, f, g) {
                          var h = a._defaults.isRTL;
                          return b.prop('slide', null).slider({
                              orientation: 'horizontal',
                              value: h ? d * -1 : d,
                              min: h ? f * -1 : e,
                              max: h ? e * -1 : f,
                              step: g,
                              slide: function (b, d) {
                                  a.control.value(
                                      a,
                                      $(this),
                                      c,
                                      h ? d.value * -1 : d.value
                                  ),
                                      a._onTimeChange();
                              },
                              stop: function (b, c) {
                                  a._onSelectHandler();
                              },
                          });
                      },
                      options: function (a, b, c, d, e) {
                          if (a._defaults.isRTL) {
                              if ('string' == typeof d)
                                  return 'min' === d || 'max' === d
                                      ? void 0 !== e
                                          ? b.slider(d, e * -1)
                                          : Math.abs(b.slider(d))
                                      : b.slider(d);
                              var f = d.min,
                                  g = d.max;
                              return (
                                  (d.min = d.max = null),
                                  void 0 !== f && (d.max = f * -1),
                                  void 0 !== g && (d.min = g * -1),
                                  b.slider(d)
                              );
                          }
                          return 'string' == typeof d && void 0 !== e
                              ? b.slider(d, e)
                              : b.slider(d);
                      },
                      value: function (a, b, c, d) {
                          return a._defaults.isRTL
                              ? void 0 !== d
                                  ? b.slider('value', d * -1)
                                  : Math.abs(b.slider('value'))
                              : void 0 !== d
                              ? b.slider('value', d)
                              : b.slider('value');
                      },
                  },
                  select: {
                      create: function (a, b, c, d, e, f, g) {
                          for (
                              var h =
                                      '<select class="ui-timepicker-select ui-state-default ui-corner-all" data-unit="' +
                                      c +
                                      '" data-min="' +
                                      e +
                                      '" data-max="' +
                                      f +
                                      '" data-step="' +
                                      g +
                                      '">',
                                  i =
                                      a._defaults.pickerTimeFormat ||
                                      a._defaults.timeFormat,
                                  j = e;
                              j <= f;
                              j += g
                          )
                              (h +=
                                  '<option value="' +
                                  j +
                                  '"' +
                                  (j === d ? ' selected' : '') +
                                  '>'),
                                  (h +=
                                      'hour' === c
                                          ? $.datepicker.formatTime(
                                                $.trim(i.replace(/[^ht ]/gi, '')),
                                                { hour: j },
                                                a._defaults
                                            )
                                          : 'millisec' === c ||
                                            'microsec' === c ||
                                            j >= 10
                                          ? j
                                          : '0' + j.toString()),
                                  (h += '</option>');
                          return (
                              (h += '</select>'),
                              b.children('select').remove(),
                              $(h)
                                  .appendTo(b)
                                  .change(function (b) {
                                      a._onTimeChange(),
                                          a._onSelectHandler(),
                                          a._afterInject();
                                  }),
                              b
                          );
                      },
                      options: function (a, b, c, d, e) {
                          var f = {},
                              g = b.children('select');
                          if ('string' == typeof d) {
                              if (void 0 === e) return g.data(d);
                              f[d] = e;
                          } else f = d;
                          return a.control.create(
                              a,
                              b,
                              g.data('unit'),
                              g.val(),
                              f.min >= 0 ? f.min : g.data('min'),
                              f.max || g.data('max'),
                              f.step || g.data('step')
                          );
                      },
                      value: function (a, b, c, d) {
                          var e = b.children('select');
                          return void 0 !== d ? e.val(d) : e.val();
                      },
                  },
              },
          }),
              $.fn.extend({
                  timepicker: function (a) {
                      a = a || {};
                      var b = Array.prototype.slice.call(arguments);
                      return (
                          'object' == typeof a &&
                              (b[0] = $.extend(a, { timeOnly: !0 })),
                          $(this).each(function () {
                              $.fn.datetimepicker.apply($(this), b);
                          })
                      );
                  },
                  datetimepicker: function (a) {
                      a = a || {};
                      var b = arguments;
                      return 'string' == typeof a
                          ? 'getDate' === a ||
                            ('option' === a &&
                                2 === b.length &&
                                'string' == typeof b[1])
                              ? $.fn.datepicker.apply($(this[0]), b)
                              : this.each(function () {
                                    var a = $(this);
                                    a.datepicker.apply(a, b);
                                })
                          : this.each(function () {
                                var b = $(this);
                                b.datepicker(
                                    $.timepicker._newInst(b, a)._defaults
                                );
                            });
                  },
              }),
              ($.datepicker.parseDateTime = function (a, b, c, d, e) {
                  var f = parseDateTimeInternal(a, b, c, d, e);
                  if (f.timeObj) {
                      var g = f.timeObj;
                      f.date.setHours(g.hour, g.minute, g.second, g.millisec),
                          f.date.setMicroseconds(g.microsec);
                  }
                  return f.date;
              }),
              ($.datepicker.parseTime = function (a, b, c) {
                  var d = extendRemove(
                          extendRemove({}, $.timepicker._defaults),
                          c || {}
                      ),
                      f =
                          (a.replace(/\'.*?\'/g, '').indexOf('Z') !== -1,
                          function (a, b, c) {
                              var i,
                                  d = function (a, b) {
                                      var c = [];
                                      return (
                                          a && $.merge(c, a),
                                          b && $.merge(c, b),
                                          (c = $.map(c, function (a) {
                                              return a.replace(
                                                  /[.*+?|()\[\]{}\\]/g,
                                                  '\\$&'
                                              );
                                          })),
                                          '(' + c.join('|') + ')?'
                                      );
                                  },
                                  e = function (a) {
                                      var b = a
                                              .toLowerCase()
                                              .match(
                                                  /(h{1,2}|m{1,2}|s{1,2}|l{1}|c{1}|t{1,2}|z|'.*?')/g
                                              ),
                                          c = {
                                              h: -1,
                                              m: -1,
                                              s: -1,
                                              l: -1,
                                              c: -1,
                                              t: -1,
                                              z: -1,
                                          };
                                      if (b)
                                          for (var d = 0; d < b.length; d++)
                                              c[b[d].toString().charAt(0)] ===
                                                  -1 &&
                                                  (c[b[d].toString().charAt(0)] =
                                                      d + 1);
                                      return c;
                                  },
                                  f =
                                      '^' +
                                      a
                                          .toString()
                                          .replace(
                                              /([hH]{1,2}|mm?|ss?|[tT]{1,2}|[zZ]|[lc]|'.*?')/g,
                                              function (a) {
                                                  var b = a.length;
                                                  switch (
                                                      a.charAt(0).toLowerCase()
                                                  ) {
                                                      case 'h':
                                                          return 1 === b
                                                              ? '(\\d?\\d)'
                                                              : '(\\d{' +
                                                                    b +
                                                                    '})';
                                                      case 'm':
                                                          return 1 === b
                                                              ? '(\\d?\\d)'
                                                              : '(\\d{' +
                                                                    b +
                                                                    '})';
                                                      case 's':
                                                          return 1 === b
                                                              ? '(\\d?\\d)'
                                                              : '(\\d{' +
                                                                    b +
                                                                    '})';
                                                      case 'l':
                                                          return '(\\d?\\d?\\d)';
                                                      case 'c':
                                                          return '(\\d?\\d?\\d)';
                                                      case 'z':
                                                          return '(z|[-+]\\d\\d:?\\d\\d|\\S+)?';
                                                      case 't':
                                                          return d(
                                                              c.amNames,
                                                              c.pmNames
                                                          );
                                                      default:
                                                          return (
                                                              '(' +
                                                              a
                                                                  .replace(
                                                                      /\'/g,
                                                                      ''
                                                                  )
                                                                  .replace(
                                                                      /(\.|\$|\^|\\|\/|\(|\)|\[|\]|\?|\+|\*)/g,
                                                                      function (
                                                                          a
                                                                      ) {
                                                                          return (
                                                                              '\\' +
                                                                              a
                                                                          );
                                                                      }
                                                                  ) +
                                                              ')?'
                                                          );
                                                  }
                                              }
                                          )
                                          .replace(/\s/g, '\\s?') +
                                      c.timeSuffix +
                                      '$',
                                  g = e(a),
                                  h = '';
                              i = b.match(new RegExp(f, 'i'));
                              var j = {
                                  hour: 0,
                                  minute: 0,
                                  second: 0,
                                  millisec: 0,
                                  microsec: 0,
                              };
                              return (
                                  !!i &&
                                  (g.t !== -1 &&
                                      (void 0 === i[g.t] || 0 === i[g.t].length
                                          ? ((h = ''), (j.ampm = ''))
                                          : ((h =
                                                $.inArray(
                                                    i[g.t].toUpperCase(),
                                                    $.map(c.amNames, function (
                                                        a,
                                                        b
                                                    ) {
                                                        return a.toUpperCase();
                                                    })
                                                ) !== -1
                                                    ? 'AM'
                                                    : 'PM'),
                                            (j.ampm =
                                                c[
                                                    'AM' === h
                                                        ? 'amNames'
                                                        : 'pmNames'
                                                ][0]))),
                                  g.h !== -1 &&
                                      ('AM' === h && '12' === i[g.h]
                                          ? (j.hour = 0)
                                          : 'PM' === h && '12' !== i[g.h]
                                          ? (j.hour = parseInt(i[g.h], 10) + 12)
                                          : (j.hour = Number(i[g.h]))),
                                  g.m !== -1 && (j.minute = Number(i[g.m])),
                                  g.s !== -1 && (j.second = Number(i[g.s])),
                                  g.l !== -1 && (j.millisec = Number(i[g.l])),
                                  g.c !== -1 && (j.microsec = Number(i[g.c])),
                                  g.z !== -1 &&
                                      void 0 !== i[g.z] &&
                                      (j.timezone = $.timepicker.timezoneOffsetNumber(
                                          i[g.z]
                                      )),
                                  j)
                              );
                          }),
                      g = function (a, b, c) {
                          try {
                              var d = new Date('2012-01-01 ' + b);
                              if (
                                  isNaN(d.getTime()) &&
                                  ((d = new Date('2012-01-01T' + b)),
                                  isNaN(d.getTime()) &&
                                      ((d = new Date('01/01/2012 ' + b)),
                                      isNaN(d.getTime())))
                              )
                                  throw (
                                      'Unable to parse time with native Date: ' +
                                      b
                                  );
                              return {
                                  hour: d.getHours(),
                                  minute: d.getMinutes(),
                                  second: d.getSeconds(),
                                  millisec: d.getMilliseconds(),
                                  microsec: d.getMicroseconds(),
                                  timezone: d.getTimezoneOffset() * -1,
                              };
                          } catch (d) {
                              try {
                                  return f(a, b, c);
                              } catch (c) {
                                  $.timepicker.log(
                                      'Unable to parse \ntimeString: ' +
                                          b +
                                          '\ntimeFormat: ' +
                                          a
                                  );
                              }
                          }
                          return !1;
                      };
                  return 'function' == typeof d.parse
                      ? d.parse(a, b, d)
                      : 'loose' === d.parse
                      ? g(a, b, d)
                      : f(a, b, d);
              }),
              ($.datepicker.formatTime = function (a, b, c) {
                  (c = c || {}),
                      (c = $.extend({}, $.timepicker._defaults, c)),
                      (b = $.extend(
                          {
                              hour: 0,
                              minute: 0,
                              second: 0,
                              millisec: 0,
                              microsec: 0,
                              timezone: null,
                          },
                          b
                      ));
                  var d = a,
                      e = c.amNames[0],
                      f = parseInt(b.hour, 10);
                  return (
                      f > 11 && (e = c.pmNames[0]),
                      (d = d.replace(
                          /(?:HH?|hh?|mm?|ss?|[tT]{1,2}|[zZ]|[lc]|'.*?')/g,
                          function (a) {
                              switch (a) {
                                  case 'HH':
                                      return ('0' + f).slice(-2);
                                  case 'H':
                                      return f;
                                  case 'hh':
                                      return ('0' + convert24to12(f)).slice(-2);
                                  case 'h':
                                      return convert24to12(f);
                                  case 'mm':
                                      return ('0' + b.minute).slice(-2);
                                  case 'm':
                                      return b.minute;
                                  case 'ss':
                                      return ('0' + b.second).slice(-2);
                                  case 's':
                                      return b.second;
                                  case 'l':
                                      return ('00' + b.millisec).slice(-3);
                                  case 'c':
                                      return ('00' + b.microsec).slice(-3);
                                  case 'z':
                                      return $.timepicker.timezoneOffsetString(
                                          null === b.timezone
                                              ? c.timezone
                                              : b.timezone,
                                          !1
                                      );
                                  case 'Z':
                                      return $.timepicker.timezoneOffsetString(
                                          null === b.timezone
                                              ? c.timezone
                                              : b.timezone,
                                          !0
                                      );
                                  case 'T':
                                      return e.charAt(0).toUpperCase();
                                  case 'TT':
                                      return e.toUpperCase();
                                  case 't':
                                      return e.charAt(0).toLowerCase();
                                  case 'tt':
                                      return e.toLowerCase();
                                  default:
                                      return a.replace(/'/g, '');
                              }
                          }
                      ))
                  );
              }),
              ($.datepicker._base_selectDate = $.datepicker._selectDate),
              ($.datepicker._selectDate = function (a, b) {
                  var e,
                      c = this._getInst($(a)[0]),
                      d = this._get(c, 'timepicker');
                  d && c.settings.showTimepicker
                      ? (d._limitMinMaxDateTime(c, !0),
                        (e = c.inline),
                        (c.inline = c.stay_open = !0),
                        this._base_selectDate(a, b),
                        (c.inline = e),
                        (c.stay_open = !1),
                        this._notifyChange(c),
                        this._updateDatepicker(c))
                      : this._base_selectDate(a, b);
              }),
              ($.datepicker._base_updateDatepicker =
                  $.datepicker._updateDatepicker),
              ($.datepicker._updateDatepicker = function (a) {
                  var b = a.input[0];
                  if (
                      !(
                          ($.datepicker._curInst &&
                              $.datepicker._curInst !== a &&
                              $.datepicker._datepickerShowing &&
                              $.datepicker._lastInput !== b) ||
                          ('boolean' == typeof a.stay_open && a.stay_open !== !1)
                      )
                  ) {
                      this._base_updateDatepicker(a);
                      var c = this._get(a, 'timepicker');
                      c && c._addTimePicker(a);
                  }
              }),
              ($.datepicker._base_doKeyPress = $.datepicker._doKeyPress),
              ($.datepicker._doKeyPress = function (a) {
                  var b = $.datepicker._getInst(a.target),
                      c = $.datepicker._get(b, 'timepicker');
                  if (c && $.datepicker._get(b, 'constrainInput')) {
                      var d = c.support.ampm,
                          e =
                              null !== c._defaults.showTimezone
                                  ? c._defaults.showTimezone
                                  : c.support.timezone,
                          f = $.datepicker._possibleChars(
                              $.datepicker._get(b, 'dateFormat')
                          ),
                          g =
                              c._defaults.timeFormat
                                  .toString()
                                  .replace(/[hms]/g, '')
                                  .replace(/TT/g, d ? 'APM' : '')
                                  .replace(/Tt/g, d ? 'AaPpMm' : '')
                                  .replace(/tT/g, d ? 'AaPpMm' : '')
                                  .replace(/T/g, d ? 'AP' : '')
                                  .replace(/tt/g, d ? 'apm' : '')
                                  .replace(/t/g, d ? 'ap' : '') +
                              ' ' +
                              c._defaults.separator +
                              c._defaults.timeSuffix +
                              (e ? c._defaults.timezoneList.join('') : '') +
                              c._defaults.amNames.join('') +
                              c._defaults.pmNames.join('') +
                              f,
                          h = String.fromCharCode(
                              void 0 === a.charCode ? a.keyCode : a.charCode
                          );
                      return a.ctrlKey || h < ' ' || !f || g.indexOf(h) > -1;
                  }
                  return $.datepicker._base_doKeyPress(a);
              }),
              ($.datepicker._base_updateAlternate =
                  $.datepicker._updateAlternate),
              ($.datepicker._updateAlternate = function (a) {
                  var b = this._get(a, 'timepicker');
                  if (b) {
                      var c = b._defaults.altField;
                      if (c) {
                          var e =
                                  (b._defaults.altFormat ||
                                      b._defaults.dateFormat,
                                  this._getDate(a)),
                              f = $.datepicker._getFormatConfig(a),
                              g = '',
                              h = b._defaults.altSeparator
                                  ? b._defaults.altSeparator
                                  : b._defaults.separator,
                              i = b._defaults.altTimeSuffix
                                  ? b._defaults.altTimeSuffix
                                  : b._defaults.timeSuffix,
                              j =
                                  null !== b._defaults.altTimeFormat
                                      ? b._defaults.altTimeFormat
                                      : b._defaults.timeFormat;
                          (g += $.datepicker.formatTime(j, b, b._defaults) + i),
                              b._defaults.timeOnly ||
                                  b._defaults.altFieldTimeOnly ||
                                  null === e ||
                                  (g = b._defaults.altFormat
                                      ? $.datepicker.formatDate(
                                            b._defaults.altFormat,
                                            e,
                                            f
                                        ) +
                                        h +
                                        g
                                      : b.formattedDate + h + g),
                              $(c).val(a.input.val() ? g : '');
                      }
                  } else $.datepicker._base_updateAlternate(a);
              }),
              ($.datepicker._base_doKeyUp = $.datepicker._doKeyUp),
              ($.datepicker._doKeyUp = function (a) {
                  var b = $.datepicker._getInst(a.target),
                      c = $.datepicker._get(b, 'timepicker');
                  if (c && c._defaults.timeOnly && b.input.val() !== b.lastVal)
                      try {
                          $.datepicker._updateDatepicker(b);
                      } catch (a) {
                          $.timepicker.log(a);
                      }
                  return $.datepicker._base_doKeyUp(a);
              }),
              ($.datepicker._base_gotoToday = $.datepicker._gotoToday),
              ($.datepicker._gotoToday = function (a) {
                  var b = this._getInst($(a)[0]);
                  this._base_gotoToday(a);
                  var c = this._get(b, 'timepicker');
                  if (c) {
                      var d = $.timepicker.timezoneOffsetNumber(c.timezone),
                          e = new Date();
                      e.setMinutes(
                          e.getMinutes() + e.getTimezoneOffset() + parseInt(d, 10)
                      ),
                          this._setTime(b, e),
                          this._setDate(b, e),
                          c._onSelectHandler();
                  }
              }),
              ($.datepicker._disableTimepickerDatepicker = function (a) {
                  var b = this._getInst(a);
                  if (b) {
                      var c = this._get(b, 'timepicker');
                      $(a).datepicker('getDate'),
                          c &&
                              ((b.settings.showTimepicker = !1),
                              (c._defaults.showTimepicker = !1),
                              c._updateDateTime(b));
                  }
              }),
              ($.datepicker._enableTimepickerDatepicker = function (a) {
                  var b = this._getInst(a);
                  if (b) {
                      var c = this._get(b, 'timepicker');
                      $(a).datepicker('getDate'),
                          c &&
                              ((b.settings.showTimepicker = !0),
                              (c._defaults.showTimepicker = !0),
                              c._addTimePicker(b),
                              c._updateDateTime(b));
                  }
              }),
              ($.datepicker._setTime = function (a, b) {
                  var c = this._get(a, 'timepicker');
                  if (c) {
                      var d = c._defaults;
                      (c.hour = b ? b.getHours() : d.hour),
                          (c.minute = b ? b.getMinutes() : d.minute),
                          (c.second = b ? b.getSeconds() : d.second),
                          (c.millisec = b ? b.getMilliseconds() : d.millisec),
                          (c.microsec = b ? b.getMicroseconds() : d.microsec),
                          c._limitMinMaxDateTime(a, !0),
                          c._onTimeChange(),
                          c._updateDateTime(a);
                  }
              }),
              ($.datepicker._setTimeDatepicker = function (a, b, c) {
                  var d = this._getInst(a);
                  if (d) {
                      var e = this._get(d, 'timepicker');
                      if (e) {
                          this._setDateFromField(d);
                          var f;
                          b &&
                              ('string' == typeof b
                                  ? (e._parseTime(b, c),
                                    (f = new Date()),
                                    f.setHours(
                                        e.hour,
                                        e.minute,
                                        e.second,
                                        e.millisec
                                    ),
                                    f.setMicroseconds(e.microsec))
                                  : ((f = new Date(b.getTime())),
                                    f.setMicroseconds(b.getMicroseconds())),
                              'Invalid Date' === f.toString() && (f = void 0),
                              this._setTime(d, f));
                      }
                  }
              }),
              ($.datepicker._base_setDateDatepicker =
                  $.datepicker._setDateDatepicker),
              ($.datepicker._setDateDatepicker = function (a, b) {
                  var c = this._getInst(a),
                      d = b;
                  if (c) {
                      'string' == typeof b &&
                          ((d = new Date(b)),
                          d.getTime() ||
                              (this._base_setDateDatepicker.apply(
                                  this,
                                  arguments
                              ),
                              (d = $(a).datepicker('getDate'))));
                      var f,
                          e = this._get(c, 'timepicker');
                      d instanceof Date
                          ? ((f = new Date(d.getTime())),
                            f.setMicroseconds(d.getMicroseconds()))
                          : (f = d),
                          e &&
                              f &&
                              (e.support.timezone ||
                                  null !== e._defaults.timezone ||
                                  (e.timezone = f.getTimezoneOffset() * -1),
                              (d = $.timepicker.timezoneAdjust(
                                  d,
                                  $.timepicker.timezoneOffsetString(
                                      -d.getTimezoneOffset()
                                  ),
                                  e.timezone
                              )),
                              (f = $.timepicker.timezoneAdjust(
                                  f,
                                  $.timepicker.timezoneOffsetString(
                                      -f.getTimezoneOffset()
                                  ),
                                  e.timezone
                              ))),
                          this._updateDatepicker(c),
                          this._base_setDateDatepicker.apply(this, arguments),
                          this._setTimeDatepicker(a, f, !0);
                  }
              }),
              ($.datepicker._base_getDateDatepicker =
                  $.datepicker._getDateDatepicker),
              ($.datepicker._getDateDatepicker = function (a, b) {
                  var c = this._getInst(a);
                  if (c) {
                      var d = this._get(c, 'timepicker');
                      if (d) {
                          void 0 === c.lastVal && this._setDateFromField(c, b);
                          var e = this._getDate(c),
                              f = null;
                          return (
                              (f =
                                  d.$altInput && d._defaults.altFieldTimeOnly
                                      ? d.$input.val() + ' ' + d.$altInput.val()
                                      : 'INPUT' !== d.$input.get(0).tagName &&
                                        d.$altInput
                                      ? d.$altInput.val()
                                      : d.$input.val()),
                              e &&
                                  d._parseTime(f, !c.settings.timeOnly) &&
                                  (e.setHours(
                                      d.hour,
                                      d.minute,
                                      d.second,
                                      d.millisec
                                  ),
                                  e.setMicroseconds(d.microsec),
                                  null != d.timezone &&
                                      (d.support.timezone ||
                                          null !== d._defaults.timezone ||
                                          (d.timezone =
                                              e.getTimezoneOffset() * -1),
                                      (e = $.timepicker.timezoneAdjust(
                                          e,
                                          d.timezone,
                                          $.timepicker.timezoneOffsetString(
                                              -e.getTimezoneOffset()
                                          )
                                      )))),
                              e
                          );
                      }
                      return this._base_getDateDatepicker(a, b);
                  }
              }),
              ($.datepicker._base_parseDate = $.datepicker.parseDate),
              ($.datepicker.parseDate = function (a, b, c) {
                  var d;
                  try {
                      d = this._base_parseDate(a, b, c);
                  } catch (e) {
                      if (!(e.indexOf(':') >= 0)) throw e;
                      (d = this._base_parseDate(
                          a,
                          b.substring(
                              0,
                              b.length - (e.length - e.indexOf(':') - 2)
                          ),
                          c
                      )),
                          $.timepicker.log(
                              'Error parsing the date string: ' +
                                  e +
                                  '\ndate string = ' +
                                  b +
                                  '\ndate format = ' +
                                  a
                          );
                  }
                  return d;
              }),
              ($.datepicker._base_formatDate = $.datepicker._formatDate),
              ($.datepicker._formatDate = function (a, b, c, d) {
                  var e = this._get(a, 'timepicker');
                  return e
                      ? (e._updateDateTime(a), e.$input.val())
                      : this._base_formatDate(a);
              }),
              ($.datepicker._base_optionDatepicker =
                  $.datepicker._optionDatepicker),
              ($.datepicker._optionDatepicker = function (a, b, c) {
                  var e,
                      d = this._getInst(a);
                  if (!d) return null;
                  var f = this._get(d, 'timepicker');
                  if (f) {
                      var l,
                          m,
                          n,
                          o,
                          g = null,
                          h = null,
                          i = null,
                          j = f._defaults.evnts,
                          k = {};
                      if ('string' == typeof b) {
                          if ('minDate' === b || 'minDateTime' === b) g = c;
                          else if ('maxDate' === b || 'maxDateTime' === b) h = c;
                          else if ('onSelect' === b) i = c;
                          else if (j.hasOwnProperty(b)) {
                              if ('undefined' == typeof c) return j[b];
                              (k[b] = c), (e = {});
                          }
                      } else if ('object' == typeof b) {
                          b.minDate
                              ? (g = b.minDate)
                              : b.minDateTime
                              ? (g = b.minDateTime)
                              : b.maxDate
                              ? (h = b.maxDate)
                              : b.maxDateTime && (h = b.maxDateTime);
                          for (l in j)
                              j.hasOwnProperty(l) && b[l] && (k[l] = b[l]);
                      }
                      for (l in k)
                          k.hasOwnProperty(l) &&
                              ((j[l] = k[l]),
                              e || (e = $.extend({}, b)),
                              delete e[l]);
                      if (e && isEmptyObject(e)) return;
                      if (
                          (g
                              ? ((g = 0 === g ? new Date() : new Date(g)),
                                (f._defaults.minDate = g),
                                (f._defaults.minDateTime = g))
                              : h
                              ? ((h = 0 === h ? new Date() : new Date(h)),
                                (f._defaults.maxDate = h),
                                (f._defaults.maxDateTime = h))
                              : i && (f._defaults.onSelect = i),
                          g || h)
                      )
                          return (
                              (o = $(a)),
                              (n = o.datetimepicker('getDate')),
                              (m = this._base_optionDatepicker.call(
                                  $.datepicker,
                                  a,
                                  e || b,
                                  c
                              )),
                              o.datetimepicker('setDate', n),
                              m
                          );
                  }
                  return void 0 === c
                      ? this._base_optionDatepicker.call($.datepicker, a, b)
                      : this._base_optionDatepicker.call(
                            $.datepicker,
                            a,
                            e || b,
                            c
                        );
              });
          var isEmptyObject = function (a) {
                  var b;
                  for (b in a) if (a.hasOwnProperty(b)) return !1;
                  return !0;
              },
              extendRemove = function (a, b) {
                  $.extend(a, b);
                  for (var c in b)
                      (null !== b[c] && void 0 !== b[c]) || (a[c] = b[c]);
                  return a;
              },
              detectSupport = function (a) {
                  var b = a.replace(/'.*?'/g, '').toLowerCase(),
                      c = function (a, b) {
                          return a.indexOf(b) !== -1;
                      };
                  return {
                      hour: c(b, 'h'),
                      minute: c(b, 'm'),
                      second: c(b, 's'),
                      millisec: c(b, 'l'),
                      microsec: c(b, 'c'),
                      timezone: c(b, 'z'),
                      ampm: c(b, 't') && c(a, 'h'),
                      iso8601: c(a, 'Z'),
                  };
              },
              convert24to12 = function (a) {
                  return (a %= 12), 0 === a && (a = 12), String(a);
              },
              computeEffectiveSetting = function (a, b) {
                  return a && a[b] ? a[b] : $.timepicker._defaults[b];
              },
              splitDateTime = function (a, b) {
                  var c = computeEffectiveSetting(b, 'separator'),
                      d = computeEffectiveSetting(b, 'timeFormat'),
                      e = d.split(c),
                      f = e.length,
                      g = a.split(c),
                      h = g.length;
                  return h > 1
                      ? {
                            dateString: g.splice(0, h - f).join(c),
                            timeString: g.splice(0, f).join(c),
                        }
                      : { dateString: a, timeString: '' };
              },
              parseDateTimeInternal = function (a, b, c, d, e) {
                  var f, g, h;
                  if (
                      ((g = splitDateTime(c, e)),
                      (f = $.datepicker._base_parseDate(a, g.dateString, d)),
                      '' === g.timeString)
                  )
                      return { date: f };
                  if (((h = $.datepicker.parseTime(b, g.timeString, e)), !h))
                      throw 'Wrong time format';
                  return { date: f, timeObj: h };
              },
              selectLocalTimezone = function (a, b) {
                  if (a && a.timezone_select) {
                      var c = b || new Date();
                      a.timezone_select.val(-c.getTimezoneOffset());
                  }
              };
          ($.timepicker = new Timepicker()),
              ($.timepicker.timezoneOffsetString = function (a, b) {
                  if (isNaN(a) || a > 840 || a < -720) return a;
                  var c = a,
                      d = c % 60,
                      e = (c - d) / 60,
                      f = b ? ':' : '',
                      g =
                          (c >= 0 ? '+' : '-') +
                          ('0' + Math.abs(e)).slice(-2) +
                          f +
                          ('0' + Math.abs(d)).slice(-2);
                  return '+00:00' === g ? 'Z' : g;
              }),
              ($.timepicker.timezoneOffsetNumber = function (a) {
                  var b = a.toString().replace(':', '');
                  return 'Z' === b.toUpperCase()
                      ? 0
                      : /^(\-|\+)\d{4}$/.test(b)
                      ? ('-' === b.substr(0, 1) ? -1 : 1) *
                        (60 * parseInt(b.substr(1, 2), 10) +
                            parseInt(b.substr(3, 2), 10))
                      : parseInt(a, 10);
              }),
              ($.timepicker.timezoneAdjust = function (a, b, c) {
                  var d = $.timepicker.timezoneOffsetNumber(b),
                      e = $.timepicker.timezoneOffsetNumber(c);
                  return isNaN(e) || a.setMinutes(a.getMinutes() + -d - -e), a;
              }),
              ($.timepicker.timeRange = function (a, b, c) {
                  return $.timepicker.handleRange('timepicker', a, b, c);
              }),
              ($.timepicker.datetimeRange = function (a, b, c) {
                  $.timepicker.handleRange('datetimepicker', a, b, c);
              }),
              ($.timepicker.dateRange = function (a, b, c) {
                  $.timepicker.handleRange('datepicker', a, b, c);
              }),
              ($.timepicker.handleRange = function (a, b, c, d) {
                  function f(e, f) {
                      var g = b[a]('getDate'),
                          h = c[a]('getDate'),
                          i = e[a]('getDate');
                      if (null !== g) {
                          var j = new Date(g.getTime()),
                              k = new Date(g.getTime());
                          j.setMilliseconds(j.getMilliseconds() + d.minInterval),
                              k.setMilliseconds(
                                  k.getMilliseconds() + d.maxInterval
                              ),
                              d.minInterval > 0 && j > h
                                  ? c[a]('setDate', j)
                                  : d.maxInterval > 0 && k < h
                                  ? c[a]('setDate', k)
                                  : g > h && f[a]('setDate', i);
                      }
                  }
                  function g(b, c, e) {
                      if (b.val()) {
                          var f = b[a].call(b, 'getDate');
                          null !== f &&
                              d.minInterval > 0 &&
                              ('minDate' === e &&
                                  f.setMilliseconds(
                                      f.getMilliseconds() + d.minInterval
                                  ),
                              'maxDate' === e &&
                                  f.setMilliseconds(
                                      f.getMilliseconds() - d.minInterval
                                  )),
                              f.getTime && c[a].call(c, 'option', e, f);
                      }
                  }
                  d = $.extend(
                      {},
                      { minInterval: 0, maxInterval: 0, start: {}, end: {} },
                      d
                  );
                  var e = !1;
                  return (
                      'timepicker' === a && ((e = !0), (a = 'datetimepicker')),
                      $.fn[a].call(
                          b,
                          $.extend(
                              {
                                  timeOnly: e,
                                  onClose: function (a, b) {
                                      f($(this), c);
                                  },
                                  onSelect: function (a) {
                                      g($(this), c, 'minDate');
                                  },
                              },
                              d,
                              d.start
                          )
                      ),
                      $.fn[a].call(
                          c,
                          $.extend(
                              {
                                  timeOnly: e,
                                  onClose: function (a, c) {
                                      f($(this), b);
                                  },
                                  onSelect: function (a) {
                                      g($(this), b, 'maxDate');
                                  },
                              },
                              d,
                              d.end
                          )
                      ),
                      f(b, c),
                      g(b, c, 'minDate'),
                      g(c, b, 'maxDate'),
                      $([b.get(0), c.get(0)])
                  );
              }),
              ($.timepicker.log = function () {
                  window.console &&
                      window.console.log &&
                      window.console.log.apply &&
                      window.console.log.apply(
                          window.console,
                          Array.prototype.slice.call(arguments)
                      );
              }),
              ($.timepicker._util = {
                  _extendRemove: extendRemove,
                  _isEmptyObject: isEmptyObject,
                  _convert24to12: convert24to12,
                  _detectSupport: detectSupport,
                  _selectLocalTimezone: selectLocalTimezone,
                  _computeEffectiveSetting: computeEffectiveSetting,
                  _splitDateTime: splitDateTime,
                  _parseDateTimeInternal: parseDateTimeInternal,
              }),
              Date.prototype.getMicroseconds ||
                  ((Date.prototype.microseconds = 0),
                  (Date.prototype.getMicroseconds = function () {
                      return this.microseconds;
                  }),
                  (Date.prototype.setMicroseconds = function (a) {
                      return (
                          this.setMilliseconds(
                              this.getMilliseconds() + Math.floor(a / 1e3)
                          ),
                          (this.microseconds = a % 1e3),
                          this
                      );
                  })),
              ($.timepicker.version = '1.6.3');
      }
  });
}
// perfect-scrollbar
{
  !(function t(e, n, r) {
      function o(l, s) {
          if (!n[l]) {
              if (!e[l]) {
                  var a = 'function' == typeof require && require;
                  if (!s && a) return a(l, !0);
                  if (i) return i(l, !0);
                  var c = new Error("Cannot find module '" + l + "'");
                  throw ((c.code = 'MODULE_NOT_FOUND'), c);
              }
              var u = (n[l] = { exports: {} });
              e[l][0].call(
                  u.exports,
                  function (t) {
                      var n = e[l][1][t];
                      return o(n || t);
                  },
                  u,
                  u.exports,
                  t,
                  e,
                  n,
                  r
              );
          }
          return n[l].exports;
      }
      for (
          var i = 'function' == typeof require && require, l = 0;
          l < r.length;
          l++
      )
          o(r[l]);
      return o;
  })(
      {
          1: [
              function (t, e, n) {
                  'use strict';
                  function r(t) {
                      t.fn.perfectScrollbar = function (e) {
                          return this.each(function () {
                              if ('object' == typeof e || void 0 === e) {
                                  var n = e;
                                  i.get(this) || o.initialize(this, n);
                              } else {
                                  var r = e;
                                  'update' === r
                                      ? o.update(this)
                                      : 'destroy' === r && o.destroy(this);
                              }
                              return t(this);
                          });
                      };
                  }
                  var o = t('../main'),
                      i = t('../plugin/instances');
                  if ('function' == typeof define && define.amd)
                      define(['jquery'], r);
                  else {
                      var l = window.jQuery ? window.jQuery : window.$;
                      void 0 !== l && r(l);
                  }
                  e.exports = r;
              },
              { '../main': 7, '../plugin/instances': 18 },
          ],
          2: [
              function (t, e, n) {
                  'use strict';
                  (n.add = function (t, e) {
                      t.classList
                          ? t.classList.add(e)
                          : (function (t, e) {
                                var n = t.className.split(' ');
                                n.indexOf(e) < 0 && n.push(e),
                                    (t.className = n.join(' '));
                            })(t, e);
                  }),
                      (n.remove = function (t, e) {
                          t.classList
                              ? t.classList.remove(e)
                              : (function (t, e) {
                                    var n = t.className.split(' '),
                                        r = n.indexOf(e);
                                    r >= 0 && n.splice(r, 1),
                                        (t.className = n.join(' '));
                                })(t, e);
                      }),
                      (n.list = function (t) {
                          return t.classList
                              ? Array.prototype.slice.apply(t.classList)
                              : t.className.split(' ');
                      });
              },
              {},
          ],
          3: [
              function (t, e, n) {
                  'use strict';
                  var r = {
                      e: function (t, e) {
                          var n = document.createElement(t);
                          return (n.className = e), n;
                      },
                      appendTo: function (t, e) {
                          return e.appendChild(t), t;
                      },
                  };
                  (r.css = function (t, e, n) {
                      return 'object' == typeof e
                          ? (function (t, e) {
                                for (var n in e) {
                                    var r = e[n];
                                    'number' == typeof r &&
                                        (r = r.toString() + 'px'),
                                        (t.style[n] = r);
                                }
                                return t;
                            })(t, e)
                          : void 0 === n
                          ? (function (t, e) {
                                return window.getComputedStyle(t)[e];
                            })(t, e)
                          : (function (t, e, n) {
                                return (
                                    'number' == typeof n &&
                                        (n = n.toString() + 'px'),
                                    (t.style[e] = n),
                                    t
                                );
                            })(t, e, n);
                  }),
                      (r.matches = function (t, e) {
                          return void 0 !== t.matches
                              ? t.matches(e)
                              : void 0 !== t.matchesSelector
                              ? t.matchesSelector(e)
                              : void 0 !== t.webkitMatchesSelector
                              ? t.webkitMatchesSelector(e)
                              : void 0 !== t.mozMatchesSelector
                              ? t.mozMatchesSelector(e)
                              : void 0 !== t.msMatchesSelector
                              ? t.msMatchesSelector(e)
                              : void 0;
                      }),
                      (r.remove = function (t) {
                          void 0 !== t.remove
                              ? t.remove()
                              : t.parentNode && t.parentNode.removeChild(t);
                      }),
                      (r.queryChildren = function (t, e) {
                          return Array.prototype.filter.call(
                              t.childNodes,
                              function (t) {
                                  return r.matches(t, e);
                              }
                          );
                      }),
                      (e.exports = r);
              },
              {},
          ],
          4: [
              function (t, e, n) {
                  'use strict';
                  var r = function (t) {
                      (this.element = t), (this.events = {});
                  };
                  (r.prototype.bind = function (t, e) {
                      void 0 === this.events[t] && (this.events[t] = []),
                          this.events[t].push(e),
                          this.element.addEventListener(t, e, !1);
                  }),
                      (r.prototype.unbind = function (t, e) {
                          var n = void 0 !== e;
                          this.events[t] = this.events[t].filter(function (r) {
                              return (
                                  !(!n || r === e) ||
                                  (this.element.removeEventListener(t, r, !1), !1)
                              );
                          }, this);
                      }),
                      (r.prototype.unbindAll = function () {
                          for (var t in this.events) this.unbind(t);
                      });
                  var o = function () {
                      this.eventElements = [];
                  };
                  (o.prototype.eventElement = function (t) {
                      var e = this.eventElements.filter(function (e) {
                          return e.element === t;
                      })[0];
                      return (
                          void 0 === e &&
                              ((e = new r(t)), this.eventElements.push(e)),
                          e
                      );
                  }),
                      (o.prototype.bind = function (t, e, n) {
                          this.eventElement(t).bind(e, n);
                      }),
                      (o.prototype.unbind = function (t, e, n) {
                          this.eventElement(t).unbind(e, n);
                      }),
                      (o.prototype.unbindAll = function () {
                          for (var t = 0; t < this.eventElements.length; t++)
                              this.eventElements[t].unbindAll();
                      }),
                      (o.prototype.once = function (t, e, n) {
                          var r = this.eventElement(t),
                              o = function (t) {
                                  r.unbind(e, o), n(t);
                              };
                          r.bind(e, o);
                      }),
                      (e.exports = o);
              },
              {},
          ],
          5: [
              function (t, e, n) {
                  'use strict';
                  e.exports = (function () {
                      function t() {
                          return Math.floor(65536 * (1 + Math.random()))
                              .toString(16)
                              .substring(1);
                      }
                      return function () {
                          return (
                              t() +
                              t() +
                              '-' +
                              t() +
                              '-' +
                              t() +
                              '-' +
                              t() +
                              '-' +
                              t() +
                              t() +
                              t()
                          );
                      };
                  })();
              },
              {},
          ],
          6: [
              function (t, e, n) {
                  'use strict';
                  var r = t('./class'),
                      o = t('./dom');
                  (n.toInt = function (t) {
                      return parseInt(t, 10) || 0;
                  }),
                      (n.clone = function (t) {
                          if (null === t) return null;
                          if ('object' == typeof t) {
                              var e = {};
                              for (var n in t) e[n] = this.clone(t[n]);
                              return e;
                          }
                          return t;
                      }),
                      (n.extend = function (t, e) {
                          var n = this.clone(t);
                          for (var r in e) n[r] = this.clone(e[r]);
                          return n;
                      }),
                      (n.isEditable = function (t) {
                          return (
                              o.matches(t, 'input,[contenteditable]') ||
                              o.matches(t, 'select,[contenteditable]') ||
                              o.matches(t, 'textarea,[contenteditable]') ||
                              o.matches(t, 'button,[contenteditable]')
                          );
                      }),
                      (n.removePsClasses = function (t) {
                          for (var e = r.list(t), n = 0; n < e.length; n++) {
                              var o = e[n];
                              0 === o.indexOf('ps-') && r.remove(t, o);
                          }
                      }),
                      (n.outerWidth = function (t) {
                          return (
                              this.toInt(o.css(t, 'width')) +
                              this.toInt(o.css(t, 'paddingLeft')) +
                              this.toInt(o.css(t, 'paddingRight')) +
                              this.toInt(o.css(t, 'borderLeftWidth')) +
                              this.toInt(o.css(t, 'borderRightWidth'))
                          );
                      }),
                      (n.startScrolling = function (t, e) {
                          r.add(t, 'ps-in-scrolling'),
                              void 0 !== e
                                  ? r.add(t, 'ps-' + e)
                                  : (r.add(t, 'ps-x'), r.add(t, 'ps-y'));
                      }),
                      (n.stopScrolling = function (t, e) {
                          r.remove(t, 'ps-in-scrolling'),
                              void 0 !== e
                                  ? r.remove(t, 'ps-' + e)
                                  : (r.remove(t, 'ps-x'), r.remove(t, 'ps-y'));
                      }),
                      (n.env = {
                          isWebKit:
                              'WebkitAppearance' in
                              document.documentElement.style,
                          supportsTouch:
                              'ontouchstart' in window ||
                              (window.DocumentTouch &&
                                  document instanceof window.DocumentTouch),
                          supportsIePointer:
                              null !== window.navigator.msMaxTouchPoints,
                      });
              },
              { './class': 2, './dom': 3 },
          ],
          7: [
              function (t, e, n) {
                  'use strict';
                  var r = t('./plugin/destroy'),
                      o = t('./plugin/initialize'),
                      i = t('./plugin/update');
                  e.exports = { initialize: o, update: i, destroy: r };
              },
              {
                  './plugin/destroy': 9,
                  './plugin/initialize': 17,
                  './plugin/update': 21,
              },
          ],
          8: [
              function (t, e, n) {
                  'use strict';
                  e.exports = {
                      maxScrollbarLength: null,
                      minScrollbarLength: null,
                      scrollXMarginOffset: 0,
                      scrollYMarginOffset: 0,
                      stopPropagationOnClick: !0,
                      suppressScrollX: !1,
                      suppressScrollY: !1,
                      swipePropagation: !0,
                      useBothWheelAxes: !1,
                      useKeyboard: !0,
                      useSelectionScroll: !1,
                      wheelPropagation: !1,
                      wheelSpeed: 1,
                  };
              },
              {},
          ],
          9: [
              function (t, e, n) {
                  'use strict';
                  var r = t('../lib/dom'),
                      o = t('../lib/helper'),
                      i = t('./instances');
                  e.exports = function (t) {
                      var e = i.get(t);
                      e &&
                          (e.event.unbindAll(),
                          r.remove(e.scrollbarX),
                          r.remove(e.scrollbarY),
                          r.remove(e.scrollbarXRail),
                          r.remove(e.scrollbarYRail),
                          o.removePsClasses(t),
                          i.remove(t));
                  };
              },
              { '../lib/dom': 3, '../lib/helper': 6, './instances': 18 },
          ],
          10: [
              function (t, e, n) {
                  'use strict';
                  var r = t('../../lib/helper'),
                      o = t('../instances'),
                      i = t('../update-geometry'),
                      l = t('../update-scroll');
                  e.exports = function (t) {
                      !(function (t, e) {
                          function n(t) {
                              return t.getBoundingClientRect();
                          }
                          var o = window.Event.prototype.stopPropagation.bind;
                          e.settings.stopPropagationOnClick &&
                              e.event.bind(e.scrollbarY, 'click', o),
                              e.event.bind(e.scrollbarYRail, 'click', function (
                                  o
                              ) {
                                  var s = r.toInt(e.scrollbarYHeight / 2),
                                      a =
                                          (e.railYRatio *
                                              (o.pageY -
                                                  window.pageYOffset -
                                                  n(e.scrollbarYRail).top -
                                                  s)) /
                                          (e.railYRatio *
                                              (e.railYHeight -
                                                  e.scrollbarYHeight));
                                  0 > a ? (a = 0) : a > 1 && (a = 1),
                                      l(
                                          t,
                                          'top',
                                          (e.contentHeight - e.containerHeight) *
                                              a
                                      ),
                                      i(t),
                                      o.stopPropagation();
                              }),
                              e.settings.stopPropagationOnClick &&
                                  e.event.bind(e.scrollbarX, 'click', o),
                              e.event.bind(e.scrollbarXRail, 'click', function (
                                  o
                              ) {
                                  var s = r.toInt(e.scrollbarXWidth / 2),
                                      a =
                                          (e.railXRatio *
                                              (o.pageX -
                                                  window.pageXOffset -
                                                  n(e.scrollbarXRail).left -
                                                  s)) /
                                          (e.railXRatio *
                                              (e.railXWidth - e.scrollbarXWidth));
                                  0 > a ? (a = 0) : a > 1 && (a = 1),
                                      l(
                                          t,
                                          'left',
                                          (e.contentWidth - e.containerWidth) *
                                              a -
                                              e.negativeScrollAdjustment
                                      ),
                                      i(t),
                                      o.stopPropagation();
                              });
                      })(t, o.get(t));
                  };
              },
              {
                  '../../lib/helper': 6,
                  '../instances': 18,
                  '../update-geometry': 19,
                  '../update-scroll': 20,
              },
          ],
          11: [
              function (t, e, n) {
                  'use strict';
                  var r = t('../../lib/dom'),
                      o = t('../../lib/helper'),
                      i = t('../instances'),
                      l = t('../update-geometry'),
                      s = t('../update-scroll');
                  e.exports = function (t) {
                      var e = i.get(t);
                      (function (t, e) {
                          function n(n) {
                              var r = i + n * e.railXRatio,
                                  l =
                                      Math.max(
                                          0,
                                          e.scrollbarXRail.getBoundingClientRect()
                                              .left
                                      ) +
                                      e.railXRatio *
                                          (e.railXWidth - e.scrollbarXWidth);
                              e.scrollbarXLeft = 0 > r ? 0 : r > l ? l : r;
                              var a =
                                  o.toInt(
                                      (e.scrollbarXLeft *
                                          (e.contentWidth - e.containerWidth)) /
                                          (e.containerWidth -
                                              e.railXRatio * e.scrollbarXWidth)
                                  ) - e.negativeScrollAdjustment;
                              s(t, 'left', a);
                          }
                          var i = null,
                              a = null,
                              c = function (e) {
                                  n(e.pageX - a),
                                      l(t),
                                      e.stopPropagation(),
                                      e.preventDefault();
                              },
                              u = function () {
                                  o.stopScrolling(t, 'x'),
                                      e.event.unbind(
                                          e.ownerDocument,
                                          'mousemove',
                                          c
                                      );
                              };
                          e.event.bind(e.scrollbarX, 'mousedown', function (n) {
                              (a = n.pageX),
                                  (i =
                                      o.toInt(r.css(e.scrollbarX, 'left')) *
                                      e.railXRatio),
                                  o.startScrolling(t, 'x'),
                                  e.event.bind(e.ownerDocument, 'mousemove', c),
                                  e.event.once(e.ownerDocument, 'mouseup', u),
                                  n.stopPropagation(),
                                  n.preventDefault();
                          });
                      })(t, e),
                          (function (t, e) {
                              function n(n) {
                                  var r = i + n * e.railYRatio,
                                      l =
                                          Math.max(
                                              0,
                                              e.scrollbarYRail.getBoundingClientRect()
                                                  .top
                                          ) +
                                          e.railYRatio *
                                              (e.railYHeight -
                                                  e.scrollbarYHeight);
                                  e.scrollbarYTop = 0 > r ? 0 : r > l ? l : r;
                                  var a = o.toInt(
                                      (e.scrollbarYTop *
                                          (e.contentHeight - e.containerHeight)) /
                                          (e.containerHeight -
                                              e.railYRatio * e.scrollbarYHeight)
                                  );
                                  s(t, 'top', a);
                              }
                              var i = null,
                                  a = null,
                                  c = function (e) {
                                      n(e.pageY - a),
                                          l(t),
                                          e.stopPropagation(),
                                          e.preventDefault();
                                  },
                                  u = function () {
                                      o.stopScrolling(t, 'y'),
                                          e.event.unbind(
                                              e.ownerDocument,
                                              'mousemove',
                                              c
                                          );
                                  };
                              e.event.bind(e.scrollbarY, 'mousedown', function (
                                  n
                              ) {
                                  (a = n.pageY),
                                      (i =
                                          o.toInt(r.css(e.scrollbarY, 'top')) *
                                          e.railYRatio),
                                      o.startScrolling(t, 'y'),
                                      e.event.bind(
                                          e.ownerDocument,
                                          'mousemove',
                                          c
                                      ),
                                      e.event.once(e.ownerDocument, 'mouseup', u),
                                      n.stopPropagation(),
                                      n.preventDefault();
                              });
                          })(t, e);
                  };
              },
              {
                  '../../lib/dom': 3,
                  '../../lib/helper': 6,
                  '../instances': 18,
                  '../update-geometry': 19,
                  '../update-scroll': 20,
              },
          ],
          12: [
              function (t, e, n) {
                  'use strict';
                  function r(t, e) {
                      var n = !1;
                      e.event.bind(t, 'mouseenter', function () {
                          n = !0;
                      }),
                          e.event.bind(t, 'mouseleave', function () {
                              n = !1;
                          });
                      e.event.bind(e.ownerDocument, 'keydown', function (r) {
                          if (
                              (!r.isDefaultPrevented ||
                                  !r.isDefaultPrevented()) &&
                              n
                          ) {
                              var i = document.activeElement
                                  ? document.activeElement
                                  : e.ownerDocument.activeElement;
                              if (i) {
                                  for (; i.shadowRoot; )
                                      i = i.shadowRoot.activeElement;
                                  if (o.isEditable(i)) return;
                              }
                              var a = 0,
                                  c = 0;
                              switch (r.which) {
                                  case 37:
                                      a = -30;
                                      break;
                                  case 38:
                                      c = 30;
                                      break;
                                  case 39:
                                      a = 30;
                                      break;
                                  case 40:
                                      c = -30;
                                      break;
                                  case 33:
                                      c = 90;
                                      break;
                                  case 32:
                                      c = r.shiftKey ? 90 : -90;
                                      break;
                                  case 34:
                                      c = -90;
                                      break;
                                  case 35:
                                      c = r.ctrlKey
                                          ? -e.contentHeight
                                          : -e.containerHeight;
                                      break;
                                  case 36:
                                      c = r.ctrlKey
                                          ? t.scrollTop
                                          : e.containerHeight;
                                      break;
                                  default:
                                      return;
                              }
                              s(t, 'top', t.scrollTop - c),
                                  s(t, 'left', t.scrollLeft + a),
                                  l(t),
                                  (function (n, r) {
                                      var o = t.scrollTop;
                                      if (0 === n) {
                                          if (!e.scrollbarYActive) return !1;
                                          if (
                                              (0 === o && r > 0) ||
                                              (o >=
                                                  e.contentHeight -
                                                      e.containerHeight &&
                                                  0 > r)
                                          )
                                              return !e.settings.wheelPropagation;
                                      }
                                      var i = t.scrollLeft;
                                      if (0 === r) {
                                          if (!e.scrollbarXActive) return !1;
                                          if (
                                              (0 === i && 0 > n) ||
                                              (i >=
                                                  e.contentWidth -
                                                      e.containerWidth &&
                                                  n > 0)
                                          )
                                              return !e.settings.wheelPropagation;
                                      }
                                      return !0;
                                  })(a, c) && r.preventDefault();
                          }
                      });
                  }
                  var o = t('../../lib/helper'),
                      i = t('../instances'),
                      l = t('../update-geometry'),
                      s = t('../update-scroll');
                  e.exports = function (t) {
                      r(t, i.get(t));
                  };
              },
              {
                  '../../lib/helper': 6,
                  '../instances': 18,
                  '../update-geometry': 19,
                  '../update-scroll': 20,
              },
          ],
          13: [
              function (t, e, n) {
                  'use strict';
                  function r(t, e) {
                      function n(n) {
                          var o = (function (t) {
                                  var e = t.deltaX,
                                      n = -1 * t.deltaY;
                                  return (
                                      (void 0 === e || void 0 === n) &&
                                          ((e = (-1 * t.wheelDeltaX) / 6),
                                          (n = t.wheelDeltaY / 6)),
                                      t.deltaMode &&
                                          1 === t.deltaMode &&
                                          ((e *= 10), (n *= 10)),
                                      e != e &&
                                          n != n &&
                                          ((e = 0), (n = t.wheelDelta)),
                                      [e, n]
                                  );
                              })(n),
                              s = o[0],
                              a = o[1];
                          (function (e, n) {
                              var r = t.querySelector('textarea:hover');
                              if (r) {
                                  var o = r.scrollHeight - r.clientHeight;
                                  if (
                                      o > 0 &&
                                      !(
                                          (0 === r.scrollTop && n > 0) ||
                                          (r.scrollTop === o && 0 > n)
                                      )
                                  )
                                      return !0;
                                  var i = r.scrollLeft - r.clientWidth;
                                  if (
                                      i > 0 &&
                                      !(
                                          (0 === r.scrollLeft && 0 > e) ||
                                          (r.scrollLeft === i && e > 0)
                                      )
                                  )
                                      return !0;
                              }
                              return !1;
                          })(s, a) ||
                              ((r = !1),
                              e.settings.useBothWheelAxes
                                  ? e.scrollbarYActive && !e.scrollbarXActive
                                      ? (l(
                                            t,
                                            'top',
                                            a
                                                ? t.scrollTop -
                                                      a * e.settings.wheelSpeed
                                                : t.scrollTop +
                                                      s * e.settings.wheelSpeed
                                        ),
                                        (r = !0))
                                      : e.scrollbarXActive &&
                                        !e.scrollbarYActive &&
                                        (l(
                                            t,
                                            'left',
                                            s
                                                ? t.scrollLeft +
                                                      s * e.settings.wheelSpeed
                                                : t.scrollLeft -
                                                      a * e.settings.wheelSpeed
                                        ),
                                        (r = !0))
                                  : (l(
                                        t,
                                        'top',
                                        t.scrollTop - a * e.settings.wheelSpeed
                                    ),
                                    l(
                                        t,
                                        'left',
                                        t.scrollLeft + s * e.settings.wheelSpeed
                                    )),
                              i(t),
                              (r =
                                  r ||
                                  (function (n, r) {
                                      var o = t.scrollTop;
                                      if (0 === n) {
                                          if (!e.scrollbarYActive) return !1;
                                          if (
                                              (0 === o && r > 0) ||
                                              (o >=
                                                  e.contentHeight -
                                                      e.containerHeight &&
                                                  0 > r)
                                          )
                                              return !e.settings.wheelPropagation;
                                      }
                                      var i = t.scrollLeft;
                                      if (0 === r) {
                                          if (!e.scrollbarXActive) return !1;
                                          if (
                                              (0 === i && 0 > n) ||
                                              (i >=
                                                  e.contentWidth -
                                                      e.containerWidth &&
                                                  n > 0)
                                          )
                                              return !e.settings.wheelPropagation;
                                      }
                                      return !0;
                                  })(s, a)) &&
                                  (n.stopPropagation(), n.preventDefault()));
                      }
                      var r = !1;
                      void 0 !== window.onwheel
                          ? e.event.bind(t, 'wheel', n)
                          : void 0 !== window.onmousewheel &&
                            e.event.bind(t, 'mousewheel', n);
                  }
                  var o = t('../instances'),
                      i = t('../update-geometry'),
                      l = t('../update-scroll');
                  e.exports = function (t) {
                      r(t, o.get(t));
                  };
              },
              {
                  '../instances': 18,
                  '../update-geometry': 19,
                  '../update-scroll': 20,
              },
          ],
          14: [
              function (t, e, n) {
                  'use strict';
                  var r = t('../instances'),
                      o = t('../update-geometry');
                  e.exports = function (t) {
                      !(function (t, e) {
                          e.event.bind(t, 'scroll', function () {
                              o(t);
                          });
                      })(t, r.get(t));
                  };
              },
              { '../instances': 18, '../update-geometry': 19 },
          ],
          15: [
              function (t, e, n) {
                  'use strict';
                  function r(t, e) {
                      function n() {
                          a ||
                              (a = setInterval(function () {
                                  return i.get(t)
                                      ? (s(t, 'top', t.scrollTop + c.top),
                                        s(t, 'left', t.scrollLeft + c.left),
                                        void l(t))
                                      : void clearInterval(a);
                              }, 50));
                      }
                      function r() {
                          a && (clearInterval(a), (a = null)), o.stopScrolling(t);
                      }
                      var a = null,
                          c = { top: 0, left: 0 },
                          u = !1;
                      e.event.bind(
                          e.ownerDocument,
                          'selectionchange',
                          function () {
                              t.contains(
                                  (function () {
                                      var t = window.getSelection
                                          ? window.getSelection()
                                          : document.getSelection
                                          ? document.getSelection()
                                          : '';
                                      return 0 === t.toString().length
                                          ? null
                                          : t.getRangeAt(0)
                                                .commonAncestorContainer;
                                  })()
                              )
                                  ? (u = !0)
                                  : ((u = !1), r());
                          }
                      ),
                          e.event.bind(window, 'mouseup', function () {
                              u && ((u = !1), r());
                          }),
                          e.event.bind(window, 'mousemove', function (e) {
                              if (u) {
                                  var i = { x: e.pageX, y: e.pageY },
                                      l = {
                                          left: t.offsetLeft,
                                          right: t.offsetLeft + t.offsetWidth,
                                          top: t.offsetTop,
                                          bottom: t.offsetTop + t.offsetHeight,
                                      };
                                  i.x < l.left + 3
                                      ? ((c.left = -5), o.startScrolling(t, 'x'))
                                      : i.x > l.right - 3
                                      ? ((c.left = 5), o.startScrolling(t, 'x'))
                                      : (c.left = 0),
                                      i.y < l.top + 3
                                          ? ((c.top =
                                                l.top + 3 - i.y < 5 ? -5 : -20),
                                            o.startScrolling(t, 'y'))
                                          : i.y > l.bottom - 3
                                          ? ((c.top =
                                                i.y - l.bottom + 3 < 5 ? 5 : 20),
                                            o.startScrolling(t, 'y'))
                                          : (c.top = 0),
                                      0 === c.top && 0 === c.left ? r() : n();
                              }
                          });
                  }
                  var o = t('../../lib/helper'),
                      i = t('../instances'),
                      l = t('../update-geometry'),
                      s = t('../update-scroll');
                  e.exports = function (t) {
                      r(t, i.get(t));
                  };
              },
              {
                  '../../lib/helper': 6,
                  '../instances': 18,
                  '../update-geometry': 19,
                  '../update-scroll': 20,
              },
          ],
          16: [
              function (t, e, n) {
                  'use strict';
                  function r(t, e, n, r) {
                      function s(n, r) {
                          var o = t.scrollTop,
                              i = t.scrollLeft,
                              l = Math.abs(n),
                              s = Math.abs(r);
                          if (s > l) {
                              if (
                                  (0 > r &&
                                      o ===
                                          e.contentHeight - e.containerHeight) ||
                                  (r > 0 && 0 === o)
                              )
                                  return !e.settings.swipePropagation;
                          } else if (
                              l > s &&
                              ((0 > n &&
                                  i === e.contentWidth - e.containerWidth) ||
                                  (n > 0 && 0 === i))
                          )
                              return !e.settings.swipePropagation;
                          return !0;
                      }
                      function a(e, n) {
                          l(t, 'top', t.scrollTop - n),
                              l(t, 'left', t.scrollLeft - e),
                              i(t);
                      }
                      function c() {
                          w = !0;
                      }
                      function u() {
                          w = !1;
                      }
                      function d(t) {
                          return t.targetTouches ? t.targetTouches[0] : t;
                      }
                      function p(t) {
                          return (
                              !(
                                  !t.targetTouches || 1 !== t.targetTouches.length
                              ) ||
                              !(
                                  !t.pointerType ||
                                  'mouse' === t.pointerType ||
                                  t.pointerType === t.MSPOINTER_TYPE_MOUSE
                              )
                          );
                      }
                      function h(t) {
                          if (p(t)) {
                              X = !0;
                              var e = d(t);
                              (b.pageX = e.pageX),
                                  (b.pageY = e.pageY),
                                  (g = new Date().getTime()),
                                  null !== Y && clearInterval(Y),
                                  t.stopPropagation();
                          }
                      }
                      function f(t) {
                          if (!w && X && p(t)) {
                              var e = d(t),
                                  n = { pageX: e.pageX, pageY: e.pageY },
                                  r = n.pageX - b.pageX,
                                  o = n.pageY - b.pageY;
                              a(r, o), (b = n);
                              var i = new Date().getTime(),
                                  l = i - g;
                              l > 0 && ((m.x = r / l), (m.y = o / l), (g = i)),
                                  s(r, o) &&
                                      (t.stopPropagation(), t.preventDefault());
                          }
                      }
                      function v() {
                          !w &&
                              X &&
                              ((X = !1),
                              clearInterval(Y),
                              (Y = setInterval(function () {
                                  return o.get(t)
                                      ? Math.abs(m.x) < 0.01 &&
                                        Math.abs(m.y) < 0.01
                                          ? void clearInterval(Y)
                                          : (a(30 * m.x, 30 * m.y),
                                            (m.x *= 0.8),
                                            void (m.y *= 0.8))
                                      : void clearInterval(Y);
                              }, 10)));
                      }
                      var b = {},
                          g = 0,
                          m = {},
                          Y = null,
                          w = !1,
                          X = !1;
                      n &&
                          (e.event.bind(window, 'touchstart', c),
                          e.event.bind(window, 'touchend', u),
                          e.event.bind(t, 'touchstart', h),
                          e.event.bind(t, 'touchmove', f),
                          e.event.bind(t, 'touchend', v)),
                          r &&
                              (window.PointerEvent
                                  ? (e.event.bind(window, 'pointerdown', c),
                                    e.event.bind(window, 'pointerup', u),
                                    e.event.bind(t, 'pointerdown', h),
                                    e.event.bind(t, 'pointermove', f),
                                    e.event.bind(t, 'pointerup', v))
                                  : window.MSPointerEvent &&
                                    (e.event.bind(window, 'MSPointerDown', c),
                                    e.event.bind(window, 'MSPointerUp', u),
                                    e.event.bind(t, 'MSPointerDown', h),
                                    e.event.bind(t, 'MSPointerMove', f),
                                    e.event.bind(t, 'MSPointerUp', v)));
                  }
                  var o = t('../instances'),
                      i = t('../update-geometry'),
                      l = t('../update-scroll');
                  e.exports = function (t, e, n) {
                      r(t, o.get(t), e, n);
                  };
              },
              {
                  '../instances': 18,
                  '../update-geometry': 19,
                  '../update-scroll': 20,
              },
          ],
          17: [
              function (t, e, n) {
                  'use strict';
                  var r = t('../lib/class'),
                      o = t('../lib/helper'),
                      i = t('./instances'),
                      l = t('./update-geometry'),
                      s = t('./handler/click-rail'),
                      a = t('./handler/drag-scrollbar'),
                      c = t('./handler/keyboard'),
                      u = t('./handler/mouse-wheel'),
                      d = t('./handler/native-scroll'),
                      p = t('./handler/selection'),
                      h = t('./handler/touch');
                  e.exports = function (t, e) {
                      (e = 'object' == typeof e ? e : {}),
                          r.add(t, 'ps-container');
                      var n = i.add(t);
                      (n.settings = o.extend(n.settings, e)),
                          s(t),
                          a(t),
                          u(t),
                          d(t),
                          n.settings.useSelectionScroll && p(t),
                          (o.env.supportsTouch || o.env.supportsIePointer) &&
                              h(t, o.env.supportsTouch, o.env.supportsIePointer),
                          n.settings.useKeyboard && c(t),
                          l(t);
                  };
              },
              {
                  '../lib/class': 2,
                  '../lib/helper': 6,
                  './handler/click-rail': 10,
                  './handler/drag-scrollbar': 11,
                  './handler/keyboard': 12,
                  './handler/mouse-wheel': 13,
                  './handler/native-scroll': 14,
                  './handler/selection': 15,
                  './handler/touch': 16,
                  './instances': 18,
                  './update-geometry': 19,
              },
          ],
          18: [
              function (t, e, n) {
                  'use strict';
                  function r(t) {
                      var e = this;
                      (e.settings = c.clone(l)),
                          (e.containerWidth = null),
                          (e.containerHeight = null),
                          (e.contentWidth = null),
                          (e.contentHeight = null),
                          (e.isRtl = 'rtl' === i.css(t, 'direction')),
                          (e.isNegativeScroll = (function () {
                              var e,
                                  n = t.scrollLeft;
                              return (
                                  (t.scrollLeft = -1),
                                  (e = t.scrollLeft < 0),
                                  (t.scrollLeft = n),
                                  e
                              );
                          })()),
                          (e.negativeScrollAdjustment = e.isNegativeScroll
                              ? t.scrollWidth - t.clientWidth
                              : 0),
                          (e.event = new s()),
                          (e.ownerDocument = t.ownerDocument || document),
                          (e.scrollbarXRail = i.appendTo(
                              i.e('div', 'ps-scrollbar-x-rail'),
                              t
                          )),
                          (e.scrollbarX = i.appendTo(
                              i.e('div', 'ps-scrollbar-x'),
                              e.scrollbarXRail
                          )),
                          e.scrollbarX.setAttribute('tabindex', 0),
                          (e.scrollbarXActive = null),
                          (e.scrollbarXWidth = null),
                          (e.scrollbarXLeft = null),
                          (e.scrollbarXBottom = c.toInt(
                              i.css(e.scrollbarXRail, 'bottom')
                          )),
                          (e.isScrollbarXUsingBottom =
                              e.scrollbarXBottom == e.scrollbarXBottom),
                          (e.scrollbarXTop = e.isScrollbarXUsingBottom
                              ? null
                              : c.toInt(i.css(e.scrollbarXRail, 'top'))),
                          (e.railBorderXWidth =
                              c.toInt(
                                  i.css(e.scrollbarXRail, 'borderLeftWidth')
                              ) +
                              c.toInt(
                                  i.css(e.scrollbarXRail, 'borderRightWidth')
                              )),
                          i.css(e.scrollbarXRail, 'display', 'block'),
                          (e.railXMarginWidth =
                              c.toInt(i.css(e.scrollbarXRail, 'marginLeft')) +
                              c.toInt(i.css(e.scrollbarXRail, 'marginRight'))),
                          i.css(e.scrollbarXRail, 'display', ''),
                          (e.railXWidth = null),
                          (e.railXRatio = null),
                          (e.scrollbarYRail = i.appendTo(
                              i.e('div', 'ps-scrollbar-y-rail'),
                              t
                          )),
                          (e.scrollbarY = i.appendTo(
                              i.e('div', 'ps-scrollbar-y'),
                              e.scrollbarYRail
                          )),
                          e.scrollbarY.setAttribute('tabindex', 0),
                          (e.scrollbarYActive = null),
                          (e.scrollbarYHeight = null),
                          (e.scrollbarYTop = null),
                          (e.scrollbarYRight = c.toInt(
                              i.css(e.scrollbarYRail, 'right')
                          )),
                          (e.isScrollbarYUsingRight =
                              e.scrollbarYRight == e.scrollbarYRight),
                          (e.scrollbarYLeft = e.isScrollbarYUsingRight
                              ? null
                              : c.toInt(i.css(e.scrollbarYRail, 'left'))),
                          (e.scrollbarYOuterWidth = e.isRtl
                              ? c.outerWidth(e.scrollbarY)
                              : null),
                          (e.railBorderYWidth =
                              c.toInt(i.css(e.scrollbarYRail, 'borderTopWidth')) +
                              c.toInt(
                                  i.css(e.scrollbarYRail, 'borderBottomWidth')
                              )),
                          i.css(e.scrollbarYRail, 'display', 'block'),
                          (e.railYMarginHeight =
                              c.toInt(i.css(e.scrollbarYRail, 'marginTop')) +
                              c.toInt(i.css(e.scrollbarYRail, 'marginBottom'))),
                          i.css(e.scrollbarYRail, 'display', ''),
                          (e.railYHeight = null),
                          (e.railYRatio = null);
                  }
                  function o(t) {
                      return void 0 === t.dataset
                          ? t.getAttribute('data-ps-id')
                          : t.dataset.psId;
                  }
                  var i = t('../lib/dom'),
                      l = t('./default-setting'),
                      s = t('../lib/event-manager'),
                      a = t('../lib/guid'),
                      c = t('../lib/helper'),
                      u = {};
                  (n.add = function (t) {
                      var e = a();
                      return (
                          (function (t, e) {
                              void 0 === t.dataset
                                  ? t.setAttribute('data-ps-id', e)
                                  : (t.dataset.psId = e);
                          })(t, e),
                          (u[e] = new r(t)),
                          u[e]
                      );
                  }),
                      (n.remove = function (t) {
                          delete u[o(t)],
                              (function (t) {
                                  void 0 === t.dataset
                                      ? t.removeAttribute('data-ps-id')
                                      : delete t.dataset.psId;
                              })(t);
                      }),
                      (n.get = function (t) {
                          return u[o(t)];
                      });
              },
              {
                  '../lib/dom': 3,
                  '../lib/event-manager': 4,
                  '../lib/guid': 5,
                  '../lib/helper': 6,
                  './default-setting': 8,
              },
          ],
          19: [
              function (t, e, n) {
                  'use strict';
                  function r(t, e) {
                      return (
                          t.settings.minScrollbarLength &&
                              (e = Math.max(e, t.settings.minScrollbarLength)),
                          t.settings.maxScrollbarLength &&
                              (e = Math.min(e, t.settings.maxScrollbarLength)),
                          e
                      );
                  }
                  var o = t('../lib/class'),
                      i = t('../lib/dom'),
                      l = t('../lib/helper'),
                      s = t('./instances'),
                      a = t('./update-scroll');
                  e.exports = function (t) {
                      var e,
                          n = s.get(t);
                      (n.containerWidth = t.clientWidth),
                          (n.containerHeight = t.clientHeight),
                          (n.contentWidth = t.scrollWidth),
                          (n.contentHeight = t.scrollHeight),
                          t.contains(n.scrollbarXRail) ||
                              ((e = i.queryChildren(t, '.ps-scrollbar-x-rail'))
                                  .length > 0 &&
                                  e.forEach(function (t) {
                                      i.remove(t);
                                  }),
                              i.appendTo(n.scrollbarXRail, t)),
                          t.contains(n.scrollbarYRail) ||
                              ((e = i.queryChildren(t, '.ps-scrollbar-y-rail'))
                                  .length > 0 &&
                                  e.forEach(function (t) {
                                      i.remove(t);
                                  }),
                              i.appendTo(n.scrollbarYRail, t)),
                          !n.settings.suppressScrollX &&
                          n.containerWidth + n.settings.scrollXMarginOffset <
                              n.contentWidth
                              ? ((n.scrollbarXActive = !0),
                                (n.railXWidth =
                                    n.containerWidth - n.railXMarginWidth),
                                (n.railXRatio = n.containerWidth / n.railXWidth),
                                (n.scrollbarXWidth = r(
                                    n,
                                    l.toInt(
                                        (n.railXWidth * n.containerWidth) /
                                            n.contentWidth
                                    )
                                )),
                                (n.scrollbarXLeft = l.toInt(
                                    ((n.negativeScrollAdjustment + t.scrollLeft) *
                                        (n.railXWidth - n.scrollbarXWidth)) /
                                        (n.contentWidth - n.containerWidth)
                                )))
                              : (n.scrollbarXActive = !1),
                          !n.settings.suppressScrollY &&
                          n.containerHeight + n.settings.scrollYMarginOffset <
                              n.contentHeight
                              ? ((n.scrollbarYActive = !0),
                                (n.railYHeight =
                                    n.containerHeight - n.railYMarginHeight),
                                (n.railYRatio =
                                    n.containerHeight / n.railYHeight),
                                (n.scrollbarYHeight = r(
                                    n,
                                    l.toInt(
                                        (n.railYHeight * n.containerHeight) /
                                            n.contentHeight
                                    )
                                )),
                                (n.scrollbarYTop = l.toInt(
                                    (t.scrollTop *
                                        (n.railYHeight - n.scrollbarYHeight)) /
                                        (n.contentHeight - n.containerHeight)
                                )))
                              : (n.scrollbarYActive = !1),
                          n.scrollbarXLeft >= n.railXWidth - n.scrollbarXWidth &&
                              (n.scrollbarXLeft =
                                  n.railXWidth - n.scrollbarXWidth),
                          n.scrollbarYTop >= n.railYHeight - n.scrollbarYHeight &&
                              (n.scrollbarYTop =
                                  n.railYHeight - n.scrollbarYHeight),
                          (function (t, e) {
                              var n = { width: e.railXWidth };
                              e.isRtl
                                  ? (n.left =
                                        e.negativeScrollAdjustment +
                                        t.scrollLeft +
                                        e.containerWidth -
                                        e.contentWidth)
                                  : (n.left = t.scrollLeft),
                                  e.isScrollbarXUsingBottom
                                      ? (n.bottom =
                                            e.scrollbarXBottom - t.scrollTop)
                                      : (n.top = e.scrollbarXTop + t.scrollTop),
                                  i.css(e.scrollbarXRail, n);
                              var r = { top: t.scrollTop, height: e.railYHeight };
                              e.isScrollbarYUsingRight
                                  ? e.isRtl
                                      ? (r.right =
                                            e.contentWidth -
                                            (e.negativeScrollAdjustment +
                                                t.scrollLeft) -
                                            e.scrollbarYRight -
                                            e.scrollbarYOuterWidth)
                                      : (r.right =
                                            e.scrollbarYRight - t.scrollLeft)
                                  : e.isRtl
                                  ? (r.left =
                                        e.negativeScrollAdjustment +
                                        t.scrollLeft +
                                        2 * e.containerWidth -
                                        e.contentWidth -
                                        e.scrollbarYLeft -
                                        e.scrollbarYOuterWidth)
                                  : (r.left = e.scrollbarYLeft + t.scrollLeft),
                                  i.css(e.scrollbarYRail, r),
                                  i.css(e.scrollbarX, {
                                      left: e.scrollbarXLeft,
                                      width:
                                          e.scrollbarXWidth - e.railBorderXWidth,
                                  }),
                                  i.css(e.scrollbarY, {
                                      top: e.scrollbarYTop,
                                      height:
                                          e.scrollbarYHeight - e.railBorderYWidth,
                                  });
                          })(t, n),
                          n.scrollbarXActive
                              ? o.add(t, 'ps-active-x')
                              : (o.remove(t, 'ps-active-x'),
                                (n.scrollbarXWidth = 0),
                                (n.scrollbarXLeft = 0),
                                a(t, 'left', 0)),
                          n.scrollbarYActive
                              ? o.add(t, 'ps-active-y')
                              : (o.remove(t, 'ps-active-y'),
                                (n.scrollbarYHeight = 0),
                                (n.scrollbarYTop = 0),
                                a(t, 'top', 0));
                  };
              },
              {
                  '../lib/class': 2,
                  '../lib/dom': 3,
                  '../lib/helper': 6,
                  './instances': 18,
                  './update-scroll': 20,
              },
          ],
          20: [
              function (t, e, n) {
                  'use strict';
                  var r,
                      o,
                      i = t('./instances'),
                      l = document.createEvent('Event'),
                      s = document.createEvent('Event'),
                      a = document.createEvent('Event'),
                      c = document.createEvent('Event'),
                      u = document.createEvent('Event'),
                      d = document.createEvent('Event'),
                      p = document.createEvent('Event'),
                      h = document.createEvent('Event'),
                      f = document.createEvent('Event'),
                      v = document.createEvent('Event');
                  l.initEvent('ps-scroll-up', !0, !0),
                      s.initEvent('ps-scroll-down', !0, !0),
                      a.initEvent('ps-scroll-left', !0, !0),
                      c.initEvent('ps-scroll-right', !0, !0),
                      u.initEvent('ps-scroll-y', !0, !0),
                      d.initEvent('ps-scroll-x', !0, !0),
                      p.initEvent('ps-x-reach-start', !0, !0),
                      h.initEvent('ps-x-reach-end', !0, !0),
                      f.initEvent('ps-y-reach-start', !0, !0),
                      v.initEvent('ps-y-reach-end', !0, !0),
                      (e.exports = function (t, e, n) {
                          if (void 0 === t)
                              throw 'You must provide an element to the update-scroll function';
                          if (void 0 === e)
                              throw 'You must provide an axis to the update-scroll function';
                          if (void 0 === n)
                              throw 'You must provide a value to the update-scroll function';
                          if ('top' === e && 0 >= n)
                              return (t.scrollTop = 0), void t.dispatchEvent(f);
                          if ('left' === e && 0 >= n)
                              return (t.scrollLeft = 0), void t.dispatchEvent(p);
                          var b = i.get(t);
                          return 'top' === e &&
                              n >= b.contentHeight - b.containerHeight
                              ? ((t.scrollTop =
                                    b.contentHeight - b.containerHeight),
                                void t.dispatchEvent(v))
                              : 'left' === e &&
                                n >= b.contentWidth - b.containerWidth
                              ? ((t.scrollLeft =
                                    b.contentWidth - b.containerWidth),
                                void t.dispatchEvent(h))
                              : (r || (r = t.scrollTop),
                                o || (o = t.scrollLeft),
                                'top' === e && r > n && t.dispatchEvent(l),
                                'top' === e && n > r && t.dispatchEvent(s),
                                'left' === e && o > n && t.dispatchEvent(a),
                                'left' === e && n > o && t.dispatchEvent(c),
                                'top' === e &&
                                    ((t.scrollTop = r = n), t.dispatchEvent(u)),
                                void (
                                    'left' === e &&
                                    ((t.scrollLeft = o = n), t.dispatchEvent(d))
                                ));
                      });
              },
              { './instances': 18 },
          ],
          21: [
              function (t, e, n) {
                  'use strict';
                  var r = t('../lib/dom'),
                      o = t('../lib/helper'),
                      i = t('./instances'),
                      l = t('./update-geometry'),
                      s = t('./update-scroll');
                  e.exports = function (t) {
                      var e = i.get(t);
                      e &&
                          ((e.negativeScrollAdjustment = e.isNegativeScroll
                              ? t.scrollWidth - t.clientWidth
                              : 0),
                          r.css(e.scrollbarXRail, 'display', 'block'),
                          r.css(e.scrollbarYRail, 'display', 'block'),
                          (e.railXMarginWidth =
                              o.toInt(r.css(e.scrollbarXRail, 'marginLeft')) +
                              o.toInt(r.css(e.scrollbarXRail, 'marginRight'))),
                          (e.railYMarginHeight =
                              o.toInt(r.css(e.scrollbarYRail, 'marginTop')) +
                              o.toInt(r.css(e.scrollbarYRail, 'marginBottom'))),
                          r.css(e.scrollbarXRail, 'display', 'none'),
                          r.css(e.scrollbarYRail, 'display', 'none'),
                          l(t),
                          s(t, 'top', t.scrollTop),
                          s(t, 'left', t.scrollLeft),
                          r.css(e.scrollbarXRail, 'display', ''),
                          r.css(e.scrollbarYRail, 'display', ''));
                  };
              },
              {
                  '../lib/dom': 3,
                  '../lib/helper': 6,
                  './instances': 18,
                  './update-geometry': 19,
                  './update-scroll': 20,
              },
          ],
      },
      {},
      [1]
  );

}
// jquery.colorbox
{
  /*!
  	Colorbox 1.6.4
  	license: MIT
  	http://www.jacklmoore.com/colorbox
  */
  !(function (t, e, i) {
      function n(i, n, o) {
          var r = e.createElement(i);
          return n && (r.id = Y + n), o && (r.style.cssText = o), t(r);
      }
      function o() {
          return i.innerHeight ? i.innerHeight : t(i).height();
      }
      function r(e, i) {
          i !== Object(i) && (i = {}),
              (this.cache = {}),
              (this.el = e),
              (this.value = function (e) {
                  var n;
                  return (
                      void 0 === this.cache[e] &&
                          (void 0 !== (n = t(this.el).attr('data-cbox-' + e))
                              ? (this.cache[e] = n)
                              : void 0 !== i[e]
                              ? (this.cache[e] = i[e])
                              : void 0 !== V[e] && (this.cache[e] = V[e])),
                      this.cache[e]
                  );
              }),
              (this.get = function (e) {
                  var i = this.value(e);
                  return t.isFunction(i) ? i.call(this.el, this) : i;
              });
      }
      function h(t) {
          var e = k.length,
              i = (z + t) % e;
          return 0 > i ? e + i : i;
      }
      function a(t, e) {
          return Math.round(
              (/%/.test(t) ? ('x' === e ? W.width() : o()) / 100 : 1) *
                  parseInt(t, 10)
          );
      }
      function s(t, e) {
          return t.get('photo') || t.get('photoRegex').test(e);
      }
      function l(t, e) {
          return t.get('retinaUrl') && i.devicePixelRatio > 1
              ? e.replace(t.get('photoRegex'), t.get('retinaSuffix'))
              : e;
      }
      function d(t) {
          'contains' in v[0] &&
              !v[0].contains(t.target) &&
              t.target !== w[0] &&
              (t.stopPropagation(), v.focus());
      }
      function c(t) {
          c.str !== t && (v.add(w).removeClass(c.str).addClass(t), (c.str = t));
      }
      function g(i) {
          t(e).trigger(i), ht.triggerHandler(i);
      }
      function u(i) {
          var o;
          if (!$) {
              if (
                  ((o = t(i).data(X)),
                  (function (e) {
                      (z = 0),
                          e && !1 !== e && 'nofollow' !== e
                              ? ((k = t('.' + Z).filter(function () {
                                    return (
                                        new r(this, t.data(this, X)).get(
                                            'rel'
                                        ) === e
                                    );
                                })),
                                -1 === (z = k.index(O.el)) &&
                                    ((k = k.add(O.el)), (z = k.length - 1)))
                              : (k = t(O.el));
                  })((O = new r(i, o)).get('rel')),
                  !q)
              ) {
                  (q = U = !0),
                      c(O.get('className')),
                      v.css({
                          visibility: 'hidden',
                          display: 'block',
                          opacity: '',
                      }),
                      (E = n(
                          at,
                          'LoadedContent',
                          'width:0; height:0; overflow:hidden; visibility:hidden'
                      )),
                      y.css({ width: '', height: '' }).append(E),
                      (_ =
                          b.height() +
                          H.height() +
                          y.outerHeight(!0) -
                          y.height()),
                      (j = T.width() + C.width() + y.outerWidth(!0) - y.width()),
                      (D = E.outerHeight(!0)),
                      (N = E.outerWidth(!0));
                  var h = a(O.get('initialWidth'), 'x'),
                      s = a(O.get('initialHeight'), 'y'),
                      l = O.get('maxWidth'),
                      u = O.get('maxHeight');
                  (O.w = Math.max(
                      (!1 !== l ? Math.min(h, a(l, 'x')) : h) - N - j,
                      0
                  )),
                      (O.h = Math.max(
                          (!1 !== u ? Math.min(s, a(u, 'y')) : s) - D - _,
                          0
                      )),
                      E.css({ width: '', height: O.h }),
                      Q.position(),
                      g(tt),
                      O.get('onOpen'),
                      B.add(L).hide(),
                      v.focus(),
                      O.get('trapFocus') &&
                          e.addEventListener &&
                          (e.addEventListener('focus', d, !0),
                          ht.one(ot, function () {
                              e.removeEventListener('focus', d, !0);
                          })),
                      O.get('returnFocus') &&
                          ht.one(ot, function () {
                              t(O.el).focus();
                          });
              }
              var f = parseFloat(O.get('opacity'));
              w
                  .css({
                      opacity: f == f ? f : '',
                      cursor: O.get('overlayClose') ? 'pointer' : '',
                      visibility: 'visible',
                  })
                  .show(),
                  O.get('closeButton')
                      ? P.html(O.get('close')).appendTo(y)
                      : P.appendTo('<div/>'),
                  m();
          }
      }
      function f() {
          v ||
              ((J = !1),
              (W = t(i)),
              (v = n(at)
                  .attr({
                      id: X,
                      class: !1 === t.support.opacity ? Y + 'IE' : '',
                      role: 'dialog',
                      tabindex: '-1',
                  })
                  .hide()),
              (w = n(at, 'Overlay').hide()),
              (M = t([n(at, 'LoadingOverlay')[0], n(at, 'LoadingGraphic')[0]])),
              (x = n(at, 'Wrapper')),
              (y = n(at, 'Content').append(
                  (L = n(at, 'Title')),
                  (F = n(at, 'Current')),
                  (K = t('<button type="button"/>').attr({ id: Y + 'Previous' })),
                  (S = t('<button type="button"/>').attr({ id: Y + 'Next' })),
                  (R = t('<button type="button"/>').attr({
                      id: Y + 'Slideshow',
                  })),
                  M
              )),
              (P = t('<button type="button"/>').attr({ id: Y + 'Close' })),
              x
                  .append(
                      n(at).append(
                          n(at, 'TopLeft'),
                          (b = n(at, 'TopCenter')),
                          n(at, 'TopRight')
                      ),
                      n(at, !1, 'clear:left').append(
                          (T = n(at, 'MiddleLeft')),
                          y,
                          (C = n(at, 'MiddleRight'))
                      ),
                      n(at, !1, 'clear:left').append(
                          n(at, 'BottomLeft'),
                          (H = n(at, 'BottomCenter')),
                          n(at, 'BottomRight')
                      )
                  )
                  .find('div div')
                  .css({ float: 'left' }),
              (I = n(
                  at,
                  !1,
                  'position:absolute; width:9999px; visibility:hidden; display:none; max-width:none;'
              )),
              (B = S.add(K).add(F).add(R))),
              e.body && !v.parent().length && t(e.body).append(w, v.append(x, I));
      }
      function p() {
          function i(t) {
              t.which > 1 ||
                  t.shiftKey ||
                  t.altKey ||
                  t.metaKey ||
                  t.ctrlKey ||
                  (t.preventDefault(), u(this));
          }
          return (
              !!v &&
              (J ||
                  ((J = !0),
                  S.click(function () {
                      Q.next();
                  }),
                  K.click(function () {
                      Q.prev();
                  }),
                  P.click(function () {
                      Q.close();
                  }),
                  w.click(function () {
                      O.get('overlayClose') && Q.close();
                  }),
                  t(e).on('keydown.' + Y, function (t) {
                      var e = t.keyCode;
                      q &&
                          O.get('escKey') &&
                          27 === e &&
                          (t.preventDefault(), Q.close()),
                          q &&
                              O.get('arrowKey') &&
                              k[1] &&
                              !t.altKey &&
                              (37 === e
                                  ? (t.preventDefault(), K.click())
                                  : 39 === e && (t.preventDefault(), S.click()));
                  }),
                  t.isFunction(t.fn.on)
                      ? t(e).on('click.' + Y, '.' + Z, i)
                      : t('.' + Z).live('click.' + Y, i)),
              !0)
          );
      }
      function m() {
          var e,
              o,
              r,
              h = Q.prep,
              d = ++st;
          if (
              ((U = !0),
              (A = !1),
              g(rt),
              g(et),
              O.get('onLoad'),
              (O.h = O.get('height')
                  ? a(O.get('height'), 'y') - D - _
                  : O.get('innerHeight') && a(O.get('innerHeight'), 'y')),
              (O.w = O.get('width')
                  ? a(O.get('width'), 'x') - N - j
                  : O.get('innerWidth') && a(O.get('innerWidth'), 'x')),
              (O.mw = O.w),
              (O.mh = O.h),
              O.get('maxWidth') &&
                  ((O.mw = a(O.get('maxWidth'), 'x') - N - j),
                  (O.mw = O.w && O.w < O.mw ? O.w : O.mw)),
              O.get('maxHeight') &&
                  ((O.mh = a(O.get('maxHeight'), 'y') - D - _),
                  (O.mh = O.h && O.h < O.mh ? O.h : O.mh)),
              (e = O.get('href')),
              (G = setTimeout(function () {
                  M.show();
              }, 100)),
              O.get('inline'))
          ) {
              var c = t(e).eq(0);
              (r = t('<div>').hide().insertBefore(c)),
                  ht.one(rt, function () {
                      r.replaceWith(c);
                  }),
                  h(c);
          } else
              O.get('iframe')
                  ? h(' ')
                  : O.get('html')
                  ? h(O.get('html'))
                  : s(O, e)
                  ? ((e = l(O, e)),
                    (A = O.get('createImg')),
                    t(A)
                        .addClass(Y + 'Photo')
                        .on('error.' + Y, function () {
                            h(n(at, 'Error').html(O.get('imgError')));
                        })
                        .one('load', function () {
                            d === st &&
                                setTimeout(function () {
                                    var e;
                                    O.get('retinaImage') &&
                                        i.devicePixelRatio > 1 &&
                                        ((A.height =
                                            A.height / i.devicePixelRatio),
                                        (A.width = A.width / i.devicePixelRatio)),
                                        O.get('scalePhotos') &&
                                            ((o = function () {
                                                (A.height -= A.height * e),
                                                    (A.width -= A.width * e);
                                            }),
                                            O.mw &&
                                                A.width > O.mw &&
                                                ((e = (A.width - O.mw) / A.width),
                                                o()),
                                            O.mh &&
                                                A.height > O.mh &&
                                                ((e =
                                                    (A.height - O.mh) / A.height),
                                                o())),
                                        O.h &&
                                            (A.style.marginTop =
                                                Math.max(O.mh - A.height, 0) / 2 +
                                                'px'),
                                        k[1] &&
                                            (O.get('loop') || k[z + 1]) &&
                                            ((A.style.cursor = 'pointer'),
                                            t(A).on('click.' + Y, function () {
                                                Q.next();
                                            })),
                                        (A.style.width = A.width + 'px'),
                                        (A.style.height = A.height + 'px'),
                                        h(A);
                                }, 1);
                        }),
                    (A.src = e))
                  : e &&
                    I.load(e, O.get('data'), function (e, i) {
                        d === st &&
                            h(
                                'error' === i
                                    ? n(at, 'Error').html(O.get('xhrError'))
                                    : t(this).contents()
                            );
                    });
      }
      var w,
          v,
          x,
          y,
          b,
          T,
          C,
          H,
          k,
          W,
          E,
          I,
          M,
          L,
          F,
          R,
          S,
          K,
          P,
          B,
          O,
          _,
          j,
          D,
          N,
          z,
          A,
          q,
          U,
          $,
          G,
          Q,
          J,
          V = {
              html: !1,
              photo: !1,
              iframe: !1,
              inline: !1,
              transition: 'elastic',
              speed: 300,
              fadeOut: 300,
              width: !1,
              initialWidth: '600',
              innerWidth: !1,
              maxWidth: !1,
              height: !1,
              initialHeight: '450',
              innerHeight: !1,
              maxHeight: !1,
              scalePhotos: !0,
              scrolling: !0,
              opacity: 0.9,
              preloading: !0,
              className: !1,
              overlayClose: !0,
              escKey: !0,
              arrowKey: !0,
              top: !1,
              bottom: !1,
              left: !1,
              right: !1,
              fixed: !1,
              data: void 0,
              closeButton: !0,
              fastIframe: !0,
              open: !1,
              reposition: !0,
              loop: !0,
              slideshow: !1,
              slideshowAuto: !0,
              slideshowSpeed: 2500,
              slideshowStart: 'start slideshow',
              slideshowStop: 'stop slideshow',
              photoRegex: /\.(gif|png|jp(e|g|eg)|bmp|ico|webp|jxr|svg)((#|\?).*)?$/i,
              retinaImage: !1,
              retinaUrl: !1,
              retinaSuffix: '@2x.$1',
              current: 'image {current} of {total}',
              previous: 'previous',
              next: 'next',
              close: 'close',
              xhrError: 'This content failed to load.',
              imgError: 'This image failed to load.',
              returnFocus: !0,
              trapFocus: !0,
              onOpen: !1,
              onLoad: !1,
              onComplete: !1,
              onCleanup: !1,
              onClosed: !1,
              rel: function () {
                  return this.rel;
              },
              href: function () {
                  return t(this).attr('href');
              },
              title: function () {
                  return this.title;
              },
              createImg: function () {
                  var e = new Image(),
                      i = t(this).data('cbox-img-attrs');
                  return (
                      'object' == typeof i &&
                          t.each(i, function (t, i) {
                              e[t] = i;
                          }),
                      e
                  );
              },
              createIframe: function () {
                  var i = e.createElement('iframe'),
                      n = t(this).data('cbox-iframe-attrs');
                  return (
                      'object' == typeof n &&
                          t.each(n, function (t, e) {
                              i[t] = e;
                          }),
                      'frameBorder' in i && (i.frameBorder = 0),
                      'allowTransparency' in i && (i.allowTransparency = 'true'),
                      (i.name = new Date().getTime()),
                      (i.allowFullscreen = !0),
                      i
                  );
              },
          },
          X = 'colorbox',
          Y = 'cbox',
          Z = Y + 'Element',
          tt = Y + '_open',
          et = Y + '_load',
          it = Y + '_complete',
          nt = Y + '_cleanup',
          ot = Y + '_closed',
          rt = Y + '_purge',
          ht = t('<a/>'),
          at = 'div',
          st = 0,
          lt = {},
          dt = (function () {
              function t() {
                  clearTimeout(h);
              }
              function e() {
                  (O.get('loop') || k[z + 1]) &&
                      (t(), (h = setTimeout(Q.next, O.get('slideshowSpeed'))));
              }
              function i() {
                  R.html(O.get('slideshowStop')).unbind(s).one(s, n),
                      ht.bind(it, e).on(et, t),
                      v.removeClass(a + 'off').addClass(a + 'on');
              }
              function n() {
                  t(),
                      ht.unbind(it, e).unbind(et, t),
                      R.html(O.get('slideshowStart'))
                          .unbind(s)
                          .one(s, function () {
                              Q.next(), i();
                          }),
                      v.removeClass(a + 'on').addClass(a + 'off');
              }
              function o() {
                  (r = !1),
                      R.hide(),
                      t(),
                      ht.unbind(it, e).unbind(et, t),
                      v.removeClass(a + 'off ' + a + 'on');
              }
              var r,
                  h,
                  a = Y + 'Slideshow_',
                  s = 'click.' + Y;
              return function () {
                  r
                      ? O.get('slideshow') || (ht.unbind(nt, o), o())
                      : O.get('slideshow') &&
                        k[1] &&
                        ((r = !0),
                        ht.one(nt, o),
                        O.get('slideshowAuto') ? i() : n(),
                        R.show());
              };
          })();
      t[X] ||
          (t(f),
          ((Q = t.fn[X] = t[X] = function (e, i) {
              var n = this;
              return (
                  (e = e || {}),
                  t.isFunction(n) && ((n = t('<a/>')), (e.open = !0)),
                  n[0]
                      ? (f(),
                        p() &&
                            (i && (e.onComplete = i),
                            n
                                .each(function () {
                                    var i = t.data(this, X) || {};
                                    t.data(this, X, t.extend(i, e));
                                })
                                .addClass(Z),
                            new r(n[0], e).get('open') && u(n[0])),
                        n)
                      : n
              );
          }).position = function (e, i) {
              function n() {
                  (b[0].style.width = H[0].style.width = y[0].style.width =
                      parseInt(v[0].style.width, 10) - j + 'px'),
                      (y[0].style.height = T[0].style.height = C[0].style.height =
                          parseInt(v[0].style.height, 10) - _ + 'px');
              }
              var r,
                  h,
                  s,
                  l = 0,
                  d = 0,
                  c = v.offset();
              if (
                  (W.unbind('resize.' + Y),
                  v.css({ top: -9e4, left: -9e4 }),
                  (h = W.scrollTop()),
                  (s = W.scrollLeft()),
                  O.get('fixed')
                      ? ((c.top -= h),
                        (c.left -= s),
                        v.css({ position: 'fixed' }))
                      : ((l = h), (d = s), v.css({ position: 'absolute' })),
                  (d +=
                      !1 !== O.get('right')
                          ? Math.max(
                                W.width() - O.w - N - j - a(O.get('right'), 'x'),
                                0
                            )
                          : !1 !== O.get('left')
                          ? a(O.get('left'), 'x')
                          : Math.round(Math.max(W.width() - O.w - N - j, 0) / 2)),
                  (l +=
                      !1 !== O.get('bottom')
                          ? Math.max(
                                o() - O.h - D - _ - a(O.get('bottom'), 'y'),
                                0
                            )
                          : !1 !== O.get('top')
                          ? a(O.get('top'), 'y')
                          : Math.round(Math.max(o() - O.h - D - _, 0) / 2)),
                  v.css({ top: c.top, left: c.left, visibility: 'visible' }),
                  (x[0].style.width = x[0].style.height = '9999px'),
                  (r = {
                      width: O.w + N + j,
                      height: O.h + D + _,
                      top: l,
                      left: d,
                  }),
                  e)
              ) {
                  var g = 0;
                  t.each(r, function (t) {
                      return r[t] !== lt[t] ? void (g = e) : void 0;
                  }),
                      (e = g);
              }
              (lt = r),
                  e || v.css(r),
                  v.dequeue().animate(r, {
                      duration: e || 0,
                      complete: function () {
                          n(),
                              (U = !1),
                              (x[0].style.width = O.w + N + j + 'px'),
                              (x[0].style.height = O.h + D + _ + 'px'),
                              O.get('reposition') &&
                                  setTimeout(function () {
                                      W.bind('resize.' + Y, Q.position);
                                  }, 1),
                              t.isFunction(i) && i();
                      },
                      step: n,
                  });
          }),
          (Q.resize = function (t) {
              var e;
              q &&
                  ((t = t || {}).width && (O.w = a(t.width, 'x') - N - j),
                  t.innerWidth && (O.w = a(t.innerWidth, 'x')),
                  E.css({ width: O.w }),
                  t.height && (O.h = a(t.height, 'y') - D - _),
                  t.innerHeight && (O.h = a(t.innerHeight, 'y')),
                  t.innerHeight ||
                      t.height ||
                      ((e = E.scrollTop()),
                      E.css({ height: 'auto' }),
                      (O.h = E.height())),
                  E.css({ height: O.h }),
                  e && E.scrollTop(e),
                  Q.position(
                      'none' === O.get('transition') ? 0 : O.get('speed')
                  ));
          }),
          (Q.prep = function (i) {
              if (q) {
                  var o,
                      a = 'none' === O.get('transition') ? 0 : O.get('speed');
                  E.remove(),
                      (E = n(at, 'LoadedContent').append(i))
                          .hide()
                          .appendTo(I.show())
                          .css({
                              width:
                                  ((O.w = O.w || E.width()),
                                  (O.w = O.mw && O.mw < O.w ? O.mw : O.w),
                                  O.w),
                              overflow: O.get('scrolling') ? 'auto' : 'hidden',
                          })
                          .css({
                              height:
                                  ((O.h = O.h || E.height()),
                                  (O.h = O.mh && O.mh < O.h ? O.mh : O.h),
                                  O.h),
                          })
                          .prependTo(y),
                      I.hide(),
                      t(A).css({ float: 'none' }),
                      c(O.get('className')),
                      (o = function () {
                          function i() {
                              !1 === t.support.opacity &&
                                  v[0].style.removeAttribute('filter');
                          }
                          var n,
                              o,
                              d = k.length;
                          q &&
                              ((o = function () {
                                  clearTimeout(G),
                                      M.hide(),
                                      g(it),
                                      O.get('onComplete');
                              }),
                              L.html(O.get('title')).show(),
                              E.show(),
                              d > 1
                                  ? ('string' == typeof O.get('current') &&
                                        F.html(
                                            O.get('current')
                                                .replace('{current}', z + 1)
                                                .replace('{total}', d)
                                        ).show(),
                                    S[
                                        O.get('loop') || d - 1 > z
                                            ? 'show'
                                            : 'hide'
                                    ]().html(O.get('next')),
                                    K[
                                        O.get('loop') || z ? 'show' : 'hide'
                                    ]().html(O.get('previous')),
                                    dt(),
                                    O.get('preloading') &&
                                        t.each([h(-1), h(1)], function () {
                                            var i = k[this],
                                                n = new r(i, t.data(i, X)),
                                                o = n.get('href');
                                            o &&
                                                s(n, o) &&
                                                ((o = l(n, o)),
                                                (e.createElement('img').src = o));
                                        }))
                                  : B.hide(),
                              O.get('iframe')
                                  ? ((n = O.get('createIframe')),
                                    O.get('scrolling') || (n.scrolling = 'no'),
                                    t(n)
                                        .attr({
                                            src: O.get('href'),
                                            class: Y + 'Iframe',
                                        })
                                        .one('load', o)
                                        .appendTo(E),
                                    ht.one(rt, function () {
                                        n.src = '//about:blank';
                                    }),
                                    O.get('fastIframe') && t(n).trigger('load'))
                                  : o(),
                              'fade' === O.get('transition')
                                  ? v.fadeTo(a, 1, i)
                                  : i());
                      }),
                      'fade' === O.get('transition')
                          ? v.fadeTo(a, 0, function () {
                                Q.position(0, o);
                            })
                          : Q.position(a, o);
              }
          }),
          (Q.next = function () {
              !U && k[1] && (O.get('loop') || k[z + 1]) && ((z = h(1)), u(k[z]));
          }),
          (Q.prev = function () {
              !U && k[1] && (O.get('loop') || z) && ((z = h(-1)), u(k[z]));
          }),
          (Q.close = function () {
              q &&
                  !$ &&
                  (($ = !0),
                  (q = !1),
                  g(nt),
                  O.get('onCleanup'),
                  W.unbind('.' + Y),
                  w.fadeTo(O.get('fadeOut') || 0, 0),
                  v.stop().fadeTo(O.get('fadeOut') || 0, 0, function () {
                      v.hide(),
                          w.hide(),
                          g(rt),
                          E.remove(),
                          setTimeout(function () {
                              ($ = !1), g(ot), O.get('onClosed');
                          }, 1);
                  }));
          }),
          (Q.remove = function () {
              v &&
                  (v.stop(),
                  t[X].close(),
                  v.stop(!1, !0).remove(),
                  w.remove(),
                  ($ = !1),
                  (v = null),
                  t('.' + Z)
                      .removeData(X)
                      .removeClass(Z),
                  t(e)
                      .unbind('click.' + Y)
                      .unbind('keydown.' + Y));
          }),
          (Q.element = function () {
              return t(O.el);
          }),
          (Q.settings = V));
  })(jQuery, document, window);

}
// jquery-ajax-crossorigin
{
  /*
 jQuery AJAX Cross Origin v1.3 (http://www.ajax-cross-origin.com)
 jQuery plugin to bypass Same-origin_policy using Google Apps Script.

 references:
 http://en.wikipedia.org/wiki/Same-origin_policy
 http://www.google.com/script/start/

 (c) 2014, Writen by Erez Ninio. site: www.dealhotelbook.com

 Licensed under the Creative Commons Attribution 3.0 Unported License.
 For details, see http://creativecommons.org/licenses/by/3.0/.
*/

var proxyJsonp="https://script.google.com/macros/s/AKfycbwmqG55tt2d2FcT_WQ3WjCSKmtyFpkOcdprSITn45-4UgVJnzp9/exec";
jQuery.ajaxOrig=jQuery.ajax;jQuery.ajax=function(a,b){function d(a){a=encodeURI(a).replace(/&/g,"%26");return proxyJsonp+"?url="+a+"&callback=?"}var c="object"===typeof a?a:b||{};c.url=c.url||("string"===typeof a?a:"");var c=jQuery.ajaxSetup({},c),e=function(a,c){var b=document.createElement("a");b.href=a;return c.crossOrigin&&"http"==a.substr(0,4).toLowerCase()&&"localhost"!=b.hostname&&"127.0.0.1"!=b.hostname&&b.hostname!=window.location.hostname}(c.url,c);c.proxy&&0<c.proxy.length&&(proxyJsonp=c.proxy,"object"===typeof a?
a.crossDomain=!0:"object"===typeof b&&(b.crossDomain=!0));e&&("object"===typeof a?a.url&&(a.url=d(a.url),a.charset&&(a.url+="&charset="+a.charset),a.dataType="json"):"string"===typeof a&&"object"===typeof b&&(a=d(a),b.charset&&(a+="&charset="+b.charset),b.dataType="json"));return jQuery.ajaxOrig.apply(this,arguments)};jQuery.ajax.prototype=new jQuery.ajaxOrig;jQuery.ajax.prototype.constructor=jQuery.ajax;
}
// numeric
{
  "use strict";var numeric="undefined"==typeof exports?function(){}:exports;"undefined"!=typeof global&&(global.numeric=numeric),numeric.version="1.2.6",numeric.bench=function(r,n){var e,i,t;for(void 0===n&&(n=15),i=.5,e=new Date;;){for(t=i*=2;t>3;t-=4)r(),r(),r(),r();for(;t>0;)r(),t--;if(new Date-e>n)break}for(t=i;t>3;t-=4)r(),r(),r(),r();for(;t>0;)r(),t--;return 1e3*(3*i-1)/(new Date-e)},numeric._myIndexOf=function(r){var n,e=this.length;for(n=0;n<e;++n)if(this[n]===r)return n;return-1},numeric.myIndexOf=Array.prototype.indexOf?Array.prototype.indexOf:numeric._myIndexOf,numeric.Function=Function,numeric.precision=4,numeric.largeArray=50,numeric.prettyPrint=function(r){var n=[];return function r(e){var i;if(void 0===e)return n.push(Array(numeric.precision+8).join(" ")),!1;if("string"==typeof e)return n.push('"'+e+'"'),!1;if("boolean"==typeof e)return n.push(e.toString()),!1;if("number"==typeof e){var t=function r(n){if(0===n)return"0";if(isNaN(n))return"NaN";if(n<0)return"-"+r(-n);if(isFinite(n)){var e=Math.floor(Math.log(n)/Math.log(10)),i=n/Math.pow(10,e),t=i.toPrecision(numeric.precision);return 10===parseFloat(t)&&(e++,t=(i=1).toPrecision(numeric.precision)),parseFloat(t).toString()+"e"+e.toString()}return"Infinity"}(e),u=e.toPrecision(numeric.precision),o=parseFloat(e.toString()).toString(),c=[t,u,o,parseFloat(u).toString(),parseFloat(o).toString()];for(i=1;i<c.length;i++)c[i].length<t.length&&(t=c[i]);return n.push(Array(numeric.precision+8-t.length).join(" ")+t),!1}if(null===e)return n.push("null"),!1;if("function"==typeof e){n.push(e.toString());var a=!1;for(i in e)e.hasOwnProperty(i)&&(a?n.push(",\n"):n.push("\n{"),a=!0,n.push(i),n.push(": \n"),r(e[i]));return a&&n.push("}\n"),!0}if(e instanceof Array){if(e.length>numeric.largeArray)return n.push("...Large Array..."),!0;for(a=!1,n.push("["),i=0;i<e.length;i++)i>0&&(n.push(","),a&&n.push("\n ")),a=r(e[i]);return n.push("]"),!0}n.push("{");a=!1;for(i in e)e.hasOwnProperty(i)&&(a&&n.push(",\n"),a=!0,n.push(i),n.push(": \n"),r(e[i]));return n.push("}"),!0}(r),n.join("")},numeric.parseDate=function(r){return function r(n){if("string"==typeof n)return Date.parse(n.replace(/-/g,"/"));if(!(n instanceof Array))throw new Error("parseDate: parameter must be arrays of strings");var e,i=[];for(e=0;e<n.length;e++)i[e]=r(n[e]);return i}(r)},numeric.parseFloat=function(r){return function r(n){if("string"==typeof n)return parseFloat(n);if(!(n instanceof Array))throw new Error("parseFloat: parameter must be arrays of strings");var e,i=[];for(e=0;e<n.length;e++)i[e]=r(n[e]);return i}(r)},numeric.parseCSV=function(r){var n,e,i,t=r.split("\n"),u=[],o=/(([^'",]*)|('[^']*')|("[^"]*")),/g,c=/^\s*(([+-]?[0-9]+(\.[0-9]*)?(e[+-]?[0-9]+)?)|([+-]?[0-9]*(\.[0-9]+)?(e[+-]?[0-9]+)?))\s*$/,a=0;for(e=0;e<t.length;e++){var f,m=(t[e]+",").match(o);if(m.length>0){for(u[a]=[],n=0;n<m.length;n++)f=(i=m[n]).substr(0,i.length-1),c.test(f)?u[a][n]=parseFloat(f):u[a][n]=f;a++}}return u},numeric.toCSV=function(r){var n,e,i,t,u,o=numeric.dim(r);for(i=o[0],o[1],u=[],n=0;n<i;n++){for(t=[],e=0;e<i;e++)t[e]=r[n][e].toString();u[n]=t.join(", ")}return u.join("\n")+"\n"},numeric.getURL=function(r){var n=new XMLHttpRequest;return n.open("GET",r,!1),n.send(),n},numeric.imageURL=function(r){function n(r,n,e){void 0===n&&(n=0),void 0===e&&(e=r.length);var i,t=[0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,2882616665,651767980,1373503546,3369554304,3218104598,565507253,1454621731,3485111705,3099436303,671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,2362670323,4224994405,1303535960,984961486,2747007092,3569037538,1256170817,1037604311,2765210733,3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,2466906013,167816743,2097651377,4027552580,2265490386,503444072,1762050814,4150417245,2154129355,426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,3268935591,3050360625,752459403,1541320221,2607071920,3965973030,1969922972,40735498,2617837225,3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,936918e3,2847714899,3736837829,1202900863,817233897,3183342108,3401237130,1404277552,615818150,3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117],u=-1;r.length;for(i=n;i<e;i++)u=u>>>8^t[255&(u^r[i])];return-1^u}var e,i,t,u,o,c,a,f,m,s,h=r[0].length,l=r[0][0].length,p=[137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,l>>24&255,l>>16&255,l>>8&255,255&l,h>>24&255,h>>16&255,h>>8&255,255&h,8,2,0,0,0,-1,-2,-3,-4,-5,-6,-7,-8,73,68,65,84,8,29];for(s=n(p,12,29),p[29]=s>>24&255,p[30]=s>>16&255,p[31]=s>>8&255,p[32]=255&s,e=1,i=0,a=0;a<h;a++){for(a<h-1?p.push(0):p.push(1),o=3*l+1+(0===a)&255,c=3*l+1+(0===a)>>8&255,p.push(o),p.push(c),p.push(255&~o),p.push(255&~c),0===a&&p.push(0),f=0;f<l;f++)for(t=0;t<3;t++)i=(i+(e=(e+(o=(o=r[t][a][f])>255?255:o<0?0:Math.round(o)))%65521))%65521,p.push(o);p.push(0)}return m=(i<<16)+e,p.push(m>>24&255),p.push(m>>16&255),p.push(m>>8&255),p.push(255&m),u=p.length-41,p[33]=u>>24&255,p[34]=u>>16&255,p[35]=u>>8&255,p[36]=255&u,s=n(p,37),p.push(s>>24&255),p.push(s>>16&255),p.push(s>>8&255),p.push(255&s),p.push(0),p.push(0),p.push(0),p.push(0),p.push(73),p.push(69),p.push(78),p.push(68),p.push(174),p.push(66),p.push(96),p.push(130),"data:image/png;base64,"+function(r){var n,e,i,t,u,o,c,a=r.length,f="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",m="";for(n=0;n<a;n+=3)u=((3&(e=r[n]))<<4)+((i=r[n+1])>>4),o=((15&i)<<2)+((t=r[n+2])>>6),c=63&t,n+1>=a?o=c=64:n+2>=a&&(c=64),m+=f.charAt(e>>2)+f.charAt(u)+f.charAt(o)+f.charAt(c);return m}(p)},numeric._dim=function(r){for(var n=[];"object"==typeof r;)n.push(r.length),r=r[0];return n},numeric.dim=function(r){var n;return"object"==typeof r?"object"==typeof(n=r[0])?"object"==typeof n[0]?numeric._dim(r):[r.length,n.length]:[r.length]:[]},numeric.mapreduce=function(r,n){return Function("x","accum","_s","_k",'if(typeof accum === "undefined") accum = '+n+';\nif(typeof x === "number") { var xi = x; '+r+'; return accum; }\nif(typeof _s === "undefined") _s = numeric.dim(x);\nif(typeof _k === "undefined") _k = 0;\nvar _n = _s[_k];\nvar i,xi;\nif(_k < _s.length-1) {\n    for(i=_n-1;i>=0;i--) {\n        accum = arguments.callee(x[i],accum,_s,_k+1);\n    }    return accum;\n}\nfor(i=_n-1;i>=1;i-=2) { \n    xi = x[i];\n    '+r+";\n    xi = x[i-1];\n    "+r+";\n}\nif(i === 0) {\n    xi = x[i];\n    "+r+"\n}\nreturn accum;")},numeric.mapreduce2=function(r,n){return Function("x","var n = x.length;\nvar i,xi;\n"+n+";\nfor(i=n-1;i!==-1;--i) { \n    xi = x[i];\n    "+r+";\n}\nreturn accum;")},numeric.same=function r(n,e){var i,t;if(!(n instanceof Array&&e instanceof Array))return!1;if((t=n.length)!==e.length)return!1;for(i=0;i<t;i++)if(n[i]!==e[i]){if("object"!=typeof n[i])return!1;if(!r(n[i],e[i]))return!1}return!0},numeric.rep=function(r,n,e){void 0===e&&(e=0);var i,t=r[e],u=Array(t);if(e===r.length-1){for(i=t-2;i>=0;i-=2)u[i+1]=n,u[i]=n;return-1===i&&(u[0]=n),u}for(i=t-1;i>=0;i--)u[i]=numeric.rep(r,n,e+1);return u},numeric.dotMMsmall=function(r,n){var e,i,t,u,o,c,a,f,m,s,h;for(u=r.length,o=n.length,c=n[0].length,a=Array(u),e=u-1;e>=0;e--){for(f=Array(c),m=r[e],t=c-1;t>=0;t--){for(s=m[o-1]*n[o-1][t],i=o-2;i>=1;i-=2)h=i-1,s+=m[i]*n[i][t]+m[h]*n[h][t];0===i&&(s+=m[0]*n[0][t]),f[t]=s}a[e]=f}return a},numeric._getCol=function(r,n,e){var i;for(i=r.length-1;i>0;--i)e[i]=r[i][n],e[--i]=r[i][n];0===i&&(e[0]=r[0][n])},numeric.dotMMbig=function(r,n){var e,i,t,u=numeric._getCol,o=n.length,c=Array(o),a=r.length,f=n[0].length,m=new Array(a),s=numeric.dotVV;for(--o,i=--a;-1!==i;--i)m[i]=Array(f);for(i=--f;-1!==i;--i)for(u(n,i,c),t=a;-1!==t;--t)0,e=r[t],m[t][i]=s(e,c);return m},numeric.dotMV=function(r,n){var e,i=r.length,t=(n.length,Array(i)),u=numeric.dotVV;for(e=i-1;e>=0;e--)t[e]=u(r[e],n);return t},numeric.dotVM=function(r,n){var e,i,t,u,o,c,a;for(t=r.length,u=n[0].length,o=Array(u),i=u-1;i>=0;i--){for(c=r[t-1]*n[t-1][i],e=t-2;e>=1;e-=2)a=e-1,c+=r[e]*n[e][i]+r[a]*n[a][i];0===e&&(c+=r[0]*n[0][i]),o[i]=c}return o},numeric.dotVV=function(r,n){var e,i,t=r.length,u=r[t-1]*n[t-1];for(e=t-2;e>=1;e-=2)i=e-1,u+=r[e]*n[e]+r[i]*n[i];return 0===e&&(u+=r[0]*n[0]),u},numeric.dot=function(r,n){var e=numeric.dim;switch(1e3*e(r).length+e(n).length){case 2002:return n.length<10?numeric.dotMMsmall(r,n):numeric.dotMMbig(r,n);case 2001:return numeric.dotMV(r,n);case 1002:return numeric.dotVM(r,n);case 1001:return numeric.dotVV(r,n);case 1e3:return numeric.mulVS(r,n);case 1:return numeric.mulSV(r,n);case 0:return r*n;default:throw new Error("numeric.dot only works on vectors and matrices")}},numeric.diag=function(r){var n,e,i,t,u=r.length,o=Array(u);for(n=u-1;n>=0;n--){for(t=Array(u),e=n+2,i=u-1;i>=e;i-=2)t[i]=0,t[i-1]=0;for(i>n&&(t[i]=0),t[n]=r[n],i=n-1;i>=1;i-=2)t[i]=0,t[i-1]=0;0===i&&(t[0]=0),o[n]=t}return o},numeric.getDiag=function(r){var n,e=Math.min(r.length,r[0].length),i=Array(e);for(n=e-1;n>=1;--n)i[n]=r[n][n],i[--n]=r[n][n];return 0===n&&(i[0]=r[0][0]),i},numeric.identity=function(r){return numeric.diag(numeric.rep([r],1))},numeric.pointwise=function(r,n,e){void 0===e&&(e="");var i,t,u=[],o=/\[i\]$/,c="",a=!1;for(i=0;i<r.length;i++)o.test(r[i])?c=t=r[i].substring(0,r[i].length-3):t=r[i],"ret"===t&&(a=!0),u.push(t);return u[r.length]="_s",u[r.length+1]="_k",u[r.length+2]='if(typeof _s === "undefined") _s = numeric.dim('+c+');\nif(typeof _k === "undefined") _k = 0;\nvar _n = _s[_k];\nvar i'+(a?"":", ret = Array(_n)")+";\nif(_k < _s.length-1) {\n    for(i=_n-1;i>=0;i--) ret[i] = arguments.callee("+r.join(",")+",_s,_k+1);\n    return ret;\n}\n"+e+"\nfor(i=_n-1;i!==-1;--i) {\n    "+n+"\n}\nreturn ret;",Function.apply(null,u)},numeric.pointwise2=function(r,n,e){void 0===e&&(e="");var i,t,u=[],o=/\[i\]$/,c="",a=!1;for(i=0;i<r.length;i++)o.test(r[i])?c=t=r[i].substring(0,r[i].length-3):t=r[i],"ret"===t&&(a=!0),u.push(t);return u[r.length]="var _n = "+c+".length;\nvar i"+(a?"":", ret = Array(_n)")+";\n"+e+"\nfor(i=_n-1;i!==-1;--i) {\n"+n+"\n}\nreturn ret;",Function.apply(null,u)},numeric._biforeach=function r(n,e,i,t,u){var o;if(t!==i.length-1)for(o=i[t]-1;o>=0;o--)r("object"==typeof n?n[o]:n,"object"==typeof e?e[o]:e,i,t+1,u);else u(n,e)},numeric._biforeach2=function r(n,e,i,t,u){if(t===i.length-1)return u(n,e);var o,c=i[t],a=Array(c);for(o=c-1;o>=0;--o)a[o]=r("object"==typeof n?n[o]:n,"object"==typeof e?e[o]:e,i,t+1,u);return a},numeric._foreach=function r(n,e,i,t){var u;if(i!==e.length-1)for(u=e[i]-1;u>=0;u--)r(n[u],e,i+1,t);else t(n)},numeric._foreach2=function r(n,e,i,t){if(i===e.length-1)return t(n);var u,o=e[i],c=Array(o);for(u=o-1;u>=0;u--)c[u]=r(n[u],e,i+1,t);return c},numeric.ops2={add:"+",sub:"-",mul:"*",div:"/",mod:"%",and:"&&",or:"||",eq:"===",neq:"!==",lt:"<",gt:">",leq:"<=",geq:">=",band:"&",bor:"|",bxor:"^",lshift:"<<",rshift:">>",rrshift:">>>"},numeric.opseq={addeq:"+=",subeq:"-=",muleq:"*=",diveq:"/=",modeq:"%=",lshifteq:"<<=",rshifteq:">>=",rrshifteq:">>>=",bandeq:"&=",boreq:"|=",bxoreq:"^="},numeric.mathfuns=["abs","acos","asin","atan","ceil","cos","exp","floor","log","round","sin","sqrt","tan","isNaN","isFinite"],numeric.mathfuns2=["atan2","pow","max","min"],numeric.ops1={neg:"-",not:"!",bnot:"~",clone:""},numeric.mapreducers={any:["if(xi) return true;","var accum = false;"],all:["if(!xi) return false;","var accum = true;"],sum:["accum += xi;","var accum = 0;"],prod:["accum *= xi;","var accum = 1;"],norm2Squared:["accum += xi*xi;","var accum = 0;"],norminf:["accum = max(accum,abs(xi));","var accum = 0, max = Math.max, abs = Math.abs;"],norm1:["accum += abs(xi)","var accum = 0, abs = Math.abs;"],sup:["accum = max(accum,xi);","var accum = -Infinity, max = Math.max;"],inf:["accum = min(accum,xi);","var accum = Infinity, min = Math.min;"]},function(){var r,n;for(r=0;r<numeric.mathfuns2.length;++r)n=numeric.mathfuns2[r],numeric.ops2[n]=n;for(r in numeric.ops2)if(numeric.ops2.hasOwnProperty(r)){n=numeric.ops2[r];var e,i,t="";-1!==numeric.myIndexOf.call(numeric.mathfuns2,r)?(t="var "+n+" = Math."+n+";\n",e=function(r,e,i){return r+" = "+n+"("+e+","+i+")"},i=function(r,e){return r+" = "+n+"("+r+","+e+")"}):(e=function(r,e,i){return r+" = "+e+" "+n+" "+i},i=numeric.opseq.hasOwnProperty(r+"eq")?function(r,e){return r+" "+n+"= "+e}:function(r,e){return r+" = "+r+" "+n+" "+e}),numeric[r+"VV"]=numeric.pointwise2(["x[i]","y[i]"],e("ret[i]","x[i]","y[i]"),t),numeric[r+"SV"]=numeric.pointwise2(["x","y[i]"],e("ret[i]","x","y[i]"),t),numeric[r+"VS"]=numeric.pointwise2(["x[i]","y"],e("ret[i]","x[i]","y"),t),numeric[r]=Function("var n = arguments.length, i, x = arguments[0], y;\nvar VV = numeric."+r+"VV, VS = numeric."+r+"VS, SV = numeric."+r+'SV;\nvar dim = numeric.dim;\nfor(i=1;i!==n;++i) { \n  y = arguments[i];\n  if(typeof x === "object") {\n      if(typeof y === "object") x = numeric._biforeach2(x,y,dim(x),0,VV);\n      else x = numeric._biforeach2(x,y,dim(x),0,VS);\n  } else if(typeof y === "object") x = numeric._biforeach2(x,y,dim(y),0,SV);\n  else '+i("x","y")+"\n}\nreturn x;\n"),numeric[n]=numeric[r],numeric[r+"eqV"]=numeric.pointwise2(["ret[i]","x[i]"],i("ret[i]","x[i]"),t),numeric[r+"eqS"]=numeric.pointwise2(["ret[i]","x"],i("ret[i]","x"),t),numeric[r+"eq"]=Function("var n = arguments.length, i, x = arguments[0], y;\nvar V = numeric."+r+"eqV, S = numeric."+r+'eqS\nvar s = numeric.dim(x);\nfor(i=1;i!==n;++i) { \n  y = arguments[i];\n  if(typeof y === "object") numeric._biforeach(x,y,s,0,V);\n  else numeric._biforeach(x,y,s,0,S);\n}\nreturn x;\n')}for(r=0;r<numeric.mathfuns2.length;++r)n=numeric.mathfuns2[r],delete numeric.ops2[n];for(r=0;r<numeric.mathfuns.length;++r)n=numeric.mathfuns[r],numeric.ops1[n]=n;for(r in numeric.ops1)numeric.ops1.hasOwnProperty(r)&&(t="",n=numeric.ops1[r],-1!==numeric.myIndexOf.call(numeric.mathfuns,r)&&Math.hasOwnProperty(n)&&(t="var "+n+" = Math."+n+";\n"),numeric[r+"eqV"]=numeric.pointwise2(["ret[i]"],"ret[i] = "+n+"(ret[i]);",t),numeric[r+"eq"]=Function("x",'if(typeof x !== "object") return '+n+"x\nvar i;\nvar V = numeric."+r+"eqV;\nvar s = numeric.dim(x);\nnumeric._foreach(x,s,0,V);\nreturn x;\n"),numeric[r+"V"]=numeric.pointwise2(["x[i]"],"ret[i] = "+n+"(x[i]);",t),numeric[r]=Function("x",'if(typeof x !== "object") return '+n+"(x)\nvar i;\nvar V = numeric."+r+"V;\nvar s = numeric.dim(x);\nreturn numeric._foreach2(x,s,0,V);\n"));for(r=0;r<numeric.mathfuns.length;++r)n=numeric.mathfuns[r],delete numeric.ops1[n];for(r in numeric.mapreducers)numeric.mapreducers.hasOwnProperty(r)&&(n=numeric.mapreducers[r],numeric[r+"V"]=numeric.mapreduce2(n[0],n[1]),numeric[r]=Function("x","s","k",n[1]+'if(typeof x !== "object") {    xi = x;\n'+n[0]+';\n    return accum;\n}if(typeof s === "undefined") s = numeric.dim(x);\nif(typeof k === "undefined") k = 0;\nif(k === s.length-1) return numeric.'+r+"V(x);\nvar xi;\nvar n = x.length, i;\nfor(i=n-1;i!==-1;--i) {\n   xi = arguments.callee(x[i]);\n"+n[0]+";\n}\nreturn accum;\n"))}(),numeric.truncVV=numeric.pointwise(["x[i]","y[i]"],"ret[i] = round(x[i]/y[i])*y[i];","var round = Math.round;"),numeric.truncVS=numeric.pointwise(["x[i]","y"],"ret[i] = round(x[i]/y)*y;","var round = Math.round;"),numeric.truncSV=numeric.pointwise(["x","y[i]"],"ret[i] = round(x/y[i])*y[i];","var round = Math.round;"),numeric.trunc=function(r,n){return"object"==typeof r?"object"==typeof n?numeric.truncVV(r,n):numeric.truncVS(r,n):"object"==typeof n?numeric.truncSV(r,n):Math.round(r/n)*n},numeric.inv=function(r){var n,e,i,t,u,o,c,a=numeric.dim(r),f=Math.abs,m=a[0],s=a[1],h=numeric.clone(r),l=numeric.identity(m);for(o=0;o<s;++o){var p=-1,y=-1;for(u=o;u!==m;++u)(c=f(h[u][o]))>y&&(p=u,y=c);for(e=h[p],h[p]=h[o],h[o]=e,t=l[p],l[p]=l[o],l[o]=t,r=e[o],c=o;c!==s;++c)e[c]/=r;for(c=s-1;-1!==c;--c)t[c]/=r;for(u=m-1;-1!==u;--u)if(u!==o){for(n=h[u],i=l[u],r=n[o],c=o+1;c!==s;++c)n[c]-=e[c]*r;for(c=s-1;c>0;--c)i[c]-=t[c]*r,i[--c]-=t[c]*r;0===c&&(i[0]-=t[0]*r)}}return l},numeric.det=function(r){var n=numeric.dim(r);if(2!==n.length||n[0]!==n[1])throw new Error("numeric: det() only works on square matrices");var e,i,t,u,o,c,a,f,m=n[0],s=1,h=numeric.clone(r);for(i=0;i<m-1;i++){for(t=i,e=i+1;e<m;e++)Math.abs(h[e][i])>Math.abs(h[t][i])&&(t=e);for(t!==i&&(a=h[t],h[t]=h[i],h[i]=a,s*=-1),u=h[i],e=i+1;e<m;e++){for(c=(o=h[e])[i]/u[i],t=i+1;t<m-1;t+=2)f=t+1,o[t]-=u[t]*c,o[f]-=u[f]*c;t!==m&&(o[t]-=u[t]*c)}if(0===u[i])return 0;s*=u[i]}return s*h[i][i]},numeric.transpose=function(r){var n,e,i,t,u,o=r.length,c=r[0].length,a=Array(c);for(e=0;e<c;e++)a[e]=Array(o);for(n=o-1;n>=1;n-=2){for(t=r[n],i=r[n-1],e=c-1;e>=1;--e)(u=a[e])[n]=t[e],u[n-1]=i[e],(u=a[--e])[n]=t[e],u[n-1]=i[e];0===e&&((u=a[0])[n]=t[0],u[n-1]=i[0])}if(0===n){for(i=r[0],e=c-1;e>=1;--e)a[e][0]=i[e],a[--e][0]=i[e];0===e&&(a[0][0]=i[0])}return a},numeric.negtranspose=function(r){var n,e,i,t,u,o=r.length,c=r[0].length,a=Array(c);for(e=0;e<c;e++)a[e]=Array(o);for(n=o-1;n>=1;n-=2){for(t=r[n],i=r[n-1],e=c-1;e>=1;--e)(u=a[e])[n]=-t[e],u[n-1]=-i[e],(u=a[--e])[n]=-t[e],u[n-1]=-i[e];0===e&&((u=a[0])[n]=-t[0],u[n-1]=-i[0])}if(0===n){for(i=r[0],e=c-1;e>=1;--e)a[e][0]=-i[e],a[--e][0]=-i[e];0===e&&(a[0][0]=-i[0])}return a},numeric._random=function r(n,e){var i,t,u=n[e],o=Array(u);if(e===n.length-1){for(t=Math.random,i=u-1;i>=1;i-=2)o[i]=t(),o[i-1]=t();return 0===i&&(o[0]=t()),o}for(i=u-1;i>=0;i--)o[i]=r(n,e+1);return o},numeric.random=function(r){return numeric._random(r,0)},numeric.norm2=function(r){return Math.sqrt(numeric.norm2Squared(r))},numeric.linspace=function(r,n,e){if(void 0===e&&(e=Math.max(Math.round(n-r)+1,1)),e<2)return 1===e?[r]:[];var i,t=Array(e);for(i=--e;i>=0;i--)t[i]=(i*n+(e-i)*r)/e;return t},numeric.getBlock=function(r,n,e){var i=numeric.dim(r);return function r(t,u){var o,c=n[u],a=e[u]-c,f=Array(a);if(u===i.length-1){for(o=a;o>=0;o--)f[o]=t[o+c];return f}for(o=a;o>=0;o--)f[o]=r(t[o+c],u+1);return f}(r,0)},numeric.setBlock=function(r,n,e,i){var t=numeric.dim(r);return function r(i,u,o){var c,a=n[o],f=e[o]-a;if(o===t.length-1)for(c=f;c>=0;c--)i[c+a]=u[c];for(c=f;c>=0;c--)r(i[c+a],u[c],o+1)}(r,i,0),r},numeric.getRange=function(r,n,e){var i,t,u,o,c=n.length,a=e.length,f=Array(c);for(i=c-1;-1!==i;--i)for(f[i]=Array(a),u=f[i],o=r[n[i]],t=a-1;-1!==t;--t)u[t]=o[e[t]];return f},numeric.blockMatrix=function(r){var n=numeric.dim(r);if(n.length<4)return numeric.blockMatrix([r]);var e,i,t,u,o,c=n[0],a=n[1];for(e=0,i=0,t=0;t<c;++t)e+=r[t][0].length;for(u=0;u<a;++u)i+=r[0][u][0].length;var f=Array(e);for(t=0;t<e;++t)f[t]=Array(i);var m,s,h,l,p,y=0;for(t=0;t<c;++t){for(m=i,u=a-1;-1!==u;--u)for(m-=(o=r[t][u])[0].length,h=o.length-1;-1!==h;--h)for(p=o[h],s=f[y+h],l=p.length-1;-1!==l;--l)s[m+l]=p[l];y+=r[t][0].length}return f},numeric.tensor=function(r,n){if("number"==typeof r||"number"==typeof n)return numeric.mul(r,n);var e=numeric.dim(r),i=numeric.dim(n);if(1!==e.length||1!==i.length)throw new Error("numeric: tensor product is only defined for vectors");var t,u,o,c,a=e[0],f=i[0],m=Array(a);for(u=a-1;u>=0;u--){for(t=Array(f),c=r[u],o=f-1;o>=3;--o)t[o]=c*n[o],t[--o]=c*n[o],t[--o]=c*n[o],t[--o]=c*n[o];for(;o>=0;)t[o]=c*n[o],--o;m[u]=t}return m},numeric.T=function(r,n){this.x=r,this.y=n},numeric.t=function(r,n){return new numeric.T(r,n)},numeric.Tbinop=function(r,n,e,i,t){var u;numeric.indexOf;if("string"!=typeof t)for(u in t="",numeric)numeric.hasOwnProperty(u)&&(r.indexOf(u)>=0||n.indexOf(u)>=0||e.indexOf(u)>=0||i.indexOf(u)>=0)&&u.length>1&&(t+="var "+u+" = numeric."+u+";\n");return Function(["y"],"var x = this;\nif(!(y instanceof numeric.T)) { y = new numeric.T(y); }\n"+t+"\nif(x.y) {  if(y.y) {    return new numeric.T("+i+");\n  }\n  return new numeric.T("+e+");\n}\nif(y.y) {\n  return new numeric.T("+n+");\n}\nreturn new numeric.T("+r+");\n")},numeric.T.prototype.add=numeric.Tbinop("add(x.x,y.x)","add(x.x,y.x),y.y","add(x.x,y.x),x.y","add(x.x,y.x),add(x.y,y.y)"),numeric.T.prototype.sub=numeric.Tbinop("sub(x.x,y.x)","sub(x.x,y.x),neg(y.y)","sub(x.x,y.x),x.y","sub(x.x,y.x),sub(x.y,y.y)"),numeric.T.prototype.mul=numeric.Tbinop("mul(x.x,y.x)","mul(x.x,y.x),mul(x.x,y.y)","mul(x.x,y.x),mul(x.y,y.x)","sub(mul(x.x,y.x),mul(x.y,y.y)),add(mul(x.x,y.y),mul(x.y,y.x))"),numeric.T.prototype.reciprocal=function(){var r=numeric.mul,n=numeric.div;if(this.y){var e=numeric.add(r(this.x,this.x),r(this.y,this.y));return new numeric.T(n(this.x,e),n(numeric.neg(this.y),e))}return new T(n(1,this.x))},numeric.T.prototype.div=function(r){if(r instanceof numeric.T||(r=new numeric.T(r)),r.y)return this.mul(r.reciprocal());var n=numeric.div;return this.y?new numeric.T(n(this.x,r.x),n(this.y,r.x)):new numeric.T(n(this.x,r.x))},numeric.T.prototype.dot=numeric.Tbinop("dot(x.x,y.x)","dot(x.x,y.x),dot(x.x,y.y)","dot(x.x,y.x),dot(x.y,y.x)","sub(dot(x.x,y.x),dot(x.y,y.y)),add(dot(x.x,y.y),dot(x.y,y.x))"),numeric.T.prototype.transpose=function(){var r=numeric.transpose,n=this.x,e=this.y;return e?new numeric.T(r(n),r(e)):new numeric.T(r(n))},numeric.T.prototype.transjugate=function(){var r=numeric.transpose,n=this.x,e=this.y;return e?new numeric.T(r(n),numeric.negtranspose(e)):new numeric.T(r(n))},numeric.Tunop=function(r,n,e){return"string"!=typeof e&&(e=""),Function("var x = this;\n"+e+"\nif(x.y) {  "+n+";\n}\n"+r+";\n")},numeric.T.prototype.exp=numeric.Tunop("return new numeric.T(ex)","return new numeric.T(mul(cos(x.y),ex),mul(sin(x.y),ex))","var ex = numeric.exp(x.x), cos = numeric.cos, sin = numeric.sin, mul = numeric.mul;"),numeric.T.prototype.conj=numeric.Tunop("return new numeric.T(x.x);","return new numeric.T(x.x,numeric.neg(x.y));"),numeric.T.prototype.neg=numeric.Tunop("return new numeric.T(neg(x.x));","return new numeric.T(neg(x.x),neg(x.y));","var neg = numeric.neg;"),numeric.T.prototype.sin=numeric.Tunop("return new numeric.T(numeric.sin(x.x))","return x.exp().sub(x.neg().exp()).div(new numeric.T(0,2));"),numeric.T.prototype.cos=numeric.Tunop("return new numeric.T(numeric.cos(x.x))","return x.exp().add(x.neg().exp()).div(2);"),numeric.T.prototype.abs=numeric.Tunop("return new numeric.T(numeric.abs(x.x));","return new numeric.T(numeric.sqrt(numeric.add(mul(x.x,x.x),mul(x.y,x.y))));","var mul = numeric.mul;"),numeric.T.prototype.log=numeric.Tunop("return new numeric.T(numeric.log(x.x));","var theta = new numeric.T(numeric.atan2(x.y,x.x)), r = x.abs();\nreturn new numeric.T(numeric.log(r.x),theta.x);"),numeric.T.prototype.norm2=numeric.Tunop("return numeric.norm2(x.x);","var f = numeric.norm2Squared;\nreturn Math.sqrt(f(x.x)+f(x.y));"),numeric.T.prototype.inv=function(){var r=this;if(void 0===r.y)return new numeric.T(numeric.inv(r.x));var n,e,i,t,u,o,c,a,f,m,s,h,l,p,y,g,d,v,x=r.x.length,b=numeric.identity(x),w=numeric.rep([x,x],0),M=numeric.clone(r.x),k=numeric.clone(r.y);for(f=0;f<x;f++){for(h=(p=M[f][f])*p+(y=k[f][f])*y,s=f,m=f+1;m<x;m++)(l=(p=M[m][f])*p+(y=k[m][f])*y)>h&&(s=m,h=l);for(s!==f&&(v=M[f],M[f]=M[s],M[s]=v,v=k[f],k[f]=k[s],k[s]=v,v=b[f],b[f]=b[s],b[s]=v,v=w[f],w[f]=w[s],w[s]=v),n=M[f],e=k[f],u=b[f],o=w[f],p=n[f],y=e[f],m=f+1;m<x;m++)g=n[m],d=e[m],n[m]=(g*p+d*y)/h,e[m]=(d*p-g*y)/h;for(m=0;m<x;m++)g=u[m],d=o[m],u[m]=(g*p+d*y)/h,o[m]=(d*p-g*y)/h;for(m=f+1;m<x;m++){for(i=M[m],t=k[m],c=b[m],a=w[m],p=i[f],y=t[f],s=f+1;s<x;s++)g=n[s],d=e[s],i[s]-=g*p-d*y,t[s]-=d*p+g*y;for(s=0;s<x;s++)g=u[s],d=o[s],c[s]-=g*p-d*y,a[s]-=d*p+g*y}}for(f=x-1;f>0;f--)for(u=b[f],o=w[f],m=f-1;m>=0;m--)for(c=b[m],a=w[m],p=M[m][f],y=k[m][f],s=x-1;s>=0;s--)g=u[s],d=o[s],c[s]-=p*g-y*d,a[s]-=p*d+y*g;return new numeric.T(b,w)},numeric.T.prototype.get=function(r){var n,e=this.x,i=this.y,t=0,u=r.length;if(i){for(;t<u;)e=e[n=r[t]],i=i[n],t++;return new numeric.T(e,i)}for(;t<u;)e=e[n=r[t]],t++;return new numeric.T(e)},numeric.T.prototype.set=function(r,n){var e,i=this.x,t=this.y,u=0,o=r.length,c=n.x,a=n.y;if(0===o)return a?this.y=a:t&&(this.y=void 0),this.x=i,this;if(a){for(t||(t=numeric.rep(numeric.dim(i),0),this.y=t);u<o-1;)i=i[e=r[u]],t=t[e],u++;return i[e=r[u]]=c,t[e]=a,this}if(t){for(;u<o-1;)i=i[e=r[u]],t=t[e],u++;return i[e=r[u]]=c,c instanceof Array?t[e]=numeric.rep(numeric.dim(c),0):t[e]=0,this}for(;u<o-1;)i=i[e=r[u]],u++;return i[e=r[u]]=c,this},numeric.T.prototype.getRows=function(r,n){var e,i,t=n-r+1,u=Array(t),o=this.x,c=this.y;for(e=r;e<=n;e++)u[e-r]=o[e];if(c){for(i=Array(t),e=r;e<=n;e++)i[e-r]=c[e];return new numeric.T(u,i)}return new numeric.T(u)},numeric.T.prototype.setRows=function(r,n,e){var i,t=this.x,u=this.y,o=e.x,c=e.y;for(i=r;i<=n;i++)t[i]=o[i-r];if(c)for(u||(u=numeric.rep(numeric.dim(t),0),this.y=u),i=r;i<=n;i++)u[i]=c[i-r];else if(u)for(i=r;i<=n;i++)u[i]=numeric.rep([o[i-r].length],0);return this},numeric.T.prototype.getRow=function(r){var n=this.x,e=this.y;return e?new numeric.T(n[r],e[r]):new numeric.T(n[r])},numeric.T.prototype.setRow=function(r,n){var e=this.x,i=this.y,t=n.x,u=n.y;return e[r]=t,u?(i||(i=numeric.rep(numeric.dim(e),0),this.y=i),i[r]=u):i&&(i=numeric.rep([t.length],0)),this},numeric.T.prototype.getBlock=function(r,n){var e=this.x,i=this.y,t=numeric.getBlock;return i?new numeric.T(t(e,r,n),t(i,r,n)):new numeric.T(t(e,r,n))},numeric.T.prototype.setBlock=function(r,n,e){e instanceof numeric.T||(e=new numeric.T(e));var i=this.x,t=this.y,u=numeric.setBlock,o=e.x,c=e.y;if(c)return t||(this.y=numeric.rep(numeric.dim(this),0),t=this.y),u(i,r,n,o),u(t,r,n,c),this;u(i,r,n,o),t&&u(t,r,n,numeric.rep(numeric.dim(o),0))},numeric.T.rep=function(r,n){var e=numeric.T;n instanceof e||(n=new e(n));var i=n.x,t=n.y,u=numeric.rep;return t?new e(u(r,i),u(r,t)):new e(u(r,i))},numeric.T.diag=function(r){r instanceof numeric.T||(r=new numeric.T(r));var n=r.x,e=r.y,i=numeric.diag;return e?new numeric.T(i(n),i(e)):new numeric.T(i(n))},numeric.T.eig=function(){if(this.y)throw new Error("eig: not implemented for complex matrices.");return numeric.eig(this.x)},numeric.T.identity=function(r){return new numeric.T(numeric.identity(r))},numeric.T.prototype.getDiag=function(){var r=numeric,n=this.x,e=this.y;return e?new r.T(r.getDiag(n),r.getDiag(e)):new r.T(r.getDiag(n))},numeric.house=function(r){var n=numeric.clone(r),e=(r[0]>=0?1:-1)*numeric.norm2(r);n[0]+=e;var i=numeric.norm2(n);if(0===i)throw new Error("eig: internal error");return numeric.div(n,i)},numeric.toUpperHessenberg=function(r){var n=numeric.dim(r);if(2!==n.length||n[0]!==n[1])throw new Error("numeric: toUpperHessenberg() only works on square matrices");var e,i,t,u,o,c,a,f,m,s,h=n[0],l=numeric.clone(r),p=numeric.identity(h);for(i=0;i<h-2;i++){for(u=Array(h-i-1),e=i+1;e<h;e++)u[e-i-1]=l[e][i];if(numeric.norm2(u)>0){for(o=numeric.house(u),c=numeric.getBlock(l,[i+1,i],[h-1,h-1]),a=numeric.tensor(o,numeric.dot(o,c)),e=i+1;e<h;e++)for(f=l[e],m=a[e-i-1],t=i;t<h;t++)f[t]-=2*m[t-i];for(c=numeric.getBlock(l,[0,i+1],[h-1,h-1]),a=numeric.tensor(numeric.dot(c,o),o),e=0;e<h;e++)for(f=l[e],m=a[e],t=i+1;t<h;t++)f[t]-=2*m[t-i-1];for(c=Array(h-i-1),e=i+1;e<h;e++)c[e-i-1]=p[e];for(a=numeric.tensor(o,numeric.dot(o,c)),e=i+1;e<h;e++)for(s=p[e],m=a[e-i-1],t=0;t<h;t++)s[t]-=2*m[t]}}return{H:l,Q:p}},numeric.epsilon=2.220446049250313e-16,numeric.QRFrancis=function(r,n){void 0===n&&(n=1e4),r=numeric.clone(r);numeric.clone(r);var e,i,t,u,o,c,a,f,m,s,h,l,p,y,g,d,v,x,b=numeric.dim(r)[0],w=numeric.identity(b);if(b<3)return{Q:w,B:[[0,b-1]]};var M=numeric.epsilon;for(x=0;x<n;x++){for(d=0;d<b-1;d++)if(Math.abs(r[d+1][d])<M*(Math.abs(r[d][d])+Math.abs(r[d+1][d+1]))){var k=numeric.QRFrancis(numeric.getBlock(r,[0,0],[d,d]),n),A=numeric.QRFrancis(numeric.getBlock(r,[d+1,d+1],[b-1,b-1]),n);for(l=Array(d+1),g=0;g<=d;g++)l[g]=w[g];for(p=numeric.dot(k.Q,l),g=0;g<=d;g++)w[g]=p[g];for(l=Array(b-d-1),g=d+1;g<b;g++)l[g-d-1]=w[g];for(p=numeric.dot(A.Q,l),g=d+1;g<b;g++)w[g]=p[g-d-1];return{Q:w,B:k.B.concat(numeric.add(A.B,d+1))}}var T,j,S;if(t=r[b-2][b-2],u=r[b-2][b-1],o=r[b-1][b-2],f=t+(c=r[b-1][b-1]),a=t*c-u*o,m=numeric.getBlock(r,[0,0],[2,2]),f*f>=4*a)T=.5*(f+Math.sqrt(f*f-4*a)),j=.5*(f-Math.sqrt(f*f-4*a)),m=numeric.add(numeric.sub(numeric.dot(m,m),numeric.mul(m,T+j)),numeric.diag(numeric.rep([3],T*j)));else m=numeric.add(numeric.sub(numeric.dot(m,m),numeric.mul(m,f)),numeric.diag(numeric.rep([3],a)));for(e=[m[0][0],m[1][0],m[2][0]],i=numeric.house(e),l=[r[0],r[1],r[2]],p=numeric.tensor(i,numeric.dot(i,l)),g=0;g<3;g++)for(h=r[g],y=p[g],v=0;v<b;v++)h[v]-=2*y[v];for(l=numeric.getBlock(r,[0,0],[b-1,2]),p=numeric.tensor(numeric.dot(l,i),i),g=0;g<b;g++)for(h=r[g],y=p[g],v=0;v<3;v++)h[v]-=2*y[v];for(l=[w[0],w[1],w[2]],p=numeric.tensor(i,numeric.dot(i,l)),g=0;g<3;g++)for(s=w[g],y=p[g],v=0;v<b;v++)s[v]-=2*y[v];for(d=0;d<b-2;d++){for(v=d;v<=d+1;v++)if(Math.abs(r[v+1][v])<M*(Math.abs(r[v][v])+Math.abs(r[v+1][v+1]))){k=numeric.QRFrancis(numeric.getBlock(r,[0,0],[v,v]),n),A=numeric.QRFrancis(numeric.getBlock(r,[v+1,v+1],[b-1,b-1]),n);for(l=Array(v+1),g=0;g<=v;g++)l[g]=w[g];for(p=numeric.dot(k.Q,l),g=0;g<=v;g++)w[g]=p[g];for(l=Array(b-v-1),g=v+1;g<b;g++)l[g-v-1]=w[g];for(p=numeric.dot(A.Q,l),g=v+1;g<b;g++)w[g]=p[g-v-1];return{Q:w,B:k.B.concat(numeric.add(A.B,v+1))}}for(S=Math.min(b-1,d+3),e=Array(S-d),g=d+1;g<=S;g++)e[g-d-1]=r[g][d];for(i=numeric.house(e),l=numeric.getBlock(r,[d+1,d],[S,b-1]),p=numeric.tensor(i,numeric.dot(i,l)),g=d+1;g<=S;g++)for(h=r[g],y=p[g-d-1],v=d;v<b;v++)h[v]-=2*y[v-d];for(l=numeric.getBlock(r,[0,d+1],[b-1,S]),p=numeric.tensor(numeric.dot(l,i),i),g=0;g<b;g++)for(h=r[g],y=p[g],v=d+1;v<=S;v++)h[v]-=2*y[v-d-1];for(l=Array(S-d),g=d+1;g<=S;g++)l[g-d-1]=w[g];for(p=numeric.tensor(i,numeric.dot(i,l)),g=d+1;g<=S;g++)for(s=w[g],y=p[g-d-1],v=0;v<b;v++)s[v]-=2*y[v]}}throw new Error("numeric: eigenvalue iteration does not converge -- increase maxiter?")},numeric.eig=function(r,n){var e,i,t,u,o,c,a,f,m,s,h,l,p,y,g,d,v=numeric.toUpperHessenberg(r),x=numeric.QRFrancis(v.H,n),b=numeric.T,w=r.length,M=x.B,k=numeric.dot(x.Q,numeric.dot(v.H,numeric.transpose(x.Q))),A=new b(numeric.dot(x.Q,v.Q)),T=M.length,j=Math.sqrt;for(i=0;i<T;i++)if((e=M[i][0])===M[i][1]);else{if(u=e+1,o=k[e][e],c=k[e][u],a=k[u][e],f=k[u][u],0===c&&0===a)continue;(s=(m=-o-f)*m-4*(o*f-c*a))>=0?((g=(o-(h=m<0?-.5*(m-j(s)):-.5*(m+j(s))))*(o-h)+c*c)>(d=a*a+(f-h)*(f-h))?(p=(o-h)/(g=j(g)),y=c/g):(p=a/(d=j(d)),y=(f-h)/d),t=new b([[y,-p],[p,y]]),A.setRows(e,u,t.dot(A.getRows(e,u)))):(h=-.5*m,l=.5*j(-s),(g=(o-h)*(o-h)+c*c)>(d=a*a+(f-h)*(f-h))?(p=(o-h)/(g=j(g+l*l)),y=c/g,h=0,l/=g):(p=a/(d=j(d+l*l)),y=(f-h)/d,h=l/d,l=0),t=new b([[y,-p],[p,y]],[[h,l],[l,-h]]),A.setRows(e,u,t.dot(A.getRows(e,u))))}var S=A.dot(r).dot(A.transjugate()),_=(w=r.length,numeric.T.identity(w));for(u=0;u<w;u++)if(u>0)for(i=u-1;i>=0;i--){var V=S.get([i,i]),P=S.get([u,u]);numeric.neq(V.x,P.x)||numeric.neq(V.y,P.y)?(h=S.getRow(i).getBlock([i],[u-1]),l=_.getRow(u).getBlock([i],[u-1]),_.set([u,i],S.get([i,u]).neg().sub(h.dot(l)).div(V.sub(P)))):_.setRow(u,_.getRow(i))}for(u=0;u<w;u++)h=_.getRow(u),_.setRow(u,h.div(h.norm2()));return _=_.transpose(),_=A.transjugate().dot(_),{lambda:S.getDiag(),E:_}},numeric.ccsSparse=function(r){var n,e,i,t=r.length,u=[];for(e=t-1;-1!==e;--e)for(i in n=r[e]){for(i=parseInt(i);i>=u.length;)u[u.length]=0;0!==n[i]&&u[i]++}var o=u.length,c=Array(o+1);for(c[0]=0,e=0;e<o;++e)c[e+1]=c[e]+u[e];var a=Array(c[o]),f=Array(c[o]);for(e=t-1;-1!==e;--e)for(i in n=r[e])0!==n[i]&&(u[i]--,a[c[i]+u[i]]=e,f[c[i]+u[i]]=n[i]);return[c,a,f]},numeric.ccsFull=function(r){var n,e,i,t,u=r[0],o=r[1],c=r[2],a=numeric.ccsDim(r),f=a[0],m=a[1],s=numeric.rep([f,m],0);for(n=0;n<m;n++)for(i=u[n],t=u[n+1],e=i;e<t;++e)s[o[e]][n]=c[e];return s},numeric.ccsTSolve=function(r,n,e,i,t){var u,o,c,a,f,m,s,h=r[0],l=r[1],p=r[2],y=h.length-1,g=Math.max,d=0;function v(r){var n;if(0===e[r]){for(e[r]=1,n=h[r];n<h[r+1];++n)v(l[n]);t[d]=r,++d}}for(void 0===i&&(e=numeric.rep([y],0)),void 0===i&&(i=numeric.linspace(0,e.length-1)),void 0===t&&(t=[]),u=i.length-1;-1!==u;--u)v(i[u]);for(t.length=d,u=t.length-1;-1!==u;--u)e[t[u]]=0;for(u=i.length-1;-1!==u;--u)o=i[u],e[o]=n[o];for(u=t.length-1;-1!==u;--u){for(o=t[u],c=h[o],a=g(h[o+1],c),f=c;f!==a;++f)if(l[f]===o){e[o]/=p[f];break}for(s=e[o],f=c;f!==a;++f)(m=l[f])!==o&&(e[m]-=s*p[f])}return e},numeric.ccsDFS=function(r){this.k=Array(r),this.k1=Array(r),this.j=Array(r)},numeric.ccsDFS.prototype.dfs=function(r,n,e,i,t,u){var o,c,a,f=0,m=t.length,s=this.k,h=this.k1,l=this.j;if(0===i[r])for(i[r]=1,l[0]=r,s[0]=c=n[r],h[0]=a=n[r+1];;)if(c>=a){if(t[m]=l[f],0===f)return;++m,c=s[--f],a=h[f]}else 0===i[o=u[e[c]]]?(i[o]=1,s[f]=c,l[++f]=o,c=n[o],h[f]=a=n[o+1]):++c},numeric.ccsLPSolve=function(r,n,e,i,t,u,o){var c,a,f,m,s,h,l,p,y,g=r[0],d=r[1],v=r[2],x=(g.length,n[0]),b=n[1],w=n[2];for(a=x[t],f=x[t+1],i.length=0,c=a;c<f;++c)o.dfs(u[b[c]],g,d,e,i,u);for(c=i.length-1;-1!==c;--c)e[i[c]]=0;for(c=a;c!==f;++c)e[m=u[b[c]]]=w[c];for(c=i.length-1;-1!==c;--c){for(s=g[m=i[c]],h=g[m+1],l=s;l<h;++l)if(u[d[l]]===m){e[m]/=v[l];break}for(y=e[m],l=s;l<h;++l)(p=u[d[l]])!==m&&(e[p]-=y*v[l])}return e},numeric.ccsLUP1=function(r,n){var e,i,t,u,o,c,a,f=r[0].length-1,m=[numeric.rep([f+1],0),[],[]],s=[numeric.rep([f+1],0),[],[]],h=m[0],l=m[1],p=m[2],y=s[0],g=s[1],d=s[2],v=numeric.rep([f],0),x=numeric.rep([f],0),b=numeric.ccsLPSolve,w=(Math.max,Math.abs),M=numeric.linspace(0,f-1),k=numeric.linspace(0,f-1),A=new numeric.ccsDFS(f);for(void 0===n&&(n=1),e=0;e<f;++e){for(b(m,r,v,x,e,k,A),u=-1,o=-1,i=x.length-1;-1!==i;--i)(t=x[i])<=e||(c=w(v[t]))>u&&(o=t,u=c);for(w(v[e])<n*u&&(i=M[e],u=M[o],M[e]=u,k[u]=e,M[o]=i,k[i]=o,u=v[e],v[e]=v[o],v[o]=u),u=h[e],o=y[e],a=v[e],l[u]=M[e],p[u]=1,++u,i=x.length-1;-1!==i;--i)c=v[t=x[i]],x[i]=0,v[t]=0,t<=e?(g[o]=t,d[o]=c,++o):(l[u]=M[t],p[u]=c/a,++u);h[e+1]=u,y[e+1]=o}for(i=l.length-1;-1!==i;--i)l[i]=k[l[i]];return{L:m,U:s,P:M,Pinv:k}},numeric.ccsDFS0=function(r){this.k=Array(r),this.k1=Array(r),this.j=Array(r)},numeric.ccsDFS0.prototype.dfs=function(r,n,e,i,t,u,o){var c,a,f,m=0,s=t.length,h=this.k,l=this.k1,p=this.j;if(0===i[r])for(i[r]=1,p[0]=r,h[0]=a=n[u[r]],l[0]=f=n[u[r]+1];;){if(isNaN(a))throw new Error("Ow!");if(a>=f){if(t[s]=u[p[m]],0===m)return;++s,a=h[--m],f=l[m]}else 0===i[c=e[a]]?(i[c]=1,h[m]=a,p[++m]=c,a=n[c=u[c]],l[m]=f=n[c+1]):++a}},numeric.ccsLPSolve0=function(r,n,e,i,t,u,o,c){var a,f,m,s,h,l,p,y,g,d=r[0],v=r[1],x=r[2],b=(d.length,n[0]),w=n[1],M=n[2];for(f=b[t],m=b[t+1],i.length=0,a=f;a<m;++a)c.dfs(w[a],d,v,e,i,u,o);for(a=i.length-1;-1!==a;--a)e[o[s=i[a]]]=0;for(a=f;a!==m;++a)e[s=w[a]]=M[a];for(a=i.length-1;-1!==a;--a){for(y=o[s=i[a]],h=d[s],l=d[s+1],p=h;p<l;++p)if(v[p]===y){e[y]/=x[p];break}for(g=e[y],p=h;p<l;++p)e[v[p]]-=g*x[p];e[y]=g}},numeric.ccsLUP0=function(r,n){var e,i,t,u,o,c,a,f=r[0].length-1,m=[numeric.rep([f+1],0),[],[]],s=[numeric.rep([f+1],0),[],[]],h=m[0],l=m[1],p=m[2],y=s[0],g=s[1],d=s[2],v=numeric.rep([f],0),x=numeric.rep([f],0),b=numeric.ccsLPSolve0,w=(Math.max,Math.abs),M=numeric.linspace(0,f-1),k=numeric.linspace(0,f-1),A=new numeric.ccsDFS0(f);for(void 0===n&&(n=1),e=0;e<f;++e){for(b(m,r,v,x,e,k,M,A),u=-1,o=-1,i=x.length-1;-1!==i;--i)(t=x[i])<=e||(c=w(v[M[t]]))>u&&(o=t,u=c);for(w(v[M[e]])<n*u&&(i=M[e],u=M[o],M[e]=u,k[u]=e,M[o]=i,k[i]=o),u=h[e],o=y[e],a=v[M[e]],l[u]=M[e],p[u]=1,++u,i=x.length-1;-1!==i;--i)c=v[M[t=x[i]]],x[i]=0,v[M[t]]=0,t<=e?(g[o]=t,d[o]=c,++o):(l[u]=M[t],p[u]=c/a,++u);h[e+1]=u,y[e+1]=o}for(i=l.length-1;-1!==i;--i)l[i]=k[l[i]];return{L:m,U:s,P:M,Pinv:k}},numeric.ccsLUP=numeric.ccsLUP0,numeric.ccsDim=function(r){return[numeric.sup(r[1])+1,r[0].length-1]},numeric.ccsGetBlock=function(r,n,e){var i=numeric.ccsDim(r),t=i[0],u=i[1];void 0===n?n=numeric.linspace(0,t-1):"number"==typeof n&&(n=[n]),void 0===e?e=numeric.linspace(0,u-1):"number"==typeof e&&(e=[e]);var o,c,a,f,m=n.length,s=e.length,h=numeric.rep([u],0),l=[],p=[],y=[h,l,p],g=r[0],d=r[1],v=r[2],x=numeric.rep([t],0),b=0,w=numeric.rep([t],0);for(c=0;c<s;++c){var M=g[f=e[c]],k=g[f+1];for(o=M;o<k;++o)w[a=d[o]]=1,x[a]=v[o];for(o=0;o<m;++o)w[n[o]]&&(l[b]=o,p[b]=x[n[o]],++b);for(o=M;o<k;++o)w[a=d[o]]=0;h[c+1]=b}return y},numeric.ccsDot=function(r,n){var e,i,t,u,o,c,a,f,m,s,h,l=r[0],p=r[1],y=r[2],g=n[0],d=n[1],v=n[2],x=numeric.ccsDim(r),b=numeric.ccsDim(n),w=x[0],M=(x[1],b[1]),k=numeric.rep([w],0),A=numeric.rep([w],0),T=Array(w),j=numeric.rep([M],0),S=[],_=[],V=[j,S,_];for(t=0;t!==M;++t){for(u=g[t],o=g[t+1],m=0,i=u;i<o;++i)for(s=d[i],h=v[i],c=l[s],a=l[s+1],e=c;e<a;++e)0===A[f=p[e]]&&(T[m]=f,A[f]=1,m+=1),k[f]=k[f]+y[e]*h;for(o=(u=j[t])+m,j[t+1]=o,i=m-1;-1!==i;--i)h=u+i,e=T[i],S[h]=e,_[h]=k[e],A[e]=0,k[e]=0;j[t+1]=j[t]+m}return V},numeric.ccsLUPSolve=function(r,n){var e=r.L,i=r.U,t=(r.P,n[0]),u=!1;"object"!=typeof t&&(t=(n=[[0,n.length],numeric.linspace(0,n.length-1),n])[0],u=!0);var o,c,a,f,m,s,h=n[1],l=n[2],p=e[0].length-1,y=t.length-1,g=numeric.rep([p],0),d=Array(p),v=numeric.rep([p],0),x=Array(p),b=numeric.rep([y+1],0),w=[],M=[],k=numeric.ccsTSolve,A=0;for(o=0;o<y;++o){for(m=0,a=t[o],f=t[o+1],c=a;c<f;++c)s=r.Pinv[h[c]],x[m]=s,v[s]=l[c],++m;for(x.length=m,k(e,v,g,x,d),c=x.length-1;-1!==c;--c)v[x[c]]=0;if(k(i,g,v,d,x),u)return v;for(c=d.length-1;-1!==c;--c)g[d[c]]=0;for(c=x.length-1;-1!==c;--c)s=x[c],w[A]=s,M[A]=v[s],v[s]=0,++A;b[o+1]=A}return[b,w,M]},numeric.ccsbinop=function(r,n){return void 0===n&&(n=""),Function("X","Y","var Xi = X[0], Xj = X[1], Xv = X[2];\nvar Yi = Y[0], Yj = Y[1], Yv = Y[2];\nvar n = Xi.length-1,m = Math.max(numeric.sup(Xj),numeric.sup(Yj))+1;\nvar Zi = numeric.rep([n+1],0), Zj = [], Zv = [];\nvar x = numeric.rep([m],0),y = numeric.rep([m],0);\nvar xk,yk,zk;\nvar i,j,j0,j1,k,p=0;\n"+n+"for(i=0;i<n;++i) {\n  j0 = Xi[i]; j1 = Xi[i+1];\n  for(j=j0;j!==j1;++j) {\n    k = Xj[j];\n    x[k] = 1;\n    Zj[p] = k;\n    ++p;\n  }\n  j0 = Yi[i]; j1 = Yi[i+1];\n  for(j=j0;j!==j1;++j) {\n    k = Yj[j];\n    y[k] = Yv[j];\n    if(x[k] === 0) {\n      Zj[p] = k;\n      ++p;\n    }\n  }\n  Zi[i+1] = p;\n  j0 = Xi[i]; j1 = Xi[i+1];\n  for(j=j0;j!==j1;++j) x[Xj[j]] = Xv[j];\n  j0 = Zi[i]; j1 = Zi[i+1];\n  for(j=j0;j!==j1;++j) {\n    k = Zj[j];\n    xk = x[k];\n    yk = y[k];\n"+r+"\n    Zv[j] = zk;\n  }\n  j0 = Xi[i]; j1 = Xi[i+1];\n  for(j=j0;j!==j1;++j) x[Xj[j]] = 0;\n  j0 = Yi[i]; j1 = Yi[i+1];\n  for(j=j0;j!==j1;++j) y[Yj[j]] = 0;\n}\nreturn [Zi,Zj,Zv];")},function(){var k,A,B,C;for(k in numeric.ops2)A=isFinite(eval("1"+numeric.ops2[k]+"0"))?"[Y[0],Y[1],numeric."+k+"(X,Y[2])]":"NaN",B=isFinite(eval("0"+numeric.ops2[k]+"1"))?"[X[0],X[1],numeric."+k+"(X[2],Y)]":"NaN",C=isFinite(eval("1"+numeric.ops2[k]+"0"))&&isFinite(eval("0"+numeric.ops2[k]+"1"))?"numeric.ccs"+k+"MM(X,Y)":"NaN",numeric["ccs"+k+"MM"]=numeric.ccsbinop("zk = xk "+numeric.ops2[k]+"yk;"),numeric["ccs"+k]=Function("X","Y",'if(typeof X === "number") return '+A+';\nif(typeof Y === "number") return '+B+";\nreturn "+C+";\n")}(),numeric.ccsScatter=function(r){var n,e=r[0],i=r[1],t=r[2],u=numeric.sup(i)+1,o=e.length,c=numeric.rep([u],0),a=Array(o),f=Array(o),m=numeric.rep([u],0);for(n=0;n<o;++n)m[i[n]]++;for(n=0;n<u;++n)c[n+1]=c[n]+m[n];var s,h,l=c.slice(0);for(n=0;n<o;++n)a[s=l[h=i[n]]]=e[n],f[s]=t[n],l[h]=l[h]+1;return[c,a,f]},numeric.ccsGather=function(r){var n,e,i,t,u,o=r[0],c=r[1],a=r[2],f=o.length-1,m=c.length,s=Array(m),h=Array(m),l=Array(m);for(u=0,n=0;n<f;++n)for(i=o[n],t=o[n+1],e=i;e!==t;++e)h[u]=n,s[u]=c[e],l[u]=a[e],++u;return[s,h,l]},numeric.sdim=function r(n,e,i){if(void 0===e&&(e=[]),"object"!=typeof n)return e;var t;for(t in void 0===i&&(i=0),i in e||(e[i]=0),n.length>e[i]&&(e[i]=n.length),n)n.hasOwnProperty(t)&&r(n[t],e,i+1);return e},numeric.sclone=function r(n,e,i){void 0===e&&(e=0),void 0===i&&(i=numeric.sdim(n).length);var t,u=Array(n.length);if(e===i-1){for(t in n)n.hasOwnProperty(t)&&(u[t]=n[t]);return u}for(t in n)n.hasOwnProperty(t)&&(u[t]=r(n[t],e+1,i));return u},numeric.sdiag=function(r){var n,e,i=r.length,t=Array(i);for(n=i-1;n>=1;n-=2)e=n-1,t[n]=[],t[n][n]=r[n],t[e]=[],t[e][e]=r[e];return 0===n&&(t[0]=[],t[0][0]=r[n]),t},numeric.sidentity=function(r){return numeric.sdiag(numeric.rep([r],1))},numeric.stranspose=function(r){var n,e,i,t=[];r.length;for(n in r)if(r.hasOwnProperty(n))for(e in i=r[n])i.hasOwnProperty(e)&&("object"!=typeof t[e]&&(t[e]=[]),t[e][n]=i[e]);return t},numeric.sLUP=function(r,n){throw new Error("The function numeric.sLUP had a bug in it and has been removed. Please use the new numeric.ccsLUP function instead.")},numeric.sdotMM=function(r,n){var e,i,t,u,o,c,a,f=r.length,m=(n.length,numeric.stranspose(n)),s=m.length,h=Array(f);for(t=f-1;t>=0;t--){for(a=[],e=r[t],o=s-1;o>=0;o--){for(u in c=0,i=m[o],e)e.hasOwnProperty(u)&&u in i&&(c+=e[u]*i[u]);c&&(a[o]=c)}h[t]=a}return h},numeric.sdotMV=function(r,n){var e,i,t,u,o=r.length,c=Array(o);for(i=o-1;i>=0;i--){for(t in u=0,e=r[i])e.hasOwnProperty(t)&&n[t]&&(u+=e[t]*n[t]);u&&(c[i]=u)}return c},numeric.sdotVM=function(r,n){var e,i,t,u,o=[];for(e in r)if(r.hasOwnProperty(e))for(i in t=n[e],u=r[e],t)t.hasOwnProperty(i)&&(o[i]||(o[i]=0),o[i]+=u*t[i]);return o},numeric.sdotVV=function(r,n){var e,i=0;for(e in r)r[e]&&n[e]&&(i+=r[e]*n[e]);return i},numeric.sdot=function(r,n){var e=numeric.sdim(r).length,i=numeric.sdim(n).length;switch(1e3*e+i){case 0:return r*n;case 1001:return numeric.sdotVV(r,n);case 2001:return numeric.sdotMV(r,n);case 1002:return numeric.sdotVM(r,n);case 2002:return numeric.sdotMM(r,n);default:throw new Error("numeric.sdot not implemented for tensors of order "+e+" and "+i)}},numeric.sscatter=function(r){var n,e,i,t,u=r[0].length,o=r.length,c=[];for(e=u-1;e>=0;--e)if(r[o-1][e]){for(t=c,i=0;i<o-2;i++)t[n=r[i][e]]||(t[n]=[]),t=t[n];t[r[i][e]]=r[i+1][e]}return c},numeric.sgather=function r(n,e,i){var t,u,o;for(u in void 0===e&&(e=[]),void 0===i&&(i=[]),t=i.length,n)if(n.hasOwnProperty(u))if(i[t]=parseInt(u),"number"==typeof(o=n[u])){if(o){if(0===e.length)for(u=t+1;u>=0;--u)e[u]=[];for(u=t;u>=0;--u)e[u].push(i[u]);e[t+1].push(o)}}else r(o,e,i);return i.length>t&&i.pop(),e},numeric.cLU=function(r){var n,e,i,t,u,o,c=r[0],a=r[1],f=r[2],m=c.length,s=0;for(n=0;n<m;n++)c[n]>s&&(s=c[n]);s++;var h,l=Array(s),p=Array(s),y=numeric.rep([s],1/0),g=numeric.rep([s],-1/0);for(i=0;i<m;i++)n=c[i],(e=a[i])<y[n]&&(y[n]=e),e>g[n]&&(g[n]=e);for(n=0;n<s-1;n++)g[n]>g[n+1]&&(g[n+1]=g[n]);for(n=s-1;n>=1;n--)y[n]<y[n-1]&&(y[n-1]=y[n]);for(n=0;n<s;n++)p[n]=numeric.rep([g[n]-y[n]+1],0),l[n]=numeric.rep([n-y[n]],0),n-y[n]+1,g[n]-n+1;for(i=0;i<m;i++)p[n=c[i]][a[i]-y[n]]=f[i];for(n=0;n<s-1;n++)for(t=n-y[n],x=p[n],e=n+1;y[e]<=n&&e<s;e++)if(u=n-y[e],o=g[n]-n,h=(b=p[e])[u]/x[t]){for(i=1;i<=o;i++)b[i+u]-=h*x[i+t];l[e][n-y[e]]=h}var d,v,x=[],b=[],w=[],M=[],k=[],A=[];for(m=0,d=0,n=0;n<s;n++){for(t=y[n],u=g[n],v=p[n],e=n;e<=u;e++)v[e-t]&&(x[m]=n,b[m]=e,w[m]=v[e-t],m++);for(v=l[n],e=t;e<n;e++)v[e-t]&&(M[d]=n,k[d]=e,A[d]=v[e-t],d++);M[d]=n,k[d]=n,A[d]=1,d++}return{U:[x,b,w],L:[M,k,A]}},numeric.cLUsolve=function(r,n){var e,i,t=r.L,u=r.U,o=numeric.clone(n),c=t[0],a=t[1],f=t[2],m=u[0],s=u[1],h=u[2],l=m.length,p=(c.length,o.length);for(i=0,e=0;e<p;e++){for(;a[i]<e;)o[e]-=f[i]*o[a[i]],i++;i++}for(i=l-1,e=p-1;e>=0;e--){for(;s[i]>e;)o[e]-=h[i]*o[s[i]],i--;o[e]/=h[i],i--}return o},numeric.cgrid=function(r,n){"number"==typeof r&&(r=[r,r]);var e,i,t,u=numeric.rep(r,-1);if("function"!=typeof n)switch(n){case"L":n=function(n,e){return n>=r[0]/2||e<r[1]/2};break;default:n=function(r,n){return!0}}for(t=0,e=1;e<r[0]-1;e++)for(i=1;i<r[1]-1;i++)n(e,i)&&(u[e][i]=t,t++);return u},numeric.cdelsq=function(r){var n,e,i,t,u,o=[[-1,0],[0,-1],[0,1],[1,0]],c=numeric.dim(r),a=c[0],f=c[1],m=[],s=[],h=[];for(n=1;n<a-1;n++)for(e=1;e<f-1;e++)if(!(r[n][e]<0)){for(i=0;i<4;i++)t=n+o[i][0],u=e+o[i][1],r[t][u]<0||(m.push(r[n][e]),s.push(r[t][u]),h.push(-1));m.push(r[n][e]),s.push(r[n][e]),h.push(4)}return[m,s,h]},numeric.cdotMV=function(r,n){var e,i,t,u=r[0],o=r[1],c=r[2],a=u.length;for(t=0,i=0;i<a;i++)u[i]>t&&(t=u[i]);for(t++,e=numeric.rep([t],0),i=0;i<a;i++)e[u[i]]+=c[i]*n[o[i]];return e},numeric.Spline=function(r,n,e,i,t){this.x=r,this.yl=n,this.yr=e,this.kl=i,this.kr=t},numeric.Spline.prototype._at=function(r,n){var e,i,t,u=this.x,o=this.yl,c=this.yr,a=this.kl,f=this.kr,m=numeric.add,s=numeric.sub,h=numeric.mul;e=s(h(a[n],u[n+1]-u[n]),s(c[n+1],o[n])),i=m(h(f[n+1],u[n]-u[n+1]),s(c[n+1],o[n]));var l=(t=(r-u[n])/(u[n+1]-u[n]))*(1-t);return m(m(m(h(1-t,o[n]),h(t,c[n+1])),h(e,l*(1-t))),h(i,l*t))},numeric.Spline.prototype.at=function(r){if("number"==typeof r){var n,e,i,t=this.x,u=t.length,o=Math.floor;for(n=0,e=u-1;e-n>1;)t[i=o((n+e)/2)]<=r?n=i:e=i;return this._at(r,n)}u=r.length;var c,a=Array(u);for(c=u-1;-1!==c;--c)a[c]=this.at(r[c]);return a},numeric.Spline.prototype.diff=function(){var r,n,e,i=this.x,t=this.yl,u=this.yr,o=this.kl,c=this.kr,a=t.length,f=o,m=c,s=Array(a),h=Array(a),l=numeric.add,p=numeric.mul,y=numeric.div,g=numeric.sub;for(r=a-1;-1!==r;--r)n=i[r+1]-i[r],e=g(u[r+1],t[r]),s[r]=y(l(p(e,6),p(o[r],-4*n),p(c[r+1],-2*n)),n*n),h[r+1]=y(l(p(e,-6),p(o[r],2*n),p(c[r+1],4*n)),n*n);return new numeric.Spline(i,f,m,s,h)},numeric.Spline.prototype.roots=function(){function r(r){return r*r}var n=[],e=this.x,i=this.yl,t=this.yr,u=this.kl,o=this.kr;"number"==typeof i[0]&&(i=[i],t=[t],u=[u],o=[o]);var c,a,f,m,s,h,l,p,y,g,d,v,x,b,w,M,k,A,T,j,S,_,V,P=i.length,q=e.length-1,F=(n=Array(P),Math.sqrt);for(c=0;c!==P;++c){for(m=i[c],s=t[c],h=u[c],l=o[c],p=[],a=0;a!==q;a++){for(a>0&&s[a]*m[a]<0&&p.push(e[a]),M=e[a+1]-e[a],e[a],d=m[a],v=s[a+1],y=h[a]/M,x=(g=l[a+1]/M)+3*d+2*y-3*v,b=3*(g+y+2*(d-v)),(w=r(y-g+3*(d-v))+12*g*d)<=0?k=(A=x/b)>e[a]&&A<e[a+1]?[e[a],A,e[a+1]]:[e[a],e[a+1]]:(A=(x-F(w))/b,T=(x+F(w))/b,k=[e[a]],A>e[a]&&A<e[a+1]&&k.push(A),T>e[a]&&T<e[a+1]&&k.push(T),k.push(e[a+1])),S=k[0],A=this._at(S,a),f=0;f<k.length-1;f++)if(_=k[f+1],T=this._at(_,a),0!==A)if(0===T||A*T>0)S=_,A=T;else{for(var L=0;!((V=(A*_-T*S)/(A-T))<=S||V>=_);)if((j=this._at(V,a))*T>0)_=V,T=j,-1===L&&(A*=.5),L=-1;else{if(!(j*A>0))break;S=V,A=j,1===L&&(T*=.5),L=1}p.push(V),S=k[f+1],A=this._at(S,a)}else p.push(S),S=_,A=T;0===T&&p.push(_)}n[c]=p}return"number"==typeof this.yl[0]?n[0]:n},numeric.spline=function(r,n,e,i){var t,u=r.length,o=[],c=[],a=[],f=numeric.sub,m=numeric.mul,s=numeric.add;for(t=u-2;t>=0;t--)c[t]=r[t+1]-r[t],a[t]=f(n[t+1],n[t]);"string"!=typeof e&&"string"!=typeof i||(e=i="periodic");var h=[[],[],[]];switch(typeof e){case"undefined":o[0]=m(3/(c[0]*c[0]),a[0]),h[0].push(0,0),h[1].push(0,1),h[2].push(2/c[0],1/c[0]);break;case"string":o[0]=s(m(3/(c[u-2]*c[u-2]),a[u-2]),m(3/(c[0]*c[0]),a[0])),h[0].push(0,0,0),h[1].push(u-2,0,1),h[2].push(1/c[u-2],2/c[u-2]+2/c[0],1/c[0]);break;default:o[0]=e,h[0].push(0),h[1].push(0),h[2].push(1)}for(t=1;t<u-1;t++)o[t]=s(m(3/(c[t-1]*c[t-1]),a[t-1]),m(3/(c[t]*c[t]),a[t])),h[0].push(t,t,t),h[1].push(t-1,t,t+1),h[2].push(1/c[t-1],2/c[t-1]+2/c[t],1/c[t]);switch(typeof i){case"undefined":o[u-1]=m(3/(c[u-2]*c[u-2]),a[u-2]),h[0].push(u-1,u-1),h[1].push(u-2,u-1),h[2].push(1/c[u-2],2/c[u-2]);break;case"string":h[1][h[1].length-1]=0;break;default:o[u-1]=i,h[0].push(u-1),h[1].push(u-1),h[2].push(1)}o="number"!=typeof o[0]?numeric.transpose(o):[o];var l=Array(o.length);if("string"==typeof e)for(t=l.length-1;-1!==t;--t)l[t]=numeric.ccsLUPSolve(numeric.ccsLUP(numeric.ccsScatter(h)),o[t]),l[t][u-1]=l[t][0];else for(t=l.length-1;-1!==t;--t)l[t]=numeric.cLUsolve(numeric.cLU(h),o[t]);return l="number"==typeof n[0]?l[0]:numeric.transpose(l),new numeric.Spline(r,n,n,l,l)},numeric.fftpow2=function r(n,e){var i=n.length;if(1!==i){var t,u,o=Math.cos,c=Math.sin,a=Array(i/2),f=Array(i/2),m=Array(i/2),s=Array(i/2);for(u=i/2,t=i-1;-1!==t;--t)m[--u]=n[t],s[u]=e[t],--t,a[u]=n[t],f[u]=e[t];r(a,f),r(m,s),u=i/2;var h,l,p,y=-6.283185307179586/i;for(t=i-1;-1!==t;--t)-1===--u&&(u=i/2-1),l=o(h=y*t),p=c(h),n[t]=a[u]+l*m[u]-p*s[u],e[t]=f[u]+l*s[u]+p*m[u]}},numeric._ifftpow2=function r(n,e){var i=n.length;if(1!==i){var t,u,o=Math.cos,c=Math.sin,a=Array(i/2),f=Array(i/2),m=Array(i/2),s=Array(i/2);for(u=i/2,t=i-1;-1!==t;--t)m[--u]=n[t],s[u]=e[t],--t,a[u]=n[t],f[u]=e[t];r(a,f),r(m,s),u=i/2;var h,l,p,y=6.283185307179586/i;for(t=i-1;-1!==t;--t)-1===--u&&(u=i/2-1),l=o(h=y*t),p=c(h),n[t]=a[u]+l*m[u]-p*s[u],e[t]=f[u]+l*s[u]+p*m[u]}},numeric.ifftpow2=function(r,n){numeric._ifftpow2(r,n),numeric.diveq(r,r.length),numeric.diveq(n,n.length)},numeric.convpow2=function(r,n,e,i){var t,u,o,c,a;for(numeric.fftpow2(r,n),numeric.fftpow2(e,i),t=r.length-1;-1!==t;--t)u=r[t],c=n[t],o=e[t],a=i[t],r[t]=u*o-c*a,n[t]=u*a+c*o;numeric.ifftpow2(r,n)},numeric.T.prototype.fft=function(){var r,n,e=this.x,i=this.y,t=e.length,u=Math.log,o=u(2),c=Math.ceil(u(2*t-1)/o),a=Math.pow(2,c),f=numeric.rep([a],0),m=numeric.rep([a],0),s=Math.cos,h=Math.sin,l=-3.141592653589793/t,p=numeric.rep([a],0),y=numeric.rep([a],0);Math.floor(t/2);for(r=0;r<t;r++)p[r]=e[r];if(void 0!==i)for(r=0;r<t;r++)y[r]=i[r];for(f[0]=1,r=1;r<=a/2;r++)n=l*r*r,f[r]=s(n),m[r]=h(n),f[a-r]=s(n),m[a-r]=h(n);var g=new numeric.T(p,y),d=new numeric.T(f,m);return g=g.mul(d),numeric.convpow2(g.x,g.y,numeric.clone(d.x),numeric.neg(d.y)),(g=g.mul(d)).x.length=t,g.y.length=t,g},numeric.T.prototype.ifft=function(){var r,n,e=this.x,i=this.y,t=e.length,u=Math.log,o=u(2),c=Math.ceil(u(2*t-1)/o),a=Math.pow(2,c),f=numeric.rep([a],0),m=numeric.rep([a],0),s=Math.cos,h=Math.sin,l=3.141592653589793/t,p=numeric.rep([a],0),y=numeric.rep([a],0);Math.floor(t/2);for(r=0;r<t;r++)p[r]=e[r];if(void 0!==i)for(r=0;r<t;r++)y[r]=i[r];for(f[0]=1,r=1;r<=a/2;r++)n=l*r*r,f[r]=s(n),m[r]=h(n),f[a-r]=s(n),m[a-r]=h(n);var g=new numeric.T(p,y),d=new numeric.T(f,m);return g=g.mul(d),numeric.convpow2(g.x,g.y,numeric.clone(d.x),numeric.neg(d.y)),(g=g.mul(d)).x.length=t,g.y.length=t,g.div(t)},numeric.gradient=function(r,n){var e=n.length,i=r(n);if(isNaN(i))throw new Error("gradient: f(x) is a NaN!");var t,u,o,c,a,f,m,s,h,l=Math.max,p=numeric.clone(n),y=Array(e),g=(numeric.div,numeric.sub,l=Math.max,Math.abs),d=Math.min,v=0;for(t=0;t<e;t++)for(var x=l(1e-6*i,1e-8);;){if(++v>20)throw new Error("Numerical gradient fails");if(p[t]=n[t]+x,u=r(p),p[t]=n[t]-x,o=r(p),p[t]=n[t],isNaN(u)||isNaN(o))x/=16;else{if(y[t]=(u-o)/(2*x),c=n[t]-x,a=n[t],f=n[t]+x,m=(u-i)/x,s=(i-o)/x,h=l(g(y[t]),g(i),g(u),g(o),g(c),g(a),g(f),1e-8),!(d(l(g(m-y[t]),g(s-y[t]),g(m-s))/h,x/h)>.001))break;x/=16}}return y},numeric.uncmin=function(r,n,e,i,t,u,o){var c=numeric.gradient;void 0===o&&(o={}),void 0===e&&(e=1e-8),void 0===i&&(i=function(n){return c(r,n)}),void 0===t&&(t=1e3);var a,f,m=(n=numeric.clone(n)).length,s=r(n);if(isNaN(s))throw new Error("uncmin: f(x0) is a NaN!");var h=Math.max,l=numeric.norm2;e=h(e,numeric.epsilon);var p,y,g,d,v,x,b,w,M,k,A=o.Hinv||numeric.identity(m),T=numeric.dot,j=(numeric.inv,numeric.sub),S=numeric.add,_=numeric.tensor,V=numeric.div,P=numeric.mul,q=numeric.all,F=numeric.isFinite,L=numeric.neg,N=0,O="";for(y=i(n);N<t;){if("function"==typeof u&&u(N,n,s,y,A)){O="Callback returned true";break}if(!q(F(y))){O="Gradient has Infinity or NaN";break}if(!q(F(p=L(T(A,y))))){O="Search direction has Infinity or NaN";break}if((k=l(p))<e){O="Newton step smaller than tol";break}for(M=1,f=T(y,p),v=n;N<t&&!(M*k<e)&&(v=S(n,d=P(p,M)),(a=r(v))-s>=.1*M*f||isNaN(a));)M*=.5,++N;if(M*k<e){O="Line search step size smaller than tol";break}if(N===t){O="maxit reached during line search";break}A=j(S(A,P(((w=T(x=j(g=i(v),y),d))+T(x,b=T(A,x)))/(w*w),_(d,d))),V(S(_(b,d),_(d,b)),w)),n=v,s=a,y=g,++N}return{solution:n,f:s,gradient:y,invHessian:A,iterations:N,message:O}},numeric.Dopri=function(r,n,e,i,t,u,o){this.x=r,this.y=n,this.f=e,this.ymid=i,this.iterations=t,this.events=o,this.message=u},numeric.Dopri.prototype._at=function(r,n){function e(r){return r*r}var i,t,u,o,c,a,f,m,s,h=this.x,l=this.y,p=this.f,y=this.ymid,g=(h.length,Math.floor,numeric.add),d=numeric.mul,v=numeric.sub;return i=h[n],t=h[n+1],o=l[n],c=l[n+1],u=i+.5*(t-i),a=y[n],f=v(p[n],d(o,1/(i-u)+2/(i-t))),m=v(p[n+1],d(c,1/(t-u)+2/(t-i))),g(g(g(g(d(o,(s=[e(r-t)*(r-u)/e(i-t)/(i-u),e(r-i)*e(r-t)/e(i-u)/e(t-u),e(r-i)*(r-u)/e(t-i)/(t-u),(r-i)*e(r-t)*(r-u)/e(i-t)/(i-u),(r-t)*e(r-i)*(r-u)/e(i-t)/(t-u)])[0]),d(a,s[1])),d(c,s[2])),d(f,s[3])),d(m,s[4]))},numeric.Dopri.prototype.at=function(r){var n,e,i,t=Math.floor;if("number"!=typeof r){var u=r.length,o=Array(u);for(n=u-1;-1!==n;--n)o[n]=this.at(r[n]);return o}var c=this.x;for(n=0,e=c.length-1;e-n>1;)c[i=t(.5*(n+e))]<=r?n=i:e=i;return this._at(r,n)},numeric.dopri=function(r,n,e,i,t,u,o){void 0===t&&(t=1e-6),void 0===u&&(u=1e3);var c,a,f,m,s,h,l,p,y,g,d,v,x,b=[r],w=[e],M=[i(r,e)],k=[],A=[.075,.225],T=[44/45,-56/15,32/9],j=[19372/6561,-25360/2187,64448/6561,-212/729],S=[9017/3168,-355/33,46732/5247,49/176,-5103/18656],_=[35/384,0,500/1113,125/192,-2187/6784,11/84],V=[.10013431883002395,0,.3918321794184259,-.02982460176594817,.05893268337240795,-.04497888809104361,.023904308236133973],P=[.2,.3,.8,8/9,1,1],q=[-71/57600,0,71/16695,-71/1920,17253/339200,-22/525,.025],F=0,L=(n-r)/10,N=0,O=numeric.add,U=numeric.mul,D=(Math.max,Math.min),B=Math.abs,R=numeric.norminf,X=Math.pow,E=numeric.any,Y=numeric.lt,I=numeric.and,Q=(numeric.sub,new numeric.Dopri(b,w,M,k,-1,""));for("function"==typeof o&&(d=o(r,e));r<n&&N<u;)if(++N,r+L>n&&(L=n-r),c=i(r+P[0]*L,O(e,U(.2*L,M[F]))),a=i(r+P[1]*L,O(O(e,U(A[0]*L,M[F])),U(A[1]*L,c))),f=i(r+P[2]*L,O(O(O(e,U(T[0]*L,M[F])),U(T[1]*L,c)),U(T[2]*L,a))),m=i(r+P[3]*L,O(O(O(O(e,U(j[0]*L,M[F])),U(j[1]*L,c)),U(j[2]*L,a)),U(j[3]*L,f))),s=i(r+P[4]*L,O(O(O(O(O(e,U(S[0]*L,M[F])),U(S[1]*L,c)),U(S[2]*L,a)),U(S[3]*L,f)),U(S[4]*L,m))),h=i(r+L,y=O(O(O(O(O(e,U(M[F],L*_[0])),U(a,L*_[2])),U(f,L*_[3])),U(m,L*_[4])),U(s,L*_[5]))),(g="number"==typeof(l=O(O(O(O(O(U(M[F],L*q[0]),U(a,L*q[2])),U(f,L*q[3])),U(m,L*q[4])),U(s,L*q[5])),U(h,L*q[6])))?B(l):R(l))>t){if(r+(L=.2*L*X(t/g,.25))===r){Q.msg="Step size became too small";break}}else{if(k[F]=O(O(O(O(O(O(e,U(M[F],L*V[0])),U(a,L*V[2])),U(f,L*V[3])),U(m,L*V[4])),U(s,L*V[5])),U(h,L*V[6])),b[++F]=r+L,w[F]=y,M[F]=h,"function"==typeof o){var C,Z,H=r,z=r+.5*L;if(v=o(z,k[F-1]),E(x=I(Y(d,0),Y(0,v)))||(H=z,d=v,v=o(z=r+L,y),x=I(Y(d,0),Y(0,v))),E(x)){for(var G,$,W=0,J=1,K=1;;){if("number"==typeof d)Z=(K*v*H-J*d*z)/(K*v-J*d);else for(Z=z,p=d.length-1;-1!==p;--p)d[p]<0&&v[p]>0&&(Z=D(Z,(K*v[p]*H-J*d[p]*z)/(K*v[p]-J*d[p])));if(Z<=H||Z>=z)break;$=o(Z,C=Q._at(Z,F-1)),E(G=I(Y(d,0),Y(0,$)))?(z=Z,v=$,x=G,K=1,-1===W?J*=.5:J=1,W=-1):(H=Z,d=$,J=1,1===W?K*=.5:K=1,W=1)}return y=Q._at(.5*(r+Z),F-1),Q.f[F]=i(Z,C),Q.x[F]=Z,Q.y[F]=C,Q.ymid[F-1]=y,Q.events=x,Q.iterations=N,Q}}r+=L,e=y,d=v,L=D(.8*L*X(t/g,.25),4*L)}return Q.iterations=N,Q},numeric.LU=function(r,n){n=n||!1;var e,i,t,u,o,c,a,f,m,s=Math.abs,h=r.length,l=h-1,p=new Array(h);for(n||(r=numeric.clone(r)),t=0;t<h;++t){for(a=t,m=s((c=r[t])[t]),i=t+1;i<h;++i)m<(u=s(r[i][t]))&&(m=u,a=i);for(p[t]=a,a!=t&&(r[t]=r[a],r[a]=c,c=r[t]),o=c[t],e=t+1;e<h;++e)r[e][t]/=o;for(e=t+1;e<h;++e){for(f=r[e],i=t+1;i<l;++i)f[i]-=f[t]*c[i],f[++i]-=f[t]*c[i];i===l&&(f[i]-=f[t]*c[i])}}return{LU:r,P:p}},numeric.LUsolve=function(r,n){var e,i,t,u,o,c=r.LU,a=c.length,f=numeric.clone(n),m=r.P;for(e=a-1;-1!==e;--e)f[e]=n[e];for(e=0;e<a;++e)for(t=m[e],m[e]!==e&&(o=f[e],f[e]=f[t],f[t]=o),u=c[e],i=0;i<e;++i)f[e]-=f[i]*u[i];for(e=a-1;e>=0;--e){for(u=c[e],i=e+1;i<a;++i)f[e]-=f[i]*u[i];f[e]/=u[e]}return f},numeric.solve=function(r,n,e){return numeric.LUsolve(numeric.LU(r,e),n)},numeric.echelonize=function(r){var n,e,i,t,u,o,c,a,f=numeric.dim(r),m=f[0],s=f[1],h=numeric.identity(m),l=Array(m),p=Math.abs,y=numeric.diveq;for(r=numeric.clone(r),n=0;n<m;++n){for(i=0,u=r[n],o=h[n],e=1;e<s;++e)p(u[i])<p(u[e])&&(i=e);for(l[n]=i,y(o,u[i]),y(u,u[i]),e=0;e<m;++e)if(e!==n){for(a=(c=r[e])[i],t=s-1;-1!==t;--t)c[t]-=u[t]*a;for(c=h[e],t=m-1;-1!==t;--t)c[t]-=o[t]*a}}return{I:h,A:r,P:l}},numeric.__solveLP=function(r,n,e,i,t,u,o){var c,a,f,m,s=numeric.sum,h=(numeric.log,numeric.mul),l=numeric.sub,p=numeric.dot,y=numeric.div,g=numeric.add,d=r.length,v=e.length,x=!1,b=1,w=(numeric.transpose(n),numeric.svd,numeric.transpose),M=(numeric.leq,Math.sqrt),k=Math.abs,A=(numeric.muleq,numeric.norminf,numeric.any,Math.min),T=numeric.all,j=numeric.gt,S=Array(d),_=Array(v),V=(numeric.rep([v],1),numeric.solve),P=l(e,p(n,u)),q=p(r,r);for(f=0;f<t;++f){var F,L;for(F=v-1;-1!==F;--F)_[F]=y(n[F],P[F]);var N=w(_);for(F=d-1;-1!==F;--F)S[F]=s(N[F]);b=.25*k(q/p(r,S));var O=100*M(q/p(S,S));for((!isFinite(b)||b>O)&&(b=O),m=g(r,h(b,S)),a=p(N,_),F=d-1;-1!==F;--F)a[F][F]+=1;var U=y(P,p(n,L=V(a,y(m,b),!0))),D=1;for(F=v-1;-1!==F;--F)U[F]<0&&(D=A(D,-.999*U[F]));if(!T(j(P=l(e,p(n,c=l(u,h(L,D)))),0)))return{solution:u,message:"",iterations:f};if(u=c,b<i)return{solution:c,message:"",iterations:f};if(o){var B=p(r,m),R=p(n,m);for(x=!0,F=v-1;-1!==F;--F)if(B*R[F]<0){x=!1;break}}else x=!(u[d-1]>=0);if(x)return{solution:c,message:"Unbounded",iterations:f}}return{solution:u,message:"maximum iteration count exceeded",iterations:f}},numeric._solveLP=function(r,n,e,i,t){var u=r.length,o=e.length,c=(numeric.sum,numeric.log,numeric.mul,numeric.sub),a=numeric.dot,f=(numeric.div,numeric.add,numeric.rep([u],0).concat([1])),m=numeric.rep([o,1],-1),s=numeric.blockMatrix([[n,m]]),h=e,l=numeric.rep([u],0).concat(Math.max(0,numeric.sup(numeric.neg(e)))+1),p=numeric.__solveLP(f,s,h,i,t,l,!1),y=numeric.clone(p.solution);if(y.length=u,numeric.inf(c(e,a(n,y)))<0)return{solution:NaN,message:"Infeasible",iterations:p.iterations};var g=numeric.__solveLP(r,n,e,i,t-p.iterations,y,!0);return g.iterations+=p.iterations,g},numeric.solveLP=function(r,n,e,i,t,u,o){if(void 0===o&&(o=1e3),void 0===u&&(u=numeric.epsilon),void 0===i)return numeric._solveLP(r,n,e,u,o);var c,a=i.length,f=i[0].length,m=n.length,s=numeric.echelonize(i),h=numeric.rep([f],0),l=s.P,p=[];for(c=l.length-1;-1!==c;--c)h[l[c]]=1;for(c=f-1;-1!==c;--c)0===h[c]&&p.push(c);var y=numeric.getRange,g=numeric.linspace(0,a-1),d=numeric.linspace(0,m-1),v=y(i,g,p),x=y(n,d,l),b=y(n,d,p),w=numeric.dot,M=numeric.sub,k=w(x,s.I),A=M(b,w(k,v)),T=M(e,w(k,t)),j=Array(l.length),S=Array(p.length);for(c=l.length-1;-1!==c;--c)j[c]=r[l[c]];for(c=p.length-1;-1!==c;--c)S[c]=r[p[c]];var _=M(S,w(j,w(s.I,v))),V=numeric._solveLP(_,A,T,u,o),P=V.solution;if(P!=P)return V;var q=w(s.I,M(t,w(v,P))),F=Array(r.length);for(c=l.length-1;-1!==c;--c)F[l[c]]=q[c];for(c=p.length-1;-1!==c;--c)F[p[c]]=P[c];return{solution:F,message:V.message,iterations:V.iterations}},numeric.MPStoLP=function(r){r instanceof String&&r.split("\n");var n,e,i,t,u=0,o=["Initial state","NAME","ROWS","COLUMNS","RHS","BOUNDS","ENDATA"],c=r.length,a=0,f={},m=[],s=0,h={},l=0,p=[],y=[],g=[];function d(e){throw new Error("MPStoLP: "+e+"\nLine "+n+": "+r[n]+"\nCurrent state: "+o[u]+"\n")}for(n=0;n<c;++n){var v=(i=r[n]).match(/\S*/g),x=[];for(e=0;e<v.length;++e)""!==v[e]&&x.push(v[e]);if(0!==x.length){for(e=0;e<o.length&&i.substr(0,o[e].length)!==o[e];++e);if(e<o.length){if(u=e,1===e&&(t=x[1]),6===e)return{name:t,c:p,A:numeric.transpose(y),b:g,rows:f,vars:h}}else switch(u){case 0:case 1:d("Unexpected line");case 2:switch(x[0]){case"N":0===a?a=x[1]:d("Two or more N rows");break;case"L":f[x[1]]=s,m[s]=1,g[s]=0,++s;break;case"G":f[x[1]]=s,m[s]=-1,g[s]=0,++s;break;case"E":f[x[1]]=s,m[s]=0,g[s]=0,++s;break;default:d("Parse error "+numeric.prettyPrint(x))}break;case 3:h.hasOwnProperty(x[0])||(h[x[0]]=l,p[l]=0,y[l]=numeric.rep([s],0),++l);var b=h[x[0]];for(e=1;e<x.length;e+=2)if(x[e]!==a){var w=f[x[e]];y[b][w]=(m[w]<0?-1:1)*parseFloat(x[e+1])}else p[b]=parseFloat(x[e+1]);break;case 4:for(e=1;e<x.length;e+=2)g[f[x[e]]]=(m[f[x[e]]]<0?-1:1)*parseFloat(x[e+1]);break;case 5:break;case 6:d("Internal error")}}}d("Reached end of file without ENDATA")},numeric.seedrandom={pow:Math.pow,random:Math.random},function(r,n,e,i,t,u,o){function c(r,n,e,i){for(r+="",e=0,i=0;i<r.length;i++)n[a(i)]=a((e^=19*n[a(i)])+r.charCodeAt(i));for(i in r="",n)r+=String.fromCharCode(n[i]);return r}function a(r){return r&e-1}n.seedrandom=function(i,f){var m,s=[];return i=c(function r(n,e,i,t,u){i=[];u=typeof n;if(e&&"object"==u)for(t in n)if(t.indexOf("S")<5)try{i.push(r(n[t],e-1))}catch(r){}return i.length?i:n+("string"!=u?"\0":"")}(f?[i,r]:arguments.length?i:[(new Date).getTime(),r,window],3),s),c((m=new function(r){var n,i,t=this,u=r.length,o=0,c=t.i=t.j=t.m=0;t.S=[],t.c=[],u||(r=[u++]);for(;o<e;)t.S[o]=o++;for(o=0;o<e;o++)n=t.S[o],c=a(c+n+r[o%u]),i=t.S[c],t.S[o]=i,t.S[c]=n;t.g=function(r){var n=t.S,i=a(t.i+1),u=n[i],o=a(t.j+u),c=n[o];n[i]=c,n[o]=u;for(var f=n[a(u+c)];--r;)i=a(i+1),u=n[i],o=a(o+u),c=n[o],n[i]=c,n[o]=u,f=f*e+n[a(u+c)];return t.i=i,t.j=o,f},t.g(e)}(s)).S,r),n.random=function(){for(var r=m.g(6),n=o,i=0;r<t;)r=(r+i)*e,n*=e,i=m.g(1);for(;r>=u;)r/=2,n/=2,i>>>=1;return(r+i)/n},i},o=n.pow(e,6),t=n.pow(2,t),u=2*t,c(n.random(),r)}([],numeric.seedrandom,256,0,52),function(r){function n(r){if("object"!=typeof r)return r;var e,i=[],t=r.length;for(e=0;e<t;e++)i[e+1]=n(r[e]);return i}function e(r){if("object"!=typeof r)return r;var n,i=[],t=r.length;for(n=1;n<t;n++)i[n-1]=e(r[n]);return i}function i(r,n,e,i,t,u,o,c,a,f,m,s,h,l,p,y){var g,d,v,x,b,w,M,k,A,T,j,S,_,V,P,q,F,L,N,O,U,D,B,R,X,E,Y;_=Math.min(i,f),v=2*i+_*(_+5)/2+2*f+1,R=1e-60;do{X=1+.1*(R+=R),E=1+.2*R}while(X<=1||E<=1);for(g=1;g<=i;g+=1)p[g]=n[g];for(g=i+1;g<=v;g+=1)p[g]=0;for(g=1;g<=f;g+=1)s[g]=0;if(b=[],0===y[1]){if(function(r,n,e,i){var t,u,o,c,a,f;for(u=1;u<=e;u+=1){if(i[1]=u,f=0,(o=u-1)<1){if((f=r[u][u]-f)<=0)break;r[u][u]=Math.sqrt(f)}else{for(c=1;c<=o;c+=1){for(a=r[c][u],t=1;t<c;t+=1)a-=r[t][u]*r[t][c];a/=r[c][c],r[c][u]=a,f+=a*a}if((f=r[u][u]-f)<=0)break;r[u][u]=Math.sqrt(f)}i[1]=0}}(r,0,i,b),0!==b[1])return void(y[1]=2);!function(r,n,e,i){var t,u,o,c;for(u=1;u<=e;u+=1){for(c=0,t=1;t<u;t+=1)c+=r[t][u]*i[t];i[u]=(i[u]-c)/r[u][u]}for(o=1;o<=e;o+=1)for(i[u=e+1-o]=i[u]/r[u][u],c=-i[u],t=1;t<u;t+=1)i[t]=i[t]+c*r[t][u]}(r,0,i,n),function(r,n,e){var i,t,u,o,c;for(u=1;u<=e;u+=1){for(r[u][u]=1/r[u][u],c=-r[u][u],i=1;i<u;i+=1)r[i][u]=c*r[i][u];if(e<(o=u+1))break;for(t=o;t<=e;t+=1)for(c=r[u][t],r[u][t]=0,i=1;i<=u;i+=1)r[i][t]=r[i][t]+c*r[i][u]}}(r,0,i)}else{for(d=1;d<=i;d+=1)for(t[d]=0,g=1;g<=d;g+=1)t[d]=t[d]+r[g][d]*n[g];for(d=1;d<=i;d+=1)for(n[d]=0,g=d;g<=i;g+=1)n[d]=n[d]+r[d][g]*t[g]}for(u[1]=0,d=1;d<=i;d+=1)for(t[d]=n[d],u[1]=u[1]+p[d]*t[d],p[d]=0,g=d+1;g<=i;g+=1)r[g][d]=0;for(u[1]=-u[1]/2,y[1]=0,V=(T=(A=(j=(k=(M=i)+i)+_)+_+1)+_*(_+1)/2)+f,g=1;g<=f;g+=1){for(q=0,d=1;d<=i;d+=1)q+=o[d][g]*o[d][g];p[V+g]=Math.sqrt(q)}function I(){for(l[1]=l[1]+1,v=T,g=1;g<=f;g+=1){for(v+=1,q=-c[g],d=1;d<=i;d+=1)q+=o[d][g]*t[d];if(Math.abs(q)<R&&(q=0),g>m)p[v]=q;else if(p[v]=-Math.abs(q),q>0){for(d=1;d<=i;d+=1)o[d][g]=-o[d][g];c[g]=-c[g]}}for(g=1;g<=h;g+=1)p[T+s[g]]=0;for(S=0,P=0,g=1;g<=f;g+=1)p[T+g]<P*p[V+g]&&(S=g,P=p[T+g]/p[V+g]);return 0===S?999:0}function Q(){for(g=1;g<=i;g+=1){for(q=0,d=1;d<=i;d+=1)q+=r[d][g]*o[d][S];p[g]=q}for(x=M,g=1;g<=i;g+=1)p[x+g]=0;for(d=h+1;d<=i;d+=1)for(g=1;g<=i;g+=1)p[x+g]=p[x+g]+r[g][d]*p[d];for(D=!0,g=h;g>=1;g-=1){for(q=p[g],x=(v=A+g*(g+3)/2)-g,d=g+1;d<=h;d+=1)q-=p[v]*p[k+d],v+=d;if(q/=p[x],p[k+g]=q,s[g]<m)break;if(q<0)break;D=!1,w=g}if(!D)for(F=p[j+w]/p[k+w],g=1;g<=h&&!(s[g]<m)&&!(p[k+g]<0);g+=1)(P=p[j+g]/p[k+g])<F&&(F=P,w=g);for(q=0,g=M+1;g<=M+i;g+=1)q+=p[g]*p[g];if(Math.abs(q)<=R){if(D)return y[1]=1,999;for(g=1;g<=h;g+=1)p[j+g]=p[j+g]-F*p[k+g];return p[j+h+1]=p[j+h+1]+F,700}for(q=0,g=1;g<=i;g+=1)q+=p[M+g]*o[g][S];for(L=-p[T+S]/q,B=!0,D||F<L&&(L=F,B=!1),g=1;g<=i;g+=1)t[g]=t[g]+L*p[M+g],Math.abs(t[g])<R&&(t[g]=0);for(u[1]=u[1]+L*q*(L/2+p[j+h+1]),g=1;g<=h;g+=1)p[j+g]=p[j+g]-L*p[k+g];if(p[j+h+1]=p[j+h+1]+L,!B){for(q=-c[S],d=1;d<=i;d+=1)q+=t[d]*o[d][S];if(S>m)p[T+S]=q;else if(p[T+S]=-Math.abs(q),q>0){for(d=1;d<=i;d+=1)o[d][S]=-o[d][S];c[S]=-c[S]}return 700}for(s[h+=1]=S,v=A+(h-1)*h/2+1,g=1;g<=h-1;g+=1)p[v]=p[g],v+=1;if(h===i)p[v]=p[i];else{for(g=i;g>=h+1&&0!==p[g]&&(N=Math.max(Math.abs(p[g-1]),Math.abs(p[g])),O=Math.min(Math.abs(p[g-1]),Math.abs(p[g])),P=p[g-1]>=0?Math.abs(N*Math.sqrt(1+O*O/(N*N))):-Math.abs(N*Math.sqrt(1+O*O/(N*N))),N=p[g-1]/P,O=p[g]/P,1!==N);g-=1)if(0===N)for(p[g-1]=O*P,d=1;d<=i;d+=1)P=r[d][g-1],r[d][g-1]=r[d][g],r[d][g]=P;else for(p[g-1]=P,U=O/(1+N),d=1;d<=i;d+=1)P=N*r[d][g-1]+O*r[d][g],r[d][g]=U*(r[d][g-1]+P)-r[d][g],r[d][g-1]=P;p[v]=p[h]}return 0}function C(){if(0===p[x=(v=A+w*(w+1)/2+1)+w])return 798;if(N=Math.max(Math.abs(p[x-1]),Math.abs(p[x])),O=Math.min(Math.abs(p[x-1]),Math.abs(p[x])),P=p[x-1]>=0?Math.abs(N*Math.sqrt(1+O*O/(N*N))):-Math.abs(N*Math.sqrt(1+O*O/(N*N))),N=p[x-1]/P,O=p[x]/P,1===N)return 798;if(0===N){for(g=w+1;g<=h;g+=1)P=p[x-1],p[x-1]=p[x],p[x]=P,x+=g;for(g=1;g<=i;g+=1)P=r[g][w],r[g][w]=r[g][w+1],r[g][w+1]=P}else{for(U=O/(1+N),g=w+1;g<=h;g+=1)P=N*p[x-1]+O*p[x],p[x]=U*(p[x-1]+P)-p[x],p[x-1]=P,x+=g;for(g=1;g<=i;g+=1)P=N*r[g][w]+O*r[g][w+1],r[g][w+1]=U*(r[g][w]+P)-r[g][w+1],r[g][w]=P}return 0}function Z(){for(x=v-w,g=1;g<=w;g+=1)p[x]=p[v],v+=1,x+=1;return p[j+w]=p[j+w+1],s[w]=s[w+1],(w+=1)<h?797:0}function H(){return p[j+h]=p[j+h+1],p[j+h+1]=0,s[h]=0,h-=1,l[2]=l[2]+1,0}for(h=0,l[1]=0,l[2]=0,Y=0;;){if(999===(Y=I()))return;for(;0!==(Y=Q());){if(999===Y)return;if(700===Y)if(w===h)H();else{for(;C(),797===(Y=Z()););H()}}}}numeric.solveQP=function(r,t,u,o,c,a){r=n(r),t=n(t),u=n(u);var f,m,s,h,l,p=[],y=[],g=[],d=[],v=[];if(c=c||0,a=a?n(a):[void 0,0],o=o?n(o):[],m=r.length-1,s=u[1].length-1,!o)for(f=1;f<=s;f+=1)o[f]=0;for(f=1;f<=s;f+=1)y[f]=0;for(h=Math.min(m,s),f=1;f<=m;f+=1)g[f]=0;for(p[1]=0,f=1;f<=2*m+h*(h+5)/2+2*s+1;f+=1)d[f]=0;for(f=1;f<=2;f+=1)v[f]=0;return i(r,t,0,m,g,p,u,o,0,s,c,y,0,v,d,a),l="",1===a[1]&&(l="constraints are inconsistent, no solution!"),2===a[1]&&(l="matrix D in quadratic function is not positive definite!"),{solution:e(g),value:e(p),unconstrained_solution:e(t),iterations:e(v),iact:e(y),message:l}}}(),numeric.svd=function(r){var n,e=numeric.epsilon,i=1e-64/e,t=0,u=0,o=0,c=0,a=0,f=numeric.clone(r),m=f.length,s=f[0].length;if(m<s)throw"Need more rows than columns";var h=new Array(s),l=new Array(s);for(u=0;u<s;u++)h[u]=l[u]=0;var p=numeric.rep([s,s],0);function y(r,n){return(r=Math.abs(r))>(n=Math.abs(n))?r*Math.sqrt(1+n*n/r/r):0==n?r:n*Math.sqrt(1+r*r/n/n)}var g=0,d=0,v=0,x=0,b=0,w=0,M=0;for(u=0;u<s;u++){for(h[u]=d,M=0,a=u+1,o=u;o<m;o++)M+=f[o][u]*f[o][u];if(M<=i)d=0;else for(g=f[u][u],d=Math.sqrt(M),g>=0&&(d=-d),v=g*d-M,f[u][u]=g-d,o=a;o<s;o++){for(M=0,c=u;c<m;c++)M+=f[c][u]*f[c][o];for(g=M/v,c=u;c<m;c++)f[c][o]+=g*f[c][u]}for(l[u]=d,M=0,o=a;o<s;o++)M+=f[u][o]*f[u][o];if(M<=i)d=0;else{for(g=f[u][u+1],d=Math.sqrt(M),g>=0&&(d=-d),v=g*d-M,f[u][u+1]=g-d,o=a;o<s;o++)h[o]=f[u][o]/v;for(o=a;o<m;o++){for(M=0,c=a;c<s;c++)M+=f[o][c]*f[u][c];for(c=a;c<s;c++)f[o][c]+=M*h[c]}}(b=Math.abs(l[u])+Math.abs(h[u]))>x&&(x=b)}for(u=s-1;-1!=u;u+=-1){if(0!=d){for(v=d*f[u][u+1],o=a;o<s;o++)p[o][u]=f[u][o]/v;for(o=a;o<s;o++){for(M=0,c=a;c<s;c++)M+=f[u][c]*p[c][o];for(c=a;c<s;c++)p[c][o]+=M*p[c][u]}}for(o=a;o<s;o++)p[u][o]=0,p[o][u]=0;p[u][u]=1,d=h[u],a=u}for(u=s-1;-1!=u;u+=-1){for(a=u+1,d=l[u],o=a;o<s;o++)f[u][o]=0;if(0!=d){for(v=f[u][u]*d,o=a;o<s;o++){for(M=0,c=a;c<m;c++)M+=f[c][u]*f[c][o];for(g=M/v,c=u;c<m;c++)f[c][o]+=g*f[c][u]}for(o=u;o<m;o++)f[o][u]=f[o][u]/d}else for(o=u;o<m;o++)f[o][u]=0;f[u][u]+=1}for(e*=x,c=s-1;-1!=c;c+=-1)for(var k=0;k<50;k++){var A=!1;for(a=c;-1!=a;a+=-1){if(Math.abs(h[a])<=e){A=!0;break}if(Math.abs(l[a-1])<=e)break}if(!A){t=0,M=1;var T=a-1;for(u=a;u<c+1&&(g=M*h[u],h[u]=t*h[u],!(Math.abs(g)<=e));u++)for(v=y(g,d=l[u]),l[u]=v,t=d/v,M=-g/v,o=0;o<m;o++)b=f[o][T],w=f[o][u],f[o][T]=b*t+w*M,f[o][u]=-b*M+w*t}if(w=l[c],a==c){if(w<0)for(l[c]=-w,o=0;o<s;o++)p[o][c]=-p[o][c];break}if(k>=49)throw"Error: no convergence.";for(x=l[a],d=y(g=(((b=l[c-1])-w)*(b+w)+((d=h[c-1])-(v=h[c]))*(d+v))/(2*v*b),1),g=g<0?((x-w)*(x+w)+v*(b/(g-d)-v))/x:((x-w)*(x+w)+v*(b/(g+d)-v))/x,t=1,M=1,u=a+1;u<c+1;u++){for(d=h[u],b=l[u],v=M*d,d*=t,w=y(g,v),h[u-1]=w,g=x*(t=g/w)+d*(M=v/w),d=-x*M+d*t,v=b*M,b*=t,o=0;o<s;o++)x=p[o][u-1],w=p[o][u],p[o][u-1]=x*t+w*M,p[o][u]=-x*M+w*t;for(w=y(g,v),l[u-1]=w,g=(t=g/w)*d+(M=v/w)*b,x=-M*d+t*b,o=0;o<m;o++)b=f[o][u-1],w=f[o][u],f[o][u-1]=b*t+w*M,f[o][u]=-b*M+w*t}h[a]=0,h[c]=g,l[c]=x}for(u=0;u<l.length;u++)l[u]<e&&(l[u]=0);for(u=0;u<s;u++)for(o=u-1;o>=0;o--)if(l[o]<l[u]){for(t=l[o],l[o]=l[u],l[u]=t,c=0;c<f.length;c++)n=f[c][u],f[c][u]=f[c][o],f[c][o]=n;for(c=0;c<p.length;c++)n=p[c][u],p[c][u]=p[c][o],p[c][o]=n;u=o}return{U:f,S:l,V:p}};
}
// Lazyload
{
  /*! lazysizes - v5.2.2 */
!function(e){var t=function(u,D,f){"use strict";var k,H;if(function(){var e;var t={lazyClass:"lazyload",loadedClass:"lazyloaded",loadingClass:"lazyloading",preloadClass:"lazypreload",errorClass:"lazyerror",autosizesClass:"lazyautosizes",srcAttr:"data-src",srcsetAttr:"data-srcset",sizesAttr:"data-sizes",minSize:40,customMedia:{},init:true,expFactor:1.5,hFac:.8,loadMode:2,loadHidden:true,ricTimeout:0,throttleDelay:125};H=u.lazySizesConfig||u.lazysizesConfig||{};for(e in t){if(!(e in H)){H[e]=t[e]}}}(),!D||!D.getElementsByClassName){return{init:function(){},cfg:H,noSupport:true}}var O=D.documentElement,a=u.HTMLPictureElement,P="addEventListener",$="getAttribute",q=u[P].bind(u),I=u.setTimeout,U=u.requestAnimationFrame||I,l=u.requestIdleCallback,j=/^picture$/i,r=["load","error","lazyincluded","_lazyloaded"],i={},G=Array.prototype.forEach,J=function(e,t){if(!i[t]){i[t]=new RegExp("(\\s|^)"+t+"(\\s|$)")}return i[t].test(e[$]("class")||"")&&i[t]},K=function(e,t){if(!J(e,t)){e.setAttribute("class",(e[$]("class")||"").trim()+" "+t)}},Q=function(e,t){var i;if(i=J(e,t)){e.setAttribute("class",(e[$]("class")||"").replace(i," "))}},V=function(t,i,e){var a=e?P:"removeEventListener";if(e){V(t,i)}r.forEach(function(e){t[a](e,i)})},X=function(e,t,i,a,r){var n=D.createEvent("Event");if(!i){i={}}i.instance=k;n.initEvent(t,!a,!r);n.detail=i;e.dispatchEvent(n);return n},Y=function(e,t){var i;if(!a&&(i=u.picturefill||H.pf)){if(t&&t.src&&!e[$]("srcset")){e.setAttribute("srcset",t.src)}i({reevaluate:true,elements:[e]})}else if(t&&t.src){e.src=t.src}},Z=function(e,t){return(getComputedStyle(e,null)||{})[t]},s=function(e,t,i){i=i||e.offsetWidth;while(i<H.minSize&&t&&!e._lazysizesWidth){i=t.offsetWidth;t=t.parentNode}return i},ee=function(){var i,a;var t=[];var r=[];var n=t;var s=function(){var e=n;n=t.length?r:t;i=true;a=false;while(e.length){e.shift()()}i=false};var e=function(e,t){if(i&&!t){e.apply(this,arguments)}else{n.push(e);if(!a){a=true;(D.hidden?I:U)(s)}}};e._lsFlush=s;return e}(),te=function(i,e){return e?function(){ee(i)}:function(){var e=this;var t=arguments;ee(function(){i.apply(e,t)})}},ie=function(e){var i;var a=0;var r=H.throttleDelay;var n=H.ricTimeout;var t=function(){i=false;a=f.now();e()};var s=l&&n>49?function(){l(t,{timeout:n});if(n!==H.ricTimeout){n=H.ricTimeout}}:te(function(){I(t)},true);return function(e){var t;if(e=e===true){n=33}if(i){return}i=true;t=r-(f.now()-a);if(t<0){t=0}if(e||t<9){s()}else{I(s,t)}}},ae=function(e){var t,i;var a=99;var r=function(){t=null;e()};var n=function(){var e=f.now()-i;if(e<a){I(n,a-e)}else{(l||r)(r)}};return function(){i=f.now();if(!t){t=I(n,a)}}},e=function(){var v,m,c,h,e;var y,z,g,p,C,b,A;var n=/^img$/i;var d=/^iframe$/i;var E="onscroll"in u&&!/(gle|ing)bot/.test(navigator.userAgent);var _=0;var w=0;var N=0;var M=-1;var x=function(e){N--;if(!e||N<0||!e.target){N=0}};var W=function(e){if(A==null){A=Z(D.body,"visibility")=="hidden"}return A||!(Z(e.parentNode,"visibility")=="hidden"&&Z(e,"visibility")=="hidden")};var S=function(e,t){var i;var a=e;var r=W(e);g-=t;b+=t;p-=t;C+=t;while(r&&(a=a.offsetParent)&&a!=D.body&&a!=O){r=(Z(a,"opacity")||1)>0;if(r&&Z(a,"overflow")!="visible"){i=a.getBoundingClientRect();r=C>i.left&&p<i.right&&b>i.top-1&&g<i.bottom+1}}return r};var t=function(){var e,t,i,a,r,n,s,l,o,u,f,c;var d=k.elements;if((h=H.loadMode)&&N<8&&(e=d.length)){t=0;M++;for(;t<e;t++){if(!d[t]||d[t]._lazyRace){continue}if(!E||k.prematureUnveil&&k.prematureUnveil(d[t])){R(d[t]);continue}if(!(l=d[t][$]("data-expand"))||!(n=l*1)){n=w}if(!u){u=!H.expand||H.expand<1?O.clientHeight>500&&O.clientWidth>500?500:370:H.expand;k._defEx=u;f=u*H.expFactor;c=H.hFac;A=null;if(w<f&&N<1&&M>2&&h>2&&!D.hidden){w=f;M=0}else if(h>1&&M>1&&N<6){w=u}else{w=_}}if(o!==n){y=innerWidth+n*c;z=innerHeight+n;s=n*-1;o=n}i=d[t].getBoundingClientRect();if((b=i.bottom)>=s&&(g=i.top)<=z&&(C=i.right)>=s*c&&(p=i.left)<=y&&(b||C||p||g)&&(H.loadHidden||W(d[t]))&&(m&&N<3&&!l&&(h<3||M<4)||S(d[t],n))){R(d[t]);r=true;if(N>9){break}}else if(!r&&m&&!a&&N<4&&M<4&&h>2&&(v[0]||H.preloadAfterLoad)&&(v[0]||!l&&(b||C||p||g||d[t][$](H.sizesAttr)!="auto"))){a=v[0]||d[t]}}if(a&&!r){R(a)}}};var i=ie(t);var B=function(e){var t=e.target;if(t._lazyCache){delete t._lazyCache;return}x(e);K(t,H.loadedClass);Q(t,H.loadingClass);V(t,L);X(t,"lazyloaded")};var a=te(B);var L=function(e){a({target:e.target})};var T=function(t,i){try{t.contentWindow.location.replace(i)}catch(e){t.src=i}};var F=function(e){var t;var i=e[$](H.srcsetAttr);if(t=H.customMedia[e[$]("data-media")||e[$]("media")]){e.setAttribute("media",t)}if(i){e.setAttribute("srcset",i)}};var s=te(function(t,e,i,a,r){var n,s,l,o,u,f;if(!(u=X(t,"lazybeforeunveil",e)).defaultPrevented){if(a){if(i){K(t,H.autosizesClass)}else{t.setAttribute("sizes",a)}}s=t[$](H.srcsetAttr);n=t[$](H.srcAttr);if(r){l=t.parentNode;o=l&&j.test(l.nodeName||"")}f=e.firesLoad||"src"in t&&(s||n||o);u={target:t};K(t,H.loadingClass);if(f){clearTimeout(c);c=I(x,2500);V(t,L,true)}if(o){G.call(l.getElementsByTagName("source"),F)}if(s){t.setAttribute("srcset",s)}else if(n&&!o){if(d.test(t.nodeName)){T(t,n)}else{t.src=n}}if(r&&(s||o)){Y(t,{src:n})}}if(t._lazyRace){delete t._lazyRace}Q(t,H.lazyClass);ee(function(){var e=t.complete&&t.naturalWidth>1;if(!f||e){if(e){K(t,"ls-is-cached")}B(u);t._lazyCache=true;I(function(){if("_lazyCache"in t){delete t._lazyCache}},9)}if(t.loading=="lazy"){N--}},true)});var R=function(e){if(e._lazyRace){return}var t;var i=n.test(e.nodeName);var a=i&&(e[$](H.sizesAttr)||e[$]("sizes"));var r=a=="auto";if((r||!m)&&i&&(e[$]("src")||e.srcset)&&!e.complete&&!J(e,H.errorClass)&&J(e,H.lazyClass)){return}t=X(e,"lazyunveilread").detail;if(r){re.updateElem(e,true,e.offsetWidth)}e._lazyRace=true;N++;s(e,t,r,a,i)};var r=ae(function(){H.loadMode=3;i()});var l=function(){if(H.loadMode==3){H.loadMode=2}r()};var o=function(){if(m){return}if(f.now()-e<999){I(o,999);return}m=true;H.loadMode=3;i();q("scroll",l,true)};return{_:function(){e=f.now();k.elements=D.getElementsByClassName(H.lazyClass);v=D.getElementsByClassName(H.lazyClass+" "+H.preloadClass);q("scroll",i,true);q("resize",i,true);q("pageshow",function(e){if(e.persisted){var t=D.querySelectorAll("."+H.loadingClass);if(t.length&&t.forEach){U(function(){t.forEach(function(e){if(e.complete){R(e)}})})}}});if(u.MutationObserver){new MutationObserver(i).observe(O,{childList:true,subtree:true,attributes:true})}else{O[P]("DOMNodeInserted",i,true);O[P]("DOMAttrModified",i,true);setInterval(i,999)}q("hashchange",i,true);["focus","mouseover","click","load","transitionend","animationend"].forEach(function(e){D[P](e,i,true)});if(/d$|^c/.test(D.readyState)){o()}else{q("load",o);D[P]("DOMContentLoaded",i);I(o,2e4)}if(k.elements.length){t();ee._lsFlush()}else{i()}},checkElems:i,unveil:R,_aLSL:l}}(),re=function(){var i;var n=te(function(e,t,i,a){var r,n,s;e._lazysizesWidth=a;a+="px";e.setAttribute("sizes",a);if(j.test(t.nodeName||"")){r=t.getElementsByTagName("source");for(n=0,s=r.length;n<s;n++){r[n].setAttribute("sizes",a)}}if(!i.detail.dataAttr){Y(e,i.detail)}});var a=function(e,t,i){var a;var r=e.parentNode;if(r){i=s(e,r,i);a=X(e,"lazybeforesizes",{width:i,dataAttr:!!t});if(!a.defaultPrevented){i=a.detail.width;if(i&&i!==e._lazysizesWidth){n(e,r,a,i)}}}};var e=function(){var e;var t=i.length;if(t){e=0;for(;e<t;e++){a(i[e])}}};var t=ae(e);return{_:function(){i=D.getElementsByClassName(H.autosizesClass);q("resize",t)},checkElems:t,updateElem:a}}(),t=function(){if(!t.i&&D.getElementsByClassName){t.i=true;re._();e._()}};return I(function(){H.init&&t()}),k={cfg:H,autoSizer:re,loader:e,init:t,uP:Y,aC:K,rC:Q,hC:J,fire:X,gW:s,rAF:ee}}(e,e.document,Date);e.lazySizes=t,"object"==typeof module&&module.exports&&(module.exports=t)}("undefined"!=typeof window?window:{});
}
