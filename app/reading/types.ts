export type ReadingSubject = "chinese" | "english";

export type SpeechRecognitionResultItem = {
  transcript?: string;
};

export type SpeechRecognitionResultList = {
  0?: SpeechRecognitionResultItem;
};

export type SpeechRecognitionEventLike = {
  results?: ArrayLike<SpeechRecognitionResultList>;
};

export type SpeechRecognitionLike = {
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type ReadingWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};
