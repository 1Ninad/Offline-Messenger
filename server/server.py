import asyncio
import json
import serial
import serial.tools.list_ports
import websockets

PORT_NAME = '/dev/cu.usbserial-0001'
BAUD_RATE = 115200
ser = serial.Serial(PORT_NAME, BAUD_RATE, timeout=0.1)

connected_clients = set()
latest_stats = {}
recent_messages = set()

async def broadcast(message):
    if connected_clients:
        await asyncio.gather(*(client.send(message) for client in connected_clients))

async def read_serial():
    buffer = ""
    while True:
        try:
            if ser.in_waiting:
                buffer += ser.read(ser.in_waiting).decode('utf-8', errors='ignore')

                while '[MSG]' in buffer or '[STATS]' in buffer:
                    if '[MSG]' in buffer:
                        start = buffer.index('[MSG]')
                        end = buffer.find('\n', start)
                        line = buffer[start:end if end != -1 else len(buffer)]
                        buffer = buffer.replace(line, "", 1)

                        payload = line[5:].strip()
                        if payload not in recent_messages:
                            recent_messages.add(payload)
                            if len(recent_messages) > 100:
                                recent_messages_list = list(recent_messages)[-50:]
                                recent_messages.clear()
                                recent_messages.update(recent_messages_list)

                            print(f"[MSG] {payload}")
                            await broadcast(json.dumps({"type": "message", "data": payload}))

                    elif '[STATS]' in buffer:
                        start = buffer.index('[STATS]')
                        end = buffer.find('\n', start)
                        if end == -1:
                            break  

                        line = buffer[start:end]
                        buffer = buffer[end + 1:]

                        try:
                            json_start = line.index('{')
                            stats_json = line[json_start:]
                            try:
                                stats = json.loads(stats_json)
                                stats['avgLatency'] = float(stats.get('avgLatency', 0))
                                stats['lastPing'] = int(stats.get('lastPing', 0))
                                stats['signalStrength'] = int(stats.get('signalStrength', -100))
                                latest_stats.update(stats)
                                print(f"[STATS] {stats}")
                                await broadcast(json.dumps({"type": "stats", "data": stats}))
                            except json.JSONDecodeError as e:
                                print(f"[STATS] JSON decode error: {e} - skipping: {stats_json}")

                        except Exception as e:
                            print(f"STATS PARSE ERROR: {e}")
        except Exception as e:
            print(f"SERIAL ERROR: {e}")

        await asyncio.sleep(0.01)

async def websocket_handler(websocket):
    connected_clients.add(websocket)
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                if data.get("type") == "send":
                    text = data.get("data", "").strip()
                    if text:
                        print(f"[SEND] {text}")
                        ser.write((text + "\n").encode())
            except Exception as e:
                print(f"PARSE ERROR: {e}")
    finally:
        connected_clients.remove(websocket)

async def main():
    print("WebSocket server running on ws://localhost:8765")
    await asyncio.gather(
        read_serial(),
        websockets.serve(websocket_handler, "localhost", 8765)
    )

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Exiting...")
    finally:
        if ser and ser.is_open:
            ser.close()