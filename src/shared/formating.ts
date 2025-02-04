import prettyMilliseconds from "pretty-ms";

// recursively goes through every file in the folder and flattens it
export const bytesToHuman = (bytes: number): string => {
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes === 0)
    return "0 B";
  const i = ~~(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

export const bitrateToHuman = (bitrate: number): string => {
  if (bitrate === 0)
    return "0";
  return `${Math.round(bitrate / 1000)} Kbps`;
};

// Turns seconds from 80 to 1:20
export const secondsToHuman = (time: number): string => {
  return prettyMilliseconds(time * 1000,{secondsDecimalDigits: 0});
};

export const secondsToColinHuman = (time: number): string => {
  const seconds = ~~time;
  const minutes = ~~(seconds / 60);
  const secondsLeft = seconds % 60;
  return `${minutes || 0}:${secondsLeft < 10 ? "0" : ""}${secondsLeft || 0}`;
};