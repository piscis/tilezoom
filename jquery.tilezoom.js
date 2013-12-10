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

function debug(s) {

	$.fn.tilezoom.debug && log(s);
}		
function log() {

	window.console && console.log && console.log('[tilezoom] ' + Array.prototype.join.call(arguments,' '));
}

var methods = {

	init: function ( options ) {

		var defaults = {

			width:			null, // original image width in pixels. *(required) if no xml file
			height:			null, // original image height in pixels *(required) if no xml file
			path:			null, // tiles directory. *(required) if no xml file
			xml:			null, // xml file with settings generated with Deep Zoom Tools
			tileSize:		254, // tile size in pixels
			overlap:		1, // tiles overlap
			thumb:			'thumb.jpg', // thumbnail filename
			format:			'jpg', // image format
			speed:			500, //animation speed (ms)
			mousewheel:		false, // requires mousewheel event plugin: http://plugins.jquery.com/project/mousewheel
			gestures:		false, // requires touchit event plugin, https://github.com/danielglyde/TouchIt
			zoomToCursor:	true, // stay the same relative distance from the edge when zooming
			offset:			'20%', //boundaries offset (px or %). If 0 image move side to side and up to down
			dragBoundaries:	true, // If we should constrain the drag to the boundaries
			beforeZoom:		function ($cont, oldLevel, newLevel) {}, // callback before a zoom happens
            afterZoom:		function ($cont, coords, level) { }, // callback after zoom has completed
			callBefore:		function ($cont) {}, // this callback happens before dragging starts
            callAfter:		function ($cont, coords, level) { }, // this callback happens at end of drag after released "mouseup"
			navigation:		true, // navigation container ([true], [false], [DOM selector])
			zoomIn:			null, // zoomIn button
			zoomOut:		null, // zoomOut button
			goHome:			null, // goHome button, reset to default state
			toggleFull:		null, // toggleFull button
			minLevel:		9
		}

		// iterate the matched nodeset
		return this.each(function(index){

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
	center: function() {

		return this.each(function () {

			var $cont		= $(this);
			var settings	= $cont.data('tilezoom.settings');
			var $holder		= settings.holder;
			var $hotspots	= settings.hotspots;
			var level		= 12;

			var left = "50%",
				top  = "50%";

			if ( left.indexOf('%') !== -1 ) {

				left = parseInt(parseFloat(left) * $holder.width() / 100);
			}
			if ( top.indexOf('%') !== -1 ) {

				top = parseInt(parseFloat(top) * $holder.height() / 100);
			}

			var coords = {

				left:	left,
				top:	top
			};

			console.log( coords );
			$cont.tilezoom('zoom', level, coords);
		});
	},
	zoom: function ( level, coords ) {

		return this.each(function () {

			var $cont		= $(this),
				settings	= $cont.data('tilezoom.settings'),
				$holder		= settings.holder;

			if ( settings.inAction ) {

				return false;
			}

			if (settings.minLevel <= level && level < settings.numLevels) {

				//beforeZoom callback
				if ( typeof settings.beforeZoom == "function" ) {

					var res = settings.beforeZoom($cont, settings.level, level);
					if( res === false ){

						return;
					}
	            }

				settings.level = level;
				$cont.data('tilezoom.settings', settings);

				initTiles($cont);

				setSizePosition($cont, coords, settings.speed, function() {

					checkTiles($cont);

					//afterZoom callback
					if ( typeof settings.afterZoom == "function" ) {

						var retCoords = {

							x:	( parseInt($holder.css('left')) * -1),
							y:	( parseInt($holder.css('top')) * -1)
						};

						console.log( retCoords );

						settings.afterZoom( $cont, retCoords, level );
					}
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

	var settings = $.extend({}, defaults, options);

	if ( settings.width == null ) {

		$.error( 'width is not specified' );
	}
	if ( settings.height == null ) {

		$.error( 'height is not specified' );
	}
	if ( settings.path == null ) {

		$.error( 'path to tiles directory is not specified' );
	}

	settings.userAgent = navigator.userAgent.toLowerCase();
	//save zoom element index
	settings.id = index;
	//set in action flag
	settings.inAction = false;
	//container
	settings.cont = $cont;	

	buildMarkup($cont, settings);
	buildOptions($cont, settings);

	initTiles($cont);
	initHotspots($cont);
	initNavigation($cont);

	setSizePosition($cont, coords={}, 0, function() {

		checkTiles($cont);
		var isTouchSupported = (typeof(window.ontouchstart) != 'undefined');
		if ( isTouchSupported ) {

			initGestures($cont);
		}
		else {

			initDraggable($cont);
			initMousewheel($cont);
		}	
	});
}

//parse XML
function initOptionsFromXml(xml, options, callback) {

	$.ajax({

		type:		"GET",
		url:		xml,
		dataType:	"xml",

		success: function(data) {

			var $image = $(data).find('Image');

			options.tileSize	= $image.attr('TileSize');
			options.overlap		= $image.attr('Overlap');
			options.format		= $image.attr('Format');

			var $size		= $image.find('Size');
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
function buildMarkup($cont, settings) {
	
	$cont.addClass('zoom-container');

	if ( !$cont.children('div.zoom-holder').get(0) ) {

		$cont.append('<div class="zoom-holder">');
	}

	//holder
	var $holder = settings.holder = $cont.children('div.zoom-holder');

	//thumb
	var thumbPath = settings.path+'/'+settings.thumb;
	if ( !$holder.children('img.zoom-thumb').get(0) ) {

		$holder.prepend('<img src="'+thumbPath+'" class="zoom-thumb" />');
	}
	var $thumb = settings.thumb = $holder.children('img.zoom-thumb');

	//tiles container
	if (!$holder.children('div.zoom-tiles').get(0)) {

		$thumb.after('<div class="zoom-tiles">');
	}
	var $tiles = settings.tiles = $holder.children('div.zoom-tiles');

	//hotspots container
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

function initLevel(settings) {

	var level		= 9,
		$cont		= settings.cont,
		contWidth	= $cont.width(),
		contHeight	= $cont.height();

	while (9 <= level && level < settings.numLevels) {

		var levelImage = getImage(level, settings);
		if (levelImage.width>=contWidth || levelImage.height>=contHeight) {

			break;
		}
		level++;
	}
	return level-1;
};

function initTiles ($cont, level) {

	var settings = $cont.data('tilezoom.settings');
	if (level == undefined) {

		level = settings.level;
	}

	var levelDir	= settings.path +'/'+ parseInt(level),
		tiles		= getTiles(level, settings),
		$tiles		= settings.tiles;

	$tiles.html('');

	$.each(tiles, function(index, tile) {

		var src		= levelDir +'/'+ parseInt(tile[0]) +'_'+ parseInt(tile[1]) +'.'+ settings.format,
			offsetX	= tile[0] == 0 ? 0 : settings.overlap,
			offsetY	= tile[1] == 0 ? 0 : settings.overlap;

		$('<img>', {

			id:		'zoom-' +settings.id+ '-tile-' +tile[0]+ '-' +tile[1],
			_src:	src
		})
		.css({

			position:	'absolute',
			zIndex:		0,
			left:		(tile[0] * settings.tileSize - offsetX) + 'px',
			top:		(tile[1] * settings.tileSize - offsetY) + 'px'
		})
		.appendTo( $tiles );
	});
}

function getImage (level, settings) {

	return getDimension(level, settings);
};

function getDimension (level, settings) {

	if ( 0 <= level && level < settings.numLevels ) {

		var scale = getScale(level, settings);
		var dimension = {

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

	var cells = getNumTiles(level, settings);
	var yield = [];

	for ( row=0; row <= (cells.rows-1); row++) {

		for ( column=0; column <= (cells.columns-1); column++) {

			yield.push(new Array(column,row));
		}
	}
	return yield;
}

function getNumTiles(level, settings) {

	if (0 <= level && level < settings.numLevels) {

		var dimension = getDimension(level, settings);
		var cells = {

			columns:	parseInt(Math.ceil(parseFloat(dimension.width) / settings.tileSize)),
		  	rows:		parseInt(Math.ceil(parseFloat(dimension.height) / settings.tileSize))
		};

		return cells;
	}
	else {

		throw "Invalid pyramid level (numTiles)";
	}
}

function checkTiles($cont) {

	var settings = $cont.data('tilezoom.settings');
	var visibleTiles = getVisibleTiles($cont);

	$.each(visibleTiles, function(index, visibleTile) {

		var id = 'zoom-'+settings.id+'-tile-'+visibleTile[0]+'-'+visibleTile[1];
		var $img = $('#'+id);

		if ( $img.get(0) ) {

			var src = $img.attr('src');
			if(!src) {
				var _src = $img.attr('_src');
				$img.attr('src', _src);
			}
		}
	});
}

function getVisibleTiles($cont) {

	var settings	= $cont.data('tilezoom.settings'),
		$holder		= settings.holder,
		tileSize	= settings.tileSize;

	var mapX	= parseInt($holder.css('left')),
		mapY	= parseInt($holder.css('top'));

	var viewportWidth = $cont.width(),
		viewportHeight = $cont.height();

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

function initDraggable($cont) {
	
	var settings = $cont.data('tilezoom.settings');
	var $holder = settings.holder;
	var $hotspots = settings.hotspots;
	
	var dragging = false;

	var startLeft	= 0,
		startTop	= 0;
	
	$holder.unbind('mousedown').unbind('mousemove');
	
	$holder.dblclick(function(e) {

		var coords = {

			x:	e.pageX,
			y:	e.pageY		
		};

		// If we're at the high level of resolution, go back to the start level
		var level = (settings.level < settings.numLevels - 1) ? settings.level+1 : settings.startLevel;

		log("Double click! " + level);
		$cont.tilezoom('zoom', level, coords);
	});

	$holder.mousedown(function (e) {

		if ( settings.inAction ) {

			return false;
		}

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

		$document.unbind("mousemove").mousemove(function(e) {

			if ( dragging ) {

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
			}
		});
		
		$document.one('mouseup', function () {

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

/*
* Init Mousewheel zoom
*/
function initMousewheel ($cont) {

	var settings = $cont.data('tilezoom.settings');
	var $holder = settings.holder;
	
	if(settings.mousewheel && typeof $.fn.mousewheel != "undefined") {

		$cont.unbind('mousewheel').mousewheel(function(e, delta) {

			var coords = {};
			if (settings.zoomToCursor ) {

				coords.x = e.pageX;
				coords.y = e.pageY;
			}

			var level = Math.round(settings.level + delta);
			$cont.tilezoom('zoom', level, coords);

			return false;//don't scroll the window
		});
	}
}

/*
* Init Hotspots clicks
*/
function initHotspots($cont) {

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
	
		if (left.indexOf('%')!==-1) {

			left = parseInt(parseFloat(left)*$holder.width()/100);
		}
		if (top.indexOf('%')!==-1) {

			top = parseInt(parseFloat(top)*$holder.height()/100);
		}

		var coords = {

			left:	left,
			top:	top
		};

		$cont.tilezoom('zoom', level, coords);	
	});
}

function initGestures ($cont) {
	
	var settings = $cont.data('tilezoom.settings');
	var $holder = settings.holder;
	var $nav = settings.nav;
	
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
function initNavigation($cont) {

	var settings = $cont.data('tilezoom.settings');
	
	if(settings.navigation==true) {
		if(!$cont.children('div.zoom-navigation').get(0)) {
			$cont.append('<div class="zoom-navigation"></div>');
		}
		//navigation
		var $nav = settings.nav = $cont.children('div.zoom-navigation');
	}
	else if(settings.navigation != false && settings.navigation != null) {
		var $nav = settings.nav = $(settings.navigation);
	}
	
	if($nav && $nav.get(0)) {
		//zoomIn button
		if(!$nav.children('a.zoom-in').get(0)) {
			$nav.append('<a class="zoom-in" href="#" title="Zoom in">Zoom In</a>');
		}
		settings.zoomIn = $nav.children('a.zoom-in');
		
		//zoomOut button
		if(!$nav.children('a.zoom-out').get(0)) {
			$nav.append('<a class="zoom-out" href="#" title="Zoom Out">Zoom Out</a>');
		}
		settings.zoomOut = $nav.children('a.zoom-out');
		
		//goHome button
		if(!$nav.children('a.go-home').get(0)) {
			$nav.append('<a class="go-home" href="#" title="Go Home">Go Home</a>');
		}
		settings.goHome = $nav.children('a.go-home');
		
		//toggleFull button
		if(!$nav.children('a.toggle-full').get(0)) {
			$nav.append('<a class="toggle-full" href="#" title="Toggle Full Page">Toggle Full Page</a>');
		}
		settings.toggleFull = $nav.children('a.toggle-full');
	}
	
	//init zoomIn button
	$(settings.zoomIn).unbind('click');
	$(settings.zoomIn).click(function() {
		var settings = $cont.data('tilezoom.settings');
		var level = settings.level+1;
		$cont.tilezoom('zoom', level, {});
		return false;
	});
	
	//init zoomOut button
	$(settings.zoomOut).unbind('click');
	$(settings.zoomOut).click(function() {
		var settings = $cont.data('tilezoom.settings');
		var level = settings.level-1;
		$cont.tilezoom('zoom', level, {});
		return false;
	});
	
	//init goHome button
	$(settings.goHome).unbind('click');
	$(settings.goHome).click(function() {

		var settings = $cont.data('tilezoom.settings');
		var $hotspots = settings.hotspots;
		$hotspots.children().removeClass('active');

		var level = settings.startLevel;
		$cont.tilezoom('zoom', level, {});

		return false;
	});
	
	//init toggleFull button
	$(settings.toggleFull).unbind('click');
	$(settings.toggleFull).click(function() {
		var onFullScreen = function(e){
			if (e.keyCode == 27) { // esc
				$(settings.toggleFull).click(); 
			}
		}
		if(settings.userAgent.indexOf("android") > -1) {
			var positionStyle = 'absolute';
		}
		else {
			var positionStyle = 'fixed';
		}
		if ($(this).hasClass('toggle-full-close')){
			$cont.css('position', 'relative');
			$(this).removeClass('toggle-full-close');
			$(document).unbind("keyup", onFullScreen);
		} else {
			$cont.css('position', positionStyle);
			$(this).addClass('toggle-full-close');
			$(document).keyup(onFullScreen);
		}
		$cont.toggleClass('zoom-full');
		coords = {};
		setSizePosition($cont, coords, 0);
		return false;
	});
}

/*
*	Main size and position handler
*/
function setSizePosition ($cont, coords ,speed, callback) {

	var settings = $cont.data('tilezoom.settings');
	settings.inAction = true;

	$cont.data('tilezoom.settings', settings);
	
	var $holder		= settings.holder;
	var $thumb		= settings.thumb;
	var $tiles		= settings.tiles;
	var $hotspots	= settings.hotspots;
	
	//size
	var levelImage = getImage(settings.level, settings);
	
	//position
	var ratio	= parseFloat(levelImage.width / $holder.width());

	var	pos		= {},
		left	= parseInt( $holder.css('left') ),
		top		= parseInt( $holder.css('top') );

	//move center to coord ( hotspot click )
	if ( coords.left ) {

		var left = levelImage.width / $holder.width() * parseFloat(coords.left);
		pos.left = parseInt($cont.width() / 2) - left;
	}
	//relative center to the event coords ( mousewheel zoom )
	else if (coords.x ) {

		var positionLeft	= coords.x - $holder.offset().left;
		var relativeLeft	= coords.x - $cont.offset().left;
		var percentLeft		= positionLeft / $holder.width();

		pos.left = parseInt(relativeLeft-levelImage.width * percentLeft);
	}
	//move center to current center ( + - zoom )
	else {

		var centerX	= parseInt($cont.width() / 2) - left;
		pos.left	= -parseInt(($cont.width() / -2 ) + centerX * ratio);
	}
	
	//move center to coord ( hotspot click )
	if (coords.top) {

		var top = levelImage.height / $holder.height() * parseFloat(coords.top);
		pos.top = parseInt($cont.height() / 2) - top;
	}
	//relative center to the event coords ( mousewheel zoom )
	else if (coords.y) {

		var positionTop = coords.y - $holder.offset().top;
		var relativeTop = coords.y - $cont.offset().top;
		var percentTop = positionTop / $holder.height();
		pos.top = parseInt(relativeTop-levelImage.height * percentTop);
	}
	//move center to current center ( + - zoom )
	else {

		var centerY = parseInt($cont.height()/2) - top;
		pos.top = -parseInt(($cont.height() / -2 ) + centerY * ratio);
	}
	
	checkBoundaries($cont, pos);

	var styles = {

		width:	levelImage.width,
		height:	levelImage.height
	}

	//apply styles
	$tiles.hide().css(styles);

//	add coords if values aren't set
	if ( !coords.x && !coords.left ) {

		coords.x = ( pos.left * -1 );
		coords.y = ( pos.top * -1 );
	}

	$holder.stop(true, true).animate({

		width:	levelImage.width,
		height:	levelImage.height,
		left:	pos.left,
		top:	pos.top
	}, speed, 'swing');
	
	$hotspots.stop(true, true).animate(styles, speed, "swing");

	$thumb.stop(true, true).animate(styles, speed, "swing", function () {

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
	var minLeft	= contWidth-levelImage.width-boundaryOffset.x;
	var minTop	= contHeight-levelImage.height-boundaryOffset.y;

	if (pos.left<minLeft) pos.left = minLeft;
	if (pos.top<minTop) pos.top = minTop;

	if (pos.left>=boundaryOffset.x) pos.left = boundaryOffset.x;
	if (pos.top>=boundaryOffset.y) pos.top = boundaryOffset.y;

	if (levelImage.width<=contWidth) {
		//move to center of container
		pos.left = parseInt((contWidth-levelImage.width)/2);
	}

	if (levelImage.height<=contHeight) {
		//move to center of container
		pos.top = parseInt((contHeight-levelImage.height)/2);
	}

	//log("pos [top:"+pos.top+", left:"+pos.left+"]");

	return pos;
}

})(jQuery);
