import { useRef, useState } from "react";
import { Upload, File, X, Paperclip, Info } from "lucide-react";
import { IconFileTypePdf, IconFileTypeXls, IconFileTypeCsv } from "@tabler/icons-react";
import { Tooltip } from "@/components/ui/Tooltip";

const INSTRUCTIONS =
  'You can upload your <strong>supporting evidence</strong> here. ' +
  'Accepted formats: <strong>PDF, Excel, and CSV</strong>. Max size: 10MB per file. ' +
  'You can select multiple files at once using the browse button.';

const ACCEPTED = /\.(pdf|xlsx|xls|csv)$/i;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function formatSize(bytes: number): string {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function FileIcon({ name }: { name: string }) {
  if (/\.pdf$/i.test(name))       return <IconFileTypePdf className="w-6 h-6 text-destructive" />;
  if (/\.(xlsx|xls)$/i.test(name)) return <IconFileTypeXls className="w-6 h-6 text-success" />;
  if (/\.csv$/i.test(name))       return <IconFileTypeCsv className="w-6 h-6 text-highlight-foreground" />;
  return <File className="w-6 h-6 text-primary" />;
}

export default function UploadFiles({
  files,
  setFiles,
}: {
  files: File[];
  setFiles: (files: File[]) => void;
}) {
  const fileInputRef        = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);

  const addFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => ACCEPTED.test(f.name) && f.size <= MAX_SIZE);
    if (arr.length > 0) setFiles([...files, ...arr]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Instructions */}
      <section className="bg-muted/30 border border-border p-6 rounded-md">
        <div className="flex items-center gap-2 mb-5 text-primary">
          <Info className="w-5 h-5" />
          <h3 className="font-sans font-semibold text-xs uppercase tracking-[0.06em]">Upload documents</h3>
        </div>
        <p
          className="text-foreground/80 text-sm leading-relaxed font-sans"
          dangerouslySetInnerHTML={{ __html: INSTRUCTIONS }}
        />
      </section>

      {/* Upload Zone */}
      <div
        className={`w-full p-12 border-2 border-dashed rounded-md flex flex-col items-center justify-center transition-colors group cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-4 bg-background rounded-md border border-border mb-4">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-sans font-semibold text-foreground">Upload documents</h3>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.06em] mb-6 opacity-60">
          Drag and drop files here or click to browse
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
          accept=".pdf,.xlsx,.xls,.csv"
        />
        <button
          type="button"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-blue-600 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          <Paperclip className="w-4 h-4 stroke-[3px]" />
          Browse files
        </button>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
          {files.map((file, index) => (
            <Tooltip key={`${file.name}-${index}`} content={file.name} className="block">
              <div className="group relative flex items-center gap-3 p-4 pr-9 bg-background border border-border rounded-md hover:border-primary/40 transition-colors">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="shrink-0">
                  <FileIcon name={file.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate font-sans">{file.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                    {formatSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  title="Remove file"
                  className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}
