'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
}

interface TerminalProps {
  deviceId: string;
  deviceName: string;
}

export default function Terminal({ deviceId, deviceName }: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      type: 'system',
      content: `Connected to ${deviceName} (${deviceId})`,
      timestamp: new Date(),
    },
    {
      type: 'system',
      content: 'Type a command and press Enter to execute.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [lines, scrollToBottom]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    // Add command to lines
    setLines((prev) => [
      ...prev,
      { type: 'command', content: `$ ${command}`, timestamp: new Date() },
    ]);

    // Add to history
    setHistory((prev) => [command, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    setInput('');
    setIsExecuting(true);

    try {
      const res = await fetch(`/api/devices/${deviceId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandString: command }),
      });

      const data = await res.json();

      if (res.ok) {
        setLines((prev) => [
          ...prev,
          {
            type: 'output',
            content: data.result
              ? JSON.stringify(data.result, null, 2)
              : 'Command executed successfully.',
            timestamp: new Date(),
          },
        ]);
      } else {
        setLines((prev) => [
          ...prev,
          {
            type: 'error',
            content: `Error: ${data.error || 'Failed to execute command'}${
              data.details ? `\n${data.details}` : ''
            }`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      setLines((prev) => [
        ...prev,
        {
          type: 'error',
          content: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsExecuting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="terminal">
      <div className="terminal-header">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <span className="terminal-title">
          CLI Terminal — {deviceName}
        </span>
      </div>

      <div className="terminal-body" ref={bodyRef} onClick={() => inputRef.current?.focus()}>
        {lines.map((line, i) => (
          <div key={i} className={`terminal-line ${line.type}`}>
            {line.type === 'system' && (
              <span style={{ color: 'var(--accent-secondary)' }}>
                [{line.timestamp.toLocaleTimeString()}]{' '}
              </span>
            )}
            {line.content}
          </div>
        ))}
        {isExecuting && (
          <div className="terminal-line output" style={{ opacity: 0.5 }}>
            ⏳ Executing command...
          </div>
        )}
      </div>

      <div className="terminal-input-row">
        <span className="terminal-prompt">$&nbsp;</span>
        <input
          ref={inputRef}
          className="terminal-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isExecuting ? 'Waiting...' : 'Enter command...'}
          disabled={isExecuting}
          autoFocus
        />
        <button
          className="terminal-send"
          onClick={() => executeCommand(input)}
          disabled={isExecuting || !input.trim()}
        >
          Run
        </button>
      </div>
    </div>
  );
}
