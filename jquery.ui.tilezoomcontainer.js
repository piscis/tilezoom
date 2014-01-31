(function( $, undefined ) {

$.widget('ui.tilezoomcontainer', {

	version: '1.0',
	options: {

		tilezoom: {

			navigation: false
		}
	},

	_create: function () {

		var me				= this,
			options			= me.options,
			$element		= me.element.addClass('ui-tilezoomcontainer'),
			$dragWrapper	= $('<div>').addClass('ui-tilezoomcontainer-wrapper').appendTo( $element );

//		Tilezoom
		me.tilezoom = $('<div>').tilezoom( options.tilezoom ).appendTo( $element );

		var settings = me.tilezoom.data('tilezoom.settings');

		me.tilezoommap = $('<div>').append( $('<div class="dragwrapper">') ).tilezoommap( {

			tilezoom:	me.tilezoom,
			thumb:		settings.thumb[0].src
		})
		.draggable({

			containment: $element,
			handle:		'.dragwrapper',

			start: function( e, ui ) {

				console.log( e );
			}
		})
		.css({

			position: 'absolute'
		})
		.appendTo( $element );

//		WheelMenu
		var wheelMenuItems = me.buttonMenuItems = {

			map:		$('<li><a class="overviewmap" href="#map"></a></li>'),
			goHome:		$('<li><a class="go-home" href="#goHome"></a></li>'),
			zoomOut:	$('<li><a class="zoom-out" href="#zoomOut"></a></li>'),
			zoomIn:		$('<li><a class="zoom-in" href="#zoomIn"></a></li>')
		};

		var menu = $('<ul>')
						.append( wheelMenuItems.map )
						.append( wheelMenuItems.goHome )
						.append( wheelMenuItems.zoomOut )
						.append( wheelMenuItems.zoomIn );

		var	$wheelmenu = $('<div>').append( menu ).css({

			top: 		'-35px',
			right:		'-35px'
		})
		.appendTo( $element );

		me.wheelmenu = $wheelmenu.wheelmenu({

			angle: {

				from:	75,
				to:		235
			},
			onClick: $.proxy(me.onButtonmenuClick, me)
		})
		.draggable({

			containment:	$dragWrapper,
			delay:			0,
			handle:			'.ui-wheelmenu-toggle',

			stop:			$.proxy(me.onWheelMenuDragStop, me)
		})
		.css({

			position: 'absolute'
		})
		.on('click', 'li a', $.proxy(me.onMenubuttonClick, me));

		setTimeout(function () {

			$wheelmenu.data('ui-wheelmenu').expand();

		}, 1000);
	},

	onButtonmenuClick: function ( $element ) {

		console.log( $element );
	},

	onWheelMenuDragStop: function ( e ) {

		var me				= this,
			offset			= 40,
			$target			= me.wheelmenu,
			targetWidth		= $target.outerWidth(),
			targetHeight	= $target.outerHeight(),
			targetLeft		= $target.offset().left,
			targetTop		= $target.offset().top,

			$container		= me.element,
			contWidth		= $container.innerWidth(),
			contHeight		= $container.innerHeight(),

			percentLeft		= (targetLeft + targetWidth/2 ) / contWidth * 100,
			percentTop		= (targetTop + targetHeight/2 ) / contHeight * 100,

			wheelmenu		= $target.data('ui-wheelmenu'),
			menuItems		= me.buttonMenuItems,
			menu			= $('ul', $target),
			startPos		= {},
			style			= {};

		if ( percentLeft <= 50 ) {

			startPos.left	= targetLeft +'px';
			style.left		= Math.round( (targetWidth * -1 / 2) + offset ) +'px';
		} 
		else if ( percentLeft > 50 ) {

			startPos.right	= (contWidth - targetLeft - targetWidth) +'px';
			style.right		= Math.round( (targetWidth * -1 / 2) + offset ) +'px';
		}

		if ( percentTop <= 50 ) {

			startPos.top	= targetTop +'px';
			style.top 		= Math.round( (targetHeight * -1 / 2) + offset ) +'px';
		} 
		else if ( percentTop > 50 ) {

			startPos.bottom	= (contHeight - targetTop - targetHeight) +'px';
			style.bottom	= Math.round( (targetHeight * -1 / 2) + offset ) +'px';
		}

//				Angle
		var angle = {};
		if ( style.left && style.top ) {

			angle = {

				from:	100,
				to:		-50
			};
		}
		else if ( style.right && style.top ) {

			angle = {

				from:	75,
				to:		235
			};
		}
		else if ( style.left && style.bottom ) {

			angle = {

				from:	10,
				to:		-130
			};
		}
		else if ( style.right && style.bottom ) {

			angle = {

				from:	165,
				to:		330
			};
		}
		wheelmenu.options.angle = angle;

//		Items
		if ( style.top ) {

			menu
				.append( menuItems.map )
				.append( menuItems.goHome )
				.append( menuItems.zoomOut )
				.append( menuItems.zoomIn );
		}
		else if ( style.bottom ) {

			menu
				.append( menuItems.zoomOut )
				.append( menuItems.zoomIn )
				.append( menuItems.goHome )
				.append( menuItems.map );
		}

		$target.removeAttr('style').css( startPos );

		setTimeout(function () {

			me._setTransition($target, 'all 0.2s cubic-bezier(0.385, 0.810, 0.435, 1.295)');
			$target.css( style );

			wheelmenu.expand();

			setTimeout(function () {

				me._setTransition($target, '');

			}, 500);

		}, 50);
	},

	_setTransition: function ( $target, value ) {

		$target.css({

			'transition':			value,
			'-webkit-transition':	value,
			'-moz-transition':		value,
			'-o-transition':		value
		});
	},

	onMenubuttonClick: function ( e ) {

		var me			= this,
			settings	= me.tilezoom.data('tilezoom.settings'),
			tilezoommap	= me.tilezoommap,
			$a			= $(e.currentTarget);

		if ( $a.hasClass('zoom-in') ) {

			settings.cont.tilezoom('zoom', settings.level + 1, {});
		}
		else if ( $a.hasClass('zoom-out') ) {

			settings.cont.tilezoom('zoom', (settings.level - 1), {});
		}
		else if ( $a.hasClass('go-home') ) {

			settings.cont.tilezoom('zoom', settings.startLevel, {});
		}
		else if ( $a.hasClass('overviewmap') ) {

			if ( tilezoommap.is(":visible") ) {

				tilezoommap.hide();
			}
			else {

				tilezoommap.show();
			}
		}

		e.preventDefault();
		return false;
	}
});

}( jQuery ));