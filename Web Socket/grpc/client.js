const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "proto", "ping.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const pingProto = grpc.loadPackageDefinition(packageDefinition).ping;

const client = new pingProto.PingService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

function ping() {
  const start = Date.now();
  client.Ping({ message: "ping" }, (err, response) => {
    if (err) {
      console.error("Error:", err);
      return;
    }
    const duration = Date.now() - start;
    console.log(`[gRPC] Ping response: ${response.message}, duration: ${duration} ms`);
  });
}

// Panggil ping setiap 5 detik
setInterval(ping, 5000);
ping();
