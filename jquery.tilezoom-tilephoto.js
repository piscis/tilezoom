$.widget('ui.tilezoomtilephoto', {

	options: {

		tileWidth:  29,
		tileHeight: 29,

		tileClick: function ( event, tilePosX, tilePosY ) {}
	},

	_create: function () {

		var me			= this,
			options		= me.options,
			$element	= me.element;

        var tilezoomSettings = me.tilezoomSettings = $element.data('tilezoom.settings');
        var $holder = tilezoomSettings.holder;

        me.element = $('<a>', {

        	'class': 'tilezoom-tilephoto',
        	width:   options.tileWidth,
        	height:  options.tileHeight
        })
        .appendTo( $holder )
        .on('click', $.proxy( me.onClick, me ));     

//      $element.on('mouseenter mouseout', $.proxy( me.onMouseenter, me ));

        $element
				.on('beforeZoom', $.proxy( me.beforeZoom, me ))
        		.on('afterZoom',  $.proxy( me.afterZoom, me ));
	},

	isMaxZoomlevel: function ( level ) {

        var settings = this.tilezoomSettings;

	    if ( level == ( settings.numLevels - 1 ) ) {

	    	return true;
	    }
	    else {

	    	return false;
	    }
	},

	onMouseenter: function ( event ) {

		console.log( event.type );

		var $element = this.element,
			level    = this.tilezoomSettings.level;

		if ( this.isMaxZoomlevel(level) && event.type == 'mouseenter' ) {

	    	$element.addClass('active');
		}
	    else {

	    	$element.removeClass('active');
	    }
	},

	beforeZoom: function ( event, oldLevel, newLevel ) {

		var $element = this.element;

		if ( this.isMaxZoomlevel(newLevel) ) {

	    	$element.addClass('active');
		}
	    else {

	    	$element.removeClass('active');
	    }
	},

	afterZoom: function ( event, coords, level ) {

		var me               = this,
			onMouseMoveFunc  = me.onMouseMove,
		    tilezoomSettings = me.tilezoomSettings,
		    $holder          = tilezoomSettings.holder;

		if ( me.isMaxZoomlevel(level) ) {

			$holder.on('mousemove', $.proxy( onMouseMoveFunc, me ));
		}
		else {

			$holder.off('mousemove', onMouseMoveFunc);
		}
	},

	onMouseMove: function ( e ) {

		var settings     = this.tilezoomSettings,
		    options      = this.options,
		    holderOffset = settings.holder.offset(),
			$element     = this.element;

		if ( settings.inAction ) {

			return true;
		}

		var position = {

			x: (holderOffset.left * -1) + e.pageX,
			y: (holderOffset.top * -1) + e.pageY
		};

		var tileWidth  = options.tileWidth,
		    tileHeight = options.tileHeight;

		$element.css({

			left: parseInt(position.x / tileWidth) * tileWidth,
			top:  parseInt(position.y / tileHeight) * tileHeight
		});
	},

	onClick: function (e) {

		var options          = this.options,
		    tilezoomSettings = this.tilezoomSettings,
		    $holder          = tilezoomSettings.holder,
		    holderOffset     = $holder.offset(),
			$element         = this.element;

		var event = {

			level:      tilezoomSettings.level,
			width:      $holder.width(),
			height:     $holder.height(),

			tileWidth:  options.tileWidth,
			tileHeight: options.tileHeight,

			mouseX:     (holderOffset.left * -1) + e.pageX,
			mouseY:     (holderOffset.top * -1) + e.pageY
		};

		if ( options.tileClick ) {

			var tilePosX = parseInt(event.mouseX / options.tileWidth),
				tilePosY = parseInt(event.mouseY / options.tileHeight);

			options.tileClick(event, tilePosX, tilePosY);
		}
	}
});