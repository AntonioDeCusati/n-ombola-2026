/** Estrae la callback ack dagli argomenti Socket.io (sempre ultimo argomento funzione). */
export function getAck(args) {
  const last = args[args.length - 1];
  return typeof last === 'function' ? last : null;
}

/** Estrae il payload dati (primo argomento se non è una funzione). */
export function getData(args) {
  if (args.length === 0 || typeof args[0] === 'function') return undefined;
  return args[0];
}
