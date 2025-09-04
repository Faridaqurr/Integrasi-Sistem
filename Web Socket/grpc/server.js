const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "proto", "ping.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
console.log(JSON.stringify(proto, null, 2));  

function ping(call, callback) {
  callback(null, { message: "pong" });
}

function main() {
  const server = new grpc.Server();
  server.addService(proto.ping.PingService.service, { Ping: ping });

  server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`gRPC server running at 0.0.0.0:${port}`);
    }
  );
}

main();
