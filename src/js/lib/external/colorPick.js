/*!
 *
 * ColorPick jQuery plugin
 * https://github.com/philzet/ColorPick.js
 *
 * Copyright (c) 2017-2019 Phil Zet (a.k.a. Phil Zakharchenko)
 * Licensed under the MIT License
 *
 */
(function ($) {
    $.fn.colorPick = function (config) {
        return this.each(function () {
            new $.colorPick(this, config || {});
        });
    };

    $.colorPick = function (element, options) {
        options = options || {};
        this.options = $.extend({}, $.fn.colorPick.defaults, options);
        if (options.str) {
            this.options.str = $.extend(
                {},
                $.fn.colorPick.defaults.str,
                options.str
            );
        }
        $.fn.colorPick.defaults = this.options;
        this.color = this.options.initialColor.toUpperCase();
        this.element = $(element);

        var dataInitialColor = this.element.data('initialcolor');
        if (dataInitialColor) {
            this.color = dataInitialColor;
            this.appendToStorage(this.color);
        }

        var uniquePalette = [];
        $.each(
            $.fn.colorPick.defaults.palette.map(function (x) {
                return x.toUpperCase();
            }),
            function (i, el) {
                if ($.inArray(el, uniquePalette) === -1) uniquePalette.push(el);
            }
        );

        this.palette = uniquePalette;

        return this.element.hasClass(this.options.pickrclass)
            ? this
            : this.init();
    };

    $.fn.colorPick.defaults = {
        initialColor: '#3498db',
        paletteLabel: '',
        allowRecent: false,
        recentMax: 5,
        allowCustomColor: false,
        palette: [
            '#1abc9c',
            '#16a085',
            '#2ecc71',
            '#27ae60',
            '#3498db',
            '#2980b9',
            '#9b59b6',
            '#8e44ad',
            '#34495e',
            '#2c3e50',
            '#f1c40f',
            '#f39c12',
            '#e67e22',
            '#d35400',
            '#e74c3c',
            '#c0392b',
            '#ecf0f1',
            '#bdc3c7',
            '#95a5a6',
            '#7f8c8d',
        ],
        onColorSelected: function () {
            this.element.css({
                backgroundColor: this.color,
                color: this.color,
            });
        },
    };

    $.colorPick.prototype = {
        init: function () {
            var self = this;
            var o = this.options;

            $.proxy($.fn.colorPick.defaults.onColorSelected, this)();

            this.element
                .on('click', function (event) {
                    event.preventDefault();
                    self.show(event.pageX, event.pageY);

                    $('.customColorHash').val(self.color);

                    $('.colorPickButton').on('click', function (event) {
                        self.color = $(event.target).attr('hexValue');
                        self.appendToStorage($(event.target).attr('hexValue'));
                        self.hide();
                        $.proxy(self.options.onColorSelected, self)();
                        return false;
                    });
                    $('.customColorHash')
                        .on('click', function (event) {
                            return false;
                        })
                        .on('keyup', function (event) {
                            var hash = $(this).val();
                            if (hash.indexOf('#') !== 0) {
                                hash = '#' + hash;
                            }
                            if (
                                /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hash)
                            ) {
                                self.color = hash;
                                self.appendToStorage(hash);
                                $.proxy(self.options.onColorSelected, self)();
                                $(this).removeClass('error');
                            } else {
                                $(this).addClass('error');
                            }
                        });

                    return false;
                })
                .on('blur', function () {
                    self.element.val(self.color);
                    $.proxy(self.options.onColorSelected, self)();
                    self.hide();
                    return false;
                });

            $(document).on('click', function (event) {
                self.hide();
                return true;
            });

            return this;
        },

        appendToStorage: function (color) {
            if ($.fn.colorPick.defaults.allowRecent === true) {
                var storedColors = JSON.parse(
                    localStorage.getItem('colorPickRecentItems')
                );
                if (storedColors == null) {
                    storedColors = [];
                }
                if ($.inArray(color, storedColors) == -1) {
                    storedColors.unshift(color);
                    storedColors = storedColors.slice(
                        0,
                        $.fn.colorPick.defaults.recentMax
                    );
                    localStorage.setItem(
                        'colorPickRecentItems',
                        JSON.stringify(storedColors)
                    );
                }
            }
        },

        show: function (left, top) {
            $('#colorPick').remove();

            $('body').append(
                '<div id="colorPick" style="display:none;top:' +
                    top +
                    'px;left:' +
                    left +
                    'px"><span>' +
                    $.fn.colorPick.defaults.paletteLabel +
                    '</span></div>'
            );
            jQuery.each(this.palette, function (index, item) {
                $('#colorPick').append(
                    '<div class="colorPickButton" hexValue="' +
                        item +
                        '" style="background:' +
                        item +
                        '"></div>'
                );
            });
            if ($.fn.colorPick.defaults.allowCustomColor === true) {
                $('#colorPick').append(
                    '<input type="text" style="margin-top:5px" class="customColorHash" />'
                );
            }
            if ($.fn.colorPick.defaults.allowRecent === true) {
                $('#colorPick').append(
                    '<span style="margin-top:5px">Recent:</span>'
                );
                if (
                    JSON.parse(localStorage.getItem('colorPickRecentItems')) ==
                        null ||
                    JSON.parse(localStorage.getItem('colorPickRecentItems')) ==
                        []
                ) {
                    $('#colorPick').append(
                        '<div class="colorPickButton colorPickDummy"></div>'
                    );
                } else {
                    jQuery.each(
                        JSON.parse(
                            localStorage.getItem('colorPickRecentItems')
                        ),
                        function (index, item) {
                            $('#colorPick').append(
                                '<div class="colorPickButton" hexValue="' +
                                    item +
                                    '" style="background:' +
                                    item +
                                    '"></div>'
                            );
                            if (
                                index ==
                                $.fn.colorPick.defaults.recentMax - 1
                            ) {
                                return false;
                            }
                        }
                    );
                }
            }
            $('#colorPick').fadeIn(200);
        },

        hide: function () {
            $('#colorPick').fadeOut(200, function () {
                $('#colorPick').remove();
                return this;
            });
        },
    };
})(jQuery);
