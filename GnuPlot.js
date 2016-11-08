// Polyfill for Number.isNaN() in EMCAScript6. IE doesn't support it.
if (typeof(Number['isNaN']) === 'undefined') Number.isNaN = function(x) {
    return (/^\d+$/.test(Number(x)) === false);
}
 
GnuPlot = function(place, config, translations, callback) {
	// Default config.
	this.config = {
		debug: false,
		prefix: 'GNUPLOT' + ".",
		outputFile: 'out.svg',
		program: ''
	};
	
	// Default translations.
	this.translations = {};
	this.translations['%graphicsURL%'] = 'Graphics URL missing.';
	
	this.initialize(place, config, translations, callback);
};

GnuPlot.prototype.initialize = function(place, config, translations, callback) {
	var self = this;
	if (this.config.debug === true) console.log('GnuPlot.initialize()');
	this.place = place;
	this.place.addClass('gnuplot');
	this.place.addClass('processing');
	
	for (var item in config) this.config[item] = config[item];
	for (var item in translations) this.translations[item] = translations[item];
	
	this.gnuplot = new Gnuplot('lib/gnuplot.js');
	
	this.gnuplot.onOutput = function(text) {
        console.log(text);
    };
    
    this.gnuplot.onError = function(text) {
		self.place.removeClass('processing');
        console.error(text);
    };
    
    this.lastTAContent = '';
	this.draw(callback);
};

GnuPlot.prototype.scriptChange = function(callback) {
	if (this.config.debug === true) console.log('GnuPlot.scriptChange()');
	var self = this;
	
    if (this.lastTAContent == this.config.program) {
		this.place.removeClass('processing');
    	return;
	}
    if (this.gnuplot.isRunning) {
    	setTimeout(function() { self.scriptChange(callback); }, 500);
    } else {
    	this.lastTAContent = this.config.program;
        this.runScript(callback);
    }
}

GnuPlot.prototype.runScript = function(callback) {
	if (this.config.debug === true) console.log('GnuPlot.runScript()');
    var self = this;
	var start = Date.now();
	var prog =
		"set terminal svg enhanced size 1000,1000\n"+
		"set output '" + this.config.outputFile + "'\n" +
		this.config.program;
	
	var mimeType = null;
	var ext = this.config.outputFile.trim().match(/\.([^\.]+)$/)[1].toLowerCase();
	switch (ext) {
		case 'svg': mimeType = "image\/svg+xml"; break;
		case 'gif': mimeType = "image\/gif"; break;
		case 'png': mimeType = "image\/png"; break;
		case 'eps': mimeType = "application\/eps"; break;
		case 'ps': mimeType = "application\/postscript"; break;
		default: "text\/plain"; break;
	}
	
	if (["eps", "ps"].indexOf(ext) >= 0) {
		this.gnuplot.onError('Postscript formats are currently not supported due to security concerns.');
		return;
	}
	
	this.place.empty().addClass('processing');
	if (this.config.debug === true) console.log(prog, this.config.outputFile);
    this.gnuplot.run(
    	prog,
    	function(e) {
    		if (self.config.debug === true) self.gnuplot.onOutput('Execution took ' + (Date.now() - start) / 1000 + 's.');
	        self.gnuplot.getFile(
	        	self.config.outputFile,
	        	function(ev) {
	        		if (!ev.content) {
		                self.gnuplot.onError("Output file '" + self.config.outputFile + "' not found!");
		                if (typeof(callback) === 'function') callback();
		                return;
		            }
		            var img = new Image();//document.getElementById('gnuimg');
		            try {
		                var ab = new Uint8Array(ev.content);
		                var blob = new Blob([ab], {"type": mimeType});
		                window.URL = window.URL || window.webkitURL;
		                img.src = window.URL.createObjectURL(blob);
		            } catch (err) { // in case blob / URL missing, fallback to data-uri
		                if (!window.blobalert) {
		                	if (self.config.debug === true) this.gnuplot.onError('Warning - your browser does not support Blob-URLs, using data-uri with a lot more memory and time required. Err: ' + err);
		                    window.blobalert = true;
		                }
		                var rstr = '';
		                for (var i = 0; i < ev.content.length; i++)
		                    rstr += String.fromCharCode(ev.content[i]);
		                img.src = 'data:image\/svg+xml;base64,' + btoa(rstr);
		            }
	                self.place.empty().append(img);
	                self.place.removeClass('processing');
	                if (typeof(callback) === 'function') callback();
		        }
	        );
	    }
    );
};

GnuPlot.prototype.draw = function(callback) {
	if (this.config.debug === true) console.log('GnuPlot.draw()');
	var self = this;
	this.scriptChange(callback);
}
