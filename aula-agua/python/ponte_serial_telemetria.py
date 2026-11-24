"""Ponte: sketches de teste da aula-agua (linhas `nome:valor`, ex.: `pH:6.98 V:1.670  neutro`) -> gateway da
telemetria-cria (linhas JSON `{"no","grandeza","valor","unidade","seq"}`).

Abre a porta serial da placa, cria uma porta virtual (pty) e escreve nela as leituras no formato do gateway.
O gateway real (telemetria-cria/gateway/gateway.py) le a porta virtual e envia ao painel (projeto `teste`).

  uv run python ../aula-agua/python/ponte_serial_telemetria.py --porta /dev/ttyUSB0 --no no5
  (outro terminal)  cd /dados/Projetos/telemetria-cria && python3 -u gateway/gateway.py --porta /tmp/cria-ponte-no5

Uma porta serial so pode ser usada por um programa: feche o Monitor Serial e pare a ponte antes de gravar a placa.
"""
import argparse, json, os, pty, re, sys, time, tty
import serial

# nome impresso pelo sketch -> (grandeza do catalogo, unidade)
MAPA = {
    "pH": ("ph", "pH"), "V": ("tensao", "V"),
    "vazao": ("vazao", "L/min"), "volume": ("volume", "L"),
    "nivel": ("nivel", "cm"), "pressao": ("pressao", "kPa"),
}
PAR = re.compile(r"([A-Za-z_]\w*):\s*(-?\d+(?:\.\d+)?)")

def main():
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("--porta", default="/dev/ttyUSB0")
    a.add_argument("--baud", type=int, default=115200)
    a.add_argument("--no", default="no5", help="nome do no no painel (projeto teste)")
    a.add_argument("--intervalo", type=float, default=2.0, help="segundos entre envios de cada grandeza")
    o = a.parse_args()

    mestre, escravo = pty.openpty()
    tty.setraw(escravo)
    atalho = f"/tmp/cria-ponte-{o.no}"
    if os.path.islink(atalho): os.unlink(atalho)
    os.symlink(os.ttyname(escravo), atalho)
    print(f"porta virtual para o gateway: {atalho}", flush=True)

    s = serial.Serial()
    s.port, s.baudrate, s.timeout = o.porta, o.baud, 1
    s.dtr = False; s.rts = False              # nao segurar o ESP32 em reset
    s.exclusive = True
    s.open()
    print(f"lendo {o.porta} a {o.baud} baud", flush=True)

    seq, ultimo, mostrado = 0, {}, 0.0
    try:
        while True:
            linha = s.readline().decode("utf-8", "replace").strip()
            if not linha: continue
            agora = time.time()
            for nome, valor in PAR.findall(linha):
                if nome not in MAPA or agora - ultimo.get(nome, 0) < o.intervalo: continue
                ultimo[nome] = agora
                grandeza, unidade = MAPA[nome]
                seq += 1
                msg = {"no": o.no, "grandeza": grandeza, "valor": float(valor), "unidade": unidade, "seq": seq}
                os.write(mestre, (json.dumps(msg) + "\n").encode())
            if agora - mostrado >= 10:
                mostrado = agora
                print(f"placa: {linha}   (enviadas: {seq})", flush=True)
    except KeyboardInterrupt:
        pass
    finally:
        s.close()
        if os.path.islink(atalho): os.unlink(atalho)

if __name__ == "__main__":
    sys.exit(main())
