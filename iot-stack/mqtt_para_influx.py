"""Ponte MQTT -> InfluxDB para aulas de sensores.

Assina o topico `sensores/#` no Mosquitto local e grava cada mensagem JSON
no bucket `sensores` do InfluxDB. Exemplo de payload publicado pelo ESP32:
    topico: sensores/sala1   payload: {"temp": 25.3, "umid": 60}

Rodar (dentro de python-dados):
    uv run python ../iot-stack/mqtt_para_influx.py
"""
import json

import paho.mqtt.client as mqtt
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN = "token-aula-sensores-123"
INFLUX_ORG = "escola"
INFLUX_BUCKET = "sensores"
MQTT_HOST = "localhost"
MQTT_TOPIC = "sensores/#"

influx = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
write = influx.write_api(write_options=SYNCHRONOUS)


def on_message(client, userdata, msg):
    try:
        dados = json.loads(msg.payload)
    except json.JSONDecodeError:
        print(f"[ignorado] {msg.topic}: payload nao e JSON")
        return
    origem = msg.topic.split("/", 1)[-1]  # sensores/sala1 -> sala1
    p = Point("leitura").tag("origem", origem)
    for campo, valor in dados.items():
        if isinstance(valor, (int, float)):
            p.field(campo, float(valor))
    write.write(bucket=INFLUX_BUCKET, record=p)
    print(f"[gravado] {origem}: {dados}")


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message
client.connect(MQTT_HOST, 1883)
client.subscribe(MQTT_TOPIC)
print(f"Ouvindo {MQTT_TOPIC} em {MQTT_HOST} -> InfluxDB {INFLUX_BUCKET}")
client.loop_forever()
