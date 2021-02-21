/*
The following comments are based on opentelemetry-js v0.17.0.

I found two ways to initialize tracing with Otel JS: the way described in
Getting Started that uses @opentelemetry/node and another way in /packages
using @opentelemetry/sdk-node.

@opentelemetry/node would be easy except that it does not read environment
variables like OTEL_RESOURCE_ATTRIBUTES, which is a major drawback.  We can
import and use the envDetector function, but that runs asynchronous which then
complicates things because the instrumentation does not register in time unless
we wrap server.js and force it to wait for the async function.

@opentelemetry/sdk-node suffers the same difficulty (because it uses
envDetector) but it is easier to implement overall, so I prefer it.
*/

//require('dotenv').config()

// Import the wrapped server.js script.
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
  //const { LogLevel } = require("@opentelemetry/core");
  const otel = require("@opentelemetry/sdk-node");
  const api = require("@opentelemetry/api");
  const { CompositePropagator, HttpBaggage } = require('@opentelemetry/core');
  const { B3SinglePropagator, B3MultiPropagator } = 
    require("@opentelemetry/propagator-b3");
  const { ZipkinExporter } =
    require('@opentelemetry/exporter-zipkin');
  const { GrpcInstrumentation } =
    require('@opentelemetry/instrumentation-grpc');

  /* 
  Went with Zipkin over Jaeger because:
  - Jaeger as implemented does not honor JAEGER_SERVICE_NAME or JAEGER_TAGS.
  - The Jaeger service name still has to be set and it overrides the Otel
    service.name (which is a major pita when combined with above).
  - Jaeger sticks OTEL_RESOURCE_ATTRIBUTES into span attributes (vs resource).
  - Zipkin handles the Otel service.name correctly.
  - It sticks other OTEL_RESOURCE_ATTRIBUTES into span attributes, but we can
    live with that for now.
  */

  const endpoint = process.env.OTEL_EXPORTER_ZIPKIN_ENDPOINT ||
    "http://localhost:9411/api/v2/spans";
  const exporter = new ZipkinExporter({ url: endpoint });

  // This defaults to AlwaysOn sampling.  
  const sdk = new otel.NodeSDK({
    traceExporter: exporter,
    //logger: console,
    //logLevel: LogLevel.DEBUG
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
      const grpcInstrumentation = new GrpcInstrumentation();
      grpcInstrumentation.enable();
      callback() });
}
