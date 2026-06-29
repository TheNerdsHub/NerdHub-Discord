import pino from 'pino';

const options: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
};

if (process.env.NODE_ENV !== 'production') {
  options.transport = {
    target: 'pino/file',
    options: { destination: 1 },
  };
}

export const logger = pino(options);
