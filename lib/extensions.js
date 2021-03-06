var utils = require('./railway_utils'),
    fs = require('fs'),
    cs = require('coffee-script'),
    path = require('path');

module.exports = function () {
    this.extensions = {};
    var ctx = getNPMFileContext(this);
    var js = 'npmfile.js', coffee = 'npmfile.coffee',
        filename;

    if (utils.existsSync(path.join(root, js))) {
        filename = js;
    } else if (utils.existsSync(path.join(root, coffee))) {
        filename = coffee;
    }
    if (filename) {
        var code = fs.readFileSync(filename).toString();
        if (filename.match(/\.coffee/)) {
            code = cs.compile(code);
        }
        var fn = new Function('require', 'group', '__dirname', '__filename', code);
        fn.call(null, ctx.require, ctx.group, path.dirname(filename), filename);
    }

    initBundledExtensions(this);
}

/**
 * Initialize extensions (using npmfile)
 */

/**
 * Prepare context for executing npm file. Context has two additional features:
 * - group
 * - improved require (run init method of module)
 */
function getNPMFileContext(rw) {
    var ctx = {};

    ctx.require = function (package) {
        var ext = rw.extensions[package] = require(package);
        if (ext && ext.init) {
            ext.init(rw);
        }
    };

    ctx.group = function (env, callback) {
        if (env == rw.app.settings.env) {
            callback();
        }
    };

    return ctx;
};

function initBundledExtensions(rw) {
    envInfo(rw);
}

/**
 * Setup route /railway/environment.json to return information about environment
 */
function envInfo(rw) {
    var jugglingdbVersion, npmVersion;

    rw.app.all('/railway/environment.json', function (req, res) {

        try {
            var jugglingdbVersion = require('jugglingdb').version;
        } catch(e) {}

        try {
            var npmVersion = require('npm').version;
        } catch(e) {}

        try {
            var viewEngineVersion = require(rw.app.root + '/node_modules/' +  rw.app.set('view engine')).version;
        } catch(e) {
            viewEngineVersion = 'not installed';
        }

        if (rw.app.disabled('env info')) return res.send({forbidden: true});
        res.send({
            settings: rw.app.settings,
            versions: {
                core: process.versions,
                npm: npmVersion,
                railway: rw.version,
                jugglingdb: jugglingdbVersion,
                templating: {
                    name: rw.app.set('view engine'),
                    version: viewEngineVersion
                }
            },
            application: {
                root: rw.app.root,
                database: require(rw.app.root + '/config/database')[rw.app.set('env')].driver,
                middleware: rw.app.stack.map(function (m) {
                    return m.handle.name;
                })
            },
            env: process.env,
        });
    });
}
