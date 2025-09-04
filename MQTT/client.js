const mqtt = require("mqtt");
const readline = require("readline");
process.env.DEBUG = "mqttjs*";

// Setup input terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Setup MQTT connection
const client = mqtt.connect(
  "mqtts://p0272d61.ala.dedicated.aws.emqxcloud.com:8883",
  {
    protocolVersion: 5,
    clientId: "client_" + Math.random().toString(16).substr(2, 8),
    username: "valin",
    password: "valin123",
    clean: true,
    keepalive: 10, // ← PINGREQ dikirim setiap 10 detik kalau idle
    connectTimeout: 4000,
    will: {
      topic: "status/client",
      payload: "Client offline tiba-tiba!",
      qos: 1,
      retain: false,
      properties: {
        messageExpiryInterval: 60,
      },
    },
  }
);

const responseTopic = "mqtt/response/topic";
const requestTopic = "mqtt/request/topic";
const retainedTopic = "notifikasi/umum";
const correlationData = Buffer.from("my-correlation-id");

client.on("connect", () => {
  console.log("✅ Connected to broker.");

  // Subscribe ke topik response dan retained
  client.subscribe([responseTopic, retainedTopic], { qos: 1 }, (err) => {
    if (err) {
      console.error("❌ Failed to subscribe:", err);
    } else {
      console.log("📡 Subscribed to response topic and retained topic.");
      promptInput(); // Mulai prompt input user setelah subscribe berhasil
    }
  });
});

// Handler message masuk dari broker
client.on("message", (topic, payload) => {
  if (topic === responseTopic) {
    console.log("📥 Response diterima:", payload.toString());
  } else if (topic === retainedTopic) {
    console.log(`📥 Retained Message: ${payload.toString()}`);
  }
});

// Fungsi input dan publish pesan dengan Flow Control
function promptInput() {
  rl.question(
    "📝 Masukkan pesan (format: qos|expiry|pesan, contoh: 1|30|Halo): ",
    (input) => {
      let qos = 1; // default QoS
      let expiry = 0; // default tidak expired
      let message = input;

      // Parsing input format qos|expiry|pesan
      if (input.includes("|")) {
        const parts = input.split("|");
        qos = Number(parts[0]);
        expiry = Number(parts[1]);
        if (![0, 1, 2].includes(qos)) {
          console.log("⚠️ QoS harus 0, 1, atau 2. Pakai default QoS 1.");
          qos = 1;
        }
        if (isNaN(expiry) || expiry < 0) {
          console.log(
            "⚠️ Expiry harus angka >= 0. Pakai default 0 (tidak expired)."
          );
          expiry = 0;
        }
        message = parts.slice(2).join("|").trim();
      }

      const options = {
        qos,
        properties: {},
      };

      if (expiry > 0) {
        options.properties.messageExpiryInterval = expiry;
      }

      if (message.toLowerCase().startsWith("retain:")) {
        const pesanRetained = message.substring(7).trim();
        client.publish(
          retainedTopic,
          pesanRetained,
          { ...options, retain: true },
          (err) => {
            if (err) {
              console.error("❌ Gagal mengirim retained message:", err);
            } else {
              console.log(
                `📨 Pesan retained dengan QoS ${qos} dan expiry ${expiry} detik terkirim.`
              );
            }
            promptInput();
          }
        );
      } else {
        options.properties.responseTopic = responseTopic;
        options.properties.correlationData = correlationData;

        client.publish(requestTopic, message, options, (err) => {
          if (err) {
            console.error("❌ Gagal mengirim request:", err);
          } else {
            console.log(
              `📨 Request terkirim dengan QoS ${qos} dan expiry ${expiry} detik.`
            );
          }
          setTimeout(() => {
            promptInput();
          }, 10000); // jeda 10 detik
        });
      }
    }
  );
}

// Handle error connection
client.on("error", (err) => {
  console.error("❌ MQTT Client Error:", err);
  client.end();
});
