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
against adoption (imho).

We could use @opentelemetry/node that runs synchronously as long as we don't
read environment variables for anything (or we read the env variables with our
own code).  But to be consistent with the Otel implementation in all other
languages, it really should read env variables for the config; this should not
be something we have to do ourselves.  For better or worse, below is what we
must do to achieve that.
*/

// In this case, I just wrapped the entire server.js script as an export.
startServer = require('./server');

if (process.env.DISABLE_TRACING) {
  console.log("Tracing disabled.")
  startServer();
}
else {
  console.log("Tracing enabled.")
  initTracer(startServer);
}

async function initTracer(callback) {
  const otel = require("@opentelemetry/sdk-node");
  const api = require("@opentelemetry/api");
  const { CompositePropagator, HttpBaggage } = require('@opentelemetry/core');
  const { B3SinglePropagator, B3MultiPropagator } = 
    require("@opentelemetry/propagator-b3");
  const { CollectorTraceExporter } =
    require('@opentelemetry/exporter-collector-grpc');

  // instrumentation-grpc appears to be replacing plugin-grpc-js which replaced
  // plugin-grpc, all of which still exists in the repo and is confusing to
  // anyone looking at it for the first time!
  const { GrpcInstrumentation } =
    require('@opentelemetry/instrumentation-grpc');

  // Exporter init does not look at the ENDPOINT env variable, so we must do
  // it.  Also JS differs from other languages right now in that it defaults to
  // an insecure connection (no TLS).
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "localhost:4317";
  const exporter = new CollectorTraceExporter({ url: endpoint });

  // This defaults to AlwaysOn sampling.  
  const sdk = new otel.NodeSDK({
    traceExporter: exporter,
    // we have to explicitly disable plugin-grpc or we get an error.
    plugins: {
      grpc: { enabled: false, path: '@opentelemetry/plugin-grpc' }
    },
    // This is for future reference. Right now, this outputs nothing additional.
    //logger: console,
    //logLevel: "DEBUG"
  });

  // Propagation defaults to W3C+baggage.  It does not look at
  // OTEL_PROPAGATORS, so we do that here for b3.
  const propagators = process.env.OTEL_PROPAGATORS;
  if (propagators == "b3" || propagators == "b3multi") {
    var b3 = new B3MultiPropagator();
    if (propagators == "b3") { 
      b3 = new B3SinglePropagator();
    }
    api.propagation.setGlobalPropagator(new CompositePropagator({ 
      propagators: [b3, new HttpBaggage()]
    }));
  }

  // sdk.start() auto-adds attributes from OTEL_RESOURCE_ATTRIBUTES.
  await sdk
    .start()
    .then(() => {
      // Activating GrpcInstrumentation up above does not work (no traces).  It
      // works here; not sure why.  It seems to be ok with using
      // exporter-collector-grpc up above even though that activates grpc. 
      // plugin-grpc has a problem with that, btw.
      const grpcInstrumentation = new GrpcInstrumentation();
      grpcInstrumentation.enable();
      callback() });
}
