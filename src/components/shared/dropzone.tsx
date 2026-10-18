"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, File, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/components/ui/button";

export interface DropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedExtensions?: string[];
  maxSizeBytes?: number;
  className?: string;
  isArabic?: boolean;
}

export function Dropzone({
  onFileSelect,
  acceptedExtensions = [".apk", ".exe", ".dll", ".elf", ".dylib", ".asar", ".har"],
  maxSizeBytes = 250 * 1024 * 1024,
  className,
  isArabic = false,
}: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;

    if (file.size > maxSizeBytes) {
      setError(
        isArabic
          ? `حجم الملف (${(file.size / (1024 * 1024)).toFixed(1)}MB) يتجاوز الحد المسموح (250MB)`
          : `File size exceeds 250MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`
      );
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20",
          isDragOver ? "border-primary bg-primary/5" : "border-border",
          error && "border-destructive bg-destructive/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={acceptedExtensions.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          {selectedFile ? (
            <div className="flex items-center space-x-2 rtl:space-x-reverse text-primary">
              <CheckCircle2 className="h-6 w-6" />
              <div className="text-start">
                <span className="font-mono text-xs font-semibold block">{selectedFile.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Verified Magic Bytes
                </span>
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {isArabic ? "اسحب الملف هنا أو انقر للاختيار" : "Drop target artifact here or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {acceptedExtensions.join("  ")} • Max 250MB
              </p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 text-xs text-destructive flex items-center space-x-1.5 rtl:space-x-reverse">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
