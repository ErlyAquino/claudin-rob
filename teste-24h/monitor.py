#!/usr/bin/env python3
"""Teste de 24 h dos nos da telemetria (teste/no6 MQ-2, no7 MH-Z19C, no8 DHT22, no10 ESP32-CAM).

  python3 monitor.py coletar            # roda sem parar: uma amostra por minuto
  python3 monitor.py analisar [HORAS]   # resumo das ultimas HORAS (padrao 1; 0 = teste inteiro)

Arquivos (nesta pasta):
  amostras.jsonl  uma linha por minuto com o que o painel (/api/nos) e a camera (/estado) disseram
  erros.log       uma linha quando um problema COMECA e outra quando TERMINA
So usa a biblioteca-padrao do Python.
"""
import json, os, sys, time, urllib.request
from datetime import datetime

PASTA = os.path.dirname(os.path.abspath(__file__))
AMOSTRAS = os.path.join(PASTA, "amostras.jsonl")
ERROS = os.path.join(PASTA, "erros.log")
SERVIDOR = "http://localhost:3000"
PROJETO = "teste"
SENSORES = {  # no: {grandeza: (minimo plausivel, maximo plausivel)}
    "no6": {"mq2": (0.02, 20)},
    "no7": {"co2": (350, 4999)},
    "no8": {"temperatura": (5, 50), "umidade": (5, 100)},
}
CAMERA = "no10"
PERIODO_S = 60
PARADO_SENSOR_S = 60        # sensores publicam a cada 10 s
PARADO_FOTO_S = 13 * 60     # a camera fotografa a cada 10 min


def agora_txt(t=None):
    return datetime.fromtimestamp(t or time.time()).strftime("%Y-%m-%d %H:%M:%S")


def pegar(url, prazo=6):
    with urllib.request.urlopen(url, timeout=prazo) as r:
        return json.load(r)


def coletar_uma(ip_camera):
    t = time.time()
    a = {"t": round(t), "servidor": True, "nos": {}, "cam": None}
    try:
        nos = {n["no"]: n for n in pegar(SERVIDOR + "/api/nos") if n["projeto"] == PROJETO}
    except Exception as e:
        a["servidor"] = False
        a["erro"] = str(e)[:80]
        nos = {}
    for nome in list(SENSORES) + [CAMERA]:
        n = nos.get(nome)
        if not n:
            continue
        a["nos"][nome] = {
            "status": n["status"],
            "g": {k: [v["valor"], round(t - v["t"] / 1000)] for k, v in n["grandezas"].items()},
            "perda": n.get("perda"),
            "img": round(t - n["ultimaImagem"]["t"] / 1000) if n.get("ultimaImagem") else None,
            "camera": n.get("camera"),
        }
    ip = (a["nos"].get(CAMERA) or {}).get("camera") or ip_camera
    if ip:
        try:
            a["cam"] = pegar(f"http://{ip}/estado", 8)
        except Exception as e:
            a["cam"] = {"erro": str(e)[:80]}
        a["cam"]["ip"] = ip
    return a, ip


def problemas(a, ant):
    """Devolve {chave: descricao} dos problemas presentes nesta amostra."""
    p = {}
    if not a["servidor"]:
        p["servidor"] = "painel do servidor (porta 3000) sem resposta: " + a.get("erro", "")
        return p
    for nome, faixas in SENSORES.items():
        n = a["nos"].get(nome)
        if not n:
            p[nome + "/sumiu"] = f"{nome} nao aparece no painel"
            continue
        if n["status"] != "online":
            p[nome + "/status"] = f"{nome} esta {n['status']}"
        for g, (lo, hi) in faixas.items():
            if g not in n["g"]:
                p[f"{nome}/{g}/falta"] = f"{nome} nunca publicou {g}"
                continue
            valor, idade = n["g"][g]
            if idade > PARADO_SENSOR_S:
                p[f"{nome}/{g}/parado"] = f"{nome}/{g} parado ha mais de {PARADO_SENSOR_S} s (ultimo valor {valor})"
            elif not (lo <= valor <= hi):
                p[f"{nome}/{g}/faixa"] = f"{nome}/{g} = {valor}, fora da faixa plausivel {lo}..{hi}"
    n = a["nos"].get(CAMERA)
    if not n:
        p[CAMERA + "/sumiu"] = f"{CAMERA} nao aparece no painel"
    else:
        if n["status"] != "online":
            p[CAMERA + "/status"] = f"{CAMERA} (camera) esta {n['status']}"
        if n["img"] is None or n["img"] > PARADO_FOTO_S:
            p[CAMERA + "/foto"] = f"{CAMERA}: servidor sem foto nova ha mais de {PARADO_FOTO_S // 60} min"
    c = a["cam"]
    if c is None:
        p[CAMERA + "/ip"] = f"{CAMERA}: endereco da camera desconhecido"
    elif "erro" in c:
        p[CAMERA + "/web"] = f"{CAMERA}: pagina da camera ({c['ip']}) sem resposta: {c['erro']}"
    else:
        if not c["sd"]:
            p[CAMERA + "/sd"] = f"{CAMERA}: microSD nao reconhecido"
        if not c["camera"]:
            p[CAMERA + "/sensor"] = f"{CAMERA}: sensor da camera nao iniciou"
        if c["pendentes"] > 1:
            p[CAMERA + "/pendentes"] = f"{CAMERA}: fotos presas no cartao sem enviar (pendentes > 1)"
        if c["livreMb"] < 200:
            p[CAMERA + "/cheio"] = f"{CAMERA}: microSD com menos de 200 MB livres"
        if c["rssi"] < -80:
            p[CAMERA + "/sinal"] = f"{CAMERA}: sinal Wi-Fi fraco (abaixo de -80 dBm)"
    return p


def pontuais(a, ant):
    """Eventos de um instante so (reinicio, leituras perdidas)."""
    ev = []
    if not ant:
        return ev
    for nome, n in a["nos"].items():
        m = ant["nos"].get(nome)
        if not m or not n.get("perda") or not m.get("perda"):
            continue
        if n["perda"]["boot"] != m["perda"]["boot"]:
            ev.append(f"{nome} REINICIOU (boot {m['perda']['boot']} -> {n['perda']['boot']})")
        else:
            f1 = n["perda"]["esperadas"] - n["perda"]["recebidas"]
            f0 = m["perda"]["esperadas"] - m["perda"]["recebidas"]
            if f1 > f0:
                ev.append(f"{nome} perdeu {f1 - f0} leitura(s) (total do boot: {f1} de {n['perda']['esperadas']})")
    c, d = a.get("cam") or {}, ant.get("cam") or {}
    if "ligadoS" in c and "ligadoS" in d and c["ligadoS"] < d["ligadoS"]:
        ev.append(f"{CAMERA} (camera) REINICIOU: estava ligada ha {d['ligadoS'] // 60} min")
    return ev


def registrar(linha):
    with open(ERROS, "a") as f:
        f.write(f"{agora_txt()}  {linha}\n")


def coletar():
    abertos, ant, ip = {}, None, None
    registrar("INICIO  monitor ligado")
    while True:
        inicio = time.time()
        try:
            a, ip = coletar_uma(ip)
            p = problemas(a, ant)
            for k, txt in p.items():
                if k not in abertos:
                    abertos[k] = time.time()
                    registrar(f"ERRO    {txt}")
            for k in [k for k in abertos if k not in p]:
                registrar(f"VOLTOU  {k} (durou {round((time.time() - abertos.pop(k)) / 60)} min)")
            for txt in pontuais(a, ant):
                registrar(f"EVENTO  {txt}")
            a["abertos"] = sorted(p)
            with open(AMOSTRAS, "a") as f:
                f.write(json.dumps(a, separators=(",", ":")) + "\n")
            if a["servidor"]:
                ant = a
        except Exception as e:  # o monitor nao pode morrer
            registrar(f"MONITOR falha interna: {e!r}")
        time.sleep(max(1, PERIODO_S - (time.time() - inicio)))


def analisar(horas):
    am = [json.loads(l) for l in open(AMOSTRAS) if l.strip()]
    t0 = am[0]["t"]
    fim = am[-1]["t"]
    desde = t0 if horas == 0 else fim - horas * 3600
    j = [a for a in am if a["t"] >= desde]
    print(f"Teste iniciado em {agora_txt(t0)}; decorrido {round((fim - t0) / 3600, 1)} h; ultima amostra {agora_txt(fim)} "
          f"(ha {round(time.time() - fim)} s)")
    print(f"Janela: {agora_txt(j[0]['t'])} a {agora_txt(fim)} | {len(j)} amostras (esperadas ~{round((fim - j[0]['t']) / 60) + 1})")
    fora = sum(not a["servidor"] for a in j)
    print(f"Servidor: {'OK' if not fora else f'{fora} amostra(s) sem resposta'}")
    for nome, faixas in SENSORES.items():
        s = [a["nos"][nome] for a in j if nome in a["nos"]]
        on = sum(x["status"] == "online" for x in s)
        linha = f"{nome}: on-line {on}/{len(j)}"
        for g in faixas:
            v = [x["g"][g][0] for x in s if g in x["g"] and x["g"][g][1] <= PARADO_SENSOR_S]
            if v:
                linha += f" | {g} min {min(v):g} med {sum(v) / len(v):.4g} max {max(v):g} ({len(v)} frescas)"
            else:
                linha += f" | {g} SEM LEITURA FRESCA"
        pr = [x["perda"] for x in s if x.get("perda")]
        if pr:
            u = pr[-1]
            linha += f" | boot {u['boot']}: {u['recebidas']}/{u['esperadas']} recebidas"
            if len({x['boot'] for x in pr}) > 1:
                linha += f" | REINICIOS: boots {sorted({x['boot'] for x in pr})}"
        print(linha)
    s = [a["nos"][CAMERA] for a in j if CAMERA in a["nos"]]
    c = [a["cam"] for a in j if a.get("cam") and "erro" not in a["cam"]]
    on = sum(x["status"] == "online" for x in s)
    linha = f"{CAMERA} (camera): on-line {on}/{len(j)} | pagina respondeu {len(c)}/{len(j)}"
    if c:
        esperadas = (j[-1]["t"] - j[0]["t"]) / 600
        linha += (f" | fotos no cartao {c[0]['fotos']} -> {c[-1]['fotos']} (+{c[-1]['fotos'] - c[0]['fotos']}, esperado ~{esperadas:.0f})"
                  f" | pendentes max {max(x['pendentes'] for x in c)} | livre {c[-1]['livreMb']} MB"
                  f" | RSSI {min(x['rssi'] for x in c)}..{max(x['rssi'] for x in c)} dBm | ligada ha {c[-1]['ligadoS'] // 60} min")
    im = [x["img"] for x in s if x["img"] is not None]
    if im:
        linha += f" | idade maxima da ultima foto no servidor {max(im) // 60} min"
    print(linha)
    print("--- erros.log na janela ---")
    n = 0
    for l in open(ERROS):
        try:
            tl = datetime.strptime(l[:19], "%Y-%m-%d %H:%M:%S").timestamp()
        except ValueError:
            continue
        if tl >= desde - 1:
            print(l.rstrip())
            n += 1
    if not n:
        print("(nenhuma linha)")
    ab = j[-1].get("abertos") or []
    print("Problemas abertos agora:", ", ".join(ab) if ab else "nenhum")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "coletar":
        coletar()
    elif len(sys.argv) > 1 and sys.argv[1] == "analisar":
        analisar(float(sys.argv[2]) if len(sys.argv) > 2 else 1)
    else:
        print(__doc__)
