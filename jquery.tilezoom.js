/*
 * jQuery WCS Tile Zoom Plugin
 * Examples and documentation at: http://demo.webcodingstudio.com/tile-zoom/
 * Copyright (c) 2011 Evgeny Matsakov
 * Version: 1.0 (2-NOV-2011)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 * Requires: jQuery v1.2.6 or later
 */
(function($){

function debug (s) {

	$.fn.tilezoom.debug && log(s);
}		
function log () {

	window.console && console.log && console.log('[tilezoom] ' + Array.prototype.join.call(arguments,' '));
}

var methods = {

	init: function ( options ) {

		var defaults = {

			width:					null, // original image width in pixels. *(required) if no xml file
			height:					null, // original image height in pixels *(required) if no xml file
			path:					null, // tiles directory. *(required) if no xml file
			xml:					null, // xml file with settings generated with Deep Zoom Tools
			tileSize:				254, // tile size in pixels
			overlap:				1, // tiles overlap
			directionArrows:		true,
			thumb:					'thumb.jpg', // thumbnail filename
			format:					'jpg', // image format
			speed:					500, //animation speed (ms)
			startPosition:			'center',
			mousewheel:				false, // requires mousewheel event plugin: http://plugins.jquery.com/project/mousewheel
			gestures:				false, // requires touchit event plugin, https://github.com/danielglyde/TouchIt
			zoomToCursor:			true, // stay the same relative distance from the edge when zooming
			offset:					'20%', //boundaries offset (px or %). If 0 image move side to side and up to down
			dragBoundaries:			true, // If we should constrain the drag to the boundaries
			beforeZoom:				function ($cont, oldLevel, newLevel) { }, // callback before a zoom happens
            afterZoom:				function ($cont, coords, level) { }, // callback after zoom has completed
			afterToggleFullScreen:	function (isFullScreen) {},
            callBefore:				function ($cont) {}, // this callback happens before dragging starts
            callAfter:				function ($cont, coords, level) { }, // this callback happens at end of drag after released "mouseup"
			navigation:				true, // navigation container ([true], [false], [DOM selector])
			zoomIn:					null, // zoomIn button
			zoomOut:				null, // zoomOut button
			goHome:					null, // goHome button, reset to default state
			toggleFull:				null, // toggleFull button
			minLevel:				9,

			getURL: function ( level, x, y, settings ) {

				var url = settings.path +'/'+ level +'/'+ x +'_'+ y +'.'+ settings.format

				return url;
			}
		}

		// iterate the matched nodeset
		return this.each(function (index) {

			if ( options.xml != null ) {

				var $cont = $(this);
				initOptionsFromXml(options.xml, options, function() {

					initTilezoom(defaults, options, $cont, index);
				});
			}
			else {

				initTilezoom(defaults, options, $(this), index);
			}		
		});
	},
	destroy: function () {

		return this.each(function(){

			var $cont	= $(this),
				data	= $cont.data('tilezoom');

			// Namespacing FTW
			$(window).unbind('.tilezoom');
			if ( data ) {

				data.tilezoom.remove();
			}

			$cont.removeData('tilezoom').html('');
		});
	},
	center: function () {

		return this.each(function () {

			var $cont		= $(this),
				settings	= $cont.data('tilezoom.settings'),
				$holder		= settings.holder,
				$hotspots	= settings.hotspots,
				level		= 12;

			var coords = {

				left:	parseInt($holder.width() / 2),
				top:	parseInt($holder.height() / 2)
			};

			$cont.tilezoom('zoom', level, coords, 0);
		});
	},
	moveTo: function ( level, coords, callback ) {

		return this.each(function () {

			var $cont		= $(this),
				settings	= $cont.data('tilezoom.settings');

			console.log( coords );

			$cont.tilezoom('zoom', level, coords, settings.speed, callback);
		});
	},
	updateLayout: function () {

		return this.each(function () {

			var $cont		= $(this),
				settings	= $cont.data('tilezoom.settings');

			$cont.tilezoom('zoom', settings.level, {});
		});
	},

	zoom: function ( level, coords, speed, callback ) {

		return this.each(function () {

			var $cont		= $(this),
				settings	= $cont.data('tilezoom.settings'),
				$holder		= settings.holder;

			if ( typeof speed === "undefined" ) {

				speed = settings.speed;
			}

			if ( settings.inAction ) {

				return false;
			}

			if ( settings.minLevel <= level && level < settings.numLevels ) {

				//beforeZoom callback
				if ( typeof settings.beforeZoom == "function" ) {

					var res = settings.beforeZoom($cont, settings.level, level);
					if ( res === false ) {

						return;
					}
	            }

				settings.level = level;
				$cont.data('tilezoom.settings', settings);

				initTiles($cont);

				setSizePosition($cont, coords, speed, function() {

					checkTiles($cont);

					//afterZoom callback
					if ( typeof settings.afterZoom == "function" ) {

						var retCoords = {

							x:	( parseInt($holder.css('left')) * -1),
							y:	( parseInt($holder.css('top')) * -1)
						};

						if ( callback ) {

							callback( $cont, retCoords, level );
						}

						settings.afterZoom( $cont, retCoords, level );
					}

					updateDirectionArrows(settings);
				});
			}
			else {

				return false;
			}
		});
	},
	reposition:	function ( ) {},
	show:		function ( ) {},
	hide:		function ( ) {},
	update:		function ( ) {},
	resize:		function ( ) {

		return this.each(function () {

			setSizePosition($(this), {}, 0);
		});
	}
};

$.fn.tilezoom = function ( method ) {

	if ( methods[method] ) {

		return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
	}
	else if ( typeof method === 'object' || ! method ) {

		return methods.init.apply( this, arguments );
	}
	else {

		$.error( 'Method ' +  method + ' does not exist on jquery.tilezoom' );
	}
};

//init Tilezoom
function initTilezoom (defaults, options, $cont, index) {

	var settings = $.extend({ }, defaults, options);

	if ( settings.width == null ) {

		$.error( 'width is not specified' );
	}
	if ( settings.height == null ) {

		$.error( 'height is not specified' );
	}
	if ( settings.path == null ) {

		$.error( 'path to tiles directory is not specified' );
	}

	settings.userAgent	= navigator.userAgent.toLowerCase();
	settings.id			= index;
	settings.inAction	= false;
	settings.cont		= $cont;	

	buildMarkup($cont, settings);
	buildOptions($cont, settings);

	if ( settings.directionArrows ) {

		settings.directionArrows = {

			top:	$('<div>', { 'class': 'zoom-arrow top' }).append( $('<span>') ),
			right:	$('<div>', { 'class': 'zoom-arrow right' }).append( $('<span>') ),
			bottom:	$('<div>', { 'class': 'zoom-arrow bottom' }).append( $('<span>') ),
			left:	$('<div>', { 'class': 'zoom-arrow left' }).append( $('<span>') )
		};

		var arrows = settings.directionArrows;
		for ( var key in arrows ) {

			arrows[key].appendTo( $cont );
		}
	}

	initTiles($cont);
	initHotspots($cont);
	initNavigation($cont);
	updateDirectionArrows(settings);

//	Startposition
	var coords = {},
		holder = settings.holder;

	setSizePosition($cont, {}, 0, function() {

		checkTiles($cont);
		var isTouchSupported = (typeof(window.ontouchstart) != 'undefined');
		if ( isTouchSupported ) {

			initGestures($cont);
		}
		else {

			initDraggable($cont);
			initMousewheel($cont);
		}

		if ( settings.startPosition == 'center' ) {

			coords = {

				left:	parseInt( holder.width() / 2 ),
				top:	parseInt( holder.height() / 2 )
			};
		}

		setTimeout(function () {

			$cont.tilezoom('zoom', settings.level, coords, 0);

		}, 0);
	});

//	window resize
	var	$window				= $(window),
		windowResizeTimer	= false;

	$window.resize(function () {

		if ( windowResizeTimer ) {

			clearTimeout( windowResizeTimer );
			windowResizeTimer = false;
		}

		windowResizeTimer = setTimeout(function () {

			$cont.tilezoom('updateLayout');

			windowResizeTimer = false;

		}, 100);
	});

//
	$window.on('keyup',function( e ) {

		initKeyup( e, settings );
	});
}

//parse XML
function initOptionsFromXml (xml, options, callback) {

	$.ajax({

		type:		"GET",
		url:		xml,
		dataType:	"xml",

		success: function (data) {

			var	$image	= $(data).find('Image'),
				$size	= $image.find('Size');

			options.tileSize	= $image.attr('TileSize');
			options.overlap		= $image.attr('Overlap');
			options.format		= $image.attr('Format');

			options.width	= $size.attr('Width');
			options.height	= $size.attr('Height');
			options.path	= xml.replace('.xml', '_files');

			if ( typeof callback == "function" ) {

				callback();
		    }
		}
	});
}

//build markup
function buildMarkup ($cont, settings) {
	
	$cont.addClass('zoom-container');

	if ( !$cont.children('div.zoom-holder').get(0) ) {

		$cont.append('<div class="zoom-holder">');
	}

//	holder
	var $holder = settings.holder = $cont.children('div.zoom-holder');

//	thumb
	var thumbPath = settings.path+'/'+settings.thumb;
	if ( !$holder.children('img.zoom-thumb').get(0) ) {

		$holder.prepend('<img src="'+thumbPath+'" class="zoom-thumb"/>');
	}
	var $thumb = settings.thumb = $holder.children('img.zoom-thumb');

//	tiles container
	if (!$holder.children('div.zoom-tiles').get(0)) {

		$thumb.after('<div class="zoom-tiles">');
	}
	var $tiles = settings.tiles = $holder.children('div.zoom-tiles');

//	hotspots container
	if (!$holder.children('div.zoom-hotspots').get(0)) {

		$tiles.after('<div class="zoom-hotspots">');
	}

	var $hotspots = settings.hotspots = $holder.children('div.zoom-hotspots');
	$hotspots.addClass('grab');

	return settings;
}

// one-time initialization
function buildOptions ($cont, settings) {

	settings.numLevels = initNumLevels(settings);

	if ( settings.startLevel == undefined ) {

		settings.startLevel	= initLevel(settings);
		settings.level		= settings.startLevel;
	}

	$cont.data('tilezoom.settings', settings);
}

function initNumLevels (settings) {

	var maxDimension	= Math.max(settings.width, settings.height),
		numLevels		= parseInt(Math.ceil(Math.log(maxDimension)/Math.log(2)) + 1);

	return numLevels;
};

function initLevel (settings) {

	var level		= 9,
		$cont		= settings.cont,
		contWidth	= $cont.width(),
		contHeight	= $cont.height();

	while (9 <= level && level < settings.numLevels) {

		var levelImage = getImage(level, settings);
		if ( levelImage.width >= contWidth || levelImage.height >= contHeight ) {

			break;
		}
		level++;
	}
	return level-1;
};

function initTiles ($cont, level) {

	var settings = $cont.data('tilezoom.settings');
	if ( level == undefined ) {

		level = settings.level;
	}

	var tiles		= getTiles(level, settings),
		$tiles		= settings.tiles,
		overlap		= settings.overlap;
		tileSize	= settings.tileSize;

	$tiles.html('');

	$.each(tiles, function(index, tile) {

		var src		= settings.getURL( parseInt(level), parseInt(tile[0]), parseInt(tile[1]), settings ),
			offsetX	= tile[0] == 0 ? 0 : overlap,
			offsetY	= tile[1] == 0 ? 0 : overlap;

		$('<img>', {

			id:		'zoom-' +settings.id+ '-tile-' +tile[0]+ '-' +tile[1],
			_src:	src
		})
		.css({

			position:	'absolute',
			zIndex:		0,
			left:		(tile[0] * tileSize - offsetX) + 'px',
			top:		(tile[1] * tileSize - offsetY) + 'px'
		})
		.appendTo( $tiles );
	});
}

function getImage (level, settings) {

	return getDimension(level, settings);
};

function getDimension (level, settings) {

	if ( 0 <= level && level < settings.numLevels ) {

		var scale		= getScale(level, settings),
			dimension	= {

			width:	parseInt(Math.ceil( settings.width * scale )),
			height:	parseInt(Math.ceil( settings.height * scale ))
		};

		return dimension;
	}
	else {

		throw 'Invalid pyramid level';
	}
};

function getScale (level, settings) {

	if ( 0 <= level && level < settings.numLevels ) {

		var maxLevel = settings.numLevels - 1;
		return Math.pow(0.5, maxLevel - level);
	}
	else {

		throw 'Invalid pyramid level (scale)';
	}
};

function getTiles (level, settings) {

	var cells = getNumTiles(level, settings),
		yield = [];

	for ( row = 0; row <= (cells.rows-1); row++) {

		for ( column=0; column <= (cells.columns-1); column++) {

			yield.push(new Array(column, row));
		}
	}
	return yield;
}

function getNumTiles (level, settings) {

	if ( 0 <= level && level < settings.numLevels ) {

		var dimension	= getDimension(level, settings),
			tileSize	= settings.tileSize;

		return {

			columns:	parseInt(Math.ceil(parseFloat(dimension.width) / tileSize)),
		  	rows:		parseInt(Math.ceil(parseFloat(dimension.height) / tileSize))
		};
	}
	else {

		throw "Invalid pyramid level (numTiles)";
	}
}

function checkTiles ($cont) {

	var settings		= $cont.data('tilezoom.settings'),
		visibleTiles	= getVisibleTiles($cont);

	$.each(visibleTiles, function (index, visibleTile) {

		var id		= 'zoom-' +settings.id+ '-tile-' +visibleTile[0]+ '-' +visibleTile[1],
			$img	= $('#'+id);

		if ( $img.get(0) ) {

			var src = $img.attr('src');
			if( !src ) {

				$img.attr('src', $img.attr('_src'));
			}
		}
	});
}

function getVisibleTiles ($cont) {

	var settings	= $cont.data('tilezoom.settings'),
		$holder		= settings.holder,
		tileSize	= settings.tileSize;

	var mapX	= parseInt($holder.css('left')),
		mapY	= parseInt($holder.css('top'));

	var viewportWidth	= $cont.width(),
		viewportHeight	= $cont.height();

	var startX = Math.abs(Math.floor(mapX / tileSize)) - 2,
		startY = Math.abs(Math.floor(mapY / tileSize)) -1; 

	var tilesX	= Math.ceil(viewportWidth / tileSize) +2,
		tilesY	= Math.ceil(viewportHeight / tileSize) +1; 

	var visibleTileArray	= [],
		counter				= 0;

	for (x = startX; x < (tilesX + startX); x++) {

		for (y = startY; y < (tilesY + startY); y++) {

			if ( x>=0 && y>=0 ) {

				visibleTileArray[counter++] = [x, y];
			}
		}
	}
	return visibleTileArray;
}

/*
* Init Draggable funtionality
*/
function initDraggable ($cont) {
	
	var settings		= $cont.data('tilezoom.settings'),
		directionArrows = settings.directionArrows,
		$holder			= settings.holder,
		$hotspots		= settings.hotspots;

	var dragging	= false,
		startLeft	= 0,
		startTop	= 0;

	$holder.unbind('mousedown').unbind('mousemove');
	$holder.dblclick(function (e) {

		var coords = {

			x:	e.pageX,
			y:	e.pageY		
		};

//		If we're at the high level of resolution, go back to the start level
		var level = (settings.level < settings.numLevels - 1) ? settings.level+1 : settings.startLevel;

		$cont.tilezoom('zoom', level, coords);
	});

	$holder.mousedown(function (e) {

		if ( settings.inAction ) {

			return false;
		}

		var directionArrows = settings.directionArrows;

		$holder.stop(true, true);

		$hotspots.removeClass('grab').addClass('grabbing');

		dragging = true;

		startLeft	= parseInt( $holder.css('left') );
		startTop	= parseInt( $holder.css('top') );

		var startX = e.pageX,
			startY = e.pageY;

		var	$document	= $(document),
			pos			= { };

		//callBefore callback
		if (typeof settings.callBefore == "function" ) {

			settings.callBefore($cont);
        }

		$document.unbind("mousemove").mousemove(function (e) {

			if ( dragging ) {

				if ( directionArrows ) {

					for ( var key in directionArrows ) {

						directionArrows[key].addClass('dragging');
					}
				}

				var offsetX =  e.pageX - startX,
					offsetY =  e.pageY - startY;

				pos.left	= startLeft + offsetX;
				pos.top		= startTop + offsetY;

				if ( settings.dragBoundaries ) {

					checkBoundaries($cont, pos);
				}

				$holder.css({

					left:	pos.left,
					top:	pos.top
				});

				updateDirectionArrows( settings );
			}
		});
		
		$document.one('mouseup', function () {

			if ( directionArrows ) {

				for ( var key in directionArrows ) {

					directionArrows[key].removeClass('dragging');
				}
			}

			$document.unbind("mousemove");

			$hotspots.removeClass('grabbing').addClass('grab');		

			dragging = false;
			checkTiles($cont);

//			fire drag event onl if the user has moved the image
			if ( !pos.top && !pos.left ) {

				return false;
			}

//			callAfter callback
			if ( typeof settings.callAfter == "function" ) {

				var coords = {

					startX:	(startLeft * -1),
					startY:	(startTop * -1),
					endX:	(pos.left * -1),
					endY:	(pos.top * -1)
				};

				settings.callAfter($cont, coords, settings.level);
	        }
		});

		return false;
	});
}

function updateDirectionArrows ( settings ) {

	var directionArrows = settings.directionArrows;

	if ( !directionArrows ) {

		return false;
	}

	var $cont	= settings.cont,
		$holder	= settings.holder,
		posTop	= parseInt( $holder.css('top') ) * -1,
		posLeft	= parseInt( $holder.css('left') ) * -1;
		right	= posLeft + $cont.width(),
		bottom	= posTop + $cont.height(),
		clsName	= 'state-active';

	if ( posTop > 0 ) {

		directionArrows.top.addClass( clsName );
	}
	else {

		directionArrows.top.removeClass( clsName );
	}

	if ( posLeft > 0 ) {

		directionArrows.left.addClass( clsName );
	}
	else {

		directionArrows.left.removeClass( clsName );
	}

	if ( right < $holder.width() ) {

		directionArrows.right.addClass( clsName );
	}
	else {

		directionArrows.right.removeClass( clsName );
	}
	if ( bottom < $holder.height() ) {

		directionArrows.bottom.addClass( clsName );
	}
	else {

		directionArrows.bottom.removeClass( clsName );
	}
}

/*
*	init keyup handler
*/
function initKeyup ( e, settings ) {

	var $holder		= settings.holder,
		$cont		= settings.cont,
		contWidth	= $cont.width() / 2,
		contHeight	= $cont.height() / 2,
		roundFunc	= Math.round,
		left		= roundFunc((parseInt($holder.css('left')) * -1) + contWidth),
		top			= roundFunc((parseInt($holder.css('top')) * -1) +contHeight);

	switch ( e.keyCode ) {

		// up
		case 38: {

			top	-= contHeight;
			break;
		}
		// down
		case 40: {

			top	+= contHeight;
			break;
		}
		// left
		case 37: {

			left -= contWidth;
			break;
		}
		// right
		case 39: {

			left += contWidth;
			break;
		}
		default: {

			return true;
		}
	}

	var coords = {

		left:	roundFunc( left ),
		top:	roundFunc( top )
	};

	$cont.tilezoom('zoom', settings.level, coords);
}

/*
*	Init Mousewheel zoom
*/
function initMousewheel ( $cont ) {

	var settings	= $cont.data('tilezoom.settings'),
		$holder		= settings.holder;
	
	if ( settings.mousewheel && typeof $.fn.mousewheel != "undefined" ) {

		var	timer = false;

		$cont.mousewheel(function (e, delta) {

			if ( timer ) {

				clearTimeout( timer );
			}
			else {

				var coords = {

					x: e.pageX,
					y: e.pageY
				};

				var level = (delta < 0 ? settings.level -1 : settings.level + 1);
				$cont.tilezoom('zoom', level, coords);
			}

			timer = setTimeout(function () {

				console.log('out');
				timer = false;
			}, 250);

			return false; //don't scroll the window
		});
	}
}

/*
* Init Hotspots clicks
*/
function initHotspots ($cont) {

	var settings	= $cont.data('tilezoom.settings'),
		$hotspots	= settings.hotspots,
		$holder		= settings.holder;

	$hotspots.children().click(function (event) {

		event.preventDefault();

		var $hotspot	= $(this),
			style		=  this.style;

		if ($hotspot.hasClass('active')) {

			var level = settings.startLevel;
			$hotspots.children().removeClass('active');
		}
		else {

			var level = parseInt($hotspot.attr('rel'));
			if (isNaN(level)) {

				level = settings.startLevel+1;
			}

			$hotspots.children().removeClass('active');
			$hotspot.addClass('active');
		}

		var left = style.left;
		if ( !left ) {

			left = $hotspot.css('left');
		}

		var top = style.top;
		if ( !top ) {

			top = $hotspot.css('top');
		}
	
		if (left.indexOf('%') !== -1) {

			left = parseInt(parseFloat(left) * $holder.width() / 100);
		}
		if (top.indexOf('%') !== -1) {

			top = parseInt(parseFloat(top) * $holder.height() / 100);
		}

		var coords = {

			left:	left,
			top:	top
		};

		$cont.tilezoom('zoom', level, coords);	
	});
}

function initGestures ($cont) {
	
	var settings	= $cont.data('tilezoom.settings'),
		$holder		= settings.holder,
		$nav		= settings.nav;
	
	if (settings.gestures && typeof $.fn.touchit != "undefined") {

		// gestures don't affect inside the container
		$cont.bind('touchmove', function(e) {

			e.preventDefault();
		});
		$cont.addClass('gestures');

		var dragging = false;

		var startLeft	= 0,
			startTop	= 0;

		var	startLevel,
			startX,
			startY,
			pos;
		
		$holder.touchit({

			onTouchStart: function (x, y) {

				if (settings.inAction) {

					return false;
				}

				$holder.stop(true, true);
				dragging = true;

				pos		= {};
				startX	= x;
				startY	= y;

				startLeft	= parseInt($holder.css('left'));
				startTop	= parseInt($holder.css('top'));
				startLevel	= settings.level;

				if (typeof settings.callBefore == "function" ) {

					settings.callBefore($cont);
		        }
			},
			onTouchMove: function (x, y) {

				if ( dragging ) {

					var offsetX = x - startX,
						offsetY = y - startY;

					pos.left	= startLeft + offsetX;
					pos.top		= startTop + offsetY;

					if ( settings.dragBoundaries ){

						checkBoundaries($cont, pos);
					}

					$holder.css({

						left:	pos.left,
						top:	pos.top
					});
				}
			},
			onTouchEnd: function (x, y) {

				dragging = false;
				checkTiles($cont);
				//callAfter callback

				if (typeof settings.callAfter == "function") {

					var coords = {

						startX:	(startLeft * -1),
						startY:	(startTop * -1),
						endX:	(pos.left * -1),
						endY:	(pos.top * -1)
					};

					settings.callAfter($cont, coords, settings.level);
			    }
			},
			onDoubleTap: function (x, y) {

				var coords = {

					x:	x,
					y:	y
				};

				// If we're at the high level of resolution, go back to the start level
				var level = (settings.level < settings.numLevels - 1) ? 
					settings.level+1 : settings.startLevel;

				$cont.tilezoom('zoom', level, coords);
			},
			onPinch: function (scale) {

				dragging = false;
				var level = (scale > 1) ? 
					startLevel + Math.floor(scale):
					startLevel - Math.floor(1/scale);				

				$cont.tilezoom('zoom', level, {});
			}
		});
	}
}

/*
* Init Navigation
*/
function initNavigation ($cont) {

	var settings	= $cont.data('tilezoom.settings'),
		$document	= $(document),
		$nav		= false;

	if (settings.navigation == true ) {

		if ( !$cont.children('div.zoom-navigation').get(0) ) {

			$nav = $('<div>', {

				'class': 'zoom-navigation'
			}).
			appendTo( $cont );
		}
		//navigation
		settings.nav = $nav;
	}
	else if ( settings.navigation != false && settings.navigation != null ) {

		$nav = settings.nav = $(settings.navigation);
	}

	if ( $nav && $nav.get(0) ) {

		//zoomIn button
		if( !$nav.children('a.zoom-in').get(0) ) {

			$nav.append('<a class="zoom-in" href="#" title="Zoom in">');
		}
		settings.zoomIn = $nav.children('a.zoom-in');
		
		//zoomOut button
		if( !$nav.children('a.zoom-out').get(0) ) {

			$nav.append('<a class="zoom-out" href="#" title="Zoom Out">');
		}
		settings.zoomOut = $nav.children('a.zoom-out');
		
		//goHome button
		if (!$nav.children('a.go-home').get(0)) {

			$nav.append('<a class="go-home" href="#" title="Go Home">');
		}
		settings.goHome = $nav.children('a.go-home');
		
		//toggleFull button
		if( !$nav.children('a.toggle-full').get(0) ) {

			$nav.append('<a class="toggle-full" href="#" title="Toggle Full Page">');
		}
		settings.toggleFull = $nav.children('a.toggle-full');
	}
	
	//init zoomIn button
	$(settings.zoomIn).unbind('click').click(function() {

		var settings	= $cont.data('tilezoom.settings'),
			level		= settings.level+1;

		$cont.tilezoom('zoom', level, {});
		return false;
	});
	
	//init zoomOut button
	$(settings.zoomOut).unbind('click').click(function() {

		var settings	= $cont.data('tilezoom.settings'),
			level		= settings.level-1;

		$cont.tilezoom('zoom', level, {});
		return false;
	});
	
	//init goHome button
	$(settings.goHome).unbind('click').click(function() {

		var settings	= $cont.data('tilezoom.settings'),
			$hotspots	= settings.hotspots,
			level		= settings.startLevel;

		$hotspots.children().removeClass('active');

		if ( settings.level != level ) {

			$cont.tilezoom('zoom', level, {});
		}

		return false;
	});
	
	//init toggleFull button
	$(settings.toggleFull).unbind('click').click(function() {

		var	$btn			= $(this),
			isFullScreen	= false,
			onFullScreen	= function (e) {

			if  (e.keyCode == 27 ) { // esc

				$(settings.toggleFull).click(); 
			}
		};

		var positionStyle = 'fixed';
		if (settings.userAgent.indexOf("android") > -1) {

			positionStyle = 'absolute';
		}

		if ( $btn.hasClass('toggle-full-close') ){

			$cont.css('position', 'relative');

			$document.unbind("keyup", onFullScreen);
		}
		else {

			$cont.css('position', positionStyle);

			$document.keyup(onFullScreen);

			isFullScreen = true;
		}

		$cont.toggleClass('zoom-full');
		$btn.toggleClass('toggle-full-close');

		setSizePosition($cont, {}, 0);

		if ( settings.afterToggleFullScreen ) {

			settings.afterToggleFullScreen( isFullScreen );
		}

		return false;
	});
}

/*
*	Main size and position handler
*/
function setSizePosition ($cont, coords, speed, callback) {

	var settings = $cont.data('tilezoom.settings');
	settings.inAction = true;

	$cont.data('tilezoom.settings', settings);

	var $holder		= settings.holder,
		$thumb		= settings.thumb,
		$tiles		= settings.tiles,
		$hotspots	= settings.hotspots;

//	size
	var levelImage = getImage(settings.level, settings);

//	position
	var ratio	= parseFloat(levelImage.width / $holder.width()),
		pos		= {},
		left	= parseInt( $holder.css('left') ),
		top		= parseInt( $holder.css('top') );

//	move center to coord ( hotspot click )
	if ( coords.left ) {

		var left = levelImage.width / $holder.width() * parseFloat(coords.left);
		pos.left = parseInt($cont.width() / 2) - left;
	}
	//relative center to the event coords ( mousewheel zoom )
	else if ( coords.x ) {

		var positionLeft	= coords.x - $holder.offset().left,
			relativeLeft	= coords.x - $cont.offset().left,
			percentLeft		= positionLeft / $holder.width();

		pos.left = parseInt(relativeLeft - levelImage.width * percentLeft);
	}
	//move center to current center ( + - zoom )
	else {

		var centerX	= parseInt($cont.width() / 2) - left;
		pos.left	= -parseInt(($cont.width() / -2 ) + centerX * ratio);
	}
	
	//move center to coord ( hotspot click )
	if ( coords.top ) {

		var top = levelImage.height / $holder.height() * parseFloat(coords.top);
		pos.top = parseInt($cont.height() / 2) - top;
	}
	//relative center to the event coords ( mousewheel zoom )
	else if ( coords.y ) {

		var positionTop	= coords.y - $holder.offset().top,
			relativeTop	= coords.y - $cont.offset().top,
			percentTop	= positionTop / $holder.height();

		pos.top = parseInt(relativeTop-levelImage.height * percentTop);
	}
	//move center to current center ( + - zoom )
	else {

		var centerY = parseInt($cont.height() / 2) - top;
		pos.top = -parseInt(($cont.height() / -2 ) + centerY * ratio);
	}
	
	checkBoundaries($cont, pos);

	var styles = {

		width:	levelImage.width,
		height:	levelImage.height
	};

	//apply styles
	$tiles.hide().css(styles);

//	add coords if values aren't set
	if ( !coords.x && !coords.left ) {

		coords.x = ( pos.left * -1 );
		coords.y = ( pos.top * -1 );
	}

	console.log('GO GO GO');
	console.log( pos.left +' x '+ pos.top );

	$holder.stop(true, true).animate({

		width:	levelImage.width,
		height:	levelImage.height,
		left:	pos.left,
		top:	pos.top

	}, speed, 'swing');
	
	$hotspots.stop(true, true).animate(styles, speed, 'swing');

	$thumb.stop(true, true).animate(styles, speed, 'swing', function () {

		$tiles.fadeIn(speed);
		if (typeof callback == "function") {

			callback();
		}

		settings.inAction = false;
		$cont.data('tilezoom.settings', settings);
	});
};

/*
*	Limit holder position by container boundaries
*/
function checkBoundaries ($cont, pos) {

	var settings	= $cont.data('tilezoom.settings'),
		offset		= settings.offset;

	var level		= settings.level,
		levelImage	= getImage(level, settings);

	var contWidth	= $cont.width(),
		contHeight	= $cont.height();

	var boundaryOffset = {

		x: offset,
		y: offset
	};

	//if offset set in persantage
	if ( settings.offset.indexOf('%') !== -1 ) {

		boundaryOffset.x = contWidth * parseInt(offset) / 100;
		boundaryOffset.y = contHeight * parseInt(offset) / 100;
	}

	//log("boundaryOffset ["+boundaryOffset.x+", "+boundaryOffset.y+"]");
	//boundaries
	var minLeft	= contWidth-levelImage.width-boundaryOffset.x,
		minTop	= contHeight-levelImage.height-boundaryOffset.y;

	if (pos.left < minLeft) {

		pos.left = minLeft;
	}
	if (pos.top < minTop) {

		pos.top = minTop;
	}

	if (pos.left >= boundaryOffset.x) {

		pos.left = boundaryOffset.x;
	}
	if (pos.top >= boundaryOffset.y) {

		pos.top = boundaryOffset.y;
	}

	if (levelImage.width <= contWidth) {

		//move to center of container
		pos.left = parseInt((contWidth - levelImage.width) / 2);
	}

	if (levelImage.height <= contHeight) {

//		move to center of container
		pos.top = parseInt((contHeight - levelImage.height) / 2);
	}

	//log("pos [top:"+pos.top+", left:"+pos.left+"]");

	return pos;
}

})(jQuery);
