(function( $, undefined ) {

$.widget('ui.wheelmenu', {

	version: '1.0',
	options: {

		delay:	100,
		angle: {

			from:	90,
			to:		360
		}
	},
	_create: function () {

		var me			= this,
			options		= me.options,
			$element	= me.element;

		$element.addClass('ui-wheelmenu');

//		Settings
		var $toggleButton = $('<span>', {

			'class': 'ui-wheelmenu-toggle'

		}).on('click', $.proxy(me.onToggleMenu, me));

		var $menu = $('ul', $element);
		if ( $menu.length == 0 ) {

			$menu = $('<ul>');
		}

		$('li', $menu).addClass('item');

		me.menu			= $menu;
		me.toggleButton = $toggleButton;

		$element.append( $toggleButton ).append( $menu );

		me.collapse();

		$('li', $menu).addClass('item');
	},

	collapse: function () {

		var	me			= this,
			$element	= me.element,
			$toggleBtn	= me.toggleButton,
			$items		= $('li', me.menu);

		var elementWidth	= $element.innerWidth() / 2,
			elementHeight	= $element.innerHeight() / 2;

		$toggleBtn.removeClass('expand');
		$items.removeClass('state-active');

		$.each($items, function ( index, item ) {

			var	$item	= $(item),
				timer	= $item.data('timer');

			if ( timer ) {

				clearTimeout( timer );
				$item.data('timer', false)
			}

			$item.css({

				left:	(elementWidth - ($item.outerWidth() / 2)) +'px',
				top:	(elementHeight - ($item.outerHeight() / 2)) +'px'
			});
		});
	},

	expand: function () {

		var	me			= this,
			options		= me.options,
			$toggleBtn	= me.toggleButton,
			angleFrom	= options.angle.from,
			angleTo		= options.angle.to,
			$element	= me.element,
			$items		= $('li', me.menu),
			steps		= $items.length;

		$toggleBtn.addClass('expand');

		if ( $items.length == 0 ) {

			return false;
		}

		var	delay			= options.delay,
			elementWidth	= $element.innerWidth(),
			elementHeight	= $element.innerHeight(),
			radius			= elementWidth / 2,
			step			= (angleTo - angleFrom) / $items.length;

		$items.addClass('state-active');

		$.each($items, function ( index, item ) {

			var	$item		= $(item),
				itemWidth	= $item.outerWidth() / 2,
				itemHeight	= $item.outerHeight() / 2,

				angle	= (angleFrom + (step * index)) * (Math.PI/180),
				x		= Math.round( (elementWidth/2) + ((radius - itemWidth) * Math.cos(angle)) ) - itemWidth,
				y		= Math.round( (elementHeight/2) + ((radius - itemHeight) * Math.sin(angle)) ) - itemHeight;

			var timer = setTimeout(function () {

				$item.css({

					left:	x +'px',
					top:	y +'px'
				});

				$item.data('timer', false);

			}, (index * delay) );

			$item.data('timer', timer);
		});
	},

	onToggleMenu: function (e) {

		var	me			= this,
			$toggleBtn	= $(e.currentTarget);

		if ( $toggleBtn.hasClass('expand') ) {

			me.collapse();
		}
		else {

			me.expand();
		}
	}
});

}( jQuery ));