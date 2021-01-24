/*
The following comments are based on opentelemetry-js v0.15.0.

sdk.start() in the initTracer function below runs asynchronously.  This is the
reason for everything you see here.

sdk.start() has to complete before we run server.js or we get an error that
server.js executed its require statements before the otel plugins were
initialized.  So running sdk.start() asynchronously seems undesirable, but
that's how it is.  It complicates things because we have to run this script
first, wait for the Promise to be fulfilled, then run server.js, none of
which is automatic -- and the manner in which you do this will vary by
program.  So there's a built-in degree of difficulty to this that only works
against adoption.

We could use @opentelemetry/node that runs synchronously as long as we don't
read environment variables for anything (or we read the env variables with our
own code).  But to be consistent with the Otel implementation in all other
languages, it really should read env variables for the config; this should not
be something we have to do ourselves.  For better or worse, below is what we
must do to achieve that.
*/

if(process.env.DISABLE_PROFILER) {
  console.log("Profiler disabled.")
}
else {
  console.log("Profiler enabled.")
  require('@google-cloud/profiler').start({
    serviceContext: {
      service: 'paymentservice',
      version: '1.0.0'
    }
  });
}

if(process.env.DISABLE_DEBUGGER) {
  console.log("Debugger disabled.")
}
else {
  console.log("Debugger enabled.")
  require('@google-cloud/debug-agent').start({
    serviceContext: {
      service: 'paymentservice',
      version: 'VERSION'
    }
  });
}

const path = require('path');
const PORT = process.env['PORT'];
const PROTO_PATH = path.join(__dirname, '/proto/');

if (process.env.DISABLE_TRACING) {
  console.log("Tracing disabled.")
  startServer();
}
else {
  console.log("Tracing enabled.")
  initTracer(startServer);
}

function startServer() {
  const HipsterShopServer = require('./server');
  const server = new HipsterShopServer(PROTO_PATH, PORT);
  server.listen();
}

async function initTracer(callback) {
  const otel = require("@opentelemetry/sdk-node");
  const { B3Propagator } = require("@opentelemetry/propagator-b3");
  const { CollectorTraceExporter } = 
    require('@opentelemetry/exporter-collector-grpc');

  // instrumentation-grpc appears to be replacing plugin-grpc-js which replaced
  // plugin-grpc, all of which still exists in the repo and is confusing to
  // anyone looking at it for the first time!
  const { GrpcInstrumentation } = 
    require('@opentelemetry/instrumentation-grpc');

  // Activate GrpcInstrumentation.  This resolves an issue with plugin-grpc
  // where using exporter-collector-grpc would cause grpc to init before
  // plugin-grpc and then cause grpc tracing to fail.
  const grpcInstrumentation = new GrpcInstrumentation();
  grpcInstrumentation.enable();

  // Exporter init does not look at the ENDPOINT env variable, so we must do it.
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "localhost:4317";
  const exporter = new CollectorTraceExporter({ url: endpoint });

  // This defaults to AlwaysOn sampling.
  const sdk = new otel.NodeSDK({
    traceExporter: exporter,
    textMapPropagator: new B3Propagator(),
    // we have to explicitly disable plugin-grpc or we get an error.
    plugins: {
      grpc: { enabled: false, path: '@opentelemetry/plugin-grpc' }
    },
    // This is for future reference. Right now, this outputs nothing additional.
    //logger: console,
    //logLevel: "DEBUG"
  });

  // sdk.start() auto-adds attributes from OTEL_RESOURCE_ATTRIBUTES.
  await sdk
    .start()
    .then(() => { callback() });  
}
