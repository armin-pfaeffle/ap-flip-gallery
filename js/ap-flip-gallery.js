/**
* @license ap-flig-gallery.js v0.1
* Updated: 23.09.2014
* {DESCRIPTION}
* Copyright (c) 2014 armin pfaeffle
* Released under the MIT license
* http://armin-pfaeffle.de/licenses/mit
*/

;(function($) {

	var datakey = '__apfg__';
	var cssPrefix = 'apfg-';
	var eventPrefix = 'apfg';
	var globalCounter = 0;

	/**
	 * Makes the first character of str uppercase and returns that string.
	 */
	function ucfirst(str) {
		str += ''; // ensure that str is a string
		var c = str[0].toUpperCase();
		return c + str.substr(1);
	}

	/**
	 * Adds ucfirst() method to String class. Makes the first character
	 * of str uppercase and returns that string.
	 */
	if (!String.prototype.ucfirst) {
		String.prototype.ucfirst = function() {
			return ucfirst(this);
		};
	}

	/**
	 * Fisher-Yates-Shuffle
	 */
	$.fn.shuffle = function() {
		var i = this.length;
		if (i > 1) {
			var j;
			var tmp;
			while (--i) {
				j = Math.floor(Math.random() * (i + 1));
				t = this[j];
				this[j] = this[i];
				this[i] = t;
			}
		}
		return this;
	}

	/**
	 * Constructor for ApFlipGallery plugin.
	 */
	function ApFlipGallery(element, options) {
		// Do not remake the plugin
		var data = $(element).data(datakey);
		if (data) {
			return data;
		}

		this.settings = $.extend({}, ApFlipGallery.defaultSettings, options);
		this.$target = $(element).hide();
		this.$images = this.$target.find('img');
		this._init();

		// Save the instance
		this.$target.data(datakey, this);
	}

	/**
	 * ApFlipGallery class.
	 */
	ApFlipGallery.prototype = {

		/**
		 *
		 */
		_init: function() {
			var self = this;

			this.active = false;
			this.flipping = false;
			this.flipCounter = 0;

			this._addWrapper();
			this._initTilesAndImages();
			this._updateHeadCss();

			this._trigger('init');

			if (this.settings.autoStart) {
				this.start();
			}
		},

		/**
		 *
		 */
		_addWrapper: function() {
			this.$wrapper = $('<div></div>')
				.addClass(cssPrefix + 'wrapper')
				.addClass(cssPrefix + 'clearfix')
				.insertAfter(this.$target);

			// Set unique ID
			var id = (typeof this.settings.id == 'string' ? this.settings.id : cssPrefix + 'wrapper-' + globalCounter++);
			this.$wrapper.attr('id', id);
		},

		/**
		 *
		 */
		_initTilesAndImages: function() {
			var self = this;

			if (this.settings.randomImages) {
				this.$images.shuffle();
			}

			this.$tiles = $('<ul></ul>').addClass(cssPrefix + 'images');
			this.$tiles.appendTo(this.$wrapper);

			// Add only as many tiles and images as the users wants to see
			for (var index = 0; index < this.settings.tileCount; index++) {
				// Only create as much tiles as much images we have
				if (index == this.$images.length) {
					break;
				}

				var $tile = $('<li></li>');
				var isCustomTile = (typeof this.settings.customTiles == 'object' && this.settings.customTiles.indexOf(index) > -1);
				this.$tiles.append($tile);

				if (isCustomTile) {
					$tile.addClass(cssPrefix + 'custom');
				}
				else {
					var $front = $('<div></div>').addClass(cssPrefix + 'front').appendTo($tile);
					var $back = $('<div></div>').addClass(cssPrefix + 'back').appendTo($tile);

					this._cloneImage(this.$images.eq(index)).appendTo($front);
				}
				this._trigger('initTile', [isCustomTile], $tile);
			}

			// ... the rest is cloned and stored for later use
			this.$hiddenImages = $();
			this.$images.slice(this.settings.tileCount).each(function() {
				self.$hiddenImages = self.$hiddenImages.add( self._cloneImage($(this)) );
			});

			// Set all tiles available
			this._resetAvailableTiles();
		},

		/**
		 *
		 */
		_cloneImage: function($target) {
			var $image = $('<img />')
				.attr({
					src: $target.attr('src'),
					width: $target.attr('width'),
					height: $target.attr('height')
				});
			return $image;
		},

		/**
		 *
		 */
		_resetAvailableTiles: function() {
			this.$availableTiles = this.$tiles.children(':not(.' + cssPrefix +'custom)');
			if (this.settings.randomDestination) {
				this.$availableTiles.shuffle();
			}
		},

		/**
		 *
		 */
		_updateHeadCss: function() {
			if (this.cssStyle) {
				this.cssStyle.remove();
			}

			var wrapperId = this.$wrapper.attr('id');
			duration = (parseInt(this.settings.animationDuration) / 1000).toFixed(3) + 's';

			this.cssStyle = $("<style type='text/css'>"
				+ "#" + wrapperId + " > .apfg-images > li.apfg-flip > div {\n"
				+ "\t-webkit-transition: " + duration + ";\n"
				+ "\t   -moz-transition: " + duration + ";\n"
				+ "\t    -ms-transition: " + duration + ";\n"
				+ "\t     -o-transition: " + duration + ";\n"
				+ "\t        transition: " + duration + ";\n"
				+ "\t}\n"
			+ "</style>").appendTo("head");
		},

		/**
		 *
		 */
		_flipImage: function() {
			if (this.$hiddenImages.length == 0) {
				return;
			}
			else {
				if (this.settings.randomImages && this.flipCounter == this.$hiddenImages.length) {
					this.$hiddenImages.shuffle();
					this.flipCounter = 0;
				}
			}

			// Only allow one flip animation
			if (this.flipping) {
				return;
			}
			this.flipping = true;

			// Extract next image from hidden images
			var $image = $(this.$hiddenImages.splice(0, 1));

			// Select destination tile and remove it from available ones, so
			// it is ensured that in one round every tile is used
			var $destinationTile = $(this.$availableTiles.splice(0, 1));

			// Add image to the "back wrapper" and let CSS do the flip by setting flip class
			$destinationTile.children('.' + cssPrefix + 'back').append($image);
			$destinationTile.addClass(cssPrefix + 'flip');

			var tileIndex = this.$tiles.children().index($destinationTile);
			this._trigger('flip', [tileIndex], $destinationTile);

			// We have to do some things when flip animations ends
			var self = this;
			setTimeout(function() {
				// Removing class disables CSS animation
				$destinationTile.removeClass(cssPrefix + 'flip');

				// Move visible image from back to fron wrapper
				$image.appendTo($destinationTile.children('.' + cssPrefix + 'front'));

				// Put front image to hidden images and remove it from dom
				var $hiddenImage = $destinationTile.find('.' + cssPrefix + 'front img:first').detach();
				self.$hiddenImages = self.$hiddenImages.add($hiddenImage);
				// $hiddenImage.remove();

				self.flipping = false;
				self.flipCounter++;
			}, this.settings.animationDuration + 100); // Why +100? Ensure that we modify everything AFTER animation finished

			// If there are no tiles left we use every available tile in
			// the next round again
			if (this.$availableTiles.length == 0) {
				this._resetAvailableTiles();
			}
		},

		/**
		 *
		 */
		_trigger: function(eventType, args, $target) {
			var optionName = 'on' + eventType.ucfirst();
			var f = this.settings[optionName];
			if (typeof f == 'function') {
				var t = ($target ? $target : this.$target);
				f.apply(t, args);
			}
			eventType = eventPrefix + eventType.ucfirst();
			this.$target.trigger(eventType, args);
		},

		/**
		 *
		 */
		start: function() {
			if (this.active) {
				return;
			}

			var self = this;
			this.interval = setInterval(function() {
				self._flipImage();
			}, this.settings.flipInterval);
			this.active = true;

			this._trigger('start');
		},

		/**
		 *
		 */
		stop: function() {
			if (this.active) {
				clearInterval(this.interval);
				this.active = false;

				this._trigger('stop');
			}
		},

		/**
		 *
		 */
		next: function() {
			this._flipImage();
		},

		/**
		 *
		 */
		isActive: function() {
			return this.active;
		},

		/**
		 *
		 */
		option: function(key, value) {
			if (!key) {
				// Return copy of current settings
				return $.extend({}, this.settings);
			}
			else {
				var options;
				if (typeof key == 'string') {
					if (arguments.length === 1) {
						// Return specific value of settings
						return (this.settings[key] !== undefined ? this.settings[key] : null);
					}
					options = {};
					options[key] = value;
				}
				else {
					options = key;
				}
				this._setOptions(options);
			}
		},

		/**
		 *
		 */
		_setOptions: function(options) {
			for (key in options) {
				var value = options[key];

				// Disable/modify plugin before we apply new settings
				// TODO

				// Apply option
				this.settings[key] = value;

				// Disable/modify plugin before we apply new settings
				if (key == 'flipInterval' && this.active) {
					this.stop();
					this.start();
				}
				else if (key == 'animationDuration') {
					this._updateHeadCss();
				}
				// TODO

			}
		},

		/**
		 *
		 */
		destroy: function() {
			// TODO
		}
	};

	/**
	 *
	 */
	$.fn.apFlipGallery = function( options ) {
		if (typeof options === 'string') {
			var instance, method, result, returnValues = [];
			var params = Array.prototype.slice.call(arguments, 1);
			this.each(function() {
				instance = $(this).data(datakey);
				if (!instance) {
					returnValues.push(undefined);
				}
				// Ignore private methods
				else if ((typeof (method = instance[options]) === 'function') && (options.charAt(0) !== '_')) {
					var result = method.apply(instance, params);
					if (result !== undefined) {
						returnValues.push(result);
					}
				}
			});
			// Return an array of values for the jQuery instances
			// Or the value itself if there is only one
			// Or keep chaining
			return returnValues.length ? (returnValues.length === 1 ? returnValues[0] : returnValues) : this;
		}
		return this.each(function() {
			new ApFlipGallery(this, options);
		});
	};

	/**
	 * Default settings for ApFlipGallery plugin.
	 */
	ApFlipGallery.defaultSettings = {
		id: undefined,
		tileCount: undefined,
		customTiles: [],

		flipInterval: 5000,
		animationDuration: 500,
		autoStart: true,

		randomImages: true,
		randomDestination: true
	};

}(jQuery));
