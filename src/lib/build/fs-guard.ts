import path from "node:path";
import fs from "node:fs";

export interface ResolvePathOptions {
  forWrite?: boolean;
}

/**
 * Resolves and validates that a relative path stays strictly inside workspace root.
 * Canonicalizes with realpath of deepest existing ancestor to block symlink escapes.
 * Uses path.relative (NOT startsWith) to block sibling prefixes (/ws vs /ws-evil).
 */
export function resolveSafePath(
  root: string,
  rel: string,
  options?: ResolvePathOptions
): string {
  if (!rel || typeof rel !== "string") {
    throw new Error("Invalid path: missing or empty path");
  }

  // 1. Reject NUL bytes
  if (rel.includes("\0")) {
    throw new Error("Invalid path: contains NUL bytes");
  }

  // 2. Reject absolute paths (POSIX and Windows drive letters)
  if (path.isAbsolute(rel) || /^[a-zA-Z]:[/\\]/.test(rel) || rel.startsWith("\\") || rel.startsWith("/")) {
    throw new Error("Invalid path: absolute paths forbidden");
  }

  // 3. Normalize path and block path traversal tokens
  const normalized = path.normalize(rel);
  const segments = normalized.split(/[/\\]/);
  if (segments.includes("..")) {
    throw new Error("Invalid path: path traversal sequences forbidden");
  }

  // Canonical root
  const realRoot = fs.existsSync(root) ? fs.realpathSync(root) : path.resolve(root);

  // Target full path
  const target = path.resolve(realRoot, normalized);

  // Deepest existing ancestor canonicalization for symlink defense
  let curr = target;
  while (!fs.existsSync(curr)) {
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }

  const realAncestor = fs.existsSync(curr) ? fs.realpathSync(curr) : curr;
  const relAncestor = path.relative(realRoot, realAncestor);
  if (relAncestor.startsWith("..") || path.isAbsolute(relAncestor)) {
    throw new Error("Invalid path: symlink escape detected");
  }

  // Strict path.relative containment check against root
  const targetRel = path.relative(realRoot, target);
  if (targetRel.startsWith("..") || path.isAbsolute(targetRel)) {
    throw new Error("Invalid path: path traverses outside workspace root");
  }

  // Additional rules for write access
  if (options?.forWrite) {
    const forwardRel = targetRel.replace(/\\/g, "/");
    const parts = forwardRel.split("/");
    const fileName = parts[parts.length - 1] || "";

    // Reject .git/**
    if (parts[0] === ".git") {
      throw new Error("Cannot write to .git directory");
    }

    // Reject node_modules/**
    if (parts[0] === "node_modules") {
      throw new Error("Cannot write to node_modules directory");
    }

    // Reject .env* except .env.example
    if (fileName.startsWith(".env") && fileName !== ".env.example") {
      throw new Error("Cannot write to .env secrets file");
    }
  }

  return target;
}
