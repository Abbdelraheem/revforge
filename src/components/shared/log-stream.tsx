"use client";

import React, { useEffect, useRef } from "react";

export interface LogMessage {
  timestamp: string;
  stage: string;
  message: string;
}

export function LogStream({ logs }: { logs: LogMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="h-64 overflow-y-auto rounded-md border border-border bg-card p-4 font-mono text-sm leading-relaxed">
      {logs.length === 0 ? (
        <div className="text-muted-foreground">Waiting for build stream events...</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="flex space-x-2 py-0.5">
            <span className="text-muted-foreground">{log.timestamp}</span>
            <span className="font-semibold text-primary">[{log.stage}]</span>
            <span className="text-foreground">{log.message}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
