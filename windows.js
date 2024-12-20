import { Service } from 'node-windows'


// Create a new service object
var svc = new Service({
    name: 'Aggr',
    description: 'Aggr',
    script: 'C:\\Users\\Laptop\\Documents\\aggr_finchen\\dist-server\\index.mjs',
    nodeOptions: ['--harmony', '--max_old_space_size=1024'],
    env: {
        name: 'NODE_ENV',
        value: 'production',
    },
    wait: 2,
    grow: 0.5,
    //, workingDirectory: '...'
    //, allowServiceLogon: true
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function () {
    svc.start();
});

svc.on('alreadyinstalled', function () {
    console.log('This service is already installed.');
    svc.uninstall();
    console.log('uninstall. you can now install');
});

// Listen for the "start" event and let us know when the
// process has actually started working.
svc.on('start', function () {
    console.log(svc.name + ' started!');
});

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall', function () {
    console.log('Uninstall complete.');
    console.log('The service exists: ', svc.exists);
});

svc.install();
