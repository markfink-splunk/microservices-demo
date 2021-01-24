module github.com/GoogleCloudPlatform/microservices-demo/src/shippingservice

go 1.15

require (
	cloud.google.com/go v0.75.0
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/protobuf v1.4.3
	github.com/google/pprof v0.0.0-20210122040257-d980be63207e // indirect
	github.com/hashicorp/golang-lru v0.5.4 // indirect
	github.com/konsorten/go-windows-terminal-sequences v1.0.3 // indirect
	github.com/sirupsen/logrus v1.7.0
	github.com/stretchr/objx v0.1.1 // indirect
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc v0.16.0
	go.opentelemetry.io/contrib/propagators v0.16.0
	go.opentelemetry.io/otel v0.16.0
	go.opentelemetry.io/otel/exporters/otlp v0.16.0
	go.opentelemetry.io/otel/sdk v0.16.0
	golang.org/x/net v0.0.0-20210119194325-5f4716e94777
	golang.org/x/oauth2 v0.0.0-20210113205817-d3ed898aa8a3 // indirect
	golang.org/x/sys v0.0.0-20210123111255-9b0068b26619 // indirect
	golang.org/x/text v0.3.5 // indirect
	google.golang.org/genproto v0.0.0-20210122163508-8081c04a3579 // indirect
	google.golang.org/grpc v1.35.0
)

replace git.apache.org/thrift.git v0.12.1-0.20190708170704-286eee16b147 => github.com/apache/thrift v0.12.1-0.20190708170704-286eee16b147
