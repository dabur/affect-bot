var TAG = 'app';
var main = require('./app/main');
main.run().then(()=> {
    console.info(TAG, 'started');
    process.on('exit', main.stop);
}).catch((reason)=> {
    console.error(TAG, 'failed', reason);
});