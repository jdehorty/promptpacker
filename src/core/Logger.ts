import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  source: string;
  message: string;
  data?: Record<string, unknown>;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logFile: string;
  private logLevel: LogLevel = LogLevel.INFO;
  private maxLogSize: number = 10 * 1024 * 1024; // 10MB
  private maxLogFiles: number = 5;

  private constructor() {
    // Create logs directory in VS Code's global storage or fallback
    let logDir: string;
    try {
      // Try to use VS Code's global storage if available
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        logDir = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'promptpacker-logs');
      } else {
        // Fallback to a predictable location
        logDir = path.join(process.cwd(), '.promptpacker-logs');
      }
    } catch {
      // Final fallback
      logDir = path.join(process.cwd(), '.promptpacker-logs');
    }

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logFile = path.join(logDir, 'promptpacker.log');
    this.initializeLogging();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private initializeLogging(): void {
    // Log initialization
    this.writeToFile({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      source: 'Logger',
      message: 'PromptPacker logging initialized',
      data: {
        logFile: this.logFile,
        logLevel: LogLevel[this.logLevel],
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    });
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public debug(source: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, source, message, data);
  }

  public info(source: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, source, message, data);
  }

  public warn(source: string, message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, source, message, data);
  }

  public error(
    source: string,
    message: string,
    error?: Error,
    data?: Record<string, unknown>
  ): void {
    this.log(LogLevel.ERROR, source, message, data, error);
  }

  private log(
    level: LogLevel,
    source: string,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      source,
      message,
      data,
      error,
    };

    this.writeToFile(entry);
  }

  private writeToFile(entry: LogEntry): void {
    try {
      // Check if log rotation is needed
      this.rotateLogsIfNeeded();

      const logLine = this.formatLogEntry(entry);
      fs.appendFileSync(this.logFile, logLine + '\n', 'utf8');
    } catch (writeError) {
      // If we can't write to file, try to write to console
      console.error('Logger: Failed to write to log file', writeError);
      console.log('Original log entry:', entry);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    let formatted = `[${entry.timestamp}] ${entry.level.padEnd(5)} ${entry.source.padEnd(20)} ${entry.message}`;

    if (entry.data) {
      formatted += ` | Data: ${JSON.stringify(entry.data)}`;
    }

    if (entry.error) {
      formatted += ` | Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        formatted += ` | Stack: ${entry.error.stack}`;
      }
    }

    return formatted;
  }

  private rotateLogsIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFile)) {
        return;
      }

      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxLogSize) {
        // Rotate logs
        for (let i = this.maxLogFiles - 1; i >= 1; i--) {
          const oldFile = `${this.logFile}.${i}`;
          const newFile = `${this.logFile}.${i + 1}`;

          if (fs.existsSync(oldFile)) {
            if (i === this.maxLogFiles - 1) {
              fs.unlinkSync(oldFile);
            } else {
              fs.renameSync(oldFile, newFile);
            }
          }
        }

        fs.renameSync(this.logFile, `${this.logFile}.1`);
      }
    } catch (error) {
      console.error('Logger: Failed to rotate logs', error);
    }
  }

  public getLogFile(): string {
    return this.logFile;
  }

  public getLogDirectory(): string {
    return path.dirname(this.logFile);
  }

  public clearLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.unlinkSync(this.logFile);
      }

      // Remove rotated logs
      for (let i = 1; i <= this.maxLogFiles; i++) {
        const rotatedFile = `${this.logFile}.${i}`;
        if (fs.existsSync(rotatedFile)) {
          fs.unlinkSync(rotatedFile);
        }
      }

      this.info('Logger', 'Logs cleared');
    } catch (error) {
      console.error('Logger: Failed to clear logs', error);
    }
  }
}

// Export a singleton instance for easy use
export const logger = Logger.getInstance();
