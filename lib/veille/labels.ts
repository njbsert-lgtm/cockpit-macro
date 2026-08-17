/**
 * Les canaux ne sont plus propres à la veille : les notes s'y rattachent aussi. Le
 * vocabulaire vit donc dans `lib/channels.ts`, ce module n'en garde que le pont pour ne pas
 * casser les imports existants.
 */
export { CHANNEL_LABELS } from "@/lib/channels";
