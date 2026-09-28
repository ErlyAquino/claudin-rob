"""Passo 1 em Python: so LER a porta serial e imprimir (antes de plotar).

Uso:  python ler_serial.py COM3
Mostra que a porta serial e apenas um "cano de texto": o que o Arduino escreve
com Serial.println() chega aqui linha por linha.
"""
import sys, time
import serial                                    # pip install pyserial
from serial.tools import list_ports

if len(sys.argv) < 2:
    print("Portas disponiveis:")
    for p in list_ports.comports(): print("  ", p.device, "-", p.description)
    print("uso: python ler_serial.py COM3"); sys.exit()

porta = sys.argv[1]
with serial.Serial(porta, 9600, timeout=1) as ser:
    time.sleep(2)                                # o Arduino reinicia quando a porta abre
    print("lendo", porta, "(Ctrl+C para parar)")
    while True:
        linha = ser.readline().decode("ascii", errors="ignore").strip()
        if not linha: continue
        print(repr(linha))                       # repr mostra exatamente o que chegou
        partes = linha.split(",")
        if len(partes) == 2 and partes[0].isdigit():
            t_ms, d_cm = int(partes[0]), float(partes[1])
            print(f"   -> t = {t_ms/1000:.1f} s   d = {d_cm} cm")
