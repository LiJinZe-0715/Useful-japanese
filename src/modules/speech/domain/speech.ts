export type Voice = { browserVoiceURI?: string; voicevoxStyleId?: number };
export type Segment = { id?: string; text: string; speakerId?: string; voice?: Voice };
export type SpeechSettings = {
  engine: "browser" | "voicevox";
  rate: number;
  browserVoiceURI: string;
  voicevoxStyleId: number;
  roles: Record<string, Voice>;
};
export const defaultSettings = (): SpeechSettings => ({
  engine: "browser",
  rate: 1,
  browserVoiceURI: "",
  voicevoxStyleId: 3,
  roles: {},
});
export const chooseVoice = (segment: Segment, settings: SpeechSettings): Voice => ({
  browserVoiceURI: settings.browserVoiceURI,
  voicevoxStyleId: settings.voicevoxStyleId,
  ...segment.voice,
  ...(segment.speakerId ? settings.roles[segment.speakerId] : {}),
});
