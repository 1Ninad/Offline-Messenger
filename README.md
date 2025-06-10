# Offline Messenger

A communication system that lets users exchange messages via a browser-based chat interface, while using LoRa (Long Range radio) for actual data transmission. 

Built with React.js on the frontend and an ESP32-based Heltec LoRa board running Arduino firmware, this project enables messaging between devices in offline or no-infrastructure environments.

---

## How It Works

1. **Compose & Send Message**: The user types a message in the browser, which is handled by the `ChatInterface` component and sent to the connected LoRa device.
2. **Transmit via LoRa**: ESP32 Heltec board sends the message wirelessly using LoRa to another device.
3. **Receive + Display**: Incoming messages are received via LoRa and displayed in the same browser UI.

---

## Tech Stack

- **Frontend:** React
- **Microcontroller:** Heltec WiFi LoRa 32 (ESP32 + SX1276)
- **Firmware:** Arduino (C++)

---

## Use Case
- Communication in remote or disaster-hit areas with no internet
