(function( $, undefined ) {

$.widget('ui.tilezoommap', {

	version: '1.5',
	options: {

		tilezoom:	null,
		thumb:		'',

		duration:	300,
		draggable:	true,
		clickable:	true,

		dragstop:	function ( x, y, zoomLevel ) { },
		click:		function ( x, y, zoomLevel ) { }
	},

	_create: function () {

		var me			= this,
			options		= me.options,
			$element	= me.element,
			tilezoom	= options.tilezoom = options.tilezoom.data('tilezoom.settings');

		$element.css({

			background: 'url(' +options.thumb+ ') no-repeat'
		})
		.addClass('ui-tilezoommap');

		if ( options.clickable ) {

			$element.click( $.proxy(me.onClick, me) );
		}

		me.controlRectangle	= $('<div>')
									.addClass('control-rectangle')
									.appendTo( $element );

		if ( options.draggable ) {

			me.controlRectangle.draggable({

				containment:	$element,
				stop:			$.proxy(me.onDragStop, me)
			});
		}

//		override tilezoom listener
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

		var superAfterToggleFullScreen = tilezoom.afterToggleFullScreen;
		tilezoom.afterToggleFullScreen = function ( isFullScreen ) {

			if ( superAfterToggleFullScreen ) {

				superAfterToggleFullScreen( isFullScreen );
			}

			me.updateLayout( tilezoom );
		};

//		init
		me.updateLayout( tilezoom );
	},

	updateLayout: function ( tilezoom ) {

		var $holder	= tilezoom.holder,
			x		= parseInt( $holder.css('left') ) * -1,
			y		= parseInt( $holder.css('top') ) * -1;

		this.doLayout(tilezoom, x, y, tilezoom.zoomLevel);
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

//		calculate width and height
		var rectangleWidth	= (containerWidth / holderWidth) * 100,
			rectangleHeight	= (containerHeight / holderHeight) * 100;

		rectangleWidth	= parseInt( parseFloat( rectangleWidth * elementWidth / 100 ).toFixed(0) );
		rectangleHeight	= parseInt( parseFloat( rectangleHeight * elementHeight / 100 ).toFixed(0) );

//		calculate position
		var rectangleLeft	= (x / holderWidth) * 100,
			rectangleTop	= (y / holderHeight) * 100;

		rectangleLeft	= parseInt( parseFloat( rectangleLeft * elementWidth / 100 ).toFixed(0) );
		rectangleTop	= parseInt( parseFloat( rectangleTop * elementHeight / 100 ).toFixed(0) );

		var w2 = rectangleLeft + rectangleWidth;

		if ( rectangleLeft + rectangleWidth > elementWidth ) {

			rectangleLeft = elementWidth - rectangleWidth;
		}
		if ( rectangleTop + rectangleHeight > elementHeight ) {

			rectangleTop = elementHeight - rectangleHeight;
		}

//		define slide animation
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

		if ( rectangleTop < 0 ) {

			rectangleTop = 0;
		}
		if ( rectangleLeft < 0 ) {

			rectangleLeft = 0;
		}

		if ( rectangleHeight > elementHeight ) {

			rectangleHeight = elementHeight;
		}

		controlRectangle.css({

			left:	rectangleLeft + 'px',
			top:	rectangleTop + 'px',
			width:	rectangleWidth +'px',
			height:	rectangleHeight +'px'
		});
	},

	_setAnimation: function ( el, duration ) {

		var value = '';
		if ( duration ) {

			value = 'all ' +duration+ 'ms linear';
		}

		el.css({

			'transition':			value,
			'-webkit-transition':	value,
			'-moz-transition':		value,
			'-o-transition':		value
		});
	},

	onDragStop: function ( e, ui ) {

		var	me					= this,
			tilezoom			= me.options.tilezoom,

			$rectangle			= me.controlRectangle,
			rectangleWidth		= $rectangle.outerWidth(),
			rectangleHeight		= $rectangle.outerHeight(),

			element				= me.element,
			elementWidth		= element.width(),
			elementHeight		= element.height(),
			holder				= tilezoom.holder,
			container			= tilezoom.cont,
			holderWidth			= holder.width(),
			holderHeight		= holder.height(),
			recLeft				= parseInt($rectangle.css('left')),
			recTop				= parseInt($rectangle.css('top'));

		var percentX	= holderWidth / elementWidth,
			percentY	= holderHeight / elementHeight,
			x			= parseInt( parseFloat( ( recLeft + (rectangleWidth / 2) ) * percentX).toFixed(0) ),
			y			= parseInt( parseFloat( ( recTop + (rectangleHeight / 2) ) * percentY).toFixed(0) );

		if ( recLeft == 0 ) {
	
			x = parseInt( container.width() / 2);
		}
		if ( recTop == 0 ) {
	
			y = parseInt( container.height() / 2);
		}

		var tollerance		= 3,
			contWidthHalf	= container.width() / 2,
			contHeightHalf	= container.height() / 2;

		if ( ( tollerance + x + contWidthHalf) > holderWidth ) {

			x = parseInt( parseFloat( holderWidth - contWidthHalf ).toFixed(0) );
		}
		if ( ( tollerance + y + contHeightHalf) > holderHeight ) {

			y = parseInt( parseFloat( holderHeight - contHeightHalf ).toFixed(0) );
		}

		me.options.dragstop( x, y, tilezoom.level );

		container.tilezoom('moveTo', tilezoom.level, { x: x, y: y } );
	},

	onClick: function ( e ) {

		if ( $(e.target).hasClass('ui-tilezoommap') ) {

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
});

}( jQuery ));