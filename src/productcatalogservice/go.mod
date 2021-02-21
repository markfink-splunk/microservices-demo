module github.com/GoogleCloudPlatform/microservices-demo/src/productcatalogservice

go 1.15

require (
	cloud.google.com/go v0.74.0
	github.com/golang/protobuf v1.4.3
	github.com/google/go-cmp v0.5.4
	github.com/konsorten/go-windows-terminal-sequences v1.0.2 // indirect
	github.com/sirupsen/logrus v1.4.2
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc v0.17.0
	go.opentelemetry.io/contrib/propagators v0.17.0
	go.opentelemetry.io/otel v0.17.0
	go.opentelemetry.io/otel/exporters/otlp v0.17.0
	go.opentelemetry.io/otel/exporters/trace/jaeger v0.17.0
	go.opentelemetry.io/otel/sdk v0.17.0
	golang.org/x/net v0.0.0-20201209123823-ac852fbbde11
	google.golang.org/grpc v1.35.0
)
