/*
  04 - O mesmo controle por potenciometro, agora no ESP32
  Placa: ESP32 Dev Module (Arduino IDE: esp32 by Espressif)
  Biblioteca: ESP32Servo (Gerenciador de Bibliotecas -> "ESP32Servo")

  Diferencas em relacao ao Arduino Uno:
    1. A biblioteca Servo padrao NAO funciona no ESP32 -> usar ESP32Servo.
    2. O ADC do ESP32 tem 12 bits: analogRead vai de 0 a 4095 (nao 1023).
    3. O ESP32 trabalha em 3,3 V. O potenciometro deve ser ligado entre 3V3 e GND
       (NUNCA em 5 V, pois o pino ADC nao aguenta mais que 3,3 V).
    4. O sinal do servo em 3,3 V e aceito pelo SG90, mas a ALIMENTACAO do servo
       deve ser 5 V (pino VIN/5V do ESP32 quando ligado por USB, ou fonte externa).
    5. Use pinos do ADC1 para o pot (GPIO 32..39). ADC2 nao funciona com Wi-Fi ligado.

  Ligacoes:
    Pot 10k: esquerda -> GND, meio -> GPIO 34, direita -> 3V3
    SG90: marrom -> GND, vermelho -> VIN (5 V), laranja -> GPIO 13
*/
#include <ESP32Servo.h>

const int PINO_SERVO = 13;
const int PINO_POT   = 34;   // ADC1_CH6 (somente entrada)
Servo servo;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);                 // 0..4095
  analogSetAttenuation(ADC_11db);           // permite ler ate ~3,3 V

  ESP32PWM::allocateTimer(0);               // reserva um timer para os servos
  servo.setPeriodHertz(50);                 // 50 Hz = periodo de 20 ms
  servo.attach(PINO_SERVO, 500, 2400);      // use os valores da SUA calibracao
}

void loop() {
  int leitura = analogRead(PINO_POT);            // 0..4095
  int angulo  = map(leitura, 0, 4095, 0, 180);
  servo.write(angulo);

  Serial.printf("pot = %4d  ->  angulo = %3d\n", leitura, angulo);
  delay(20);
}
