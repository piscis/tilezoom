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

				return $this.data('tilezoomOverviewMap', new _TilezoomOverviewMap($this, settings));
			});
		}
	};

	$.fn.tilezoomOverviewMap.defaults = {

		tilezoom:	null,
		thumb:		'',

		duration:	500,
		draggable:	true,
		clickable:	true,

		dragstop:	function ( x, y, zoomLevel ) { },
		click:		function ( x, y, zoomLevel ) { }
	};
	$.fn.tilezoomOverviewMap.version = '1.0';

//	=================================================================
//	=					Beginn der Klasse							=
//	=================================================================
	var _TilezoomOverviewMap = function (element, options) {
 
		var me = this;

		me.element	= element;
		me.options	= options;

		element.css({

			background: 'url(' +options.thumb+ ') no-repeat'
		});

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
				element		= me.element,
				tilezoom	= options.tilezoom;

			element.addClass( 'tilezoom-overviewmap' );

			if ( options.clickable ) {

				element.click( $.proxy(me.onClick, me) );
			}

			me.controlRectangle	= $('<div>')
										.addClass('control-rectangle')
										.appendTo( me.element );

			if ( options.draggable ) {

				me.controlRectangle.mousedown( $.proxy(me.onRectangleMousedown, me) );
			}

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
				holderHeight		= holder.height(),
				duration			= me.options.duration;

//			calculate width and height
			var rectangleWidth	= (containerWidth / holderWidth) * 100,
				rectangleHeight	= (containerHeight / holderHeight) * 100;

			rectangleWidth	= parseInt( rectangleWidth * elementWidth / 100 ) - parseInt(controlRectangle.css('border-left-width'));
			rectangleHeight	= parseInt( rectangleHeight * elementHeight / 100 ) - parseInt(controlRectangle.css('border-top-width')) - parseInt(controlRectangle.css('border-bottom-width'));

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

//			define slide animation
			if ( duration && duration > 0 && me._isInitialized) {

				me._setAnimation(controlRectangle, duration);

				if ( me.timer ) {

					clearTimeout( me.timer );
				}

				me.timer = setTimeout(function () {

					me._setAnimation(controlRectangle, false);

				}, duration);
			}
			me._isInitialized = true;

			controlRectangle.css({

				left:	rectangleLeft + 'px',
				top:	rectangleTop + 'px',
				width:	rectangleWidth +'px',
				height:	rectangleHeight +'px'
			});
		},

		_setAnimation: function ( el, duration ) {

			if ( duration ) {

				el.css({

					'transition':			'all ' +duration+ 'ms linear',
					'-webkit-transition':	'all ' +duration+ 'ms linear'
				});
			}
			else {

				el.css({

					'transition':			'',
					'-webkit-transition':	''
				});
			}
		},

		onRectangleMousedown: function ( event ) {

			var me				= this,
				rectangle		= me.controlRectangle,
				rectangleWidth	= rectangle.outerWidth(),
				rectangleHeight	= rectangle.outerHeight(),
				element			= me.element,
				elementWidth	= element.width(),
				elementHeight	= element.height(),
				$document		= $(document);

			rectangle.addClass('dragging');

			me._setAnimation(rectangle, false);

			var mouseMoveFunction = function (e) {

				var offset	= element.offset(),
					x		= e.pageX - offset.left - (rectangleWidth / 2),
					y		= e.pageY - offset.top - (rectangleHeight / 2);

				if ( x < 0 ) {

					x = 0;
				}
				else if ( x + rectangleWidth > elementWidth ) {

					x = elementWidth - rectangleWidth;
				}

				if ( y < 0 ) {

					y = 0;
				}
				else if ( y + rectangleHeight > elementHeight ) {

					y = elementHeight - rectangleHeight;
				}

				rectangle.css({

					left:	x,
					top:	y
				});
			};

//			trigger mousemove event on start
			mouseMoveFunction( event );

//			add listeners
			$document.unbind('mousemove').mousemove(mouseMoveFunction);
			$document.one('mouseup', function () {

				$document.unbind('mousemove');
				rectangle.removeClass('dragging');

				var dragstop = me.options.dragstop;
				if ( dragstop ) {

					var	tilezoom			= me.options.tilezoom,
						element				= me.element,
						elementWidth		= element.width(),
						elementHeight		= element.height(),
						holder				= tilezoom.holder,
						container			= tilezoom.cont,
						holderWidth			= holder.width(),
						holderHeight		= holder.height();

					var percentX	= holderWidth / elementWidth,
						percentY	= holderHeight / elementHeight,
						x			= parseInt( ( parseInt(rectangle.css('left')) + (rectangle.outerWidth() / 2) ) * percentX),
						y			= parseInt( ( parseInt(rectangle.css('top')) + (rectangle.outerHeight() / 2) ) * percentY);

					dragstop( x, y, tilezoom.level );

					container.tilezoom('moveTo', tilezoom.level, { x: x, y: y } );
				}
			});
		},

		onClick: function ( e ) {

			if ( $(e.target).hasClass('tilezoom-overviewmap') ) {

				var	me				= this,
					tilezoom		= me.options.tilezoom,
					rectangle		= me.controlRectangle,
					rectangleWidth	= rectangle.outerWidth(),
					rectangleHeight	= rectangle.outerHeight(),
					container		= tilezoom.cont,
					element			= me.element,
					elementWidth	= element.width(),
					elementHeight	= element.height(),
					holder			= tilezoom.holder,
					holderWidth		= holder.width(),
					holderHeight	= holder.height();

				var percentX	= holderWidth / elementWidth,
					percentY	= holderHeight / elementHeight,
					x			= parseInt( e.offsetX * percentX),
					y			= parseInt( e.offsetY * percentY);

				var clickFn = me.options.click;
				if ( clickFn ) {

					clickFn( x, y, tilezoom.level )
				}

				container.tilezoom('moveTo', tilezoom.level, { x: x, y: y } );
			}
		}
	};

})(jQuery, jQuery);