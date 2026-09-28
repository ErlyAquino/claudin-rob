/*
  02b - Melodia: "Ode a Alegria" (Beethoven) no buzzer
  Placa: Arduino Uno/Nano    Buzzer passivo no pino 8

  Estrutura usada por quase todos os projetos de musica em Arduino
  (inclusive o repositorio brasileiro github.com/robsoncouto/arduino-songs):
    - constantes NOTE_xx com a frequencia de cada nota
    - vetor melodia[] com pares (nota, duracao): 4 = seminima, 8 = colcheia,
      numero negativo = nota pontuada (dura 1,5x)
    - um "tempo" em BPM que define quanto dura a seminima

  Troque o vetor melodia[] por qualquer musica do repositorio acima.
*/
#define NOTE_C4  262
#define NOTE_D4  294
#define NOTE_E4  330
#define NOTE_F4  349
#define NOTE_G4  392
#define NOTE_A4  440
#define NOTE_B4  494
#define NOTE_C5  523
#define REST       0

const int BUZZER = 8;
const int TEMPO = 114;                       // batidas por minuto

// nota, duracao  (4 = seminima, 8 = colcheia, -4 = seminima pontuada, 2 = minima)
int melodia[] = {
  NOTE_E4, 4, NOTE_E4, 4, NOTE_F4, 4, NOTE_G4, 4,
  NOTE_G4, 4, NOTE_F4, 4, NOTE_E4, 4, NOTE_D4, 4,
  NOTE_C4, 4, NOTE_C4, 4, NOTE_D4, 4, NOTE_E4, 4,
  NOTE_E4, -4, NOTE_D4, 8, NOTE_D4, 2,
  NOTE_E4, 4, NOTE_E4, 4, NOTE_F4, 4, NOTE_G4, 4,
  NOTE_G4, 4, NOTE_F4, 4, NOTE_E4, 4, NOTE_D4, 4,
  NOTE_C4, 4, NOTE_C4, 4, NOTE_D4, 4, NOTE_E4, 4,
  NOTE_D4, -4, NOTE_C4, 8, NOTE_C4, 2,
};

const int numNotas = sizeof(melodia) / sizeof(melodia[0]) / 2;
const int seminima = (60000 * 4) / TEMPO / 4;   // duracao da seminima em ms

void setup() {
  pinMode(BUZZER, OUTPUT);
  for (int i = 0; i < numNotas * 2; i += 2) {
    int nota = melodia[i];
    int divisor = melodia[i + 1];
    int duracao;
    if (divisor > 0) duracao = (seminima * 4) / divisor;
    else             duracao = (seminima * 4) / (-divisor) * 1.5;   // pontuada
    tone(BUZZER, nota, duracao * 0.9);   // toca 90% e deixa 10% de silencio: separa as notas
    delay(duracao);
    noTone(BUZZER);
  }
}

void loop() { }   // toca uma vez; aperte RESET para repetir
