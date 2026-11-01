import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSignedAssetUrl, uploadAssetServer } from "@/lib/images.functions";

export function PizzeriaPhotoPreview({ path, name }: { path: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const signAsset = useServerFn(getSignedAssetUrl);
  useEffect(() => {
    let active = true;
    setUrl(null);
    if (path) {
      if (/^https?:\/\//i.test(path)) setUrl(path);
      else void signAsset({ data: { path } }).then((result) => {
        if (active) setUrl(result.url);
      }).catch(() => { if (active) setUrl(null); });
    }
    return () => { active = false; };
  }, [path, signAsset]);
  if (!path) return null;
  return <div className="size-20 shrink-0 overflow-hidden rounded-md bg-muted">
    {url ? <img src={url} alt={`Foto de ${name}`} className="size-full object-contain" /> : null}
  </div>;
}

export function PizzeriaPhoto({ path, name, onChange, onUploadingChange }: {
  path: string | null;
  name: string;
  onChange: (path: string | null) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = useServerFn(uploadAssetServer);
  async function addPhoto(file?: File) {
    if (!file) return;
    setUploading(true);
    onUploadingChange(true);
    try {
      const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
      const extension = extensions[file.type];
      if (!extension) throw new Error("Selecione uma imagem JPG, PNG, WebP, GIF ou AVIF.");
      if (file.size > 10 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 10 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      const result = await upload({ data: { contentType: file.type, extension, base64: btoa(binary) } });
      onChange(result.path);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }
  return <div className="flex flex-wrap items-center gap-2">
    <PizzeriaPhotoPreview path={path} name={name} />
    <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
      {uploading ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <ImagePlus className="mr-1.5 size-4" />}
      {uploading ? "Enviando foto…" : path ? "Trocar foto" : "Adicionar foto"}
    </Button>
    {path ? <Button type="button" size="icon" variant="ghost" disabled={uploading} aria-label={`Remover foto de ${name}`} onClick={() => onChange(null)}><Trash2 className="size-4 text-destructive" /></Button> : null}
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" aria-label={`Escolher foto de ${name}`} disabled={uploading} onChange={(event) => { void addPhoto(event.target.files?.[0]); event.target.value = ""; }} />
  </div>;
}