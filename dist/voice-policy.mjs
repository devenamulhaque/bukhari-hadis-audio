// SpeechSynthesisVoice has no standard gender field. Only list known male
// Bengali voice names; do not guess the gender of unknown device voices.
export function isKnownMaleBengaliVoice(voice) {
  return /^bn([_-]|$)/i.test(voice.lang) && /\b(?:Pradeep|Bashkar)(?:Neural)?\b/i.test(voice.name);
}
