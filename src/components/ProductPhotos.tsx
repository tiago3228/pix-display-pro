import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resolveAsset, uploadAsset } from "@/lib/images";
import { MAX_PRODUCT_IMAGES } from "@/lib/ai-import.config";

/** Galeria de fotos do produto — usada no cadastro manual e na revisão da IA. */
export function ProductPhotos({
  paths,
  onChange,
}: {
  paths: string[];
  onChange: (next: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PRODUCT_IMAGES - paths.length;
    if (room <= 0) {
      toast.info(`Máximo de ${MAX_PRODUCT_IMAGES} fotos por produto.`);
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("sem sessão");
      const next = [...paths];
      for (const file of Array.from(files).slice(0, room)) {
        try {
          next.push(await uploadAsset(userId, file));
        } catch {
          toast.error(`Não foi possível enviar "${file.name}".`);
        }
      }
      onChange(next);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Fotos do produto</Label>
        <span className="text-xs text-muted-foreground">
          {paths.length}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {paths.map((path, index) => (
          <Thumb
            key={`${path}-${index}`}
            path={path}
            isMain={index === 0}
            onMain={() => onChange([path, ...paths.filter((_, i) => i !== index)])}
            onRemove={() => onChange(paths.filter((_, i) => i !== index))}
          />
        ))}
        <button
          type="button"
          aria-label="Adicionar foto"
          className="flex size-20 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ImagePlus className="size-5" />
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Escolher fotos do produto"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        A primeira foto é a principal e aparece na vitrine.
      </p>
    </div>
  );
}

function Thumb({
  path,
  isMain,
  onMain,
  onRemove,
}: {
  path: string;
  isMain: boolean;
  onMain: () => void;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    resolveAsset(path).then(setUrl);
  }, [path]);

  return (
    <div className="relative size-20 overflow-hidden rounded-lg bg-muted">
      {url ? <img src={url} alt="Foto do produto" className="size-full object-cover" /> : null}
      {isMain ? (
        <span className="absolute left-1 top-1 rounded bg-background/90 px-1 text-[10px] font-semibold">
          Principal
        </span>
      ) : (
        <Button
          size="icon"
          variant="secondary"
          aria-label="Definir como foto principal"
          className="absolute left-0.5 top-0.5 size-6"
          onClick={onMain}
        >
          <Star className="size-3" />
        </Button>
      )}
      <Button
        size="icon"
        variant="secondary"
        aria-label="Remover foto"
        className="absolute bottom-0.5 right-0.5 size-6"
        onClick={onRemove}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}
