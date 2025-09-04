const mqtt = require("mqtt");

const clientId = "server_" + Math.random().toString(16).substr(2, 8);

const client = mqtt.connect(
  "mqtts://p0272d61.ala.dedicated.aws.emqxcloud.com:8883",
  {
    protocolVersion: 5,
    clientId: clientId,
    username: "valin",
    password: "valin123",
    clean: false,
    connectTimeout: 4000,
    will: {
      topic: "status/server",
      payload: "Server " + clientId + " offline tiba-tiba!",
      qos: 1,
      retain: false,
      properties: {
        messageExpiryInterval: 60,
      },
    },
  }
);

const requestTopic = "mqtt/request/topic";

client.on("connect", () => {
  console.log("✅ Server connected to broker.");

  // Subscribe ke request topic dan status/client untuk Last Will client
  client.subscribe([requestTopic, "status/client"], { qos: 1 }, (err) => {
    if (err) {
      console.error("❌ Failed to subscribe:", err);
    } else {
      console.log("📡 Server subscribed to request topic and status/client.");
    }
  });

  // Contoh retained message publish (boleh dikomment kalau mau)
  client.publish("notifikasi/umum", "📢 Ini pesan retained!", {
    qos: 1,
    retain: true,
  });
});

client.on("message", (topic, payload, packet) => {
  if (topic === requestTopic) {
    const message = payload.toString();
    const expiry = packet.properties?.messageExpiryInterval;
    console.log("📨 Pesan diterima dari client:", message);
    if (expiry !== undefined) {
      console.log(`⏳ Message expiry interval: ${expiry} detik`);
    } else {
      console.log("⏳ Message expiry interval: tidak ada");
    }

    const responseTopic = packet.properties?.responseTopic;
    const correlationData = packet.properties?.correlationData;

    if (responseTopic) {
      const responseMessage = `Halo client! Saya menerima pesan: "${message}"`;

      // Kirim balasan
      client.publish(responseTopic, responseMessage, {
        qos: 1,
        properties: {
          correlationData,
        },
      });

      console.log(`📤 Balasan dikirim ke ${responseTopic}`);
    } else {
      console.warn("⚠️ Tidak ada responseTopic dalam properti pesan!");
    }
  } else if (topic === "status/client") {
    console.log(`🚨 Last Will message diterima: ${payload.toString()}`);
  }
});

client.on("error", (err) => {
  console.error("❌ MQTT Server Error:", err);
  client.end();
});
