const debug = require('./my-debug')(module);

module.exports = Object.assign({}, require('dockerode-optionator'), {
    shortenId: function(id) {
        if (typeof id === 'string' || /^[a-z0-9]{64}$/.test(id)) {
            return id.slice(0, 12);
        }
        debug('Error: passed id is not a string or invalid format');
        return id;
    }
});
