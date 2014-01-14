(function($, jQuery) {

	$.fn.tilezoomContainer = function (options) {

		var	defaults	= $.fn.tilezoomContainer.defaults, 
			settings	= $.extend({ }, defaults, options);

		settings.tilezoom = $.extend({ }, defaults.tilezoom, options.tilezoom);

		return this.each(function() {

			var $this = $(this);

			return $this.data('tilezoomContainer', new _TilezoomContainer($this, settings));
		});
	};

	$.fn.tilezoomContainer.defaults = {

		tilezoom: {

			navigation: false
		}
	};
	$.fn.tilezoomContainer.version = '1.0';


//	=================================================================
	var _TilezoomContainer = function (element, options) {
 
		var me = this;

		me.element	= element;
		me.options	= options;

		me._init();
	};

	_TilezoomContainer.prototype = {

		_init: function () {

			var me		= this,
				element	= me.element.addClass('tilezoom-container'),
				options	= me.options;

//			init buttonmenu
			var buttonMenuItems = me.buttonMenuItems = {

				map:		$('<li><a class="overviewmap" href="#map"></a></li>'),
				goHome:		$('<li><a class="go-home" href="#goHome"></a></li>'),
				zoomOut:	$('<li><a class="zoom-out" href="#zoomOut"></a></li>'),
				zoomIn:		$('<li><a class="zoom-in" href="#zoomIn"></a></li>')
			};

			var menu = $('<ul>')
							.append( buttonMenuItems.map )
							.append( buttonMenuItems.goHome )
							.append( buttonMenuItems.zoomOut )
							.append( buttonMenuItems.zoomIn );

			var	buttonmenu = $('<div>').append( menu ).buttonmenu({

				angle: {

					from:	75,
					to:		235
				},
				onClick: $.proxy(me.onButtonmenuClick, me)
			});
			buttonmenu.css({

				top: 	'-35px',
				right:	'-35px'
			})
			.on('click', 'li a', $.proxy(me.onMenubuttonClick, me))
			.mousedown( $.proxy(me.onMousedown, me) );

			me.buttonmenu	= buttonmenu;
			me.tilezoom		= $('<div>').tilezoom( options.tilezoom );
			me.overviewMap	= $('<div>').tilezoomOverviewMap( {

				tilezoom:	me.tilezoom,
				thumb:		'dest/wow_files/thumb2.jpg'
			});

			element.append( me.tilezoom )
					.append( me.overviewMap )
					.append( buttonmenu );

			setTimeout(function () {

				buttonmenu.data('buttonmenu').expand();

			}, 1000);
		},

		onButtonmenuClick: function ( $element ) {

			console.log( $element );
		},

//		Dragging
		onMousedown: function ( event ) {

			var	me				= this,
				$element		= $(event.currentTarget),
				$container		= me.element,
				elementWidth	= $element.outerWidth(),
				elementHeight	= $element.outerHeight(),				
				$document		= $(document),
				isDragging		= false;

			$document.mousemove(function (e) {

				if ( !$element.hasClass('dragging') ) {

					isDragging = true;

					$element.addClass('dragging');

					me.onDragStart( $element );
				}

				var offset	= $container.offset(),
					x		= e.pageX - (elementWidth / 2),
					y		= e.pageY - (elementHeight / 2);

				$element.css({

					left:	x,
					top:	y
				});
			});

			$document.one('mouseup', function () {

				$document.unbind('mousemove');

				if ( isDragging ) {

					$element.removeClass('dragging');

					me.onDragStop( $element );
				}
			});
		},

		onDragStart: function ( $target ) {

			var me = this;

			if ( $target.data('buttonmenu') ) {

				var buttonmenu = $target.data('buttonmenu');
//				buttonmenu.collapse();
			}
		},
		onDragStop: function ( $target ) {

			var me				= this,
				offset			= 40,
				targetWidth		= $target.outerWidth(),
				targetHeight	= $target.outerHeight(),
				targetLeft		= $target.offset().left,
				targetTop		= $target.offset().top,

				$container		= me.element,
				contWidth		= $container.innerWidth(),
				contHeight		= $container.innerHeight(),

				percentLeft		= (targetLeft + targetWidth/2 ) / contWidth * 100,
				percentTop		= (targetTop + targetHeight/2 ) / contHeight * 100;

			if ( $target.data('buttonmenu') ) {

				var buttonmenu	= $target.data('buttonmenu'),
					menuItems	= me.buttonMenuItems,
					menu		= $('ul', $target),
					startPos	= {},
					style		= {};

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
				buttonmenu.options.angle = angle;

//				Items
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

					buttonmenu.expand();

					setTimeout(function () {

						me._setTransition($target, '');

					}, 500);

				}, 50);
			}
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
				overviewMap	= me.overviewMap,
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

				if ( overviewMap.is(":visible") ) {

					overviewMap.hide();
				}
				else {

					overviewMap.show();
				}
			}

			e.preventDefault();
			return false;
		}
	};

})(jQuery, jQuery);