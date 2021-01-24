/*
This is an example of using @opentelemetry/node, instead of sdk-node.
envDetector still runs async, so we have the same complications as sdk-node.
sdk-node is fewer lines of code and is clearer, therefore I prefer it.
*/

startServer = require('./server');

if(process.env.DISABLE_TRACING) {
  console.log("Tracing disabled.")
  startServer();
}
else {
  console.log("Tracing enabled.")
  initTracer(startServer);
}

async function initTracer(callback) {
  const { NodeTracerProvider } = require('@opentelemetry/node');
  const { BatchSpanProcessor } = require('@opentelemetry/tracing');
  const { envDetector } = require('@opentelemetry/resources');
  const { B3Propagator } = require("@opentelemetry/propagator-b3");
  const { CollectorTraceExporter } = 
    require('@opentelemetry/exporter-collector-grpc');  
  const { GrpcInstrumentation } = 
    require('@opentelemetry/instrumentation-grpc');

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "localhost:4317";
  const exporter = new CollectorTraceExporter({ url: endpoint });

  await envDetector
    .detect()
    .then((value) => {
      const provider = new NodeTracerProvider({
        logger: console,
        logLevel: "DEBUG",
        resource: value,
        plugins: {
          grpc: { enabled: false, path: '@opentelemetry/plugin-grpc' }
        },
      });
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
      provider.register({
        propagator: new B3Propagator()
      });
      const grpcInstrumentation = new GrpcInstrumentation();
      grpcInstrumentation.enable();    
      callback();
    })
}
