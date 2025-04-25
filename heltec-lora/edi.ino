#include "Arduino.h"
#include "LoRaWan_APP.h"
#include <Wire.h>
#include "HT_SSD1306Wire.h"

#define RF_FREQUENCY        433000000
#define TX_OUTPUT_POWER     10
#define LORA_BANDWIDTH      0
#define LORA_SPREADING_FACTOR 7
#define LORA_CODINGRATE     1
#define LORA_PREAMBLE_LENGTH 8
#define LORA_SYMBOL_TIMEOUT 0
#define LORA_FIX_LENGTH_PAYLOAD_ON false
#define LORA_IQ_INVERSION_ON false
#define RX_TIMEOUT_VALUE    1000
#define BUFFER_SIZE         300

char txpacket[BUFFER_SIZE];
char rxpacket[BUFFER_SIZE];

static RadioEvents_t RadioEvents;
void OnTxDone(void);
void OnTxTimeout(void);
void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr);

typedef enum {
  LOWPOWER,
  STATE_RX,
  STATE_TX
} States_t;

States_t state = STATE_RX;
bool receiveflag = false;
int16_t Rssi, rxSize;
String inputMsg = "";

// TELEMETRY VARIABLES
unsigned long lastPing = 0;
unsigned long totalLatency = 0;
unsigned int latencySamples = 0;
unsigned int sentCount = 0;
unsigned int recvCount = 0;

void OnTxDone(void) {
  Serial.println("[SYS] TX Done");
  state = STATE_RX;
}

void OnTxTimeout(void) {
  Serial.println("[SYS] TX Timeout");
  state = STATE_TX;
}

void OnRxDone(uint8_t *payload, uint16_t size, int16_t rssi, int8_t snr) {
  memcpy(rxpacket, payload, size);
  rxpacket[size] = '\0';
  Radio.Sleep();

  String msg = String(rxpacket);
  lastPing = millis();
  Rssi = rssi;
  recvCount++;

  int tsIndex = msg.indexOf("|TS:");
  if (tsIndex != -1) {
    unsigned long sentTime = msg.substring(tsIndex + 4).toInt();
    unsigned long latency = millis() - sentTime;
    totalLatency += latency;
    latencySamples++;
  }

  if (msg.startsWith("ID:") && msg.indexOf("|DATA:") != -1) {
    int idEnd = msg.indexOf("|");
    String msgId = msg.substring(3, idEnd);
    String ackMsg = "^ACK:" + msgId + "$";
    ackMsg.toCharArray(txpacket, BUFFER_SIZE);
    Radio.Send((uint8_t *)txpacket, strlen(txpacket));
    delay(300);
    Serial.print("[MSG]");
    Serial.println(msg);
  } else {
    Serial.print("[MSG]");
    Serial.println(msg);
  }

  float deliveryRate = sentCount == 0 ? 0.0 : (recvCount * 100.0 / sentCount);
  float avgLatency = latencySamples == 0 ? 0.0 : (totalLatency * 1.0 / latencySamples);

  String statsJson = "[STATS]{";
statsJson += "\"signalStrength\":" + String(Rssi) + ",";
statsJson += "\"frequency\":" + String(RF_FREQUENCY) + ",";
statsJson += "\"bandwidth\":125000,";
statsJson += "\"spreadingFactor\":" + String(LORA_SPREADING_FACTOR) + ",";
statsJson += "\"lastPing\":" + String(lastPing) + ",";
statsJson += "\"deviceStatus\":\"online\",";
statsJson += "\"messagesSent\":" + String(sentCount) + ",";
statsJson += "\"messagesReceived\":" + String(recvCount) + ",";
statsJson += "\"deliveryRate\":" + String(deliveryRate, 2) + ",";
statsJson += "\"avgLatency\":" + String(avgLatency, 2);
statsJson += "}";

statsJson.toCharArray(txpacket, BUFFER_SIZE - 1); 
txpacket[statsJson.length()] = '\0';  


Serial.write(txpacket);
Serial.write('\n'); 



  receiveflag = true;
  state = STATE_RX;
}

void setup() {
  Serial.begin(115200);
  Mcu.begin(HELTEC_BOARD, SLOW_CLK_TPYE);

  RadioEvents.TxDone = OnTxDone;
  RadioEvents.TxTimeout = OnTxTimeout;
  RadioEvents.RxDone = OnRxDone;
  Radio.Init(&RadioEvents);
  Radio.SetChannel(RF_FREQUENCY);
  Radio.SetTxConfig(MODEM_LORA, TX_OUTPUT_POWER, 0, LORA_BANDWIDTH,
                    LORA_SPREADING_FACTOR, LORA_CODINGRATE,
                    LORA_PREAMBLE_LENGTH, LORA_FIX_LENGTH_PAYLOAD_ON,
                    true, 0, 0, LORA_IQ_INVERSION_ON, 3000);
  Radio.SetRxConfig(MODEM_LORA, LORA_BANDWIDTH, LORA_SPREADING_FACTOR,
                    LORA_CODINGRATE, 0, LORA_PREAMBLE_LENGTH,
                    LORA_SYMBOL_TIMEOUT, LORA_FIX_LENGTH_PAYLOAD_ON,
                    0, true, 0, 0, LORA_IQ_INVERSION_ON, true);
  state = STATE_RX;

  Serial.println("[SYS] LoRa Serial Bridge Ready");
}

void loop() {
  if (Serial.available()) {
    inputMsg = Serial.readStringUntil('\n');
    inputMsg.trim();
    if (inputMsg.length() > 0) {
      inputMsg = "ID:" + String(sentCount) + "|DATA:" + inputMsg + "|TS:" + String(millis());
      inputMsg = "^" + inputMsg + "$";
      inputMsg.toCharArray(txpacket, BUFFER_SIZE);
      sentCount++;
      state = STATE_TX;
    }
  }

  switch (state) {
    case STATE_TX:
      Radio.Send((uint8_t *)txpacket, strlen(txpacket));
      state = LOWPOWER;
      break;
    case STATE_RX:
      Radio.Rx(0);
      state = LOWPOWER;
      break;
    case LOWPOWER:
      Radio.IrqProcess();
      break;
    default:
      break;
  }
}
