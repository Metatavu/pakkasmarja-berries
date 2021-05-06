import { Logger } from "log4js";

/**
 * Utility method creating stacked promise rejects
 *
 * @param message message
 * @param prevError possible previous error object or message string
 *
 * @returns stacked error object
 */
export const createStackedReject = (message: string | Error, prevError?: string | Error) => {
  const reason: Error = message instanceof Error ?
    { ...message } : new Error(message);

  if (prevError) {
    reason.stack += `\nCaused By:\n`;
    reason.stack += prevError instanceof Error ?
      prevError.stack ?? prevError.message :
      prevError;
  }

  return reason;
}

/**
 * Logs rejected promise error
 *
 * @param error error
 * @param logger logger instance to log the error with
 */
export const logReject = (error: string | Error, logger: Logger) => {
  logger.error(error instanceof Error ? error.stack : error);
};