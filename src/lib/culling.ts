export type PhotoResult = {
  main_subject_found: boolean;
  face_sharpness: number;
  eyes_closed: boolean;
  head_cut: boolean;
};

export type CullSettings = {
  focus_threshold: number;
  require_main_subject: boolean;
  reject_eyes_closed: boolean;
  reject_head_cut: boolean;
};

export type Category = "boas" | "desfocadas" | "olhos_fechados" | "cabeca_cortada" | "sem_atleta";

export const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: "boas", label: "Boas", color: "bg-good" },
  { id: "desfocadas", label: "Desfocadas", color: "bg-blur" },
  { id: "olhos_fechados", label: "Olhos fechados", color: "bg-eyes" },
  { id: "cabeca_cortada", label: "Cabeça cortada", color: "bg-cut" },
  { id: "sem_atleta", label: "Sem atleta", color: "bg-nosubject" },
];

/** Decide the destination folder. Order: no athlete, blurred, eyes closed, head cut, good. */
export function classify(r: PhotoResult, s: CullSettings): Category {
  if (s.require_main_subject && !r.main_subject_found) return "sem_atleta";
  if (r.face_sharpness < s.focus_threshold) return "desfocadas";
  if (s.reject_eyes_closed && r.eyes_closed) return "olhos_fechados";
  if (s.reject_head_cut && r.head_cut) return "cabeca_cortada";
  return "boas";
}
