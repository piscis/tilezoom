(function($, jQuery) {

	function log () {

		window.console && console.log && console.log('[tilezoomOverviewMap] ' + Array.prototype.join.call(arguments,' '));
	}

	$.fn.tilezoomOverviewMap = function (options) {

		if (typeof options == 'string') {

			var args = Array.prototype.slice.call(arguments, 1);

			return this.each(function() {

				var tilezoomOverviewMap = $.data(this, 'tilezoomOverviewMap');

				if (tilezoomOverviewMap && $.isFunction(tilezoomOverviewMap[options])) {

					tilezoomOverviewMap[options].apply(tilezoomOverviewMap, args);
				}

				return $(this);
			});
		}
		else {

			var settings = $.extend({ }, $.fn.tilezoomOverviewMap.defaults, options);

			return this.each(function() {

				var $this = $(this);

				$this.data('tilezoomOverviewMap', new _TilezoomOverviewMap($this, settings));

				return $this;
			});
		}
	};

	$.fn.tilezoomOverviewMap.defaults = {

		tilezoom: null
	};
	$.fn.tilezoomOverviewMap.version = '1.0';

//	=================================================================
//	=					Beginn der Klasse							=
//	=================================================================
	var _TilezoomOverviewMap = function (target, options) {
 
		var me = this;

		me.element	= target;
		me.options	= options;

		var interval = setInterval(function () {

			var tilezoom = options.tilezoom.data('tilezoom.settings');
			if ( tilezoom ) {

				clearInterval( interval );

				options.tilezoom = tilezoom;
				me._init();
			}
		}, 20);
	};

	_TilezoomOverviewMap.prototype = {

		_init: function () {

			var me			= this
				options		= me.options;
				tilezoom	= options.tilezoom;

			me.element.addClass( 'tilezoom-overviewmap' );

			me.controlRectangle	= $('<div>')
										.addClass('control-rectangle')
										.appendTo( me.element );

//			override tilezoom listener
			var superAfterZoom = tilezoom.afterZoom;
			tilezoom.afterZoom = function ($tilezoom, coords, zoomLevel) {

				if ( superAfterZoom ) {

					superAfterZoom(tilezoom, coords, zoomLevel);
				}

				me.doLayout(tilezoom, coords.x, coords.y, zoomLevel);
			};

			var superCallAfter = tilezoom.callAfter;
			tilezoom.callAfter = function ($tilezoom, coords, zoomLevel) {

				if ( superCallAfter ) {

					superCallAfter($tilezoom, coords, zoomLevel);
				}

				me.doLayout(tilezoom, coords.endX, coords.endY, zoomLevel);
			};
		},

		doLayout: function ( tilezoom, x, y, zoomLevel ) {

			var	me					= this,
				element				= me.element,
				elementWidth		= element.width(),
				elementHeight		= element.height(),
				controlRectangle	= me.controlRectangle,
				container			= tilezoom.cont,
				containerWidth		= container.width(),
				containerHeight		= container.height(),
				holder				= tilezoom.holder,
				holderWidth			= holder.width(),
				holderHeight		= holder.height();

//			calculate width and height
			var rectangleWidth	= (containerWidth / holderWidth) * 100,
				rectangleHeight	= (containerHeight / holderHeight) * 100;

			rectangleWidth	= parseInt( rectangleWidth * elementWidth / 100 ) - parseInt(controlRectangle.css('border-left-width'));
			rectangleHeight	= parseInt( rectangleHeight * elementHeight / 100 ) - parseInt(controlRectangle.css('border-bottom-width'));

//			calculate position
			var rectangleLeft	= (x / holderWidth) * 100,
				rectangleTop	= (y / holderHeight) * 100;

			rectangleLeft	= parseInt( rectangleLeft * elementWidth / 100 );
			rectangleTop	= parseInt( rectangleTop * elementHeight / 100 );

			if ( rectangleLeft + rectangleWidth > elementWidth ) {

				rectangleLeft = elementWidth - rectangleWidth;
			}
			if ( rectangleTop + rectangleHeight > elementHeight ) {

				rectangleTop = elementHeight - rectangleHeight;
			}

			var style = {

				left:	rectangleLeft + 'px',
				top:	rectangleTop + 'px',
				width:	rectangleWidth +'px',
				height:	rectangleHeight +'px'
			};

			controlRectangle.css({

				left:	rectangleLeft + 'px',
				top:	rectangleTop + 'px',
				width:	rectangleWidth +'px',
				height:	rectangleHeight +'px'
			});

			console.log( style );
		}
	};

})(jQuery, jQuery);