// utils/mqttClient.ts
import mqtt from 'mqtt';

const mqttUrl = 'ws://147.182.226.225:9001';
const clientId = `client-${Math.random().toString(16).slice(2)}`;

const options = {
  clientId,
  username: 'Kelompok_O_Kelas_B',
  password: 'Insys#BO#016',
  reconnectPeriod: 1000,
};

const mqttClient = mqtt.connect(mqttUrl, options);

mqttClient.on('connect', () => {
  console.log('✅ MQTT Connected:', clientId);
});

mqttClient.on('reconnect', () => {
  console.log('🔁 MQTT Reconnecting...');
});

mqttClient.on('close', () => {
  console.warn('⚠️ MQTT Connection Closed');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT Error:', err);
});

export const isConnected = () => mqttClient.connected;

export { mqttClient, clientId };
