export interface LyricLine {
  time: number;
  text: string;
}

export const parseLRC = (lrcString: string): LyricLine[] => {
  const lines = lrcString.split('\n');
  const lyrics: LyricLine[] = [];

  lines.forEach((line) => {
    const timeRegex = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    let match;

    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      
      const totalTime = minutes * 60 + seconds + milliseconds / 1000;
      
      const text = line.replace(/\[\d{2,}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();

      if (text !== '') {
        lyrics.push({ time: totalTime, text });
      }
    }
  });

  return lyrics.sort((a, b) => a.time - b.time);
};